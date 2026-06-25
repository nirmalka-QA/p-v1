import { baseApi } from '../../../../services/baseApi'
import { API_ENDPOINTS, API_TAGS, LIST_ID } from '@wispr/contracts'
import type {
  Story,
  StoryStatus,
  StoryFormValues,
  StoryEffort,
  EnhanceStoryInput,
  StoryGenerationStatus,
  StartGenerateStoriesInput,
  StoryGenerationPlan,
} from '../models/model'
import type { DependencyAnalysis } from '../../../../types'

/**
 * Standard backend envelope (ResponseDto<T>): every body is `{ success, data, ... }`.
 * Endpoints unwrap `.data` at the boundary so components see plain domain types.
 */
interface ResponseEnvelope<T> {
  success: boolean
  data: T | null
  message?: string | null
}

const STORY_TAG = { type: API_TAGS.Story, id: LIST_ID } as const

const clean = (items: string[]): string[] => items.map((s) => s.trim()).filter(Boolean)

/** Maps validated form values onto the backend create/update body. */
function toStoryBody(values: StoryFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    asA: values.asA.trim(),
    iWant: values.iWant.trim(),
    soThat: values.soThat.trim(),
    // Enterprise-grade story detail (ADR-0033).
    background: values.background.trim(),
    epic: values.epic.trim() || undefined,
    version: values.version.trim() || '1.0',
    assumptions: clean(values.assumptions),
    navigationFlow: {
      entryPoint: values.navigationFlow.entryPoint.trim(),
      happyPath: clean(values.navigationFlow.happyPath),
      alternatePaths: clean(values.navigationFlow.alternatePaths),
      exceptionPaths: clean(values.navigationFlow.exceptionPaths),
    },
    components: values.components
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(), type: c.type.trim(), defaultState: c.defaultState.trim(),
        editable: c.editable, notes: c.notes.trim(),
      })),
    validationRules: values.validationRules
      .filter((r) => r.field.trim())
      .map((r) => ({
        field: r.field.trim(), dataType: r.dataType.trim(), required: r.required,
        min: r.min.trim(), max: r.max.trim(), format: r.format.trim(),
        errorMessage: r.errorMessage.trim(), validationTiming: r.validationTiming, serverSideRule: r.serverSideRule.trim(),
      })),
    acceptanceCriteria: values.acceptanceCriteria
      .filter((c) => c.title.trim() || c.given.trim() || c.when.trim() || c.then.trim())
      .map((c) => ({
        type: c.type || 'scenario', title: c.title.trim(),
        given: c.given.trim(), when: c.when.trim(), then: c.then.trim(),
      })),
    effort: Number(values.effort) as StoryEffort,
    status: values.status,
    assignee: values.assignee.trim() || undefined,
    dependencies: values.dependencies,
  }
}

/**
 * Features-phase endpoints — live against the backend via axiosBaseQuery (base URL ends in
 * `/api`), unwrapping `ResponseDto<Story[]>`. Stories are project-wide so dependencies and impact
 * span features. Generation is progressive (start a job, then poll `getStoriesGenerationStatus`),
 * mirroring Discovery / Planning. Every mutation returns the full project story list and
 * invalidates STORY_TAG.
 */
