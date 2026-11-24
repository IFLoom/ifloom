// src/world/stats.ts
import type { Content } from '@ifloom/engine'

/** The player's coins and energy, and a friendship that every character keeps for themselves. */
export const stats: Content = {
  stats: [
    {
      id: 'coins',
      label: 'Coins',
      start: 5,
      max: 999,
      format: '{n}c',
      spendable: true,
      lacking: 'Not enough on you.',
    },
    { id: 'energy', label: 'Energy', start: 50, spendable: true },
    { id: 'friendship', label: 'Friendship', of: 'character' },
  ],
}
