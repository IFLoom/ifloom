/**
 * Helpers for ranges, the `{ gte, gt, lte, lt }` bounds a condition compares a number with. The core works out each
 * bound that is an `Amount` before it asks a condition, so these helpers read numbers, and a bound that is still an
 * amount fails.
 */
import type { Amount, Range } from './types.ts'

/** The four bound keys a range can have, `gte`, `gt`, `lte` and `lt`. */
export const BOUNDS = ['gte', 'gt', 'lte', 'lt'] as const

/** Returns true when `value` is in the range. A range with no bounds holds above 0, and a bound that isn't a number yet fails. */
export function inRange(value: number, range: Range): boolean {
  if (!bounded(range)) return value > 0
  const { gte, gt, lte, lt } = range
  for (const bound of [gte, gt, lte, lt]) if (bound !== undefined && typeof bound !== 'number') return false
  if (typeof gte === 'number' && value < gte) return false
  if (typeof gt === 'number' && value <= gt) return false
  if (typeof lte === 'number' && value > lte) return false
  if (typeof lt === 'number' && value >= lt) return false
  return true
}

/** Returns true when the range has at least one bound. */
export function bounded(range: Range): boolean {
  return range.gte !== undefined || range.gt !== undefined || range.lte !== undefined || range.lt !== undefined
}

/** Returns true when the object has a bound that is still an `Amount` to work out. */
export function hasAmountBound(range: object): boolean {
  const raw = range as Record<string, unknown>
  return BOUNDS.some((bound) => raw[bound] !== undefined && typeof raw[bound] !== 'number')
}

/** Returns the object with every bound read as a number by `read`. Returns the same object when every bound is already a number. */
export function rangeWith<T extends object>(range: T, read: (amount: Amount) => number): T {
  if (!hasAmountBound(range)) return range
  const out: Record<string, unknown> = { ...(range as Record<string, unknown>) }
  for (const bound of BOUNDS) if (out[bound] !== undefined && typeof out[bound] !== 'number') out[bound] = read(out[bound] as Amount)
  return out as T
}

/** Returns the object's bounds that are still amounts. The content checker reads them for what a range names. */
export function amountBounds(range: object): Amount[] {
  const raw = range as Record<string, unknown>
  return BOUNDS.filter((bound) => raw[bound] !== undefined && typeof raw[bound] !== 'number').map((bound) => raw[bound] as Amount)
}

/** Returns the range in English words, such as `3 or more and below 10`. */
export function wanted(range: Range): string {
  const text = (bound: Amount) => (typeof bound === 'number' ? String(bound) : JSON.stringify(bound))
  const parts = [
    range.gte !== undefined ? `${text(range.gte)} or more` : '',
    range.gt !== undefined ? `more than ${text(range.gt)}` : '',
    range.lte !== undefined ? `${text(range.lte)} or less` : '',
    range.lt !== undefined ? `below ${text(range.lt)}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' and ') : 'more than 0'
}

/** Returns `value` when it is a number, else 0. */
export function asCount(value: unknown): number {
  return typeof value === 'number' ? value : 0
}
