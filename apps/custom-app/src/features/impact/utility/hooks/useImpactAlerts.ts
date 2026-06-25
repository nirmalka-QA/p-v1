import { skipToken } from '@reduxjs/toolkit/query'
import { useGetAlertsQuery } from '../services/impactApi'
import type { ChangeImpactAlert } from '../../../../types'

interface UseImpactAlertsResult {
  alerts: ChangeImpactAlert[]
  /** Open + acknowledged — everything still surfaced in the review center. */
  active: ChangeImpactAlert[]
  /** Open only — drives the attention-bell count (acknowledged is snoozed). */
  openCount: number
  hasCritical: boolean
  isLoading: boolean
}

/** Project-wide change-impact alerts plus the derived counts the UI needs. */
export function useImpactAlerts(projectId: string | undefined): UseImpactAlertsResult {
  const { data: alerts = [], isLoading } = useGetAlertsQuery(projectId ?? skipToken)

  const open = alerts.filter((a) => a.status === 'open')
  const active = alerts.filter((a) => a.status === 'open' || a.status === 'acknowledged')
  const hasCritical = open.some((a) => a.severity === 'critical')

  return { alerts, active, openCount: open.length, hasCritical, isLoading }
}
