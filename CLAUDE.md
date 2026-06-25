# WISPR Platform

## Project

WISPR is an internal AI-powered SDLC platform. It gives the entire team — PMs, BAs,
developers, and QA — one place to manage the full software delivery lifecycle across
five sequential phases.

Each phase has a defined input, output, and a human approval gate before advancing:

| Phase | Input | Output | Gate |
|---|---|---|---|
| Discovery | Files, transcripts, typed context | Structured Knowledge Base | KB has at least 1 section with content |
| Planning | Knowledge Base | Approved feature list | User clicks "Approve Plan" |
| Features | Approved features + KB | User stories marked Ready for Dev | At least 1 story marked Ready |
| Implementation | Ready stories + tech stack | Generated code + repo view | Dev marks story Implemented |
| Test | Implemented stories + test stubs | Test cases with pass/fail status | No hard gate |

The Knowledge Base from Discovery is the shared context for every AI action in every
subsequent phase.

Strickly follow Design reference, no compromize on UI,UX - `docs/wispr-prototype.html`.

---

## Monorepo & Micro-Frontend Architecture

WISPR is an **Nx monorepo** (npm, TS strict). A **host (shell)** composes
**per-project-type remotes** at runtime via **Module Federation 2.0**
(`@module-federation/vite` — NOT `@nx/webpack`/Rspack). Exactly one React,
router, Redux store, RTK Query cache and Mantine theme exist at runtime, owned by
the host and shared into the active remote as MF singletons.

```
apps/  host  custom-app  data-pipeline  strategy   (each: module-federation.config.ts + thin vite.config.ts)
libs/  @wispr/{contracts,ui,tokens,services,store,mfe-runtime,utils}   (non-buildable SOURCE libs, @wispr/* path aliases)
tools/ mf/shared.ts (the one shared-singleton block) · mf/remotes.ts (remote registry) · vite/wispr-aliases.ts · openapi/
```

**Dev workflow** (see `README.md` for full detail):
- `npm run dev` — one command: host (dev) + all remotes (preview); federation composes.
- `npm run serve:<app>` — a single app standalone (fast inner loop; remotes use `bootstrap.standalone.tsx` + a mock contract).
- `npm run build | typecheck | lint | test` — `nx run-many` across the workspace.

**Federation rules / gotchas (load-bearing — keep these in mind):**
- The exposed remote entry **must be a default export** (`apps/<remote>/src/ProjectApp.tsx`). This is the **only** place `export default` is allowed (it overrides the named-exports-only rule).
- The MF `shared` block lives in `tools/mf/shared.ts` — host + every remote import it so shared deps match. `@wispr/*` libs are pinned to a version there (no package.json version → MF can't resolve them as singletons otherwise).
- Federation apps (`host`, remotes) are **excluded from `@nx/vite`** in `nx.json` (its graph step hangs evaluating the MF config) and use **explicit Nx targets** in `project.json`. `custom-app` still uses `@nx/vite` inference.
- The host loads remotes via `@module-federation/runtime`'s `loadRemote` (`apps/host/src/boot/remoteImporter.ts`); URLs come from `apps/host/public/registry.json` (never hardcode remote URLs in components). Only declare remotes that are actually running, or MF init fails for all.
- **Dev cross-origin federation is unreliable** — the host runs in dev, remotes run as built previews. Don't expect a remote's dev edits to hot-reload inside the host; rebuild it (`npm run remotes`) or develop it standalone.
- Host auth seeds a dev user ONLY when `VITE_DEV_AUTH=true` (backend-less preview escape hatch). By default — including `npm run dev` — the real Entra/IAM OIDC flow runs first. Real auth is host-only.
- **The `@wispr/*` Vite aliases BYPASS MF share resolution** (the build warns "alias conflicts with shared modules") — the host and a mounted remote each carry their own COPY of the lib code. Therefore every stateful object in `@wispr/services` (RTK `api`, axios `http`, runtime config, event bus, mock-route registry, token context) lives in a **`globalThis` singleton slot** (`libs/services/src/globalSingleton.ts`). Any new module-level mutable state in a shared lib MUST use `globalSingleton(...)` or a remote's copy will silently diverge (symptom: a remote's injected endpoints never resolve — permanent skeletons).
- **Mantine CSS MUST be the layered build, and CSS `@layer` order is load-bearing.** Three tiers, lowest→highest: **`base`** (the universal `*{margin:0;padding:0}` reset in `@wispr/tokens/tokens.css`) < **`mantine`** (all `@mantine/*/styles.layer.css` — core/notifications/dates/dropzone/tiptap/code-highlight) < **unlayered** (our CSS-module styles + the design tokens). Why each boundary matters under Module Federation (host CSS and remote CSS inject separately, in nondeterministic order):
  - *mantine below unlayered* — otherwise Mantine's component resets (e.g. `UnstyledButton`'s `padding:0`, equal specificity to our hashed module class) win by source order and flatten remote components (symptom: default padding/font — the phase rail bug).
  - *base below mantine* — otherwise the unlayered `*{padding:0}` reset would beat Mantine's own component padding and flatten EVERY Mantine component (cards, buttons, inputs).
  - The order is declared as an inline `<style>@layer base, mantine;</style>` in **every app's `index.html` `<head>`** (parsed before any JS-injected CSS — immune to bundler/minifier reordering; a bare `@layer …;` statement inside a CSS file gets stripped by lightningcss). `tokens.css` (which defines the `base` layer + unlayered tokens) is imported BEFORE the Mantine stylesheets in each entry. Never import the non-layer `styles.css`, and never put the reset outside `@layer base`. Comment gotcha: never write `*/` inside a CSS comment (e.g. a `@mantine/<pkg>/…` glob) — it closes the comment early.
