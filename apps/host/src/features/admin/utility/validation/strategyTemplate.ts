import * as yup from 'yup'
import { DOC_TYPES } from '../models/strategyTemplate'
import type { TemplateDraft } from '../models/strategyTemplate'

/**
 * Validation for the strategy template editor (Yup + mantine-form-yup-resolver,
 * mirroring projectWizardSchema). Nested arrays validate per-path so the form
 * surfaces inline errors at `phases.N.name`, `phases.N.inputs.M.name`, etc.
 */

const docTypeList = yup
  .array()
  .of(yup.string().oneOf(DOC_TYPES as unknown as string[]))
  .min(1, 'Pick at least one document type.')
  .required('Pick at least one document type.')

const inputSlotSchema = yup.object({
  name: yup.string().trim().required('Document name is required.'),
  documentTypes: docTypeList,
})

const outputSlotSchema = yup.object({
  name: yup.string().trim().required('Document name is required.'),
  documentTypes: docTypeList,
  // The generation prompt is recommended but not required — a slot can be wired up first.
  prompt: yup.string().default(''),
})

const phaseSchema = yup.object({
  name: yup.string().trim().required('Phase name is required.'),
  description: yup.string().default(''),
  mandatory: yup.boolean().default(false),
  inputs: yup.array().of(inputSlotSchema).default([]),
  outputs: yup.array().of(outputSlotSchema).min(1, 'Add at least one output document.').required(),
})

export const strategyTemplateSchema = yup.object({
  name: yup.string().trim().required('Template name is required.'),
  description: yup.string().default(''),
  phases: yup.array().of(phaseSchema).min(1, 'Add at least one phase.').required(),
})

/**
 * A best-effort, human-readable summary of the first validation problem — shown
 * in a notification when submit is blocked, so the failure isn't only buried in
 * a collapsed phase. Field-level errors still render inline via the resolver.
 */
export function firstDraftError(draft: TemplateDraft): string | null {
  if (!draft.name.trim()) return 'Give the template a name.'
  if (draft.phases.length === 0) return 'Add at least one phase.'
  for (const [i, phase] of draft.phases.entries()) {
    const label = phase.name.trim() || `Phase ${i + 1}`
    if (!phase.name.trim()) return `Name ${label}.`
    if (phase.outputs.length === 0) return `${label} needs at least one output document.`
    for (const slot of [...phase.inputs, ...phase.outputs]) {
      if (!slot.name.trim()) return `${label} has a document without a name.`
      if (slot.documentTypes.length === 0) return `Pick a type for "${slot.name}" in ${label}.`
    }
  }
  return null
}
