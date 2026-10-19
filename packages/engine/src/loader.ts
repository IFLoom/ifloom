import type { PluginEntry } from './plugin.ts'
import type { Game } from './game.ts'
import type { Custom } from './custom.ts'
import { memberKey, proseStore, type VariantMember } from './prose.ts'
import type { Flat } from './types.ts'
import { checkContent, type Problem, type Source } from './check.ts'
import { listOwners, packFeatures, type FeaturePack } from './features/registry.ts'
import type { PackMerge } from './features/feature.ts'
import { upgradePack } from './upgrade.ts'

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

/** What content and packs both declare, beside each feature's key. */
type Declarations = {
  /** Player-facing words by key, over the engine's and plugins' own. */
  strings?: Record<string, string>
  /** Prose by key. */
  prose?: Record<string, string>
  /**
   * Variants membership by variants name, in draw order. Content and packs
   * append to a name. A member is a prose key, or `{ text: key, weight }` to
   * be drawn more or less often than the rest.
   */
  variants?: Record<string, VariantMember[]>
  /** Named functions content calls. A pack's replaces one by the same name. */
  custom?: Custom
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
    Omit<FeaturePack, 'patches'>
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
  } & Declarations &
    FeaturePack
>

/** What `loadGame` takes beside the content: the rest of the game, such as its title, first scene, rules and plugins. */
export type GameBase = Omit<Game, 'scenes' | 'items' | 'storylines' | 'activities' | 'stats'>

/** What else `loadGame` takes. */
export type LoadOptions = {
  /** Packs to load over the content, in order, each over the ones before: mods, unlocked content, JSON exports. */
  packs?: readonly Pack[]
}

/** Every key a declaration holds, the core's and the features'. Typed complete, so a new key that isn't listed here fails to compile. */
const DECLARATION_KEYS: { [K in keyof Declarations | keyof FeaturePack]-?: true } = {
  strings: true,
  prose: true,
  variants: true,
  custom: true,
  data: true,
  scenes: true,
  patches: true,
  items: true,
  storylines: true,
  activities: true,
  collections: true,
  triggers: true,
  inputs: true,
  settings: true,
  stats: true,
  audio: true,
  media: true,
  minigames: true,
  kinds: true,
  entities: true,
}

/**
 * The keys content and a pack can hold. A key that isn't here is reported,
 * not quietly dropped: `actions` belong to the game, an `id` and `schema` to
 * a pack. A pack's `overrides` is dropped without a word: packs once needed it
 * to replace content on purpose, and every pack does that now.
 */
const { patches: _patches, ...CONTENT_DECLARATION_KEYS } = DECLARATION_KEYS
const CONTENT_KEYS: { [K in keyof Content]-?: true } = { ...CONTENT_DECLARATION_KEYS, name: true }
const PACK_KEYS: { [K in keyof Pack]-?: true } = { ...DECLARATION_KEYS, id: true, schema: true }
const IGNORED_PACK_KEYS = new Set(['overrides'])

/** One thing content declares, as a problem names it: `scene "cafe.counter"`. */
type Declared = string

/** Ids of a list by id, worded with their noun. */
const byId =
  (noun: string, list: (content: Content) => readonly { id: string }[] | undefined) =>
  (content: Content): Declared[] =>
    (list(content) ?? []).map((entry) => `${noun} "${entry.id}"`)

/** Keys of a record, worded with their noun. */
const byKey =
  (noun: string, record: (content: Content) => object | undefined) =>
  (content: Content): Declared[] =>
    Object.keys(record(content) ?? {}).map((key) => `${noun} "${key}"`)

const CUSTOM_NOUNS = { conditions: 'custom condition', effects: 'custom effect', values: 'custom value', panels: 'custom panel' } as const

/**
 * What each content key declares, for the report of one thing declared twice
 * across the game's content. Typed complete, so a new key has to say. Null for
 * its name, which declares nothing.
 */
