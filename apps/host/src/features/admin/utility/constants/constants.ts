import type { Role } from '@wispr/contracts'
import type { AdminUserStatus } from '../models/model'

/**
 * Admin console module keys. The active module is carried in the URL via
 * `?section=` so it survives reload / deep-link / back-forward (mirrors the
 * workspace home's `?view=` and the project settings' `?settings=` params).
 */
export const ADMIN_SECTION_PARAM = 'section'

/**
 * Sub-route within the Project-type registry tab: which project type the admin
 * has drilled into (e.g. `ptype=strategy` → the Strategy template manager).
 * Carried in the URL so the manager survives reload / deep-link / back.
 */
export const REGISTRY_TYPE_PARAM = 'ptype'

export const ADMIN_SECTIONS = {
  users: 'users',
  audit: 'audit',
  governance: 'governance',
  registry: 'registry',
} as const

export type AdminSection = (typeof ADMIN_SECTIONS)[keyof typeof ADMIN_SECTIONS]

/** Ordered module definitions driving the console nav. `comingSoon` modules are stubbed. */
export interface AdminModule {
  key: AdminSection
  label: string
  description: string
  comingSoon: boolean
}

export const ADMIN_MODULES: AdminModule[] = [
  {
    key: ADMIN_SECTIONS.users,
    label: 'Users & roles',
    description: 'Everyone with access across all workspaces. Grant platform-admin, deactivate accounts, or force sign-out.',
    comingSoon: false,
  },
  {
    key: ADMIN_SECTIONS.audit,
    label: 'Audit log',
    description: 'A trail of gate approvals, role changes, deletions, and AI runs across the platform.',
    comingSoon: true,
  },
  {
    key: ADMIN_SECTIONS.governance,
    label: 'Workspace governance',
    description: 'Every workspace in one place: quotas, ownership transfer, and archival.',
    comingSoon: true,
  },
  {
    key: ADMIN_SECTIONS.registry,
    label: 'Project-type registry',
    description: 'Configure the project types available across the organisation. Open Strategy to author templates, phases, and the documents each phase generates.',
    comingSoon: false,
  },
]

/** Human labels for account status — used by the status badge. */
export const USER_STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: 'Active',
  deactivated: 'Deactivated',
}

/** Mantine colour per status (badge) — token-driven, never a hex value. */
export const USER_STATUS_COLOR: Record<AdminUserStatus, string> = {
  active: 'teal',
  deactivated: 'gray',
}

/** Human labels for workspace-scoped roles shown as chips on a user row. */
export const WORKSPACE_ROLE_LABEL: Record<Role, string> = {
  platformAdmin: 'Platform Admin',
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}
