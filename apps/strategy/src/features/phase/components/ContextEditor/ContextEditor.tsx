import { useEffect, useState } from 'react'
import { Stack, Box, Text, Button, Textarea, Group } from '@mantine/core'
import styles from './ContextEditor.module.css'

interface ContextEditorProps {
  /** The saved context/prompt ('' when none). */
  context: string
  /** Whether the inline editor is open (controlled by the parent's subtle trigger). */
  opened: boolean
  /** When the phase is Done the editor is read-only — saved context still shows. */
  locked: boolean
  onSave: (text: string) => void
  onClose: () => void
}

/**
 * The per-document context/prompt block shown beneath a file. Any saved context is always
 * visible as a light inset; the inline editor opens on demand (via a subtle trigger the
 * parent owns) unless the phase is locked.
 */
export function ContextEditor({ context, opened, locked, onSave, onClose }: ContextEditorProps) {
  const [draft, setDraft] = useState(context)
  const hasContext = context.trim().length > 0
  const editing = opened && !locked

  // Refresh the draft from the saved value whenever the editor opens.
  useEffect(() => {
    if (opened) setDraft(context)
  }, [opened, context])

  function save() {
    onSave(draft)
    onClose()
  }

  if (!hasContext && !editing) return null

  return (
    <Stack gap="xs" mt="xs">
      {hasContext ? (
        <Box className={styles.context ?? ''}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4}>
            Context
          </Text>
          <Text size="sm" className={styles.body ?? ''}>
            {context}
          </Text>
        </Box>
      ) : null}

      {editing ? (
        <Stack gap="xs">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder="Add context or a prompt for this document — focus areas, constraints, or how it should shape the generated outputs."
            autosize
            minRows={3}
          />
          <Group justify="flex-end" gap="xs">
            <Button size="compact-sm" variant="subtle" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button size="compact-sm" variant="light" color="violet" onClick={save}>
              Save context
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Stack>
  )
}
