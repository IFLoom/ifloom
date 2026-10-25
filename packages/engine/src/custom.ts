import type { Game } from './game.ts'
import { GAME_ID, pluginCondition, pluginEffect, pluginName, pluginQuery, pluginValue, type PluginArgs } from './plugin.ts'
import { draw } from './random.ts'
import type { Effect, GameState } from './types.ts'
import { customCall, type EffectRef, type QueryAnswer, type QueryArgs, type QueryRegistry } from './calls.ts'

/**
 * The game's own code, by name, in `rules`.
 *
 * Content is data: conditions and effects a tool can read, a mod can ship and
 * the loader can check. The few things that are genuinely computed live in
 * the game's `rules` instead, as named functions, and content calls them by
 * name with `game` in front, as it calls a plugin's: `{ 'game/canAffordRent':
 * true }` as a condition, `{ 'game/payRent': {} }` as an effect,
 * `{{v:game/rentDue}}` in prose, `max: { value: 'game/energyCeiling' }` on a
 * stat.
 *
 * Each game owns its own: two games in one page, or a test next to a game,
 * never see each other's functions.
 */
export type CustomCondition = (state: GameState, args: PluginArgs, context: CustomContext) => boolean
/**
 * Works out effects from the state. It can return anything content can write,
 * a plugin's `{ 'quests/start': { quest } }` or another of the game's own
 * included. It runs in its turn, on the state the effects before it left.
 */
export type CustomEffect = (state: GameState, args: PluginArgs, context: CustomContext) => EffectRef[]
/** A word or a number for prose (`{{v:game/name}}`), a stat's ceiling or a badge, asked with what the content passes in `with`. */
export type CustomValue = (state: GameState, args: PluginArgs, context: CustomContext) => string | number

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
  query: Query
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
 * Ask a plugin or the game something by full name. A name declared in
 * `QueryRegistry` takes its arguments and answers its type; any other takes any
 * arguments, with the answer's type given: `query<string | null>('places/here')`.
 * Undefined when the game does not have it.
 */
export type Query = {
  <K extends keyof QueryRegistry>(name: K, ...args: QueryArgs<K>): QueryAnswer<K> | undefined
  <T = unknown>(name: string, args?: PluginArgs): T | undefined
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

/** A condition by full name, a plugin's or the game's own (`game/…`), ready to ask. */
export function customCondition(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => boolean) | undefined {
  return pluginCondition(game, name)
}

/** One of the game's own effects by full name (`game/payRent`), ready to work out the effects it stands for. A plugin's isn't one: see `hasCustomEffect`. */
export function customEffect(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => EffectRef[]) | undefined {
  const parts = pluginName(name)
  const fn = parts?.plugin === GAME_ID && game?.rules?.effects && Object.hasOwn(game.rules.effects, parts.name) ? game.rules.effects[parts.name] : undefined
  return fn && game ? (state, args = {}) => fn(state, args, customContext(state, game)) : undefined
}

/** A value by full name, a plugin's or the game's own (`game/…`), ready to ask. */
export function customValue(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => string | number) | undefined {
  return pluginValue(game, name)
}

/** Does the game or one of its plugins have an effect by this full name? */
export function hasCustomEffect(game: Game | undefined, name: string): boolean {
  return Boolean(pluginEffect(game, name) ?? customEffect(game, name))
}

/**
 * Effects as the reducer takes them: a call to an effect nobody has (a
 * plugin the game doesn't have, a name the game never declared) is left
 * out, as it would do nothing; the content checker (`checkGame`) reports it
 * by name. Every other effect is kept as written, and a call runs in its
 * turn, on the state the effects before it left.
 */
export function buildEffects(game: Game, refs: readonly EffectRef[]): Effect[] {
  return refs.filter((entry) => {
    const call = customCall(entry)
    return !call || hasCustomEffect(game, call.custom)
  })
}

/**
 * Effects with each of the game's own effects worked out against `state`:
 * what a button would do, before it runs, for prices, guards and locks to
 * see. Applying them works each one out in its turn instead, so what this
 * shows is read from the state before any of them apply.
 */
export function previewEffects(state: GameState, game: Game, effects: readonly Effect[], depth = 0): Effect[] {
  const out: Effect[] = []
  for (const effect of effects) {
    const call = customCall(effect)
    const fn = call && !pluginEffect(game, call.custom) ? customEffect(game, call.custom) : undefined
    if (!fn) out.push(effect)
    // An effect of the game's can name others; ten deep is a loop, not a design.
    else if (depth < 10) out.push(...previewEffects(state, game, buildEffects(game, fn(state, call!.with ?? {})), depth + 1))
  }
  return out
}
