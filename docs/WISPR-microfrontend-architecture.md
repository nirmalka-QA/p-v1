# WISPR — Micro-Frontend Architecture

> One shell, one active remote at a time. Each project **type** is an independently deployed React micro-frontend. Everything stateful and shared is provided **once** by the shell at runtime.

---

## 1. Goals

- Each **project type** (Custom App, Data Pipeline, Analytics & BI, SAP, Guidewire, Strategy, Testing) is its own React app with its own phase rail and working surfaces.
- A **shell (host)** owns everything outside a project — dashboard, workspaces, project creation, global nav, auth, theme, routing — and lazy-loads the right remote when you open a project.
- **Independent deploys** per remote with a runtime manifest (ship `strategy` without rebuilding the shell).
- **No buildable-lib rebuild pain**: instant HMR in dev, versioned contracts in prod.
- AI-friendly, single-paradigm, strongly typed.

---

## 2. Decision summary (locked)

| Area | Choice |
|---|---|
| Monorepo | **Nx** + **npm** workspaces |
| Language | **TypeScript (strict)** |
| Framework | **React 19**, **React Router v7** |
| Bundler / federation | **Vite** + **`@module-federation/vite`** (Module Federation 2.0) |
| UI | **Mantine (latest)** — components over raw HTML; custom CSS only with Mantine, pure CSS last resort |
| Server state | **RTK Query** (`axiosBaseQuery`) + **OpenAPI codegen** |
| Client/session state | **Redux Toolkit slices** (no Zustand) |
| Contracts | **`@wispr/contracts`** — zod + TS, single source of truth |
| Auth | **3rd-party OIDC + SSO via Entra ID**, shell-only, silent refresh, RBAC in shell |
| Token storage | **Access token in memory**, **refresh token in httpOnly cookie** |
| Cloud | **Azure** (Static Web Apps + Front Door + Artifacts + Entra ID + App Config + App Insights + Key Vault + Pipelines) |
| Domain | First-party: `app.wispr.com` (shell + remotes via Front Door), `api.wispr.com` (API) |
| Testing | **Vitest + RTL** now; **Playwright e2e** on demand |
| i18n | Out of scope for now |

> **Why Vite (not Rspack):** the existing Custom App is already Vite + RR7 + Redux in production, and Mantine + Vite is the well-trodden path. MF 2.0's runtime (manifest, singletons, version pinning) is now available on the official Vite plugin, so we keep independent-deploy guarantees without migrating the live app's bundler.

---

## 3. System context (high level)

```
                          ┌─────────────────────────────────────────┐
        Browser  ───────▶ │  Azure Front Door  (app.wispr.com)        │
                          └───────┬───────────────────────┬───────────┘
                                  │                        │
                       /  (shell) │            /remotes/<type>/* (remotes)
                                  ▼                        ▼
                        ┌───────────────┐        ┌──────────────────────┐
                        │  SHELL (host) │        │  REMOTE per type      │
                        │  Azure SWA    │        │  custom-app, data-... │
                        └──────┬────────┘        │  each Azure SWA       │
                               │                 └──────────────────────┘
            boot: fetch remote registry (JSON in Blob / App Config)
                               │
                               ▼
        Shared at runtime (federation singletons): React, RR7, Mantine,
        Redux store, RTK Query cache, @wispr/services, @wispr/store, @wispr/mfe-runtime

   Entra ID (OIDC/SSO) ── auth ──▶ Shell only          api.wispr.com ──▶ Backend
   App Insights (telemetry)   App Configuration (feature flags)   Azure Artifacts (npm)
```

**Runtime rule:** exactly **one router**, **one Redux store**, **one RTK Query cache**, **one Mantine theme context** — all created by the shell and shared into the active remote via Module Federation singletons. Remotes never create their own.

---

## 4. Monorepo topology

```
wispr/
├─ apps/
│  ├─ shell/                 # host: auth, dashboard, workspaces, creation, router, ProjectHost
│  ├─ custom-app/            # ← existing Vite app migrated in as the first remote
│  ├─ data-pipeline/
│  ├─ analytics-bi/
│  ├─ sap/
│  ├─ guidewire/
│  ├─ strategy/
│  └─ testing/
├─ libs/
│  ├─ contracts/             # zod + TS types: Project, Workspace, Phase, User, ProjectAppProps
│  ├─ ui/                    # design system built on Mantine
│  ├─ tokens/                # CSS variables + Mantine theme object
│  ├─ services/              # axios instance + interceptor, axiosBaseQuery, shared `api`, auth, telemetry, flags
│  ├─ store/                 # Redux store factory + slices (session, workspace, theme, toasts)
│  ├─ mfe-runtime/           # mount contract types, remote loader, ErrorBoundary, useProjectNavigate
│  └─ utils/
├─ tools/                    # nx generators, openapi codegen config, scripts
├─ nx.json   package.json   tsconfig.base.json   .npmrc (Azure Artifacts)
```

