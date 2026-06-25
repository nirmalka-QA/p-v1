import type { ChangeImpactAlert, ImpactResolution, ImpactStatus, ReviewAction } from '../../../../types'

/**
 * What a review decision does to the impacted target artifact. The queryFn that
 * resolves an alert interprets this — nothing is ever deleted:
 *  - 'none'         → target unchanged (reject / acknowledge)
 *  - 'needs-update' → flag the target for rework, bump its revision (approve)
 *  - 'regenerate'   → AI re-derives the target from new context, bump revision
 */
export type TargetEffect = 'none' | 'needs-update' | 'regenerate'

export interface ReviewOutcome {
  nextStatus: ImpactStatus
  resolution: ImpactResolution
  targetEffect: TargetEffect
}

/** Pure transition for resolving an alert with a review action. */
export function applyReview(
  alert: ChangeImpactAlert,
  action: ReviewAction,
  at: string,
  note?: string,
): ReviewOutcome {
  const resolution: ImpactResolution = { action, decidedAt: at, note: note?.trim() || undefined }

  switch (action) {
    case 'approve':
      return { nextStatus: 'approved', resolution, targetEffect: 'needs-update' }
    case 'regenerate':
      return { nextStatus: 'approved', resolution, targetEffect: 'regenerate' }
    case 'reject':
      return { nextStatus: 'rejected', resolution, targetEffect: 'none' }
    case 'acknowledge':
      return { nextStatus: 'acknowledged', resolution, targetEffect: 'none' }
    default:
      return { nextStatus: alert.status, resolution, targetEffect: 'none' }
  }
}
