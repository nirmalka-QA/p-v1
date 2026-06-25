import { Card, Group, Badge, Text, Box, Tooltip } from '@mantine/core'
import { IconSparkles, IconArchive, IconArrowsExchange } from '@tabler/icons-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { KBNote } from '../utility/models/model'
import styles from '../utility/styles/kb.module.css'

dayjs.extend(relativeTime)

interface KBNoteCardProps {
  note: KBNote
  onOpen: (note: KBNote) => void
}

export function KBNoteCard({ note, onOpen }: KBNoteCardProps) {
  const superseded = note.status === 'superseded'

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      className={styles.noteCard}
      opacity={superseded ? 0.6 : 1}
      onClick={() => onOpen(note)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(note)}
    >
      <Group gap={6} mb={8}>
        {superseded ? (
          <Badge size="xs" color="gray" variant="light" leftSection={<IconArchive size={9} />} tt="uppercase">
            Superseded
          </Badge>
        ) : (
          <Badge size="xs" color="violet" variant="light" leftSection={<IconSparkles size={9} />} tt="uppercase">
            AI Generated
          </Badge>
        )}
        {note.generation != null && (
          <Badge size="xs" color="gray" variant="default" radius="sm" ff="monospace">
            gen {note.generation}
          </Badge>
        )}
      </Group>

      <Text fw={600} size="sm" mb={4} td={superseded ? 'line-through' : undefined}>
        {note.title}
      </Text>
      <Text size="xs" c="dimmed" lineClamp={2} mb="sm">
        {note.description}
      </Text>

      {/* Why this note is no longer valid (superseded), or what changed (new note). */}
      {superseded && note.supersededReason && (
        <Text size="xs" c="dimmed" mb="sm" fs="italic">
          Superseded: {note.supersededReason}
        </Text>
      )}
      {!superseded && note.changeSummary && (
        <Group gap={6} mb="sm" wrap="nowrap" align="flex-start">
          <IconArrowsExchange size={13} />
          <Text size="xs" c="dimmed" lineClamp={2}>
            {note.changeSummary}
          </Text>
        </Group>
      )}

      <Group gap="sm" wrap="wrap">
        {note.sourceFile && (
          <Badge size="xs" variant="default" ff="monospace" radius="sm">
            {note.sourceFile}
          </Badge>
        )}
        <Tooltip label={dayjs(note.generatedAt).format('YYYY-MM-DD HH:mm')}>
          <Text size="xs" c="dimmed" ff="monospace">
            {dayjs(note.generatedAt).fromNow()}
          </Text>
        </Tooltip>
        <Box flex={1} />
        <Text size="xs" c="dimmed">
          Open note →
        </Text>
      </Group>
    </Card>
  )
}