---

## 5. Shared libraries — source vs publish vs singleton

This is the answer to the **"rebuild one remote to propagate a change" pain**. Three modes:

| Lib | Dev mode | Prod / deploy mode | Rationale |
|---|---|---|---|
| `@wispr/contracts` | **source alias** (`tsconfig` paths) | **published + semver** to Azure Artifacts | The shell↔remote agreement must be independently version-pinnable |
| `@wispr/ui` | **source alias** | **published + semver** | Design-system stability across independently-deployed remotes |
| `@wispr/tokens` | **source alias** | **published + semver** | Theme/tokens versioned with UI |
| `@wispr/services` | **source alias** | **federation singleton** (shared at runtime, not published) | One Axios + RTK Query instance lives in the running shell |
| `@wispr/store` | **source alias** | **federation singleton** | One Redux store provided by the shell |
| `@wispr/mfe-runtime` | **source alias** | **federation singleton** | Loader/contract/navigation must be identical instance |
| `@wispr/utils` | **source alias** | **bundled** into each consumer | Pure helpers, no singleton concern |

**In dev, every lib is a non-buildable source library** resolved by Nx TypeScript path aliases (`@wispr/ui` → `libs/ui/src/index.ts`). A change in `libs/ui` hot-reloads in the shell and every running remote **with zero rebuild** — no buildable-target chain to recompile.

**In prod, only the truly shared API surface (contracts/ui/tokens) is published + semver'd** so a remote can pin a version and deploy independently. The stateful libs (services/store/mfe-runtime) are **runtime singletons** via MF `shared`, so they don't need publishing — the running shell supplies the one instance.

> Net effect: painless dev (nothing rebuilds), real independence in prod (versioned contracts), and a single runtime instance for anything stateful.

---

## 6. Module Federation model

- **Composition:** runtime Module Federation 2.0 via `@module-federation/vite`. Not iframes, not build-time.
- **Each remote exposes exactly one entry:** `./ProjectApp` (a React component implementing the contract). It does **not** expose routes or stores.
- **The shell consumes remotes by URL resolved at runtime** from the **remote registry** (see §13), never hardcoded.

**`shared` singletons (declare in shell + every remote):**

```
react, react-dom            → singleton, strictVersion
react-router-dom            → singleton, strictVersion   (one router context)
@reduxjs/toolkit            → singleton
react-redux                 → singleton
@mantine/core               → singleton                  (one theme/styles context)
@mantine/hooks              → singleton
@wispr/services             → singleton                  (one Axios + RTK Query cache)
@wispr/store                → singleton                  (one Redux store)
@wispr/mfe-runtime          → singleton
@wispr/contracts            → singleton (loose version)   (types; runtime-light)
@wispr/ui, @wispr/tokens    → singleton                   (one Mantine theme/components)
```

Getting `react`, `react-router-dom`, `@mantine/core`, `@reduxjs/toolkit`, and `react-redux` as singletons is the #1 correctness requirement — it's what lets the remote use the shell's router, store, and theme instead of needing its own.

---

## 7. Routing model (Option 1 — shell owns the router)

There is **one** `createBrowserRouter()` in the running app, in the shell. Remotes never create a router; they render a relative `<Routes>` into the shell's router context (works because `react-router-dom` is a singleton).

```tsx
// shell router
createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/workspaces/*', element: <Workspaces /> },
  { path: '/p/:projectId/*', element: <ProjectHost /> },  // splat → handed to the remote
]);
```

```tsx
// shell: ProjectHost — resolves project type → lazy-loads the matching remote
const project = useProject(projectId);
const ProjectApp = useRemote(project.type);   // dynamic MF import via registry
return (
  <RemoteErrorBoundary type={project.type}>
    <Suspense fallback={<PhaseRailSkeleton/>}>
      <ProjectApp {...buildContract(project)} basePath={`/p/${projectId}`} />
    </Suspense>
  </RemoteErrorBoundary>
);
```

```tsx
// remote: ProjectApp — relative routes only, no router
export default function ProjectApp({ basePath }: ProjectAppProps) {
  return (
    <Routes>
      <Route index element={<Initiation/>} />
      <Route path="planning" element={<Planning/>} />
      {/* …type-specific phase routes… */}
    </Routes>
  );
}
```

