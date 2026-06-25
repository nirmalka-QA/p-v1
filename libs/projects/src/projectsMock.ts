import { registerMockRoutes } from '@wispr/services'
import type { MockRoute } from '@wispr/services'
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE } from '@wispr/contracts'
import { PROJECT_TYPE_LABEL, PROJECT_TYPE_BY_ID } from './constants'
import type {
  IProjects,
  IProjectsListRequest,
  IProjectType,
  IProjectTypeCatalogEntry,
} from './model'

/**
 * Federation project-type master data (the prototype's "Type" step). Frontend-ready
 * but backend-shaped: served from GET /project-type-catalog. Only custom-app and
 * strategy are `available` in this phase; the rest are `coming-soon` until their
 * remote ships. The frontend adds icon + accent colour via PROJECT_TYPE_META.
 */
const PROJECT_TYPE_CATALOG: IProjectTypeCatalogEntry[] = [
  { id: 1, key: 'custom-app', name: 'Custom App', tag: 'CUSTOM APP', description: 'Build full-stack web and mobile apps — UI, APIs, and database.', status: 'available' },
  { id: 2, key: 'strategy', name: 'Strategy', tag: 'STRATEGY', description: 'Run phase-driven strategy work, from discovery to sign-off.', status: 'available' },
  { id: 3, key: 'data-pipeline', name: 'Data Pipeline', tag: 'DATA', description: 'Move, transform, and validate data across systems.', status: 'coming-soon' },
  { id: 4, key: 'analytics-bi', name: 'Analytics & BI', tag: 'ANALYTICS', description: 'Turn data into dashboards, reports, and insights.', status: 'coming-soon' },
  { id: 5, key: 'sap', name: 'SAP', tag: 'SAP', description: 'Deliver SAP change — functional specs, ABAP, and S/4HANA config.', status: 'coming-soon' },
  { id: 6, key: 'guidewire', name: 'Guidewire', tag: 'GUIDEWIRE', description: 'Configure and extend Guidewire PolicyCenter and product models.', status: 'coming-soon' },
  { id: 7, key: 'testing', name: 'Testing', tag: 'TESTING', description: 'Plan, automate, and run tests to validate quality.', status: 'coming-soon' },
]

/**
 * Mock routes for the project endpoints (backend-less dev/demo; VITE_USE_MOCKS).
 * Serves the same envelopes the Function API returns (`{ result }`), backed by a
 * localStorage store so created projects survive reloads. Phase data is mocked
 * separately by the workspace remote's routes.
 */

const STORAGE_KEY = 'wispr.mock.projects.v1'

/** Realistic seed so the list/demo is meaningful on first run. workspaceId values
 * match the workspace mock seed (ws1 = Meridian Financial, ws2 = NorthWind Commerce). */
const SEED: IProjects[] = [
  {
    id: 101,
    projectName: 'Aurora Patient Portal',
    projectDescription:
      'Self-service portal for patients to book appointments, view lab results, and message their care team.',
    projectType: 'custom-app',
    projectTypeId: 1,
    status: 2,
    createdDate: '2026-05-18T09:30:00.000Z',
    workspaceId: 'ws1',
  },
  {
    id: 102,
    projectName: 'Meridian Digital Transformation',
    projectDescription:
      'Three-year digital strategy for the financial services group — operating model, roadmap, and executive sign-off.',
    projectType: 'strategy',
    projectTypeId: 5,
    status: 1,
    createdDate: '2026-06-02T14:05:00.000Z',
    workspaceId: 'ws1',
    // Configured at creation (Digital Transformation template) — drives the strategy
    // remote's phase rail.
    strategyType: 'digital',
    phaseIds: ['discovery', 'vision', 'operating-model', 'change', 'implementation', 'signoff'],
  },
  {
    id: 103,
    projectName: 'Claims Data Migration',
    projectDescription:
      'Migrate eight years of legacy claims data from Oracle to Snowflake with a full audit trail. (Pipeline workspace coming soon.)',
    projectType: 'data-pipeline',
    projectTypeId: 2,
    status: 1,
    createdDate: '2026-06-09T11:45:00.000Z',
    workspaceId: 'ws2',
  },
]

function load(): IProjects[] {
  if (typeof window === 'undefined') return [...SEED]
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as IProjects[]
  } catch {
    // Corrupt store → fall through to the seed.
  }
  return [...SEED]
}

function save(projects: IProjects[]): IProjects[] {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }
  return projects
}

let projects = load()

const byNewest = (a: IProjects, b: IProjects) =>
  new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()

const envelope = (result: unknown) => ({ result })

