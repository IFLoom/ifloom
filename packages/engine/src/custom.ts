import type { Game } from './game.ts'
import { GAME_ID, pluginCondition, pluginEffect, pluginMacro, pluginName, pluginQuery, pluginValue, type PluginArgs } from './plugin.ts'
import { draw } from './random.ts'
import { phraseText } from './prose.ts'
import { phraseRows } from './features/phrases.ts'
import type { Effect, GameState } from './types.ts'
import { customCall, type EffectRef, type QueryAnswer, type QueryArgs, type QueryRegistry } from './calls.ts'

/*
 * The game's own code, by name, in `rules`.
 *
 * Content is data: conditions and effects a tool can read, a mod can ship and
 * the loader can check. The few things that are genuinely computed live in
 * the game's `rules` instead, as named functions, and content calls them by
 * name with `game` in front, as it calls a plugin's: `{ 'game/canAffordRent':
 * true }` as a condition, `{ 'game/payRent': {} }` as an effect,
 * `{{rentDue}}` in prose, `max: { value: 'game/energyCeiling' }` on a
 * stat. The rules run as the plugin `game` (`rulesPlugin`), so each game
 * owns its own: two games in one page, or a test next to a game, never see
 * each other's functions.
 */

/**
 * The context every plugin or game function gets beside the state, with the game, queries, values and seeded draws.
 * `PluginContext` extends it.
 */
export type CustomContext = {
  /** The context's loaded game. */
  game: Game
  /** The context's query function, which asks a plugin or the game by full name (`query('loyalty/stampsLeft')`). */
  query: Query
  /**
   * The context's value function, which returns a value by full name, a plugin's (`messages/unread`) or the game's,
   * asked with `args`. It returns undefined when no plugin or game has that value.
   */
  value: (name: string, args?: PluginArgs) => string | number | undefined
  /**
   * The context's roll function, which returns a whole number from 0 to `max - 1`, drawn from the save's seed, the
   * turn and `name`. The same save and turn always draw the same number.
   */
  roll: (max: number, name: string) => number
}

/**
 * A function that asks a plugin or the game a query by full name. It returns undefined when the game has no such query.
 *
 * A name declared in `QueryRegistry` takes its declared arguments and returns its declared answer. Any other name
 * takes any arguments, and you give the answer's type, as in `query<number>('loyalty/stampsLeft')`.
 */
export type Query = {
  <K extends keyof QueryRegistry>(name: K, ...args: QueryArgs<K>): QueryAnswer<K> | undefined
  <T = unknown>(name: string, args?: PluginArgs): T | undefined
}

/** Returns the part of every context that needs no plugin, for this state. */
export function customContext(state: GameState, game: Game): CustomContext {
  return {
    game,
    query: ((name: string, args: PluginArgs = {}) => pluginQuery(game, name)?.(state, args)) as Query,
    value: (name, args = {}) => customValue(game, name)?.(state, args),
    roll: (max, name) => draw(max, name, state.seed, state.turn),
  }
}

export {
  callOf,
  commandOf,
  customCall,
  shortFormProblem,
  type CommandCall,
  type CommandRegistry,
  type CommandRef,
  type ConditionCall,
  type ConditionRegistry,
  type CustomCall,
  type EffectCall,
  type EffectRegistry,
  type EffectRef,
  type PluginCall,
  type ViewRegistry,
  type ViewsIn,
  type QueryRegistry,
  type ValueRef,
} from './calls.ts'

/** Returns the condition with this full name, a plugin's or the game's own (`game/…`), or undefined when none has it. */
export function customCondition(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => boolean) | undefined {
  return pluginCondition(game, name)
}

/** Returns the value with this full name, a plugin's or the game's own (`game/…`), or undefined when none has it. The game's phrases answer first. */
export function customValue(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => string | number) | undefined {
  // The game's phrases answer as its values do, before `rules.values`: `{ value: 'game/outfit.verdict' }`.
  const parts = pluginName(name)
  if (game && parts?.plugin === GAME_ID && phraseRows(game, parts.name)) return (state, args = {}) => phraseText(state, game, parts.name, args) ?? ''
  return pluginValue(game, name)
}

/** Returns true when the game or one of its plugins has an effect or a macro with this full name. */
export function hasCustomEffect(game: Game | undefined, name: string): boolean {
  return Boolean(pluginEffect(game, name) ?? pluginMacro(game, name))
}

/**
 * Returns the effects ready for the reducer, without the calls no plugin or game has. The content checker
 * (`checkGame`) reports each call it leaves out.
 *
 * Every other effect stays as written. A call runs in its turn, on the state the effects before it left.
 */
export function buildEffects(game: Game, refs: readonly EffectRef[]): Effect[] {
  return refs.filter((entry) => {
    const call = customCall(entry)
    return !call || hasCustomEffect(game, call.custom)
  })
}

/**
 * Returns the effects with each macro, the game's or a plugin's, worked out against `state`. Prices, guards and locks
 * read them before a command runs.
 *
 * Applying the effects works each macro out in its turn instead, so this preview reads the state from before any of
 * them apply.
 */
export function previewEffects(state: GameState, game: Game, effects: readonly Effect[], depth = 0): Effect[] {
  const out: Effect[] = []
  for (const effect of effects) {
    const call = customCall(effect)
    const fn = call && !pluginEffect(game, call.custom) ? pluginMacro(game, call.custom) : undefined
    if (!fn) out.push(effect)
    // A macro can name others; ten deep is a loop, not a design.
    else if (depth < 10) out.push(...previewEffects(state, game, buildEffects(game, fn(state, call!.with ?? {})), depth + 1))
  }
  return out
}
