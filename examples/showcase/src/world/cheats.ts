/** Cheats for the player, and the supporter code that opens one of them: both the unlocks plugin's. */
import type { Content } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

export const cheats: Content = {
  data: {
    unlocks: {
      cheats: [
        // Free for everyone.
        { id: 'coins', name: '+20 coins', description: 'A little help with the rent.', effects: [{ stat: 'coins', by: 20 }] },
        // For supporters: refused until the supporter code has been entered (the unlocks plugin's `unlocks/has`).
        {
          id: 'energy',
          name: 'Full energy',
          description: 'As if you had slept.',
          group: 'Supporters',
          blocked: [{ when: { not: unlocks.has('supporter') }, reason: 'For supporters.' }],
          effects: [{ stat: 'energy', to: 100 }],
        },
      ],
      unlocks: [
        // The code's hash, from `ifloom unlock-hash supporter`; the code is in .env, never here.
        // It opens the cheat above and src/unlocks/supporter.ts, a scene in the café.
        {
          id: 'supporter',
          name: 'Supporter edition',
          description: 'A thank-you scene in the café, and the Full energy cheat.',
          hash: '7b141ff9f5210e0e3064dd089920697c712fa1b31ff56c2e42737dcd71bbed5f',
        },
      ],
    },
  },
}
