import type { ProjectType, ProjectFormValues } from './model'
import { ProjectStatus } from './model'

/** All project types — single source of truth (drives selects + validation). */
export const PROJECT_TYPES: ProjectType[] = ['healthcare', 'insurance', 'fintech', 'retail', 'other']

/** Display label per project type. */
export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  healthcare: 'Healthcare',
  insurance: 'Insurance',
  fintech: 'Fintech',
  retail: 'Retail',
  other: 'Product',
}

/** Select options for the project type field. */
export const PROJECT_TYPE_OPTIONS = PROJECT_TYPES.map((value) => ({
  value,
  label: PROJECT_TYPE_LABEL[value],
}))

// The API represents project type as a numeric id (best-effort mapping; the only
// place to change it).
export const PROJECT_TYPE_ID: Record<ProjectType, number> = {
  healthcare: 1,
  insurance: 2,
  fintech: 3,
  retail: 4,
  other: 5,
}
export const PROJECT_TYPE_BY_ID: Record<number, ProjectType> = {
  1: 'healthcare',
  2: 'insurance',
  3: 'fintech',
  4: 'retail',
  5: 'other',
}

/** Project status display label + Mantine color. */
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: 'New',
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.COMPLETED]: 'Completed',
}
export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: 'blue',
  [ProjectStatus.IN_PROGRESS]: 'orange',
  [ProjectStatus.COMPLETED]: 'teal',
}

/** Mantine theme color names used as deterministic project avatar backgrounds. */
export const PROJECT_AVATAR_COLORS = ['indigo', 'teal', 'orange', 'pink', 'grape', 'cyan'] as const

/** Initial values for the create-project form. */
export const PROJECT_FORM_INITIAL: ProjectFormValues = {
  name: '',
  description: '',
  type: '',
  logo: '',
}
