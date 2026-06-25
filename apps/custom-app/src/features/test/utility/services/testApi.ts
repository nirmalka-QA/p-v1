import { baseApi } from '../../../../services/baseApi'
import { API_ENDPOINTS, API_TAGS, LIST_ID } from '@wispr/contracts'
import type {
  TestCase,
  TestStatus,
  TestCaseFormValues,
  GenerateTestsInput,
  TestGenerationStatus,
} from '../models/model'

const TEST_TAG = { type: API_TAGS.TestCase, id: LIST_ID } as const

/**
 * Standard backend envelope (ResponseDto<T>): every body is `{ success, data, ... }`.
 * Endpoints unwrap `.data` at the boundary so components see plain domain types.
 */
interface ResponseEnvelope<T> {
  success: boolean
  data: T | null
  message?: string | null
}

const clean = (items: string[]): string[] => items.map((s) => s.trim()).filter(Boolean)

/** Maps validated form values onto the backend create/update body. */
function toBody(values: TestCaseFormValues) {
  return {
    title: values.title.trim(),
    type: values.type,
    steps: clean(values.steps),
    expectedResult: values.expectedResult.trim(),
    status: values.status,
  }
}

/**
 * Test-phase endpoints (ADR-0028) — live against the backend via axiosBaseQuery (base URL ends in
 * `/api`), unwrapping `ResponseDto<TestCase[]>`. Test cases are project-wide and keyed to a story
 * slug; AI generation is synchronous. Every mutation returns the full project test-case list and
 * invalidates TEST_TAG.
 */
export const testApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTestCases: build.query<TestCase[], string>({
      query: (projectId) => ({ url: API_ENDPOINTS.testsList(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<TestCase[]>) => res.data ?? [],
      providesTags: [TEST_TAG],
    }),

    // AI-generate (append) test cases for a story — synchronous; degrades to stub data server-side.
    generateTests: build.mutation<TestCase[], GenerateTestsInput>({
      query: ({ projectId, storyId, context }) => ({
        url: API_ENDPOINTS.generateTests(projectId, storyId),
        method: 'POST',
        data: { context: context ?? '' },
      }),
      transformResponse: (res: ResponseEnvelope<TestCase[]>) => res.data ?? [],
      invalidatesTags: [TEST_TAG],
    }),

    // Progressive AI generation: start a job, then poll getTestGenerationStatus until completed,
    // rendering live per-step progress (mirrors Discovery's KB build). No invalidatesTags here — the
    // job persists cases only on completion, so the caller invalidates TEST_TAG once it finishes.
    startGenerateTests: build.mutation<TestGenerationStatus, GenerateTestsInput>({
      query: ({ projectId, storyId, context }) => ({
        url: API_ENDPOINTS.generateTestsStart(projectId, storyId),
        method: 'POST',
        data: { context: context ?? '' },
      }),
      transformResponse: (res: ResponseEnvelope<TestGenerationStatus>) => res.data as TestGenerationStatus,
    }),

    getTestGenerationStatus: build.query<TestGenerationStatus, { projectId: string; jobId: string }>({
      query: ({ projectId, jobId }) => ({
        url: API_ENDPOINTS.testsGenStatus(projectId, jobId),
        method: 'GET',
      }),
      transformResponse: (res: ResponseEnvelope<TestGenerationStatus>) => res.data as TestGenerationStatus,
    }),

    addTestCase: build.mutation<
      TestCase[],
      { projectId: string; storyId: string; values: TestCaseFormValues }
    >({
      query: ({ projectId, storyId, values }) => ({
        url: API_ENDPOINTS.storyTests(projectId, storyId),
        method: 'POST',
        data: toBody(values),
      }),
      transformResponse: (res: ResponseEnvelope<TestCase[]>) => res.data ?? [],
      invalidatesTags: [TEST_TAG],
    }),

    updateTestCase: build.mutation<
      TestCase[],
      { projectId: string; testId: string; values: TestCaseFormValues }
    >({
      query: ({ projectId, testId, values }) => ({
        url: API_ENDPOINTS.test(projectId, testId),
        method: 'PATCH',
        data: toBody(values),
      }),
      transformResponse: (res: ResponseEnvelope<TestCase[]>) => res.data ?? [],
      invalidatesTags: [TEST_TAG],
    }),

    // Manual status toggle: Pending → Pass / Fail (only the status field).
    setTestStatus: build.mutation<
      TestCase[],
      { projectId: string; testId: string; status: TestStatus }
    >({
      query: ({ projectId, testId, status }) => ({
        url: API_ENDPOINTS.test(projectId, testId),
        method: 'PATCH',
        data: { status },
      }),
      transformResponse: (res: ResponseEnvelope<TestCase[]>) => res.data ?? [],
      invalidatesTags: [TEST_TAG],
    }),

    deleteTestCase: build.mutation<TestCase[], { projectId: string; testId: string }>({
      query: ({ projectId, testId }) => ({
        url: API_ENDPOINTS.test(projectId, testId),
        method: 'DELETE',
      }),
      transformResponse: (res: ResponseEnvelope<TestCase[]>) => res.data ?? [],
      invalidatesTags: [TEST_TAG],
    }),
  }),
})

export const {
  useGetTestCasesQuery,
  useGenerateTestsMutation,
  useStartGenerateTestsMutation,
  useLazyGetTestGenerationStatusQuery,
  useAddTestCaseMutation,
  useUpdateTestCaseMutation,
  useSetTestStatusMutation,
  useDeleteTestCaseMutation,
} = testApi
