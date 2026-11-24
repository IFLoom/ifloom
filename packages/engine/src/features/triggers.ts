/**
 * Triggers: effects that happen by themselves, the first time a condition
 * holds after a command. Firing them is the first step after every command
 * that took, before a new showing is counted and before the plugins' `onCommand`
 * hooks, so both see what the triggers did.
 */
import type { EffectRef } from '../custom.ts'
import type { Game } from '../game.ts'
import type { Condition, Effect, GameState } from '../types.ts'
import { byId, defineFeature, listWords, mergedById, type FeatureContext } from './feature.ts'

/**
 * A trigger the game declares in `triggers`, effects that run by themselves. They run the first time `when` holds
 * after a command.
 *
 * Use one for a text that arrives the turn after a meeting, a notice when a debt comes due, or a scene that
 * interrupts.
 */
export type TriggerDef = {
  /** The trigger's id, which `state.fired` records. */
  id: string
  /** The trigger's condition. The trigger fires the first time it holds after a command. */
  when: Condition
  /** The trigger's effects, which run when it fires. */
  effects: EffectRef[]
  /** The trigger's limit, once in the whole game (`{ per: 'game' }`) or at most once a turn (`{ per: 'turn' }`). `{ per: 'game' }` if left out. */
  once?: { per: 'game' | 'turn' }
}

/** The triggers feature's state and content key, as types. */
export type TriggersShape = {
  state: {
    /** The turn each trigger last fired on, by trigger id. */
    fired: Record<string, number>
  }
  game: {
    /** The game's triggers, effects that run by themselves the first time a condition holds. They fire in this order. */
    triggers?: TriggerDef[]
  }
  pack: {
    /** The pack's triggers, merged by id over the content's. */
    triggers?: TriggerDef[]
  }
  lists: 'trigger'
}

/**
 * Fires every trigger that is due and returns the state after them. They fire in the order the game lists them,
 * each on the state the one before left.
 *
 * A firing that makes a trigger's `when` hold fires that trigger in the same pass only if it comes later in the
 * list. Otherwise it waits for the next command.
 */
export function fireTriggers(state: GameState, game: Game, apply: (state: GameState, effects: Effect[]) => GameState, cx: FeatureContext): GameState {
  let next = state
  for (const trigger of game.triggers ?? []) {
    const last = next.fired?.[trigger.id]
    if (last !== undefined && (trigger.once?.per !== 'turn' || last === next.turn)) continue
    if (!cx.holds(next, game, trigger.when)) continue
    const effects = cx.buildEffects(game, trigger.effects)
    next = apply({ ...next, fired: { ...next.fired, [trigger.id]: next.turn } }, effects)
  }
  return next
}

/** The triggers feature, which fires triggers first after every command that took. */
export const triggers = defineFeature<TriggersShape>({
  name: 'triggers',
  state: {
    fired: { start: () => ({}), load: () => ({}) },
  },
  pack: mergedById<TriggersShape['game'], TriggersShape['pack'], TriggerDef>({ base: (game) => game.triggers, pack: (pack) => pack.triggers }, (game, list) => {
    game.triggers = list
  }),
  content: { triggers: { declares: byId('trigger'), words: listWords('triggers', 'trigger', { effects: 'effects' }) } },
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
