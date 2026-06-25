import { registerMockRoutes } from '@wispr/services'
import type { MockRoute } from '@wispr/services'
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE } from '@wispr/contracts'
import type { Role } from '@wispr/contracts'
import { readMockProjects, deleteMockProjectsByWorkspace } from '@wispr/projects'
import { WORKSPACE_AVATAR_COLORS } from '../../constants/constants'
import type {
  IWorkspace,
  IWorkspaceArtifact,
  IWorkspaceListItem,
  IWorkspaceMember,
  IWorkspacesListRequest,
  WorkspaceTypeCount,
} from '../../models/model'

/**
 * Mock routes for the workspace endpoints (backend-less dev/demo; VITE_USE_MOCKS).
 * Serves the same `{ result }` envelope the Function API will, backed by
 * localStorage so created workspaces survive reloads. Seed ids (ws1/ws2) match the
 * workspaceId values on the seed projects in @wispr/projects' projectsMock.
 */

const STORAGE_KEY = 'wispr.mock.workspaces.v1'

/**
 * Identity the mock attributes new workspaces to (the creator becomes Owner).
 * In the live API this is derived from the authenticated user server-side.
 */
const CREATOR = { userId: 'u-sarah', name: 'Sarah Adler' }

const SEED: IWorkspace[] = [
  {
    id: 'ws1',
    workspaceName: 'Meridian Financial',
    workspaceDescription:
      'Digital transformation programme for a mid-market financial services firm. Strategy drives the delivery roadmap across analytics and SAP.',
    colorSeed: 'indigo',
    instructions:
      'Audience is regulated financial services. Favour GDPR/SOC2-aware language. Reference the 3-year operating model when scoping new work. Default cloud is Azure.',
    createdBy: 'Sarah Adler',
    createdById: 'u-sarah',
    createdDate: '2026-05-02T09:00:00.000Z',
    updatedDate: '2026-06-10T16:20:00.000Z',
    members: [
      { userId: 'u-sarah', name: 'Sarah Adler', email: 'sarah.adler@meridian.example', role: 'owner' },
      { userId: 'u-marcus', name: 'Marcus King', email: 'marcus.king@meridian.example', role: 'admin' },
      { userId: 'u-rina', name: 'Rina Patel', email: 'rina.patel@meridian.example', role: 'member' },
      { userId: 'u-tom', name: 'Tom Voss', email: 'tom.voss@meridian.example', role: 'viewer' },
    ],
    artifacts: [
      { id: 'a1', name: 'Group Data Standards.docx', kind: 'doc', updatedDate: '2026-06-01T10:00:00.000Z', snippet: 'Naming conventions, retention policy, and PII handling rules. Applies org-wide.', source: 'Uploaded' },
      { id: 'a2', name: 'Brand Guidelines.pdf', kind: 'doc', updatedDate: '2026-06-03T10:00:00.000Z', snippet: 'Logo usage, colour palette, and tone of voice for all client-facing material.', source: 'Uploaded' },
      { id: 'a3', name: 'Security & Compliance Policy.pdf', kind: 'doc', updatedDate: '2026-06-04T10:00:00.000Z', snippet: 'Auth, secrets management, and audit requirements for regulated work.', source: 'Uploaded' },
      { id: 'a4', name: 'Vendor Assessment.xlsx', kind: 'sheet', updatedDate: '2026-06-07T10:00:00.000Z', snippet: 'Scoring matrix for evaluating third-party platforms and tools.', source: 'Uploaded' },
    ],
  },
  {
    id: 'ws2',
    workspaceName: 'NorthWind Commerce',
    workspaceDescription:
      'Customer-facing commerce platform modernisation plus the insurance claims data and policy systems behind it.',
    colorSeed: 'teal',
    instructions:
      'Mobile-first products. Accessibility (WCAG 2.2 AA) is non-negotiable. Insurance work follows Guidewire conventions. Prefer TypeScript and React for front-end.',
    createdBy: 'Sarah Adler',
    createdById: 'u-sarah',
    createdDate: '2026-05-20T09:00:00.000Z',
    updatedDate: '2026-06-12T14:00:00.000Z',
    members: [
      { userId: 'u-sarah', name: 'Sarah Adler', email: 'sarah.adler@northwind.example', role: 'owner' },
      { userId: 'u-jen', name: 'Jen Liu', email: 'jen.liu@northwind.example', role: 'admin' },
      { userId: 'u-dev', name: 'Dev Rao', email: 'dev.rao@northwind.example', role: 'member' },
    ],
    artifacts: [
      { id: 'b1', name: 'Brand & UX Guidelines.pdf', kind: 'doc', updatedDate: '2026-05-28T10:00:00.000Z', snippet: 'Component library, tone of voice, accessibility baselines for all customer-facing surfaces.', source: 'Uploaded' },
      { id: 'b2', name: 'Security Baseline Policy.pdf', kind: 'doc', updatedDate: '2026-05-29T10:00:00.000Z', snippet: 'Auth, secrets, dependency scanning and pen-test cadence required for all builds.', source: 'Uploaded' },
    ],
  },
]

