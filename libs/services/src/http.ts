import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { getServicesConfig } from './config'
import { getActiveWorkspaceId } from './context'
import { normalizeError } from './errors'
import { mockableAdapter } from './mockApi'
import { globalSingleton } from './globalSingleton'

/**
 * The one shared axios instance for the whole app (host + active remote). Base
 * URL, auth token and credentials are read per-request from the runtime config
 * (see config.ts), so a single instance serves every context. Tokens never live
 * in components or Redux. The adapter consults the mock-route registry when
 * `useMocks` is on (backend-less dev) and hits the network otherwise. Held in a
 * cross-bundle singleton so every copy of this lib uses the same instance.
 */
function createHttp(): AxiosInstance {
  const instance = axios.create({ adapter: mockableAdapter })

  instance.interceptors.request.use((requestConfig) => {
    const cfg = getServicesConfig()
    if (!requestConfig.baseURL) requestConfig.baseURL = cfg.baseURL
    requestConfig.withCredentials = cfg.withCredentials

    const token = cfg.getToken()
    if (token) requestConfig.headers.set('Authorization', `Bearer ${token}`)
    const workspaceId = getActiveWorkspaceId()
    if (workspaceId) requestConfig.headers.set('x-workspace-id', workspaceId)
    requestConfig.headers.set('x-request-id', crypto.randomUUID())
    return requestConfig
  })

  // No token-refresh endpoint exists yet, so a 401 is surfaced as a normalized
  // error for the caller to handle (e.g. an RTK Query error state) — never an
  // auto-refresh/retry, which would spiral against a missing refresh API.
  // TODO(auth): re-introduce single-flight silent refresh here once the auth
  // refresh API is available.
  instance.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(normalizeError(error)),
  )

  return instance
}

export const http = globalSingleton('services.http', createHttp)
