/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from.
 */
import type { CommandStep, ContentStep, RawPack } from '@ifloom/engine'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The conditions whose arguments were renamed at schema 6, to the naming rule. */
const CALLS_6: Record<string, Record<string, string>> = { 'cast/at': { who: 'character' } }

/** The commands whose one target became `id` at schema 6. */
const COMMANDS_6: Record<string, Record<string, string>> = { 'cast/talk': { who: 'id' }, 'cast/call': { who: 'id' } }

/** The conditions that took one bare value at schema 6, and what it is named now. */
const NAMED_7: Record<string, string> = { 'cast/here': 'character', 'cast/met': 'character' }

/** Arguments with the bare `value` (or `id`) named by the call's noun. */
function namedValue(args: unknown, noun: string): unknown {
  if (!isRecord(args)) return args
  const from = 'value' in args ? 'value' : 'id' in args ? 'id' : undefined
  return from && !(noun in args) ? renamed(args, { [from]: noun }) : args
}

/** What a character's fields became: the trait's, as written; `role` is the entity's `desc` and `portrait` its `image`. */
const ENTITY_FIELDS: Record<string, string> = { id: 'id', name: 'name', role: 'desc', portrait: 'image', tags: 'tags', stats: 'stats', kv: 'kv' }

/**
 * A character in `data.cast.characters` as an entity of the kind
 * `character` (the cast's own) carrying the `cast/person` trait. Its `role`
 * is the entity's `desc`, its `portrait` its `image`, its `tags`, `stats`
 * and `kv` the entity's; the rest (schedule, talk, call and so on) is the
 * trait. The characters follow the pack's own entities.
 */
function charactersToEntities(pack: RawPack): RawPack {
  const data = isRecord(pack.data) ? pack.data : undefined
  const castData = data && isRecord(data.cast) ? data.cast : undefined
  if (!data || !castData || !Array.isArray(castData.characters)) return pack
  const people = castData.characters.filter(isRecord).map((character) => {
    const entity: Record<string, unknown> = { of: 'character' }
    const person: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(character)) {
      if (value === undefined) continue
      if (field in ENTITY_FIELDS) entity[ENTITY_FIELDS[field]] = value
      else person[field] = value
    }
    return { ...entity, traits: { 'cast/person': person } }
  })
  const { characters: _moved, ...restCast } = castData
  const { cast: _cast, ...restData } = data
  const nextData = Object.keys(restCast).length ? { ...restData, cast: restCast } : restData
  const { data: _data, ...rest } = pack
  return {
    ...rest,
    entities: [...(Array.isArray(pack.entities) ? pack.entities : []), ...people],
    ...(Object.keys(nextData).length ? { data: nextData } : {}),
  } as RawPack
}

/** Hints laid into an object's `ui`, what it already says winning. */
function hinted(value: Record<string, unknown>, hints: Record<string, unknown>): Record<string, unknown> {
  const ui = isRecord(value.ui) ? value.ui : {}
  return { ...value, ui: { ...hints, ...ui } }
}

/**
 * A person's `hue` (on an entity's or a kind's `cast/person` trait) as the
 * entity's or kind's `ui.hue`, the React UI's hint. A `traits` table row's
 * `hue` moves to the pack's own entity of that reference, else it is dropped.
 */
function hueToUi(pack: RawPack): RawPack {
  const out: Record<string, unknown> = { ...pack }
  const hueOut = (holder: unknown): unknown => {
    if (!isRecord(holder) || !isRecord(holder.traits) || !isRecord(holder.traits['cast/person']) || !('hue' in holder.traits['cast/person'])) return holder
    const { hue, ...person } = holder.traits['cast/person']
    return hinted({ ...holder, traits: { ...holder.traits, 'cast/person': person } }, { hue })
  }
  if (Array.isArray(pack.kinds)) out.kinds = pack.kinds.map(hueOut)
  if (Array.isArray(pack.entities)) out.entities = pack.entities.map(hueOut)
  if (isRecord(pack.traits) && isRecord(pack.traits['cast/person'])) {
    const rows: Record<string, unknown> = {}
    for (const [ref, row] of Object.entries(pack.traits['cast/person'])) {
      if (!isRecord(row) || !('hue' in row)) {
        rows[ref] = row
        continue
      }
      const { hue, ...rest } = row
      rows[ref] = rest
      if (Array.isArray(out.entities))
        out.entities = out.entities.map((entity) =>
          isRecord(entity) && `${String(entity.of)}:${String(entity.id)}` === ref ? hinted(entity, { hue }) : entity,
        )
    }
    out.traits = { ...pack.traits, 'cast/person': rows }
  }
  return out as RawPack
}

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 16

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: the naming rule. `cast/at` names its target `character`, and a command's one target is `id`.
  5: (pack, tools) =>
    tools.calls(pack, (call) => {
      const names = call.form === 'command' ? COMMANDS_6[call.name] : CALLS_6[call.name]
      return names ? { name: call.name, with: renamed(call.with, names) } : call
    }),
  // 6 → 7: a call's arguments are always named (ADR 0009): `{ 'cast/met': 'ava' }` is `{ 'cast/met': { character: 'ava' } }`.
  6: (pack, tools) =>
    tools.calls(pack, (call) => {
      const noun = NAMED_7[call.name]
      if (!noun || call.form === 'command') return call
      if (call.form === 'short' && !isRecord(call.with) && call.with !== true && call.with !== undefined)
        return { name: call.name, with: { [noun]: call.with } }
      return { name: call.name, with: namedValue(call.with, noun) }
    }),
  // 13 → 14: the cast's characters are entities with the `cast/person` trait.
  13: (pack) => charactersToEntities(pack),
  // 15 → 16: how a person looks is the UI's: their `hue` is a `ui` hint.
  15: (pack) => hueToUi(pack),
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
