import type { PluginEntry } from './plugin.ts'
import type { Game } from './game.ts'
import type { Custom } from './custom.ts'
import { memberKey, proseStore, type VariantMember } from './prose.ts'
import type { Flat } from './types.ts'
import { checkContent, type Problem, type Source } from './check.ts'
import { listOwners, packFeatures, type FeaturePack } from './features/registry.ts'
import type { PackMerge } from './features/feature.ts'

/**
 * Content arrives as ordered packs and is merged into one game.
 *
 * Core content is simply the first pack, so nothing about it is special —
 * which is the point: a mods folder becomes another entry in the list rather
 * than a change to the engine.
 */
export const SCHEMA = 4

export type { Patch } from './features/scenes.ts'

/** The fields of a pack the core merges itself. The features' (scenes, items, settings and the rest) are in `features/`. */
type PackBase = {
  id: string
  /** Schema this pack was written against. Refused if it is not ours. */
  schema: number
  /** Player-facing words by key, over the engine's and plugins' own. Later packs override earlier ones. */
  strings?: Record<string, string>
  /** Prose by key. Later packs override earlier ones. */
  prose?: Record<string, string>
  /**
   * Variants membership by variants name, in draw order. Later packs append.
   * A member is a prose key, or `{ text: key, weight }` to be drawn more or
   * less often than the rest.
   */
  variants?: Record<string, VariantMember[]>
  /** Named functions content calls. A later pack's replaces an earlier one's by name. */
  custom?: Custom
  /**
   * Content for the game's plugins, by plugin id and then list:
   * `{ quests: { quests: [...] } }`. A later pack's entry replaces an earlier
   * one's by id, as scenes do.
   */
  data?: Record<string, Record<string, readonly PluginEntry[]>>
}

/** A pack of content: what the core merges, and each feature's pack key. */
export type Pack = Flat<PackBase & FeaturePack>

export type Loaded = {
  game: Game
  prose: Record<string, string>
  variants: Record<string, string[]>
  problems: Problem[]
}

/**
 * Merge packs in order and report everything wrong with the result, naming
 * the pack that introduced it. The result is checked with the content checker
 * (`checkGame`); this adds only which pack each problem came from, and what is
 * wrong with the packs themselves. A mod author gets "mod:spicier · scene
 * allie.talk · choice kiss · unknown scene 'allie.snog'", not a stack trace.
 */
export function loadGame(packs: Pack[], base: Omit<Game, 'scenes' | 'items' | 'storylines' | 'activities' | 'stats'>): Loaded {
  const problems: Problem[] = []
  // Each feature merges its own pack key, in its own way: scenes by id with patches, audio field by field, a media pool whole.
  const merges = new Map<string, PackMerge<object, object>>()
  for (const feature of packFeatures) {
    merges.set(feature.name, feature.pack!.merge((pack, where, what) => problems.push({ pack, where, what })) as PackMerge<object, object>)
  }
  for (const merge of merges.values()) merge.base(base)
  const prose: Record<string, string> = {}
  /** Which pack each prose key came from, for markup problems. */
  const proseFrom = new Map<string, string>()
  const strings: Record<string, string> = { ...base.strings }
  const variants: Record<string, string[]> = {}
  /** The same, with each member's weight where it has one. */
  const weightedVariants: Record<string, VariantMember[]> = {}
  // The base game's own functions come first; packs lay theirs over by name.
  const custom: Custom = {
    conditions: { ...base.custom?.conditions },
    effects: { ...base.custom?.effects },
    values: { ...base.custom?.values },
    panels: { ...base.custom?.panels },
  }
  // Plugin content by plugin, then list, then id; the base's own comes first.
  const data = new Map<string, Map<string, Map<string, { value: PluginEntry; from: string }>>>()
  const addData = (from: string, incoming: Pack['data']) => {
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
  for (const pack of packs) {
    if (pack.schema !== SCHEMA) {
      problems.push({
        pack: pack.id,
        where: 'pack',
        what: `written for schema ${pack.schema}, this engine reads ${SCHEMA}`,
      })
      continue
    }
    for (const merge of merges.values()) merge.add(pack, pack.id)
    Object.assign(prose, pack.prose ?? {})
    for (const key of Object.keys(pack.prose ?? {})) proseFrom.set(key, pack.id)
    Object.assign(strings, pack.strings ?? {})
    for (const [name, members] of Object.entries(pack.variants ?? {})) {
      variants[name] = [...(variants[name] ?? []), ...members.map(memberKey)]
      weightedVariants[name] = [...(weightedVariants[name] ?? []), ...members]
      for (const member of members) {
        if (typeof member !== 'string' && member.weight !== undefined && !(member.weight > 0)) {
          problems.push({ pack: pack.id, where: `variants ${name}`, what: `"${member.text}" has a weight of ${member.weight}; a weight must be above 0` })
        }
      }
    }
    addData(pack.id, pack.data)
    for (const kind of ['conditions', 'effects', 'values', 'panels'] as const) {
      Object.assign((custom[kind] ??= {}), pack.custom?.[kind] ?? {})
    }
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
