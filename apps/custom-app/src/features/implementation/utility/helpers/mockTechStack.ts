import type { ProjectType, TechStackItem } from '../../../../types'
import { TECH_STACK_CATEGORIES, suggestedStackFor } from '../constants/constants'

/**
 * Produces the AI-suggested tech stack for a project. Mirrors what a real
 * suggestion endpoint would derive from the Knowledge Base Tech Stack section;
 * here it is seeded from the project type so the result is deterministic and
 * domain-appropriate. Every item is flagged `aiSuggested` until the user edits it.
 */
export function buildSuggestedStack(type: ProjectType): TechStackItem[] {
  const suggested = suggestedStackFor(type)
  return TECH_STACK_CATEGORIES.map((category) => ({
    category,
    value: suggested[category],
    aiSuggested: true,
  }))
}

/**
 * Reconciles edited items against the latest suggestion: an item that no longer
 * matches the AI value loses its "AI suggested" flag (requirements §8.1).
 */
export function reconcileSuggestedFlags(items: TechStackItem[], type: ProjectType): TechStackItem[] {
  const suggested = suggestedStackFor(type)
  return items.map((item) => ({
    ...item,
    value: item.value.trim(),
    aiSuggested: item.value.trim() === suggested[item.category as keyof typeof suggested],
  }))
}
