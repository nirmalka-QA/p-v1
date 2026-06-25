// Re-export shared file-upload constants from @wispr/ui so existing imports within
// this app continue to work without path changes.
export {
  ACCEPTED_FILE_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE,
  INERT_TEXT_EXTENSIONS,
} from '@wispr/ui'

import type { AnalysisStep } from '../models/model'

/** The simulated AI analysis steps, in order. */
export const ANALYSIS_STEPS: Omit<AnalysisStep, 'status'>[] = [
  { id: 'read', label: 'Reading uploaded files', estimatedSeconds: 1 },
  { id: 'extract', label: 'Extracting requirements and context', estimatedSeconds: 2 },
  { id: 'identify', label: 'Identifying patterns and themes', estimatedSeconds: 1.5 },
  { id: 'generate', label: 'Generating knowledge base sections', estimatedSeconds: 2.5 },
  { id: 'finalise', label: 'Finalising and organising notes', estimatedSeconds: 1 },
]
