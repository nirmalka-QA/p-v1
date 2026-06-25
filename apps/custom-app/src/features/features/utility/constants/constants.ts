import type { StoryStatus, StoryComponent, ValidationRule } from '../../../../types'
import type { StoryEffort, StoryFormValues } from '../models/model'

/** Story lifecycle labels — single source for Select options and filters. */
export const STORY_STATUS_LABEL: Record<StoryStatus, string> = {
  draft: 'Draft',
  ready: 'Ready for Dev',
  'in-progress': 'In Progress',
  done: 'Done',
  closed: 'Closed',
}

/** Ordered status options for the status Select / filter. */
export const STORY_STATUS_OPTIONS = (
  ['draft', 'ready', 'in-progress', 'done', 'closed'] as StoryStatus[]
).map((value) => ({ value, label: STORY_STATUS_LABEL[value] }))

/** Allowed story-point efforts (Fibonacci). */
export const EFFORT_VALUES: StoryEffort[] = [1, 2, 3, 5, 8]
export const EFFORT_OPTIONS = EFFORT_VALUES.map((v) => ({
  value: String(v),
  label: `${v} pt${v === 1 ? '' : 's'}`,
}))

/**
 * Mock team members for the story assignee field/filter. Assignment at story
 * level is in scope; team management is external (requirements §2.2 / §7.5).
 */
export const MOCK_ASSIGNEES = [
  'Alex Rivera',
  'Jordan Lee',
  'Sam Patel',
  'Casey Morgan',
]

/** Sentinel filter value meaning "no status/assignee filter applied". */
export const FILTER_ALL = 'all'

/** Default values for a manually added story. */
export const STORY_FORM_INITIAL: StoryFormValues = {
  title: '',
  description: '',
  asA: '',
  iWant: '',
  soThat: '',
  acceptanceCriteria: [{ type: 'happy-path', title: '', given: '', when: '', then: '' }],
  background: '',
  epic: '',
  version: '1.0',
  assumptions: [],
  navigationFlow: { entryPoint: '', happyPath: [], alternatePaths: [], exceptionPaths: [] },
  components: [] as StoryComponent[],
  validationRules: [] as ValidationRule[],
  effort: '3',
  status: 'draft' as StoryStatus,
  assignee: '',
  dependencies: [],
}

/** Scenario types for a Gherkin acceptance criterion (ADR-0033). */
export const GHERKIN_TYPE_OPTIONS = [
  { value: 'happy-path', label: 'Happy path' },
  { value: 'field-validation', label: 'Field validation' },
  { value: 'cross-field-validation', label: 'Cross-field validation' },
  { value: 'exception', label: 'Exception' },
  { value: 'alternate-path', label: 'Alternate path' },
]

/** When a field-level validation rule fires (ADR-0033). */
export const VALIDATION_TIMING_OPTIONS = [
  { value: 'real-time', label: 'Real-time' },
  { value: 'on-blur', label: 'On blur' },
  { value: 'on-submit', label: 'On submit' },
]

/** Simulated AI story-generation steps (visible progress, §2.3). */
export const STORY_GEN_STEPS: { id: string; label: string; estimatedSeconds: number }[] = [
  { id: 'read', label: 'Reading the feature and Knowledge Base', estimatedSeconds: 1 },
  { id: 'slice', label: 'Slicing the feature into user stories', estimatedSeconds: 2 },
  { id: 'criteria', label: 'Writing acceptance criteria', estimatedSeconds: 1.5 },
  { id: 'estimate', label: 'Estimating effort', estimatedSeconds: 1 },
]
