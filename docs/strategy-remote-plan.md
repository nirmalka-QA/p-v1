# WISPR — Strategy Remote Plan (phase-driven workspace)

> **Status:** Phase A built; **phase-workspace redesign built — 2026-06-14** (see §16,
> which supersedes the parts of §2.1/§4/§6/§7 it lists). The downstream half of `docs/project-feature-plan.md` §18
> (which persists `strategyType` + ordered `phaseIds` on a strategy project at creation). This plan
> builds the **strategy remote** (`apps/strategy`) into a real, phase-driven workspace that **reads
> those configured phases and renders its phase rail from them** — resolving §18.8's "the remote
> consumes the phases" workstream.
> **Reference prototype:** `docs/wispr-prototype.html` — `renderRail`, `renderSidebar`,
> `renderStrategyPhase` (the generic inputs/outputs phase page), `openManagePhases`.
> **Reference remote:** `apps/custom-app` — `ProjectApp` → `AppShell` (chrome) → `ProjectLayout` →
> phase routes; `PhaseRail` / `Sidebar` / `StatusBar`. The strategy remote mirrors this **shape**
> (relative routes, host-owned shell context) but builds its own, simpler, strategy-specific chrome.
> **Architecture rules:** `CLAUDE.md` (federation, conventions) — obeyed throughout.

---

## 1. Why / mental model

A **custom-app** project has a fixed 5-phase SDLC rail. A **strategy** project is *configured*: its
phases were chosen in the host wizard (a template or a custom set) and persisted as project data
(`project.phaseIds`, ordered; `project.strategyType`). The strategy remote's job is to **render a
workspace whose phase rail IS those configured phases**, and let the user work each phase
(upload inputs → generate outputs → complete the phase).

```
host mounts /projects/:projectId/*  →  strategy ProjectApp(props)
   │  useGetProjectQuery(projectId)         → project.phaseIds (ordered) + strategyType
   │  useGetStrategyPhasesQuery()           → the phase library (names/inputs/outputs)
   ▼  buildProjectPhases(phaseIds, library) → ordered ProjectPhase[]  ──► dynamic phase rail
        index route → first phase   ·   /:phaseId → that phase's page (inputs/outputs)
```

The host already owns the **top bar**, auth, router, store, theme, and the `?settings=` signal. The
remote owns everything **below the top bar**: the phase rail, sidebar, work area, status bar, and the
project settings modal (per CLAUDE.md "Chrome ownership").

---

## 2. Scope

### 2.1 In scope — Phase A (core: the configured rail + working phases)

