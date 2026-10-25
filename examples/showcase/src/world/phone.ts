/**
 * The game's own apps on the phone: a camera, with a button for each photo
 * and one to post the latest, and the notes you keep. The phone's stock apps
 * (texts, the feed, contacts, the gallery) come with `phone()`.
 */
import type { AppDef } from '@ifloom/plugin-devices'
import { cast } from '@ifloom/plugin-cast'

/** The camera: one photo of each person, if they're here to take, and a post a day. A photo is a thing the camera makes, kept by the player. */
export const camera: Omit<AppDef, 'on'> = {
  id: 'camera',
  name: 'Camera',
  icon: 'camera',
  sections: [
    {
      actions: [
        ...(['ava', 'sam'] as const).map((who) => ({
          id: `photo-${who}`,
          label: who === 'ava' ? 'Photograph Ava' : 'Photograph Sam',
          blocked: [{ when: { not: cast.here(who) }, reason: 'They aren’t here.' }],
          effects: [{ create: 'photo', with: { id: who, name: who === 'ava' ? 'Ava at work' : 'Sam and the dog', image: `photo/${who}.svg` }, at: 'player' }],
        })),
        {
          id: 'post',
          label: 'Post your latest photo',
          cost: { stats: { energy: 5 } },
          blocked: [
            { when: { not: { count: { of: 'photo', at: 'player' } } }, reason: 'Take a photo first.' },
            { when: { kv: 'postedToday' }, reason: 'You have posted today.' },
          ],
          effects: [{ 'game/postLatest': true }, { kv: 'postedToday', to: true }],
        },
      ],
    },
  ],
}

/** The notes you keep, such as Sam's welcome note. */
export const notes: Omit<AppDef, 'on'> = { id: 'notes', name: 'Notes', icon: 'notes', sections: [{ things: { of: 'note' } }] }
