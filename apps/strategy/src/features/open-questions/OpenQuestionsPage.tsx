import { useParams, Navigate } from 'react-router-dom'
import { Box, Stack, Group, Title, Text } from '@mantine/core'
import { IconHelpCircle } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { EmptyState } from '@wispr/ui'
import { useStrategyProject } from '../../app/StrategyProjectContext'
import { useUpdatePhaseStateMutation } from '../phase/utility/services/phaseStateApi'
import { progressOf, isPhaseLocked } from '../phase/utility/helpers/helpers'
import { QuestionRow } from './components/QuestionRow/QuestionRow'

/**
 * A phase's Open Questions (`/:phaseId/questions`) — the gaps the AI flagged while
 * generating outputs. The user resolves (or reopens) them; resolving is disabled while
 * the phase is Done. Sorted open-first so what still needs attention is at the top.
 */
export function OpenQuestionsPage() {
  const { phaseId } = useParams<{ phaseId: string }>()
  const { projectId, phases, state, phasePath } = useStrategyProject()
  const [updatePhaseState] = useUpdatePhaseStateMutation()

  const phase = phases.find((p) => p.id === phaseId)
  if (!phase) {
    return phases[0] ? <Navigate to={phasePath(phases[0].id)} replace /> : null
  }

  const progress = progressOf(state, phase.id)
  const locked = isPhaseLocked(progress)
  // Open questions first, then resolved.
  const questions = [...progress.openQuestions].sort((a, b) => Number(a.resolved) - Number(b.resolved))
  const openTotal = progress.openQuestions.filter((q) => !q.resolved).length

  function setResolved(id: string, resolved: boolean) {
    void updatePhaseState({
      projectId,
      phaseId: phase!.id,
      action: resolved ? 'resolve-question' : 'reopen-question',
      id,
    })
      .unwrap()
      .then(() =>
        notifications.show({
          color: resolved ? 'teal' : 'gray',
          title: resolved ? 'Question resolved' : 'Question reopened',
          message: resolved ? 'Marked as resolved.' : 'Moved back to open.',
        }),
      )
      .catch(() =>
        notifications.show({ color: 'red', title: 'Something went wrong', message: 'Please try again.' }),
      )
  }

  return (
    <Stack gap="lg">
      <Box>
        <Text size="xs" c="dimmed" ff="monospace" tt="uppercase" mb={4}>
          Strategy › {phase.name} › Open Questions
        </Text>
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
          <Title order={2} size="h2">
            Open Questions
          </Title>
        </Group>
        <Text size="sm" c="dimmed" mt={6} maw={760}>
          {openTotal > 0
            ? `${openTotal} question${openTotal > 1 ? 's' : ''} still need a decision before this phase is sound.`
            : 'All flagged questions for this phase are resolved.'}
        </Text>
      </Box>

      {locked ? (
        <Text size="xs" c="dimmed">
          This phase is Done — set it to In Progress to resolve or reopen questions.
        </Text>
      ) : null}

      {questions.length === 0 ? (
        <EmptyState
          icon={IconHelpCircle}
          title="No open questions"
          description="Questions the AI flags while generating this phase's outputs will appear here for you to resolve."
        />
      ) : (
        <Stack gap="xs">
          {questions.map((q) => (
            <QuestionRow
              key={q.id}
              question={q.question}
              source={q.source}
              resolved={q.resolved}
              locked={locked}
              onResolve={() => setResolved(q.id, true)}
              onReopen={() => setResolved(q.id, false)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
