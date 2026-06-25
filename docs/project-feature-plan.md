# WISPR — Project Feature Plan (create + list + project-type master data)

> **Status:** Approved for build — Phase 1. **Revised to the ADDITIVE approach (§17)** after a
> cross-check against the workspace plan + already-shipped code; where §5/§6 describe a
> rename/repurpose, **§17 supersedes them.**
> **Author:** Planning pass, 2026-06-13.
> **Reference prototype:** [`docs/wispr-prototype.html`](./wispr-prototype.html) — the **New Project wizard** (`renderWizStep`, Basics → Type → [Phases] → Review) and the in-workspace **project list** (`renderProjects`, Screen 1 "Projects" view).
> **Architecture rules:** [`CLAUDE.md`](../CLAUDE.md) (monorepo, federation, conventions) — this plan obeys all of them.
> **Sibling workstream:** [`docs/workspace-feature-plan.md`](./workspace-feature-plan.md) — the **workspace** feature is being built in a separate session. This plan deliberately does **not** re-own anything that plan owns; §11 defines the seam.

This document is the single source of truth for the **project feature**: creating a project
(the multi-step wizard with **project-type master data**), listing projects, and resolving a
project's **type → federated remote**. Workspace container, membership, and the global dashboard
are **out of scope here** (sibling workstream). SDLC phase internals (Discovery, Planning, …)
are **remote-owned** and out of scope for both.

---

## 1. Why this exists / the mental model

A **project** is one SDLC delivery. Two things define it at birth:

1. **What it is about** — name, description, logo, and (future) an *industry*.
2. **What kind of delivery it is** — its **project type**. This is the load-bearing choice:
   it selects the **federated remote** that owns the workspace chrome + phase rail, and it
   shapes the phases, terminology, and AI context for the whole project.

```
Workspace                         (sibling workstream)
 └─ Project        ← THIS PLAN: create (wizard) + list + type resolution
     │  projectType ────────────► selects the remote (custom-app, strategy, …)
     └─ Phases…                   (remote-owned — NOT this plan)
```

**The key correction this plan makes.** Today `@wispr/projects` carries a legacy `type` field
that is an *industry* enum (`healthcare | insurance | fintech | retail | other`), and
`GET /project-types` returns those. But the prototype's **"Type"** step — *"shapes the phases,
terminology, and AI context across the whole project"* — is the **platform/federation type**,
i.e. `ProjectType` in `@wispr/contracts` (`custom-app | data-pipeline | analytics-bi | sap |
guidewire | strategy | testing`), the value `ProjectHost` uses to mount a remote
(`registry[project.type]`). This plan makes **project type = the federation type** the primary,
first-class field, served from a **mock master-data API**, and retains **industry** as an
optional field for future use (not surfaced in the wizard yet).

---

## 2. Scope

### 2.1 In scope — Phase 1 (the requested core)

| # | Capability | Surface |
|---|---|---|
| 1 | **Project-type master data** — the 7 federation types, served from a mock API (frontend-ready, backend-shaped) | `@wispr/projects` (model + mock + api) |
| 2 | **Create-project wizard** — multi-step (Basics → Project Type → Review), with the **type card picker** | Host `features/projects/components/ProjectCreateWizard/` |
| 3 | **`projectType` on the Project entity** — added + mapped at the API boundary; drives remote mounting | `@wispr/projects` model/helpers |
| 4 | **Project list presentation** — `ProjectCard` shows the project-type badge; list filtering by project type | Host `features/projects/` (placed by the workspace workstream — §11) |
| 5 | **Project-type → remote resolution** — `ProjectHost` resolves the real project's type (replace the id-prefix mock) | Host `features/project-host/` |
| 6 | **Coming-soon gating** — types without a ready remote are non-selectable in the wizard **and** show a "coming soon" screen if opened | Wizard + `ProjectHost`/`RemoteFallback` |

### 2.2 In scope — Phase 2 (prototype fidelity, after Phase 1 is green)

| # | Capability |
|---|---|
| 7 | **"By category" type picker** — the `SOLUTION_CATS` two-mode toggle (All types ⁄ By category); categorized solutions map down to the 7 types |
| 8 | **Strategy phase configuration** — the wizard's "Phases" step (`STRATEGY_PHASE_LIB`, template vs. custom). **Expanded into a full design + the resolved host↔remote contract in §18.** |
| 9 | **Industry field surfaced** — optional industry select in the wizard + on the card |
| 10 | **Project row menu** — the `⋯` actions (details / members / connectors / settings) from the prototype's `toggleProjMenu` |

### 2.3 Out of scope (explicitly NOT this plan)

- The **workspace** container, membership, global dashboard, artifact library — sibling workstream.
- **Where** the list/create live (workspace home placement, `workspaceId` scoping) — owned by the workspace plan; this plan only supplies the components and the data layer (§11).
- Any **remote/phase internals** (Discovery, Planning, the phase rail).
- **Nested routing** / remote `basePath` changes (the workspace plan defers these too).
- A **real backend** — everything is mock-first (`VITE_USE_MOCKS=true`).
- New federated **remotes** for the coming-soon types (analytics-bi, sap, guidewire, testing). They stay "coming soon" until their remote ships.

---

## 3. Information architecture & flow

```
  Workspace home (sibling)             Create-project WIZARD (this plan)
  ┌───────────────────────┐  New      ┌──────────────────────────────────────┐
  │ Projects list         │ project   │ ① Basics   name · description · logo  │
  │  [ProjectCard rows]    │ ───────►  │ ② Project Type   pick 1 of 7 (cards)  │
  │  search · type filter │           │     (coming-soon types disabled)      │
  │  [+ New project]       │           │ ③ Review   confirm → Create           │
  └──────────┬────────────┘           └───────────────┬──────────────────────┘
  open project (row click)                            │ on success
             │                                          ▼
             ▼                              navigate ROUTES.discovery(newId)
  ┌────────────────────────────────────────────────────────────────┐
  │ /projects/:projectId/* — ProjectHost                            │
  │  resolve project → project.projectType → registry[type]         │
  │   • available  → mount the remote (custom-app, strategy)         │
  │   • coming-soon → "coming soon" screen (no remote)              │
  └────────────────────────────────────────────────────────────────┘
```

**Flow rules**
- The wizard is a **Mantine `Modal` + `Stepper`** opened from the workspace home's "New project"
  button (matches the prototype's `openWizard()` modal; replaces today's plain create `Drawer`).
- "Create" requires a selected **available** project type. Coming-soon types can't be submitted.
- On success: close, invalidate the project list, navigate to `ROUTES.discovery(newId)`, show a
  success notification (unchanged from current behaviour).
