/**
 * Things to do anywhere: wait, and the phone's camera. A place's own
 * activities are in its file in `story/`.
 */
import type { Content } from '@ifloom/engine'
import { pass } from '@ifloom/plugin-calendar'
import { here } from '@ifloom/plugin-cast'

export const activities: Content = {
  // Offered wherever you are.
  actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
  // One post a day: each new day (a turn, here) resets it.
  resets: { postedToday: false },
  activities: [
    { id: 'wait', effects: [pass(1)] },
    // The camera: one photo of each person, if they're here to take. A photo is a thing the camera makes, kept by the player.
    ...(['ava', 'sam'] as const).map((who) => ({
      id: `photo-${who}`,
      blocked: [{ when: { not: here(who) }, reason: 'They aren’t here.' }],
      effects: [
        {
          kind: 'create' as const,
          of: 'photo',
          entity: { id: who, name: who === 'ava' ? 'Ava at work' : 'Sam and the dog', image: `photo/${who}.svg` },
          at: 'player',
        },
      ],
    })),
    {
      id: 'post',
      cost: { stats: { energy: 5 } },
      blocked: [
        { when: { not: { count: { of: 'photo', at: 'player' } } }, reason: 'Take a photo first.' },
        { when: { kv: 'postedToday' }, reason: 'You have posted today.' },
      ],
      effects: [{ 'game/postLatest': true }, { kind: 'kv', key: 'postedToday', to: true }],
    },
  ],
  prose: {
    'post.photo': 'New town, new faces.',
    'comment.nice': 'Lovely!',
  },
}
