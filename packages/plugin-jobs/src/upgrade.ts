/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from.
 */
import type { CommandStep, ContentStep } from '@ifloom/engine/plugin'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The commands whose one target became `id` at schema 6. */
const COMMANDS_6: Record<string, Record<string, string>> = { 'jobs/apply': { job: 'id' }, 'jobs/work': { job: 'id' }, 'jobs/quit': { job: 'id' } }

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
  // 5 → 6: a command's one target is `id`.
  5: (pack, tools) =>
    tools.calls(pack, (call) =>
      call.form === 'command' && COMMANDS_6[call.name] ? { name: call.name, with: renamed(call.with, COMMANDS_6[call.name]) } : call,
    ),
  // 20 → 21: effects are told apart by their key, as conditions are: `{ stat: 'coins', by: -2 }`, never
  // `{ kind: 'stat', … }`. This plugin's content holds effects, so they are keyed here as well as by the engine.
  20: (pack, tools) => tools.effects(pack),
  // 25 → 26: one word each: a job's `title`, and each of its ranks', is its `name`, and the words table's keys follow.
  25: (pack, tools) => {
    const names = { title: 'name' }
    return tools.wordKeys(
      tools.entries(pack, 'jobs/jobs', (job) => {
        const named = withNames(job, names)
        return Array.isArray(named.ranks)
          ? {
              ...named,
              ranks: named.ranks.map((rank: unknown) =>
                typeof rank === 'object' && rank !== null && !Array.isArray(rank) ? withNames(rank as Record<string, unknown>, names) : rank,
              ),
            }
          : named
      }),
      (key) => wordKey(key, 'jobs/jobs', names),
    )
  },
}

/** The version of this plugin's commands. */
export const COMMAND_VERSION = 6

export const commandMigrations: Record<number, CommandStep> = {
  // 5 → 6: a command's one target is `id`.
  5: (command) =>
    command.type === 'custom' && typeof command.name === 'string' && COMMANDS_6[command.name]
      ? { ...command, with: renamed(command.with, COMMANDS_6[command.name]) }
      : command,
}
