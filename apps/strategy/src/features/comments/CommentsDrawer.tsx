import { useState } from 'react'
import { Drawer, Box, Stack, Text, Paper, Textarea, Button, Group } from '@mantine/core'
import { IconPlus, IconMessage2 } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { EmptyState } from '@wispr/ui'
import { useUpdatePhaseStateMutation } from '../phase/utility/services/phaseStateApi'
import type { PhaseComment } from '../phase/utility/models/model'
import { CommentItem } from './components/CommentItem/CommentItem'

interface CommentsDrawerProps {
  opened: boolean
  onClose: () => void
  projectId: string
  phaseId: string
  phaseName: string
  comments: PhaseComment[]
}

/**
 * The phase comments as a right overlay drawer — user-authored notes/to-dos for internal
 * reference (add, resolve/reopen, delete). A lightweight productivity layer; unaffected by
 * the phase status. Open notes are listed first.
 */
export function CommentsDrawer({ opened, onClose, projectId, phaseId, phaseName, comments }: CommentsDrawerProps) {
  const [updatePhaseState] = useUpdatePhaseStateMutation()
  const [draft, setDraft] = useState('')

  const ordered = [...comments].sort((a, b) => Number(a.resolved) - Number(b.resolved))

  function fail() {
    notifications.show({ color: 'red', title: 'Something went wrong', message: 'Please try again.' })
  }

  function addComment() {
    const text = draft.trim()
    if (!text) return
    void updatePhaseState({ projectId, phaseId, action: 'add-comment', text })
      .unwrap()
      .then(() => setDraft(''))
      .catch(fail)
  }

  function setResolved(id: string, resolved: boolean) {
    void updatePhaseState({ projectId, phaseId, action: resolved ? 'resolve-comment' : 'reopen-comment', id })
      .unwrap()
      .catch(fail)
  }

  function remove(id: string) {
    void updatePhaseState({ projectId, phaseId, action: 'delete-comment', id }).unwrap().catch(fail)
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Box>
          <Text fw={600}>Comments</Text>
          <Text size="xs" c="dimmed">
            {phaseName} · for your reference
          </Text>
        </Box>
      }
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="md">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder="Add a note for your reference — a to-do, a reminder, a decision to revisit…"
            autosize
            minRows={2}
          />
          <Group justify="flex-end" mt="sm">
            <Button leftSection={<IconPlus size={16} />} disabled={!draft.trim()} onClick={addComment}>
              Add comment
            </Button>
          </Group>
        </Paper>

        {ordered.length === 0 ? (
          <EmptyState
            icon={IconMessage2}
            title="No comments yet"
            description="Add notes and to-dos for your own reference, and mark them resolved as you work through the phase."
          />
        ) : (
          <Stack gap="xs">
            {ordered.map((comment) => (
              <CommentItem
                key={comment.id}
                text={comment.text}
                createdAt={comment.createdAt}
                resolved={comment.resolved}
                onResolve={() => setResolved(comment.id, true)}
                onReopen={() => setResolved(comment.id, false)}
                onDelete={() => remove(comment.id)}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Drawer>
  )
}
