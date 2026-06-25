import { globalSingleton } from './globalSingleton'

/**
 * In-memory runtime context for the data layer. Deliberately NOT in Redux or web
 * storage: the access token must never be persisted (XSS-safe — see the
 * architecture's auth section), and the active-workspace id is read by the axios
 * request interceptor without creating a dependency on @wispr/store (which would
 * be circular, since the store depends on this api). Held in a cross-bundle
 * singleton so the host and a mounted remote read the same values.
 */

interface RuntimeContext {
  accessToken: string | null
  activeWorkspaceId: string | null
}

const context = globalSingleton<RuntimeContext>('services.context', () => ({
  accessToken: null,
  activeWorkspaceId: null,
}))

/** Set/clear the in-memory access token. Called by the host after login/refresh/logout. */
export const setAccessToken = (token: string | null): void => {
  context.accessToken = token
}

/** Read the current access token for attaching to requests. Never rendered or stored. */
export const getAccessToken = (): string | null => context.accessToken

/** Set/clear the active workspace; sent as a header so the API scopes requests. */
export const setActiveWorkspaceId = (id: string | null): void => {
  context.activeWorkspaceId = id
}

export const getActiveWorkspaceId = (): string | null => context.activeWorkspaceId
