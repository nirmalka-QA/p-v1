import { registerMockRoutes } from '@wispr/services'
import type { MockRoute } from '@wispr/services'
import type {
  AdditionalDoc,
  OpenQuestion,
  PhaseProgress,
  PhaseStateAction,
  PhaseStateMap,
  PhaseStatus,
} from '../../models/model'
import { emptyProgress, normalizeProgress } from '../../helpers/helpers'

/**
 * Mock for strategy per-phase progress (backend-less dev/demo; VITE_USE_MOCKS).
 * One store keyed by project id → phase id → progress, persisted in localStorage so
 * uploads / generations / status changes survive reloads. Serves the `{ result }`
 * envelope. On first read a project is seeded with AI-flagged open questions per phase
 * (so the sidebar count + phase alert are populated on a cold load).
 */

const STORAGE_KEY = 'wispr.mock.phaseState.v1'

type Store = Record<string, PhaseStateMap>

/**
 * AI-flagged open questions seeded per library phase. Domain-appropriate gaps the AI
 * would surface; the user resolves them. Keyed by phase id so any configured rail is
 * covered.
 */
const SEED_QUESTIONS: Record<string, string[]> = {
  discovery: [
    'Which business units are in scope for the current-state assessment?',
    'Is the legacy CRM in or out of scope for this engagement?',
  ],
  stakeholder: ['Who is the executive sponsor accountable for sign-off?'],
  vision: [
    'Is the target horizon 3 years or 5 years?',
    'Which competitors should anchor the target-state benchmark?',
  ],
  'business-case': [
    'What discount rate should the ROI analysis assume?',
    'Are benefits measured gross or net of ongoing run costs?',
  ],
  governance: ['Which regulatory frameworks apply (e.g. GDPR, SOC 2, HIPAA)?'],
  'operating-model': ['Will delivery be in-house, outsourced, or a hybrid model?'],
  risk: ["What is the organisation's risk appetite for this initiative?"],
  implementation: [
    'Are there hard external deadlines constraining the timeline?',
    'Which workstream owns the data-migration dependency?',
  ],
  change: ['Which audiences need a tailored communications plan?'],
  signoff: ['Which board members must approve before go-live?'],
}

function seedQuestions(phaseId: string): OpenQuestion[] {
  return (SEED_QUESTIONS[phaseId] ?? []).map((question, i) => ({
    id: `${phaseId}-q${i + 1}`,
    question,
    source: 'Discovery scan',
    resolved: false,
  }))
}

/** Build a project's initial phase-state — every seeded phase gets its flagged questions. */
function seedProjectState(): PhaseStateMap {
  const state: PhaseStateMap = {}
  for (const phaseId of Object.keys(SEED_QUESTIONS)) {
    state[phaseId] = { ...emptyProgress(), openQuestions: seedQuestions(phaseId) }
  }
  return state
}

function load(): Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    // Corrupt store → start empty.
  }
  return {}
}

function save(store: Store): Store {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }
  return store
}

let store = load()
let docSeq = 0

const envelope = (result: unknown) => ({ result })

function addUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value]
}

/** Returns the project's state, seeding + persisting it on first access. */
function projectStateFor(projectId: string): PhaseStateMap {
  if (!store[projectId]) {
    store = save({ ...store, [projectId]: seedProjectState() })
  }
  return store[projectId] ?? {}
}

/** A new additional-doc id, unique across reloads (persisted ids keep their value). */
function nextDocId(): string {
  docSeq += 1
  return `ad-${Date.now()}-${docSeq}`
}

