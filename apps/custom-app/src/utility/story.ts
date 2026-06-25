import type { GherkinCriterion } from '../types'

/**
 * Flatten a structured Gherkin acceptance criterion (ADR-0033) to a single readable line —
 * "Title: Given … When … Then …" — for compact list renders and string-based consumers.
 */
export function criterionText(ac: GherkinCriterion): string {
  const steps = [
    ac.given && `Given ${ac.given}`,
    ac.when && `When ${ac.when}`,
    ac.then && `Then ${ac.then}`,
  ]
    .filter(Boolean)
    .join(' ')
  if (ac.title) return steps ? `${ac.title}: ${steps}` : ac.title
  return steps
}

/** Wrap a plain string as a Gherkin criterion (mock/legacy data). */
export function gherkin(title: string): GherkinCriterion {
  return { type: 'scenario', title, given: '', when: '', then: '' }
}
