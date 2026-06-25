import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, Avatar, Box, Text, UnstyledButton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconChevronLeft,
  IconChevronDown,
  IconBook2,
  IconUsers,
  IconInfoCircle,
  IconLayoutGrid,
  IconSettings,
  IconHelp,
  IconLifebuoy,
} from '@tabler/icons-react'
import {
  ROUTES,
  SETTINGS_PARAM,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from '@wispr/contracts'
import { projectColor, projectInitials } from '@wispr/projects'
import styles from './TopBar.module.css'

interface ProjectNavProps {
  projectId: string
  projectName: string
  workspaceId: string | null
}

// Static context-budget indicator — representative values until real token telemetry
// exists. TODO(team): wire to live context-budget usage once the metric is available.
const TOKEN_USED = '128K'
const TOKEN_TOTAL = '200K'
const TOKEN_USED_PCT = 64

/**
 * The project-context dropdown (prototype `.proj-dd`) — the single control the top bar
 * shows while a project is open. The trigger is the project's logo + name; the menu
 * bundles every cross-cutting project action: back to the workspace, a context-budget
 * readout, and the project surfaces (Knowledge Base, Members, Details, Connectors,
 * Settings) plus Help/Support. Remote-owned surfaces are reached only through the
 * shared `?settings=` bridge or a host route — never by touching the remote directly.
 */
export function ProjectNav({ projectId, projectName, workspaceId }: ProjectNavProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)

  function goToWorkspace() {
    navigate(workspaceId ? ROUTES.workspace(workspaceId) : ROUTES.workspaces)
  }

  function openKnowledgeBase() {
    navigate(ROUTES.discovery(projectId))
  }

  // Deep-link the remote's settings modal to a section via the shared param.
  function openSettings(section: SettingsSection) {
    const next = new URLSearchParams(searchParams)
    next.set(SETTINGS_PARAM, section)
    setSearchParams(next)
  }

  return (
    <Menu
      width={280}
      position="bottom-start"
      withinPortal
      shadow="md"
      opened={open}
      onChange={setOpen}
      classNames={{ dropdown: styles.projDdMenu ?? '', item: styles.pddRow ?? '', divider: styles.pddSep ?? '' }}
    >
      <Menu.Target>
        <UnstyledButton className={styles.projDdTrig ?? ''}>
          <Avatar
            className={styles.plogoSm ?? ''}
            color={projectColor(projectId)}
            variant="filled"
            radius={7}
            size={26}
          >
            {projectInitials(projectName)}
          </Avatar>
          <Text span className={styles.pddName ?? ''}>
            {projectName}
          </Text>
          <IconChevronDown
            size={11}
            className={`${styles.chevron ?? ''} ${open ? styles.chevronOpen ?? '' : ''}`}
          />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          className={styles.pddRowBack ?? ''}
          leftSection={<IconChevronLeft size={16} className={styles.pddIc ?? ''} />}
          onClick={goToWorkspace}
        >
          Go to workspace
        </Menu.Item>

        <Menu.Divider />

        <Box className={styles.pddToken ?? ''}>
          <Box className={styles.pddTokenTop ?? ''}>
            <Text span>Token usage</Text>
            <Text span className={styles.pddTokenVal ?? ''}>
              {TOKEN_USED} / {TOKEN_TOTAL}
            </Text>
          </Box>
          <Box className={styles.pddTokenBar ?? ''}>
            <Box className={styles.pddTokenFill ?? ''} w={`${TOKEN_USED_PCT}%`} />
          </Box>
          <Text className={styles.pddTokenSub ?? ''}>{TOKEN_USED_PCT}% of context budget used</Text>
        </Box>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconBook2 size={16} className={styles.pddIc ?? ''} />}
          onClick={openKnowledgeBase}
        >
          Knowledge Base
        </Menu.Item>
        <Menu.Item
          leftSection={<IconUsers size={16} className={styles.pddIc ?? ''} />}
          onClick={() => openSettings(SETTINGS_SECTIONS.members)}
        >
          Members
        </Menu.Item>
        <Menu.Item
          leftSection={<IconInfoCircle size={16} className={styles.pddIc ?? ''} />}
          onClick={() => openSettings(SETTINGS_SECTIONS.details)}
        >
          Project Details
        </Menu.Item>
        <Menu.Item
          leftSection={<IconLayoutGrid size={16} className={styles.pddIc ?? ''} />}
          onClick={() => openSettings(SETTINGS_SECTIONS.connectors)}
        >
          Connectors
        </Menu.Item>
        <Menu.Item
          leftSection={<IconSettings size={16} className={styles.pddIc ?? ''} />}
          onClick={() => openSettings(SETTINGS_SECTIONS.general)}
        >
          Settings
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconHelp size={16} className={styles.pddIc ?? ''} />}
          onClick={() => notifications.show({ title: 'Help', message: 'The help center is coming soon.' })}
        >
          Help
        </Menu.Item>
        <Menu.Item
          leftSection={<IconLifebuoy size={16} className={styles.pddIc ?? ''} />}
          onClick={() => notifications.show({ title: 'Support', message: 'Reach us at support@wispr.app.' })}
        >
          Support
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
