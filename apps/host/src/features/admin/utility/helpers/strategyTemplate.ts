import type {
  DocSlotDraft,
  IStrategyTemplate,
  PhaseDraft,
  StrategyTemplate,
  TemplateDraft,
} from '../models/strategyTemplate'

/** A client-stable id for new editor rows (replaced by the server id on persist). */
export function localId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}-${rnd}`
}

/** A blank input/output doc slot for the editor. */
export function newDocSlot(kind: 'input' | 'output'): DocSlotDraft {
  return kind === 'input'
    ? { id: localId('in'), name: '', mandatory: true, documentTypes: [] }
    : { id: localId('out'), name: '', documentTypes: [], prompt: '' }
}

/** A blank phase with one empty input and one empty output, ready to edit. */
export function newPhase(): PhaseDraft {
  return {
    id: localId('phase'),
    name: '',
    description: '',
    mandatory: false,
    inputs: [newDocSlot('input')],
    outputs: [newDocSlot('output')],
  }
}

/** A blank template draft (used by the "New template" flow). */
export function blankDraft(): TemplateDraft {
  return { name: '', description: '', phases: [newPhase()] }
}

/** Builds an editable draft from an existing template (Edit / Duplicate). */
export function toDraft(template: StrategyTemplate): TemplateDraft {
  return {
    name: template.name,
    description: template.description,
    phases: template.phases.map((p) => ({
      id: localId('phase'),
      name: p.name,
      description: p.description,
      mandatory: p.mandatory,
      inputs: p.inputs.map((s) => ({
        id: localId('in'),
        name: s.name,
        mandatory: s.mandatory,
        documentTypes: [...s.documentTypes],
      })),
      outputs: p.outputs.map((s) => ({
        id: localId('out'),
        name: s.name,
        documentTypes: [...s.documentTypes],
        prompt: s.prompt,
      })),
    })),
  }
}

/** Maps a raw API template to the UI shape (fills author/timestamp fallbacks). */
export function mapTemplate(raw: IStrategyTemplate): StrategyTemplate {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    scope: raw.scope,
    phases: raw.phases ?? [],
    createdBy: raw.createdBy ?? (raw.scope === 'system' ? 'System' : 'Unknown'),
    createdAt: raw.createdAt ?? '',
    updatedBy: raw.updatedBy ?? raw.createdBy ?? (raw.scope === 'system' ? 'System' : 'Unknown'),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? '',
  }
}

/** Total output documents across every phase (a useful at-a-glance count). */
export function countOutputs(template: StrategyTemplate): number {
  return template.phases.reduce((sum, p) => sum + p.outputs.length, 0)
}

/** A compact relative-time label ("just now", "3d ago", "2mo ago") for the list meta. */
export function relativeTime(iso: string): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}
