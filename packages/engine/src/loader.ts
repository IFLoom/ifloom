import type { PluginEntry } from './plugin.ts'
import type { Game } from './game.ts'
import { memberKey, proseStore, type VariantMember } from './prose.ts'
import type { Flat } from './types.ts'
import { checkContent, type Problem, type Source } from './check.ts'
import { contentKeys, listOwners, packFeatures, type FeaturePack, type FeaturePackOnly } from './features/registry.ts'
import type { PackMerge } from './features/feature.ts'
import { upgradePack } from './upgrade.ts'
import { layWords } from './words.ts'

/**
 * A game arrives as content and packs, and is merged into one game.
 *
 * Content is the game's own: the files in its `world/` and `story/`, written
 * against this engine. Each key is declared once across them. Packs come from
 * outside the game's code (a mod, unlocked supporter content, a JSON export):
 * each has an id that saves record and the schema it was written for, and goes
 * over the content and the packs before it.
 */
export { SCHEMA } from './upgrade.ts'

export type { Patch } from './features/scenes.ts'

/** What content and packs both declare, beside each feature's keys: the words, and plugin content. */
type Declarations = {
  /** Player-facing words by key, over the engine's and plugins' own. */
  strings?: Record<string, string>
  /** Prose by key. */
  prose?: Record<string, string>
  /**
   * Other words for fields of the content, by key: a translation, which is
   * one pack with this table (and its own `prose` for the lines read by
   * key). Each key names one field the player reads, as
   * `translatableFields` lists them: `action.wait.label`,
   * `entity.character:ava.name`, `scene.cafe.counter.text.intro`. It is laid
   * over the content once everything is merged, a later pack's over an
   * earlier one's, and a key that names no field is reported.
   */
  words?: Record<string, string>
  /**
   * Variants membership by variants name, in draw order. Content and packs
   * append to a name. A member is a prose key, or `{ prose: key, weight }` to
   * be drawn more or less often than the rest.
   */
  variants?: Record<string, VariantMember[]>
  /**
   * Content for the game's plugins, by plugin id and then list:
   * `{ quests: { quests: [...] } }`. A pack's entry replaces one with the
   * same id, as its scenes do.
   */
  data?: Record<string, Record<string, readonly PluginEntry[]>>
}

/**
 * The game's own content: one file of it, such as `story/cafe.ts`. It has no
 * id or schema, since it is compiled with the engine it runs on, and each
 * thing it declares (a scene, a stat, a prose key) may be declared only once
 * across the game's content.
 */
export type Content = Flat<
  {
    /** What problems call this content, such as `story.cafe`. Without one, they say `content`. */
    name?: string
  } & Declarations &
    Omit<FeaturePack, FeaturePackOnly>
>

/**
 * Content from outside the game's code: a mod, unlocked supporter content or
 * a JSON export. It goes over the game's content and the packs before it,
 * replacing what they declare by id, and saves record its id.
 */
export type Pack = Flat<
  {
    /** The pack's id, which saves record: `mod:<id>` for a mod's. */
    id: string
    /** Schema this pack was written against. An older one is upgraded as it loads; a newer one is refused. */
    schema: number
    /**
     * The version of each plugin's content this pack was written for, by
     * plugin id (`{ shop: 13 }`), as `Plugin.contentVersion` numbers them.
     * An older one is upgraded by that plugin's own steps as it loads. A
     * plugin left out is read as written for the pack's `schema`, or the
     * plugin's own version if that is lower.
     */
    plugins?: Record<string, number>
  } & Declarations &
    FeaturePack
>

/**
 * What `loadGame` takes beside the content: what the game is (its `id`,
 * `title` and `version`) and its code (its plugins and its rules). Anything a
 * mod could change is content, and goes in the content or a pack instead.
 */
export type GameBase = Pick<Game, 'id' | 'title' | 'version' | 'plugins' | 'rules'>

/** What else `loadGame` takes. */
export type LoadOptions = {
  /** Packs to load over the content, in order, each over the ones before: mods, unlocked content, JSON exports. */
  packs?: readonly Pack[]
}