const routes: MockRoute[] = [
  {
    method: 'POST',
    pattern: 'projects-list',
    handler: ({ body }) => {
      const req = (body ?? {}) as IProjectsListRequest
      const q = (req.q ?? '').trim().toLowerCase()

      let list = [...projects].sort(byNewest)
      if (req.workspaceId) list = list.filter((p) => p.workspaceId === req.workspaceId)
      if (q) {
        list = list.filter(
          (p) =>
            p.projectName.toLowerCase().includes(q) ||
            (p.projectDescription ?? '').toLowerCase().includes(q),
        )
      }
      if (req.projectTypeId) list = list.filter((p) => p.projectTypeId === req.projectTypeId)
      if (req.status) list = list.filter((p) => p.status === req.status)

      const pageNumber = req.pageNumber ?? DEFAULT_PAGE_NUMBER
      const pageSize = req.pageSize ?? DEFAULT_PAGE_SIZE
      const totalCount = list.length
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const start = (pageNumber - 1) * pageSize

      return {
        data: envelope({
          projects: list.slice(start, start + pageSize),
          totalCount,
          pageNumber,
          pageSize,
          totalPages,
          hasMore: pageNumber < totalPages,
        }),
      }
    },
  },

  {
    method: 'GET',
    pattern: 'project-types',
    handler: () => {
      const types: IProjectType[] = Object.entries(PROJECT_TYPE_BY_ID).map(([id, type]) => ({
        id: Number(id),
        name: PROJECT_TYPE_LABEL[type],
      }))
      return { data: envelope(types) }
    },
  },

  {
    method: 'GET',
    pattern: 'project-type-catalog',
    handler: () => ({ data: envelope(PROJECT_TYPE_CATALOG) }),
  },

  {
    method: 'GET',
    pattern: 'projects/:id',
    handler: ({ params }) => {
      const project = projects.find((p) => String(p.id) === params['id'])
      if (!project) return { status: 404, data: 'Project not found.' }
      return { data: envelope(project) }
    },
  },

  {
    method: 'POST',
    pattern: 'projects',
    handler: ({ body }) => {
      const input = (body ?? {}) as {
        projectName?: string
        projectDescription?: string
        projectType?: IProjects['projectType']
        projectTypeId?: number
        strategyType?: string
        phaseIds?: string[]
        workspaceId?: string
      }
      if (!input.projectName?.trim()) return { status: 400, data: 'Project name is required.' }
      const id = projects.reduce((max, p) => Math.max(max, p.id), 100) + 1
      const created: IProjects = {
        id,
        projectName: input.projectName.trim(),
        projectDescription: input.projectDescription?.trim() ?? '',
        projectType: input.projectType ?? 'custom-app',
        // Industry id from the wizard's optional select; defaults to 'other' (5).
        projectTypeId: input.projectTypeId ?? 5,
        status: 1,
        createdDate: new Date().toISOString(),
        // Strategy projects persist their configured rail (template key + ordered phases).
        ...(input.strategyType ? { strategyType: input.strategyType } : {}),
        ...(input.phaseIds?.length ? { phaseIds: input.phaseIds } : {}),
        ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      }
      projects = save([created, ...projects])
      return { data: envelope({ projectId: id }) }
    },
  },

  {
    method: 'PATCH',
    pattern: 'projects/:id',
    handler: ({ params, body }) => {
      const target = projects.find((p) => String(p.id) === params['id'])
      if (!target) return { status: 404, data: 'Project not found.' }
      const patch = (body ?? {}) as Partial<Pick<IProjects, 'projectName' | 'projectDescription' | 'projectTypeId'>>
      if (patch.projectName !== undefined) target.projectName = patch.projectName
      if (patch.projectDescription !== undefined) target.projectDescription = patch.projectDescription
      if (patch.projectTypeId !== undefined) target.projectTypeId = patch.projectTypeId
      projects = save([...projects])
      return { data: envelope(target) }
    },
  },

  // Project delete is LIVE-only (Core cascade orchestration, ADR-0070) — no mock route.
]

/** Registers the project mock routes (call once at boot; gating is `useMocks`). */
export function registerProjectsMockRoutes(): void {
  registerMockRoutes(routes)
}

/**
 * Mock-support read accessor: the current persisted projects. Used by the global
 * dashboard mock to compute org-wide aggregates without coupling to this module's
 * storage key. Reads from localStorage so it reflects projects created this session.
 */
export function readMockProjects(): IProjects[] {
  return load()
}

/**
 * Mock-support write accessor: removes every project in a workspace. Used by the
 * workspace-delete mock so deleting a workspace cascades to its projects (mirrors the
 * server-side cascade) without that mock reaching into this module's storage key.
 * Returns the number of projects removed.
 */
export function deleteMockProjectsByWorkspace(workspaceId: string): number {
  const before = projects.length
  projects = save(projects.filter((p) => p.workspaceId !== workspaceId))
  return before - projects.length
}
