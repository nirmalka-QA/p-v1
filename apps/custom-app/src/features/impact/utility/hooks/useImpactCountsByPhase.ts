import { skipToken } from '@reduxjs/toolkit/query'
import { useGetAlertsQuery } from '../services/impactApi'
import type { ImpactPhase } from '../../../../types'

export interface PhaseAlertCount {
  /** Open critical alerts (drive the rose danger dot). */
  critical: number
  /** Open + acknowledged alerts targeting this phase (drive the amber dot). */
  total: number
}

/** Per-phase alert counts keyed by the impacted artifact's phase (for PhaseRail dots). */
export function useImpactCountsByPhase(projectId: string | undefined): Record<string, PhaseAlertCount> {
  const { data: alerts = [] } = useGetAlertsQuery(projectId ?? skipToken)

  const counts: Record<string, PhaseAlertCount> = {}
  for (const alert of alerts) {
    if (alert.status !== 'open' && alert.status !== 'acknowledged') continue
    const phase: ImpactPhase = alert.target.phase
    const entry = counts[phase] ?? { critical: 0, total: 0 }
    entry.total += 1
    if (alert.status === 'open' && alert.severity === 'critical') entry.critical += 1
    counts[phase] = entry
  }
  return counts
}
