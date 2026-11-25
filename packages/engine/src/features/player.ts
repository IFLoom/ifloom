/**
 * The player: what content says of whoever plays the game when they're no entity of the game's, such as the picture
 * beside their own spoken lines. A protagonist the `you` effect chooses is an entity, and its own picture is used.
 */
import { defineFeature, lastWins, once } from './feature.ts'

/** The player as content declares them, in `player`. */
export type PlayerDef = {
  /**
   * The player's picture, a path in the game's `art/` folder (`'people/you.png'`) or a URL. The view gives it to the
   * player's own spoken lines, as a speaker's entity gives its picture to theirs.
   */
  image?: string
}

/** The player feature's content key, as types. */
export type PlayerShape = {
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

/** The player feature, which reads `player`. */
export const player = defineFeature<PlayerShape>({
  name: 'player',
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
})
