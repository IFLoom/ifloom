/**
 * Things to do anywhere: wait, and the phone's camera. A place's own
 * activities are in its file in `story/`.
 */
import { SCHEMA, type Pack } from '@ifloom/engine'
import { pass } from '@ifloom/plugin-calendar'
import { here } from '@ifloom/plugin-cast'

export const activities: Pack = {
  id: 'world.activities',
  schema: SCHEMA,
  activities: [
    { id: 'wait', effects: [pass(1)] },
    // The camera: one photo of each person, if they're here to take.
    ...(['ava', 'sam'] as const).map((who) => ({
      id: `photo-${who}`,
      blocked: [{ when: { not: here(who) }, reason: 'They aren’t here.' }],
      effects: [
        {
          kind: 'collect' as const,
          collection: 'gallery',
          entry: { id: `photo.${who}`, title: who === 'ava' ? 'Ava at work' : 'Sam and the dog', image: `art/photo/${who}.svg` },
        },
      ],
    })),
    {
      id: 'post',
      cost: { stats: { energy: 5 } },
      blocked: [
        { when: { not: { collection: 'gallery' } }, reason: 'Take a photo first.' },
        { when: { kv: 'postedToday' }, reason: 'You have posted today.' },
      ],
      effects: [{ custom: 'postLatest' }, { kind: 'kv', key: 'postedToday', to: true }],
    },
  ],
  prose: {
    'post.photo': 'New town, new faces.',
    'comment.nice': 'Lovely!',
  },
}
