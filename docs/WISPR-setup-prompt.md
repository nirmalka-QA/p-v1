# WISPR — Setup Prompt for Claude (scaffold the micro-frontend platform)

> Paste this into Claude Code (or Claude) to scaffold the monorepo from scratch and migrate the existing Custom App in as the first remote. It encodes every locked decision; follow it top to bottom.

---

## ROLE & GOAL

You are setting up a **micro-frontend platform** for WISPR. Build an **Nx monorepo** containing a **shell (host)** app and **per-project-type remote** apps composed via **Module Federation 2.0**. Exactly **one router, one Redux store, one RTK Query cache, and one Mantine theme** exist at runtime — all provided by the shell and shared into the active remote as MF singletons. Remotes never create their own.

Work in **small, verified steps**. After each step: run the relevant `nx` target (lint/build/serve/test) and confirm it passes before moving on. Do not scaffold everything blindly.

---

## NON-NEGOTIABLE STACK

- **Nx** monorepo, **npm** workspaces, **TypeScript strict** (`"strict": true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- **React 19**, **react-router-dom v7**.
- **Vite** + **`@module-federation/vite`** (Module Federation 2.0). Do **not** use `@originjs/vite-plugin-federation` or Rspack.
- **Mantine (latest)** as the UI library — use Mantine components, not raw HTML. Custom CSS only via Mantine; pure CSS is a last resort.
- **Redux Toolkit + RTK Query** with a custom **`axiosBaseQuery`**. **No Zustand.**
- **`@rtk-query/codegen-openapi`** for API codegen (point at a placeholder spec for now).
- Use **latest stable** versions of all packages.

---

## MONOREPO LAYOUT TO CREATE

```
apps/   shell  custom-app  data-pipeline  analytics-bi  sap  guidewire  strategy  testing
libs/   contracts  ui  tokens  services  store  mfe-runtime  utils
```

All libs are **non-buildable source libraries** in dev, resolved by `tsconfig.base.json` path aliases (`@wispr/*` → `libs/*/src/index.ts`) for instant HMR with **no rebuild**. (Publishing config for `contracts`/`ui`/`tokens` to Azure Artifacts comes later — leave a TODO, don't block on it.)

---

## ORDERED TASKS

### 1. Workspace
- `npx create-nx-workspace@latest wispr --preset=apps --pm=npm`
- Add `@nx/react`, `@nx/vite`, `@nx/js`. Configure `tsconfig.base.json` strict + `@wispr/*` path aliases.
- Add `.npmrc` placeholder for Azure Artifacts (commented TODO).

### 2. Shared libs (source libraries)
Generate each as a buildable=false JS/TS or React lib:
- `@wispr/contracts` — zod schemas + inferred TS types (see CONTRACTS below).
- `@wispr/tokens` — CSS variables (light/dark) + a `mantineTheme` object derived from them.
- `@wispr/ui` — design-system components on Mantine; re-export a `<WisprThemeProvider>` wrapping `MantineProvider` with `mantineTheme`.
- `@wispr/services` — axios instance + interceptor, `axiosBaseQuery`, base `api`, auth service, flags/telemetry/notify service interfaces.
- `@wispr/store` — `makeStore()`, slices: `session`, `workspace`, `theme`, `toasts`.
- `@wispr/mfe-runtime` — `ProjectAppProps` mount types, `loadRemote()`, `RemoteErrorBoundary`, `useProjectNavigate`.
- `@wispr/utils` — pure helpers.

### 3. `@wispr/contracts` (write these first — everything depends on them)
```ts
import { z } from 'zod';

export const Role = z.enum(['platformAdmin','owner','admin','member','viewer']);
export const User = z.object({ id: z.string(), name: z.string(), email: z.string(), roles: z.array(Role) });
export const WorkspaceRef = z.object({ id: z.string(), name: z.string() });
export const ProjectType = z.enum(['custom-app','data-pipeline','analytics-bi','sap','guidewire','strategy','testing']);
export const Project = z.object({ id: z.string(), name: z.string(), type: ProjectType, workspaceId: z.string() });

export type User = z.infer<typeof User>;
export type WorkspaceRef = z.infer<typeof WorkspaceRef>;
export type ProjectType = z.infer<typeof ProjectType>;
export type Permission = string;

export const CONTRACT_VERSION = '1.0.0';

export interface Services {
  api: unknown;                              // RTK Query api ref (typed in services)
  notify: { show(o:{title?:string;message:string;type?:'info'|'success'|'error'}):void };
  flags: { isEnabled(key:string):boolean };
  telemetry: { track(event:string, props?:Record<string,unknown>):void };
}
export type EventBus = { on(e:string,h:(p?:unknown)=>void):void; off(e:string,h:(p?:unknown)=>void):void; emit(e:string,p?:unknown):void };

export interface ProjectAppProps {
  contractVersion: string;
  projectId: string;
  workspace: WorkspaceRef;
  user: User;
  can: (perm: Permission) => boolean;
  theme: 'light' | 'dark';
  basePath: string;
  services: Services;
  onNavigate: (path: string) => void;
  eventBus: EventBus;
}
```

### 4. `@wispr/services` — axios instance, interceptor, axiosBaseQuery, base api
- **In-memory access token** (module variable + setter/getter); never touch web storage.
- One axios instance with `withCredentials: true`.
- **Request interceptor:** `Authorization: Bearer <accessToken>`, active-workspace header, `x-request-id` trace header.
- **Response interceptor:** normalize errors to one shape; on **401 → single-flight silent refresh** (one in-flight refresh; queue concurrent 401s; replay after success; on failure emit `auth:logout`).

```ts
// token.ts
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;

// http.ts
import axios from 'axios';
export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true });
let refreshing: Promise<void> | null = null;
http.interceptors.request.use((cfg) => {
  const t = getAccessToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  cfg.headers['x-request-id'] = crypto.randomUUID();
  return cfg;
});
http.interceptors.response.use(r => r, async (error) => {
  const { response, config } = error;
  if (response?.status === 401 && !config.__retried) {
    config.__retried = true;
    refreshing ??= refreshAccessToken().finally(() => { refreshing = null; });
    try { await refreshing; return http(config); }
    catch { eventBus.emit('auth:logout'); throw error; }
  }
  return Promise.reject(normalizeError(error));
});

// axiosBaseQuery.ts (RTK Query base)
export const axiosBaseQuery = (): BaseQueryFn<{url:string;method?:string;data?:unknown;params?:unknown}> =>
  async ({ url, method = 'get', data, params }) => {
    try { const res = await http({ url, method, data, params }); return { data: res.data }; }
    catch (e:any) { return { error: { status: e.status, data: e.data } }; }
  };

// api.ts
export const api = createApi({ reducerPath: 'api', baseQuery: axiosBaseQuery(), endpoints: () => ({}) });
```
- Add `refreshAccessToken()` hitting the refresh endpoint (uses httpOnly cookie) and calling `setAccessToken`.
- Add `@rtk-query/codegen-openapi` config in `tools/` pointing at a **placeholder OpenAPI file**; generated endpoints inject into `api`. Add an npm script `api:codegen`.

### 5. `@wispr/store` — single store, consumed everywhere
```ts
export const makeStore = () => configureStore({
  reducer: { [api.reducerPath]: api.reducer, session, workspace, theme, toasts },
  middleware: (gdm) => gdm().concat(api.middleware),
});
export type RootState = ReturnType<ReturnType<typeof makeStore>['getState']>;
export type AppDispatch = ReturnType<typeof makeStore>['dispatch'];
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```
**Only the shell calls `makeStore()`** and wraps `<Provider store>`. Remotes import the typed hooks/slices/api — never create a store.

### 6. `@wispr/mfe-runtime`
- `RemoteErrorBoundary` (per-remote isolation + fallback).
- `loadRemote(type)` — dynamic MF import resolved from the registry JSON.
- `useProjectNavigate()` — wraps `useNavigate` so remotes navigate relative to `basePath`.

### 7. Shell app (`apps/shell`)
- `vite.config.ts` with `@module-federation/vite` as **host**, consuming remotes, and the **shared singleton config** (see SHARED below).
- Boot sequence: fetch **remote registry JSON** → attempt **silent refresh** → render router.
- `<Provider store={makeStore()}>` → `<WisprThemeProvider>` (MantineProvider) → `<RouterProvider>`.
- Router (RR7): `/`, `/workspaces/*`, and the splat `/p/:projectId/*` → `<ProjectHost/>`.
- `ProjectHost`: resolve project type → `loadRemote(type)` → render `<ProjectApp {...contract} basePath={'/p/'+id}/>` inside `<Suspense>` + `<RemoteErrorBoundary>`; pass `contractVersion: CONTRACT_VERSION` and verify the remote's advertised version is compatible (graceful fallback on mismatch).
- Auth: OIDC Authorization Code + PKCE against **Entra ID**, shell-only; logout clears in-memory token + session slice and emits `auth:logout`. RBAC computed here; pass `user.roles` + a `can()` into the contract.

### 8. SHARED singleton config (identical in shell + every remote)
```ts
// vite.config.ts — federation({ shared: {...} })
const singleton = (v?: string) => ({ singleton: true, requiredVersion: v });
shared: {
  react: singleton(), 'react-dom': singleton(),
  'react-router-dom': singleton(),
  '@reduxjs/toolkit': singleton(), 'react-redux': singleton(),
  '@mantine/core': singleton(), '@mantine/hooks': singleton(),
  '@wispr/services': singleton(), '@wispr/store': singleton(),
  '@wispr/mfe-runtime': singleton(), '@wispr/ui': singleton(),
  '@wispr/tokens': singleton(), '@wispr/contracts': { singleton: true },
}
```

### 9. Migrate the existing Custom App → first remote (`apps/custom-app`)
The existing app is **Vite + React + TS + react-router-dom ^7 + Redux, in PROD**. Migrate **without a rewrite**:
1. Move it under `apps/custom-app` unchanged; get `nx serve custom-app` green.
2. Replace its local store creation with imports from `@wispr/store`; move its API calls into `api.injectEndpoints` in `@wispr/services`.
3. Replace its top-level `<BrowserRouter>/createBrowserRouter` with a default-exported **`ProjectApp`** that renders **relative `<Routes>`** for its phases (Initiation, Planning, Implementation, Test). No router, no Provider, no MantineProvider in composed mode.
4. Add `@module-federation/vite` as a **remote** exposing `'./ProjectApp': './src/ProjectApp.tsx'` with the same shared config; advertise `contractVersion` in manifest metadata.
5. Add `src/bootstrap.standalone.tsx` that wraps `ProjectApp` in its own `<Provider store={makeStore()}>` + `<WisprThemeProvider>` + a **mock contract** + `<BrowserRouter>` so it runs alone.

### 10. Remote template + other six remotes
Create one thin generator/template implementing: default-exported `ProjectApp` (relative `<Routes>` + a phase-rail shell), `bootstrap.standalone.tsx`, MF remote config + shared singletons, `contractVersion`. Scaffold `data-pipeline, analytics-bi, sap, guidewire, strategy, testing` from it (empty phase rails for now).

### 11. Dev experience
- `nx run-many --target=serve --projects=shell,custom-app` runs shell + chosen remote(s); document how to add more or all.
- Each remote also runs standalone via its `bootstrap.standalone.tsx`.
- Local **registry JSON** lists only the remotes currently running; shell shows a "remote not running" fallback for absent types.

### 12. Quality
- ESLint + Prettier + TS strict across all projects.
- **Vitest + React Testing Library** unit tests for `@wispr/services` (axiosBaseQuery + 401 single-flight), `@wispr/store` slices, `ProjectHost` resolution, and `RemoteErrorBoundary`. **Skip Playwright for now** (add on demand).

---

## ACCEPTANCE CHECKS (must all pass)

1. `nx serve shell` + `nx serve custom-app` → opening a Custom App project mounts the **federated** remote under `/p/:id/*`; deep-link and hard refresh restore the correct phase.
2. There is **one** React, one router, one Redux store, one RTK Query cache, one Mantine theme at runtime (verify no duplicate-React warning; remote uses shell's store/theme/router).
3. A change in `libs/ui` hot-reloads in shell **and** running remotes with **no rebuild**.
4. Custom App also runs **standalone** via its bootstrap with a mock contract.
5. A 401 triggers a **single** silent refresh; concurrent requests queue and replay; refresh failure logs out via the shell.
6. Access token is **in memory only**; nothing auth-related is written to web storage; refresh relies on the httpOnly cookie.
7. `contractVersion` mismatch renders a graceful fallback, not a crash.

---

## DO NOT
- Do not let a remote create a store, router, or MantineProvider in composed mode.
- Do not store any token in localStorage/sessionStorage/IndexedDB.
- Do not hardcode remote URLs — resolve from the registry.
- Do not make shared libs buildable in dev (keep them source/aliased).
- Do not add i18n or Playwright yet.
- Do not block on the backend spec — use the placeholder and leave codegen ready to flip.
