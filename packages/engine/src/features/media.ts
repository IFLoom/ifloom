/**
 * Media: pools of pictures and videos, the picks made from them, and the
 * layered picture with hotspots on it (ADR 0004).
 *
 * A pool is a named list of files, each with tags. Content asks for a pool and
 * some tags, and gets one file that fits. The pick is drawn from the save's
 * seed and recorded in `state.media.picks`, so the same request in the same
 * place shows the same file on every visit and after a reload.
 */
import type { Game, SceneMedia } from '../game.ts'
import type { Command, Condition, GameState } from '../types.ts'
import type { CommandRef } from '../calls.ts'
import { artSrc, MEDIA_MARKUP, mediaType, mediaParts, type VideoFlags, type VideoView } from '../sceneBody.ts'
import { defineFeature, type FeatureContext, type ResolveTools } from './feature.ts'

/** A file in a pool in `media.pools`, with its path, its tags and its weight against the other files that fit. The weight is 1 if left out. */
export type PoolFile = {
  /** The file's path, in the game's `art/` folder or a URL. */
  src: string
  /** The file's tags, which a request's tags match. */
  tags?: string[]
  /** The file's weight in a draw, against the other files that fit. 1 if left out. */
  weight?: number
}

/** The media the game declares in `media`, pools of pictures and videos by id. */
export type GameMedia = {
  /** The game's pools, named lists of files content draws from, as in `[[img:@door|night]]` or `{ pool: 'door', tags: ['night'] }`. */
  pools?: Record<string, PoolFile[]>
}

/** The media a save keeps, in `state.media`. The pools themselves are read from content. */
export type MediaState = {
  /** The file each pool request was given, by the key `pickKey` returns. */
  picks: Record<string, string>
}

/** A layer of a picture, a file or a pool's pick, shown while `when` holds. Give `src` or `pool`, not both. */
export type PictureLayer = {
  /** The layer's id, which a hotspot's `layer` names. */
  id?: string
  /** The layer's file, in the game's `art/` folder or a URL. */
  src?: string
  /** The pool in `media.pools` the layer's file is drawn from. The save keeps the pick. */
  pool?: string
  /** The tags the pool's pick should have, most important first. */
  tags?: string[]
  /** The layer's condition. The layer shows only while it holds. */
  when?: Condition
  /** The layer's video mark, true to show it as a video. A `.mp4` or `.webm` file is a video anyway. */
  video?: boolean
} & VideoFlags

/**
 * A hotspot on a picture, a clickable area the UI renders as a button. It either sends `command` or chooses the open
 * scene's choice `choice`.
 */
export type HotspotDef = {
  /** The hotspot's id. */
  id: string
  /** The hotspot's area, in percent of the picture, as `[x, y, width, height]` from the top left. */
  rect: [number, number, number, number]
  /** The hotspot's label, which a screen reader reads and the tooltip shows. */
  label: string
  /** The command the hotspot sends, written as an action's `command`. */
  command?: CommandRef
  /** The id of the open scene's choice the hotspot chooses. */
  choice?: string
  /** The hotspot's condition. The hotspot shows only while it holds. */
  when?: Condition
  /** The id of the layer the hotspot goes with. The hotspot shows only while that layer does. */
  layer?: string
}

/** A picture a scene or a location declares in its `picture`, layers with hotspots on them. */
export type PictureDef = {
  /** The picture's layers, bottom first. */
  layers: PictureLayer[]
  /** The picture's hotspots, each a button the UI renders over the picture. */
  hotspots?: HotspotDef[]
  /** The picture's width over height, in CSS form, such as `'16/9'`. The UI's own if left out. */
  aspect?: string
}

/** A picture layer as the player sees it, in a {@link PictureView}'s `layers`. */
export type PictureLayerView = {
  /** The layer's id, or null. */
  id: string | null
  /** The layer's file, through `artSrc`, with a pool's pick resolved. */
  src: string
  /** The layer's playback settings when it's a video. Left out for a still picture. */
  video?: VideoView
}

/** A hotspot as the player sees it, in a {@link PictureView}'s `hotspots`. The UI renders it as a button over the picture. */
export type HotspotView = {
  /** The hotspot's id. */
  id: string
  /** The hotspot's area, in percent of the picture, as `[x, y, width, height]` from the top left. */
  rect: [number, number, number, number]
  /** The hotspot's label. */
  label: string
  /** The command pressing the hotspot sends, its own `command` or the command that chooses its `choice`. */
  command: Command
  /** The reason the hotspot can't be pressed now, as on a button's `disabled`. Left out when it can. */
  disabled?: string
  /** The warning a plugin gives against pressing the hotspot, as on a button's `warning`. */
  warning?: string
  /** The id of the layer the hotspot goes with. Left out for a hotspot on the whole picture. */
  layer?: string
}