/** What the base once held that is the game's code now, in `rules`. */
const CODE_KEYS = new Set(['custom', 'migrations', 'saveName'])

/** The keys the base can hold. Typed complete, so a key added to `GameBase` has to be listed. */
const BASE_KEYS: { [K in keyof GameBase]-?: true } = {
  id: true,
  title: true,
  version: true,
  plugins: true,
  rules: true,
}

/** One thing content declares, as a problem names it: `scene "cafe.counter"`. */
type Declared = string

/** Keys of a record, worded with their noun. */
const byKey = (noun: string, record: object | undefined): Declared[] => Object.keys(record ?? {}).map((key) => `${noun} "${key}"`)

/**
 * What each key the core declares itself declares, for the report of one
 * thing declared twice across the game's content. Typed complete, so a new
 * key has to say. Each feature's keys say in its `content`.
 */
const CORE_DECLARES: { [K in keyof Declarations]-?: (content: Content) => Declared[] } = {
  strings: (content) => byKey('string', content.strings),
  prose: (content) => byKey('prose', content.prose),
  words: (content) => byKey('words', content.words),
  // Content appends to a variants name, so only the same line listed twice is a clash.
  variants: (content) =>
    Object.entries(content.variants ?? {}).flatMap(([name, members]) => members.map((member) => `variants "${name}" line "${memberKey(member)}"`)),
  data: (content) =>
    Object.entries(content.data ?? {}).flatMap(([plugin, lists]) =>
      Object.entries(lists).flatMap(([list, entries]) => entries.map((entry) => `${plugin}/${list} "${entry.id}"`)),
    ),
}

/** The features' pack keys: every one is the game's content too, but those only a pack holds. */
const FEATURE_KEYS = Object.keys(contentKeys) as (keyof FeaturePack)[]
const PACK_ONLY = new Set<string>(FEATURE_KEYS.filter((key) => contentKeys[key].packOnly))

/**
 * The keys content and a pack can hold. A key that isn't here is reported,
 * not quietly dropped: an `id` and `schema` belong to a pack. A pack's `overrides` is dropped without a word: packs once needed it
 * to replace content on purpose, and every pack does that now.
 */
const keys = (...lists: readonly string[][]) => Object.fromEntries(lists.flat().map((key) => [key, true]))
const CONTENT_KEYS = keys(
  Object.keys(CORE_DECLARES),
  ['name'],
  FEATURE_KEYS.filter((key) => !PACK_ONLY.has(key)),
) as { [K in keyof Content]-?: true }
const PACK_KEYS = keys(Object.keys(CORE_DECLARES), ['id', 'schema', 'plugins'], FEATURE_KEYS) as { [K in keyof Pack]-?: true }
const IGNORED_PACK_KEYS = new Set(['overrides'])

/** Everything one piece of content declares: the core's keys, then each feature's, as its `content` says. */
function declarations(content: Content): Declared[] {
  const out = Object.values(CORE_DECLARES).flatMap((read) => read(content))
  for (const key of FEATURE_KEYS) {
    const value = (content as Record<string, unknown>)[key]
    const declares = contentKeys[key].declares as ((value: unknown) => readonly Declared[]) | null
    if (value !== undefined && declares) out.push(...declares(value))
  }
  return out
}

/** What problems call a piece of content. */
const contentName = (content: Content) => content.name ?? 'content'

export type Loaded = {
  game: Game
  prose: Record<string, string>
  variants: Record<string, string[]>
  problems: Problem[]
}

/**
 * Merge the game's content, then the packs over it in order, and report
 * everything wrong with the result, naming the content or pack that brought
 * it. The result is checked with the content checker (`checkGame`); this adds
 * only where each problem came from, and what is wrong with the content and
 * packs themselves: a key declared twice across the content, or a key they
 * can't hold. A mod author gets "mod:spicier · scene allie.talk · choice kiss ·
 * unknown scene 'allie.snog'", not a stack trace.
 */
