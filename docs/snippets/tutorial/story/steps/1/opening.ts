// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'ch1.stop',
  scenes: [
    {
      id: 'ch1.stop',
      title: 'Chapter one: the stop',
      body: [text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.')],
      choices: [
        { id: 'share', label: 'Hold the umbrella over both of you', effects: [{ scene: 'ch2.bus' }] },
        { id: 'keep', label: 'Keep the umbrella to yourself', effects: [{ scene: 'ch2.bus' }] },
      ],
    },
    {
      id: 'ch2.bus',
      title: 'Chapter two: the bus',
      body: [text('The bus comes at last. At the front, the driver looks at your card and shakes her head. "That card has run out, love."')],
      choices: [
        { id: 'pay', label: 'Count out the fare in coins', effects: [{ scene: 'ch3.home' }] },
        { id: 'excuse', label: '"It worked this morning."', effects: [{ scene: 'ch3.home' }] },
      ],
    },
    {
      id: 'ch3.home',
      title: 'Chapter three: home',
      body: [text('Your stop. The man gets off too, and turns up your street.')],
      choices: [],
    },
  ],
}