- Opening a project re-resolves its type from the API on every load (deep-link / hard-refresh safe).

---

## 4. Routing

No new routes. The create wizard is **state-driven** (a `Modal`), not a route — consistent with
the workspace workstream's existing `WorkspaceProjectsView` (which already opens create via local
state). The legacy `/projects/new` routed drawer is retired with the old `ProjectsPage` (§12).

- `/projects/:projectId/*` → `ProjectHost` — **unchanged** signature; only its internal type
  *resolution* changes (§9.4).
- `ROUTES`/`ROUTE_PATTERNS` in `@wispr/contracts` — **no change** for this plan.

---

## 5. Data model

### 5.1 Project-type master data (the "Type" the prototype shows)

Prototype `DOMAINS` → `@wispr/contracts` `ProjectType` (1:1):

| Prototype `DOMAINS` key | `ProjectType` (contracts) | Label | Tag | Phase-1 status |
|---|---|---|---|---|
| `software` | `custom-app` | Custom App | CUSTOM APP | **available** |
| `strategy` | `strategy` | Strategy | STRATEGY | **available** |
| `data-etl` | `data-pipeline` | Data Pipeline | DATA | coming-soon¹ |
| `reporting` | `analytics-bi` | Analytics & BI | ANALYTICS | coming-soon |
| `sap` | `sap` | SAP | SAP | coming-soon |
| `guidewire` | `guidewire` | Guidewire | GUIDEWIRE | coming-soon |
| `testing` | `testing` | Testing | TESTING | coming-soon |

> ¹ `data-pipeline` has a sandbox remote in `tools/mf/remotes.ts`, but per the product decision
> (2026-06-13) only **custom-app** and **strategy** ship with mock data in Phase 1; the rest —
> including data-pipeline — are **coming-soon**. Flipping data-pipeline to `available` later is a
> one-line seed change (§6).

**API DTO** (`@wispr/projects` model). The API returns the stable `key` + copy + status; the
**frontend** maps `key → Tabler icon + Mantine palette** (so we never store hex/emoji from the
API, per CLAUDE.md):

```ts
import type { ProjectType } from '@wispr/contracts'

export type ProjectTypeStatus = 'available' | 'coming-soon'

/** One project-type option from the master-data API (drives the wizard picker). */
export interface IProjectTypeOption {
  id: number               // numeric master-data id (the API's representation)
  key: ProjectType         // federation enum, e.g. 'custom-app' — the load-bearing value
  name: string             // 'Custom App'
  tag: string              // 'CUSTOM APP'
  description: string      // one-line, realistic (from the prototype's DOMAINS.desc)
  status: ProjectTypeStatus
}
```

```ts
// Frontend-only presentation map (NOT from the API) — keyed by ProjectType.
// icon: a @tabler/icons-react component; colorSeed: a Mantine palette name.
export const PROJECT_TYPE_META: Record<ProjectType, { icon: Icon; colorSeed: string }> = { … }
```

### 5.2 The `Project` entity changes (`libs/projects/src/model.ts`)

Add the federation type as the **primary** type field; demote the legacy industry enum to an
optional `industry` field retained for future use.

```ts
import type { ProjectType } from '@wispr/contracts'   // federation type (the 7 values)

/** Industry/category — retained for future reference; NOT in the Phase-1 wizard. */
export type IndustryType = 'healthcare' | 'insurance' | 'fintech' | 'retail' | 'other'

