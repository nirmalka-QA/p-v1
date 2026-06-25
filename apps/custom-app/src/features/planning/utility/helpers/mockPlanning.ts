import type {
  KnowledgeBase,
  Feature,
  SuggestedFeature,
  PlanningPlan,
  Priority,
  Complexity,
} from '../../../../types'
import { THIN_KB_SECTION_THRESHOLD } from '../constants/constants'
import { nextFeatureId, sortByOrder } from './helpers'

/**
 * Mock AI planning. Until the generate-features endpoint is live, this derives a
 * realistic feature list + suggestions tray from the (mock) Knowledge Base so the
 * Planning UX is fully exercisable. Swap for the real API by replacing the
 * planningApi `queryFn`s with `query`.
 */

type FeatureSeed = {
  title: string
  description: string
  priority: Priority
  complexity: Complexity
  functionalRequirements: string[]
  nonFunctionalRequirements: string[]
}

type SuggestionSeed = FeatureSeed & { rationale: string }

// Pre-filled feature list (matches requirements §6.1 — no button needed on landing).
const FEATURE_SEEDS: FeatureSeed[] = [
  {
    title: 'User Authentication & Session Management',
    description:
      'Secure email/password login with persistent sessions, account lockout after repeated failures, and logout from any view.',
    priority: 'high',
    complexity: 'm',
    functionalRequirements: [
      'Users sign in with email and password and are routed to their landing page on success.',
      'Failed sign-in shows a generic inline error that does not reveal which field was wrong.',
      'Sessions persist across browser refreshes until the user explicitly logs out.',
      'Accounts lock for a cool-down period after 5 consecutive failed attempts.',
    ],
    nonFunctionalRequirements: [
      'Auth endpoints enforce rate limiting of 5 attempts per 15 minutes with exponential back-off.',
      'All credentials transit over HTTPS; no token is ever written to local storage in plain text.',
      'Sign-in round-trip completes under 500 ms at p95 under nominal load.',
    ],
  },
  {
    title: 'Entity Data Management (CRUD)',
    description:
      'Create, read, update, and delete the platform’s primary entities with optimistic UI and rollback on failure.',
    priority: 'high',
    complexity: 'l',
    functionalRequirements: [
      'Users can create, view, edit, and delete primary entity records.',
      'Edits apply optimistically and roll back with a clear error if the server rejects them.',
      'Every list and detail view has explicit loading, empty, and error states.',
      'Deletion requires a confirmation step to prevent accidental data loss.',
    ],
    nonFunctionalRequirements: [
      'List views remain responsive for collections up to 10,000 records via pagination.',
      'All write operations are covered by at least one integration test.',
      'Forms meet WCAG 2.1 AA and are fully operable by keyboard.',
    ],
  },
  {
    title: 'Search & Filtering',
    description:
      'Real-time search across key fields with composable filters so users can quickly narrow large data sets.',
    priority: 'medium',
    complexity: 'm',
    functionalRequirements: [
      'Search matches across the primary searchable fields and updates results as the user types.',
      'Filters can be combined and are reflected in the URL so views are shareable.',
      'An empty result set shows guidance on adjusting the query rather than a blank screen.',
    ],
    nonFunctionalRequirements: [
      'Search input is debounced so no more than one request is issued per 300 ms.',
      'Result rendering stays under 200 ms after the response is received.',
    ],
  },
  {
    title: 'Notifications & Alerts',
    description:
      'Event-driven notifications surfaced in-app and via email, with per-user channel preferences.',
    priority: 'medium',
    complexity: 'm',
    functionalRequirements: [
      'Key state changes raise a notification to the relevant users.',
      'Users can configure which events notify them and on which channels.',
      'In-app notifications appear as non-blocking toasts; email is sent for high-priority events.',
    ],
    nonFunctionalRequirements: [
      'Notification dispatch is asynchronous and never blocks the triggering user action.',
      'Email delivery is retried with back-off on transient provider failures.',
    ],
  },
  {
    title: 'Audit Trail & Activity Log',
    description:
      'Immutable, queryable log of every state change capturing the actor, timestamp, and before/after diff.',
    priority: 'medium',
    complexity: 's',
    functionalRequirements: [
      'Each create, update, and delete writes an audit entry with actor, timestamp, and diff.',
      'Users with permission can browse and filter the audit log by entity, actor, and date range.',
      'Audit entries are read-only and cannot be edited or deleted from the UI.',
    ],
    nonFunctionalRequirements: [
      'Audit writes are append-only and durable; a failed audit write fails the originating action.',
      'Log queries return within 1 second for a 90-day window.',
    ],
  },
  {
    title: 'Status & Reporting Dashboard',
    description:
      'A real-time overview replacing stale weekly manual reports, giving stakeholders current status at a glance.',
    priority: 'low',
    complexity: 'l',
    functionalRequirements: [
      'Dashboard shows current status across the primary entities with drill-down to detail.',
      'Key metrics refresh without requiring a full page reload.',
      'Each widget has a loading, empty, and error state.',
    ],
    nonFunctionalRequirements: [
      'Aggregated views are cached briefly (ETag / short-lived cache) to keep load under 2 seconds.',
      'Dashboard layout targets desktop at a minimum width of 1280px.',
    ],
  },
]

