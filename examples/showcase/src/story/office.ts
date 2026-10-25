/** The office: shifts on weekdays, in the day. */
import { text, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { place } from '../place.ts'

export const office: Content = {
  // No phone at work.
  locks: [{ id: 'no-phone', when: places.at('office'), deny: ['devices/*'], reason: 'Not at work.' }],
  entities: [
    place({
      id: 'office',
      name: 'The Office',
      desc: 'Work',
      exits: ['high-street'],
      body: [text('Strip lights, a kettle, a stack of forms that never gets shorter.')],
      // Weekdays only, in the day.
      blocked: [
        { when: calendar.weekday(5, 6), reason: 'Shut at weekends.' },
        { when: { all: [calendar.weekday(4), { not: calendar.period('morning', 'afternoon') }] }, reason: 'Closed. Back on Monday.' },
        { when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
      ],
      actions: [{ id: 'work', label: 'Do a shift', cost: { stats: { energy: 30 } }, effects: [calendar.pass(2), { stat: 'coins', by: 20 }] }],
    }),
  ],
}
