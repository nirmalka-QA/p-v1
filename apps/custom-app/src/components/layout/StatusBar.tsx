import { useState } from 'react'
import { Box, Text, UnstyledButton } from '@mantine/core'
import { PHASE_LABEL } from '../../constants/phases'
import { useCurrentProject } from '@wispr/projects'
import { usePhaseSteps } from '../../hooks/usePhaseSteps'
import { useImpactAlerts } from '../../features/impact/utility/hooks/useImpactAlerts'
import { ReviewCenterDrawer } from '../../features/impact/components/ReviewCenterDrawer'
import styles from './StatusBar.module.css'

interface StatusBarProps {
  assistantOpen: boolean
  assistantAvailable: boolean
  onToggleAssistant: () => void
}

export function StatusBar({ assistantOpen, assistantAvailable, onToggleAssistant }: StatusBarProps) {
  const { project: currentProject } = useCurrentProject()
  // The phase being VIEWED (from the URL) — the project record's currentPhase
  // is a server-side default and goes stale as the user moves between phases.
  const { activeId } = usePhaseSteps()

  // Cross-phase change-impact lives with the remote (it's project-type-specific,
  // not global chrome), so the review trigger sits in the status bar — not the
  // host top bar.
  const projectId = currentProject?.id
  const { openCount, hasCritical } = useImpactAlerts(projectId)
  const [reviewOpen, setReviewOpen] = useState(false)

  const attentionClass = hasCritical
    ? styles.attentionBtnCritical
    : openCount > 0
      ? styles.attentionBtnAlert
      : ''

  return (
    <Box className={styles.bar}>
      <Text span className={styles.live}>
        Connected
      </Text>
      <Text span className={styles.sep}>
        │
      </Text>
      <Text span>{currentProject?.name ?? 'No project selected'}</Text>
      {currentProject && activeId && (
        <>
          <Text span className={styles.sep}>
            │
          </Text>
          <Text span>{PHASE_LABEL[activeId]}</Text>
        </>
      )}

      <Box className={styles.right}>
        {currentProject && (
          <>
            <UnstyledButton
              className={`${styles.attentionBtn} ${attentionClass}`}
              onClick={() => setReviewOpen(true)}
              title={openCount > 0 ? `${openCount} item(s) need review` : 'No changes need review'}
            >
              ⚑ Attention{openCount > 0 ? ` · ${openCount}` : ''}
            </UnstyledButton>
            <Text span className={styles.sep}>
              │
            </Text>
          </>
        )}
        <Text span>WISPR v2</Text>
        <Text span className={styles.sep}>
          │
        </Text>
        <Text span>⌘K commands</Text>

        {assistantAvailable && (
          <>
            <Text span className={styles.sep}>
              │
            </Text>
            <UnstyledButton
              className={`${styles.assistantBtn} ${assistantOpen ? styles.assistantBtnActive : ''}`}
              onClick={onToggleAssistant}
              title={assistantOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
            >
              <Text span className={styles.assistantIcon}>
                ✦
              </Text>
              Assistant
            </UnstyledButton>
          </>
        )}
      </Box>

      <ReviewCenterDrawer
        projectId={projectId}
        opened={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </Box>
  )
}
