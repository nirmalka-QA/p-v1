import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, Group, Text, Select, Pagination, Loader, Center } from '@mantine/core'
import { EmptyState } from '@wispr/ui'
import { IconHistory } from '@tabler/icons-react'
import { DevMemoryPanel } from './DevMemoryPanel'
import { useGetDevMemoryQuery } from '../utility/services/implementationApi'
import { useGetStoriesQuery } from '../../features/utility/services/featuresApi'
import { visibleStories } from '../../features/utility/helpers/helpers'
import { isImplStory } from '../utility/helpers/stories'
import { PARAM_STORY } from '../utility/constants/params'

const PAGE_SIZE = 15

/**
 * The per-story Implementation log inside the Frontend/Backend workbench (a tab next to
 * Develop/Code/Preview). Scopes the development memory (decisions, migrations, summaries, deferred
 * and commit ids) to the selected story; the story selection is shared with Develop via ?story=.
 */
export function StoryLogPanel({ projectId }: { projectId: string }) {
  const { data: stories = [] } = useGetStoriesQuery(projectId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)

  const queue = visibleStories(stories).filter(isImplStory)
  const storyParam = searchParams.get(PARAM_STORY)
  const selected = (storyParam && queue.find((s) => s.id === storyParam)) || queue[0] || null

  const { data: items = [], isLoading } = useGetDevMemoryQuery(
    selected ? { projectId, storySlug: selected.id } : skipToken,
  )

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function selectStory(id: string | null) {
    if (!id) return
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_STORY, id)
    setSearchParams(next)
    setPage(1)
  }

  if (queue.length === 0) {
    return (
      <EmptyState
        icon={IconHistory}
        title="No stories yet"
        description="The implementation log records decisions, migrations, summaries and commits per story as you build."
      />
    )
  }

  return (
    <Box>
      <Group justify="space-between" align="flex-end" mb="md" wrap="wrap" gap="sm">
        <Text size="sm" c="dimmed">
          Decisions, migrations, summaries, deferred work and commits for this story.
        </Text>
        <Select
          w={280}
          size="sm"
          data={queue.map((s) => ({ value: s.id, label: `${s.id} · ${s.title}` }))}
          value={selected?.id ?? null}
          onChange={selectStory}
          allowDeselect={false}
        />
      </Group>

      {isLoading ? (
        <Center mih={140}>
          <Loader size="sm" />
        </Center>
      ) : (
        <>
          <DevMemoryPanel projectId={projectId} items={pageItems} />
          {pageCount > 1 && (
            <Group justify="space-between" mt="lg">
              <Text size="xs" c="dimmed">
                {items.length} entr{items.length === 1 ? 'y' : 'ies'}
              </Text>
              <Pagination total={pageCount} value={safePage} onChange={setPage} size="sm" />
            </Group>
          )}
        </>
      )}
    </Box>
  )
}
