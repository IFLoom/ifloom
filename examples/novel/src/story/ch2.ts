/**
 * Chapter two: Mrs Okafor on the stairs, and the first chance to lie. A
 * flowing scene: its words are written in place, the answer you give brings
 * her reply, and the chapter reads on to Saturday.
 */
import type { Content } from '@ifloom/engine'
import { choice, decide, text, when } from '@ifloom/engine/flow'

export const ch2: Content = {
  scenes: [
    {
      id: 'ch2.stairs',
      title: 'Chapter two: the stairs',
      body: [
        text(`Mrs Okafor from downstairs catches you on the landing. “Has anything come for June? Her sister keeps asking.”`),
        when({ chose: 'ch1.mat#open' }, [text(`You think of the postcard tucked inside, and the phone number written on it twice.`)]),
        when({ chose: 'ch1.mat#shelf' }, [text(`You think of the letter on the shelf, still sealed.`)]),
        decide('answer', [
          choice('truth', 'Tell her about the letter', {
            effects: [{ stat: 'courage', by: 1 }],
            then: [text(`She nods, and pats the banister as if it had done well. “I’ll tell her sister.”`)],
          }),
          choice('deny', '“Nothing yet.”', {
            effects: [{ kv: 'fibs', by: 1 }],
            then: [text(`“Oh well.” She looks at the shelf by your door for a second too long.`)],
          }),
          // A lie to cover a letter you opened is a second lie.
          choice('blame', '“Only something that came open in the post.”', {
            when: { chose: 'ch1.mat#open' },
            effects: [{ kv: 'fibs', by: 2 }],
            then: [text(`Her eyebrows go up, and stay up all the way down the stairs.`)],
          }),
        ]),
        text(`
          The rest of the week goes quietly. The letter stays where you left it.

          Then it's Saturday.
        `),
      ],
      choices: [{ id: 'saturday', label: 'Answer the door', effects: [{ turn: true }, { scene: 'ch3.door' }] }],
    },
  ],
}
