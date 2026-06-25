import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useGetProjectQuery } from '@wispr/projects'
import type { Project, ProjectPhase } from '@wispr/projects'
import { useGetProjectPhasesQuery, useGetProjectStatusQuery } from '../features/phase/utility/services/phaseStateApi'
import type { PhaseStateMap } from '../features/phase/utility/models/model'
import { normalizeProgress } from '../features/phase/utility/helpers/helpers'

interface StrategyProjectValue {
  projectId: string
  project: Project | undefined
  /** The project's configured phases, ordered — sourced from the strategy module (not Core). */
  phases: ProjectPhase[]
  /** The chosen strategy's display name (from the strategy module), e.g. "Tech Migration Strategy". */
  strategyName: string | undefined
  /** Per-phase working progress (from the strategy module). */
  state: PhaseStateMap | undefined
  /** Absolute path to a phase, built from the host-provided basePath (mount-aware). */
  phasePath: (phaseId: string) => string
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const StrategyProjectContext = createContext<StrategyProjectValue | null>(null)

interface StrategyProjectProviderProps {
  projectId: string
  /** Where the host mounted this remote (e.g. `/projects/p123`); `/` standalone. */
  basePath: string
  children: ReactNode
}

/**
 * Resolves the strategy project once and shares it with the whole workspace (rail,
 * sidebar, phase page, status bar). The project's phases are owned by the strategy
 * module (the capability schema, never Core): a single GET returns the ordered phases
 * WITH their config + live progress, from which we derive both the rail and the
 * PhaseStateMap. RTK caches the queries, so this is the single fetch point.
 */
export function StrategyProjectProvider({ projectId, basePath, children }: StrategyProjectProviderProps) {
  const { data: project, isLoading: projectLoading, isError: projectError, refetch } =
    useGetProjectQuery(projectId)
  const { data: views = [], isLoading: phasesLoading, isError: phasesError } =
    useGetProjectPhasesQuery(projectId)
  const { data: status } = useGetProjectStatusQuery(projectId)

  // The rail config (id/name/inputs/outputs) — straight from the module's instantiated phases.
  const phases = useMemo<ProjectPhase[]>(
    () =>
      views.map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        mandatory: v.mandatory,
        inputs: v.inputs,
        outputs: v.outputs,
      })),
    [views],
  )

  // The per-phase progress map, keyed by phase id — derived from the same response. The live backend returns a leaner
  // progress shape (uploadedInputs/done/state); normalizeProgress fills the redesign fields (additionalDocs/
  // openQuestions/comments) with safe defaults and migrates `done` → `status`, so the workspace UI never sees undefined.
  const state = useMemo<PhaseStateMap>(
    () => Object.fromEntries(views.map((v) => [v.id, normalizeProgress(v.progress)])),
    [views],
  )

  // Absolute path to a phase, honouring where the host mounted the remote ('/projects/:id'
  // composed, '/' standalone) — so navigation is correct in both modes.
  const root = basePath.replace(/\/$/, '')
  const phasePath = useMemo(() => (phaseId: string) => `${root}/${phaseId}`, [root])

  const value = useMemo<StrategyProjectValue>(
    () => ({
      projectId,
      project,
      phases,
      strategyName: status?.strategyName,
      state,
      phasePath,
      isLoading: projectLoading || phasesLoading,
      isError: projectError || phasesError,
      refetch,
    }),
    [projectId, project, phases, status?.strategyName, state, phasePath, projectLoading, phasesLoading, projectError, phasesError, refetch],
  )

  return <StrategyProjectContext.Provider value={value}>{children}</StrategyProjectContext.Provider>
}

/** Reads the resolved strategy project context (must be under StrategyProjectProvider). */
export function useStrategyProject(): StrategyProjectValue {
  const ctx = useContext(StrategyProjectContext)
  if (!ctx) throw new Error('useStrategyProject must be used within StrategyProjectProvider')
  return ctx
}
