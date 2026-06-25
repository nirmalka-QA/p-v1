import type {
  ImpactSeverity,
  ImpactStatus,
  ReviewAction,
  KBSectionId,
} from '../../../../types'

/** Id prefixes for generated alert / audit ids. */
export const IMPACT_ID_PREFIX = 'IMP'
export const AUDIT_ID_PREFIX = 'AUD'

/** Severity → Mantine palette colour (danger = red, warning = orange, info = gray). */
export const SEVERITY_COLOR: Record<ImpactSeverity, string> = {
  critical: 'red',
  warning: 'orange',
  info: 'gray',
}

export const SEVERITY_LABEL: Record<ImpactSeverity, string> = {
  critical: 'Critical',
  warning: 'Needs review',
  info: 'For info',
}

/** Statuses that still demand the user's attention (counted in the rail / bell). */
export const ACTIVE_STATUSES: ImpactStatus[] = ['open', 'acknowledged']

/** Human labels for the review actions — SDLC/agile framing. */
export const ACTION_LABEL: Record<ReviewAction, string> = {
  approve: 'Review & Approve',
  reject: 'Review & Reject',
  acknowledge: 'Acknowledge',
  regenerate: 'Regenerate from new context',
}

/** How a change to each KB section propagates to the feature list (mock "AI" rules). */
type KbRule = { severity: ImpactSeverity; scope: 'all' | 'overlap' | 'none' }
export const KB_SECTION_RULES: Record<KBSectionId, KbRule> = {
  'business-requirements': { severity: 'critical', scope: 'all' },
  'problem-statements': { severity: 'critical', scope: 'all' },
  'proposed-solutions': { severity: 'warning', scope: 'overlap' },
  'architectural-notes': { severity: 'warning', scope: 'all' },
  'tech-stack': { severity: 'warning', scope: 'all' },
  timeline: { severity: 'info', scope: 'none' },
  stakeholders: { severity: 'info', scope: 'none' },
  'open-questions': { severity: 'info', scope: 'none' },
  'other-notes': { severity: 'info', scope: 'none' },
}

/** Fallback rule for a whole-KB regeneration (no single section). */
export const KB_REGEN_RULE: KbRule = { severity: 'critical', scope: 'all' }
