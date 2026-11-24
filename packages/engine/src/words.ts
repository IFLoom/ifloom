/**
 * The words table: every field of a game's content that a player reads and a
 * translation can give other words for, each under one key, and how a pack's
 * `words` table is laid over them.
 *
 * A key is the path to the field, as content writes it, with each list entry
 * named by its id: `action.wait.label`, `entity.character:ava.name`,
 * `quests/quests.coffee.stages.order.hint`. Three things are named so that a
 * key stays put while a scene is rearranged:
 * - every choice in a scene or a body is `<entry>.choice.<id>`, wherever it sits;
 * - every block of words written in place, `{ text }` or `say`, is
 *   `<entry>.text.<id>`, by its `id`, or by a short hash of its words when it has none;
 * - every notice an effect raises is `<entry>.notify.<id>`, by its `id`, or a hash of its words.
 * An entry of a list with no id is named by its `value`, else a hash of its
 * own words, else its place in the list.
 */
import type { Game } from './game.ts'
import type { Block, Choice } from './scene.ts'
import { hash } from './random.ts'
import { callOf } from './calls.ts'
import { contentKeys } from './features/registry.ts'

/** One field of a game's content a translation can give other words for. */
export type WordField = {
  /** Its key in a pack's `words` table: `action.wait.label`. */
  key: string
  /** The words it has, as written, tokens and markup included. */
  text: string
  /** Where it is, as a problem names it: `scene cafe.counter`, `quests coffee`. */
  where: string
}

/**
 * Which fields of a piece of content are words a translation can replace: a
 * plugin's `words` gives one for each list of its `data`, and a trait's
 * `words` one for its data. Each field of the shape is one of these:
 * - `true`: a field of words, or a record of them (a stat's `{ one, other }`);
 * - `'blocks'`: a list of blocks, as a scene's body;
 * - `'effects'`: a list of effects, for the words of the notices they raise;
 * - `'button'`: a button, as an action is: its label, labels, blocked
 *   reasons, `once` reason, `irreversible` warning and effects;
 * - a shape, for an object's own fields;
 * - a shape in a list, `[shape]`, for a list of entries;
 * - `{ '*': shape }`, for a record of entries, each named by its key.
 */
export type WordShape = { readonly [field: string]: WordPart }

/** One field of a `WordShape`. */
export type WordPart = true | 'blocks' | 'effects' | 'button' | WordShape | readonly [WordPart]

/** Where a field is, from the game: `['scenes', 3, 'title']`. Internal. */
export type WordPath = readonly (string | number)[]

/** What a field is in, for a problem to name the pack it came from: a feature's list, or a plugin's. Internal. */
export type WordSource = { list: string; id: string } | { plugin: string; list: string; id: string }

/** A field with where it sits in the game, for the loader to lay a translation over. Internal. */
export type WordSpot = WordField & { at: WordPath; source?: WordSource }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** A short, stable name for some words: six hex digits of their hash. */
const hashed = (text: string) => hash(text).toString(16).padStart(8, '0').slice(0, 6)

/** The words of a button, as a `WordShape` names them. */
const BUTTON: WordShape = {
  label: true,
  labels: [{ label: true }],
  blocked: [{ reason: true }],
  once: { reason: true },
  irreversible: true,
  effects: 'effects',
}

/**
 * What a feature's words walk is lent (`ContentKey.words`): the fields it
 * finds go in, under their keys, with where each sits in the game.
 */