- **Mock data mode:** `VITE_USE_MOCKS=true` serves all API routes from the in-browser mock server (`registerMockRoutes` in @wispr/services; project routes in @wispr/projects; phase routes in `apps/custom-app/src/services/mocks/`) with localStorage persistence. Auth stays real; data is mocked. See README "Mock data mode".

**Chrome ownership (host vs remote) — load-bearing:**
- The **host owns the global top bar end to end** (`apps/host/src/components/layout/TopBar/`). The **right cluster** (`TopBarActions` — help, support, theme toggle, profile + sign out) is **shared and renders in every context**. The left/centre cluster is **context-aware**: **in a project** (`/projects/:id/*`) it is the brand + the **project dropdown** (`ProjectNav` — the prototype `.proj-dd`), which bundles every cross-cutting project action (Go to workspace, context-budget readout, Knowledge Base, Members, Project Details, Connectors, Settings, Help, Support); there is **no project switcher** in project context. **Everywhere else** (workspace list/dashboard/home) it is the Dashboard ⁄ Workspaces nav (or workspace switcher + tabs). **Remotes contribute nothing to the top bar.**
- A **remote owns its workspace chrome** below the bar — the SDLC phase rail, sidebar, assistant, status bar — because those are project-type-specific.
- The host opens project settings/sub-surfaces by setting the `?settings=<section>` search param (`SETTINGS_PARAM` + the shared `SETTINGS_SECTIONS` keys in `@wispr/contracts`); the **remote** owns the settings modal and renders the section (`general`, `details`, `members`, `instructions`, `integrations`, `connectors` — the host dropdown deep-links to these). Use URL/param or the contract event bus to bridge host↔remote — never reach a host component into a remote's internals (or vice-versa).

