# WISPR — Micro-Frontend Platform

An Nx monorepo for the WISPR AI-SDLC platform. A **host (shell)** app composes
**per-project-type remote** apps at runtime via **Module Federation 2.0**
(`@module-federation/vite`). Exactly one React, router, Redux store, RTK Query
cache and Mantine theme exist at runtime — all provided by the host and shared
into the active remote as MF singletons.

- Architecture: [`docs/WISPR-microfrontend-architecture.md`](docs/WISPR-microfrontend-architecture.md)
- Setup spec: [`docs/WISPR-setup-prompt.md`](docs/WISPR-setup-prompt.md)
- Product requirements & conventions: [`CLAUDE.md`](CLAUDE.md)

---

## Workspace layout

```
apps/
  host/            # shell: auth, workspaces + global dashboard, project list/creation, global top bar, router, ProjectHost (loads remotes)
  custom-app/      # workspace remote — the "custom app" project type
  data-pipeline/   # remote (sandbox)
  strategy/        # remote (sandbox)
    module-federation.config.ts   # each app's MF config (name/exposes/remotes/shared)
    vite.config.ts                # thin: federation(mfConfig) + shared aliases
libs/              # @wispr/* source libraries (resolved by tsconfig paths — no build step)
  contracts ui tokens services store projects mfe-runtime utils
tools/
  mf/shared.ts     # the ONE shared-singleton block (host + every remote import it)
  mf/remotes.ts    # central remote registry: mfName / project / port
  vite/wispr-aliases.ts   # the @wispr/* Vite alias array (DRY across apps)
  openapi/         # RTK Query OpenAPI codegen (placeholder spec)
```

`@wispr/*` libs are **non-buildable source libraries**: a change hot-reloads in
every consumer with no rebuild.

### Apps & ports

| App | Nx project | Dev/preview port | Role |
|---|---|---|---|
| Host (shell) | `host` | **4200** | Loads remotes; owns auth, workspaces + global dashboard, project list/creation, the global top bar, router/store/theme |
| Custom App | `custom-app` | 4201 | Workspace remote (`./ProjectApp`) for the "custom app" project type |
| Data Pipeline | `data-pipeline` | 4202 | Remote (`./ProjectApp`) |
| Strategy | `strategy` | 4203 | Remote (`./ProjectApp`) |

---

## Application flow

The app is organised as **workspace → project → phases**. A **workspace** groups
related projects and shares context (instructions, artifacts, members); a project
always belongs to exactly one workspace.

`/workspaces` is the **entry point** (cold load and post-OIDC both land here). The
host owns the workspace list, workspace creation, the in-workspace project list and
creation, and an admin-only global dashboard. Opening a project still mounts the
matching remote at its **flat, unchanged URL** — workspace scoping is carried as data
(`Project.workspaceId`), not a URL segment.

| Route | Surface | Notes |
|---|---|---|
| `/workspaces` | Workspace list | App landing surface; the old global `/projects` list is retired (redirects here) |
| `/dashboard` | Global dashboard | Org-wide KPIs; visible only to `platformAdmin` |
| `/workspaces/:workspaceId` | Workspace home | That workspace's project list (Phase-2 tabs to follow) |
| `/projects/:projectId/*` | Project (remote) | **Unchanged** — `ProjectHost` mounts the remote (`basePath` stays `/projects/:projectId`) |

Routing uses the flat-project-URL model (no `/workspaces/:wsId/projects/...` nesting),
so federation/contract surface is unchanged. The full design lives in
[`docs/workspace-feature-plan.md`](docs/workspace-feature-plan.md).

---

## Prerequisites

- **Node 20+** (developed on Node 26) and **npm 10+**
- First time: `npm install`

---

## Running the apps

There are three ways to run things. Pick based on what you're doing.

### 1. Edit one remote in isolation (fastest inner loop)

Each remote runs **standalone** (its own store + theme + a mock contract) via
`bootstrap.standalone.tsx`:

