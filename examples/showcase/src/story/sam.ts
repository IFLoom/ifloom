/** Sam from flat 2, out with a dog that isn't theirs. */
import type { Content } from '@ifloom/engine'
import { day } from '@ifloom/plugin-calendar'
import { character } from '@ifloom/plugin-cast'

export const sam: Content = {
  scenes: [
    {
      id: 'sam.hi',
      title: 'Sam',
      speaker: 'sam',
      body: [{ prose: 'sam.hi' }],
      choices: [
        {
          id: 'bye',
          label: 'Pat the dog and go',
          effects: [{ stat: 'friendship', by: 5, of: character('sam') }, { scene: null }],
        },
      ],
    },
  ],
  data: {
    feed: {
      posts: [{ id: 'sam.river', feed: 'social', from: 'sam', when: day({ gte: 2 }), body: [{ prose: 'feed.sam-river' }], likes: 3 }],
    },
  },
  prose: {
    'sam.hi': 'Sam is walking a dog that is clearly not theirs. "Dog-sitting," they say. "He’s in charge."',
    'feed.sam-river': 'The ducks have unionised.',
  },
}
