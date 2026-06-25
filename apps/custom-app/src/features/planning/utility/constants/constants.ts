import type { FeatureStatus } from '../../../../types'
import type { Priority, Complexity, FeatureFormValues } from '../models/model'

/**
 * Simulated AI planning steps, mirroring Discovery's analysis progress. Drives
 * the visible step-by-step indicator while the feature list is generated.
 */
export const PLANNING_STEPS: { id: string; label: string; estimatedSeconds: number }[] = [
  { id: 'read-kb', label: 'Reading the Knowledge Base', estimatedSeconds: 1 },
  { id: 'identify', label: 'Identifying candidate features', estimatedSeconds: 2 },
  { id: 'estimate', label: 'Estimating priority and complexity', estimatedSeconds: 1.5 },
  { id: 'requirements', label: 'Drafting functional & non-functional requirements', estimatedSeconds: 2 },
  { id: 'organise', label: 'Organising the feature list', estimatedSeconds: 1 },
]

/** Priority display metadata — single source for label + Mantine colour. */
export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  high: { label: 'High', color: 'red' },
  medium: { label: 'Medium', color: 'orange' },
  low: { label: 'Low', color: 'gray' },
}

/** Complexity display metadata — single source for label + Mantine colour. */
export const COMPLEXITY_META: Record<Complexity, { label: string; color: string }> = {
  xs: { label: 'XS', color: 'teal' },
  s: { label: 'S', color: 'teal' },
  m: { label: 'M', color: 'indigo' },
  l: { label: 'L', color: 'grape' },
  xl: { label: 'XL', color: 'grape' },
}

/** Human-readable complexity hint, shown as a tooltip on the complexity badge. */
export const COMPLEXITY_HINT: Record<Complexity, string> = {
  xs: 'Extra small — trivial effort',
  s: 'Small effort',
  m: 'Medium effort',
  l: 'Large effort',
  xl: 'Extra large — major effort',
}

/** Select options for the feature form (derived from the metadata maps). */
export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_META) as Priority[]).map((value) => ({
  value,
  label: PRIORITY_META[value].label,
}))

export const COMPLEXITY_OPTIONS = (Object.keys(COMPLEXITY_META) as Complexity[]).map((value) => ({
  value,
  label: COMPLEXITY_META[value].label,
}))

/**
 * Feature status workflow (Planning phase). Only `approved` features flow into
 * the Features phase as story candidates; the rest stay in Planning.
 */
export const FEATURE_STATUS_META: Record<FeatureStatus, { label: string; color: string }> = {
  proposed: { label: 'Proposed', color: 'gray' },
  'under-review': { label: 'Under Review', color: 'yellow' },
  'in-progress': { label: 'In Progress', color: 'blue' },
  approved: { label: 'Approved', color: 'teal' },
  deferred: { label: 'Deferred', color: 'orange' },
  rejected: { label: 'Rejected', color: 'red' },
}

/** Status options for the per-feature status menu (in workflow order). */
export const FEATURE_STATUS_OPTIONS = (
  ['proposed', 'under-review', 'in-progress', 'approved', 'deferred', 'rejected'] as FeatureStatus[]
).map((value) => ({ value, label: FEATURE_STATUS_META[value].label }))

/** Statuses that "Approve Plan" promotes to `approved` (includes in-flight review). */
export const APPROVABLE_STATUSES: FeatureStatus[] = ['proposed', 'under-review', 'in-progress']

/** Below this many populated KB sections, planning results are flagged as thin. */
export const THIN_KB_SECTION_THRESHOLD = 3

/** Initial values for a manually added feature. */
export const FEATURE_FORM_INITIAL: FeatureFormValues = {
  title: '',
  description: '',
  priority: 'medium',
  complexity: 'm',
  functionalRequirements: [''],
  nonFunctionalRequirements: [''],
}
