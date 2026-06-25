/**
 * @wispr/utils — pure, dependency-free helpers shared across the host and every
 * remote. No React, no Redux, no side effects: anything here must be safe to
 * bundle into any consumer (this lib is bundled, not a runtime singleton).
 */

/** Narrowing guard that drops `null`/`undefined` (e.g. in `.filter(isDefined)`). */
export const isDefined = <T>(value: T | null | undefined): value is T => value != null

/**
 * Exhaustiveness helper for discriminated unions. Calling it is a compile error
 * unless every case has been handled, so adding a union member surfaces here.
 */
export function assertNever(value: never, message = 'Unhandled case'): never {
  throw new Error(`${message}: ${String(value)}`)
}

/** Clamp a number into the inclusive [min, max] range. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** Group items by a derived key, preserving input order within each group. */
export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of items) {
    const k = key(item)
    ;(out[k] ??= []).push(item)
  }
  return out
}
