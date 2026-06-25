import { KB_SECTIONS } from '../../../../constants/kb-sections'
import type { KnowledgeBase, KBNote, KBSectionId } from '../../../../types'

/** Finds a note anywhere in the Knowledge Base by id. */
export function findNote(kb: KnowledgeBase, noteId: string): KBNote | undefined {
  for (const section of kb.sections) {
    const note = section.notes.find((n) => n.id === noteId)
    if (note) return note
  }
  return undefined
}

/** Returns a new KB with `patch` applied to the matching note (immutably). */
export function applyNoteUpdate(
  kb: KnowledgeBase,
  noteId: string,
  patch: Partial<KBNote>
): KnowledgeBase {
  return {
    ...kb,
    sections: kb.sections.map((s) => ({
      ...s,
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, ...patch } : n)),
    })),
  }
}

/**
 * Mock AI "enhance" for a KB note: appends an elaboration section to the note's
 * Markdown content, optionally steered by `instructions`. De-duplicated by
 * heading so repeated enhancement converges.
 */
export function enhanceNoteContent(
  note: Pick<KBNote, 'content'>,
  instructions?: string
): { content: string } {
  const focus = instructions?.trim()
  const heading = focus ? `### AI elaboration — ${focus}` : '### AI elaboration'
  if (note.content.includes(heading)) return { content: note.content }
  const body = focus
    ? `Expanded per the requested focus: **${focus}**. Consider edge cases, dependencies, and measurable acceptance criteria related to this.`
    : 'Additional context to deepen this note — key risks, assumptions to validate, and concrete next steps for the team.'
  return { content: `${note.content}\n\n${heading}\n\n${body}` }
}

// Partial notes (sectionId + generatedAt filled at call time)
type NoteDraft = Omit<KBNote, 'sectionId' | 'generatedAt'>

const SOURCE_FILES = ['project-brief.pdf', 'requirements.docx', 'stakeholder-notes.txt']

