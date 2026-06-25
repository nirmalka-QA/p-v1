/**
 * @wispr/services — the stateful data layer, shared at runtime as a Module
 * Federation singleton. One axios instance, one RTK Query api/cache, one event
 * bus, one in-memory token. The host owns the lifecycle; remotes inject their
 * own endpoints into the same `api` and read the same token/bus.
 */
export { api } from './api'
export { http } from './http'
export { axiosBaseQuery } from './axiosBaseQuery'
export type { AxiosBaseQueryArgs, AxiosBaseQueryError } from './axiosBaseQuery'
export { normalizeError } from './errors'
export type { NormalizedError } from './errors'
export {
  setAccessToken,
  getAccessToken,
  setActiveWorkspaceId,
  getActiveWorkspaceId,
} from './context'
export { createEventBus, appEventBus, APP_EVENTS } from './eventBus'
export { configureServices, getServicesConfig } from './config'
export type { ServicesConfig } from './config'
export { registerMockRoutes } from './mockApi'
export type { MockRoute, MockRequest, MockResult, MockHandler } from './mockApi'
// Async operations (Phase 10 / ADR-0072): poll a module's durable operation progress.
export { operationsApi, useGetOperationQuery, useOperation } from './operationsApi'
