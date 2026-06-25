import { api } from '@wispr/services'
import { API_ENDPOINTS, API_TAGS, LIST_ID } from '@wispr/contracts'
import { mapAdminUser } from '../helpers/helpers'
import type {
  AdminUsers,
  ApiEnvelope,
  IAdminUsersResponse,
  SetPlatformAdminInput,
  SetUserStatusInput,
} from '../models/model'

/**
 * Platform-admin console endpoints — injected into the shared @wispr/services api
 * (one cache). Host-only (the console is platformAdmin-gated); paths + tag types
 * come from @wispr/contracts; served by the admin mock until a live backend exists.
 */
export const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAdminUsers: build.query<AdminUsers, void>({
      query: () => ({ url: API_ENDPOINTS.adminUsers, method: 'GET' }),
      transformResponse: (
        res: ApiEnvelope<IAdminUsersResponse> | IAdminUsersResponse,
      ): AdminUsers => {
        const data = (res && 'result' in res ? res.result : res) as IAdminUsersResponse | undefined
        return {
          users: (data?.users ?? []).map(mapAdminUser),
          totalCount: data?.totalCount ?? 0,
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.users.map((u) => ({ type: API_TAGS.AdminUser, id: u.userId })),
              { type: API_TAGS.AdminUser, id: LIST_ID },
            ]
          : [{ type: API_TAGS.AdminUser, id: LIST_ID }],
    }),

    setPlatformAdmin: build.mutation<void, SetPlatformAdminInput>({
      query: ({ userId, isPlatformAdmin }) => ({
        url: API_ENDPOINTS.adminUserPlatformRole(userId),
        method: 'PATCH',
        data: { isPlatformAdmin },
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: API_TAGS.AdminUser, id: userId },
        { type: API_TAGS.AdminUser, id: LIST_ID },
      ],
    }),

    setUserStatus: build.mutation<void, SetUserStatusInput>({
      query: ({ userId, status }) => ({
        url: API_ENDPOINTS.adminUserStatus(userId),
        method: 'PATCH',
        data: { status },
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: API_TAGS.AdminUser, id: userId },
        { type: API_TAGS.AdminUser, id: LIST_ID },
      ],
    }),

    // Force sign-out invalidates the user's sessions server-side; the list shape is
    // unchanged, so no cache tags need invalidating.
    forceSignOut: build.mutation<void, string>({
      query: (userId) => ({ url: API_ENDPOINTS.adminUserSignOut(userId), method: 'POST' }),
    }),
  }),
})

export const {
  useGetAdminUsersQuery,
  useSetPlatformAdminMutation,
  useSetUserStatusMutation,
  useForceSignOutMutation,
} = adminApi
