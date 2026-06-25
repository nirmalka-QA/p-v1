import { useNavigate } from 'react-router-dom'
import { Menu, Avatar, Box, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconCheck, IconLayoutGrid } from '@tabler/icons-react'
import { ROUTES } from '@wispr/contracts'
import { useGetWorkspacesQuery } from '../../../features/workspaces/utility/services/services'
import { workspaceColor, workspaceInitials } from '../../../features/workspaces/utility/helpers/helpers'
import styles from './TopBar.module.css'

interface WorkspaceSwitcherProps {
  workspaceId: string
}

/**
 * The workspace switcher in the workspace-home top bar (prototype `.ws-switch`):
 * the active workspace's logo + name with a dropdown to jump to any other
 * workspace or back to the full list. Reads the already-loaded workspace list
 * from the RTK cache (no extra fetch).
 */
export function WorkspaceSwitcher({ workspaceId }: WorkspaceSwitcherProps) {
  const navigate = useNavigate()
  const { data } = useGetWorkspacesQuery()
  const workspaces = data?.workspaces ?? []
  const active = workspaces.find((w) => w.id === workspaceId)
  const name = active?.name ?? 'Workspace'
  const seed = active?.colorSeed ?? workspaceColor(workspaceId)

  return (
    <Menu
      position="bottom-start"
      withinPortal
      shadow="md"
      classNames={{ dropdown: styles.wsSwitchMenu ?? '' }}
    >
      <Menu.Target>
        <UnstyledButton className={styles.wsSwitchTrig ?? ''}>
          <Avatar color={seed} variant="filled" radius={6} size={20} ff="monospace" fz={9} fw={700}>
            {workspaceInitials(name)}
          </Avatar>
          <Text span className={styles.wsSwitchName ?? ''}>
            {name}
          </Text>
          <IconChevronDown size={13} color="var(--cl-text-4)" />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Box className={styles.wsSwitchLabel ?? ''}>Workspaces</Box>
        {workspaces.map((w) => (
          <Menu.Item
            key={w.id}
            className={styles.wsSwitchItem ?? ''}
            onClick={() => navigate(ROUTES.workspace(w.id))}
            leftSection={
              <Avatar color={w.colorSeed} variant="filled" radius={6} size={22} ff="monospace" fz={9} fw={700}>
                {workspaceInitials(w.name)}
              </Avatar>
            }
            rightSection={
              w.id === workspaceId ? <IconCheck size={14} color="var(--mantine-color-teal-6)" /> : null
            }
          >
            <Text size="sm" truncate>
              {w.name}
            </Text>
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          className={styles.wsSwitchItem ?? ''}
          leftSection={<IconLayoutGrid size={16} />}
          onClick={() => navigate(ROUTES.workspaces)}
        >
          All workspaces
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
