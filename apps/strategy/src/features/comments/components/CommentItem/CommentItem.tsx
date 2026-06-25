import { Paper, Group, Box, Text, Button } from '@mantine/core'
import { IconCheck, IconArrowBackUp, IconTrash } from '@tabler/icons-react'
import { formatDateTime } from '../../../phase/utility/helpers/helpers'
import { ActionMenu } from '../../../../components/ui/ActionMenu/ActionMenu'
import styles from './CommentItem.module.css'

interface CommentItemProps {
  text: string
  createdAt: string
  resolved: boolean
  onResolve: () => void
  onReopen: () => void
  onDelete: () => void
}

/**
 * One phase comment — the note text in full, an added-at line, a Resolve/Reopen button,
 * and a ⋯ menu (Delete, via the shared inline two-click confirm). Resolved comments are
 * de-emphasised.
 */
export function CommentItem({ text, createdAt, resolved, onResolve, onReopen, onDelete }: CommentItemProps) {
  const added = formatDateTime(createdAt)

  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
        <Box miw={0} flex={1}>
          <Text size="sm" className={styles.body ?? ''} {...(resolved ? { c: 'dimmed' } : {})}>
            {text}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Added {added}
            {resolved ? ' · Resolved' : ''}
          </Text>
        </Box>
        <Group gap="xs" wrap="nowrap">
          {resolved ? (
            <Button size="compact-sm" variant="subtle" color="gray" leftSection={<IconArrowBackUp size={14} />} onClick={onReopen}>
              Reopen
            </Button>
          ) : (
            <Button size="compact-sm" variant="light" color="teal" leftSection={<IconCheck size={14} />} onClick={onResolve}>
              Resolve
            </Button>
          )}
          <ActionMenu
            ariaLabel="Comment actions"
            actions={[{ label: 'Delete', icon: <IconTrash size={15} />, color: 'red', confirm: true, onClick: onDelete }]}
          />
        </Group>
      </Group>
    </Paper>
  )
}
