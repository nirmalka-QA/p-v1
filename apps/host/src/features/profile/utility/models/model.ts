// User-profile types + API DTOs. Host-only (the profile is a global/auth surface
// reached from the top-bar profile menu; remotes contribute nothing here). Identity
// (name/email/role) is authoritative from the OIDC token/session; the directory
// fields (designation/domain/reporting manager) come from the profile API.
import type { Role } from '@wispr/contracts'

/** The user's reporting manager (directory / HR data). */
export interface ReportingManager {
  name: string
  designation?: string
  email?: string
}

/** Basic profile details — identity + directory fields. */
export interface UserProfileDetails {
  id: string
  name: string
  email: string
  /** Profile picture URL (a data URL in mock mode). Falls back to initials when absent. */
  avatarUrl?: string
  /** Job title, e.g. "Senior Software Engineer". */
  designation: string
  /** Business domain / department, e.g. "Product Engineering". */
  domain: string
  /** Platform role. */
  role: Role
  reportingManager?: ReportingManager
}

/** Profile details prepared for the view (adds avatar initials + colour). */
export interface UserProfileView extends UserProfileDetails {
  initials: string
  /** Mantine palette name for the avatar — never a hex value. */
  avatarColor: string
}

/** Whether the user's involvement in a project is ongoing or finished. */
export type ProfileProjectStatus = 'active' | 'closed'

/** One project the user has worked on. */
export interface ProfileProject {
  id: string
  name: string
  workspaceName: string
  /** The user's role on the project, e.g. "Developer". */
  projectRole: string
  status: ProfileProjectStatus
  /** ISO date the user started on the project. */
  startedDate: string
}

/** The user's project history + status counts (counts are over the full set). */
export interface ProfileProjects {
  projects: ProfileProject[]
  totalCount: number
  activeCount: number
  closedCount: number
}

/** Standard API envelope — every response wraps its payload in `result`. */
export interface ApiEnvelope<T> {
  result: T
  errors?: unknown
}
