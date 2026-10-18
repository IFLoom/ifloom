/** The player's numbers, and the friendship each character keeps with them. */
import { SCHEMA, type Pack } from '@ifloom/engine'

export const stats: Pack = {
  id: 'world.stats',
  schema: SCHEMA,
  stats: [
    // Each person's: the cast's characters are entities of the kind `character`.
    { id: 'friendship', label: 'Friendship', of: 'character' },
    { id: 'coins', label: 'Coins', start: 12, max: 999, spendable: true, format: '{n} coins', lacking: 'You need {n} coins.' },
    { id: 'energy', label: 'Energy', start: 80, spendable: true, format: '{n}%', lacking: 'Too tired.', round: 'round' },
    { id: 'charm', label: 'Charm', start: 1, max: 20 },
  ],
}
