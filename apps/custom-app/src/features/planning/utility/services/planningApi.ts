import { baseApi } from '../../../../services/baseApi'
import { API_ENDPOINTS, API_TAGS, LIST_ID } from '@wispr/contracts'
import { cleanRequirements, reorderFeatures, visibleFeatures } from '../helpers/helpers'
import type {
  PlanningPlan,
  FeatureStatus,
  GeneratePlanInput,
  FeatureFormValues,
  ReorderDirection,
  PlanGenerationStatus,
} from '../models/model'

/**
 * Standard backend envelope (ResponseDto<T>): every body is `{ success, data, ... }`.
 * Endpoints unwrap `.data` at the boundary so components see plain domain types.
 */
interface ResponseEnvelope<T> {
  success: boolean
  data: T | null
  message?: string | null
}

/** The whole plan is invalidated as a single Feature list. */
const PLAN_TAG = { type: API_TAGS.Feature, id: LIST_ID } as const

/**
 * Planning endpoints — live against the backend via axiosBaseQuery (base URL ends in `/api`),
 * unwrapping the `ResponseDto<PlanDto>` envelope. `getPlan` returns null until a plan has been
 * generated; generation is progressive (start a job, then poll `getPlanGenerationStatus`),
 * mirroring Discovery's KB build. Every mutation returns the full plan and invalidates PLAN_TAG.
 */
