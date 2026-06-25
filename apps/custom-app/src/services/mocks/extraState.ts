import type {
  TechnicalRequirement,
  ImplementationPlan,
  StoryRepoCommit,
  DevMemoryItem,
} from '../../features/implementation/utility/models/model'

/**
 * Mock persistence for the ADR-0024…0028 implementation records (technical
 * requirements, implementation plans, repo commits, development memory) and the
 * rejected dependency edges (ADR-0026). Kept separate from mockDb because these
 * shapes are feature-model types, not shared domain types.
 */

interface ExtraState {
  /** Keyed `${projectId}:${scope}`. */
  technicalRequirements: Record<string, TechnicalRequirement[]>
  /** Keyed `${projectId}:${scope}:${storyId}`. */
  implementationPlans: Record<string, ImplementationPlan>
  /** Keyed `${projectId}:${scope}:${storyId}`. */
  repoCommits: Record<string, StoryRepoCommit>
  /** Keyed by projectId (newest first). */
  devMemory: Record<string, DevMemoryItem[]>
  /** `${projectId}:${kind}:${source}->${dependsOn}` — never re-suggest these. */
  rejectedDeps: string[]
}

const STORAGE_KEY = 'wispr.mock.extra.v1'

const emptyState = (): ExtraState => ({
  technicalRequirements: {},
  implementationPlans: {},
  repoCommits: {},
  devMemory: {},
  rejectedDeps: [],
})

function hydrate(): ExtraState {
  if (typeof window === 'undefined') return emptyState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyState(), ...(JSON.parse(raw) as Partial<ExtraState>) }
  } catch {
    // Corrupt store → start clean.
  }
  return emptyState()
}

export const extraState = hydrate()

export function persistExtra(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(extraState))
  } catch {
    // Quota exceeded / private mode — keep going in-memory.
  }
}
