import type { Role } from '@wispr/contracts'
import type { Project } from '@wispr/projects'
import { WORKSPACE_AVATAR_COLORS } from '../constants/constants'
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceArtifact,
  CreateWorkspaceInput,
  IWorkspace,
  IWorkspaceMember,
} from '../models/model'

/** Deterministic Mantine color name from a seed (id/name) — mirrors projectColor. */
export function workspaceColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return WORKSPACE_AVATAR_COLORS[hash % WORKSPACE_AVATAR_COLORS.length] ?? 'indigo'
}

/** Member avatar color — same deterministic mapping, seeded by the member name. */
export function memberColor(seed: string): string {
  return workspaceColor(seed)
}

/** Two-letter initials for a workspace/member avatar. */
export function workspaceInitials(name: string): string {
  const words = name.split(/[\s\-–—]+/).filter(Boolean)
  const first = words[0] ?? ''
  if (words.length === 1) return first.slice(0, 2).toUpperCase()
  const second = words[1] ?? ''
  return ((first[0] ?? '') + (second[0] ?? '')).toUpperCase()
}

/** Maps a raw API member to the UI WorkspaceMember (derives initials + color seed). */
function mapMember(dto: IWorkspaceMember): WorkspaceMember {
  return {
    userId: dto.userId,
    name: dto.name,
    ...(dto.email ? { email: dto.email } : {}),
    role: dto.role,
    initials: workspaceInitials(dto.name),
    // Fall back to a deterministic palette colour (a valid Mantine colour name) —
    // never the raw name, which renders a filled Avatar white/invisible in light mode.
    colorSeed: dto.colorSeed ?? memberColor(dto.name),
  }
}

/** Maps a raw API workspace (IWorkspace) to the UI `Workspace`. */
export function mapWorkspace(dto: IWorkspace): Workspace {
  const id = String(dto.id)
  return {
    id,
    name: dto.workspaceName,
    description: dto.workspaceDescription ?? '',
    // colorSeed is always a Mantine palette name (chosen, or derived from the id).
    colorSeed: dto.colorSeed ?? workspaceColor(id),
    instructions: dto.instructions ?? '',
    createdBy: dto.createdBy ?? '',
    createdById: dto.createdById ?? '',
    createdAt: dto.createdDate ?? '',
    updatedAt: dto.updatedDate ?? dto.createdDate ?? '',
    members: (dto.members ?? []).map(mapMember),
    artifacts: (dto.artifacts ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      updatedAt: a.updatedDate ?? '',
      ...(a.snippet ? { snippet: a.snippet } : {}),
      ...(a.source ? { source: a.source } : {}),
    })),
  }
}

/** Builds the create-workspace request body in the API's field names. */
export function toCreateWorkspaceBody(input: CreateWorkspaceInput): Record<string, unknown> {
  return {
    workspaceName: input.name,
    workspaceDescription: input.description ?? '',
    colorSeed: input.colorSeed,
  }
}

/** The role a user holds in a workspace, or null if they are not a member. */
export function workspaceRoleOf(ws: Workspace, userId: string): Role | null {
  return ws.members.find((m) => m.userId === userId)?.role ?? null
}

/** Owners and admins see every project in the workspace; members/viewers see only assigned ones. */
export function canSeeAllProjects(ws: Workspace, userId: string): boolean {
  const role = workspaceRoleOf(ws, userId)
  return role === 'owner' || role === 'admin'
}

/** Workspaces sorted by most recently updated first. */
export function sortByUpdatedDesc(workspaces: Workspace[]): Workspace[] {
  return [...workspaces].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

/** Stable string hash (FNV-like) — shared by the deterministic helpers below. */
function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}

/** Delivery-health buckets (mirror the global dashboard's health tallies). */
export type ProjectHealth = 'onTrack' | 'atRisk' | 'onHold'

/**
 * Deterministic, weighted health for a project (~60% on track, ~25% at risk, ~15%
 * on hold). Projects carry no health field yet; this synthesises one stably per id so
 * the dashboards stay consistent across reloads. The single source for both the
 * per-workspace dashboard and the global dashboard mock.
 */
export function projectHealthBucket(projectId: string): ProjectHealth {
  const n = hash(projectId) % 20
  if (n < 12) return 'onTrack'
  if (n < 17) return 'atRisk'
  return 'onHold'
}

/**
 * Whether a project is "assigned to" a member — the seam for role-scoped visibility.
 * Phase 1 has no per-project membership, so this is simulated deterministically per
 * (project, member) pair; owners/admins bypass it (they see every project). It keeps
 * the "view as" simulation meaningful until real assignment data exists.
 */
export function isProjectAssignedTo(projectId: string, userId: string): boolean {
  return hash(`${projectId}:${userId}`) % 2 === 0
}

/**
 * The projects a member can see in a workspace: owners/admins see all; members/viewers
 * see only their assigned subset. Drives the dashboard "view as" role simulation.
 */
export function projectsVisibleTo(
  ws: Workspace,
  projects: Project[],
  userId: string,
): Project[] {
  if (canSeeAllProjects(ws, userId)) return projects
  return projects.filter((p) => isProjectAssignedTo(p.id, userId))
}

/** Infers an artifact kind from a file name's extension (doc / sheet / file). */
export function artifactKind(name: string): WorkspaceArtifact['kind'] {
  const ext = (name.split('.').pop() ?? '').toLowerCase()
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (['doc', 'docx', 'pdf', 'txt', 'md', 'rtf'].includes(ext)) return 'doc'
  return 'file'
}
