import { useNavigate } from 'react-router-dom'
import { Box, Text, UnstyledButton, Tooltip } from '@mantine/core'
import { PHASE_META_LABEL } from '../../constants/phases'
import { usePhaseSteps } from '../../hooks/usePhaseSteps'
import styles from './PhaseRail.module.css'

function cx(...cls: (string | boolean | undefined | null)[]) {
  return cls.filter(Boolean).join(' ')
}

/**
 * The five-segment SDLC phase rail — equal-width steps split by hairlines, with
 * the active step carrying a bottom accent bar. Visual styling mirrors the
 * prototype's `.phase-rail`; the per-step status (active / done / available /
 * locked), the gate tooltips, and the change-impact alert dot are WISPR's real
 * behaviour layered on top.
 */
export function PhaseRail() {
  const navigate = useNavigate()
  const { steps } = usePhaseSteps()

  return (
    <Box className={styles.rail}>
      {steps.map((step, i) => {
        const isActive = step.status === 'active'
        const isDone = step.status === 'done'
        const isLocked = step.status === 'locked'

        const num = `0${i + 1}`
        const numLabel = isDone ? `✓ ${num}` : isActive ? `${num} · NOW` : num

        // Hover reveals the phase's purpose; locked steps explain the gate.
        const tip = isLocked ? 'Complete the previous phase to unlock' : step.description

        return (
          <Tooltip
            key={step.id}
            label={tip}
            withArrow
            multiline
            w={240}
            openDelay={isLocked ? 0 : 300}
          >
            <UnstyledButton
              className={cx(
                styles.step,
                isActive && styles.active,
                isDone && styles.done,
                isLocked && styles.locked,
              )}
              onClick={() => !isLocked && step.route && navigate(step.route)}
            >
              <Text className={styles.num}>{numLabel}</Text>
              <Text className={styles.name}>{step.label}</Text>
              <Text className={styles.meta}>{PHASE_META_LABEL[step.id]}</Text>
              {step.alert && (
                <Box
                  className={cx(
                    styles.alertDot,
                    step.alert.critical ? styles.alertDotCritical : styles.alertDotWarning,
                  )}
                  title={`${step.alert.total} item(s) need review`}
                >
                  {step.alert.total}
                </Box>
              )}
            </UnstyledButton>
          </Tooltip>
        )
      })}
    </Box>
  )
}
