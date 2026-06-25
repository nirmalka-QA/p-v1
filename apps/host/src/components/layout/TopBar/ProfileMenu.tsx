import { useNavigate } from 'react-router-dom'
import { Menu, Avatar, Box, Text } from '@mantine/core'
import { ROUTES } from '@wispr/contracts'
import type { User, Role } from '@wispr/contracts'
import { useGetProfileQuery } from '../../../features/profile/utility/services/services'
import styles from './TopBar.module.css'

interface ProfileMenuProps {
  user: User
  onLogout: () => void
}

const ROLE_LABEL: Record<Role, string> = {
  platformAdmin: 'Platform Admin',
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

/** Two-letter initials for the avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase()
}

/** The profile avatar + dropdown (name, platform role, profile, sign out) — the
 *  prototype's `.profile-dd`. Shared across every top-bar context. */
export function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
  const navigate = useNavigate()
  const { data: profile } = useGetProfileQuery()
  const avatarSrc = profile?.avatarUrl ?? null
  const role = user.roles.includes('platformAdmin') ? 'platformAdmin' : user.roles[0]
  const roleLabel = role ? ROLE_LABEL[role] : 'Member'

  return (
    <Menu
      width={215}
      position="bottom-end"
      withinPortal
      shadow="md"
      classNames={{ dropdown: styles.profileMenu ?? '' }}
    >
      <Menu.Target>
        <Avatar
          src={avatarSrc}
          color="indigo"
          variant="filled"
          radius="xl"
          size={30}
          title={user.name}
          className={styles.profileTrigger ?? ''}
        >
          {initials(user.name)}
        </Avatar>
      </Menu.Target>
      <Menu.Dropdown>
        <Box className={styles.pmHead ?? ''}>
          <Avatar src={avatarSrc} color="indigo" variant="filled" radius="xl" size={32}>
            {initials(user.name)}
          </Avatar>
          <Box>
            <Text className={styles.pmName ?? ''} truncate>
              {user.name}
            </Text>
            <Text className={styles.pmRole ?? ''}>{roleLabel}</Text>
          </Box>
        </Box>
        <Menu.Item className={styles.pmItem ?? ''} onClick={() => navigate(ROUTES.profile)}>
          My profile
        </Menu.Item>
        <Menu.Item className={styles.pmItem ?? ''} onClick={onLogout}>
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