const routes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'strategy/projects/:id/phase-state',
    handler: ({ params }) => ({ data: envelope(projectStateFor(params['id'] ?? '')) }),
  },
  {
    method: 'POST',
    pattern: 'strategy/projects/:id/phases/:phaseId/additional-docs',
    handler: ({ params, body }) => {
      const projectId = params['id'] ?? ''
      const phaseId = params['phaseId'] ?? ''
      const fileName =
        typeof body === 'object' && body !== null && 'get' in (body as FormData)
          ? ((body as FormData).get('file') as File | null)?.name ?? ''
          : ''
      if (!fileName) return { status: 400, data: 'No file in the upload request.' }

      const projectState: PhaseStateMap = { ...projectStateFor(projectId) }
      const current: PhaseProgress = normalizeProgress(projectState[phaseId])
      const now = new Date().toISOString()
      const doc: AdditionalDoc = { id: nextDocId(), name: fileName, context: '', uploadedAt: now }
      projectState[phaseId] = { ...current, additionalDocs: [...current.additionalDocs, doc] }
      store = save({ ...store, [projectId]: projectState })
      return { data: envelope(projectState) }
    },
  },
  {
    method: 'POST',
    pattern: 'strategy/projects/:id/phases/:phaseId/inputs',
    handler: ({ params, body }) => {
      const projectId = params['id'] ?? ''
      const phaseId = params['phaseId'] ?? ''
      const slot =
        typeof body === 'object' && body !== null && 'get' in (body as FormData)
          ? ((body as FormData).get('slot') as string | null) ?? ''
          : ''
      if (!slot) return { status: 400, data: 'slot is required.' }

      const projectState: PhaseStateMap = { ...projectStateFor(projectId) }
      const current: PhaseProgress = normalizeProgress(projectState[phaseId])
      const now = new Date().toISOString()
      const file = { id: nextDocId(), name: slot, size: 0, uploadedAt: now }
      projectState[phaseId] = {
        ...current,
        mandatoryFiles: { ...current.mandatoryFiles, [slot]: [...(current.mandatoryFiles[slot] ?? []), file] },
      }
      store = save({ ...store, [projectId]: projectState })
      return { data: envelope(projectState) }
    },
  },
  {
    method: 'PATCH',
    pattern: 'strategy/projects/:id/phase-state',
    handler: ({ params, body }) => {
      const projectId = params['id'] ?? ''
      const { phaseId, action, name, fileName, fileSize, text, status, id } = (body ?? {}) as {
        phaseId?: string
        action?: PhaseStateAction
        name?: string
        fileName?: string
        fileSize?: number
        text?: string
        status?: PhaseStatus
        id?: string
      }
      if (!phaseId || !action) return { status: 400, data: 'phaseId and action are required.' }

      const projectState: PhaseStateMap = { ...projectStateFor(projectId) }
      // Normalize so pre-existing records (which may predate newer fields or use the old
      // `done` flag) always have every field present.
      const current: PhaseProgress = normalizeProgress(projectState[phaseId])
      let next: PhaseProgress = current

      const now = new Date().toISOString()

      if (action === 'upload' && name && fileName) {
        const file = { id: nextDocId(), name: fileName, uploadedAt: now, ...(fileSize !== undefined ? { size: fileSize } : {}) }
        next = {
          ...current,
          mandatoryFiles: { ...current.mandatoryFiles, [name]: [...(current.mandatoryFiles[name] ?? []), file] },
        }
      } else if (action === 'delete-mandatory-file' && name && id) {
        next = {
          ...current,
          mandatoryFiles: {
            ...current.mandatoryFiles,
            [name]: (current.mandatoryFiles[name] ?? []).filter((f) => f.id !== id),
          },
        }
      } else if (action === 'generate' && name) {
        // Generating an output also flags an AI open question for review (idempotent).
        const flaggedId = `${phaseId}-gen-${name}`
        const alreadyFlagged = current.openQuestions.some((q) => q.id === flaggedId)
        const flagged: OpenQuestion = {
          id: flaggedId,
          question: `Confirm the assumptions the AI used to generate “${name}”.`,
          source: name,
          resolved: false,
        }
        next = {
          ...current,
          generatedOutputs: addUnique(current.generatedOutputs, name),
          generatedAt: { ...current.generatedAt, [name]: now },
          openQuestions: alreadyFlagged ? current.openQuestions : [...current.openQuestions, flagged],
        }
      } else if (action === 'context' && name) {
        const inputContext = { ...current.inputContext }
        if (text && text.trim()) inputContext[name] = text
        else delete inputContext[name]
        next = { ...current, inputContext }
      } else if (action === 'set-status' && status) {
        next = { ...current, status }
      } else if (action === 'upload-additional' && name) {
        const doc: AdditionalDoc = { id: nextDocId(), name, context: '', uploadedAt: now, ...(fileSize !== undefined ? { size: fileSize } : {}) }
        next = { ...current, additionalDocs: [...current.additionalDocs, doc] }
      } else if (action === 'delete-additional' && id) {
        next = { ...current, additionalDocs: current.additionalDocs.filter((d) => d.id !== id) }
      } else if (action === 'additional-context' && id) {
        next = {
          ...current,
          additionalDocs: current.additionalDocs.map((d) =>
            d.id === id ? { ...d, context: text && text.trim() ? text : '' } : d,
          ),
        }
      } else if ((action === 'resolve-question' || action === 'reopen-question') && id) {
        const resolved = action === 'resolve-question'
        next = {
          ...current,
          openQuestions: current.openQuestions.map((q) => (q.id === id ? { ...q, resolved } : q)),
        }
      } else if (action === 'add-comment' && text && text.trim()) {
        const comment = { id: nextDocId(), text: text.trim(), resolved: false, createdAt: now }
        next = { ...current, comments: [...current.comments, comment] }
      } else if ((action === 'resolve-comment' || action === 'reopen-comment') && id) {
        const resolved = action === 'resolve-comment'
        next = {
          ...current,
          comments: current.comments.map((c) => (c.id === id ? { ...c, resolved } : c)),
        }
      } else if (action === 'delete-comment' && id) {
        next = { ...current, comments: current.comments.filter((c) => c.id !== id) }
      }

      projectState[phaseId] = next
      store = save({ ...store, [projectId]: projectState })
      return { data: envelope(projectState) }
    },
  },
]

/** Registers the strategy phase-state mock routes (call once when the remote loads). */
export function registerStrategyPhaseMockRoutes(): void {
  registerMockRoutes(routes)
}
