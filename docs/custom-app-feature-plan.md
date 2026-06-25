# WISPR — AI-SDLC Platform
## Business Requirements Document
**Version:** 1.0
**Scope:** Week 1 MVP — Frontend only
**Last Updated:** June 2026

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Global / Cross-Platform Requirements](#2-global--cross-platform-requirements)
3. [Authentication](#3-authentication)
4. [Projects](#4-projects)
5. [Discovery](#5-discovery)
6. [Planning](#6-planning)
7. [Features](#7-features)
8. [Implementation](#8-implementation)
9. [Test](#9-test)
10. [Decision Log — Out of Scope & Future Scope](#10-decision-log--out-of-scope--future-scope)

---

## 1. Product Overview

WISPR is an internal AI-powered Software Development Lifecycle (SDLC) platform built to accelerate software delivery for the entire team — PMs, BAs, developers, and QA. It provides a single place to manage the full lifecycle of a software project: from capturing knowledge and requirements, through planning and story creation, to code generation and testing.

The platform uses AI as the connective tissue between phases. Every phase feeds the next. The Knowledge Base established in Discovery becomes the shared memory that informs every AI action across Planning, Features, Implementation, and Test.

### Core Principles
- **One platform, one flow.** No jumping between Jira, Confluence, Figma, and IDE. Everything lives here.
- **AI assists, humans decide.** AI generates and suggests; humans review, edit, and approve at every gate.
- **Phase-driven.** Work moves forward phase by phase. Each phase has a clear input, a clear output, and a human gate before advancing.
- **Clean and fast.** The experience must be smooth, typo-free, and predictable. No surprises.

---

## 2. Global / Cross-Platform Requirements

### 2.1 Layout
- The platform has a persistent top bar, a left sidebar, and a main content area.
- A phase rail is always visible when inside a project, showing all 5 phases with their current status (not started / active / complete).
- The active phase is always highlighted in the rail.
- Completed phases are marked with a checkmark. Future phases are accessible but show an appropriate state if prerequisites are not met.

### 2.2 Project Context
- The top bar always shows the active project name.
- A project switcher allows the user to switch between projects without going back to the projects list.
- The user's current role is always visible and switchable: **PM / BA / Developer / Admin**.
- Role switching changes what is emphasised in the sidebar and certain UI affordances, but does not hard-lock access for Week 1.

### 2.3 AI Actions
- Every AI-triggered action must show visible progress — what the system is doing, step by step.
- Where possible, estimated time remaining is shown.
- AI actions never block the user silently. If something is processing in the background, a persistent status indicator is shown.
- All AI-generated content is clearly labelled as AI-generated.
- The user can always re-trigger an AI action (regenerate).

### 2.4 Empty States
- Every page and section has a designed empty state — never a blank screen.
- Empty states explain what the section is for and what action the user should take.

### 2.5 Notifications
- Success, error, and AI-completion events surface as toast notifications.
- Errors always tell the user what went wrong and what they can do next.

### 2.6 Responsiveness
- The platform targets desktop (minimum 1280px wide). Mobile is out of scope for Week 1.

---

## 3. Authentication

### In Scope
- Login screen with email and password.
- Auth is already implemented by the team — frontend integrates with the existing auth service.
- On successful login, user is directed to the Projects list.
- On failed login, a clear inline error is shown (do not expose whether the email or password was wrong).
- Session persistence — user stays logged in across browser refreshes until they log out.
- Log out from the top bar.
- Protected routes — unauthenticated users are redirected to login.

### Out of Scope
- Registration / sign-up flow.
- Password reset.
- Social login (Google, Microsoft, etc.).
- Multi-factor authentication.
- Role management UI (roles are assigned externally).

---

## 4. Projects

### 4.1 Projects List

#### In Scope
- Landing page after login shows all projects the user has access to.
- Each project card shows: project name, description, project type badge, logo (if uploaded), current active phase, last updated date.
- Projects are sorted by last updated (most recent first) by default.
- A "New Project" button is always visible.
- Empty state when no projects exist yet.

#### Out of Scope
- Project search and filtering (Week 2).
- Project archiving / deletion (Week 2).
- Sorting options (Week 2).

---

### 4.2 Project Creation

#### In Scope
Four fields only:
1. **Project Name** — required, plain text.
2. **Description** — required, short text, one or two sentences.
3. **Logo** — optional, image upload, shown as project avatar.
4. **Project Type** — required, single select: Healthcare / Insurance / Fintech / Retail / Other.

- Creation is a modal or a focused page — not a long form with sections.
- On submit, user is taken directly into the project at the Discovery phase.
- Validation: name and description are required; clear inline errors if missing.

#### Out of Scope
- Team member assignment at creation time.
- Client name as a separate field (captured in Discovery knowledge base).
- Project templates.
- Duplicate project.

---

### 4.3 Project Detail Shell

#### In Scope
- When a user opens a project, they land on the active phase.
- The phase rail at the top shows all 5 phases.
- The sidebar shows phase-relevant navigation items.
- The project name and type badge are always visible in the top bar.

---

## 5. Discovery

### Overview
Discovery is the knowledge foundation of the entire project. Everything the AI does in later phases draws from what is established here. The goal of this phase is to build a rich, structured Knowledge Base from raw inputs — files, transcripts, links, and typed context.

**Input:** Raw artifacts — files (PDF, DOCX, TXT), transcripts, links, typed context/notes.
**Output:** Structured Knowledge Base — a set of named sections, each containing AI-generated notes in Markdown format, sourced from the uploaded inputs.
**Gate to Planning:** At least one KB section has content.

---

### 5.1 First-Time Experience (Empty State)

#### In Scope
- When a user opens Discovery for the first time on a new project, they see a clean, focused input area — similar to a chat interface.
- The input area contains:
  - A large textarea for typing context, pasting text, adding links, or describing the project.
  - A file upload area (drag and drop or click to browse) supporting PDF, DOCX, TXT, and plain text transcripts.
  - A submit / analyse button (label: "Analyse" or "Build Knowledge Base" — TBD with design).
- This is the primary action on first visit. Nothing else competes for attention.

#### Out of Scope
- Audio / voice memo upload (future scope).
- URL scraping (link is noted but content extraction is future scope).
- Real-time collaboration on input.

---

### 5.2 Analysis Progress

#### In Scope
- When the user submits, the system shows a visible progress experience:
  - Step-by-step status of what the AI is doing (e.g. "Reading files…", "Identifying requirements…", "Organising knowledge base…").
  - Estimated time remaining (if available from API; otherwise a progress indicator).
  - The user cannot resubmit while analysis is running, but they are not blocked from viewing other parts of the platform.
- On completion, the Knowledge Base sections are revealed.
- On error, a clear message is shown with a retry option.

---

### 5.3 Knowledge Base Sections

#### In Scope
The Knowledge Base is displayed as a set of named sections. Each section contains AI-generated content rendered as formatted Markdown (titles, bullet lists, paragraphs).

**Pre-defined sections (always present, may be empty):**
1. Business Requirements
2. Problem Statements
3. Proposed Solutions
4. Architectural Notes
5. Tech Stack
6. Timeline & Milestones
7. Stakeholders
8. Open Questions
9. Other Notes

- Each section shows: section title, AI-generated content (Markdown rendered), source reference (which uploaded file the content came from), and a timestamp of when it was last updated.
- Empty sections show an empty state with a brief description of what belongs there.
- Sections are displayed in a clean, scannable layout — cards or a sidebar-navigation + content panel.
- User can click into any section to view the full content.

#### Out of Scope
- User-created custom sections (future scope — sections are hardcoded for Week 1).
- Manually editing section content inline (future scope).
- Reordering sections (future scope).

---

### 5.4 Notes

#### In Scope
- Each section can have one or more **Notes**.
- A Note is an AI-generated document with: title, short description, and body content in Markdown.
- Notes are rendered in the browser — formatted headings, bullet lists, bold/italic, code blocks.
- User can click a note to open it in a full-page or modal view.
- Notes are generated by the AI during analysis and associated with the most relevant section.

#### Out of Scope
- User manually creating a new note (future scope).
- Editing note content (future scope).
- Moving a note from one section to another via drag and drop (future scope — noted as a desired feature).

---

### 5.5 Re-upload / Add More Context

#### In Scope
- After the initial analysis, the upload + context input area is still accessible — collapsed by default, expandable.
- User can add more files or context and re-run analysis to update the Knowledge Base.
- Re-running analysis adds to / updates the existing sections — it does not wipe them.

---

## 6. Planning

### Overview
Planning transforms the Knowledge Base into a structured list of features. This is the bridge between "what we know" and "what we are going to build."

**Input:** Knowledge Base (from Discovery).
**Output:** Approved feature list — each feature has a title, description, priority, and complexity estimate.
**Gate to Features:** User explicitly approves the feature list.

---

### 6.1 Landing State

#### In Scope
- **If KB exists:** The page shows a suggested feature list immediately — AI has pre-generated it from the KB. User does not need to click a button. A note shows "Generated from your Knowledge Base."
- **If KB does not exist:** The page shows an info message explaining that a Knowledge Base is required before planning can begin, with a direct link to the Discovery phase.
- **If KB exists but is thin (fewer than 3 sections with content):** Show the suggested list but with a notice: "Your Knowledge Base is limited — consider adding more context in Discovery for better results."

---

### 6.2 Feature List

#### In Scope
- Each feature item shows: feature ID (auto-assigned, e.g. F-001), title, description, priority (High / Medium / Low), complexity (XS / S / M / L / XL).
- User can edit any feature: change title, description, priority, complexity.
- User can delete a feature.
- User can add a new feature manually (title + description minimum).
- User can reorder features (up / down controls — no drag and drop for Week 1).
- "Regenerate" button — re-runs AI generation from KB. Shows confirmation before wiping current list.
- "Add context" — user can type additional instructions before regenerating (e.g. "Focus on mobile-first features").

#### Out of Scope
- Drag-and-drop reordering (future scope).
- Feature grouping / epics at this level (future scope).
- Assigning features to team members at planning stage (future scope).

---

### 6.3 Approve & Advance

#### In Scope
- "Approve Plan" button — visible when at least one feature exists.
- Clicking shows a confirmation: "You are approving X features. This will advance the project to the Features phase."
- After approval, the Planning phase is marked complete in the phase rail and the Features phase becomes active.
- Approved features cannot be deleted (only edited) — to maintain traceability.

---

## 7. Features

### Overview
Features phase takes the approved feature list and breaks each feature into actionable user stories that developers can pick up and implement.

**Input:** Approved feature list (from Planning) + Knowledge Base.
**Output:** User stories — structured, estimated, with dependencies and impact flags. Stories marked "Ready for Dev" feed into Implementation.
**Gate to Implementation:** At least one story is marked "Ready for Dev."

---

### 7.1 Layout

#### In Scope
- Two-panel layout: left panel shows the feature list; right panel shows the stories for the selected feature.
- Clicking a feature in the left panel loads its stories on the right.
- Each feature shows a summary badge: total stories, how many are ready for dev.

---

### 7.2 Story Generation

#### In Scope
- Each feature has a "Generate Stories" button.
- On click, AI generates user stories for that feature using the feature description + KB as context.
- Stories are generated in standard format: "As a [user], I want [goal], so that [benefit]."
- Each story includes: story ID (US-001 etc.), title, as-a/I-want/so-that, acceptance criteria (list), effort estimate (story points: 1 / 2 / 3 / 5 / 8), status (Draft by default).
- User can regenerate stories for a feature at any time.
- User can add a story manually via a form.
- User can edit any story.
- User can delete a story (with confirmation).

---

### 7.3 Dependencies

#### In Scope
- Each story can be linked to other stories as dependencies.
- Dependency is set via a searchable dropdown of all stories in the project.
- A story with dependencies shows a badge indicating how many it depends on.
- Circular dependencies are not allowed — system prevents and shows an error.

---

### 7.4 Impact Flags

#### In Scope
- When a new story is saved, the AI automatically checks whether it may impact any existing closed stories in the project.
- If an impact is detected, the story is flagged with an amber warning: "This story may impact X closed stories."
- User can click the flag to view an AI-generated impact summary report (which closed stories, what may change, what the dev should be aware of).
- User can dismiss / remove the flag if they believe it is not relevant.
- The flag is also visible on the closed story itself: "A new story may affect this."

#### Out of Scope
- Automatic re-opening of closed stories (user decides).
- Impact detection across projects (future scope).

---

### 7.5 Story Status & Ready for Dev

#### In Scope
- Story statuses: Draft → Ready for Dev → In Progress → Done → Closed.
- "Mark Ready for Dev" button per story — moves it to Ready for Dev status.
- Bulk action: select multiple stories → "Mark selected as Ready for Dev."
- Filter bar: filter stories by status, by feature, by assignee.
- Stories marked Ready for Dev appear in the Implementation phase.

---

## 8. Implementation

### Overview
Implementation is where developers pick up ready stories and use AI to generate code, view the repository, and manage their workflow.

**Input:** Ready-for-dev stories + Knowledge Base + Tech Stack config.
**Output:** AI-generated code per story (frontend and/or backend). Story marked as Implemented.
**Gate to Test:** Story marked "Implemented."

---

### 8.1 Tech Stack Configuration

#### In Scope
- When the user first opens Implementation, the platform shows an AI-suggested tech stack derived from the Knowledge Base (e.g. "React, Node.js, PostgreSQL").
- Each item in the stack is shown with an "AI suggested" label.
- User can override any item — framework, version, UI library, backend framework, database.
- Tech stack is saved per project and reused across all stories.
- "AI suggested" label is removed from items the user has manually changed.

#### Out of Scope
- Per-story tech stack overrides (project-level only for Week 1).
- AI tool selector (Claude Code / Cursor / Copilot / etc.) — Coming Soon placeholder in UI.
- Auto-generation of AI tool instruction files (e.g. `.cursorrules`, `CLAUDE.md`) — Coming Soon.

---

### 8.2 Story Picker

#### In Scope
- Left panel lists all "Ready for Dev" stories across all features.
- Clicking a story loads its details and the code generation panel on the right.
- Story details shown: title, full as-a/I-want/so-that, acceptance criteria, dependencies, effort.

---

### 8.3 Code Generation

#### In Scope
- "Generate Code" button for the selected story.
- AI generates code based on: story content + acceptance criteria + KB context + tech stack config.
- Code is displayed in a VS Code-style editor UI (syntax highlighting, file tabs).
- Multiple files can be generated (e.g. a component file, an API route file, a test stub).
- Each file has its own tab.
- Code is read-only in the viewer for Week 1.
- "Copy" button per file.
- "Download all" button — downloads all generated files as a ZIP.
- Story is marked "Implemented" by the developer manually after reviewing.

#### Out of Scope
- In-browser code editing (future scope).
- Running / executing code in-browser (future scope).
- Direct commit to repo from the platform (future scope — see repo viewer below).
- Figma integration for UI generation — Coming Soon placeholder.
- API Swagger generation — Coming Soon placeholder.

---

### 8.4 Repository Viewer

#### In Scope
- A "Repository" panel in the Implementation sidebar.
- Shows: connected repo name, active branch name, file tree (folder/file structure).
- User can click a file in the tree to view its contents in the VS Code-style editor (read-only).
- "Connect Repository" button — connects to the project's GitHub/Git repo via backend API.
- If no repo is connected, shows an empty state with a "Connect Repository" button.

#### Out of Scope
- Editing files in the repo viewer (future scope).
- Committing changes from the platform (future scope).
- Branch switching (future scope).
- Pull request creation from the platform (future scope).
- Multiple repo connections per project (future scope).

---

## 9. Test

### Overview
Test phase provides a structured place to manage and track test cases for implemented stories. Test cases are generated by AI or pulled from unit test stubs generated during Implementation.

**Input:** Implemented stories + unit test stubs from Implementation phase.
**Output:** Test case list per story with pass/fail tracking.
**Gate:** No hard gate — test results are visible to the PM on the project overview.

---

### 9.1 Test Case Generation

#### In Scope
- For each implemented story, a "Generate Test Cases" button is available.
- AI generates a minimum set of test cases: happy path + basic negative cases.
- Each test case shows: title, type (Unit / Integration / E2E / Edge Case), steps (numbered list), expected result, status (Pending / Pass / Fail).
- Any unit test stubs generated during the Implementation phase are automatically visible here — they do not need to be re-generated.
- User can request additional test cases with extra context: a text input lets them describe specific edge cases or scenarios they want covered.
- User can manually add a test case.
- User can delete a test case.

#### Out of Scope
- Automated test execution (running tests and getting results automatically) — future scope.
- Integration with external test management tools (Jira Xray, TestRail, Azure DevOps Test Plans) — future scope.
- CI/CD pipeline integration — future scope.

---

### 9.2 Test Status Tracking

#### In Scope
- Each test case has a manual status toggle: Pending → Pass / Fail.
- Summary bar per story: X passing / Y failing / Z pending.
- Summary bar at phase level: total across all stories.
- PM view: can see test summary per story and per feature without needing to drill into each one.

---

## 10. Decision Log — Out of Scope & Future Scope

This log captures every feature decision made during requirements definition. Nothing is forgotten — it is either in scope or documented here for a future sprint.

| # | Feature | Decision | Reason | Target |
|---|---|---|---|---|
| 1 | User-created custom KB sections | Future scope | Sections are hardcoded for Week 1; can be made dynamic later | Week 2+ |
| 2 | Inline editing of KB section content | Future scope | AI-generated content is read-only for Week 1 | Week 2+ |
| 3 | Moving notes between sections (drag and drop) | Future scope | Desired UX — deprioritised to keep Week 1 focused | Week 2+ |
| 4 | Audio / voice memo upload in Discovery | Future scope | File parsing only for Week 1 | Week 2+ |
| 5 | URL scraping in Discovery | Future scope | Link noted by user but content extraction is non-trivial | Week 2+ |
| 6 | Reordering KB sections | Future scope | Hardcoded order for Week 1 | Week 2+ |
| 7 | Manually creating a new note | Future scope | Notes are AI-generated only for Week 1 | Week 2+ |
| 8 | Editing note content | Future scope | Notes are read-only for Week 1 | Week 2+ |
| 9 | Drag-and-drop feature reordering in Planning | Future scope | Up/down controls sufficient for Week 1 | Week 2+ |
| 10 | Feature grouping / epics at Planning level | Future scope | Flat list is sufficient for Week 1 | Week 3+ |
| 11 | Assigning features to team members at planning stage | Future scope | Kept at story level only | Week 2+ |
| 12 | Impact detection across projects | Future scope | Within-project only for Week 1 | Week 3+ |
| 13 | Auto-reopening closed stories on impact flag | Future scope | User decides manually | Week 2+ |
| 14 | In-browser code editing | Future scope | Read-only viewer for Week 1 | Week 2+ |
| 15 | Direct commit to repo from platform | Future scope | Viewer only for Week 1 | Week 2+ |
| 16 | Branch switching in repo viewer | Future scope | Active branch only for Week 1 | Week 2+ |
| 17 | Pull request creation from platform | Future scope | Out of scope | Week 3+ |
| 18 | AI tool selector (Claude Code / Cursor / Copilot) | Coming Soon (placeholder in UI) | Good UX to show it is coming; not functional | Week 2+ |
| 19 | Auto-generation of AI tool instruction files | Coming Soon (placeholder in UI) | Depends on AI tool selector | Week 2+ |
| 20 | Figma integration for UI generation | Coming Soon (placeholder in UI) | Non-trivial integration | Week 3+ |
| 21 | API Swagger / OpenAPI spec generation | Coming Soon (placeholder in UI) | Good feature — post-MVP | Week 3+ |
| 22 | Automated test execution | Future scope | Manual status toggle sufficient for Week 1 | Week 3+ |
| 23 | External test tool integration (TestRail, Xray, ADO) | Future scope | Out of scope for internal MVP | Post-MVP |
| 24 | Registration / sign-up flow | Out of scope | Auth is pre-built; users provisioned externally | Post-MVP |
| 25 | Password reset | Out of scope | Handled externally | Post-MVP |
| 26 | Project search and filtering | Future scope | Not needed with small number of projects initially | Week 2+ |
| 27 | Project archiving / deletion | Future scope | Not needed for MVP | Week 2+ |
| 28 | Per-story tech stack overrides | Future scope | Project-level config sufficient for Week 1 | Week 2+ |
| 29 | Mobile / responsive layout | Out of scope | Desktop only (min 1280px) | Post-MVP |
| 30 | Real-time multi-user collaboration | Out of scope | Single-user sessions for Week 1 | Post-MVP |
| 31 | PM analytics / reporting dashboard | Future scope | Test summary visible but no dedicated dashboard | Week 3+ |
| 32 | Notifications / email alerts | Out of scope | Toast notifications only | Post-MVP |
| 33 | Platform-wide search | Out of scope | Phase-level browsing sufficient for MVP | Post-MVP |

---

## Appendix — Phase Summary Table

| Phase | Primary User | Input | Output | Human Gate |
|---|---|---|---|---|
| Discovery | PM / BA | Files, transcripts, typed context | Structured Knowledge Base (sections + notes) | At least 1 section has content |
| Planning | PM / BA | Knowledge Base | Approved feature list | User clicks "Approve Plan" |
| Features | BA / Dev | Approved features + KB | User stories (ready for dev) | At least 1 story marked Ready for Dev |
| Implementation | Developer | Ready stories + KB + Tech Stack | Generated code + repo view | Dev marks story Implemented |
| Test | QA / Dev | Implemented stories + test stubs | Test cases with pass/fail status | No hard gate — visible to PM |

---

*Document owner: Product Team*
*This document is the source of truth for Week 1 MVP scope. Any scope changes must be reflected here first.*
