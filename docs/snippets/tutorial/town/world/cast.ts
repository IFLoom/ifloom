// src/world/cast.ts
import type { Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'

export const people: Content = {
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  entities: [
    cast.person({
      id: 'ruth',
      name: 'Ruth',
      fullName: 'Ruth Okafor',
      description: 'Baker',
      pronouns: { they: 'she', them: 'her', their: 'her', theirs: 'hers' },
      image: 'art/character/ruth.svg',
      schedule: [
        // Monday to Friday (0 is Monday), mornings and afternoons, at the café.
        { location: 'cafe', when: { all: [calendar.weekday(0, 1, 2, 3, 4), calendar.period('morning', 'afternoon')] } },
      ],
      talk: 'ruth.talk',
    }),
  ],
}
