import type { RepoFile } from '../../../../types'

/** Maps a filename to a coarse language id used for syntax highlighting/labels. */
export function languageOf(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'ts':
      return 'typescript'
    case 'tsx':
      return 'tsx'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'json':
      return 'json'
    case 'css':
      return 'css'
    case 'md':
      return 'markdown'
    case 'html':
      return 'html'
    case 'yml':
    case 'yaml':
      return 'yaml'
    default:
      return 'text'
  }
}

/** True for languages CodeMirror's JS extension highlights (TS/JS family). */
export function isJsFamily(language: string): boolean {
  return ['typescript', 'tsx', 'javascript'].includes(language)
}

/**
 * Derives a PascalCase component name from a story title, so generated code is
 * named meaningfully (e.g. "User can reset password" → "UserCanResetPassword").
 */
export function toComponentName(title: string): string {
  const cleaned = title
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  return /^[A-Za-z]/.test(cleaned) ? cleaned : `Story${cleaned}`
}

/** Flattens a repo tree to its file (leaf) paths — used to resolve the first file. */
export function firstFilePath(tree: RepoFile[]): string | null {
  for (const node of tree) {
    if (node.type === 'file') return node.path
    if (node.children) {
      const found = firstFilePath(node.children)
      if (found) return found
    }
  }
  return null
}

/** Finds a file node anywhere in the tree by its full path. */
export function findFile(tree: RepoFile[], path: string): RepoFile | null {
  for (const node of tree) {
    if (node.path === path && node.type === 'file') return node
    if (node.children) {
      const found = findFile(node.children, path)
      if (found) return found
    }
  }
  return null
}
