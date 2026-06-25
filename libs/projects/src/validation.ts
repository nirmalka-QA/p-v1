import * as yup from 'yup'

export const projectSchema = yup.object({
  name: yup.string().trim().required('Project name is required.'),
  description: yup.string().trim().required('Description is required.'),
  // `type` holds the selected project-type id (from the API). Required, non-empty.
  type: yup.string().required('Select a project type.'),
  logo: yup.string().default(''),
})

/**
 * Create-project WIZARD schema. `projectType` holds the chosen federation
 * project-type key; availability (coming-soon) is enforced in the UI, not here.
 */
export const projectWizardSchema = yup.object({
  name: yup.string().trim().required('Project name is required.'),
  description: yup.string().trim().required('Description is required.'),
  projectType: yup.string().required('Select a project type.'),
  // Industry/category is optional — empty string means "not specified".
  industry: yup.string().default(''),
  logo: yup.string().default(''),
})
