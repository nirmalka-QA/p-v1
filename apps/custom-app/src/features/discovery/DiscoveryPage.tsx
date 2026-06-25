import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { notifications } from '@mantine/notifications'
import {
  Box,
  Text,
  Badge,
  Group,
  Alert,
  Stack,
  Skeleton,
  Grid,
  Button,
} from '@mantine/core'
import { IconArrowRight, IconArrowsExchange, IconBulb } from '@tabler/icons-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { DiscoveryContextInput, DiscoveryGuide } from '@wispr/ui'
import { KBSectionContent } from './components/KBSectionContent'
import { DictationButton } from '../../components/ui/DictationButton'
import { KB_SECTIONS } from '../../constants/kb-sections'
import { ACCEPTED_FILE_EXTENSIONS } from './utility/constants/constants'
import { useDispatch } from 'react-redux'
import {
  useGetKbQuery,
  useStartGenerateKbMutation,
  useAddUploadsMutation,
  discoveryApi,
} from './utility/services/discoveryApi'
import { useUpdateProjectMutation } from '@wispr/projects'
import { useOperation } from '@wispr/services'
import { ROUTES } from '@wispr/contracts'
import { API_TAGS } from '@wispr/contracts'
import { PageHeader, OperationProgress } from '@wispr/ui'

dayjs.extend(relativeTime)

