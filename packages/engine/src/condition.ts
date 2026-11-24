import type { Game } from './game.ts'
import { conditionEntry, featureContext } from './core.ts'
import { withAmounts } from './amount.ts'
import type { Condition, GameState } from './types.ts'

export type { Condition, Range } from './types.ts'

/**
 * Returns true when `condition` holds in this state. An undefined condition always holds.
 *
 * The engine finds a condition's kind by its one key. A condition with no known key, or with two, never holds, and
 * the content checker reports it. A range bound that is an `Amount` is worked out first, so the kind reads a
 * number.
 */
export function holds(state: GameState, game: Game, condition: Condition | undefined): boolean {
  if (!condition) return true
  const entry = conditionEntry(condition)
  return entry ? entry.holds(state, withAmounts(state, condition, game), game, featureContext()) : false
}
