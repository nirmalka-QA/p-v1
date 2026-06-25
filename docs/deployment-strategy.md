# Deployment & Library Publishing Plan

How WISPR's apps (host + remotes) and shared libraries (`@wispr/*`) are versioned,
published, and deployed — local dev vs live prod.

> Status: **plan / not yet implemented.** This document is the agreed design; the
> phased roadmap at the end tracks build-out.
>
> **Dev quick reference → [§5 Library matrix](#5-library-matrix--nx-type--publishing--versioning-quick-reference)**:
> the Nx library type (plain / buildable / publishable) for each `@wispr/*` lib and
> the versioning strategy. Start there.

---

## 1. Context — what we have today

- **Libs are pure source.** No `package.json`, no version, no build output. Apps
  consume them via Vite `resolve.alias` (`tools/vite/wispr-aliases.ts`,
  `@wispr/ui` → `libs/ui/src/index.ts`) + tsconfig paths → instant HMR, zero install.
- **Each app bundles its own copy** of every lib — the `@wispr/*` alias *bypasses*
  Module Federation's share resolution (the documented build warning).
- **Runtime singletons survive that duplication via `globalThis`**
  (`libs/services/src/globalSingleton.ts`): the RTK `api`, axios instance, runtime
  config, event bus, mock-route registry and token context live in one global slot,
  so every per-app copy shares a single instance.
- **MF `shared`** (`tools/mf/shared.ts`) pins `@wispr/*` to a *fake* `1.0.0` so MF
  treats them as singletons; remotes load at runtime from
  `apps/host/public/registry.json` → each remote's `mf-manifest.json`.
- **Nx** orchestrates `build | typecheck | lint | test`; single `node_modules`
  (no npm `workspaces`). CI target: **Azure DevOps Pipelines**.

## 2. Goals (requirements this plan satisfies)

1. **Local dev: lib edits take effect immediately** (no publish/install step).
2. **Prod: lib changes propagate only on a version bump** (deployed apps are
   isolated from in-flight lib work until they re-pin).
3. **Before push, detect publishable lib changes**; if present, require a version
   bump → publish the package → *then* deploy the dependent apps/remotes.
4. **Libs must be backward compatible** — old consumer code keeps working unless a
   surface is explicitly removed *and* every integration point is updated.
5. Remotes hosted on Azure; independently deployable.

## 3. Decisions

| Decision | Choice |
|---|---|
| Lib registry | **Azure Artifacts** — `@wispr` scope mapped to a feed |
| CI/CD | **Azure DevOps Pipelines** |
| Host hosting | **Azure Static Web Apps** (SPA fallback, OIDC redirect, custom domain) |
| Remote hosting | **Blob `$web` static sites behind Azure Front Door** (CORS + versioned paths) |
| Runtime sharing model | **Unchanged** — per-app bundling + `globalSingleton`. Publishing changes *sourcing*, not the runtime model. |
| Lib versioning grouping | **Hybrid** — Tier-A locked release group; Tier-B independent |
| Bump mechanism | **Manual semver** (`nx release version --specifier=…`); pre-push gate is the safety net |
| Backward-compat enforcement | Mandatory for Tier-A; public-API report check in CI |

## 4. The load-bearing truth: runtime singletons ⇒ host-led backward compat

Because the shared singleton state lives on `globalThis`, **the effective runtime
version of the shared libs is whatever the _host_ loads.** A remote built and
deployed independently against an *older* `@wispr/contracts`/`services` still
executes against the **host's** instance at runtime.

Consequences (these are the rules everything else enforces):

- **Version pins control _build-time bundling_; the runtime singleton identity is
  singular and host-led.**
- Every Tier-A lib **must be backward compatible** across the span of versions any
  *currently-deployed* remote was built against.
- **The host leads version upgrades** — deploy the host on the new platform-contract
  version *before* (or with) the remotes that require it; never deploy a remote that
  needs a newer contract than the live host.

## 5. Library matrix — Nx type / publishing / versioning (QUICK REFERENCE)

**First, the Nx terms** (per [nx.dev — buildable & publishable libraries](https://nx.dev/docs/concepts/buildable-and-publishable-libraries)). These are *distinct
library types*, not a yes/no flag:

- **Plain (workspace) library** — Nx default. *No build target* (lint/test only).
  Consumed as **source within the monorepo** via tsconfig paths / Vite aliases. This
  is what **every WISPR lib is today**.
- **Buildable** (`--buildable`) — adds a build target that emits pre-compiled `dist/`
  for **internal** consumption, only to speed up **incremental builds**. *Not for
  publishing.* A buildable lib may only depend on other buildable libs.
- **Publishable** (`--publishable --importPath @wispr/x`) — adds a build target that
  **compiles + bundles** `dist/` for **external registry distribution** (Azure
  Artifacts). The flag does **not** auto-publish; it just adds the bundle target.

**Our choice:** every shared lib becomes **Publishable** (we distribute externally
via Azure Artifacts). We use **no Nx "buildable" libs** — pre-building lib `dist/`
for internal use would defeat the instant source-HMR our dev loop relies on, and
prod consumers install the *published* package anyway, so there's nothing to gain.

> **The thing that resolves the confusion:** marking a lib *Publishable* does **not**
> change how the monorepo consumes it locally. Dev still imports the lib's **source**
> through the Vite aliases (instant HMR); the bundle/publish target runs **only** in
> the release pipeline. Same lib → source locally, published package in prod (§6).

| `@wispr/*` lib | Tier | **Nx library type** | `importPath` | Local (monorepo) | Prod build | Prod runtime sharing | Version axis |
|---|---|---|---|---|---|---|---|
| `contracts`   | **A** | **Publishable** | `@wispr/contracts`   | source (alias) | installed pkg | **Singleton** (host-provided) | **Locked** `platform-contract` |
| `services`    | **A** | **Publishable** | `@wispr/services`    | source (alias) | installed pkg | **Singleton** (host-provided) | **Locked** `platform-contract` |
| `store`       | **A** | **Publishable** | `@wispr/store`       | source (alias) | installed pkg | **Singleton** (host-provided) | **Locked** `platform-contract` |
| `mfe-runtime` | **A** | **Publishable** | `@wispr/mfe-runtime` | source (alias) | installed pkg | **Singleton** (host-provided) | **Locked** `platform-contract` |
| `projects`    | **A** | **Publishable** | `@wispr/projects`    | source (alias) | installed pkg | **Singleton** (host-provided) | **Locked** `platform-contract` |
| `ui`          | **B** | **Publishable** | `@wispr/ui`          | source (alias) | installed pkg | **Bundled per app** | **Independent** |
| `tokens`      | **B** | **Publishable** | `@wispr/tokens`      | source (alias) | installed pkg | **Bundled per app** | **Independent** |
| `utils`       | **B** | **Publishable** *or* **Plain** ⚠️ | `@wispr/utils` | source (alias) | installed pkg *or* bundled-from-source | **Bundled per app** | **Independent** |

- **Nx "Buildable" type: used by _none_ of our libs** (by design — see above).
- `utils` is **the only open item**: stateless pure functions, so it can stay a
  **Plain** workspace lib (bundled from source into every app, never published) *or*
  become **Publishable** like the rest. Decide in roadmap P1.

### Versioning strategy (applies to the table above)

- **Two version axes only:**
  1. **`platform-contract`** — a *single locked version* shared by all five Tier-A
     libs. Bump it (and republish all five) whenever **any** of them changes.
     `@wispr/contracts@1.9.0`, `@wispr/services@1.9.0`, … always carry the **same**
     number. This is the host↔remote compatibility version.
  2. **Each Tier-B lib** — its **own** independent semver. A `tokens` tweak bumps
     only `@wispr/tokens`; it never forces a `ui` bump.
- **Bump = manual semver:** `nx release version --specifier=<patch|minor|major|x.y.z>`
  for the affected group/lib, then `nx release publish` → Azure Artifacts.
- **What each bump level means (the backward-compat contract):**
  - **patch** — bug fix, no surface change. Safe; no consumer action.
  - **minor** — additive only (new exports / optional params). Safe; no consumer
    action. *Old code must keep working.*
  - **major** — a surface was **removed or changed incompatibly**. Allowed **only**
    with the §10 removal checklist: update every consumer (host + all remotes), then
    follow the §12 release order. For Tier-A a major means the host leads and live
    remotes must be re-pinned + redeployed.
- **Hard rule (Tier-A):** the `platform-contract` version the **host** is deployed
  with must be **backward compatible** with every version any *currently-live* remote
  was built against — because the runtime singleton is host-provided (§4).
- **The gate:** the pre-push hook + CI mirror (§9) **block** a push that changes a
  publishable lib without the matching version bump (group version for Tier-A, the
  lib's own version for Tier-B).

Why the hybrid: Tier-A libs are tightly coupled (`services`→`contracts`,
`store`→`contracts`, `projects`→all) and *are* the runtime contract; locking them
collapses host↔remote compatibility from a 5-axis matrix to **one number**. Tier-B
has no shared runtime state, so version skew is harmless (two bundled copies at
worst).

## 6. Local vs prod resolution (dual mode)

The same app builds two ways depending on where lib code comes from:

- **Local dev & the all-in-one monorepo build** → keep `wisprAliases`
  (`tools/vite/wispr-aliases.ts`). `@wispr/*` resolves to `libs/*/src`. Immediate
  HMR, no install, no registry. **This is the default and covers ~all daily work.**
- **Prod / per-deployable CI build** → **omit the aliases** so the bundler resolves
  `@wispr/*@<pinned>` from Azure Artifacts (`node_modules`). The pinned version in
  the app's `package.json` is what controls propagation.

Implementation: gate alias inclusion on a build mode/env flag in each app's
`vite.config.ts` (e.g. `WISPR_LIBS=source|registry`, default `source`). CI sets
`registry` for prod app/remote builds; everything else stays `source`.

> Note: normal local development **never touches Azure Artifacts**. You only install
> from the feed when (a) CI builds an app/remote for prod, or (b) you deliberately
> test an app against a *published* lib version.

## 7. Making libs publishable (Nx `--publishable`)

Convert each shared lib from a **plain workspace library** to an Nx **publishable
library** (`--publishable --importPath @wispr/<lib>`). This is the Nx
*publishable* type — **not** the *buildable* type (we use no buildable libs; §5).
Each gains:

- **`package.json`** — `name` (`@wispr/<lib>`), `version`, `type: module`,
  `exports` map (barrel + the `@wispr/tokens/tokens.css` subpath), `types`,
  `sideEffects` (false except `tokens` CSS), and `publishConfig.registry` → the feed.
- **A bundle/build target** (the publishable executor — `@nx/js`/rollup or Vite lib
  mode) emitting ESM + `.d.ts` to `dist/`. **This target is invoked only by the
  release pipeline** — the monorepo keeps consuming the lib's *source* via the Vite
  aliases for HMR (§6).
- **`peerDependencies`** for everything that must be a single instance at runtime —
  `react`, `react-dom`, `react-router-dom`, `@reduxjs/toolkit`, `react-redux`,
  `@mantine/core`, `@mantine/hooks`, `axios`, `zod`. Peers (not deps) so consumers
  dedupe to the host singleton instead of bundling a second React/Mantine.
- **Internal `@wispr` deps** reference the **group version** for Tier-A; Tier-B
  declare only what they actually import.
- **MF `shared.ts`** updated so the pinned `version`/`requiredVersion` track the
  real published versions instead of the fake `1.0.0` (Tier-A → group version).

## 8. Versioning & release (Nx Release)

- Configure **`nx release`** with two release setups:
  - **`platform-contract` group** (Tier-A) — versioned in lockstep; one version,
    one changelog, one git tag (`platform-contract@x.y.z`).
  - **Tier-B** — `ui`, `tokens`, `utils` released independently
    (`ui@x.y.z`, etc.).
- **Manual bump**: at release, run `nx release version --specifier=<patch|minor|major|x.y.z>`
  for the affected group/lib, then `nx release publish` to push to Azure Artifacts.
- **Major bump = backward-compat tripwire.** A major signals "a surface was removed
  or changed incompatibly" and forces the coordinated-update checklist (§10).
- **Azure Artifacts immutability** prevents republishing a version — this is what
  guarantees "bump to propagate."

## 9. Pre-push gate (+ CI mirror)

Goal: never push a publishable lib change without a version bump.

- **`.githooks/pre-push`** (repo already sets `core.hooksPath .githooks`):
  1. Diff against the upstream merge-base for changed files under
     `libs/<publishable>/**`.
  2. For each changed lib (Tier-B) or any changed Tier-A member, assert its
     `package.json` `version` (group version for Tier-A) differs from the version at
     the last release tag / the latest published version on the feed.
  3. If a publishable change has **no** version bump → **fail** with a message:
     *"`@wispr/ui` changed but version not bumped — run `nx release version …`."*
- **CI mirror** (PR validation pipeline) runs the same assertion so `--no-verify`
  can't bypass it. Uses `nx affected` to scope.

## 10. Backward-compatibility enforcement

- **Public-API report** (Microsoft API Extractor) per Tier-A lib, checked into the
  repo. CI regenerates and **fails if the public surface changed without a version
  bump** (and flags removals as requiring a major).
- **Removal checklist** (only on a deliberate major): grep all consumers
  (host + every remote) for the removed/changed symbol, update each, bump the
  group major, then follow the release order in §11.
- Additive-only changes (new exports, optional params) = minor/patch, no consumer
  changes required.

## 11. Azure deployment topology

```
Browser
  └─ host.wispr.com  ── Azure Static Web Apps (SPA, OIDC, fallback → index.html)
         │ fetches /registry.json → remote URLs
         ▼
  cdn.wispr.com/<remote>/<version>/mf-manifest.json  ── Azure Front Door
         └─ Blob $web static website: strategy/, custom-app/, data-pipeline/
            (CORS: Access-Control-Allow-Origin = host origin)
```

- **Host → Static Web Apps.** SPA route fallback to `index.html`, OIDC redirect
  (`/auth/callback`), custom domain, global CDN. Deployed via `AzureStaticWebApp@0`.
- **Remotes → Blob `$web` behind one Front Door.** They are *not* SPAs — they serve
  static MF assets (`mf-manifest.json`, `remoteEntry.js`, chunks). Deployed via
  `az storage blob upload-batch` + a Front Door/CDN purge.
- **CORS is required** — the host origin must be allowed to fetch each remote's
  manifest + chunks (set on Blob/Front Door).
- **Versioned remote paths** (`/<remote>/<version>/mf-manifest.json`) make
  `registry.json` the **atomic rollout/rollback pointer**: deploy a new remote
  version to a new path, then flip the host's `registry.json` entry.
- **`registry.json` is environment-specific** — prod points at `cdn.wispr.com/...`,
  not `localhost`. Generated/templated per environment at deploy time; never commit
  prod URLs into the localhost dev file.

## 12. Release runbook (the ordering you described)

1. **Change a lib** → pre-push gate forces a version bump on the affected
   group/lib.
2. **Publish libs**: `nx release version --specifier=…` → `nx release publish`
   (Azure Artifacts). Tier-A bumps the whole group.
3. **Re-pin consumers**: bump `@wispr/*` versions in the host's and affected
   remotes' `package.json`.
4. **Deploy host first** (it leads the singleton/platform-contract version).
5. **Deploy remotes** to new versioned paths; flip `registry.json` entries.
6. **Verify** host composes each remote (smoke test the live URLs).

> A remote that does **not** need the new contract can stay on its old pinned
> version and old deployed path indefinitely — that's the prod isolation in (2) of
> the goals.

## 13. Rollback

- **Remote**: flip the `registry.json` entry back to the previous versioned path
  (instant; the old assets are still in Blob).
- **Host**: redeploy the previous SWA build. Because Tier-A is host-led, never roll
  the host *back* below a contract version a still-live remote requires — roll the
  remote back first.

## 14. Phased implementation roadmap

1. **P1 — Packaging foundation**: add `package.json` + build target + `peerDependencies`
   to each publishable lib; tag Tier-A/Tier-B in Nx; keep everything building from
   source (no behavior change yet).
2. **P2 — Dual-mode resolution**: `WISPR_LIBS=source|registry` switch in app vite
   configs; verify a prod build resolves from `node_modules` (with locally-packed
   tarballs first).
3. **P3 — Registry + release**: Azure Artifacts feed + `.npmrc` scope; `nx release`
   groups (platform-contract + independent Tier-B); manual-semver publish.
4. **P4 — Gates**: `.githooks/pre-push` version check + CI PR-validation mirror +
   API-Extractor surface report for Tier-A.
5. **P5 — Azure deploy**: SWA pipeline for host; Blob+Front Door pipeline for
   remotes; environment `registry.json` templating; CORS + versioned paths.
6. **P6 — Cutover**: switch prod app/remote builds to `WISPR_LIBS=registry`; first
   real coordinated release end-to-end.

## 15. Open items / risks

- **`utils` fate** — publish as Tier-B vs inline per app (it's stateless; either is
  fine). Decide in P1.
- **`peerDependencies` drift** — host and all remotes must keep peer ranges
  compatible; add a CI check that peer ranges across deployables intersect.
- **First-load / preview behavior** — confirm `bootstrap.standalone.tsx` still works
  when a remote is built in `registry` mode (it uses a mock contract).
- **MF `shared` version source of truth** — once libs have real versions, generate
  `shared.ts`'s pins from the published versions rather than hand-editing.