```bash
npm run serve:data-pipeline   # → http://localhost:4202
npm run serve:strategy        # → http://localhost:4203
npm run serve:host            # → http://localhost:4200 (dashboard)
```

Full hot-reload. Use this while building a single app's screens.

### 2. Host + remotes together (recommended for federation) ✅

The federated composition is reliable when the **host runs in dev** (hot-reload
+ a dev user is auto-seeded, so no backend/login needed) and the **remotes are
served as their production build**.

**One command** (host + all remotes):

```bash
npm run dev      # = nx run host:dev — builds + serves the remotes, then serves the host
```

This works because the host's `dev` target `dependsOn` each remote's `preview`
(Nx keeps the continuous tasks running together). Equivalent two-terminal form:

```bash
npm run remotes  # Terminal 1 — build + serve remotes (data-pipeline:4202, strategy:4203)
npm start        # Terminal 2 — host in dev (:4200)
```

Open **http://localhost:4200**, then a project card (or go straight to
`/p/data-pipeline-demo`, `/p/strategy-demo`). The remote mounts inside the host;
you'll see it read the host's shared store (the "shared store" user matches the
host's). Edited a remote? Re-run `npm run remotes` to rebuild it.

> Why built remotes? Cross-origin loading of a remote's **dev** module graph is a
> known rough edge of Vite + MF. The host stays in dev; remotes are loaded as
> built artifacts (this mirrors production).

### 3. Full production preview (all apps as built output)

```bash
npm run build                 # build host + all remotes
npm run preview:data-pipeline # :4202   (separate terminals)
npm run preview:strategy      # :4203
npm run preview:host          # host (prints its port)
```

The host preview is a real production build, so it shows the **login screen**
(Entra ID auth isn't wired yet). To click through without a backend, build the
host with the dev-auth escape hatch first:

```bash
# PowerShell
$env:VITE_DEV_AUTH="true"; npm run build:host; npm run preview:host
# bash
VITE_DEV_AUTH=true npm run build:host && npm run preview:host
```

---

## Mock data mode (backend-less dev/demo)

Set **`VITE_USE_MOCKS=true`** in `apps/host/.env.local` (and in
`apps/custom-app/.env.local` for standalone runs) and the data layer serves
every API route from an in-browser mock server instead of the network:

- **Auth stays real** (Entra/IAM sign-in) — only data is mocked.
- Projects + all five phase flows work end to end: KB generation, planning,
  stories, code generation (virtual + simulated repo/PR), tests. Progressive
  generation jobs animate step by step like the live backend.
- Data persists in `localStorage` (`wispr.mock.*` keys) — clear those keys to
  reset. The first seed project arrives mid-flight so every phase shows content.

How it works: `@wispr/services` exposes a mock-route registry + axios adapter
(`registerMockRoutes`); `@wispr/projects` registers the project endpoints and
the custom-app remote registers its phase endpoints (`src/services/mocks/`).
Routes are inert unless `useMocks` is on, so flipping the flag swaps mock/live
with zero code changes.

---

## Common tasks

```bash
npm run build        # build all apps (nx run-many -t build)
npm run typecheck    # type-check all apps
npm run lint         # lint (where configured)
npm run test         # unit tests (Vitest, where configured)
npm run graph        # open the Nx project graph
npm run api:codegen  # regenerate RTK Query endpoints from the OpenAPI spec
```

Run any target for one project directly with Nx, e.g. `nx build host`,
`nx typecheck data-pipeline`.

### Full npm script reference

| Script | Does |
|---|---|
| `npm run dev` | **one command** — host (dev) + all remotes (preview), federation composed |
| `npm start` | `nx serve host` — host dev server only (:4200) |
| `npm run remotes` | build + serve `data-pipeline` + `strategy` as previews (:4202/:4203) |
| `npm run serve:<app>` | dev server for `host` / `custom-app` / `data-pipeline` / `strategy` |
| `npm run preview:<app>` | build + serve one app's production output |
| `npm run build` / `build:<app>` | build all apps / one app |
| `npm run typecheck` · `lint` · `test` | run that target across the workspace |
| `npm run graph` | Nx project graph |
| `npm run api:codegen` | RTK Query OpenAPI codegen |

---

## Git hooks

A version-controlled **pre-commit** hook (`.githooks/pre-commit`) runs
`nx affected -t typecheck` on the projects touched by your staged changes. It's
wired automatically on `npm install` (the `prepare` script sets
`core.hooksPath=.githooks`). Bypass intentionally with `git commit --no-verify`.
(`lint` will be added to the hook once workspace ESLint enforcement is set up and
green — see CLAUDE.md.)

Code review and security review use the built-in **`/code-review`** and
**`/security-review`** skills (both read `CLAUDE.md`).

---

## How federation is wired

This is **Vite + `@module-federation/vite`**, not the Nx **Webpack**
(`@nx/webpack` `ModuleFederationConfig` + `withModuleFederation`) setup. Each app
has a dedicated **`module-federation.config.ts`** (the Vite/MF-2.0 equivalent of
that webpack config), and a thin `vite.config.ts` that just does
`federation(mfConfig)`:

- **Remote** `apps/<remote>/module-federation.config.ts`: `name`, `exposes: { './ProjectApp': … }`, `shared`.
- **Host** `apps/host/module-federation.config.ts`: `name: 'host'`, `remotes`, `shared`.
- **`tools/mf/shared.ts`** — the single `shared`-singleton block imported by host
  and every remote (so they declare identical shared deps). **`tools/mf/remotes.ts`**
  — the central remote list (`mfName` / `project` / `port`) the host config builds
  its `remotes` map from. **`tools/vite/wispr-aliases.ts`** — the shared `@wispr/*`
  alias array.
- `apps/host/src/remotes.d.ts` declares the remote module types for TypeScript.
- Remote URLs resolve from `apps/host/public/registry.json`; the host loads the
  matching remote at runtime via `@module-federation/runtime`'s `loadRemote`
  (`apps/host/src/boot/remoteImporter.ts`).
- The shell↔remote contract (`ProjectAppProps`) lives in `@wispr/contracts`.

The `shared` block marks `react`, `react-dom`, `react-router-dom`,
`@reduxjs/toolkit`, `react-redux`, `@mantine/core`/`hooks`, and the runtime
`@wispr/*` libs as singletons — this is what makes the remote use the host's one
store/router/theme instead of bundling its own. (`@wispr/*` libs have no
package.json version, so `tools/mf/shared.ts` pins one; otherwise MF can't
resolve them as singletons.)

**Adding a remote:** scaffold `apps/<name>` with a `module-federation.config.ts`
(expose `./ProjectApp`, `shared: createSharedConfig()`), add it to
`tools/mf/remotes.ts`, the host's `public/registry.json`, `apps/host/src/remotes.d.ts`,
`apps/host/src/boot/remoteImporter.ts`, and the host `project.json`
`implicitDependencies` + `dev` target. Exclude it from `@nx/vite` in `nx.json`.

---

## Notes & troubleshooting

- **"… isn't available" in the host** → the remote isn't running. Start it
  (`npm run remotes`) before opening its project. Only declare remotes in the
  host config that are actually running, or MF init fails for all of them.
- **Port already in use** → a previous dev/preview process is still alive; stop
  it (or kill the port) and retry. Remotes use `strictPort`, so they won't
  silently move.
- **Nx & federation** → federation apps (`host`, `data-pipeline`, `strategy`)
  are excluded from `@nx/vite` inference (it hangs evaluating the MF config) and
  use explicit Nx targets in their `project.json`. `custom-app` uses inference.
- **Editing a remote isn't reflected in the host** → in composition mode the
  remote is a built artifact; rebuild it (`npm run remotes`) or develop it
  standalone (`npm run serve:<remote>`).
