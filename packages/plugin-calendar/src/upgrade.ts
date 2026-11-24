/**
 * How content written for an older version of this plugin is carried
 * forward. The versions follow the engine's schema, since the engine once
 * carried this plugin's content forward itself: each step is keyed by the
 * schema it upgrades from.
 */
import type { ContentStep } from '@ifloom/engine/plugin'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The calls whose arguments were renamed at schema 6, to the naming rule. */
const CALLS_6: Record<string, Record<string, string>> = { 'calendar/pass': { periods: 'by' } }

/** The calls that took one bare value at schema 6, and what it is named now. */
const NAMED_7: Record<string, string> = { 'calendar/period': 'period', 'calendar/weekday': 'day', 'calendar/pass': 'by' }

/** Arguments with the bare `value` (or `id`) named by the call's noun. */
function namedValue(args: unknown, noun: string): unknown {
  if (!isRecord(args)) return args
  const from = 'value' in args ? 'value' : 'id' in args ? 'id' : undefined
  return from && !(noun in args) ? renamed(args, { [from]: noun }) : args
}

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 7

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: `by` changes a number: `calendar/pass` takes `{ by }`, not `{ periods }`.
  5: (pack, tools) =>
    tools.calls(pack, (call) => (call.form !== 'command' && CALLS_6[call.name] ? { name: call.name, with: renamed(call.with, CALLS_6[call.name]) } : call)),
  // 6 → 7: a call's arguments are always named (ADR 0009): `{ 'calendar/pass': 2 }` is `{ 'calendar/pass': { by: 2 } }`.
  6: (pack, tools) =>
    tools.calls(pack, (call) => {
      const noun = NAMED_7[call.name]
      if (!noun || call.form === 'command') return call
      if (call.form === 'short' && !isRecord(call.with) && call.with !== true && call.with !== undefined)
        return { name: call.name, with: { [noun]: call.with } }
      return { name: call.name, with: namedValue(call.with, noun) }
    }),
}
