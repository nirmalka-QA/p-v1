export const ROUTES = {
  login: '/login',
  // Workspaces are the app entry point: the list, the (admin) global dashboard,
  // and a single workspace's home. Projects live INSIDE a workspace but keep a
  // flat URL (the remote basePath stays /projects/:projectId — ADR: flat routing).
  workspaces: '/workspaces',
  globalDashboard: '/dashboard',
  admin: '/admin',
  profile: '/profile',
  workspace:      (id: string) => `/workspaces/${id}`,
  projects: '/projects',
  projectNew: '/projects/new',
  project:        (id: string) => `/projects/${id}`,
  discovery:      (id: string) => `/projects/${id}/discovery`,
  planning:       (id: string) => `/projects/${id}/planning`,
  features:       (id: string) => `/projects/${id}/features`,
  implementation: (id: string) => `/projects/${id}/implementation`,
  test:           (id: string) => `/projects/${id}/test`,
} as const

// The host opens a project's settings by setting this search param; the mounted
// remote owns the settings modal and listens for it. Shared so the host and
// every remote agree on one key (and the default section) without coupling.
export const SETTINGS_PARAM = 'settings'
export const SETTINGS_GENERAL = 'general'

// Sections of the project settings modal (the modal is remote-owned). The host's
// project dropdown deep-links to one via `?settings=<section>`; the remote renders it.
// Shared here so host and remote agree on the keys without coupling to each other.
export const SETTINGS_SECTIONS = {
  general: SETTINGS_GENERAL,
  details: 'details',
  members: 'members',
  instructions: 'instructions',
  integrations: 'integrations',
  connectors: 'connectors',
} as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[keyof typeof SETTINGS_SECTIONS]

// Route patterns for <Route path> definitions (relative segments under /projects/:projectId)
export const ROUTE_PATTERNS = {
  login: '/login',
  workspaces: 'workspaces',
  globalDashboard: 'dashboard',
  admin: 'admin',
  profile: 'profile',
  workspaceDetail: 'workspaces/:workspaceId',
  projects: 'projects',
  projectNew: 'projects/new',
  projectDetail: 'projects/:projectId',
  discovery: 'discovery',
  planning: 'planning',
  features: 'features',
  implementation: 'implementation',
  test: 'test',
} as const