export type WordWalk = {
  /** The fields found so far, in order. A walk may rename one it just found, as entities do a trait's words from a kind. */
  readonly spots: readonly WordSpot[]
  /** The entry being walked, for the problems about its fields. */
  source: WordSource | undefined
  /** A field of words at `key`, if it has any. */
  field(key: string, text: unknown, at: WordPath, where: string): void
  /** One part of a shape at `key`, in the entry keyed `entry`, which choices, blocks and notices are named under. */
  part(part: WordPart, value: unknown, entry: string, key: string, at: WordPath, where: string): void
  /** A body's words, as deep as a flow goes. */
  blocks(value: unknown, entry: string, at: WordPath, where: string): void
  /** A choice's words, under `<entry>.choice.<id>`, and what its `then` shows. */
  choice(choice: Choice & { then?: Block[] }, entry: string, at: WordPath, where: string): void
  /** Each entry of one of the game's lists by `shape`, under `<noun>.<id>`, with `noun` the list as problems name it. */
  list(list: keyof Game, noun: string, shape: WordPart): void
}

/** Collects the fields it is shown, in order. */
class Walk implements WordWalk {
  readonly spots: WordSpot[] = []
  /** The words in each plugin call's arguments, by the call's full name, as its plugin's `callWords` declare them. */
  readonly calls: ReadonlyMap<string, WordShape>

  readonly game: Game

  constructor(game: Game, calls: ReadonlyMap<string, WordShape>) {
    this.game = game
    this.calls = calls
  }
  /** The entry being walked, for the problems about its fields. */
  source: WordSource | undefined

  list(list: keyof Game, noun: string, shape: WordPart) {
    const entries = this.game[list]
    if (!Array.isArray(entries)) return
    entries.forEach((item: unknown, index) => {
      if (!isRecord(item)) return
      const name = entryName(item, shape, index)
      this.source = { list: noun, id: typeof item.id === 'string' ? item.id : String(index) }
      this.part(shape, item, `${noun}.${name}`, `${noun}.${name}`, [list, index], `${noun} ${name}`)
    })
  }

  /** A field of words, if there are any. */
  field(key: string, text: unknown, at: WordPath, where: string) {
    if (typeof text === 'string' && text !== '') this.spots.push({ key, text, where, at, ...(this.source ? { source: this.source } : {}) })
  }

  /**
   * One part of a shape, at `key` and `at`. `entry` is the key of the entry
   * it is in, which choices, blocks and notices are named under.
   */
  part(part: WordPart, value: unknown, entry: string, key: string, at: WordPath, where: string): void {
    if (value === undefined || value === null) return
    if (part === true) {
      if (typeof value === 'string') this.field(key, value, at, where)
      else if (isRecord(value)) for (const [name, inner] of Object.entries(value)) this.field(`${key}.${name}`, inner, [...at, name], where)
      return
    }
    if (part === 'blocks') return this.blocks(value, entry, at, where)
    if (part === 'effects') return this.effects(value, entry, at, where)
    if (part === 'button') return this.part(BUTTON, value, entry, key, at, where)
    if (Array.isArray(part)) {
      if (!Array.isArray(value)) return
      const inner = part[0] as WordPart
      value.forEach((item, index) => this.part(inner, item, entry, `${key}.${entryName(item, inner, index)}`, [...at, index], where))
      return
    }
    if (!isRecord(value)) return
    const shape = part as WordShape
    if (Object.hasOwn(shape, '*')) {
      for (const [name, inner] of Object.entries(value)) this.part(shape['*'], inner, entry, `${key}.${name}`, [...at, name], where)
      return
    }
    for (const [field, inner] of Object.entries(shape)) this.part(inner, value[field], entry, `${key}.${field}`, [...at, field], where)
  }

