/**
 * The ending: when the game counts as finished, and what a New Game+ carries
 * over from the game before. The runner records the first time `finished`
 * holds in the profile's `core:finished`; each feature carries its own key of
 * `carryOver` (its `carry`).
 */
import type { CarryOver } from '../game.ts'
import type { Condition } from '../types.ts'
import { defineFeature, lastWins, once, together } from './feature.ts'

/** What the ending feature adds, as types. */
export type EndingShape = {
  game: {
    /** What a New Game+ carries over from the game before. See `startingState`'s `carry`. */
    carryOver?: CarryOver
    /**
     * When the game counts as finished. The runner records the first time it
     * holds in the profile's `core:finished`, so a title screen can offer New Game+.
     */
    finished?: Condition
  }
  pack: {
    /**
     * When the game counts as finished. The runner records the first time it
     * holds in the profile's `core:finished`, so a title screen can offer New
     * Game+. A pack's replaces the content's.
     */
    finished?: Condition
    /** What a New Game+ carries over from the game before. A pack's replaces the content's, whole. */
    carryOver?: CarryOver
  }
  lists: 'finished' | 'carryOver'
}

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
