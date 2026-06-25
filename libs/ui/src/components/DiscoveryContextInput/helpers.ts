import { ACCEPTED_FILE_EXTENSIONS, MAX_FILE_SIZE } from './constants'

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** The lower-cased extension (no dot), e.g. "report.PDF" → "pdf". */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/** Short uppercase type label for a file, used when listing uploads. */
export function fileKindLabel(name: string): string {
  const ext = fileExtension(name)
  return ext ? ext.toUpperCase() : 'FILE'
}

/**
 * Whether a file is an accepted discovery upload (type + size). Matching on the
 * final extension also blocks disguised double extensions (e.g. "x.html.exe"
 * ends with ".exe", so it is rejected).
 */
export function isAcceptedFile(file: File): boolean {
  const okExt = ACCEPTED_FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  return okExt && file.size <= MAX_FILE_SIZE
}
