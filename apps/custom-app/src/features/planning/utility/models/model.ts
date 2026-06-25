import type { Priority, Complexity, PlanningPlan } from '../../../../types'

// Domain types this feature works with, re-exported from the shared model.
export type {
  Feature,
  FeatureStatus,
  SuggestedFeature,
  PlanningPlan,
  Priority,
  Complexity,
} from '../../../../types'

/** Direction for the up/down reorder controls (no drag-and-drop in Week 1). */
export type ReorderDirection = 'up' | 'down'

/** One progress step reported by the backend during generate-features, with start/end times. */
export interface PlanGenStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string | null
  endedAt?: string | null
}

/** Progressive status of an async generate-features job (mirrors Discovery's KbGenerationStatus). */
export interface PlanGenerationStatus {
  jobId: string
  status: 'running' | 'completed' | 'failed'
  steps: PlanGenStep[]
  plan?: PlanningPlan | null
}

/** Payload for (re)generating the plan from the Knowledge Base. */
export interface GeneratePlanInput {
  projectId: string
  /** Optional extra instructions the user types before regenerating. */
  context?: string
}

/**
 * Fields a user can set when adding or editing a feature manually. A type alias
 * (not an interface) so it satisfies the Yup resolver's `Record<string, unknown>`
 * validate signature — see ProjectFormValues for the same rationale.
 */
export type FeatureFormValues = {
  title: string
  description: string
  priority: Priority
  complexity: Complexity
  functionalRequirements: string[]
  nonFunctionalRequirements: string[]
}
