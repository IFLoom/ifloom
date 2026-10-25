/** The first scene: the café's opening day. */
import type { Content } from '@ifloom/engine'

export const opening: Content = {
  // The game opens on the café's first day.
  introScene: 'opening',
  scenes: [
    {
      id: 'opening',
      title: 'The Corner Café',
      body: [{ text: 'opening' }],
      choices: [{ id: 'begin', effects: [{ scene: null }] }],
    },
  ],
  prose: {
    opening:
      'The lease is signed, the sign is up, and Ana has already rearranged the mugs. Every week the till is counted, the staff are paid, and you find out what the town thought.',
    'opening#begin': 'Open the doors',
  },
}
