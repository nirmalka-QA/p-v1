import { Paper, Group, Box, Text, Badge, Avatar, Tooltip, ColorSwatch } from '@mantine/core'
import { IconPlayerPlayFilled, IconAlertTriangle } from '@tabler/icons-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Story } from '../utility/models/model'
import styles from '../utility/styles/implementation.module.css'

interface StoryRowProps {
  story: Story
  /** Whether this story has open change-impact alerts (amber flag). */
  hasAlert: boolean
  /** The single next story to develop (dependency-ordered) — gets the accent "Next" marker. */
  isNext?: boolean
  onOpen: (story: Story) => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Compact, table-like row for the Implementation story list. */
export function StoryRow({ story, hasAlert, isNext = false, onOpen }: StoryRowProps) {
  const deps = story.dependencies.length > 0 ? `Depends on: ${story.dependencies.join(', ')}` : 'Depends on: none'
  const blockedBy = story.blockedBy ?? []

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      w="100%"
      onClick={() => onOpen(story)}
      className={styles.rowClickable}
      style={isNext ? { borderColor: 'var(--mantine-color-teal-5)', borderWidth: 2 } : undefined}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" flex={1} miw={0}>
          <Badge variant="default" radius="sm" ff="monospace" color="gray">
            {story.id}
          </Badge>
          <Box miw={0}>
            <Text size="sm" fw={500} truncate>
              {story.title}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {deps}
            </Text>
          </Box>
        </Group>

        <Group gap="xs" wrap="nowrap">
          {isNext && (
            <Badge size="xs" color="teal" variant="filled" radius="sm" leftSection={<IconPlayerPlayFilled size={10} />}>
              Next
            </Badge>
          )}
          {blockedBy.length > 0 && (
            <Tooltip label={`Blocked by ${blockedBy.join(', ')}`} withArrow>
              <Badge size="xs" color="orange" variant="light" radius="sm" leftSection={<IconAlertTriangle size={10} />}>
                Blocked
              </Badge>
            </Tooltip>
          )}
          {hasAlert && (
            <Tooltip label="Needs review — upstream change" withArrow>
              <ColorSwatch size={9} color="var(--mantine-color-orange-6)" withShadow={false} />
            </Tooltip>
          )}
          <StatusBadge status={story.status} size="xs" />
          <Badge size="xs" variant="default" radius="sm" ff="monospace">
            {story.effort} pts
          </Badge>
          {story.assignee ? (
            <Tooltip label={story.assignee} withArrow>
              <Avatar size={24} radius="xl" color="indigo" variant="light">
                {initials(story.assignee)}
              </Avatar>
            </Tooltip>
          ) : (
            <Avatar size={24} radius="xl" variant="light" color="gray" />
          )}
        </Group>
      </Group>
    </Paper>
  )
}
