import type { StoryStatus, GherkinCriterion, NavigationFlow, StoryComponent, ValidationRule } from '../../../../types'

// Domain types this feature works with, re-exported from the shared model.
export type {
  Feature, Story, StoryStatus,
  GherkinCriterion, NavigationFlow, StoryComponent, ValidationRule,
} from '../../../../types'

/** Effort values allowed for a story (Fibonacci story points). */
export type StoryEffort = 1 | 2 | 3 | 5 | 8

/**
 * Story form shape. `effort` is a string here (the Select yields strings) and is
 * narrowed to StoryEffort on submit. A type alias (not interface) so it satisfies
 * the Yup resolver's `Record<string, unknown>` validate signature.
 */
export type StoryFormValues = {
  title: string
  description: string
  asA: string
  iWant: string
  soThat: string
  /** Structured Gherkin acceptance criteria (ADR-0033). */
  acceptanceCriteria: GherkinCriterion[]
  // Enterprise-grade story detail (ADR-0033).
  background: string
  epic: string
  version: string
  assumptions: string[]
  navigationFlow: NavigationFlow
  components: StoryComponent[]
  validationRules: ValidationRule[]
  effort: string
  status: StoryStatus
  assignee: string
  dependencies: string[]
}

/** Payload for generating (or regenerating) stories for a single feature. */
export interface GenerateStoriesInput {
  projectId: string
  featureId: string
  /** Optional extra instructions appended to the generation prompt. */
  context?: string
}

/** Payload for AI-enhancing a single story (richer description + criteria). */
export interface EnhanceStoryInput {
  projectId: string
  storyId: string
  /** Optional guidance, e.g. "focus on edge cases" or "add security criteria". */
  instructions?: string
}

/** One progress step reported by the backend during generate-stories, with start/end times. */
export interface StoryGenStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string | null
  endedAt?: string | null
}

/** Progressive status of an async generate-stories job (mirrors Discovery / Planning). */
export interface StoryGenerationStatus {
  jobId: string
  status: 'running' | 'completed' | 'failed'
  steps: StoryGenStep[]
  stories?: import('../../../../types').Story[] | null
}

/** Payload to start a progressive generate-stories job (no featureIds = all approved features). */
export interface StartGenerateStoriesInput {
  projectId: string
  featureIds?: string[]
  context?: string
}

/** One feature the UI will generate stories for, in order. */
export interface StoryPlanFeature {
  id: string
  title: string
}

/** The ordered target features for a feature-by-feature story generation. */
export interface StoryGenerationPlan {
  features: StoryPlanFeature[]
}
