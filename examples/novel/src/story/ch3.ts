/** Chapter three: June's sister at the door, and the two endings. */
import type { Content } from '@ifloom/engine'

const readIt = { kv: 'readBefore', to: true } as const

export const ch3: Content = {
  // Reaching either ending finishes the game, and the title screen then offers New Game+.
  finished: { scene: ['end.kept', 'end.posted'] },
  // A New Game+ keeps only this: that the reader has been through it once.
  carryOver: { kv: ['readBefore'] },
  scenes: [
    {
      id: 'ch3.door',
      title: 'Chapter three: the door',
      body: [
        { text: 'On Saturday someone knocks. A woman with June’s chin and a carrier bag of shopping: “I’m her sister. I was told there might be post.”' },
        { text: 'You already told Mrs Okafor everything, and it shows: she smiles before you speak.', when: { kv: 'fibs', lt: 1 } },
        { text: 'Mrs Okafor is behind her on the stairs, not quite looking at you.', when: { kv: 'fibs', is: 1 } },
        { text: 'Mrs Okafor is behind her on the stairs, and she has clearly been talking.', when: { kv: 'fibs', gte: 2 } },
      ],
      choices: [
        // Either ending marks the story as read, for a New Game+ to carry over.
        { id: 'hand', label: 'Give her the letter yourself', when: { stat: 'courage', gte: 3 }, effects: [readIt, { scene: 'end.kept' }] },
        { id: 'post', label: 'Say you’ll send it on', effects: [readIt, { scene: 'end.posted' }] },
      ],
    },
    // Each ending offers the story again: `newGame` starts it over, keeping the reader's settings.
    {
      id: 'end.kept',
      title: 'The end',
      body: [{ text: 'She reads it on your doorstep and laughs, then cries a bit, then asks if you want a biscuit. You do.' }],
      choices: [{ id: 'again', label: 'Read it again', command: { type: 'newGame' }, effects: [] }],
    },
    {
      id: 'end.posted',
      title: 'The end',
      body: [{ text: 'You write the address she gives you on a fresh envelope. It goes in the postbox on the corner, and that is that.' }],
      choices: [{ id: 'again', label: 'Read it again', command: { type: 'newGame' }, effects: [] }],
    },
  ],
}