export interface Project {
  id: string
  name: string
  description: string
  projectType: ProjectType   // NEW — primary; drives remote mounting + phase rail
  projectTypeId: number      // NEW — master-data id (API representation)
  industry?: IndustryType    // RENAMED from `type` — optional, future use
  status: ProjectStatus
  workspaceId: string
  logo?: string
  currentPhase: string
  createdAt: string
  updatedAt: string
  createdBy: string
}
```

**Raw DTO** (`IProjects`) gains `projectTypeKey?: ProjectType` (or the mapper derives the key
from `projectTypeId` via `PROJECT_TYPE_BY_ID`). `mapProject` sets `projectType` (federation,
default `'custom-app'`) and `projectTypeId`; `industry` maps from the legacy field if present.

**Create input** (`CreateProjectInput`) carries `projectTypeId` (and keeps `workspaceId` from the
workspace workstream). `toCreateProjectBody` sends `{ projectName, projectDescription,
projectTypeId, workspaceId? }` — the existing `typeId` body field is renamed to `projectTypeId`.

**Form values** (`ProjectFormValues`) — the wizard's working shape:

```ts
export type ProjectFormValues = {
  name: string
  description: string
  projectType: string   // selected ProjectType key (validated non-empty + available)
  logo: string
}
```

> **Industry retained, not deleted.** Per the 2026-06-13 decision, the industry enum + its label
> map stay in `@wispr/projects` (renamed `PROJECT_TYPE_LABEL` → `INDUSTRY_LABEL`). It is wired for
> a future Phase-2 industry select; nothing in Phase 1 reads it for behaviour.

### 5.3 Constants (`libs/projects/src/constants.ts`)

- **New:** `PROJECT_TYPE_LABEL: Record<ProjectType, string>`, `PROJECT_TYPE_TAG`,
  `PROJECT_TYPE_META` (icon + palette), `PROJECT_TYPE_BY_ID`/`PROJECT_TYPE_ID` (numeric ↔ key),
  and `PROJECT_TYPE_ORDER` (card display order).
- **Renamed (industry, retained):** `PROJECT_TYPES`→`INDUSTRY_TYPES`, `PROJECT_TYPE_LABEL`
  (old)→`INDUSTRY_LABEL`, etc. Update the 2 host consumers (§12) to the new project-type maps.
- `PROJECT_FORM_INITIAL` updated to the new `ProjectFormValues`.

---

## 6. API contract (mock-first)

There is **no project-type backend**; build against the mock server (`VITE_USE_MOCKS=true`,
`registerMockRoutes`), same `{ result }` envelope, identical to `projectsMock.ts`.

### 6.1 Endpoints

| Endpoint (`API_ENDPOINTS`) | Method | Purpose | Change |
|---|---|---|---|
| `projectTypes` (`project-types`) | GET | **Project-type master data** (the 7 options + status) | **Repurposed** — returns federation types now, not industry |
| `projectsList` (`projects-list`) | POST | Paginated/searchable list (workspace-scoped) | DTO carries `projectTypeId`/key |
| `projects` (`projects`) | POST | Create | body gains `projectTypeId` (renamed from `typeId`) |
| `project` (`projects/:id`) | GET | Resolve one project (used by `ProjectHost`) | response carries the project type |

No new `API_ENDPOINTS`/`API_TAGS` entries needed — `ProjectType` tag already exists. (If a future
industry master-data list is added, it gets its own endpoint then.)

### 6.2 `GET /project-types` mock payload

```ts
// projectsMock.ts — replaces the current industry-id list.
[
  { id: 1, key: 'custom-app',   name: 'Custom App',    tag: 'CUSTOM APP', description: 'Build full-stack web and mobile apps — UI, APIs, and database', status: 'available' },
  { id: 2, key: 'strategy',     name: 'Strategy',      tag: 'STRATEGY',   description: 'Run phase-driven strategy work, from discovery to sign-off',     status: 'available' },
  { id: 3, key: 'data-pipeline',name: 'Data Pipeline', tag: 'DATA',       description: 'Move, transform, and validate data across systems',              status: 'coming-soon' },
  { id: 4, key: 'analytics-bi', name: 'Analytics & BI',tag: 'ANALYTICS',  description: 'Turn data into dashboards, reports, and insights',                status: 'coming-soon' },
  { id: 5, key: 'sap',          name: 'SAP',           tag: 'SAP',        description: 'Deliver SAP change — functional specs, ABAP, and S/4HANA config', status: 'coming-soon' },
  { id: 6, key: 'guidewire',    name: 'Guidewire',     tag: 'GUIDEWIRE',  description: 'Configure and extend Guidewire PolicyCenter and product models',  status: 'coming-soon' },
  { id: 7, key: 'testing',      name: 'Testing',       tag: 'TESTING',    description: 'Plan, automate, and run tests to validate quality',               status: 'coming-soon' },
]
```

### 6.3 Project seeds (re-seeded)

Re-seed `projectsMock.ts` so seeds carry **federation `projectType`** and align with the workspace
mock (`ws1` Meridian Financial, `ws2` NorthWind Commerce). Include at least one **strategy** and
one **custom-app** (available, openable) plus one **coming-soon** type (e.g. data-pipeline) to
exercise the coming-soon screen. Realistic names from the prototype's `PROJECTS` (no Lorem ipsum).

### 6.4 RTK Query (`libs/projects/src/projectsApi.ts`)

- `useGetProjectTypesQuery` — return type changes to `IProjectTypeOption[]`; `providesTags`
  unchanged (`ProjectType`/LIST). Mapper trivial (envelope unwrap).
- `getProjects` / `getProject` / `createProject` — `transformResponse` via the updated
  `mapProject`; `createProject` body via the updated `toCreateProjectBody`. Tags unchanged.

---

## 7. Coming-soon handling (types without a ready remote)

Two layers, both **data-driven** by the master-data `status`:

1. **Primary — creation gate (in the wizard).** Coming-soon type cards render with a "Coming
   soon" `Badge`, are visually muted, and are **non-selectable**; `Next`/`Create` stays disabled
   until an `available` type is chosen. (Prototype shows all types; we add the gate.)
2. **Safety net — open gate (in `ProjectHost`).** If a coming-soon project is ever opened (seed
   data, a flipped flag, a stale link), `ProjectHost` checks the resolved type's availability and
   renders a **"coming soon"** screen instead of attempting `loadRemote` (which would 404). This
   reuses/extends `RemoteFallback` with a `comingSoon` variant (icon + "This project type isn't
   available yet" + back-to-workspace).

Availability source: the project type's `status` from `GET /project-types`, cross-checked against
the live `registry` in `ProjectHost`. A type is openable only if `status === 'available'` **and**
a registry entry exists.

---

## 8. State management

- **Master data + list + project**: RTK Query cache only (no slice).
- **Wizard state**: local — a `useForm` (`@mantine/form`, Yup) for the fields + a small `step`
  `useState`, or a single `ProjectFormValues` form with a step index. No Redux; the wizard is
  ephemeral. (Follows the existing `ProjectCreateForm` pattern, extended to steps.)
- **Active workspace** (for `workspaceId` on create) comes from the workspace workstream's
  `workspaceSlice` / route param — this plan consumes it via the `workspaceId` prop already on
  `ProjectCreateForm`/`WorkspaceProjectsView`.

---

## 9. Detailed screen specs

> **Component & styling discipline (CLAUDE.md):** Mantine first (`Modal`, `Stepper`, `Card`,
> `SimpleGrid`, `TextInput`, `Textarea`, `Avatar`, `Badge`, `Group`, `Stack`, `Text`, `Title`,
> `Button`, `FileButton`). No raw HTML except a single CSS-module root wrapper. No inline styles,
> no hardcoded hex — Mantine props / theme tokens / `var(--cl-*)` only. AI visual language is not
> used here (no AI action in create). Project-type accent colours resolve via `PROJECT_TYPE_META`
> palette names, never hex.

### 9.1 Create-project wizard — `ProjectCreateWizard` (Modal + Stepper)

Opened from the workspace home "New project" button. Title "Create a new project", subtitle
"In {workspace name} — a few basics to begin." Three steps via Mantine `Stepper`:

**① Basics** (`steps/BasicsStep`)
- `TextInput` **Project name** * (required, trimmed).
- `Textarea` **Description** * (required) — prototype marks it required.
- **Logo** (optional) — `Avatar` preview (initials fallback via `projectInitials`) + `FileButton`
  ("Upload image" / "Remove"). Reuses the logic from today's `ProjectFields`.
- `Next` disabled until name + description are valid.

**② Project Type** (`steps/ProjectTypeStep` + `components/ProjectTypeCard`)
- Intro line: "Select the one type that best fits this project. It shapes the phases and AI
  context across the whole project."
- `SimpleGrid` of `ProjectTypeCard`s from `useGetProjectTypesQuery()` — each shows the
  `PROJECT_TYPE_META` icon, `name`, `description`, and (if coming-soon) a muted **"Coming soon"**
  `Badge`; selected card is highlighted (`projectColor`/palette accent).
- **States:** `Skeleton` cards while loading; retryable `EmptyState` on error.
- Selecting an `available` card sets `projectType`; coming-soon cards are non-interactive.
- `Next`(→ Review) disabled until an available type is selected; inline error otherwise.
- *(Phase 2: the "All types ⁄ By category" toggle + `SOLUTION_CATS`.)*

**③ Review** (`steps/ReviewStep`)
- Logo + name + description preview; a "Setup" block: **Workspace** (name) and **Project type**
  (the type tag chip + label). Matches the prototype's `rv-preview`/`rv-sec`.
- Primary button **"Create project"** → `useCreateProjectMutation({ name, description,
  projectTypeId, workspaceId, logo? })`. On success: success notification, close, navigate to
  `ROUTES.discovery(newId)`. On failure: readable error notification, keep the wizard open with
  entered values.

**Acceptance criteria**
- [ ] Wizard opens from "New project"; Basics requires name + description before advancing.
- [ ] Project Type step lists all 7 types from the mock API; coming-soon types are badged and
      non-selectable; only an available type enables Review/Create.
- [ ] Review shows the workspace + chosen type; Create calls the API with `projectTypeId` +
      `workspaceId` and lands in the new project's Discovery.
- [ ] Loading/error states on the type step; API failure keeps the wizard open with a readable error.
- [ ] No hardcoded hex/emoji from the prototype leaks in; icons/colours come from `PROJECT_TYPE_META`.

### 9.2 Project list + card (`ProjectCard`)

The list itself is rendered by the workspace workstream's `WorkspaceProjectsView` (§11). This
plan owns the **card** and the **type label/filter** data:
- `ProjectCard` shows the **project-type** badge via `PROJECT_TYPE_LABEL[project.projectType]`
  (was the industry label) + status badge + "Updated …" (unchanged otherwise).
- The list's type filter options derive from `project.projectType` + `PROJECT_TYPE_LABEL`.
- *(Phase 2: the prototype's `prow` row layout + `⋯` actions menu, if the team prefers rows over cards.)*

**Acceptance criteria**
- [ ] Each card shows the correct project-type label; the type filter offers the types present.
- [ ] Loading/error/empty/no-match states remain (already handled in `WorkspaceProjectsView`).

### 9.3 Type → remote resolution (`ProjectHost` + `useProject`)

Replace the **mock** `apps/host/src/features/project-host/utility/hooks/useProject.ts` (which
derives type from the id prefix) with a real resolver:
- Use `useGetProjectQuery(projectId)` (from `@wispr/projects`) to fetch the project, returning a
  `@wispr/contracts` `Project` shape (`{ id, name, type: projectType, workspaceId }`) for the host
  contract — i.e. map the rich project's `projectType` into the contract's `type`.
- Handle loading (existing `<Loader />`) and not-found (graceful fallback).
- Before `loadRemote`: if the type is **coming-soon** (or has no registry entry), render the
  coming-soon screen (§7) instead of loading.

**Acceptance criteria**
- [ ] A custom-app project mounts custom-app; a strategy project mounts strategy — driven by the
      real `projectType`, not the id prefix.
- [ ] A coming-soon project shows the "coming soon" screen, never a 404/remote error.
- [ ] Cold deep-link / hard refresh resolves the type correctly.

---

## 10. Code structure / file layout

### 10.1 Library — `@wispr/projects` (data layer; shared with custom-app, stays a lib)

```
libs/projects/src/
  model.ts            # + ProjectType wiring, IProjectTypeOption, ProjectTypeStatus,
                      #   projectType/projectTypeId on Project, industry retained, ProjectFormValues
  constants.ts        # + PROJECT_TYPE_LABEL/TAG/META/ORDER/BY_ID/ID; rename industry maps → INDUSTRY_*
  helpers.ts          # mapProject (sets projectType/projectTypeId), toCreateProjectBody (projectTypeId)
  projectsApi.ts      # useGetProjectTypesQuery returns IProjectTypeOption[]
  projectsMock.ts     # GET /project-types → 7 federation types; re-seed projects w/ projectType
  validation.ts       # projectSchema: projectType required (+ availability checked in the wizard)
  index.ts            # export the new constants/types
