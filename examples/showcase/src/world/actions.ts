/**
 * Things to do anywhere: wait. A place's own actions are in its file in
 * `story/`, and the camera's are on the phone, in `world/phone.ts`.
 */
import type { Content } from '@ifloom/engine'
import { pass } from '@ifloom/plugin-calendar'

export const actions: Content = {
  // Offered wherever you are.
  actions: [{ id: 'wait', label: 'Wait a while', effects: [pass(1)] }],
  // One post a day: each new day (a turn, here) resets it.
  resets: { postedToday: false },
  prose: {
    'post.photo': 'New town, new faces.',
    'comment.nice': 'Lovely!',
  },
}
