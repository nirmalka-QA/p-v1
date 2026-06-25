import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Group, Stack, Title, Text, Button, Skeleton, Modal, TextInput } from '@mantine/core'
import { IconPlus, IconSearch, IconLayoutGrid, IconAlertTriangle } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { ROUTES } from '@wispr/contracts'
import { useAppDispatch, setWorkspaces } from '@wispr/store'
import { useGetWorkspacesQuery } from './utility/services/services'
import { WorkspaceTable } from './components/WorkspaceTable/WorkspaceTable'
import { WorkspaceCreateForm } from './components/WorkspaceCreateForm/WorkspaceCreateForm'

/**
 * The workspace list — the app's landing surface (`/workspaces`). Shows every
 * workspace the user can access; create opens a drawer. On load the workspace
 * refs are pushed into the store so the (Phase 2) switcher and ProjectHost can
 * resolve names without refetching.
 */
export function WorkspaceListPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isFetching, isError, refetch } = useGetWorkspacesQuery()
  const workspaces = data?.workspaces ?? []

  // Keep the store's workspace refs in sync with the loaded list.
  useEffect(() => {
    if (data?.workspaces) {
      dispatch(setWorkspaces(data.workspaces.map((w) => ({ id: w.id, name: w.name }))))
    }
  }, [data, dispatch])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? workspaces.filter(
        (w) => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q),
      )
    : workspaces

  const showList = !isFetching && !isError && filtered.length > 0
  const showNoMatch = !isFetching && !isError && workspaces.length > 0 && filtered.length === 0
  const showEmpty = !isFetching && !isError && workspaces.length === 0

  return (
    <Box maw={1080} mx="auto" w="100%" px={28} pt={44} pb={80}>
      <Stack gap={4} mb="lg">
        <Title order={2} size="h2">
          Workspaces
        </Title>
        <Text size="sm" c="dimmed">
          A workspace groups related projects and shares context, instructions, and a common
          artifact library.
        </Text>
      </Stack>

      <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
        <TextInput
          flex={1}
          maw={440}
          placeholder="Search workspaces…"
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Button
          leftSection={<IconPlus size={14} />}
          variant="accent"
          onClick={() => setCreateOpen(true)}
        >
          New workspace
        </Button>
      </Group>

      {isFetching && (
        <Stack gap="xs">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={56} radius="md" />
          ))}
        </Stack>
      )}

      {!isFetching && isError && (
        <EmptyState
          icon={IconAlertTriangle}
          title="Couldn't load workspaces"
          description="Something went wrong while fetching your workspaces. Please try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      )}

      {showEmpty && (
        <EmptyState
          icon={IconLayoutGrid}
          title="No workspaces yet"
          description="Create your first workspace to group related projects and share context across them."
          action={{ label: 'New workspace', onClick: () => setCreateOpen(true) }}
        />
      )}

      {showNoMatch && (
        <EmptyState
          icon={IconSearch}
          title="No workspaces found"
          description="Try a different search term."
        />
      )}

      {showList && (
        <WorkspaceTable workspaces={filtered} onOpen={(id) => navigate(ROUTES.workspace(id))} />
      )}

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        size={560}
        radius="lg"
        title={
          <Box>
            <Text fw={600} fz={16}>
              Create a workspace
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              A workspace groups related projects and shares context, instructions, and an artifact
              library.
            </Text>
          </Box>
        }
      >
        <WorkspaceCreateForm onCancel={() => setCreateOpen(false)} />
      </Modal>
    </Box>
  )
}