function load(): IWorkspace[] {
  if (typeof window === 'undefined') return [...SEED]
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as IWorkspace[]
  } catch {
    // Corrupt store → fall through to the seed.
  }
  return [...SEED]
}

function save(workspaces: IWorkspace[]): IWorkspace[] {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))
  }
  return workspaces
}

let workspaces = load()

const byNewest = (a: IWorkspace, b: IWorkspace) =>
  new Date(b.updatedDate ?? b.createdDate ?? 0).getTime() -
  new Date(a.updatedDate ?? a.createdDate ?? 0).getTime()

const envelope = (result: unknown) => ({ result })

/** Cycles the Mantine palette for a new member's avatar (never a hex value). */
function pickMemberColor(index: number): string {
  return WORKSPACE_AVATAR_COLORS[index % WORKSPACE_AVATAR_COLORS.length] ?? 'indigo'
}

/** Derives the project count + per-(federation-)type counts for a workspace from the project store. */
function deriveCounts(workspaceId: string): { projectCount: number; typeCounts: WorkspaceTypeCount[] } {
  const projects = readMockProjects().filter((p) => p.workspaceId === workspaceId)
  const byType = new Map<string, number>()
  for (const p of projects) {
    const key = p.projectType ?? 'custom-app'
    byType.set(key, (byType.get(key) ?? 0) + 1)
  }
  const typeCounts = [...byType.entries()]
    .map(([projectType, count]) => ({ projectType, count }))
    .sort((a, b) => b.count - a.count)
  return { projectCount: projects.length, typeCounts }
}

