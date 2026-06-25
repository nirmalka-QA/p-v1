import {
  Card,
  Group,
  Box,
  Text,
  Badge,
  Checkbox,
  List,
  Button,
  ActionIcon,
  Menu,
  Tooltip,
  HoverCard,
  Anchor,
  Stack,
} from '@mantine/core'
import { criterionText } from '../../../utility/story'
import {
  IconPencil,
  IconArchive,
  IconDotsVertical,
  IconLink,
  IconAlertTriangle,
  IconCircleCheck,
  IconArrowsMaximize,
  IconSparkles,
} from '@tabler/icons-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { STORY_STATUS_OPTIONS } from '../utility/constants/constants'
import type { Story, StoryStatus } from '../utility/models/model'
import styles from '../utility/styles/features.module.css'

/** One story that flags another as impacted, with the reason text. */
export interface IncomingImpact {
  id: string
  title: string
  summary?: string
}

interface StoryCardProps {
  story: Story
  storyTitleById: Map<string, string>
  selected: boolean
  onToggleSelect: (id: string) => void
  onEdit: (story: Story) => void
  onEditAI: (story: Story) => void
  onDelete: (story: Story) => void
  onMarkReady: (story: Story) => void
  onSetStatus: (story: Story, status: StoryStatus) => void
  onOpenImpact: (story: Story) => void
  onOpen: (story: Story) => void
  /** Open another story by its slug (clickable dependency chips). */
  onOpenStory?: (storyId: string) => void
  /** Other stories that flag THIS one as impacted (shared scope) — with the reason (impactSummary). */
  incomingImpactFrom?: IncomingImpact[]
  /** Open cross-phase change-impact alerts targeting this story. */
  reviewCount?: number
  onOpenReview?: (story: Story) => void
}

