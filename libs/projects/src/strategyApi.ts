import { api } from '@wispr/services'
import { API_ENDPOINTS, API_TAGS, LIST_ID } from '@wispr/contracts'
import type { ApiEnvelope, IStrategyTypeOption, IStrategyPhase } from './model'

/**
 * Maps the wizard's strategy choice onto a freshly-created project. The chosen strategy + phases live ONLY in the
 * strategy capability schema (never in Core): right after the project is created the host calls this with the
 * selected template id (predefined) or a custom phase composition. Instantiate is idempotent on the backend.
 */
export interface InstantiateStrategyArgs {
  projectId: string
  /** A predefined strategy template id (from IStrategyTypeOption.id). */
  strategyTemplateId?: number
  /** A custom-built phase composition (used when no predefined template is chosen). */
  phases?: { phaseTemplateId: string; required: boolean; dependsOn: string[]; ordinal: number }[]
}

/**
 * Strategy master-data + project-mapping endpoints — injected into the shared @wispr/services api.
 * Defined in @wispr/projects so the host wizard (configuring + instantiating the strategy) reads one source.
 * Mock-first for master data; instantiate hits the live backend. Paths + tags from @wispr/contracts; responses
 * unwrap the standard `{ result }` envelope.
 */
export const strategyApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStrategyTypes: build.query<IStrategyTypeOption[], void>({
      query: () => ({ url: API_ENDPOINTS.strategyTypes, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<IStrategyTypeOption[]> | IStrategyTypeOption[]) =>
        Array.isArray(res) ? res : (res?.result ?? []),
      providesTags: [{ type: API_TAGS.Strategy, id: LIST_ID }],
    }),

    getStrategyPhases: build.query<IStrategyPhase[], void>({
      query: () => ({ url: API_ENDPOINTS.strategyPhases, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<IStrategyPhase[]> | IStrategyPhase[]) =>
        Array.isArray(res) ? res : (res?.result ?? []),
      providesTags: [{ type: API_TAGS.Strategy, id: LIST_ID }],
    }),

    // Snapshot the chosen/built strategy onto the project (the capability schema owns the phases — not Core).
    // Invalidates the project's PhaseState so the strategy workspace renders the freshly-instantiated rail.
    instantiateStrategy: build.mutation<unknown, InstantiateStrategyArgs>({
      query: ({ projectId, strategyTemplateId, phases }) => ({
        url: API_ENDPOINTS.strategyInstantiate(projectId),
        method: 'POST',
        data: strategyTemplateId ? { strategyTemplateId } : { phases },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),
  }),
})

export const { useGetStrategyTypesQuery, useGetStrategyPhasesQuery, useInstantiateStrategyMutation } = strategyApi
