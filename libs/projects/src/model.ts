// Project-entity types + API DTOs. Shared by the host (list/creation/resolution)
// and the custom-app workspace. `currentPhase` is a plain string here — the SDLC
// Phase union is a custom-app concept; consumers narrow it as needed.

// The federation project type (custom-app, strategy, …) — the load-bearing value
// that selects the micro-frontend remote. Aliased to avoid clashing with the
// industry `ProjectType` below (a separate, legacy data field retained for future).
import type { ProjectType as PlatformProjectType } from '@wispr/contracts'

/**
 * A project's industry/category. NOTE: distinct from the platform `ProjectType`
 * in @wispr/contracts (which selects the micro-frontend); this is a data field.
 * Retained for future use; the create wizard does not surface it yet.
 */
export type ProjectType = 'healthcare' | 'insurance' | 'fintech' | 'retail' | 'other'

/** Whether a project type has a ready remote or is still "coming soon". */
export type ProjectTypeStatus = 'available' | 'coming-soon'

/**
 * One entry in the project-type master data (the federation types). Served from
 * GET /project-type-catalog; drives the create wizard's type picker. The frontend
 * adds icon + accent colour via PROJECT_TYPE_META (presentation, host-side).
 */
export interface IProjectTypeCatalogEntry {
  id: number
  key: PlatformProjectType
  name: string
  tag: string
  description: string
  status: ProjectTypeStatus
}

// ── Strategy projects: type templates + phase library (mock master data) ────
// A strategy project's phase rail is configured at creation: a strategy TYPE maps
// to an ordered set of PHASES drawn from the phase library. Both are served from the
// (mock) API and shared with the strategy remote, which renders the rail from them.

/** One strategy template (Data Strategy, Cloud Migration, …) + its ordered phases. */
export interface IStrategyTypeOption {
  id: number
  key: string
  name: string
  description: string
  /** Ordered phase-library ids this template configures (Discovery first, Sign-off last). */
  phaseIds: string[]
}

/** A required/optional input document a strategy phase consumes. */
export interface IStrategyPhaseInput {
  name: string
  mandatory?: boolean
}

/** A document a strategy phase produces. */
export interface IStrategyPhaseOutput {
  name: string
  fmt: string
}

/** One phase in the strategy phase library. Discovery + Sign-off are mandatory. */
export interface IStrategyPhase {
  id: string
  name: string
  description: string
  /** A short, practical micro-guide ("how to work this phase") shown on the phase page. */
  guide?: string
  mandatory: boolean
  inputs: IStrategyPhaseInput[]
  outputs: IStrategyPhaseOutput[]
}

/** A configured phase on a project — the library entry expanded for the rail/preview. */
export interface ProjectPhase {
  id: string
  name: string
  description: string
  /** A short, practical micro-guide ("how to work this phase") shown on the phase page. */
  guide?: string
  mandatory: boolean
  inputs: IStrategyPhaseInput[]
  outputs: IStrategyPhaseOutput[]
}

// Const object + union (the repo enables erasableSyntaxOnly, which forbids enums).
export const ProjectStatus = {
  NEW: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
} as const

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]

export interface Project {
  id: string
  name: string
  description: string
  /** Federation project type — selects the remote + shapes the phase rail. Primary. */
  projectType: PlatformProjectType
  /** Industry/category — legacy data field, retained for future use. */
  type: ProjectType
  typeId: number
  status: ProjectStatus
  /** The workspace this project belongs to. A project is always inside one workspace. */
  workspaceId: string
  logo?: string
  /** SDLC phase id (e.g. 'discovery'); typed loosely — Phase lives in custom-app. */
  currentPhase: string
  /** Strategy projects only: the chosen template key (undefined for custom or non-strategy). */
  strategyType?: string
  /** Strategy projects only: the configured, ordered phase-library ids (the rail). */
  phaseIds?: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

/** Standard API envelope — every response wraps its payload in `result`. */
export interface ApiEnvelope<T> {
  result: T
  errors?: unknown
}

/** Payload accepted by the createProject mutation (owner derived server-side). */
export interface CreateProjectInput {
  name: string
  description: string
  /** Federation project type chosen in the wizard — selects the remote. */
  projectType: PlatformProjectType
  /** Optional industry/category (the wizard's optional select); maps to projectTypeId. */
  industry?: ProjectType
  /** Strategy projects only: chosen template key + ordered configured phase ids. */
  strategyType?: string
  phaseIds?: string[]
  /** The workspace to create the project in (the create flow always opens inside one). */
  workspaceId?: string
  logo?: string
}

/** Raw project shape returned by the API — mapped to `Project` at the boundary. */
export interface IProjects {
  id: number
  projectName: string
  projectDescription: string
  /** Federation project type key (e.g. 'custom-app'); maps to Project.projectType. */
  projectType?: PlatformProjectType
  projectTypeId: number
  status: number
  createdDate: string
  /** Owning workspace id (added with the workspace feature). */
  workspaceId?: string
  /** Strategy projects only: chosen template key + ordered configured phase ids. */
  strategyType?: string
  phaseIds?: string[]
}

/** Project type option from the API (drives the create/edit dropdown). */
export interface IProjectType {
  id: number
  name: string
}

/** Pagination / search / sort payload for the project list (POST body). */
export interface IProjectsListRequest {
  pageNumber?: number
  pageSize?: number
  q?: string
  /** Scope the list to one workspace (the workspace home always passes this). */
  workspaceId?: string
  projectTypeId?: number
  status?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

/** Paginated list envelope returned by POST /projects-list. */
export interface IProjectsListResponse {
  projects: IProjects[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/** UI-side paginated result: mapped projects + pagination meta. */
export interface PaginatedProjects {
  projects: Project[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/** Raw response from POST /projects (create). */
export interface ProjectApiResponse {
  result: {
    projectId: number
    warning?: string
  }
}

/** Normalised create result consumed by the UI. */
export interface CreateProjectResult {
  projectId: string
  warning?: string
}

/** Shape of the create-project form (type is a plain string until Yup narrows it). */
export type ProjectFormValues = {
  name: string
  description: string
  type: string
  logo: string
}

/**
 * Shape of the create-project WIZARD form. `projectType` holds the selected
 * federation project-type key (validated non-empty + available). Distinct from
 * ProjectFormValues (which the custom-app settings form still uses for industry).
 */
export type ProjectWizardValues = {
  name: string
  description: string
  projectType: string
  /** Optional industry/category key (empty string = not specified). */
  industry: string
  /** Strategy projects only: chosen template key ('' = none / custom). */
  strategyType: string
  /** Strategy projects only: ordered configured phase ids. */
  phaseIds: string[]
  logo: string
}
