/** Chapter three: June's sister at the door, and the two endings. */
import type { Content } from '@ifloom/engine'

const readIt = { kind: 'kv', key: 'readBefore', to: true } as const

export const ch3: Content = {
  scenes: [
    {
      id: 'ch3.door',
      title: 'Chapter three: the door',
      body: [
        { text: 'ch3.door' },
        { text: 'ch3.door.honest', when: { kv: 'fibs', lt: 1 } },
        { text: 'ch3.door.fib', when: { kv: 'fibs', is: 1 } },
        { text: 'ch3.door.tangle', when: { kv: 'fibs', gte: 2 } },
      ],
      choices: [
        // Either ending marks the story as read, for a New Game+ to carry over.
        { id: 'hand', when: { stat: 'courage', gte: 3 }, effects: [readIt, { kind: 'scene', scene: 'end.kept' }] },
        { id: 'post', effects: [readIt, { kind: 'scene', scene: 'end.posted' }] },
      ],
    },
    // Each ending offers the story again: `newGame` starts it over, keeping the reader's settings.
    { id: 'end.kept', title: 'The end', body: [{ text: 'end.kept' }], choices: [{ id: 'again', command: { type: 'newGame' }, effects: [] }] },
    { id: 'end.posted', title: 'The end', body: [{ text: 'end.posted' }], choices: [{ id: 'again', command: { type: 'newGame' }, effects: [] }] },
  ],
  prose: {
    'ch3.door': 'On Saturday someone knocks. A woman with June’s chin and a carrier bag of shopping: “I’m her sister. I was told there might be post.”',
    'ch3.door.honest': 'You already told Mrs Okafor everything, and it shows: she smiles before you speak.',
    'ch3.door.fib': 'Mrs Okafor is behind her on the stairs, not quite looking at you.',
    'ch3.door.tangle': 'Mrs Okafor is behind her on the stairs, and she has clearly been talking.',
    'ch3.door#hand': 'Give her the letter yourself',
    'ch3.door#post': 'Say you’ll send it on',
    'end.kept': 'She reads it on your doorstep and laughs, then cries a bit, then asks if you want a biscuit. You do.',
    'end.posted': 'You write the address she gives you on a fresh envelope. It goes in the postbox on the corner, and that is that.',
    'end.kept#again': 'Read it again',
    'end.posted#again': 'Read it again',
  },
}
