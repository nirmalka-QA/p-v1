import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import { Box, Group, Text, Button, Stack, Paper } from '@mantine/core'
import { IconPlus, IconSparkles, IconCircleCheck, IconListSearch } from '@tabler/icons-react'
import { AIPlaceholder } from '@wispr/ui'
import { AnalysisProgress } from '../../discovery/components/AnalysisProgress'
import { EmptyState } from '@wispr/ui'
import { ConfirmModal } from '@wispr/ui'
import { AiEditModal } from '../../../components/ui/AiEditModal'
import { StoryCard } from './StoryCard'
import type { IncomingImpact } from './StoryCard'
import { StoryFilters } from './StoryFilters'
import { StoryFormModal } from './StoryFormModal'
import { StoryDetailModal } from './StoryDetailModal'
import { ImpactModal } from './ImpactModal'
import {
  useGenerateFeatureStoriesMutation,
  useSetStoriesStatusMutation,
  useArchiveStoryMutation,
  useDismissImpactMutation,
  useEnhanceStoryMutation,
} from '../utility/services/featuresApi'
import { filterStories, presentAssignees } from '../utility/helpers/helpers'
import type { StoryFilters as Filters } from '../utility/helpers/helpers'
import { FILTER_ALL, STORY_GEN_STEPS } from '../utility/constants/constants'
import { useGetAlertsQuery } from '../../impact/utility/services/impactApi'
import { ReviewAlertModal } from '../../impact/components/ReviewAlertModal'
import type { Feature, Story, StoryStatus } from '../utility/models/model'
import type { AnalysisStep } from '../../../types'
import styles from '../utility/styles/features.module.css'


interface StoryListProps {
  projectId: string
  feature: Feature
  allStories: Story[]
}

const NO_FILTERS: Filters = { status: FILTER_ALL, assignee: FILTER_ALL, search: '' }

