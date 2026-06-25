import { Outlet } from 'react-router-dom'
import { Box } from '@mantine/core'
import { ProjectSettingsModal } from '@wispr/projects'
import { TopBar } from './TopBar/TopBar'
import styles from './HostLayout.module.css'

/**
 * The host chrome around every page: the global top bar (brand, project
 * switcher, notifications, theme, profile) sits above a single fill-remaining
 * region. Host pages (project list) and the mounted remote both render into
 * <Outlet /> and own their scroll inside it.
 */
export function HostLayout() {
  return (
    <Box className={styles.shell ?? ''}>
      <Box component="header" className={styles.topBar ?? ''}>
        <TopBar />
      </Box>
      <Box component="main" className={styles.main ?? ''}>
        <Outlet />
      </Box>
      {/* Project Settings modal — host-level chrome driven by ?settings=… so it
          works for every project type/remote (custom-app, strategy, …). */}
      <ProjectSettingsModal />
    </Box>
  )
}