```

### 10.2 Host — `apps/host/src/features/projects/` (wizard UI)

```
features/projects/
  components/
    ProjectCard/                       # update the type badge to projectType
      ProjectCard.tsx
      ProjectCard.module.css
    ProjectCreateWizard/               # NEW — replaces ProjectCreateForm (drawer body)
      ProjectCreateWizard.tsx          # Modal + Stepper orchestrator (useForm + step state)
      ProjectCreateWizard.module.css
      steps/
        BasicsStep/        BasicsStep.tsx
        ProjectTypeStep/   ProjectTypeStep.tsx   ProjectTypeStep.module.css
        ReviewStep/        ReviewStep.tsx
      components/
        ProjectTypeCard/   ProjectTypeCard.tsx   ProjectTypeCard.module.css
  utility/
    hooks/   useProjectWizard.ts       # step machine + submit (optional; or inline in the Modal)
    constants/ constants.ts            # wizard step labels
```

> **Retired:** `features/projects/ProjectsPage.tsx` (+ `.module.css`) and the
> `utility/styles/createProjectDrawer.module.css` drawer — superseded by the wizard and the
> workspace home. `ProjectCreateForm.tsx` is replaced by `ProjectCreateWizard` (the workspace
> workstream currently renders `ProjectCreateForm` in a `Drawer` — §11 covers the swap).

### 10.3 Host — `apps/host/src/features/project-host/`

```
features/project-host/
  ProjectHost.tsx                      # coming-soon gate before loadRemote
  utility/hooks/useProject.ts          # REAL resolver via useGetProjectQuery (replaces id-prefix mock)
  components/RemoteFallback.tsx        # + comingSoon variant
