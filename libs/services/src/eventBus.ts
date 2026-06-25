import type { EventBus, EventHandler } from '@wispr/contracts'
import { globalSingleton } from './globalSingleton'

/**
 * Tiny synchronous typed pub/sub implementing the contract's EventBus. Lives in
 * services (not mfe-runtime) so the response interceptor can emit `auth:logout`
 * on refresh failure without a circular dependency. The host passes the same
 * singleton instance to each remote through ProjectAppProps.
 */
export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>()
  return {
    on(event, handler) {
      const set = handlers.get(event) ?? new Set<EventHandler>()
      set.add(handler)
      handlers.set(event, set)
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler)
    },
    emit(event, payload) {
      handlers.get(event)?.forEach((h) => h(payload))
    },
  }
}

/** Process-wide event bus singleton shared by the host and the active remote. */
export const appEventBus: EventBus = globalSingleton('services.eventBus', createEventBus)

/** Well-known event names used across the host↔remote boundary. */
export const APP_EVENTS = {
  authLogout: 'auth:logout',
  themeChange: 'theme:change',
} as const
