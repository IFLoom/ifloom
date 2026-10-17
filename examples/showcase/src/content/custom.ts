/**
 * The only code in Small Town's content: one effect worked out from the state.
 * It returns plain effects — a plugin's included — and draws its dice from the
 * save's seed, so the same save always gets the same likes.
 */
import { roll, type Custom } from '@ifloom/engine'
import { postTo, react } from '@ifloom/plugin-feed'

export const custom: Custom = {
  values: {
    // The cat's name as the player typed it, or a cat with no name yet.
    catName: (state) => (typeof state.kv.catName === 'string' ? state.kv.catName : 'The cat'),
  },
  effects: {
    // Post the newest photo, and roll how it does.
    postLatest: (state) => {
      const photos = state.collections.gallery ?? []
      const latest = photos[photos.length - 1]
      if (!latest) return []
      const id = `post.${latest.id}`
      const likes = 2 + roll(10, state.seed, state.turn, 'likes') + (state.stats.charm ?? 0)
      return [
        postTo('social', id, { text: 'post.photo', image: latest.image }),
        { kind: 'stat', key: 'charm', by: 1 },
        react(id, { likes, from: 'ava', text: 'comment.nice' }),
      ]
    },
  },
}
