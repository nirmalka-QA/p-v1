import { api } from '@wispr/services'
import {
  API_ENDPOINTS,
  API_TAGS,
  LIST_ID,
  DEFAULT_PAGE_NUMBER,
  DEFAULT_PAGE_SIZE,
} from '@wispr/contracts'
import { mapProject, toCreateProjectBody, toUpdateProjectBody } from './helpers'
import type {
  Project,
  IProjects,
  IProjectType,
  IProjectTypeCatalogEntry,
  IProjectsListRequest,
  IProjectsListResponse,
  PaginatedProjects,
  CreateProjectInput,
  CreateProjectResult,
  ProjectApiResponse,
  ApiEnvelope,
} from './model'

/**
 * Projects endpoints — injected into the shared @wispr/services api (one cache).
 * Paths + tag types come from @wispr/contracts; responses are normalised via
 * mapProject. Shared by the host (list/creation) and custom-app (resolution).
 */
export const projectsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<PaginatedProjects, IProjectsListRequest | void>({
      query: (arg) => ({
        url: API_ENDPOINTS.projectsList,
        method: 'POST',
        data: {
          pageNumber: DEFAULT_PAGE_NUMBER,
          pageSize: DEFAULT_PAGE_SIZE,
          q: '',
          ...(arg ?? {}),
        },
      }),
      transformResponse: (
        res: ApiEnvelope<IProjectsListResponse> | IProjectsListResponse,
      ): PaginatedProjects => {
        const data = (res && 'result' in res ? res.result : res) as IProjectsListResponse | undefined
        return {
          projects: (data?.projects ?? []).map(mapProject),
          totalCount: data?.totalCount ?? 0,
          pageNumber: data?.pageNumber ?? DEFAULT_PAGE_NUMBER,
          pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
          totalPages: data?.totalPages ?? 0,
          hasMore: data?.hasMore ?? false,
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.projects.map((p) => ({ type: API_TAGS.Project, id: p.id })),
              { type: API_TAGS.Project, id: LIST_ID },
            ]
          : [{ type: API_TAGS.Project, id: LIST_ID }],
    }),

    getProjectTypes: build.query<IProjectType[], void>({
      query: () => ({ url: API_ENDPOINTS.projectTypes, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<IProjectType[]> | IProjectType[]) =>
        Array.isArray(res) ? res : (res?.result ?? []),
      providesTags: [{ type: API_TAGS.ProjectType, id: LIST_ID }],
    }),

    // Federation project-type master data (drives the create wizard's type picker).
    getProjectTypeCatalog: build.query<IProjectTypeCatalogEntry[], void>({
      query: () => ({ url: API_ENDPOINTS.projectTypeCatalog, method: 'GET' }),
      transformResponse: (
        res: ApiEnvelope<IProjectTypeCatalogEntry[]> | IProjectTypeCatalogEntry[],
      ) => (Array.isArray(res) ? res : (res?.result ?? [])),
      providesTags: [{ type: API_TAGS.ProjectType, id: LIST_ID }],
    }),

    getProject: build.query<Project, string>({
      query: (id) => ({ url: API_ENDPOINTS.project(id), method: 'GET' }),
      transformResponse: (res: ApiEnvelope<IProjects> | IProjects) =>
        mapProject('result' in res ? res.result : res),
      providesTags: (_result, _error, id) => [{ type: API_TAGS.Project, id }],
    }),

    createProject: build.mutation<CreateProjectResult, CreateProjectInput>({
      query: (input) => ({
        url: API_ENDPOINTS.projects,
        method: 'POST',
        data: toCreateProjectBody(input),
      }),
      transformResponse: (res: ProjectApiResponse): CreateProjectResult => ({
        projectId: String(res.result.projectId),
        ...(res.result.warning !== undefined ? { warning: res.result.warning } : {}),
      }),
      invalidatesTags: [{ type: API_TAGS.Project, id: LIST_ID }],
    }),

    updateProject: build.mutation<Project, { id: string; patch: Partial<Project> }>({
      query: ({ id, patch }) => ({
        url: API_ENDPOINTS.project(id),
        method: 'PATCH',
        data: toUpdateProjectBody(patch),
      }),
      transformResponse: (res: ApiEnvelope<IProjects> | IProjects) =>
        mapProject('result' in res ? res.result : res),
      invalidatesTags: (_result, _error, { id }) => [
        { type: API_TAGS.Project, id },
        { type: API_TAGS.Project, id: LIST_ID },
      ],
    }),

    // Hard-deletes the project and cascades server-side (Core orchestration, ADR-0070): module data is always
    // purged; the Knowledge Base + uploaded artifacts are purged unless `keepKnowledge` is set. External
    // connections (e.g. the GitHub repo) are not touched.
    deleteProject: build.mutation<void, { id: string; keepKnowledge?: boolean }>({
      query: ({ id, keepKnowledge }) => ({
        url: `${API_ENDPOINTS.project(id)}${keepKnowledge ? '?keepKnowledge=true' : ''}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: API_TAGS.Project, id },
        { type: API_TAGS.Project, id: LIST_ID },
      ],
    }),
  }),
})

export const {
  useGetProjectsQuery,
  useGetProjectTypesQuery,
  useGetProjectTypeCatalogQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi
