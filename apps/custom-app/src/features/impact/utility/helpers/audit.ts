import type { AuditEntry, AuditEventType } from '../../../../types'
import { nextAuditId } from './ids'

interface AuditInput {
  existing: AuditEntry[]
  projectId: string
  at: string
  type: AuditEventType
  refId: string
  summary: string
  alertId?: string
}

/**
 * Builds a single audit entry with the next sequential id. Pure — the caller
 * (a mutation queryFn) supplies `at` and persists via `mockDb.appendAudit`.
 */
export function buildAuditEntry({ existing, projectId, at, type, refId, summary, alertId }: AuditInput): AuditEntry {
  return { id: nextAuditId(existing), projectId, at, type, refId, summary, alertId }
}
