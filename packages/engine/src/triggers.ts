import { holds, type Condition } from './condition.ts'
import { buildEffects, type EffectRef } from './custom.ts'
import type { Game } from './game.ts'
import type { Effect, GameState } from './types.ts'

/**
 * Effects that happen by themselves: the first time `when` holds after a
 * command, they apply. A text that arrives the turn after a meeting, a notice
 * when a debt comes due, a scene that interrupts.
 */
export type TriggerDef = {
  id: string
  when: Condition
  effects: EffectRef[]
  /** Fire once in the whole game (the default), or at most once a turn. */
  once?: 'game' | 'turn'
}

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
  let next = state
  for (const trigger of game.triggers ?? []) {
    const last = next.fired?.[trigger.id]
    if (last !== undefined && (trigger.once !== 'turn' || last === next.turn)) continue
    if (!holds(next, trigger.when, game)) continue
    const effects = buildEffects(next, game, trigger.effects)
    next = apply({ ...next, fired: { ...next.fired, [trigger.id]: next.turn } }, effects)
  }
  return next
}
