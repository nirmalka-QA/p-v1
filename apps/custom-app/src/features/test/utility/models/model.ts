import type { TestType, TestStatus, TestCase } from '../../../../types'

// Domain types this feature works with, re-exported from the shared model.
export type { TestCase, TestStatus, TestType, Story, AnalysisStep } from '../../../../types'

/**
 * Test-case form shape. `type` and `status` are kept as their unions (the
 * Selects yield those exact string values). A type alias (not interface) so it
 * satisfies the Yup resolver's `Record<string, unknown>` validate signature.
 */
export type TestCaseFormValues = {
  title: string
  type: TestType
  steps: string[]
  expectedResult: string
  status: TestStatus
}

/** Payload for generating (or adding more) AI test cases for a single story. */
export interface GenerateTestsInput {
  projectId: string
  storyId: string
  /** Optional extra instructions — specific edge cases / scenarios to cover. */
  context?: string
}

/** A pass / fail / pending tally over a set of test cases. */
export interface TestSummary {
  pass: number
  fail: number
  pending: number
  total: number
}

/** One progress step reported by the backend test-generation job, with real start/end times. */
export interface TestGenStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string | null
  endedAt?: string | null
}

/** Progressive status of an async test-generation job (mirrors the backend TestGenerationStatusDto). */
export interface TestGenerationStatus {
  jobId: string
  status: 'running' | 'completed' | 'failed'
  steps: TestGenStep[]
  /** The refreshed project-wide test-case list; populated only when completed. */
  testCases?: TestCase[] | null
}