/**
 * A picture as the player sees it, in `view.scene.picture` or a location's `picture`. It lists the layers shown now,
 * bottom first, and the hotspots on them.
 */
export type PictureView = {
  /** The picture's width over height, such as `'16/9'`. Null when the picture doesn't set it. */
  aspect: string | null
  /** The layers whose `when` holds, bottom first. */
  layers: PictureLayerView[]
  /** The hotspots whose `when` holds and whose layer shows. */
  hotspots: HotspotView[]
}

/** The media feature's state, content key and references, as types. */
export type MediaShape = {
  state: {
    /** The file each pool request was given, so a revisit and a reload show the same one. */
    media: MediaState
  }
  game: {
    /** The game's pools of pictures and videos. None if left out. */
    media?: GameMedia
  }
  pack: {
    /** The pack's pools of pictures and videos. A later pack's pool replaces an earlier one with the same id, files and all. */
    media?: GameMedia
  }
  lists: 'pool'
  references: {
    /** A reference to a pool, with the tags asked of it. */
    pool: { pool: string; tags?: readonly string[] }
    /** A reference to a `{ media }` block. */
    media: { media: SceneMedia }
    /** A reference to a layered picture. `choices` lists its scene's choice ids, or is null for a picture with no scene. */
    layered: { layered: PictureDef | undefined; choices: readonly string[] | null }
  }
}

/** Returns a save's media before anything has been picked. */
export function emptyMedia(): MediaState {
  return { picks: {} }
}

/** A request for a file from a pool, with the tags asked for and the place that asks. */
export type PoolRequest = {
  /** The pool's id. */
  pool: string
  /** The tags the file should have, most important first. */
  tags?: readonly string[]
  /** The id of the scene, location, message or post that asks. */
  owner: string
  /** The place in the owner that asks, such as a body block's index or `'picture:0'` for a picture layer. */
  slot: string
}

/**
 * Returns the key a pick is kept under, from the pool, tags, owner and slot. The same request from the same place
 * gets the same file every time.
 *
 * The visit isn't part of the key, so a revisit shows the file it showed before.
 */
export function pickKey(request: PoolRequest): string {
  return [request.pool, (request.tags ?? []).join(','), request.owner, request.slot].join('|')
}

function poolOf(game: Game, pool: string): PoolFile[] | undefined {
  const pools = game.media?.pools
  return pools && Object.hasOwn(pools, pool) ? pools[pool] : undefined
}

/**
 * Returns the files that best fit a request, those with every tag asked for. Empty when the pool has no files.
 *
 * @remarks
 * When no file has every tag, the last tag is dropped and the rest tried again, down to no tags at all, which matches
 * any file in the pool.
 */
export function poolCandidates(game: Game, pool: string, tags: readonly string[] = []): PoolFile[] {
  const files = poolOf(game, pool) ?? []
  for (let keep = tags.length; keep >= 0; keep -= 1) {
    const wanted = tags.slice(0, keep)
    const found = files.filter((file) => wanted.every((tag) => file.tags?.includes(tag)))
    if (found.length) return found
  }
  return []
}

/**
 * Returns the file a pool request gets, or null when the pool has none. A pick the save holds wins while the pool
 * still has that file, else the file is drawn from the seed and the key.
 *
 * Pass `picks` to have a new pick written into it under its key. That's how `screen` collects the picks a state
 * implies, which the reducer then records.
 */
export function poolPick(state: GameState, game: Game, request: PoolRequest, cx: FeatureContext, picks?: Record<string, string>): string | null {
  const key = pickKey(request)
  const kept = state.media?.picks?.[key]
  const files = poolOf(game, request.pool) ?? []
  let src: string | null
  if (kept !== undefined && files.some((file) => file.src === kept)) src = kept
  else {
    const candidates = poolCandidates(game, request.pool, request.tags)
    // Weights all 1 draw exactly what an unweighted pick would.
    src = cx.weighted(candidates, (file) => file.weight, 'media', key, state.seed)?.src ?? null
  }
  if (picks && src !== null && src !== kept) picks[key] = src
  return src
}

/** Returns true when the game has any pools. Without pools, nothing is ever picked. */
export function hasPools(game: Game): boolean {
  return Object.keys(game.media?.pools ?? {}).length > 0
}

