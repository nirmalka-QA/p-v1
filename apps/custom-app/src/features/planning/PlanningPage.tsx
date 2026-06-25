import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { notifications } from '@mantine/notifications'
import {
  Box,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Alert,
  Stack,
  Skeleton,
  Textarea,
  Modal,
  Paper,
} from '@mantine/core'
import { IconSparkles, IconCheck, IconLayoutList, IconAlertTriangle, IconArrowRight, IconEye, IconBinaryTree2 } from '@tabler/icons-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { EmptyState } from '@wispr/ui'
import { PlanningEmptyKb } from './components/PlanningEmptyKb'
import { PlanningGenerating } from './components/PlanningGenerating'
import { FeatureDetail } from './components/FeatureDetail'
import { ApprovePlanModal } from './components/ApprovePlanModal'
import { useDispatch } from 'react-redux'
import { useGetKbQuery } from '../discovery/utility/services/discoveryApi'
import { useUpdateProjectMutation } from '@wispr/projects'
import {
  planningApi,
  useGetPlanQuery,
  useStartGeneratePlanMutation,
  useLazyGetPlanGenerationStatusQuery,
  useApprovePlanMutation,
} from './utility/services/planningApi'
import { useGetStoriesQuery } from '../features/utility/services/featuresApi'
import { visibleStories } from '../features/utility/helpers/helpers'
import { sortByOrder, visibleFeatures } from './utility/helpers/helpers'
import { PLANNING_STEPS, APPROVABLE_STATUSES } from './utility/constants/constants'
import { PARAM_FEATURE } from './utility/constants/params'
import { PageHeader } from '@wispr/ui'
import { DependencyGraph } from '../../components/ui/DependencyGraph'
import { buildFeatureNodes } from '../../components/ui/dependencyGraph.helpers'
import type { AnalysisStep } from '../../types'
import type { PlanGenStep } from './utility/models/model'
import { ROUTES } from '@wispr/contracts'
import { API_TAGS, LIST_ID } from '@wispr/contracts'
import { DictationButton } from '../../components/ui/DictationButton'
import { appendTranscript } from '../../hooks/useDictation'

dayjs.extend(relativeTime)

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Fresh set of planning steps, all pending — the progress panel's initial state. */
const pendingSteps = (): AnalysisStep[] =>
  PLANNING_STEPS.map((s) => ({ ...s, status: 'pending' as const }))

/** Maps backend progress steps to the AnalysisProgress shape, deriving real elapsed seconds. */
function toAnalysisSteps(steps: PlanGenStep[]): AnalysisStep[] {
  return steps.map((s) => {
    let estimatedSeconds: number | undefined
    if (s.startedAt && s.endedAt) {
      const ms = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
      if (ms >= 0) estimatedSeconds = Math.max(0.1, Math.round(ms / 100) / 10)
    }
    return { id: s.key, label: s.label, status: s.status, estimatedSeconds }
  })
}

