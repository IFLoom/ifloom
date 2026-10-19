/** The people in town: their storylines, and who they are, where they go and how to talk to them. */
import type { Content } from '@ifloom/engine'
import { period, weekday } from '@ifloom/plugin-calendar'
import { at } from '@ifloom/plugin-places'
import { person } from '@ifloom/plugin-cast'

const they = { they: 'she', them: 'her', their: 'her', theirs: 'hers' }

export const cast: Content = {
  storylines: [
    { id: 'ava', name: 'Ava' },
    { id: 'sam', name: 'Sam' },
  ],
  // Each person is an entity of the cast's kind, `character`: a name, a line about them and a portrait, with where they go and how to talk to them.
  entities: [
    person({
      id: 'ava',
      name: 'Ava',
      fullName: 'Ava Marsh',
      desc: 'Runs the café',
      image: 'art/character/ava.svg',
      pronouns: they,
      hue: 20,
      home: 'park',
      // At the counter through the working day; by the river in the evening.
      schedule: [{ location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4, 5), period('morning', 'afternoon')] } }],
      // By the river, once she is a friend, a different conversation from Ava at the till.
      talk: [{ scene: 'ava.river', when: { all: [at('park'), { stat: 'friendship', of: '$', gte: 25 }] } }, { scene: 'ava.hi' }],
      storyline: 'ava',
      call: { scene: 'ava.call', when: period('evening', 'night'), busy: 'She’s busy at the counter. Try her this evening.' },
    }),
    person({
      id: 'sam',
      name: 'Sam',
      desc: 'Neighbour',
      image: 'art/character/sam.svg',
      pronouns: { they: 'they', them: 'them', their: 'their', theirs: 'theirs' },
      hue: 200,
      home: 'park',
      schedule: [{ location: 'high-street', when: period('morning') }],
      talk: 'sam.hi',
      storyline: 'sam',
    }),
  ],
}