// Additional candidates the AI proposes for the user to review and add (extras tray).
const SUGGESTION_SEEDS: SuggestionSeed[] = [
  {
    title: 'Role-Based Access Control (RBAC)',
    description:
      'Scope what each user can see and do based on their role (PM / BA / Developer / Admin).',
    priority: 'high',
    complexity: 'm',
    rationale:
      'The Stakeholders section defines distinct decision authorities and approval gates — those roles need to map to enforced permissions.',
    functionalRequirements: [
      'Permissions are granted by role; UI affordances hide actions a role cannot perform.',
      'Admins can view the role assigned to each user (assignment itself remains external).',
    ],
    nonFunctionalRequirements: [
      'Permission checks are enforced server-side, never relying on UI hiding alone.',
    ],
  },
  {
    title: 'Self-Service Account Portal',
    description:
      'Let users perform common actions themselves instead of raising a support ticket.',
    priority: 'medium',
    complexity: 'm',
    rationale:
      'Problem Statements estimate ~40% of support tickets are avoidable with self-service — high ROI within the first 6 months.',
    functionalRequirements: [
      'Users can complete the top self-service actions without contacting support.',
      'Each self-service flow has clear success and failure feedback.',
    ],
    nonFunctionalRequirements: [
      'Self-service flows are instrumented so avoided-ticket impact can be measured.',
    ],
  },
  {
    title: 'Data Export (CSV / PDF)',
    description: 'Export filtered lists and reports for sharing and offline analysis.',
    priority: 'low',
    complexity: 's',
    rationale:
      'Reporting needs in the brief imply stakeholders will want to take data out of the platform for reviews.',
    functionalRequirements: [
      'Users can export the current filtered view to CSV.',
      'Reports can be exported to a print-ready PDF.',
    ],
    nonFunctionalRequirements: [
      'Exports stream so large data sets do not exhaust browser memory.',
    ],
  },
  {
    title: 'Rate Limiting & Abuse Protection',
    description: 'Protect sensitive endpoints from brute-force and automated abuse.',
    priority: 'medium',
    complexity: 's',
    rationale:
      'The Non-Functional Requirements call for OWASP Top 10 compliance and explicit auth rate limiting.',
    functionalRequirements: [
      'Sensitive endpoints reject requests beyond the configured threshold with a clear status.',
      'Repeated abuse triggers a temporary block with an audit entry.',
    ],
    nonFunctionalRequirements: [
      'Counters use the existing Redis infrastructure to support horizontal scaling.',
    ],
  },
  {
    title: 'Bulk Actions',
    description: 'Apply an action to many selected records at once to cut repetitive manual work.',
    priority: 'low',
    complexity: 'm',
    rationale:
      'The current manual, row-by-row workflow is cited as costing 3–4 hours of correction work per team per week.',
    functionalRequirements: [
      'Users can select multiple records and apply a supported action in one operation.',
      'A summary reports how many records succeeded or failed.',
    ],
    nonFunctionalRequirements: [
      'Bulk operations run in the background for large selections and report progress.',
    ],
  },
]

/** Count of KB sections that actually contain at least one note. */
export function populatedSectionCount(kb: KnowledgeBase): number {
  return kb.sections.filter((s) => s.notes.length > 0).length
}