const DECLARES: { [K in keyof Content]-?: ((content: Content) => Declared[]) | null } = {
  name: null,
  strings: byKey('string', (content) => content.strings),
  prose: byKey('prose', (content) => content.prose),
  // Content appends to a variants name, so only the same line listed twice is a clash.
  variants: (content) =>
    Object.entries(content.variants ?? {}).flatMap(([name, members]) => members.map((member) => `variants "${name}" line "${memberKey(member)}"`)),
  custom: (content) =>
    (Object.keys(CUSTOM_NOUNS) as (keyof typeof CUSTOM_NOUNS)[]).flatMap((kind) =>
      Object.keys(content.custom?.[kind] ?? {}).map((name) => `${CUSTOM_NOUNS[kind]} "${name}"`),
    ),
  data: (content) =>
    Object.entries(content.data ?? {}).flatMap(([plugin, lists]) =>
      Object.entries(lists).flatMap(([list, entries]) => entries.map((entry) => `${plugin}/${list} "${entry.id}"`)),
    ),
  scenes: byId('scene', (content) => content.scenes),
  items: byId('item', (content) => content.items),
  storylines: byId('storyline', (content) => content.storylines),
  activities: byId('activity', (content) => content.activities),
  collections: byId('collection', (content) => content.collections),
  triggers: byId('trigger', (content) => content.triggers),
  inputs: byId('input', (content) => content.inputs),
  settings: byId('setting', (content) => content.settings),
  stats: byId('stat', (content) => content.stats),
  minigames: byId('minigame', (content) => content.minigames),
  kinds: byId('kind', (content) => content.kinds),
  entities: (content) => (content.entities ?? []).map((entity) => `entity "${entity.of}:${entity.id}"`),
  audio: byKey('track', (content) => content.audio?.tracks),
  media: byKey('pool', (content) => content.media?.pools),
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
  const strings: Record<string, string> = { ...base.strings }
  const variants: Record<string, string[]> = {}
  /** The same, with each member's weight where it has one. */
  const weightedVariants: Record<string, VariantMember[]> = {}
  // The base game's own functions come first; content and packs lay theirs over by name.
  const custom: Custom = {
    conditions: { ...base.custom?.conditions },
    effects: { ...base.custom?.effects },
    values: { ...base.custom?.values },
    panels: { ...base.custom?.panels },
  }
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
  addData('base', base.data)

  /** Which piece of content declared each thing first, by its place in the list, to report a second one. */
  const declaredBy = new Map<Declared, number>()
  const declaredTwice = (piece: Content, index: number) => {
    for (const read of Object.values(DECLARES)) {
      for (const what of new Set(read?.(piece) ?? [])) {
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
  }

  /** Merge one piece of content or one pack into what came before it. */
  const add = (piece: Content | Pack, from: string) => {
    for (const merge of merges.values()) merge.add(piece, from)
    Object.assign(prose, piece.prose ?? {})
    for (const key of Object.keys(piece.prose ?? {})) proseFrom.set(key, from)
    Object.assign(strings, piece.strings ?? {})
    for (const [name, members] of Object.entries(piece.variants ?? {})) {
      variants[name] = [...(variants[name] ?? []), ...members.map(memberKey)]
      weightedVariants[name] = [...(weightedVariants[name] ?? []), ...members]
      for (const member of members) {
        if (typeof member !== 'string' && member.weight !== undefined && !(member.weight > 0)) {
          problems.push({ pack: from, where: `variants ${name}`, what: `"${member.text}" has a weight of ${member.weight}; a weight must be above 0` })
        }
      }
    }
    addData(from, piece.data)
    for (const kind of ['conditions', 'effects', 'values', 'panels'] as const) {
      Object.assign((custom[kind] ??= {}), piece.custom?.[kind] ?? {})
    }
  }

  // The game's own content first, in the order it is given.
  content.forEach((piece, index) => {
    const from = contentName(piece)
    for (const key of Object.keys(piece)) {
      if (Object.hasOwn(CONTENT_KEYS, key)) continue
      const why = key === 'id' || key === 'schema' || key === 'patches' ? `; a pack has one, and goes in \`packs\`` : ''
      problems.push({ pack: from, where: 'content', what: `content has no "${key}", so it was left out${why}` })
    }
    declaredTwice(piece, index)
    // A key content can't hold is left out, so a pack given as content doesn't patch or override anything.
    const { patches: _patches, ...kept } = piece as Content & { patches?: unknown }
    add(kept, from)
  })

  // Then the packs over it, each over the ones before.
  for (const written of packs) {
    // An older pack is carried forward to this schema; one that can't be is skipped whole.
    const upgraded = upgradePack(written)
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
  const game: Game = {
    ...base,
    scenes: [],
    items: [],
    storylines: [],
    activities: [],
    custom,
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