const POOL_MARKUP = /\[\[(img|wide|video|widevideo):\s*@([^\]|]+)((?:\|[^\]|]*)*)\]\]/g

/**
 * Returns prose with every `@pool` in its picture and video markup replaced by the file it gets. Markup whose pool has
 * nothing to give is taken out.
 *
 * The nth request in the text has the slot `<slot>.<n>`.
 */
export function resolvePoolMarkup(
  text: string,
  state: GameState,
  game: Game,
  owner: string,
  slot: string,
  cx: FeatureContext,
  picks?: Record<string, string>,
): string {
  if (!text.includes('@')) return text
  let n = 0
  return text.replace(POOL_MARKUP, (_whole, tag: string, pool: string, rest: string) => {
    const parts = rest.split('|').slice(1)
    const tags = (parts[0] ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    const src = poolPick(state, game, { pool: pool.trim(), tags, owner, slot: `${slot}.${n++}` }, cx, picks)
    if (src === null) return ''
    return `[[${tag}:${[src, ...parts.slice(1)].join('|')}]]`
  })
}

/** Returns a `{ media }` block with its pool resolved to a file. Null when it has no file to show. */
export function resolveMedia(
  media: SceneMedia,
  state: GameState,
  game: Game,
  owner: string,
  slot: string,
  cx: FeatureContext,
  picks?: Record<string, string>,
): SceneMedia | null {
  if (media.pool === undefined) return media.src ? media : null
  const src = poolPick(state, game, { pool: media.pool, tags: media.tags, owner, slot }, cx, picks)
  if (src === null) return null
  const { pool: _pool, tags: _tags, ...rest } = media
  return { ...rest, src }
}

/** Returns a `{ media }` block written as picture or video markup, so the block and the markup become the same beat. */
export function mediaMarkup(media: SceneMedia): string {
  const video = Boolean(media.video) || mediaType(media.src ?? '') === 'video'
  const wide = media.size === 'wide'
  const tag = video ? (wide ? 'widevideo' : 'video') : wide ? 'wide' : 'img'
  const parts = [media.src ?? '']
  if (video) {
    if (media.controls) parts.push('controls')
    if (media.once) parts.push('once')
    if (media.sound) parts.push('sound')
    if (media.poster) parts.push(`poster=${media.poster}`)
  }
  // Alt text can't hold the markup's own delimiters.
  if (media.alt) parts.push(media.alt.replace(/[|\]]/g, ' ').trim())
  return `[[${tag}:${parts.join('|')}]]`
}

// Checks, used by the content checker (check.ts).

/** Returns the problems with asking this pool for these tags, an unknown pool or a tag no file has. Empty when there are none. */
export function poolProblems(game: Game, pool: string, tags: readonly string[] = []): string[] {
  const files = poolOf(game, pool)
  if (!files) return [`unknown pool "${pool}"`]
  // An empty pool is reported once, with the manifest.
  if (!files.length) return []
  const have = new Set(files.flatMap((file) => file.tags ?? []))
  return tags.filter((tag) => !have.has(tag)).map((tag) => `no file in pool "${pool}" is tagged "${tag}"`)
}

/** Could this pool give a video? Then video flags on a picture asking for it are fine. */
function poolHasVideo(game: Game, pool: string): boolean {
  return (poolOf(game, pool) ?? []).some((file) => mediaType(file.src) === 'video')
}

function videoFlagsSet(flags: VideoFlags): string[] {
  return [...(['controls', 'once', 'sound'] as const).filter((name) => flags[name]), ...(flags.poster ? ['poster'] : [])]
}

/** Returns the problems with the picture and video markup in this prose, in its pools, tags and flags. Empty when there are none. */
export function mediaMarkupProblems(game: Game, text: string): string[] {
  const out: string[] = []
  for (const match of text.matchAll(new RegExp(MEDIA_MARKUP.source, 'g'))) {
    const tag = match[1]
    const read = mediaParts(match[2], match[3])
    if (read.pool !== undefined) out.push(...poolProblems(game, read.pool, read.tags))
    for (const part of read.unknown) out.push(`unknown flag "${part}" in ${match[0]}`)
    if (read.extraAlts.length) {
      out.push(`${[read.alt, ...read.extraAlts].map((alt) => `"${alt}"`).join(' and ')} can't all be alt text in ${match[0]}; is one a misspelt flag?`)
    }
    const video = tag === 'video' || tag === 'widevideo' || (read.pool !== undefined ? poolHasVideo(game, read.pool) : mediaType(read.path) === 'video')
    if (!video) for (const flag of read.videoFlags) out.push(`video flag "${flag}" on a picture in ${match[0]}`)
    if ([read.alt, ...read.extraAlts].includes('rot')) out.push(`"rot" is read as alt text in ${match[0]}; turning a picture is a UI's block hint now`)
  }
  return out
}