export function generateMockPlan(projectId: string, kb: KnowledgeBase): PlanningPlan {
  const now = new Date().toISOString()

  const features: Feature[] = FEATURE_SEEDS.map((seed, i) => ({
    id: `F-${String(i + 1).padStart(3, '0')}`,
    projectId,
    title: seed.title,
    description: seed.description,
    priority: seed.priority,
    complexity: seed.complexity,
    functionalRequirements: seed.functionalRequirements,
    nonFunctionalRequirements: seed.nonFunctionalRequirements,
    aiGenerated: true,
    status: 'proposed',
    order: i,
    storiesCount: 0,
    readyStoriesCount: 0,
    createdAt: now,
  }))

  const suggestions: SuggestedFeature[] = SUGGESTION_SEEDS.map((seed, i) => ({
    id: `S-${String(i + 1).padStart(3, '0')}-${now.slice(11, 19).replace(/:/g, '')}`,
    title: seed.title,
    description: seed.description,
    priority: seed.priority,
    complexity: seed.complexity,
    functionalRequirements: seed.functionalRequirements,
    nonFunctionalRequirements: seed.nonFunctionalRequirements,
    rationale: seed.rationale,
  }))

  return {
    projectId,
    features,
    suggestions,
    generatedAt: now,
    isThinKb: populatedSectionCount(kb) < THIN_KB_SECTION_THRESHOLD,
  }
}

/** Promotes a suggestion into the feature list (appended at the end). */
export function acceptSuggestionInPlan(plan: PlanningPlan, suggestionId: string): PlanningPlan {
  const suggestion = plan.suggestions.find((s) => s.id === suggestionId)
  if (!suggestion) return plan

  const ordered = sortByOrder(plan.features)
  const newFeature: Feature = {
    id: nextFeatureId(plan.features),
    projectId: plan.projectId,
    title: suggestion.title,
    description: suggestion.description,
    priority: suggestion.priority,
    complexity: suggestion.complexity,
    functionalRequirements: suggestion.functionalRequirements,
    nonFunctionalRequirements: suggestion.nonFunctionalRequirements,
    aiGenerated: true,
    status: 'proposed',
    order: ordered.length,
    storiesCount: 0,
    readyStoriesCount: 0,
    createdAt: new Date().toISOString(),
  }

  return {
    ...plan,
    features: [...plan.features, newFeature],
    suggestions: plan.suggestions.filter((s) => s.id !== suggestionId),
  }
}

/** Removes a suggestion from the tray without adding it to the list. */
export function dismissSuggestionInPlan(plan: PlanningPlan, suggestionId: string): PlanningPlan {
  return { ...plan, suggestions: plan.suggestions.filter((s) => s.id !== suggestionId) }
}

/**
 * Mock AI "enhance" for a feature: enriches the description and appends one
 * functional + one non-functional requirement, optionally steered by free-text
 * `instructions`. Existing content is preserved and additions de-duplicated so
 * repeated enhancement converges.
 */
export function enhanceFeatureContent(
  feature: Pick<Feature, 'description' | 'functionalRequirements' | 'nonFunctionalRequirements'>,
  instructions?: string
): Pick<Feature, 'description' | 'functionalRequirements' | 'nonFunctionalRequirements'> {
  const focus = instructions?.trim()

  const descSuffix = focus
    ? ` The AI was asked to focus on: ${focus}.`
    : ' The AI expanded this with clearer scope and implementation considerations.'
  const description = feature.description.includes(descSuffix.trim())
    ? feature.description
    : `${feature.description}${descSuffix}`

  const fr = focus
    ? `Explicitly supports the requested focus: ${focus}.`
    : 'Provides clear success and error feedback for every user action.'
  const nfr = focus
    ? `Defines measurable acceptance criteria for: ${focus}.`
    : 'Meets WCAG 2.1 AA and responds within 500 ms at p95 under nominal load.'

  return {
    description,
    functionalRequirements: feature.functionalRequirements.includes(fr)
      ? feature.functionalRequirements
      : [...feature.functionalRequirements, fr],
    nonFunctionalRequirements: feature.nonFunctionalRequirements.includes(nfr)
      ? feature.nonFunctionalRequirements
      : [...feature.nonFunctionalRequirements, nfr],
  }
}
