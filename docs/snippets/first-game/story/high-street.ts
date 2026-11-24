// src/story/high-street.ts
import { text, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const highStreet: Content = {
  entities: [
    places.location({
      id: 'high-street',
      name: 'The high street',
      description: 'Town',
      exits: ['house', 'cafe'],
      body: [text('Shopfronts, a bus stop, a bakery smell from the corner.')],
    }),
  ],
}
