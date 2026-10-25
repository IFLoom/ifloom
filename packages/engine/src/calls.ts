/**
 * Calls by name, as content writes them: a custom condition, effect or
 * command in either form, a value named with its arguments. Pure, and with no
 * imports but types, so the core features can read a call without loading
 * the core.
 */
import type { PluginArgs } from './plugin.ts'
import type { Command, Effect } from './types.ts'

/**
 * A plugin's condition, effect or command in short, or the game's own
 * (`game/…`, from its `rules`): its full name as the only key, and its
 * arguments as the value, `{ 'quests/done': { quest: 'bakery' } }`. The arguments are
 * always an object; `true` calls it with none, as in `{ 'calendar/weekend':
 * true }`. Anything else (a list, a string, a number) is a problem the content
 * checker reports, and the call is asked with no arguments.
 */
export type PluginCall = { [name: CallName]: PluginArgs | true }

/** A call's full name: a plugin's id (or `game`), a `/`, and the name: `'quests/done'`. */
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
 * The conditions plugins and the game add, by full name, with what content
 * writes as each one's value: its arguments, or `true` for none.
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

/** The effects plugins and the game add, by full name, with what content writes as each one's value. As `ConditionRegistry`. */
export interface EffectRegistry {}

/** The commands plugins and the game add, by full name, with what content writes as each one's value. As `ConditionRegistry`. */
export interface CommandRegistry {}

/**
 * The queries plugins and the game answer, by full name, each as a function
 * from its arguments to its answer, which `context.query` reads:
 * `'places/here': (args?: {}) => string | null`.
 */
export interface QueryRegistry {}

/**
 * What each plugin puts in the view, by its id, which `view.plugins` reads:
 * `shop: ShopView`. The game's own `rules.view` is `game`.
 */
export interface ViewRegistry {}

/** One call in short per declared name: `{ 'quests/done': { quest: string } }`. */
type DeclaredCall<R> = { [K in keyof R & CallName]: { [P in K]: R[K] } }[keyof R & CallName]

/** A call to a name nobody declares: any arguments, so long as the name isn't a declared one. */
type UndeclaredCall<R> = PluginCall & { [K in keyof R & CallName]?: never }

/** A call in short, checked against a registry when its name is declared there, and loose otherwise. */
export type CallIn<R> = DeclaredCall<R> | UndeclaredCall<R>

/** A condition by name, a plugin's or the game's own, in short: checked against `ConditionRegistry`. */
export type ConditionCall = CallIn<ConditionRegistry>

/** An effect by name, a plugin's or the game's own, in short: checked against `EffectRegistry`. */
export type EffectCall = CallIn<EffectRegistry>

/** A command by name, a plugin's or the game's own, in short: checked against `CommandRegistry`. */
export type CommandCall = CallIn<CommandRegistry>

/** What a query takes and answers: its declared arguments and answer, or anything for a name nobody declares. */
export type QueryArgs<K extends PropertyKey> = K extends keyof QueryRegistry
  ? QueryRegistry[K] extends (...args: infer A) => unknown
    ? A
    : [PluginArgs?]
  : [PluginArgs?]
export type QueryAnswer<K extends PropertyKey> = K extends keyof QueryRegistry
  ? QueryRegistry[K] extends (...args: never[]) => infer R
    ? R
    : unknown
  : unknown

/** What the plugins put in the view, by plugin id: typed for each plugin that declares its view in `ViewRegistry`. */
export type ViewsIn = { readonly [K in keyof ViewRegistry]?: ViewRegistry[K] } & Readonly<Record<string, unknown>>

/**
 * A value named by content, with what it is asked: a stat's ceiling, an
 * app's badge, an achievement's progress. `{ value: 'messages/unread', with:
 * { channel: 'texts' } }`.
 */
export type ValueRef = { value: string; with?: PluginArgs }

/** A call by name, as the engine reads one written in short. */
export type CustomCall = { custom: string; with?: Record<string, unknown> }

/** An effect as content writes it: one of the engine's, or a plugin's or the game's own in short. The same as `Effect`. */
export type EffectRef = Effect

/** A command as content writes it: a plain command, or a plugin's in short (`{ 'places/go': { id: 'cafe' } }`), checked against `CommandRegistry`. */
export type CommandRef = Command | CommandCall

const isArgs = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The name of a short call (`{ 'quests/done': … }`), if the object is one. */
function shortName(entry: object): string | undefined {
  if ('custom' in entry || 'kind' in entry || 'type' in entry) return undefined
  const keys = Object.keys(entry)
  return keys.length === 1 && keys[0].includes('/') ? keys[0] : undefined
}

/**
 * The call a condition or effect makes, if it is one: the short form read
 * into its name and arguments. Anything else, a built-in, is undefined.
 */
export function customCall(entry: object): CustomCall | undefined {
  const name = shortName(entry)
  if (!name) return undefined
  const value = (entry as Record<string, unknown>)[name]
  return isArgs(value) ? { custom: name, with: value } : { custom: name }
}

/**
 * The name and arguments of a call in short, `{ 'calendar/pass': { by: 2 } }`
 * as `{ name: 'calendar/pass', with: { by: 2 } }`, or undefined for anything
 * else: one of the engine's own effects or conditions. For code that looks at
 * a list of effects, such as a plugin's guard or price.
 */
export function callOf(entry: object): { name: string; with: Record<string, unknown> } | undefined {
  const call = customCall(entry)
  return call ? { name: call.custom, with: call.with ?? {} } : undefined
}

/**
 * What is wrong with a short call's arguments, if anything: they're an object,
 * or `true` for none. `{ 'places/at': ['cafe'] }` is reported, and is asked
 * with no arguments.
 */
export function shortFormProblem(entry: object): string | undefined {
  const name = shortName(entry)
  if (!name) return undefined
  const value = (entry as Record<string, unknown>)[name]
  if (value === true || isArgs(value)) return undefined
  return `"${name}" takes its arguments as an object, such as { "${name}": { … } }, or true for none; this one has ${JSON.stringify(value)}`
}

/** A command as the engine runs it: a plugin's short form read as `{ type: 'custom', name, with }`. */
export function commandOf(ref: CommandRef): Command {
  const call = customCall(ref)
  if (!call || 'type' in ref) return ref as Command
  return call.with ? { type: 'custom', name: call.custom, with: call.with } : { type: 'custom', name: call.custom }
}
