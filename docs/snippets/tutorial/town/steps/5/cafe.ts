// src/story/cafe.ts
import { text, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const cafe: Content = {
  entities: [
    places.location({
      id: 'cafe',
      name: 'The corner café',
      description: 'Café',
      exits: ['high-street'],
      body: [text('Steam on the windows, and a counter with nobody behind it yet.')],
    }),
  ],
}
