import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, Grid, Alert, Card, Title, Text, List, Divider, Group, Badge, Paper, Button, Stack } from '@mantine/core'
import { IconHelpCircle, IconFileText } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DiscoveryContextInput, ACCEPTED_FILE_EXTENSIONS, PageHeader, OperationProgress, EmptyState } from '@wispr/ui'
import markdownStyles from './markdown.module.css'
import { API_ENDPOINTS, API_TAGS, isOperationTerminal } from '@wispr/contracts'
import { http, useOperation } from '@wispr/services'
import { useAppDispatch } from '@wispr/store'
import { useStrategyProject } from '../../app/StrategyProjectContext'
import {
  useUpdatePhaseStateMutation,
  useUploadAdditionalDocMutation,
  useGenerateKbMutation,
  useGetKbQuery,
  phaseStateApi,
} from '../phase/utility/services/phaseStateApi'
import { progressOf, unresolvedCount } from '../phase/utility/helpers/helpers'
import type { StrategyKbSection } from '../phase/utility/models/model'
import { AdditionalDocuments } from '../phase/components/AdditionalDocuments/AdditionalDocuments'
import { SectionHeader } from '../phase/components/SectionHeader/SectionHeader'

const DISCOVERY_PHASE_ID = 'discovery'

const GUIDE_SECTIONS = [
  'Background & Context',
  'Strategic Objectives',
  'Stakeholders',
  'Constraints & Risks',
  'Timeline & Milestones',
  'Scope & Boundaries',
]

function StrategyDiscoveryGuide() {
  return (
    <Card withBorder radius="md" padding="lg">
      <Title order={4} size="h4" mb="xs">
        How this works
      </Title>
      <List type="ordered" size="sm" spacing="xs" c="dimmed">
        <List.Item>Add background documents, client briefs, transcripts, or paste context notes.</List.Item>
        <List.Item>Build the knowledge base — the AI structures your material into the categories below.</List.Item>
        <List.Item>The knowledge base grounds every later phase; review any open questions it raises.</List.Item>
      </List>

      <Divider my="md" />

      <Text size="sm" fw={600} mb="xs">
        Knowledge base categories
      </Text>
      <Group gap={6}>
        {GUIDE_SECTIONS.map((label) => (
          <Badge key={label} variant="light" color="gray" radius="sm" tt="none" fw={500}>
            {label}
          </Badge>
        ))}
      </Group>

      <Divider my="md" />

      <Text size="xs" c="dimmed" ff="monospace">
        Accepts: {ACCEPTED_FILE_EXTENSIONS.map((e) => e.replace('.', '').toUpperCase()).join(' · ')}
      </Text>
    </Card>
  )
}

function KbSectionView({ section }: { section: StrategyKbSection }) {
  return (
    <Box>
      <Title order={4} size="h4">
        {section.label}
      </Title>
      {section.description ? (
        <Text size="sm" c="dimmed" mt={4}>
          {section.description}
        </Text>
      ) : null}
      <Divider my="md" />

      {section.notes.length > 0 ? (
        <Stack gap="lg">
          {section.notes.map((note) => (
            <Box key={note.id}>
              <Title order={5} size="h6">
                {note.title}
              </Title>
              {note.description ? (
                <Text size="sm" c="dimmed" mb={4}>
                  {note.description}
                </Text>
              ) : null}
              <Box className={markdownStyles.markdown ?? ''}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
              </Box>
            </Box>
          ))}
        </Stack>
      ) : (
        <EmptyState
          icon={IconFileText}
          title="Not covered yet"
          description={section.description || 'The knowledge base does not cover this category yet — add more context and rebuild.'}
        />
      )}
    </Box>
  )
}

/**
 * Discovery-phase view for the strategy workspace. Builds the knowledge base from context notes + uploaded files via
 * the shared KB agent (ADR-0074, durable async op) and DISPLAYS it — the 6 categories are browsed from the sidebar and
 * rendered here (like the custom-app project). Open questions the generation raises surface as an alert linking to the
 * Open Questions page. The KB grounds every later phase.
 */
