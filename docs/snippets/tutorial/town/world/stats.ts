// src/world/stats.ts
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [
    { id: 'energy', label: 'Energy', start: 60, max: 100 },
    { id: 'coins', label: 'Coins', start: 10, format: '{n}c', spendable: true, lacking: 'Not enough on you.' },
  ],
}