const routes: MockRoute[] = [
  {
    method: 'POST',
    pattern: 'workspaces-list',
    handler: ({ body }) => {
      const req = (body ?? {}) as IWorkspacesListRequest
      const q = (req.q ?? '').trim().toLowerCase()

      let list = [...workspaces].sort(byNewest)
      if (q) {
        list = list.filter(
          (w) =>
            w.workspaceName.toLowerCase().includes(q) ||
            (w.workspaceDescription ?? '').toLowerCase().includes(q),
        )
      }

      const pageNumber = req.pageNumber ?? DEFAULT_PAGE_NUMBER
      const pageSize = req.pageSize ?? DEFAULT_PAGE_SIZE
      const totalCount = list.length
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const start = (pageNumber - 1) * pageSize
      const items: IWorkspaceListItem[] = list
        .slice(start, start + pageSize)
        .map((w) => ({ ...w, ...deriveCounts(String(w.id)) }))

      return {
        data: envelope({
          workspaces: items,
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
    pattern: 'workspaces/:id',
    handler: ({ params }) => {
      const workspace = workspaces.find((w) => String(w.id) === params['id'])
      if (!workspace) return { status: 404, data: 'Workspace not found.' }
      return { data: envelope(workspace) }
    },
  },

  {
    method: 'POST',
    pattern: 'workspaces',
    handler: ({ body }) => {
      const input = (body ?? {}) as {
        workspaceName?: string
        workspaceDescription?: string
        colorSeed?: string
      }
      if (!input.workspaceName?.trim()) return { status: 400, data: 'Workspace name is required.' }
      const id = `ws${Date.now()}`
      const now = new Date().toISOString()
      const created: IWorkspace = {
        id,
        workspaceName: input.workspaceName.trim(),
        workspaceDescription: input.workspaceDescription?.trim() ?? '',
        colorSeed: input.colorSeed ?? 'indigo',
        instructions: '',
        createdBy: CREATOR.name,
        createdById: CREATOR.userId,
        createdDate: now,
        updatedDate: now,
        members: [{ userId: CREATOR.userId, name: CREATOR.name, role: 'owner' }],
        artifacts: [],
      }
      workspaces = save([created, ...workspaces])
      return { data: envelope({ workspaceId: id }) }
    },
  },

  {
    method: 'PATCH',
    pattern: 'workspaces/:id',
    handler: ({ params, body }) => {
      const ws = workspaces.find((w) => String(w.id) === params['id'])
      if (!ws) return { status: 404, data: 'Workspace not found.' }
      const patch = (body ?? {}) as {
        workspaceName?: string
        workspaceDescription?: string
        instructions?: string
      }
      if (patch.workspaceName !== undefined) ws.workspaceName = patch.workspaceName
      if (patch.workspaceDescription !== undefined) ws.workspaceDescription = patch.workspaceDescription
      if (patch.instructions !== undefined) ws.instructions = patch.instructions
      ws.updatedDate = new Date().toISOString()
      workspaces = save([...workspaces])
      return { data: envelope(ws) }
    },
  },

  {
    method: 'DELETE',
    pattern: 'workspaces/:id',
    handler: ({ params }) => {
      const id = params['id'] ?? ''
      deleteMockProjectsByWorkspace(id)
      workspaces = save(workspaces.filter((w) => String(w.id) !== id))
      return { data: envelope(true) }
    },
  },

  {
    method: 'POST',
    pattern: 'workspaces/:id/members',
    handler: ({ params, body }) => {
      const ws = workspaces.find((w) => String(w.id) === params['id'])
      if (!ws) return { status: 404, data: 'Workspace not found.' }
      const input = (body ?? {}) as { name?: string; email?: string; role?: Role }
      if (!input.name?.trim()) return { status: 400, data: 'Member name is required.' }
      ws.members = ws.members ?? []
      const member: IWorkspaceMember = {
        userId: `u-${Date.now()}`,
        name: input.name.trim(),
        role: input.role ?? 'member',
        colorSeed: pickMemberColor(ws.members.length),
        ...(input.email ? { email: input.email } : {}),
      }
      ws.members = [...ws.members, member]
      ws.updatedDate = new Date().toISOString()
      workspaces = save([...workspaces])
      return { data: envelope(member) }
    },
  },

  {
    method: 'PATCH',
    pattern: 'workspaces/:id/members/:memberId',
    handler: ({ params, body }) => {
      const ws = workspaces.find((w) => String(w.id) === params['id'])
      if (!ws) return { status: 404, data: 'Workspace not found.' }
      const member = (ws.members ?? []).find((m) => m.userId === params['memberId'])
      if (!member) return { status: 404, data: 'Member not found.' }
      const { role } = (body ?? {}) as { role?: Role }
      if (role) member.role = role
      ws.updatedDate = new Date().toISOString()
      workspaces = save([...workspaces])
      return { data: envelope(member) }
    },
  },

  {
    method: 'DELETE',
    pattern: 'workspaces/:id/members/:memberId',
    handler: ({ params }) => {
      const ws = workspaces.find((w) => String(w.id) === params['id'])
      if (!ws) return { status: 404, data: 'Workspace not found.' }
      ws.members = (ws.members ?? []).filter((m) => m.userId !== params['memberId'])
      ws.updatedDate = new Date().toISOString()
      workspaces = save([...workspaces])
      return { data: envelope(true) }
    },
  },

  {
    method: 'POST',
    pattern: 'workspaces/:id/artifacts',
    handler: ({ params, body }) => {
      const ws = workspaces.find((w) => String(w.id) === params['id'])
      if (!ws) return { status: 404, data: 'Workspace not found.' }
      const input = (body ?? {}) as { name?: string; kind?: IWorkspaceArtifact['kind'] }
      if (!input.name?.trim()) return { status: 400, data: 'A file name is required.' }
      const artifact: IWorkspaceArtifact = {
        id: `a-${Date.now()}`,
        name: input.name.trim(),
        kind: input.kind ?? 'file',
        updatedDate: new Date().toISOString(),
        source: 'Uploaded',
      }
      ws.artifacts = [artifact, ...(ws.artifacts ?? [])]
      ws.updatedDate = new Date().toISOString()
      workspaces = save([...workspaces])
      return { data: envelope(artifact) }
    },
  },

  {
    method: 'DELETE',
    pattern: 'workspaces/:id/artifacts/:artifactId',
    handler: ({ params }) => {
      const ws = workspaces.find((w) => String(w.id) === params['id'])
      if (!ws) return { status: 404, data: 'Workspace not found.' }
      ws.artifacts = (ws.artifacts ?? []).filter((a) => a.id !== params['artifactId'])
      ws.updatedDate = new Date().toISOString()
      workspaces = save([...workspaces])
      return { data: envelope(true) }
    },
  },
]

/** Registers the workspace mock routes (call once at boot; gating is `useMocks`). */
export function registerWorkspacesMockRoutes(): void {
  registerMockRoutes(routes)
}

/**
 * Mock-support read accessor: the current persisted workspaces. Used by the global
 * dashboard mock to compute org-wide aggregates without coupling to the storage key.
 */
export function readMockWorkspaces(): IWorkspace[] {
  return load()
}
