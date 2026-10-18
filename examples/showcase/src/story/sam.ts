/** Sam from flat 2, out with a dog that isn't theirs. */
import { SCHEMA, type Pack } from '@ifloom/engine'
import { day } from '@ifloom/plugin-calendar'
import { person } from '@ifloom/plugin-cast'

export const sam: Pack = {
  id: 'story.sam',
  schema: SCHEMA,
  scenes: [
    {
      id: 'sam.hi',
      title: 'Sam',
      speaker: 'sam',
      body: [{ text: 'sam.hi' }],
      choices: [
        {
          id: 'bye',
          effects: [
            { kind: 'stat', stat: 'friendship', by: 5, of: person('sam') },
            { kind: 'scene', scene: null },
          ],
        },
      ],
    },
  ],
  data: {
    feed: {
      posts: [{ id: 'sam.river', feed: 'social', from: 'sam', when: day({ gte: 2 }), body: [{ text: 'feed.sam-river' }], likes: 3 }],
    },
  },
  prose: {
    'sam.hi': 'Sam is walking a dog that is clearly not theirs. "Dog-sitting," they say. "He’s in charge."',
    'sam.hi#bye': 'Pat the dog and go',
    'feed.sam-river': 'The ducks have unionised.',
  },
}