**Migration status:** Complete. Nx conversion + `@wispr/*` libs + host are in place; `data-pipeline` is a sandbox remote; **`strategy` is a phase-driven workspace remote** (its rail is built from the project's configured `phaseIds` — see `docs/strategy-remote-plan.md`); **`custom-app` is a workspace-only remote.** The host owns auth, the **workspace list/creation + the admin global dashboard (the app entry point — see below)**, the project list/creation flow, the shared project domain (`@wispr/projects`), and the global top bar. Keep this section and `README.md` updated when dev-experience or project-level config changes.

**Workspace entry model (Phase 1 complete):** The app opens on the **workspace list** (`/workspaces`) — the cold-load and post-OIDC landing — not a flat project list. A **workspace** groups related projects and is the unit of shared context / membership; a project always belongs to exactly one workspace via `Project.workspaceId`. Host routes added: `/workspaces` (list), `/dashboard` (org-wide KPIs, `platformAdmin`-only), `/workspaces/:workspaceId` (workspace home → its scoped project list). **Routing is flat (Approach A): project detail stays `/projects/:projectId/*` with the remote `basePath` UNCHANGED** — workspace scoping is carried as data, not a URL segment. The old global `/projects` list is **retired** (redirects to `/workspaces`). Workspaces are **host-only** — no `@wispr/workspaces` lib; the entity/API/mock/helpers/UI live under `apps/host/src/features/{workspaces,global-dashboard}/`, and a remote only ever receives the minimal `WorkspaceRef` via props. Full design + scope: `docs/workspace-feature-plan.md`. **Phase 2 is implemented (host):** the workspace home is tabbed via `?view=projects|dashboard|members` (TopBar `WorkspaceHomeNav` drives the param); a per-workspace **dashboard** with a "view as member" role simulation, a **members** view + invite/role/remove, a **settings modal** (`?settings=general|instructions|people|danger`: General, Instructions, People & Roles, Danger-zone delete that cascades to the workspace's projects), and an **artifact library** with upload/preview/delete. Member/artifact/workspace mutations live on `workspacesApi` with matching `workspacesMock` routes; the top-bar workspace switcher is live. The only remaining deferred item across both plans is the **strategy phase-config** wizard step (needs the strategy remote). The project create wizard's Phase 2 (All-types ⁄ By-category picker + optional industry select) is also done.

**Keeping docs current:** when you change developer experience (scripts, run modes) or project-level config (Nx targets, MF config, tooling), update `README.md` and this section in the same change.

---

## Architecture

**File & folder structure is a hard requirement.** Follow it exactly. Deviation is
allowed ONLY for the framework/tooling entry files explicitly listed under
"Allowed edge cases" below — nothing else. Cross-app shared code lives in
`libs/@wispr/*`, never duplicated per app.

### App layout — `apps/<app>/src/` (host + every remote)
```
apps/<app>/
  module-federation.config.ts   # MF config (name/exposes/remotes/shared) — beside vite.config.ts
  vite.config.ts  index.html  project.json  tsconfig*.json
  src/
    main.tsx                     # entry — MF async boundary: import('./bootstrap…')
    bootstrap.tsx                # host: boot sequence + render
    bootstrap.standalone.tsx     # remote: standalone boot (own providers + mock contract)
    ProjectApp.tsx               # remote ONLY: the federated entry (default export, relative <Routes>)
    app/                         # app-wide wiring, NOT a feature:
                                 #   App.tsx, router.tsx, store.ts, services.ts, mockContract.ts
    components/
      ui/                        # app-local shared UI (check @wispr/ui FIRST)
      layout/                    # app-shell layout components
    features/<feature>/          # all feature code — see "Within a feature"
    hooks/                       # app-shared hooks (used by 2+ features)
    types/                       # app-local shared types (prefer @wispr/contracts for cross-app)
```

### Within a feature — `features/<feature>/`
```
<feature>/
  <Feature>.tsx          # Page entry component
  components/
    <Component>/         # one folder per component (co-locate <Component>.tsx + its .module.css)
  list/  detail/  form/  # View sub-folders as needed
  utility/
    constants/           # constants.ts (feature-scoped), constant.ts (module-wide)
    enums/               # enum.ts
    models/              # model.ts — interfaces & types
    services/            # services.ts — RTK Query endpoints (injectEndpoints on base service)
    slices/              # slice.ts — Redux slices (UI/filter/pagination state only)
    helpers/             # helpers.ts — pure functions
    hooks/               # feature-local hooks (a hook used across features → src/hooks/)
    validations/         # validation.ts — Yup schemas
    styles/              # CSS modules
```
Read `utility/models/model.ts` before editing any service or slice. Reuse existing hooks, models, services, constants, and UI patterns before creating new ones.

### Library layout — `libs/<lib>/src/`
```
libs/<lib>/
  project.json  tsconfig.json
  src/
    index.ts                     # barrel — the ONLY public surface; consumers import from '@wispr/<lib>'
    <module>.ts                  # one responsibility per module
    <group>/                     # group related modules (e.g. store's slices/)
    components/
      <Component>/               # ONE FOLDER PER COMPONENT — co-locate its files:
        <Component>.tsx          #   the component
        <Component>.module.css   #   its OWN styles (only if it has any)
        helpers.ts / model.ts    #   component-specific helper/types, if any
```
Consumers import only from the `@wispr/<lib>` barrel — never reach into a lib's internal file path.

**Component co-location (apps + libs):** every component lives in its **own
folder** with its related files beside it — the `.tsx` and its own
`<Component>.module.css`. Do NOT keep components in a flat list, and do NOT share
one catch-all CSS module across components; a component's styles live with that
component. (Genuinely cross-component/feature styles may live in `utility/styles/`.)

Do not create new top-level folders inside `src/` without explicit instruction.

### Allowed edge cases (the ONLY permitted deviations)
`main.tsx`, `bootstrap.tsx`, `bootstrap.standalone.tsx`, `ProjectApp.tsx` (remote
entry), `module-federation.config.ts`, `vite.config.ts`, `*.d.ts` (e.g.
`remotes.d.ts`), `index.html`, and `public/`. These sit at their conventional
locations. Everything else MUST follow the structure above.

---

## Key Conventions

**Exports:** Named exports only — never `export default`. **One exception:** a
remote's federated entry `apps/<remote>/src/ProjectApp.tsx` must be a default
export (Module Federation requires it). Nowhere else.

**Types:** All shared types live in `src/types/index.ts`. Never duplicate a type. Never use `any`.

**API calls:** Always through service files in `src/services/`. Never call axios or fetch
directly in a component.

**Routing:** All routes defined in `src/app/router.tsx` only. Route strings only from
`src/constants/routes.ts` — never hardcoded in components.

**Components — hierarchy (follow in order, stop when sufficient):**
1. Mantine component (`Button`, `Box`, `Stack`, `Group`, `Text`, `Title`, `TextInput`, etc.) — always the first choice.
2. If no Mantine component covers the need, ask before writing custom HTML. Do not silently reach for a `<div>`.
3. Never use raw HTML elements (`div`, `span`, `button`, `input`, `label`, `p`, `h1`…) in TSX files. Use Mantine equivalents (`Box`, `Group`, `Text`, `Title`, `UnstyledButton`, `TextInput`). **One exception only:** the single root element of a CSS Module layout wrapper (one per file, not inside render logic).

**Styling — hierarchy (follow in order, stop when sufficient):**
1. Mantine style props (`p`, `m`, `c`, `fw`, `fz`, `bg`, `radius`, `gap`, `justify`, `align`, `display`, etc.).
2. Mantine theme tokens in props — `color="indigo.5"`, `color="var(--mantine-color-indigo-5)"`.
3. Project CSS custom properties — `color: var(--cl-accent)`, `var(--cl-border)`, etc. (defined in `src/index.css`). Never write the hex value the variable maps to.
4. CSS Module class — only when none of the above achieve the design reference. Every class must be reusable and semantically named (not `.blueButton`, but `.primaryAction`).

Never: `style={{ }}` inline, hardcoded hex/rgb/hsl values anywhere, Tailwind classes.

**Constants — no magic strings:**
Route paths come from `ROUTES` (`src/constants/routes.ts`). Phase IDs come from `PHASES` / `PHASE_ORDER` (`src/constants/phases.ts`). KB section IDs come from `KB_SECTIONS` (`src/constants/kb-sections.ts`). **RTK Query tag types and API endpoint paths come from `src/constants/api.ts`** (`API_TAGS` / `API_TAG_LIST` for `createApi`/`injectEndpoints` tags, `API_ENDPOINTS` for `query` URLs) — never inline `'projects'` or `{ type: 'Project' }` literals in a service file. Status values come from TypeScript union types — never from string literals like `'ready'` or `'done'` in logic. Role names come from `User['role']` type. If a string appears twice in logic, it belongs in a constant.

**AI actions:** `variant="light" color="violet"` with `IconSparkles` — always. This is
the visual language for every AI-triggered button in the app.

**Notifications:** `notifications.show()` from `@mantine/notifications` — never `alert()`.

**Forms:** `useForm` from `@mantine/form` — never individual `useState` per field.

**Async operations:** Every one needs all three states — loading (Skeleton), error
(EmptyState with retry), empty (EmptyState with next-step guidance).

---

## Code Quality

**Non-negotiable, every change:** keep all code **clean, high-quality, modular,
maintainable, and easy to read, debug, and extend.** Concretely:
- One responsibility per file/function; small, well-named units. If a file does
  two jobs, split it along the folder structure above.
- Names say what/why. No dead code, no commented-out code, no `console.log`,
  no magic strings/numbers (use constants), no `any`.
- Prefer composition and props over duplication; extract anything used twice
  (hooks / utils / `@wispr/*` / shared components).
- Make failures debuggable: explicit error handling, meaningful messages, clear
  state (loading/error/empty) — never swallow errors.
- Leave the code better than you found it; match surrounding style.

### SOLID

| Principle | Rule |
|---|---|
| **Single responsibility** | One component, one job. A component that fetches data must not own layout logic. A layout component must not contain business logic. |
| **Open / closed** | Extend shared components via props and composition. Never modify a shared component (`src/components/ui/`) to add phase-specific behaviour — wrap it instead. |
| **Liskov substitution** | Props that accept a callback or a component should work with any valid implementation, not just the current one. |
| **Interface segregation** | Keep prop interfaces narrow. A component that needs a project name should receive `name: string`, not the entire `Project` object. |
| **Dependency inversion** | Components depend on hooks and props, never on concrete service imports. Service calls belong in thunks, hooks, or page-level orchestrators — not inside reusable components. |

### DRY

- Any logic used in **two or more places** belongs in `src/hooks/`, `src/utils/`, or `src/components/ui/`. Never copy-paste business logic between features.
- Any UI pattern used in **two or more phases** belongs in `src/components/ui/`. Never rebuild a phase-specific version of an existing shared component.
- Never duplicate a type — extend or narrow `src/types/index.ts`.
- Never duplicate a constant — add to the relevant file in `src/constants/`.

---

## Routes

```ts
export const ROUTES = {
  login: '/login',
  // Workspaces are the app entry point (flat project routing — Approach A).
  workspaces: '/workspaces',
  globalDashboard: '/dashboard',
  workspace:      (id: string) => `/workspaces/${id}`,
  projects: '/projects',          // retired global list — redirects to /workspaces
  projectNew: '/projects/new',
  project:        (id: string) => `/projects/${id}`,
  discovery:      (id: string) => `/projects/${id}/discovery`,
  planning:       (id: string) => `/projects/${id}/planning`,
  features:       (id: string) => `/projects/${id}/features`,
  implementation: (id: string) => `/projects/${id}/implementation`,
  test:           (id: string) => `/projects/${id}/test`,
} as const
```

---

## Phase Rail Gates

- **Planning** locked until KB has ≥1 section with content
- **Features** locked until Planning is approved
- **Implementation** locked until ≥1 story is Ready for Dev
- **Test** locked until ≥1 story is Implemented

Locked phase: show lock icon, tooltip explains the prerequisite.

---

## Knowledge Base Sections (hardcoded)

Defined in `src/constants/kb-sections.ts`. Do not make dynamic.

1. Business Requirements
2. Problem Statements
3. Proposed Solutions
4. Architectural Notes
5. Tech Stack
6. Timeline & Milestones
7. Stakeholders
8. Open Questions
9. Other Notes

---

## API Contracts

**Data layer:** RTK Query, but the base service uses a **custom `axiosBaseQuery`** built on the shared **axios** instance (`libs/services/src/http.ts`) — **never `fetchBaseQuery`** (axios auto-parses JSON regardless of the response `Content-Type`, which the API does not always set). Base URL from `API_URL` (`apiUrl`, configured via `configureServices`). Auth is attached by the **axios request interceptor**: `Authorization: Bearer <OIDC access token>` (from `getAccessToken()`). Endpoints return axios-style args `{ url, method, data, params }`; tag types & paths come from `src/constants/api.ts`.

```
# Projects
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id

# Discovery
POST   /projects/:id/uploads
GET    /projects/:id/uploads
DELETE /projects/:id/uploads/:fileId
POST   /projects/:id/generate-kb
GET    /projects/:id/kb
PATCH  /projects/:id/kb/sections/:sectionId

# Planning
GET    /projects/:id/features
POST   /projects/:id/generate-features
POST   /projects/:id/features
PATCH  /projects/:id/features/:fid
DELETE /projects/:id/features/:fid
POST   /projects/:id/features/approve
PATCH  /projects/:id/features/reorder

# Features phase
GET    /features/:fid/stories
POST   /features/:fid/generate-stories
POST   /features/:fid/stories
PATCH  /stories/:sid
DELETE /stories/:sid
POST   /stories/:sid/impact-check
PATCH  /stories/:sid/status

# Implementation
GET    /projects/:id/tech-stack
PATCH  /projects/:id/tech-stack
POST   /projects/:id/suggest-tech-stack
POST   /stories/:sid/generate-code
GET    /projects/:id/repo
GET    /projects/:id/repo/file?path=

# Test
GET    /stories/:sid/tests
POST   /stories/:sid/generate-tests
POST   /stories/:sid/tests
PATCH  /tests/:tid
DELETE /tests/:tid
```
---

## Error Handling

- Never swallow errors silently. Log with enough context to diagnose.
- User-facing error messages must be human-readable — no raw exceptions, no stack traces.
- Every external call (API, file system) must have a failure path handled explicitly.

---

## Documentation

- A public function or module needs a short plain-English comment explaining **why** it exists, not just what it does.
- TODO comments must include a reason and an owner: `// TODO(ana): remove after API v2 migration`.
- Never leave commented-out code — delete it; version control has the history.

---


## Shared UI Components

Build these first. Every phase uses them. Do not rebuild per-phase equivalents.

| Component | Purpose |
|---|---|
| `AIPlaceholder` | Dashed-border box, violet AI badge, trigger button. Shown before any AI action runs. |
| `EmptyState` | Icon + title + description + optional CTA. Used on every empty list or section. |
| `StatusBadge` | Maps `StoryStatus` / `TestStatus` to Mantine colour + label. |
| `AIProgressSteps` | Sequential step list with pending/running/done/error states. |
| `ComingSoon` | Placeholder for out-of-scope features. |
| `PageHeader` | Consistent page top — title, description, actions slot. |
| `ConfirmModal` | Reusable confirmation dialog for destructive/gate actions. |

---

## Out of Scope

These features must not be built. Use `<ComingSoon />` instead:

- API Swagger / OpenAPI generation
- In-browser code editing
- Direct repo commits from the platform
- Branch switching in repo viewer
- Automated test execution
- Real-time multi-user collaboration

Full list with rationale: `docs/requirements.md` section 10.

**Now in scope** (built in the Implementation › Design sub-page — `src/features/implementation/components/design/`):

- AI tool selector + instruction-file generation — `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md` via the AI Instructions tab (`AI_FORMAT_FILENAME` / `buildAiInstructions`).
- Figma integration — connection captured in the Connections & References tab.
- External design reference links — Connections & References tab; folded into the generated AI instructions.

---

## Do Not

- Use `any` in TypeScript
- Call `fetch` or `axios` directly in a component
- Hardcode route strings — use `ROUTES` constants
- Use inline styles (`style={{ }}`) — use Mantine props or CSS Modules
- Use raw HTML elements (`div`, `span`, `button`, `input`, `p`, `h1`…) in TSX — use Mantine equivalents. Only exception: the single root wrapper of a CSS Module layout file
- Reach for custom HTML or a custom component before checking Mantine first — if Mantine has no fit, ask before building custom
- Write hardcoded colours (hex/rgb/hsl) anywhere — use Mantine theme tokens or project CSS custom properties (`var(--cl-*)`)
- Use magic strings in logic — fetch from `src/constants/` or a TypeScript union type
- Duplicate logic, UI patterns, types, or constants — extract per DRY (hooks / utils / ui / types / constants)
- Put business logic or service calls inside a reusable component — keep components dependency-inverted (props + hooks only)
- Leave `console.log` in code
- Use `export default`
- Install a new package without asking first
- Build anything in the Out of Scope list above
- Skip loading, error, or empty states
- Write placeholder text as Lorem ipsum — all content must be realistic and domain-appropriate


Ask one question at time.