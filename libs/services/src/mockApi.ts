import axios, { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { getServicesConfig } from './config'
import { globalSingleton } from './globalSingleton'

/**
 * Generic mock-API facility for backend-less development (`useMocks` in
 * ServicesConfig, driven by VITE_USE_MOCKS). Domain packages register route
 * handlers (URL pattern + method) and the shared axios instance serves matching
 * requests from them instead of the network — the services/RTK Query layer is
 * untouched, so flipping the flag swaps mock/live without code changes.
 */

/** What a handler receives: path params, query params, and the parsed body. */
export interface MockRequest {
  /** Values captured from `:param` segments in the route pattern. */
  params: Record<string, string>
  /** Axios `params` (query string) for the request. */
  query: Record<string, unknown>
  /** Parsed JSON body (objects), or the raw FormData for multipart uploads. */
  body: unknown
}

/** What a handler returns: a response body and optional HTTP status (default 200). */
export interface MockResult {
  status?: number
  data: unknown
}

export type MockHandler = (req: MockRequest) => MockResult | Promise<MockResult>

export interface MockRoute {
  /** HTTP method the route answers (GET / POST / PATCH / PUT / DELETE). */
  method: string
  /** Path pattern relative to the API base, e.g. `projects/:projectId/kb`. */
  pattern: string
  handler: MockHandler
}

// Keyed by "METHOD pattern" so re-registration (e.g. under HMR) is idempotent.
// Cross-bundle singleton: routes registered by a mounted remote's copy of this
// lib must be visible to the adapter on the host's shared axios instance.
const routes = globalSingleton('services.mockRoutes', () => new Map<string, MockRoute>())

/** Registers (or replaces) a set of mock routes. Safe to call more than once. */
export function registerMockRoutes(toAdd: MockRoute[]): void {
  for (const route of toAdd) {
    routes.set(`${route.method.toUpperCase()} ${route.pattern}`, route)
  }
}

/** Strips the leading slash and any query string so patterns match consistently. */
function normalizePath(url: string): string {
  const noQuery = url.split('?')[0] ?? ''
  return noQuery.replace(/^\/+/, '')
}

/** Matches a concrete path against a `:param` pattern, capturing parameters. */
function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  if (patternParts.length !== pathParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const expected = patternParts[i] ?? ''
    const actual = pathParts[i] ?? ''
    if (expected.startsWith(':')) {
      params[expected.slice(1)] = decodeURIComponent(actual)
    } else if (expected !== actual) {
      return null
    }
  }
  return params
}

function findRoute(method: string, path: string): { route: MockRoute; params: Record<string, string> } | null {
  for (const route of routes.values()) {
    if (route.method.toUpperCase() !== method) continue
    const params = matchPattern(route.pattern, path)
    if (params) return { route, params }
  }
  return null
}

/** Parses the (already transformed) axios request body back into an object. */
function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') return data ?? null
  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

/** A small, believable latency so loading states stay observable. */
function mockLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 230))
}

function toResponse(result: MockResult, config: InternalAxiosRequestConfig): AxiosResponse {
  const status = result.status ?? 200
  return {
    data: result.data,
    status,
    statusText: status >= 400 ? 'Mock Error' : 'OK',
    headers: {},
    config,
    request: { mock: true },
  }
}

// The platform adapter axios would have used (XHR in the browser); unmatched
// requests fall through to it so mixed mock/live setups keep working.
const passthrough: AxiosAdapter = axios.getAdapter(axios.defaults.adapter)

/**
 * The adapter installed on the shared axios instance. When mocks are enabled it
 * answers registered routes locally; everything else (or mocks off) goes to the
 * network unchanged.
 */
export const mockableAdapter: AxiosAdapter = async (config) => {
  if (!getServicesConfig().useMocks) return passthrough(config)

  const method = (config.method ?? 'get').toUpperCase()
  const path = normalizePath(config.url ?? '')
  const match = findRoute(method, path)
  if (!match) return passthrough(config)

  await mockLatency()
  const result = await match.route.handler({
    params: match.params,
    query: (config.params as Record<string, unknown>) ?? {},
    body: parseBody(config.data),
  })

  const response = toResponse(result, config)
  if (response.status >= 400) {
    const message =
      typeof result.data === 'string' ? result.data : `Request failed with status code ${response.status}`
    throw new AxiosError(
      message,
      response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      { ...config, headers: config.headers ?? new AxiosHeaders() },
      response.request,
      response,
    )
  }
  return response
}
