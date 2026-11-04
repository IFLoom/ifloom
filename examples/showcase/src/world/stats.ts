/** The player's numbers, and the friendship each character keeps with them. */
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [
    // Each person's: the cast's characters are entities of the kind `character`.
    { id: 'friendship', label: 'Friendship', of: 'character' },
    // One coin, two coins: the words for 1 and for any other number.
    {
      id: 'coins',
      label: 'Coins',
      start: 12,
      max: 999,
      spendable: true,
      format: { one: '{n} coin', other: '{n} coins' },
      lacking: { one: 'You need {n} coin.', other: 'You need {n} coins.' },
    },
    // The React UI draws energy as a bar and charm as pips, one per point.
    { id: 'energy', label: 'Energy', start: 80, spendable: true, format: '{n}%', lacking: 'Too tired.', round: 'round', ui: { display: 'bar' } },
    { id: 'charm', label: 'Charm', start: 1, max: 20, ui: { display: 'pips' } },
  ],
  // The stats whose changes the layout's <Changes /> shows as pills after a choice: friendship on every character.
  changes: { stats: ['coins', 'energy', 'charm', 'friendship'] },
}
