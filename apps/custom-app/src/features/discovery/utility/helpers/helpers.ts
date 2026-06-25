// Re-export shared file-upload helpers from @wispr/ui so existing imports within
// this app continue to work without path changes.
import {
  formatBytes,
  fileExtension,
  fileKindLabel,
  isAcceptedFile,
  INERT_TEXT_EXTENSIONS,
} from '@wispr/ui'

export { formatBytes, fileExtension, fileKindLabel, isAcceptedFile }

/**
 * Builds a download object URL for an uploaded file. Text/markup/code files are
 * re-typed to text/plain so the browser treats them as inert text and never
 * executes them — defence-in-depth for accepting .html and other code files.
 */
export function createSafeDownloadUrl(file: File): string {
  if (INERT_TEXT_EXTENSIONS.includes(fileExtension(file.name))) {
    return URL.createObjectURL(new Blob([file], { type: 'text/plain' }))
  }
  return URL.createObjectURL(file)
}
