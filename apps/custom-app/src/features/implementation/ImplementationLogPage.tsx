import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, Group, Text, Pagination, Loader, Center } from '@mantine/core'
import { PageHeader } from '@wispr/ui'
import { DevMemoryPanel } from './components/DevMemoryPanel'
import { useGetDevMemoryQuery } from './utility/services/implementationApi'

const PAGE_SIZE = 15

/**
 * Implementation › Implementation log (ADR-0027/0028). The PROJECT-WIDE development memory —
 * decisions, migrations, summaries, deferred work, and commit ids — across every story, paginated.
 * (Per-story logs live as a tab inside the Frontend/Backend workbench.) Lazy: loads on open.
 */
export function ImplementationLogPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: items = [], isLoading } = useGetDevMemoryQuery(projectId ? { projectId } : skipToken)
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (!projectId) return null

  return (
    <Box>
      <PageHeader
        title="Implementation log"
        description="Decisions, migrations, summaries, deferred work and commits across the project — carried forward into later stories."
      />

      {isLoading ? (
        <Center mih={160}>
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
