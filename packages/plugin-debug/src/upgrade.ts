/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from.
 */
import type { CommandStep, ContentStep } from '@ifloom/engine'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The commands whose arguments were renamed at schema 6: one target is `id`, and a value set is `to`. */
const COMMANDS_6: Record<string, Record<string, string>> = {
  'debug/item': { count: 'to' },
  'debug/turn': { turn: 'to' },
  'debug/scene': { scene: 'id' },
  'debug/go': { location: 'id' },
}

/** An item's id as the entity it became at schema 13: `item:<id>`. An id that is already a reference is left as it is. */
const itemRef = (id: unknown): unknown => (typeof id === 'string' && !id.includes(':') ? `item:${id}` : id)

/** `debug/item` as schema 13 has it: `debug/held`, naming the entity the item became. */
function held(args: unknown): { name: string; with: unknown } {
  if (!isRecord(args) || !('item' in args)) return { name: 'debug/held', with: args }
  const { item, ...rest } = args
  return { name: 'debug/held', with: { ...rest, entity: itemRef(item) } }
}

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 13

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: a command's one target is `id`, and a value it sets is `to`.
  5: (pack, tools) =>
    tools.calls(pack, (call) =>
      call.form === 'command' && COMMANDS_6[call.name] ? { name: call.name, with: renamed(call.with, COMMANDS_6[call.name]) } : call,
    ),
  // 12 → 13: items leave the engine; `debug/item` is `debug/held`, which names the entity.
  12: (pack, tools) => tools.calls(pack, (call) => (call.name === 'debug/item' ? held(call.with) : call)),
}

/** The version of this plugin's commands. */
export const COMMAND_VERSION = 13

export const commandMigrations: Record<number, CommandStep> = {
  // 5 → 6: a command's one target is `id`, and a value it sets is `to`.
  5: (command) =>
    command.type === 'custom' && typeof command.name === 'string' && COMMANDS_6[command.name]
      ? { ...command, with: renamed(command.with, COMMANDS_6[command.name]) }
      : command,
  // 12 → 13: `debug/item` is `debug/held`, naming the entity the item became.
  12: (command) => {
    if (command.type !== 'custom' || command.name !== 'debug/item') return command
    const next = held(command.with)
    return { ...command, name: next.name, with: next.with }
  },
}
