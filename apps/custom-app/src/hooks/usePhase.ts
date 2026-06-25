import { useMatch } from 'react-router-dom'
import type { Phase } from '../types'
import { PHASE_ORDER } from '../constants/phases'
import { useProject } from '@wispr/projects'

export type PhaseStatus = 'done' | 'active' | 'available' | 'locked'

export interface PhaseState {
  id: Phase
  status: PhaseStatus
}

export function usePhase() {
  const { currentProject } = useProject()

  const discoveryMatch = useMatch('/projects/:id/discovery')
  const planningMatch = useMatch('/projects/:id/planning')
  const featuresMatch = useMatch('/projects/:id/features')
  const implementationMatch = useMatch('/projects/:id/implementation')
  const testMatch = useMatch('/projects/:id/test')

  const activePhase: Phase | null =
    (discoveryMatch && 'discovery') ||
    (planningMatch && 'planning') ||
    (featuresMatch && 'features') ||
    (implementationMatch && 'implementation') ||
    (testMatch && 'test') ||
    null

  function getPhaseStatus(phase: Phase): PhaseStatus {
    if (!currentProject) return 'available'

    const currentIdx = PHASE_ORDER.indexOf(currentProject.currentPhase as Phase)
    const phaseIdx = PHASE_ORDER.indexOf(phase)

    if (phase === activePhase) return 'active'
    if (phaseIdx < currentIdx) return 'done'
    if (phaseIdx === currentIdx) return 'active'
    return 'available'
  }

  const phaseStates: PhaseState[] = PHASE_ORDER.map((phase) => ({
    id: phase,
    status: getPhaseStatus(phase),
  }))

  return { activePhase, phaseStates }
}
