/**
 * Content migrations: a pack written for an older `SCHEMA` is carried forward
 * one step at a time until it is a pack of this one, the way `STEPS` in
 * `intake.ts` carries a save. `loadGame` and `readMod` both go through
 * `upgradePack`, so an old pack and an old mod file still load.
 */
import type { Pack } from './loader.ts'

/** The content format this engine reads. A pack of an older one is upgraded by `PACK_STEPS`; a newer one is refused. */
export const SCHEMA = 9

/** A pack as it came in: some schema's shape, not necessarily this one. */
export type RawPack = Record<string, unknown> & { schema: number }

/**
 * The steps that reshape a pack, keyed by the schema each upgrades *from*.
 * Every schema from the oldest the engine reads up to `SCHEMA - 1` has one: a
 * pack whose chain has a gap is too old to read.
 *
 * When the content format changes, bump `SCHEMA` and add the step that
 * reshapes the previous schema in the same change. A step returns a new pack
 * and never changes the one it was given; the schema number is set for it.
 */
export const PACK_STEPS: Record<number, (pack: RawPack) => RawPack> = {
  // 4 → 5: flags become the kv store, wherever content can hold them.
  // Words and code (prose, strings, variants, custom) are left as they are.
  4: (pack) =>
    Object.fromEntries(
      Object.entries(pack).map(([key, value]) => {
        if (WORDS.has(key)) return [key, value]
        // An input's `variable` is its `key`.
        if (key === 'inputs' && Array.isArray(value)) value = value.map((input) => (isRecord(input) ? renamed(input, { variable: 'key' }) : input))
        return [key, deep(value, flagsToKv)]
      }),
    ) as RawPack,
  // 5 → 6: one naming rule (ADR 0008) and one gating shape, wherever content
  // can hold them. Words and code are left as they are.
  5: (pack) => Object.fromEntries(Object.entries(pack).map(([key, value]) => [key, WORDS.has(key) ? value : deep(value, toSchema6)])) as RawPack,
  // 6 → 7: a plugin call's arguments are always named (ADR 0009). The
  // first-party calls that took a bare value (`{ 'places/at': ['cafe'] }`,
  // read as `{ value }`) name it, and values take arguments instead of
  // encoding them in the name: `messages/unread-texts` is `messages/unread`
  // with `{ channel: 'texts' }`, in a badge and in prose.
  6: (pack) =>
    Object.fromEntries(
      Object.entries(pack).map(([key, value]) => {
        if (key === 'prose' || key === 'strings') return [key, isRecord(value) ? Object.fromEntries(Object.entries(value).map(([id, text]) => [id, typeof text === 'string' ? valueTokens(text) : text])) : value]
        return [key, WORDS.has(key) ? value : deep(value, toSchema7)]
      }),
    ) as RawPack,
  // 7 → 8: the timed-effects plugin is the statuses plugin, so its calls don't
  // read like the engine's effects: `effects/apply` with `{ effect }` is
  // `statuses/apply` with `{ status }`, its content moves from
  // `data.effects.effects` to `data.statuses.statuses`, and its strings from
  // `effects/…` to `statuses/…`.
  7: (pack) =>
    Object.fromEntries(
      Object.entries(pack).map(([key, value]) => {
        if (key === 'strings') return [key, isRecord(value) ? Object.fromEntries(Object.entries(value).map(([id, text]) => [STATUS_STRINGS[id] ?? id, text])) : value]
        if (key === 'data' && isRecord(value) && isRecord(value.effects) && !('statuses' in value)) {
          const { effects, ...rest } = value
          const { effects: list, ...other } = effects
          value = { ...rest, statuses: list === undefined ? other : { ...other, statuses: list } }
        }
        return [key, WORDS.has(key) ? value : deep(value, toSchema8)]
      }),
    ) as RawPack,
  // 8 → 9: an item's and a place's `kind` meant a genre the engine shouldn't
  // know, so it's gone. It becomes a tag, and gear's one at the start becomes
  // the item's `start`: `{ kind: 'gear' }` is `{ tags: ['gear'], start: 1 }`.
  8: (pack) => {
    const out: RawPack = { ...pack }
    if (Array.isArray(pack.items)) out.items = pack.items.map((item) => (isRecord(item) ? kindToTags(item, ['gear', 'stuff']) : item))
    const data = pack.data
    if (isRecord(data) && isRecord(data.places) && Array.isArray(data.places.locations)) {
      const locations = data.places.locations.map((location) => (isRecord(location) ? kindToTags(location, ['street', 'venue', 'room']) : location))
      out.data = { ...data, places: { ...data.places, locations } }
    }
    return out
  },
}

/** The pack keys that hold words or code, not content a step rewrites. */
const WORDS = new Set(['prose', 'strings', 'variants', 'custom'])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** An object with some of its keys renamed, in the same order. */
function renamed(value: Record<string, unknown>, names: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [names[key] ?? key, inner]))
}