export function StoryList({ projectId, feature, allStories }: StoryListProps) {
  const [generateFeatureStories] = useGenerateFeatureStoriesMutation()
  const [setStatus] = useSetStoriesStatusMutation()
  const [archiveStory, { isLoading: deleting }] = useArchiveStoryMutation()
  const [dismissImpact, { isLoading: dismissing }] = useDismissImpactMutation()
  const [enhanceStory, { isLoading: enhancing }] = useEnhanceStoryMutation()

  const [generating, setGenerating] = useState(false)
  const [genSteps, setGenSteps] = useState<AnalysisStep[]>([])

  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [selected, setSelected] = useState<string[]>([])
  const [formStory, setFormStory] = useState<Story | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [impactStory, setImpactStory] = useState<Story | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [aiStory, setAiStory] = useState<Story | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Story | null>(null)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [reviewStory, setReviewStory] = useState<Story | null>(null)

  const { data: alerts = [] } = useGetAlertsQuery(projectId)
  // Open/acknowledged change-impact alerts targeting a given story.
  const activeStoryAlerts = (storyId: string) =>
    alerts.filter(
      (a) =>
        a.target.kind === 'story' &&
        a.target.refId === storyId &&
        (a.status === 'open' || a.status === 'acknowledged'),
    )

  const featureStories = allStories.filter((s) => s.featureId === feature.id)
  // Dependency order (ADR-0026): dependencies before dependents (server-computed `order`).
  const visible = filterStories(featureStories, filters, FILTER_ALL)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const assignees = presentAssignees(featureStories)
  const storyTitleById = new Map(allStories.map((s) => [s.id, s.title]))
  // Derive the open story from the live list so it reflects AI-enhance updates.
  const detailStory = detailId ? allStories.find((s) => s.id === detailId) ?? null : null

  // For each story, which OTHER active stories flag it as impacted — and WHY (their impactSummary).
  // Drives the "N stories may affect this" badge so the user sees which stories and the reason.
  const incomingImpactByStory = new Map<string, IncomingImpact[]>()
  for (const source of allStories.filter((s) => !s.impactDismissed)) {
    for (const targetId of source.impactedStories) {
      const list = incomingImpactByStory.get(targetId) ?? []
      list.push({ id: source.id, title: source.title, summary: source.impactSummary })
      incomingImpactByStory.set(targetId, list)
    }
  }

  // Start a progressive build for this feature, then poll real per-step progress from the
  // backend (mirrors Discovery / Planning generation).
  async function runGenerate() {
    setGenerating(true)
    // Synchronous per-feature generation is one LLM call, so advance the fixed steps on a timer to
    // reflect real progress while it runs (read → slice → criteria → estimate), then mark all done.
    setGenSteps(STORY_GEN_STEPS.map((s, i) => ({ id: s.id, label: s.label, status: i === 0 ? 'running' : 'pending' })))
    let idx = 0
    const timer = setInterval(() => {
      idx = Math.min(idx + 1, STORY_GEN_STEPS.length - 1)
      setGenSteps((prev) => prev.map((s, i) => ({ ...s, status: i < idx ? 'done' : i === idx ? 'running' : 'pending' })))
    }, 1200)
    try {
      // Persists this feature's stories server-side; the story cache is invalidated, so the list
      // refreshes when the call returns.
      await generateFeatureStories({ projectId, featureId: feature.id }).unwrap()
      setGenSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as const })))
      setSelected([])
      notifications.show({
        color: 'teal',
        title: 'Stories generated',
        message: `User stories drafted for “${feature.title}”.`,
      })
    } catch {
      notifications.show({ color: 'red', title: 'Generation failed', message: 'Please try again.' })
    } finally {
      clearInterval(timer)
      setGenerating(false)
    }
  }

  async function changeStatus(storyIds: string[], status: StoryStatus, label: string) {
    try {
      await setStatus({ projectId, storyIds, status }).unwrap()
      setSelected([])
      notifications.show({ color: 'teal', title: label, message: `${storyIds.length} story(s) updated.` })
    } catch {
      notifications.show({ color: 'red', title: 'Could not update status', message: 'Please try again.' })
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await archiveStory({ projectId, storyId: confirmDelete.id }).unwrap()
      setSelected((ids) => ids.filter((id) => id !== confirmDelete.id))
      notifications.show({
        color: 'teal',
        title: 'Story archived',
        message: `${confirmDelete.id} removed from the list — kept as AI context.`,
      })
      setConfirmDelete(null)
    } catch {
      notifications.show({ color: 'red', title: 'Could not archive story', message: 'Please try again.' })
    }
  }

  async function handleEnhance(instructions?: string) {
    if (!aiStory) return
    try {
      await enhanceStory({ projectId, storyId: aiStory.id, instructions }).unwrap()
      setAiStory(null)
      notifications.show({
        color: 'teal',
        title: 'Story enhanced',
        message: 'The AI expanded the description and acceptance criteria.',
      })
    } catch {
      notifications.show({ color: 'red', title: 'Enhancement failed', message: 'Please try again.' })
    }
  }

  async function handleDismissImpact(story: Story) {
    try {
      await dismissImpact({ projectId, storyId: story.id }).unwrap()
      setImpactStory(null)
    } catch {
      notifications.show({ color: 'red', title: 'Could not dismiss', message: 'Please try again.' })
    }
  }

  function openAdd() {
    setFormStory(null)
    setFormOpen(true)
  }
  function openEdit(story: Story) {
    setFormStory(story)
    setFormOpen(true)
  }
  function toggleSelect(id: string) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  // ── No stories yet → AI generation is the primary action (progressive while running) ──
  if (featureStories.length === 0) {
    return (
      <>
        {generating ? (
          <AnalysisProgress steps={genSteps} />
        ) : (
          <AIPlaceholder
            action="Generate Stories"
            description={`Break “${feature.title}” into user stories using the feature description and your Knowledge Base as context.`}
            onTrigger={runGenerate}
            loading={generating}
          />
        )}
        <Group justify="center" mt="md">
          <Button variant="default" leftSection={<IconPlus size={14} />} onClick={openAdd}>
            Add a story manually
          </Button>
        </Group>
        <StoryFormModal
          opened={formOpen}
          onClose={() => setFormOpen(false)}
          projectId={projectId}
          featureId={feature.id}
          story={formStory}
          allStories={allStories}
        />
      </>
    )
  }

  return (
    <Box>
      <Box className={styles.toolbar}>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <StoryFilters filters={filters} onChange={setFilters} assignees={assignees} />
          <Group gap="sm">
            <Button
              variant="light"
              color="violet"
              leftSection={<IconSparkles size={15} />}
              onClick={() => setConfirmRegen(true)}
              loading={generating}
            >
              Regenerate
            </Button>
            <Button variant="accent" leftSection={<IconPlus size={14} />} onClick={openAdd}>
              Add story
            </Button>
          </Group>
        </Group>

        {/* Progressive regenerate: show step progress while the existing list stays visible below. */}
        {generating && (
          <Paper withBorder radius="md" p="md" mt="sm" maw={520}>
            <Text fw={600} size="sm" mb={4}>
              Regenerating stories for “{feature.title}”…
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Using the feature, acceptance criteria, Knowledge Base, and your context.
            </Text>
            <AnalysisProgress steps={genSteps} />
          </Paper>
        )}

        {selected.length > 0 && (
          <Paper withBorder radius="md" p="xs" mt="sm" bg="var(--mantine-color-teal-light)">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                {selected.length} selected
              </Text>
              <Group gap="sm">
                <Button variant="subtle" color="gray" size="compact-sm" onClick={() => setSelected([])}>
                  Clear
                </Button>
                <Button
                  variant="light"
                  color="teal"
                  size="compact-sm"
                  leftSection={<IconCircleCheck size={14} />}
                  onClick={() => changeStatus(selected, 'ready', 'Marked Ready for Dev')}
                >
                  Mark as Ready for Dev
                </Button>
              </Group>
            </Group>
          </Paper>
        )}
      </Box>

      {visible.length > 0 ? (
        <Stack gap="sm">
          {visible.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              storyTitleById={storyTitleById}
              selected={selected.includes(story.id)}
              onToggleSelect={toggleSelect}
              onEdit={openEdit}
              onEditAI={setAiStory}
              onDelete={setConfirmDelete}
              onMarkReady={(s) => changeStatus([s.id], 'ready', 'Marked Ready for Dev')}
              onSetStatus={(s, status) => changeStatus([s.id], status, 'Status updated')}
              onOpenImpact={setImpactStory}
              onOpen={(s) => setDetailId(s.id)}
              onOpenStory={(id) => setDetailId(id)}
              incomingImpactFrom={incomingImpactByStory.get(story.id) ?? []}
              reviewCount={activeStoryAlerts(story.id).length}
              onOpenReview={setReviewStory}
            />
          ))}
        </Stack>
      ) : (
        <EmptyState
          icon={IconListSearch}
          title="No stories match these filters"
          description="Adjust or clear the status, assignee, or search filters to see more stories."
          action={{ label: 'Clear filters', onClick: () => setFilters(NO_FILTERS) }}
        />
      )}

      <StoryFormModal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        featureId={feature.id}
        story={formStory}
        allStories={allStories}
      />
      <StoryDetailModal
        story={detailStory}
        allStories={allStories}
        opened={detailId !== null}
        onClose={() => setDetailId(null)}
        projectId={projectId}
        onEdit={(s) => {
          setDetailId(null)
          openEdit(s)
        }}
        storyTitleById={storyTitleById}
        onOpenStory={(id) => setDetailId(id)}
      />
      <AiEditModal
        opened={aiStory !== null}
        onClose={() => setAiStory(null)}
        title={`Edit ${aiStory?.id ?? 'story'} with AI`}
        description="Expands the description and adds acceptance criteria for this story."
        loading={enhancing}
        onEnhance={handleEnhance}
      />
      <ImpactModal
        story={impactStory}
        allStories={allStories}
        opened={impactStory !== null}
        onClose={() => setImpactStory(null)}
        onDismiss={handleDismissImpact}
        onOpenStory={(id) => {
          setImpactStory(null)
          setDetailId(id)
        }}
        dismissing={dismissing}
      />
      <ConfirmModal
        opened={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Archive story"
        message={`Archive “${confirmDelete?.title}” (${confirmDelete?.id})? It leaves the list but is retained as AI context — nothing is permanently deleted.`}
        confirmLabel="Archive"
        onConfirm={handleDelete}
        loading={deleting}
      />
      <ConfirmModal
        opened={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        title="Regenerate stories"
        message={`This replaces the current stories for “${feature.title}” with a fresh AI-generated set. Stories under other features are unaffected.`}
        confirmLabel="Regenerate"
        onConfirm={() => {
          setConfirmRegen(false)
          void runGenerate()
        }}
      />
      <ReviewAlertModal
        projectId={projectId}
        alerts={reviewStory ? activeStoryAlerts(reviewStory.id) : []}
        opened={reviewStory !== null}
        onClose={() => setReviewStory(null)}
      />
    </Box>
  )
}
