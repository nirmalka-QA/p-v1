import { createApi } from '@reduxjs/toolkit/query/react'
import { API_TAG_LIST } from '@wispr/contracts'
import { axiosBaseQuery } from './axiosBaseQuery'
import { globalSingleton } from './globalSingleton'

/**
 * The single base RTK Query api for the whole platform. The host and every
 * remote (and shared libs like @wispr/projects) call `api.injectEndpoints(...)`
 * against THIS instance, so there is one cache + middleware regardless of how
 * many remotes are mounted. Tag types come from the @wispr/contracts API
 * contract; created with the custom axiosBaseQuery — never fetchBaseQuery.
 * Held in a cross-bundle singleton: a mounted remote's copy of this lib must
 * inject its endpoints into the SAME api the host store's middleware runs,
 * or its queries would never resolve.
 */
export const api = globalSingleton('services.api', () =>
  createApi({
    reducerPath: 'api',
    baseQuery: axiosBaseQuery(),
    tagTypes: API_TAG_LIST,
    endpoints: () => ({}),
  }),
)
