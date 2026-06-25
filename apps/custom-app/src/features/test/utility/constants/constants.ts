import type { TestStatus, TestType } from '../../../../types'

/** Test-type labels — single source for Select options and filters (§9.1). */
export const TEST_TYPE_LABEL: Record<TestType, string> = {
  unit: 'Unit',
  integration: 'Integration',
  e2e: 'E2E',
  edge: 'Edge Case',
}

/** Ordered type options for the type Select / filter. */
export const TEST_TYPE_OPTIONS = (
  ['unit', 'integration', 'e2e', 'edge'] as TestType[]
).map((value) => ({ value, label: TEST_TYPE_LABEL[value] }))

/** Mantine colour per test type — drives the type badge on each case. */
export const TEST_TYPE_COLOR: Record<TestType, string> = {
  unit: 'blue',
  integration: 'grape',
  e2e: 'indigo',
  edge: 'orange',
}

/** Test-status labels — pending / pass / fail (§9.2). */
export const TEST_STATUS_LABEL: Record<TestStatus, string> = {
  pending: 'Pending',
  pass: 'Pass',
  fail: 'Fail',
}

/** Ordered status options for the status Select / filter. */
export const TEST_STATUS_OPTIONS = (
  ['pending', 'pass', 'fail'] as TestStatus[]
).map((value) => ({ value, label: TEST_STATUS_LABEL[value] }))

/** Sentinel filter value meaning "no type/status filter applied". */
export const FILTER_ALL = 'all'

/** Default values for a manually added test case. */
export const TEST_FORM_INITIAL = {
  title: '',
  type: 'unit' as TestType,
  steps: [''],
  expectedResult: '',
  status: 'pending' as TestStatus,
}

/** Simulated AI test-generation steps (visible progress, §2.3). */
export const TEST_GEN_STEPS: { id: string; label: string; estimatedSeconds: number }[] = [
  { id: 'read', label: 'Reading the story and acceptance criteria', estimatedSeconds: 1 },
  { id: 'happy', label: 'Drafting happy-path test cases', estimatedSeconds: 1.5 },
  { id: 'negative', label: 'Adding negative and edge cases', estimatedSeconds: 1.5 },
  { id: 'expect', label: 'Writing expected results', estimatedSeconds: 1 },
]
