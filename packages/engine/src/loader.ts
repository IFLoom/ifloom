import type { PluginEntry } from './plugin.ts'
import type { CollectionDef } from './collections.ts'
import type { InputDef } from './inputs.ts'
import type { TriggerDef } from './triggers.ts'
import type { EntityDef, KindDef } from './entities.ts'
import type { ActivityDef } from './activity.ts'
import type { Game, ItemDef, Scene, StorylineDef } from './game.ts'
import type { Custom } from './custom.ts'
import { memberKey, proseStore, type VariantMember } from './prose.ts'
import type { DataScene } from './scene.ts'
import type { Flat } from './types.ts'
import { checkContent, type CoreList, type Problem, type Source } from './check.ts'
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

export type Patch =
  | { scene: string; addChoice: DataScene['choices'][number]; before?: string }
  | { scene: string; dropChoice: string }
  | { scene: string; replaceChoice: DataScene['choices'][number] }

/** The fields of a pack the core merges itself. The features' (settings, stats, audio, media) are in `features/`. */
type PackBase = {
  id: string
  /** Schema this pack was written against. Refused if it is not ours. */
  schema: number
  scenes?: (Scene | DataScene)[]
  items?: ItemDef[]
  storylines?: StorylineDef[]
  activities?: ActivityDef[]
  /** Kinds of thing the game keeps several of. A later pack can redeclare one by id. */
  kinds?: KindDef[]
  /** Things of those kinds there at the start. A later pack can redeclare one by kind and id. */
  entities?: EntityDef[]
  collections?: CollectionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
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
  /** Surgical changes to content an earlier pack declared. */
  patches?: Patch[]
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

function byId<T extends { id: string }>(
  into: Map<string, { value: T; from: string }>,
  items: T[] | undefined,
  from: string,
): void {
  for (const item of items ?? []) into.set(item.id, { value: item, from })
}

function isData(scene: Scene | DataScene): scene is DataScene {
  return 'body' in scene && Array.isArray((scene as DataScene).body)
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
  const scenes = new Map<string, { value: Scene | DataScene; from: string }>()
  const items = new Map<string, { value: ItemDef; from: string }>()
  const storylines = new Map<string, { value: StorylineDef; from: string }>()
  const activities = new Map<string, { value: ActivityDef; from: string }>()
  const collections = new Map<string, { value: CollectionDef; from: string }>()
  const triggers = new Map<string, { value: TriggerDef; from: string }>()
  const inputs = new Map<string, { value: InputDef; from: string }>()
  // Each feature merges its own pack key, in its own way: settings by id, audio field by field, a media pool whole.
  const merges = new Map<string, PackMerge<object, object>>()
  for (const feature of packFeatures) {
    merges.set(feature.name, feature.pack!.merge((pack, where, what) => problems.push({ pack, where, what })) as PackMerge<object, object>)
  }
  const kinds = new Map<string, { value: KindDef; from: string }>()
  // Keyed `kind:id`: two kinds may each have an entity called the same.
  const entities = new Map<string, { value: EntityDef; from: string }>()
  const addEntities = (list: EntityDef[] | undefined, from: string) => {
    for (const entity of list ?? []) entities.set(`${entity.of}:${entity.id}`, { value: entity, from })
  }
  // Declared on the base game itself, as well as in packs: the base's come first.
  // Plugins' kinds first, so the game's own redeclare them.
  for (const plugin of base.plugins ?? []) byId(kinds, plugin.kinds ? [...plugin.kinds] : undefined, plugin.id)
  byId(kinds, base.kinds, 'base')
  addEntities(base.entities, 'base')
  byId(collections, base.collections, 'base')
  byId(triggers, base.triggers, 'base')
  byId(inputs, base.inputs, 'base')
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
    byId(scenes, pack.scenes as (Scene & { id: string })[], pack.id)
    byId(items, pack.items, pack.id)
    byId(storylines, pack.storylines, pack.id)
    byId(activities, pack.activities, pack.id)
    byId(kinds, pack.kinds, pack.id)
    addEntities(pack.entities, pack.id)
    byId(collections, pack.collections, pack.id)
    byId(triggers, pack.triggers, pack.id)
    byId(inputs, pack.inputs, pack.id)
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

    for (const patch of pack.patches ?? []) {
      const target = scenes.get(patch.scene)
      if (!target || !isData(target.value)) {
        problems.push({
          pack: pack.id,
          where: `patch ${patch.scene}`,
          what: target ? 'that scene is not declarative, so it cannot be patched' : 'no such scene',
        })
        continue
      }
      const scene = { ...target.value, choices: [...target.value.choices] }
      if ('dropChoice' in patch) {
        scene.choices = scene.choices.filter((choice) => choice.id !== patch.dropChoice)
      } else if ('replaceChoice' in patch) {
        const at = scene.choices.findIndex((choice) => choice.id === patch.replaceChoice.id)
        if (at < 0) {
          problems.push({ pack: pack.id, where: `patch ${patch.scene}`, what: `no choice ${patch.replaceChoice.id}` })
        } else scene.choices[at] = patch.replaceChoice
      } else {
        const at = patch.before
          ? scene.choices.findIndex((choice) => choice.id === patch.before)
          : -1
        if (at >= 0) scene.choices.splice(at, 0, patch.addChoice)
        else scene.choices.push(patch.addChoice)
      }
      scenes.set(patch.scene, { value: scene, from: pack.id })
    }
  }

  const game: Game = {
    ...base,
    scenes: [...scenes.values()].map((entry) => entry.value) as Scene[],
    items: [...items.values()].map((entry) => entry.value),
    storylines: [...storylines.values()].map((entry) => entry.value),
    activities: [...activities.values()].map((entry) => entry.value),
    kinds: [...kinds.values()].map((entry) => entry.value),
    entities: [...entities.values()].map((entry) => entry.value),
    collections: [...collections.values()].map((entry) => entry.value),
    triggers: [...triggers.values()].map((entry) => entry.value),
    inputs: [...inputs.values()].map((entry) => entry.value),
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
  // Plugins' entities, made from their content now it is merged; one the game declares itself wins.
  for (const plugin of base.plugins ?? []) {
    for (const entity of plugin.entities?.(game) ?? []) {
      const ref = `${entity.of}:${entity.id}`
      if (!entities.has(ref)) entities.set(ref, { value: entity, from: plugin.id })
    }
  }
  game.entities = [...entities.values()].map((entry) => entry.value)
  // Scenes read their words from here; the store fills tokens for the save.
  game.prose = proseStore(game, prose, weightedVariants)

  // Now merged, the game is checked as any game is, and each problem is pinned on the pack that brought it.
  const packOf = (source: Source): string => {
    if (source === undefined) return 'base'
    if ('plugin' in source) return data.get(source.plugin)?.get(source.list)?.get(source.id)?.from ?? 'base'
    // A feature's list: the feature's merge knows.
    const owner = Object.hasOwn(listOwners, source.list) ? listOwners[source.list as keyof typeof listOwners] : undefined
    if (owner) return merges.get(owner.name)?.from(source.list, source.id) ?? 'base'
    const list = source.list as CoreList
    const id = source.id ?? ''
    const from: Record<CoreList, Map<string, { from: string }> | undefined> = {
      scene: scenes,
      item: items,
      storyline: storylines,
      activity: activities,
      kind: kinds,
      entity: entities,
      collection: collections,
      trigger: triggers,
      input: inputs,
      prose: undefined,
    }
    if (list === 'prose') return proseFrom.get(id) ?? 'base'
    return from[list]?.get(id)?.from ?? 'base'
  }
  problems.push(...checkContent(game, [], packOf).problems)

  return { game, prose, variants, problems }
}
