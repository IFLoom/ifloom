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

/** The commands whose one target became `id` at schema 6. */
const COMMANDS_6: Record<string, Record<string, string>> = { 'places/go': { to: 'id' } }

/** The calls that took one bare value at schema 6, and what it is named now. */
const NAMED_7: Record<string, string> = { 'places/at': 'location', 'places/within': 'location', 'places/move': 'location' }

/** Arguments with the bare `value` (or `id`) named by the call's noun. */
function namedValue(args: unknown, noun: string): unknown {
  if (!isRecord(args)) return args
  const from = 'value' in args ? 'value' : 'id' in args ? 'id' : undefined
  return from && !(noun in args) ? renamed(args, { [from]: noun }) : args
}

/** Each location of a pack rewritten. */
function locations(pack: RawPack, rewrite: (location: Record<string, unknown>) => Record<string, unknown>): RawPack {
  const data = pack.data
  if (!isRecord(data) || !isRecord(data.places) || !Array.isArray(data.places.locations)) return pack
  const list = data.places.locations.map((location) => (isRecord(location) ? rewrite(location) : location))
  return { ...pack, data: { ...data, places: { ...data.places, locations: list } } }
}

/** A place's old `kind` as a tag. */
function kindToTags(location: Record<string, unknown>): Record<string, unknown> {
  if (typeof location.kind !== 'string' || !['street', 'venue', 'room'].includes(location.kind)) return location
  const { kind, ...rest } = location
  const tags = Array.isArray(rest.tags) ? (rest.tags.includes(kind) ? rest.tags : [...rest.tags, kind]) : [kind]
  return { ...rest, tags }
}

/** `[[reveal]]` markup on a block of its own: its delay and its transition. */
const REVEAL_BLOCK = /^\[\[reveal(?::\s*(\d*)\s*)?(?:\|\s*([a-z0-9-]*)\s*)?\]\]$/

/** Hints laid into an object's `ui`, what it already says winning. */
function hinted(value: Record<string, unknown>, hints: Record<string, unknown>): Record<string, unknown> {
  const ui = isRecord(value.ui) ? value.ui : {}
  return { ...value, ui: { ...hints, ...ui } }
}

/**
 * Schema 15 content as schema 16 has it, where presentation is the UI's: a
 * place's `transition` is `ui.transition`, and `[[reveal]]` markup on a line
 * of its own in the prose of a place's `{ text }` block splits that prose, as
 * the engine splits a scene's: the words before it keep the key, and each
 * part after it gets a key of its own (`<key>.2`, `<key>.3`) and a block of
 * its own with `ui.reveal`, under the same `when`. The engine's own step,
 * which runs after this one, takes out any markup left.
 */
function presentationToUi(pack: RawPack): RawPack {
  const prose: Record<string, unknown> = isRecord(pack.prose) ? { ...pack.prose } : {}
  const splitBlocks = (blocks: unknown[]): unknown[] =>
    blocks.flatMap((block) => {
      if (!isRecord(block) || typeof block.text !== 'string' || typeof prose[block.text] !== 'string') return [block]
      const key = block.text
      const parts: { words: string[]; reveal?: Record<string, unknown> }[] = [{ words: [] }]
      for (const piece of (prose[key] as string).split('\n\n')) {
        const marker = piece.trim().match(REVEAL_BLOCK)
        if (marker) parts.push({ words: [], reveal: { ...(marker[1] ? { delay: Number(marker[1]) } : {}), ...(marker[2] ? { as: marker[2] } : {}) } })
        else parts.at(-1)!.words.push(piece)
      }
      if (parts.length === 1) return [block]
      const { reveal: _reveal, ui: _ui, text: _text, ...shared } = block
      const kept = parts.filter((part) => part.words.join('').trim() !== '')
      return kept.map((part, index) => {
        let id = key
        if (index > 0) {
          let n = index + 1
          while (`${key}.${n}` in prose && prose[`${key}.${n}`] !== part.words.join('\n\n')) n += 1
          id = `${key}.${n}`
        }
        prose[id] = part.words.join('\n\n')
        const own = index === 0 ? block : { ...shared, text: id }
        return part.reveal ? hinted(own, { reveal: part.reveal }) : own
      })
    })
  const out = locations(pack, (location) => {
    const { transition, ...rest } = location
    const next = transition !== undefined ? hinted(rest, { transition }) : rest
    return Array.isArray(next.body) ? { ...next, body: splitBlocks(next.body) } : next
  })
  return isRecord(pack.prose) ? { ...out, prose } : out
}

/** What a location's fields became at schema 24: the entity's, as named here; the rest is the `places/location` trait's. */
const ENTITY_FIELDS: Record<string, string> = { id: 'id', name: 'name', tag: 'desc', art: 'image', tags: 'tags' }

/**
 * A location in `data.places.locations` as an entity of the kind `location`
 * carrying the `places/location` trait. Its `name` and `tags` are the
 * entity's, its `tag` the entity's `desc` and its `art` the entity's `image`
 * (an empty one is left out, as it named no picture); the rest (exits, body,
 * actions and so on) is the trait. The locations follow the pack's own
 * entities, and `data.places` goes when nothing else is left in it.
 */
