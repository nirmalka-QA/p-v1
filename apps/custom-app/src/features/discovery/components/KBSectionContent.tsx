import { useState } from 'react'
import { Box, Title, Group, Badge, Text, Stack, Divider, Button } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconFileText, IconHistory, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { EmptyState } from '@wispr/ui'
import { KBNoteCard } from './KBNoteCard'
import { KBNoteModal } from './KBNoteModal'
import type { KBSection } from '../utility/models/model'

dayjs.extend(relativeTime)

interface KBSectionContentProps {
  section: KBSection
  projectId: string
}

export function KBSectionContent({ section, projectId }: KBSectionContentProps) {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [historyOpen, { toggle: toggleHistory }] = useDisclosure(false)

  // Derive the open note from the live section so it reflects edit / AI updates.
  const activeNote = activeNoteId ? section.notes.find((n) => n.id === activeNoteId) ?? null : null

  // Append-only KB (ADR-0015): show active notes; keep superseded ones as collapsible history.
  const active = section.notes.filter((n) => n.status !== 'superseded')
  const superseded = section.notes.filter((n) => n.status === 'superseded')

  return (
    <Box>
      <Box mb="md">
        <Title order={4} size="h4">
          {section.label}
        </Title>
        {active.length > 0 && (
          <Group gap="sm" mt={6} wrap="wrap">
            {(section.sourceFiles ?? []).map((f) => (
              <Badge key={f} size="xs" variant="default" ff="monospace" radius="sm">
                {f}
              </Badge>
            ))}
            {section.generatedAt && (
              <Text size="xs" c="dimmed" ff="monospace">
                Generated {dayjs(section.generatedAt).fromNow()}
              </Text>
            )}
          </Group>
        )}
      </Box>

      <Divider mb="md" />

      {active.length > 0 ? (
        <Stack gap="sm">
          {active.map((note) => (
            <KBNoteCard key={note.id} note={note} onOpen={(n) => setActiveNoteId(n.id)} />
          ))}
        </Stack>
      ) : (
        <EmptyState
          icon={IconFileText}
          title="No notes yet"
          description={section.description}
        />
      )}

      {/* Superseded history — kept, never deleted (ADR-0015). */}
      {superseded.length > 0 && (
        <Box mt="lg">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconHistory size={14} />}
            rightSection={historyOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            onClick={toggleHistory}
          >
            Superseded history ({superseded.length})
          </Button>
          {historyOpen && (
            <Stack gap="sm" mt="sm">
              {superseded.map((note) => (
                <KBNoteCard key={note.id} note={note} onOpen={(n) => setActiveNoteId(n.id)} />
              ))}
            </Stack>
          )}
        </Box>
      )}

      <KBNoteModal
        note={activeNote}
        opened={activeNote !== null}
        onClose={() => setActiveNoteId(null)}
        projectId={projectId}
      />
    </Box>
  )
}
