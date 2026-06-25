import type { ChangeImpactAlert, ImpactKind } from '../../../../types'

/** Alerts still needing the user's attention (open or acknowledged). */
export function activeAlerts(alerts: ChangeImpactAlert[]): ChangeImpactAlert[] {
  return alerts.filter((a) => a.status === 'open' || a.status === 'acknowledged')
}

/** Active alerts targeting one specific artifact (feature / story / kb-note). */
export function activeAlertsFor(
  alerts: ChangeImpactAlert[],
  kind: ImpactKind,
  refId: string,
): ChangeImpactAlert[] {
  return activeAlerts(alerts).filter((a) => a.target.kind === kind && a.target.refId === refId)
}
