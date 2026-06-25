import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { notifications } from '@mantine/notifications'
import { Box, Title, Text, Group, Badge, Button, Stack, Skeleton, Divider, Alert, Loader, ThemeIcon, Paper } from '@mantine/core'
import { IconArrowRight, IconSparkles, IconCircleCheck, IconCircleDashed, IconBinaryTree2 } from '@tabler/icons-react'
import { FeaturesEmpty } from './components/FeaturesEmpty'
import { StoryList } from './components/StoryList'
import { StoryDetailModal } from './components/StoryDetailModal'
import { DependencyAnalysisModal } from './components/DependencyAnalysisModal'
import { DependencyGraph } from '../../components/ui/DependencyGraph'
import { buildStoryNodes } from '../../components/ui/dependencyGraph.helpers'
import {
  useGetStoriesQuery,
  useGetStoriesPlanMutation,
  useGenerateFeatureStoriesMutation,
  useAnalyzeDependenciesMutation,
  useUpdateStoryMutation,
  useRejectDependencyMutation,
} from './utility/services/featuresApi'
import { useGetPlanQuery } from '../planning/utility/services/planningApi'
import { useUpdateProjectMutation } from '@wispr/projects'
import { sortByOrder, visibleFeatures } from '../planning/utility/helpers/helpers'
import { visibleStories } from './utility/helpers/helpers'
import { PARAM_FEATURE } from './utility/constants/params'
import { ROUTES } from '@wispr/contracts'
import type { StoryPlanFeature, StoryFormValues } from './utility/models/model'
import type { DependencyAnalysis } from '../../types'
import { PageHeader } from '@wispr/ui'