/** Every object in a value rewritten by `rewrite`, from the innermost out. */
function deep(value: unknown, rewrite: (value: Record<string, unknown>) => Record<string, unknown>): unknown {
  if (Array.isArray(value)) return value.map((inner) => deep(inner, rewrite))
  if (!isRecord(value)) return value
  return rewrite(Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, deep(inner, rewrite)])))
}

/**
 * Schema 4's flags in one object of content, as schema 5's kv store: the
 * `{ flag }` and `{ storylineFlag }` conditions, the `flag` effect (`value`
 * is `to`, `add` is `by`), the `storylineFlag` effect, and a `flags` record
 * on an entity, a character, a template or a start command.
 */
function flagsToKv(value: Record<string, unknown>): Record<string, unknown> {
  if (value.kind === 'flag') return renamed({ ...value, kind: 'kv' }, { value: 'to', add: 'by' })
  if (value.kind === 'storylineFlag') return renamed({ ...value, kind: 'storylineKv' }, { value: 'to' })
  const names: Record<string, string> = {}
  if (typeof value.flag === 'string') names.flag = 'kv'
  if (isRecord(value.storylineFlag)) names.storylineFlag = 'storylineKv'
  if (isRecord(value.flags)) names.flags = 'kv'
  return Object.keys(names).length ? renamed(value, names) : value
}

/**
 * Schema 5's field names in an effect, by kind, as schema 6 names them: an
 * effect's target by its noun, `to` to set and `by` to change.
 */
const EFFECT_FIELDS: Record<string, Record<string, string>> = {
  stat: { key: 'stat' },
  setStat: { key: 'stat' },
  item: { id: 'item' },
  phase: { value: 'to' },
  scene: { id: 'scene' },
  storylineKv: { id: 'storyline' },
  closeStoryline: { id: 'storyline' },
  collect: { to: 'collection' },
  discard: { from: 'collection', id: 'entry' },
  remove: { of: 'entity' },
  audio: { track: 'to' },
  minigame: { id: 'minigame' },
  minigameVar: { value: 'to', add: 'by' },
}

/** Schema 5's field names in a core command, by type. */
const COMMAND_FIELDS: Record<string, Record<string, string>> = {
  use: { itemId: 'id' },
  setting: { value: 'to' },
  input: { value: 'to' },
}

/** The first-party plugins' conditions and effects whose arguments were renamed at schema 6, by full name. */
const PLUGIN_CALL_FIELDS: Record<string, Record<string, string>> = {
  'achievements/earned': { id: 'achievement' },
  'achievements/grant': { id: 'achievement' },
  'effects/active': { id: 'effect' },
  'effects/apply': { id: 'effect' },
  'effects/remove': { id: 'effect' },
  'cast/at': { who: 'character' },
  'feed/post': { id: 'post' },
  'calendar/pass': { periods: 'by' },
}

/** The first-party plugins' commands whose arguments were renamed at schema 6: one target is `id`. */
const PLUGIN_COMMAND_FIELDS: Record<string, Record<string, string>> = {
  'cast/talk': { who: 'id' },
  'cast/call': { who: 'id' },
  'places/go': { to: 'id' },
  'quests/track': { quest: 'id' },
  'quests/seen': { quest: 'id' },
  'jobs/apply': { job: 'id' },
  'jobs/work': { job: 'id' },
  'jobs/quit': { job: 'id' },
  'wardrobe/wear': { item: 'id' },
  'wardrobe/takeOff': { slot: 'id' },
  'devices/open': { app: 'id' },
  'devices/close': { device: 'id' },
  'feed/seen': { feed: 'id' },
  'messages/read': { thread: 'id' },
  'debug/item': { count: 'to' },
  'debug/turn': { turn: 'to' },
  'debug/scene': { scene: 'id' },
  'debug/go': { location: 'id' },
}

const RANGE = ['gte', 'gt', 'lte', 'lt']

/** Arguments renamed by a table, if the table has them; anything else as it is. */
function renamedArgs(args: unknown, names: Record<string, string> | undefined): unknown {
  return names && isRecord(args) ? renamed(args, names) : args
}

/** A `when` turned the other way round, without stacking `not`s. */
function negated(when: unknown): unknown {
  return isRecord(when) && Object.keys(when).length === 1 && 'not' in when ? when.not : { not: when }
}

