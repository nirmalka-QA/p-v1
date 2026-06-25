import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { notifications } from '@mantine/notifications'
import { Group, Paper, Stack, Text, Badge, Select, Button, Anchor, UnstyledButton, Tooltip } from '@mantine/core'
import { IconListSearch, IconBrandFigma, IconSparkles, IconCircleCheck } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { CodeGenPanel } from './CodeGenPanel'
import { StoryDrawer } from './StoryDrawer'
import { ReviewAlertBanner } from '../../impact/components/ReviewAlertBanner'
import type { CodeScope, Story, StoryStatus } from '../utility/models/model'
import { useGetStoriesQuery, useSetStoriesStatusMutation } from '../../features/utility/services/featuresApi'
import {
  useGetDesignAssetsQuery,
  useGetImplementationPlanQuery,
  usePlanImplementationMutation,
} from '../utility/services/implementationApi'
import { visibleStories } from '../../features/utility/helpers/helpers'
import { isImplStory } from '../utility/helpers/stories'
import { PARAM_STORY } from '../utility/constants/params'
import { ROUTES } from '@wispr/contracts'
import styles from '../utility/styles/implementation.module.css'

interface DevelopModeProps {
  projectId: string
  /** Which side of the stack to generate (frontend | backend). */
  scopeKey: CodeScope
  /** Frontend shows a design reference; backend does not. */
  showDesignRef: boolean
  /** Per-area commit preference (owned by Workbench); when true the PR opens automatically. */
  autoCommit: boolean
}

/**
 * Deep-work develop workspace. The story bar owns story-related controls
 * (clickable name → review, status, Plan, Mark as Implemented, switcher); the
 * code panel below stays focused on chat + code. Everything is scoped to the
 * one selected story.
 */
export function DevelopMode({ projectId, scopeKey, showDesignRef, autoCommit }: DevelopModeProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: stories = [] } = useGetStoriesQuery(projectId)
  const { data: design } = useGetDesignAssetsQuery(showDesignRef ? projectId : skipToken)
  const [setStatus, { isLoading: marking }] = useSetStoriesStatusMutation()
  const [reviewOpen, setReviewOpen] = useState(false)

  const queue = visibleStories(stories).filter(isImplStory)
  const storyParam = searchParams.get(PARAM_STORY)
  const selected = (storyParam && queue.find((s) => s.id === storyParam)) || queue[0] || null
  const storyTitleById = new Map(stories.map((s) => [s.id, s.title]))
  const statusById = new Map(queue.map((s) => [s.id, s.status]))

  const { data: plan } = useGetImplementationPlanQuery(
    selected ? { projectId, storyId: selected.id, scope: scopeKey } : skipToken,
  )
  const [planImplementation, { isLoading: planning }] = usePlanImplementationMutation()

  function selectStory(id: string | null) {
    if (!id) return
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_STORY, id)
    setSearchParams(next)
  }

  async function changeStatus(story: Story, status: StoryStatus) {
    try {
      await setStatus({ projectId, storyIds: [story.id], status }).unwrap()
      notifications.show({ color: 'teal', title: 'Story updated', message: `${story.id} → ${status}.` })
    } catch {
      notifications.show({ color: 'red', title: 'Could not update', message: 'Please try again.' })
    }
  }

  function openInFrontend(story: Story) {
    navigate(`${ROUTES.implementation(projectId)}/frontend?${PARAM_STORY}=${story.id}`)
  }

  async function runPlan(story: Story) {
    try {
      await planImplementation({ projectId, storyId: story.id, scope: scopeKey }).unwrap()
      notifications.show({ color: 'violet', title: 'Plan ready', message: 'Review the plan in the code panel, then approve to build.' })
    } catch {
      notifications.show({ color: 'red', title: 'Could not plan', message: 'Please try again.' })
    }
  }

  if (!selected) {
    return (
      <EmptyState
        icon={IconListSearch}
        title="No story selected"
        description="Pick a story from the Stories board and start development to generate code here."
      />
    )
  }

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="sm">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs" wrap="nowrap" miw={0}>
            <Badge variant="light" color="gray" radius="sm" tt="capitalize">
              {scopeKey}
            </Badge>
            <StatusBadge status={selected.status} size="xs" />
            <Tooltip label="Open story details" withArrow>
              <UnstyledButton className={styles.storyTitleButton} onClick={() => setReviewOpen(true)}>
                <Group gap="xs" wrap="nowrap" miw={0}>
                  <Badge variant="default" radius="sm" ff="monospace" color="gray">
                    {selected.id}
                  </Badge>
                  <Text size="sm" fw={500} truncate>
                    {selected.title}
                  </Text>
                </Group>
              </UnstyledButton>
            </Tooltip>
          </Group>

          <Group gap="xs" wrap="nowrap">
            {showDesignRef && design?.figmaUrl && (
              <Anchor href={design.figmaUrl} target="_blank" size="sm">
                <Group gap={4} wrap="nowrap">
                  <IconBrandFigma size={14} /> Design
                </Group>
              </Anchor>
            )}
            <Select
              size="xs"
              w={240}
              value={selected.id}
              onChange={selectStory}
              allowDeselect={false}
              data={queue.map((s) => ({ value: s.id, label: `${s.id} · ${s.title}` }))}
              renderOption={({ option }) => (
                <Group gap="xs" justify="space-between" wrap="nowrap" w="100%">
                  <Text size="xs" truncate>
                    {option.label}
                  </Text>
                  <StatusBadge status={statusById.get(option.value) ?? 'ready'} size="xs" />
                </Group>
              )}
              comboboxProps={{ withinPortal: true }}
            />
            <Button
              size="compact-sm"
              variant="light"
              color="violet"
              leftSection={<IconSparkles size={14} />}
              onClick={() => void runPlan(selected)}
              loading={planning}
            >
              {plan ? 'Re-plan' : 'Plan'}
            </Button>
            {selected.status !== 'done' && (
              <Button
                size="compact-sm"
                variant="accent"
                leftSection={<IconCircleCheck size={14} />}
                onClick={() => changeStatus(selected, 'done')}
                loading={marking}
              >
                Mark Implemented
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      <ReviewAlertBanner projectId={projectId} kind="story" refId={selected.id} />

      <CodeGenPanel
        key={`${selected.id}:${scopeKey}`}
        projectId={projectId}
        story={selected}
        scope={scopeKey}
        autoCommit={autoCommit}
      />

      <StoryDrawer
        story={selected}
        opened={reviewOpen}
        onClose={() => setReviewOpen(false)}
        projectId={projectId}
        storyTitleById={storyTitleById}
        onStatusChange={changeStatus}
        onOpenInFrontend={openInFrontend}
        busy={marking}
      />
    </Stack>
  )
}
