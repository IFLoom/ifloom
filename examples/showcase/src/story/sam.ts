/** Sam from flat 2, out with a dog that isn't theirs. */
import type { Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'

export const sam: Content = {
  scenes: [
    {
      id: 'sam.hi',
      title: 'Sam',
      speaker: 'sam',
      body: [{ text: 'Sam is walking a dog that is clearly not theirs. "Dog-sitting," they say. "He’s in charge."' }],
      choices: [
        {
          id: 'bye',
          label: 'Pat the dog and go',
          effects: [{ stat: 'friendship', by: 5, of: cast.character('sam') }, { scene: null }],
        },
      ],
    },
  ],
  data: {
    feed: {
      posts: [{ id: 'sam.river', feed: 'social', from: 'sam', when: calendar.day({ gte: 2 }), body: [{ text: 'The ducks have unionised.' }], likes: 3 }],
    },
  },
}
