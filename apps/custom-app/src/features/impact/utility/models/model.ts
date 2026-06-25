// Domain types for the cross-phase change-impact engine, re-exported from the
// shared model so this feature follows the same model.ts convention.
export type {
  ChangeImpactAlert,
  ImpactRef,
  ImpactResolution,
  ImpactPhase,
  ImpactKind,
  ImpactChangeType,
  ImpactSeverity,
  ImpactStatus,
  ReviewAction,
  AuditEntry,
  AuditEventType,
  Feature,
  Story,
  KBSectionId,
} from '../../../../types'

/** Resolve a single alert with a review decision. */
export interface ResolveAlertInput {
  projectId: string
  alertId: string
  action: import('../../../../types').ReviewAction
  /** Required when rejecting — records why the change was intentionally not actioned. */
  note?: string
}
