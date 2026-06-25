import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, TextInput, NavLink, Text, Stack } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { useGetPlanQuery } from '../../planning/utility/services/planningApi'
import { useGetStoriesQuery } from '../../features/utility/services/featuresApi'
import { sortByOrder, visibleFeatures } from '../../planning/utility/helpers/helpers'
import { visibleStories } from '../../features/utility/helpers/helpers'
import { isImplStory } from '../../implementation/utility/helpers/stories'
import { useGetTestCasesQuery } from '../utility/services/testApi'
import { groupStoriesByFeature, summarize } from '../utility/helpers/helpers'
import { TestSummaryBadges } from './TestSummaryBadges'
import { PARAM_STORY } from '../utility/constants/params'
import nav from '../../../components/layout/SidebarNav.module.css'

/**
 * Test sidebar: implemented stories grouped by their feature, each with a
 * pass / fail / pending rollup. Selecting a story loads its test cases in the
 * main panel via the shared `story` URL param (mirrors Features).
 */
export function TestNav() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: plan } = useGetPlanQuery(projectId ?? skipToken)
  const { data: stories = [] } = useGetStoriesQuery(projectId ?? skipToken)
  const { data: testCases = [] } = useGetTestCasesQuery(projectId ?? skipToken)
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  if (!plan || !projectId) return null

  // Group by every visible feature (not just approved) so the sidebar shows the same testable set
  // the header counts — a ready story under a not-yet-approved feature must still appear.
  const features = sortByOrder(visibleFeatures(plan.features))
  const testable = visibleStories(stories).filter(isImplStory)

  const q = query.trim().toLowerCase()
  const matching = q
    ? testable.filter((s) => s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    : testable

  const groups = groupStoriesByFeature(matching, features)
  const selected = searchParams.get(PARAM_STORY) ?? testable[0]?.id

  function selectStory(id: string) {
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_STORY, id)
    setSearchParams(next)
  }

  return (
    <Box p="sm">
      <Text size="xs" ff="monospace" tt="uppercase" fw={600} c="dimmed" px="xs" mb="xs">
        Stories to test
      </Text>

      <TextInput
        size="xs"
        placeholder="Search stories…"
        leftSection={<IconSearch size={13} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="xs"
      />

      <Stack gap="lg">
        {groups.map((group) => (
          <Box key={group.feature?.id ?? 'ungrouped'}>
            <Text size="xs" fw={600} c="dimmed" px="xs" mb={4} truncate>
              {group.feature ? `${group.feature.id} · ${group.feature.title}` : 'Other stories'}
            </Text>
            {group.stories.map((story) => {
              const summary = summarize(testCases.filter((t) => t.storyId === story.id))
              return (
                <NavLink
                  key={story.id}
                  active={story.id === selected}
                  color="gray"
                  classNames={{ root: `${nav.navRoot} ${nav.navRootStacked}`, label: nav.navLabel }}
                  label={story.title}
                  description={
                    <Text span size="xs" c="dimmed" ff="monospace">
                      {story.id}
                    </Text>
                  }
                  onClick={() => selectStory(story.id)}
                  rightSection={<TestSummaryBadges summary={summary} compact />}
                />
              )
            })}
          </Box>
        ))}
      </Stack>

      {groups.length === 0 && (
        <Text size="xs" c="dimmed" ta="center" mt="md">
          {q ? `No stories match “${query}”.` : 'No stories ready to test yet.'}
        </Text>
      )}
    </Box>
  )
}
