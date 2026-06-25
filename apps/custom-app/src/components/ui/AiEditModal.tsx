import { useState, useEffect } from 'react'
import { Modal, Stack, Group, Text, Textarea, Button } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { DictationButton } from './DictationButton'
import { appendTranscript } from '../../hooks/useDictation'

interface AiEditModalProps {
  opened: boolean
  onClose: () => void
  /** Heading, e.g. "Edit story with AI". */
  title: string
  /** One line describing what the enhancement does. */
  description: string
  loading: boolean
  /** Runs the enhancement; the caller closes the modal on success. */
  onEnhance: (instructions: string | undefined) => void
}

/**
 * Reusable "Edit with AI" dialog: an optional free-text guidance box plus an
 * enhance action. Used wherever AI-generated content can be improved in place
 * (KB notes, planning features, user stories).
 */
export function AiEditModal({
  opened,
  onClose,
  title,
  description,
  loading,
  onEnhance,
}: AiEditModalProps) {
  const [instructions, setInstructions] = useState('')

  useEffect(() => {
    if (opened) setInstructions('')
  }, [opened])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="md"
      centered
      title={
        <Group gap="xs">
          <IconSparkles size={16} color="var(--mantine-color-violet-6)" />
          <Text fw={600}>{title}</Text>
        </Group>
      }
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed" lh={1.6}>
          {description}
        </Text>
        <Textarea
          label="Guidance (optional)"
          placeholder="e.g. focus on edge cases, tighten the wording, add security considerations"
          autosize
          minRows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.currentTarget.value)}
        />
        <Group justify="space-between" gap="sm">
          <DictationButton onTranscript={(t) => setInstructions((c) => appendTranscript(c, t))} />
          <Group gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="light"
              color="violet"
              leftSection={<IconSparkles size={15} />}
              loading={loading}
              onClick={() => onEnhance(instructions.trim() || undefined)}
            >
              Enhance with AI
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
