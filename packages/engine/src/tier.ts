/**
 * How many of these thresholds a value has passed: 0 below the first, 1 past
 * the first, and so on. A game keeps its thresholds hidden and asks this for
 * the band; the engine has no thresholds of its own.
 */
export function tier(value: number, thresholds: readonly number[]): number {
  let n = 0
  for (const line of thresholds) {
    if (value >= line) n += 1
    else break
  }
  return n
}
