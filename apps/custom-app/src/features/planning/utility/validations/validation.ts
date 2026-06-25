import * as yup from 'yup'

/**
 * Feature form schema. Title + description are the required minimum for a manual
 * add (requirements §6.2); requirement lists are optional and sanitised on save.
 */
export const featureSchema = yup.object({
  title: yup.string().trim().min(3, 'Title must be at least 3 characters.').required('Title is required.'),
  description: yup
    .string()
    .trim()
    .min(10, 'Add a short description (at least 10 characters).')
    .required('Description is required.'),
  priority: yup.string().oneOf(['high', 'medium', 'low']).required('Select a priority.'),
  complexity: yup.string().oneOf(['xs', 's', 'm', 'l', 'xl']).required('Select a complexity.'),
  functionalRequirements: yup.array().of(yup.string().default('')).default(['']),
  nonFunctionalRequirements: yup.array().of(yup.string().default('')).default(['']),
})
