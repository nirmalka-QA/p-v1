import { api } from '@wispr/services'
import {
  API_ENDPOINTS,
  API_TAGS,
  LIST_ID,
  DEFAULT_PAGE_NUMBER,
  DEFAULT_PAGE_SIZE,
} from '@wispr/contracts'
import { mapWorkspace, toCreateWorkspaceBody } from '../helpers/helpers'
import type {
  Workspace,
  WorkspaceListItem,
  ApiEnvelope,
  IWorkspace,
  IWorkspacesListRequest,
  IWorkspacesListResponse,
  PaginatedWorkspaces,
  CreateWorkspaceInput,
  CreateWorkspaceResult,
  WorkspaceApiResponse,
  UpdateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  RemoveMemberInput,
  UploadArtifactInput,
  DeleteArtifactInput,
} from '../models/model'

/**
 * Workspaces endpoints — injected into the shared @wispr/services api (one cache).
 * Defined in the host feature (workspaces are host-only); paths + tag types come
 * from @wispr/contracts; responses are normalised via mapWorkspace.
 */
export const workspacesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getWorkspaces: build.query<PaginatedWorkspaces, IWorkspacesListRequest | void>({
      query: (arg) => ({
        url: API_ENDPOINTS.workspacesList,
        method: 'POST',
        data: {
          pageNumber: DEFAULT_PAGE_NUMBER,
          pageSize: DEFAULT_PAGE_SIZE,
          q: '',
          ...(arg ?? {}),
        },
      }),
      transformResponse: (
        res: ApiEnvelope<IWorkspacesListResponse> | IWorkspacesListResponse,
      ): PaginatedWorkspaces => {
        const data = (res && 'result' in res ? res.result : res) as
          | IWorkspacesListResponse
          | undefined
        return {
          workspaces: (data?.workspaces ?? []).map(
            (item): WorkspaceListItem => ({
              ...mapWorkspace(item),
              projectCount: item.projectCount,
              typeCounts: item.typeCounts,
            }),
          ),
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
              ...result.workspaces.map((w) => ({ type: API_TAGS.Workspace, id: w.id })),
              { type: API_TAGS.Workspace, id: LIST_ID },
            ]
          : [{ type: API_TAGS.Workspace, id: LIST_ID }],
    }),

    getWorkspace: build.query<Workspace, string>({
      query: (id) => ({ url: API_ENDPOINTS.workspace(id), method: 'GET' }),
      transformResponse: (res: ApiEnvelope<IWorkspace> | IWorkspace) =>
        mapWorkspace('result' in res ? res.result : res),
      providesTags: (_result, _error, id) => [{ type: API_TAGS.Workspace, id }],
    }),

    createWorkspace: build.mutation<CreateWorkspaceResult, CreateWorkspaceInput>({
      query: (input) => ({
        url: API_ENDPOINTS.workspaces,
        method: 'POST',
        data: toCreateWorkspaceBody(input),
      }),
      transformResponse: (res: WorkspaceApiResponse): CreateWorkspaceResult => ({
        workspaceId: String(res.result.workspaceId),
      }),
      invalidatesTags: [{ type: API_TAGS.Workspace, id: LIST_ID }],
    }),

    // General + Instructions settings tabs. Body uses the API's field names.
    updateWorkspace: build.mutation<void, UpdateWorkspaceInput>({
      query: ({ id, ...patch }) => ({
        url: API_ENDPOINTS.workspace(id),
        method: 'PATCH',
        data: {
          ...(patch.name !== undefined ? { workspaceName: patch.name } : {}),
          ...(patch.description !== undefined ? { workspaceDescription: patch.description } : {}),
          ...(patch.instructions !== undefined ? { instructions: patch.instructions } : {}),
        },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: API_TAGS.Workspace, id },
        { type: API_TAGS.Workspace, id: LIST_ID },
      ],
    }),

    // Danger zone — also removes the workspace's projects (cascade, server-side).
    deleteWorkspace: build.mutation<void, string>({
      query: (id) => ({ url: API_ENDPOINTS.workspace(id), method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: API_TAGS.Workspace, id },
        { type: API_TAGS.Workspace, id: LIST_ID },
        { type: API_TAGS.Project, id: LIST_ID },
        { type: API_TAGS.Dashboard, id: LIST_ID },
      ],
    }),

    inviteMember: build.mutation<void, InviteMemberInput>({
      query: ({ workspaceId, name, email, role }) => ({
        url: API_ENDPOINTS.workspaceMembers(workspaceId),
        method: 'POST',
        data: { name, role, ...(email ? { email } : {}) },
      }),
      invalidatesTags: (_r, _e, { workspaceId }) => [
        { type: API_TAGS.Workspace, id: workspaceId },
        { type: API_TAGS.Workspace, id: LIST_ID },
        { type: API_TAGS.Dashboard, id: LIST_ID },
      ],
    }),

    updateMemberRole: build.mutation<void, UpdateMemberRoleInput>({
      query: ({ workspaceId, userId, role }) => ({
        url: API_ENDPOINTS.workspaceMember(workspaceId, userId),
        method: 'PATCH',
        data: { role },
      }),
      invalidatesTags: (_r, _e, { workspaceId }) => [{ type: API_TAGS.Workspace, id: workspaceId }],
    }),

    removeMember: build.mutation<void, RemoveMemberInput>({
      query: ({ workspaceId, userId }) => ({
        url: API_ENDPOINTS.workspaceMember(workspaceId, userId),
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { workspaceId }) => [
        { type: API_TAGS.Workspace, id: workspaceId },
        { type: API_TAGS.Workspace, id: LIST_ID },
        { type: API_TAGS.Dashboard, id: LIST_ID },
      ],
    }),

    uploadArtifact: build.mutation<void, UploadArtifactInput>({
      query: ({ workspaceId, name, kind }) => ({
        url: API_ENDPOINTS.workspaceArtifacts(workspaceId),
        method: 'POST',
        data: { name, kind },
      }),
      invalidatesTags: (_r, _e, { workspaceId }) => [
        { type: API_TAGS.Workspace, id: workspaceId },
        { type: API_TAGS.Workspace, id: LIST_ID },
        { type: API_TAGS.Dashboard, id: LIST_ID },
      ],
    }),

    deleteArtifact: build.mutation<void, DeleteArtifactInput>({
      query: ({ workspaceId, artifactId }) => ({
        url: API_ENDPOINTS.workspaceArtifact(workspaceId, artifactId),
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { workspaceId }) => [
        { type: API_TAGS.Workspace, id: workspaceId },
        { type: API_TAGS.Workspace, id: LIST_ID },
        { type: API_TAGS.Dashboard, id: LIST_ID },
      ],
    }),
  }),
})

export const {
  useGetWorkspacesQuery,
  useGetWorkspaceQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useUploadArtifactMutation,
  useDeleteArtifactMutation,
} = workspacesApi