export const featuresApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStories: build.query<Story[], string>({
      query: (projectId) => ({ url: API_ENDPOINTS.stories(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<Story[]>) => res.data ?? [],
      providesTags: [STORY_TAG],
    }),

    // Progressive generation: start a job (given featureIds, or all approved features), then poll.
    startGenerateStories: build.mutation<StoryGenerationStatus, StartGenerateStoriesInput>({
      query: ({ projectId, featureIds, context }) => ({
        url: API_ENDPOINTS.generateStoriesStart(projectId),
        method: 'POST',
        data: { featureIds: featureIds ?? [], context: context ?? '' },
      }),
      transformResponse: (res: ResponseEnvelope<StoryGenerationStatus>) => res.data as StoryGenerationStatus,
    }),

    getStoriesGenerationStatus: build.query<StoryGenerationStatus, { projectId: string; jobId: string }>({
      query: ({ projectId, jobId }) => ({
        url: API_ENDPOINTS.storiesGenStatus(projectId, jobId),
        method: 'GET',
      }),
      transformResponse: (res: ResponseEnvelope<StoryGenerationStatus>) => res.data as StoryGenerationStatus,
    }),

    // Feature-by-feature generation: get the ordered target features, then generate per feature so
    // each feature's stories persist and are reviewable while the next generates.
    getStoriesPlan: build.mutation<StoryGenerationPlan, StartGenerateStoriesInput>({
      query: ({ projectId, featureIds }) => ({
        url: API_ENDPOINTS.generateStoriesPlan(projectId),
        method: 'POST',
        data: { featureIds: featureIds ?? [] },
      }),
      transformResponse: (res: ResponseEnvelope<StoryGenerationPlan>) => res.data as StoryGenerationPlan,
    }),

    generateFeatureStories: build.mutation<Story[], { projectId: string; featureId: string; context?: string }>({
      query: ({ projectId, featureId, context }) => ({
        url: API_ENDPOINTS.generateFeatureStories(projectId, featureId),
        method: 'POST',
        data: { context: context ?? '' },
      }),
      transformResponse: (res: ResponseEnvelope<Story[]>) => res.data ?? [],
      invalidatesTags: [STORY_TAG],
    }),

    addStory: build.mutation<
      Story[],
      { projectId: string; featureId: string; values: StoryFormValues }
    >({
      query: ({ projectId, featureId, values }) => ({
        url: API_ENDPOINTS.featureStories(projectId, featureId),
        method: 'POST',
        data: toStoryBody(values),
      }),
      transformResponse: (res: ResponseEnvelope<Story[]>) => res.data ?? [],
      invalidatesTags: [STORY_TAG],
    }),

    updateStory: build.mutation<
      Story[],
      { projectId: string; storyId: string; values: StoryFormValues }
    >({
      query: ({ projectId, storyId, values }) => ({
        url: API_ENDPOINTS.story(projectId, storyId),
        method: 'PATCH',
        data: toStoryBody(values),
      }),
      transformResponse: (res: ResponseEnvelope<Story[]>) => res.data ?? [],
      invalidatesTags: [STORY_TAG],
    }),

    // "Delete" archives the story server-side (append-only); retained as AI context.
    archiveStory: build.mutation<Story[], { projectId: string; storyId: string }>({
      query: ({ projectId, storyId }) => ({
        url: API_ENDPOINTS.story(projectId, storyId),
        method: 'DELETE',
      }),
      transformResponse: (res: ResponseEnvelope<Story[]>) => res.data ?? [],
      invalidatesTags: [STORY_TAG],
    }),

    // Set status for one or many stories (drives "Mark Ready" and the bulk action).
    setStoriesStatus: build.mutation<
      Story[],
      { projectId: string; storyIds: string[]; status: StoryStatus }
    >({
      query: ({ projectId, storyIds, status }) => ({
        url: API_ENDPOINTS.setStoriesStatus(projectId),
        method: 'PATCH',
        data: { storyIds, status },
      }),
      transformResponse: (res: ResponseEnvelope<Story[]>) => res.data ?? [],
      invalidatesTags: [STORY_TAG],
    }),

    dismissImpact: build.mutation<Story[], { projectId: string; storyId: string }>({
      query: ({ projectId, storyId }) => ({
        url: API_ENDPOINTS.dismissStoryImpact(projectId, storyId),
        method: 'POST',
      }),
      transformResponse: (res: ResponseEnvelope<Story[]>) => res.data ?? [],
      invalidatesTags: [STORY_TAG],
    }),

    // AI-enhance a story: enrich its description, acceptance criteria, blockers and risks.
    enhanceStory: build.mutation<Story[], EnhanceStoryInput>({
      query: ({ projectId, storyId, instructions }) => ({
        url: API_ENDPOINTS.enhanceStoryApi(projectId, storyId),
        method: 'POST',
        data: { instructions: instructions ?? '' },
      }),
      transformResponse: (res: ResponseEnvelope<Story[]>) => res.data ?? [],
      invalidatesTags: [STORY_TAG],
    }),

    // AI dependency analysis (ADR-0026): advisory suggestions (missing edges, cycles, order).
    analyzeDependencies: build.mutation<DependencyAnalysis, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.analyzeDependencies(projectId), method: 'POST' }),
      transformResponse: (res: ResponseEnvelope<DependencyAnalysis>) =>
        res.data ?? { suggestions: [], cycles: [], order: [] },
    }),

    // Reject a suggested/applied dependency edge (story or feature) so it is not suggested again
    // (ADR-0026); also clears the edge if applied. Invalidates stories + the plan so both refresh.
    rejectDependency: build.mutation<
      boolean,
      { projectId: string; kind: 'story' | 'feature'; source: string; dependsOn: string }
    >({
      query: ({ projectId, kind, source, dependsOn }) => ({
        url: API_ENDPOINTS.rejectDependency(projectId),
        method: 'POST',
        data: { kind, source, dependsOn },
      }),
      transformResponse: (res: ResponseEnvelope<boolean>) => res.data ?? false,
      invalidatesTags: [STORY_TAG, { type: API_TAGS.Feature, id: LIST_ID }],
    }),
  }),
})

export const {
  useGetStoriesQuery,
  useStartGenerateStoriesMutation,
  useLazyGetStoriesGenerationStatusQuery,
  useGetStoriesPlanMutation,
  useGenerateFeatureStoriesMutation,
  useAddStoryMutation,
  useUpdateStoryMutation,
  useArchiveStoryMutation,
  useSetStoriesStatusMutation,
  useDismissImpactMutation,
  useEnhanceStoryMutation,
  useAnalyzeDependenciesMutation,
  useRejectDependencyMutation,
} = featuresApi
