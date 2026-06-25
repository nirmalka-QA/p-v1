import type { Feature, ReorderDirection } from '../models/model'

/**
 * Next sequential feature id in `F-001` form. Derived from the highest existing
 * numeric suffix so ids stay stable and unique even after deletions.
 */
export function nextFeatureId(features: Feature[]): string {
  const maxNum = features.reduce((max, f) => {
    const n = Number(f.id.replace(/\D/g, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `F-${String(maxNum + 1).padStart(3, '0')}`
}

/**
 * Active features only — archived features are retained as AI context but never
 * shown in lists. Every feature-list consumer must filter through this.
 */
export function visibleFeatures(features: Feature[]): Feature[] {
  return features.filter((f) => !f.archived)
}

/** Sorts features by their `order` field (ascending) without mutating input. */
export function sortByOrder(features: Feature[]): Feature[] {
  return [...features].sort((a, b) => a.order - b.order)
}

/**
 * Moves one feature up or down by swapping `order` with its neighbour. Returns a
 * new, re-normalised array; a no-op (returns input order) if already at the edge.
 */
export function reorderFeatures(
  features: Feature[],
  featureId: string,
  direction: ReorderDirection
): Feature[] {
  const sorted = sortByOrder(features)
  const index = sorted.findIndex((f) => f.id === featureId)
  if (index === -1) return sorted

  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= sorted.length) return sorted

  const swapped = [...sorted]
  ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
  // Re-normalise order to match the new positions.
  return swapped.map((f, i) => ({ ...f, order: i }))
}

/** Trims and drops empty entries from a requirements list (form sanitisation). */
export function cleanRequirements(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean)
}

/**
 * Drag-and-drop reorder: returns a new ordered id list with `fromId` moved to
 * `toId`'s position. Dragging downward drops below the target, upward drops
 * above — the natural result of releasing on a row.
 */
export function moveFeatureOrder(orderedIds: string[], fromId: string, toId: string): string[] {
  if (fromId === toId) return orderedIds
  const from = orderedIds.indexOf(fromId)
  const to = orderedIds.indexOf(toId)
  if (from === -1 || to === -1) return orderedIds

  const without = orderedIds.filter((id) => id !== fromId)
  const targetIdx = without.indexOf(toId)
  const insertAt = from < to ? targetIdx + 1 : targetIdx
  return [...without.slice(0, insertAt), fromId, ...without.slice(insertAt)]
}