```

---

## 11. Seam with the workspace workstream (coordination — read before building)

The workspace plan (§10, §9.5) already owns and has partially built: `WorkspaceProjectsView`
(the in-workspace list), the `workspaceId` scoping on `getProjects`/`createProject`, and the
create entry point. **This plan must not re-own those.** Concretely:

| Owned by workspace plan (don't change semantics) | This plan's touch |
|---|---|
| `WorkspaceProjectsView.tsx` — list, search, type filter, create entry | Swap the `Drawer`+`ProjectCreateForm` for `ProjectCreateWizard` (`Modal`); update the type filter to `projectType` + `PROJECT_TYPE_LABEL`. **Coordinate** — one small edit. |
| `Project.workspaceId`, `IProjectsListRequest.workspaceId`, create `workspaceId` | Leave as-is; the wizard keeps passing `workspaceId`. |
| `ProjectHost` active-workspace resolution (workspace plan task 16) | Independent of the **type** resolution this plan adds; both edit `ProjectHost`/`useProject` — **sequence to avoid a merge clash** (do type resolution as one focused commit). |

**Naming overlap to resolve once:** both plans currently reference `PROJECT_TYPE_LABEL`. After
this plan, `PROJECT_TYPE_LABEL` means the **federation** label; the industry map becomes
`INDUSTRY_LABEL`. `WorkspaceProjectsView` (which imports `PROJECT_TYPE_LABEL` today for the
industry `type`) must switch to `project.projectType` — a coordinated rename.

---

## 12. Impact on existing code

1. **`@wispr/projects` model/constants/helpers/api/mock/validation** — per §5/§6/§10.1 (the bulk
   of the work; additive + one rename of industry maps).
2. **`ProjectCard.tsx`** — badge reads `PROJECT_TYPE_LABEL[project.projectType]`.
3. **`WorkspaceProjectsView.tsx`** (workspace workstream) — type filter + create swap (§11).
4. **`ProjectFields.tsx`** — its `Select` is superseded by the wizard's `ProjectTypeStep`; either
   retire `ProjectFields` or reduce it to the Basics fields reused by `BasicsStep` (preferred:
   extract Basics fields into `BasicsStep`, retire the old `Select`).
5. **`ProjectHost.tsx` + `useProject.ts`** — real type resolution + coming-soon gate (§9.3).
6. **`RemoteFallback.tsx`** — add the `comingSoon` variant.
7. **Retire** `ProjectsPage.tsx`, its CSS, and the create drawer CSS (§10.2).
8. **custom-app consumers of `project.type`** — verify none read the *industry* `type` for
   behaviour (most use `useCurrentProject` for id/name). Any that do switch to `projectType` or
   `industry` as appropriate (grep `\.type` in `apps/custom-app` during build).

**Acceptance criteria (impact)**
- [ ] `npm run typecheck && npm run lint && npm run build` clean across the workspace.
- [ ] No consumer still reads a removed/renamed field; the industry field compiles as optional.
- [ ] The workspace workstream's list still renders, now with project-type labels.

---

## 13. Task list (ordered)

> Work top-to-bottom; run `npm run typecheck && npm run lint` after each cluster. Build with
> `VITE_USE_MOCKS=true`. Coordinate the §11 touchpoints with the workspace session.

### Phase 1a — Data layer (`@wispr/projects`)
1. `model.ts` — add `ProjectType` wiring, `IProjectTypeOption`, `ProjectTypeStatus`; add
   `projectType`/`projectTypeId` to `Project` + `IProjects`/create input; rename industry `type`→
   `industry` (optional); update `ProjectFormValues` (`projectType`).
2. `constants.ts` — add `PROJECT_TYPE_LABEL/TAG/META/ORDER/BY_ID/ID`; rename industry maps →
   `INDUSTRY_*`; update `PROJECT_FORM_INITIAL`.
3. `helpers.ts` — `mapProject` sets `projectType`/`projectTypeId` (default `custom-app`);
   `toCreateProjectBody` sends `projectTypeId`.
4. `validation.ts` — `projectSchema.projectType` required.
5. `projectsApi.ts` — `useGetProjectTypesQuery` → `IProjectTypeOption[]`.
6. `projectsMock.ts` — `GET /project-types` returns the 7 federation types (§6.2); re-seed
   projects with `projectType` aligned to ws1/ws2 (§6.3); `projects-list`/`projects/:id` carry it.
7. `index.ts` — export the new types/constants.

### Phase 1b — Wizard (host)
8. `ProjectCreateWizard/` — Modal + Stepper; `BasicsStep`, `ProjectTypeStep` (+ `ProjectTypeCard`),
   `ReviewStep`; `useForm` + Yup; create mutation + success nav/notification; loading/error states.
9. Coming-soon gate in `ProjectTypeStep` (badge + non-selectable + disabled Next/Create).
10. Update `ProjectCard` badge to `projectType`.

### Phase 1c — Wire-up & resolution
11. Swap `WorkspaceProjectsView`'s `Drawer`+`ProjectCreateForm` → `ProjectCreateWizard` `Modal`;
    update its type filter to `projectType` (coordinate per §11).
12. `useProject.ts` (project-host) — real resolver via `useGetProjectQuery`; map `projectType` →
    contract `type`; handle loading/not-found.
13. `ProjectHost.tsx` — coming-soon gate before `loadRemote`; `RemoteFallback` `comingSoon` variant.
14. Retire `ProjectsPage.tsx` + old drawer/`ProjectFields` `Select` + dead CSS.

### Phase 1d — Verify
15. `npm run typecheck && npm run lint && npm run build`. Manually verify the §9 acceptance
    criteria with mocks on (`npm run dev` or `serve:host`): create a custom-app project → lands in
    Discovery; create a strategy project → mounts strategy; confirm a coming-soon type can't be
    created and (via a seed) shows the coming-soon screen when opened.
16. Update `README.md` / `CLAUDE.md` only if developer-facing behaviour changed (per the
    keep-docs-current rule).

### Phase 2 — (separate pass)
17. "By category" picker (`SOLUTION_CATS`), strategy phase configuration (needs a host↔remote
    contract decision), industry select, project row `⋯` menu.

---

## 14. Acceptance criteria — feature-level rollup

- [ ] **Project type is the federation type**, served from a **mock master-data API**
      (`GET /project-types`) returning the 7 options + availability status.
- [ ] The **create wizard** (Basics → Project Type → Review) creates a project with a
      `projectType` and `workspaceId`, then lands in Discovery.
- [ ] **Coming-soon** types (everything except custom-app + strategy in Phase 1) can't be created
      and show a graceful "coming soon" screen if opened — no remote 404.
- [ ] **`ProjectHost` mounts the right remote** from the real `projectType` (custom-app, strategy),
      including on cold deep-link; the id-prefix mock resolver is gone.
- [ ] **Industry** is retained as an optional field for future use, not surfaced in Phase 1.
- [ ] No `any`, no inline styles, no hardcoded hex/emoji (icons/colours via `PROJECT_TYPE_META`),
      no magic strings (types/tags/endpoints from constants); every async surface has
      loading/error/empty states.
- [ ] The workspace workstream's list keeps working with the new project-type labels (§11 honoured).

---

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Two `ProjectType`s (federation vs. industry) cause confusion | Make federation the primary `projectType`; rename industry to `industry`; document in the model. |
| Merge clash with the workspace session in `ProjectHost`/`useProject`/`WorkspaceProjectsView` | §11 seam; do type resolution as one focused commit; coordinate the `PROJECT_TYPE_LABEL` rename. |
| Repurposing `GET /project-types` breaks an existing consumer | Only `ProjectFields` consumes it today (being replaced); grep before/after. |
| Selecting a type with no remote 404s the host | Data-driven coming-soon gate at **both** create and open (§7). |
| Strategy phase-config (Phase 2) crosses into remote-owned territory | Deferred; flagged as needing a host↔remote contract decision before build. |
| Hardcoded hex/emoji from the prototype leaking in | `PROJECT_TYPE_META` (Tabler icon + Mantine palette); CLAUDE.md styling hierarchy. |

---

## 16. Decisions log

- **2026-06-13 — "Type" = federation project type.** The wizard's "Type" maps to
  `@wispr/contracts` `ProjectType` (the 7 federation values), not the legacy industry enum. It is
  the load-bearing value that selects the remote. Renamed from the prototype's "DOMAINS" to
  **"project type"** in product language.
- **2026-06-13 — Availability:** Only **custom-app** and **strategy** ship with mock data in
  Phase 1 (openable); **all other types** (data-pipeline, analytics-bi, sap, guidewire, testing)
  are **coming-soon** — gated in the create flow and shown as a "coming soon" screen if opened.
  Flipping a type to available is a one-line seed/registry change.
- **2026-06-13 — Industry retained:** the legacy industry enum is kept as an optional `industry`
  field for future reference; it is not surfaced in the Phase-1 wizard.
- **2026-06-13 — Mock-first:** no backend; `project-types` master data + projects served from the
  mock server with the standard `{ result }` envelope.
- **2026-06-13 — Wizard is a Modal (state-driven), not a route;** the legacy `/projects/new`
  routed drawer + `ProjectsPage` are retired. Workspace placement/scoping stays owned by the
  workspace workstream (§11).
- **2026-06-13 — ADDITIVE approach (supersedes §5/§6 rename/repurpose):** see §17. Industry
  (`type`/`typeId`/`PROJECT_TYPE_*`/`GET /project-types`/`ProjectFields`/`GeneralSettings`) is left
  **untouched**; federation **project type** is added as *new* fields + a *new*
  `GET /project-type-catalog` endpoint + new `PROJECT_TYPE_META` constants + the wizard. Reason: a
  rename/repurpose would break already-shipped `custom-app` (`GeneralSettings`,
  `ImplementationLayout`) and the workspace mocks.

---

## 17. Cross-plan conflict check + revised (additive) design — **authoritative**

Cross-checked against `docs/workspace-feature-plan.md` (Approved/partially built) and the live code.
**No plan-level conflicts** (routing, ownership, endpoints, scope all compatible). The risk is
purely that already-shipped code couples to the project model, so this section pins the
**build-safe, additive** design that supersedes §5/§6 wherever they differ.

### 17.1 Coupling found (must not break)
- `custom-app/GeneralSettings.tsx` reuses `ProjectFormValues` (`type`) + reads `project.typeId` +
  renders `ProjectFields` (industry `Select` fed by `GET /project-types`).
- `custom-app/ImplementationLayout.tsx` passes `project.type` to `SetupWizard`.
- workspace `WorkspaceProjectsView` filter uses `p.type` + `PROJECT_TYPE_LABEL`.
- `workspacesMock.ts` + `dashboardMock.ts` group by `p.projectTypeId` via
  `PROJECT_TYPE_BY_ID`/`PROJECT_TYPE_LABEL`.

### 17.2 Additive rules
1. **Industry stays exactly as-is** — `Project.type: ProjectType`(industry), `Project.typeId`,
   `ProjectFormValues`, `PROJECT_TYPE_*` constants, `GET /project-types`, `ProjectFields`,
   `projectSchema`, `GeneralSettings`. **No renames. `custom-app` is not touched.**
2. **Federation project type is new and separately named:**
   - `Project.projectType: ProjectType` — the **`@wispr/contracts` `ProjectType`**, imported into
     `@wispr/projects` aliased (`import { ProjectType as PlatformProjectType }`) to avoid the
     name clash with the lib's industry `ProjectType`. Default `'custom-app'`.
   - `IProjects.projectType?: string` (federation key) — re-seeded; `mapProject` reads it.
   - `CreateProjectInput.projectType: PlatformProjectType`; `toCreateProjectBody` sends it.
   - **New endpoint** `GET /project-type-catalog` (NOT a repurpose of `/project-types`):
     `API_ENDPOINTS.projectTypeCatalog = 'project-type-catalog'` (additive in contracts).
     Returns `IProjectTypeCatalogEntry[] = { id, key: PlatformProjectType, name, tag, description,
     status: 'available' | 'coming-soon' }`. Hook `useGetProjectTypeCatalogQuery`.
   - **New constant** `PROJECT_TYPE_META: Record<PlatformProjectType, { label, tag, icon, colorSeed }>`
     (frontend presentation: Tabler icon + Mantine palette; label/tag for the card/filter without
     loading the catalog). The wizard uses the **catalog API** for the authoritative list + status.
3. **Only-touch in the workspace surface:** `WorkspaceProjectsView` — switch the type filter to
   `p.projectType` + `PROJECT_TYPE_META[...].label`, and swap its create `Drawer`+`ProjectCreateForm`
   for the `ProjectCreateWizard` `Modal`. (The workspace list/dashboard "by type" chips may stay on
   industry for now; they can move to `projectType` when that session does its pass — non-blocking.)
4. **Card:** `ProjectCard` badge → `PROJECT_TYPE_META[project.projectType].label`.
5. **Resolution:** `project-host/useProject` resolves via `useGetProjectQuery` and maps
   `rich.projectType → contract Project.type`; `ProjectHost` coming-soon-gates before `loadRemote`.

This keeps the change surface to **`@wispr/projects` (lib) + host `features/projects` + host
`features/project-host` + one workspace file**, with **no `custom-app` edits** and no merge clash
with the workspace session beyond the single coordinated `WorkspaceProjectsView` touch.

---

## 18. Strategy type + phase configuration (the strategy "Phases" wizard step) — **authoritative**

> **Status:** Planned (2026-06-13). Expands §2.2 item 8 and **resolves the host↔remote contract**
> that item flagged. Builds on the already-shipped wizard (§17 / Phase-2 by-category picker).
> **Reference prototype:** `STRATEGY_TYPES`, `STRATEGY_PHASE_LIB`, `wizKeys()`, `renderWizStep()`
> (the `phases` key), `phaseTemplateHTML`, `phaseCustomHTML`, `orderPhaseIds`, `buildProjectPhases`.

### 18.1 Why / mental model

A **Strategy** project is **phase-driven**: unlike custom-app (fixed SDLC phases), a strategy
project's phase rail is *configured at creation*. Two things drive it:

1. A **Strategy Type** — a named template (e.g. *Data Strategy*, *Cloud Migration*) that maps to
   an **ordered set of phases**. Strategy types come from the **(mock) API**.
2. A **phase library** — the catalogue of available strategy phases. **Discovery** and **Executive
   Sign-off** are *mandatory* and pinned to the start and end; everything between is configurable.

```
Project Type = strategy
   │
   ▼
 Strategy Type (API)  ──maps to──►  ordered phaseIds  ──persisted on the Project──►  strategy remote
   (Data / Cloud / …)               (from the phase library)                         builds its phase rail
