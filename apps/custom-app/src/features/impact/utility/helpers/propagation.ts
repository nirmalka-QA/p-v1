import type {
  ChangeImpactAlert,
  Feature,
  Story,
  ImpactRef,
  ImpactChangeType,
  ImpactSeverity,
  ReviewAction,
  KBSectionId,
} from '../../../../types'
import { KB_REGEN_RULE, KB_SECTION_RULES } from '../constants/constants'
import { nextImpactId } from './ids'

/**
 * The cross-phase change-impact engine. Given a description of an upstream
 * change and a snapshot of the project, it derives the *net-new* alerts that
 * should be raised against downstream artifacts. Pure and idempotent: re-running
 * the same change (same source revision) produces no duplicates, and alerts that
 * were already resolved for that revision are never resurrected.
 */
export interface ChangeDescriptor {
  source: ImpactRef & { changeType: ImpactChangeType }
  /** The source artifact's revision — part of the dedupe key. */
  sourceRevision: number
  /** For KB-note changes, the section it belongs to (selects the propagation rule). */
  kbSectionId?: KBSectionId
}

export interface PropagationContext {
  projectId: string
  features: Feature[]
  stories: Story[]
  existingAlerts: ChangeImpactAlert[]
  now: string
}

type Candidate = { target: ImpactRef; severity: ImpactSeverity }

function featureRef(f: Feature): ImpactRef {
  return { phase: 'planning', kind: 'feature', refId: f.id, label: `${f.id} ${f.title}` }
}
function storyRef(s: Story): ImpactRef {
  return { phase: 'features', kind: 'story', refId: s.id, label: `${s.id} ${s.title}` }
}

/** First lowercased word of a feature title — a coarse topic token for overlap matching. */
function featureFirstWord(f: Feature): string {
  return f.title.toLowerCase().split(/\s+/)[0]?.replace(/[^a-z0-9]/g, '') ?? ''
}

/** Stories that transitively depend on `storyId` (reverse dependency graph). */
function dependentsOf(storyId: string, stories: Story[]): Story[] {
  const result: Story[] = []
  const seen = new Set<string>()
  function visit(id: string) {
    for (const s of stories) {
      if (s.dependencies.includes(id) && !seen.has(s.id)) {
        seen.add(s.id)
        result.push(s)
        visit(s.id)
      }
    }
  }
  visit(storyId)
  return result
}

function featureChangeSeverity(change: ImpactChangeType): ImpactSeverity {
  if (change === 'regenerated' || change === 'archived' || change === 'status-changed') return 'critical'
  return 'warning'
}

function suggestedActionFor(change: ImpactChangeType, severity: ImpactSeverity): ReviewAction {
  if (severity === 'info') return 'acknowledge'
  if (change === 'regenerated' || change === 'archived') return 'regenerate'
  return 'approve'
}

const CHANGE_VERB: Record<ImpactChangeType, string> = {
  edited: 'edited',
  enhanced: 'enhanced with AI',
  regenerated: 'regenerated',
  archived: 'archived',
  'status-changed': 'changed status',
  added: 'added',
}

function rationaleFor(change: ChangeDescriptor, targetLabel: string): string {
  return (
    `**${change.source.label}** was ${CHANGE_VERB[change.source.changeType]}. ` +
    `**${targetLabel}** was derived from it and may no longer be consistent.\n\n` +
    `Review whether it still holds, then **approve** the rework, **reject** to keep it as-is ` +
    `(recorded for traceability), or **regenerate** it from the new context. Nothing is deleted.`
  )
}

function candidatesFor(change: ChangeDescriptor, ctx: PropagationContext): Candidate[] {
  const activeFeatures = ctx.features.filter((f) => !f.archived)
  const activeStories = ctx.stories.filter((s) => !s.archived)

  if (change.source.kind === 'kb-note') {
    const rule = change.kbSectionId ? KB_SECTION_RULES[change.kbSectionId] : KB_REGEN_RULE
    let feats: Feature[] = []
    if (rule.scope === 'all') feats = activeFeatures
    else if (rule.scope === 'overlap') {
      const noteText = change.source.label.toLowerCase()
      feats = activeFeatures.filter((f) => {
        const word = featureFirstWord(f)
        return word.length > 2 && noteText.includes(word)
      })
    }
    const out: Candidate[] = feats.map((f) => ({ target: featureRef(f), severity: rule.severity }))
    // A whole-KB regeneration cascades to the stories of the impacted features too.
    if (change.source.changeType === 'regenerated') {
      const featIds = new Set(feats.map((f) => f.id))
      for (const s of activeStories) {
        if (featIds.has(s.featureId)) out.push({ target: storyRef(s), severity: rule.severity })
      }
    }
    return out
  }

  if (change.source.kind === 'feature') {
    const severity = featureChangeSeverity(change.source.changeType)
    return activeStories
      .filter((s) => s.featureId === change.source.refId)
      .map((s) => ({ target: storyRef(s), severity }))
  }

  if (change.source.kind === 'story') {
    return dependentsOf(change.source.refId, activeStories).map((s) => ({
      target: storyRef(s),
      severity: s.status === 'done' || s.status === 'closed' ? 'critical' : 'warning',
    }))
  }

  return []
}

/** Dedupe key — same key + same source revision must never raise a second alert. */
function alertKey(
  source: { kind: string; refId: string },
  sourceRevision: number,
  target: { kind: string; refId: string },
): string {
  return [source.kind, source.refId, sourceRevision, target.kind, target.refId].join('|')
}

export function deriveImpactAlerts(change: ChangeDescriptor, ctx: PropagationContext): ChangeImpactAlert[] {
  const candidates = candidatesFor(change, ctx).filter(
    // Never target the artifact that changed (a feature edit shouldn't flag itself).
    (c) => !(c.target.kind === change.source.kind && c.target.refId === change.source.refId),
  )

  const existingKeys = new Set(
    ctx.existingAlerts.map((a) => alertKey(a.source, a.sourceRevision, a.target)),
  )

  const fresh: ChangeImpactAlert[] = []
  const accumulating = [...ctx.existingAlerts]

  for (const candidate of candidates) {
    const key = alertKey(change.source, change.sourceRevision, candidate.target)
    if (existingKeys.has(key)) continue
    existingKeys.add(key)

    const alert: ChangeImpactAlert = {
      id: nextImpactId(accumulating),
      projectId: ctx.projectId,
      createdAt: ctx.now,
      source: change.source,
      sourceRevision: change.sourceRevision,
      target: candidate.target,
      severity: candidate.severity,
      rationale: rationaleFor(change, candidate.target.label),
      suggestedAction: suggestedActionFor(change.source.changeType, candidate.severity),
      status: 'open',
    }
    fresh.push(alert)
    accumulating.push(alert)
  }

  return fresh
}