export function DiscoveryPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const dispatch = useDispatch()
  const { data: kb, isLoading: isLoadingKb } = useGetKbQuery(projectId ?? skipToken)
  const [startGenerateKb] = useStartGenerateKbMutation()
  const [addUploads] = useAddUploadsMutation()
  const [updateProject, { isLoading: advancing }] = useUpdateProjectMutation()

  // Drive live progress from the durable operation the backend started (Phase 10 / ADR-0072).
  // `useOperation` polls until terminal, honoring the backend-preconfigured cadence.
  const [operationId, setOperationId] = useState<string | null>(null)
  const { operation } = useOperation('requirements', operationId)

  const [isAnalysing, setIsAnalysing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOperationId(null)
    setIsAnalysing(false)
    setError(null)
  }, [projectId])

  // When the watched operation reaches a terminal state, run the completion side-effects once.
  useEffect(() => {
    if (!operation || operation.status === 'pending' || operation.status === 'running') return
    if (operation.status === 'succeeded') {
      // Refetch the KB now that it's persisted.
      dispatch(discoveryApi.util.invalidateTags([{ type: API_TAGS.KnowledgeBase, id: projectId }]))
      notifications.show({
        color: 'teal',
        title: 'Knowledge Base ready',
        message: 'Your Knowledge Base has been generated from the provided context.',
      })
      clearAddParam() // close the add-context view on success
    } else {
      setError(operation.failure?.message ?? 'Analysis failed. Please try again.')
    }
    setIsAnalysing(false)
    setOperationId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation, projectId])

  function clearAddParam() {
    if (searchParams.get('add')) {
      const next = new URLSearchParams(searchParams)
      next.delete('add')
      setSearchParams(next, { replace: true })
    }
  }

  async function handleSubmit(context: string, files: File[]) {
    if (!projectId) return

    // Stream uploaded artifacts to the backend (multipart, one per file).
    if (files.length > 0) {
      try {
        await addUploads({ projectId, files }).unwrap()
      } catch {
        // non-fatal — still run the analysis
      }
    }

    setIsAnalysing(true)
    setError(null)

    try {
      // Start the durable operation; `useOperation` takes over and polls live progress until terminal.
      const started = await startGenerateKb({ projectId, context }).unwrap()
      setOperationId(started.jobId)
    } catch {
      setError('Analysis failed. Please try again.')
      setIsAnalysing(false)
    }
  }

  async function handleContinueToPlanning() {
    if (!projectId) return
    try {
      await updateProject({ id: projectId, patch: { currentPhase: 'planning' } }).unwrap()
    } catch {
      // non-fatal — still advance
    }
    navigate(ROUTES.planning(projectId))
  }

  if (!projectId) return null

  // ── Initial load ──
  if (isLoadingKb) {
    return (
      <Stack gap="md" maw={640}>
        <Skeleton height={28} width={260} radius="sm" />
        <Skeleton height={160} radius="md" />
      </Stack>
    )
  }

  // ── First-time: form + guidance (sidebar & assistant hidden by the shell) ──
  if (!kb) {
    return (
      <Box>
        <PageHeader
          title="Build your Knowledge Base"
          description="Paste requirements, upload documents, or describe the project — the AI will organise everything into a structured Knowledge Base."
        />
        {error && (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Grid gap="xl" align="start">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <DiscoveryContextInput
              onSubmit={handleSubmit}
              disabled={isAnalysing}
              loading={isAnalysing}
              dictationSlot={(onTranscript) => (
                <DictationButton size="sm" disabled={isAnalysing} onTranscript={onTranscript} />
              )}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            {isAnalysing ? (
              <OperationProgress operation={operation} />
            ) : (
              <DiscoveryGuide sections={KB_SECTIONS} acceptedExtensions={ACCEPTED_FILE_EXTENSIONS} />
            )}
          </Grid.Col>
        </Grid>
      </Box>
    )
  }

  // ── KB ready: selected section content (nav + sources live in the sidebar) ──
  // Counts are based on ACTIVE notes (superseded ones are kept as history; ADR-0015).
  const activeCount = (s: (typeof kb.sections)[number]) =>
    s.notes.filter((n) => n.status !== 'superseded').length

  const firstPopulated = kb.sections.find((s) => activeCount(s) > 0)?.id ?? kb.sections[0]?.id
  const selectedId = searchParams.get('section') ?? firstPopulated
  const section = kb.sections.find((s) => s.id === selectedId) ?? kb.sections[0]

  const sectionsWithContent = kb.sections.filter((s) => activeCount(s) > 0).length
  const totalNotes = kb.sections.reduce((n, s) => n + activeCount(s), 0)
  const gateMet = sectionsWithContent >= 1
  const addOpen = searchParams.get('add') === '1'

  // ── Add more context: same form + guide layout, but sidebar stays open ──
  if (addOpen) {
    return (
      <Box>
        <PageHeader
          title="Add more context"
          description="Add notes or files and re-run analysis — new context is merged into your Knowledge Base."
          actions={
            <Button variant="default" onClick={clearAddParam} disabled={isAnalysing}>
              Cancel
            </Button>
          }
        />
        {error && (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Grid gap="xl" align="start">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <DiscoveryContextInput
              onSubmit={handleSubmit}
              submitLabel="Re-run Analysis"
              disabled={isAnalysing}
              loading={isAnalysing}
              dictationSlot={(onTranscript) => (
                <DictationButton size="sm" disabled={isAnalysing} onTranscript={onTranscript} />
              )}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            {isAnalysing ? (
              <OperationProgress operation={operation} />
            ) : (
              <DiscoveryGuide sections={KB_SECTIONS} acceptedExtensions={ACCEPTED_FILE_EXTENSIONS} />
            )}
          </Grid.Col>
        </Grid>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Discovery"
        meta={
          <Group gap="sm" wrap="wrap">
            <Badge color="teal" variant="light" radius="sm">
              {sectionsWithContent} sections · {totalNotes} notes
            </Badge>
            <Badge color="gray" variant="default" radius="sm">
              {kb.sourceFileCount} file{kb.sourceFileCount !== 1 ? 's' : ''} analysed
            </Badge>
            {kb.generation != null && kb.generation > 0 && (
              <Badge color="gray" variant="default" radius="sm" ff="monospace">
                gen {kb.generation}
              </Badge>
            )}
            {kb.lastGeneratedAt && (
              <Text size="xs" c="dimmed" ff="monospace">
                Generated {dayjs(kb.lastGeneratedAt).fromNow()}
              </Text>
            )}
          </Group>
        }
        actions={
          gateMet ? (
            <Button
              variant="accent"
              rightSection={<IconArrowRight size={14} />}
              onClick={handleContinueToPlanning}
              loading={advancing}
            >
              Continue to Planning
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert color="red" mb="md" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Latest-generation impact analysis + AI gap suggestions (ADR-0015). */}
      {kb.impact && (kb.impact.summary || kb.impact.gaps) && (
        <Stack gap="sm" mb="lg">
          {kb.impact.summary && (
            <Alert
              color="blue"
              variant="light"
              radius="md"
              icon={<IconArrowsExchange size={16} />}
              title={`Impact of the latest analysis (generation ${kb.impact.generation})`}
            >
              <Text size="sm">{kb.impact.summary}</Text>
            </Alert>
          )}
          {kb.impact.gaps && (
            <Alert color="yellow" variant="light" radius="md" icon={<IconBulb size={16} />} title="Gaps & AI suggestions">
              <Text size="sm">{kb.impact.gaps}</Text>
            </Alert>
          )}
        </Stack>
      )}

      {section && <KBSectionContent section={section} projectId={projectId} />}
    </Box>
  )
}
