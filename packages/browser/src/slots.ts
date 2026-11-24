import type { SaveListing } from '@ifloom/engine'

/**
 * Returns the slot for a new save, one more than the highest numbered slot in a `saves.list()` listing, as a string.
 * It returns `'1'` when there's none.
 *
 * It skips slots with other names, such as `'auto'`. A save that can't be read still counts, so a new save never
 * writes over it.
 */
export function nextSlot(listing: readonly SaveListing[]): string {
  const numbers = listing
    .map((entry) => entry.slot)
    .filter((slot) => /^\d+$/.test(slot))
    .map(Number)
  return String(numbers.reduce((most, number) => Math.max(most, number), 0) + 1)
}
