/**
 * Calls by name, the plugin and `game/…` conditions, effects, commands and values content writes. The module
 * imports only types, so a core feature can read a call without loading the core.
 */
import type { PluginArgs } from './plugin.ts'
import type { PartnerQueries } from './partners.ts'
import type { Command, Effect } from './types.ts'

/**
 * A plugin's or the game's condition, effect or command in the short form, with its full name as the only key. The value
 * is its arguments as an object, or `true` for none.
 *
 * `{ 'quests/done': { quest: 'bakery' } }` and `{ 'calendar/weekend': true }` are calls. Any other value, such as a
 * list, a string or a number, is a problem the content checker reports, and the engine asks the call with no
 * arguments.
 */
export type PluginCall = { [name: CallName]: PluginArgs | true }

/** A call's full name, a plugin's id (or `game`), a `/` and the name, such as `'quests/done'`. */
export type CallName = `${string}/${string}`

/*
 * The registries: what each call by name takes, keyed by its full name. A
 * plugin declares its own by augmenting them, as it declares its `TraitRegistry`,
 * and the game can declare its `game/…` calls the same way. A call whose
 * name is declared is checked against it, so a misspelled argument fails to
 * compile; a call whose name nobody declares takes any arguments
 * (`PluginArgs`), so a plugin that declares nothing still compiles. Empty in
 * the engine: it knows no plugin.
 */
/**
 * The registry of conditions plugins and the game add, by full name, with each one's arguments, or `true` for none.
 * A plugin augments it, and a call to a declared name is type-checked against it.
 *
 * ```ts
 * declare module '@ifloom/engine' {
 *   interface ConditionRegistry {
 *     'quests/done': { quest: string }
 *     'calendar/weekend': true
 *   }
 * }
 * ```
 */
export interface ConditionRegistry {}

/** The registry of effects plugins and the game add, by full name, with each one's arguments. It works as `ConditionRegistry` does. */
export interface EffectRegistry {}

/** The registry of commands plugins and the game add, by full name, with each one's arguments. It works as `ConditionRegistry` does. */
export interface CommandRegistry {}

/**
 * The registry of queries plugins and the game answer, by full name, each typed as a function from its arguments to
 * its answer (`'loyalty/stampsLeft': () => number`). `context.query` and `pluginQuery` read it.
 *
 * It extends `PartnerQueries`, the queries first-party plugins ask each other, so those are typed in every program.
 */
export interface QueryRegistry extends PartnerQueries {}

/**
 * The registry of each plugin's view by plugin id (`shop: ShopView`), which types `view.plugins`. The game's own
 * `rules.view` is under `game`.
 */
export interface ViewRegistry {}

/** One call in short per declared name: `{ 'quests/done': { quest: string } }`. */
type DeclaredCall<R> = { [K in keyof R & CallName]: { [P in K]: R[K] } }[keyof R & CallName]

/** A call to a name nobody declares: any arguments, so long as the name isn't a declared one. */
type UndeclaredCall<R> = PluginCall & { [K in keyof R & CallName]?: never }

/** A call in the short form, type-checked against registry `R` when its name is declared there and loose otherwise. */
export type CallIn<R> = DeclaredCall<R> | UndeclaredCall<R>

/** A plugin's or the game's condition in the short form, type-checked against `ConditionRegistry`. */
export type ConditionCall = CallIn<ConditionRegistry>

/** A plugin's or the game's effect in the short form, type-checked against `EffectRegistry`. */
export type EffectCall = CallIn<EffectRegistry>

/** A plugin's or the game's command in the short form, type-checked against `CommandRegistry`. */
export type CommandCall = CallIn<CommandRegistry>

/** The arguments a query takes, as `QueryRegistry` declares them, or an optional object for an undeclared name. */
export type QueryArgs<K extends PropertyKey> = K extends keyof QueryRegistry
  ? QueryRegistry[K] extends (...args: infer A) => unknown
    ? A
    : [PluginArgs?]
  : [PluginArgs?]
/** The answer a query gives, as `QueryRegistry` declares it, or `unknown` for an undeclared name. */
export type QueryAnswer<K extends PropertyKey> = K extends keyof QueryRegistry
  ? QueryRegistry[K] extends (...args: never[]) => infer R
    ? R
    : unknown
  : unknown

/** The plugins' views by plugin id, in `view.plugins`. Each plugin that declares its view in `ViewRegistry` is typed. */
export type ViewsIn = { readonly [K in keyof ViewRegistry]?: ViewRegistry[K] } & Readonly<Record<string, unknown>>

/**
 * A reference to a value by full name, with the arguments it is asked with. It sets a stat's ceiling, an app's badge
 * or an achievement's progress, as in `{ value: 'messages/unread', with: { channel: 'texts' } }`.
 */
export type ValueRef = {
  /** The value's full name, a plugin's (`messages/unread`) or the game's (`game/…`). */
  value: string
  /** The arguments the value is asked with. None if left out. */
  with?: PluginArgs
}

/** A call in the short form read into its name, `custom`, and its arguments, `with`. */
export type CustomCall = { custom: string; with?: Record<string, unknown> }

/** An effect in content, one of the engine's or a plugin's or the game's in the short form. It is the same type as `Effect`. */
export type EffectRef = Effect

/** A command in content, a plain command or a plugin's in the short form (`{ 'places/go': { id: 'cafe' } }`), checked against `CommandRegistry`. */
export type CommandRef = Command | CommandCall

const isArgs = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The name of a short call (`{ 'quests/done': … }`), if the object is one. */
function shortName(entry: object): string | undefined {
  if ('custom' in entry || 'kind' in entry || 'type' in entry) return undefined
  const keys = Object.keys(entry)
  return keys.length === 1 && keys[0].includes('/') ? keys[0] : undefined
}

/**
 * Returns the call a condition or effect in the short form makes, read into its name and arguments. Returns undefined for
 * one of the engine's own.
 */
export function customCall(entry: object): CustomCall | undefined {
  const name = shortName(entry)
  if (!name) return undefined
  const value = (entry as Record<string, unknown>)[name]
  return isArgs(value) ? { custom: name, with: value } : { custom: name }
}

/**
 * Returns the name and arguments of a call in the short form, or undefined for the engine's own conditions and effects.
 * A plugin's guard or price uses it to read effects.
 *
 * `{ 'calendar/pass': { by: 2 } }` gives `{ name: 'calendar/pass', with: { by: 2 } }`.
 */
export function callOf(entry: object): { name: string; with: Record<string, unknown> } | undefined {
  const call = customCall(entry)
  return call ? { name: call.custom, with: call.with ?? {} } : undefined
}

/**
 * Returns the problem with a short-form call's arguments, or undefined when they are an object or `true`. A call such
 * as `{ 'places/at': ['cafe'] }` is reported and asked with no arguments.
 */
export function shortFormProblem(entry: object): string | undefined {
  const name = shortName(entry)
  if (!name) return undefined
  const value = (entry as Record<string, unknown>)[name]
  if (value === true || isArgs(value)) return undefined
  return `"${name}" takes its arguments as an object, such as { "${name}": { … } }, or true for none; this one has ${JSON.stringify(value)}`
}

/** Returns the command the engine runs for `ref`. A short-form call becomes `{ type: 'custom', name, with }`. */
export function commandOf(ref: CommandRef): Command {
  const call = customCall(ref)
  if (!call || 'type' in ref) return ref as Command
  return call.with ? { type: 'custom', name: call.custom, with: call.with } : { type: 'custom', name: call.custom }
}
