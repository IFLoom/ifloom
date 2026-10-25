/** What the café can do in a week: end it, feed the staff, improve the soup, hire. Each is a button the café always has. */
import type { Content } from '@ifloom/engine'

export const actions: Content = {
  actions: [
    {
      id: 'end-week',
      label: 'Count the till and end the week',
      effects: [
        { 'game/takings': true },
        { 'game/wages': true },
        // A week's work wears everyone down a little.
        { kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: -8, of: '$' }] },
        // Anyone at the end of their tether hands in their apron.
        { kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', entity: '$' }] },
        { kind: 'turn' },
      ],
    },
    {
      id: 'lunch',
      label: 'Buy the staff lunch',
      cost: { stats: { coins: 25 } },
      blocked: [{ when: { not: { count: 'staff' } }, reason: 'There is nobody to feed.' }],
      effects: [{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: 15, of: '$' }] }],
    },
    {
      id: 'soup',
      label: 'Better ingredients for the soup',
      cost: { stats: { coins: 40 } },
      blocked: [{ when: { stat: 'quality', of: 'dish:soup', gte: 5 }, reason: 'It could not be better.' }],
      effects: [{ kind: 'stat', stat: 'quality', by: 1, of: 'dish:soup' }],
    },
    {
      id: 'hire',
      label: 'Put a card in the window',
      blocked: [{ when: { count: 'staff', gte: 4 }, reason: 'There is no room behind the counter.' }],
      effects: [{ kind: 'scene', scene: 'hiring' }],
    },
  ],
}
