import { useState, useEffect } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { Box, Stack, Group, Title, Text, Menu, Alert, Button, SimpleGrid, ActionIcon, Indicator, Tooltip } from '@mantine/core'
import { IconHelpCircle, IconChevronDown, IconCheck, IconMessage2 } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import type { NotificationData } from '@mantine/notifications'
import { useOperation, http } from '@wispr/services'
import { isOperationTerminal, API_ENDPOINTS } from '@wispr/contracts'
import { OperationProgress } from '@wispr/ui'
import { useStrategyProject } from '../../app/StrategyProjectContext'
import { useUpdatePhaseStateMutation, useUploadPhaseInputMutation, useUploadAdditionalDocMutation, useGenerateOutputMutation, useFinalizeGenerationMutation } from './utility/services/phaseStateApi'
import type { PhaseStatus, UpdatePhaseStateInput } from './utility/models/model'
import { progressOf, allMandatoryUploaded, isPhaseLocked, unresolvedCount, openCommentCount, statusMeta } from './utility/helpers/helpers'
import { InputDocuments } from './components/InputDocuments/InputDocuments'
import { OutputDocuments } from './components/OutputDocuments/OutputDocuments'
import { CommentsDrawer } from '../comments/CommentsDrawer'

const STATUS_OPTIONS: { value: PhaseStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

/**
 * A single strategy phase (`/:phaseId`). The user works inputs → outputs and manually
 * sets the phase status (New · In Progress · Done). Done freezes the phase: every
 * transactional action is disabled and only downloads remain. Open questions the AI
 * flagged surface as an alert that deep-links to the phase's Open Questions page.
 */
export function PhasePage() {
  const { phaseId } = useParams<{ phaseId: string }>()
  const navigate = useNavigate()
  const { projectId, phases, state, phasePath } = useStrategyProject()
  const [updatePhaseState] = useUpdatePhaseStateMutation()
  const [uploadPhaseInput] = useUploadPhaseInputMutation()
  const [uploadAdditionalDoc] = useUploadAdditionalDocMutation()

  const phase = phases.find((p) => p.id === phaseId)
  // Unknown / stale phase id → fall back to the first configured phase.
  if (!phase) {
    return phases[0] ? <Navigate to={phasePath(phases[0].id)} replace /> : null
  }

  const [commentsOpen, setCommentsOpen] = useState(false)

  // Output generation runs as a durable async operation (Phase 10 / ADR-0072): start returns an operation id,
  // `useOperation` polls its live progress, and on success we finalize (store the document + mark the output).
  const [generateOutput] = useGenerateOutputMutation()
  const [finalizeGeneration] = useFinalizeGenerationMutation()
  const [activeGen, setActiveGen] = useState<{ output: string; operationId: string } | null>(null)
  const { operation } = useOperation('strategy', activeGen?.operationId)

  useEffect(() => {
    if (!operation || !activeGen || !isOperationTerminal(operation.status)) return
    const { output, operationId } = activeGen
    if (operation.status === 'succeeded') {
      void finalizeGeneration({ projectId, phaseId: phase.id, output, operationId })
        .unwrap()
        .then(() => notifications.show({ color: 'violet', title: 'Generated', message: `“${output}” is ready.` }))
        .catch(() => notifications.show({ color: 'red', title: 'Could not save the document', message: 'Please try again.' }))
    } else {
      notifications.show({ color: 'red', title: 'Generation failed', message: operation.failure?.message ?? 'Please try again.' })
    }
    setActiveGen(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation])

  const progress = progressOf(state, phase.id)
  const canGenerate = allMandatoryUploaded(phase, progress)
  const locked = isPhaseLocked(progress)
  const openCount = unresolvedCount(progress)
  const commentCount = openCommentCount(progress)

  // Single dispatch helper — applies an action, shows a success toast, and surfaces a
  // human-readable error if it fails (never swallow it).
  function run(input: UpdatePhaseStateInput, success?: NotificationData) {
    void updatePhaseState(input)
      .unwrap()
      .then(() => {
        if (success) notifications.show(success)
      })
      .catch(() =>
        notifications.show({ color: 'red', title: 'Something went wrong', message: 'Please try again.' }),
      )
  }

  const base = { projectId, phaseId: phase.id }

  function upload(slot: string, file: File) {
    void uploadPhaseInput({ projectId, phaseId: base.phaseId, slot, file })
      .unwrap()
      .then(() => notifications.show({ color: 'teal', title: 'Document uploaded', message: `”${file.name}” added to ${slot}.` }))
      .catch(() => notifications.show({ color: 'red', title: 'Upload failed', message: 'Please try again.' }))
  }
  function deleteMandatoryFile(slot: string, fileId: string) {
    run({ ...base, action: 'delete-mandatory-file', name: slot, id: fileId }, {
      color: 'gray',
      title: 'File removed',
      message: 'The file was removed.',
    })
  }
  function saveContext(name: string, text: string) {
    run({ ...base, action: 'context', name, text }, {
      color: 'violet',
      title: text.trim() ? 'Context saved' : 'Context cleared',
      message: `“${name}” will inform output generation.`,
    })
  }
  async function generate(name: string) {
    try {
      // Start the durable operation; `useOperation` + the terminal effect above take over from here.
      const started = await generateOutput({ ...base, output: name }).unwrap()
      setActiveGen({ output: name, operationId: started.operationId })
    } catch {
      notifications.show({ color: 'red', title: 'Could not start generation', message: 'Please try again.' })
    }
  }
  function uploadAdditional(file: File) {
    void uploadAdditionalDoc({ projectId, phaseId: base.phaseId, file })
      .unwrap()
      .then(() => notifications.show({ color: 'teal', title: 'Document added', message: `"${file.name}" added to inputs.` }))
      .catch(() => notifications.show({ color: 'red', title: 'Upload failed', message: 'Please try again.' }))
  }
  function deleteAdditional(id: string) {
    run({ ...base, action: 'delete-additional', id }, {
      color: 'gray',
      title: 'Document removed',
      message: 'The document was removed.',
    })
  }
  function saveAdditionalContext(id: string, text: string) {
    run({ ...base, action: 'additional-context', id, text }, {
      color: 'violet',
      title: text.trim() ? 'Context saved' : 'Context cleared',
      message: 'The document context was updated.',
    })
  }
  async function download(name: string, objectBlobName?: string) {
    if (!objectBlobName) {
      notifications.show({ color: 'yellow', title: 'Download not available', message: 'This file was not stored and cannot be downloaded.' })
      return
    }
    try {
      const url = `${API_ENDPOINTS.strategyPhaseAdditionalDocDownload(projectId, phaseId!)}?blobName=${encodeURIComponent(objectBlobName)}`
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

  // Status is manual. Marking Done with gaps is allowed but warns (soft, non-blocking).
  const phaseName = phase.name
  function setStatus(value: string) {
    const status = value as PhaseStatus
    void updatePhaseState({ ...base, action: 'set-status', status })
      .unwrap()
      .then(() => {
        if (status !== 'done') return
        const gaps: string[] = []
        if (!canGenerate) gaps.push('not all mandatory inputs are uploaded')
        if (openCount > 0) gaps.push(`${openCount} open question${openCount > 1 ? 's' : ''} unresolved`)
        notifications.show(
          gaps.length
            ? { color: 'yellow', title: `${phaseName} marked Done`, message: `Note: ${gaps.join(' and ')}.` }
            : { color: 'teal', title: `${phaseName} marked Done`, message: 'The phase is now read-only.' },
        )
      })
      .catch(() =>
        notifications.show({ color: 'red', title: 'Could not update status', message: 'Please try again.' }),
      )
  }

  return (
    <Stack gap="lg">
      <Box>
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
          <Box miw={0}>
            <Text size="xs" c="dimmed" ff="monospace" tt="uppercase" mb={4}>
              Strategy › {phase.name}
            </Text>
            <Title order={2} size="h2">
              {phase.name}
            </Title>
          </Box>
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Comments">
              <Indicator label={commentCount} size={16} color="violet" disabled={commentCount === 0} offset={4}>
                <ActionIcon variant="default" size="lg" aria-label="Comments" onClick={() => setCommentsOpen(true)}>
                  <IconMessage2 size={18} />
                </ActionIcon>
              </Indicator>
            </Tooltip>

            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button
                  variant="light"
                  color={statusMeta(progress.status).color}
                  rightSection={<IconChevronDown size={14} />}
                  justify="space-between"
                  miw={150}
                >
                  {statusMeta(progress.status).label}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Phase status</Menu.Label>
                {STATUS_OPTIONS.map((option) => (
                  <Menu.Item
                    key={option.value}
                    color={statusMeta(option.value).color}
                    onClick={() => setStatus(option.value)}
                    {...(option.value === progress.status ? { leftSection: <IconCheck size={14} /> } : {})}
                  >
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
        <Text size="sm" c="dimmed" mt={6} maw={760}>
          {phase.guide ?? phase.description}
        </Text>
      </Box>

      {openCount > 0 ? (
        <Alert
          variant="light"
          color="yellow"
          icon={<IconHelpCircle size={18} />}
          title={`${openCount} open question${openCount > 1 ? 's' : ''} need review`}
        >
          <Group justify="space-between" align="center" gap="md">
            <Text size="sm">The AI flagged gaps in this phase. Resolve them to keep the strategy sound.</Text>
            <Button
              size="compact-sm"
              variant="light"
              color="yellow"
              onClick={() => navigate(`${phasePath(phase.id)}/questions`)}
            >
              Review open questions →
            </Button>
          </Group>
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <InputDocuments
          phase={phase}
          progress={progress}
          locked={locked}
          onUpload={upload}
          onDeleteMandatoryFile={deleteMandatoryFile}
          onSaveContext={saveContext}
          onUploadAdditional={uploadAdditional}
          onDeleteAdditional={deleteAdditional}
          onSaveAdditionalContext={saveAdditionalContext}
          onDownload={download}
        />
        <OutputDocuments
          phase={phase}
          progress={progress}
          canGenerate={canGenerate && !activeGen}
          locked={locked}
          onGenerate={generate}
          onDownload={download}
        />
      </SimpleGrid>

      {operation && activeGen ? (
        <Box>
          <OperationProgress operation={operation} />
        </Box>
      ) : null}

      <CommentsDrawer
        opened={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        projectId={projectId}
        phaseId={phase.id}
        phaseName={phase.name}
        comments={progress.comments}
      />
    </Stack>
  )
}
