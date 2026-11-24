/**
 * Turns: the engine's one clock, and what ending a turn does.
 */
import type { Game } from '../game.ts'
import type { GameState, Range } from '../types.ts'
import { defineFeature, type FeatureContext } from './feature.ts'
import { amountBounds, inRange, rangeWith, wanted } from '../range.ts'

/** The turns feature's state, calls and view, as types. */
export type TurnsShape = {
  state: {
    /**
     * The number of turns that have passed, the engine's one clock. It starts at 0.
     *
     * The game decides how long a turn is (a day, an hour, a week or a chapter). The engine dates `seen`, `fired`
     * and notices in turns.
     */
    turn: number
  }
  conditions: {
    /**
     * A condition that holds while the number of turns passed is in the range. Turn 0 is the first, so
     * `{ turn: { gte: 3 } }` holds from the fourth turn on.
     */
    turn: { turn: Range }
  }
  effects: {
    /**
     * An effect that ends the turn once, `{ turn: true }`, or several times, `{ turn: { by: 3 } }`. The game's turn
     * hooks run each time.
     */
    turn: { turn: true | { by: number } }
  }
  view: {
    /** The number of turns that have passed, 0 on the first. */
    turn: number
  }
}

/**
 * Returns the state after one turn ends. `before` is the state the turn ended on, which every hook gets as
 * `context.before`.
 *
 * @remarks
 * The engine adds one to `turn`, puts back the game's `resets`, then runs every `onTurn` hook and then every
 * `onTurnDone` hook, the game's first in each. So an `onTurnDone` hook sees what the `onTurn` hooks did (the
 * calendar's new day, say). The hooks run with `ending` set, so a `turn` effect inside them does nothing, since
 * it would end the turn again without stopping.
 */
export function endTurn(state: GameState, game: Game, cx: FeatureContext, before: GameState = state): GameState {
  const begun = { ...state, turn: state.turn + 1, kv: { ...state.kv, ...game.resets } }
  return cx.turnDoneHooks(cx.turnHooks(begun, game, before), game, before)
}

/** The turns feature, which counts turns and ends them. */
export const turns = defineFeature<TurnsShape>({
  name: 'turns',
  state: {
    turn: { start: () => 0, load: () => 0, keeps: (value) => typeof value === 'number' },
  },
  conditions: {
    turn: {
      holds: (state, condition, game, cx) =>
        inRange(
          state.turn,
          rangeWith(condition.turn, (amount) => cx.amount(state, game, amount)),
        ),
      explain: (state, condition, game, cx) => `turn ${state.turn}; wants ${wanted(rangeWith(condition.turn, (amount) => cx.amount(state, game, amount)))}`,
      references: (condition) => amountBounds(condition.turn).map((amount) => ({ amount })),
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
