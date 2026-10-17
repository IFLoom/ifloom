/**
 * Inputs as the engine exports them, with the core's context bound in. The
 * feature, and what an input is, are in `features/inputs.ts`.
 */
import type { Game } from './game.ts'
import { featureContext } from './core.ts'
import * as inputs from './features/inputs.ts'
import type { KvValue, GameState } from './types.ts'

export type { InputDef } from './features/inputs.ts'
export { inputById, inputValue } from './features/inputs.ts'

/** Why this value can't be entered, as the player reads it; undefined if it can. */
export function inputRefusal(state: GameState, game: Game, id: string, value: KvValue | undefined): string | undefined {
  return inputs.inputRefusal(state, game, id, value, featureContext())
}
