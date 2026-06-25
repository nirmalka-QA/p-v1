import { Drawer, Stack, Group, Text, Badge, Button, Divider, Tooltip } from '@mantine/core'
import { IconPlayerPlay, IconCircleCheck, IconArrowRight, IconRefresh, IconCode } from '@tabler/icons-react'
import { StoryImplDetail } from './StoryImplDetail'
import { ReviewAlertBanner } from '../../impact/components/ReviewAlertBanner'
import type { Story, StoryStatus } from '../utility/models/model'

interface StoryDrawerProps {
  story: Story | null
  opened: boolean
  onClose: () => void
  projectId: string
  storyTitleById: Map<string, string>
  featureLabel?: string
  onStatusChange: (story: Story, status: StoryStatus) => void
  onOpenInFrontend: (story: Story) => void
  busy: boolean
}

/** Right-side detail drawer for a story, with a state-aware development CTA. */
export function StoryDrawer({
  story,
  opened,
  onClose,
  projectId,
  storyTitleById,
  featureLabel,
  onStatusChange,
  onOpenInFrontend,
  busy,
}: StoryDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={480}
      title={
        story ? (
          <Text fw={600} ff="monospace" size="sm">
            {story.id}
          </Text>
        ) : null
      }
    >
      {story && (
        <Stack gap="md">
          <ReviewAlertBanner projectId={projectId} kind="story" refId={story.id} />

          {(featureLabel || story.assignee) && (
            <Group gap="xs" wrap="wrap">
              {featureLabel && (
                <Badge variant="light" color="grape" radius="sm">
                  {featureLabel}
                </Badge>
              )}
              {story.assignee && (
                <Badge variant="light" color="indigo" radius="sm">
                  {story.assignee}
                </Badge>
              )}
            </Group>
          )}

          <StoryImplDetail story={story} storyTitleById={storyTitleById} />

          <Divider />

          {story.status === 'ready' && (
            <Tooltip
              label={`Blocked by ${(story.blockedBy ?? []).join(', ')} — finish those first`}
              disabled={(story.blockedBy?.length ?? 0) === 0}
              withArrow
            >
              <Button
                variant="accent"
                leftSection={<IconPlayerPlay size={15} />}
                loading={busy}
                disabled={(story.blockedBy?.length ?? 0) > 0}
                onClick={() => onStatusChange(story, 'in-progress')}
              >
                Start Development
              </Button>
            </Tooltip>
          )}

          {story.status === 'in-progress' && (
            <Group>
              <Button
                color="teal"
                leftSection={<IconCircleCheck size={15} />}
                loading={busy}
                onClick={() => onStatusChange(story, 'done')}
              >
                Mark as Done
              </Button>
              <Button
                variant="default"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => onOpenInFrontend(story)}
              >
                Open in Frontend
              </Button>
            </Group>
          )}

          {story.status === 'done' && (
            <Group>
              <Button
                variant="subtle"
                leftSection={<IconCode size={15} />}
                onClick={() => onOpenInFrontend(story)}
              >
                View Generated Code
              </Button>
              <Button
                variant="subtle"
                color="red"
                leftSection={<IconRefresh size={15} />}
                loading={busy}
                onClick={() => onStatusChange(story, 'ready')}
              >
                Reopen
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Drawer>
  )
}