export function PlanningPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const dispatch = useDispatch()
  const { data: kb, isLoading: kbLoading } = useGetKbQuery(projectId ?? skipToken)
  const { data: plan, isLoading: planLoading } = useGetPlanQuery(projectId ?? skipToken)
  // Stories drive the derived feature-dependency graph (feature A → B when a story in
  // A depends on a story in B); features have no dependency field of their own.
  const { data: stories = [] } = useGetStoriesQuery(projectId ?? skipToken)
  const [startGeneratePlan] = useStartGeneratePlanMutation()
  const [fetchPlanStatus] = useLazyGetPlanGenerationStatusQuery()
  const [approvePlan, { isLoading: approving }] = useApprovePlanMutation()
  const [updateProject, { isLoading: advancing }] = useUpdateProjectMutation()

  // Seed with pending steps so the progress panel is populated on first paint —
  // before the auto-generation effect runs — instead of flashing an empty box.
  const [steps, setSteps] = useState<AnalysisStep[]>(pendingSteps)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Project-level overall feature dependency graph (collapsed by default).
  const [showFeatureGraph, setShowFeatureGraph] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenContext, setRegenContext] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)

  // Guards the one-shot auto-generation per project (requirements §6.1).
  const autoGenStartedFor = useRef<string | null>(null)

  // Runs the visible step-by-step progress, then the (mock) generation.
  // Returns whether generation succeeded so callers can react without reading
  // the (asynchronously-updated) `error` state.
  // Start a progressive build, then poll real per-step progress from the backend
  // (mirrors Discovery's KB generation). Returns whether generation succeeded.
  async function runGeneration(context?: string): Promise<boolean> {
    if (!projectId) return false
    setGenerating(true)
    setError(null)
    setSteps(PLANNING_STEPS.map((s) => ({ ...s, status: 'pending' })))
    try {
      const started = await startGeneratePlan({ projectId, context }).unwrap()
      setSteps(toAnalysisSteps(started.steps))

      let status = started.status
      let jobId = started.jobId
      while (status === 'running') {
        await sleep(1200)
        const next = await fetchPlanStatus({ projectId, jobId }).unwrap()
        setSteps(toAnalysisSteps(next.steps))
        status = next.status
        jobId = next.jobId
      }

      if (status === 'completed') {
        // Refetch the plan now that it's persisted.
        dispatch(planningApi.util.invalidateTags([{ type: API_TAGS.Feature, id: LIST_ID }]))
        return true
      }
      setError('We couldn’t generate your feature list. Please try again.')
      return false
    } catch {
      setError('We couldn’t generate your feature list. Please try again.')
      return false
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate the plan the first time Planning is opened with a KB present.
  useEffect(() => {
    if (!projectId || kbLoading || planLoading) return
    if (kb && !plan && autoGenStartedFor.current !== projectId) {
      autoGenStartedFor.current = projectId
      void runGeneration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, kb, plan, kbLoading, planLoading])

  // Reset transient state when switching projects.
  useEffect(() => {
    setSteps(pendingSteps())
    setGenerating(false)
    setError(null)
    setRegenOpen(false)
    setRegenContext('')
  }, [projectId])

  async function handleRegenerate() {
    setRegenOpen(false)
    const ok = await runGeneration(regenContext.trim() || undefined)
    setRegenContext('')
    if (ok) {
      notifications.show({
        color: 'teal',
        title: 'Feature list regenerated',
        message: 'Your plan has been rebuilt from the Knowledge Base.',
      })
    }
  }

  async function handleApprove() {
    if (!projectId) return
    try {
      // Approval itself only locks the features — advancing the phase is a
      // separate, non-fatal step driven by the "Continue to Features" button.
      await approvePlan(projectId).unwrap()
      notifications.show({
        color: 'teal',
        title: 'Features approved',
        message: 'Approved features are ready — continue to the Features phase when you’re set.',
      })
      setApproveOpen(false)
    } catch {
      notifications.show({
        color: 'red',
        title: 'Could not approve plan',
        message: 'Something went wrong. Please try again.',
      })
    }
  }

  async function handleContinueToFeatures() {
    if (!projectId) return
    // Phase advance is non-fatal — the API doesn't persist phase, so we navigate
    // regardless (mirrors Discovery's "Continue to Planning").
    try {
      await updateProject({ id: projectId, patch: { currentPhase: 'features' } }).unwrap()
    } catch {
      // ignore — advancing is best-effort
    }
    navigate(ROUTES.features(projectId))
  }

  if (!projectId) return null

  // ── Loading ──
  if (kbLoading || planLoading) {
    return (
      <Stack gap="md" maw={640}>
        <Skeleton height={28} width={220} radius="sm" />
        <Skeleton height={160} radius="md" />
      </Stack>
    )
  }

  // ── No Knowledge Base yet → direct to Discovery ──
  if (!kb) return <PlanningEmptyKb projectId={projectId} />

  // ── Generating (initial auto-gen or regenerate) ──
  if (generating || (!plan && !error)) return <PlanningGenerating steps={steps} />

  // ── Generation failed before a plan ever existed ──
  if (!plan) {
    return (
      <Box maw={640}>
        <Title order={2} size="h2" mb="xs">
          Planning
        </Title>
        <Alert color="red" mb="md" icon={<IconAlertTriangle size={18} />} title="Generation failed">
          {error}
        </Alert>
        <Button variant="light" color="violet" leftSection={<IconSparkles size={15} />} onClick={() => runGeneration()}>
          Try again
        </Button>
      </Box>
    )
  }

  // ── Workspace ── (archived features are retained as context but hidden here)
  const active = visibleFeatures(plan.features)
  const ordered = sortByOrder(active)
  const selectedId = searchParams.get(PARAM_FEATURE) ?? ordered[0]?.id
  const selectedIndex = ordered.findIndex((f) => f.id === selectedId)
  const selected = selectedIndex >= 0 ? ordered[selectedIndex] : ordered[0]
  const approvable = active.filter((f) => APPROVABLE_STATUSES.includes(f.status))
  const excluded = active.filter((f) => f.status === 'deferred' || f.status === 'rejected')
  const approvedCount = active.filter((f) => f.status === 'approved').length
  const underReviewCount = active.filter((f) => f.status === 'under-review').length
  const hasApproved = approvedCount > 0

  return (
    <Box>
      <PageHeader
        title="Planning"
        meta={
          <Group gap="sm" wrap="wrap">
            <Badge color="indigo" variant="light" radius="sm">
              {active.length} feature{active.length !== 1 ? 's' : ''}
            </Badge>
            <Badge color="violet" variant="light" radius="sm" leftSection={<IconSparkles size={9} />}>
              Generated from your Knowledge Base
            </Badge>
            {underReviewCount > 0 && (
              <Badge color="yellow" variant="light" radius="sm" leftSection={<IconEye size={9} />}>
                {underReviewCount} under review
              </Badge>
            )}
            {hasApproved && (
              <Badge color="teal" variant="light" radius="sm" leftSection={<IconCheck size={9} />}>
                {approvedCount} approved
              </Badge>
            )}
            <Text size="xs" c="dimmed" ff="monospace">
              {dayjs(plan.generatedAt).fromNow()}
            </Text>
          </Group>
        }
        actions={
          <>
            <Button
              variant={showFeatureGraph ? 'light' : 'default'}
              color={showFeatureGraph ? 'indigo' : 'gray'}
              leftSection={<IconBinaryTree2 size={15} />}
              onClick={() => setShowFeatureGraph((v) => !v)}
            >
              {showFeatureGraph ? 'Hide graph' : 'Feature dependencies'}
            </Button>
            <Button
              variant="light"
              color="violet"
              leftSection={<IconSparkles size={15} />}
              onClick={() => setRegenOpen(true)}
            >
              Regenerate
            </Button>
            {approvable.length > 0 && (
              <Button variant={hasApproved ? 'default' : 'accent'} leftSection={<IconCheck size={15} />} onClick={() => setApproveOpen(true)}>
                Approve Plan
              </Button>
            )}
            {hasApproved && (
              <Button
                variant="accent"
                rightSection={<IconArrowRight size={14} />}
                loading={advancing}
                onClick={handleContinueToFeatures}
              >
                Continue to Features
              </Button>
            )}
          </>
        }
      />

      {plan.isThinKb && (
        <Alert
          color="orange"
          variant="light"
          mb="lg"
          icon={<IconAlertTriangle size={18} />}
          title="Your Knowledge Base is limited"
        >
          Fewer than three sections have content. Consider adding more context in Discovery for
          richer, more accurate feature suggestions.
        </Alert>
      )}

      {error && (
        <Alert color="red" mb="lg" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {showFeatureGraph && (
        <Box mb="lg">
          <Text size="sm" c="dimmed" mb={6}>
            How features depend on each other — derived from story dependencies (feature A points to
            feature B when one of A’s stories depends on a story in B). Click a feature to open it.
          </Text>
          <DependencyGraph
            nodes={buildFeatureNodes(ordered, visibleStories(stories))}
            onSelect={(id) => {
              const next = new URLSearchParams(searchParams)
              next.set(PARAM_FEATURE, id)
              setSearchParams(next)
            }}
            emptyHint="No feature dependencies yet — they appear once stories link across features."
          />
        </Box>
      )}

      {selected ? (
        <Paper withBorder radius="md" p="lg" bg="var(--cl-bg-elev)">
          <FeatureDetail feature={selected} projectId={projectId} />
        </Paper>
      ) : (
        <EmptyState
          icon={IconLayoutList}
          title="No features in your plan"
          description="Add a feature from the sidebar, accept an AI suggestion, or regenerate the list from your Knowledge Base."
          action={{ label: 'Regenerate from Knowledge Base', onClick: () => setRegenOpen(true) }}
        />
      )}

      {/* Regenerate — confirm + optional extra instructions (requirements §6.2). */}
      <Modal
        opened={regenOpen}
        onClose={() => setRegenOpen(false)}
        title="Regenerate feature list"
        size="md"
        centered
        styles={{ title: { fontWeight: 600 } }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed" lh={1.6}>
            This rebuilds the feature list from your Knowledge Base and replaces the current one.
            Approved features and your edits will be lost.
          </Text>
          <Textarea
            label="Add context (optional)"
            placeholder="e.g. Focus on mobile-first features, or emphasise reporting and analytics."
            autosize
            minRows={2}
            value={regenContext}
            onChange={(e) => setRegenContext(e.currentTarget.value)}
          />
          <Group justify="space-between" gap="sm">
            <DictationButton onTranscript={(t) => setRegenContext((c) => appendTranscript(c, t))} />
            <Group gap="sm">
              <Button variant="subtle" color="gray" onClick={() => setRegenOpen(false)}>
                Cancel
              </Button>
              <Button variant="accent" leftSection={<IconSparkles size={15} />} onClick={handleRegenerate}>
                Regenerate
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* Approve gate — lists exactly which features are being approved. */}
      <ApprovePlanModal
        opened={approveOpen}
        onClose={() => setApproveOpen(false)}
        toApprove={approvable}
        excluded={excluded}
        onConfirm={handleApprove}
        loading={approving}
      />
    </Box>
  )
}
