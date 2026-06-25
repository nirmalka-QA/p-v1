import type { MockRoute } from '@wispr/services'
import { mockDb } from '../mockDb'
import {
  generateMockStories,
  computeImpact,
  enhanceStoryContent,
} from '../../features/features/utility/helpers/mockStories'
import { nextStoryId, wouldCreateCycle } from '../../features/features/utility/helpers/helpers'
import { runImpact } from '../../features/impact/utility/helpers/runImpact'
import type { Story, StoryStatus, Feature, DependencyAnalysis } from '../../types'
import { startJob, pollJob } from './jobs'
import { extraState, persistExtra } from './extraState'
import { ok, fail, nowIso } from './shared'

/**
 * Features-phase mock routes — user stories. Ports the pre-live mock behaviour
 * (per-feature generation, archive-not-delete, impact propagation) onto the
 * live URL contract, and computes the ADR-0026 dependency-derived fields
 * (order / developable / blockedBy / canMarkReady) the backend normally adds.
 */

const STORY_STEPS = [
  { key: 'context', label: 'Reading approved features & Knowledge Base' },
  { key: 'draft', label: 'Drafting user stories' },
  { key: 'criteria', label: 'Writing acceptance criteria' },
  { key: 'deps', label: 'Linking story dependencies' },
  { key: 'finalise', label: 'Finalising stories' },
]

/** Dependency satisfaction: done/closed unblock development; ready+ allows marking ready. */
const DONE: StoryStatus[] = ['done', 'closed']
const READY_OR_BEYOND: StoryStatus[] = ['ready', 'in-progress', 'done', 'closed']

/**
 * Computes the backend's dependency-derived fields over the active story set:
 * topological order, blockedBy (unfinished deps), developable and canMarkReady.
 */
function withDerivedFields(stories: Story[]): Story[] {
  const active = stories.filter((s) => !s.archived)
  const byId = new Map(active.map((s) => [s.id, s]))

  // Kahn topological ranking over in-set dependency edges.
  const rank = new Map<string, number>()
  const inSetDeps = (s: Story) => s.dependencies.filter((d) => byId.has(d))
  let frontier = active.filter((s) => inSetDeps(s).length === 0)
  let level = 0
  const ranked = new Set<string>()
  while (frontier.length) {
    for (const s of frontier) {
      rank.set(s.id, level)
      ranked.add(s.id)
    }
    level += 1
    frontier = active.filter(
      (s) => !ranked.has(s.id) && inSetDeps(s).every((d) => ranked.has(d)),
    )
  }

  return stories.map((s) => {
    if (s.archived) return s
    const deps = inSetDeps(s).map((d) => byId.get(d) as Story)
    const blockedBy = deps.filter((d) => !DONE.includes(d.status)).map((d) => d.id)
    return {
      ...s,
      order: rank.get(s.id) ?? 0,
      blockedBy,
      developable: s.status === 'ready' && blockedBy.length === 0,
      canMarkReady: deps.every((d) => READY_OR_BEYOND.includes(d.status)),
    }
  })
}

/** Keeps each feature's story counters in step (the live backend maintains these). */
export function syncFeatureCounts(projectId: string): void {
  const plan = mockDb.getPlan(projectId)
  if (!plan) return
  const active = mockDb.getStories(projectId).filter((s) => !s.archived)
  const features = plan.features.map((f): Feature => {
    const mine = active.filter((s) => s.featureId === f.id)
    return {
      ...f,
      storiesCount: mine.length,
      readyStoriesCount: mine.filter((s) => READY_OR_BEYOND.includes(s.status)).length,
    }
  })
  mockDb.savePlan({ ...plan, features })
}

function readStories(projectId: string): Story[] {
  return withDerivedFields(mockDb.getStories(projectId))
}

function saveAndRead(projectId: string, stories: Story[]): Story[] {
  mockDb.saveStories(projectId, stories)
  syncFeatureCounts(projectId)
  return withDerivedFields(stories)
}

/** Generates (or regenerates) one feature's stories; prior ones become archived context. */
function generateForFeature(projectId: string, featureId: string): void {
  const plan = mockDb.getPlan(projectId)
  const feature = plan?.features.find((f) => f.id === featureId)
  if (!feature) throw new Error('Feature not found.')

  const now = nowIso()
  const all = mockDb.getStories(projectId)
  const others = all.filter((s) => s.featureId !== featureId)
  const archivedTarget = all
    .filter((s) => s.featureId === featureId)
    .map((s) => (s.archived ? s : { ...s, archived: true }))
  const nextRevision = archivedTarget.reduce((max, s) => Math.max(max, s.revision ?? 1), 0) + 1

  const accumulating = [...others, ...archivedTarget]
  const generated: Story[] = generateMockStories(feature).map((draft) => {
    const id = nextStoryId(accumulating)
    const story: Story = { ...draft, id, projectId, createdAt: now, revision: nextRevision }
    const impact = computeImpact(story, accumulating)
    accumulating.push(story)
    return { ...story, ...impact }
  })

  mockDb.saveStories(projectId, [...others, ...archivedTarget, ...generated])
  syncFeatureCounts(projectId)
}

