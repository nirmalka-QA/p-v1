import type { Story, StoryStatus, Feature, FeatureStatus } from '../../types'

/** A single box in a dependency graph. `dependencies` are the ids this node points to. */
export interface DepGraphNode {
  id: string
  /** Short label drawn inside the box (defaults to the id). */
  label: string
  /** Ids this node depends on (edges drawn from each dependency → this node). */
  dependencies: string[]
  /** Border colour (CSS value), usually status-driven. */
  stroke: string
  /** Emphasised node in a focused/neighbour view (the story/feature being viewed). */
  focal?: boolean
}

const STORY_STROKE: Record<StoryStatus, string> = {
  draft: 'var(--mantine-color-gray-4)',
  ready: 'var(--mantine-color-gray-5)',
  'in-progress': 'var(--mantine-color-blue-5)',
  done: 'var(--mantine-color-teal-5)',
  closed: 'var(--mantine-color-dark-3)',
}

const FEATURE_STROKE: Record<FeatureStatus, string> = {
  proposed: 'var(--mantine-color-gray-4)',
  'under-review': 'var(--mantine-color-yellow-5)',
  'in-progress': 'var(--mantine-color-blue-5)',
  approved: 'var(--mantine-color-teal-5)',
  deferred: 'var(--mantine-color-gray-3)',
  rejected: 'var(--mantine-color-red-4)',
}

const FALLBACK_STROKE = 'var(--mantine-color-gray-4)'

/** Build graph nodes for stories. Edges keep only in-set dependencies. */
export function buildStoryNodes(stories: Story[]): DepGraphNode[] {
  const ids = new Set(stories.map((s) => s.id))
  return stories.map((s) => ({
    id: s.id,
    label: s.id,
    dependencies: s.dependencies.filter((d) => ids.has(d)),
    stroke: STORY_STROKE[s.status] ?? FALLBACK_STROKE,
  }))
}

/**
 * Feature-level dependencies (ADR-0026), as the union of two sources:
 *  1. Explicit edges the planning AI assigned to the feature (`feature.dependencies`) — available
 *     at planning time before any stories exist.
 *  2. Edges derived from story links: feature A depends on feature B when any story in A depends
 *     on a story in B — the real coupling created once stories are defined.
 * Self-links and edges to unknown features are excluded.
 */
export function deriveFeatureDependencies(
  features: Feature[],
  stories: Story[],
): Map<string, string[]> {
  const featureOfStory = new Map(stories.map((s) => [s.id, s.featureId]))
  const known = new Set(features.map((f) => f.id))
  const deps = new Map<string, Set<string>>(features.map((f) => [f.id, new Set<string>()]))

  // 1. Explicit AI-assigned feature dependencies.
  for (const f of features) {
    const bucket = deps.get(f.id)
    if (!bucket) continue
    for (const dep of f.dependencies ?? []) {
      if (dep !== f.id && known.has(dep)) bucket.add(dep)
    }
  }

  // 2. Edges implied by story-to-story links.
  for (const s of stories) {
    const from = s.featureId
    const bucket = deps.get(from)
    if (!bucket) continue
    for (const depStoryId of s.dependencies) {
      const to = featureOfStory.get(depStoryId)
      if (to && to !== from && known.has(to)) bucket.add(to)
    }
  }
  return new Map([...deps].map(([k, v]) => [k, [...v]]))
}

/** Build graph nodes for features, using dependencies derived from story links. */
export function buildFeatureNodes(features: Feature[], stories: Story[]): DepGraphNode[] {
  const deps = deriveFeatureDependencies(features, stories)
  return features.map((f) => ({
    id: f.id,
    label: f.id,
    dependencies: deps.get(f.id) ?? [],
    stroke: FEATURE_STROKE[f.status] ?? FALLBACK_STROKE,
  }))
}

/**
 * Reduce a full node set to a focused neighbourhood: the focal node plus the nodes
 * it directly depends on and the nodes that directly depend on it (one hop). Each
 * kept node's edges are trimmed to the kept set so only relevant links are drawn.
 * Returns an empty array when the focal node has no direct links.
 */
export function focusSubgraph(nodes: DepGraphNode[], focalId: string): DepGraphNode[] {
  const focal = nodes.find((n) => n.id === focalId)
  if (!focal) return []
  const keep = new Set<string>([focalId])
  for (const d of focal.dependencies) keep.add(d)
  for (const n of nodes) {
    if (n.dependencies.includes(focalId)) keep.add(n.id)
  }
  if (keep.size <= 1) return []
  return nodes
    .filter((n) => keep.has(n.id))
    .map((n) => ({
      ...n,
      focal: n.id === focalId,
      dependencies: n.dependencies.filter((d) => keep.has(d)),
    }))
}
