// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'bedroom',
  scenes: [
    {
      id: 'bedroom',
      title: 'Moving day',
      body: [text('The last box is in. The bed is a mattress on the floor, and the window looks down on the high street.')],
      choices: [
        { id: 'unpack', label: 'Unpack a box', once: { per: 'turn', reason: 'Enough boxes for now.' }, effects: [{ stat: 'energy', by: -10 }] },
        { id: 'down', label: 'Go down to the kitchen', effects: [{ kv: 'kitchenVisits', by: 1 }, { scene: 'kitchen' }] },
      ],
    },
    {
      id: 'kitchen',
      title: 'The kitchen',
      body: [
        text('A kettle, two mugs and a fridge that hums to itself.'),
        text('You know where the tea bags are now.', { when: { kv: 'kitchenVisits', gte: 2 } }),
      ],
      choices: [
        { id: 'tea', label: 'Make a cup of tea', when: { kv: 'kitchenVisits', gte: 2 }, effects: [{ stat: 'energy', by: 10 }] },
        { id: 'up', label: 'Go back upstairs', effects: [{ scene: 'bedroom' }] },
      ],
    },
  ],
}
