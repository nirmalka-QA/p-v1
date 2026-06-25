import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Text, UnstyledButton, Tooltip } from '@mantine/core'
import { useStrategyProject } from '../../../app/StrategyProjectContext'
import { activePhaseIdFromPath, progressOf } from '../../../features/phase/utility/helpers/helpers'
import styles from './PhaseRail.module.css'

function cx(...cls: (string | boolean | undefined)[]) {
  return cls.filter(Boolean).join(' ')
}

/**
 * The strategy phase rail — one segment per configured phase (from project.phaseIds).
 * Mirrors the prototype's `.phase-rail`/`.pstep`. Strategy phases are non-linear: every
 * phase is navigable (no lock); the active phase comes from the URL. The number line
 * reflects the manual phase status — done (✓), in progress (WIP) — plus NOW for the
 * active phase and REQ for mandatory phases.
 */
export function PhaseRail() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { phases, state, phasePath } = useStrategyProject()

  const activePhaseId = activePhaseIdFromPath(pathname)

  return (
    <Box className={styles.rail ?? ''}>
      {phases.map((phase, i) => {
        const isActive = phase.id === activePhaseId
        const status = progressOf(state, phase.id).status
        const isDone = status === 'done'
        const isWip = status === 'in-progress'
        const num = `0${i + 1}`.slice(-2)
        const tags = [
          isActive ? 'NOW' : '',
          isWip ? 'WIP' : '',
          phase.mandatory ? 'REQ' : '',
        ].filter(Boolean)
        const numLabel = [isDone ? `✓ ${num}` : num, ...tags].join(' · ')
        const meta = `${phase.inputs.length} inputs · ${phase.outputs.length} outputs`

        return (
          <Tooltip key={phase.id} label={phase.description} withArrow multiline w={240} openDelay={300}>
            <UnstyledButton
              className={cx(styles.step, isActive && styles.active, isWip && styles.wip, isDone && styles.done)}
              onClick={() => navigate(phasePath(phase.id))}
            >
              <Text className={styles.num ?? ''}>{numLabel}</Text>
              <Text className={styles.name ?? ''}>{phase.name}</Text>
              <Text className={styles.meta ?? ''}>{meta}</Text>
            </UnstyledButton>
          </Tooltip>
        )
      })}
    </Box>
  )
}
