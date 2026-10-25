/**
 * Small Town's own code: its rules, the hooks and the functions its content
 * calls by name, as `game/…`. Everything else in the game is data, in
 * `world/` and `story/`.
 */
import { artSrc, entityImage, heldBy, parseRef, PLAYER, type GameRules } from '@ifloom/engine'
import { feed } from '@ifloom/plugin-feed'

/**
 * The game's own calls, declared as a plugin declares its own, so content
 * written in code is checked: `{ 'game/postLatest': true }` compiles, and a
 * call with arguments it doesn't take doesn't.
 */
declare module '@ifloom/engine' {
  interface EffectRegistry {
    'game/postLatest': true
  }
}

/**
 * How the town runs: energy back overnight, the cat's name, and one effect
 * worked out from the state. What's locked when, and what each day resets,
 * are content, in the story.
 */
export const rules: GameRules = {
  // Energy back to full overnight.
  onTurn: (_state, { apply }) => apply([{ stat: 'energy', to: 100 }]),
  values: {
    // The cat's name as the player typed it, or a cat with no name yet.
    catName: (state) => (typeof state.kv.catName === 'string' ? state.kv.catName : 'The cat'),
  },
  // Content calls these as `game/…`: `{{v:game/catName}}`, `{ 'game/postLatest': true }`.
  effects: {
    // Post the newest photo, and roll how it does. It returns plain effects, a plugin's
    // included, and draws its dice from the save's seed, so the same save gets the same likes.
    postLatest: (state, _args, { game, roll }) => {
      const photos = heldBy(state, game, PLAYER).filter(({ ref }) => parseRef(ref)?.kind === 'photo')
      const latest = photos.at(-1)?.ref
      if (!latest) return []
      const image = entityImage(state, game, latest)
      const id = `post.photo.${parseRef(latest)!.id}`
      const likes = 2 + roll(10, 'likes') + (state.stats.charm ?? 0)
      return [
        feed.post('social', id, { text: 'New town, new faces.', ...(image ? { image: artSrc(image) } : {}) }),
        { stat: 'charm', by: 1 },
        feed.react(id, { likes, from: 'ava', text: 'Lovely!' }),
      ]
    },
  },
}
