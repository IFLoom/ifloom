/**
 * The content checker: one walk over a game's content that resolves
 * everything it names, runs each feature's own checks, and lists the files it
 * names. `loadGame` runs it on the game it merges; a hand-built game calls
 * `checkGame` itself.
 */
import { audioSrc, cueProblems, manifestProblems, markupProblems, placementProblems } from './audio.ts'
import { sceneContext } from './context.ts'
import { customPanel, customValue, hasCustomEffect, customCondition } from './custom.ts'
import { statOwnerProblem } from './entities.ts'
import { sceneById, type Game, type SceneMedia } from './game.ts'
import { mediaMarkupProblems, poolManifestProblems, poolProblems, sceneMediaProblems, stageProblems, type MediaStage } from './media.ts'
import { absentPartner, pluginArgProblems, pluginById, pluginCommand, pluginEffect, pluginName, type Plugin } from './plugin.ts'
import {
  blockReferences,
  commandReferences,
  conditionReferences,
  dataSceneReferences,
  effectReferences,
  type Reference,
} from './references.ts'
import { isDataScene } from './scene.ts'
import { artSrc, MEDIA_MARKUP, mediaKind, mediaParts } from './sceneBody.ts'
import { settingConditionProblems, settingProblems } from './settings.ts'
import { statProblems } from './stats.ts'
import type { GameState } from './types.ts'

/** Something wrong with a game's content: the pack it came from (`game` for a hand-built game), where, and what. */
export type Problem = {
  pack: string
  where: string
  what: string
}

/** A file the game names, as the page asks for it (after `artSrc` or `audioSrc`), with where it is named. */
export type FileRef = { path: string; kind: 'picture' | 'video' | 'audio'; where: string }

/** A state to render every scene against, named for the problems it finds. */
export type Probe = { name: string; state: GameState }

/** What `checkGame` finds. */
export type Checked = { problems: Problem[]; files: FileRef[] }

/**
 * What a problem is about, for `loadGame` to name the pack it came from.
 * Undefined is the game itself: its actions, `finished`, `carryOver`.
 */
export type Source =
  | { list: 'scene' | 'item' | 'storyline' | 'activity' | 'stat' | 'kind' | 'entity' | 'collection' | 'trigger' | 'input' | 'setting' | 'track' | 'channel' | 'pool' | 'prose'; id: string }
  | { list: 'audio' }
  | { plugin: string; list: string; id: string }
  | undefined

/** A problem as a line: `pack · where · what`. */
export function describeProblem(problem: Problem): string {
  return `${problem.pack} · ${problem.where} · ${problem.what}`
}

/**
 * Everything wrong with a game's content, and every file it names. Runs on
 * any `Game`, hand-built or loaded. Give `probes` to also render every scene
 * against each state, which is the only way to look inside a hand-built
 * scene. A hand-built game's problems name the pack `game`.
 */
export function checkGame(game: Game, options: { probes?: readonly Probe[] } = {}): Checked {
  return checkContent(game, options.probes ?? [], () => 'game')
}

