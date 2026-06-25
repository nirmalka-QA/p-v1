import { api } from '@wispr/services'
import { API_ENDPOINTS, API_TAGS, LIST_ID } from '@wispr/contracts'
import type { DashboardStats } from '../models/model'

interface ApiEnvelope<T> {
  result: T
  errors?: unknown
}

/**
 * Global (admin) dashboard endpoint — injected into the shared @wispr/services api.
 * Org-wide aggregates across every workspace and project; served by the dashboard
 * mock until a live backend exists.
 */
export const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    getDashboardStats: build.query<DashboardStats, void>({
      query: () => ({ url: API_ENDPOINTS.dashboardStats, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<DashboardStats> | DashboardStats) =>
        'result' in res ? res.result : res,
      providesTags: [{ type: API_TAGS.Dashboard, id: LIST_ID }],
    }),
  }),
})

export const { useGetDashboardStatsQuery } = dashboardApi
