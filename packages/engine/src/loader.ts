import { absentPartner, pluginArgProblems, pluginCommand, type PluginEntry } from './plugin.ts'
import type { CollectionDef } from './collections.ts'
import type { InputDef } from './inputs.ts'
import type { TriggerDef } from './triggers.ts'
import type { Command, Effect } from './types.ts'
import type { EffectRef } from './custom.ts'
import type { StatDef } from './stats.ts'
import { anyOf, bindCurrent, parseRef, statOwnerProblem, type EntityDef, type KindDef } from './entities.ts'
import type { ActivityDef } from './activity.ts'
import { referenced } from './condition.ts'
import type {
  Game,
  ItemDef,
  Scene,
  SettingDef,
  StorylineDef,
} from './game.ts'
import { settingConditionProblems, settingProblems } from './settings.ts'
import type { Condition } from './condition.ts'
import { customCall, customCondition, customEffectsUsed, hasCustomEffect, type Custom } from './custom.ts'
import { proseStore } from './prose.ts'
import { sceneReferences, type Block, type DataScene } from './scene.ts'
import { cueProblems, manifestProblems, markupProblems, placementProblems, type ChannelDef, type GameAudio, type PlaylistDef, type TrackDef } from './audio.ts'

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

export type Pack = {
  id: string
  /** Schema this pack was written against. Refused if it is not ours. */
  schema: number
  scenes?: (Scene | DataScene)[]
  items?: ItemDef[]
  storylines?: StorylineDef[]
  activities?: ActivityDef[]
  /** Stats the game keeps. A later pack can redeclare one by id. */
  stats?: StatDef[]
  /** Kinds of thing the game keeps several of. A later pack can redeclare one by id. */
  kinds?: KindDef[]
  /** Things of those kinds there at the start. A later pack can redeclare one by kind and id. */
  entities?: EntityDef[]
  collections?: CollectionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  /** What the player can change from a settings screen. A later pack can redeclare one by id. */
  settings?: SettingDef[]
  /** Player-facing words by key, over the engine's and plugins' own. Later packs override earlier ones. */
  strings?: Record<string, string>
  /** Prose by key. Later packs override earlier ones. */
  prose?: Record<string, string>
  /** Variants membership by variants name, in draw order. Later packs append. */
  variants?: Record<string, string[]>
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
  /**
   * Sounds, channels and defaults over the game's own. A later pack's track
   * or channel replaces an earlier one's by id; its `mute` and `default`
   * entries win too.
   */
  audio?: Partial<GameAudio>
}

export type Problem = {
  pack: string
  where: string
  what: string
}

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
 * the pack that introduced it. A mod author gets "mod:spicier · scene
 * allie.talk · choice kiss · unknown scene 'allie.snog'", not a stack trace.
 */
