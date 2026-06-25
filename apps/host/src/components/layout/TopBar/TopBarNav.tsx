import { useNavigate, useLocation } from 'react-router-dom'
import { Box, UnstyledButton } from '@mantine/core'
import { ROUTES } from '@wispr/contracts'
import { useAppSelector } from '@wispr/store'
import { isPlatformAdmin } from '../../../features/auth/utility/helpers/helpers'
import styles from './TopBar.module.css'

const DASHBOARD_VALUE = 'dashboard'
const WORKSPACES_VALUE = 'workspaces'
const ADMIN_VALUE = 'admin'

/**
 * The workspace-context primary nav (Dashboard ⁄ Workspaces ⁄ Settings) — the
 * prototype's `.top-nav` segmented control. Dashboard and Settings are platform-admin
 * surfaces; the active item is derived from the route (not internal state), so it
 * stays correct on deep-link and back/forward.
 */
export function TopBarNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((s) => s.session.user)
  const isAdmin = isPlatformAdmin(user)

  const active = location.pathname.startsWith(ROUTES.admin)
    ? ADMIN_VALUE
    : location.pathname.startsWith(ROUTES.globalDashboard)
      ? DASHBOARD_VALUE
      : WORKSPACES_VALUE

  return (
    <Box className={styles.topNav ?? ''}>
      {isAdmin && (
        <UnstyledButton
          className={`${styles.topNavItem ?? ''} ${active === DASHBOARD_VALUE ? styles.topNavItemActive ?? '' : ''}`}
          onClick={() => navigate(ROUTES.globalDashboard)}
        >
          Dashboard
        </UnstyledButton>
      )}
      <UnstyledButton
        className={`${styles.topNavItem ?? ''} ${active === WORKSPACES_VALUE ? styles.topNavItemActive ?? '' : ''}`}
        onClick={() => navigate(ROUTES.workspaces)}
      >
        Workspaces
      </UnstyledButton>
      {isAdmin && (
        <UnstyledButton
          className={`${styles.topNavItem ?? ''} ${active === ADMIN_VALUE ? styles.topNavItemActive ?? '' : ''}`}
          onClick={() => navigate(ROUTES.admin)}
        >
          Settings
        </UnstyledButton>
      )}
    </Box>
  )
}
