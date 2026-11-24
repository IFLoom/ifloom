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
const SCHEMA_6: Record<string, Record<string, string>> = {
  'achievements/earned': { id: 'achievement' },
  'achievements/grant': { id: 'achievement' },
}

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

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 26

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: a condition's or an effect's target is named by its noun: `{ achievement }`, not `{ id }`.
  5: (pack, tools) =>
    tools.calls(pack, (call) => (call.form !== 'command' && SCHEMA_6[call.name] ? { name: call.name, with: renamed(call.with, SCHEMA_6[call.name]) } : call)),
  // 25 → 26: one word each: an achievement's `title` is its `name`, and the words table's keys follow.
  25: (pack, tools) => {
    const names = { title: 'name' }
    return tools.wordKeys(
      tools.entries(pack, 'achievements/achievements', (achievement) => withNames(achievement, names)),
      (key) => wordKey(key, 'achievements/achievements', names),
    )
  },
}
