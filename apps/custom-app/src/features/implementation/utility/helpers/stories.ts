import type { Story, StoryStatus } from '../models/model'

/** Statuses that put a story into the Implementation workflow (ready-for-dev onward). */
export const IMPL_STATUSES: StoryStatus[] = ['ready', 'in-progress', 'done']

export function isImplStory(story: Story): boolean {
  return !story.archived && IMPL_STATUSES.includes(story.status)
}

/**
 * Orders stories so dependencies come before the stories that depend on them
 * (no-dependency stories first, flowing right). Prefers the server-computed
 * `order` (ADR-0026, single source of truth); falls back to a local topological
 * sort over the given set, ignoring dependencies that point outside it
 * (cycle-safe via a temp guard) when the backend hasn't supplied an order.
 */
export function sortByDependencyOrder(stories: Story[]): Story[] {
  if (stories.length > 0 && stories.every((s) => typeof s.order === 'number')) {
    return [...stories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  const ids = new Set(stories.map((s) => s.id))
  const byId = new Map(stories.map((s) => [s.id, s]))
  const result: Story[] = []
  const visited = new Set<string>()
  const temp = new Set<string>()

  function visit(story: Story) {
    if (visited.has(story.id) || temp.has(story.id)) return
    temp.add(story.id)
    for (const depId of story.dependencies) {
      if (ids.has(depId)) {
        const dep = byId.get(depId)
        if (dep) visit(dep)
      }
    }
    temp.delete(story.id)
    visited.add(story.id)
    result.push(story)
  }

  for (const story of stories) visit(story)
  return result
}
