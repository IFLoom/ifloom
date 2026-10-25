/**
 * How content and command logs written before this plugin are carried
 * forward. Using an item was the engine's until schema 13, when items
 * became things and using one became this plugin's, so its one step is
 * keyed by that schema, as the engine's are.
 */
import type { CommandStep, ContentStep, RawPack } from '@ifloom/engine'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** An item's id as the entity it became at schema 13: `item:<id>`. An id that is already a reference is left as it is. */
const itemRef = (id: unknown): unknown => (typeof id === 'string' && !id.includes(':') ? `item:${id}` : id)

/** The engine's strings for items, by the keys this plugin says them with now. */
const STRINGS: Record<string, string> = { 'inventory/doesNothing': 'doesNothing', 'inventory/haveNone': 'haveNone' }

/**
 * Schema 12 content as schema 13 has it, before the engine makes items
 * things: an item's `use` is its `inventory/usable` trait (the engine keeps
 * an item's traits on the entity it becomes), the engine's strings for items
 * are this plugin's with `{thing}` for `{item}`.
 */
function itemsToThings(pack: RawPack): RawPack {
  const out: Record<string, unknown> = { ...pack }
  if (Array.isArray(pack.items)) {
    out.items = pack.items.map((item) => {
      if (!isRecord(item) || !isRecord(item.use)) return item
      const { use, ...rest } = item
      return { ...rest, traits: { ...(isRecord(rest.traits) ? rest.traits : {}), 'inventory/usable': use } }
    })
  }
  if (isRecord(pack.strings)) {
    const strings: Record<string, unknown> = { ...pack.strings }
    for (const [key, old] of Object.entries(STRINGS)) {
      if (old in strings && !(key in strings)) strings[key] = strings[old]
      if (typeof strings[key] === 'string') strings[key] = (strings[key] as string).replaceAll('{item}', '{thing}')
    }
    out.strings = strings
  }
  return out as RawPack
}

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 21

export const contentMigrations: Record<number, ContentStep> = {
  // 12 → 13: items are things, and using one is this plugin's command, on the thing it became.
  12: (pack, tools) =>
    tools.objects(itemsToThings(pack), (value) =>
      value.type === 'use' && typeof value.id === 'string' ? { 'inventory/use': { id: itemRef(value.id) } } : value,
    ),
  // 20 → 21: effects are told apart by their key, as conditions are: `{ stat: 'coins', by: -2 }`, never
  // `{ kind: 'stat', … }`. This plugin's content holds effects, so they are keyed here as well as by the engine.
  20: (pack, tools) => tools.effects(pack),
}

/** The version of this plugin's commands. */
export const COMMAND_VERSION = 13

export const commandMigrations: Record<number, CommandStep> = {
  // 12 → 13: the engine's `use` command is this plugin's, on the thing the item became.
  12: (command) =>
    command.type === 'use' && typeof command.id === 'string' ? { type: 'custom', name: 'inventory/use', with: { id: itemRef(command.id) } } : command,
}