/** The ordered features a generation run targets (explicit ids, or all approved). */
function targetFeatures(projectId: string, featureIds?: string[]): Feature[] {
  const plan = mockDb.getPlan(projectId)
  if (!plan) return []
  const active = plan.features.filter((f) => !f.archived)
  if (featureIds?.length) {
    const wanted = new Set(featureIds)
    return active.filter((f) => wanted.has(f.id))
  }
  return active.filter((f) => f.status === 'approved')
}

/** Maps the create/update request body onto a story's editable core. */
function fromBody(body: Record<string, unknown>) {
  return body as unknown as Omit<
    Story,
    'id' | 'featureId' | 'projectId' | 'impactedStories' | 'impactDismissed' | 'tags' | 'createdAt'
  >
}

export const featuresRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'projects/:projectId/stories',
    handler: ({ params }) => ok(readStories(params['projectId'] ?? '')),
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/generate-stories/start',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const { featureIds } = (body ?? {}) as { featureIds?: string[] }
      const targets = targetFeatures(projectId, featureIds)
      if (targets.length === 0) return fail(400, 'No approved features to generate stories for.')
      return ok(
        startJob(STORY_STEPS, () => {
          targets.forEach((f) => generateForFeature(projectId, f.id))
          return { stories: readStories(projectId) }
        }),
      )
    },
  },

  {
    method: 'GET',
    pattern: 'projects/:projectId/generate-stories/status/:jobId',
    handler: ({ params }) => {
      const status = pollJob(params['jobId'] ?? '')
      return status ? ok(status) : fail(404, 'Unknown generation job.')
    },
  },

  // Feature-by-feature generation plan: the ordered targets.
  {
    method: 'POST',
    pattern: 'projects/:projectId/generate-stories/plan',
    handler: ({ params, body }) => {
      const { featureIds } = (body ?? {}) as { featureIds?: string[] }
      const features = targetFeatures(params['projectId'] ?? '', featureIds).map((f) => ({
        id: f.id,
        title: f.title,
      }))
      return ok({ features })
    },
  },

  // One feature, synchronous (the feature-by-feature loop).
  {
    method: 'POST',
    pattern: 'projects/:projectId/features/:featureId/generate-stories',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      try {
        generateForFeature(projectId, params['featureId'] ?? '')
      } catch (error) {
        return fail(404, error instanceof Error ? error.message : 'Feature not found.')
      }
      return ok(readStories(projectId))
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/features/:featureId/stories',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const existing = mockDb.getStories(projectId)
      const story: Story = {
        ...fromBody((body ?? {}) as Record<string, unknown>),
        id: nextStoryId(existing),
        featureId: params['featureId'] ?? '',
        projectId,
        impactedStories: [],
        impactDismissed: false,
        tags: [],
        createdAt: nowIso(),
      }
      const impact = computeImpact(story, existing)
      return ok(saveAndRead(projectId, [...existing, { ...story, ...impact }]))
    },
  },

  // Bulk status — registered BEFORE :storyId PATCH so the static segment wins.
  {
    method: 'PATCH',
    pattern: 'projects/:projectId/stories/status',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const { storyIds, status } = (body ?? {}) as { storyIds?: string[]; status?: StoryStatus }
      const ids = new Set(storyIds ?? [])
      const updated = mockDb
        .getStories(projectId)
        .map((s) => (ids.has(s.id) && status ? { ...s, status } : s))
      return ok(saveAndRead(projectId, updated))
    },
  },

  {
    method: 'PATCH',
    pattern: 'projects/:projectId/stories/:storyId',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const storyId = params['storyId'] ?? ''
      const existing = mockDb.getStories(projectId)
      const target = existing.find((s) => s.id === storyId)
      if (!target) return fail(404, 'Story not found.')
      const values = fromBody((body ?? {}) as Record<string, unknown>)
      if (wouldCreateCycle(existing, storyId, values.dependencies ?? [])) {
        return fail(409, 'Circular dependency: a story cannot depend on itself or its dependents.')
      }
      const revision = (target.revision ?? 1) + 1
      const updated = existing.map((s) => {
        if (s.id !== storyId) return s
        const merged: Story = { ...s, ...values, revision }
        return { ...merged, ...computeImpact(merged, existing) }
      })
      const result = saveAndRead(projectId, updated)
      runImpact({
        projectId,
        now: nowIso(),
        change: {
          source: {
            phase: 'features',
            kind: 'story',
            refId: storyId,
            label: `${storyId} ${target.title}`,
            changeType: 'edited',
          },
          sourceRevision: revision,
        },
        auditType: 'story-edited',
        auditSummary: `Edited story “${target.title}”.`,
      })
      return ok(result)
    },
  },

  // "Delete" archives the story and scrubs it from dependency/impact lists.
  {
    method: 'DELETE',
    pattern: 'projects/:projectId/stories/:storyId',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      const storyId = params['storyId'] ?? ''
      const existing = mockDb.getStories(projectId)
      const target = existing.find((s) => s.id === storyId)
      if (!target) return fail(404, 'Story not found.')
      const updated = existing.map((s) =>
        s.id === storyId
          ? { ...s, archived: true }
          : {
              ...s,
              dependencies: s.dependencies.filter((d) => d !== storyId),
              impactedStories: s.impactedStories.filter((d) => d !== storyId),
            },
      )
      const result = saveAndRead(projectId, updated)
      runImpact({
        projectId,
        now: nowIso(),
        change: {
          source: {
            phase: 'features',
            kind: 'story',
            refId: storyId,
            label: `${storyId} ${target.title}`,
            changeType: 'archived',
          },
          sourceRevision: (target.revision ?? 1) + 1,
        },
        auditType: 'story-archived',
        auditSummary: `Archived story “${target.title}” (retained as context).`,
      })
      return ok(result)
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/dismiss-impact',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      const updated = mockDb
        .getStories(projectId)
        .map((s) => (s.id === params['storyId'] ? { ...s, impactDismissed: true } : s))
      return ok(saveAndRead(projectId, updated))
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/enhance',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const storyId = params['storyId'] ?? ''
      const existing = mockDb.getStories(projectId)
      const target = existing.find((s) => s.id === storyId)
      if (!target) return fail(404, 'Story not found.')
      const { instructions } = (body ?? {}) as { instructions?: string }
      const enhanced = enhanceStoryContent(target, instructions)
      const revision = (target.revision ?? 1) + 1
      const updated = existing.map((s) => (s.id === storyId ? { ...s, ...enhanced, revision } : s))
      const result = saveAndRead(projectId, updated)
      runImpact({
        projectId,
        now: nowIso(),
        change: {
          source: {
            phase: 'features',
            kind: 'story',
            refId: storyId,
            label: `${storyId} ${target.title}`,
            changeType: 'enhanced',
          },
          sourceRevision: revision,
        },
        auditType: 'story-edited',
        auditSummary: `Enhanced story “${target.title}” with AI.`,
      })
      return ok(result)
    },
  },

  // ADR-0026: advisory dependency analysis — suggest in-feature sequencing edges.
  {
    method: 'POST',
    pattern: 'projects/:projectId/analyze-dependencies',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      const active = mockDb.getStories(projectId).filter((s) => !s.archived)
      const rejected = new Set(extraState.rejectedDeps)

      const suggestions: DependencyAnalysis['suggestions'] = []
      const byFeature = new Map<string, Story[]>()
      for (const s of active) {
        byFeature.set(s.featureId, [...(byFeature.get(s.featureId) ?? []), s])
      }
      for (const group of byFeature.values()) {
        for (let i = 1; i < group.length && suggestions.length < 4; i++) {
          const story = group[i] as Story
          const dependsOn = group[i - 1] as Story
          const key = `${projectId}:story:${story.id}->${dependsOn.id}`
          if (story.dependencies.includes(dependsOn.id) || rejected.has(key)) continue
          suggestions.push({
            story: story.id,
            dependsOn: dependsOn.id,
            reason: `“${dependsOn.title}” establishes the flow “${story.title}” builds on.`,
          })
        }
      }

      const order = withDerivedFields(active)
        .filter((s) => !s.archived)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s) => s.id)
      return ok({ suggestions, cycles: [], order } satisfies DependencyAnalysis)
    },
  },

  // ADR-0026: reject an edge — clears it if applied and never re-suggests it.
  {
    method: 'POST',
    pattern: 'projects/:projectId/dependencies/reject',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const { kind, source, dependsOn } = (body ?? {}) as {
        kind?: 'story' | 'feature'
        source?: string
        dependsOn?: string
      }
      if (!kind || !source || !dependsOn) return fail(400, 'kind, source and dependsOn are required.')

      extraState.rejectedDeps.push(`${projectId}:${kind}:${source}->${dependsOn}`)
      persistExtra()

      if (kind === 'story') {
        const updated = mockDb
          .getStories(projectId)
          .map((s) =>
            s.id === source ? { ...s, dependencies: s.dependencies.filter((d) => d !== dependsOn) } : s,
          )
        saveAndRead(projectId, updated)
      } else {
        const plan = mockDb.getPlan(projectId)
        if (plan) {
          const features = plan.features.map((f) =>
            f.id === source
              ? { ...f, dependencies: (f.dependencies ?? []).filter((d) => d !== dependsOn) }
              : f,
          )
          mockDb.savePlan({ ...plan, features })
        }
      }
      return ok(true)
    },
  },
]
