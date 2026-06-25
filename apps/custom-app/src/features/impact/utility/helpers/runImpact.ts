import { mockDb } from '../../../../services/mockDb'
import { deriveImpactAlerts, type ChangeDescriptor } from './propagation'
import { buildAuditEntry } from './audit'
import type { AuditEventType } from '../../../../types'

interface RunImpactParams {
  projectId: string
  now: string
  change: ChangeDescriptor
  auditType: AuditEventType
  auditSummary: string
}

/**
 * Data-layer glue called from a phase mutation's `queryFn` AFTER its change is
 * saved: runs the propagation engine over the current project snapshot, persists
 * any net-new alerts, and appends an audit entry for the change itself. Keeping
 * this in the mutation (not a component effect) means a single source of cache
 * invalidation. Returns the count of fresh alerts raised.
 */
export function runImpact({ projectId, now, change, auditType, auditSummary }: RunImpactParams): number {
  const plan = mockDb.getPlan(projectId)
  const features = plan?.features ?? []
  const stories = mockDb.getStories(projectId)
  const existingAlerts = mockDb.getAlerts(projectId)

  const fresh = deriveImpactAlerts(change, { projectId, features, stories, existingAlerts, now })
  if (fresh.length > 0) {
    mockDb.saveAlerts(projectId, [...existingAlerts, ...fresh])
  }

  const entry = buildAuditEntry({
    existing: mockDb.getAudit(projectId),
    projectId,
    at: now,
    type: auditType,
    refId: change.source.refId,
    summary: auditSummary,
  })
  mockDb.appendAudit(projectId, [entry])

  return fresh.length
}