export function StrategyDiscoveryPage() {
  const { projectId, state, phasePath } = useStrategyProject()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const [updatePhaseState] = useUpdatePhaseStateMutation()
  const [uploadAdditionalDoc] = useUploadAdditionalDocMutation()
  const [generateKb] = useGenerateKbMutation()
  const { data: kb } = useGetKbQuery(projectId ?? skipToken)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kbOperationId, setKbOperationId] = useState<string | null>(null)

  const { operation } = useOperation('strategy', kbOperationId)

  const progress = progressOf(state, DISCOVERY_PHASE_ID)
  const additionalDocs = state?.[DISCOVERY_PHASE_ID]?.additionalDocs ?? []
  const openCount = unresolvedCount(progress)

  const hasKb = Boolean(kb?.lastGeneratedAt)
  const sections = kb?.sections ?? []
  const firstPopulated = sections.find((s) => s.notes.length > 0)?.id ?? sections[0]?.id
  const selectedId = searchParams.get('section') ?? firstPopulated
  const selectedSection = sections.find((s) => s.id === selectedId) ?? sections[0]

  // When KB generation reaches a terminal state, surface the outcome and refresh phase/KB so the new content + open
  // questions appear (both provide the PhaseState tag).
  useEffect(() => {
    if (!operation || !kbOperationId || !isOperationTerminal(operation.status)) return
    if (operation.status === 'succeeded') {
      dispatch(phaseStateApi.util.invalidateTags([{ type: API_TAGS.PhaseState, id: projectId }]))
      notifications.show({ color: 'violet', title: 'Knowledge base ready', message: 'Browse the categories in the sidebar; review any open questions it raised.' })
    } else {
      notifications.show({ color: 'red', title: 'Knowledge base generation failed', message: operation.failure?.message ?? 'Please try again.' })
    }
    setKbOperationId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation])

  async function handleSubmit(context: string, files: File[]) {
    setIsSubmitting(true)
    setError(null)

    try {
      if (context.trim()) {
        await updatePhaseState({
          projectId,
          phaseId: DISCOVERY_PHASE_ID,
          action: 'context',
          name: 'Context & Notes',
          text: context.trim(),
        }).unwrap()
      }

      for (const file of files) {
        await uploadAdditionalDoc({ projectId, phaseId: DISCOVERY_PHASE_ID, file }).unwrap()
      }

      const { operationId } = await generateKb({ projectId, phaseId: DISCOVERY_PHASE_ID }).unwrap()
      setKbOperationId(operationId)
      notifications.show({
        color: 'teal',
        title: 'Building knowledge base',
        message: 'Your context was saved — the AI is structuring it into the knowledge base.',
      })
    } catch {
      setError('Failed to build the knowledge base. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function deleteAdditional(id: string) {
    void updatePhaseState({ projectId, phaseId: DISCOVERY_PHASE_ID, action: 'delete-additional', id })
      .unwrap()
      .catch(() => notifications.show({ color: 'red', title: 'Remove failed', message: 'Please try again.' }))
  }

  async function downloadAdditionalDoc(name: string, objectBlobName?: string) {
    if (!objectBlobName) {
      notifications.show({ color: 'yellow', title: 'Download not available', message: 'This file was not stored and cannot be downloaded.' })
      return
    }
    try {
      const url = `${API_ENDPOINTS.strategyPhaseAdditionalDocDownload(projectId, DISCOVERY_PHASE_ID)}?blobName=${encodeURIComponent(objectBlobName)}`
      const response = await http.get<Blob>(url, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = name
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      notifications.show({ color: 'red', title: 'Download failed', message: 'Could not download the file. Please try again.' })
    }
  }

  const generating = isSubmitting || kbOperationId !== null

  return (
    <Box>
      <PageHeader
        title="Discovery"
        description="Build the knowledge base that grounds every later phase — add context and documents, then browse the structured categories."
      />

      {error && (
        <Alert color="red" mb="md" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {openCount > 0 && (
        <Alert
          variant="light"
          color="yellow"
          icon={<IconHelpCircle size={18} />}
          title={`${openCount} open question${openCount > 1 ? 's' : ''} need review`}
          mb="md"
        >
          <Group justify="space-between" align="center" gap="md">
            <Text size="sm">The knowledge base flagged gaps. Resolve them to keep the strategy sound.</Text>
            <Button
              size="compact-sm"
              variant="light"
              color="yellow"
              onClick={() => navigate(`${phasePath(DISCOVERY_PHASE_ID)}/questions`)}
            >
              Review open questions →
            </Button>
          </Group>
        </Alert>
      )}

      {operation && kbOperationId && (
        <Box mb="lg">
          <OperationProgress operation={operation} />
        </Box>
      )}

      {hasKb && selectedSection ? (
        <>
          {/* The generated knowledge base — the selected category (chosen from the sidebar). */}
          <Paper withBorder radius="md" p="lg">
            <KbSectionView section={selectedSection} />
          </Paper>

          {/* Add more context + rebuild (secondary). */}
          <Paper withBorder radius="md" p="lg" mt="xl">
            <SectionHeader
              title="Add more context & rebuild"
              hint="Add notes or documents and rebuild to refine the knowledge base. Existing notes are kept as history."
            />
            <DiscoveryContextInput
              onSubmit={handleSubmit}
              submitLabel="Rebuild Knowledge Base"
              disabled={generating}
              loading={generating}
            />
          </Paper>
        </>
      ) : (
        <Grid gap="xl" align="start">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <DiscoveryContextInput
              onSubmit={handleSubmit}
              submitLabel="Build Knowledge Base"
              disabled={generating}
              loading={generating}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <StrategyDiscoveryGuide />
          </Grid.Col>
        </Grid>
      )}

      {additionalDocs.length > 0 && (
        <Paper withBorder radius="md" p="lg" mt="xl">
          <SectionHeader
            title="Uploaded documents"
            hint="These documents are saved to this phase — the AI uses them when building the knowledge base."
          />
          <AdditionalDocuments
            docs={additionalDocs}
            locked={false}
            onDelete={deleteAdditional}
            onSaveContext={() => {}}
            onDownload={downloadAdditionalDoc}
          />
        </Paper>
      )}
    </Box>
  )
}