export function FeaturesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { data: plan, isLoading: planLoading } = useGetPlanQuery(projectId ?? skipToken)
  const { data: stories = [], isLoading: storiesLoading } = useGetStoriesQuery(projectId ?? skipToken)
  const [updateProject, { isLoading: advancing }] = useUpdateProjectMutation()
  const [getStoriesPlan] = useGetStoriesPlanMutation()
  const [generateFeatureStories] = useGenerateFeatureStoriesMutation()
  const [analyzeDependencies, { isLoading: analyzing }] = useAnalyzeDependenciesMutation()
  const [updateStory] = useUpdateStoryMutation()
  const [rejectDependency] = useRejectDependencyMutation()

  // AI dependency-analysis review (ADR-0026): advisory suggestions the user accepts/rejects one by one.
  const [depModalOpen, setDepModalOpen] = useState(false)
  const [depAnalysis, setDepAnalysis] = useState<DependencyAnalysis | null>(null)
  const [acceptedDepKeys, setAcceptedDepKeys] = useState<Set<string>>(new Set())
  const [rejectedDepKeys, setRejectedDepKeys] = useState<Set<string>>(new Set())
  const [savingDepKey, setSavingDepKey] = useState<string | null>(null)

  const [autoGenerating, setAutoGenerating] = useState(false)
  // Project-level overall story dependency graph (collapsed by default) + the story
  // opened from clicking a graph node.
  const [showStoryGraph, setShowStoryGraph] = useState(false)
  const [graphDetailId, setGraphDetailId] = useState<string | null>(null)
  // Live, feature-by-feature progress: the ordered plan, which feature is generating now, and which are done.
  const [genPlan, setGenPlan] = useState<StoryPlanFeature[]>([])
  const [genCurrentId, setGenCurrentId] = useState<string | null>(null)
  const [genDoneIds, setGenDoneIds] = useState<string[]>([])
  // Guards the one-shot auto-generation per project (stories auto-generate once features are approved).
  const autoGenStartedFor = useRef<string | null>(null)

  const approved = sortByOrder(visibleFeatures(plan?.features ?? []).filter((f) => f.status === 'approved'))
  const activeStories = visibleStories(stories)

  // Once features are approved, auto-generate user stories for ALL approved features (ADR-0017),
  // one feature at a time so each feature's stories persist and are reviewable while the next runs.
  useEffect(() => {
    if (!projectId || planLoading || storiesLoading) return
    if (approved.length > 0 && activeStories.length === 0 && autoGenStartedFor.current !== projectId) {
      autoGenStartedFor.current = projectId
      void runAutoGenerate(projectId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, planLoading, storiesLoading, approved.length, activeStories.length])

  async function runAutoGenerate(pid: string) {
    setAutoGenerating(true)
    setGenPlan([])
    setGenDoneIds([])
    setGenCurrentId(null)
    try {
      // No featureIds → all approved features, in order.
      const targetPlan = await getStoriesPlan({ projectId: pid }).unwrap()
      setGenPlan(targetPlan.features)

      for (const feature of targetPlan.features) {
        setGenCurrentId(feature.id)
        try {
          // Persists this feature's stories server-side; invalidates the story cache so the
          // list below refreshes immediately — the user can review them while the next generates.
          await generateFeatureStories({ projectId: pid, featureId: feature.id }).unwrap()
        } catch {
          // One feature failing must not stop the rest.
        }
        setGenDoneIds((prev) => [...prev, feature.id])
      }

      setGenCurrentId(null)
      notifications.show({
        color: 'teal',
        title: 'User stories generated',
        message: `Detailed user stories were drafted for ${targetPlan.features.length} feature${targetPlan.features.length !== 1 ? 's' : ''}.`,
      })
    } catch {
      // non-fatal — the per-feature "Generate Stories" action remains available
    } finally {
      setAutoGenerating(false)
      setGenCurrentId(null)
    }
  }

  if (!projectId) return null

  if (planLoading || storiesLoading) {
    return (
      <Stack gap="md" maw={720}>
        <Skeleton height={28} width={220} radius="sm" />
        <Skeleton height={140} radius="md" />
        <Skeleton height={140} radius="md" />
      </Stack>
    )
  }

  if (approved.length === 0) return <FeaturesEmpty projectId={projectId} />

  const selectedId = searchParams.get(PARAM_FEATURE) ?? approved[0]?.id
  const selected = approved.find((f) => f.id === selectedId) ?? approved[0]

  const readyForDev = activeStories.filter((s) => s.status === 'ready').length
  const gateMet = readyForDev > 0
  const doneCount = genDoneIds.length

  async function handleAnalyzeDependencies() {
    if (!projectId) return
    setDepModalOpen(true)
    setDepAnalysis(null)
    setAcceptedDepKeys(new Set())
    setRejectedDepKeys(new Set())
    try {
      const result = await analyzeDependencies(projectId).unwrap()
      setDepAnalysis(result)
    } catch {
      notifications.show({ color: 'red', title: 'Analysis unavailable', message: 'Could not analyze dependencies. Please try again.' })
      setDepModalOpen(false)
    }
  }

  // Accept one suggested edge: add `dependsOn` to the story's dependencies and persist.
  async function handleAcceptDependency(storyId: string, dependsOnId: string) {
    if (!projectId) return
    const story = activeStories.find((s) => s.id === storyId)
    if (!story) return
    const key = `${storyId}->${dependsOnId}`
    setSavingDepKey(key)
    try {
      const values: StoryFormValues = {
        title: story.title,
        description: story.description,
        asA: story.asA,
        iWant: story.iWant,
        soThat: story.soThat,
        acceptanceCriteria: story.acceptanceCriteria,
        background: story.background ?? '',
        epic: story.epic ?? '',
        version: story.version ?? '1.0',
        assumptions: story.assumptions ?? [],
        navigationFlow: story.navigationFlow ?? { entryPoint: '', happyPath: [], alternatePaths: [], exceptionPaths: [] },
        components: story.components ?? [],
        validationRules: story.validationRules ?? [],
        effort: String(story.effort),
        status: story.status,
        assignee: story.assignee ?? '',
        dependencies: Array.from(new Set([...story.dependencies, dependsOnId])),
      }
      await updateStory({ projectId, storyId, values }).unwrap()
      setAcceptedDepKeys((prev) => new Set(prev).add(key))
      notifications.show({ color: 'teal', title: 'Dependency added', message: `${storyId} now depends on ${dependsOnId}.` })
    } catch {
      notifications.show({ color: 'red', title: 'Could not add dependency', message: 'Please try again.' })
    } finally {
      setSavingDepKey(null)
    }
  }

  // Reject a suggested edge: persist the rejection so it is never suggested again.
  async function handleRejectDependency(storyId: string, dependsOnId: string) {
    if (!projectId) return
    const key = `${storyId}->${dependsOnId}`
    setSavingDepKey(key)
    try {
      await rejectDependency({ projectId, kind: 'story', source: storyId, dependsOn: dependsOnId }).unwrap()
      setRejectedDepKeys((prev) => new Set(prev).add(key))
      notifications.show({ color: 'gray', title: 'Suggestion rejected', message: `${storyId} → ${dependsOnId} won't be suggested again.` })
    } catch {
      notifications.show({ color: 'red', title: 'Could not reject suggestion', message: 'Please try again.' })
    } finally {
      setSavingDepKey(null)
    }
  }

  async function handleContinueToImplementation() {
    if (!projectId) return
    try {
      await updateProject({ id: projectId, patch: { currentPhase: 'implementation' } }).unwrap()
    } catch {
      // non-fatal — still advance
    }
    notifications.show({
      color: 'teal',
      title: 'Advancing to Implementation',
      message: `${readyForDev} story(s) ready for development.`,
    })
    navigate(ROUTES.implementation(projectId))
  }

  return (
    <Box>
      <PageHeader
        title="Features"
        meta={
          <Group gap="sm" wrap="wrap">
            <Badge color="grape" variant="light" radius="sm">
              {approved.length} feature{approved.length !== 1 ? 's' : ''}
            </Badge>
            <Badge color="gray" variant="default" radius="sm">
              {activeStories.length} stor{activeStories.length !== 1 ? 'ies' : 'y'}
            </Badge>
            <Badge color={gateMet ? 'teal' : 'gray'} variant="light" radius="sm">
              {readyForDev} ready for dev
            </Badge>
          </Group>
        }
        actions={
          <>
            <Button
              variant={showStoryGraph ? 'light' : 'default'}
              color={showStoryGraph ? 'indigo' : 'gray'}
              leftSection={<IconBinaryTree2 size={15} />}
              onClick={() => setShowStoryGraph((v) => !v)}
            >
              {showStoryGraph ? 'Hide graph' : 'Story dependencies'}
            </Button>
            {activeStories.length > 0 && (
              <Button
                variant="light"
                color="violet"
                leftSection={<IconSparkles size={15} />}
                loading={analyzing && !depModalOpen}
                onClick={handleAnalyzeDependencies}
              >
                Analyze dependencies (AI)
              </Button>
            )}
            {gateMet && (
              <Button
                variant="accent"
                rightSection={<IconArrowRight size={14} />}
                loading={advancing}
                onClick={handleContinueToImplementation}
              >
                Continue to Implementation
              </Button>
            )}
          </>
        }
      />

      {showStoryGraph && (
        <Box mb="lg">
          <Text size="sm" c="dimmed" mb={6}>
            All stories across every feature — an arrow points from a dependency to the story that
            needs it. Click a node to open that story.
          </Text>
          <DependencyGraph
            nodes={buildStoryNodes(activeStories)}
            onSelect={(id) => setGraphDetailId(id)}
            emptyHint="No stories yet — generate stories to see their dependencies."
          />
        </Box>
      )}

      <Paper withBorder radius="md" p="lg" bg="var(--cl-bg-elev)">
        {/* Selected feature header */}
        <Box mb="md">
          <Group gap="xs" mb={4}>
            <Text size="xs" ff="monospace" c="dimmed">
              {selected.id}
            </Text>
            <Title order={3} size="h3">
              {selected.title}
            </Title>
          </Group>
          <Text size="sm" c="dimmed" lh={1.6} maw={720}>
            {selected.description}
          </Text>
        </Box>

        <Divider mb="md" />

        {/* Live, feature-by-feature progress. Shown while generating; the story view stays
            visible below so the user can review stories as each feature completes. */}
        {autoGenerating && (
          <Alert
            color="violet"
            variant="light"
            mb="md"
            maw={620}
            icon={<IconSparkles size={18} />}
            title={`Generating user stories — ${doneCount} of ${genPlan.length || approved.length} features`}
          >
            <Text size="sm" c="dimmed" mb="sm">
              Drafting detailed stories (acceptance criteria, dependencies, blockers, risks) one
              feature at a time. Completed stories appear below as each feature finishes — feel free
              to review them while the rest generate.
            </Text>
            <Stack gap={6}>
              {(genPlan.length > 0 ? genPlan : approved.map((f) => ({ id: f.id, title: f.title }))).map((f) => {
                const done = genDoneIds.includes(f.id)
                const current = genCurrentId === f.id
                return (
                  <Group key={f.id} gap="xs" wrap="nowrap">
                    {done ? (
                      <ThemeIcon size={18} radius="xl" color="teal" variant="light">
                        <IconCircleCheck size={13} />
                      </ThemeIcon>
                    ) : current ? (
                      <Loader size={14} color="violet" />
                    ) : (
                      <ThemeIcon size={18} radius="xl" color="gray" variant="light">
                        <IconCircleDashed size={13} />
                      </ThemeIcon>
                    )}
                    <Text size="xs" ff="monospace" c="dimmed">
                      {f.id}
                    </Text>
                    <Text size="sm" fw={current ? 600 : 400} c={done ? 'teal' : current ? undefined : 'dimmed'}>
                      {f.title}
                    </Text>
                    {current && (
                      <Badge size="xs" color="violet" variant="light">
                        generating…
                      </Badge>
                    )}
                  </Group>
                )
              })}
            </Stack>
          </Alert>
        )}

        {/* Story view — always available so generated stories can be reviewed as they stream in. */}
        {activeStories.length === 0 && autoGenerating ? (
          <Text size="sm" c="dimmed">
            The first feature’s stories will appear here in a moment…
          </Text>
        ) : (
          <StoryList projectId={projectId} feature={selected} allStories={activeStories} />
        )}
      </Paper>

      {/* Story opened from the overall dependency graph. Editing jumps to that story's
          feature tab where the full story actions live. */}
      <StoryDetailModal
        story={graphDetailId ? activeStories.find((s) => s.id === graphDetailId) ?? null : null}
        allStories={activeStories}
        opened={graphDetailId !== null}
        onClose={() => setGraphDetailId(null)}
        projectId={projectId}
        onEdit={(s) => {
          setGraphDetailId(null)
          const next = new URLSearchParams(searchParams)
          next.set(PARAM_FEATURE, s.featureId)
          setSearchParams(next)
        }}
        storyTitleById={new Map(activeStories.map((s) => [s.id, s.title]))}
        onOpenStory={(id) => setGraphDetailId(id)}
      />

      <DependencyAnalysisModal
        opened={depModalOpen}
        onClose={() => setDepModalOpen(false)}
        loading={analyzing}
        analysis={depAnalysis}
        stories={activeStories}
        acceptedKeys={acceptedDepKeys}
        rejectedKeys={rejectedDepKeys}
        savingKey={savingDepKey}
        onAccept={handleAcceptDependency}
        onReject={handleRejectDependency}
      />
    </Box>
  )
}
