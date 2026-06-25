import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Box, Paper, Group, Text, CopyButton, UnstyledButton, Skeleton } from '@mantine/core'
import { IconCopy, IconCheck, IconDownload, IconFileCode } from '@tabler/icons-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import type { GeneratedFile } from '../utility/models/model'
import { isJsFamily } from '../utility/helpers/helpers'
import styles from '../utility/styles/implementation.module.css'

interface CodeEditorProps {
  files: GeneratedFile[]
  /** When provided, shows a "Download all" action (zips the files). */
  onDownloadAll?: () => void
  /** Optional file-explorer pane rendered inside the editor window (VS Code-style). */
  sidebar?: ReactNode
  /** Header shown above the explorer pane (e.g. repo name). */
  sidebarTitle?: string
  /** Shows a loading skeleton in the editor body (e.g. while a file is fetched). */
  loading?: boolean
  /** Render flush inside a parent container (no own border/radius) — used by the code workbench. */
  embedded?: boolean
}

function cx(...cls: (string | boolean | undefined | null)[]) {
  return cls.filter(Boolean).join(' ')
}

/** Returns the basename for a tab label (paths can be deep). */
function basename(path: string): string {
  return path.split('/').pop() ?? path
}

/**
 * Read-only, VS Code-style editor window: an optional dark file explorer on the
 * left, file tabs, a breadcrumb path, and CodeMirror (one-dark) for the content
 * — all inside a single dark shell. Used both for the connected repo (with the
 * explorer) and for generated code (tabs only). Read-only is intentional (§8.3).
 */
export function CodeEditor({ files, onDownloadAll, sidebar, sidebarTitle, loading, embedded = false }: CodeEditorProps) {
  const [active, setActive] = useState(files[0]?.filename ?? '')

  // Keep a valid active tab if the file set changes (e.g. after regeneration).
  useEffect(() => {
    if (files.length && !files.some((f) => f.filename === active)) {
      setActive(files[0].filename)
    }
  }, [files, active])

  if (files.length === 0 && !sidebar) return null

  const activeFile = files.find((f) => f.filename === active) ?? files[0]
  const extensions =
    activeFile && isJsFamily(activeFile.language) ? [javascript({ jsx: true, typescript: true })] : []

  return (
    <Paper
      withBorder={!embedded}
      radius={embedded ? 0 : 'md'}
      className={cx(styles.editorShell, embedded && styles.editorEmbedded)}
    >
      <Box className={styles.editorLayout}>
        {sidebar && (
          <Box className={styles.editorSidebar}>
            <Text className={styles.editorSidebarTitle}>{sidebarTitle ?? 'Explorer'}</Text>
            <Box className={styles.editorSidebarBody}>{sidebar}</Box>
          </Box>
        )}

        <Box className={styles.editorMain}>
          {files.length > 0 && (
            <Box className={styles.editorBar}>
              <Box className={styles.editorTabs}>
                {files.map((file) => (
                  <UnstyledButton
                    key={file.filename}
                    className={cx(styles.editorTab, file.filename === active && styles.editorTabActive)}
                    onClick={() => setActive(file.filename)}
                  >
                    <IconFileCode size={13} />
                    <Text span inherit>
                      {basename(file.filename)}
                    </Text>
                  </UnstyledButton>
                ))}
              </Box>

              <Group gap={2} wrap="nowrap" px={6}>
                {activeFile && (
                  <CopyButton value={activeFile.content} timeout={1500}>
                    {({ copied, copy }) => (
                      <UnstyledButton className={styles.editorAction} onClick={copy}>
                        {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                        <Text span inherit>
                          {copied ? 'Copied' : 'Copy'}
                        </Text>
                      </UnstyledButton>
                    )}
                  </CopyButton>
                )}
                {onDownloadAll && (
                  <UnstyledButton className={styles.editorAction} onClick={onDownloadAll}>
                    <IconDownload size={13} />
                    <Text span inherit>
                      Download all
                    </Text>
                  </UnstyledButton>
                )}
              </Group>
            </Box>
          )}

          {loading ? (
            <Box p="md">
              <Skeleton height={400} radius="sm" />
            </Box>
          ) : activeFile ? (
            <>
              <Box className={styles.editorPath}>
                <IconFileCode size={12} className={styles.editorPathIcon} />
                <Text size="xs" ff="monospace" truncate className={styles.editorPathText}>
                  {activeFile.filename}
                </Text>
              </Box>
              <Box className={styles.editorBody}>
                <CodeMirror
                  value={activeFile.content}
                  theme={oneDark}
                  extensions={extensions}
                  editable={false}
                  height="440px"
                  basicSetup={{ lineNumbers: true, highlightActiveLine: false, foldGutter: false }}
                />
              </Box>
            </>
          ) : (
            <Text className={styles.editorPlaceholder}>Select a file from the explorer to view its contents.</Text>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
