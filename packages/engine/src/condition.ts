import type { Game } from './game.ts'
import { conditionEntry, featureContext } from './core.ts'
import type { Condition, GameState } from './types.ts'

export type { Condition, Range } from './types.ts'

/**
 * Whether a condition holds. No condition always holds. A condition is
 * looked up by its one kind key (`KINDS` in core.ts); one with no kind key,
 * or two, holds nowhere, and the content checker reports it.
 */
export function holds(
  state: GameState,
  condition: Condition | undefined,
  game?: Game,
): boolean {
  if (!condition) return true
  const entry = conditionEntry(condition)
  return entry ? entry.holds(state, condition, game, featureContext()) : false
}
