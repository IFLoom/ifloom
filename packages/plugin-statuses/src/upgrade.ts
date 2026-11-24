/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from. The plugin was the timed-effects
 * plugin, `effects`, until schema 8.
 */
import type { CommandStep, ContentStep } from '@ifloom/engine/plugin'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The timed-effects plugin's calls whose arguments were renamed at schema 6. */
const SCHEMA_6: Record<string, Record<string, string>> = {
  'effects/active': { id: 'effect' },
  'effects/apply': { id: 'effect' },
  'effects/remove': { id: 'effect' },
}

/** The statuses plugin's calls, by the timed-effects plugin's names. */
const CALLS: Record<string, string> = { 'effects/active': 'statuses/active', 'effects/apply': 'statuses/apply', 'effects/remove': 'statuses/remove' }

/** The statuses plugin's strings, by the timed-effects plugin's ids. */
const STRINGS: Record<string, string> = { 'effects/unknown': 'statuses/unknown', 'effects/notActive': 'statuses/notActive' }

/** A call's `effect` named `status`. */
const status = (args: unknown) => (isRecord(args) && 'effect' in args && !('status' in args) ? renamed(args, { effect: 'status' }) : args)

/** An entry with some fields renamed, where it has them and not the new name already. */
const withNames = (entry: Record<string, unknown>, names: Record<string, string>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(entry).map(([key, value]) => [names[key] && !(names[key] in entry) ? names[key] : key, value]))

/** A `words` table key for a field of this list renamed: `<list>.<id>.<old>` is `<list>.<id>.<new>`. A notice's words keep their keys. */
const wordKey = (key: string, list: string, names: Record<string, string>): string => {
  if (!key.startsWith(`${list}.`) || key.includes('.notify.')) return key
  const at = key.lastIndexOf('.')
  const field = key.slice(at + 1)
  return names[field] ? `${key.slice(0, at)}.${names[field]}` : key
}

/** The schema of the content this plugin reads, numbered by the engine's schema. */
export const CONTENT_VERSION = 26

/** The steps that carry this plugin's content forward, each keyed by the schema it upgrades from. */
export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: a condition's or an effect's target is named by its noun: `{ effect }`, not `{ id }`.
  5: (pack, tools) =>
    tools.calls(pack, (call) => (call.form !== 'command' && SCHEMA_6[call.name] ? { name: call.name, with: renamed(call.with, SCHEMA_6[call.name]) } : call)),
  // 7 → 8: the timed-effects plugin is the statuses plugin, so its calls don't read like the engine's
  // effects: `effects/apply` with `{ effect }` is `statuses/apply` with `{ status }`, its content moves
  // from `data.effects.effects` to `data.statuses.statuses`, and its strings from `effects/…` to `statuses/…`.
  7: (pack, tools) => {
    let out = { ...pack }
    if (isRecord(out.strings)) out.strings = Object.fromEntries(Object.entries(out.strings).map(([id, text]) => [STRINGS[id] ?? id, text]))
    const data = out.data
    if (isRecord(data) && isRecord(data.effects) && !('statuses' in data)) {
      const { effects, ...rest } = data
      const { effects: list, ...other } = effects
      out.data = { ...rest, statuses: list === undefined ? other : { ...other, statuses: list } }
    }
    out = tools.calls(out, (call) => {
      if (!CALLS[call.name]) return call
      return { name: CALLS[call.name], with: call.form === 'command' ? call.with : status(call.with) }
    })
    return out
  },
  // 20 → 21: effects are told apart by their key, as conditions are: `{ stat: 'coins', by: -2 }`, never
  // `{ kind: 'stat', … }`. This plugin's content holds effects, so they are keyed here as well as by the engine.
  20: (pack, tools) => tools.effects(pack),
  // 25 → 26: one word each: a status's `label` is its `name` and its `summary` its `description`; and its effects,
  // `onStart`, `eachTurn` and `onEnd`, named like hooks, are `effects: { start, turn, end }`. The words table's keys follow.
  25: (pack, tools) => {
    const names = { label: 'name', summary: 'description' }
    return tools.wordKeys(
      tools.entries(pack, 'statuses/statuses', (status) => {
        const { onStart, eachTurn, onEnd, ...rest } = withNames(status, names)
        if (onStart === undefined && eachTurn === undefined && onEnd === undefined) return rest
        const own = typeof rest.effects === 'object' && rest.effects !== null ? (rest.effects as Record<string, unknown>) : {}
        const effects = {
          ...(onStart !== undefined ? { start: onStart } : {}),
          ...(eachTurn !== undefined ? { turn: eachTurn } : {}),
          ...(onEnd !== undefined ? { end: onEnd } : {}),
          ...own,
        }
        return { ...rest, effects }
      }),
      (key) => wordKey(key, 'statuses/statuses', names),
    )
  },
}

/** The version of this plugin's commands, which command logs record. */
export const COMMAND_VERSION = 8

/** The steps that carry this plugin's logged commands forward, each keyed by the version it upgrades from. */
export const commandMigrations: Record<number, CommandStep> = {
  // 7 → 8: the timed-effects plugin's commands are the statuses plugin's, by the same name.
  7: (command) => (command.type === 'custom' && typeof command.name === 'string' && CALLS[command.name] ? { ...command, name: CALLS[command.name] } : command),
}