  /** A body's words, as deep as a flow goes: each block of words, a picture's `alt`, a fold's label and each choice at a decision. */
  blocks(value: unknown, entry: string, at: WordPath, where: string): void {
    if (!Array.isArray(value)) return
    ;(value as Block[]).forEach((block, index) => {
      if (!isRecord(block)) return
      const here = [...at, index]
      const id = (block as { id?: unknown }).id
      const own = typeof id === 'string' ? id : undefined
      if ('text' in block) this.field(`${entry}.text.${own ?? hashed(block.text)}`, block.text, [...here, 'text'], where)
      if ('say' in block) this.field(`${entry}.text.${own ?? hashed(block.say)}`, block.say, [...here, 'say'], where)
      if ('media' in block && typeof block.media.alt === 'string')
        this.field(`${entry}.alt.${hashed(block.media.alt)}`, block.media.alt, [...here, 'media', 'alt'], where)
      // `fold()` writes its label as a hint the engine carries; it is the player's words all the same.
      const fold = isRecord(block.ui) ? block.ui.fold : undefined
      if (typeof fold === 'string') this.field(`${entry}.fold.${hashed(fold)}`, fold, [...here, 'ui', 'fold'], where)
      if ('blocks' in block) this.blocks(block.blocks, entry, [...here, 'blocks'], where)
      if ('cases' in block) this.blocks(block.cases, entry, [...here, 'cases'], where)
      if ('decide' in block) block.choices.forEach((choice, n) => this.choice(choice, entry, [...here, 'choices', n], where))
    })
  }

  /** A choice's words, under `<entry>.choice.<id>`, and what its `then` shows. */
  choice(choice: Choice & { then?: Block[] }, entry: string, at: WordPath, where: string) {
    if (!isRecord(choice)) return
    this.part(BUTTON, choice, entry, `${entry}.choice.${choice.id}`, at, where)
    this.blocks(choice.then, entry, [...at, 'then'], where)
  }

  /** The words of the notices a list of effects raises, under `<entry>.notify.<id>`, and of the effects inside an `each`. */
  effects(value: unknown, entry: string, at: WordPath, where: string): void {
    if (!Array.isArray(value)) return
    value.forEach((effect, index) => {
      if (!isRecord(effect)) return
      const here = [...at, index]
      if (typeof effect.notify === 'string') {
        const name = typeof effect.id === 'string' ? effect.id : hashed(`${effect.notify}\n${typeof effect.text === 'string' ? effect.text : ''}`)
        this.field(`${entry}.notify.${name}.title`, effect.notify, [...here, 'notify'], where)
        this.field(`${entry}.notify.${name}.text`, effect.text, [...here, 'text'], where)
      }
      // What a `create` effect gives the thing it makes: its name and description, named by a hash of them.
      if (typeof effect.create === 'string' && isRecord(effect.with)) {
        const shape: WordShape = { name: true, description: true }
        this.part(shape, effect.with, entry, `${entry}.create.${entryName(effect.with, shape, index)}`, [...here, 'with'], where)
      }
      // A plugin call with words in its arguments, as its plugin declares them: a post's text, under the call's name.
      const call = callOf(effect)
      const shape = call && this.calls.get(call.name)
      if (call && shape) this.part(shape, call.with, entry, `${entry}.${call.name}.${entryName(call.with, shape, index)}`, [...here, call.name], where)
      if (Array.isArray(effect.effects)) this.effects(effect.effects, entry, [...here, 'effects'], where)
    })
  }
}

/** What an entry of a list with no id is named: its `value`, else a hash of its own words, else its place. */
function entryName(item: unknown, part: WordPart, index: number): string {
  if (!isRecord(item)) return String(index)
  if (typeof item.id === 'string' || typeof item.id === 'number') return String(item.id)
  if (typeof item.value === 'string' || typeof item.value === 'number' || typeof item.value === 'boolean') return String(item.value)
  // Its own words only, so a list inside it doesn't rename it when they change.
  const own =
    part === 'button'
      ? [item.label]
      : isRecord(part) && !Array.isArray(part)
        ? Object.entries(part as WordShape)
            .filter(([, inner]) => inner === true)
            .map(([field]) => item[field])
        : []
  const words = own.filter((text): text is string => typeof text === 'string' && text !== '')
  return words.length ? hashed(words.join('\n')) : String(index)
}

/**
 * Every field of the game's content a translation can give other words for,
 * with where it sits. A field whose key another has too is listed for each:
 * the loader lays the words over all of them.
 */
