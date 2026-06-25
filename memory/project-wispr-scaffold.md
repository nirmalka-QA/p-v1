---
name: project-wispr-scaffold
description: WISPR platform scaffold + full prototype-faithful layout rebuild — clean build
metadata:
  type: project
---

Full scaffold + layout rebuild completed. Build is clean (zero TS errors).

**Why:** Week 1 MVP frontend for a 5-phase SDLC platform. Design source of truth is docs/wispr-prototype.html — all layout/colors must follow it exactly.

**Tech stack:** Mantine v9 (UI), Redux Toolkit, React Router v7, Axios, TypeScript v6 (verbatimModuleSyntax — all type-only imports must use `import type`).

**Design tokens (from prototype):**
- Light: `--cl-bg: #fbfbfa`, `--cl-bg-elev: #ffffff`, `--cl-bg-sunken: #f4f4f2`, `--cl-accent: #1f2937` (slate), `--cl-indigo: #4f46e5` (AI accent)
- Dark: `--cl-bg: #0d0d0f`, `--cl-accent: #f4f4f5`, `--cl-indigo: #818cf8`
- All tokens prefixed `--cl-*` in index.css, scoped to `[data-mantine-color-scheme]`
- defaultColorScheme: 'light' (matching prototype default)

**Layout structure (3-column, NO Mantine AppShell):**
- `AppShell.tsx`: custom CSS grid — topBar (48px) + phaseRail (60px, only in project) + 3-column body + statusBar (28px)
- Sidebar (240px, bg-sunken) | Work area (flex 1, bg, padding 28px 36px 60px) | AI Assistant panel (360px, bg-sunken)
- Each column scrolls independently, body has `min-height: 0` + `overflow: hidden`

**Key components rebuilt:**
- `TopBar.tsx` — brand mark (CSS ::after diamond), project switcher + type tag, command palette trigger, bell+theme toggle, role select (native), user avatars, exit btn — ALL via CSS module
- `PhaseRail.tsx` — `grid-template-columns: repeat(5, 1fr)`, sticky top:48px, active state = surface-2 bg + 2px bottom accent border, done = teal ✓ prefix
- `Sidebar.tsx` — 3 sections: Workspace, Phases (in project), Integrations with colored glyphs
- `AIAssistantPanel.tsx` — full prototype structure but disabled/Coming Soon state for Week 1
- `StatusBar.tsx` — mono 10px, live teal dot, sticky bottom:0

**CSS convention:** All layout CSS in `*.module.css` files (never inline styles). CSS vars `--cl-*` for all color/spacing tokens. Mantine components used for Tooltip, Notifications, Modal only.

**Auth:** Login page uses demo token bypass. Replace loginSuccess payload with real API call when backend is ready.
