import { useLocation } from 'react-router-dom'
import { Box, Text, UnstyledButton } from '@mantine/core'
import { useStrategyProject } from '../../../app/StrategyProjectContext'
import { activePhaseIdFromPath, completedCount, progressOf, statusMeta } from '../../../features/phase/utility/helpers/helpers'
import styles from './StatusBar.module.css'

interface StatusBarProps {
  assistantOpen: boolean
  assistantAvailable: boolean
  onToggleAssistant: () => void
}

/**
 * Bottom status strip — connection, project, active phase + its status, phase
 * progress, and the AI assistant toggle button.
 */
export function StatusBar({ assistantOpen, assistantAvailable, onToggleAssistant }: StatusBarProps) {
  const { pathname } = useLocation()
  const { project, strategyName, phases, state } = useStrategyProject()
  const activePhaseId = activePhaseIdFromPath(pathname)
  const activeIndex = phases.findIndex((p) => p.id === activePhaseId)
  const activePhase = activeIndex >= 0 ? phases[activeIndex] : undefined
  const activeStatus = activePhase ? statusMeta(progressOf(state, activePhase.id).status).label : undefined
  const done = completedCount(phases, state)

  return (
    <Box className={styles.bar ?? ''}>
      <Text span className={styles.live ?? ''}>
        Connected
      </Text>
      <Text span className={styles.sep ?? ''}>
        │
      </Text>
      <Text span>{project?.name ?? 'Strategy project'}</Text>
      {strategyName ? (
        <>
          <Text span className={styles.sep ?? ''}>
            │
          </Text>
          <Text span>{strategyName}</Text>
        </>
      ) : null}
      {activePhase ? (
        <>
          <Text span className={styles.sep ?? ''}>
            │
          </Text>
          <Text span>
            {activePhase.name} · {activeStatus}
          </Text>
        </>
      ) : null}

      <Box className={styles.right ?? ''}>
        {phases.length > 0 ? (
          <Text span>
            {done} of {phases.length} phases done
          </Text>
        ) : null}
        <Text span className={styles.sep ?? ''}>
          │
        </Text>
        <Text span>WISPR v2</Text>

        {assistantAvailable && (
          <>
            <Text span className={styles.sep ?? ''}>
              │
            </Text>
            <UnstyledButton
              className={`${styles.assistantBtn ?? ''} ${assistantOpen ? (styles.assistantBtnActive ?? '') : ''}`}
              onClick={onToggleAssistant}
              title={assistantOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
            >
              <Text span className={styles.assistantIcon ?? ''}>
                ✦
              </Text>
              Assistant
            </UnstyledButton>
          </>
        )}
      </Box>
    </Box>
  )
}
