/**
 * Calls by name, as content writes them: a custom condition, effect or
 * command in either form, a value named with its arguments. Pure, and with no
 * imports but types, so the core features can read a call without loading
 * the core.
 */
import type { PluginArgs } from './plugin.ts'
import type { Command, Effect } from './types.ts'

/**
 * A plugin's condition, effect or command in short: its full name as the only
 * key, and its arguments as the value. `{ 'quests/done': { quest: 'bakery' } }`
 * is `{ custom: 'quests/done', with: { quest: 'bakery' } }`. The arguments are
 * always an object; `true` calls it with none, as in `{ 'calendar/weekend':
 * true }`. Anything else (a list, a string, a number) is a problem the content
 * checker reports, and the call is asked with no arguments.
 */
export type PluginCall = { [name: `${string}/${string}`]: PluginArgs | true }

/**
 * A value named by content, with what it is asked: a stat's ceiling, an
 * app's badge, an achievement's progress. `{ value: 'messages/unread', with:
 * { channel: 'texts' } }`.
 */
export type ValueRef = { value: string; with?: PluginArgs }

/** A call by name, in either form, as the engine reads it. */
export type CustomCall = { custom: string; with?: Record<string, unknown> }

/** An effect as content writes it: a plain effect, or a custom one by name, in either form. */
export type EffectRef = Effect | CustomCall | PluginCall

/** A command as content writes it: a plain command, or a plugin's in short (`{ 'places/go': { id: 'cafe' } }`). */
export type CommandRef = Command | PluginCall

const isArgs = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The name of a short call (`{ 'quests/done': … }`), if the object is one. */
function shortName(entry: object): string | undefined {
  if ('custom' in entry || 'kind' in entry || 'type' in entry) return undefined
  const keys = Object.keys(entry)
  return keys.length === 1 && keys[0].includes('/') ? keys[0] : undefined
}

/**
 * The call a condition or effect makes, if it is one: `{ custom }` as written,
 * or the short form read into it. Anything else — a built-in — is undefined.
 */
export function customCall(entry: object): CustomCall | undefined {
  if ('custom' in entry && typeof entry.custom === 'string') return entry as CustomCall
  const name = shortName(entry)
  if (!name) return undefined
  const value = (entry as Record<string, unknown>)[name]
  return isArgs(value) ? { custom: name, with: value } : { custom: name }
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
