/**
 * Seeded draws from a save. The same save and the same turn give the same draws, which keeps tests stable and stops
 * save-scumming.
 *
 * Near-identical inputs must give unrelated outputs. A naive `n * 31 + charCode` hash fails this, because "…:0" and
 * "…:1" hash to integers one apart, so the high bits match across a run of indices. Each value comes from its own
 * named draw instead of bits sliced out of one number.
 */

/**
 * Returns a 32-bit unsigned hash of `text`. Texts that differ in one character give unrelated numbers.
 *
 * @remarks FNV-1a, then the murmur3 finaliser. A one-character change flips about half the bits.
 */
export function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 16
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return h >>> 0
}

/** Returns a whole number from 0 up to but not including `max`, drawn from `parts`. Returns 0 when `max` is 0 or less. */
export function draw(max: number, ...parts: (string | number)[]): number {
  if (max <= 0) return 0
  return hash(parts.join(':')) % max
}

/** Returns one entry of `items`, drawn from `parts`. Every entry is equally likely. */
export function drawOne<T>(items: readonly T[], ...parts: (string | number)[]): T {
  return items[draw(items.length, ...parts)]
}

/** Returns true `numerator` times in `outOf`, drawn from `parts`. */
export function chance(numerator: number, outOf: number, ...parts: (string | number)[]): boolean {
  return draw(outOf, ...parts) < numerator
}

/**
 * Returns one entry of `items`, drawn from `parts` by each entry's weight. Returns undefined when no entry can be drawn.
 *
 * An entry of weight 3 comes up three times as often as one of weight 1. A weight left out counts as 1. An entry
 * whose weight is 0 or less, or not a number, is never drawn.
 *
 * @remarks With every weight a whole number the draw is `hash % total`, so a list where every weight is 1 draws the
 * same entry `drawOne` would from the same parts.
 */
export function weighted<T>(items: readonly T[], weightOf: (item: T) => number | undefined, ...parts: (string | number)[]): T | undefined {
  const weights = items.map((item) => {
    const weight = weightOf(item) ?? 1
    return Number.isFinite(weight) && weight > 0 ? weight : 0
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (!(total > 0)) return undefined
  const h = hash(parts.join(':'))
  let left = weights.every(Number.isInteger) ? h % total : (h / 4294967296) * total
  let last: T | undefined
  for (let i = 0; i < items.length; i += 1) {
    if (weights[i] <= 0) continue
    if (left < weights[i]) return items[i]
    left -= weights[i]
    last = items[i]
  }
  // Only reached through floating-point rounding at the very top of the range.
  return last
}