```

So the wizard, **only when the chosen project type is `strategy`**, gains a 4th step — **Phases** —
between *Project Type* and *Review*. For every other type the wizard stays 3 steps (unchanged).

### 18.2 Scope

**In scope (host + shared lib + mock):**
- A **mock strategy-type master-data API** + RTK service (the user's explicit ask — "service should
  be developed but with mock").
- A **mock phase-library API** + service (the phases each type configures; also what the remote
  reads to render the rail).
- The wizard's conditional **Phases step** with the **By strategy type** (template) picker → predefined
  phases + preview.
- **Persisting** the chosen `strategyType` + ordered `phaseIds` on the project (create → store →
  `getProject`), so the strategy remote can build its rail from data.
- The Review step showing the configured phases.

**In scope but phase-able (decide in §18.9):**
- **"Build your own"** custom mode (add / remove / reorder phases; Discovery + Sign-off locked).

**Out of scope (the strategy-remote workstream, next):**
- Rendering the **phase rail** itself and the per-phase inputs/outputs/generation UI — **remote-owned**.
- The in-remote **"Manage phases"** affordance (re-editing phases after creation).
- Any non-strategy type gaining a Phases step.

### 18.3 Master data (ported from the prototype)

**Strategy types** (`STRATEGY_TYPES`) — 4 templates, each an ordered `phaseIds` list:

| key | name | phases (ordered) |
|---|---|---|
| `data` | Data Strategy | discovery · vision · governance · implementation · signoff |
| `cloud` | Cloud Migration | discovery · business-case · vision · risk · implementation · signoff |
| `digital` | Digital Transformation | discovery · vision · operating-model · change · implementation · signoff |
| `ai` | AI & Analytics Strategy | discovery · vision · governance · business-case · implementation · signoff |

**Phase library** (`STRATEGY_PHASE_LIB`) — 10 phases; `discovery` + `signoff` are `mandatory`:

`discovery`* (Discovery & Assessment) · `stakeholder` (Stakeholder Alignment) · `vision` (Vision &
Roadmap) · `business-case` (Business Case) · `governance` (Governance Framework) · `operating-model`
(Operating Model) · `risk` (Risk Assessment) · `implementation` (Implementation Plan) · `change`
(Change Management) · `signoff`* (Executive Sign-off). Each carries `description`, `inputs[]`
(some `mandatory`), and `outputs[]` (`{ name, fmt }`). *(* = mandatory)*

> Content is copied verbatim from the prototype (realistic, no Lorem). The host only needs
> `id/name/description/mandatory` for the picker + preview; the full `inputs/outputs` matter to the
> **remote** rail, so the library API returns them too (one source of truth for both sides).

### 18.4 Data model (additive — `@wispr/projects`, no `custom-app` impact)

```ts
// New master-data DTOs (served by the mock API).
export interface IStrategyTypeOption {
  id: number
  key: string                 // stable slug, e.g. 'data'
  name: string                // 'Data Strategy'
  description: string
  phaseIds: string[]          // ordered library ids this type configures
}
export interface IStrategyPhaseInput  { name: string; mandatory?: boolean }
export interface IStrategyPhaseOutput { name: string; fmt: string }
export interface IStrategyPhase {
  id: string                  // 'discovery' | 'vision' | …
  name: string
  description: string
  mandatory: boolean          // discovery + signoff
  inputs: IStrategyPhaseInput[]
  outputs: IStrategyPhaseOutput[]
}

