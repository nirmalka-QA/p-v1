import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Box, Center, Loader } from '@mantine/core'
import { IconCompass } from '@tabler/icons-react'
import { EmptyState, AIAssistantPanel } from '@wispr/ui'
import { useStrategyProject } from '../../../app/StrategyProjectContext'
import { activePhaseIdFromPath } from '../../../features/phase/utility/helpers/helpers'
import { PhaseRail } from '../PhaseRail/PhaseRail'
import { Sidebar } from '../Sidebar/Sidebar'
import { StatusBar } from '../StatusBar/StatusBar'
import styles from './StrategyShell.module.css'

/**
 * The strategy workspace chrome below the host top bar: the configured phase rail, a
 * sidebar, the work area (routed phase pages), an AI assistant panel (toggleable), and a
 * status bar. Resolves the project once via StrategyProjectProvider and shows
 * loading / not-found states.
 */
export function StrategyShell() {
  const { isLoading, isError, project, phases } = useStrategyProject()
  const { pathname } = useLocation()
  const [assistantOpen, setAssistantOpen] = useState(false)

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    )
  }

  if (isError || !project) {
    return (
      <Center h="100%" p="xl">
        <EmptyState
          icon={IconCompass}
          title="Couldn't load this project"
          description="The strategy project couldn't be resolved. It may have been removed, or something went wrong."
        />
      </Center>
    )
  }

  const activePhaseId = activePhaseIdFromPath(pathname)
  const activePhase = phases.find((p) => p.id === activePhaseId)
  const bodyClass = assistantOpen ? styles.bodyWithAssistant : styles.body

  return (
    <Box className={styles.shell ?? ''}>
      {phases.length > 0 ? <PhaseRail /> : null}
      <Box className={bodyClass ?? ''}>
        <Box component="nav" className={styles.sidebarSlot ?? ''}>
          <Sidebar />
        </Box>
        <Box component="main" className={styles.workArea ?? ''}>
          <Box className={styles.page ?? ''}>
            <Outlet />
          </Box>
        </Box>
        {assistantOpen && (
          <Box component="aside" className={styles.assistantSlot ?? ''}>
            <AIAssistantPanel
              projectName={project.name}
              {...(activePhase ? { phaseLabel: activePhase.name } : {})}
            />
          </Box>
        )}
      </Box>
      <StatusBar
        assistantOpen={assistantOpen}
        assistantAvailable={true}
        onToggleAssistant={() => setAssistantOpen((o) => !o)}
      />
    </Box>
  )
}