Rules: remotes use **relative paths + relational hooks** (`useNavigate`, relative `<Link>`); navigation out of a remote goes through the contract (`onNavigate('/workspaces')` or `useProjectNavigate` from `@wispr/mfe-runtime`). Deep links and hard refresh work because the URL is real and `ProjectHost` re-resolves the remote on load.

---

## 8. State & data

- **One Redux store**, created by `@wispr/store`'s `makeStore()` and instantiated **only in the shell**; remotes consume it via `react-redux` (singleton). Remotes never call `configureStore`.
- **Server state → RTK Query** in `@wispr/services`: a base `api` created with `axiosBaseQuery`, then `api.injectEndpoints` per feature (shell and remotes inject their own endpoints into the same instance → one cache).
- **Client/session state → RTK `createSlice`** in `@wispr/store`: `session` (user, tokens-in-memory ref, RBAC), `workspace` (active workspace), `theme`, `toasts`.
- **OpenAPI codegen:** `@rtk-query/codegen-openapi` generates typed endpoints from the backend spec into `@wispr/services`. Wired now against a **placeholder spec**; flip to the real Swagger when the backend team delivers it.

---

## 9. Auth & RBAC

OIDC + SSO via **Entra ID**, driven **only** by the shell.

- **Flow:** shell runs the OIDC Authorization Code + PKCE flow → backend session establishes an **httpOnly, Secure, SameSite refresh cookie**; the **access token is held in memory** in `@wispr/services` (and a non-persisted `session` slice). On boot the shell attempts **silent refresh** before routing.
- **Token storage:** access token **in memory only** (never localStorage/sessionStorage/IndexedDB); refresh token in **httpOnly cookie** (XSS-safe, sent automatically with `withCredentials: true`). CSRF protection via SameSite + double-submit token if the backend requires.
- **401 handling:** **single-flight silent refresh** — one refresh call; concurrent 401s queue and replay after it resolves; on refresh failure the shell dispatches logout.
- **Logout:** shell-only; clears in-memory token + session slice, revokes cookie, broadcasts via store + event bus so the active remote tears down.
- **RBAC:** roles/permissions computed in the shell and passed to the remote read-only through the contract (`user.roles`, `can(permission)`); remotes render permission-gated UI but never make auth decisions of record.

---

## 10. Theming & UI (Mantine)

- `libs/tokens` holds **CSS variables** (the existing light/dark prototype theme) and derives a **Mantine theme object** from them.
- `libs/ui` is the design system built **on Mantine components** (not raw HTML). Custom CSS only with Mantine; pure custom CSS is the last resort.
- The shell wraps the app in **one `MantineProvider`** with the token-driven theme; remotes inherit it through context (Mantine singleton) and **do not** wrap their own provider in the composed app.
- **Standalone dev** mode (see §14) wraps each remote in its own `MantineProvider` so it renders correctly when run alone.

---

## 11. Cross-cutting services (injected via contract)

All provided by the shell, exposed to remotes through the contract `services` bag so there's one instance of each:

- **Error isolation:** every remote is wrapped in a shell-side `RemoteErrorBoundary` — a remote crash shows a fallback, never takes down the shell.
- **Toasts/notifications:** shell-owned singleton (`services.notify`); a remote *may* add its own local toasts but shared notifications go through the shell.
- **Feature flags:** `services.flags` backed by **Azure App Configuration + Feature Management** — gates whether a remote/phase is shown.
- **Telemetry/analytics:** `services.telemetry` backed by **Application Insights** — interface stubbed now (future scope), injection point present from day one.

---

## 12. The shell ↔ remote contract

```ts
// @wispr/contracts
export interface ProjectAppProps {
  contractVersion: string;        // semver of this contract; shell checks compatibility
  projectId: string;
  workspace: WorkspaceRef;
  user: User;                     // includes roles
  can: (perm: Permission) => boolean;
  theme: 'light' | 'dark';
  basePath: string;               // remote's router basename, e.g. /p/123
  services: {
    api: ApiClient;               // shared RTK Query / axios
    notify: NotifyService;
    flags: FlagService;
    telemetry: TelemetryService;
  };
  onNavigate: (path: string) => void;
  eventBus: EventBus;             // mitt — logout, theme-change, etc.
}
```

**Versioning & compatibility:** `@wispr/contracts` is semver'd and published. Each remote builds against a contract version and advertises it in its `mf-manifest.json` metadata. On load, the shell checks the remote's `contractVersion` against its own supported range and, on mismatch, renders a graceful "update required" fallback instead of crashing. This is what makes "independent deploy" safe rather than fragile.

