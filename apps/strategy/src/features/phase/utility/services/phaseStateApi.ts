import { api } from '@wispr/services'
import { API_ENDPOINTS, API_TAGS } from '@wispr/contracts'
import type {
  ApiEnvelope,
  PhaseStateMap,
  ProjectStatus,
  StrategyKb,
  StrategyPhaseView,
  UpdatePhaseStateInput,
} from '../models/model'

/**
 * Strategy per-phase runtime — injected into the shared @wispr/services api. The project's configured phases come
 * from @wispr/projects; this drives the live backend (the wispr.strategy module via nginx /api/strategy/…):
 * instantiate the chosen/built strategy, read/advance phase state, ingest real input documents, generate real
 * output documents (gateway agent), and sign off. The working state per phase (uploaded inputs / generated outputs
 * / additional docs / open questions / lifecycle status) flows through one PATCH endpoint (see UpdatePhaseStateInput);
 * every write returns the refreshed PhaseStateMap (or status) and invalidates the cache.
 */
export const phaseStateApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPhaseState: build.query<PhaseStateMap, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.phaseState(projectId), method: 'GET' }),
      transformResponse: (res: ApiEnvelope<PhaseStateMap>) => res?.result ?? {},
      providesTags: (_result, _error, projectId) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),

    getProjectStatus: build.query<ProjectStatus, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.strategyStatus(projectId), method: 'GET' }),
      transformResponse: (res: ApiEnvelope<ProjectStatus>) => res?.result ?? { state: 'InProgress', canSignOff: false, phases: 0, completedPhases: 0 },
      providesTags: (_result, _error, projectId) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),

    // The project's ordered phases WITH full config + progress — the capability-owned rail. The strategy module
    // (not Core) owns which phases a project has; the workspace builds both its rail and its PhaseStateMap from this.
    getProjectPhases: build.query<StrategyPhaseView[], string>({
      query: (projectId) => ({ url: API_ENDPOINTS.strategyProjectPhases(projectId), method: 'GET' }),
      transformResponse: (res: ApiEnvelope<StrategyPhaseView[]> | StrategyPhaseView[]) =>
        Array.isArray(res) ? res : (res?.result ?? []),
      providesTags: (_result, _error, projectId) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),

    // Complete / context working-state actions (upload + generate use the dedicated endpoints below).
    updatePhaseState: build.mutation<PhaseStateMap, UpdatePhaseStateInput>({
      query: ({ projectId, phaseId, action, name, fileName, fileSize, text, status, id }) => ({
        url: API_ENDPOINTS.phaseState(projectId),
        method: 'PATCH',
        data: {
          phaseId,
          action,
          ...(name !== undefined ? { name } : {}),
          ...(fileName !== undefined ? { fileName } : {}),
          ...(fileSize !== undefined ? { fileSize } : {}),
          ...(text !== undefined ? { text } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(id !== undefined ? { id } : {}),
        },
      }),
      transformResponse: (res: ApiEnvelope<PhaseStateMap>) => res?.result ?? {},
      invalidatesTags: (_result, _error, { projectId }) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),

    // Ingest a real input document for a phase slot (multipart → KC artifact.stored), then mark the slot uploaded.
    uploadPhaseInput: build.mutation<PhaseStateMap, { projectId: string; phaseId: string; slot: string; file: File }>({
      query: ({ projectId, phaseId, slot, file }) => {
        const form = new FormData()
        form.append('slot', slot)
        form.append('file', file)
        return { url: API_ENDPOINTS.strategyPhaseInput(projectId, phaseId), method: 'POST', data: form }
      },
      transformResponse: (res: ApiEnvelope<PhaseStateMap>) => res?.result ?? {},
      invalidatesTags: (_result, _error, { projectId }) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),

    // Start generating a real output document via the gateway agent as a durable async operation (Phase 10 /
    // ADR-0072) — returns the operation id the UI polls (useOperation). No cache invalidation yet: the phase only
    // changes once the operation succeeds and `finalizeGeneration` stores the document.
    generateOutput: build.mutation<{ operationId: string }, { projectId: string; phaseId: string; output: string }>({
      query: ({ projectId, phaseId, output }) => ({
        url: API_ENDPOINTS.strategyGenerate(projectId, phaseId),
        method: 'POST',
        data: { output },
      }),
      transformResponse: (res: ApiEnvelope<{ operationId: string }>) => res?.result ?? { operationId: '' },
    }),

    // The project's assembled discovery knowledge base (the 6 categories + any extras). Provides the PhaseState tag so a
    // finished KB generation (which invalidates it) refetches the KB into the UI.
    getKb: build.query<StrategyKb, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.strategyKb(projectId), method: 'GET' }),
      transformResponse: (res: ApiEnvelope<StrategyKb>) => res?.result ?? { sections: [], lastGeneratedAt: null },
      providesTags: (_result, _error, projectId) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),

    // Start building the discovery knowledge base (the 6 categories) as a durable async operation (ADR-0074) — returns
    // the operation id the UI polls (useOperation). The KB + its open questions are stored in the KC (the KB is NOT
    // shown); on success the UI invalidates PhaseState to surface the open questions. No finalize step (no doc to store).
    generateKb: build.mutation<{ operationId: string }, { projectId: string; phaseId: string }>({
      query: ({ projectId, phaseId }) => ({
        url: API_ENDPOINTS.strategyGenerateKb(projectId, phaseId),
        method: 'POST',
        data: {},
      }),
      transformResponse: (res: ApiEnvelope<{ operationId: string }>) => res?.result ?? { operationId: '' },
    }),

    // Finalize a succeeded generation operation — store the produced document + mark the output generated. Idempotent;
    // returns the refreshed PhaseStateMap and invalidates the phase cache so the rail reflects the new output.
    finalizeGeneration: build.mutation<PhaseStateMap, { projectId: string; phaseId: string; output: string; operationId: string }>({
      query: ({ projectId, phaseId, output, operationId }) => ({
        url: API_ENDPOINTS.strategyGenerateFinalize(projectId, phaseId),
        method: 'POST',
        data: { output, operationId },
      }),
      transformResponse: (res: ApiEnvelope<PhaseStateMap>) => res?.result ?? {},
      invalidatesTags: (_result, _error, { projectId }) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),

    // Upload a free-form additional document for a phase (no slot validation; bytes sent to backend).
    uploadAdditionalDoc: build.mutation<PhaseStateMap, { projectId: string; phaseId: string; file: File }>({
      query: ({ projectId, phaseId, file }) => {
        const form = new FormData()
        form.append('file', file)
        return { url: API_ENDPOINTS.strategyPhaseAdditionalDoc(projectId, phaseId), method: 'POST', data: form }
      },
      transformResponse: (res: ApiEnvelope<PhaseStateMap>) => res?.result ?? {},
      invalidatesTags: (_result, _error, { projectId }) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),

    // Executive Sign-off: complete the project once all required phases are done.
    signOffProject: build.mutation<ProjectStatus, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.strategySignOff(projectId), method: 'POST', data: {} }),
      transformResponse: (res: ApiEnvelope<ProjectStatus>) => res?.result ?? { state: 'InProgress', canSignOff: false, phases: 0, completedPhases: 0 },
      invalidatesTags: (_result, _error, projectId) => [{ type: API_TAGS.PhaseState, id: projectId }],
    }),
  }),
})

export const {
  useGetPhaseStateQuery,
  useGetProjectStatusQuery,
  useGetProjectPhasesQuery,
  useUpdatePhaseStateMutation,
  useUploadPhaseInputMutation,
  useUploadAdditionalDocMutation,
  useGenerateOutputMutation,
  useGenerateKbMutation,
  useGetKbQuery,
  useFinalizeGenerationMutation,
  useSignOffProjectMutation,
} = phaseStateApi
