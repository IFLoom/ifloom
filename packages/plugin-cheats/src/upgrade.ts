/**
 * How content written for an older version of this plugin is carried
 * forward. The versions follow the engine's schema, as the other
 * first-party plugins' do: each step is keyed by the schema it upgrades from.
 */
import type { ContentStep } from '@ifloom/engine'

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
  // 20 → 21: effects are told apart by their key, as conditions are: `{ stat: 'coins', by: -2 }`, never
  // `{ kind: 'stat', … }`. This plugin's content holds effects, so they are keyed here as well as by the engine.
  20: (pack, tools) => tools.effects(pack),
  // 25 → 26: one word each: a cheat's `label` is its `name`, and the words table's keys follow.
  25: (pack, tools) => {
    const names = { label: 'name' }
    return tools.wordKeys(
      tools.entries(pack, 'cheats/cheats', (cheat) => withNames(cheat, names)),
      (key) => wordKey(key, 'cheats/cheats', names),
    )
  },
}
