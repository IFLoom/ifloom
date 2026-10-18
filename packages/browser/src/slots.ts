import type { SaveListing } from '@ifloom/engine'

/**
 * The slot for a new save: one more than the highest numbered slot in the
 * listing (`saves.list()`), as a string, so `'1'` for the first. Slots named
 * otherwise, such as `'auto'`, are passed over. A save that can't be read
 * still holds its number, so a new save never writes over it.
 */
export function nextSlot(listing: readonly SaveListing[]): string {
  const numbers = listing
    .map((entry) => entry.slot)
    .filter((slot) => /^\d+$/.test(slot))
    .map(Number)
  return String(numbers.reduce((most, number) => Math.max(most, number), 0) + 1)
}