/** What is wrong with a `{ media }` block or a picture layer: where its file comes from, and its flags. */
function sourceProblems(game: Game, media: { src?: string; pool?: string; tags?: string[]; video?: boolean } & VideoFlags): string[] {
  const out: string[] = []
  if (media.src === undefined && media.pool === undefined) out.push('needs a src or a pool')
  if (media.src !== undefined && media.pool !== undefined) out.push('has both a src and a pool')
  if (media.pool !== undefined) out.push(...poolProblems(game, media.pool, media.tags ?? []))
  const video =
    Boolean(media.video) || (media.src !== undefined && mediaType(media.src) === 'video') || (media.pool !== undefined && poolHasVideo(game, media.pool))
  if (!video) for (const flag of videoFlagsSet(media)) out.push(`video flag "${flag}" on a picture`)
  return out
}

/** Returns the problems with a data scene's `{ media }` block. Empty when there are none. */
export function sceneMediaProblems(game: Game, media: SceneMedia): string[] {
  return sourceProblems(game, media).map((what) => `media: ${what}`)
}

/**
 * Returns the problems with a picture, apart from the conditions and commands it names, which the loader checks as it
 * checks any. `choices` lists the scene's choice ids, or is null for a picture with no scene, such as a location's.
 */
export function pictureProblems(game: Game, picture: PictureDef, choices: readonly string[] | null): string[] {
  const out: string[] = []
  const layerIds = new Set<string>()
  if (!Array.isArray(picture.layers)) return ['picture: layers must be a list']
  picture.layers.forEach((layer, index) => {
    const where = `picture layer ${layer.id ?? index}`
    if (layer.id !== undefined) {
      if (layerIds.has(layer.id)) out.push(`${where}: two layers share this id`)
      layerIds.add(layer.id)
    }
    for (const what of sourceProblems(game, layer)) out.push(`${where}: ${what}`)
  })
  const hotspotIds = new Set<string>()
  for (const hotspot of picture.hotspots ?? []) {
    const where = `hotspot ${hotspot.id}`
    if (hotspotIds.has(hotspot.id)) out.push(`${where}: two hotspots share this id`)
    hotspotIds.add(hotspot.id)
    const has = Number(hotspot.command !== undefined) + Number(hotspot.choice !== undefined)
    if (has !== 1) out.push(`${where}: needs exactly one of command and choice`)
    if (hotspot.choice !== undefined) {
      if (choices === null) out.push(`${where}: names choice "${hotspot.choice}", but only a scene has choices`)
      else if (!choices.includes(hotspot.choice)) out.push(`${where}: no choice "${hotspot.choice}" in this scene`)
    }
    if (hotspot.layer !== undefined && !layerIds.has(hotspot.layer)) out.push(`${where}: unknown layer "${hotspot.layer}"`)
    out.push(...rectProblems(hotspot.rect).map((what) => `${where}: ${what}`))
  }
  return out
}

function rectProblems(rect: unknown): string[] {
  if (!Array.isArray(rect) || rect.length !== 4 || !rect.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return ['rect must be four numbers: [x, y, width, height]']
  }
  const [x, y, w, h] = rect as number[]
  if ([x, y, w, h].some((n) => n < 0 || n > 100)) return ['rect is outside 0 to 100']
  if (w <= 0 || h <= 0) return ['rect has no width or height']
  if (x + w > 100 || y + h > 100) return ['rect runs off the picture: x + width and y + height must be 100 or less']
  return []
}

/** Returns the problems with the game's `media` pools themselves, each with the pool it's in, such as `pool door`. */
export function poolManifestProblems(game: Game): { where: string; what: string }[] {
  const out: { where: string; what: string }[] = []
  for (const [id, files] of Object.entries(game.media?.pools ?? {})) {
    const where = `pool ${id}`
    if (!Array.isArray(files) || !files.length) {
      out.push({ where, what: 'a pool with no files' })
      continue
    }
    files.forEach((file, index) => {
      if (typeof file?.src !== 'string' || !file.src) out.push({ where, what: `file ${index} has no src` })
      if (file?.weight !== undefined && !(file.weight > 0)) out.push({ where, what: `file ${index} has a weight of ${file.weight}; a weight must be above 0` })
    })
  }
  return out
}

