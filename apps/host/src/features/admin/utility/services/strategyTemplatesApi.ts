import { api } from '@wispr/services'
import { API_ENDPOINTS, API_TAGS, LIST_ID } from '@wispr/contracts'
import { mapTemplate } from '../helpers/strategyTemplate'
import type {
  ApiEnvelope,
  IStrategyTemplate,
  IStrategyTemplatesResponse,
  SaveTemplateInput,
  StrategyTemplate,
} from '../models/strategyTemplate'

/** Maps the editor draft to the create/update request body the backend expects. */
function toBody(input: SaveTemplateInput) {
  const { draft } = input
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    phases: draft.phases.map((phase, ordinal) => ({
      name: phase.name.trim(),
      description: phase.description.trim(),
      mandatory: phase.mandatory,
      ordinal,
      inputs: phase.inputs
        .filter((s) => s.name.trim())
        .map((s, i) => ({
          name: s.name.trim(),
          mandatory: Boolean(s.mandatory),
          documentTypes: s.documentTypes,
          ordinal: i,
        })),
      outputs: phase.outputs
        .filter((s) => s.name.trim())
        .map((s, i) => ({
          name: s.name.trim(),
          documentTypes: s.documentTypes,
          prompt: (s.prompt ?? '').trim(),
          ordinal: i,
        })),
    })),
  }
}

/**
 * Project-type registry → Strategy template management endpoints, injected into
 * the shared @wispr/services api (one cache). Host-only (the registry lives in the
 * platformAdmin console). Tenant templates are fully editable; system templates
 * are read-only and can only be duplicated. Mock-first (registerStrategyTemplatesMockRoutes)
 * until the strategy module's StrategyTemplateController is wired live.
 */
export const strategyTemplatesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStrategyTemplates: build.query<StrategyTemplate[], void>({
      query: () => ({ url: API_ENDPOINTS.registryStrategyTemplates, method: 'GET' }),
      transformResponse: (
        res: ApiEnvelope<IStrategyTemplatesResponse> | IStrategyTemplatesResponse,
      ): StrategyTemplate[] => {
        const data = (res && 'result' in res ? res.result : res) as
          | IStrategyTemplatesResponse
          | undefined
        return (data?.templates ?? []).map(mapTemplate)
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((t) => ({ type: API_TAGS.StrategyTemplate, id: t.id })),
              { type: API_TAGS.StrategyTemplate, id: LIST_ID },
            ]
          : [{ type: API_TAGS.StrategyTemplate, id: LIST_ID }],
    }),

    createStrategyTemplate: build.mutation<StrategyTemplate, SaveTemplateInput>({
      query: (input) => ({
        url: API_ENDPOINTS.registryStrategyTemplates,
        method: 'POST',
        data: toBody(input),
      }),
      transformResponse: (res: ApiEnvelope<IStrategyTemplate> | IStrategyTemplate) =>
        mapTemplate((res && 'result' in res ? res.result : res) as IStrategyTemplate),
      invalidatesTags: [{ type: API_TAGS.StrategyTemplate, id: LIST_ID }],
    }),

    updateStrategyTemplate: build.mutation<StrategyTemplate, SaveTemplateInput>({
      query: (input) => ({
        url: API_ENDPOINTS.registryStrategyTemplate(input.id ?? 0),
        method: 'PUT',
        data: toBody(input),
      }),
      transformResponse: (res: ApiEnvelope<IStrategyTemplate> | IStrategyTemplate) =>
        mapTemplate((res && 'result' in res ? res.result : res) as IStrategyTemplate),
      invalidatesTags: (_r, _e, input) => [
        { type: API_TAGS.StrategyTemplate, id: input.id ?? LIST_ID },
        { type: API_TAGS.StrategyTemplate, id: LIST_ID },
      ],
    }),

    duplicateStrategyTemplate: build.mutation<StrategyTemplate, number>({
      query: (id) => ({
        url: API_ENDPOINTS.registryStrategyTemplateDuplicate(id),
        method: 'POST',
      }),
      transformResponse: (res: ApiEnvelope<IStrategyTemplate> | IStrategyTemplate) =>
        mapTemplate((res && 'result' in res ? res.result : res) as IStrategyTemplate),
      invalidatesTags: [{ type: API_TAGS.StrategyTemplate, id: LIST_ID }],
    }),

    deleteStrategyTemplate: build.mutation<void, number>({
      query: (id) => ({
        url: API_ENDPOINTS.registryStrategyTemplate(id),
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: API_TAGS.StrategyTemplate, id },
        { type: API_TAGS.StrategyTemplate, id: LIST_ID },
      ],
    }),
  }),
})

export const {
  useGetStrategyTemplatesQuery,
  useCreateStrategyTemplateMutation,
  useUpdateStrategyTemplateMutation,
  useDuplicateStrategyTemplateMutation,
  useDeleteStrategyTemplateMutation,
} = strategyTemplatesApi
