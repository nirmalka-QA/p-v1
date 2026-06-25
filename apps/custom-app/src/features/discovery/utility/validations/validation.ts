import * as yup from 'yup'

/** KB note manual-edit schema. Title + content are required; description optional. */
export const noteSchema = yup.object({
  title: yup.string().trim().min(2, 'Title is required.').required('Title is required.'),
  description: yup.string().trim().default(''),
  content: yup.string().trim().min(1, 'Content cannot be empty.').required('Content is required.'),
})
