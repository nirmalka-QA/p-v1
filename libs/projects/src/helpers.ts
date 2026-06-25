import type { Project, IProjects, CreateProjectInput, IStrategyPhase, ProjectPhase } from './model'
import { PROJECT_AVATAR_COLORS, PROJECT_TYPE_BY_ID, PROJECT_TYPE_ID } from './constants'

// The two strategy phases that are always present and pinned to the ends.
const MANDATORY_FIRST_PHASE = 'discovery'
const MANDATORY_LAST_PHASE = 'signoff'

// Default phase for a freshly-created project. Kept as a plain string here (the
// SDLC Phase union lives in custom-app); equals custom-app's INITIAL_PHASE.
const INITIAL_PHASE = 'discovery'

/**
 * Maps a raw API project (IProjects) to the UI `Project`. The API doesn't carry
 * phase / logo / owner, so those fall back (phase → initial). `typeId` is kept
 * raw; `type` is a best-effort display label via PROJECT_TYPE_BY_ID.
 */
export function mapProject(dto: IProjects): Project {
  return {
    id: String(dto.id),
    name: dto.projectName,
    description: dto.projectDescription ?? '',
    // Federation type drives remote mounting; default to custom-app when absent.
    projectType: dto.projectType ?? 'custom-app',
    type: PROJECT_TYPE_BY_ID[dto.projectTypeId] ?? 'other',
    typeId: dto.projectTypeId,
    status: dto.status as Project['status'],
    workspaceId: dto.workspaceId ?? '',
    currentPhase: INITIAL_PHASE,
    ...(dto.strategyType ? { strategyType: dto.strategyType } : {}),
    ...(dto.phaseIds ? { phaseIds: dto.phaseIds } : {}),
    createdAt: dto.createdDate ?? '',
    updatedAt: dto.createdDate ?? '',
    createdBy: '',
  }
}

/** Builds the create-project request body in the API's field names. */
export function toCreateProjectBody(input: CreateProjectInput): Record<string, unknown> {
  return {
    projectName: input.name,
    projectDescription: input.description,
    projectType: input.projectType,
    // Industry maps to the API's numeric projectTypeId (optional in the wizard).
    ...(input.industry ? { projectTypeId: PROJECT_TYPE_ID[input.industry] } : {}),
    // Strategy projects carry their configured rail (template key + ordered phase ids).
    ...(input.strategyType ? { strategyType: input.strategyType } : {}),
    ...(input.phaseIds?.length ? { phaseIds: input.phaseIds } : {}),
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
  }
}

/** Builds a partial update body, mapping only the fields the API understands. */
export function toUpdateProjectBody(patch: Partial<Project>): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (patch.name !== undefined) body.projectName = patch.name
  if (patch.description !== undefined) body.projectDescription = patch.description
  if (patch.typeId !== undefined) body.projectTypeId = patch.typeId
  return body
}

/** Deterministic Mantine color name for a project avatar, derived from its id. */
export function projectColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return PROJECT_AVATAR_COLORS[hash % PROJECT_AVATAR_COLORS.length] ?? 'indigo'
}

/** Two-letter initials for a project avatar. */
export function projectInitials(name: string): string {
  const words = name.split(/[\s\-–—]+/).filter(Boolean)
  const first = words[0] ?? ''
  if (words.length === 1) return first.slice(0, 2).toUpperCase()
  const second = words[1] ?? ''
  return ((first[0] ?? '') + (second[0] ?? '')).toUpperCase()
}

/** Projects sorted by most recently updated first. */
export function sortByUpdatedDesc(projects: Project[]): Project[] {
  return [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

/**
 * Normalises a strategy phase-id list: de-duplicates, then pins Discovery to the
 * start and Executive Sign-off to the end (both are mandatory and fixed). The middle
 * keeps its given order. Used by the wizard's template + custom phase configuration.
 */
export function orderPhaseIds(ids: string[]): string[] {
  const unique = ids.filter((v, i) => ids.indexOf(v) === i)
  const middle = unique.filter((x) => x !== MANDATORY_FIRST_PHASE && x !== MANDATORY_LAST_PHASE)
  return [MANDATORY_FIRST_PHASE, ...middle, MANDATORY_LAST_PHASE]
}

/**
 * Expands ordered phase ids into full phase objects from the library — the shape the
 * strategy remote renders as its rail and the wizard previews. Unknown ids are dropped.
 */
export function buildProjectPhases(ids: string[], library: IStrategyPhase[]): ProjectPhase[] {
  const byId = new Map(library.map((p) => [p.id, p]))
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is IStrategyPhase => Boolean(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      ...(p.guide ? { guide: p.guide } : {}),
      mandatory: p.mandatory,
      inputs: p.inputs,
      outputs: p.outputs,
    }))
}
