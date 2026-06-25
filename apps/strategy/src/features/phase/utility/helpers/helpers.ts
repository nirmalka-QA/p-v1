import type { ProjectPhase } from '@wispr/projects'
import type { OpenQuestion, PhaseProgress, PhaseStateMap, PhaseStatus, UploadedFile } from '../models/model'

/** An empty progress record (a phase not yet worked). */
export function emptyProgress(): PhaseProgress {
  return {
    mandatoryFiles: {},
    generatedOutputs: [],
    generatedAt: {},
    inputContext: {},
    additionalDocs: [],
    openQuestions: [],
    comments: [],
    status: 'new',
  }
}

/** A raw record as it may exist in localStorage or from the live backend — possibly
 *  missing newer fields, carrying the pre-status `done: boolean` shape, or carrying the
 *  backend's list format for mandatoryFiles (`[{slotName, files}]`). */
type RawProgress = Partial<PhaseProgress> & {
  done?: boolean
  mandatoryFiles?: Record<string, UploadedFile[]> | Array<{ slotName: string; files: UploadedFile[] }>
}

/**
 * Merge a raw record over defaults so every field is present, normalise the backend's
 * `mandatoryFiles` list format to the `Record<slotName, UploadedFile[]>` the UI expects,
 * and migrate the pre-status `done: boolean` shape to the `status` lifecycle.
 */
export function normalizeProgress(raw: RawProgress | undefined): PhaseProgress {
  const merged = { ...emptyProgress(), ...(raw ?? {}) }

  // Backend sends mandatoryFiles as [{slotName, files}] (list, not dict) to avoid
  // the JSON serialiser camelCasing the slot names when used as dictionary keys.
  let mandatoryFiles: Record<string, UploadedFile[]> = {}
  const rawMF = raw?.mandatoryFiles
  if (Array.isArray(rawMF)) {
    for (const entry of rawMF) {
      if (entry?.slotName) mandatoryFiles[entry.slotName] = entry.files ?? []
    }
  } else if (rawMF && typeof rawMF === 'object') {
    mandatoryFiles = rawMF as Record<string, UploadedFile[]>
  }

  // Legacy records carried `done` with no `status`.
  if (!raw?.status && raw && 'done' in raw) {
    merged.status = raw.done ? 'done' : 'new'
  }

  // The backend JSON serialiser lowercases the first character of inputContext keys
  // (e.g. "as-Is Architecture" instead of "As-Is Architecture"). Re-capitalise so
  // the UI's slot-name lookup (progress.inputContext[input.name]) resolves correctly.
  const inputContext: Record<string, string> = {}
  for (const [key, value] of Object.entries(merged.inputContext ?? {})) {
    const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
    inputContext[normalizedKey] = value
  }

  return {
    mandatoryFiles,
    generatedOutputs: merged.generatedOutputs,
    generatedAt: merged.generatedAt,
    inputContext,
    additionalDocs: merged.additionalDocs,
    openQuestions: merged.openQuestions,
    comments: merged.comments,
    status: merged.status,
  }
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Human-readable timestamp for document metadata ('' for missing/invalid values). */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : DATE_TIME_FORMAT.format(date)
}

/** The file kind from its extension, upper-cased (e.g. "PDF", "DOCX"); "FILE" if none. */
export function fileKind(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase() : 'FILE'
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB']

/** Human-readable file size ('' for missing/zero). */
export function formatBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return ''
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${SIZE_UNITS[unit]}`
}

/** The "TYPE · SIZE" metadata line for an uploaded file (kind only when size is unknown). */
export function fileMeta(name: string, size?: number): string {
  const sizeText = formatBytes(size)
  return sizeText ? `${fileKind(name)} · ${sizeText}` : fileKind(name)
}

/** The progress for a phase, normalized so every field is present. */
export function progressOf(state: PhaseStateMap | undefined, phaseId: string): PhaseProgress {
  return normalizeProgress(state?.[phaseId])
}

/** Whether every mandatory slot of a phase has at least one uploaded file (gates Generate). */
export function allMandatoryUploaded(phase: ProjectPhase, progress: PhaseProgress): boolean {
  return phase.inputs
    .filter((i) => i.mandatory)
    .every((i) => (progress.mandatoryFiles[i.name]?.length ?? 0) > 0)
}

/** A phase marked `done` is frozen — no upload/generate/delete/resolve until reopened. */
export function isPhaseLocked(progress: PhaseProgress): boolean {
  return progress.status === 'done'
}

/** The phase's still-open (unresolved) questions. */
export function unresolvedQuestions(progress: PhaseProgress): OpenQuestion[] {
  return progress.openQuestions.filter((q) => !q.resolved)
}

/** How many open questions a phase still has unresolved (drives the sidebar count + alert). */
export function unresolvedCount(progress: PhaseProgress): number {
  return unresolvedQuestions(progress).length
}

/** How many comments are still open/unresolved (drives the sidebar Comments count). */
export function openCommentCount(progress: PhaseProgress): number {
  return progress.comments.filter((c) => !c.resolved).length
}

/** Presentation for a phase status — label + Mantine colour (used by control/rail/badge). */
export interface StatusMeta {
  label: string
  color: string
}

const STATUS_META: Record<PhaseStatus, StatusMeta> = {
  new: { label: 'New', color: 'gray' },
  'in-progress': { label: 'In Progress', color: 'blue' },
  done: { label: 'Done', color: 'teal' },
}

export function statusMeta(status: PhaseStatus): StatusMeta {
  return STATUS_META[status]
}

/** How many of the configured phases are done. */
export function completedCount(phases: ProjectPhase[], state: PhaseStateMap | undefined): number {
  return phases.filter((p) => progressOf(state, p.id).status === 'done').length
}

/**
 * The active phase id parsed from the path, ignoring a trailing `questions` view segment
 * (so the rail/sidebar/status bar resolve the phase on both `/:phaseId` and
 * `/:phaseId/questions`).
 */
export function activePhaseIdFromPath(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (last === 'questions') return segments[segments.length - 2]
  return last
}
