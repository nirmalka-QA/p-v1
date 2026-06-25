import type { Story } from '../models/model'

/**
 * Active stories only — archived stories are retained as AI context but never
 * shown in lists. Every story-list consumer must filter through this.
 */
export function visibleStories(stories: Story[]): Story[] {
  return stories.filter((s) => !s.archived)
}

/** Next sequential story id in `US-001` form across the whole project. */
export function nextStoryId(stories: Story[]): string {
  const maxNum = stories.reduce((max, s) => {
    const n = Number(s.id.replace(/\D/g, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `US-${String(maxNum + 1).padStart(3, '0')}`
}

/**
 * Whether pointing `storyId` at `newDeps` would create a circular dependency.
 * A cycle exists if `storyId` is itself a dependency, or if any dependency can
 * transitively reach back to `storyId` through the existing dependency graph.
 */
export function wouldCreateCycle(
  stories: Story[],
  storyId: string,
  newDeps: string[]
): boolean {
  if (newDeps.includes(storyId)) return true

  const byId = new Map(stories.map((s) => [s.id, s]))
  const seen = new Set<string>()

  function reaches(fromId: string): boolean {
    if (fromId === storyId) return true
    if (seen.has(fromId)) return false
    seen.add(fromId)
    const node = byId.get(fromId)
    if (!node) return false
    return node.dependencies.some((depId) => reaches(depId))
  }

  return newDeps.some((depId) => reaches(depId))
}

export interface StoryFilters {
  status: string
  assignee: string
  search: string
}

/** Applies the status / assignee / text filters to a story list. */
export function filterStories(stories: Story[], filters: StoryFilters, allValue: string): Story[] {
  const q = filters.search.trim().toLowerCase()
  return stories.filter((s) => {
    if (filters.status !== allValue && s.status !== filters.status) return false
    if (filters.assignee !== allValue && (s.assignee ?? '') !== filters.assignee) return false
    if (q && !s.title.toLowerCase().includes(q)) return false
    return true
  })
}

/** Distinct assignees currently present on a project's stories (for the filter). */
export function presentAssignees(stories: Story[]): string[] {
  return [...new Set(stories.map((s) => s.assignee).filter((a): a is string => Boolean(a)))].sort()
}
