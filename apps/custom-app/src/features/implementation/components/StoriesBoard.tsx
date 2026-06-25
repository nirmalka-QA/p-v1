import { Box, Group, Text, Stack, Badge, ScrollArea } from '@mantine/core'
import { StoryCard } from './StoryCard'
import { sortByDependencyOrder } from '../utility/helpers/stories'
import type { Story, StoryStatus } from '../utility/models/model'
import type { Priority } from '../../../types'
import styles from '../utility/styles/implementation.module.css'

/** Board columns, mapped to existing story statuses (Ready = Todo). */
const COLUMNS: { status: StoryStatus; label: string }[] = [
  { status: 'ready', label: 'Ready' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
  { status: 'closed', label: 'Closed' },
]

interface StoriesBoardProps {
  stories: Story[]
  featureLabelOf: (story: Story) => string | undefined
  priorityOf: (story: Story) => Priority | undefined
  /** The single dependency-ordered next story to pick. */
  nextStoryId: string | null
  hasAlert: (storyId: string) => boolean
  onOpen: (story: Story) => void
  onChangeStatus: (story: Story, status: StoryStatus) => void
  onStartDevelopment: (story: Story) => void
}

/**
 * Kanban board for the Implementation phase — the story-focused hub. Columns are
 * the story lifecycle; the Ready column is dependency-ordered with the next
 * pick highlighted so developers know what to read, review, and start.
 */
export function StoriesBoard({
  stories,
  featureLabelOf,
  priorityOf,
  nextStoryId,
  hasAlert,
  onOpen,
  onChangeStatus,
  onStartDevelopment,
}: StoriesBoardProps) {
  return (
    <ScrollArea type="auto" offsetScrollbars>
      <Group align="flex-start" gap="md" wrap="nowrap" className={styles.board}>
        {COLUMNS.map((col) => {
          const colStories = stories.filter((s) => s.status === col.status)
          const ordered = col.status === 'ready' ? sortByDependencyOrder(colStories) : colStories
          return (
            <Box key={col.status} className={styles.boardColumn}>
              <Group justify="space-between" className={styles.boardColumnHeader}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                  {col.label}
                </Text>
                <Badge size="sm" variant="default" radius="sm" color="gray">
                  {ordered.length}
                </Badge>
              </Group>
              <Stack gap="xs" className={styles.boardColumnBody}>
                {ordered.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">
                    No stories
                  </Text>
                ) : (
                  ordered.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      featureLabel={featureLabelOf(story)}
                      priority={priorityOf(story)}
                      isNext={story.id === nextStoryId}
                      hasAlert={hasAlert(story.id)}
                      onOpen={onOpen}
                      onChangeStatus={onChangeStatus}
                      onStartDevelopment={onStartDevelopment}
                    />
                  ))
                )}
              </Stack>
            </Box>
          )
        })}
      </Group>
    </ScrollArea>
  )
}
