import type { MockRoute } from '@wispr/services'
import { mockDb } from '../mockDb'
import {
  generateMockPlan,
  acceptSuggestionInPlan,
  dismissSuggestionInPlan,
  enhanceFeatureContent,
} from '../../features/planning/utility/helpers/mockPlanning'
import { nextFeatureId, cleanRequirements } from '../../features/planning/utility/helpers/helpers'
import { APPROVABLE_STATUSES } from '../../features/planning/utility/constants/constants'
import { runImpact } from '../../features/impact/utility/helpers/runImpact'
import type { PlanningPlan, Feature, FeatureStatus } from '../../types'
import type { FeatureFormValues } from '../../features/planning/utility/models/model'
import { startJob, pollJob } from './jobs'
import { ok, fail, nowIso } from './shared'

/**
 * Planning mock routes — the feature plan. Ports the pre-live mock behaviour
 * (generate from KB, archive-not-delete, suggestions tray, impact propagation)
 * onto the live URL contract, including ADR-0026 feature dependency edges.
 */

const PLAN_STEPS = [
  { key: 'kb', label: 'Reading the Knowledge Base' },
  { key: 'derive', label: 'Deriving candidate features' },
  { key: 'prioritise', label: 'Prioritising and sizing features' },
  { key: 'deps', label: 'Mapping feature dependencies' },
  { key: 'finalise', label: 'Finalising the plan' },
]

const getPlanOr404 = (projectId: string) => mockDb.getPlan(projectId)

function featureFromValues(values: FeatureFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    priority: values.priority,
    complexity: values.complexity,
    functionalRequirements: cleanRequirements(values.functionalRequirements),
    nonFunctionalRequirements: cleanRequirements(values.nonFunctionalRequirements),
  }
}

/** Regenerates the plan: existing features are archived as context (never wiped). */
function buildPlan(projectId: string): PlanningPlan {
  const kb = mockDb.getKb(projectId)
  if (!kb) throw new Error('A Knowledge Base is required before planning.')

  const fresh = generateMockPlan(projectId, kb)
  const existing = mockDb.getPlan(projectId)
  if (!existing || existing.features.length === 0) return mockDb.savePlan(fresh)

  const archivedOld = existing.features.map((f) => (f.archived ? f : { ...f, archived: true }))
  const nextRevision = existing.features.reduce((max, f) => Math.max(max, f.revision ?? 1), 1) + 1
  const accumulating = [...archivedOld]
  const renumbered = fresh.features.map((f) => {
    const renamed: Feature = { ...f, id: nextFeatureId(accumulating), revision: nextRevision }
    accumulating.push(renamed)
    return renamed
  })
  const merged: PlanningPlan = { ...fresh, features: [...archivedOld, ...renumbered] }
  mockDb.savePlan(merged)

  runImpact({
    projectId,
    now: nowIso(),
    change: {
      source: {
        phase: 'planning',
        kind: 'feature',
        refId: 'feature-list',
        label: 'Feature list',
        changeType: 'regenerated',
      },
      sourceRevision: nextRevision,
    },
    auditType: 'plan-regenerated',
    auditSummary: 'Re-generated the feature list; previous features archived as context.',
  })
  return merged
}

/** Depth-first cycle check over the feature dependency edges (ADR-0026). */
function featureDependencyCycles(features: Feature[], from: string, to: string): boolean {
  const edges = new Map(features.map((f) => [f.id, f.dependencies ?? []]))
  const stack = [to]
  const seen = new Set<string>()
  while (stack.length) {
    const current = stack.pop() as string
    if (current === from) return true
    if (seen.has(current)) continue
    seen.add(current)
    stack.push(...(edges.get(current) ?? []))
  }
  return false
}

