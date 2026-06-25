import type { AuditEntry, ChangeImpactAlert } from '../../../../types'
import { AUDIT_ID_PREFIX, IMPACT_ID_PREFIX } from '../constants/constants'

/** Next sequential id in `PREFIX-001` form, given the existing ids. */
function nextId(prefix: string, existingIds: string[]): string {
  const maxNum = existingIds.reduce((max, id) => {
    const n = Number(id.replace(/\D/g, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`
}

export function nextImpactId(alerts: ChangeImpactAlert[]): string {
  return nextId(IMPACT_ID_PREFIX, alerts.map((a) => a.id))
}

export function nextAuditId(entries: AuditEntry[]): string {
  return nextId(AUDIT_ID_PREFIX, entries.map((e) => e.id))
}
