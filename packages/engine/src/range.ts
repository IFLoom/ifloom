/**
 * Ranges: `{ gte, gt, lte, lt }`, as conditions compare a number with one.
 * The helpers the features describe and read ranges with. A bound can be an
 * `Amount`, which the core works out before a condition is asked
 * (`amount.ts`), so by the time a range gets here its bounds are numbers. A
 * bound that is still something else fails, as an amount nobody worked out.
 */
import type { Amount, Range } from './types.ts'

/** The bounds of a range. */
export const BOUNDS = ['gte', 'gt', 'lte', 'lt'] as const

/** Is the number in the range? A range with no bounds asks whether it is above 0. A bound that isn't a number yet fails. */
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

/** Does the range have any bound at all? */
export function bounded(range: Range): boolean {
  return range.gte !== undefined || range.gt !== undefined || range.lte !== undefined || range.lt !== undefined
}

/** Does the object have a bound that is not a number yet: an `Amount` to work out? */
export function hasAmountBound(range: object): boolean {
  const raw = range as Record<string, unknown>
  return BOUNDS.some((bound) => raw[bound] !== undefined && typeof raw[bound] !== 'number')
}

/** The object with every bound read as a number by `read`; the same object when they all are already. */
export function rangeWith<T extends object>(range: T, read: (amount: Amount) => number): T {
  if (!hasAmountBound(range)) return range
  const out: Record<string, unknown> = { ...(range as Record<string, unknown>) }
  for (const bound of BOUNDS) if (out[bound] !== undefined && typeof out[bound] !== 'number') out[bound] = read(out[bound] as Amount)
  return out as T
}

/** The bounds of an object that are not numbers yet, as amounts: what a range names, for the checker. */
export function amountBounds(range: object): Amount[] {
  const raw = range as Record<string, unknown>
  return BOUNDS.filter((bound) => raw[bound] !== undefined && typeof raw[bound] !== 'number').map((bound) => raw[bound] as Amount)
}

/** What a range asks for, in words: `3 or more and below 10`. */
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

/** A value read as a number: a value that is not a number counts as 0. */
export function asCount(value: unknown): number {
  return typeof value === 'number' ? value : 0
}