export function loadGame(packs: Pack[], base: Omit<Game, 'scenes' | 'items' | 'storylines' | 'activities' | 'stats'>): Loaded {
  const problems: Problem[] = []
  const scenes = new Map<string, { value: Scene | DataScene; from: string }>()
  const items = new Map<string, { value: ItemDef; from: string }>()
  const storylines = new Map<string, { value: StorylineDef; from: string }>()
  const activities = new Map<string, { value: ActivityDef; from: string }>()
  const stats = new Map<string, { value: StatDef; from: string }>()
  const collections = new Map<string, { value: CollectionDef; from: string }>()
  const triggers = new Map<string, { value: TriggerDef; from: string }>()
  const inputs = new Map<string, { value: InputDef; from: string }>()
  const settings = new Map<string, { value: SettingDef; from: string }>()
  // A later pack redeclares a setting by id; the same id twice in one list is a mistake.
  const addSettings = (list: SettingDef[] | undefined, from: string) => {
    const here = new Set<string>()
    for (const setting of list ?? []) {
      if (here.has(setting.id)) problems.push({ pack: from, where: `setting ${setting.id}`, what: 'two settings share this id' })
      here.add(setting.id)
      settings.set(setting.id, { value: setting, from })
    }
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
  addSettings(base.settings, 'base')
  const prose: Record<string, string> = {}
  /** Which pack each prose key came from, for markup problems. */
  const proseFrom = new Map<string, string>()
  // Audio, merged by id: tracks and channels, then the mute setting and each channel's default.
  const tracks = new Map<string, { value: TrackDef | PlaylistDef; from: string }>()
  const channels = new Map<string, { value: ChannelDef; from: string }>()
  const defaults: Record<string, string> = {}
  let mute: string | undefined
  let audioFrom = 'base'
  let hasAudio = false
  const addAudio = (from: string, audio: Partial<GameAudio> | undefined) => {
    if (!audio) return
    hasAudio = true
    for (const [id, value] of Object.entries(audio.tracks ?? {})) tracks.set(id, { value, from })
    for (const [id, value] of Object.entries(audio.channels ?? {})) channels.set(id, { value: { ...channels.get(id)?.value, ...value }, from })
    if (audio.mute !== undefined || audio.default !== undefined) audioFrom = from
    if (audio.mute !== undefined) mute = audio.mute
    Object.assign(defaults, audio.default ?? {})
  }
  addAudio('base', base.audio)
  const strings: Record<string, string> = { ...base.strings }
  const variants: Record<string, string[]> = {}
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
  const pluginIds = new Set<string>()
  for (const plugin of base.plugins ?? []) {
    if (!/^[a-z0-9-]+$/i.test(plugin.id)) {
      problems.push({ pack: 'base', where: `plugin ${plugin.id}`, what: 'a plugin id is letters, digits and "-" only' })
    }
    if (pluginIds.has(plugin.id)) {
      problems.push({ pack: 'base', where: `plugin ${plugin.id}`, what: 'two plugins share this id' })
    }
    pluginIds.add(plugin.id)
  }

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
    byId(stats, pack.stats, pack.id)
    byId(kinds, pack.kinds, pack.id)
    addEntities(pack.entities, pack.id)
    byId(collections, pack.collections, pack.id)
    byId(triggers, pack.triggers, pack.id)
    byId(inputs, pack.inputs, pack.id)
    addSettings(pack.settings, pack.id)
    Object.assign(prose, pack.prose ?? {})
    for (const key of Object.keys(pack.prose ?? {})) proseFrom.set(key, pack.id)
    addAudio(pack.id, pack.audio)
    Object.assign(strings, pack.strings ?? {})
    for (const [name, members] of Object.entries(pack.variants ?? {})) {
      variants[name] = [...(variants[name] ?? []), ...members]
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
    stats: [...stats.values()].map((entry) => entry.value),
    kinds: [...kinds.values()].map((entry) => entry.value),
    entities: [...entities.values()].map((entry) => entry.value),
    collections: [...collections.values()].map((entry) => entry.value),
    triggers: [...triggers.values()].map((entry) => entry.value),
    inputs: [...inputs.values()].map((entry) => entry.value),
    settings: [...settings.values()].map((entry) => entry.value),
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
  if (hasAudio) {
    const audio: GameAudio = { tracks: Object.fromEntries([...tracks].map(([id, entry]) => [id, entry.value])) }
    if (channels.size) audio.channels = Object.fromEntries([...channels].map(([id, entry]) => [id, entry.value]))
    if (mute !== undefined) audio.mute = mute
    if (Object.keys(defaults).length) audio.default = defaults
    game.audio = audio
  } else delete game.audio
  // Plugins' entities, made from their content now it is merged; one the game declares itself wins.
  for (const plugin of base.plugins ?? []) {
    for (const entity of plugin.entities?.(game) ?? []) {
      const ref = `${entity.of}:${entity.id}`
      if (!entities.has(ref)) entities.set(ref, { value: entity, from: plugin.id })
    }
  }
  game.entities = [...entities.values()].map((entry) => entry.value)
  // Scenes read their words from here; the store fills tokens for the save.
  game.prose = proseStore(game, prose, variants)

  // Everything a declarative scene points at has to exist.
  const sceneIds = new Set(game.scenes.map((scene) => scene.id))
  const storylineIds = new Set(game.storylines.map((storyline) => storyline.id))
  const itemIds = new Set(game.items.map((item) => item.id))
  const statIds = new Set(stats.keys())
  const kindIds = new Set(kinds.keys())
  const collectionIds = new Set(collections.keys())

  /** Everything a condition names that the game does not have, as a problem's `what`. */
  function conditionProblems(condition: Condition | undefined): string[] {
    const out: string[] = []
    const used = referenced(condition)
    const missing = (ids: string[], have: Set<string>, what: string) => {
      for (const id of ids) if (!have.has(id)) out.push(`${what} "${id}"`)
    }
    missing(used.storylines, storylineIds, 'unknown storyline')
    missing(used.items, itemIds, 'unknown item')
    missing(used.stats, statIds, 'unknown stat')
    missing(used.collections, collectionIds, 'unknown collection')
    missing(used.scenes, sceneIds, 'gated on unknown scene')
    missing(used.kinds, kindIds, 'unknown kind')
    for (const { stat, of } of used.owned) {
      const def = stats.get(stat)?.value
      const problem = def && statOwnerProblem(def.of, stat, of)
      if (problem) out.push(problem)
    }
    for (const key of used.choices) {
      const cut = key.lastIndexOf('/')
      const scene = cut > 0 ? scenes.get(key.slice(0, cut))?.value : undefined
      if (!scene) out.push(`gated on a choice in unknown scene "${key}"`)
      // Only a data scene's choices are known before it runs; a hand-built one is taken at its word.
      else if (isData(scene) && !scene.choices.some((choice) => choice.id === key.slice(cut + 1))) {
        out.push(`gated on unknown choice "${key}"`)
      }
    }
    for (const name of used.custom) {
      if (!customCondition(game, name) && !absentPartner(game, name)) out.push(`no custom condition named "${name}"`)
    }
    for (const call of used.calls) out.push(...pluginArgProblems(game, 'conditions', call.custom, call.with ?? {}))
    for (const { setting, is } of used.settings) out.push(...settingConditionProblems(game, setting, is))
    return out
  }

  /** What blocks name that the game does not have: prose keys, variants, and the conditions on them. */
  function blockProblems(blocks: readonly Block[]): string[] {
    const refs = sceneReferences({ id: '', body: [...blocks], choices: [] })
    return [
      ...refs.prose.filter((key) => prose[key] === undefined).map((key) => `no prose for "${key}"`),
      ...refs.variants.filter((name) => !variants[name]?.length).map((name) => `variants "${name}" has no lines`),
      ...blocks.flatMap((block) => [block.when, ...('variants' in block ? Object.values(block.gate ?? {}) : [])]).flatMap(conditionProblems),
    ]
  }

  /** What a button's command names that the game does not have. */
  function commandProblems(command: Command): string[] {
    switch (command.type) {
      case 'scene':
        return sceneIds.has(command.id) ? [] : [`opens unknown scene "${command.id}"`]
      case 'activity':
        return activities.has(command.id) ? [] : [`unknown activity "${command.id}"`]
      case 'use':
        return itemIds.has(command.itemId) ? [] : [`unknown item "${command.itemId}"`]
      case 'custom':
        if (!pluginCommand(game, command.name) && !absentPartner(game, command.name)) return [`no plugin command named "${command.name}"`]
        return pluginArgProblems(game, 'commands', command.name, command.with ?? {})
      default:
        return []
    }
  }

  /** Report everything these conditions name that the game does not have. */
  function checkConditions(conditions: (Condition | undefined)[], from: string, where: string): void {
    for (const condition of conditions) {
      for (const what of conditionProblems(condition)) problems.push({ pack: from, where, what })
    }
  }

  for (const { value, from } of scenes.values()) {
    if (!isData(value)) continue
    const refs = sceneReferences(value)
    for (const key of refs.prose) {
      if (prose[key] === undefined) {
        problems.push({ pack: from, where: `scene ${value.id}`, what: `no prose for "${key}"` })
      }
    }
    for (const name of refs.variants) {
      if (!variants[name]?.length) {
        problems.push({ pack: from, where: `scene ${value.id}`, what: `variants "${name}" has no lines` })
      }
    }
    for (const name of refs.custom) {
      if (!hasCustomEffect(game, name) && !absentPartner(game, name)) {
        problems.push({ pack: from, where: `scene ${value.id}`, what: `no custom effect named "${name}"` })
      }
    }
    for (const id of refs.scenes) {
      if (!sceneIds.has(id)) {
        problems.push({ pack: from, where: `scene ${value.id}`, what: `goes to unknown scene "${id}"` })
      }
    }
    const conditions = [
      ...value.body.flatMap((block) => [
        block.when,
        ...('variants' in block ? Object.values(block.gate ?? {}) : []),
      ]),
      ...value.choices.flatMap((choice) => [
        choice.when,
        ...(choice.blocked ?? []).map((entry) => entry.when),
        ...(choice.labels ?? []).map((entry) => entry.when),
      ]),
    ]
    checkConditions(conditions, from, `scene ${value.id}`)
    for (const what of placementProblems(game, value.audio ?? {})) problems.push({ pack: from, where: `scene ${value.id}`, what })
  }

  // Audio: the manifest, then every sound and voice the prose names.
  for (const { where, what } of manifestProblems(game)) {
    const [list, id] = [where.slice(0, where.indexOf(' ')), where.slice(where.indexOf(' ') + 1)]
    const from = list === 'track' ? tracks.get(id)?.from : list === 'channel' ? channels.get(id)?.from : audioFrom
    problems.push({ pack: from ?? 'base', where, what })
  }
  for (const [key, text] of Object.entries(prose)) {
    for (const what of markupProblems(game, text)) problems.push({ pack: proseFrom.get(key) ?? 'base', where: `prose ${key}`, what })
  }

  // Activities are data too, and are checked the same way: everything a
  // condition names has to exist.
  /** What an effect list names that the game does not have: collections, prose, scenes, custom effects. */
  function effectProblems(refs: readonly EffectRef[]): string[] {
    const out: string[] = []
    for (const ref of refs) {
      const call = customCall(ref)
      if (call) {
        if (!hasCustomEffect(game, call.custom) && !absentPartner(game, call.custom)) out.push(`no custom effect named "${call.custom}"`)
        out.push(...pluginArgProblems(game, 'effects', call.custom, call.with ?? {}))
        continue
      }
      const effect = ref as Effect
      // The kind an entity effect names, when it names one rather than `'$'`.
      const named = effect.kind === 'create' || effect.kind === 'each' ? effect.of : 'of' in effect && effect.of !== undefined ? parseRef(effect.of)?.kind : undefined
      if (named !== undefined && !kindIds.has(named)) out.push(`unknown kind "${named}"`)
      if (effect.kind === 'stat' || effect.kind === 'setStat') {
        const def = stats.get(effect.key)?.value
        const problem = def && statOwnerProblem(def.of, effect.key, effect.of)
        if (problem) out.push(problem)
      }
      if (effect.kind === 'each') {
        // Inside, `'$'` is one of the kind it runs over.
        const one = anyOf(effect.of)
        const inner = [...conditionProblems(bindCurrent(effect.where, one)), ...effectProblems(bindCurrent(effect.effects, one))]
        out.push(...inner.map((what) => (what.startsWith('in each ') ? what : `in each ${effect.of}: ${what}`)))
      }
      if ((effect.kind === 'collect' || effect.kind === 'discard')) {
        const id = effect.kind === 'collect' ? effect.to : effect.from
        if (!collectionIds.has(id)) out.push(`unknown collection "${id}"`)
      }
      if (effect.kind === 'notify' && effect.text !== undefined && prose[effect.text] === undefined) {
        out.push(`no prose for "${effect.text}"`)
      }
      if (effect.kind === 'collect' && effect.entry.text !== undefined && prose[effect.entry.text] === undefined) {
        out.push(`no prose for "${effect.entry.text}"`)
      }
      if (effect.kind === 'scene' && effect.id !== null && !sceneIds.has(effect.id)) {
        out.push(`goes to unknown scene "${effect.id}"`)
      }
      if (effect.kind === 'audio') out.push(...placementProblems(game, { [effect.channel]: effect.track }))
      if (effect.kind === 'sound') out.push(...cueProblems(game, effect.track))
    }
    return out
  }

  for (const { value, from } of stats.values()) {
    if (value.of !== undefined && !kindIds.has(value.of)) problems.push({ pack: from, where: `stat ${value.id}`, what: `belongs to unknown kind "${value.of}"` })
  }
  for (const { value, from } of entities.values()) {
    const where = `entity ${value.of}:${value.id}`
    if (!kindIds.has(value.of)) problems.push({ pack: from, where, what: `unknown kind "${value.of}"` })
    // Object keys that look like numbers sort first, which would scramble the order entities came in.
    if (/^\d+$/.test(value.id)) problems.push({ pack: from, where, what: 'an entity id must not be a whole number' })
    for (const key of Object.keys(value.stats ?? {})) {
      if (stats.get(key)?.value.of !== value.of) problems.push({ pack: from, where, what: `no ${value.of} stat named "${key}"` })
    }
  }
  for (const { value, from } of triggers.values()) {
    checkConditions([value.when], from, `trigger ${value.id}`)
    for (const what of effectProblems(value.effects)) problems.push({ pack: from, where: `trigger ${value.id}`, what })
  }
  for (const { value, from } of settings.values()) {
    for (const what of settingProblems(value)) problems.push({ pack: from, where: `setting ${value.id}`, what })
  }
  checkConditions([game.finished], 'base', 'finished')
  for (const id of game.carryOver?.stats ?? []) {
    const def = stats.get(id)?.value
    if (!def) problems.push({ pack: 'base', where: 'carryOver', what: `unknown stat "${id}"` })
    else if (def.of !== undefined) problems.push({ pack: 'base', where: 'carryOver', what: `stat "${id}" belongs to ${def.of}, not the player` })
  }
  if (Array.isArray(game.carryOver?.items)) {
    for (const id of game.carryOver.items) {
      if (!itemIds.has(id)) problems.push({ pack: 'base', where: 'carryOver', what: `unknown item "${id}"` })
    }
  }
  for (const { value, from } of inputs.values()) {
    const where = `input ${value.id}`
    checkConditions([value.when], from, where)
    if (value.kind === 'choice' && !value.options?.length) problems.push({ pack: from, where, what: 'a choice with no options' })
    if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
      problems.push({ pack: from, where, what: 'min is above max' })
    }
  }
  // Collections, notices and scenes named in data scenes' and activities' own effects.
  for (const { value, from } of scenes.values()) {
    if (!isData(value)) continue
    for (const choice of value.choices) {
      // Custom effects and scenes a choice names are reported above; everything else here.
      for (const what of effectProblems(choice.effects).filter((what) => !/^no custom effect named|^goes to unknown scene/.test(what))) {
        problems.push({ pack: from, where: `scene ${value.id}`, what })
      }
    }
  }

  for (const { value, from } of activities.values()) {
    // Custom effects an activity names are reported below; everything else here.
    for (const what of effectProblems(value.effects ?? []).filter((what) => !/^no custom effect named/.test(what))) {
      problems.push({ pack: from, where: `activity ${value.id}`, what })
    }
    checkConditions((value.requires ?? []).map((entry) => entry.when), from, `activity ${value.id}`)
    for (const name of customEffectsUsed(value.effects ?? [])) {
      if (!hasCustomEffect(game, name) && !absentPartner(game, name)) {
        problems.push({ pack: from, where: `activity ${value.id}`, what: `no custom effect named "${name}"` })
      }
    }
  }
  // Each plugin checks its own content; the problem is pinned on the pack the entry came from.
  for (const plugin of game.plugins ?? []) {
    const audioProblems = (audio: Record<string, string | null> | undefined) => (audio ? placementProblems(game, audio) : [])
    for (const problem of plugin.check?.(game, { conditionProblems, blockProblems, commandProblems, audioProblems }) ?? []) {
      const from = data.get(plugin.id)?.get(problem.list)?.get(problem.id)?.from ?? 'base'
      problems.push({ pack: from, where: `${problem.list} ${problem.id}`, what: problem.what })
    }
  }

  // The game's own actions, offered everywhere, come with the base.
  for (const action of game.actions ?? []) {
    checkConditions(
      [action.when, ...(action.blocked ?? []).map((entry) => entry.when)],
      'base',
      `action ${action.id}`,
    )
    for (const what of commandProblems(action.command)) problems.push({ pack: 'base', where: `action ${action.id}`, what })
  }

  return { game, prose, variants, problems }
}

export function describeProblem(problem: Problem): string {
  return `${problem.pack} · ${problem.where} · ${problem.what}`
}