export function loadGame(content: readonly Content[], base: GameBase, { packs = [] }: LoadOptions = {}): Loaded {
  const problems: Problem[] = []
  // Each feature merges its own key, in its own way: scenes by id with patches, audio field by field, a media pool whole.
  const merges = new Map<string, PackMerge<object, object>>()
  for (const feature of packFeatures) {
    merges.set(feature.name, feature.pack!.merge((pack, where, what) => problems.push({ pack, where, what })) as PackMerge<object, object>)
  }
  for (const merge of merges.values()) merge.base(base)
  const prose: Record<string, string> = {}
  /** Where each prose key came from, for markup problems. */
  const proseFrom = new Map<string, string>()
  const strings: Record<string, string> = {}
  /** Other words for the content's fields, by key, and where each came from, for a key that names none. */
  const words: Record<string, string> = {}
  const wordsFrom = new Map<string, string>()
  const variants: Record<string, string[]> = {}
  /** The same, with each member's weight where it has one. */
  const weightedVariants: Record<string, VariantMember[]> = {}
  // Plugin content by plugin, then list, then id; the base's own comes first.
  const data = new Map<string, Map<string, Map<string, { value: PluginEntry; from: string }>>>()
  const addData = (from: string, incoming: Content['data']) => {
    for (const [plugin, lists] of Object.entries(incoming ?? {})) {
      if (!base.plugins?.some((entry) => entry.id === plugin)) {
        problems.push({ pack: from, where: `data ${plugin}`, what: `the game has no plugin named "${plugin}"` })
        continue
      }
      const byList = data.get(plugin) ?? new Map()
      data.set(plugin, byList)
      for (const [list, entries] of Object.entries(lists)) {
        const into = byList.get(list) ?? new Map()
        byList.set(list, into)
        for (const entry of entries) into.set(entry.id, { value: entry, from })
      }
    }
  }

  /** Which piece of content declared each thing first, by its place in the list, to report a second one. */
  const declaredBy = new Map<Declared, number>()
  const declaredTwice = (piece: Content, index: number) => {
    for (const what of new Set(declarations(piece))) {
      const first = declaredBy.get(what)
      if (first === undefined) {
        declaredBy.set(what, index)
        continue
      }
      const earlier = content[first]
      const both = earlier.name !== undefined && piece.name !== undefined ? `, in ${earlier.name} and ${piece.name}` : ''
      problems.push({ pack: contentName(piece), where: what, what: `declared twice${both}` })
    }
  }

  /** Merge one piece of content or one pack into what came before it. */
  const add = (piece: Content | Pack, from: string) => {
    for (const merge of merges.values()) merge.add(piece, from)
    addWords(piece, from)
  }

  /** What the core merges itself from a piece: words and plugin data. */
  function addWords(piece: Content | Pack, from: string) {
    Object.assign(prose, piece.prose ?? {})
    for (const key of Object.keys(piece.prose ?? {})) proseFrom.set(key, from)
    Object.assign(strings, piece.strings ?? {})
    Object.assign(words, piece.words ?? {})
    for (const key of Object.keys(piece.words ?? {})) wordsFrom.set(key, from)
    for (const [name, members] of Object.entries(piece.variants ?? {})) {
      variants[name] = [...(variants[name] ?? []), ...members.map(memberKey)]
      weightedVariants[name] = [...(weightedVariants[name] ?? []), ...members]
      for (const member of members) {
        if (typeof member !== 'string' && member.weight !== undefined && !(member.weight > 0)) {
          problems.push({ pack: from, where: `variants ${name}`, what: `"${member.prose}" has a weight of ${member.weight}; a weight must be above 0` })
        }
      }
    }
    addData(from, piece.data)
  }

  for (const [key, value] of Object.entries(base)) {
    if (Object.hasOwn(BASE_KEYS, key) || value === undefined) continue
    const why = Object.hasOwn(CONTENT_KEYS, key)
      ? `; it is content now, so it goes in the game's content`
      : CODE_KEYS.has(key)
        ? "; it is the game's code, so it goes in `rules`"
        : ''
    problems.push({ pack: 'base', where: 'base', what: `the base has no "${key}", so it was left out${why}` })
  }

  // Each plugin's own content first, under the game's: the game's content and packs go over it.
  for (const plugin of base.plugins ?? []) {
    if (!plugin.content) continue
    const piece = plugin.content
    for (const merge of merges.values()) (merge.plugin ?? merge.add)(piece, plugin.id)
    addWords(piece, plugin.id)
  }

  // Then the game's own content, in the order it is given.
  content.forEach((piece, index) => {
    const from = contentName(piece)
    for (const key of Object.keys(piece)) {
      if (Object.hasOwn(CONTENT_KEYS, key)) continue
      const why = key === 'id' || key === 'schema' || key === 'plugins' || PACK_ONLY.has(key) ? `; a pack has one, and goes in \`packs\`` : ''
      problems.push({ pack: from, where: 'content', what: `content has no "${key}", so it was left out${why}` })
    }
    declaredTwice(piece, index)
    // A key content can't hold is left out, so a pack given as content doesn't patch or override anything.
    const kept = Object.fromEntries(Object.entries(piece).filter(([key]) => !PACK_ONLY.has(key))) as Content
    add(kept, from)
  })

  // Then the packs over it, each over the ones before. An old pack's steps may read the entities
  // declared under it and the game's word for the player, as its schema 22 speech does, and the
  // prose under it, as its schema 24 labels do.
  const declared: unknown[] = [...(base.plugins ?? []).flatMap((plugin) => plugin.content?.entities ?? []), ...content.flatMap((piece) => piece.entities ?? [])]
  for (const written of packs) {
    // An older pack is carried forward to this schema; one that can't be is skipped whole.
    const upgraded = upgradePack(written, base.plugins ?? [], { entities: declared, you: strings.you !== undefined ? [strings.you] : [], prose })
    if (upgraded.ok) declared.push(...(upgraded.value.entities ?? []))
    if (!upgraded.ok) {
      problems.push({ pack: written.id, where: 'pack', what: upgraded.reason })
      continue
    }
    const pack = upgraded.value
    for (const key of Object.keys(pack)) {
      if (!Object.hasOwn(PACK_KEYS, key) && !IGNORED_PACK_KEYS.has(key))
        problems.push({ pack: pack.id, where: 'pack', what: `a pack has no "${key}", so it was left out` })
    }
    add(pack, pack.id)
  }

  // The lists a game must have start empty; each feature's merge writes its own.
  // Only what the base can hold: anything else in it is content, and is reported rather than kept.
  const own = Object.fromEntries(Object.entries(base).filter(([key]) => Object.hasOwn(BASE_KEYS, key))) as GameBase
  const game: Game = {
    ...own,
    scenes: [],
    storylines: [],
    packs: packs.map((pack) => pack.id),
    strings,
    data: Object.fromEntries(
      [...data].map(([plugin, lists]) => [
        plugin,
        Object.fromEntries([...lists].map(([list, entries]) => [list, [...entries.values()].map((entry) => entry.value)])),
      ]),
    ),
  }
  for (const merge of merges.values()) merge.finish(game)
  // A translation's words over the merged content, field by field.
  for (const key of layWords(game, words)) {
    problems.push({ pack: wordsFrom.get(key) ?? 'base', where: `words ${key}`, what: 'names no field the game has (translatableFields lists every key)' })
  }
  // Scenes read their words from here; the store fills tokens for the save.
  game.prose = proseStore(game, prose, weightedVariants)

  // Now merged, the game is checked as any game is, and each problem is pinned on the pack that brought it.
  const packOf = (source: Source): string => {
    if (source === undefined) return 'base'
    if ('plugin' in source) return data.get(source.plugin)?.get(source.list)?.get(source.id)?.from ?? 'base'
    // A feature's list: the feature's merge knows.
    const owner = Object.hasOwn(listOwners, source.list) ? listOwners[source.list as keyof typeof listOwners] : undefined
    if (owner) return merges.get(owner.name)?.from(source.list, source.id) ?? 'base'
    // The core's own list: prose.
    return proseFrom.get(source.id ?? '') ?? 'base'
  }
  problems.push(...checkContent(game, [], packOf).problems)

  return { game, prose, variants, problems }
}
