// src/story/cafe.ts
import { text, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

export const cafe: Content = {
  entities: [
    places.location({
      id: 'cafe',
      name: 'The corner café',
      description: 'Café',
      exits: ['high-street'],
      blocked: [{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
      body: [
        text('Steam on the windows.'),
        text('Ruth is behind the counter, flour to the elbows.', { when: cast.here('ruth') }),
        text('The counter is empty.', { when: { not: cast.here('ruth') } }),
      ],
    }),
  ],
  scenes: [
    {
      id: 'ruth.talk',
      speaker: 'ruth',
      body: [
        text('"Hello, love. What can I get you?"'),
        text('She is already reaching for your usual cup.', { when: { stat: 'friendship', of: cast.character('ruth'), gte: 5 } }),
      ],
      choices: [
        {
          id: 'chat',
          label: 'Ask how the bread is going',
          once: { per: 'turn', reason: 'She has a queue.' },
          effects: [{ stat: 'friendship', by: 5, of: cast.character('ruth') }, { scene: null }],
        },
        { id: 'bye', label: 'Just looking, thanks', effects: [{ scene: null }] },
      ],
    },
  ],
}
