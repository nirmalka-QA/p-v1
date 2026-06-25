import type { Role } from '@wispr/contracts'
import type { WorkspaceFormValues } from '../models/model'

/**
 * Mantine theme color names used as deterministic workspace/member avatar
 * backgrounds. Never store hex — these resolve to `--mantine-color-<name>-*`.
 */
export const WORKSPACE_AVATAR_COLORS = [
  'indigo',
  'teal',
  'orange',
  'pink',
  'grape',
  'cyan',
] as const

export type WorkspaceColor = (typeof WORKSPACE_AVATAR_COLORS)[number]

/** Roles that can be assigned to a workspace member (platformAdmin is platform-level). */
export const WORKSPACE_ROLES: Role[] = ['owner', 'admin', 'member', 'viewer']

/** Display label per workspace-assignable role. */
export const WORKSPACE_ROLE_LABEL: Record<Role, string> = {
  platformAdmin: 'Platform Admin',
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

/** Max length for a workspace name. */
export const WORKSPACE_NAME_MAX = 80

/** Initial values for the create-workspace form. */
export const WORKSPACE_FORM_INITIAL: WorkspaceFormValues = {
  name: '',
  description: '',
  colorSeed: WORKSPACE_AVATAR_COLORS[0],
}

/**
 * The workspace-home main view, carried in the `?view=` search param so the TopBar
 * nav (above the routed outlet) and the page stay in lock-step and the view is
 * deep-linkable. Projects is the default when the param is absent. Members is NOT a
 * view — the Members nav item opens the settings modal's People tab (prototype parity).
 */
export const WS_VIEW_PARAM = 'view'
export const WS_VIEWS = {
  projects: 'projects',
  dashboard: 'dashboard',
} as const
export type WsView = (typeof WS_VIEWS)[keyof typeof WS_VIEWS]

/** Whether a string is a valid workspace view (falls back to Projects otherwise). */
export function toWsView(value: string | null): WsView {
  return value === WS_VIEWS.dashboard ? value : WS_VIEWS.projects
}

/**
 * Settings-modal tab ids (the `?settings=` value). Named so nav/links never hardcode
 * the strings — e.g. the Members nav item deep-links straight to `people`.
 */
export const WS_SETTINGS = {
  general: 'general',
  instructions: 'instructions',
  people: 'people',
  danger: 'danger',
} as const
export type WsSettingsTab = (typeof WS_SETTINGS)[keyof typeof WS_SETTINGS]

/** Tabs of the workspace settings modal (opened via the shared `?settings=` param). */
export const WS_SETTINGS_TABS = [
  { value: WS_SETTINGS.general, label: 'General' },
  { value: WS_SETTINGS.instructions, label: 'Instructions' },
  { value: WS_SETTINGS.people, label: 'People & Roles' },
  { value: WS_SETTINGS.danger, label: 'Danger zone' },
] as const

/** Narrows the `?settings=` value to a valid settings tab (or null if not one). */
export function toWsSettingsTab(value: string | null): WsSettingsTab | null {
  return WS_SETTINGS_TABS.some((t) => t.value === value) ? (value as WsSettingsTab) : null
}
