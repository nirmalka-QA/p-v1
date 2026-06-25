import { zipSync, strToU8 } from 'fflate'
import type { GeneratedFile } from '../../../../types'

/** Triggers a browser download of a single text file. */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, filename.split('/').pop() ?? filename)
}

/**
 * Bundles the generated files into a .zip and downloads it. Folder structure is
 * preserved from each file's path so the archive mirrors the project layout.
 */
export function downloadFilesAsZip(zipName: string, files: GeneratedFile[]): void {
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    entries[file.filename] = strToU8(file.content)
  }
  const zipped = zipSync(entries, { level: 6 })
  // Copy into a fresh ArrayBuffer-backed view so the Blob type is unambiguous.
  const blob = new Blob([zipped.slice()], { type: 'application/zip' })
  triggerDownload(blob, zipName.endsWith('.zip') ? zipName : `${zipName}.zip`)
}

/** Creates a transient object URL, clicks an anchor, and revokes the URL. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
