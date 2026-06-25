import type { Feature } from '../../../../types'
import type { Story, TestCase, TestSummary } from '../models/model'

/** Next sequential test-case id in `TC-001` form across the whole project. */
export function nextTestId(cases: TestCase[]): string {
  const maxNum = cases.reduce((max, t) => {
    const n = Number(t.id.replace(/\D/g, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `TC-${String(maxNum + 1).padStart(3, '0')}`
}

/** Pass / fail / pending tally over a set of test cases (§9.2 summary bars). */
export function summarize(cases: TestCase[]): TestSummary {
  return cases.reduce<TestSummary>(
    (acc, t) => {
      acc[t.status] += 1
      acc.total += 1
      return acc
    },
    { pass: 0, fail: 0, pending: 0, total: 0 },
  )
}

export interface TestFilters {
  type: string
  status: string
  search: string
}

/** Applies the type / status / text filters to a test-case list. */
export function filterTestCases(cases: TestCase[], filters: TestFilters, allValue: string): TestCase[] {
  const q = filters.search.trim().toLowerCase()
  return cases.filter((t) => {
    if (filters.type !== allValue && t.type !== filters.type) return false
    if (filters.status !== allValue && t.status !== filters.status) return false
    if (q && !t.title.toLowerCase().includes(q)) return false
    return true
  })
}

export interface StoryGroup {
  /** `null` for stories whose feature isn't in the plan (orphans) — rendered as "Other stories". */
  feature: Feature | null
  stories: Story[]
}

/**
 * Groups testable stories under their feature, preserving the plan's feature
 * order. Crucially this drops no story: any story whose `featureId` isn't found
 * among `features` (e.g. its feature isn't approved, or is missing from the
 * plan) falls into a trailing `feature: null` group, so the Test sidebar always
 * reflects the same set the header counts. Empty groups are omitted.
 */
export function groupStoriesByFeature(stories: Story[], features: Feature[]): StoryGroup[] {
  const known = new Set(features.map((f) => f.id))
  const groups: StoryGroup[] = features
    .map((feature) => ({
      feature: feature as Feature | null,
      stories: stories.filter((s) => s.featureId === feature.id),
    }))
    .filter((group) => group.stories.length > 0)

  const orphans = stories.filter((s) => !known.has(s.featureId))
  if (orphans.length > 0) {
    groups.push({ feature: null, stories: orphans })
  }
  return groups
}
