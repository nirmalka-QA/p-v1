import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { notifications } from '@mantine/notifications'
import { Box, Group, Stack, TextInput, Select, SegmentedControl, Button, Skeleton, Text, Pagination } from '@mantine/core'
import { IconSearch, IconListSearch, IconBinaryTree2 } from '@tabler/icons-react'
import { PageHeader } from '@wispr/ui'
import { EmptyState } from '@wispr/ui'
import { StoryRow } from './components/StoryRow'
import { StoriesBoard } from './components/StoriesBoard'
import { StartDevelopmentModal, type DevScope } from './components/StartDevelopmentModal'
import { ScaffoldReadyBar } from './components/ScaffoldReadyBar'
import { ContinueToTestButton } from './components/ContinueToTestButton'
import { DependencyGraph } from '../../components/ui/DependencyGraph'
import { buildStoryNodes } from '../../components/ui/dependencyGraph.helpers'
import { StoryDrawer } from './components/StoryDrawer'
import { ImplementationEmpty } from './components/ImplementationEmpty'
import { useGetStoriesQuery, useSetStoriesStatusMutation } from '../features/utility/services/featuresApi'
import { useGetPlanQuery } from '../planning/utility/services/planningApi'
import { useGetAlertsQuery } from '../impact/utility/services/impactApi'
import { activeAlertsFor } from '../impact/utility/helpers/select'
import { visibleStories } from '../features/utility/helpers/helpers'
import { isImplStory, sortByDependencyOrder } from './utility/helpers/stories'
import { useGetTechStackQuery } from './utility/services/implementationApi'
import { useImplementationSetupState } from './utility/hooks/useImplementationSetupState'
import { frontendStatus, backendStatus } from './utility/helpers/setup'
import { PARAM_STORY, PARAM_SETUP } from './utility/constants/params'
import { ROUTES } from '@wispr/contracts'
import type { Story, StoryStatus } from './utility/models/model'
import type { Priority } from '../../types'

const PAGE_SIZE = 20
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

/** Statuses shown on the board (Ready = Todo through Closed). */
const BOARD_STATUSES: StoryStatus[] = ['ready', 'in-progress', 'done', 'closed']

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'ready', label: 'Ready for Dev' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]
const SORT_OPTIONS = [
  { value: 'dependency', label: 'Dependency order' },
  { value: 'priority', label: 'Priority' },
  { value: 'effort', label: 'Effort' },
]

