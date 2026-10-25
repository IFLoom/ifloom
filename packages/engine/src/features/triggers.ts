/**
 * Triggers: effects that happen by themselves, the first time a condition
 * holds after a command. Firing them is the first step after every command
 * that took, before a new showing is counted and before the plugins' `onCommand`
 * hooks, so both see what the triggers did.
 */
import type { EffectRef } from '../custom.ts'
import type { Game } from '../game.ts'
import type { Condition, Effect, GameState } from '../types.ts'
import { defineFeature, mergedById, type FeatureContext } from './feature.ts'

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

/** What the triggers feature adds, as types. */
export type TriggersShape = {
  state: {
    /** The turn each trigger last fired, by trigger id. */
    fired: Record<string, number>
  }
  game: {
    /** Effects that happen by themselves the first time a condition holds. */
    triggers?: TriggerDef[]
  }
  pack: {
    triggers?: TriggerDef[]
  }
  lists: 'trigger'
}

/**
 * Fire every trigger whose time has come, in the order the game lists them,
 * each on the state the one before left. A trigger that a firing makes true is
 * tested in the same pass only if it comes later in the list; otherwise it
 * waits for the next command.
 */
export function fireTriggers(state: GameState, game: Game, apply: (state: GameState, effects: Effect[]) => GameState, cx: FeatureContext): GameState {
  let next = state
  for (const trigger of game.triggers ?? []) {
    const last = next.fired?.[trigger.id]
    if (last !== undefined && (trigger.once !== 'turn' || last === next.turn)) continue
    if (!cx.holds(next, game, trigger.when)) continue
    const effects = cx.buildEffects(game, trigger.effects)
    next = apply({ ...next, fired: { ...next.fired, [trigger.id]: next.turn } }, effects)
  }
  return next
}

export const triggers = defineFeature<TriggersShape>({
  name: 'triggers',
  state: {
    fired: { start: () => ({}), load: () => ({}) },
  },
  pack: mergedById<TriggersShape['game'], TriggersShape['pack'], TriggerDef>({ base: (game) => game.triggers, pack: (pack) => pack.triggers }, (game, list) => {
    game.triggers = list
  }),
  lists: ['trigger'],
  check: (game, tools) => {
    tools.twice(
      'trigger',
      'triggers',
      (game.triggers ?? []).map((entry) => entry.id),
    )
    for (const trigger of game.triggers ?? []) {
      tools.check({ list: 'trigger', id: trigger.id }, `trigger ${trigger.id}`, [{ when: trigger.when }, { effects: trigger.effects }])
    }
  },
  // The first step after a command: the features after it in this slot (a new showing) and the plugins' hooks see what fired.
  afterCommand: {
    at: 'beforePlugins',
    run: (_before, after, game, cx) => fireTriggers(after, game, (state, effects) => cx.runEffects(state, game, effects, false), cx),
  },
})
