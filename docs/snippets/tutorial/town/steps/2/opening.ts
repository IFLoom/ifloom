// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'bedroom',
  scenes: [
    {
      id: 'bedroom',
      title: 'Moving day',
      body: [text('The last box is in. The bed is a mattress on the floor, and the window looks down on the high street.')],
      choices: [{ id: 'down', label: 'Go down to the kitchen', effects: [{ scene: 'kitchen' }] }],
    },
    {
      id: 'kitchen',
      title: 'The kitchen',
      body: [text('A kettle, two mugs and a fridge that hums to itself.')],
      choices: [{ id: 'up', label: 'Go back upstairs', effects: [{ scene: 'bedroom' }] }],
    },
  ],
}
