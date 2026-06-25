// Platform-admin console types + API DTOs. Host-only domain (the admin console is
// platformAdmin-gated and never mounted in a remote). A "user" here is aggregated
// across every workspace's membership plus platform-level attributes (platform-admin
// flag + account status) that workspaces themselves don't carry.
import type { Role } from '@wispr/contracts'

/** Account status — a deactivated user keeps their data but cannot sign in. */
export type AdminUserStatus = 'active' | 'deactivated'

/** A platform user as the admin console renders it (mapped from IAdminUser). */
export interface AdminUser {
  userId: string
  name: string
  email?: string
  /** Two-letter initials for the avatar (derived via userInitials). */
  initials: string
  /** Mantine palette name for the avatar — never a hex value. */
  colorSeed: string
  /** Whether the user holds the platform-wide admin role. */
  isPlatformAdmin: boolean
  status: AdminUserStatus
  /** How many workspaces the user belongs to. */
  workspaceCount: number
  /** Distinct workspace-scoped roles held across all workspaces. */
  workspaceRoles: Role[]
}

/** Standard API envelope — every response wraps its payload in `result`. */
export interface ApiEnvelope<T> {
  result: T
  errors?: unknown
}

/** Change whether a user holds the platform-admin role. */
export interface SetPlatformAdminInput {
  userId: string
  isPlatformAdmin: boolean
}

/** Activate or deactivate a user's account. */
export interface SetUserStatusInput {
  userId: string
  status: AdminUserStatus
}

// ── Raw API shapes (mapped to the UI types above at the boundary) ──────────

export interface IAdminUser {
  userId: string
  name: string
  email?: string
  colorSeed?: string
  isPlatformAdmin: boolean
  status: AdminUserStatus
  workspaceCount: number
  workspaceRoles: Role[]
}

/** Response from GET admin/users. */
export interface IAdminUsersResponse {
  users: IAdminUser[]
  totalCount: number
}

/** UI-side users result: mapped rows + total. */
export interface AdminUsers {
  users: AdminUser[]
  totalCount: number
}