function locationsToEntities(pack: RawPack): RawPack {
  const data = isRecord(pack.data) ? pack.data : undefined
  const placesData = data && isRecord(data.places) ? data.places : undefined
  if (!data || !placesData || !Array.isArray(placesData.locations)) return pack
  const entities = placesData.locations.filter(isRecord).map((location) => {
    const entity: Record<string, unknown> = { of: 'location' }
    const trait: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(location)) {
      if (value === undefined) continue
      if (field in ENTITY_FIELDS) {
        if (value !== '') entity[ENTITY_FIELDS[field]] = value
      } else trait[field] = value
    }
    return { ...entity, traits: { 'places/location': trait } }
  })
  const { locations: _moved, ...restPlaces } = placesData
  const { places: _places, ...restData } = data
  const nextData = Object.keys(restPlaces).length ? { ...restData, places: restPlaces } : restData
  const { data: _data, ...rest } = pack
  return {
    ...rest,
    entities: [...(Array.isArray(pack.entities) ? pack.entities : []), ...entities],
    ...(Object.keys(nextData).length ? { data: nextData } : {}),
  } as RawPack
}

/** The places plugin's trait, as content writes it. */
const TRAIT = 'places/location'

/** A place's trait with its `stage` named `picture`. */
const pictured = (place: Record<string, unknown>): Record<string, unknown> =>
  'stage' in place && !('picture' in place) ? (renamed(place, { stage: 'picture' }) as Record<string, unknown>) : place

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 28

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: a command's one target is `id`.
  5: (pack, tools) =>
    tools.calls(pack, (call) =>
      call.form === 'command' && COMMANDS_6[call.name] ? { name: call.name, with: renamed(call.with, COMMANDS_6[call.name]) } : call,
    ),
  // 6 → 7: a call's arguments are always named (ADR 0009): `{ 'places/at': ['cafe'] }` is `{ 'places/at': { location: ['cafe'] } }`.
  6: (pack, tools) =>
    tools.calls(pack, (call) => {
      const noun = NAMED_7[call.name]
      if (!noun || call.form === 'command') return call
      if (call.form === 'short' && !isRecord(call.with) && call.with !== true && call.with !== undefined)
        return { name: call.name, with: { [noun]: call.with } }
      return { name: call.name, with: namedValue(call.with, noun) }
    }),
  // 8 → 9: a place's `kind` meant a genre the engine shouldn't know, so it's a tag.
  8: (pack) => locations(pack, kindToTags),
  // 15 → 16: how a place comes in and shows its words is the UI's, written as `ui` hints.
  15: (pack) => presentationToUi(pack),
  // 20 → 21: effects are told apart by their key, as conditions are: `{ stat: 'coins', by: -2 }`, never
  // `{ kind: 'stat', … }`. This plugin's content holds effects, so they are keyed here as well as by the engine.
  20: (pack, tools) => tools.effects(pack),
  // 23 → 24: a location is an entity with the `places/location` trait, its `tag` the entity's `desc` and its
  // `art` its `image`; so the value `places/tag` is `places/desc`, in a value's name and in prose and strings tokens.
  23: (pack, tools) =>
    tools.objects(
      tools.words(locationsToEntities(pack), (text) => text.replace(/\{\{v:places\/tag(?=[\s}])/g, '{{v:places/desc')),
      (value) => (value.value === 'places/tag' ? { ...value, value: 'places/desc' } : value),
    ),
  // 25 → 26: one word each: a thing's line is its `description` (the engine renames the entity's `desc`), so the
  // value `places/desc` is `places/description`, in a value's name and in a token wherever words are written.
  25: (pack, tools) => {
    const token = (text: string) => text.replace(/\{\{v:places\/desc(?=[\s}])/g, '{{v:places/description')
    let out = tools.objects(pack, (value) => {
      const next = Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, typeof inner === 'string' ? token(inner) : inner]))
      return next.value === 'places/desc' ? { ...next, value: 'places/description' } : next
    })
    out = tools.words(out, token)
    if (typeof out.words === 'object' && out.words !== null && !Array.isArray(out.words))
      out = { ...out, words: Object.fromEntries(Object.entries(out.words).map(([key, text]) => [key, typeof text === 'string' ? token(text) : text])) }
    return out
  },
  // 27 → 28: "stage" means only a quest's stage, so a place's layered picture with hotspots is its `picture`,
  // wherever the trait is written, and its hotspots' words are keyed under `picture`.
  27: (pack, tools) => {
    const out = tools.objects(pack, (value) => {
      const place = value[TRAIT]
      if (!isRecord(place)) return value
      // On an entity or a kind, the trait's data; in a `traits` table, its rows by reference.
      const rows = Object.keys(place).every((key) => key.includes(':'))
      const next = rows ? Object.fromEntries(Object.entries(place).map(([ref, row]) => [ref, isRecord(row) ? pictured(row) : row])) : pictured(place)
      return { ...value, [TRAIT]: next }
    })
    if (!isRecord(out.words)) return out
    const words = Object.fromEntries(
      Object.entries(out.words).map(([key, text]) => [key.replace(`.traits.${TRAIT}.stage.`, `.traits.${TRAIT}.picture.`), text]),
    )
    return { ...out, words }
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
