/**
 * Turns and phases: the engine's one clock, what ending a turn does, and the
 * stretch of the game the player is in.
 */
import type { Game } from '../game.ts'
import type { GameState, Phase, Range } from '../types.ts'
import { defineFeature, inRange, wanted, type FeatureContext } from './feature.ts'

/** What the turns feature adds, as types. */
export type TurnsShape = {
  state: {
    phase: Phase
    /**
     * How many turns have passed: the engine's one clock. What a turn is belongs
     * to the game — a day, an hour, a week, a chapter — and everything the engine
     * dates (`seenOn`, `fired`, collection entries, notices) is dated in turns.
     */
    turn: number
  }
  conditions: {
    /** How many turns have passed. Turn 0 is the first, so `{ turn: true, gte: 3 }` is the fourth on. */
    turn: { turn: true } & Range
    phase: { phase: Phase[] }
  }
  effects: {
    phase: { kind: 'phase'; value: Phase }
    /** End the turn, `by` times (1 if left out): the game's turn rules run each time. */
    turn: { kind: 'turn'; by?: number }
  }
  game: {
    /** The stretch a new game opens in. */
    startPhase?: string
  }
  view: {
    phase: Phase
    /** How many turns have passed: 0 on the first. */
    turn: number
  }
}

/**
 * The end of a turn: the counter moves on, `resets` are put back, `rules.turn`'s
 * effects apply, then the game's `onTurn` and every plugin's `turn` hook run.
 * `before` is the state the turn ended on, which `rules.turn` is asked about.
 * What runs here runs with `ending` set, so a `turn` effect among it (in the
 * rules, or applied by a plugin through its context) does nothing: a turn
 * ending inside a turn's end would ask `rules.turn` again, and again.
 */
export function endTurn(state: GameState, game: Game, cx: FeatureContext, before: GameState = state): GameState {
  const next = state.turn + 1
  const rule = game.rules?.turn?.(before, next) ?? { effects: [] }
  const begun = cx.runEffects(
    { ...state, turn: next, flags: { ...state.flags, ...game.rules?.resets } },
    game,
    rule.effects,
    true,
  )
  return cx.turnHooks(game.rules?.onTurn?.(begun) ?? begun, game)
}

export const turns = defineFeature<TurnsShape>({
  name: 'turns',
  state: {
    phase: { start: (game) => game.startPhase ?? '' },
    turn: { start: () => 0, load: () => 0, keeps: (value) => typeof value === 'number' },
  },
  conditions: {
    turn: {
      holds: (state, condition) => inRange(state.turn, condition),
      explain: (state, condition) => `turn ${state.turn}; wants ${wanted(condition)}`,
      references: () => [],
    },
    phase: {
      holds: (state, condition) => condition.phase.includes(state.phase),
      explain: (state, condition) => `phase is ${state.phase || '(none)'}; wants one of ${condition.phase.join(', ')}`,
      references: () => [],
    },
  },
  effects: {
    phase: {
      apply: (state, effect) => ({ ...state, phase: effect.value }),
      references: () => [],
    },
    turn: {
      apply: (state, effect, game, cx) => {
        if (cx.ending) return state
        let next = state
        for (let n = 0; n < (effect.by ?? 1); n += 1) next = endTurn(next, game, cx)
        return next
      },
      references: () => [],
    },
  },
  view: (state) => ({ phase: state.phase, turn: state.turn }),
})
