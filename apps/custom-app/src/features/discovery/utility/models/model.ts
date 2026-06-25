import type { KnowledgeBase as KnowledgeBaseType } from '../../../../types'

// Domain types this feature works with, re-exported from the shared model.
export type {
  KnowledgeBase,
  KBSection,
  KBNote,
  KBSectionId,
  UploadedFile,
  AnalysisStep,
} from '../../../../types'

/** Payload for the generate-KB mutation. */
export interface GenerateKbInput {
  projectId: string
  context: string
  fileCount: number
}

/** One progress step reported by the backend, with real start/end times. */
export interface KbGenStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string | null
  endedAt?: string | null
}

/** Progressive status of an async KB-generation job. */
export interface KbGenerationStatus {
  jobId: string
  status: 'running' | 'completed' | 'failed'
  steps: KbGenStep[]
  knowledgeBase?: KnowledgeBaseType | null
}

/** Editable fields of a KB note (manual edit form). */
export type NoteFormValues = {
  title: string
  description: string
  content: string
}
