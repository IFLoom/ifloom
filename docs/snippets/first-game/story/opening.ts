// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

/** Moving day, and the house the player wakes up in. */
export const opening: Content = {
  introScene: 'intro',
  scenes: [
    {
      id: 'intro',
      title: 'Moving day',
      body: [text('The last box is in. You could sleep for a week.')],
      choices: [{ id: 'bed', label: 'Go to bed', effects: [{ scene: null }] }],
    },
  ],
  entities: [
    places.location({
      id: 'house',
      name: 'Your house',
      description: 'Home',
      exits: ['high-street'],
      body: [text('The kettle, the window, the post on the mat.')],
    }),
  ],
}
