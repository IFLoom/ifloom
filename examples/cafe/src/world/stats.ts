/** The café's own numbers: the till and its reputation in town. */
import { SCHEMA, type Pack } from '@ifloom/engine'

export const stats: Pack = {
  id: 'world.stats',
  schema: SCHEMA,
  stats: [
    { id: 'coins', label: 'Coins', start: 120, min: -9999, max: 99999, format: '£{n}', spendable: true, lacking: 'Not enough in the till.' },
    // Word gets round in steps: the sidebar shows the level, and a notice says when it goes up.
    { id: 'reputation', label: 'Reputation', start: 20, levels: { at: [40, 70, 90], notice: 'Word gets round: {label} is now level {level}.' } },
  ],
}
