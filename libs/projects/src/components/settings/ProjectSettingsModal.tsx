import { useSearchParams } from 'react-router-dom'
import { Modal, Box, Text, NavLink, CloseButton } from '@mantine/core'
import {
  IconSettings,
  IconInfoCircle,
  IconUsers,
  IconFileText,
  IconPlugConnected,
  IconRouter,
} from '@tabler/icons-react'
import { SETTINGS_PARAM, SETTINGS_GENERAL, SETTINGS_SECTIONS } from '@wispr/contracts'
import { useCurrentProject } from '../../useCurrentProject'
import { GeneralSettings } from './GeneralSettings'
import { IntegrationsSettings } from './IntegrationsSettings'
import styles from './projectSettings.module.css'

// Placeholder for sections not yet built (kept local so this shared modal has no
// dependency on @wispr/ui).
function ComingSoon({ children }: { children: string }) {
  return (
    <Text size="sm" c="dimmed" py="xl" ta="center">
      {children}
    </Text>
  )
}

const SECTIONS = [
  { id: SETTINGS_SECTIONS.general, label: 'General', icon: IconSettings },
  { id: SETTINGS_SECTIONS.details, label: 'Project Details', icon: IconInfoCircle },
  { id: SETTINGS_SECTIONS.members, label: 'Members', icon: IconUsers },
  { id: SETTINGS_SECTIONS.instructions, label: 'Instructions', icon: IconFileText },
  { id: SETTINGS_SECTIONS.integrations, label: 'Integrations', icon: IconPlugConnected },
  { id: SETTINGS_SECTIONS.connectors, label: 'Connectors', icon: IconRouter },
] as const

/**
 * Project Settings modal — host-level chrome driven by the `?settings=…` param
 * (the host top bar opens it via that param). Mounted once in the host shell so
 * it works for EVERY project type/remote (custom-app, strategy, …), not only the
 * remote that happens to render it.
 */
export function ProjectSettingsModal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { project } = useCurrentProject()

  const raw = searchParams.get(SETTINGS_PARAM)
  const opened = raw !== null && Boolean(project)
  const active = raw && SECTIONS.some((s) => s.id === raw) ? raw : SETTINGS_GENERAL

  function close() {
    const next = new URLSearchParams(searchParams)
    next.delete(SETTINGS_PARAM)
    setSearchParams(next, { replace: true })
  }

  function go(id: string) {
    const next = new URLSearchParams(searchParams)
    next.set(SETTINGS_PARAM, id)
    setSearchParams(next)
  }

  if (!project) return null

  const activeLabel = SECTIONS.find((s) => s.id === active)?.label

  return (
    <Modal opened={opened} onClose={close} size={960} padding={0} withCloseButton={false} radius="md">
      <Box className={styles.layout ?? ''}>
        {/* Left menu */}
        <Box className={styles.menu ?? ''}>
          <Text className={styles.menuTitle ?? ''}>Project Settings</Text>
          <Text className={styles.menuProject ?? ''} truncate>
            {project.name}
          </Text>
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <NavLink
                key={s.id}
                active={s.id === active}
                color="gray"
                classNames={{ root: styles.navRoot ?? '', label: styles.navLabel ?? '' }}
                label={s.label}
                leftSection={<Icon size={15} />}
                onClick={() => go(s.id)}
              />
            )
          })}
        </Box>

        {/* Right content */}
        <Box className={styles.panel ?? ''}>
          <Box className={styles.panelHead ?? ''}>
            <Text className={styles.panelTitle ?? ''}>{activeLabel}</Text>
            <CloseButton onClick={close} aria-label="Close settings" />
          </Box>

          {active === SETTINGS_SECTIONS.general && <GeneralSettings project={project} />}
          {active === SETTINGS_SECTIONS.integrations && <IntegrationsSettings />}
          {active === SETTINGS_SECTIONS.details && (
            <ComingSoon>Project details and metadata will be editable here.</ComingSoon>
          )}
          {active === SETTINGS_SECTIONS.members && (
            <ComingSoon>Project team and roles will be managed here.</ComingSoon>
          )}
          {active === SETTINGS_SECTIONS.instructions && (
            <ComingSoon>Project-level AI instructions will be configurable here.</ComingSoon>
          )}
          {active === SETTINGS_SECTIONS.connectors && (
            <ComingSoon>Data connectors for external sources will live here.</ComingSoon>
          )}
        </Box>
      </Box>
    </Modal>
  )
}
