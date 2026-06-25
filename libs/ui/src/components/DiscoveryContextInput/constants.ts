/** Accepted upload formats for discovery context input (documents, transcripts, and code/markup). */
export const ACCEPTED_FILE_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.html']
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html',
]
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

/**
 * Extensions we re-type to text/plain when building a download URL, so the
 * browser never executes them (an uploaded .html could otherwise run scripts in
 * our origin if its blob URL were opened). Binary docs (pdf/docx) are left as-is.
 */
export const INERT_TEXT_EXTENSIONS = ['txt', 'md', 'html']
