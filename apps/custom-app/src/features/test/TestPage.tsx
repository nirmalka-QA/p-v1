import { useParams, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, Title, Text, Group, Badge, Stack, Skeleton, Divider, Paper } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { TestEmpty } from './components/TestEmpty'
import { TestCaseList } from './components/TestCaseList'
import { TestSummaryBadges } from './components/TestSummaryBadges'
import { EmptyState } from '@wispr/ui'
import { PageHeader } from '@wispr/ui'
import { useGetStoriesQuery } from '../features/utility/services/featuresApi'
import { useGetPlanQuery } from '../planning/utility/services/planningApi'
import { useGetTestCasesQuery } from './utility/services/testApi'
import { visibleStories } from '../features/utility/helpers/helpers'
import { isImplStory } from '../implementation/utility/helpers/stories'
import { summarize } from './utility/helpers/helpers'
import { PARAM_STORY } from './utility/constants/params'

/** A story's code is implemented/deployed → test results (pass/fail) can be recorded (ADR-0028). */
const isImplemented = (status: string) => status === 'done' || status === 'closed'

export function TestPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams] = useSearchParams()

  const { data: stories = [], isLoading: storiesLoading } = useGetStoriesQuery(projectId ?? skipToken)
  const { data: plan, isLoading: planLoading } = useGetPlanQuery(projectId ?? skipToken)
  const {
    data: testCases = [],
    isLoading: casesLoading,
    isError,
    refetch,
  } = useGetTestCasesQuery(projectId ?? skipToken)

  if (!projectId) return null

  if (storiesLoading || planLoading || casesLoading) {
    return (
      <Stack gap="md" maw={720}>
        <Skeleton height={28} width={220} radius="sm" />
        <Skeleton height={140} radius="md" />
        <Skeleton height={140} radius="md" />
      </Stack>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Couldn't load test cases"
        description="Something went wrong fetching the test cases for this project."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }

  // Testable = stories ready for development onward (ready / in-progress / done). You can author test
  // cases as soon as a story is ready; results stay locked until it's implemented (ADR-0028).
  const testable = visibleStories(stories).filter(isImplStory)
  if (testable.length === 0) return <TestEmpty projectId={projectId} />

  const selectedId = searchParams.get(PARAM_STORY) ?? testable[0]?.id
  const selected = testable.find((s) => s.id === selectedId) ?? testable[0]
  const canExecute = isImplemented(selected.status)

  const featureById = new Map((plan?.features ?? []).map((f) => [f.id, f]))
  const feature = featureById.get(selected.featureId)
  const phaseSummary = summarize(testCases)
  const storyCases = testCases.filter((t) => t.storyId === selected.id)

  return (
    <Box>
      <PageHeader
        title="Test"
        meta={
          <Group gap="sm" wrap="wrap" align="center">
            <Badge color="teal" variant="light" radius="sm">
              {testable.length} stor{testable.length === 1 ? 'y' : 'ies'} to test
            </Badge>
            <Divider orientation="vertical" />
            <TestSummaryBadges summary={phaseSummary} />
          </Group>
        }
      />

      <Paper withBorder radius="md" p="lg" bg="var(--cl-bg-elev)">
        <Box mb="md">
          <Group gap="xs" mb={4}>
            <Text size="xs" ff="monospace" c="dimmed">
              {selected.id}
            </Text>
            {feature && (
              <Text size="xs" c="dimmed">
                · {feature.id} {feature.title}
              </Text>
            )}
          </Group>
          <Group gap="sm" align="center">
            <Title order={3} size="h3">
              {selected.title}
            </Title>
            {!canExecute && (
              <Badge color="gray" variant="light" radius="sm">
                Author tests · results locked until implemented
              </Badge>
            )}
          </Group>
        </Box>

        <Divider mb="md" />

        <TestCaseList projectId={projectId} story={selected} cases={storyCases} canExecute={canExecute} />
      </Paper>
    </Box>
  )
}
