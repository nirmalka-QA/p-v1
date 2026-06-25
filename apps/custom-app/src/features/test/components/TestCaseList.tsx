import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { notifications } from '@mantine/notifications'
import {
  Box,
  Group,
  Text,
  Button,
  Stack,
  Paper,
  TextInput,
  Select,
  Textarea,
  Collapse,
} from '@mantine/core'
import {
  IconPlus,
  IconSparkles,
  IconSearch,
  IconListSearch,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import { AIPlaceholder } from '@wispr/ui'
import { AIProgressSteps } from '../../../components/ui/AIProgressSteps'
import { EmptyState } from '@wispr/ui'
import { ConfirmModal } from '@wispr/ui'
import { TestCaseRow } from './TestCaseRow'
import { TestCaseFormModal } from './TestCaseFormModal'
import { TestSummaryBadges } from './TestSummaryBadges'
import {
  testApi,
  useStartGenerateTestsMutation,
  useLazyGetTestGenerationStatusQuery,
  useSetTestStatusMutation,
  useDeleteTestCaseMutation,
} from '../utility/services/testApi'
import { API_TAGS, LIST_ID } from '@wispr/contracts'
import { filterTestCases, summarize } from '../utility/helpers/helpers'
import type { TestFilters as Filters } from '../utility/helpers/helpers'
import { FILTER_ALL, TEST_TYPE_OPTIONS, TEST_STATUS_OPTIONS, TEST_GEN_STEPS } from '../utility/constants/constants'
import type { Story, TestCase, TestStatus, AnalysisStep, TestGenStep } from '../utility/models/model'
import styles from '../utility/styles/test.module.css'

interface TestCaseListProps {
  projectId: string
  story: Story
  /** All test cases for this story (already scoped by the page). */
  cases: TestCase[]
  /** Whether pass/fail results can be recorded — only once the story is implemented (ADR-0028). */
  canExecute: boolean
}

const NO_FILTERS: Filters = { type: FILTER_ALL, status: FILTER_ALL, search: '' }
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const TEST_TAG = { type: API_TAGS.TestCase, id: LIST_ID } as const

/** Maps the backend's progress steps onto the AIProgressSteps shape, deriving real elapsed seconds. */
function toAnalysisSteps(steps: TestGenStep[]): AnalysisStep[] {
  return steps.map((s) => {
    let estimatedSeconds: number | undefined
    if (s.startedAt && s.endedAt) {
      const ms = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
      if (ms >= 0) estimatedSeconds = Math.max(0.1, Math.round(ms / 100) / 10)
    }
    return { id: s.key, label: s.label, status: s.status, estimatedSeconds }
  })
}

export function TestCaseList({ projectId, story, cases, canExecute }: TestCaseListProps) {
  const dispatch = useDispatch()
  const [startGenerateTests] = useStartGenerateTestsMutation()
  const [fetchTestGenStatus] = useLazyGetTestGenerationStatusQuery()
  const [setTestStatus] = useSetTestStatusMutation()
  const [deleteTestCase, { isLoading: deleting }] = useDeleteTestCaseMutation()

  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [formCase, setFormCase] = useState<TestCase | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<TestCase | null>(null)
  const [context, setContext] = useState('')
  const [contextOpen, setContextOpen] = useState(false)
  const [steps, setSteps] = useState<AnalysisStep[]>([])
  const [generating, setGenerating] = useState(false)

  const summary = summarize(cases)
  const visible = filterTestCases(cases, filters, FILTER_ALL)

  async function runGenerate() {
    setGenerating(true)
    // Seed the fixed step list as pending; the backend then streams real per-step progress.
    setSteps(TEST_GEN_STEPS.map((s) => ({ ...s, status: 'pending' })))
    try {
      const note = context.trim() || undefined

      // Start the durable job, then poll real per-step progress from the backend (ADR-0028).
      const started = await startGenerateTests({ projectId, storyId: story.id, context: note }).unwrap()
      setSteps(toAnalysisSteps(started.steps))

      let status = started.status
      let jobId = started.jobId
      while (status === 'running') {
        await sleep(1200)
        const next = await fetchTestGenStatus({ projectId, jobId }).unwrap()
        setSteps(toAnalysisSteps(next.steps))
        status = next.status
        jobId = next.jobId
      }

      if (status === 'completed') {
        // The cases are persisted now — refetch the project-wide list.
        dispatch(testApi.util.invalidateTags([TEST_TAG]))
        setContext('')
        setContextOpen(false)
        notifications.show({
          color: 'teal',
          title: 'Test cases generated',
          message: `New test cases drafted for ${story.id}.`,
        })
      } else {
        notifications.show({ color: 'red', title: 'Generation failed', message: 'Please try again.' })
      }
    } catch {
      notifications.show({ color: 'red', title: 'Generation failed', message: 'Please try again.' })
    } finally {
      setGenerating(false)
      setSteps([])
    }
  }

  async function changeStatus(testCase: TestCase, status: TestStatus) {
    try {
      await setTestStatus({ projectId, testId: testCase.id, status }).unwrap()
    } catch {
      notifications.show({ color: 'red', title: 'Could not update status', message: 'Please try again.' })
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await deleteTestCase({ projectId, testId: confirmDelete.id }).unwrap()
      notifications.show({
        color: 'teal',
        title: 'Test case deleted',
        message: `${confirmDelete.id} has been removed.`,
      })
      setConfirmDelete(null)
    } catch {
      notifications.show({ color: 'red', title: 'Could not delete test case', message: 'Please try again.' })
    }
  }

  function openAdd() {
    setFormCase(null)
    setFormOpen(true)
  }
  function openEdit(testCase: TestCase) {
    setFormCase(testCase)
    setFormOpen(true)
  }

  const contextField = (
    <Collapse expanded={contextOpen}>
      <Textarea
        placeholder="Optional — describe specific edge cases or scenarios to cover, e.g. “session timeout mid-checkout”."
        autosize
        minRows={2}
        value={context}
        onChange={(e) => setContext(e.currentTarget.value)}
        mb="sm"
      />
    </Collapse>
  )

  const formModal = (
    <TestCaseFormModal
      opened={formOpen}
      onClose={() => setFormOpen(false)}
      projectId={projectId}
      storyId={story.id}
      testCase={formCase}
      canExecute={canExecute}
    />
  )

  // ── Generation in progress ──
  if (generating) {
    return (
      <Paper withBorder radius="md" p="lg" maw={560}>
        <Text fw={600} mb={4}>
          Generating test cases…
        </Text>
        <Text size="sm" c="dimmed" mb="lg">
          Using the story, acceptance criteria, and your Knowledge Base.
        </Text>
        <AIProgressSteps steps={steps} />
      </Paper>
    )
  }

  // ── No test cases yet → AI generation is the primary action ──
  if (cases.length === 0) {
    return (
      <>
        <Group justify="flex-end" mb="sm">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={contextOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            onClick={() => setContextOpen((v) => !v)}
          >
            Add context
          </Button>
        </Group>
        {contextField}
        <AIPlaceholder
          action="Generate Test Cases"
          description={`Draft a happy-path test plus basic negative and edge cases for “${story.title}” using its acceptance criteria and your Knowledge Base.`}
          onTrigger={runGenerate}
        />
        <Group justify="center" mt="md">
          <Button variant="default" leftSection={<IconPlus size={14} />} onClick={openAdd}>
            Add a test case manually
          </Button>
        </Group>
        {formModal}
      </>
    )
  }

  return (
    <Box>
      <Paper withBorder radius="md" p="sm" mb="md" bg="var(--cl-bg-elev)">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Text size="sm" fw={500}>
            {summary.total} test case{summary.total === 1 ? '' : 's'}
          </Text>
          <TestSummaryBadges summary={summary} />
        </Group>
      </Paper>

      <Box className={styles.toolbar}>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Group gap="sm" wrap="wrap">
            <TextInput
              placeholder="Search by title…"
              leftSection={<IconSearch size={14} />}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.currentTarget.value }))}
              w={220}
            />
            <Select
              data={[{ value: FILTER_ALL, label: 'All types' }, ...TEST_TYPE_OPTIONS]}
              value={filters.type}
              onChange={(v) => setFilters((f) => ({ ...f, type: v ?? FILTER_ALL }))}
              allowDeselect={false}
              w={150}
            />
            <Select
              data={[{ value: FILTER_ALL, label: 'All statuses' }, ...TEST_STATUS_OPTIONS]}
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v ?? FILTER_ALL }))}
              allowDeselect={false}
              w={150}
            />
          </Group>
          <Group gap="sm">
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={contextOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              onClick={() => setContextOpen((v) => !v)}
            >
              Add context
            </Button>
            <Button
              variant="light"
              color="violet"
              leftSection={<IconSparkles size={15} />}
              onClick={runGenerate}
            >
              Generate more
            </Button>
            <Button variant="accent" leftSection={<IconPlus size={14} />} onClick={openAdd}>
              Add test case
            </Button>
          </Group>
        </Group>
        <Box mt="sm">{contextField}</Box>
      </Box>

      {visible.length > 0 ? (
        <Stack gap="sm">
          {visible.map((testCase) => (
            <TestCaseRow
              key={testCase.id}
              testCase={testCase}
              canExecute={canExecute}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
              onSetStatus={changeStatus}
            />
          ))}
        </Stack>
      ) : (
        <EmptyState
          icon={IconListSearch}
          title="No test cases match these filters"
          description="Adjust or clear the type, status, or search filters to see more test cases."
          action={{ label: 'Clear filters', onClick: () => setFilters(NO_FILTERS) }}
        />
      )}

      {formModal}
      <ConfirmModal
        opened={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete test case"
        message={`Delete “${confirmDelete?.title}” (${confirmDelete?.id})? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        loading={deleting}
      />
    </Box>
  )
}