/** A page path as written (`art/photo/ava.svg`), or null for a URL or nothing. */
function pagePath(path: string): string | null {
  if (!path.trim() || /^(?:[a-z]+:|\/\/)/i.test(path)) return null
  return path.replace(/^\.?\//, '')
}

/** The content checker, with how to name the pack a problem came from. `loadGame` passes its own. */
export function checkContent(game: Game, probes: readonly Probe[], packOf: (source: Source) => string): Checked {
  const problems: Problem[] = []
  const files: FileRef[] = []
  const fileSeen = new Set<string>()
  const say = (source: Source, where: string, what: string) => problems.push({ pack: packOf(source), where, what })
  const file = (where: string, kind: FileRef['kind'], path: string | null) => {
    if (!path) return
    const key = `${kind} ${path} ${where}`
    if (fileSeen.has(key)) return
    fileSeen.add(key)
    files.push({ path, kind, where })
  }

  const plugins = game.plugins ?? []
  const sceneOf = new Map(game.scenes.map((scene) => [scene.id, scene]))
  const itemIds = new Set(game.items.map((item) => item.id))
  const storylineIds = new Set(game.storylines.map((storyline) => storyline.id))
  const statOf = new Map((game.stats ?? []).map((stat) => [stat.id, stat]))
  const kindIds = new Set([...(game.kinds ?? []), ...plugins.flatMap((plugin) => plugin.kinds ?? [])].map((kind) => kind.id))
  const collectionIds = new Set((game.collections ?? []).map((entry) => entry.id))
  const activityIds = new Set(game.activities.map((activity) => activity.id))
  const inputIds = new Set((game.inputs ?? []).map((input) => input.id))
  const drawnFrom = new Set(game.scenes.flatMap((scene) => scene.drawnFrom ?? []))
  /** Every prose key something names, with what named it first, for the markup scan. */
  const proseNamed = new Set<string>()

  // Resolving references.

  const resolve = (refs: readonly Reference[], where: string): string[] => refs.flatMap((ref) => one(ref, where))

  const markup = (text: string, where: string): string[] => {
    for (const match of text.matchAll(new RegExp(MEDIA_MARKUP.source, 'g'))) {
      const read = mediaParts(match[2], match[3])
      if (read.flags.poster) file(where, 'picture', artSrc(read.flags.poster))
      if (read.pool !== undefined) continue
      const video = match[1] === 'video' || match[1] === 'widevideo' || mediaKind(read.path) === 'video'
      file(where, video ? 'video' : 'picture', artSrc(read.path, video ? 'video' : 'image'))
    }
    return [...markupProblems(game, text), ...mediaMarkupProblems(game, text)]
  }

  const mediaFiles = (where: string, media: { src?: string; video?: boolean; poster?: string }) => {
    if (media.src !== undefined) {
      const video = Boolean(media.video) || mediaKind(media.src) === 'video'
      file(where, video ? 'video' : 'picture', artSrc(media.src, video ? 'video' : 'image'))
    }
    if (media.poster) file(where, 'picture', artSrc(media.poster))
  }

  const stage = (value: MediaStage | undefined, choices: readonly string[] | null, where: string): string[] => {
    if (!value) return []
    for (const layer of Array.isArray(value.layers) ? value.layers : []) mediaFiles(where, layer)
    return [
      ...stageProblems(game, value, choices),
      ...(Array.isArray(value.layers) ? value.layers : []).flatMap((layer, index) => resolve([{ when: layer.when }], where).map((what) => `stage layer ${layer.id ?? index}: ${what}`)),
      ...(value.hotspots ?? []).flatMap((hotspot) => resolve([{ when: hotspot.when }, { command: hotspot.command }], where).map((what) => `hotspot ${hotspot.id}: ${what}`)),
    ]
  }

  const call = (kind: 'conditions' | 'effects' | 'commands', name: string, args: Record<string, unknown>, long: boolean, where: string): string[] => {
    const known =
      kind === 'conditions' ? Boolean(customCondition(game, name))
      : kind === 'commands' ? Boolean(pluginCommand(game, name))
      : long ? Boolean(pluginEffect(game, name))
      : hasCustomEffect(game, name)
    if (!known) {
      // A cooperating partner the game doesn't have: content may name it, and it is simply not there.
      if (absentPartner(game, name)) return []
      const noun = kind === 'conditions' ? 'custom condition' : kind === 'commands' ? 'plugin command' : long ? 'plugin effect' : 'custom effect'
      return [`no ${noun} named "${name}"`]
    }
    const parts = pluginName(name)
    const plugin = parts && pluginById(game, parts.plugin)
    if (!plugin || !parts) return []
    return [...resolve(plugin.references?.calls?.(kind, parts.name, args, game) ?? [], where), ...pluginArgProblems(game, kind, name, args)]
  }

  const one = (ref: Reference, where: string): string[] => {
    if ('within' in ref) {
      return resolve(ref.refs, where).map((what) => (ref.within.startsWith('in each ') && what.startsWith('in each ') ? what : `${ref.within}: ${what}`))
    }
    if ('when' in ref) return resolve(conditionReferences(ref.when), where)
    if ('effects' in ref) return resolve((ref.effects ?? []).flatMap(effectReferences), where)
    if ('command' in ref) return ref.command ? resolve(commandReferences(ref.command), where) : []
    if ('blocks' in ref) return resolve(blockReferences(ref.blocks), where)
    if ('stage' in ref) return stage(ref.stage, ref.choices, where)
    if ('media' in ref) {
      mediaFiles(where, ref.media as SceneMedia)
      return sceneMediaProblems(game, ref.media)
    }
    if ('markup' in ref) return markup(ref.markup, where)
    if ('call' in ref) return call(ref.call, ref.name, ref.with ?? {}, Boolean(ref.long), where)
    if ('entry' in ref) {
      if (!pluginById(game, ref.plugin)) return []
      const have = game.data?.[ref.plugin]?.[ref.list] ?? []
      return have.some((entry) => entry.id === ref.entry) ? [] : [`unknown ${ref.noun} "${ref.entry}"`]
    }
    if ('scene' in ref) {
      if (sceneOf.has(ref.scene)) return []
      if (ref.as === 'gate') return [`gated on unknown scene "${ref.scene}"`]
      if (ref.as === 'open') return [`opens unknown scene "${ref.scene}"`]
      return [`goes to unknown scene "${ref.scene}"`]
    }
    if ('choice' in ref) {
      const cut = ref.choice.lastIndexOf('/')
      const scene = cut > 0 ? sceneOf.get(ref.choice.slice(0, cut)) : undefined
      if (!scene) return [`gated on a choice in unknown scene "${ref.choice}"`]
      // Only a data scene's choices are known before it runs; a hand-built one is taken at its word.
      if (isDataScene(scene) && !scene.choices.some((choice) => choice.id === ref.choice.slice(cut + 1))) return [`gated on unknown choice "${ref.choice}"`]
      return []
    }
    if ('drawnFrom' in ref) return drawnFrom.has(ref.drawnFrom) ? [] : [`draws from "${ref.drawnFrom}", but no scene is drawn from it`]
    if ('stat' in ref) {
      const def = statOf.get(ref.stat)
      if ('starts' in ref) {
        if (def?.of !== ref.starts) return [`no ${ref.starts} stat named "${ref.stat}"`]
        return def.derive !== undefined ? [`stat "${ref.stat}" is derived: it is worked out, never written`] : []
      }
      if (!def) return [`unknown stat "${ref.stat}"`]
      const out: string[] = []
      const owner = statOwnerProblem(def.of, ref.stat, ref.of)
      if (owner) out.push(owner)
      if (ref.writes && def.derive !== undefined) out.push(`stat "${ref.stat}" is derived: it is worked out, never written`)
      return out
    }
    if ('item' in ref) return itemIds.has(ref.item) ? [] : [`unknown item "${ref.item}"`]
    if ('storyline' in ref) return storylineIds.has(ref.storyline) ? [] : [`unknown storyline "${ref.storyline}"`]
    if ('collection' in ref) return collectionIds.has(ref.collection) ? [] : [`unknown collection "${ref.collection}"`]
    if ('setting' in ref) return settingConditionProblems(game, ref.setting, ref.is)
    if ('kind' in ref) return kindIds.has(ref.kind) ? [] : [`unknown kind "${ref.kind}"`]
    if ('activity' in ref) return activityIds.has(ref.activity) ? [] : [`unknown activity "${ref.activity}"`]
    if ('input' in ref) return inputIds.has(ref.input) ? [] : [`unknown input "${ref.input}"`]
    if ('prose' in ref) {
      proseNamed.add(ref.prose)
      return game.prose?.line(ref.prose) === undefined ? [`no prose for "${ref.prose}"`] : []
    }
    if ('variants' in ref) {
      const members = game.prose?.variants(ref.variants) ?? []
      for (const key of members) proseNamed.add(key)
      return members.length ? [] : [`variants "${ref.variants}" has no lines`]
    }
    if ('value' in ref) return customValue(game, ref.value) ? [] : [`no custom value named "${ref.value}"`]
    if ('panel' in ref) return customPanel(game, ref.panel) ? [] : [`no custom panel named "${ref.panel}"`]
    if ('channel' in ref) return placementProblems(game, { [ref.channel]: ref.track })
    if ('sound' in ref) return cueProblems(game, ref.sound)
    if ('pool' in ref) return poolProblems(game, ref.pool, ref.tags ?? [])
    if ('picture' in ref) {
      file(where, 'picture', ref.asWritten ? pagePath(ref.picture) : artSrc(ref.picture))
      return []
    }
    if ('video' in ref) {
      file(where, 'video', ref.asWritten ? pagePath(ref.video) : artSrc(ref.video, 'video'))
      return []
    }
    if ('audio' in ref) {
      file(where, 'audio', audioSrc(ref.audio))
      return []
    }
    return []
  }

  /** Report everything these references name that the game doesn't have, at `where`. */
  const check = (source: Source, where: string, refs: readonly Reference[]) => {
    for (const what of resolve(refs, where)) say(source, where, what)
  }

  // The game as a whole.

  const pluginIds = new Set<string>()
  for (const plugin of plugins) {
    if (!/^[a-z0-9-]+$/i.test(plugin.id)) say(undefined, `plugin ${plugin.id}`, 'a plugin id is letters, digits and "-" only')
    if (pluginIds.has(plugin.id)) say(undefined, `plugin ${plugin.id}`, 'two plugins share this id')
    pluginIds.add(plugin.id)
  }
  for (const plugin of Object.keys(game.data ?? {})) {
    if (!pluginIds.has(plugin)) say(undefined, `data ${plugin}`, `the game has no plugin named "${plugin}"`)
  }
  if (game.introScene !== undefined && !sceneOf.has(game.introScene)) say(undefined, 'introScene', `unknown scene "${game.introScene}"`)
  if (game.version !== undefined && !(Number.isInteger(game.version) && game.version >= 1)) {
    say(undefined, 'version', 'version must be a whole number, 1 or more')
  }
  for (const key of Object.keys(game.migrations ?? {})) {
    const n = Number(key)
    if (!Number.isInteger(n) || n < 1 || n >= (game.version ?? 1)) {
      say(undefined, `migration ${key}`, `a step is keyed by the version it upgrades from, 1 to ${(game.version ?? 1) - 1}`)
    }
  }

  // Two of anything with one id. A loaded game can't have these: its packs are merged by id.
  const twice = (list: Exclude<Source, undefined | { list: 'audio' } | { plugin: string }>['list'], plural: string, ids: readonly string[]) => {
    const seen = new Set<string>()
    const reported = new Set<string>()
    for (const id of ids) {
      if (seen.has(id) && !reported.has(id)) {
        reported.add(id)
        say({ list, id }, `${list} ${id}`, `two ${plural} share this id`)
      }
      seen.add(id)
    }
  }
  twice('scene', 'scenes', game.scenes.map((entry) => entry.id))
  twice('item', 'items', game.items.map((entry) => entry.id))
  twice('storyline', 'storylines', game.storylines.map((entry) => entry.id))
  twice('activity', 'activities', game.activities.map((entry) => entry.id))
  twice('stat', 'stats', (game.stats ?? []).map((entry) => entry.id))
  twice('kind', 'kinds', (game.kinds ?? []).map((entry) => entry.id))
  twice('entity', 'entities', (game.entities ?? []).map((entry) => `${entry.of}:${entry.id}`))
  twice('collection', 'collections', (game.collections ?? []).map((entry) => entry.id))
  twice('trigger', 'triggers', (game.triggers ?? []).map((entry) => entry.id))
  twice('input', 'inputs', (game.inputs ?? []).map((entry) => entry.id))
  twice('setting', 'settings', (game.settings ?? []).map((entry) => entry.id))

  // Scenes: a data scene's content, and every scene's storylet fields.
  for (const scene of game.scenes) {
    const source = { list: 'scene', id: scene.id } as const
    const where = `scene ${scene.id}`
    if (isDataScene(scene)) {
      check(source, where, dataSceneReferences(scene))
      const ids = new Set<string>()
      for (const choice of scene.choices) {
        if (ids.has(choice.id)) say(source, where, `two choices share the id "${choice.id}"`)
        ids.add(choice.id)
      }
    }
    const drawn = Boolean(scene.drawnFrom?.length)
    if (scene.weight !== undefined && !(scene.weight > 0)) say(source, where, 'weight must be above 0')
    if (scene.weight !== undefined && !drawn) say(source, where, 'has a weight but no drawnFrom, so it is never drawn')
    if (scene.when !== undefined && !drawn) say(source, where, 'has a when but no drawnFrom; when only gates draws')
    check(source, where, [{ when: scene.when }])
  }

  for (const item of game.items) check({ list: 'item', id: item.id }, `item ${item.id}`, [{ effects: item.use?.effects }])

  for (const activity of game.activities) {
    const source = { list: 'activity', id: activity.id } as const
    const where = `activity ${activity.id}`
    check(source, where, [...(activity.requires ?? []).map((entry) => ({ when: entry.when })), { effects: activity.effects }])
    for (const id of Object.keys(activity.cost?.stats ?? {})) {
      const def = statOf.get(id)
      if (!def) say(source, where, `spends unknown stat "${id}"`)
      else if (def.derive !== undefined) say(source, where, `spends stat "${id}", which is derived and never written`)
    }
  }

  for (const action of game.actions ?? []) {
    check(undefined, `action ${action.id}`, [{ when: action.when }, ...(action.blocked ?? []).map((entry) => ({ when: entry.when })), { command: action.command }])
  }

  for (const trigger of game.triggers ?? []) {
    check({ list: 'trigger', id: trigger.id }, `trigger ${trigger.id}`, [{ when: trigger.when }, { effects: trigger.effects }])
  }

  for (const input of game.inputs ?? []) {
    const source = { list: 'input', id: input.id } as const
    const where = `input ${input.id}`
    check(source, where, [{ when: input.when }])
    if (input.kind === 'choice' && !input.options?.length) say(source, where, 'a choice with no options')
    if (input.min !== undefined && input.max !== undefined && input.min > input.max) say(source, where, 'min is above max')
  }

  for (const setting of game.settings ?? []) {
    for (const what of settingProblems(setting)) say({ list: 'setting', id: setting.id }, `setting ${setting.id}`, what)
  }

  for (const stat of game.stats ?? []) {
    const source = { list: 'stat', id: stat.id } as const
    const where = `stat ${stat.id}`
    if (stat.of !== undefined && !kindIds.has(stat.of)) say(source, where, `belongs to unknown kind "${stat.of}"`)
    check(source, where, [...(typeof stat.max === 'object' ? [{ value: stat.max.value }] : []), { when: stat.visible }])
  }
  // Derived stats and levels: formulas, cycles, thresholds.
  for (const { where, what } of statProblems(game)) say({ list: 'stat', id: where.slice('stat '.length) }, where, what)

  for (const entity of game.entities ?? []) {
    const source = { list: 'entity', id: `${entity.of}:${entity.id}` } as const
    const where = `entity ${entity.of}:${entity.id}`
    if (!kindIds.has(entity.of)) say(source, where, `unknown kind "${entity.of}"`)
    // Object keys that look like numbers sort first, which would scramble the order entities came in.
    if (/^\d+$/.test(entity.id)) say(source, where, 'an entity id must not be a whole number')
    check(source, where, Object.keys(entity.stats ?? {}).map((stat) => ({ stat, starts: entity.of })))
  }

  check(undefined, 'finished', [{ when: game.finished }])
  for (const id of game.carryOver?.stats ?? []) {
    const def = statOf.get(id)
    if (!def) say(undefined, 'carryOver', `unknown stat "${id}"`)
    else if (def.of !== undefined) say(undefined, 'carryOver', `stat "${id}" belongs to ${def.of}, not the player`)
  }
  if (Array.isArray(game.carryOver?.items)) {
    for (const id of game.carryOver.items) if (!itemIds.has(id)) say(undefined, 'carryOver', `unknown item "${id}"`)
  }

  ;(game.rules?.locks ?? []).forEach((lock, index) => check(undefined, `lock ${index}`, [{ when: lock.when }]))

  // Audio: the manifest and its files.
  for (const { where, what } of manifestProblems(game)) {
    const cut = where.indexOf(' ')
    const [list, id] = [where.slice(0, cut), where.slice(cut + 1)]
    say(list === 'track' ? { list: 'track', id } : list === 'channel' ? { list: 'channel', id } : { list: 'audio' }, where, what)
  }
  for (const [id, track] of Object.entries(game.audio?.tracks ?? {})) {
    if (!('playlist' in track)) file(`track ${id}`, 'audio', audioSrc(track.src))
  }

  // Media: the pools and their files. What asks for a pool is checked where it is.
  for (const { where, what } of poolManifestProblems(game)) say({ list: 'pool', id: where.slice('pool '.length) }, where, what)
  for (const [pool, entries] of Object.entries(game.media?.pools ?? {})) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (typeof entry?.src !== 'string' || !entry.src) continue
      const video = mediaKind(entry.src) === 'video'
      file(`pool ${pool}`, video ? 'video' : 'picture', artSrc(entry.src, video ? 'video' : 'image'))
    }
  }

  // Plugins: what their content names, then their own rules.
  for (const plugin of plugins) checkPlugin(plugin)

  function checkPlugin(plugin: Plugin) {
    for (const entry of plugin.references?.content?.(game) ?? []) {
      check({ plugin: plugin.id, list: entry.list, id: entry.id }, `${entry.list} ${entry.id}`, entry.refs)
    }
    const tools = { problems: (refs: readonly Reference[]) => resolve(refs, plugin.id) }
    for (const problem of plugin.check?.(game, tools) ?? []) {
      say({ plugin: plugin.id, list: problem.list, id: problem.id }, `${problem.list} ${problem.id}`, problem.what)
    }
  }

  // Prose: the sounds, pools and files its markup names. Every line the store lists, and every one content named.
  const proseKeys = new Set([...(game.prose?.keys?.() ?? []), ...proseNamed])
  for (const key of proseKeys) {
    const text = game.prose?.line(key)
    if (text === undefined) continue
    for (const what of markup(text, `prose ${key}`)) say({ list: 'prose', id: key }, `prose ${key}`, what)
  }

  for (const probe of probes) checkProbe(probe)

  /** Render every scene against one state and check what falls out. A data scene's content is checked already. */
  function checkProbe({ name, state }: Probe) {
    const ctx = sceneContext(state, game)
    for (const listed of game.scenes) {
      const scene = sceneById(game, listed.id)
      if (!scene) continue
      const source = { list: 'scene', id: listed.id } as const
      const where = `scene ${listed.id} (${name})`
      let shown
      try {
        shown = scene.render(state, ctx)
      } catch (error) {
        say(source, where, `render threw: ${(error as Error).message}`)
        continue
      }
      if (isDataScene(listed)) continue
      const ids = new Set<string>()
      for (const choice of shown.choices) {
        if (ids.has(choice.id)) say(source, where, `two choices share the id "${choice.id}"`)
        ids.add(choice.id)
      }
      check(source, where, [
        { markup: shown.body ?? '' },
        ...(shown.media ?? []).map((media) => ({ media })),
        ...Object.entries(shown.audio ?? {}).map(([channel, track]) => ({ channel, track })),
        { stage: shown.stage, choices: shown.choices.map((choice) => choice.id) },
        ...shown.choices.map((choice) => ({ within: `choice ${choice.id}`, refs: [{ effects: choice.effects }] })),
      ])
    }
  }

  return { problems, files }
}
