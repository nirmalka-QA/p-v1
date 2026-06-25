import type { MockResult } from '@wispr/services'

/**
 * Helpers shared by the mock API route modules. Phase endpoints all use the
 * backend's ResponseDto envelope (`{ success, data, message }`), so handlers
 * build results through `ok` / `fail` to stay shape-faithful.
 */

export function ok(data: unknown): MockResult {
  return { data: { success: true, data, message: null } }
}

/** An HTTP error carrying a human-readable message (normalizeError surfaces it). */
export function fail(status: number, message: string): MockResult {
  return { status, data: message }
}

export const nowIso = (): string => new Date().toISOString()

let idSeq = Date.now() % 100_000

/** Sequential unique-enough ids for mock records (uploads, alerts, jobs…). */
export function nextId(prefix: string): string {
  idSeq += 1
  return `${prefix}-${idSeq.toString(36)}`
}