export function StoriesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const { data: stories = [], isLoading } = useGetStoriesQuery(projectId ?? skipToken)
  const { data: plan } = useGetPlanQuery(projectId ?? skipToken)
  const { data: alerts = [] } = useGetAlertsQuery(projectId ?? skipToken)
  const { data: techStack } = useGetTechStackQuery(projectId ?? skipToken)
  const { scaffoldIncomplete } = useImplementationSetupState(projectId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [setStatus, { isLoading: updating }] = useSetStoriesStatusMutation()

  const [startStory, setStartStory] = useState<Story | null>(null)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [featureFilter, setFeatureFilter] = useState('all')
  const [sortMode, setSortMode] = useState('dependency')
  const [showGraph, setShowGraph] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!projectId) return null

  if (isLoading) {
    return (
      <Stack gap="md">
        <Skeleton height={28} width={200} radius="sm" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={56} radius="md" />
        ))}
      </Stack>
    )
  }

  const features = plan?.features ?? []
  const featureById = new Map(features.map((f) => [f.id, f]))
  const base = visibleStories(stories).filter(isImplStory)

  if (base.length === 0) return <ImplementationEmpty projectId={projectId} />

  const q = search.trim().toLowerCase()
  const matchesSearch = (s: Story) => !q || s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  const matchesFeature = (s: Story) => featureFilter === 'all' || s.featureId === featureFilter

  // List view: status filter + sort + pagination.
  const filtered = base.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    return matchesFeature(s) && matchesSearch(s)
  })
  const priorityRank = (s: Story) => PRIORITY_ORDER[featureById.get(s.featureId)?.priority ?? 'medium']
  const sorted =
    sortMode === 'dependency'
      ? sortByDependencyOrder(filtered)
      : sortMode === 'priority'
        ? [...filtered].sort((a, b) => priorityRank(a) - priorityRank(b))
        : [...filtered].sort((a, b) => b.effort - a.effort)

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Board view: all lifecycle statuses (incl. Closed), search + feature filter.
  const boardStories = visibleStories(stories).filter(
    (s) => !s.archived && BOARD_STATUSES.includes(s.status) && matchesFeature(s) && matchesSearch(s),
  )

  const storyTitleById = new Map(stories.map((s) => [s.id, s.title]))
  // Look across all stories so Closed cards (not in `base`) still open for review.
  const selected = selectedId ? stories.find((s) => s.id === selectedId) ?? null : null
  const readyCount = base.filter((s) => s.status === 'ready').length
  const doneCount = base.filter((s) => s.status === 'done').length
  // The single recommended starting point: first developable story in dependency order (ADR-0026).
  const nextStoryId = sortByDependencyOrder(base).find((s) => s.developable)?.id ?? null

  // Only offer scopes whose stack area is configured; warn if another story is mid-flight.
  const stackItems = techStack?.items ?? []
  const frontendAvailable = frontendStatus(stackItems) !== 'untouched'
  const backendAvailable = backendStatus(stackItems) !== 'untouched'
  const otherInProgress = startStory
    ? base.find((s) => s.status === 'in-progress' && s.id !== startStory.id) ?? null
    : null

  function featureLabel(story: Story): string | undefined {
    const f = featureById.get(story.featureId)
    return f ? `${f.id} · ${f.title}` : undefined
  }

  async function changeStatus(story: Story, status: StoryStatus) {
    try {
      await setStatus({ projectId: projectId!, storyIds: [story.id], status }).unwrap()
      notifications.show({ color: 'teal', title: 'Story updated', message: `${story.id} → ${status}.` })
    } catch {
      notifications.show({ color: 'red', title: 'Could not update story', message: 'Please try again.' })
    }
  }

  // Opens the Frontend workspace with the story pinned (used from the review drawer).
  function openInFrontend(story: Story) {
    navigate(`${ROUTES.implementation(projectId!)}/frontend?${PARAM_STORY}=${story.id}`)
  }

  // Board "Start / Continue": gate on scaffolding, then prompt for scope.
  function startDevelopment(story: Story) {
    if (scaffoldIncomplete) {
      notifications.show({
        color: 'yellow',
        title: 'Finish setup first',
        message: 'Scaffold your project before starting development.',
      })
      const next = new URLSearchParams(searchParams)
      next.set(PARAM_SETUP, '1')
      setSearchParams(next)
      return
    }
    setStartStory(story)
  }

  async function confirmStart(scope: DevScope) {
    const story = startStory
    if (!story) return
    setStartStory(null)
    if (story.status !== 'in-progress') {
      try {
        await setStatus({ projectId: projectId!, storyIds: [story.id], status: 'in-progress' }).unwrap()
      } catch {
        notifications.show({ color: 'red', title: 'Could not start', message: 'Please try again.' })
        return
      }
    }
    // 'all' starts in the Frontend workspace; backend is generated from there too (Phase 3).
    const segment = scope === 'backend' ? 'backend' : 'frontend'
    navigate(`${ROUTES.implementation(projectId!)}/${segment}?${PARAM_STORY}=${story.id}`)
  }

  return (
    <Box>
      <PageHeader
        title="Stories"
        description="Read, review, and pick ready-for-dev stories in implementation order."
        actions={
          <Group gap="xs">
            <Text size="xs" c="dimmed" ff="monospace">
              {doneCount}/{base.length} done · {readyCount} ready
            </Text>
            <Button
              variant={showGraph ? 'light' : 'default'}
              color={showGraph ? 'indigo' : 'gray'}
              leftSection={<IconBinaryTree2 size={15} />}
              onClick={() => setShowGraph((v) => !v)}
            >
              {showGraph ? 'Hide graph' : 'Dependency graph'}
            </Button>
            <ContinueToTestButton projectId={projectId} />
          </Group>
        }
      />

      <ScaffoldReadyBar projectId={projectId} />

      <Group gap="sm" mb="md" wrap="wrap">
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v === 'list' ? 'list' : 'board')}
          data={[
            { value: 'board', label: 'Board' },
            { value: 'list', label: 'List' },
          ]}
        />
        <TextInput
          placeholder="Search by title or ID…"
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={240}
        />
        <Select
          data={[{ value: 'all', label: 'All features' }, ...features.map((f) => ({ value: f.id, label: `${f.id} · ${f.title}` }))]}
          value={featureFilter}
          onChange={(v) => setFeatureFilter(v ?? 'all')}
          allowDeselect={false}
          w={220}
        />
        {view === 'list' && (
          <>
            <Select data={STATUS_OPTIONS} value={statusFilter} onChange={(v) => setStatusFilter(v ?? 'all')} allowDeselect={false} w={160} />
            <Select data={SORT_OPTIONS} value={sortMode} onChange={(v) => setSortMode(v ?? 'dependency')} allowDeselect={false} w={180} />
          </>
        )}
      </Group>

      {showGraph && <DependencyGraph nodes={buildStoryNodes(sorted)} onSelect={(id) => setSelectedId(id)} />}

      {view === 'board' ? (
        <StoriesBoard
          stories={boardStories}
          featureLabelOf={featureLabel}
          priorityOf={(s) => featureById.get(s.featureId)?.priority}
          nextStoryId={nextStoryId}
          hasAlert={(id) => activeAlertsFor(alerts, 'story', id).length > 0}
          onOpen={(s) => setSelectedId(s.id)}
          onChangeStatus={changeStatus}
          onStartDevelopment={startDevelopment}
        />
      ) : pageItems.length > 0 ? (
        <Stack gap="xs">
          {pageItems.map((story) => (
            <StoryRow
              key={story.id}
              story={story}
              hasAlert={activeAlertsFor(alerts, 'story', story.id).length > 0}
              isNext={story.id === nextStoryId}
              onOpen={(s) => setSelectedId(s.id)}
            />
          ))}
        </Stack>
      ) : (
        <EmptyState
          icon={IconListSearch}
          title="No stories match these filters"
          description="Adjust the search, status, or feature filters to see more stories."
          action={{ label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('all'); setFeatureFilter('all') } }}
        />
      )}

      {view === 'list' && pageCount > 1 && (
        <Group justify="space-between" mt="md">
          <Text size="xs" c="dimmed">
            {sorted.length} stor{sorted.length === 1 ? 'y' : 'ies'}
          </Text>
          <Pagination total={pageCount} value={safePage} onChange={setPage} size="sm" />
        </Group>
      )}

      <StoryDrawer
        story={selected}
        opened={selected !== null}
        onClose={() => setSelectedId(null)}
        projectId={projectId}
        storyTitleById={storyTitleById}
        featureLabel={selected ? featureLabel(selected) : undefined}
        onStatusChange={changeStatus}
        onOpenInFrontend={openInFrontend}
        busy={updating}
      />

      <StartDevelopmentModal
        story={startStory}
        opened={startStory !== null}
        frontendAvailable={frontendAvailable}
        backendAvailable={backendAvailable}
        inProgressStoryId={otherInProgress?.id ?? null}
        onConfirm={confirmStart}
        onClose={() => setStartStory(null)}
      />
    </Box>
  )
}
