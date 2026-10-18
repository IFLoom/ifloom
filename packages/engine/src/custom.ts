import type { Game } from './game.ts'
import { pluginCondition, pluginEffect, pluginQuery, pluginValue, type PluginArgs } from './plugin.ts'
import { roll } from './random.ts'
import type { Effect, GameState } from './types.ts'
import { customCall, type EffectRef } from './calls.ts'

/**
 * The game's own code, by name.
 *
 * Content is data — conditions and effects a tool can read, a mod can ship and
 * the loader can check. The few things that are genuinely computed live here
 * instead, as named functions on the game, and content calls them by name:
 * `{ custom: 'canAffordRent' }` as a condition, `{ custom: 'payRent', with: {} }`
 * as an effect, `{{v:rentDue}}` in prose, `max: { value: 'energyCeiling' }` on
 * a stat, `panelData: 'stallPrices'` on a scene.
 *
 * Each game owns its own: two games in one page, or a test next to a game,
 * never see each other's functions.
 *
 * A name with a `/` in it belongs to a plugin — `quests/done` is the `done`
 * condition of the plugin `quests` — and is looked up there instead.
 */
export type CustomCondition = (state: GameState, args: PluginArgs, context: CustomContext) => boolean
/**
 * Works out effects from the state. It can return anything content can write,
 * a plugin's `{ 'quests/start': { quest } }` or another of the game's own
 * included. It runs in its turn, on the state the effects before it left.
 */
export type CustomEffect = (state: GameState, args: PluginArgs, context: CustomContext) => EffectRef[]
/** A word or a number for prose (`{{v:name}}`), a stat's ceiling or a badge, asked with what the content passes in `with`. */
export type CustomValue = (state: GameState, args: PluginArgs, context: CustomContext) => string | number
/** What a scene's or an app's panel draws, shaped by the game. */
export type CustomPanel = (state: GameState, context: CustomContext) => unknown

export type Custom = {
  conditions?: Record<string, CustomCondition>
  effects?: Record<string, CustomEffect>
  values?: Record<string, CustomValue>
  panels?: Record<string, CustomPanel>
}

/**
 * What a game's own function is handed besides the state and its arguments,
 * as a plugin's is (`PluginContext` has all of it too): the game, the
 * plugins' answers and values, and seeded draws.
 */
export type CustomContext = {
  game: Game
  /**
   * Ask a plugin something by its full name: `query('places/here')`.
   * Undefined when the game does not have that plugin.
   */
  query: <T = unknown>(name: string, args?: PluginArgs) => T | undefined
  /**
   * A value by name, a plugin's (`messages/unread`) or the game's own, asked
   * with `args`. Undefined when nobody has it.
   */
  value: (name: string, args?: PluginArgs) => string | number | undefined
  /**
   * A whole number from 0 to `max - 1`, drawn from the save's seed, the turn
   * and `name`: the same save and turn always draw the same.
   */
  roll: (max: number, name: string) => number
}

/**
 * What `rules.onTurn` and `rules.onTurnDone` are handed besides the state: a game function's context,
 * the state as the turn ended, and `apply` for effects, as a plugin's
 * context has it. A `turn` effect applied here does nothing: a turn's end
 * can't end another turn.
 */
export type TurnContext = CustomContext & {
  /** The state as the turn ended, before the counter moved on and `resets` were put back. */
  before: GameState
  /** Apply effects as content would, any custom or plugin effect included, to the state the hook was handed, or to `on`. */
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
}

/** The context a game's own function or a plugin's gets for this state. */
export function customContext(state: GameState, game: Game): CustomContext {
  return {
    game,
    query: <T,>(name: string, args: PluginArgs = {}) => pluginQuery(game, name)?.(state, args) as T | undefined,
    value: (name, args = {}) => customValue(game, name)?.(state, args),
    roll: (max, name) => roll(max, name, state.seed, state.turn),
  }
}

export { commandOf, customCall, shortFormProblem, type CommandRef, type CustomCall, type EffectRef, type PluginCall, type ValueRef } from './calls.ts'

/** A custom condition by name, a plugin's or the game's own, ready to ask. */
export function customCondition(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => boolean) | undefined {
  const fromPlugin = pluginCondition(game, name)
  if (fromPlugin) return fromPlugin
  const fn = game?.custom?.conditions?.[name]
  return fn && game ? (state, args = {}) => fn(state, args, customContext(state, game)) : undefined
}

/** One of the game's own custom effects by name, ready to work out the effects it stands for. A plugin's isn't one: see `hasCustomEffect`. */
export function customEffect(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => EffectRef[]) | undefined {
  const fn = game?.custom?.effects?.[name]
  return fn && game ? (state, args = {}) => fn(state, args, customContext(state, game)) : undefined
}

/** A value by name, a plugin's or the game's own, ready to ask. */
export function customValue(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => string | number) | undefined {
  const fromPlugin = pluginValue(game, name)
  if (fromPlugin) return fromPlugin
  const fn = game?.custom?.values?.[name]
  return fn && game ? (state, args = {}) => fn(state, args, customContext(state, game)) : undefined
}

/** Does the game or one of its plugins have an effect by this name? */
export function hasCustomEffect(game: Game | undefined, name: string): boolean {
  return Boolean(pluginEffect(game, name) ?? game?.custom?.effects?.[name])
}

/** A custom panel by name, ready to draw. */
export function customPanel(game: Game | undefined, name: string): ((state: GameState) => unknown) | undefined {
  const fn = game?.custom?.panels?.[name]
  return fn && game ? (state) => fn(state, customContext(state, game)) : undefined
}

/**
 * Flatten an effect list into the plain effects the reducer takes. A custom
 * call, the game's own or a plugin's, is passed on as `{ kind: 'custom' }`
 * and runs in its turn, on the state the effects before it left. A custom
 * effect nobody has contributes nothing; the content checker (`checkGame`)
 * reports it by name.
 */
export function buildEffects(_state: GameState, game: Game, refs: readonly EffectRef[]): Effect[] {
  const out: Effect[] = []
  for (const entry of refs) {
    const ref = customCall(entry)
    if (!ref) out.push(entry as Effect)
    else if (hasCustomEffect(game, ref.custom)) out.push(ref.with ? { kind: 'custom', name: ref.custom, with: ref.with } : { kind: 'custom', name: ref.custom })
  }
  return out
}

/**
 * Effects with each of the game's own custom effects worked out against
 * `state`: what a button would do, before it runs, for prices, guards and
 * locks to see. Applying them works each one out in its turn instead, so
 * what this shows is read from the state before any of them apply.
 */
export function previewEffects(state: GameState, game: Game, effects: readonly Effect[], depth = 0): Effect[] {
  const out: Effect[] = []
  for (const effect of effects) {
    const fn = effect.kind === 'custom' && !pluginEffect(game, effect.name) ? customEffect(game, effect.name) : undefined
    if (!fn) out.push(effect)
    // A custom effect can name others; ten deep is a loop, not a design.
    else if (depth < 10) out.push(...previewEffects(state, game, buildEffects(state, game, fn(state, (effect as { with?: PluginArgs }).with ?? {})), depth + 1))
  }
  return out
}
