import { registerMockRoutes } from '@wispr/services'
import type { MockRoute } from '@wispr/services'
import type {
  DocType,
  IStrategyTemplate,
  StrategyPhase,
} from '../../models/strategyTemplate'

/**
 * Mock for the project-type registry → Strategy template management (backend-less
 * dev/demo; VITE_USE_MOCKS). System templates ship read-only; tenant templates the
 * admin authors persist in a localStorage overlay so edits survive reloads. The
 * shapes mirror the strategy module's StrategyTemplateController so flipping to the
 * live backend is a config change, not a rewrite.
 */

const STORAGE_KEY = 'wispr.mock.strategy.templates.v1'
const MOCK_AUTHOR = 'Sarah Chen'

// Stable timestamps for the system seed so the list reads sensibly on cold load.
const SEEDED_AT = '2026-05-12T09:00:00.000Z'

let phaseSeq = 0
let slotSeq = 0
const pid = () => `seed-phase-${++phaseSeq}`
const sid = () => `seed-slot-${++slotSeq}`

function phase(
  name: string,
  description: string,
  mandatory: boolean,
  inputs: { name: string; mandatory: boolean; documentTypes: DocType[] }[],
  outputs: { name: string; documentTypes: DocType[]; prompt: string }[],
): StrategyPhase {
  return {
    id: pid(),
    name,
    description,
    mandatory,
    inputs: inputs.map((i) => ({ id: sid(), ...i })),
    outputs: outputs.map((o) => ({ id: sid(), ...o })),
  }
}

/** Two platform-shipped (read-only) templates with full doc config + prompts. */
const SYSTEM_TEMPLATES: IStrategyTemplate[] = [
  {
    id: 1,
    name: 'Data Strategy',
    description: 'Governance, architecture, and a modernization roadmap.',
    scope: 'system',
    createdBy: 'System',
    createdAt: SEEDED_AT,
    updatedBy: 'System',
    updatedAt: SEEDED_AT,
    phases: [
      phase(
        'Discovery & Assessment',
        'Current state: landscape, pain points, and stakeholder needs.',
        true,
        [
          { name: 'As-Is Architecture', mandatory: true, documentTypes: ['PDF', 'Diagram'] },
          { name: 'Stakeholder Interviews', mandatory: true, documentTypes: ['Word', 'PDF'] },
          { name: 'Data Inventory', mandatory: false, documentTypes: ['Spreadsheet'] },
        ],
        [
          {
            name: 'Current State Assessment',
            documentTypes: ['Word', 'PDF'],
            prompt:
              'From the uploaded current-state inputs, produce a current state assessment: the data landscape, key systems, pain points, and stakeholder needs. Ground every point in the provided material.',
          },
          {
            name: 'Gap Analysis Report',
            documentTypes: ['Spreadsheet', 'PDF'],
            prompt:
              'Compare the assessed current state against leading practice and produce a prioritised gap analysis: each gap with its impact and the capability it blocks.',
          },
        ],
      ),
      phase(
        'Governance Framework',
        'Ownership, policies, quality standards, and compliance.',
        false,
        [
          { name: 'Policy Inventory', mandatory: true, documentTypes: ['Spreadsheet', 'Word'] },
          { name: 'Compliance Requirements', mandatory: true, documentTypes: ['PDF'] },
        ],
        [
          {
            name: 'Governance Framework',
            documentTypes: ['Word', 'PDF'],
            prompt:
              'From the policy inventory and compliance requirements, produce a governance framework: ownership and decision rights, governance bodies, standards and controls, and the compliance mapping.',
          },
        ],
      ),
      phase(
        'Executive Sign-off',
        'Board presentation, approval workflow, and closure.',
        true,
        [{ name: 'Final Strategy Pack', mandatory: true, documentTypes: ['Presentation', 'PDF'] }],
        [
          {
            name: 'Board Presentation',
            documentTypes: ['Presentation'],
            prompt:
              'From the full strategy pack, produce a concise board presentation: the case for change, the strategy and roadmap, the investment and return, key risks, and the decision requested.',
          },
        ],
      ),
    ],
  },
  {
    id: 2,
    name: 'Cloud Migration',
    description: 'Lift-and-shift, re-platform, or re-architect to cloud.',
    scope: 'system',
    createdBy: 'System',
    createdAt: SEEDED_AT,
    updatedBy: 'System',
    updatedAt: SEEDED_AT,
    phases: [
      phase(
        'Discovery & Assessment',
        'Inventory the estate and assess cloud readiness.',
        true,
        [
          { name: 'Application Inventory', mandatory: true, documentTypes: ['Spreadsheet'] },
          { name: 'Infrastructure Map', mandatory: true, documentTypes: ['Diagram', 'PDF'] },
        ],
        [
          {
            name: 'Cloud Readiness Assessment',
            documentTypes: ['Word', 'PDF'],
            prompt:
              'From the application inventory and infrastructure map, assess cloud readiness per application (re-host, re-platform, re-architect, retire) with the rationale.',
          },
        ],
      ),
      phase(
        'Implementation Plan',
        'Workstreams, sequencing, and migration waves.',
        false,
        [{ name: 'Dependency Map', mandatory: true, documentTypes: ['Diagram', 'Spreadsheet'] }],
        [
          {
            name: 'Migration Plan',
            documentTypes: ['Word', 'Spreadsheet'],
            prompt:
              'From the readiness assessment and dependency map, produce a wave-based migration plan: sequenced workstreams, owners, timelines, and rollback considerations.',
          },
        ],
      ),
      phase(
        'Executive Sign-off',
        'Approval and closure.',
        true,
        [{ name: 'Final Strategy Pack', mandatory: true, documentTypes: ['Presentation', 'PDF'] }],
        [
          {
            name: 'Board Presentation',
            documentTypes: ['Presentation'],
            prompt:
              'Produce a board presentation summarising the migration strategy, investment, expected benefits, key risks, and the decision requested.',
          },
        ],
      ),
    ],
  },
]

