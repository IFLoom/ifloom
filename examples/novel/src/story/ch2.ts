/** Chapter two: Mrs Okafor on the stairs, and the first chance to lie. */
import type { Content } from '@ifloom/engine'

export const ch2: Content = {
  scenes: [
    {
      id: 'ch2.stairs',
      title: 'Chapter two: the stairs',
      body: [
        { text: 'ch2.stairs' },
        { text: 'ch2.stairs.opened', when: { chose: 'ch1.mat#open' } },
        { text: 'ch2.stairs.shelved', when: { chose: 'ch1.mat#shelf' } },
      ],
      choices: [
        { id: 'truth', effects: [{ kind: 'stat', stat: 'courage', by: 1 }, { kind: 'turn' }, { kind: 'scene', scene: 'ch3.door' }] },
        { id: 'deny', effects: [{ kind: 'kv', key: 'fibs', by: 1 }, { kind: 'turn' }, { kind: 'scene', scene: 'ch3.door' }] },
        // A lie to cover a letter you opened is a second lie.
        {
          id: 'blame',
          when: { chose: 'ch1.mat#open' },
          effects: [{ kind: 'kv', key: 'fibs', by: 2 }, { kind: 'turn' }, { kind: 'scene', scene: 'ch3.door' }],
        },
      ],
    },
  ],
  prose: {
    'ch2.stairs': 'Mrs Okafor from downstairs catches you on the landing. “Has anything come for June? Her sister keeps asking.”',
    'ch2.stairs.opened': 'You think of the postcard tucked inside, and the phone number written on it twice.',
    'ch2.stairs.shelved': 'You think of the letter on the shelf, still sealed.',
    'ch2.stairs#truth': 'Tell her about the letter',
    'ch2.stairs#deny': '“Nothing yet.”',
    'ch2.stairs#blame': '“Only something that came open in the post.”',
  },
}
