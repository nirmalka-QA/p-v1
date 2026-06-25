import { baseApi } from '../../../../services/baseApi'
import { mockDb, delay } from '../../../../services/mockDb'
import { API_TAGS, LIST_ID } from '@wispr/contracts'
import { applyReview, type TargetEffect } from '../helpers/review'
import { buildAuditEntry } from '../helpers/audit'
import { ACTION_LABEL } from '../constants/constants'
import { enhanceStoryContent } from '../../../features/utility/helpers/mockStories'
import { enhanceFeatureContent } from '../../../planning/utility/helpers/mockPlanning'
import type { ChangeImpactAlert, AuditEntry, ImpactRef, AuditEventType, ReviewAction } from '../../../../types'
import type { ResolveAlertInput } from '../models/model'

const IMPACT_TAG = { type: API_TAGS.Impact, id: LIST_ID } as const
const AUDIT_TAG = { type: API_TAGS.Audit, id: LIST_ID } as const
const STORY_TAG = { type: API_TAGS.Story, id: LIST_ID } as const
const FEATURE_TAG = { type: API_TAGS.Feature, id: LIST_ID } as const

const AUDIT_BY_ACTION: Record<ReviewAction, AuditEventType> = {
  approve: 'alert-approved',
  reject: 'alert-rejected',
  acknowledge: 'alert-acknowledged',
  regenerate: 'alert-regenerated',
}

/** Applies a review's target effect to the impacted artifact — never deletes, only versions. */
function applyTargetEffect(projectId: string, target: ImpactRef, effect: TargetEffect): void {
  if (effect === 'none') return

  if (target.kind === 'story') {
    const stories = mockDb.getStories(projectId)
    mockDb.saveStories(
      projectId,
      stories.map((s) => {
        if (s.id !== target.refId) return s
        const bumped = { ...s, revision: (s.revision ?? 1) + 1 }
        return effect === 'regenerate'
          ? { ...bumped, ...enhanceStoryContent(s), needsUpdate: false }
          : { ...bumped, needsUpdate: true }
      }),
    )
    return
  }

  if (target.kind === 'feature') {
    const plan = mockDb.getPlan(projectId)
    if (!plan) return
    mockDb.savePlan({
      ...plan,
      features: plan.features.map((f) => {
        if (f.id !== target.refId) return f
        const bumped = { ...f, revision: (f.revision ?? 1) + 1 }
        return effect === 'regenerate'
          ? { ...bumped, ...enhanceFeatureContent(f), needsUpdate: false }
          : { ...bumped, needsUpdate: true }
      }),
    })
  }
}

/**
 * Change-impact endpoints. Mock-backed via `queryFn`. Alerts are raised by the
 * discovery / planning / features mutations (which call the propagation engine);
 * here we read them and resolve them with review decisions. Nothing is deleted.
 */
export const impactApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAlerts: build.query<ChangeImpactAlert[], string>({
      async queryFn(projectId) {
        await delay(120)
        return { data: mockDb.getAlerts(projectId) }
      },
      providesTags: [IMPACT_TAG],
    }),

    getAudit: build.query<AuditEntry[], string>({
      async queryFn(projectId) {
        await delay(120)
        return { data: mockDb.getAudit(projectId) }
      },
      providesTags: [AUDIT_TAG],
    }),

    resolveAlert: build.mutation<ChangeImpactAlert, ResolveAlertInput>({
      async queryFn({ projectId, alertId, action, note }) {
        const alerts = mockDb.getAlerts(projectId)
        const alert = alerts.find((a) => a.id === alertId)
        if (!alert) return { error: { status: 404, data: 'Alert not found.' } }
        if (action === 'reject' && !note?.trim()) {
          return { error: { status: 400, data: 'A note is required when rejecting a change.' } }
        }
        await delay(200)
        const now = new Date().toISOString()
        const outcome = applyReview(alert, action, now, note)

        const updated: ChangeImpactAlert = { ...alert, status: outcome.nextStatus, resolution: outcome.resolution }
        mockDb.saveAlerts(
          projectId,
          alerts.map((a) => (a.id === alertId ? updated : a)),
        )

        applyTargetEffect(projectId, alert.target, outcome.targetEffect)

        const entry = buildAuditEntry({
          existing: mockDb.getAudit(projectId),
          projectId,
          at: now,
          type: AUDIT_BY_ACTION[action],
          refId: alert.target.refId,
          summary: `${ACTION_LABEL[action]} — ${alert.target.label}`,
          alertId,
        })
        mockDb.appendAudit(projectId, [entry])

        return { data: updated }
      },
      invalidatesTags: [IMPACT_TAG, AUDIT_TAG, STORY_TAG, FEATURE_TAG],
    }),
  }),
})

export const { useGetAlertsQuery, useGetAuditQuery, useResolveAlertMutation } = impactApi
