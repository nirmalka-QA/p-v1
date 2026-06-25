# WISPR — Workspace Feature Plan

> **Status:** Approved for build — Phase 1 (core) scope locked.
> **Author:** Planning pass, 2026-06-13.
> **Reference prototype:** [`docs/wispr-prototype.html`](./wispr-prototype.html) — Screens 0 (Workspaces), 0b (Global Dashboard), 1 (Workspace Home).
> **Architecture rules:** [`CLAUDE.md`](../CLAUDE.md) (monorepo, federation, conventions) — this plan obeys all of them.

This document is the single source of truth for the **workspace feature**. It covers the
flow, data model, API contract, state, file layout, per-screen specs, acceptance criteria,
and an ordered task list for implementation. Project-detail (remote) internals are **out of
scope here** — they are the separate "project feature" workstream that follows.

---

## 1. Why this exists / the new mental model

Today the app opens straight onto a flat **project list** (`/projects`). The new model
introduces a container above projects:

```
Platform
 └─ Workspace            (groups related projects; shares context, instructions, artifacts, members)
     └─ Project          (one SDLC delivery; type-specific remote owns the phase rail)
         └─ Phases…      (remote-owned — NOT this plan)
```

**A project always belongs to exactly one workspace.** A workspace is the unit of:
- **Grouping** — related projects live together (e.g. "Meridian Financial").
- **Shared context** — workspace-level AI instructions + an artifact library every project can draw on.
- **Membership & access** — who can see/do what, with roles scoped to the workspace.

The **host owns** the workspace list, workspace creation, the global (admin) dashboard, the
in-workspace project list, project creation, and the top bar. The **remotes own** only
project detail (the phase rail and everything below it).

---

## 2. Scope

### 2.1 In scope — Phase 1 (the explicitly requested core)

| # | Capability | Surface |
|---|---|---|
| 1 | **Workspace list** — table of workspaces (entry point of the app) | Host page `/workspaces` |
| 2 | **Create workspace** — modal/drawer; name, description, colour | Host, from the list |
| 3 | **Global dashboard** — org-wide admin KPIs across all workspaces | Host page `/dashboard` (admin-gated) |
| 4 | **Context-aware top-bar navigation** for the workspace-list context (Dashboard ⁄ Workspaces nav, profile, theme, help/support) | Host TopBar |
| 5 | **Open a workspace → its project list** (workspace home, Projects view) | Host page `/workspaces/:workspaceId` |
| 6 | **Project-list + create-project become workspace-scoped** (necessary impact — host already owns these) | Host, inside workspace home |

### 2.2 In scope — Phase 2 (workspace home, secondary tabs)

These are part of the prototype's Workspace Home screen but sit behind tabs/actions beyond
"open workspace → see projects". Build after Phase 1 is green.

| # | Capability |
|---|---|
| 7 | **Workspace dashboard tab** — per-workspace KPIs with "view as <member>" role simulation |
| 8 | **Members tab** — list workspace members, change roles, invite |
| 9 | **Settings modal** — General, Instructions (shared AI guidance), People & Roles, Danger zone (delete) |
| 10 | **Artifact library** — upload/list/preview workspace documents |
| 11 | **Workspace switcher** in the top bar (jump between workspaces without going back to the list) |

### 2.3 Out of scope (explicitly NOT this plan)

- Any change to **remote/project-detail internals** (phase rails, KB, planning, etc.).
- **Nested routing** (`/workspaces/:wsId/projects/:projectId/…`) and the related `basePath`/`ROUTES` signature changes — deferred to the project-feature workstream (see §4.3).
- A **workspace-scoped backend** rewrite — endpoints stay flat; workspace scoping is a request field/filter (see §6).
- Real-time collaboration, cross-workspace project moves UI, billing/quotas, audit log UI.

---

## 3. Information architecture & flow

```
                          ┌─────────────────────────────────────────┐
   (cold load / "/")  →   │  /workspaces   — WORKSPACE LIST          │  ← app entry
                          │  top nav: [Dashboard*]  [Workspaces]     │  (*admin only)
                          └───────┬───────────────────────┬─────────┘
                  open workspace  │                       │  Dashboard (admin)
                                  ▼                       ▼
        ┌───────────────────────────────────┐   ┌──────────────────────────────┐
        │ /workspaces/:wsId — WORKSPACE HOME │   │ /dashboard — GLOBAL DASHBOARD │
        │ ws switcher + nav:                 │   │ org-wide KPIs, by-type, health│
        │  [Dashboard][Projects][Members]    │   │ recent activity (read-only)   │
        │  [Settings]                        │   └──────────────────────────────┘
        │ default view = Projects list       │
        │ + Artifact library (aside)         │
        └───────────────┬───────────────────┘
                open project │  (unchanged remote mount)
                             ▼
        ┌───────────────────────────────────────────────┐
        │ /projects/:projectId/discovery … — REMOTE       │
        │ host top bar (project switcher + back-to-ws),  │
        │ remote owns phase rail + workspace chrome below│
        └───────────────────────────────────────────────┘
```

**Navigation rules**
- `/` redirects to `/workspaces` (was `/projects`).
- `/auth/callback` lands on `/workspaces` after OIDC.
- Brand click → `/workspaces` (home). Inside a project, brand/"back to workspace" → the project's workspace home `/workspaces/:wsId`.
- `/projects` (flat list) is **retired**: redirect `/projects` → `/workspaces`. The project list now lives inside a workspace.
- Deep-link to `/projects/:projectId/*` still works: `ProjectHost` resolves the project, reads `project.workspaceId`, and sets the active workspace in the store (see §7.2).

