/** The people in town: their storylines, and who they are, where they go and how to talk to them. */
import { SCHEMA, type Pack } from '@ifloom/engine'
import { period, weekday } from '@ifloom/plugin-calendar'
import { at } from '@ifloom/plugin-places'
import type { CharacterDef } from '@ifloom/plugin-cast'

const they = { they: 'she', them: 'her', their: 'her', theirs: 'hers' }

const characters: CharacterDef[] = [
  {
    id: 'ava',
    name: 'Ava',
    fullName: 'Ava Marsh',
    role: 'Runs the café',
    pronouns: they,
    hue: 20,
    portrait: 'art/character/ava.svg',
    home: 'park',
    // At the counter through the working day; by the river in the evening.
    schedule: [{ location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4, 5), period('morning', 'afternoon')] } }],
    // By the river, once she is a friend, a different conversation from Ava at the till.
    talk: [{ scene: 'ava.river', when: { all: [at('park'), { stat: 'friendship', of: '$', gte: 25 }] } }, { scene: 'ava.hi' }],
    storyline: 'ava',
    call: { scene: 'ava.call', when: period('evening', 'night'), busy: 'She’s busy at the counter. Try her this evening.' },
  },
  {
    id: 'sam',
    name: 'Sam',
    role: 'Neighbour',
    pronouns: { they: 'they', them: 'them', their: 'their', theirs: 'theirs' },
    hue: 200,
    portrait: 'art/character/sam.svg',
    home: 'park',
    schedule: [{ location: 'high-street', when: period('morning') }],
    talk: 'sam.hi',
    storyline: 'sam',
  },
]

export const cast: Pack = {
  id: 'world.cast',
  schema: SCHEMA,
  storylines: [
    { id: 'ava', name: 'Ava' },
    { id: 'sam', name: 'Sam' },
  ],
  data: { cast: { characters } },
}
