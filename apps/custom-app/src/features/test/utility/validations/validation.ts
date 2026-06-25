import * as yup from 'yup'

/**
 * Test-case form schema. Title and expected result are required so every case is
 * self-describing (requirements §9.1); steps are optional and sanitised on save.
 */
export const testCaseSchema = yup.object({
  title: yup.string().trim().min(3, 'Title must be at least 3 characters.').required('Title is required.'),
  type: yup
    .string()
    .oneOf(['unit', 'integration', 'e2e', 'edge'])
    .required('Select a test type.'),
  steps: yup.array().of(yup.string().default('')).default(['']),
  expectedResult: yup.string().trim().required('Describe the expected result.'),
  status: yup
    .string()
    .oneOf(['pending', 'pass', 'fail'])
    .required('Select a status.'),
})
