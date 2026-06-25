import * as yup from 'yup'

/**
 * Story form schema. The as-a / I-want / so-that triplet is required so every
 * story reads in the standard user-story format (requirements §7.2); acceptance
 * criteria and dependencies are optional and sanitised on save.
 */
export const storySchema = yup.object({
  title: yup.string().trim().min(3, 'Title must be at least 3 characters.').required('Title is required.'),
  description: yup.string().trim().default(''),
  asA: yup.string().trim().required('Specify who the story is for.'),
  iWant: yup.string().trim().required('Describe what they want.'),
  soThat: yup.string().trim().required('Describe the benefit.'),
  // Structured Gherkin criteria (ADR-0033) — shape is managed by the form, not item-validated here.
  acceptanceCriteria: yup.array().default([]),
  effort: yup.string().oneOf(['1', '2', '3', '5', '8']).required('Select an effort estimate.'),
  status: yup
    .string()
    .oneOf(['draft', 'ready', 'in-progress', 'done', 'closed'])
    .required('Select a status.'),
  assignee: yup.string().default(''),
  dependencies: yup.array().of(yup.string().default('')).default([]),
})
