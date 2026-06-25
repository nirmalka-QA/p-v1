import { baseApi } from '../../../../services/baseApi'
import { API_ENDPOINTS, API_TAGS } from '@wispr/contracts'
import type { ProjectType } from '../../../../types'
import type { AiInstructionFormat, Convention } from '../helpers/mockAiInstructions'
import type {
  TechStack,
  GeneratedCode,
  RepoConnection,
  DesignAssets,
  ImplementationSetup,
  GenerateCodeInput,
  GeneratedCodeInput,
  CodeGenerationStatus,
  StoryRepoCommit,
  UpdateTechStackInput,
  RepoFileInput,
  RepoFileContent,
  SaveRepoConfigInput,
  ConnectGithubInput,
  SaveDesignAssetsInput,
  TechnicalRequirement,
  TechnicalRequirementsInput,
  SaveTechnicalRequirementsInput,
  DevMemoryItem,
  ImplementationPlan,
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

const techStackTag = (projectId: string) => ({ type: API_TAGS.TechStack, id: projectId }) as const
const repoTag = (projectId: string) => ({ type: API_TAGS.Repo, id: projectId }) as const
const codeTag = (storyId: string) => ({ type: API_TAGS.Story, id: `CODE-${storyId}` }) as const
const designTag = (projectId: string) => ({ type: API_TAGS.Design, id: projectId }) as const
const techReqTag = (projectId: string, scope: string) =>
  ({ type: API_TAGS.TechnicalRequirements, id: `${projectId}:${scope}` }) as const
const setupTag = (projectId: string) => ({ type: API_TAGS.Setup, id: projectId }) as const

/**
 * Implementation-phase endpoints — live against the backend via axiosBaseQuery (base URL ends in
 * `/api`), unwrapping `ResponseDto<T>`. Tech stack is project-level; generated code is per story and
 * project-scoped (slugs are unique per project). Code generation is progressive (start a job, then
 * poll `getCodeGenerationStatus`), mirroring Discovery / Planning / Features (ADR-0020).
 */
export const implementationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ── Tech stack ──
    getTechStack: build.query<TechStack | null, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.techStack(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<TechStack>) => res.data ?? null,
      providesTags: (_r, _e, projectId) => [techStackTag(projectId)],
    }),

    suggestTechStack: build.mutation<TechStack, { projectId: string; type: ProjectType }>({
      query: ({ projectId, type }) => ({
        url: API_ENDPOINTS.suggestTechStack(projectId),
        method: 'POST',
        data: { type },
      }),
      transformResponse: (res: ResponseEnvelope<TechStack>) => res.data as TechStack,
      invalidatesTags: (_r, _e, { projectId }) => [techStackTag(projectId)],
    }),

    updateTechStack: build.mutation<TechStack, UpdateTechStackInput & { type?: ProjectType }>({
      query: ({ projectId, items }) => ({
        url: API_ENDPOINTS.techStack(projectId),
        method: 'PATCH',
        data: { items },
      }),
      transformResponse: (res: ResponseEnvelope<TechStack>) => res.data as TechStack,
      invalidatesTags: (_r, _e, { projectId }) => [techStackTag(projectId)],
    }),

    // ── Code generation (per story; project-scoped) ──
    getGeneratedCode: build.query<GeneratedCode | null, GeneratedCodeInput>({
      query: ({ projectId, storyId, scope }) => ({
        url: API_ENDPOINTS.generatedCode(projectId, storyId),
        method: 'GET',
        params: { scope: scope ?? 'fullstack' },
      }),
      transformResponse: (res: ResponseEnvelope<GeneratedCode>) => res.data ?? null,
      providesTags: (_r, _e, { storyId, scope }) => [codeTag(`${scope ?? 'fullstack'}:${storyId}`)],
    }),

    // Synchronous generation (kept for completeness / non-progressive callers).
    generateCode: build.mutation<GeneratedCode, GenerateCodeInput>({
      query: ({ projectId, storyId, scope }) => ({
        url: API_ENDPOINTS.generateCode(projectId, storyId),
        method: 'POST',
        params: { scope: scope ?? 'fullstack' },
      }),
      transformResponse: (res: ResponseEnvelope<GeneratedCode>) => res.data as GeneratedCode,
      invalidatesTags: (_r, _e, { storyId, scope }) => [codeTag(`${scope ?? 'fullstack'}:${storyId}`)],
    }),

    // Progressive generation: start a job, then poll getCodeGenerationStatus.
    startGenerateCode: build.mutation<CodeGenerationStatus, GenerateCodeInput & { instructions?: string }>({
      query: ({ projectId, storyId, scope, instructions }) => ({
        url: API_ENDPOINTS.generateCodeStart(projectId, storyId),
        method: 'POST',
        params: { scope: scope ?? 'fullstack' },
        data: { instructions: instructions ?? null },
      }),
      transformResponse: (res: ResponseEnvelope<CodeGenerationStatus>) => res.data as CodeGenerationStatus,
    }),

    getCodeGenerationStatus: build.query<CodeGenerationStatus, { projectId: string; jobId: string }>({
      query: ({ projectId, jobId }) => ({
        url: API_ENDPOINTS.codeGenStatus(projectId, jobId),
        method: 'GET',
      }),
      transformResponse: (res: ResponseEnvelope<CodeGenerationStatus>) => res.data as CodeGenerationStatus,
    }),

    // Real-repo path (ADR-0022): generate into the connected GitHub repo and open a PR.
    startRepoCommit: build.mutation<CodeGenerationStatus, GenerateCodeInput>({
      query: ({ projectId, storyId, scope }) => ({
        url: API_ENDPOINTS.generateToRepoStart(projectId, storyId),
        method: 'POST',
        params: { scope: scope ?? 'fullstack' },
      }),
      transformResponse: (res: ResponseEnvelope<CodeGenerationStatus>) => res.data as CodeGenerationStatus,
    }),

    // P4: iterate on the existing PR with instructions.
    iterateRepoCommit: build.mutation<CodeGenerationStatus, GenerateCodeInput & { instructions: string }>({
      query: ({ projectId, storyId, scope, instructions }) => ({
        url: API_ENDPOINTS.generateToRepoIterate(projectId, storyId),
        method: 'POST',
        params: { scope: scope ?? 'fullstack' },
        data: { instructions },
      }),
      transformResponse: (res: ResponseEnvelope<CodeGenerationStatus>) => res.data as CodeGenerationStatus,
    }),

    getRepoCommitStatus: build.query<CodeGenerationStatus, { projectId: string; jobId: string }>({
      query: ({ projectId, jobId }) => ({
        url: API_ENDPOINTS.repoCommitStatus(projectId, jobId),
        method: 'GET',
      }),
      transformResponse: (res: ResponseEnvelope<CodeGenerationStatus>) => res.data as CodeGenerationStatus,
    }),

    // ADR-0027: open the PR for the pushed branch into develop, manually from WISPR.
    openPr: build.mutation<CodeGenerationStatus, GenerateCodeInput>({
      query: ({ projectId, storyId, scope }) => ({
        url: API_ENDPOINTS.openPr(projectId, storyId),
        method: 'POST',
        params: { scope: scope ?? 'fullstack' },
      }),
      transformResponse: (res: ResponseEnvelope<CodeGenerationStatus>) => res.data as CodeGenerationStatus,
      invalidatesTags: (_r, _e, { storyId, scope }) => [codeTag(`repo:${scope ?? 'fullstack'}:${storyId}`)],
    }),

    // ADR-0027: AI implementation-plan approval gate.
    planImplementation: build.mutation<ImplementationPlan, GenerateCodeInput>({
      query: ({ projectId, storyId, scope }) => ({
        url: API_ENDPOINTS.planImplementation(projectId, storyId),
        method: 'POST',
        params: { scope: scope ?? 'fullstack' },
      }),
      transformResponse: (res: ResponseEnvelope<ImplementationPlan>) => res.data as ImplementationPlan,
      invalidatesTags: (_r, _e, { storyId, scope }) => [codeTag(`plan:${scope ?? 'fullstack'}:${storyId}`)],
    }),

    getImplementationPlan: build.query<ImplementationPlan | null, GeneratedCodeInput>({
      query: ({ projectId, storyId, scope }) => ({
        url: API_ENDPOINTS.implementationPlan(projectId, storyId),
        method: 'GET',
        params: { scope: scope ?? 'fullstack' },
      }),
      transformResponse: (res: ResponseEnvelope<ImplementationPlan>) => res.data ?? null,
      providesTags: (_r, _e, { storyId, scope }) => [codeTag(`plan:${scope ?? 'fullstack'}:${storyId}`)],
    }),

    approveImplementationPlan: build.mutation<ImplementationPlan, GenerateCodeInput>({
      query: ({ projectId, storyId, scope }) => ({
        url: API_ENDPOINTS.approveImplementationPlan(projectId, storyId),
        method: 'POST',
        params: { scope: scope ?? 'fullstack' },
      }),
      transformResponse: (res: ResponseEnvelope<ImplementationPlan>) => res.data as ImplementationPlan,
      invalidatesTags: (_r, _e, { storyId, scope }) => [codeTag(`plan:${scope ?? 'fullstack'}:${storyId}`)],
    }),

    // ADR-0027/0028: the project's development memory (decisions, migrations, summaries, deferred,
    // commits). Optional storySlug scopes it to a single story (the per-story Implementation log tab).
    getDevMemory: build.query<DevMemoryItem[], { projectId: string; kind?: string; storySlug?: string }>({
      query: ({ projectId, kind, storySlug }) => {
        const params: Record<string, string> = {}
        if (kind) params.kind = kind
        if (storySlug) params.storySlug = storySlug
        return {
          url: API_ENDPOINTS.devMemory(projectId),
          method: 'GET',
          params: Object.keys(params).length ? params : undefined,
        }
      },
      transformResponse: (res: ResponseEnvelope<DevMemoryItem[]>) => res.data ?? [],
      providesTags: (_r, _e, { projectId }) => [{ type: API_TAGS.Story, id: `DEVMEM-${projectId}` }],
    }),

    // ADR-0027: promote a deferred-work item into a new draft story (returns the new slug).
    createStoryFromDeferred: build.mutation<string, { projectId: string; devMemoryId: string }>({
      query: ({ projectId, devMemoryId }) => ({
        url: API_ENDPOINTS.createStoryFromDeferred(projectId, devMemoryId),
        method: 'POST',
      }),
      transformResponse: (res: ResponseEnvelope<string>) => res.data ?? '',
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: API_TAGS.Story, id: `DEVMEM-${projectId}` },
        { type: API_TAGS.Story, id: 'LIST' },
      ],
    }),

    // Persisted last repo generation (branch / PR / build report) for a story + scope.
    getStoryRepoCommit: build.query<StoryRepoCommit | null, GeneratedCodeInput>({
      query: ({ projectId, storyId, scope }) => ({
        url: API_ENDPOINTS.storyRepoCommit(projectId, storyId),
        method: 'GET',
        params: { scope: scope ?? 'fullstack' },
      }),
      transformResponse: (res: ResponseEnvelope<StoryRepoCommit>) => res.data ?? null,
      providesTags: (_r, _e, { storyId, scope }) => [codeTag(`repo:${scope ?? 'fullstack'}:${storyId}`)],
    }),

    // ── Repository viewer ──
    getRepo: build.query<RepoConnection | null, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.repo(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<RepoConnection>) => res.data ?? null,
      providesTags: (_r, _e, projectId) => [repoTag(projectId)],
    }),

    connectRepo: build.mutation<RepoConnection, { projectId: string; projectName: string }>({
      query: ({ projectId, projectName }) => ({
        url: API_ENDPOINTS.repo(projectId),
        method: 'POST',
        data: { projectName },
      }),
      transformResponse: (res: ResponseEnvelope<RepoConnection>) => res.data as RepoConnection,
      invalidatesTags: (_r, _e, { projectId }) => [repoTag(projectId)],
    }),

    // Connect a real GitHub repo with a PAT; returns the connection with the real file tree.
    connectGithubRepo: build.mutation<RepoConnection, ConnectGithubInput>({
      query: ({ projectId, ...body }) => ({
        url: API_ENDPOINTS.repoConnectGithub(projectId),
        method: 'POST',
        data: body,
      }),
      transformResponse: (res: ResponseEnvelope<RepoConnection>) => res.data as RepoConnection,
      invalidatesTags: (_r, _e, { projectId }) => [repoTag(projectId)],
    }),

    getRepoFile: build.query<RepoFileContent, RepoFileInput>({
      query: ({ projectId, path }) => ({
        url: API_ENDPOINTS.repoFile(projectId),
        method: 'GET',
        params: { path },
      }),
      transformResponse: (res: ResponseEnvelope<RepoFileContent>) => res.data as RepoFileContent,
    }),

    // Code tab: list branches, and switch the viewed branch (re-syncs the tree from origin).
    getRepoBranches: build.query<string[], string>({
      query: (projectId) => ({ url: API_ENDPOINTS.repoBranches(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<string[]>) => res.data ?? [],
      providesTags: (_r, _e, projectId) => [repoTag(projectId)],
    }),

    switchRepoBranch: build.mutation<RepoConnection, { projectId: string; branch: string }>({
      query: ({ projectId, branch }) => ({
        url: API_ENDPOINTS.repoBranch(projectId),
        method: 'POST',
        data: { branch },
      }),
      transformResponse: (res: ResponseEnvelope<RepoConnection>) => res.data as RepoConnection,
      invalidatesTags: (_r, _e, { projectId }) => [repoTag(projectId)],
    }),

    // Persist full repository configuration from the setup wizard / repo page.
    saveRepoConfig: build.mutation<RepoConnection, SaveRepoConfigInput>({
      query: (input) => ({
        url: API_ENDPOINTS.repo(input.projectId),
        method: 'PATCH',
        data: {
          projectName: input.projectName,
          provider: input.provider,
          organisation: input.organisation,
          repoName: input.repoName,
          defaultBranch: input.defaultBranch,
          isMonorepo: input.isMonorepo,
          frontendPath: input.frontendPath,
          backendPath: input.backendPath,
        },
      }),
      transformResponse: (res: ResponseEnvelope<RepoConnection>) => res.data as RepoConnection,
      invalidatesTags: (_r, _e, { projectId }) => [repoTag(projectId)],
    }),

    // ── Design system ──
    getDesignAssets: build.query<DesignAssets | null, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.designAssets(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<DesignAssets>) => res.data ?? null,
      providesTags: (_r, _e, projectId) => [designTag(projectId)],
    }),

    saveDesignAssets: build.mutation<DesignAssets, SaveDesignAssetsInput>({
      query: ({ projectId, patch }) => ({
        url: API_ENDPOINTS.designAssets(projectId),
        method: 'PATCH',
        data: patch,
      }),
      transformResponse: (res: ResponseEnvelope<DesignAssets>) => res.data as DesignAssets,
      invalidatesTags: (_r, _e, { projectId }) => [designTag(projectId)],
    }),

    // Generate the AI instruction file from the current tech stack, repo, and design notes.
    generateAiInstructions: build.mutation<
      DesignAssets,
      { projectId: string; projectName: string; format: AiInstructionFormat; conventions: Convention[] }
    >({
      query: ({ projectId, projectName, format, conventions }) => ({
        url: API_ENDPOINTS.aiInstructions(projectId),
        method: 'POST',
        data: { projectName, format, conventions },
      }),
      transformResponse: (res: ResponseEnvelope<DesignAssets>) => res.data as DesignAssets,
      invalidatesTags: (_r, _e, { projectId }) => [designTag(projectId)],
    }),

    // ── Technical requirements (project technical specification, per scope; ADR-0024) ──
    getTechnicalRequirements: build.query<TechnicalRequirement[], TechnicalRequirementsInput>({
      query: ({ projectId, scope }) => ({
        url: API_ENDPOINTS.technicalRequirements(projectId),
        method: 'GET',
        params: { scope },
      }),
      transformResponse: (res: ResponseEnvelope<TechnicalRequirement[]>) => res.data ?? [],
      providesTags: (_r, _e, { projectId, scope }) => [techReqTag(projectId, scope)],
    }),

    saveTechnicalRequirements: build.mutation<TechnicalRequirement[], SaveTechnicalRequirementsInput>({
      query: ({ projectId, scope, items }) => ({
        url: API_ENDPOINTS.technicalRequirements(projectId),
        method: 'PUT',
        data: { scope, items },
      }),
      transformResponse: (res: ResponseEnvelope<TechnicalRequirement[]>) => res.data ?? [],
      invalidatesTags: (_r, _e, { projectId, scope }) => [techReqTag(projectId, scope)],
    }),

    generateTechnicalRequirements: build.mutation<TechnicalRequirement[], TechnicalRequirementsInput>({
      query: ({ projectId, scope }) => ({
        url: API_ENDPOINTS.generateTechnicalRequirements(projectId),
        method: 'POST',
        params: { scope },
      }),
      transformResponse: (res: ResponseEnvelope<TechnicalRequirement[]>) => res.data ?? [],
      invalidatesTags: (_r, _e, { projectId, scope }) => [techReqTag(projectId, scope)],
    }),

    // ── Setup wizard state ──
    getSetupState: build.query<ImplementationSetup, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.setupState(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<ImplementationSetup>) => res.data as ImplementationSetup,
      providesTags: (_r, _e, projectId) => [setupTag(projectId)],
    }),

    dismissWizard: build.mutation<ImplementationSetup, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.setupState(projectId), method: 'PATCH' }),
      transformResponse: (res: ResponseEnvelope<ImplementationSetup>) => res.data as ImplementationSetup,
      invalidatesTags: (_r, _e, projectId) => [setupTag(projectId)],
    }),

    // ── Initial scaffold (ADR-0025): scaffold the empty project into the repo and push to 'develop' ──
    startScaffold: build.mutation<CodeGenerationStatus, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.scaffoldStart(projectId), method: 'POST' }),
      transformResponse: (res: ResponseEnvelope<CodeGenerationStatus>) => res.data as CodeGenerationStatus,
      // Scaffold completion flips scaffold_status → invalidate setup state so guardrails refresh.
      invalidatesTags: (_r, _e, projectId) => [setupTag(projectId)],
    }),

    getScaffoldStatus: build.query<CodeGenerationStatus, { projectId: string; jobId: string }>({
      query: ({ projectId, jobId }) => ({ url: API_ENDPOINTS.scaffoldStatus(projectId, jobId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<CodeGenerationStatus>) => res.data as CodeGenerationStatus,
    }),
  }),
})