// Project gains the configured phases (optional; only strategy projects set them).
interface Project {
  // …existing…
  strategyType?: string       // the chosen template key, or undefined for custom / non-strategy
  phaseIds?: string[]         // ordered library ids — the configured rail (data the remote reads)
}
// IProjects (raw) gains the same two optional fields; mapProject copies them through.
// CreateProjectInput gains: strategyType?: string; phaseIds?: string[]
// toCreateProjectBody includes them when present.
// ProjectWizardValues gains: strategyType: string; phaseIds: string[]  (wizard working shape)
```

### 18.5 API contract (mock-first)

Two new GET endpoints (additive in `@wispr/contracts`; same `{ result }` envelope, `axiosBaseQuery`):

| Endpoint (`API_ENDPOINTS`) | Method | Returns | Purpose |
|---|---|---|---|
| `strategyTypes` (`strategy-types`) | GET | `IStrategyTypeOption[]` | the template cards + their phase lists (wizard) |
| `strategyPhases` (`strategy-phases`) | GET | `IStrategyPhase[]` | the phase library (custom mode + the remote rail) |

- New tag `API_TAGS.Strategy` (covers both lists; `id: LIST`).
- RTK hooks `useGetStrategyTypesQuery` / `useGetStrategyPhasesQuery` injected on the shared `api`
  (live in `@wispr/projects` so the strategy **remote** can reuse them for the rail).
- Mock routes in a new `libs/projects/src/strategyMock.ts` (`registerStrategyMockRoutes`, seeded from
  §18.3); registered at host boot beside `registerProjectsMockRoutes()` (gated by `useMocks`). It also
  exposes `readMockStrategyPhases()` for any cross-mock use, mirroring the existing mock pattern.
- `createProject` (existing mock) extended to persist `strategyType` + `phaseIds`; `projects/:id`
  returns them.

### 18.6 Helpers (`@wispr/projects`)

- `orderPhaseIds(ids: string[]): string[]` — dedupe, force `discovery` first + `signoff` last (port).
- `buildProjectPhases(ids, library): ProjectPhase[]` — expand ordered ids → full phase objects
  (id/name/desc/mandatory/inputs/outputs) for the **remote** rail + the Review preview. Pure; takes
  the library as an arg (no module-global), so it's federation-safe.
- A `ProjectPhase` type for the expanded shape (shared so the remote consumes it).

### 18.7 Wizard flow + step machine (host `ProjectCreateWizard`)

The wizard's static 3-step `Stepper` becomes a **dynamic step list** derived from the selected type:

```ts
const steps = projectType === 'strategy'
  ? ['basics', 'type', 'phases', 'review']
  : ['basics', 'type', 'review']
