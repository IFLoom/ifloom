/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from.
 */
import type { RawPack } from '@ifloom/engine'
import type { CommandStep, ContentStep } from '@ifloom/engine/plugin'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The commands whose one target became `id` at schema 6. */
const COMMANDS_6: Record<string, Record<string, string>> = { 'wardrobe/wear': { item: 'id' }, 'wardrobe/takeOff': { slot: 'id' } }

/** An item's id as the entity it became at schema 13: `item:<id>`. An id that is already a reference is left as it is. */
const itemRef = (id: unknown): unknown => (typeof id === 'string' && !id.includes(':') ? `item:${id}` : id)

/** The calls that named an item at schema 12: the argument that held its id, and the one that holds the entity now. */
const ITEM_CALLS: Record<string, { from: string; to: string }> = {
  'wardrobe/wearing': { from: 'item', to: 'entity' },
  'wardrobe/wear': { from: 'id', to: 'id' },
}

/** A call's arguments as schema 13 has them, naming the entity the item became. */
function itemArgs(name: string, args: unknown): unknown {
  const call = ITEM_CALLS[name]
  if (!call || !isRecord(args) || !(call.from in args)) return args
  const { [call.from]: item, ...rest } = args
  return { ...rest, [call.to]: itemRef(item) }
}

/** The wardrobe's strings whose `{item}` is `{thing}` at schema 13. */
const THING_STRINGS = ['wardrobe/haveNone', 'wardrobe/notClothing', 'wardrobe/alreadyWearing']

/**
 * Schema 12 content as schema 13 has it, where items are things: the
 * wardrobe's `clothes` are the `wardrobe/wearable` trait, a slot's `start`
 * names the entity, its calls name the entity, and the engine's `haveNone`
 * string is the wardrobe's own.
 */
function itemsToThings(pack: RawPack): RawPack {
  const out: Record<string, unknown> = { ...pack }
  const data = pack.data
  if (isRecord(data) && isRecord(data.wardrobe)) {
    const { clothes, ...kept } = data.wardrobe
    const traits: Record<string, unknown> = isRecord(pack.traits) ? { ...pack.traits } : {}
    const wearable: Record<string, unknown> = isRecord(traits['wardrobe/wearable']) ? { ...traits['wardrobe/wearable'] } : {}
    for (const entry of Array.isArray(clothes) ? clothes : []) {
      if (isRecord(entry) && typeof entry.id === 'string') wearable[itemRef(entry.id) as string] = { slot: entry.slot }
    }
    if (Object.keys(wearable).length) out.traits = { ...traits, 'wardrobe/wearable': wearable }
    out.data = {
      ...data,
      wardrobe: Array.isArray(kept.slots)
        ? { ...kept, slots: kept.slots.map((slot) => (isRecord(slot) && slot.start !== undefined ? { ...slot, start: itemRef(slot.start) } : slot)) }
        : kept,
    }
  }
  if (isRecord(pack.strings)) {
    const strings: Record<string, unknown> = { ...pack.strings }
    if ('haveNone' in strings && !('wardrobe/haveNone' in strings)) strings['wardrobe/haveNone'] = strings.haveNone
    for (const id of THING_STRINGS) if (typeof strings[id] === 'string') strings[id] = (strings[id] as string).replaceAll('{item}', '{thing}')
    out.strings = strings
  }
  return out as RawPack
}

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 13

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: a command's one target is `id`.
  5: (pack, tools) =>
    tools.calls(pack, (call) =>
      call.form === 'command' && COMMANDS_6[call.name] ? { name: call.name, with: renamed(call.with, COMMANDS_6[call.name]) } : call,
    ),
  // 12 → 13: items leave the engine; what the wardrobe dresses is a thing with the `wardrobe/wearable` trait.
  12: (pack, tools) => tools.calls(itemsToThings(pack), (call) => (ITEM_CALLS[call.name] ? { name: call.name, with: itemArgs(call.name, call.with) } : call)),
}

/** The version of this plugin's commands. */
export const COMMAND_VERSION = 13

/** A command, if it is one of the named ones, with its arguments rewritten. */
const commandArgs =
  (rewrite: (name: string, args: unknown) => unknown, names: Record<string, unknown>): CommandStep =>
  (command) =>
    command.type === 'custom' && typeof command.name === 'string' && names[command.name] ? { ...command, with: rewrite(command.name, command.with) } : command

export const commandMigrations: Record<number, CommandStep> = {
  // 5 → 6: a command's one target is `id`.
  5: commandArgs((name, args) => renamed(args, COMMANDS_6[name]), COMMANDS_6),
  // 12 → 13: what was an item's id names the entity it became.
  12: commandArgs(itemArgs, ITEM_CALLS),
}
