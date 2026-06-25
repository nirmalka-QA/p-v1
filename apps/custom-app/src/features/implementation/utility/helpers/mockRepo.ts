import type { RepoConnection, RepoFile } from '../../../../types'
import { languageOf } from './helpers'

/** Slugifies a project name into a plausible repo name. */
function repoSlug(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug || 'project'
}

/**
 * Mock repository connection for the viewer. Mirrors what a real "Connect
 * Repository" call would return — connection metadata plus a read-only file
 * tree. File contents are resolved on demand via `repoFileContent`.
 */
export function buildRepoConnection(projectId: string, projectName: string, connectedAt: string): RepoConnection {
  const slug = repoSlug(projectName)
  return {
    projectId,
    repoName: `acme/${slug}`,
    branch: 'main',
    provider: 'github',
    connectedAt,
    fileTree: FILE_TREE,
  }
}

const FILE_TREE: RepoFile[] = [
  {
    name: 'src',
    path: 'src',
    type: 'directory',
    children: [
      {
        name: 'components',
        path: 'src/components',
        type: 'directory',
        children: [{ name: 'App.tsx', path: 'src/components/App.tsx', type: 'file' }],
      },
      {
        name: 'features',
        path: 'src/features',
        type: 'directory',
        children: [{ name: 'index.ts', path: 'src/features/index.ts', type: 'file' }],
      },
      { name: 'main.tsx', path: 'src/main.tsx', type: 'file' },
    ],
  },
  {
    name: 'server',
    path: 'server',
    type: 'directory',
    children: [{ name: 'index.ts', path: 'server/index.ts', type: 'file' }],
  },
  { name: 'package.json', path: 'package.json', type: 'file' },
  { name: 'README.md', path: 'README.md', type: 'file' },
]

const FILE_CONTENT: Record<string, string> = {
  'src/main.tsx': [
    "import { createRoot } from 'react-dom/client'",
    "import { App } from './components/App'",
    '',
    "createRoot(document.getElementById('root')!).render(<App />)",
    '',
  ].join('\n'),
  'src/components/App.tsx': [
    "import { MantineProvider } from '@mantine/core'",
    '',
    'export function App() {',
    '  return (',
    '    <MantineProvider>',
    '      <main>Connected repository — read-only preview.</main>',
    '    </MantineProvider>',
    '  )',
    '}',
    '',
  ].join('\n'),
  'src/features/index.ts': [
    '// Feature barrel — exports each domain feature entry point.',
    "export * from './example'",
    '',
  ].join('\n'),
  'server/index.ts': [
    "import express from 'express'",
    '',
    'const app = express()',
    'app.use(express.json())',
    '',
    "app.get('/health', (_req, res) => res.json({ ok: true }))",
    '',
    'app.listen(3000)',
    '',
  ].join('\n'),
  'package.json': [
    '{',
    '  "name": "connected-repo",',
    '  "private": true,',
    '  "version": "1.0.0",',
    '  "scripts": {',
    '    "dev": "vite",',
    '    "build": "vite build",',
    '    "test": "vitest"',
    '  }',
    '}',
    '',
  ].join('\n'),
  'README.md': [
    '# Connected Repository',
    '',
    'This is a read-only preview of the connected repository, shown in the WISPR',
    'Implementation phase. Editing, committing, and branch switching are out of',
    'scope for this release.',
    '',
  ].join('\n'),
}

/** Resolves the contents of a repo file by path (read-only viewer). */
export function repoFileContent(path: string): { language: string; content: string } {
  const content = FILE_CONTENT[path] ?? `// ${path}\n// No preview available for this file.\n`
  return { language: languageOf(path), content }
}
