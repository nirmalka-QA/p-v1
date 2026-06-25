import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { Method } from 'axios'
import { http } from './http'
import { normalizeError } from './errors'

export interface AxiosBaseQueryArgs {
  url: string
  method?: Method
  data?: unknown
  params?: unknown
  headers?: Record<string, string>
}

export interface AxiosBaseQueryError {
  status: number | undefined
  data: unknown
}

/**
 * RTK Query baseQuery backed by the shared axios instance. Endpoints return
 * axios-style args `{ url, method, data, params }`; axios auto-parses JSON
 * regardless of the response Content-Type (unlike fetchBaseQuery), which the
 * Function API does not always set. Errors come back already normalized.
 */
export const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> =>
  async ({ url, method = 'get', data, params, headers }) => {
    try {
      // Spread headers only when present — exactOptionalPropertyTypes forbids
      // passing `headers: undefined` to axios. http.request avoids the
      // (config | url) overload ambiguity.
      const result = await http.request({ url, method, data, params, ...(headers ? { headers } : {}) })
      return { data: result.data }
    } catch (error) {
      const normalized = normalizeError(error)
      return { error: { status: normalized.status, data: normalized.data } }
    }
  }
