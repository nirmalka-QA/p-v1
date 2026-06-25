import { getAccessToken } from './context'
import { globalSingleton } from './globalSingleton'

/**
 * Runtime config for the data layer. Defaults come from Vite env (read without
 * `vite/client` types). The host or a remote's standalone bootstrap can override
 * any field via `configureServices(...)` — e.g. point at the API URL or plug in
 * a different token source (OIDC vs in-memory). Held in a cross-bundle singleton
 * so the host's configuration also governs a mounted remote's copy of this lib.
 */
const env =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

export interface ServicesConfig {
  /** API base URL. All RTK Query endpoint paths are relative to this. */
  baseURL: string
  /** Send cookies with requests (httpOnly refresh cookie model). */
  withCredentials: boolean
  /** Returns the current bearer token. Defaults to the in-memory token. */
  getToken: () => string | null
  /**
   * Serve registered mock routes instead of the network (backend-less dev/demo).
   * Defaults from VITE_USE_MOCKS; auth stays real — only data is mocked.
   */
  useMocks: boolean
}

const config = globalSingleton<ServicesConfig>('services.config', () => ({
  baseURL: env.VITE_API_URL ?? '/api',
  withCredentials: true,
  getToken: getAccessToken,
  useMocks: env.VITE_USE_MOCKS === 'true',
}))

/** Override data-layer config at boot. Call before the first request. */
export function configureServices(partial: Partial<ServicesConfig>): void {
  Object.assign(config, partial)
}

export const getServicesConfig = (): ServicesConfig => config