export function wordSpots(game: Game): WordSpot[] {
  const calls = new Map<string, WordShape>()
  for (const plugin of game.plugins ?? []) for (const [name, shape] of Object.entries(plugin.callWords ?? {})) calls.set(`${plugin.id}/${name}`, shape)
  const walk = new Walk(game, calls)
  // Each feature's pack keys, in the features' order, as each says where its words are.
  for (const key of Object.values(contentKeys)) key.words?.(game, walk)
  // Each plugin's content, by the shape it gives each list of its data.
  for (const plugin of game.plugins ?? []) {
    for (const [list, shape] of Object.entries(plugin.words ?? {})) {
      const entries = game.data?.[plugin.id]?.[list] ?? []
      entries.forEach((item, index) => {
        const entry = `${plugin.id}/${list}.${item.id}`
        walk.source = { plugin: plugin.id, list, id: item.id }
        walk.part(shape, item, entry, entry, ['data', plugin.id, list, index], `${list} ${item.id}`)
      })
    }
  }
  return walk.spots
}

/**
 * Every field of a game's content a player reads and a translation can give
 * other words for, each once, by its key in a pack's `words` table, with the
 * words it has and where it is. Load the game without its translation packs
 * to list the words to translate: a `{ text }` block with no `id` is named by
 * a hash of its words, so its key follows the words it has.
 *
 * ```ts
 * const table = Object.fromEntries(translatableFields(game).map((field) => [field.key, field.text]))
 * ```
 */
export function translatableFields(game: Game): WordField[] {
  const seen = new Set<string>()
  const out: WordField[] = []
  for (const { key, text, where } of wordSpots(game)) {
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ key, text, where })
  }
  return out
}

/** Two fields under one key with different words: a translation could give them only one. */
export function wordClashes(game: Game): { key: string; where: string; source?: WordSource }[] {
  const first = new Map<string, string>()
  const wheres = new Map<string, string>()
  const out: { key: string; where: string; source?: WordSource }[] = []
  for (const spot of wordSpots(game)) {
    const text = first.get(spot.key)
    if (text === undefined) {
      first.set(spot.key, spot.text)
      wheres.set(spot.key, spot.where)
    }
    // Two entries of one list with one id are reported as that already; words in place, and keys from two places, aren't.
    else if (
      text !== spot.text &&
      !out.some((clash) => clash.key === spot.key) &&
      (/\.(text|notify|alt|fold)\./.test(spot.key) || wheres.get(spot.key) !== spot.where)
    )
      out.push({ key: spot.key, where: spot.where, source: spot.source })
  }
  return out
}

/** `value` with the thing at `path` replaced by `next`, copying only what lies on the way. */
function setIn(value: unknown, path: WordPath, next: unknown): unknown {
  if (!path.length) return next
  const [head, ...rest] = path
  if (Array.isArray(value)) {
    const copy = [...value]
    copy[head as number] = setIn(copy[head as number], rest, next)
    return copy
  }
  const record = isRecord(value) ? value : {}
  return { ...record, [head]: setIn(record[head as string], rest, next) }
}

/**
 * Lay a `words` table over a merged game: each key's words go in every field
 * that has that key. Returns the keys that name no field. The game is changed
 * in place, field by field, with what lies on the way copied, so the content
 * it was merged from is never changed.
 */
export function layWords(game: Game, words: Readonly<Record<string, string>>): string[] {
  const keys = Object.keys(words)
  if (!keys.length) return []
  const byKey = new Map<string, WordSpot[]>()
  for (const spot of wordSpots(game)) byKey.set(spot.key, [...(byKey.get(spot.key) ?? []), spot])
  const missing: string[] = []
  const target = game as unknown as Record<string, unknown>
  for (const key of keys) {
    const spots = byKey.get(key)
    if (!spots) {
      missing.push(key)
      continue
    }
    for (const { at } of spots) {
      const [head, ...rest] = at
      target[head as string] = setIn(target[head as string], rest, words[key])
    }
  }
  return missing
}