export const planningRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'projects/:projectId/plan',
    handler: ({ params }) => ok(mockDb.getPlan(params['projectId'] ?? '')),
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/generate-features/start',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      if (!mockDb.getKb(projectId)) return fail(400, 'A Knowledge Base is required before planning.')
      return ok(startJob(PLAN_STEPS, () => ({ plan: buildPlan(projectId) })))
    },
  },

  {
    method: 'GET',
    pattern: 'projects/:projectId/generate-features/status/:jobId',
    handler: ({ params }) => {
      const status = pollJob(params['jobId'] ?? '')
      return status ? ok(status) : fail(404, 'Unknown generation job.')
    },
  },

  // Legacy synchronous generation — kept for completeness.
  {
    method: 'POST',
    pattern: 'projects/:projectId/generate-features',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      if (!mockDb.getKb(projectId)) return fail(400, 'A Knowledge Base is required before planning.')
      return ok(buildPlan(projectId))
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/features',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const plan = getPlanOr404(projectId)
      if (!plan) return fail(404, 'No plan to add to.')
      const values = body as FeatureFormValues
      const feature: Feature = {
        id: nextFeatureId(plan.features),
        projectId,
        ...featureFromValues(values),
        aiGenerated: false,
        status: 'proposed',
        order: plan.features.length,
        storiesCount: 0,
        readyStoriesCount: 0,
        createdAt: nowIso(),
      }
      return ok(mockDb.savePlan({ ...plan, features: [...plan.features, feature] }))
    },
  },

  // Persist an explicit order (used by both up/down reorder and drag-and-drop).
  // Registered BEFORE the :featureId PATCH so the static segment wins the match.
  {
    method: 'PATCH',
    pattern: 'projects/:projectId/features/reorder',
    handler: ({ params, body }) => {
      const plan = getPlanOr404(params['projectId'] ?? '')
      if (!plan) return fail(404, 'No plan to update.')
      const { featureIds } = (body ?? {}) as { featureIds?: string[] }
      const orderById = new Map((featureIds ?? []).map((id, i) => [id, i]))
      const features = plan.features.map((f) => ({ ...f, order: orderById.get(f.id) ?? f.order }))
      return ok(mockDb.savePlan({ ...plan, features }))
    },
  },

  // PATCH carries either a full edit (form values) or just `{ status }`.
  {
    method: 'PATCH',
    pattern: 'projects/:projectId/features/:featureId',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const featureId = params['featureId'] ?? ''
      const plan = getPlanOr404(projectId)
      if (!plan) return fail(404, 'No plan to update.')
      const target = plan.features.find((f) => f.id === featureId)
      if (!target) return fail(404, 'Feature not found.')

      const patch = (body ?? {}) as Partial<FeatureFormValues> & { status?: FeatureStatus }

      // Status-only change (manual approve / defer / reject).
      if (patch.status && patch.title === undefined) {
        const status = patch.status
        const next = {
          ...plan,
          features: plan.features.map((f) => (f.id === featureId ? { ...f, status } : f)),
        }
        mockDb.savePlan(next)
        if (status === 'rejected' || status === 'deferred') {
          runImpact({
            projectId,
            now: nowIso(),
            change: {
              source: {
                phase: 'planning',
                kind: 'feature',
                refId: featureId,
                label: `${featureId} ${target.title}`,
                changeType: 'status-changed',
              },
              sourceRevision: (target.revision ?? 1) + 1,
            },
            auditType: 'feature-status-changed',
            auditSummary: `Set feature “${target.title}” to ${status}.`,
          })
        }
        return ok(next)
      }

      // Full edit.
      const values = patch as FeatureFormValues
      const revision = (target.revision ?? 1) + 1
      const next = {
        ...plan,
        features: plan.features.map((f) =>
          f.id === featureId ? { ...f, ...featureFromValues(values), revision } : f,
        ),
      }
      mockDb.savePlan(next)
      runImpact({
        projectId,
        now: nowIso(),
        change: {
          source: {
            phase: 'planning',
            kind: 'feature',
            refId: featureId,
            label: `${featureId} ${values.title.trim()}`,
            changeType: 'edited',
          },
          sourceRevision: revision,
        },
        auditType: 'feature-edited',
        auditSummary: `Edited feature “${values.title.trim()}”.`,
      })
      return ok(next)
    },
  },

  // "Delete" archives (append-only); approved features cannot be archived.
  {
    method: 'DELETE',
    pattern: 'projects/:projectId/features/:featureId',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      const featureId = params['featureId'] ?? ''
      const plan = getPlanOr404(projectId)
      if (!plan) return fail(404, 'No plan to update.')
      const target = plan.features.find((f) => f.id === featureId)
      if (!target) return fail(404, 'Feature not found.')
      if (target.status === 'approved') {
        return fail(409, 'Approved features cannot be archived. Use Regenerate to supersede.')
      }
      const next = {
        ...plan,
        features: plan.features.map((f) => (f.id === featureId ? { ...f, archived: true } : f)),
      }
      mockDb.savePlan(next)
      runImpact({
        projectId,
        now: nowIso(),
        change: {
          source: {
            phase: 'planning',
            kind: 'feature',
            refId: featureId,
            label: `${featureId} ${target.title}`,
            changeType: 'archived',
          },
          sourceRevision: (target.revision ?? 1) + 1,
        },
        auditType: 'feature-archived',
        auditSummary: `Archived feature “${target.title}” (retained as context).`,
      })
      return ok(next)
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/features/approve',
    handler: ({ params }) => {
      const plan = getPlanOr404(params['projectId'] ?? '')
      if (!plan) return fail(404, 'No plan to approve.')
      const next = {
        ...plan,
        features: plan.features.map((f) =>
          APPROVABLE_STATUSES.includes(f.status) ? { ...f, status: 'approved' as const } : f,
        ),
      }
      return ok(mockDb.savePlan(next))
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/features/:featureId/enhance',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const featureId = params['featureId'] ?? ''
      const plan = getPlanOr404(projectId)
      const feature = plan?.features.find((f) => f.id === featureId)
      if (!plan || !feature) return fail(404, 'Feature not found.')
      const { instructions } = (body ?? {}) as { instructions?: string }
      const enhanced = enhanceFeatureContent(feature, instructions)
      const revision = (feature.revision ?? 1) + 1
      const next = {
        ...plan,
        features: plan.features.map((f) => (f.id === featureId ? { ...f, ...enhanced, revision } : f)),
      }
      mockDb.savePlan(next)
      runImpact({
        projectId,
        now: nowIso(),
        change: {
          source: {
            phase: 'planning',
            kind: 'feature',
            refId: featureId,
            label: `${featureId} ${feature.title}`,
            changeType: 'enhanced',
          },
          sourceRevision: revision,
        },
        auditType: 'feature-edited',
        auditSummary: `Enhanced feature “${feature.title}” with AI.`,
      })
      return ok(next)
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/suggestions/:suggestionId/accept',
    handler: ({ params }) => {
      const plan = getPlanOr404(params['projectId'] ?? '')
      if (!plan) return fail(404, 'No plan to update.')
      return ok(mockDb.savePlan(acceptSuggestionInPlan(plan, params['suggestionId'] ?? '')))
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/suggestions/:suggestionId/dismiss',
    handler: ({ params }) => {
      const plan = getPlanOr404(params['projectId'] ?? '')
      if (!plan) return fail(404, 'No plan to update.')
      return ok(mockDb.savePlan(dismissSuggestionInPlan(plan, params['suggestionId'] ?? '')))
    },
  },

  // ADR-0026: manual feature→feature dependency edges; cycles are rejected (409).
  {
    method: 'POST',
    pattern: 'projects/:projectId/features/:featureId/dependencies',
    handler: ({ params, body }) => {
      const plan = getPlanOr404(params['projectId'] ?? '')
      if (!plan) return fail(404, 'No plan to update.')
      const featureId = params['featureId'] ?? ''
      const { dependsOn } = (body ?? {}) as { dependsOn?: string }
      if (!dependsOn) return fail(400, 'dependsOn is required.')
      if (dependsOn === featureId || featureDependencyCycles(plan.features, featureId, dependsOn)) {
        return fail(409, 'That dependency would create a cycle.')
      }
      const features = plan.features.map((f) =>
        f.id === featureId
          ? { ...f, dependencies: Array.from(new Set([...(f.dependencies ?? []), dependsOn])) }
          : f,
      )
      return ok(mockDb.savePlan({ ...plan, features }))
    },
  },

  {
    method: 'DELETE',
    pattern: 'projects/:projectId/features/:featureId/dependencies/:dependsOn',
    handler: ({ params }) => {
      const plan = getPlanOr404(params['projectId'] ?? '')
      if (!plan) return fail(404, 'No plan to update.')
      const featureId = params['featureId'] ?? ''
      const dependsOn = params['dependsOn'] ?? ''
      const features = plan.features.map((f) =>
        f.id === featureId
          ? { ...f, dependencies: (f.dependencies ?? []).filter((d) => d !== dependsOn) }
          : f,
      )
      return ok(mockDb.savePlan({ ...plan, features }))
    },
  },
]
