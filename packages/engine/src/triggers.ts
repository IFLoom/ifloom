/**
 * Triggers as the engine exports them, with the core's context bound in. The
 * feature, and what a trigger is, are in `features/triggers.ts`.
 */
import type { Game } from './game.ts'
import { featureContext } from './core.ts'
import * as triggers from './features/triggers.ts'
import type { Effect, GameState } from './types.ts'

export type { TriggerDef } from './features/triggers.ts'

/**
 * Fire every trigger whose time has come, in the order the game lists them,
 * each on the state the one before left. A trigger that a firing makes true is
 * tested in the same pass only if it comes later in the list; otherwise it
 * waits for the next command.
 */
export function fireTriggers(
  state: GameState,
  game: Game,
  apply: (state: GameState, effects: Effect[]) => GameState,
): GameState {
  return triggers.fireTriggers(state, game, apply, featureContext())
}
