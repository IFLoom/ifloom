/** What the café can do in a week: end it, feed the staff, improve the soup, hire. The buttons in `game.ts` run these. */
import type { Content } from '@ifloom/engine'

export const activities: Content = {
  activities: [
    {
      id: 'endWeek',
      effects: [
        { custom: 'takings' },
        { custom: 'wages' },
        // A week's work wears everyone down a little.
        { kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: -8, of: '$' }] },
        // Anyone at the end of their tether hands in their apron.
        { kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', entity: '$' }] },
        { kind: 'turn' },
      ],
    },
    {
      id: 'staffLunch',
      cost: { stats: { coins: 25 } },
      blocked: [{ when: { not: { count: 'staff' } }, reason: 'There is nobody to feed.' }],
      effects: [{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: 15, of: '$' }] }],
    },
    {
      id: 'improveSoup',
      cost: { stats: { coins: 40 } },
      blocked: [{ when: { stat: 'quality', of: 'dish:soup', gte: 5 }, reason: 'It could not be better.' }],
      effects: [{ kind: 'stat', stat: 'quality', by: 1, of: 'dish:soup' }],
    },
    {
      id: 'interview',
      blocked: [{ when: { count: 'staff', gte: 4 }, reason: 'There is no room behind the counter.' }],
      effects: [{ kind: 'scene', scene: 'hiring' }],
    },
  ],
}
