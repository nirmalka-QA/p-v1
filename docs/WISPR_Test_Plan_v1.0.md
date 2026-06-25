# WISPR — AI-Powered SDLC Platform
## Comprehensive Test Plan v1.0

**Document Status:** Final  
**Version:** 1.0  
**Last Updated:** June 2026  
**Classification:** Internal - QA Documentation  

---

## EXECUTIVE SUMMARY

This document defines the complete testing strategy, approach, and governance for WISPR, an enterprise-grade AI-powered Software Development Lifecycle (SDLC) platform built on a **Nx monorepo with Micro-Frontend architecture** (Module Federation 2.0). The platform enables product teams, business analysts, developers, and QA professionals to manage five sequential SDLC phases (Discovery, Planning, Features, Implementation, Test) within a unified workspace-organized system.

**Key Attributes:**
- **Deployment Model:** Azure cloud with Static Web Apps, Front Door CDN, and Entra ID SSO
- **Architecture:** Host shell + 4+ federated remote applications (custom-app, data-pipeline, strategy, [future remotes])
- **Tech Stack:** React 19, TypeScript (strict), Vite + Module Federation 2.0, Redux Toolkit + RTK Query, Mantine UI, Vitest
- **User Base:** Internal team (PMs, BAs, Developers, QA)
- **Critical Success Factors:** Federation integrity, phase-gate enforcement, cross-app data consistency, real-time API integration

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Business Objectives & In-Scope / Out-of-Scope](#2-business-objectives--in-scope--out-of-scope)
3. [Testing Scope](#3-testing-scope)
4. [Supported Platforms & Environments](#4-supported-platforms--environments)
5. [Technologies & Tools Used](#5-technologies--tools-used)
6. [Testing Strategy](#6-testing-strategy)
7. [Test Types & Approach](#7-test-types--approach)
8. [Test Management Process](#8-test-management-process)
9. [Test Environment Strategy](#9-test-environment-strategy)
10. [Test Data Strategy](#10-test-data-strategy)
11. [Automation & CI/CD Strategy](#11-automation--cicd-strategy)
12. [Test Phase Entry/Exit Criteria](#12-test-phase-entry-exit-criteria)
13. [Testing Schedule & Milestones](#13-testing-schedule--milestones)
14. [Assumptions & Constraints](#14-assumptions--constraints)
15. [Testing Deliverables](#15-testing-deliverables)
16. [Defect Management](#16-defect-management)
17. [QA Responsibilities & RACI](#17-qa-responsibilities--raci)
18. [Risks & Contingencies](#18-risks--contingencies)
19. [Quality Metrics & KPIs](#19-quality-metrics--kpis)
20. [Test Traceability Matrix](#20-test-traceability-matrix)
21. [Browser & Device Compatibility](#21-browser--device-compatibility)
22. [API & Database Testing](#22-api--database-testing)
23. [Security Testing](#23-security-testing)
24. [Accessibility Testing](#24-accessibility-testing)
25. [Performance Testing](#25-performance-testing)
26. [UAT Strategy](#26-uat-strategy)
27. [Regression Testing Strategy](#27-regression-testing-strategy)
28. [Change Management & Release Readiness](#28-change-management--release-readiness)
29. [Communication Plan](#29-communication-plan)
30. [Approvals](#30-approvals)

---

## 1. PROJECT OVERVIEW

### 1.1 What is WISPR?

WISPR is an **AI-powered, cloud-based SDLC platform** that orchestrates five sequential product delivery phases:

| Phase | Duration | Input | Output | Approval Gate |
|-------|----------|-------|--------|---|
| **Discovery** | 2-3 days | Customer files, transcripts, context | Structured Knowledge Base | KB ≥1 section populated |
| **Planning** | 2-3 days | Knowledge Base | Approved feature list | User clicks "Approve Plan" |
| **Features** | 2-3 days | Approved features + KB | User stories marked "Ready for Dev" | ≥1 story marked "Ready" |
| **Implementation** | 2-3 days | Ready stories + tech stack | Generated code + virtual repo | Dev marks story "Implemented" |
| **Test** | 2-3 days | Implemented stories + stubs | Test cases with status (pass/fail) | No hard gate (reporting-driven) |

**Core Concept:** A **workspace** groups related projects and shares context (members, instructions, artifacts); a **project** belongs to exactly one workspace and has a **type** (custom-app, data-pipeline, strategy, [future types]) that selects the federated remote and phase configuration.

### 1.2 Architecture at a Glance

```
Browser → Azure Front Door (app.wispr.com)
           ├─ Shell (Host @ :4200) — Auth, workspaces, dashboard, project list/creation
           │  (React 19 + Redux + RTK Query + Mantine + React Router v7)
           │
           └─ Remotes (federated @ runtime via Module Federation 2.0)
              ├─ custom-app (@ :4201)
              ├─ data-pipeline (@ :4202)
              ├─ strategy (@ :4203)
              └─ [future: analytics-bi, sap, guidewire, testing]

Shared Runtime:
  • One React instance
  • One Redux store (via @wispr/store singleton)
  • One RTK Query cache (via @wispr/services singleton)
  • One Mantine theme context
  • One React Router instance

APIs:
  • backend: api.wispr.com (REST + RTK Query codegen from OpenAPI spec)
  • Auth: Microsoft Entra ID (OIDC + SSO)
  • Config: Azure App Configuration + Feature Management (flags)
  • Telemetry: Azure Application Insights
```

### 1.3 Key Features (Phase 1 + Phase 2)

**Phase 1 (MVP – complete):**
- Workspace creation, project creation (multi-step wizard)
- Phase-gated flow with approval gates
- Mock API mode (`VITE_USE_MOCKS=true`) for end-to-end prototyping
- Federation composability (host + custom-app + data-pipeline remotes)
- OIDC auth (Entra ID) with httpOnly refresh token + in-memory access token
- RTK Query cache + Redux session/workspace/theme slices

**Phase 2 (current):**
- Workspace home (project list + per-workspace dashboard)
- Members & RBAC per workspace
- Strategy phase configuration (template vs. custom phasing)
- Artifact library (KB upload/preview)
- Project row menu (details, members, connectors, settings)

---

## 2. BUSINESS OBJECTIVES & IN-SCOPE / OUT-OF-SCOPE

### 2.1 Business Objectives

1. **Standardize and accelerate SDLC:** Provide a unified, AI-assisted workflow for all project delivery types
2. **Reduce manual artifacts:** Auto-generate planning docs, feature specs, code, tests via AI
3. **Enforce phase gates:** Prevent downstream work without upstream approval (quality control)
4. **Enable team collaboration:** Workspace-scoped member management, shared KB, artifact library
5. **Support multiple delivery models:** Extensible remote architecture for different project types (custom-app, data-pipeline, strategy, [future types])
6. **Improve visibility:** Dashboard KPIs, phase metrics, role-based access

### 2.2 In-Scope Testing

**Functional Testing:**
- Workspace CRUD (create, read, update, delete, archive)
- Project creation wizard (multi-step, type selection, phase config)
- Phase rail navigation and gate enforcement
- KB generation and versioning
- Plan approval and feature list generation
- Story creation, status transitions, and "Ready for Dev" marking
- Code generation (virtual repo view)
- Test case generation and status tracking
- User RBAC and permission-gated UI
- Project settings and artifact uploads

**Integration Testing:**
- Host ↔ Remote federation (contract enforcement, singleton resolution)
- RTK Query API calls ↔ Mock routes
- Authentication flow (OIDC, silent refresh, logout)
- Workspace ↔ Project data consistency
- Phase progression and gate validation

**UI/UX Testing:**
- Design reference fidelity (Mantine components, tokens, themes)
- Responsive design (desktop, tablet)
- Accessibility (WCAG 2.1 Level AA)
- Theme switching (light/dark)
- Notification system and error messages

**Performance Testing:**
- Federation module loading (lazy load, bundle size)
- Phase rail animations (smooth transitions)
- Large project list pagination
- RTK Query cache hit/miss optimization
- Search and filter performance

**Data Integrity & Security:**
- Phase gate enforcement (cannot skip phases)
- RBAC permission checks (role-based feature access)
- Data isolation per workspace
- XSS/CSRF mitigation (Mantine sanitization, SameSite cookies)
- Sensitive data in localStorage (tokens, user session)

**Regression Testing:**
- After each remote update, verify host integration holds
- After feature flag changes, verify new/old code paths work
- After API schema changes, verify RTK Query endpoints still resolve

### 2.3 Out-of-Scope Testing

- **Entra ID OIDC flow (external):** Assume SSO provider is correct; test only redirect/token handling
- **Azure infrastructure (external):** Assume SWA, Front Door, App Config work as-is
- **Backend API implementation:** Assume backend team owns API correctness; QA tests the contract (RTK Query codegen)
- **Third-party libraries (external):** Assume Mantine, React Router, Redux, Vite work correctly
- **Accessibility compliance beyond WCAG 2.1 Level AA:** WCAG 2.1 AAA is voluntary
- **Load testing > 1000 concurrent users:** Internal team platform, no consumer scale required
- **Mobile app (future):** Only web (desktop/tablet) in scope for now

---

## 3. TESTING SCOPE

### 3.1 Functional Scope Matrix

| Module | Feature | Test Type | Status |
|--------|---------|-----------|--------|
| **Auth & Session** | OIDC login, logout, silent refresh | Unit + E2E | ✅ In-scope |
| | Token refresh on 401 | Integration | ✅ In-scope |
| | Permission checks (RBAC) | Unit + Integration | ✅ In-scope |
| **Workspaces** | CRUD, archive, member invite | Unit + E2E | ✅ In-scope |
| | Per-workspace dashboard | UI/Functional | ✅ In-scope |
| | Artifact library (upload/preview) | UI/Functional | ✅ In-scope |
| **Projects** | Create (multi-step wizard) | E2E | ✅ In-scope |
| | List + filter + search | UI/Functional | ✅ In-scope |
| | Type resolution → remote mount | Integration/E2E | ✅ In-scope |
| | Settings modal + connectors | UI/Functional | ✅ In-scope |
| **Phase Rail** | Gate enforcement (KB → Plan → Stories) | E2E | ✅ In-scope |
| | Phase transition + data persistence | Integration | ✅ In-scope |
| | Role-based phase access | RBAC/E2E | ✅ In-scope |
| **Discovery Phase** | KB generation (AI) | E2E + Mocks | ✅ In-scope |
| | KB section CRUD | UI/Functional | ✅ In-scope |
| | File upload / transcript parsing | Integration | ✅ In-scope |
| **Planning Phase** | Plan generation (AI) | E2E + Mocks | ✅ In-scope |
| | Plan approval | UI/Functional | ✅ In-scope |
| | Regenerate plan | E2E | ✅ In-scope |
| **Features Phase** | Story generation from approved plan | E2E + Mocks | ✅ In-scope |
| | Story CRUD (title, description, acceptance criteria) | UI/Functional | ✅ In-scope |
| | Mark story "Ready for Dev" | UI/Functional | ✅ In-scope |
| **Implementation Phase** | Code generation (AI) | E2E + Mocks | ✅ In-scope |
| | Virtual repo view (read-only) | UI/Functional | ✅ In-scope |
| | Mark story "Implemented" | UI/Functional | ✅ In-scope |
| **Test Phase** | Test case generation (AI) | E2E + Mocks | ✅ In-scope |
| | Test execution (manual result input) | UI/Functional | ✅ In-scope |
| | Test summary report | Reporting | ✅ In-scope |
| **Federation** | Module load (/remotes/<type>/mf-manifest.json) | Integration/E2E | ✅ In-scope |
| | Contract enforcement (ProjectAppProps) | Integration | ✅ In-scope |
| | Singleton resolution (store, RTK, services) | Integration | ✅ In-scope |
| | Remote error boundary | UI/Functional | ✅ In-scope |
| **Global UI** | Top bar nav + theme toggle | UI/Functional | ✅ In-scope |
| | Project dropdown (project actions) | UI/Functional | ✅ In-scope |
| | Toast notifications | UI/Functional | ✅ In-scope |
| | Responsive layout (desktop, tablet) | UI/Functional | ✅ In-scope |
| **Mocks & Dev** | Mock route registration (VITE_USE_MOCKS) | Integration | ✅ In-scope |
| | localStorage persistence (wispr.mock.*) | Data Integrity | ✅ In-scope |
| | Standalone remote bootstrap | E2E | ✅ In-scope |

---

## 4. SUPPORTED PLATFORMS & ENVIRONMENTS

### 4.1 Browser & OS Support

| Browser | Version | OS | Support Status |
|---------|---------|----|----|
| **Chrome** | Latest (120+) | Windows, macOS, Linux | ✅ Full support |
| **Edge** | Latest (120+) | Windows | ✅ Full support |
| **Firefox** | Latest (121+) | Windows, macOS, Linux | ✅ Full support |
| **Safari** | Latest (17+) | macOS | ✅ Full support |
| Safari | 15+ | iOS (future) | ⚠️ Planned |

**Viewport Breakpoints (Mantine):**
- Desktop: 1024px+ (primary)
- Tablet: 768px–1023px (secondary)
- Mobile: <768px (future; not in scope yet)

### 4.2 Environment Topology

| Environment | Purpose | Node/npm | Dependencies | Auth | API |
|-------------|---------|----------|--|--|--|
| **Local Dev** | Individual app development | 20+ / 10+ | npm install | VITE_DEV_AUTH=true (optional) | VITE_USE_MOCKS=true or http://localhost:5000 |
| **Test (Integration)** | Federation + mock API | 20+ / 10+ | npm install | Real OIDC mock | VITE_USE_MOCKS=true (localStorage) |
| **Staging** | Pre-production, real API | 20+ / 10+ | npm install from Azure Artifacts | Real OIDC | https://api-staging.wispr.com |
| **Production** | Live user environment | 20+ / 10+ | npm install from Azure Artifacts | Real Entra ID OIDC | https://api.wispr.com |

**Configuration:**
- `.env.local` per app (git-ignored)
- `VITE_*` variables (exposed to browser)
- Azure App Configuration + Feature Management (feature flags)
- Azure Key Vault (secrets, only backend)

### 4.3 Deployment Topology (Azure)

```
Browser (app.wispr.com) → Azure Front Door (CDN, routing)
                          │
                          ├─ / → Shell SWA (host, :4200 equiv)
                          │     (Azure Static Web Apps)
                          │
                          ├─ /remotes/custom-app/* → Custom-App SWA (:4201 equiv)
                          ├─ /remotes/data-pipeline/* → Data-Pipeline SWA (:4202 equiv)
                          ├─ /remotes/strategy/* → Strategy SWA (:4203 equiv)
                          │     (each: independent SWA, preview envs, CI/CD)
                          │
                          └─ /api/* → Azure App Service (backend REST API)

Auth:
  → Microsoft Entra ID (OIDC provider)
  ← httpOnly Secure SameSite cookies (refresh token) + in-memory access token

Config:
  → Azure App Configuration (feature flags, runtime config)
  → Azure Key Vault (backend secrets only)

Telemetry:
  → Azure Application Insights (frontend logs, traces, exceptions)
```

---

## 5. TECHNOLOGIES & TOOLS USED

### 5.1 Development Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Language** | TypeScript | ~6.0 | Type safety (strict mode) |
| **Framework** | React | 19.x | Component framework |
| **Bundler** | Vite | 8.x | Fast builds + HMR |
| **Federation** | @module-federation/vite | 1.16+ | Micro-frontend composition |
| **Monorepo** | Nx | 22.7+ | Workspace orchestration |
| **Router** | React Router | 7.x | SPA routing |
| **State** | Redux Toolkit | 2.12+ | Client state |
| **Server State** | RTK Query | 2.x | API data layer + caching |
| **UI Library** | Mantine | 9.x | Component library |
| **Icons** | @tabler/icons-react | 3.44+ | Icon set |
| **Auth** | OIDC Client TS + react-oidc-context | 3.5+ | OIDC flow |
| **Forms** | @mantine/form + Yup | | Form state + validation |
| **Rich Text** | TipTap | 3.24+ | Markdown editor (KB) |
| **HTTP Client** | Axios | 1.16+ | REST client (RTK base) |
| **Data Validation** | Zod | 4.x | Schema validation (contracts) |

### 5.2 Testing Stack

| Category | Tool | Version | Purpose |
|----------|------|---------|---------|
| **Unit Testing** | Vitest | 2.x | Unit + integration tests |
| **Component Testing** | React Testing Library | 15.x | Component render tests |
| **E2E Testing** | Playwright | 1.48+ | Browser automation (future) |
| **Mocking** | Vitest mocks | | Module + network mocking |
| **Mock Server** | Axios adapter (custom) | | In-browser mock API (@wispr/services) |
| **Type Checking** | TypeScript tsc | | Static type validation |
| **Linting** | ESLint 10 + TypeScript ESLint | 8.x | Code quality |
| **Accessibility** | Axe DevTools (browser ext) | | Accessibility audits |
| **Performance** | Lighthouse | | Perf + accessibility audits |

### 5.3 CI/CD & Deployment

| Tool | Purpose | Details |
|------|---------|---------|
| **Azure Pipelines** | CI/CD orchestration | Nx affected + cache, per-app deploy |
| **Azure Static Web Apps** | Host + remote hosting | Built outputs, preview envs per PR |
| **Azure Front Door** | Edge CDN + routing | Single domain (app.wispr.com), origin routing |
| **Azure Artifacts** | Private npm registry | @wispr/{contracts,ui,tokens} |
| **Git Hooks** | Pre-commit validation | .githooks/pre-commit (nx affected typecheck) |

### 5.4 Observability & Monitoring

| Tool | Purpose | Usage |
|------|---------|-------|
| **Application Insights** | APM + telemetry | Frontend logs, exceptions, custom events |
| **Azure Monitor** | Infrastructure monitoring | SWA uptime, response times, errors |
| **DevTools** | Browser debugging | Chrome/Edge/Firefox Network, Console, Performance |

---

## 6. TESTING STRATEGY

### 6.1 Pyramid Approach

```
                      ╱╲
                     ╱  ╲
                    ╱ E2E ╲         (5-10% of test suite)
                   ╱      ╲         • Browser automation (Playwright)
                  ╱  ~100  ╲        • Full user journeys
                 ╱__________╲       • Federation integration
                ╱            ╲
               ╱ Integration  ╲     (20-30% of test suite)
              ╱              ╲      • API mocking (Vitest mocks)
             ╱   ~200-300    ╲     • Cross-feature flows
            ╱________________╲     • Auth + RBAC checks
           ╱                  ╲
          ╱ Unit & Component  ╲   (60-70% of test suite)
         ╱                    ╲    • Component render (RTL)
        ╱       ~600-800      ╲    • Hooks + utilities
       ╱____________________╲     • Validators, helpers
```

**Rationale:**
- **60-70% Unit/Component:** Fast feedback, easy to maintain, high coverage of logic
- **20-30% Integration:** Critical workflows (auth, phase gates, data flow)
- **5-10% E2E:** Smoke tests for happy path, federation load, critical user journeys

### 6.2 Test Types

#### 6.2.1 Unit Testing

**Scope:** Individual functions, hooks, utilities.  
**Tools:** Vitest + React Testing Library (for components)  
**Coverage Target:** ≥80% for utility modules and custom hooks

**Example test areas:**
- Redux slice reducers + thunks (session, workspace, theme)
- RTK Query endpoint definitions (tags, cache invalidation)
- Validation helpers (isValidProjectName, phaseGateCheck)
- Date/time utilities, string formatters
- Custom hooks (useProjectNavigate, useWorkspaceMembers)

**Example test (Vitest):**
```typescript
import { describe, it, expect } from 'vitest';
import { validateProjectName } from '@wispr/projects';

describe('validateProjectName', () => {
  it('accepts names 3-50 chars alphanumeric + space/dash', () => {
    expect(validateProjectName('Valid Project-1')).toBe(true);
    expect(validateProjectName('a')).toBe(false); // too short
    expect(validateProjectName('x'.repeat(51))).toBe(false); // too long
  });
});
```

#### 6.2.2 Component Testing (RTL)

**Scope:** Individual UI components, mantine integration.  
**Tools:** Vitest + React Testing Library  
**Coverage Target:** ≥85% for components in /ui and key feature components

**Example test areas:**
- ProjectCard (props, click handler, role badge)
- PhaseRail (phase visibility, gate lock/unlock, click navigation)
- WorkspaceSelector (list, filter, selection)
- NotificationToast (show, dismiss, auto-close)
- KBSectionForm (input validation, submit, error display)

**Example test (RTL):**
```typescript
import { render, screen, userEvent } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  it('renders project name and type badge', () => {
    const project = { id: '1', name: 'API Gateway', type: 'data-pipeline' };
    render(<ProjectCard project={project} />);
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
    expect(screen.getByText('Data Pipeline')).toBeInTheDocument();
  });

  it('calls onClick when card clicked', async () => {
    const onClick = vi.fn();
    const project = { id: '1', name: 'Test', type: 'custom-app' };
    render(<ProjectCard project={project} onClick={onClick} />);
    await userEvent.click(screen.getByText('Test'));
    expect(onClick).toHaveBeenCalledWith('1');
  });
});
```

#### 6.2.3 Integration Testing

**Scope:** Multiple modules working together (API + store, federation contracts, auth flow).  
**Tools:** Vitest + RTK Query test utilities + mock adapters  
**Coverage Target:** ≥70% for critical workflows

**Example test areas:**
- **API Integration:** RTK Query endpoint + mock route match, cache invalidation, error handling
- **State Management:** Dispatch action → store updates → component re-renders
- **Auth Flow:** Login → token in memory → API call with token → 401 → silent refresh
- **Phase Gates:** KB empty → planning locked; KB populated → planning unlocked
- **Federation:** Host provides contract → remote mounts → renders with injected services
- **Workspace/Project Scoping:** Filter projects by workspace, update project → workspace sees change

**Example test (Vitest + mock):**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { configureStore } from '@reduxjs/toolkit';
import { projectsApi } from '@wispr/projects';
import { projectsReducer } from '@wispr/store';

const server = setupServer(
  http.get('/projects/:id', () => HttpResponse.json({ id: '1', name: 'Test' }))
);

beforeEach(() => server.listen());

it('fetches project and updates store', async () => {
  const store = configureStore({
    reducer: { projectsApi: projectsApi.reducer, projects: projectsReducer }
  });
  
  await store.dispatch(projectsApi.endpoints.getProject.initiate('1'));
  const state = store.getState();
  expect(state.projectsApi.queries['getProject(1)']?.data?.name).toBe('Test');
});
```

#### 6.2.4 E2E Testing (Playwright)

**Scope:** Full user journeys across host + remotes (federation integration).  
**Tools:** Playwright  
**Coverage Target:** ≥5 core journeys (smoke tests)

**Example journeys:**
1. **Login → Workspace Creation → Project Creation:** Cold start, auth, create workspace, create custom-app project, navigate to discovery
2. **Discovery Phase:** Upload KB file, generate KB section, approve plan, see planning unlocked
3. **Planning → Features → Implementation:** Generate and approve plan, create stories, mark ready, view code
4. **Federation Load:** Load host, open strategy project, verify strategy remote loaded and responsive
5. **Cross-Workspace Isolation:** Create project in workspace A, switch to workspace B, verify project list is different

**Example test (Playwright):**
```typescript
import { test, expect } from '@playwright/test';

test('create workspace and project flow', async ({ page, context }) => {
  // Mock login
  await context.addCookies([{
    name: 'refresh_token', value: 'mock', domain: 'localhost', path: '/',
    httpOnly: true, secure: true, sameSite: 'Strict'
  }]);
  
  await page.goto('http://localhost:4200/workspaces');
  await page.click('button:has-text("New Workspace")');
  await page.fill('input[name="name"]', 'Q3 Planning');
  await page.click('button:has-text("Create")');
  
  // Create project
  await page.click('button:has-text("New Project")');
  await page.fill('input[name="projectName"]', 'Mobile App Redesign');
  await page.click('text=Custom App');
  await page.click('button:has-text("Create")');
  
  // Verify landed in discovery
  expect(page.url()).toContain('/projects/');
  expect(page.locator('text=Discovery')).toBeVisible();
});
```

#### 6.2.5 Performance Testing

**Scope:** Bundle size, module load time, phase rail animations, list pagination.  
**Tools:** Lighthouse, Chrome DevTools, custom performance markers  
**Goals:**
- Module load: <2s (First Contentful Paint)
- Remote load: <1.5s
- Phase transition animation: 60fps

**Test approach:**
- Lighthouse audit (desktop, throttled 4G)
- Bundle size check (npm: `npm run build && npx size-limit`)
- Custom performance markers (e.g., time-to-interactive for phase rail)
- Load test with 50 projects (pagination, search performance)

#### 6.2.6 Accessibility Testing

**Scope:** WCAG 2.1 Level AA compliance.  
**Tools:** Axe DevTools (browser ext), axe-core (Vitest plugin)  
**Standards:** WCAG 2.1 Level AA (contrast, keyboard nav, screen reader, semantic HTML)

**Test areas:**
- Color contrast ratios (foreground/background)
- Keyboard navigation (Tab, Enter, Escape)
- ARIA labels + roles (buttons, forms, dialogs)
- Semantic HTML (headings, lists, form labels)
- Focus indicators (visible when tabbing)
- Screen reader testing (NVDA, JAWS, VoiceOver)

**Example automated audit (Vitest):**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

expect.extend(toHaveNoViolations);

it('has no a11y violations', async () => {
  const { container } = render(<ProjectCard project={{}} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

#### 6.2.7 Security Testing

**Scope:** XSS, CSRF, sensitive data in-browser, auth token handling.  
**Tools:** Manual code review (taintest flow), OWASP ZAP (future)

**Test areas:**
- **XSS Prevention:** Mantine sanitizes HTML; KB markdown rendered via react-markdown with gfm plugin
- **CSRF Protection:** SameSite cookies + double-submit token (if backend requires)
- **Token Storage:** Access token in memory (never localStorage); refresh token in httpOnly cookie
- **Sensitive Data Masking:** API keys in logs redacted; PII masked in debug output
- **Dependency Vulnerabilities:** npm audit runs in CI; lock file committed

#### 6.2.8 Data Integrity Testing

**Scope:** Phase gates, RBAC, data consistency across federation.  
**Approach:** Integration tests + E2E

**Test areas:**
- Phase gate enforcement: KB empty → planning must be locked
- RBAC checks: Non-admin cannot access global dashboard; non-member cannot see workspace
- Data consistency: Create workspace → navigate away → return → data persists
- Federation singleton: Store updated in remote → host sees change (and vice versa)
- Mock localStorage: Create project → close tab → re-open → project in list

---

## 7. TEST TYPES & APPROACH

### 7.1 Regression Testing Strategy

**Frequency:** After every code merge to main branch (via CI)

**Scope:**
- All unit + component tests (fast suite: ~5–10 min)
- Critical integration tests (federation, auth, phase gates: ~10–15 min)
- Smoke E2E tests (3–5 key journeys: ~10–15 min)

**Automation:**
- CI pipeline (`npm run test`) runs Vitest across affected projects (Nx cache)
- Pre-commit hook runs typecheck on touched files (fast fail)
- GitHub Actions (or Azure Pipelines): Run full test suite on PR

**Non-Regression Criteria:**
- All unit + integration tests pass (≥80% coverage maintained)
- TypeScript strict mode clean (no errors/warnings)
- ESLint clean (where configured)
- E2E smoke tests all pass
- Bundle size ≤ baseline +5% (tracked in CI)

### 7.2 Smoke Testing

**When:** After each build (preview), before merge to main

**Scope:** Minimal critical paths (5–10 min runtime)
1. **Host loads:** Navigate to http://localhost:4200, see workspace list
2. **Auth flow (mock):** Seed user, verify top bar shows user name
3. **Create project:** Full wizard flow (basics → type → review → create)
4. **Remote loads:** Open project → correct remote mounts
5. **Phase rail navigable:** Navigate through phases, verify content loads
6. **Mock API works:** VITE_USE_MOCKS=true, create KB section, verify save + persist

**Entry Criteria:** Build succeeds, no TypeScript errors  
**Exit Criteria:** All 6 checks pass  
**Owner:** CI automation (Playwright smoke test suite)

### 7.3 Risk-Based Testing

**Risk Areas (test heavily):**
1. **Federation integration:** Remote mount, contract mismatch, singleton divergence
2. **Phase gates:** Incorrect gate logic could bypass approval workflow
3. **RBAC:** Unauthorized access to workspace/project data
4. **Auth token refresh:** Silent refresh failure → permanent logout loop
5. **Data loss:** Unsaved KB sections, orphaned projects, workspace deletion cascade

**Low-Risk Areas (test lightly):**
- Third-party library correctness (Mantine, React Router)
- Well-documented utilities (date formatters, string helpers)
- Visual polish (shadows, spacing)

### 7.4 Exploratory Testing

**When:** After Phase 2 features ship, before UAT  
**Duration:** 2–3 days per feature area  
**Approach:** Ad-hoc testing, following user workflows without a script

**Charter examples:**
- **Workspace Creation Variant Flows:** Create workspace with special chars in name, create duplicate names, archive and re-create, invite members mid-flight
- **Phase Rail Edge Cases:** Mark phase complete while AI generation in-flight, switch remotes mid-page, force-refresh during modal save
- **Responsive Design:** Resize browser window mid-interaction, landscape ↔ portrait on tablet, zoom in/out
- **Error Recovery:** Kill network, retry pending API call, lose session and re-login, clear localStorage

**Outcomes:** Test charter notes, bug reports (if defects found), product recommendations

### 7.5 UAT Strategy

**Stakeholders:** PM, BA, Dev lead (internal team UAT, not external customer)  
**Duration:** 2 weeks before release  
**Scope:** Phase 2 features (workspace, members, artifact library, settings)

**Test Environment:** Staging (real Entra ID, real API, real data)

**Test Scenarios:**
1. Workspace admin invite member, set member role (Editor, Viewer), member sees correct UI
2. Project owner create project, open settings, upload KB artifact, preview artifact
3. Cross-workspace isolation: Project in WS-A invisible in WS-B
4. Conflict resolution: Two members edit workspace settings simultaneously
5. Mobile-like tablet size: All workflows accessible on iPad

**Exit Criteria:**
- Zero critical defects
- ≤5 medium defects (documented as deferred)
- Stakeholders sign off on test summary

**Reporting:** UAT report (executed scenarios, pass/fail status, deferred items, go/no-go recommendation)

---

## 8. TEST MANAGEMENT PROCESS

### 8.1 Test Planning & Estimation

**Roles:**
- **QA Lead:** Creates test plan, coordinates test execution, tracks metrics
- **Dev Team:** Provides acceptance criteria, attends test planning meetings
- **PM/BA:** Clarifies requirements, reviews UAT scope

**Process:**
1. **Feature Kickoff:** QA attends design sync, reviews spec (feature plan doc, prototype)
2. **Test Plan Draft:** QA writes test cases, identifies mocks/fixtures needed, estimates effort (hours per feature)
3. **Dev Estimation Sync:** Dev provides API contracts, mock route specs; QA refines test list
4. **Merge into Sprint:** Test tasks added to Jira/Azure DevOps (Epic → User Stories → Test Tasks)

### 8.2 Test Design & Documentation

**Test Case Format (Markdown in Feature Folder):**
```markdown
# Test Case TC-[Feature-#]

**Title:** [Descriptive title]  
**Feature:** [Feature name]  
**Type:** [Unit | Integration | E2E]  
**Priority:** [P1 Critical | P2 High | P3 Medium | P4 Low]  
**Preconditions:**
- User logged in as Editor
- Workspace "Q3" created with ≥1 project
- [other conditions]

**Steps:**
1. Navigate to `/workspaces/[id]`
2. Click "New Project"
3. Fill Name = "Mobile Redesign"
4. Select Type = "Custom App"
5. Click "Review"
6. Click "Create"

**Expected Result:**
- Project created with ID `proj_xxx`
- Redirected to `/projects/proj_xxx/discovery`
- Phase rail shows Discovery phase active
- KB section list is empty (ready for upload)

**Actual Result:** [Filled during execution]  
**Pass/Fail:** [Filled during execution]  
**Defect ID (if failed):** BUG-123
```

**Storage:** Per-feature `.test-cases/` folder in the remote app directory, or centralized Testrail/Jira

### 8.3 Test Execution & Tracking

**Manual Execution Flow:**
1. QA pulls latest code, runs `npm install` + `npm run build`
2. Starts host + remotes: `npm run dev` (or targeted `npm run serve:*`)
3. Executes test case against target environment
4. Logs result in tracking sheet (pass/fail, screenshots on failure)
5. If failed, creates Jira bug with repro steps + environment

**Automated Execution Flow (CI/CD):**
1. Developer pushes to feature branch
2. GitHub Actions (or Azure Pipelines) triggered:
   - `npm run typecheck` (fast fail)
   - `npm run test` (Vitest, affected projects)
   - Publish coverage report
3. If all pass, branch is gated as "ready for review"
4. On merge to main: full test suite + smoke E2E tests run
5. If any fail, rollback deploy (SWA slot revert)

**Tracking Tool:** Jira / Azure DevOps (Boards, Test Plans, Reporting)

**Metrics Tracked:**
- Total test cases designed
- Executed (auto + manual)
- Passed / Failed / Blocked
- Defect escape rate (bugs found post-release / total bugs)
- Coverage % (code + requirements)

### 8.4 Defect Triage & Resolution

**Severity Classification:**
| Severity | Impact | Example | MTTR |
|----------|--------|---------|------|
| **P0 Critical** | System unavailable, data loss, security | Remote fails to load, phase gate bypassed | 4 hours |
| **P1 High** | Core feature broken, workaround unclear | Phase transition fails, cannot create project | 24 hours |
| **P2 Medium** | Feature degraded, workaround exists | Search slow (10s+), KB upload shows wrong file | 3 days |
| **P3 Low** | Minor UI issue, cosmetic, nice-to-have | Button color off-spec, typo in label | 1 sprint |
| **P4 Deferred** | Future improvement, no user impact | Missing accessibility test, tech debt | Next planning cycle |

**Triage Process:**
1. QA creates Jira bug: title, severity, repro steps, environment, screenshot/video
2. Dev team triages in standup: confirm repro, assign to dev, estimate fix
3. Dev opens PR with fix + test case (new or existing test that was failing)
4. QA re-tests on PR/branch before merge
5. On merge: auto-closed bug, linked to commit

---

## 9. TEST ENVIRONMENT STRATEGY

### 9.1 Local Development Environment

**Setup:**
```bash
# Once
git clone https://github.com/[org]/wispr.git
cd wispr
node --version   # ensure 20+
npm install

# To run (choice of three modes)

# Mode 1: Standalone remote (fastest inner loop)
npm run serve:custom-app   # http://localhost:4201
npm run serve:strategy     # http://localhost:4203

# Mode 2: Host + remotes (federation composition)
npm run dev                # http://localhost:4200 (host)
                           # http://localhost:4201 (custom-app)
                           # http://localhost:4203 (strategy)

# Mode 3: Full production preview
npm run build
npm run preview:host       # http://localhost:4173 (or assigned port)
npm run preview:custom-app # http://localhost:4174
```

**Configuration:**
- `.env.local` in each app:
  ```
  VITE_DEV_AUTH=true              # seed user, skip real OIDC
  VITE_USE_MOCKS=true             # use in-browser mock API
  VITE_API_BASE=http://localhost:5000  # OR real backend URL
  ```

**Test Data:**
- Mock seed projects in `libs/projects/src/mocks/seed.ts`
- localStorage cleared on demand: DevTools → Application → Local Storage → Clear

### 9.2 Shared Test Environment (CI Pipeline)

**Environment:** Azure DevOps / GitHub Actions runners (Linux)

**Setup:**
```yaml
# In Azure Pipelines
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  NODE_VERSION: '20.x'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: $(NODE_VERSION)
  
  - run: npm ci
  
  - run: npm run typecheck
  - run: npm run lint
  - run: npm run test -- --coverage
    displayName: 'Unit + Integration Tests'
  
  - task: PublishCodeCoverageResults@1
    inputs:
      codeCoverageTool: Cobertura
      summaryFileLocation: 'coverage/cobertura-coverage.xml'
```

### 9.3 Staging Environment

**Infrastructure:** Azure Static Web Apps (host + remotes), App Configuration, Key Vault

**Deployment Trigger:** Manual (or auto-deploy from `develop` branch)

**Configuration:**
- Real Entra ID auth (staging tenant)
- API points to `https://api-staging.wispr.com`
- Feature flags in App Configuration (test flag toggles)
- Mock mode disabled (real API only)

**Data Reset:** DB migration script (resets test workspace + projects weekly)

### 9.4 Production Environment

**Infrastructure:** Azure Static Web Apps, Front Door, Key Vault, App Insights

**Deployment Trigger:** Manual (or auto-deploy from `main` after QA sign-off)

**Configuration:**
- Real Entra ID auth (production tenant)
- API points to `https://api.wispr.com`
- Feature flags in App Configuration (production values)
- Mock mode forbidden (VITE_USE_MOCKS only in dev)

**Rollback Plan:**
- SWA slot revert (built artifact swap, <2 min)
- DB backup before migration (manual restore if needed)

---

## 10. TEST DATA STRATEGY

### 10.1 Mock Data Mode

**Activation:** Set `VITE_USE_MOCKS=true` in `.env.local`

**Implementation:** 
- `@wispr/services` exposes `registerMockRoutes(registry)` 
- Each remote registers its phase endpoints in `src/services/mocks/`
- In-browser mock server (axios adapter intercepts requests before network)
- Data persists in `localStorage` (wispr.mock.* keys)

**Seed Data:** 
- 1 default workspace (id: `ws_demo`)
- 2 demo projects (custom-app, data-pipeline types) with mid-flight phase data
- Pre-generated KB sections, feature lists, code stubs

**Lifecycle:**
- First load: seed data inserted into localStorage
- Subsequent loads: use localStorage (no re-seed)
- Clear via DevTools Application → Local Storage → Delete wispr.mock.* keys

### 10.2 Test Data Reset

**Local Reset (between test sessions):**
```bash
# Option 1: Clear localStorage (in DevTools)
# Option 2: Programmatic (in test setup)
localStorage.clear();
sessionStorage.clear();

# Option 3: Restart browser (clears memory-held tokens)
```

**CI Reset:**
- No state persisted (stateless Linux runners)
- Each test run starts with clean environment
- Seed data generated fresh on first mock route hit

### 10.3 Database Test Data (Backend)

**Scope:** Not covered by frontend QA (backend team owns DB layer)

**Frontend assumption:** Backend provides consistent API responses matching mock schema

**Frontend verification:** RTK Query tests mock the HTTP calls; schema validated by Zod contracts

---

## 11. AUTOMATION & CI/CD STRATEGY

### 11.1 Unit & Component Test Automation

**Tool:** Vitest + React Testing Library

**Command:** `npm run test` (or `npm test` per Nx project)

**CI Integration:**
```bash
# .github/workflows/test.yml
- name: Run Tests
  run: npm run test -- --coverage --reporter=json
  
- name: Upload Coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/coverage-final.json
```

**Coverage Goals:**
- Overall: ≥70%
- Utility modules: ≥85%
- Feature modules: ≥80%
- UI components: ≥75%

**Failure Gates:**
- Coverage drops >5%: Build fails
- Any test fails: Build fails

### 11.2 E2E Test Automation (Playwright)

**Tool:** Playwright (installed, configurations in place, first tests to be written)

**Setup:**
```bash
npm install -D @playwright/test
# apps/host/playwright.config.ts
export default defineConfig({
  webServer: { command: 'npm run dev', port: 4200, reuseExistingServer: true },
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4200' },
});
```

**Example Test Suite (apps/host/e2e/smoke.spec.ts):**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('host loads, auth seeds user', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toContain('/workspaces');
    expect(page.locator('[data-testid="user-name"]')).toContainText('Demo User');
  });

  test('create project flow', async ({ page }) => {
    await page.goto('/workspaces/ws_demo');
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="name"]', 'E2E Test Project');
    await page.click('text=Custom App');
    await page.click('button:has-text("Create")');
    expect(page.url()).toMatch(/\/projects\/.+\/discovery/);
  });
});
```

**CI Run:**
```bash
- name: E2E Tests (Smoke)
  run: npm run e2e:smoke
  if: success()
  timeout-minutes: 30
```

**Failure Gates:**
- Any E2E test fails: Build fails
- Timeout >30 min: Kill test run, fail build

### 11.3 Type Safety & Linting

**Tool:** TypeScript (strict), ESLint

**CI Commands:**
```bash
npm run typecheck    # tsc --noEmit (all projects)
npm run lint         # eslint . (where configured)
```

**Strict Mode Rules:**
- No `any` type
- No implicit `any`
- StrictNullChecks enabled
- StrictFunctionTypes enabled

**Pre-Commit Hook:**
```bash
# .githooks/pre-commit
nx affected -t typecheck
```

### 11.4 CD Pipeline (Deploy)

**Trigger:** PR merge to main or develop

**Stages:**
1. **Build:** `npm run build` (all apps, Nx cache)
2. **Test:** `npm run test` + `npm run e2e:smoke`
3. **Publish (if @wispr/{contracts|ui|tokens} changed):** Bump version, publish to Azure Artifacts
4. **Deploy:** Per-remote SWA deployment (CI/CD per SWA)
5. **Smoke (post-deploy):** Run E2E against deployed environment

**Rollback Trigger:**
- Any stage fails
- E2E smoke test fails post-deploy

---

## 12. TEST PHASE ENTRY/EXIT CRITERIA

### 12.1 Phase Entry Criteria

#### Feature Development Phase Entry
**Preconditions (from previous phase):**
- ✅ Epic created in Jira (linked to feature plan doc)
- ✅ Acceptance criteria defined (from feature spec)
- ✅ API contract finalized (RTK Query endpoint + mock route spec reviewed)
- ✅ Design finalized (prototype.html updated, reviewed by design)
- ✅ QA test plan draft complete (test cases, mocks identified)

#### Feature Testing Phase Entry
**Preconditions (from dev phase):**
- ✅ Code merged to feature branch (dev branch or PR)
- ✅ All unit tests pass (`npm run test`)
- ✅ TypeScript strict compile passes (`npm run typecheck`)
- ✅ Linting passes (`npm run lint`)
- ✅ Feature branch builds successfully (`npm run build`)
- ✅ QA notified; test environment ready

### 12.2 Phase Exit Criteria

#### Feature Development Exit → Testing
**Requirements:**
- ✅ Feature code merge request open (passing CI checks above)
- ✅ Code review completed (dev lead approved)
- ✅ Test cases linked in PR description (test case IDs)

#### Feature Testing Exit → Staging
**Requirements (P0–P1 bugs must be fixed):**
- ✅ 100% of test cases executed (pass or fail logged)
- ✅ All P0 Critical bugs fixed + re-tested
- ✅ All P1 High bugs fixed + re-tested (or documented as deferred with justification)
- ✅ ≤5 P2 Medium bugs (documented, prioritized)
- ✅ Code review approved + merged to develop
- ✅ Regression tests all pass on develop branch
- ✅ Test summary report generated (scenarios, results, known issues)

#### Staging Exit → Production
**Requirements (UAT + QA sign-off):**
- ✅ Staging deployment successful
- ✅ UAT executed (≥2 stakeholders, scenario sign-off)
- ✅ UAT defects resolved or documented
- ✅ E2E smoke tests pass on staging
- ✅ Accessibility audit pass (Axe DevTools, 0 critical violations)
- ✅ Performance baseline met (Lighthouse ≥80, LCP <2.5s)
- ✅ Security review complete (OWASP ZAP scan, token handling verified)
- ✅ Release notes generated (features, known limitations, rollback plan)
- ✅ QA Lead + PM sign-off on go/no-go

---

## 13. TESTING SCHEDULE & MILESTONES

### 13.1 Release Timeline (Example: Phase 2 Release)

| Milestone | Date | Activity | Owner |
|-----------|------|----------|-------|
| **Design Complete** | Jun 10 | Feature plan doc + prototype approved | PM/Design |
| **Dev Kick-off** | Jun 11 | Team meeting, API contract spec | Dev |
| **API Contract Finalized** | Jun 13 | RTK Query endpoint + mock routes reviewed | Dev + QA |
| **QA Test Plan Complete** | Jun 13 | Test cases, mocks, estimated hours | QA |
| **Dev Complete** | Jun 18 | Feature code merge to develop, all tests pass | Dev |
| **Test Start** | Jun 18 | Manual testing, bug hunt, exploratory | QA |
| **Test Sign-off** | Jun 21 | All high-priority bugs fixed, test report | QA |
| **Deploy to Staging** | Jun 21 | Release candidate built, UAT environment ready | DevOps |
| **UAT Complete** | Jun 24 | Stakeholder testing, sign-off | PM/BA/QA |
| **Deploy to Production** | Jun 25 | Final deployment, post-deploy smoke tests | DevOps |
| **Post-Release Monitoring** | Jun 25–Jul 2 | Hotfix window, telemetry review | On-call |

**Effort Estimate (per feature):**
- QA Planning: 4 hours
- QA Manual Testing: 24 hours
- QA Exploratory: 8 hours (if time allows)
- QA UAT Prep + Execution: 16 hours
- **Total QA:** ~52 hours per major release

---

## 14. ASSUMPTIONS & CONSTRAINTS

### 14.1 Assumptions

1. **Backend API contract stable:** Backend team delivers RTK Query spec on time; no mid-sprint API changes
2. **Entra ID SSO works:** Assume Azure Entra ID OIDC provider functions correctly; QA tests only client-side redirect + token handling
3. **Third-party libraries stable:** Mantine, React Router, Redux, Vite are production-ready and tested by their authors
4. **Test environment infrastructure:** Azure SWA, Front Door, App Config provisioned and stable
5. **Dev team availability:** Dev team completes feature code by test phase entry; no blockers from other projects
6. **Stakeholder availability:** PM/BA available for UAT and sign-off during scheduled windows
7. **No major dependency updates mid-sprint:** Upgrade cycles planned outside feature sprints

### 14.2 Constraints

1. **Timeline:** Phase 2 release must ship by end of month (fixed date)
2. **Team Size:** 2–3 QA resources (one dedicated QA lead, one manual tester, shared automation engineer)
3. **Browser Support:** Desktop only (Chrome, Edge, Firefox, Safari latest); mobile future scope
4. **Test Data:** Mock mode only in dev/test; no production DB clones (data privacy)
5. **Performance Budget:** Bundle size ≤500KB gzip per app (remote constraint)
6. **Accessibility:** WCAG 2.1 Level AA (not AAA) — time constraints
7. **External Integrations:** Assume Azure services work as documented; no integration testing of Azure-managed services (e.g., Entra ID auth server)

---

## 15. TESTING DELIVERABLES

### 15.1 Deliverable List

| # | Deliverable | Format | Owner | Timing |
|---|-------------|--------|-------|--------|
| 1 | **Test Plan** | Markdown (this document) | QA Lead | Kick-off |
| 2 | **Test Case Repository** | Markdown files (per feature, `.test-cases/` folder) | QA | During dev |
| 3 | **Test Execution Report** | Spreadsheet (scenarios, pass/fail, defects) | QA Tester | After testing |
| 4 | **Defect Report** | Jira tickets (title, severity, repro, env, screenshot) | QA Tester | Ongoing |
| 5 | **Code Coverage Report** | HTML (Vitest coverage, codecov badge) | CI automation | Per commit |
| 6 | **E2E Test Suite** | Playwright `.spec.ts` files | QA Automation | Iterative |
| 7 | **Test Summary Report** | PDF (executive summary, metrics, go/no-go) | QA Lead | Pre-release |
| 8 | **UAT Report** | Spreadsheet + sign-off (if applicable) | QA + Stakeholders | Pre-production |
| 9 | **Release Notes** | Markdown (features, known issues, rollback) | PM + QA | Release day |
| 10 | **Post-Release Retrospective** | Document (lessons learned, process improvements) | QA Lead | 1 week post-release |

### 15.2 Test Metrics & Reports

**Metrics Tracked (per sprint/release):**
- Test case count (designed, executed, passed, failed, blocked)
- Defect count (by severity, open, closed, escape rate)
- Code coverage (% lines, branches, functions)
- Bug-fix turnaround (avg time from report to fix)
- Test execution time (manual, automated, E2E)
- Stakeholder sign-off (UAT) date

**Report Frequency:**
- Daily standup: Test execution status (pass %, blockers)
- Weekly: Defect trend, coverage % update
- Pre-release: Final test summary (sign-off for go/no-go)

---

## 16. DEFECT MANAGEMENT

### 16.1 Defect Lifecycle

```
DETECTED (QA creates Jira)
    ↓
REPORTED (QA provides repro steps, env, screenshot)
    ↓
TRIAGED (Dev confirms, assigns severity/assignee)
    ↓
IN PROGRESS (Dev fixes, QA gets PR notification)
    ↓
IN REVIEW (Code review, QA ready for re-test)
    ↓
FIXED (QA re-tests on branch/PR)
    ├─ VERIFIED (QA closes bug)
    └─ RE-OPENED (issue persists, back to IN PROGRESS)
    ↓
DEPLOYED (bug fix merged to main, deployed to production)
    ↓
CLOSED
```

### 16.2 Defect Template (Jira)

**Summary:** [One-line description]  
**Description:**
```
**Environment:** Local dev | Staging | Production
**Severity:** P0 Critical | P1 High | P2 Medium | P3 Low
**Reproducibility:** Always | Sometimes | Rare

**Preconditions:**
- User role: Editor
- Project type: Custom App
- Phase: Discovery
- [other setup]

**Steps to Reproduce:**
1. Navigate to /projects/[id]/discovery
2. Click "Upload File"
3. Select file > 50MB
4. Click "Upload"

**Expected:** Error message "File too large" shown; upload cancelled

**Actual:** File uploaded successfully despite 50MB limit; app crashes on KB generation

**Error Logs:** [stack trace or console error]

**Attachments:** [screenshot/video of issue]
```

### 16.3 Severity & Priority

| Severity | Impact | MTTR | Example |
|----------|--------|------|---------|
| **P0 Critical** | System broken, data loss, security | 4 hours | Remote fails to load; phase data deleted |
| **P1 High** | Feature unusable, major workflow broken | 24 hours | Cannot create project; login loop |
| **P2 Medium** | Feature degraded, partial workaround | 3 days | Search slow; avatar upload fails |
| **P3 Low** | Minor bug, cosmetic, edge case | 1 sprint | Typo in label; color off-spec |

**Blocking Criteria (cannot release):**
- Any P0 bug unfixed
- Any P1 bug unfixed (unless explicitly deferred with stakeholder sign-off)

---

## 17. QA RESPONSIBILITIES & RACI

### 17.1 QA Team Structure

| Role | Responsibilities | Full-Time | Notes |
|------|------------------|-----------|-------|
| **QA Lead** | Test planning, coordination, metrics, stakeholder reporting | 1.0 | Also owns CI/CD test pipeline |
| **Manual QA Tester** | Test case execution, exploratory, bug documentation | 1.0 | May rotate across features |
| **QA Automation Engineer** | E2E test framework, Playwright suite, CI automation | 0.5–1.0 | Shared across projects |

### 17.2 RACI Chart

| Activity | QA Lead | QA Tester | QA Automation | Dev | PM/BA |
|----------|---------|-----------|---|---|---|
| Test plan creation | **A** | **R** | **C** | **C** | **I** |
| Test case design | **R** | **A** | **I** | **C** | **C** |
| Manual test execution | **C** | **A** | **I** | **I** | **I** |
| Bug verification | **C** | **A** | **I** | **R** | **I** |
| Regression testing | **R** | **C** | **A** | **I** | **I** |
| E2E test development | **C** | **I** | **A** | **I** | **I** |
| UAT coordination | **A** | **R** | **I** | **C** | **R** |
| Release sign-off | **A** | **R** | **I** | **R** | **R** |

**Legend:** A = Accountable (decision-maker), R = Responsible (does work), C = Consulted (input), I = Informed (updates)

### 17.3 QA Competencies Required

- **Manual Testing:** User journey design, test case writing, exploratory testing, bug documentation
- **Automation:** TypeScript/Vitest/Playwright, CI/CD pipeline config, test framework maintenance
- **Domain:** SDLC phases (Discovery, Planning, Features, Implementation, Test), federation architecture
- **Tools:** Jira/Azure DevOps, browser DevTools, Lighthouse, Axe accessibility
- **Soft Skills:** Communication (bug reports, stakeholder updates), collaboration (dev pairing)

---

## 18. RISKS & CONTINGENCIES

### 18.1 Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|-----------|--------|-----------|-------|
| **R1** | Federation contract mismatch (remote/host version skew) | Medium | High | Versioned @wispr/contracts; contract check on load; E2E federation tests | QA Automation |
| **R2** | API spec delivered late (RTK Query codegen blocked) | Medium | Medium | Mock API ready; frontend proceeds with mocks; real API integration async | Dev Lead |
| **R3** | Phase gate logic incorrect (approval gates bypassed) | Low | Critical | Integration tests for phase gate logic; exploratory testing on gate transitions; manual spot-check | QA Lead |
| **R4** | Authentication flow broken (silent refresh fails, permanent 401) | Low | High | Auth integration tests; manual flow test (logout/re-login); monitor App Insights post-release | QA Automation |
| **R5** | Performance regression (module load >3s) | Medium | Medium | Bundle size check in CI; Lighthouse audit; manual perf profiling | QA Automation + Dev |
| **R6** | Data loss in mock mode (localStorage cleared unexpectedly) | Low | Medium | Warn users about localStorage persistence; test data reset procedure documented | QA + Dev |
| **R7** | Accessibility violations (WCAG 2.1 AA fail on 15+ elements) | Medium | Low | Axe DevTools audit per component; manual WCAG checklist; screen reader testing | QA Tester |
| **R8** | UAT stakeholders unavailable (no sign-off) | Low | High | Schedule UAT window 3+ weeks in advance; confirm attendance 1 week prior | PM |
| **R9** | Regression in existing phase (e.g., Planning broken after Features ship) | Medium | High | Regression test suite covers all 5 phases; run full suite on main branch; smoke E2E includes all phases | QA Automation |
| **R10** | External API (backend) returns unexpected schema | Low | Medium | Strict Zod validation on all API responses; fail-safe error boundaries; manual integration test with real backend | QA + Dev |

### 18.2 Contingency Plans

**If Defect Found at Release Time (24 hours before launch):**
1. **P0/P1 bugs:** Delay release 1–2 days for fix + retest
2. **P2 bugs:** Log as deferred (post-release hotfix), proceed with release
3. **Blocking items:** No-go decision (escalate to PM)

**If Testing Falls Behind Schedule (mid-sprint):**
1. Prioritize P0/P1 + high-risk areas (federation, phase gates, RBAC)
2. Defer lower-priority exploratory testing
3. Reduce UAT scope if needed (focus on Phase 2 features only)
4. Increase tester hours or bring in backup

**If API Spec Delayed:**
1. Proceed with mock routes + mock data
2. Frontend E2E continues with mocks
3. Integrate real backend when spec ready (async, minimal re-test if contract stable)

**If Key QA Resource Unavailable:**
1. QA Lead covers manual testing (highest-priority test cases only)
2. Automation engineer escalates E2E automation priority to other teams
3. Bring in contractor or redistribute to project's test partner

---

## 19. QUALITY METRICS & KPIs

### 19.1 Metrics Definition

| Metric | Formula | Target | Measurement |
|--------|---------|--------|-------------|
| **Code Coverage** | (Lines Covered / Total Lines) × 100 | ≥70% | Vitest + codecov |
| **Test Execution Rate** | (Tests Executed / Tests Designed) × 100 | 100% | Test tracking spreadsheet |
| **Pass Rate** | (Tests Passed / Tests Executed) × 100 | ≥95% | Test tracking spreadsheet |
| **Defect Escape Rate** | (Bugs Found Post-Release / Total Bugs) × 100 | <5% | Jira analysis (release tag) |
| **Bug Fix Turnaround** | Avg days from Report to Deployed | <3 days | Jira workflow timestamps |
| **Regression Test Pass Rate** | (Regression Tests Passed / Regression Tests Executed) × 100 | 100% | CI build logs |
| **E2E Test Reliability** | (E2E Runs Passed / Total E2E Runs) × 100 | ≥95% | CI build logs (flakiness) |
| **Accessibility Violations** | Count of WCAG 2.1 AA failures | 0 | Axe DevTools report |
| **Performance (LCP)** | Largest Contentful Paint time | <2.5s | Lighthouse audit |
| **Bundle Size (gzip)** | Total gzip size of host + remotes | <500KB per app | `size-limit` CI check |

### 19.2 KPI Reporting

**Frequency:** Weekly (standup) + Sprint close-out (detailed report)

**Stakeholders:** Dev Lead, PM, QA Lead, Engineering Manager

**Report Template:**
```markdown
# QA Metrics Report — Sprint [#]

**Reporting Period:** Jun 18–24, 2026

## Coverage
- Code Coverage: 72% (target: 70%) ✅
- Test Case Execution: 42/42 (100%) ✅

## Defects
- P0 Critical: 0 (target: 0) ✅
- P1 High: 2 (open), 3 (fixed) ⚠️
- P2 Medium: 5 open (acceptable)
- Escape Rate (last release): 2% (target: <5%) ✅

## Performance
- Bundle size (host): 420KB gzip (target: <500KB) ✅
- LCP: 2.1s (target: <2.5s) ✅

## Risks
- One P1 (phase gate logic) in review; blocking release if not fixed by Jun 24
- Two stakeholders confirm UAT window (Jun 24–26) ✅

## Recommendations
- Increase E2E test coverage for phase transitions (currently 3 tests, add 2 more)
- Accessibility audit found 3 low-severity WCAG issues (logged as P3)
```

---

## 20. TEST TRACEABILITY MATRIX (TTM)

### 20.1 Traceability Model

```
Feature Plan Doc (spec.md)
  ├─ Epic (Jira)
  │  └─ User Stories (Jira)
  │     └─ Acceptance Criteria (story description)
  │        └─ Test Cases (test-cases/ folder, or Testrail)
  │           └─ Automated Tests (Vitest, Playwright)
  │              └─ Test Execution Results (pass/fail)
  │                 └─ Defects (Jira bug tickets)
```

### 20.2 Example TTM (Workspace Feature)

| Feature | Acceptance Criteria | Test Case | Test Type | Automated | Result | Defect |
|---------|-------------------|-----------|-----------|-----------|--------|--------|
| **Workspace Creation** | User can create workspace with name + description | TC-WS-001: Create with valid inputs | E2E | Playwright | ✅ Pass | — |
| | Name required (non-empty) | TC-WS-002: Validation on empty name | Unit | Vitest | ✅ Pass | — |
| | Description optional | TC-WS-003: Create without description | Integration | Vitest | ✅ Pass | — |
| **Workspace Listing** | User sees all workspaces they are member of | TC-WS-004: List shows 3+ workspaces | E2E | Playwright | ✅ Pass | — |
| | Workspace list searchable by name | TC-WS-005: Search by partial name | UI | Manual | ✅ Pass | — |
| | Workspace card shows member count | TC-WS-006: Card displays "5 members" | Component | Vitest | ⚠️ Fail | BUG-456 |
| **Member Invite** | Admin can invite user by email | TC-WS-007: Invite flow | E2E | Playwright | 🔄 Blocked | BUG-457 (invite API not ready) |
| | Invite email sent | TC-WS-008: Email sent confirmation | Integration | Manual (post-API) | — | — |

---

## 21. BROWSER & DEVICE COMPATIBILITY

### 21.1 Browser Support Matrix

| Browser | Version | Windows | macOS | Linux | Tablet | Mobile | Status |
|---------|---------|---------|-------|-------|--------|--------|--------|
| **Chrome** | 120+ | ✅ | ✅ | ✅ | ✅ | ⏳ | Full |
| **Edge** | 120+ | ✅ | — | — | ✅ | ⏳ | Full |
| **Firefox** | 121+ | ✅ | ✅ | ✅ | ⚠️ | ⏳ | Full |
| **Safari** | 17+ | — | ✅ | — | ✅ | ⏳ | Full |

**Legend:** ✅ Full support, ⚠️ Known issues, ⏳ Future, ❌ Not supported

**Testing Approach:**
- **Desktop:** Physical machines (Chrome/Edge on Windows, Chrome/Safari on Mac, Firefox on Linux)
- **Tablet:** iPad (Safari) + Android tablet (Chrome) — manual testing, responsive design
- **Mobile:** Deferred (future scope; placeholder tests in Playwright)

### 21.2 Device Compatibility Testing

**Viewport Sizes (Mantine breakpoints):**
| Device Type | Width | Height | Testing |
|---|---|---|---|
| **Desktop** | 1920×1080 | 1080 | Primary (automated + manual) |
| **Laptop** | 1366×768 | 768 | Secondary (automated smoke) |
| **iPad Pro** | 1024×1366 | Landscape | Tablet (manual, responsive) |
| **iPad** | 768×1024 | Landscape | Tablet (manual, responsive) |
| **Android Tablet** | 1024×600 | Landscape | Tablet (manual, responsive) |

**Responsive Testing Checklist:**
- [ ] Workspace/project list layouts on tablet (card rows vs. single column)
- [ ] Phase rail fits in sidebar (tab bar on mobile, full sidebar on desktop)
- [ ] Top bar responsive (hamburger menu on <1024px width)
- [ ] Forms stack vertically on mobile
- [ ] Modals centered and dismissable on all sizes
- [ ] Keyboard & touch interactions both work

---

## 22. API & DATABASE TESTING

### 22.1 API Testing (RTK Query Layer)

**Scope:** Frontend tests the **HTTP contract** (request/response schema), not backend logic

**Strategy:**
- **Mock routes:** Define mock API routes in `@wispr/services/mocks/`
- **Vitest mocking:** Vitest mocks axios calls; RTK Query tests call the mock routes
- **Schema validation:** Zod contract validates response shape
- **Integration tests:** Component + RTK Query flow end-to-end

**Example RTK Query Test:**
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { projectsApi } from '@wispr/projects';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/projects/:id', () => 
    HttpResponse.json({ id: '1', name: 'Test', type: 'custom-app', workspaceId: 'ws_1' })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('fetches project and caches in RTK Query', async () => {
  const store = configureStore({
    reducer: { projectsApi: projectsApi.reducer }
  });

  // First call
  const result1 = await store.dispatch(projectsApi.endpoints.getProject.initiate('1'));
  expect(result1.data).toEqual({ id: '1', name: 'Test', type: 'custom-app', workspaceId: 'ws_1' });

  // Second call (cached, no network request)
  const result2 = await store.dispatch(projectsApi.endpoints.getProject.initiate('1'));
  expect(result2.data).toEqual(result1.data);
  expect(result2.requestId).toBe(result1.requestId); // same request
});
```

### 22.2 Mock API Routes

**Location:** Per-app mock routes in `src/services/mocks/` + central registry in `@wispr/services`

**Example mock route (custom-app):**
```typescript
// apps/custom-app/src/services/mocks/discovery.ts
import { http, HttpResponse } from 'msw';

export const discoveryRoutes = [
  http.post('/kb/generate', async ({ request }) => {
    const { projectId, files } = await request.json();
    return HttpResponse.json({
      kbId: `kb_${Date.now()}`,
      sections: [],
      status: 'pending',
    });
  }),

  http.get('/kb/:kbId', () => {
    return HttpResponse.json({
      id: 'kb_123',
      projectId: 'proj_1',
      sections: [
        {
          id: 'sec_1',
          title: 'Overview',
          content: 'Generated content',
        },
      ],
      status: 'completed',
    });
  }),
];
```

### 22.3 Database Testing (N/A for Frontend)

**Scope:** Backend team owns database layer

**Frontend assumption:** Backend API returns correct data; RTK Query caches + serves it

**Verification:** Integration tests mock API responses; assume backend delivers correct schema

---

## 23. SECURITY TESTING

### 23.1 Security Test Areas

| Area | Threat | Mitigation | Test |
|------|--------|-----------|------|
| **XSS** | Malicious JS injected via KB/artifact content | Mantine sanitizes HTML; react-markdown escapes | Render KB with `<script>alert('xss')</script>`; verify not executed |
| **CSRF** | Cross-site form submission | SameSite=Strict cookies + CSRF token (if backend requires) | Verify cookie attributes in DevTools |
| **Token Leakage** | Access token in localStorage or URL | Access token in memory only; refresh in httpOnly cookie | Check localStorage, URL, memory state |
| **RBAC Bypass** | Unauthorized role access to features | Permission checks in hooks + components; backend validates | Try to access admin dashboard as Viewer role; should be denied |
| **Data Exposure** | PII/sensitive data in logs/network | Mask tokens in logs; HTTPS only; no PII in localStorage | Check DevTools Network tab (no tokens in URLs); check console logs |
| **Dependency Vulnerabilities** | Outdated npm packages with known CVEs | npm audit in CI; regular updates; lock file committed | Run `npm audit`; verify 0 critical |

### 23.2 Security Test Checklist

- [ ] **HTTPS Only:** All API calls over HTTPS (even in dev, mock server is http:/localhost)
- [ ] **Cookie Security:** `Secure`, `HttpOnly`, `SameSite=Strict` flags set on refresh token
- [ ] **Token Storage:** Access token never in localStorage/sessionStorage; only in memory
- [ ] **CORS Headers:** API returns correct Access-Control-Allow-Origin (no `*`)
- [ ] **Input Validation:** Forms validate on client; backend validates on server
- [ ] **Output Encoding:** HTML/URLs/JSON escaped properly (Mantine + react-markdown do this)
- [ ] **Sensitive Data Masking:** Tokens redacted in logs; PII masked in debug output
- [ ] **Error Messages:** Generic error messages to users; detailed errors only in logs
- [ ] **Dependency Audit:** `npm audit` runs in CI; 0 critical/high vulnerabilities

### 23.3 Automated Security Scanning (Future)

- **OWASP ZAP:** Run against staging environment pre-release
- **npm audit:** Run in CI on every build
- **Snyk:** Continuous dependency scanning (optional)

---

## 24. ACCESSIBILITY TESTING

### 24.1 WCAG 2.1 Level AA Standards

| Principle | Examples | Test Method |
|-----------|----------|-------------|
| **Perceivable** | Color contrast ≥4.5:1 (normal), ≥3:1 (large); text alternatives for images | Axe DevTools, visual inspection |
| **Operable** | Keyboard navigation (Tab, Enter, Esc); focus visible; no keyboard traps | Manual keyboard testing |
| **Understandable** | Clear labels, instructions, error messages; readable content; no layout that changes unexpectedly | Manual review, screen reader testing |
| **Robust** | Valid HTML; compatible with assistive technologies; uses semantic elements | HTML validator, screen reader testing (NVDA, VoiceOver) |

### 24.2 Accessibility Test Checklist

- [ ] **Color Contrast:** All text ≥4.5:1 ratio (checked with Axe DevTools)
- [ ] **Keyboard Navigation:** Tab through all interactive elements (forms, buttons, links); Escape closes modals
- [ ] **Focus Indicators:** Visible focus outline on all focusable elements (not removed by CSS)
- [ ] **Form Labels:** All inputs have `<label>` associated (or aria-label)
- [ ] **ARIA Roles:** Buttons use `role="button"`, nav uses `<nav>`, etc.
- [ ] **Alt Text:** Images have meaningful alt text (or role="presentation" if decorative)
- [ ] **Semantic HTML:** Headings in order (h1, h2, h3); lists use `<ul>`/`<li>`
- [ ] **Skip Links:** Skip to main content link (or tabindex management)
- [ ] **Screen Reader Testing:** Test with NVDA (Windows), VoiceOver (Mac) — announce page structure, form fields
- [ ] **Motion/Animation:** No auto-playing videos; animations can be disabled (prefers-reduced-motion)

### 24.3 Axe DevTools Automated Audit

**In Browser:**
1. Install Axe DevTools extension (Chrome, Firefox)
2. On a page, click Axe icon → Scan
3. Review violations (critical, serious, minor)
4. Document any WCAG 2.1 AA violations

**In Vitest (automated):**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

expect.extend(toHaveNoViolations);

it('has no a11y violations', async () => {
  const { container } = render(<ProjectCard project={{}} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 24.4 Manual Screen Reader Testing

**Tools:** NVDA (Windows, free), JAWS (Windows, paid), VoiceOver (Mac, built-in)

**Test Scenario (Workspace List):**
1. Launch NVDA, navigate to workspace list page
2. Press Ctrl+Home to go to start
3. Tab through: listen to page structure (heading "Workspaces", list of workspace cards, buttons)
4. Verify: Each workspace card announces name, member count, actions
5. Verify: "New Workspace" button is announce-able and activatable

---

## 25. PERFORMANCE TESTING

### 25.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **First Contentful Paint (FCP)** | <1.5s | Lighthouse (desktop, throttled) |
| **Largest Contentful Paint (LCP)** | <2.5s | Lighthouse |
| **Cumulative Layout Shift (CLS)** | <0.1 | Lighthouse |
| **Time to Interactive (TTI)** | <3s | Lighthouse |
| **Bundle Size (gzip)** | <500KB per app | size-limit / npm build output |
| **Module Load (Federation)** | <1.5s per remote | Custom performance marker |
| **Phase Rail Animation** | 60 FPS | Chrome DevTools Performance tab |
| **Large List (1000 items)** | Scroll smooth (60 FPS), search <500ms | Performance profiling |

### 25.2 Performance Testing Approach

**Lighthouse Audit (CI):**
```bash
npm run build
npm run preview:host &  # background process
lighthouse http://localhost:4173 --output=html --output-path=./lighthouse-report.html
# Check report: LCP, CLS, TTI should meet targets
```

**Bundle Size Check (CI):**
```bash
# size-limit config in package.json
npm run build
npx size-limit   # compares against baseline; fails if >5% increase
```

**Runtime Performance Profiling:**
1. Open app in Chrome
2. DevTools → Performance tab → Record
3. Perform action (phase transition, list scroll)
4. Stop recording, review FPS (should be ≥55 FPS for smooth)
5. Review main thread usage (should not be blocked >50ms)

**Mock Data Performance (Large List):**
```typescript
// Test search performance on 1000 projects
const largeList = Array.from({ length: 1000 }, (_, i) => ({
  id: `proj_${i}`,
  name: `Project ${i}`,
  type: 'custom-app',
}));

it('searches 1000 projects in <500ms', () => {
  const start = performance.now();
  const filtered = largeList.filter(p => p.name.includes('Project 50'));
  const end = performance.now();
  expect(end - start).toBeLessThan(500);
});
```

---

## 26. UAT STRATEGY

### 26.1 UAT Scope

**Who:** PM, BA, Dev Lead (internal team UAT, not external customer)  
**When:** 2 weeks before production release  
**Duration:** 3–5 days (parallel testing, off-sprint)  
**Environment:** Staging (real API, real Entra ID, realistic data)

**Focus Areas (Phase 2 only):**
1. Workspace creation, member invite, role management
2. Project creation in workspace, project list filtering
3. Artifact upload/preview/delete
4. Settings modal (general, members, instructions, danger-zone delete)
5. Cross-workspace navigation and data isolation
6. Responsive layout on tablet (iPad)

### 26.2 UAT Test Scenarios

| # | Scenario | Preconditions | Steps | Expected Result | Status |
|---|----------|---------------|-------|-----------------|--------|
| **UAT-01** | Create workspace | User logged in | 1. Click "New Workspace" 2. Fill name + description 3. Click "Create" | Workspace created, visible in list | ✅ Pass |
| **UAT-02** | Invite member | Workspace created | 1. Open workspace settings 2. Members tab 3. Click "Invite" 4. Enter email 5. Select role "Editor" 6. Click "Send Invite" | Invite sent (mock); invitee appears in pending list | ✅ Pass |
| **UAT-03** | Filter projects by type | 2+ projects with different types | 1. Workspace home, Projects view 2. Click filter dropdown 3. Select "Data Pipeline" 4. Verify list | Only data-pipeline projects shown | ✅ Pass |
| **UAT-04** | Upload artifact | Workspace created | 1. Workspace home 2. Artifacts tab 3. Click "Upload" 4. Select file 5. Click "Save" | File uploaded, preview visible, can delete | ⚠️ Fail (BUG-501) |
| **UAT-05** | Responsive on tablet | iPad or Android tablet | 1. Open app on tablet 2. Workspace list 3. Project list 4. Create project flow 5. Settings modal | All layouts fit, interactions touch-friendly, no horizontal scroll | ✅ Pass |

### 26.3 UAT Exit Criteria

**Go/No-Go Decision Based On:**
- ✅ All P0/P1 scenarios pass (or deferred with explicit sign-off)
- ✅ ≤3 P2 defects (documented as known limitations)
- ✅ Zero P0/P1 bugs outstanding
- ✅ Stakeholder sign-off on test summary (PM, BA, Dev Lead)
- ✅ Performance baselines met (Lighthouse ≥80, LCP <2.5s)

**Sign-Off Document (Markdown):**
```markdown
# UAT Sign-Off — Phase 2 Release

**Date:** Jun 24, 2026  
**Testers:** [PM], [BA], [Dev Lead], [QA Lead]  
**Environment:** Staging  

## Summary
- 5/5 core scenarios passed
- 0 P0/P1 bugs open
- 1 P2 bug deferred (artifact preview—non-critical, fix in Phase 2.1)
- 2 nice-to-haves logged (not blockers)

## Sign-Off
- [ ] PM: All requirements met ✅
- [ ] BA: Business logic correct ✅
- [ ] Dev Lead: No critical regressions ✅
- [ ] QA Lead: Test coverage adequate ✅

**Go-Live Decision:** ✅ **GO** (approved for production deployment)
```

---

## 27. REGRESSION TESTING STRATEGY

### 27.1 Regression Test Suite

**Scope:** All 5 phases (Discovery, Planning, Features, Implementation, Test) + workspace + global features

**Test Frequency:**
- **Per Commit:** Affected project tests only (Nx cache)
- **On Merge to develop:** Full unit + integration test suite
- **On Release Candidate:** Full smoke E2E tests + critical path tests
- **Weekly:** Full regression test execution (if time allows)

### 27.2 Regression Test Coverage by Phase

| Phase | Critical Paths (E2E) | Supporting Tests (Integration/Unit) | Owner |
|-------|---|---|---|
| **Discovery** | Upload KB file → Generate KB → Approve | KB CRUD, file validation, mock API | QA |
| **Planning** | Approve plan → Features unlocked | Plan generation, approval gate, gate enforcement | QA |
| **Features** | Create story → Mark Ready for Dev | Story CRUD, status transitions, ready check | QA |
| **Implementation** | View code → Mark story Implemented | Code gen, repo view, story status | QA |
| **Test** | Create test case → Report summary | Test CRUD, result tracking, summary gen | QA |
| **Workspace** | Create workspace → Invite member → See data scoped | Member CRUD, RBAC, data isolation | QA |
| **Federation** | Open project → Remote mounts → Responsive | Module load, contract check, singleton resolution | QA Automation |

### 27.3 Regression Test Automation (Playwright)

**Test Suite File:** `apps/host/e2e/regression.spec.ts`

**Example (critical path per phase):**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Regression — All Phases', () => {
  test('discovery: upload KB, generate, approve', async ({ page }) => {
    // Precondition: project created
    await page.goto('/projects/proj_demo/discovery');
    
    // Upload KB
    await page.click('[data-testid="upload-btn"]');
    // [file dialog interaction]
    
    // Generate
    await page.click('button:has-text("Generate")');
    await page.waitForLoadState('networkidle');
    
    // Verify KB generated
    expect(page.locator('[data-testid="kb-content"]')).toBeVisible();
    
    // Approve (gate check)
    await page.click('button:has-text("Approve")');
    
    // Verify Planning unlocked
    await expect(page.locator('text=Planning')).not.toHaveAttribute('disabled', '');
  });

  test('federation: load custom-app remote, verify contract', async ({ page }) => {
    // Open project of type custom-app
    await page.goto('/projects/proj_custom_app_1');
    
    // Verify remote loaded (contract version visible in console or UI)
    const contractVersion = await page.evaluate(() => 
      window.__WISPR_CONTRACT_VERSION__
    );
    expect(contractVersion).toBe('1.0.0'); // or whatever current version is
    
    // Verify singleton: open store from both host and remote
    const sessionUser = await page.evaluate(() => 
      (window as any).__WISPR_STORE__?.getState?.().session?.user?.name
    );
    expect(sessionUser).toBeTruthy();
  });
});
```

---

## 28. CHANGE MANAGEMENT & RELEASE READINESS

### 28.1 Release Readiness Checklist

**Dev Checklist (to QA):**
- [ ] Feature code merged to develop branch
- [ ] All unit + integration tests pass (100% on affected projects)
- [ ] TypeScript strict compile clean
- [ ] ESLint clean (where configured)
- [ ] Code review approved by dev lead
- [ ] No console errors/warnings in mock mode
- [ ] API contract finalized + RTK Query codegen complete
- [ ] Mock routes implemented + tested

**QA Checklist (pre-release):**
- [ ] All test cases executed (pass/fail logged)
- [ ] All P0/P1 bugs fixed + verified
- [ ] ≤5 P2 bugs (documented, prioritized for next sprint)
- [ ] Regression test suite passes (100%)
- [ ] E2E smoke tests pass (5+ critical paths)
- [ ] Accessibility audit: 0 WCAG 2.1 AA violations
- [ ] Performance baselines met (Lighthouse ≥80, LCP <2.5s)
- [ ] UAT completed + stakeholder sign-off
- [ ] Test coverage metrics published (% coverage, defect summary)
- [ ] Release notes drafted (features, known limitations, rollback)

**DevOps Checklist (pre-deploy):**
- [ ] Release artifacts built + signed
- [ ] Deployment slots prepared (canary/blue-green)
- [ ] Rollback plan documented + tested
- [ ] Monitoring alerts configured (Application Insights)
- [ ] Post-deploy smoke tests automated + ready
- [ ] Communication template drafted (status page, team notification)

### 28.2 Release Process (Typical Flow)

```
Feature Complete (Dev)
    ↓
QA Testing Phase (QA Tester) — 3–5 days
    ├─ Execute test cases
    ├─ Log defects
    ├─ Fix verification (dev re-tests PR)
    └─ Regression test run
    ↓
UAT Phase (Stakeholders) — 2–3 days
    ├─ Stakeholder testing
    ├─ Sign-off documentation
    └─ Known limitations documented
    ↓
Release Readiness Gate (QA Lead + PM) — 1 day
    ├─ Verify all checklists ✅
    ├─ Review metrics
    └─ Go/no-go decision
    ↓
Deploy to Staging (DevOps) — trigger manual
    └─ Smoke tests pass
    ↓
Deploy to Production (DevOps) — trigger manual
    ├─ Build published to SWA
    ├─ Registry updated (if remotes changed)
    ├─ Smoke E2E tests run on prod
    └─ Monitoring active
    ↓
Post-Release Monitoring (On-Call) — 7 days
    ├─ Daily App Insights review
    ├─ Bug reports triaged
    ├─ Critical fixes deployed (hotfix)
    └─ Close-out retro
```

### 28.3 Hotfix Process

**Trigger:** Critical bug found post-release in production

**Process:**
1. **Triage (1 hour):** Confirm P0 severity, impact assessment
2. **Fix (2–4 hours):** Dev fixes on main branch, adds test case
3. **QA (1–2 hours):** Quick test (manual + related regression tests)
4. **Deploy (30 min):** Push to production, monitor

**Exit:** All tests pass, monitoring shows issue resolved

---

## 29. COMMUNICATION PLAN

### 29.1 Status Communication

| Stakeholder | Frequency | Channel | Content |
|---|---|---|---|
| **Dev Team** | Daily (standup) | Slack/Teams | Test execution status (pass %, blockers) |
| **PM/BA** | 2x week | Email + Slack | Test summary (scenarios executed, P0/P1 status, release readiness) |
| **Engineering Manager** | Weekly | Email (Friday EOD) | Metrics report (coverage, defect trend, MTTR) |
| **Exec Stakeholders** | Pre-release | Email + meeting | Final test summary + go/no-go recommendation |

### 29.2 Defect Communication

**On Bug Creation:**
- QA posts in Slack: `@dev_team — [BUG-123] Phase gate logic allows skip (P1)`
- Jira link + brief description + repro link (or screenshot)

**On Bug Fix:**
- Dev posts: `BUG-123 fixed in PR #456, ready for re-test`
- QA re-tests, closes on verification

### 29.3 Release Communication

**1 Week Before Release:**
- PM/QA emails team: Release date, cutoff time, testing schedule
- Post a release calendar event

**Day Before Release:**
- QA emails: Final go/no-go decision, release notes (features, known limitations)
- PM updates status page

**Release Day:**
- 8:00 AM: Deploy start notification (Slack + status page)
- 8:30 AM: Smoke tests run, results posted
- 9:00 AM: Release complete notification (Slack + status page)

**Post-Release (7 days):**
- Daily: App Insights review (errors, performance)
- Weekly: Retrospective email (issues encountered, improvements)

---

## 30. APPROVALS

### 30.1 Sign-Off Authority

| Document/Milestone | Authority | Date | Signature |
|---|---|---|---|
| **Test Plan v1.0** | QA Lead + PM | [Date] | QA Lead: _____ PM: _____ |
| **Test Case Design Complete** | QA Lead | [Date] | QA Lead: _____ |
| **Phase Testing Complete** | QA Lead | [Date] | QA Lead: _____ |
| **Regression Tests Pass** | QA Automation | [Date] | QA Auto: _____ |
| **UAT Sign-Off** | PM + BA + Dev Lead | [Date] | PM: _____ BA: _____ Dev: _____ |
| **Go/No-Go Decision** | QA Lead + PM | [Date] | QA Lead: _____ PM: _____ |
| **Release Approval** | Engineering Manager | [Date] | Manager: _____ |

### 30.2 Review & Update Schedule

- **Test Plan:** Reviewed + updated quarterly (or after major architecture change)
- **Test Cases:** Updated per feature release (incremental)
- **Metrics & KPIs:** Reported weekly; targets reviewed semi-annually
- **Risk Register:** Updated monthly or after incident

---

## APPENDICES

### Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Federation** | Module Federation 2.0; runtime composition of host + remotes |
| **Phase Gate** | Approval gate before advancing to next SDLC phase |
| **Remote** | Federated app (custom-app, data-pipeline, strategy) |
| **Host/Shell** | Main app that loads remotes at runtime |
| **RTK Query** | Redux Toolkit Query; data-layer + caching for REST APIs |
| **Singleton** | One instance shared across all loaded modules (store, services) |
| **Mock Routes** | In-browser API mock (axios adapter intercept) |
| **Mantine** | UI component library used across app |
| **WCAG** | Web Content Accessibility Guidelines (accessibility standard) |
| **E2E** | End-to-End testing; full user journey via browser automation |

### Appendix B: References

- **WISPR README:** `https://github.com/[org]/wispr/blob/main/README.md`
- **Architecture Doc:** `docs/WISPR-microfrontend-architecture.md`
- **Product Spec:** `CLAUDE.md` (project conventions, rules)
- **Feature Plans:** `docs/{custom-app|project|workspace|strategy|user-profile}-feature-plan.md`
- **Deployment Strategy:** `docs/deployment-strategy.md`
- **Setup Guide:** `docs/WISPR-setup-prompt.md`
- **Prototype:** `docs/wispr-prototype.html`

### Appendix C: Test Case Template

```markdown
# Test Case [ID]

**Title:** [One-line description]  
**Feature:** [Feature name]  
**Module:** [Host | custom-app | data-pipeline | strategy]  
**Type:** [Unit | Integration | E2E | Manual]  
**Priority:** [P1 Critical | P2 High | P3 Medium | P4 Low]  
**Automation Status:** [Automated | Planned | Manual-only]  

**Preconditions:**
- [Condition 1: e.g., "User logged in as Editor"]
- [Condition 2: e.g., "Workspace 'Q3' created"]
- [Condition 3: e.g., "Project exists with discovery phase"]

**Steps:**
1. [Action 1]
2. [Action 2]
3. [Expected intermediate result after step 2]
4. [Action 3]

**Expected Result:**
- [Observable outcome 1]
- [Observable outcome 2]
- [Verify state changed correctly]

**Actual Result:** [Filled during execution: pass or fail]

**Pass/Fail:** [✅ Pass | ❌ Fail]

**Defect ID (if failed):** [Jira ticket, e.g., BUG-123]

**Notes:** [Any observations or edge cases]
```

---

## END OF DOCUMENT

**Document Control:**
- **Version:** 1.0
- **Last Updated:** June 2026
- **Next Review:** September 2026 (or after major release)
- **Owner:** QA Lead, WISPR Project
- **Distribution:** Dev Team, QA Team, PM, BA, Engineering Manager