/**
 * Schema 5 content in one object, as schema 6 writes it:
 * - effects' targets by their noun, `to` and `by` (`setStat` is `stat` with `to`);
 * - `use`'s `itemId`, and `setting` and `input`'s `value` (`to`);
 * - the first-party plugins' renamed arguments, long or short;
 * - conditions: `{ has }` is `{ item }`, `{ turn: true, gte }` is `{ turn: { gte } }`,
 *   `{ counter }` and `storylineKv`'s inner `is` are one `storylineKv`, a
 *   collection's `id` is `entry`;
 * - gating: `requires` (met while true) is `blocked` (refused while true) with
 *   each `when` turned round, and `locked` is `blocked`.
 */
function toSchema6(value: Record<string, unknown>): Record<string, unknown> {
  let out = value
  if (typeof out.kind === 'string') {
    if (out.kind === 'custom' && typeof out.name === 'string') out = { ...out, with: renamedArgs(out.with, PLUGIN_CALL_FIELDS[out.name]) }
    else if (EFFECT_FIELDS[out.kind] && !(out.kind === 'scene' && 'from' in out)) {
      out = renamed(out.kind === 'setStat' ? { ...out, kind: 'stat' } : out, EFFECT_FIELDS[out.kind])
    }
  } else if (typeof out.type === 'string') {
    if (out.type === 'custom' && typeof out.name === 'string') out = { ...out, with: renamedArgs(out.with, PLUGIN_COMMAND_FIELDS[out.name]) }
    else if (COMMAND_FIELDS[out.type]) out = renamed(out, COMMAND_FIELDS[out.type])
  } else {
    if (typeof out.custom === 'string') out = { ...out, with: renamedArgs(out.with, PLUGIN_CALL_FIELDS[out.custom]) }
    // A plugin call in short: `{ 'cast/at': { who, at } }`.
    for (const [key, inner] of Object.entries(out)) {
      if (key.includes('/') && PLUGIN_CALL_FIELDS[key]) out = { ...out, [key]: renamedArgs(inner, PLUGIN_CALL_FIELDS[key]) }
    }
    if (typeof out.has === 'string' && !('item' in out)) out = renamed(out, { has: 'item' })
    if (out.turn === true) {
      const range = Object.fromEntries(RANGE.filter((key) => key in out).map((key) => [key, out[key]]))
      out = { ...Object.fromEntries(Object.entries(out).filter(([key]) => !RANGE.includes(key))), turn: range }
    }
    if (isRecord(out.counter) && !('storylineKv' in out)) out = renamed(out, { counter: 'storylineKv' })
    if (isRecord(out.storylineKv) && 'is' in out.storylineKv) {
      const { is, ...target } = out.storylineKv
      out = { ...out, storylineKv: target, is }
    }
    if (typeof out.collection === 'string' && 'id' in out && !('entry' in out)) out = renamed(out, { id: 'entry' })
  }
  if (Array.isArray(out.requires) && out.requires.every((entry) => isRecord(entry) && 'when' in entry)) {
    const flipped = out.requires.map((entry) => ({ ...(entry as Record<string, unknown>), when: negated((entry as Record<string, unknown>).when) }))
    const { requires: _requires, ...rest } = out
    out = { ...rest, blocked: [...(Array.isArray(rest.blocked) ? rest.blocked : []), ...flipped] }
  }
  if (Array.isArray(out.locked)) {
    const { locked, ...rest } = out
    out = { ...rest, blocked: [...(Array.isArray(rest.blocked) ? rest.blocked : []), ...locked] }
  }
  return out
}

/**
 * The first-party calls that took one bare value at schema 6, and what that
 * value is named now. A short call's value that isn't an object was read as
 * `{ value }`, and some read `id` as well.
 */
const NAMED_VALUE: Record<string, string> = {
  'calendar/period': 'period',
  'calendar/weekday': 'day',
  'calendar/pass': 'by',
  'cast/here': 'character',
  'cast/met': 'character',
  'places/at': 'location',
  'places/within': 'location',
  'places/move': 'location',
}

/** Arguments with the bare `value` (or `id`) named by the call's noun. */
function namedValue(args: unknown, noun: string): unknown {
  if (!isRecord(args)) return args
  const from = 'value' in args ? 'value' : 'id' in args ? 'id' : undefined
  return from && !(noun in args) ? renamed(args, { [from]: noun }) : args
}

/** A value that encoded its argument in its name, as schema 7 asks it: `{ value, with }`. */
function valueCall(name: string): { value: string; with?: Record<string, unknown> } {
  const unread = /^messages\/unread-(.+)$/.exec(name)
  if (unread) return { value: 'messages/unread', with: { channel: unread[1] } }
  const unseen = /^feed\/unseen-(.+)$/.exec(name)
  if (unseen) return { value: 'feed/unseen', with: { feed: unseen[1] } }
  return { value: name }
}

/** Prose and strings with schema 6's value names in their tokens, as schema 7 writes them. */
function valueTokens(text: string): string {
  return text.replace(/\{\{v:(messages\/unread|feed\/unseen)-([A-Za-z0-9_-]+)\}\}/g, (_match, name: string, id: string) =>
    `{{v:${name} ${name === 'messages/unread' ? 'channel' : 'feed'}=${id}}}`,
  )
}