export const planningApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Current plan for a project, or null if planning has not been generated yet.
    getPlan: build.query<PlanningPlan | null, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.plan(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res?.data ?? null,
      providesTags: [PLAN_TAG],
    }),

    // Progressive (re)generation: start a job, then poll getPlanGenerationStatus until completed.
    startGeneratePlan: build.mutation<PlanGenerationStatus, GeneratePlanInput>({
      query: ({ projectId, context }) => ({
        url: API_ENDPOINTS.generateFeaturesStart(projectId),
        method: 'POST',
        data: { context: context ?? '' },
      }),
      transformResponse: (res: ResponseEnvelope<PlanGenerationStatus>) => res.data as PlanGenerationStatus,
    }),

    getPlanGenerationStatus: build.query<PlanGenerationStatus, { projectId: string; jobId: string }>({
      query: ({ projectId, jobId }) => ({
        url: API_ENDPOINTS.featuresStatus(projectId, jobId),
        method: 'GET',
      }),
      transformResponse: (res: ResponseEnvelope<PlanGenerationStatus>) => res.data as PlanGenerationStatus,
    }),

    addFeature: build.mutation<PlanningPlan, { projectId: string; values: FeatureFormValues }>({
      query: ({ projectId, values }) => ({
        url: API_ENDPOINTS.features(projectId),
        method: 'POST',
        data: {
          title: values.title.trim(),
          description: values.description.trim(),
          priority: values.priority,
          complexity: values.complexity,
          functionalRequirements: cleanRequirements(values.functionalRequirements),
          nonFunctionalRequirements: cleanRequirements(values.nonFunctionalRequirements),
        },
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    updateFeature: build.mutation<
      PlanningPlan,
      { projectId: string; featureId: string; values: FeatureFormValues }
    >({
      query: ({ projectId, featureId, values }) => ({
        url: API_ENDPOINTS.feature(projectId, featureId),
        method: 'PATCH',
        data: {
          title: values.title.trim(),
          description: values.description.trim(),
          priority: values.priority,
          complexity: values.complexity,
          functionalRequirements: cleanRequirements(values.functionalRequirements),
          nonFunctionalRequirements: cleanRequirements(values.nonFunctionalRequirements),
        },
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    // "Delete" archives the feature server-side (append-only); approved features return 409.
    deleteFeature: build.mutation<PlanningPlan, { projectId: string; featureId: string }>({
      query: ({ projectId, featureId }) => ({
        url: API_ENDPOINTS.feature(projectId, featureId),
        method: 'DELETE',
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    // Up/down reorder: compute the new visible-list order from cache, then persist the full list.
    reorderFeature: build.mutation<
      PlanningPlan,
      { projectId: string; featureId: string; direction: ReorderDirection }
    >({
      async queryFn({ projectId, featureId, direction }, api, _extra, baseQuery) {
        const state = api.getState()
        const plan = planningApi.endpoints.getPlan.select(projectId)(state as never).data
        if (!plan) return { error: { status: 404, data: 'No plan to update.' } }
        const orderedIds = reorderFeatures(visibleFeatures(plan.features), featureId, direction).map((f) => f.id)
        const res = await baseQuery({
          url: API_ENDPOINTS.reorderFeatures(projectId),
          method: 'PATCH',
          data: { featureIds: orderedIds },
        })
        if (res.error) return { error: res.error }
        return { data: (res.data as ResponseEnvelope<PlanningPlan>).data as PlanningPlan }
      },
      invalidatesTags: [PLAN_TAG],
    }),

    // Persist an explicit drag-and-drop order (full visible list, by position).
    setFeatureOrder: build.mutation<PlanningPlan, { projectId: string; orderedIds: string[] }>({
      query: ({ projectId, orderedIds }) => ({
        url: API_ENDPOINTS.reorderFeatures(projectId),
        method: 'PATCH',
        data: { featureIds: orderedIds },
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    acceptSuggestion: build.mutation<PlanningPlan, { projectId: string; suggestionId: string }>({
      query: ({ projectId, suggestionId }) => ({
        url: API_ENDPOINTS.acceptSuggestion(projectId, suggestionId),
        method: 'POST',
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    dismissSuggestion: build.mutation<PlanningPlan, { projectId: string; suggestionId: string }>({
      query: ({ projectId, suggestionId }) => ({
        url: API_ENDPOINTS.dismissSuggestion(projectId, suggestionId),
        method: 'POST',
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    // AI-enhance a single feature: enrich its description + requirements.
    enhanceFeature: build.mutation<
      PlanningPlan,
      { projectId: string; featureId: string; instructions?: string }
    >({
      query: ({ projectId, featureId, instructions }) => ({
        url: API_ENDPOINTS.enhanceFeature(projectId, featureId),
        method: 'POST',
        data: { instructions: instructions ?? '' },
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    // Set a single feature's workflow status (manual approve / move / defer).
    setFeatureStatus: build.mutation<
      PlanningPlan,
      { projectId: string; featureId: string; status: FeatureStatus }
    >({
      query: ({ projectId, featureId, status }) => ({
        url: API_ENDPOINTS.feature(projectId, featureId),
        method: 'PATCH',
        data: { status },
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    // Approve the plan: backend promotes every approvable (proposed / in-progress) feature.
    approvePlan: build.mutation<PlanningPlan, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.approveFeatures(projectId), method: 'POST' }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    // Manually add a feature→feature dependency edge (ADR-0026); backend rejects cycles (409).
    addFeatureDependency: build.mutation<
      PlanningPlan,
      { projectId: string; featureId: string; dependsOn: string }
    >({
      query: ({ projectId, featureId, dependsOn }) => ({
        url: API_ENDPOINTS.featureDependencies(projectId, featureId),
        method: 'POST',
        data: { dependsOn },
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),

    // Manually remove a feature→feature dependency edge.
    removeFeatureDependency: build.mutation<
      PlanningPlan,
      { projectId: string; featureId: string; dependsOn: string }
    >({
      query: ({ projectId, featureId, dependsOn }) => ({
        url: API_ENDPOINTS.featureDependency(projectId, featureId, dependsOn),
        method: 'DELETE',
      }),
      transformResponse: (res: ResponseEnvelope<PlanningPlan>) => res.data as PlanningPlan,
      invalidatesTags: [PLAN_TAG],
    }),
  }),
})

export const {
  useGetPlanQuery,
  useStartGeneratePlanMutation,
  useLazyGetPlanGenerationStatusQuery,
  useAddFeatureMutation,
  useUpdateFeatureMutation,
  useDeleteFeatureMutation,
  useReorderFeatureMutation,
  useSetFeatureOrderMutation,
  useAcceptSuggestionMutation,
  useDismissSuggestionMutation,
  useSetFeatureStatusMutation,
  useEnhanceFeatureMutation,
  useApprovePlanMutation,
  useAddFeatureDependencyMutation,
  useRemoveFeatureDependencyMutation,
} = planningApi
