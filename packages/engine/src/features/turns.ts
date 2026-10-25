/**
 * Turns: the engine's one clock, and what ending a turn does.
 */
import type { Game } from '../game.ts'
import type { GameState, Range } from '../types.ts'
import { defineFeature, type FeatureContext } from './feature.ts'
import { inRange, wanted } from '../range.ts'

/** What the turns feature adds, as types. */
export type TurnsShape = {
  state: {
    /**
     * How many turns have passed: the engine's one clock. What a turn is belongs
     * to the game — a day, an hour, a week, a chapter — and everything the engine
     * dates (`seen`, `fired`, notices) is dated in turns.
     */
    turn: number
  }
  conditions: {
    /**
     * How many turns have passed, in a range. It names nothing, so the range
     * is its value. Turn 0 is the first, so `{ turn: { gte: 3 } }` is the fourth on.
     */
    turn: { turn: Range }
  }
  effects: {
    /** End the turn, `{ turn: true }`, or several times, `{ turn: { by: 3 } }`: the game's turn rules run each time. */
    turn: { turn: true | { by: number } }
  }
  view: {
    /** How many turns have passed: 0 on the first. */
    turn: number
  }
}

/**
 * The end of a turn: the counter moves on, `resets` are put back, then the
 * game's `rules.onTurn`, every plugin's `onTurn` hook, the game's
 * `rules.onTurnDone`, which sees what the plugins did (the calendar's new day,
 * say), and last every plugin's `onTurnDone`. `before` is the state the turn ended on, which both rules are handed
 * as `before`. What
 * runs here runs with `ending` set, so a `turn` effect among it (applied by
 * the game's hook or a plugin's through its context) does nothing: a turn
 * ending inside a turn's end would end the turn again, and again.
 */
export function endTurn(state: GameState, game: Game, cx: FeatureContext, before: GameState = state): GameState {
  const begun = { ...state, turn: state.turn + 1, kv: { ...state.kv, ...game.resets } }
  const ruled = game.rules?.onTurn ? game.rules.onTurn(begun, cx.turnContext(begun, game, before)) : begun
  const hooked = cx.turnHooks(ruled, game)
  const done = game.rules?.onTurnDone ? game.rules.onTurnDone(hooked, cx.turnContext(hooked, game, before)) : hooked
  return cx.turnDoneHooks(done, game)
}

export const turns = defineFeature<TurnsShape>({
  name: 'turns',
  state: {
    turn: { start: () => 0, load: () => 0, keeps: (value) => typeof value === 'number' },
  },
  conditions: {
    turn: {
      holds: (state, condition) => inRange(state.turn, condition.turn),
      explain: (state, condition) => `turn ${state.turn}; wants ${wanted(condition.turn)}`,
      references: () => [],
    },
  },
  effects: {
    turn: {
      apply: (state, effect, game, cx) => {
        if (cx.ending) return state
        let next = state
        const times = effect.turn === true ? 1 : effect.turn.by
        for (let n = 0; n < times; n += 1) next = endTurn(next, game, cx)
        return next
      },
      references: () => [],
    },
  },
  view: (state) => ({ turn: state.turn }),
})