/**
 * Schema 6 content in one object, as schema 7 writes it: a first-party call's
 * bare value named, in short or long form, and an app's badge `{ count }` as
 * a value with its arguments.
 */
function toSchema7(value: Record<string, unknown>): Record<string, unknown> {
  let out = value
  if (out.kind === 'custom' && typeof out.name === 'string' && NAMED_VALUE[out.name]) out = { ...out, with: namedValue(out.with, NAMED_VALUE[out.name]) }
  if (typeof out.custom === 'string' && NAMED_VALUE[out.custom]) out = { ...out, with: namedValue(out.with, NAMED_VALUE[out.custom]) }
  const keys = Object.keys(out)
  if (keys.length === 1 && NAMED_VALUE[keys[0]]) {
    const inner = out[keys[0]]
    const noun = NAMED_VALUE[keys[0]]
    if (inner !== true && inner !== undefined) out = { [keys[0]]: isRecord(inner) ? namedValue(inner, noun) : { [noun]: inner } }
  }
  if (isRecord(out.badge) && typeof out.badge.count === 'string') {
    const { count, ...rest } = out.badge
    out = { ...out, badge: { ...rest, ...valueCall(count as string) } }
  }
  return out
}

/** An item or a place with its old `kind` as a tag; gear without a `start` starts with one. */
function kindToTags(value: Record<string, unknown>, kinds: readonly string[]): Record<string, unknown> {
  if (typeof value.kind !== 'string' || !kinds.includes(value.kind)) return value
  const { kind, ...rest } = value
  const tags = Array.isArray(rest.tags) ? (rest.tags.includes(kind) ? rest.tags : [...rest.tags, kind]) : [kind]
  return { ...rest, tags, ...(kind === 'gear' && rest.start === undefined ? { start: 1 } : {}) }
}

/** The statuses plugin's calls, by the timed-effects plugin's names. */
const STATUS_CALLS: Record<string, string> = { 'effects/active': 'statuses/active', 'effects/apply': 'statuses/apply', 'effects/remove': 'statuses/remove' }

/** The statuses plugin's strings, by the timed-effects plugin's ids. */
const STATUS_STRINGS: Record<string, string> = { 'effects/unknown': 'statuses/unknown', 'effects/notActive': 'statuses/notActive' }

/**
 * Schema 7 content in one object, as schema 8 writes it: the timed-effects
 * plugin's calls as the statuses plugin's, long or short, with a condition's
 * or an effect's `effect` named `status`. A command keeps its `id`.
 */
function toSchema8(value: Record<string, unknown>): Record<string, unknown> {
  let out = value
  const status = (args: unknown) => (isRecord(args) && 'effect' in args && !('status' in args) ? renamed(args, { effect: 'status' }) : args)
  if (out.kind === 'custom' && typeof out.name === 'string' && STATUS_CALLS[out.name]) out = { ...out, name: STATUS_CALLS[out.name], with: status(out.with) }
  if (out.type === 'custom' && typeof out.name === 'string' && STATUS_CALLS[out.name]) out = { ...out, name: STATUS_CALLS[out.name] }
  if (typeof out.custom === 'string' && STATUS_CALLS[out.custom]) out = { ...out, custom: STATUS_CALLS[out.custom], with: status(out.with) }
  if (Object.keys(out).some((key) => STATUS_CALLS[key])) {
    out = Object.fromEntries(Object.entries(out).map(([key, inner]) => (STATUS_CALLS[key] ? [STATUS_CALLS[key], status(inner)] : [key, inner])))
  }
  return out
}

/**
 * A command from an older engine, as this one takes it: what `replay` plays an
 * old command log with. A command already in this shape comes back as it is.
 */
export function upgradeCommand<C>(command: C): C {
  return isRecord(command) && typeof command.type === 'string' ? (toSchema8(toSchema6(command)) as C) : command
}

/**
 * A pack brought up to `SCHEMA`, step by step, or why it can't be: it was
 * written for a newer engine, or for one so old there is no step from it. A
 * pack already at `SCHEMA` comes back as it is.
 */
export function upgradePack(pack: { schema: number }): Pack | string {
  const from = pack.schema
  if (!Number.isInteger(from)) return `has no schema number`
  if (from > SCHEMA) return `written for schema ${from}, this engine reads ${SCHEMA}`
  let raw = pack as RawPack
  for (let version = from; version < SCHEMA; version += 1) {
    const step = PACK_STEPS[version]
    if (!step) return `written for schema ${from}, too old for this engine to read (it reads ${SCHEMA})`
    raw = { ...step(raw), schema: version + 1 }
  }
  return raw as unknown as Pack
}
