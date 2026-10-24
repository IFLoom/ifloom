/**
 * Small Town's own code: its rules, and the custom functions its content calls
 * by name. Everything else in the game is data, in `world/` and `story/`.
 */
import { artSrc, entityImage, heldBy, parseRef, PLAYER, roll, type Custom, type GameRules } from '@ifloom/engine'
import { postTo, react } from '@ifloom/plugin-feed'

/** How the town runs: energy back overnight. What's locked when, and what each day resets, are content, in the story. */
export const rules: GameRules = {
  // Energy back to full overnight.
  onTurn: (_state, { apply }) => apply([{ kind: 'stat', stat: 'energy', to: 100 }]),
}

/**
 * The cat's name, and one effect worked out from the state. It returns plain
 * effects, a plugin's included, and draws its dice from the save's seed, so
 * the same save always gets the same likes.
 */

export const custom: Custom = {
  values: {
    // The cat's name as the player typed it, or a cat with no name yet.
    catName: (state) => (typeof state.kv.catName === 'string' ? state.kv.catName : 'The cat'),
  },
  effects: {
    // Post the newest photo, and roll how it does.
    postLatest: (state, _args, { game }) => {
      const photos = heldBy(state, game, PLAYER).filter(({ ref }) => parseRef(ref)?.kind === 'photo')
      const latest = photos.at(-1)?.ref
      if (!latest) return []
      const image = entityImage(state, game, latest)
      const id = `post.photo.${parseRef(latest)!.id}`
      const likes = 2 + roll(10, state.seed, state.turn, 'likes') + (state.stats.charm ?? 0)
      return [
        postTo('social', id, { text: 'post.photo', ...(image ? { image: artSrc(image) } : {}) }),
        { kind: 'stat', stat: 'charm', by: 1 },
        react(id, { likes, from: 'ava', text: 'comment.nice' }),
      ]
    },
  },
}
