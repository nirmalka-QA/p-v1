# User Profile — Feature Plan

The signed-in user's profile: basic details, project history, and an editable
profile picture. Host-owned (the profile is a global/auth surface reached from the
top-bar profile menu; remotes contribute nothing here).

> Status: **implemented** (mock-first). Live backend pending — see §8.

---

## 1. Scope

Two sections on one page (`/profile`):

1. **Basic details** — name, email, designation, domain, role, reporting manager.
2. **Projects** — every project the user has worked on, each marked **Active** or
   **Closed**, filterable, shown as cards.

Plus **profile-picture upload/remove**, reflected in the top-bar avatar.

Identity (name / email / role) is authoritative from the OIDC token/session; the
directory fields (designation / domain / reporting manager) and the project history
come from the profile API.

## 2. Placement & entry point

- **Route:** `/profile` (`ROUTES.profile`), registered in `apps/host/src/app/router.tsx`.
  No role gate — any authenticated user sees their own profile (`ProtectedRoute`
  already guarantees auth).
- **Entry point:** top-bar avatar → **My profile** (`ProfileMenu`).
- **Feature root:** `apps/host/src/features/profile/`.

## 3. File structure

```
apps/host/src/features/profile/
  ProfilePage.tsx                 # layout: PageHeader + BasicDetails + ProjectsSection
  components/
    BasicDetails/
      BasicDetails.tsx            # identity + directory fields + avatar upload/remove
      BasicDetails.module.css     # camera-overlay positioning
    ProjectsSection/
      ProjectsSection.tsx         # filterable card grid of project history
      ProjectsSection.module.css  # card hover lift
  utility/
    models/model.ts               # UserProfileDetails, ProfileProject, ProfileProjects, …
    constants/constants.ts        # status labels/colours, filters, role labels, image limits
    helpers/helpers.ts            # initials, view mapper (session overlay), date format
    services/services.ts          # profileApi (RTK Query injectEndpoints)
    services/mocks/profileMock.ts # mock routes (backend-less; VITE_USE_MOCKS)
```

Wiring touched: `router.tsx`, `bootstrap.tsx` (`registerProfileMockRoutes`),
`ProfileMenu.tsx` (link + avatar reflection), and `@wispr/contracts`
(`ROUTES.profile`, `API_ENDPOINTS.profile|profileProjects|profileAvatar`,
`API_TAGS.Profile`).

## 4. Data model

```ts
type Role = 'platformAdmin' | 'owner' | 'admin' | 'member' | 'viewer'

interface UserProfileDetails {
  id: string
  name: string
  email: string
  avatarUrl?: string            // CDN url in prod; data URL in mock mode; else initials
  designation: string           // job title, e.g. "Senior Software Engineer"
  domain: string                // department, e.g. "Product Engineering"
  role: Role
  reportingManager?: { name: string; designation?: string; email?: string }
}

type ProfileProjectStatus = 'active' | 'closed'  // active = NEW/IN_PROGRESS; closed = COMPLETED

interface ProfileProject {
  id: string
  name: string
  workspaceName: string
  projectRole: string           // the user's role on the project
  status: ProfileProjectStatus
  startedDate: string           // ISO 8601
}

interface ProfileProjects {
  projects: ProfileProject[]
  totalCount: number
  activeCount: number
  closedCount: number           // counts are over the full set (stable across filtering)
}
```

## 5. API contract

All responses use the platform `{ result: … }` envelope. Errors return non-2xx with
a human-readable message; the UI shows an `EmptyState` + Retry (queries) or a
notification (mutations).

```
# Identity is the authenticated user ("me")

GET    /me                          → 200 { result: UserProfileDetails }
GET    /me/projects[?status=active|closed]
                                    → 200 { result: ProfileProjects }
                                      (status filters server-side; counts stay full-set)

POST   /me/avatar                    multipart/form-data, field "file" (image)
                                    → 200 { result: { avatarUrl: string } }
                                    → 400 no file · (prod) 413 too large · 415 wrong type
DELETE /me/avatar                    → 200 { result: true }
```

Client treats the **session token as authoritative for name/email/role**; `GET /me`
still returns them (full resource), but the view overlays the session identity so the
displayed user always matches the signed-in user even if the directory record lags.

## 6. Behaviour & states

- **Every async section** has loading (skeleton), error (EmptyState + Retry), and
  empty (EmptyState) states. Projects also has a filtered-empty state.
- **Projects filter** — `All / Active / Closed` `SegmentedControl` with counts;
  filtering is client-side over the fetched set.
- **Avatar upload** — Mantine `FileButton` → camera `ActionIcon` over the avatar.
  Client validation: type (PNG/JPG/WEBP/GIF) + size (≤ 2 MB). Loading spinner on the
  control; success/failure via `notifications.show()`. "Remove photo" appears when set.
- **Top-bar reflection** — `ProfileMenu` reads `avatarUrl` from the shared cached
  profile query, so an upload updates the corner avatar instantly (cache invalidation).

## 7. Mock behaviour (`VITE_USE_MOCKS`)

- **Project history is derived** from the shared project + workspace stores
  (`readMockProjects` + `readMockWorkspaces`), mapped to `active|closed` via project
  status (`COMPLETED → closed`) — stays consistent with the rest of the app.
- **Directory fields** (designation/domain/manager) are seeded (a backend would
  source these from HR/IAM).
- **Avatar** — the uploaded `File` is read to a base64 data URL, persisted in
  `localStorage` (capped at 2 MB so it fits), and merged into `GET /me` so it survives
  reloads. `DELETE` clears it.

## 8. Live-backend notes / follow-ups

- `designation`, `domain`, `reportingManager` come from a directory/HR/IAM service,
  not the OIDC token.
- Avatar: a live backend stores the bytes (blob/CDN) and returns a hosted URL; the UI
  is agnostic (it just uses `avatarUrl` as `<Avatar src>`). Drop the localStorage data
  URL and the 2 MB cap accordingly.
- Project participation: the mock returns the full project set; the real API scopes
  `/me/projects` to the authenticated user's actual participation (+ project role).
- Possible extensions: editable directory fields (PATCH `/me`), pagination on
  `/me/projects`, image cropping before upload.

## 9. Conventions

Mantine-first components, theme/token styling (CSS modules only for the avatar
overlay + card hover, using `var(--cl-*)`), named exports, routes/endpoints/tags from
constants, RTK Query via the shared axios base, no `any`, no inline styles. Follows
the standard feature `utility/{models,constants,helpers,services}` layout.
