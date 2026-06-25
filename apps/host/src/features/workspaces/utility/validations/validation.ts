import * as yup from 'yup'
import { WORKSPACE_NAME_MAX } from '../constants/constants'

/**
 * Validation for the create-workspace form — name is required and bounded, a colour
 * must be chosen. Mirrors the projectWizardSchema pattern (Yup + mantine-form-yup-resolver)
 * so form validation stays consistent across the host's create flows.
 */
export const workspaceSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('Workspace name is required.')
    .max(WORKSPACE_NAME_MAX, `Keep the name under ${WORKSPACE_NAME_MAX} characters.`),
  description: yup.string().trim().default(''),
  colorSeed: yup.string().required('Pick a colour.'),
})