/** Record the files a picture or video names: its own and its poster. */
function mediaFiles(where: string, media: { src?: string; video?: boolean; poster?: string }, tools: ResolveTools): void {
  if (media.src !== undefined) {
    const video = Boolean(media.video) || mediaType(media.src) === 'video'
    tools.file(where, video ? 'video' : 'picture', artSrc(media.src, video ? 'video' : 'image'))
  }
  if (media.poster) tools.file(where, 'picture', artSrc(media.poster))
}

/** The media feature, which keeps the pool picks and checks pictures, videos and pools. */
export const media = defineFeature<MediaShape>({
  name: 'media',
  state: {
    media: { start: () => emptyMedia(), load: emptyMedia },
  },
  // A later pack's pool replaces an earlier one's whole, files and all.
  pack: {
    merge: () => {
      const pools = new Map<string, { value: PoolFile[]; from: string }>()
      const add = (from: string, media: GameMedia | undefined) => {
        for (const [id, files] of Object.entries(media?.pools ?? {})) pools.set(id, { value: files, from })
      }
      return {
        base: (game) => add('base', game.media),
        add: (pack, from) => add(from, pack.media),
        finish: (game) => {
          if (pools.size) game.media = { ...game.media, pools: Object.fromEntries([...pools].map(([id, entry]) => [id, entry.value])) }
        },
        from: (_list, id) => (id === undefined ? undefined : pools.get(id)?.from),
      }
    },
  },
  content: { media: { declares: (media) => Object.keys(media.pools ?? {}).map((key) => `pool "${key}"`), words: null } },
  lists: ['pool'],
  // The pools and their files. What asks for a pool is checked where it is.
  check: (game, tools) => {
    for (const { where, what } of poolManifestProblems(game)) tools.problem({ list: 'pool', id: where.slice('pool '.length) }, where, what)
    for (const [pool, entries] of Object.entries(game.media?.pools ?? {})) {
      for (const entry of Array.isArray(entries) ? entries : []) {
        if (typeof entry?.src !== 'string' || !entry.src) continue
        const video = mediaType(entry.src) === 'video'
        tools.file(`pool ${pool}`, video ? 'video' : 'picture', artSrc(entry.src, video ? 'video' : 'image'))
      }
    }
  },
  // A `{ media }` block and a picture: their files, and what they ask of the pools.
  resolve: (game, tools) => ({
    media: (ref, where) => {
      mediaFiles(where, ref.media, tools)
      return sceneMediaProblems(game, ref.media)
    },
    layered: (ref, where) => {
      const value = ref.layered
      if (!value) return []
      for (const layer of Array.isArray(value.layers) ? value.layers : []) mediaFiles(where, layer, tools)
      return [
        ...pictureProblems(game, value, ref.choices),
        ...(Array.isArray(value.layers) ? value.layers : []).flatMap((layer, index) =>
          tools.resolve([{ when: layer.when }], where).map((what) => `picture layer ${layer.id ?? index}: ${what}`),
        ),
        ...(value.hotspots ?? []).flatMap((hotspot) =>
          tools.resolve([{ when: hotspot.when }, { command: hotspot.command }], where).map((what) => `hotspot ${hotspot.id}: ${what}`),
        ),
      ]
    },
    pool: (ref) => poolProblems(game, ref.pool, ref.tags ?? []),
  }),
  // The files media markup names, and the pools it asks.
  markup: (game, text, where, tools) => {
    for (const match of text.matchAll(new RegExp(MEDIA_MARKUP.source, 'g'))) {
      const read = mediaParts(match[2], match[3])
      if (read.flags.poster) tools.file(where, 'picture', artSrc(read.flags.poster))
      if (read.pool !== undefined) continue
      const video = match[1] === 'video' || match[1] === 'widevideo' || mediaType(read.path) === 'video'
      tools.file(where, video ? 'video' : 'picture', artSrc(read.path, video ? 'video' : 'image'))
    }
    return mediaMarkupProblems(game, text)
  },
  // The picks the new state's screen made, so a revisit and a reload show the same files. Only a game with pools picks.
  fromScreen: {
    wants: hasPools,
    record: (state, shown) => {
      if (!Object.keys(shown.picks).length) return state
      const media = state.media ?? emptyMedia()
      return { ...state, media: { ...media, picks: { ...media.picks, ...shown.picks } } }
    },
  },
})
