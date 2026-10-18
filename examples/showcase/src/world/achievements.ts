/** Achievements that belong to no one place. Ava's is in `story/ava.ts`. */
import { SCHEMA, type Pack } from '@ifloom/engine'

export const achievements: Pack = {
  id: 'world.achievements',
  schema: SCHEMA,
  data: {
    achievements: {
      achievements: [
        // A count to watch: coins on hand, out of 100.
        { id: 'nest-egg', title: 'Nest egg', description: 'Have 100 coins at once.', progress: { value: 'coins', target: 100 } },
      ],
    },
  },
}
