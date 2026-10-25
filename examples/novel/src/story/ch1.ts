/**
 * Chapter one: the letter on the mat. The reader types their name here, and
 * opens the letter or shelves it.
 */
import type { Content } from '@ifloom/engine'

export const ch1: Content = {
  // The story opens on the mat.
  introScene: 'ch1.mat',
  // No saving on the first page until the reader has typed a name, so every save has one.
  saveable: [{ when: { not: { kv: 'playerName' } }, reason: 'Type your name first.' }],
  inputs: [{ id: 'playerName', label: 'Your name', type: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
  scenes: [
    {
      id: 'ch1.mat',
      title: 'Chapter one: the mat',
      body: [
        { text: 'ch1.mat' },
        // Only in a New Game+, which carries `readBefore` over from a finished read.
        { text: 'ch1.mat.again', when: { kv: 'readBefore' } },
        { text: 'ch1.mat.named', when: { kv: 'playerName' } },
      ],
      choices: [
        {
          id: 'open',
          when: { kv: 'playerName' },
          effects: [{ stat: 'courage', by: 1 }, { turn: true }, { scene: 'ch2.stairs' }],
        },
        { id: 'shelf', when: { kv: 'playerName' }, effects: [{ turn: true }, { scene: 'ch2.stairs' }] },
      ],
    },
  ],
  prose: {
    'ch1.mat':
      'The flat still smells of someone else’s cooking. On the mat, under the takeaway menus, is a letter with a stamp from the seaside and a name on it that isn’t yours: J. Hart.',
    'ch1.mat.again': 'You have the oddest feeling you have stood here before, with this exact letter in your hand.',
    'ch1.mat.named': 'You turn it over, {{playerName}}. The flap is barely stuck.',
    'ch1.mat#open': 'Open it',
    'ch1.mat#shelf': 'Put it on the shelf by the door',
  },
}