| # | Capability |
|---|---|
| 1 | **Resolve the project** in the remote (`useGetProjectQuery`) → its ordered `phaseIds`; expand via the phase-library API + `buildProjectPhases`. Loading / error / not-strategy fallbacks. |
| 2 | **Strategy workspace chrome** — a `StrategyShell` (dynamic phase rail + sidebar + work area + status bar), mirroring custom-app's shell shape but strategy-local and simpler. |
| 3 | **Dynamic phase rail** from the configured phases (number · name · meta; active/done; "REQ" on mandatory). |
| 4 | **Generic phase page** (the prototype's `renderStrategyPhase`): header + progress meter + **Input Documents** (upload, mandatory/optional) + **Output Documents** (generate, gated on mandatory inputs) + **Complete phase** (gated). |
| 5 | **Phase progress** — uploaded inputs / generated outputs / phase-done, **mock-persisted per project** (localStorage), via a real RTK service. |
| 6 | **Relative phase routing** — index → first phase; `/:phaseId` → its page; unknown phase → redirect to first. |

### 2.2 Phase B — DROPPED (2026-06-14, user decision)

**Manage phases** and the **strategy settings modal** are **not being built** — the configured rail
from creation is sufficient. Phases are set in the host wizard and not re-edited in the remote. (If
re-editing is wanted later, it returns via `updateProject({ phaseIds })` + an extracted `PhaseEditor`;
§8/§9 below are retained as reference only and are out of scope.)

### 2.3 Out of scope

- **Real AI generation / file storage** — upload/generate are mock state transitions (no bytes), exactly like the workspace artifact mock.
- The **richer KB-style Discovery** flow (custom-app's). Strategy's Discovery uses the **generic phase page** (Discovery is just a library phase with inputs/outputs). Flagged as a possible later enhancement.
- Any change to the **host wizard / federation wiring / contract** — already done in §18; the contract `ProjectAppProps` stays unchanged.
- The other coming-soon remotes; cross-phase dependency analysis; activity feeds beyond a stub.
- **Senior solution-architect advisory backlog** — decision log, assumptions/risks registers, output
  provenance, board-pack export, RAG search over the KB, roadmap visualisation, ROI scenarios,
  output versioning/diff, comments/@mentions, project-health dashboard, per-phase roles. Captured as
  ideas only; **explicitly out of scope** for now (user decision, 2026-06-14).

---

## 3. Data + resolution (no contract change)

The remote reads everything it needs from the **shared `@wispr/projects` lib** (already a federation
singleton) using the host's injected `services.api`:

- `useGetProjectQuery(props.projectId)` → `Project` with `phaseIds?: string[]` + `strategyType?`.
- `useGetStrategyPhasesQuery()` → `IStrategyPhase[]` (the library: names, descriptions, inputs, outputs).
- `buildProjectPhases(project.phaseIds ?? [], library)` → ordered `ProjectPhase[]` for the rail + pages.

**Fallbacks:**
- Project still loading → shell skeleton.
- Project missing / not strategy → a graceful `EmptyState` (shouldn't happen — host only mounts strategy here).
- Strategy project with **no `phaseIds`** (e.g. a pre-§18 seed) → default to `orderPhaseIds([])` = `['discovery','signoff']` so the rail is never empty.

---

## 4. Phase progress (mock-first, per project)

Working a phase needs persistent per-phase state. Modelled and mocked exactly like the existing
project/workspace mocks (localStorage + `{ result }` envelope).

```ts
// strategy remote model
export interface PhaseProgress {
  uploadedInputs: string[]   // input doc names marked uploaded
  generatedOutputs: string[] // output doc names marked generated
  done: boolean
}
export interface StrategyPhaseState {
  currentPhaseId: string
  phases: Record<string, PhaseProgress>  // keyed by phase id
}
```

**API (new, additive in `@wispr/contracts`):**

| Endpoint (`API_ENDPOINTS`) | Method | Purpose |
|---|---|---|
| `phaseState` (`projects/:id/phase-state`) | GET | the project's phase progress + current phase |
| `phaseState` | PATCH | upload an input / generate an output / complete a phase / set current |

- New tag `API_TAGS.PhaseState`. RTK service `phaseStateApi` (in the strategy app) injects on the shared `api`; a `phaseStateMock` (in the strategy app) serves it from localStorage, registered when the remote loads (gated by `useMocks`, like `registerCustomAppMockRoutes`).
- **Rail status** derives from this: `done` → check; `currentPhaseId` → active. **No hard locking** — the prototype lets you click any strategy phase freely (`setPhase`), so all phases are navigable; "complete" is the meaningful state, not a gate to navigation. (Differs from custom-app's locked SDLC rail — strategy is intentionally non-linear.)
- **Complete-phase gate:** the *Complete phase* button (not navigation) is disabled until every **mandatory input** of that phase is uploaded — matching `renderStrategyPhase`'s `allMandUp`.

---

## 5. Chrome / layout (`StrategyShell`)

Mirror custom-app's `AppShell` composition, strategy-local and leaner:

```
StrategyShell
 ├─ PhaseRail            (dynamic, from ProjectPhase[]; + "Manage phases" at the end — Phase B)
 ├─ body
 │   ├─ Sidebar         (current phase's sections + a static Integrations block)
 │   └─ work area       (<Outlet/> → PhasePage)
 ├─ StatusBar          (context text · phase x of n · progress)
 └─ StrategySettingsModal   (?settings= driven — Phase B)
```

- **Strategy-local components** (no importing custom-app's chrome — that would couple two remotes). Styling via CSS Modules + `var(--cl-*)` tokens, Mantine-first, mirroring the prototype's `.phase-rail` / `.sidebar` look. If real duplication with custom-app emerges later, extract shared chrome to `@wispr/ui` — **not now** (premature).
- The shell reads the resolved project + phases from a small context/hook (`useStrategyProject`) so the rail, sidebar, pages, and status bar share one source without prop-drilling.

---

## 6. Phase page (generic — the prototype's `renderStrategyPhase`)

`features/phase/PhasePage.tsx`, routed at `/:phaseId`:

- **Header:** breadcrumb `Strategy › {phase.name}`, title, and **Complete phase** button (gated on all mandatory inputs uploaded; shows "✓ Phase complete" when done).
- **Progress meter:** "Phase {i+1} of {n}" + a bar (% of phases complete).
- **Input Documents** card: Mandatory group + Optional group; each row → name + Mandatory/Optional + **Upload** (→ PATCH `uploadedInputs`); uploaded rows show "✓ Uploaded" + View.
- **Output Documents** card: each row → name + format + **Generate** (gated on `allMandUp`; → PATCH `generatedOutputs`); generated rows show "Generated" + View / Regenerate.
- All three states (loading/error/empty) per CLAUDE.md. AI **Generate** uses the AI visual language (`variant="light" color="violet"` + `IconSparkles`) since it's an AI action.

---

## 7. Sidebar + status bar

- **Sidebar:** the active phase's name + section anchors (**Input Documents · Output Documents · Activity**, per the prototype's strategy sidebar) and a static **Integrations** block (GitHub/Figma/Slack chips). Clicking a section scrolls/sets focus in the page. Minimal — sections are presentational anchors in Phase A.
- **StatusBar:** mirrors custom-app's — context text (`{phase} · STRATEGY`), phase x of n, overall progress. (Assistant toggle optional/stub in Phase A.)

---

## 8. Manage phases (Phase B)

The rail's "Manage phases" → a `ManagePhasesModal` to add/remove/reorder phases post-creation
(Discovery + Sign-off locked, per `orderPhaseIds`). On save → `useUpdateProjectMutation({ id, patch:
{ phaseIds } })` → invalidates `Project(id)` → the rail refreshes; newly added phases start with empty
progress.

> **DRY note:** the host wizard's `PhaseEditor` (host `features/projects/.../components/PhaseEditor`)
> is the same interaction. It can't be imported across the host↔remote boundary. **Decision:** for
> this pass build a lean remote-local editor reusing the shared `orderPhaseIds` + the library; if it
> proves identical, extract `PhaseEditor` to `@wispr/ui` in a follow-up (it's pure presentational +
> the shared helper).

**Impact:** extend `toUpdateProjectBody` to carry `phaseIds`, and the `PATCH projects/:id` mock to
persist it (both additive in `@wispr/projects`).

---

## 9. Settings modal (Phase B)

The remote owns project settings; the host top bar opens it via `?settings=` (`SETTINGS_PARAM`). A
minimal `StrategySettingsModal`: **General** (name/description → `updateProject`) + a **Manage phases**
entry (opens the §8 modal). Mirrors how custom-app's `ProjectSettingsModal` listens for the param.

---

## 10. Routing

`ProjectApp` (relative routes, host mounts under `/projects/:projectId/*`):

```tsx
<Routes>
  <Route element={<StrategyShell />}>
    <Route index element={<Navigate to={firstPhaseId} replace />} />
    <Route path=":phaseId" element={<PhasePage />} />
  </Route>
</Routes>
```

- `firstPhaseId` = the first configured phase (`discovery`). Unknown `:phaseId` → redirect to first.
- Navigation between phases uses `react-router` (relative); cross-project / out navigation uses the
  host's `onNavigate` / `useProjectNavigate` (already in `@wispr/mfe-runtime`).
- The remote mirrors `props.user` into the shared session (`setUser`) like custom-app, for any
  session-reading code, in both composed + standalone modes.

---

## 11. File layout (`apps/strategy/src`)

```
ProjectApp.tsx                         # resolve project + library; render StrategyShell + phase routes
bootstrap.standalone.tsx               # wrap StrategyShell in the standalone providers (update)
app/mockContract.ts                    # standalone contract (give it a strategy projectId w/ phases)
components/layout/
  StrategyShell/    StrategyShell.tsx  StrategyShell.module.css
  PhaseRail/        PhaseRail.tsx      PhaseRail.module.css
  Sidebar/          Sidebar.tsx        Sidebar.module.css
  StatusBar/        StatusBar.tsx      StatusBar.module.css
features/phase/
  PhasePage.tsx
  components/
    InputDocuments/  OutputDocuments/  DocRow/      # one folder per component
  utility/
    models/model.ts                    # PhaseProgress, StrategyPhaseState
    services/phaseStateApi.ts          # GET/PATCH phase-state (inject on shared api)
    services/mocks/phaseStateMock.ts   # localStorage-backed; registerStrategyPhaseMockRoutes
    helpers/helpers.ts                  # progress %, allMandatoryUploaded, rail status
    hooks/useStrategyProject.ts         # resolve project + phases + progress (shared by shell/pages)
features/manage-phases/  (Phase B)     # ManagePhasesModal + remote PhaseEditor
features/settings/       (Phase B)     # StrategySettingsModal
```

**Removed:** the sandbox `features/overview/` + `features/roadmap/` (and their routes).

**Shared-lib touches (additive):** `@wispr/contracts` (`phaseState` endpoint + `PhaseState` tag);
`@wispr/projects` (`toUpdateProjectBody` + `PATCH` mock carry `phaseIds` — Phase B).

---

## 12. Task list (ordered)

> Build with `VITE_USE_MOCKS=true`. Run `nx run strategy:typecheck` after each cluster; rebuild the
> remote (`npm run remotes` / `nx run strategy:build`) to see it inside the host (dev cross-origin
> federation doesn't hot-reload the remote — develop it via `npm run serve:strategy` standalone).

**Phase A**
1. `@wispr/contracts/api.ts` — add `phaseState` endpoint + `PhaseState` tag.
2. strategy `features/phase/utility` — `model.ts`, `phaseStateApi.ts`, `phaseStateMock.ts` (seed: all phases empty, `currentPhaseId = discovery`), `helpers.ts`, `useStrategyProject.ts`.
3. `components/layout/StrategyShell` + `PhaseRail` + `Sidebar` + `StatusBar` (dynamic from phases).
4. `features/phase/PhasePage` + `InputDocuments` / `OutputDocuments` / `DocRow`; upload/generate/complete via the mock; AI visual language on Generate.
5. `ProjectApp.tsx` — resolve + render shell + phase routes; register the phase-state mock; mirror user. Update `bootstrap.standalone.tsx` + `mockContract.ts`. Remove the sandbox features.
6. Verify standalone (`serve:strategy`) + composed (`npm run dev`): a strategy project shows its configured rail; uploading mandatory inputs enables generate + complete; progress persists across reload.

**Phase B**
7. `@wispr/projects` — `toUpdateProjectBody` + `PATCH projects/:id` mock carry `phaseIds`.
8. `features/manage-phases/ManagePhasesModal` (+ remote `PhaseEditor`) → `updateProject({ phaseIds })`; rail "Manage phases" affordance.
9. `features/settings/StrategySettingsModal` (General + Manage phases) wired to `?settings=`.
10. Verify: re-editing phases updates the rail; settings opens from the host top bar.

---

## 13. Acceptance criteria

- [ ] Opening a **strategy** project mounts the strategy remote with a phase rail that **matches the project's configured `phaseIds`** (template or custom), in order, Discovery first / Sign-off last.
- [ ] Each phase page lists its **inputs/outputs**; uploading all **mandatory inputs** enables **Generate** and **Complete phase**; state **persists** (mock localStorage) across reloads.
- [ ] The rail reflects progress (done ✓ / current) and is freely navigable (no hard lock).
- [ ] (Phase B) **Manage phases** re-configures the rail and persists via `updateProject`; the host **Settings** param opens the strategy settings modal.
- [ ] No `any`, no inline styles, no hardcoded hex; Mantine-first; AI actions use the violet/IconSparkles language; loading/error/empty everywhere.
- [ ] The **contract is unchanged** (phases read from the shared project fetch); no host/federation edits beyond the additive `phaseState` endpoint (+ Phase-B `phaseIds` on update).
- [ ] Standalone (`serve:strategy`) and composed (in the host) both work.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Coupling to custom-app's chrome | Build strategy-local chrome; extract to `@wispr/ui` only if real duplication appears. |
| Remote doesn't hot-reload inside the host (dev) | Develop standalone (`serve:strategy`); rebuild remote for composed checks (documented). |
| New `@wispr/projects`/contracts exports → stale Vite pre-bundle | Clear `node_modules/.vite` + restart `npm run dev` after adding exports (seen twice already). |
| Pre-§18 strategy project has no `phaseIds` | Default to `['discovery','signoff']` so the rail is never empty. |
| `PhaseEditor` duplicated host↔remote | Accept for now (boundary forbids import); extract to `@wispr/ui` as a follow-up if identical. |

---

## 15. Decisions log

- **2026-06-14 — Remote reads phases as project data.** The rail is built from `project.phaseIds` +
  the shared phase-library API; the contract `ProjectAppProps` is unchanged (confirms §18.8).
- **2026-06-14 — Strategy rail is non-linear.** All phases are navigable; "complete" is a state, not a
  navigation gate (matches the prototype's `setPhase`). Only *Generate*/*Complete* are gated on
  mandatory inputs.
- **2026-06-14 — Generic Discovery.** Strategy's Discovery uses the generic inputs/outputs phase page
  (it's a library phase), not the custom-app KB flow; a richer Discovery is a possible follow-up.
- **2026-06-14 — Phase progress is mock-first**, per project, via a new `phase-state` endpoint +
  localStorage mock — same pattern as the project/workspace mocks.
- **2026-06-14 — Strategy-local chrome**, not shared with custom-app yet (avoid premature extraction).
- **2026-06-14 — Manual phase status replaces phase-progress.** A phase carries a tri-state
  `status` (`new` | `in-progress` | `done`) the user sets by hand; `done` freezes the phase
  (read-only except download). The auto progress meter and the mandatory-input "Complete phase"
  gate are removed. Status is the meaningful state; navigation stays non-linear.
- **2026-06-14 — Open Questions are AI-flagged only.** The Generate action surfaces gaps the
  user resolves/reopens; the user does not author questions. Per-phase, mock-seeded, with a
  sidebar count + a phase-page alert. (Distinct from a future user-managed decision/Q&A log.)
- **2026-06-14 — Additional documents are free-form.** Mandatory inputs stay predefined slots;
  the optional area is a single common Upload button (no predefined optional inputs), each doc
  showing its context beneath. Full-width layout; no truncation.

---

## 16. Phase workspace redesign (built 2026-06-14)

A pass making the phase workspace behave like a real consulting work surface. **Supersedes**
§2.1 rows 4–5, §4 (`done` flag / completion %), §6 (progress meter + Complete-phase gate), and
§7's sidebar section anchors. No contract change; the only shared-lib touch is an additive
`guide?` on the phase library (`@wispr/projects`).

### 16.1 Manual phase status + locking
- `PhaseProgress.done: boolean` → **`status: PhaseStatus`** (`'new' | 'in-progress' | 'done'`),
  set via a header **`Menu` dropdown whose trigger is a `variant="light"` button tinted by status**
  (`statusMeta`: New = gray, In Progress = blue, Done = teal).
- **`done` freezes the phase**: upload, generate, regenerate, delete, edit-context, and
  resolve/reopen are all disabled (`isPhaseLocked`); **download/view stay**. To change anything,
  move it back to In Progress. The status control itself is always enabled (the unlock path).
- Marking **Done with gaps** (mandatory inputs missing or open questions unresolved) is allowed
  but fires a **non-blocking warning notification** — soft gate, not hard.
- Rail/status-bar derive from `status` (done ✓ teal · in-progress WIP/accent · NOW · REQ);
  legacy `done: true` records migrate to `status: 'done'` (`normalizeProgress`).

### 16.2 Open Questions (AI-flagged) — `features/open-questions/`
- New `OpenQuestion { id, question, source, resolved }` on `PhaseProgress.openQuestions`.
- New route **`/:phaseId/questions`** → `OpenQuestionsPage` (open-first list, `QuestionRow` with
  Resolve/Reopen, loading/error/**empty**). Resolve/reopen locked when the phase is Done.
- Seeded per phase (domain-appropriate) in `phaseStateMock` so the count/alert show on cold load;
  **Generate also flags** one question for the produced output (idempotent).
- The **sidebar** shows it with an **unresolved count badge**; the **phase page** shows an
  `Alert` (when `unresolvedCount > 0`) deep-linking to the page.

### 16.3 Documents — file-section UI, per-slot files, type/size, ⋯ menus
- **`FileItem`** is the shared building block — a file tile + name + **`TYPE · SIZE`** line (real type
  derived from the name, size from the picked `File`) and either a right-side control or a **`⋯`
  overflow menu** (Download / Delete / Edit context / Regenerate). Used by mandatory files, additional
  docs, and outputs so every "file section" reads identically (mirrors the prototype's `.sdoc`).
- **Mandatory** inputs are predefined **slots that each hold a list of the actual uploaded files**
  (`mandatoryFiles: Record<slot, UploadedFile[]>`, `UploadedFile { id, name, size?, uploadedAt }`).
  A requirement shows a **subtle Upload** (`FileButton`, captures name + size; no bytes) and a subtle
  context toggle; uploaded files list beneath in a left-rail file section, each with a `⋯` menu. A
  slot may hold several files; `allMandatoryUploaded` = every mandatory slot has ≥1 file.
- **`AdditionalDocuments`** is a free-form file section with one common **Upload document** button;
  each `AdditionalDoc { id, name, size?, context, uploadedAt? }` is a `FileItem` whose ⋯ menu carries
  Download / Edit context / Delete.
- **No "Uploaded"/"Generated" pills** — files show metadata only. Front-facing buttons are minimised:
  per-file actions live in the ⋯ menu; **context is a subtle toggle** (icon beside Upload for
  mandatory; a menu item for additional). Saved context shows in full as a light inset (`ContextEditor`,
  controlled). Download stays available when Done; **no truncation** (names wrap).
- Outputs: pre-generation a Generate action; post-generation a generated `FileItem` (format + `Generated …`
  timestamp, ⋯ menu Download + Regenerate). Generate gated on mandatory inputs / lock.
- **Inline delete confirm (no dialog):** a shared **`ActionMenu`** (`components/ui/ActionMenu`) renders
  the ⋯ overflow menu; any `MenuAction { confirm: true }` arms on first click ("Click again to delete",
  menu stays open) and fires on the second, resetting when the menu closes. Used by `FileItem` and by
  `CommentItem` (whose Delete lives in the same ⋯ menu) so the confirm interaction is identical
  everywhere — only ever on a labeled menu item, never a bare icon.

### 16.4 Layout, headers, sidebar, micro-guide
- **Full-width page** — `.page` drops `max-width: 960px; margin: 0 auto;`. Input (left) / Output
  (right) sit in a **two-column `SimpleGrid`** (`{ base: 1, md: 2 }`) using the full width.
- **UI language — card → tray → chip.** Each column is a single bordered card. Headers follow the
  **modal-header language**: `ColumnHeader` = 16px/600 title + 12px muted description + hairline
  divider; `SectionHeader` (Mandatory inputs / Additional documents / Outputs) = 13px/600 title +
  11px hint + optional trailing action + optional `topDivider` to clearly separate stacked sections.
  Inside, a **`DocBox`** tray (light `--cl-bg-sunken`, no border) groups one document title — one tray
  per mandatory requirement (title in its header, files inside), one tray for the Additional set, one
  for Outputs. Files are **`FileItem` chips** (subtle border + white `--cl-bg-elev` fill) that stand
  out on the tray. No indented left rail; context is a white inset sub-card.
- **Sidebar** phase nav = **Documents** + **Open Questions (N)** (real navigation, every phase),
  replacing the Input/Output scroll-anchor items. Integrations block kept.
- **Micro-guide** per phase: additive `guide?` on `IStrategyPhase`/`ProjectPhase`, authored in
  `strategyMock.ts`, rendered under the phase title (falls back to `description`).

### 16.7 Phase comments (productivity)
- **User-authored notes/to-dos per phase** (`PhaseComment { id, text, resolved, createdAt }` on
  `PhaseProgress.comments`) — for internal reference, markable resolved. **Not** locked by phase
  status (always available). Surfaced as a **comment icon + open-count `Indicator`** beside the status
  dropdown in the phase header; clicking opens a **right overlay `Drawer`** (`CommentsDrawer`: add
  composer + list via `CommentItem`, open-first, resolve/reopen/delete, empty state) — no dedicated
  page or sidebar item. Count from `openCommentCount`. Actions `add-comment` / `resolve-comment` /
  `reopen-comment` / `delete-comment` on the phase-state PATCH + mock (no seed — user-created).

### 16.5 Phase-state actions (additive, strategy-app only)
`UpdatePhaseStateInput.action` gains `upload` (now slot `name` + `fileName`), `delete-mandatory-file`,
`set-status`, `upload-additional`, `delete-additional`, `additional-context`, `resolve-question`,
`reopen-question`, plus the comment actions (replacing `complete`). All handled in `phaseStateMock`
with localStorage persistence (upload/generate/upload-additional stamp timestamps); `getPhaseState`
seeds a project's open questions on first read (comments are not seeded).

### 16.6 Files
- Model/state: `features/phase/utility/{models/model.ts, helpers/helpers.ts, services/phaseStateApi.ts, services/mocks/phaseStateMock.ts}`
- Chrome: `components/layout/{StrategyShell/StrategyShell.module.css, Sidebar/Sidebar.tsx(+css), PhaseRail/PhaseRail.tsx(+css), StatusBar/StatusBar.tsx}`
- Phase page + docs: `features/phase/PhasePage.tsx`, `features/phase/components/{ColumnHeader, SectionHeader, DocBox, FileItem, InputDocuments, MandatoryInput, AdditionalDocuments, AdditionalDocItem, OutputDocuments, OutputDocItem, ContextEditor}`
- Open questions: `features/open-questions/{OpenQuestionsPage.tsx, components/QuestionRow}`; route in `ProjectApp.tsx`
- Comments: `features/comments/{CommentsDrawer.tsx, components/CommentItem}`; comment icon + `Indicator` + `Drawer` triggered from the `PhasePage` header (no route / sidebar item)
- Shared UI: `components/ui/ActionMenu` (⋯ overflow menu + inline two-click confirm), used by `FileItem` + `CommentItem`
- Shared lib (additive): `libs/projects/src/{model.ts (guide?), helpers.ts (buildProjectPhases carries guide), strategyMock.ts (guide text)}`
</content>
