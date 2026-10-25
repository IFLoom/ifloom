/**
 * Deterministic picks from a save.
 *
 * Nothing here is random at runtime — the same save and the same day deal the
 * same cards, which is what keeps tests stable and stops save-scumming. What
 * matters is that near-identical inputs give *unrelated* outputs.
 *
 * The naive `n * 31 + charCode` hash does not: hashing "…:0" and "…:1" gives
 * two integers one apart, so anything read out of the high bits is identical
 * across a run of indices. Derive each value from its own named draw instead of
 * slicing bits out of one number, and it cannot happen again.
 */

/** FNV-1a, then the murmur3 finalizer. One character changes every bit. */
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

/** A whole number in [0, max), drawn from these parts. */
export function draw(max: number, ...parts: (string | number)[]): number {
  if (max <= 0) return 0
  return hash(parts.join(':')) % max
}

/** One of these, drawn from these parts. */
export function drawOne<T>(items: readonly T[], ...parts: (string | number)[]): T {
  return items[draw(items.length, ...parts)]
}

/** True `numerator` times in `outOf`, drawn from these parts. */
export function chance(numerator: number, outOf: number, ...parts: (string | number)[]): boolean {
  return draw(outOf, ...parts) < numerator
}

/**
 * One of these, drawn from these parts with each one's weight: an item of
 * weight 3 comes up three times as often as one of weight 1. A weight left
 * out (`undefined`) counts as 1; a weight of 0 or less, or one that isn't a
 * number, is never drawn. Undefined when nothing can be drawn.
 *
 * With every weight a whole number the draw is `hash % total`, so a list where
 * every weight is 1 draws exactly what `drawOne` would from the same parts.
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