```

- **Type step:** when strategy is selected, the Next button reads **"Configure phases →"**; selecting
  any non-strategy type (or switching away) clears `strategyType` + `phaseIds` and drops the Phases step.
- **Phases step** (`steps/PhasesStep/`): the new step. Intro line + mode toggle (Mantine
  `SegmentedControl`): **By strategy type** | **Build your own**. Discovery + Sign-off are always
  noted as included.
  - *Template mode:* `SimpleGrid` of `StrategyTypeCard`s from `useGetStrategyTypesQuery()` — name,
    description, "{n} phases"; selecting one sets `strategyType` + `phaseIds = orderPhaseIds(type.phaseIds)`.
    Below: a **preview** of the resulting phase chips (mandatory flagged "REQ"), from the phase library.
    Loading → skeleton cards; error → retryable `EmptyState`.
  - *Custom mode (Phase B):* the phase library as a checklist with reorder; Discovery + Sign-off locked
    on; sets `phaseIds`, clears `strategyType`.
  - **Gate:** Next(→ Review) disabled until phases are resolved — template mode needs a selected
    `strategyType`; custom mode needs the 2 mandatory phases (always present). Inline error otherwise.
- **Review step:** adds a "Phases · {Strategy type name | Custom} ({n})" block with the ordered phase
  chips (prototype `rv`/`what-next`). Non-strategy projects show the existing About block.
- **Submit:** `createProject({ …, strategyType, phaseIds })` when strategy; unchanged otherwise.

> **Component reuse:** `StrategyTypeCard` follows the existing `ProjectTypeCard` look (selectable
> tile, accent ring, no hex — Mantine palette). Mantine-first; CSS module only where the grid/preview
> needs it. AI visual language is **not** used here.

### 18.8 The host↔remote contract — **DECIDED**

The flagged decision from §2.2/§8 is resolved as: **phases are project DATA, not a contract-prop or
a URL change.**

- The host wizard writes `strategyType` + ordered `phaseIds` onto the project at create time.
- The strategy **remote** already resolves the project it mounts; it reads `project.phaseIds`
  (+ `strategyType`) from the **rich** project (`useGetProjectQuery`, shared from `@wispr/projects`)
  and expands them via `buildProjectPhases(phaseIds, library)` using the **phase-library API**
  (`useGetStrategyPhasesQuery`, also shared). The host **never** renders the rail.
- The federation-facing `@wispr/contracts` `Project` (and the remote's `ProjectAppProps`) stay
  **minimal and unchanged** — no `phaseIds` added to the contract; the remote fetches the rich project
  itself (same pattern the host uses). This keeps the contract small and the rail fully remote-owned.
- Phase library + strategy types are **shared mock master-data** in `@wispr/projects`, so host and
  remote read one source. Re-editing phases after creation ("Manage phases") is **remote-owned**
  (next workstream) and writes back via `updateProject({ phaseIds })`.

### 18.9 Scope decision — RESOLVED

**2026-06-13 — Build BOTH modes now** (full prototype fidelity): the **By strategy type** templates
**and** the **Build your own** custom editor (add / remove / reorder; Discovery + Sign-off locked at
the ends). Task list §18.11 Phase A + Phase B are a single build.

### 18.10 Code structure / file layout

```
libs/projects/src/
  model.ts          # + IStrategyTypeOption, IStrategyPhase(+Input/Output), ProjectPhase;
                    #   strategyType?/phaseIds? on Project + IProjects + CreateProjectInput;
                    #   strategyType/phaseIds on ProjectWizardValues
  helpers.ts        # + orderPhaseIds, buildProjectPhases; toCreateProjectBody sends the new fields;
                    #   mapProject copies them through
  strategyApi.ts    # NEW — useGetStrategyTypesQuery, useGetStrategyPhasesQuery (inject on shared api)
  strategyMock.ts   # NEW — registerStrategyMockRoutes (strategy-types + strategy-phases seeds)
  projectsMock.ts   # create persists strategyType/phaseIds; projects/:id returns them
  index.ts          # export the new types, hooks, helpers, registerStrategyMockRoutes

libs/contracts/src/
  api.ts            # + API_ENDPOINTS.strategyTypes/strategyPhases, API_TAGS.Strategy

apps/host/src/
  bootstrap.tsx     # registerStrategyMockRoutes() beside the others
  features/projects/components/ProjectCreateWizard/
    ProjectCreateWizard.tsx              # dynamic step list; thread strategyType/phaseIds + submit
    steps/PhasesStep/                    # NEW — PhasesStep.tsx (+ .module.css)
    components/StrategyTypeCard/         # NEW — StrategyTypeCard.tsx (+ .module.css)
    steps/ReviewStep/ReviewStep.tsx      # + phases block
```

### 18.11 Task list (ordered)

**Phase A — strategy type → predefined phases (the ask):**
1. `@wispr/contracts/api.ts` — add `strategyTypes`/`strategyPhases` endpoints + `Strategy` tag.
2. `@wispr/projects/model.ts` — new DTOs + optional `strategyType`/`phaseIds` on Project/IProjects/
   CreateProjectInput; `ProjectWizardValues` gains them.
3. `strategyApi.ts` + `strategyMock.ts` — services + seeded mock; export from `index.ts`; register at boot.
4. `helpers.ts` — `orderPhaseIds`, `buildProjectPhases`; `toCreateProjectBody` + `mapProject` carry the fields.
5. `projectsMock.ts` — persist + return `strategyType`/`phaseIds`.
6. `ProjectCreateWizard` — dynamic steps; `PhasesStep` (template mode) + `StrategyTypeCard`; gate; submit.
7. `ReviewStep` — phases block.
8. Verify: typecheck/lint; create a strategy project → pick a type → phases configured → lands in
   Discovery; confirm the project persists `strategyType`/`phaseIds` (mock localStorage / `getProject`).

**Phase B — custom mode (if approved):**
9. "Build your own" editor in `PhasesStep` (include/exclude + reorder; mandatory locked).

### 18.12 Acceptance criteria

- [ ] Selecting **strategy** adds a **Phases** step; other types keep the 3-step wizard.
- [ ] Strategy types load from the **mock API** via a real RTK service; loading/error/empty handled.
- [ ] Picking a strategy type configures its **predefined phases** (ordered, Discovery first / Sign-off
      last) and previews them; Next is gated until a type is chosen.
- [ ] Create persists `strategyType` + `phaseIds`; `getProject` returns them (verifiable in the mock store).
- [ ] No `any`, no inline styles, no hardcoded hex/emoji; Mantine-first; phase/type content is realistic.
- [ ] The `@wispr/contracts` `Project`/remote props are **unchanged** (phases carried as project data).

### 18.13 Decisions log

- **2026-06-13 — Strategy phases are project DATA.** `strategyType` + ordered `phaseIds` persist on
  the project; the strategy remote reads them (rich `getProject`) and renders the rail. The federation
  contract stays minimal — no phase data on `ProjectAppProps`.
- **2026-06-13 — Mock master-data, shared lib.** Strategy types + phase library are mock APIs in
  `@wispr/projects` (one source for host wizard + remote rail), per the user's "service with mock" ask.
- **2026-06-13 — Conditional 4th step.** The Phases step exists only for `strategy`; the step machine
  is derived from the selected type (no dead step for other types).
- **2026-06-13 — Both modes now (§18.9):** ship the strategy-type templates **and** the "Build your
  own" custom editor in the same build (user-confirmed).
</content>
</invoke>
