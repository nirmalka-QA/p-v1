import { useSearchParams } from 'react-router-dom'
import { Box, Text, UnstyledButton } from '@mantine/core'
import { skipToken } from '@reduxjs/toolkit/query'
import { SETTINGS_PARAM, SETTINGS_GENERAL } from '@wispr/contracts'
import { useGetProjectsQuery } from '@wispr/projects'
import { useGetWorkspaceQuery } from '../../../features/workspaces/utility/services/services'
import {
  WS_VIEW_PARAM,
  WS_VIEWS,
  WS_SETTINGS,
  toWsView,
} from '../../../features/workspaces/utility/constants/constants'
import type { WsView, WsSettingsTab } from '../../../features/workspaces/utility/constants/constants'
import styles from './TopBar.module.css'

interface WorkspaceHomeNavProps {
  workspaceId: string
}

/**
 * The workspace-home tab nav (prototype `.top-nav`): Dashboard · Projects · Members ·
 * Settings. Dashboard/Projects switch the main view via the `?view=` param; Members and
 * Settings open the settings modal via the shared `?settings=` param (Members deep-links
 * to its People tab — there is no standalone Members view). The active tab is derived
 * from the URL (deep-link + back/forward safe). Counts are live from cache.
 */
export function WorkspaceHomeNav({ workspaceId }: WorkspaceHomeNavProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: projectsData } = useGetProjectsQuery({ workspaceId, pageSize: 100 })
  const { data: workspace } = useGetWorkspaceQuery(workspaceId || skipToken)

  const projectCount = projectsData?.projects.length ?? 0
  const memberCount = workspace?.members.length ?? 0
  const view = toWsView(searchParams.get(WS_VIEW_PARAM))

  function goToView(next: WsView) {
    const params = new URLSearchParams(searchParams)
    if (next === WS_VIEWS.projects) params.delete(WS_VIEW_PARAM)
    else params.set(WS_VIEW_PARAM, next)
    params.delete(SETTINGS_PARAM)
    setSearchParams(params)
  }

  function openSettings(tab: WsSettingsTab = SETTINGS_GENERAL) {
    const params = new URLSearchParams(searchParams)
    params.set(SETTINGS_PARAM, tab)
    setSearchParams(params)
  }

  const itemClass = (active: boolean) =>
    `${styles.topNavItem ?? ''} ${active ? styles.topNavItemActive ?? '' : ''}`

  return (
    <Box className={styles.topNav ?? ''}>
      <UnstyledButton
        className={itemClass(view === WS_VIEWS.dashboard)}
        onClick={() => goToView(WS_VIEWS.dashboard)}
      >
        Dashboard
      </UnstyledButton>
      <UnstyledButton
        className={itemClass(view === WS_VIEWS.projects)}
        onClick={() => goToView(WS_VIEWS.projects)}
      >
        Projects
        <Text span className={styles.navCt ?? ''}>
          {projectCount}
        </Text>
      </UnstyledButton>
      <UnstyledButton
        className={styles.topNavItem ?? ''}
        onClick={() => openSettings(WS_SETTINGS.people)}
      >
        Members
        <Text span className={styles.navCt ?? ''}>
          {memberCount}
        </Text>
      </UnstyledButton>
      <UnstyledButton className={styles.topNavItem ?? ''} onClick={() => openSettings()}>
        Settings
      </UnstyledButton>
    </Box>
  )
}