type TemplateStore = IStrategyTemplate[]

function load(): TemplateStore {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as TemplateStore
  } catch {
    // Corrupt store → start empty (system templates are added in at read time).
  }
  return []
}

function save(store: TemplateStore): TemplateStore {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }
  return store
}

/** Tenant (editable) templates only — system seeds are never persisted/mutated. */
let tenantTemplates = load()

const envelope = (result: unknown) => ({ result })

/** System seeds first, then the tenant-authored templates (most-recent last). */
function allTemplates(): IStrategyTemplate[] {
  return [...SYSTEM_TEMPLATES, ...tenantTemplates]
}

function nextId(): number {
  const max = allTemplates().reduce((m, t) => Math.max(m, t.id), 99)
  return max + 1
}

let runtimeSeq = 0
const runtimeId = (prefix: string) => `${prefix}-${Date.now()}-${++runtimeSeq}`

/** Body shape produced by strategyTemplatesApi.toBody (slots without ids). */
interface SaveBody {
  name?: string
  description?: string
  phases?: {
    name?: string
    description?: string
    mandatory?: boolean
    inputs?: { name?: string; mandatory?: boolean; documentTypes?: DocType[] }[]
    outputs?: { name?: string; documentTypes?: DocType[]; prompt?: string }[]
  }[]
}

/** Materialises a save body into a stored phase list (assigning server-side ids). */
function materialisePhases(body: SaveBody): StrategyPhase[] {
  return (body.phases ?? []).map((p) => ({
    id: runtimeId('phase'),
    name: p.name ?? '',
    description: p.description ?? '',
    mandatory: Boolean(p.mandatory),
    inputs: (p.inputs ?? []).map((s) => ({
      id: runtimeId('in'),
      name: s.name ?? '',
      mandatory: Boolean(s.mandatory),
      documentTypes: s.documentTypes ?? [],
    })),
    outputs: (p.outputs ?? []).map((s) => ({
      id: runtimeId('out'),
      name: s.name ?? '',
      documentTypes: s.documentTypes ?? [],
      prompt: s.prompt ?? '',
    })),
  }))
}