---

## 4. Routing model (DECIDED: Approach A — flat project URL)

### 4.1 Route table (host router — `apps/host/src/app/router.tsx`)

| Path | Element | Notes |
|---|---|---|
| `/` | `<Navigate to={ROUTES.workspaces} replace />` | entry redirect |
| `/auth/callback` | `<Navigate to={ROUTES.workspaces} replace />` | post-OIDC |
| `/workspaces` | `WorkspaceListPage` | the app's landing surface |
| `/dashboard` | `GlobalDashboardPage` | admin-gated (redirect non-admins to `/workspaces`) |
| `/workspaces/:workspaceId` | `WorkspaceHomePage` | projects list (+ Phase-2 tabs) |
| `/projects` | `<Navigate to={ROUTES.workspaces} replace />` | retired flat list |
| `/projects/new` | `WorkspaceHomePage` (or keep as drawer route) | create-project drawer; requires an active workspace — see §10 |
| `/projects/:projectId/*` | `ProjectHost` | **UNCHANGED** — remote basePath stays `/projects/:projectId` |

### 4.2 `ROUTES` / `ROUTE_PATTERNS` additions (`libs/contracts/src/routes.ts`)

Add (do **not** change existing project helpers — that's the deferred work):

```ts
export const ROUTES = {
  // … existing …
  workspaces: '/workspaces',
  globalDashboard: '/dashboard',
  workspace: (id: string) => `/workspaces/${id}`,
} as const

export const ROUTE_PATTERNS = {
  // … existing …
  workspaces: 'workspaces',
  globalDashboard: 'dashboard',
  workspaceDetail: 'workspaces/:workspaceId',
} as const
```

### 4.3 Explicitly deferred (do NOT do now)

- Changing `ROUTES.discovery(id)` → `ROUTES.discovery(wsId, id)` and friends.
- Changing the remote `basePath` to include the workspace.
These belong to the project-feature workstream and would touch the federation contract.

---

## 5. Data model

### 5.1 Where types live (HOST-ONLY — no new lib)

Decision (2026-06-13): workspace code lives **entirely in the host app**, not a `@wispr/*`
lib. Rationale: no remote consumes workspace data on the frontend — a remote only ever gets
the minimal `WorkspaceRef` via `ProjectAppProps.workspace`, and workspace **instructions /
artifacts are injected into AI context server-side**, never passed through the frontend. With
no cross-app consumer, a shared lib would be premature. We promote to `@wispr/workspaces`
**reactively** — only if real duplication appears after the end-to-end scaffold is working.

- **`@wispr/contracts`** keeps the minimal, federation-facing `WorkspaceRef` (`{ id, name }`) — **unchanged**, it's what the host passes into a remote. Do **not** bloat it. The shared `ROUTES` and `API_ENDPOINTS`/`API_TAGS` constants still gain the workspace entries (these constants are the app-wide single source the host already uses — `ROUTES.projects`/`projectNew` are host-only too).
- The rich `Workspace` entity, its API (injected on the shared `api`), mock, constants, helpers, validation, and hooks live under **`apps/host/src/features/workspaces/utility/`**, following the standard feature layout.

> Contrast with **`@wispr/projects`** (stays a lib): the `custom-app` remote imports it in 15+
> files (Discovery/Planning/Features pages, settings, phase hooks, the AI assistant panel). It
> is genuinely cross-app, so it remains a shared lib. Workspaces has no such consumer.

### 5.2 The `Workspace` entity (`apps/host/src/features/workspaces/utility/models/model.ts`)

```ts
import type { Role } from '@wispr/contracts'

/** A workspace member with a workspace-scoped role. */
export interface WorkspaceMember {
  userId: string
  name: string
  email?: string
  role: Role            // 'owner' | 'admin' | 'member' | 'viewer' (platformAdmin is platform-level, not stored here)
  initials: string      // derived (helper)
  colorSeed: string     // → Mantine palette name via memberColor()
}

/** A document attached to the workspace (Phase 2). */
export interface WorkspaceArtifact {
  id: string
  name: string
  kind: 'doc' | 'sheet' | 'file'
  updatedAt: string
  snippet?: string
  source?: string       // e.g. 'Uploaded' or a source project name
}

export interface Workspace {
  id: string
  name: string
  description: string
  colorSeed: string             // deterministic Mantine color via workspaceColor()
  instructions: string          // shared AI guidance (Phase 2 — Settings › Instructions)
  createdBy: string             // display name of creator
  createdById: string
  createdAt: string
  updatedAt: string
  members: WorkspaceMember[]
  artifacts: WorkspaceArtifact[]
}

/** Create payload (creator becomes Owner server-side). */
export interface CreateWorkspaceInput {
  name: string
  description?: string
  colorSeed: string
}

/** Raw API shape (mapped to Workspace at the boundary, mirroring mapProject). */
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
// (IWorkspaceMember / IWorkspaceArtifact: raw counterparts — define alongside.)

/** Standard envelope, identical to projects. */
export interface ApiEnvelope<T> { result: T; errors?: unknown }
```

> **Colour rule (CLAUDE.md):** never store hex. `colorSeed` resolves to a **Mantine palette
> name** (`indigo`, `teal`, …) via a `workspaceColor(seed)` helper, exactly like
> `projectColor(id)`. The create-form colour picker offers the Mantine palette set, not raw hex.

### 5.3 Roles & visibility (mirror the prototype, mapped to the contracts `Role` enum)

`Role` already exists in contracts: `platformAdmin | owner | admin | member | viewer`.

| Capability | Rule |
|---|---|
| See the **Global Dashboard** + nav entry | `session.user.roles` includes `platformAdmin` |
| See **all projects** in a workspace | workspace role is `owner` or `admin` |
| See **only assigned projects** | workspace role is `member` or `viewer` (assigned = listed on the project's members) |
| Edit workspace **settings / members / delete** | `owner` (delete) / `owner`+`admin` (settings, invite) — Phase 2 |

Helpers (`apps/host/src/features/workspaces/utility/helpers/helpers.ts`), ported from the
prototype's `wsRoleOf` / `canSeeAllProjects` / `projectsVisibleTo`:

```ts
export function workspaceRoleOf(ws: Workspace, userId: string): Role | null
export function canSeeAllProjects(ws: Workspace, userId: string): boolean   // owner|admin
export function isPlatformAdmin(user: User): boolean                        // roles.includes('platformAdmin')
```

> **Project visibility filtering** lives where the project list is rendered (workspace home),
> using `canSeeAllProjects` + the project's member list. For Phase 1 the dev/admin user sees
> all; the filter is wired so Phase 2 role simulation ("view as") works without rework.

---

## 6. API contract (mock-first)

There is **no workspace backend yet**. Build against the **mock server** (`VITE_USE_MOCKS=true`,
the `registerMockRoutes` pattern), serving the same `{ result }` envelope the Function API uses,
backed by localStorage — identical to `projectsMock.ts`. Endpoints are flat (Approach A);
workspace scoping for projects is a **request field**, not a URL segment.

### 6.1 `API_TAGS` additions (`libs/contracts/src/api.ts`)

```ts
Workspace: 'Workspace',
WorkspaceMember: 'WorkspaceMember',
Artifact: 'Artifact',
Dashboard: 'Dashboard',
```

### 6.2 `API_ENDPOINTS` additions (`libs/contracts/src/api.ts`)

```ts
// Workspaces
workspacesList:   'workspaces-list',                       // POST (paginated/searchable list)
workspaces:       'workspaces',                            // POST (create)
workspace:        (id: string) => `workspaces/${id}`,      // GET / PATCH / DELETE
workspaceMembers: (id: string) => `workspaces/${id}/members`,            // GET / POST(invite)
workspaceMember:  (id: string, memberId: string) => `workspaces/${id}/members/${memberId}`, // PATCH(role) / DELETE
workspaceArtifacts: (id: string) => `workspaces/${id}/artifacts`,        // GET / POST(upload)
workspaceArtifact:  (id: string, artifactId: string) => `workspaces/${id}/artifacts/${artifactId}`, // DELETE

// Global (admin) dashboard
dashboardStats:   'dashboard/stats',                       // GET (org-wide aggregates)
```

### 6.3 Project endpoints — workspace scoping (impact)

- `projects-list` request body gains optional **`workspaceId`** (filter). The workspace home
  always passes it; the retired global list is gone.
- `createProject` body gains **`workspaceId`** (required when created inside a workspace).
- `getProject` response carries **`workspaceId`** (so `ProjectHost` can resolve the workspace on a cold deep-link — it already reads `project.workspaceId`).

### 6.4 RTK Query — `workspacesApi` (`apps/host/src/features/workspaces/utility/services/services.ts`)

Inject into the **shared `api` from `@wispr/services`** (one cache) via `injectEndpoints` —
exactly like `projectsApi` does, just defined in the host feature instead of a lib. Use
`axiosBaseQuery` (never `fetchBaseQuery`), tags from `API_TAGS`, paths from `API_ENDPOINTS`,
normalise via a `mapWorkspace` boundary mapper.

| Hook | Endpoint | Tags |
|---|---|---|
| `useGetWorkspacesQuery` | POST `workspaces-list` | provides `Workspace` (per id + LIST) |
| `useGetWorkspaceQuery` | GET `workspaces/:id` | provides `Workspace`(id) |
| `useCreateWorkspaceMutation` | POST `workspaces` | invalidates `Workspace`(LIST) |
| `useUpdateWorkspaceMutation` (P2) | PATCH `workspaces/:id` | invalidates `Workspace`(id, LIST) |
| `useDeleteWorkspaceMutation` (P2) | DELETE `workspaces/:id` | invalidates `Workspace`(LIST) + `Project`(LIST) |
| `useGetDashboardStatsQuery` | GET `dashboard/stats` | provides `Dashboard`(LIST) |
| members/artifacts hooks (P2) | per §6.2 | `WorkspaceMember` / `Artifact` |

### 6.5 Dashboard stats payload (`/dashboard/stats`)

```ts
export interface DashboardStats {
  workspaceCount: number
  projectCount: number
  peopleCount: number
  artifactCount: number
  projectsByType: Array<{ type: ProjectType; label: string; count: number }>
  health: { onTrack: number; atRisk: number; onHold: number }
  recentActivity: Array<{ projectId: string; projectName: string; workspaceName: string; phase: string; updatedAt: string }>
}
```

> The mock computes these from the workspaces + projects stores so the numbers stay consistent
> with what the lists show.

---

## 7. State management

### 7.1 Existing `workspaceSlice` (`libs/store/src/slices/workspaceSlice.ts`) — reuse, don't replace

It already holds `{ activeWorkspaceId, workspaces: WorkspaceRef[] }` and exposes
`setWorkspaces` / `setActiveWorkspace`. The slice stays the **federation-facing** truth (what
`ProjectHost` reads to build the remote's `workspace` prop). Keep `workspaces` as
`WorkspaceRef[]` (minimal); the rich `Workspace[]` lives in the RTK Query cache, not the slice.

**Wiring:**
- When `useGetWorkspacesQuery` resolves, dispatch `setWorkspaces(workspaces.map(toRef))` so the
  remote contract always has names available. (Do this in a small effect in the host shell or
  `WorkspaceListPage`.)
- Opening a workspace dispatches `setActiveWorkspace(id)`.

### 7.2 Active-workspace resolution (cold deep-link to a project)

`ProjectHost` already does the right thing (`ProjectHost.tsx:90`): it falls back to
`{ id: project.workspaceId, name: 'Default workspace' }`. Improve it so the name is real:
1. Ensure `getProject` returns `workspaceId`.
2. In `ProjectHost` (or a small host hook), when `activeWorkspaceId !== project.workspaceId`,
   dispatch `setActiveWorkspace(project.workspaceId)` and ensure the workspace list is loaded
   (so the ref carries the real name). No remote change required.

### 7.3 UI-only state

Search text, active home tab (`projects` | `dashboard`), settings-modal tab, and "view as"
selection are **local component state / feature slices** — never in the API cache. Follow the
existing `features/<feature>/utility/slices/` convention if any of it needs to survive
navigation; otherwise `useState`.

---

## 8. Code structure / file layout

### 8.1 Host feature layout (everything lives in the host)

Both the domain layer and the UI live under `apps/host/src/features/`, following the standard
feature structure from CLAUDE.md (`utility/{models,services,slices,helpers,constants,validations,hooks}`).
The API endpoints still `injectEndpoints` on the **shared `api` from `@wispr/services`** — that
singleton is shared regardless of where the injection is defined, so there's one cache.

```
apps/host/src/features/
  workspaces/
    WorkspaceListPage.tsx                 # /workspaces — table + search + "New workspace"
    WorkspaceListPage.module.css
    WorkspaceHomePage.tsx                 # /workspaces/:workspaceId — tabs host; default Projects view
    WorkspaceHomePage.module.css
    components/
      WorkspaceTable/                      # the list table (rows → openWorkspace)
        WorkspaceTable.tsx
        WorkspaceTable.module.css
      WorkspaceCreateForm/                 # create modal/drawer body (useForm + WorkspaceFields)
        WorkspaceCreateForm.tsx
      WorkspaceFields/                      # reusable name/description/colour fields (create + P2 settings)
        WorkspaceFields.tsx
        WorkspaceFields.module.css
      WorkspaceProjectsView/                # in-workspace project list (search + type filter + grid)
        WorkspaceProjectsView.tsx
        WorkspaceProjectsView.module.css
      # ── Phase 2 ──
      WorkspaceDashboardView/               # per-workspace KPIs + "view as"
      WorkspaceMembersView/
      WorkspaceSettingsModal/
      ArtifactLibrary/
    utility/
      models/      model.ts                 # Workspace, WorkspaceMember, WorkspaceArtifact, DTOs, DashboardStats
      constants/   constants.ts             # WORKSPACE_AVATAR_COLORS, role labels, create-form initial values
      helpers/     helpers.ts               # mapWorkspace, toCreateWorkspaceBody, workspaceColor, workspaceInitials,
                                            #   workspaceRoleOf, canSeeAllProjects, isPlatformAdmin, sortByUpdatedDesc
      services/    services.ts              # workspacesApi — injectEndpoints on the shared api (list/get/create [+P2])
                   mocks/workspacesMock.ts  # registerWorkspacesMockRoutes — localStorage, {result} envelope, seed
      validations/ validation.ts            # Yup schema for the create-workspace form
      hooks/       useActiveWorkspace.ts     # reads workspaceSlice + RTK cache → the active Workspace (rich)
                   useWorkspaceProjects.ts   # visibility-filtered project list for a workspace
  global-dashboard/
    GlobalDashboardPage.tsx                 # /dashboard — admin-gated org KPIs
    GlobalDashboardPage.module.css
    components/
      KpiRow/  TypeBars/  HealthCells/  RecentActivity/   # one folder per component
    utility/
      services/    services.ts              # dashboardApi (useGetDashboardStatsQuery) — or fold into workspaces services
                   mocks/dashboardMock.ts    # computes org-wide stats from the workspace + project stores
```

> Register the workspace mock in the host boot alongside `registerProjectsMockRoutes()` (gated
> by `useMocks`). No `@wispr/*` alias, no `tools/mf/shared.ts` pin, no lib `project.json` — none
> of that applies because there's no lib.

### 8.2 What this replaces

> The existing **`features/workspaces/Workspaces.tsx` stub is replaced** by `WorkspaceListPage`.
> The existing **`features/projects/ProjectsPage.tsx`** logic (list + create drawer) is **moved
> into** `WorkspaceProjectsView` and scoped by `workspaceId` (see §10). Keep `ProjectCard`,
> `ProjectCreateForm`, and the create drawer; they're reused. The `Project.workspaceId` field +
> the project-list/create scoping are added to the existing **`@wispr/projects` lib** (it stays
> a lib — the remote depends on it).

### 8.3 Top bar (`apps/host/src/components/layout/TopBar/`)

The host owns the top bar end-to-end (CLAUDE.md). It becomes **context-aware** by route. Split
into small presentational pieces to keep one-job-per-file:

```
TopBar/
  TopBar.tsx                 # orchestrator: picks the nav variant by route
  TopBarNav.tsx              # the [Dashboard][Workspaces] segmented nav (workspace-list context)
  WorkspaceHomeNav.tsx       # the [Dashboard][Projects][Members][Settings] tabs (in a workspace)  (P2 for tabs)
  ProfileMenu.tsx            # avatar dropdown (extracted; reused across contexts)
  TopBar.module.css
```

---

## 9. Detailed screen specs

> **Component & styling discipline (CLAUDE.md):** Mantine components first (`Table`, `Box`,
> `Group`, `Stack`, `Text`, `Title`, `TextInput`, `Button`, `Avatar`, `Badge`, `Modal`/`Drawer`,
> `SegmentedControl`, `Select`). No raw HTML except a single CSS-module root wrapper. No inline
> styles, no hardcoded hex — Mantine props / theme tokens / `var(--cl-*)` only. Every async view
> needs **loading (Skeleton)**, **error (EmptyState + retry)**, and **empty (EmptyState + next
> step)** states.

### 9.1 Workspace List — `/workspaces` (`WorkspaceListPage`)

The app's landing page. (Prototype Screen 0.)

- **Hero:** title "Workspaces" + subtitle "A workspace groups related projects and shares context, instructions, and a common artifact library."
- **Toolbar:** search input (filters by name/description, client-side over the loaded page) + primary **"New workspace"** button (`IconPlus`) → opens create form.
- **Table** (Mantine `Table`), columns: **Workspace ID** (mono badge), **Workspace Name** (avatar with initials + colour + name), **Projects** (count), **Project Types** (type chips with per-type counts), **Created by** (avatar + name), **Last updated**.
  - Row click → `navigate(ROUTES.workspace(id))`.
  - Project count + type chips are derived from the projects belonging to the workspace (mock computes; or a `projectCount`/`typeCounts` field on the list DTO to avoid N+1).
- **States:** Skeleton rows while fetching; `EmptyState` (retry) on error; `EmptyState` "No workspaces yet — create your first" when empty; "No workspaces found" when search yields nothing.

**Acceptance criteria**
- [ ] Visiting `/` or `/auth/callback` redirects to `/workspaces`.
- [ ] All workspaces the user can access render as table rows with correct counts, type chips, creator, and last-updated.
- [ ] Search filters the visible rows by name/description; clearing restores the full list.
- [ ] Clicking a row navigates to that workspace's home.
- [ ] Loading shows skeletons; error shows a retryable EmptyState; empty shows the create CTA.
- [ ] "New workspace" opens the create form.

### 9.2 Create Workspace (`WorkspaceCreateForm`)

Mantine `Modal` (or right `Drawer`, matching the existing create-project drawer pattern — pick
Drawer for consistency with `ProjectsPage`). (Prototype "New Workspace" modal.)

- **Fields** (`useForm` from `@mantine/form`, Yup via `validation.ts`):
  - **Name** * — required, trimmed, ≤ 80 chars.
  - **Description** — optional textarea.
  - **Colour** — picker over `WORKSPACE_AVATAR_COLORS` (Mantine palette names); default random from the set.
- **Submit:** `useCreateWorkspaceMutation`. On success: close, invalidate the list, navigate into the new workspace (`ROUTES.workspace(newId)`), and `notifications.show` success. Creator is added as **Owner** (server/mock-side).
- **States:** submit button shows loading; field-level validation errors inline; mutation error → `notifications.show` error (human-readable, no raw exception).

**Acceptance criteria**
- [ ] Name is required; submitting empty shows an inline error and does not call the API.
- [ ] Initials are derived from the name; colour defaults to a palette value and is editable.
- [ ] On success the workspace appears in the list, the user lands in the new workspace home, and a success notification shows.
- [ ] The creator is the workspace **Owner**.
- [ ] API failure surfaces a readable error and keeps the form open with entered values.

### 9.3 Global Dashboard — `/dashboard` (`GlobalDashboardPage`, admin-only)

Org-wide, read-only. (Prototype Screen 0b.)

- **Gate:** only `isPlatformAdmin(user)`. Non-admins navigating to `/dashboard` are redirected to `/workspaces`; the nav entry is **hidden** for non-admins (matches the prototype's `nav-dash-gate`).
- **Hero:** "Platform Dashboard" + an "Admin" `Badge` (`color="violet"`), subtitle about org-wide visibility.
- **KPI row** (`useGetDashboardStatsQuery`): Workspaces, Projects, People, Artifacts.
- **Projects by type** — horizontal bar list (per-type counts, type colour).
- **Delivery health** — three cells: On track / At risk / On hold.
- **Recent activity** — latest project updates (project · phase · workspace · time).
- **States:** Skeleton KPIs/cards while loading; retryable EmptyState on error.

**Acceptance criteria**
- [ ] The Dashboard nav entry and `/dashboard` route are only reachable by `platformAdmin`; others are redirected and never see the entry.
- [ ] KPIs, by-type bars, health cells, and recent activity render from `/dashboard/stats` and are internally consistent with the lists.
- [ ] Loading and error states are handled.

### 9.4 Context-aware top-bar navigation

The host top bar renders a different **nav** depending on route context. Profile menu, theme
toggle, help, and support are present in **all** contexts.

| Context (route) | Left of nav | Nav items | Right cluster |
|---|---|---|---|
| Workspace list / global dashboard (`/workspaces`, `/dashboard`) | Brand → `/workspaces` | **Dashboard** (admin only) · **Workspaces** (segmented, active by route) | help · support · theme · profile |
| Workspace home (`/workspaces/:wsId`) | Brand + **workspace switcher** (P2) | **Dashboard · Projects · Members · Settings** (tabs; Projects active by default — Members/Settings are P2) | help · support · theme · profile |
| Inside a project (`/projects/:id/*`) | Brand (→ workspace home) + **project switcher** (existing) + **back-to-workspace** | — (remote owns the rail below) | command palette · notifications · theme · team avatars · profile |

- **Phase 1 must deliver** the workspace-list-context nav (Dashboard/Workspaces) and keep the
  existing in-project top bar working (brand now points to the project's workspace home, not `/projects`).
- The "Dashboard" entry uses the admin gate. The active item is derived from the current route
  (`useLocation`), not internal toggles.
- Use Mantine `SegmentedControl` or styled `UnstyledButton`s (match the prototype's `top-nav`).

**Acceptance criteria**
- [ ] On `/workspaces` and `/dashboard`, the top bar shows the Dashboard/Workspaces nav with the correct active item; Dashboard is hidden for non-admins.
- [ ] The brand always returns to `/workspaces`; inside a project, a "back to workspace" affordance returns to that project's `/workspaces/:wsId`.
- [ ] Profile menu (name, role, sign out), theme toggle, help, support work in every context.
- [ ] No remote contributes to the top bar (host-owned end to end).

### 9.5 Workspace Home → Projects — `/workspaces/:workspaceId` (`WorkspaceHomePage` + `WorkspaceProjectsView`)

The default landing inside a workspace. (Prototype Screen 1, Projects view.)

- **Resolve workspace** via `useGetWorkspaceQuery(workspaceId)`; dispatch `setActiveWorkspace(id)`. If not found → `EmptyState` "Workspace not found" with a link back to `/workspaces`.
- **Header:** workspace name + description (hero); a "‹ All workspaces" back link to `/workspaces`.
- **Projects section:** heading with live count + **"New project"** button.
- **Toolbar:** project search + a **type filter** `Select` (built from the types present in the workspace).
- **Project list:** reuse `ProjectCard`; rows → `navigate(ROUTES.discovery(project.id))` (unchanged project URL). The list is fetched with `useGetProjectsQuery({ workspaceId })` and **visibility-filtered** by role (Phase 1: admin/dev sees all; filter wired for Phase 2).
- **Artifact library** (aside): Phase 2 — show a placeholder/`ComingSoon` or the read-only list if cheap; uploads are Phase 2.
- **States:** Skeleton list while fetching; retryable EmptyState on error; "No projects yet — create your first" empty; "No matching projects" for search/filter misses.

**Acceptance criteria**
- [ ] Opening a workspace shows that workspace's name/description and **only its projects** (filtered by `workspaceId`).
- [ ] The project count reflects the visible list; the type filter offers only types present in the workspace.
- [ ] "New project" creates a project **in this workspace** (carries `workspaceId`) and the new project appears in the list.
- [ ] Clicking a project opens it at `/projects/:projectId/discovery` (remote mount, unchanged) with the correct workspace context passed through.
- [ ] Back link returns to `/workspaces`; `setActiveWorkspace` is set so the remote receives the real workspace ref.
- [ ] Loading / error / empty / no-match states all handled.

### 9.6 Phase 2 — Workspace Home secondary tabs (specs summary)

> Build after Phase 1. Full acceptance criteria to be expanded when Phase 2 starts; captured
> here so the IA and components are designed for it now.

- **Dashboard tab** — per-workspace KPIs (projects, on-track, at-risk, people), project status table with progress + health + team avatars, projects-by-type bars, and a **"View as <member>"** `Select` that re-applies visibility rules (owners/admins see all; member/viewer see assigned).
- **Members tab / modal** — list members (avatar, name, role `Select`), **invite member**, change role, remove (owner/admin only). Backed by the members endpoints.
- **Settings modal** — tabs: **General** (name, description — live-updates hero + switcher), **Instructions** (shared AI guidance textarea; the violet callout explaining it applies to every project), **People & Roles** (= Members), **Danger zone** (delete workspace → removes its projects + artifacts; confirm via `ConfirmModal`; owner only).
- **Artifact library** — upload (multipart to `workspaceArtifacts`), list with file-type icon + extension, click → preview modal (`ArtifactViewer`) with download. localStorage-persisted in mock.
- **Workspace switcher** (top bar) — dropdown of workspaces + "All workspaces"; switching navigates to the chosen workspace home.

---

## 10. Impact on the existing project feature (necessary, in-scope)

The host owns project list + creation, so these change as a direct consequence of workspaces.
**No remote/project-detail internals change.**

1. **`@wispr/projects` model** — add `workspaceId: string` to the `Project` interface and to
   `IProjects` (raw); map it in `mapProject`. (Contracts `Project` already has it.)
2. **`getProjects`** — accept `workspaceId` in `IProjectsListRequest`; the workspace home always
   passes it. The mock filters by it.
3. **`createProject`** — `CreateProjectInput` + `toCreateProjectBody` gain `workspaceId`; the
   create form reads it from the active workspace route param. The mock stores it; seeds get
   `workspaceId`s spread across the seeded workspaces.
4. **`projectsMock.ts`** — seed projects get `workspaceId`; `projects-list` honours the
   `workspaceId` filter; `projects/:id` returns `workspaceId`.
5. **Retire the flat list** — `features/projects/ProjectsPage.tsx` is repurposed into
   `WorkspaceProjectsView` (scoped). `/projects` redirects to `/workspaces`. `/projects/new`
   only makes sense with an active workspace — keep the create drawer but require/resolve the
   active workspace (open it from the workspace home so the route always knows the workspace).
6. **TopBar project switcher** — when inside a project, the switcher's project list is scoped to
   the **current workspace** (use the active workspace + `workspaceId` filter). Brand/back now
   targets the workspace home. (Deeper in-project top-bar rework stays in the project workstream.)

**Acceptance criteria (impact)**
- [ ] A created project is associated with the workspace it was created in and only appears in that workspace.
- [ ] `getProject` returns `workspaceId`; a cold deep-link to `/projects/:id/*` resolves and sets the active workspace (real name passed to the remote).
- [ ] `/projects` and `/projects/new` no longer present a global, workspace-less project list.
- [ ] Existing remote mounting is unchanged (no `basePath`/contract change).

---

## 11. Styling & component mapping

| Prototype element | WISPR implementation |
|---|---|
| `ws-table` rows | Mantine `Table` + `Avatar` + `Badge` (type chips) |
| `top-nav` segmented | `SegmentedControl` or `UnstyledButton` group in `TopBarNav` |
| `kpi` cards | `Card`/`Paper` + `Text` (value/label) — `KpiRow` component |
| bar list | `Progress` or a CSS-module bar; numbers in `Text` |
| health cells | `Paper` cells with token-coloured numbers |
| New-workspace modal | `Drawer` (consistency) or `Modal` + `useForm` |
| colour swatches | `ColorSwatch` over Mantine palette names |
| artifact rows (P2) | `Group` + `ThemeIcon` + `Text` |
| confirm delete (P2) | shared `ConfirmModal` |
| empty/loading/error | shared `EmptyState` + `Skeleton` (`@wispr/ui`) |

- Colours come from **Mantine theme tokens / `var(--cl-*)`** — never hex. Workspace/member
  avatar colours resolve through `workspaceColor()`/`memberColor()` to palette names.
- AI-related actions (none in Phase 1; Instructions tab in P2) use the AI visual language
  (`variant="light" color="violet"` + `IconSparkles`) only where an AI action is triggered.

---

## 12. Task list for Claude Code (ordered)

> Work top-to-bottom. Each task is small and single-responsibility. Run
> `npm run typecheck && npm run lint` after each cluster. Build against `VITE_USE_MOCKS=true`.

### Phase 0 — Contracts (shared constants only)
1. `libs/contracts/src/routes.ts` — add `workspaces`, `globalDashboard`, `workspace(id)` to `ROUTES`; add patterns. **Do not** touch existing project route helpers. (Routes stay in contracts — the app-wide single source, like `projects`/`projectNew`.)
2. `libs/contracts/src/api.ts` — add `API_TAGS` (`Workspace`, `WorkspaceMember`, `Artifact`, `Dashboard`) and `API_ENDPOINTS` (§6.2) + the project-scoping note fields.

### Phase 1a — Host domain layer (feature `utility/`)
3. `features/workspaces/utility/models/model.ts` — `Workspace`, `WorkspaceMember`, `WorkspaceArtifact`, DTOs, `CreateWorkspaceInput`, `DashboardStats`, `ApiEnvelope`.
4. `features/workspaces/utility/constants/constants.ts` + `utility/helpers/helpers.ts` — `WORKSPACE_AVATAR_COLORS`, `workspaceColor`, `workspaceInitials`, `mapWorkspace`, `toCreateWorkspaceBody`, role helpers (`workspaceRoleOf`, `canSeeAllProjects`, `isPlatformAdmin`), `sortByUpdatedDesc`.
5. `features/workspaces/utility/services/services.ts` — `workspacesApi`: `injectEndpoints` on the shared `api` (`getWorkspaces`, `getWorkspace`, `createWorkspace` [+ P2]). Use `axiosBaseQuery`, tags, endpoints; `transformResponse` via `mapWorkspace`. Dashboard stats: `features/global-dashboard/utility/services/services.ts` (`useGetDashboardStatsQuery`).
6. `features/workspaces/utility/services/mocks/workspacesMock.ts` — `registerWorkspacesMockRoutes`; seed 2 workspaces (mirror prototype: "Meridian Financial", "NorthWind Commerce") with members; localStorage; `{result}` envelope; list/get/create. `features/global-dashboard/utility/services/mocks/dashboardMock.ts` — `dashboard/stats` computed from the workspace + project stores.
7. `features/workspaces/utility/validations/validation.ts` + `components/WorkspaceFields/` — Yup schema + reusable name/description/colour fields.
8. **Project impact (existing `@wispr/projects` lib — stays a lib):** add `workspaceId` to `Project` + `IProjects` + `mapProject`; add `workspaceId` to `IProjectsListRequest`, `CreateProjectInput`, `toCreateProjectBody`; update `projectsMock.ts` (seed `workspaceId`s, filter list by `workspaceId`, return it from `projects/:id`).
9. Register `registerWorkspacesMockRoutes()` (+ dashboard mock) in the host boot beside `registerProjectsMockRoutes()` (gated by `useMocks`).

### Phase 1b — Routing & top bar
10. `apps/host/src/app/router.tsx` — `/` → `/workspaces`; `/auth/callback` → `/workspaces`; add `/workspaces`, `/dashboard`, `/workspaces/:workspaceId`; redirect `/projects` → `/workspaces`; keep `/projects/:projectId/*` → `ProjectHost` unchanged.
11. TopBar refactor — extract `ProfileMenu`; add `TopBarNav` (Dashboard/Workspaces, admin gate, active-by-route); render the right nav per route context; brand → `/workspaces`; in-project back-to-workspace.

### Phase 1c — Screens
12. `features/workspaces/WorkspaceListPage.tsx` + `WorkspaceTable` — table, search, "New workspace"; loading/error/empty; on list load dispatch `setWorkspaces(refs)`.
13. `features/workspaces/components/WorkspaceCreateForm` — drawer/modal, `useForm`, create mutation, success nav + notification.
14. `features/global-dashboard/GlobalDashboardPage.tsx` + KPI/bars/health/activity components — admin gate + redirect; loading/error.
15. `features/workspaces/WorkspaceHomePage.tsx` + `WorkspaceProjectsView` — resolve workspace, `setActiveWorkspace`, hero, back link, scoped project list (reuse `ProjectCard`), search + type filter, "New project" (carries `workspaceId`), all states.
16. `ProjectHost` — when `activeWorkspaceId !== project.workspaceId`, set active workspace (ensure list loaded for the real name). No remote change.
17. Delete/replace the old `features/workspaces/Workspaces.tsx` stub; move `ProjectsPage` create-drawer logic into `WorkspaceProjectsView`; remove the global `/projects` list usage.

### Phase 1d — Verify
18. `npm run typecheck && npm run lint && npm run build`. Manually verify the §9 acceptance criteria with mocks on (`npm run dev` or `serve:host`).
19. Update `README.md` (dev flow / routes if user-facing) and the **Migration status** notes in `CLAUDE.md` to reflect the workspace entry point (per the "keep docs current" rule).

### Phase 2 — (separate pass) Workspace home tabs
20. Workspace dashboard tab (+ "view as"), Members tab/modal, Settings modal (General/Instructions/People/Danger), Artifact library (upload/list/preview), top-bar workspace switcher. Add the corresponding endpoints/hooks/mocks (§6.2) and `ConfirmModal` for delete.
21. **Reassess the lib boundary** — once Phase 1+2 are scaffolded end-to-end, check whether workspace domain code duplicates patterns across host features. If real duplication exists (and only then), extract the shared part into a `@wispr/workspaces` lib.

---

## 13. Acceptance criteria — feature-level rollup

- [ ] The app **opens on the workspace list**; there is no longer a global, workspace-less project list.
- [ ] A user can **create a workspace** and is taken into it; they are its Owner.
- [ ] Opening a workspace shows **its projects only**; creating a project there scopes it to that workspace.
- [ ] **Platform admins** (and only they) can open the **global dashboard** with org-wide KPIs.
- [ ] The **top bar** reflects context (workspace-list nav vs. in-project), is host-owned, and works across themes.
- [ ] Opening a project still mounts the correct **remote unchanged** (no federation/contract change); the remote receives the right workspace ref, including on cold deep-link.
- [ ] Every async surface has **loading / error / empty** states; no `any`, no inline styles, no hardcoded hex, no magic strings (routes/tags/endpoints from constants).
- [ ] `README.md` and `CLAUDE.md` updated for the new entry flow.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Premature shared lib for host-only code | Workspaces is host-only (no remote consumer); revisit a `@wispr/workspaces` lib **only** if real duplication appears post-scaffold (task 21). |
| Workspace context lost on cold deep-link to a project | `getProject` returns `workspaceId`; `ProjectHost` sets active workspace (task 16). |
| `/projects/new` reached without an active workspace | Always open create from the workspace home (route knows the workspace); guard the drawer to require an active workspace. |
| Hardcoded hex from the prototype leaking in | Use `workspaceColor()`/palette names + tokens only (CLAUDE.md). |
| Scope creep into project-detail/remote work | Phase-2 tabs and nested routing are explicitly deferred; Phase 1 touches only the host, the existing `@wispr/projects` lib, shared contracts, and mocks. |

---

## 15. Decisions log

- **2026-06-13 — Routing:** Approach **A** (flat project URL). Workspaces add `/workspaces`,
  `/dashboard`, `/workspaces/:wsId`; project detail stays `/projects/:projectId/*` with the
  remote `basePath` unchanged. Rationale: zero federation/contract blast radius, flat backend
  alignment, stable shareable project links, smallest migration. Nested routing is a deliberate,
  isolated step reserved for the later project-feature workstream.
- **2026-06-13 — Code location (revised):** Workspaces is **host-only** — all entity/API/mock/
  helpers/UI live under `apps/host/src/features/{workspaces,global-dashboard}/`. No
  `@wispr/workspaces` lib. Rationale: no remote reads workspace data on the frontend (it only
  receives `WorkspaceRef` via props; instructions/artifacts are injected into AI context
  server-side), so a shared lib would be premature. **`@wispr/projects` stays a lib** — the
  `custom-app` remote imports it in 15+ files, so it is genuinely cross-app. `WorkspaceRef` in
  `@wispr/contracts` stays minimal and unchanged; `ROUTES`/`API_*` constants gain workspace
  entries (the app-wide single source). Promote to a lib later only if duplication appears.
- **2026-06-13 — Backend:** Mock-first (no workspace backend yet); flat endpoints, workspace
  scoping for projects via a request field, not a URL segment.