---

## 13. Azure deployment topology

| Concern | Azure service |
|---|---|
| Shell hosting | **Azure Static Web Apps** (own deploy) |
| Each remote hosting | **Azure Static Web Apps** (one per remote, independent deploy + preview envs) |
| Single edge / first-party domain | **Azure Front Door** — `app.wispr.com/*` → shell, `app.wispr.com/remotes/<type>/*` → remote SWA, `api.wispr.com` → API |
| Private npm (contracts/ui/tokens) | **Azure Artifacts** |
| Identity (OIDC + SSO) | **Microsoft Entra ID** |
| CI/CD | **Azure Pipelines** (Nx affected + cache; Nx Cloud optional for distributed cache) |
| Feature flags | **Azure App Configuration + Feature Management** |
| Telemetry | **Application Insights** |
| Secrets / runtime config | **Azure Key Vault** |
| Remote registry / manifest | **Blob Storage** (or App Configuration) JSON |

Front Door under one parent domain keeps the **auth cookie first-party** — the reason we route remotes under `app.wispr.com/remotes/<type>` rather than separate origins.

---

## 14. Runtime manifest / remote registry & dev experience

**Registry** = a small JSON the shell fetches at boot, mapping project type → remote entry + version:

```json
{
  "custom-app":   { "entry": "https://app.wispr.com/remotes/custom-app/mf-manifest.json",   "version": "1.4.2" },
  "strategy":     { "entry": "https://app.wispr.com/remotes/strategy/mf-manifest.json",      "version": "0.9.0" }
}
```

Editing this JSON (in Blob/App Config) **points the shell at a new remote version or rolls back — with no shell rebuild**. MF 2.0's manifest + version pinning enforces singleton/contract compatibility at load.

**Local dev:** the shell always runs; the developer **chooses which remote(s) to boot** (one, several, or all). Each remote also has a **`bootstrap.standalone.tsx`** that wraps it in its own `MantineProvider`, a mock contract, and a mock store, so it can run fully in isolation. Non-booted remotes are simply absent from the local registry (the shell shows a "remote not running" fallback for those types).

---

## 15. CI/CD

- **Nx affected + cache** so only changed apps/libs build and test.
- **Publish job** for `@wispr/contracts|ui|tokens` to Azure Artifacts on semver bump.
- **Per-remote deploy pipelines** to each SWA; a deploy updates the registry JSON entry for that type.
- **Quality gates:** TS strict, ESLint, Vitest unit (now), Playwright e2e (added on demand later).

---

## 16. Migration plan (phased, low-risk)

1. **Stand up** the Nx monorepo (npm, TS strict, tsconfig path aliases, Azure Artifacts `.npmrc`).
2. **Bring the existing Vite Custom App in unchanged** as `apps/custom-app` (it already runs; don't refactor yet).
3. **Extract shared pieces** out of it into `libs/contracts`, `libs/ui`, `libs/tokens`, `libs/services`, `libs/store` (source libs).
4. **Build `apps/shell`** (auth/OIDC, dashboard, workspaces, creation, router, `ProjectHost`, registry loader, MantineProvider). Initially it can statically import custom-app, then switch to federated.
5. **Convert custom-app into a remote** — expose `./ProjectApp`, accept the contract, render relative `<Routes>`, add `bootstrap.standalone.tsx`, add `@module-federation/vite` config with the shared singletons.
6. **Scaffold the other six remotes** from a thin template (contract + phase-rail shell + standalone bootstrap), fill per type.
7. **Wire Azure** — SWAs, Front Door routing, Artifacts, Entra ID, App Config, App Insights, registry JSON, Pipelines.
8. **Flip OpenAPI codegen** to the real Swagger when delivered.

---

## 17. Risks & open items

- **Backend contract is TBD** — `@wispr/contracts` (zod) is the interim source of truth; RTK Query codegen is wired to a placeholder spec and flipped on delivery.
- **Cross-origin cookies** — mitigated by the single-parent-domain Front Door layout; revisit if any remote must live on a different origin (`SameSite=None; Secure` + CORS credentials).
- **Mantine + MF singleton** — `@mantine/core` must be a strict singleton; verify the styles layer is shared (Mantine 7+ uses native CSS/CSS-modules + CSS variables, which composes cleanly).
- **`@module-federation/vite` dev HMR across the boundary** — acceptable for this topology; standalone dev mode is the primary fast inner loop.
- **Contract drift** — enforced by the `contractVersion` check + semver'd `@wispr/contracts`.
