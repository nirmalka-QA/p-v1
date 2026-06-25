import { useParams, useLocation } from 'react-router-dom'
import { PHASES, PHASE_ORDER, PHASE_DESCRIPTION } from '../constants/phases'
import { ROUTES } from '@wispr/contracts'
import { useCurrentProject } from '@wispr/projects'
import { useImpactCountsByPhase } from '../features/impact/utility/hooks/useImpactCountsByPhase'
import type { Phase, PhaseStepStatus } from '../types'

export interface PhaseStepAlert {
  total: number
  critical: boolean
}

/** Per-phase view-model shared by every phase-navigation UI (rail, dropdown). */
export interface PhaseStep {
  id: Phase
  label: string
  description: string
  status: PhaseStepStatus
  /** Navigation target, or null when there is no active project in the URL. */
  route: string | null
  /** Open change-impact alerts for this phase, or null when there are none. */
  alert: PhaseStepAlert | null
}

/**
 * Derives the ordered phase steps (status, route, description, alerts) for the
 * current project. Single source of truth so the rail and the dropdown stay in
 * sync instead of each re-deriving phase status.
 */
export function usePhaseSteps(): { steps: PhaseStep[]; activeId: Phase | null } {
  const location = useLocation()
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useCurrentProject()
  const alertCounts = useImpactCountsByPhase(projectId)

  function statusOf(phase: Phase): PhaseStepStatus {
    if (location.pathname.includes(`/${phase}`)) return 'active'
    if (!project) return 'available'
    const currentIdx = PHASE_ORDER.indexOf(project.currentPhase as (typeof PHASE_ORDER)[number])
    const phaseIdx = PHASE_ORDER.indexOf(phase)
    if (phaseIdx < currentIdx) return 'done'
    return 'available'
  }

  let activeId: Phase | null = null
  const steps: PhaseStep[] = PHASES.map((phase) => {
    const status = statusOf(phase.id)
    if (status === 'active') activeId = phase.id

    const count = alertCounts[phase.id]
    const alert = count && count.total > 0 ? { total: count.total, critical: count.critical > 0 } : null

    return {
      id: phase.id,
      label: phase.label,
      description: PHASE_DESCRIPTION[phase.id],
      status,
      route: projectId ? ROUTES[phase.id](projectId) : null,
      alert,
    }
  })

  return { steps, activeId }
}
