import { UnstyledButton, Tooltip, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconMoon, IconSun, IconHelp, IconLifebuoy } from '@tabler/icons-react'
import { appEventBus, APP_EVENTS } from '@wispr/services'
import { useAppDispatch, useAppSelector, setColorScheme } from '@wispr/store'
import { ProfileMenu } from './ProfileMenu'
import styles from './TopBar.module.css'

/**
 * The shared right-side cluster of the top bar — help, support, theme toggle and
 * profile + sign out. Host-owned and context-independent: it renders the same in
 * every context (project and workspace), so it lives in one self-contained unit
 * rather than being duplicated per branch in `TopBar`.
 */
export function TopBarActions() {
  const dispatch = useAppDispatch()
  const { colorScheme, setColorScheme: setMantineScheme } = useMantineColorScheme()
  const user = useAppSelector((s) => s.session.user)

  function toggleTheme() {
    const next = colorScheme === 'dark' ? 'light' : 'dark'
    setMantineScheme(next)
    dispatch(setColorScheme(next))
  }

  function handleLogout() {
    // Logout is host-owned: emit on the shared event bus and the host tears the
    // session down (clears the in-memory token + session slice, ends the OIDC session).
    appEventBus.emit(APP_EVENTS.authLogout)
  }

  return (
    <>
      <Tooltip label="Help">
        <UnstyledButton
          className={styles.ticon ?? ''}
          aria-label="Help"
          onClick={() =>
            notifications.show({ title: 'Help', message: 'The help center is coming soon.' })
          }
        >
          <IconHelp size={15} />
        </UnstyledButton>
      </Tooltip>

      <Tooltip label="Support">
        <UnstyledButton
          className={styles.ticon ?? ''}
          aria-label="Support"
          onClick={() =>
            notifications.show({ title: 'Support', message: 'Reach us at support@wispr.app.' })
          }
        >
          <IconLifebuoy size={15} />
        </UnstyledButton>
      </Tooltip>

      <Tooltip label="Toggle theme">
        <UnstyledButton className={styles.tbtn ?? ''} aria-label="Toggle theme" onClick={toggleTheme}>
          {colorScheme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
        </UnstyledButton>
      </Tooltip>

      {user && <ProfileMenu user={user} onLogout={handleLogout} />}
    </>
  )
}
