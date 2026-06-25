import { api } from '@wispr/services'
import { API_ENDPOINTS, API_TAGS } from '@wispr/contracts'
import type {
  ApiEnvelope,
  UserProfileDetails,
  ProfileProjects,
  ProfileProjectStatus,
} from '../models/model'

/**
 * Profile endpoints — injected into the shared @wispr/services api (one cache).
 * Host-only; paths + tag types come from @wispr/contracts; served by the profile
 * mock until a live backend exists. `GET /me` returns the full profile, but the
 * client treats the session identity as authoritative for name/email/role (§view).
 */
export const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProfile: build.query<UserProfileDetails, void>({
      query: () => ({ url: API_ENDPOINTS.profile, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<UserProfileDetails> | UserProfileDetails) =>
        res && 'result' in res ? res.result : res,
      providesTags: [{ type: API_TAGS.Profile, id: 'details' }],
    }),

    getProfileProjects: build.query<ProfileProjects, ProfileProjectStatus | void>({
      query: (status) => ({
        url: API_ENDPOINTS.profileProjects,
        method: 'GET',
        ...(status ? { params: { status } } : {}),
      }),
      transformResponse: (res: ApiEnvelope<ProfileProjects> | ProfileProjects) =>
        res && 'result' in res ? res.result : res,
      providesTags: [{ type: API_TAGS.Profile, id: 'projects' }],
    }),

    // Multipart upload — the caller passes a FormData with a `file` field.
    uploadProfilePicture: build.mutation<{ avatarUrl: string }, FormData>({
      query: (data) => ({ url: API_ENDPOINTS.profileAvatar, method: 'POST', data }),
      transformResponse: (res: ApiEnvelope<{ avatarUrl: string }> | { avatarUrl: string }) =>
        res && 'result' in res ? res.result : res,
      invalidatesTags: [{ type: API_TAGS.Profile, id: 'details' }],
    }),

    removeProfilePicture: build.mutation<void, void>({
      query: () => ({ url: API_ENDPOINTS.profileAvatar, method: 'DELETE' }),
      invalidatesTags: [{ type: API_TAGS.Profile, id: 'details' }],
    }),
  }),
})

export const {
  useGetProfileQuery,
  useGetProfileProjectsQuery,
  useUploadProfilePictureMutation,
  useRemoveProfilePictureMutation,
} = profileApi
