import { useNavigate, useMatch } from 'react-router-dom'
import { Box, UnstyledButton } from '@mantine/core'
import { useAppSelector } from '@wispr/store'
import { ROUTES } from '@wispr/contracts'
import { useCurrentProject } from '@wispr/projects'
import { TopBarNav } from './TopBarNav'
import { TopBarActions } from './TopBarActions'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { WorkspaceHomeNav } from './WorkspaceHomeNav'
import { ProjectNav } from './ProjectNav'
import styles from './TopBar.module.css'

/**
 * The global top bar — host-owned end to end — is context-aware. The left/centre
 * cluster changes by context; the right cluster (`TopBarActions` — help, support,
 * theme, profile) is shared and renders in every context:
 * - Inside a project (`/projects/:id/*`): the project dropdown (`ProjectNav`),
 *   which bundles every cross-cutting project action. The remote owns the chrome
 *   BELOW the bar.
 * - Everywhere else (workspace list, global dashboard, workspace home): the
 *   Dashboard ⁄ Workspaces nav, or the workspace switcher + tabs.
 *
 * The brand goes home: to the current project's workspace when inside a project,
 * otherwise to the workspace list.
 */
export function TopBar() {
  const navigate = useNavigate()

  const { project: currentProject } = useCurrentProject()
  // Workspace-home context (/workspaces/:workspaceId) — distinct from the list and
  // dashboard. TopBar sits above the routed Outlet, so read the id via useMatch.
  const wsHomeMatch = useMatch('/workspaces/:workspaceId')
  const workspaceHomeId = wsHomeMatch?.params.workspaceId ?? null

  function goHome() {
    navigate(
      currentProject?.workspaceId ? ROUTES.workspace(currentProject.workspaceId) : ROUTES.workspaces,
    )
  }

  return (
    <>
      {/* Brand — home (workspace list, or the current project's workspace) */}
      <UnstyledButton
        className={`${styles.brand ?? ''} ${currentProject ? styles.brandSep ?? '' : ''}`}
        onClick={goHome}
      >
        <Box className={styles.brandMark ?? ''} />
        WISPR
      </UnstyledButton>

      {currentProject ? (
        // ── Project context: the project dropdown bundles project actions. ──
        <ProjectNav
          projectId={currentProject.id}
          projectName={currentProject.name}
          workspaceId={currentProject.workspaceId ?? null}
        />
      ) : workspaceHomeId ? (
        // ── Workspace home (/workspaces/:id): switcher + tab nav. ──
        <>
          <WorkspaceSwitcher workspaceId={workspaceHomeId} />
          <WorkspaceHomeNav workspaceId={workspaceHomeId} />
        </>
      ) : (
        // ── Workspace list / global dashboard: segmented nav. ──
        <TopBarNav />
      )}

      <Box className={styles.spacer ?? ''} />
      <TopBarActions />
    </>
  )
}
