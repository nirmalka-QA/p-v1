// Workspace-entity types + API DTOs. Host-only domain (no remote consumes
// workspace data on the frontend — a remote only ever receives a WorkspaceRef
// via props). Promote to a @wispr/workspaces lib only if real duplication appears.
import type { Role } from '@wispr/contracts'

/** A workspace member with a workspace-scoped role (platformAdmin is platform-level, not stored here). */
export interface WorkspaceMember {
  userId: string
  name: string
  email?: string
  role: Role
  /** Two-letter initials for the avatar (derived via workspaceInitials). */
  initials: string
  /** Seed resolved to a Mantine palette name via memberColor() — never a hex value. */
  colorSeed: string
}

/** A document attached to the workspace (Phase 2 — the artifact library). */
export interface WorkspaceArtifact {
  id: string
  name: string
  kind: 'doc' | 'sheet' | 'file'
  updatedAt: string
  snippet?: string
  /** e.g. 'Uploaded' or the name of a source project. */
  source?: string
}

/** The rich workspace entity (mapped from IWorkspace at the API boundary). */
export interface Workspace {
  id: string
  name: string
  description: string
  /** Seed resolved to a Mantine palette name via workspaceColor() — never a hex value. */
  colorSeed: string
  /** Shared AI guidance applied to every project in the workspace (Phase 2). */
  instructions: string
  createdBy: string
  createdById: string
  createdAt: string
  updatedAt: string
  members: WorkspaceMember[]
  artifacts: WorkspaceArtifact[]
}

/** Standard API envelope — every response wraps its payload in `result`. */
export interface ApiEnvelope<T> {
  result: T
  errors?: unknown
}

/** Payload accepted by the createWorkspace mutation (creator becomes Owner server-side). */
export interface CreateWorkspaceInput {
  name: string
  description?: string
  colorSeed: string
}

/** Patch accepted by the updateWorkspace mutation (General + Instructions settings tabs). */
export interface UpdateWorkspaceInput {
  id: string
  name?: string
  description?: string
  instructions?: string
}

/** Invite payload — the API/mock assigns the userId + colour and derives initials. */
export interface InviteMemberInput {
  workspaceId: string
  name: string
  email?: string
  role: Role
}

/** Change a member's workspace-scoped role. */
export interface UpdateMemberRoleInput {
  workspaceId: string
  userId: string
  role: Role
}

/** Remove a member from a workspace. */
export interface RemoveMemberInput {
  workspaceId: string
  userId: string
}

/** New-artifact metadata (the mock stores metadata only — no file bytes are sent). */
export interface UploadArtifactInput {
  workspaceId: string
  name: string
  kind: WorkspaceArtifact['kind']
}

/** Remove an artifact from a workspace's library. */
export interface DeleteArtifactInput {
  workspaceId: string
  artifactId: string
}

/** Shape of the create-workspace form. A `type` (not `interface`) so it stays
 *  assignable to `Record<string, unknown>` — what mantine-form-yup-resolver's
 *  resolver is typed against (mirrors projects' ProjectWizardValues). */
export type WorkspaceFormValues = {
  name: string
  description: string
  colorSeed: string
}

// ── Raw API shapes (mapped to the UI types above at the boundary) ──────────

export interface IWorkspaceMember {
  userId: string
  name: string
  email?: string
  role: Role
  colorSeed?: string
}

export interface IWorkspaceArtifact {
  id: string
  name: string
  kind: 'doc' | 'sheet' | 'file'
  updatedDate?: string
  snippet?: string
  source?: string
}

export interface IWorkspace {
  id: number | string
  workspaceName: string
  workspaceDescription?: string
  colorSeed?: string
  instructions?: string
  createdBy?: string
  createdById?: string
  createdDate?: string
  updatedDate?: string
  members?: IWorkspaceMember[]
  artifacts?: IWorkspaceArtifact[]
}

/** Pagination / search payload for the workspace list (POST body). */
export interface IWorkspacesListRequest {
  pageNumber?: number
  pageSize?: number
  q?: string
}

/** A federation-project-type tag + count shown on a workspace list row. The view
 *  resolves the display label from the key (presentation stays out of the data). */
export interface WorkspaceTypeCount {
  projectType: string
  count: number
}

/** A workspace list row: the entity plus derived counts the list view renders
 *  (computed server-side / by the mock to avoid an N+1 over projects). */
export interface WorkspaceListItem extends Workspace {
  projectCount: number
  typeCounts: WorkspaceTypeCount[]
}

/** Raw list row — IWorkspace plus the derived counts. */
export interface IWorkspaceListItem extends IWorkspace {
  projectCount: number
  typeCounts: WorkspaceTypeCount[]
}

/** Paginated list envelope returned by POST /workspaces-list. */
export interface IWorkspacesListResponse {
  workspaces: IWorkspaceListItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/** UI-side paginated result: mapped list rows + pagination meta. */
export interface PaginatedWorkspaces {
  workspaces: WorkspaceListItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/** Raw response from POST /workspaces (create). */
export interface WorkspaceApiResponse {
  result: {
    workspaceId: number | string
  }
}

/** Normalised create result consumed by the UI. */
export interface CreateWorkspaceResult {
  workspaceId: string
}
