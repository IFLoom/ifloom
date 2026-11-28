/**
 * The player: whom the player is playing, and what content says of whoever plays the game when they're no entity of
 * the game's, such as the picture beside their own spoken lines. A protagonist the `you` effect chooses is an entity,
 * `'you'` names it, and its own picture is used.
 */
import { hasEntity, isUnique, kindOf, parseRef, PLAYER, YOU, type EntityRef } from '../entities.ts'
import { defineFeature, lastWins, once } from './feature.ts'

/** The player as content declares them, in `player`. */
export type PlayerDef = {
  /**
   * The player's picture, a path in the game's `art/` folder (`'people/you.png'`) or a URL. The view gives it to the
   * player's own spoken lines, as a speaker's entity gives its picture to theirs.
   */
  image?: string
}

/** The player feature's state, effect, reference and content key, as types. */
export type PlayerShape = {
  state: {
    /** The protagonist the player is playing, which `'you'` names. Null while the player plays themselves. */
    you: EntityRef | null
  }
  effects: {
    /**
     * An effect that makes a protagonist, a unique entity, the one `'you'` names, such as `{ you: 'character:ava' }`.
     * `{ you: null }` makes the player themselves again.
     */
    you: { you: string | null }
  }
  references: {
    /** A reference to whom a `you` effect makes the player play: `'player'` or an entity of a unique kind. */
    protagonist: { protagonist: string }
  }
  game: {
    /** The game's player, such as their picture beside their own spoken lines. */
    player?: PlayerDef
  }
  pack: {
    /** The pack's player. It replaces the content's `player` whole. */
    player?: PlayerDef
  }
  lists: 'player'
}

/** The player feature, which keeps the protagonist `'you'` names and reads `player`. */
export const player = defineFeature<PlayerShape>({
  name: 'player',
  state: {
    you: { start: () => null, load: () => null },
  },
  effects: {
    you: {
      apply: (state, effect, game) => {
        const to = effect.you
        if (to === null || to === PLAYER) return state.you === null ? state : { ...state, you: null }
        if (to === YOU || !isUnique(game, to) || !hasEntity(state, game, to)) return state
        return state.you === to ? state : { ...state, you: to as EntityRef }
      },
      references: (effect) => (effect.you === null ? [] : [{ protagonist: effect.you }]),
    },
  },
  pack: lastWins<PlayerShape['game'], PlayerShape['pack'], PlayerDef>(
    'player',
    (pack) => pack.player,
    (game, value) => {
      game.player = value
    },
  ),
  content: { player: { declares: once('player'), words: null } },
  lists: ['player'],
  check: (game, tools) => {
    if (game.player?.image !== undefined) tools.check({ list: 'player' }, 'player', [{ picture: game.player.image }])
  },
  resolve: (game) => ({
    protagonist: ({ protagonist: who }) => {
      if (who === PLAYER || who === '$') return []
      if (who === YOU) return ['"you" is already whoever is played: name the protagonist, or null for the player']
      const parts = parseRef(who)
      if (!parts) return [`unknown protagonist "${who}": a protagonist is "player" or a unique entity`]
      const kind = kindOf(game, parts.kind)
      if (!kind) return [`unknown kind "${parts.kind}"`]
      if (!kind.unique) return [`"${who}" can't be played: its kind "${parts.kind}" isn't unique`]
      return []
    },
  }),
})