const NOTES: Partial<Record<KBSectionId, NoteDraft[]>> = {
  'business-requirements': [
    {
      id: 'note-br-1',
      title: 'Core Feature Requirements',
      description: 'Primary user-facing capabilities identified from the project brief and requirements documentation.',
      sourceFile: 'requirements.docx',
      content: `## Core Feature Requirements

The following capabilities were identified as must-have for the initial release:

- **User authentication** — Secure login with email/password, session persistence, and account lockout after failed attempts
- **Data management** — Full CRUD operations on primary entities with optimistic UI and rollback on error
- **Search & filtering** — Real-time search across key fields with composable filter options
- **Notifications** — Event-driven alerts via email; configurable preferences per user
- **Audit trail** — Immutable log of all state changes with actor, timestamp, and diff

All features must meet WCAG 2.1 AA accessibility standards and support keyboard-only navigation.

### Acceptance criteria summary
Each feature is considered complete when it has a loading state, error state, empty state, and is covered by at least one integration test.`,
    },
    {
      id: 'note-br-2',
      title: 'Non-Functional Requirements',
      description: 'Performance, security, and availability constraints derived from stakeholder discussions.',
      sourceFile: 'project-brief.pdf',
      content: `## Non-Functional Requirements

### Performance
- Page load under **2 seconds** on a 4G connection (LCP metric)
- API response time under **500 ms** at p95 under nominal load
- Frontend bundle under 250 KB gzipped (initial chunk)

### Security
- OWASP Top 10 compliance required before production launch
- All secrets managed via environment variables — no hardcoded credentials
- Rate limiting on auth endpoints: **5 attempts / 15 minutes** with exponential back-off
- HTTPS enforced everywhere; HSTS header required

### Availability
- **99.9% uptime SLA** (allows ~8.7 hours downtime/year)
- Zero-downtime deployments via blue/green or rolling strategy
- Automated rollback on health-check failure

### Scalability
- Stateless service design to support horizontal scaling
- Database connection pooling configured from day one`,
    },
  ],

  'problem-statements': [
    {
      id: 'note-ps-1',
      title: 'Current State & Pain Points',
      description: 'Key problems, inefficiencies, and user frustrations that this project is designed to resolve.',
      sourceFile: 'stakeholder-notes.txt',
      content: `## Current State & Pain Points

Based on stakeholder interviews and the provided documentation, three core problems are driving this project:

1. **Manual, error-prone processes** — Current workflows rely on spreadsheets and email handoffs. Data inconsistency is estimated to add **3–4 hours of correction work per week** per team.

2. **No self-service capability** — Users must contact support for actions they should be able to perform themselves. Support handles an estimated **40% of tickets** that a self-service tool would eliminate.

3. **Lack of visibility** — Stakeholders have no real-time view of status. Weekly manual reports are 3–5 days stale by the time they are distributed.

### Quantified impact
| Pain Point | Current Cost |
|---|---|
| Manual correction work | ~$48,000/year (est.) |
| Avoidable support tickets | ~$36,000/year (est.) |
| Delayed decision-making | Unquantified, strategic |

Resolving items 1 and 2 alone is projected to deliver **positive ROI within 6 months** of launch.`,
    },
  ],

  'proposed-solutions': [
    {
      id: 'note-sol-1',
      title: 'Recommended Technical Approach',
      description: 'High-level solution architecture and technology recommendations derived from the stated requirements.',
      sourceFile: 'project-brief.pdf',
      content: `## Recommended Technical Approach

### Frontend
React SPA with TypeScript throughout. Component library aligned with existing design system tokens. State management via Redux Toolkit for global state; React Query for server-state caching.

Key patterns:
- Feature-folder structure (one folder per domain)
- Service layer abstraction — no direct \`fetch\` or \`axios\` calls in components
- Optimistic UI for all create/update operations with rollback

### Backend
RESTful API following existing microservice conventions. New service acts as a BFF (Backend for Frontend), aggregating data from downstream services into view-optimised response shapes.

- **Authentication** — Delegate to existing auth service (JWT + refresh tokens)
- **Data layer** — PostgreSQL via existing ORM; no new database schemas in v1
- **Async operations** — Background jobs via existing queue infrastructure

### Infrastructure
No new infrastructure required for v1. Deploy alongside existing services using current CI/CD pipelines (GitHub Actions → ECS Fargate).

### Risk mitigations
- Shared component library prevents UI drift
- API contract tests (consumer-driven) prevent service integration regressions
- Feature flags for all new user-facing functionality`,
    },
  ],

  'architectural-notes': [
    {
      id: 'note-arch-1',
      title: 'System Architecture Overview',
      description: 'High-level component diagram and key architectural decisions with their rationale.',
      sourceFile: 'requirements.docx',
      content: `## System Architecture Overview

\`\`\`
[Browser — React SPA]
        │  HTTPS / REST
        ▼
[API Gateway / Load Balancer]
        │
        ├── [New BFF Service]
        │        ├── [Auth Service]    (existing)
        │        ├── [Data Service]    (existing)
        │        └── [Notification Service] (existing)
        │
        └── [Static Asset CDN]
\`\`\`

### Key architectural decisions

**1. BFF pattern**
The new service is a Backend for Frontend — it does not own data, only aggregates and transforms it. This decouples the UI from the internal microservice topology and lets us evolve the UI independently.

**2. Stateless services**
All new services are stateless by design. Session state is managed in the client (JWT) and rate-limit counters in Redis (existing). This enables horizontal scaling without coordination.

**3. No new databases in v1**
All persistent data lives in existing services. This eliminates schema migration risk for the initial release. Custom reporting views can be added in v2.

**4. Read-heavy optimisation**
The primary use case is read-heavy. We will implement HTTP caching headers (\`Cache-Control\`, \`ETag\`) and short-lived Redis caches for frequently-accessed aggregated views.`,
    },
  ],

  'tech-stack': [
    {
      id: 'note-tech-1',
      title: 'Technology Stack',
      description: 'Recommended technologies for each layer, with rationale and any AI-suggested additions.',
      sourceFile: 'project-brief.pdf',
      content: `## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend framework | React 18 + TypeScript | Team familiarity; strong ecosystem |
| State (global) | Redux Toolkit | Predictable state; existing team experience |
| State (server) | React Query / TanStack Query | Caching, background refetch, loading states |
| Styling | CSS Modules + design tokens | Scoped styles; no runtime overhead |
| Backend | Node.js + Express | Matches existing microservice stack |
| Auth | JWT + refresh tokens | Existing auth-service pattern |
| Database | PostgreSQL (via existing services) | No new DB — read from existing services |
| Hosting | AWS ECS Fargate | Existing infra; auto-scaling |
| CDN | CloudFront | Static asset delivery; edge caching |
| CI/CD | GitHub Actions | Already in use across all services |

### AI-suggested additions
The following were not in the original brief but are recommended based on pattern matching with similar projects:

- **Sentry** — Error monitoring and performance tracing (low cost, high signal)
- **Redis** — Session caching and rate-limit counters (already provisioned in infra)
- **Datadog / CloudWatch** — Unified metrics dashboard for operational visibility`,
    },
  ],

  'stakeholders': [
    {
      id: 'note-sh-1',
      title: 'Key Stakeholders',
      description: 'Identified decision makers, contributors, and approvers based on the project brief and interview notes.',
      sourceFile: 'stakeholder-notes.txt',
      content: `## Key Stakeholders

| Name | Role | Responsibility |
|---|---|---|
| Product Owner | PO | Requirements sign-off; sprint planning; gate approvals |
| Tech Lead | Developer | Architecture decisions; technical risk assessment |
| UX Designer | Designer | Design system; wireframes; usability testing |
| Head of Operations | Stakeholder | Defines self-service scope; UAT sign-off |
| Finance Representative | Stakeholder | ROI tracking; budget approval for phase 2 |

### Decision authority
- **Product Owner** has final say on scope changes and priority trade-offs
- **Tech Lead** has veto on architectural and infrastructure decisions
- **Head of Operations** must sign off on anything affecting customer-facing workflows

### Communication cadence
- Weekly planning sync: Monday 10:00
- Daily async updates via Slack \`#project-dev\`
- Fortnightly stakeholder demo: every other Friday 14:00
- Blocking decisions escalated within 48 hours via direct message to Product Owner`,
    },
  ],

  'open-questions': [
    {
      id: 'note-oq-1',
      title: 'Outstanding Decisions',
      description: 'Unresolved questions that require stakeholder input before implementation can proceed on the affected areas.',
      sourceFile: 'stakeholder-notes.txt',
      content: `## Outstanding Decisions

The following questions were raised during requirements analysis. Each is blocking work in the indicated area.

1. **Authentication provider** — Build on the existing in-house auth service (fastest path, 2 weeks) or migrate to a managed provider such as Auth0 (more scalable, adds 4 weeks)? Blocks: Sprint 2 backend work.

2. **Guest-to-account conversion trigger** — Should conversion be prompted automatically at a key moment (e.g. order confirmation), or should it be opt-in only (email link sent later)? Blocks: account registration flow design.

3. **Notification channels for v1** — Email is confirmed. SMS requires a third-party integration (est. +2 weeks). Push requires PWA infrastructure (est. +4 weeks). Which channels are in scope for the initial release? Blocks: notification service design.

4. **Data retention policy** — How long should user activity data be retained? This affects both database sizing and GDPR compliance requirements. Blocks: data model finalisation.

5. **Third-party integrations** — Are there existing tools (CRM, ERP, analytics) that this system must integrate with in v1? No integrations were specified in the brief, but this should be confirmed. Blocks: API gateway configuration.

> **Action required:** Product Owner to resolve items 1–3 by end of Sprint 1 planning. Items 4–5 can be deferred to Sprint 2 if needed.`,
    },
  ],
}

export function generateMockKB(projectId: string, sourceFileCount: number): KnowledgeBase {
  const now = new Date().toISOString()
  const sourceFiles = SOURCE_FILES.slice(0, Math.max(1, Math.min(sourceFileCount, 3)))

  const sections = KB_SECTIONS.map((cfg) => {
    const drafts = NOTES[cfg.id] ?? []
    const notes: KBNote[] = drafts.map((d) => ({
      ...d,
      sectionId: cfg.id,
      generatedAt: now,
      sourceFile: d.sourceFile,
    }))

    return {
      id: cfg.id,
      label: cfg.label,
      description: cfg.description,
      notes,
      generatedAt: notes.length > 0 ? now : undefined,
      sourceFiles: notes.length > 0 ? sourceFiles : [],
    }
  })

  return {
    projectId,
    sections,
    lastGeneratedAt: now,
    sourceFileCount: Math.max(1, sourceFileCount),
    isComplete: sections.some((s) => s.notes.length > 0),
  }
}
