/**
 * The ending: when the game counts as finished, and what a New Game+ carries
 * over from the game before. The runner records the first time `finished`
 * holds in the profile's `core:finished`; each feature carries its own key of
 * `carryOver` (its `carry`).
 */
import type { CarryOver } from '../game.ts'
import type { Condition } from '../types.ts'
import { defineFeature, lastWins, once, together } from './feature.ts'

/** The ending feature's content keys, as types. */
export type EndingShape = {
  game: {
    /** The game's rules for a New Game+, the parts of the last game a new one keeps. `startingState`'s `carry` applies them. */
    carryOver?: CarryOver
    /**
     * The game's condition for being finished. The runner records the first time it
     * holds in the profile's `core:finished`, so a title page can offer New Game+.
     */
    finished?: Condition
  }
  pack: {
    /**
     * The pack's condition for the game being finished. It replaces the content's, and the runner records the
     * first time it holds in the profile's `core:finished`.
     */
    finished?: Condition
    /** The pack's rules for a New Game+. They replace the content's `carryOver` whole. */
    carryOver?: CarryOver
  }
  lists: 'finished' | 'carryOver'
}

/** The ending feature, which reads `finished` and `carryOver`. */
export const ending = defineFeature<EndingShape>({
  name: 'ending',
  pack: together(
    lastWins<EndingShape['game'], EndingShape['pack'], Condition>(
      'finished',
      (pack) => pack.finished,
      (game, finished) => {
        game.finished = finished
      },
    ),
    lastWins<EndingShape['game'], EndingShape['pack'], CarryOver>(
      'carryOver',
      (pack) => pack.carryOver,
      (game, carryOver) => {
        game.carryOver = carryOver
      },
    ),
  ),
  content: { finished: { declares: once('finished'), words: null }, carryOver: { declares: once('carryOver'), words: null } },
  lists: ['finished', 'carryOver'],
  // Each key of `carryOver` is checked by the feature that carries it (its `carry.check`).
  check: (game, tools) => tools.check({ list: 'finished' }, 'finished', [{ when: game.finished }]),
})
