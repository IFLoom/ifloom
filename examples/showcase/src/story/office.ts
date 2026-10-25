/** The office: shifts on weekdays, in the day. */
import type { Content } from '@ifloom/engine'
import { pass, period, weekday } from '@ifloom/plugin-calendar'
import { at } from '@ifloom/plugin-places'
import { place } from '../place.ts'

export const office: Content = {
  // No phone at work.
  locks: [{ id: 'no-phone', when: at('office'), deny: ['devices/*'], reason: 'Not at work.' }],
  data: {
    places: {
      locations: [
        {
          ...place({ id: 'office', name: 'The Office', tag: 'Work', exits: ['high-street'] }),
          // Weekdays only, in the day.
          blocked: [
            { when: weekday(5, 6), reason: 'Shut at weekends.' },
            { when: { all: [weekday(4), { not: period('morning', 'afternoon') }] }, reason: 'Closed. Back on Monday.' },
            { when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
          ],
          actions: [{ id: 'work', label: 'Do a shift', cost: { stats: { energy: 30 } }, effects: [pass(2), { kind: 'stat', stat: 'coins', by: 20 }] }],
        },
      ],
    },
  },
  prose: {
    'place.office': 'Strip lights, a kettle, a stack of forms that never gets shorter.',
  },
}
