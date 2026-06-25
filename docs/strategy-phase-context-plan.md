# WISPR — Strategy Phase: per-document context + "Additional documents"

> **Status:** Approved for build — 2026-06-14. Extends `docs/strategy-remote-plan.md` (Phase A).
> **Scope:** entirely within `apps/strategy/src/features/phase/` — no `@wispr/*`, contracts, or host
> changes (the `projects/:id/phase-state` GET/PATCH endpoint already exists; we add one field + one
> PATCH action inside the strategy app's own model/mock).
> **Reference prototype:** `docs/wispr-prototype.html` (`renderStrategyPhase` — the inputs/outputs
> document cards).

## 1. Context / why

Each strategy phase page renders an **Input Documents** card (Mandatory + Optional groups, each row
uploadable) and an **Output Documents** card (AI-generated, gated on mandatory inputs). The user
wants to complete the phase UX with one capability: **for every uploaded input document, attach an
"additional context" / prompt** that informs how the output documents are generated.

Two concrete changes:
1. A small **"Add context"** button on each **uploaded** input doc (mandatory *and* the former
   "optional" docs).
2. Rename the **"Optional"** input group to **"Additional documents"** (per-row sub "Optional" →
   "Additional").

The per-doc context persists alongside upload state and is surfaced as the AI-generation context.

## 2. Behaviour / UX

- Input row not uploaded → **Upload** button (unchanged).
- Uploaded → "✓ Uploaded" badge **+** a small **"Add context"** button (becomes **"Edit context"**
  with a subtle "added" cue once context exists). Clicking it toggles an inline `Collapse` under the
  row with a `Textarea` (the context/prompt) + **Save** / **Cancel**. Multi-line; persists on Save.
- **Mandatory** group heading unchanged; the second group becomes **"Additional documents"** (row
  sub "Additional"). Both groups' uploaded rows get the context affordance.
- Output Documents card gains a one-line note: generation uses the uploaded inputs **and any context
  added** (still mock generation; Generate still gates on mandatory uploads).

## 3. Data layer — `apps/strategy/src/features/phase/utility`

`models/model.ts`
- `PhaseProgress`: add `inputContext: Record<string, string>` (doc name → context text).
- `PhaseStateAction`: add `'context'`.
- `UpdatePhaseStateInput`: add `text?: string`.

`services/mocks/phaseStateMock.ts`
- `emptyProgress()`: include `inputContext: {}`.
- PATCH handler: read `text`; on `action === 'context'` set `next.inputContext = { ...current.inputContext, [name]: text }`,
  deleting the key when `text` is empty/whitespace. Derive `current` as
  `{ ...emptyProgress(), ...(projectState[phaseId] ?? {}) }` so pre-existing localStorage records
  (no `inputContext`) don't break. Keep `STORAGE_KEY` at v1.

`helpers/helpers.ts`
- `emptyProgress()`: include `inputContext: {}`.
- `progressOf()`: return `{ ...emptyProgress(), ...(state?.[phaseId] ?? {}) }` (back-compat merge).

## 4. UI — `apps/strategy/src/features/phase/components`

**New `InputDocRow/InputDocRow.tsx`** — a dedicated input row (inputs now diverge enough from outputs;
`DocRow` stays for outputs). Props:
`{ name; mandatory: boolean; uploaded: boolean; context: string; onUpload: () => void; onSaveContext: (text: string) => void }`.
- Mirrors `DocRow`'s visual (Paper + file `ThemeIcon` + name + sub); sub = `mandatory ? 'Mandatory' : 'Additional'`.
- Right side: not uploaded → **Upload** `Button`; uploaded → "✓ Uploaded" `Badge` + an
  "Add context"/"Edit context" `Button` (subtle, `IconMessagePlus`) toggling a `Collapse`.
- `Collapse`: `Textarea` (local state seeded from `context`, placeholder explaining it guides output
  generation) + **Save** (calls `onSaveContext`, closes) / **Cancel**; small "Context added" cue when
  `context` non-empty.
- Mantine props only — no inline styles/hex; `?? ''` on any CSS-module class and `disabled ?? false`
  (repo's `exactOptionalPropertyTypes` gotcha).

**`InputDocuments/InputDocuments.tsx`** — replace `DocRow` with `InputDocRow`; second group heading →
**"Additional documents"**; new prop `onSaveContext: (name, text) => void`; pass
`uploaded`, `context={progress.inputContext[name] ?? ''}`, `onUpload`, `onSaveContext`.

**`OutputDocuments/OutputDocuments.tsx`** — add the dimmed "uses your inputs + added context" note.

**`PhasePage.tsx`** — add `saveContext(name, text)` →
`updatePhaseState({ projectId, phaseId, action: 'context', name, text })`; pass to `<InputDocuments onSaveContext={…} />`.
`DocRow.tsx` unchanged (output-only now).

## 5. Files

- `.../utility/models/model.ts` · `.../utility/services/mocks/phaseStateMock.ts` · `.../utility/helpers/helpers.ts`
- `.../components/InputDocRow/InputDocRow.tsx` (NEW) · `.../components/InputDocuments/InputDocuments.tsx`
- `.../components/OutputDocuments/OutputDocuments.tsx` · `.../PhasePage.tsx`

## 6. Verification

1. `npx nx run strategy:typecheck` clean.
2. `npx nx run strategy:build` clean.
3. Run (`npm run serve:strategy` standalone → seeded project `102`, or rebuild + `npm run dev`; after
   lib-export changes clear `node_modules/.vite`): second input group reads **"Additional documents"**;
   upload a mandatory doc → **Add context** appears → expand → type → **Save** → reads **Edit context**
   + "added" cue; reload → context persists; additional uploaded docs get the same affordance; Output
   note shows; Generate still gates on mandatory uploads.
