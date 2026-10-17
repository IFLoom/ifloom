/**
 * Ranges: `{ gte, gt, lte, lt }`, as conditions compare a number with one.
 * The one home of `inRange`, which the engine exports, and the helpers the
 * features describe and read ranges with.
 */
import type { Range } from './types.ts'

/** Is the number in the range? A range with no bounds asks whether it is above 0. */
export function inRange(value: number, range: Range): boolean {
  if (!bounded(range)) return value > 0
  if (range.gte !== undefined && value < range.gte) return false
  if (range.gt !== undefined && value <= range.gt) return false
  if (range.lte !== undefined && value > range.lte) return false
  if (range.lt !== undefined && value >= range.lt) return false
  return true
}

/** Does the range have any bound at all? */
export function bounded(range: Range): boolean {
  return range.gte !== undefined || range.gt !== undefined || range.lte !== undefined || range.lt !== undefined
}

/** What a range asks for, in words: `3 or more and below 10`. */
export function wanted(range: Range): string {
  const parts = [
    range.gte !== undefined ? `${range.gte} or more` : '',
    range.gt !== undefined ? `more than ${range.gt}` : '',
    range.lte !== undefined ? `${range.lte} or less` : '',
    range.lt !== undefined ? `below ${range.lt}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' and ') : 'more than 0'
}

/** A value read as a number: a value that is not a number counts as 0. */
export function asCount(value: unknown): number {
  return typeof value === 'number' ? value : 0
}
