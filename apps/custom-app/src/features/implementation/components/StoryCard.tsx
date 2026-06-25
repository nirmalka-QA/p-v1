import { Paper, Group, Box, Text, Badge, Tooltip, ColorSwatch, Menu, ActionIcon, Button } from '@mantine/core'
import { IconPlayerPlayFilled, IconAlertTriangle, IconDots, IconArrowRight } from '@tabler/icons-react'
import type { Story, StoryStatus } from '../utility/models/model'
import type { Priority } from '../../../types'
import styles from '../utility/styles/implementation.module.css'

const PRIORITY_COLOR: Record<Priority, string> = { high: 'red', medium: 'yellow', low: 'gray' }

/** Where a card can move from its current column (keeps transitions predictable). */
const MOVE_TARGETS: Record<StoryStatus, StoryStatus[]> = {
  draft: [],
  ready: ['in-progress', 'closed'],
  'in-progress': ['ready', 'done', 'closed'],
  done: ['in-progress', 'closed'],
  closed: ['ready', 'in-progress'],
}
const STATUS_LABEL: Record<StoryStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  'in-progress': 'In Progress',
  done: 'Done',
  closed: 'Closed',
}

interface StoryCardProps {
  story: Story
  /** "FEAT-1 · Title" — feature context, kept short. */
  featureLabel?: string
  priority?: Priority
  /** The single dependency-ordered next story to pick — gets the accent border + marker. */
  isNext: boolean
  /** Story has open change-impact alerts. */
  hasAlert: boolean
  onOpen: (story: Story) => void
  onChangeStatus: (story: Story, status: StoryStatus) => void
  onStartDevelopment: (story: Story) => void
}

/** A single story on the Kanban board — review on click, move via menu, start dev. */
export function StoryCard({
  story,
  featureLabel,
  priority,
  isNext,
  hasAlert,
  onOpen,
  onChangeStatus,
  onStartDevelopment,
}: StoryCardProps) {
  const blockedBy = story.blockedBy ?? []
  const canStart = story.status === 'ready' || story.status === 'in-progress'
  const targets = MOVE_TARGETS[story.status]

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      className={isNext ? `${styles.storyCard} ${styles.storyCardNext}` : styles.storyCard}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs" mb={6}>
        <Badge variant="default" radius="sm" ff="monospace" color="gray" size="sm">
          {story.id}
        </Badge>
        <Group gap={6} wrap="nowrap">
          {isNext && (
            <Badge size="xs" color="teal" variant="filled" radius="sm" leftSection={<IconPlayerPlayFilled size={9} />}>
              Next
            </Badge>
          )}
          {hasAlert && (
            <Tooltip label="Needs review — upstream change" withArrow>
              <ColorSwatch size={9} color="var(--mantine-color-orange-6)" withShadow={false} />
            </Tooltip>
          )}
          {targets.length > 0 && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Change status">
                  <IconDots size={15} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Move to</Menu.Label>
                {targets.map((target) => (
                  <Menu.Item key={target} onClick={() => onChangeStatus(story, target)}>
                    {STATUS_LABEL[target]}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      <Box className={styles.storyCardBody} onClick={() => onOpen(story)}>
        <Text size="sm" fw={500} lineClamp={2}>
          {story.title}
        </Text>
        {featureLabel && (
          <Text size="xs" c="dimmed" truncate mt={2}>
            {featureLabel}
          </Text>
        )}
      </Box>

      <Group justify="space-between" wrap="nowrap" mt="sm" gap="xs">
        <Group gap={6} wrap="nowrap">
          {priority && (
            <Badge size="xs" variant="light" color={PRIORITY_COLOR[priority]} radius="sm">
              {priority}
            </Badge>
          )}
          <Badge size="xs" variant="default" radius="sm" ff="monospace">
            {story.effort} pts
          </Badge>
          {blockedBy.length > 0 && (
            <Tooltip label={`Blocked by ${blockedBy.join(', ')}`} withArrow>
              <Badge size="xs" color="orange" variant="light" radius="sm" leftSection={<IconAlertTriangle size={9} />}>
                Blocked
              </Badge>
            </Tooltip>
          )}
        </Group>
        {canStart && (
          <Button
            size="compact-xs"
            variant={story.status === 'ready' ? 'light' : 'subtle'}
            color="indigo"
            rightSection={<IconArrowRight size={12} />}
            onClick={() => onStartDevelopment(story)}
          >
            {story.status === 'ready' ? 'Start' : 'Continue'}
          </Button>
        )}
      </Group>
    </Paper>
  )
}
