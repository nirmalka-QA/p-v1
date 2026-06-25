/**
 * Cross-bundle singleton slot. The @wispr/* source libs are aliased into every
 * app build, which bypasses Module Federation's share resolution — so the host
 * and a mounted remote each carry their own COPY of this module's code. State
 * that must be process-wide (the RTK api, the axios instance, runtime config,
 * the event bus, the mock-route registry) therefore lives on globalThis: the
 * first copy to evaluate creates it, every later copy reuses it. Without this,
 * a remote's injectEndpoints lands in a dead api instance and its queries hang.
 */

const GLOBAL_KEY = '__WISPR_SINGLETONS__'

export function globalSingleton<T>(name: string, create: () => T): T {
  const host = globalThis as Record<string, unknown>
  const bag = (host[GLOBAL_KEY] ??= {}) as Record<string, unknown>
  return (bag[name] ??= create()) as T
}
