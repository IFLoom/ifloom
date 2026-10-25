/** Cheats for the player, and the supporter code that opens one of them. */
import type { Content } from '@ifloom/engine'
import { hasUnlock } from '@ifloom/plugin-unlocks'

export const cheats: Content = {
  data: {
    cheats: {
      cheats: [
        // Free for everyone.
        { id: 'coins', label: '+20 coins', description: 'A little help with the rent.', effects: [{ stat: 'coins', by: 20 }] },
        // For supporters: refused until the supporter code has been entered (the unlocks plugin's `unlocks/has`).
        {
          id: 'energy',
          label: 'Full energy',
          description: 'As if you had slept.',
          group: 'Supporters',
          blocked: [{ when: { not: hasUnlock('supporter') }, reason: 'For supporters.' }],
          effects: [{ stat: 'energy', to: 100 }],
        },
      ],
    },
    unlocks: {
      unlocks: [
        // The code's hash, from `ifloom unlock-hash supporter`; the code is in .env, never here.
        // It opens the cheat above and src/unlocks/supporter.ts, a scene in the café.
        {
          id: 'supporter',
          label: 'Supporter edition',
          description: 'A thank-you scene in the café, and the Full energy cheat.',
          hash: '7b141ff9f5210e0e3064dd089920697c712fa1b31ff56c2e42737dcd71bbed5f',
        },
      ],
    },
  },
}
