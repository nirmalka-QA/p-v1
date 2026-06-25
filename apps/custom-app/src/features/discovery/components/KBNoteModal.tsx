import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import { Modal, ScrollArea, Group, Badge, Text, Box, Divider } from '@mantine/core'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { EditMenu } from '@wispr/ui'
import { AiEditModal } from '../../../components/ui/AiEditModal'
import { KBNoteFormModal } from './KBNoteFormModal'
import { useEnhanceNoteMutation } from '../utility/services/discoveryApi'
import type { KBNote } from '../utility/models/model'
import styles from '../utility/styles/markdown.module.css'

dayjs.extend(relativeTime)

interface KBNoteModalProps {
  note: KBNote | null
  opened: boolean
  onClose: () => void
  projectId: string
}

export function KBNoteModal({ note, opened, onClose, projectId }: KBNoteModalProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [enhanceNote, { isLoading: enhancing }] = useEnhanceNoteMutation()

  if (!note) return null

  async function handleEnhance(instructions?: string) {
    if (!note) return
    try {
      await enhanceNote({ projectId, noteId: note.id, instructions }).unwrap()
      setAiOpen(false)
      notifications.show({
        color: 'teal',
        title: 'Note enhanced',
        message: 'The AI elaborated on this note’s content.',
      })
    } catch {
      notifications.show({ color: 'red', title: 'Enhancement failed', message: 'Please try again.' })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={note.title}
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{ title: { fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' } }}
    >
      <Box mb="md">
        <Group gap="sm" mb="sm" wrap="wrap">
          <Badge size="xs" variant="default" tt="uppercase" radius="sm">
            AI Generated
          </Badge>
          {note.sourceFile && (
            <Badge size="xs" variant="default" ff="monospace" radius="sm">
              {note.sourceFile}
            </Badge>
          )}
          <Text size="xs" c="dimmed" ff="monospace">
            {dayjs(note.generatedAt).fromNow()}
          </Text>
          <Box flex={1} />
          <EditMenu onManual={() => setEditOpen(true)} onAI={() => setAiOpen(true)} />
        </Group>
        {note.description && (
          <Text size="sm" c="dimmed">
            {note.description}
          </Text>
        )}
      </Box>

      <Divider mb="md" />

      <Box className={styles.markdown}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
      </Box>

      <KBNoteFormModal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={projectId}
        note={note}
      />
      <AiEditModal
        opened={aiOpen}
        onClose={() => setAiOpen(false)}
        title="Edit note with AI"
        description="Elaborates on this note’s content, optionally guided by your instructions."
        loading={enhancing}
        onEnhance={handleEnhance}
      />
    </Modal>
  )
}
