import { z } from 'zod'

/**
 * @wispr/contracts — the single source of truth for the shell ↔ remote
 * agreement. Zod schemas double as runtime validators and the origin of the
 * inferred TypeScript types, so the host and every remote share one definition
 * of a Project, User, and the props a remote is mounted with.
 *
 * This package is published + semver'd: a remote builds against a contract
 * version and advertises it; the host checks compatibility on load.
 */

// ── Domain primitives ────────────────────────────────────────────────────
export const Role = z.enum(['platformAdmin', 'owner', 'admin', 'member', 'viewer'])

export const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  roles: z.array(Role),
})

export const WorkspaceRef = z.object({
  id: z.string(),
  name: z.string(),
})

/** Project types — one federated remote per value. Keep in lockstep with the apps/ dirs. */
export const ProjectType = z.enum([
  'custom-app',
  'data-pipeline',
  'analytics-bi',
  'sap',
  'guidewire',
  'strategy',
  'testing',
])

export const Project = z.object({
  id: z.string(),
  name: z.string(),
  type: ProjectType,
  workspaceId: z.string(),
})

export type Role = z.infer<typeof Role>
export type User = z.infer<typeof User>
export type WorkspaceRef = z.infer<typeof WorkspaceRef>
export type ProjectType = z.infer<typeof ProjectType>
export type Project = z.infer<typeof Project>

/** A permission string, e.g. `story:approve`. RBAC is resolved in the host. */
export type Permission = string

/**
 * Semver of THIS contract. Each remote advertises the version it was built
 * against in its mf-manifest metadata; the host checks compatibility on load
 * and renders a graceful fallback on mismatch instead of crashing.
 */
export const CONTRACT_VERSION = '1.0.0'

// ── Cross-cutting services injected by the host ──────────────────────────
export interface NotifyService {
  show(o: { title?: string; message: string; type?: 'info' | 'success' | 'error' }): void
}

export interface FlagService {
  isEnabled(key: string): boolean
}

export interface TelemetryService {
  track(event: string, props?: Record<string, unknown>): void
}

/**
 * The bag of host-owned singletons handed to a remote. `api` is the shared RTK
 * Query api ref (typed concretely in @wispr/services) — kept `unknown` here so
 * contracts stays runtime-light and free of a services dependency.
 */
export interface Services {
  api: unknown
  notify: NotifyService
  flags: FlagService
  telemetry: TelemetryService
}

/** Minimal typed pub/sub for host↔remote signals (auth:logout, theme-change, …). */
export type EventHandler = (payload?: unknown) => void
export interface EventBus {
  on(event: string, handler: EventHandler): void
  off(event: string, handler: EventHandler): void
  emit(event: string, payload?: unknown): void
}

/**
 * The contract a remote's default-exported `ProjectApp` is mounted with. The
 * host owns the router, store, theme and services; the remote receives a slice
 * of context read-only and navigates out via `onNavigate`.
 */
export interface ProjectAppProps {
  contractVersion: string
  projectId: string
  workspace: WorkspaceRef
  user: User
  can: (perm: Permission) => boolean
  theme: 'light' | 'dark'
  basePath: string
  services: Services
  onNavigate: (path: string) => void
  eventBus: EventBus
}

/** The shape every remote's federated entry must satisfy. */
export type ProjectAppComponent = (props: ProjectAppProps) => unknown

// Backend REST contract — endpoint paths + RTK Query cache tag types. Shared by
// every feature's api so the host and remotes hit one consistent surface.
export * from './api'

// App route paths/patterns — shared so the host and remotes navigate via one
// source of truth (the project workspace lives under /projects/:projectId).
export * from './routes'

// Async-operation wire types (Phase 10 / ADR-0072) — SkillOperation + progress events for useOperation/OperationProgress.
export * from './operations'
