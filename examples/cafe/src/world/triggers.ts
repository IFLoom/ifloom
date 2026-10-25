/** What the game watches for after every command: the till, the staff and a good review. */
import type { Content } from '@ifloom/engine'

export const triggers: Content = {
  triggers: [
    { id: 'overdrawn', once: { per: 'turn' }, when: { stat: 'coins', lt: 0 }, effects: [{ notify: 'The bank has written.', tag: 'money' }] },
    { id: 'empty', once: { per: 'turn' }, when: { count: 'staff', lt: 1 }, effects: [{ notify: 'Nobody to open up tomorrow.', tag: 'staff' }] },
    // A happy team is a good review: once, the first week two of them are glad to be there.
    {
      id: 'review',
      when: { count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 },
      effects: [
        { stat: 'reputation', by: 10 },
        { notify: 'A glowing review in the local paper.', tag: 'press' },
      ],
    },
  ],
}