function findTenant(id: number): IStrategyTemplate | undefined {
  return tenantTemplates.find((t) => t.id === id)
}

function findAny(id: number): IStrategyTemplate | undefined {
  return allTemplates().find((t) => t.id === id)
}

const routes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'strategy/strategy-templates',
    handler: () => ({ data: envelope({ templates: allTemplates() }) }),
  },

  {
    method: 'POST',
    pattern: 'strategy/strategy-templates',
    handler: ({ body }) => {
      const b = (body ?? {}) as SaveBody
      if (!b.name?.trim()) return { status: 400, data: 'A template name is required.' }
      const now = new Date().toISOString()
      const created: IStrategyTemplate = {
        id: nextId(),
        name: b.name.trim(),
        description: b.description?.trim() ?? '',
        scope: 'tenant',
        phases: materialisePhases(b),
        createdBy: MOCK_AUTHOR,
        createdAt: now,
        updatedBy: MOCK_AUTHOR,
        updatedAt: now,
      }
      tenantTemplates = save([...tenantTemplates, created])
      return { data: envelope(created) }
    },
  },

  {
    method: 'PUT',
    pattern: 'strategy/strategy-templates/:id',
    handler: ({ params, body }) => {
      const id = Number(params['id'])
      const existing = findTenant(id)
      if (!existing) {
        // System templates are immutable — mirror the backend's guard.
        return findAny(id)
          ? { status: 409, data: 'System templates are read-only. Duplicate to customise.' }
          : { status: 404, data: 'Template not found.' }
      }
      const b = (body ?? {}) as SaveBody
      if (!b.name?.trim()) return { status: 400, data: 'A template name is required.' }
      const updated: IStrategyTemplate = {
        ...existing,
        name: b.name.trim(),
        description: b.description?.trim() ?? '',
        phases: materialisePhases(b),
        updatedBy: MOCK_AUTHOR,
        updatedAt: new Date().toISOString(),
      }
      tenantTemplates = save(tenantTemplates.map((t) => (t.id === id ? updated : t)))
      return { data: envelope(updated) }
    },
  },

  {
    method: 'POST',
    pattern: 'strategy/strategy-templates/:id/duplicate',
    handler: ({ params }) => {
      const id = Number(params['id'])
      const source = findAny(id)
      if (!source) return { status: 404, data: 'Template not found.' }
      const now = new Date().toISOString()
      const copy: IStrategyTemplate = {
        ...source,
        id: nextId(),
        name: `${source.name} (Copy)`,
        scope: 'tenant',
        phases: source.phases.map((p) => ({
          ...p,
          id: runtimeId('phase'),
          inputs: p.inputs.map((s) => ({ ...s, id: runtimeId('in') })),
          outputs: p.outputs.map((s) => ({ ...s, id: runtimeId('out') })),
        })),
        createdBy: MOCK_AUTHOR,
        createdAt: now,
        updatedBy: MOCK_AUTHOR,
        updatedAt: now,
      }
      tenantTemplates = save([...tenantTemplates, copy])
      return { data: envelope(copy) }
    },
  },

  {
    method: 'DELETE',
    pattern: 'strategy/strategy-templates/:id',
    handler: ({ params }) => {
      const id = Number(params['id'])
      if (!findTenant(id)) {
        return findAny(id)
          ? { status: 409, data: 'System templates cannot be deleted.' }
          : { status: 404, data: 'Template not found.' }
      }
      tenantTemplates = save(tenantTemplates.filter((t) => t.id !== id))
      return { data: envelope(true) }
    },
  },
]

/** Registers the strategy template management mock routes (call once at boot). */
export function registerStrategyTemplatesMockRoutes(): void {
  registerMockRoutes(routes)
}
