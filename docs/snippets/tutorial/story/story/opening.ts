// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'ch1.stop',
  inputs: [{ id: 'playerName', label: 'Your name', type: 'text', maxLength: 20, when: { scene: ['ch1.stop'] } }],
  scenes: [
    {
      id: 'ch1.stop',
      title: 'Chapter one: the stop',
      body: [
        text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.'),
        text('He nods at you, {{playerName}}, as if he knows you from somewhere.', { when: { kv: 'playerName' } }),
      ],
      choices: [
        { id: 'share', label: 'Hold the umbrella over both of you', effects: [{ stat: 'warmth', by: 1 }, { scene: 'ch2.bus' }] },
        { id: 'keep', label: 'Keep the umbrella to yourself', effects: [{ scene: 'ch2.bus' }] },
      ],
    },
    {
      id: 'ch2.bus',
      title: 'Chapter two: the bus',
      body: [
        text('The bus comes at last. At the front, the driver looks at your card and shakes her head. "That card has run out, love."'),
        text('Behind you, the man from the stop is drying his glasses on his scarf.', { when: { chose: 'ch1.stop#share' } }),
        text('Behind you, the man from the stop is wringing out his sleeves.', { when: { chose: 'ch1.stop#keep' } }),
      ],
      choices: [
        { id: 'pay', label: 'Count out the fare in coins', effects: [{ stat: 'warmth', by: 1 }, { scene: 'ch3.home' }] },
        { id: 'excuse', label: '"It worked this morning."', effects: [{ scene: 'ch3.home' }] },
        { id: 'blame', label: '"He is paying for me."', when: { chose: 'ch1.stop#share' }, effects: [{ scene: 'ch3.home' }] },
      ],
    },
    {
      id: 'ch3.home',
      title: 'Chapter three: home',
      body: [
        text('Your stop. The man gets off too, and turns up your street.'),
        text('The driver calls goodnight after you both.', { when: { chose: 'ch2.bus#pay' } }),
        text('The driver watches you go and says nothing.', { when: { chose: 'ch2.bus#excuse' } }),
        text('The man gives you a long look and walks a little faster.', { when: { chose: 'ch2.bus#blame' } }),
      ],
      choices: [
        { id: 'wave', label: 'Wave him in for a cup of tea', when: { stat: 'warmth', gte: 2 }, effects: [{ scene: 'end.wave' }] },
        { id: 'door', label: 'Let yourself in', effects: [{ scene: 'end.door' }] },
      ],
    },
    {
      id: 'end.wave',
      title: 'The end',
      body: [text('He turns out to live two doors down. He brings biscuits next time.')],
      choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' } }],
    },
    {
      id: 'end.door',
      title: 'The end',
      body: [text('The kettle, the radiator, the rain on the window. You sleep well enough.')],
      choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' } }],
    },
  ],
}
