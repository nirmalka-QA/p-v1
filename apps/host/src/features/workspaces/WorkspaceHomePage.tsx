import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Stack, Group, Title, Text, Skeleton, UnstyledButton } from '@mantine/core'
import { IconChevronLeft, IconLayoutGrid } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { ROUTES, SETTINGS_PARAM } from '@wispr/contracts'
import { useActiveWorkspace } from './utility/hooks/useActiveWorkspace'
import {
  WS_VIEW_PARAM,
  WS_VIEWS,
  toWsView,
  toWsSettingsTab,
} from './utility/constants/constants'
import type { WsSettingsTab } from './utility/constants/constants'
import { WorkspaceProjectsView } from './components/WorkspaceProjectsView/WorkspaceProjectsView'
import { WorkspaceDashboardView } from './components/WorkspaceDashboardView/WorkspaceDashboardView'
import { WorkspaceSettingsModal } from './components/WorkspaceSettingsModal/WorkspaceSettingsModal'
import { ArtifactLibrary } from './components/ArtifactLibrary/ArtifactLibrary'
import styles from './WorkspaceHomePage.module.css'

/**
 * A single workspace's home (`/workspaces/:workspaceId`). Resolves the workspace,
 * marks it active (store + request-scoping, via useActiveWorkspace), and renders the
 * active view (Projects / Dashboard / Members, from `?view=`). The settings modal is
 * driven by the shared `?settings=` param — both set from the top-bar workspace nav.
 */
export function WorkspaceHomePage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { workspace, isFetching, isError } = useActiveWorkspace(workspaceId)

  const view = toWsView(searchParams.get(WS_VIEW_PARAM))
  const settingsTab = toWsSettingsTab(searchParams.get(SETTINGS_PARAM))

  function backToList() {
    navigate(ROUTES.workspaces)
  }

  function setSettingsTab(tab: WsSettingsTab) {
    const params = new URLSearchParams(searchParams)
    params.set(SETTINGS_PARAM, tab)
    setSearchParams(params)
  }

  function closeSettings() {
    const params = new URLSearchParams(searchParams)
    params.delete(SETTINGS_PARAM)
    setSearchParams(params)
  }

  return (
    <Box maw={1080} mx="auto" w="100%" px={28} pt={32} pb={80}>
      <UnstyledButton onClick={backToList} mb="md">
        <Group gap={4} c="dimmed">
          <IconChevronLeft size={14} />
          <Text size="sm">All workspaces</Text>
        </Group>
      </UnstyledButton>

      {isFetching && (
        <Stack gap="lg">
          <Stack gap={6}>
            <Skeleton height={28} width={260} radius="sm" />
            <Skeleton height={16} width={420} radius="sm" />
          </Stack>
          <Skeleton height={200} radius="md" />
        </Stack>
      )}

      {!isFetching && (isError || !workspace) && (
        <EmptyState
          icon={IconLayoutGrid}
          title="Workspace not found"
          description="This workspace may have been removed, or you don't have access to it."
          action={{ label: 'Back to workspaces', onClick: backToList }}
        />
      )}

      {!isFetching && workspace && (
        <Stack gap="xl">
          <Stack gap={4}>
            <Title order={2} size="h2">
              {workspace.name}
            </Title>
            {workspace.description ? (
              <Text size="sm" c="dimmed" maw={720}>
                {workspace.description}
              </Text>
            ) : null}
          </Stack>

          {view === WS_VIEWS.dashboard && <WorkspaceDashboardView workspace={workspace} />}
          {view === WS_VIEWS.projects && (
            <Box className={styles.cols ?? ''}>
              <WorkspaceProjectsView workspace={workspace} />
              <ArtifactLibrary workspace={workspace} />
            </Box>
          )}

          {settingsTab ? (
            <WorkspaceSettingsModal
              workspace={workspace}
              tab={settingsTab}
              onTabChange={setSettingsTab}
              onClose={closeSettings}
              onDeleted={backToList}
            />
          ) : null}
        </Stack>
      )}
    </Box>
  )
}
