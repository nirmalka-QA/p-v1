import { useState, useRef } from 'react'
import type { ComponentType, ReactNode } from 'react'

/** Appends a dictation transcript to existing context text, separated by a blank line. */
function appendTranscript(base: string, transcript: string): string {
  if (!base.trim()) return transcript
  return `${base}\n\n${transcript}`
}
import { Card, Text, Textarea, Button, Group, Paper, Badge, ThemeIcon, CloseButton } from '@mantine/core'
import {
  IconUpload,
  IconArrowRight,
  IconFile,
  IconFileTypePdf,
  IconFileTypeDocx,
  IconFileTypeTxt,
  IconFileTypeHtml,
  IconMarkdown,
} from '@tabler/icons-react'
import { ACCEPTED_FILE_EXTENSIONS } from './constants'
import { formatBytes, isAcceptedFile, fileExtension, fileKindLabel } from './helpers'
import styles from './DiscoveryContextInput.module.css'

/** Per-extension icon for the uploaded-file list; falls back to a generic file. */
const KIND_ICON: Record<string, ComponentType<{ size?: number }>> = {
  pdf: IconFileTypePdf,
  docx: IconFileTypeDocx,
  txt: IconFileTypeTxt,
  md: IconMarkdown,
  html: IconFileTypeHtml,
}

export interface DiscoveryContextInputProps {
  onSubmit: (context: string, files: File[]) => void
  submitLabel?: string
  disabled?: boolean
  loading?: boolean
  /**
   * Render-prop for an optional dictation control beside the upload button. Receives the
   * `onTranscript` callback so it can append recognised speech directly into the textarea.
   * Each app supplies its own DictationButton (or nothing).
   */
  dictationSlot?: (onTranscript: (transcript: string) => void) => ReactNode
}

export function DiscoveryContextInput({
  onSubmit,
  submitLabel = 'Build Knowledge Base',
  disabled = false,
  loading = false,
  dictationSlot,
}: DiscoveryContextInputProps) {
  const [context, setContext] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addFiles(incoming: FileList | File[]) {
    setFiles((prev) => [
      ...prev,
      ...Array.from(incoming)
        .filter(isAcceptedFile)
        .filter((f) => !prev.some((e) => e.name === f.name)),
    ])
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  function handlePicked(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    addFiles(e.dataTransfer.files)
  }

  function handleSubmit() {
    if (!context.trim() && files.length === 0) return
    onSubmit(context, files)
  }

  const canSubmit = (context.trim().length > 0 || files.length > 0) && !disabled

  return (
    <Card
      withBorder
      radius="md"
      padding="lg"
      className={`${styles.card} ${dragging ? styles.dropping : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Label */}
      <Text component="label" ff="monospace" size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs" display="block">
        Context &amp; Notes
      </Text>

      {/* Big input box */}
      <Textarea
        placeholder="Describe the project, paste requirements, add links, or drop files below…"
        value={context}
        onChange={(e) => setContext(e.currentTarget.value)}
        disabled={disabled}
        autosize
        minRows={7}
        maxRows={16}
      />

      {/* Uploaded files — shown as soon as they are added */}
      {files.length > 0 && (
        <Group gap={6} mt="sm">
          {files.map((f) => {
            const Icon = KIND_ICON[fileExtension(f.name)] ?? IconFile
            return (
              <Paper key={f.name} withBorder radius="sm" px="xs" py={4}>
                <Group gap={6} wrap="nowrap">
                  <ThemeIcon size={20} radius="sm" variant="light" color="gray">
                    <Icon size={13} />
                  </ThemeIcon>
                  <Text size="xs" maw={160} truncate>
                    {f.name}
                  </Text>
                  <Badge size="xs" variant="light" color="indigo" radius="sm">
                    {fileKindLabel(f.name)}
                  </Badge>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {formatBytes(f.size)}
                  </Text>
                  <CloseButton size="xs" onClick={() => removeFile(f.name)} aria-label={`Remove ${f.name}`} />
                </Group>
              </Paper>
            )
          })}
        </Group>
      )}

      {/* Upload + optional dictation slot (left) + primary action (right) */}
      <Group justify="space-between" mt="md" wrap="wrap" gap="sm">
        <Group gap="xs">
          {dictationSlot?.((t) => setContext((c) => appendTranscript(c, t)))}
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconUpload size={14} />}
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
          >
            Upload files
          </Button>
          <Text size="xs" c="dimmed">
            Documents, transcripts &amp; code — PDF, DOCX, TXT, MD, HTML
          </Text>
        </Group>

        <Button
          variant="accent"
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          rightSection={<IconArrowRight size={14} />}
        >
          {submitLabel}
        </Button>
      </Group>

      {/* Single hidden input — accepts every supported type */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
        hidden
        onChange={handlePicked}
      />
    </Card>
  )
}
