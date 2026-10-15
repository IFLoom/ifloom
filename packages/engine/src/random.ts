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
export function roll(max: number, ...parts: (string | number)[]): number {
  if (max <= 0) return 0
  return hash(parts.join(':')) % max
}

/** One of these, drawn from these parts. */
export function pick<T>(items: readonly T[], ...parts: (string | number)[]): T {
  return items[roll(items.length, ...parts)]
}

/** True `numerator` times in `outOf`, drawn from these parts. */
export function chance(
  numerator: number,
  outOf: number,
  ...parts: (string | number)[]
): boolean {
  return roll(outOf, ...parts) < numerator
}