export function StoryCard({
  story,
  storyTitleById,
  selected,
  onToggleSelect,
  onEdit,
  onEditAI,
  onDelete,
  onMarkReady,
  onSetStatus,
  onOpenImpact,
  onOpen,
  onOpenStory,
  incomingImpactFrom = [],
  reviewCount = 0,
  onOpenReview,
}: StoryCardProps) {
  const showImpact = story.impactedStories.length > 0 && !story.impactDismissed

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      className={styles.storyCard}
      onClick={() => onOpen(story)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(story)
      }}
      style={{ cursor: 'pointer' }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Group align="flex-start" gap="sm" wrap="nowrap" flex={1} miw={0}>
          <Checkbox
            checked={selected}
            onChange={() => onToggleSelect(story.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${story.id}`}
            mt={2}
          />
          <Box flex={1} miw={0}>
            <Group gap="xs" mb={4} wrap="wrap">
              <Text size="xs" ff="monospace" c="dimmed">
                {story.id}
              </Text>
              <StatusBadge status={story.status} size="xs" />
              <Badge size="xs" variant="default" radius="sm" ff="monospace">
                {story.effort} pts
              </Badge>
              {story.assignee && (
                <Badge size="xs" variant="light" color="indigo" radius="sm">
                  {story.assignee}
                </Badge>
              )}
            </Group>
            <Text fw={600} size="sm">
              {story.title}
            </Text>
          </Box>
        </Group>

        <Group gap={4} wrap="nowrap">
          {story.status === 'draft' && (
            <Tooltip
              label="Mark its dependencies ready first"
              disabled={story.canMarkReady !== false}
              withArrow
            >
              <Button
                size="compact-xs"
                variant="light"
                color="teal"
                leftSection={<IconCircleCheck size={13} />}
                disabled={story.canMarkReady === false}
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkReady(story)
                }}
              >
                Mark Ready
              </Button>
            </Tooltip>
          )}
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Story actions"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
              <Menu.Item leftSection={<IconArrowsMaximize size={14} />} onClick={() => onOpen(story)}>
                Open story
              </Menu.Item>
              <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onEdit(story)}>
                Edit manually
              </Menu.Item>
              <Menu.Item leftSection={<IconSparkles size={14} />} color="violet" onClick={() => onEditAI(story)}>
                Edit with AI
              </Menu.Item>
              <Menu.Label>Set status</Menu.Label>
              {STORY_STATUS_OPTIONS.map((opt) => (
                <Menu.Item
                  key={opt.value}
                  disabled={opt.value === story.status}
                  onClick={() => onSetStatus(story, opt.value)}
                >
                  {opt.label}
                </Menu.Item>
              ))}
              <Menu.Divider />
              <Menu.Item leftSection={<IconArchive size={14} />} onClick={() => onDelete(story)}>
                Archive story
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* User-story statement */}
      <Text size="sm" c="dimmed" lh={1.6} mt="xs">
        <Text span fw={600} c="dimmed">
          As a
        </Text>{' '}
        {story.asA},{' '}
        <Text span fw={600} c="dimmed">
          I want
        </Text>{' '}
        {story.iWant},{' '}
        <Text span fw={600} c="dimmed">
          so that
        </Text>{' '}
        {story.soThat}.
      </Text>

      {story.description.trim() && (
        <Text size="sm" c="dimmed" lh={1.6} mt="xs" lineClamp={2}>
          {story.description}
        </Text>
      )}

      {story.acceptanceCriteria.length > 0 && (
        <Box mt="sm">
          <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={4} ff="monospace">
            Acceptance criteria
          </Text>
          <List size="sm" spacing={4} c="dimmed" withPadding>
            {story.acceptanceCriteria.map((ac, i) => (
              <List.Item key={i}>{criterionText(ac)}</List.Item>
            ))}
          </List>
        </Box>
      )}

      {/* Dependency-ordered planning state (ADR-0026): where to start, and what's blocked. */}
      {(story.developable || (story.blockedBy?.length ?? 0) > 0) && (
        <Group gap="sm" mt="sm" wrap="wrap">
          {story.developable && (
            <Badge
              size="sm"
              color={story.dependencies.length === 0 ? 'teal' : 'blue'}
              variant="filled"
              radius="sm"
              leftSection={<IconCircleCheck size={11} />}
            >
              {story.dependencies.length === 0 ? 'Start here' : 'Ready to develop'}
            </Badge>
          )}
          {(story.blockedBy?.length ?? 0) > 0 && (
            <Badge size="sm" color="orange" variant="light" radius="sm" leftSection={<IconAlertTriangle size={11} />}>
              Blocked by {story.blockedBy!.join(', ')}
            </Badge>
          )}
        </Group>
      )}

      {(story.dependencies.length > 0 ||
        showImpact ||
        incomingImpactFrom.length > 0 ||
        reviewCount > 0 ||
        story.needsUpdate) && (
        <Group gap="sm" mt="sm" wrap="wrap">
          {reviewCount > 0 && (
            <Badge
              size="sm"
              color="red"
              variant="filled"
              radius="sm"
              leftSection={<IconAlertTriangle size={11} />}
              className={styles.impactBadge}
              onClick={(e) => {
                e.stopPropagation()
                onOpenReview?.(story)
              }}
            >
              Needs review {reviewCount}
            </Badge>
          )}
          {story.needsUpdate && (
            <Badge size="sm" color="orange" variant="light" radius="sm">
              Update pending
            </Badge>
          )}
          {story.dependencies.length > 0 && (
            <Group gap={4} wrap="wrap" align="center">
              <Group gap={3} align="center" wrap="nowrap">
                <IconLink size={11} />
                <Text size="xs" c="dimmed">
                  Depends on:
                </Text>
              </Group>
              {story.dependencies.map((id) => (
                <Tooltip key={id} label={storyTitleById.get(id) ?? id} withinPortal>
                  <Badge
                    size="sm"
                    variant="default"
                    radius="sm"
                    ff="monospace"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenStory?.(id)
                    }}
                  >
                    {id}
                  </Badge>
                </Tooltip>
              ))}
            </Group>
          )}
          {showImpact && (
            <Badge
              size="sm"
              color="orange"
              variant="light"
              radius="sm"
              leftSection={<IconAlertTriangle size={11} />}
              className={styles.impactBadge}
              onClick={(e) => {
                e.stopPropagation()
                onOpenImpact(story)
              }}
            >
              May impact {story.impactedStories.length} related stor{story.impactedStories.length === 1 ? 'y' : 'ies'}
            </Badge>
          )}
          {incomingImpactFrom.length > 0 && (
            <HoverCard width={320} shadow="md" radius="md" position="top-start" withArrow openDelay={80}>
              <HoverCard.Target>
                <Badge
                  size="sm"
                  color="orange"
                  variant="outline"
                  radius="sm"
                  leftSection={<IconAlertTriangle size={11} />}
                  style={{ cursor: 'pointer' }}
                >
                  {incomingImpactFrom.length === 1
                    ? '1 story may affect this'
                    : `${incomingImpactFrom.length} stories may affect this`}
                </Badge>
              </HoverCard.Target>
              <HoverCard.Dropdown onClick={(e) => e.stopPropagation()}>
                <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
                  May be affected by
                </Text>
                <Stack gap="sm">
                  {incomingImpactFrom.map((src) => (
                    <Box key={src.id}>
                      <Group gap={6} wrap="nowrap">
                        <Anchor
                          component="button"
                          type="button"
                          ff="monospace"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenStory?.(src.id)
                          }}
                        >
                          {src.id}
                        </Anchor>
                        <Text size="xs" fw={500} lineClamp={1}>
                          {src.title}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" lh={1.5} mt={2}>
                        {src.summary?.trim() || 'Shares scope with this story — review before changing either.'}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              </HoverCard.Dropdown>
            </HoverCard>
          )}
        </Group>
      )}
    </Card>
  )
}