export const {
  useGetTechStackQuery,
  useSuggestTechStackMutation,
  useUpdateTechStackMutation,
  useGetGeneratedCodeQuery,
  useGenerateCodeMutation,
  useStartGenerateCodeMutation,
  useLazyGetCodeGenerationStatusQuery,
  useStartRepoCommitMutation,
  useIterateRepoCommitMutation,
  useLazyGetRepoCommitStatusQuery,
  useOpenPrMutation,
  usePlanImplementationMutation,
  useGetImplementationPlanQuery,
  useApproveImplementationPlanMutation,
  useGetDevMemoryQuery,
  useCreateStoryFromDeferredMutation,
  useGetStoryRepoCommitQuery,
  useGetTechnicalRequirementsQuery,
  useSaveTechnicalRequirementsMutation,
  useGenerateTechnicalRequirementsMutation,
  useGetRepoQuery,
  useConnectRepoMutation,
  useGetRepoFileQuery,
  useGetRepoBranchesQuery,
  useSwitchRepoBranchMutation,
  useSaveRepoConfigMutation,
  useConnectGithubRepoMutation,
  useGetDesignAssetsQuery,
  useSaveDesignAssetsMutation,
  useGenerateAiInstructionsMutation,
  useGetSetupStateQuery,
  useDismissWizardMutation,
  useStartScaffoldMutation,
  useLazyGetScaffoldStatusQuery,
} = implementationApi
