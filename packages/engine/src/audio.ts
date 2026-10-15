/**
 * Audio, as data. The engine never plays a sound: it says what should be
 * playing on each channel and which one-shot sounds are due, and a player
 * (`@ifloom/audio`) does the playing. Everything here is worked out from the
 * state, so the same save always asks for the same sounds.
 */
import { sceneContext } from './context.ts'
import type { Game } from './game.ts'
import { sceneById } from './game.ts'
import { pluginAudio } from './plugin.ts'
import { roll, weighted } from './random.ts'
import type { SceneBeat } from './sceneBody.ts'
import { settingAffects, settingById } from './settings.ts'
import type { GameState } from './types.ts'

/** A sound file the game ships, by id in `game.audio.tracks`. */
export type TrackDef = {
  /** The file, relative to the game's public folder: `'audio/cafe.ogg'`. See `audioSrc`. */
  src: string
  /**
   * The channel it plays on. A `sound` effect and `[[sound:id]]` play it
   * there; a background channel can only be given a track whose channel is a
   * background one. `'sfx'` if left out.
   */
  channel?: string
  /** Whether it repeats while it is on a background channel. True if left out. */
  loop?: boolean
  /** Its own volume, from 0 to 1. 1 if left out. */
  volume?: number
}

/** Several background tracks played one after another, by id in `game.audio.tracks`. */
export type PlaylistDef = {
  /**
   * Track ids, each on a background channel. In a shuffled playlist a track
   * can carry a weight, `{ track: 'rain', weight: 3 }`, and is then more
   * likely to come early in the order. A plain id has weight 1.
   */
  playlist: (string | { track: string; weight?: number })[]
  /**
   * `'inOrder'` plays the list once, `'loop'` plays it over and over, and
   * `'shuffle'` plays it over and over in an order drawn from the save's seed.
   * With weights, the shuffle draws the first track by weight, then the next
   * from those left, and so on, so a heavier track tends to play sooner.
   * `'loop'` if left out.
   */
  order?: 'inOrder' | 'loop' | 'shuffle'
}

/** How a channel behaves. */
export type ChannelDef = {
  /** Background channels play one thing until it changes; cue channels play each sound once, overlapping. */
  mode: 'background' | 'cue'
  /** Milliseconds to fade from one track to the next. Background only; 1000 for music, 600 for ambience. */
  crossfade?: number
  /** A ui setting (a range) that sets this channel's volume. */
  volume?: string
  /** Off unless declared: quieten this channel to `to` (0 to 1) while any of `under` is playing. */
  duck?: { under: string[]; to: number }
}

/** The game's sounds, the channels they play on and the settings that set their volume. */
export type GameAudio = {
  tracks: Record<string, TrackDef | PlaylistDef>
  /** Merged over the defaults: `music` and `ambience` (background), `sfx` and `voice` (cue). */
  channels?: Record<string, ChannelDef>
  /** A ui setting (a toggle) that mutes everything while it is on. */
  mute?: string
  /** What each background channel plays when nothing else says, by channel. */
  default?: Record<string, string>
}

/** What a save keeps about audio, at `state.audio`. */
export type AudioState = {
  /** What effects have put on background channels. Null is silence; a channel not here is the effects' to leave alone. */
  channels: Record<string, string | null>
  /** The last few `sound` effects, oldest first, each with its place in the running count. */
  cues: { seq: number; track: string }[]
  /** How many `sound` effects there have been. */
  seq: number
  /** How many times a scene has been entered, all scenes together. Each showing's sounds get keys of their own. */
  shown: number
  /** What each background channel is playing and the turn it started, for a shuffled playlist's draw. */
  started: Record<string, { track: string; turn: number }>
}

/** One channel as a player needs it. */
export type AudioChannelView = {
  mode: 'background' | 'cue'
  /** The track or playlist playing; null for silence, and always null on a cue channel. */
  track: string | null
  /** The file to play, through `audioSrc`; a playlist's first. Null for silence. */
  src: string | null
  /** Whether it repeats. A playlist repeats as a whole unless its order is `'inOrder'`. */
  loop: boolean
  /** The track's own volume, 0 to 1; a playlist's first track's. Multiply by the setting's value. */
  volume: number
  /** The ui setting that sets this channel's volume, or null for none. */
  volumeSetting: string | null
  /** Milliseconds to fade between tracks. 0 on a cue channel. */
  crossfade: number
  duck: { under: string[]; to: number } | null
  /** A playlist's files, volumes and order, already shuffled when it shuffles. */
  playlist?: { tracks: string[]; srcs: string[]; volumes: number[]; order: 'inOrder' | 'loop' | 'shuffle' }
}

/** A one-shot sound that is due. Play each key once. */
export type AudioCue = {
  /** The same for the same sound in the same showing, across view calls and reloads. */
  key: string
  channel: string
  track: string
  src: string
  volume: number
}

/** What `view.audio` holds. */
export type AudioView = {
  /** Every channel, resolved: the open scene's choice, then an effect's, then a plugin's, then the game's default. */
  channels: Record<string, AudioChannelView>
  /** Sounds from `sound` effects and the open scene's sound and voice beats, in order. */
  cues: AudioCue[]
  /** The ui setting that mutes everything, or null for none. */
  muteSetting: string | null
}

const AUDIO_ROOT = 'audio/'

/** How many `sound` effects a save remembers. */
const CUES_KEPT = 20

const DEFAULT_CHANNELS: Record<string, ChannelDef> = {
  music: { mode: 'background', crossfade: 1000 },
  ambience: { mode: 'background', crossfade: 600 },
  sfx: { mode: 'cue' },
  voice: { mode: 'cue' },
}

/**
 * Where a sound file is, relative to the page. Like `artSrc`: relative, never
 * rooted at `/`, under `audio/`, and a bare name is an `.ogg`.
 */
export function audioSrc(path: string): string {
  const trimmed = path.replace(/^\/?audio\//, '').replace(/^\//, '')
  if (/\.(ogg|oga|opus|mp3|wav|m4a|aac|flac|webm)$/i.test(trimmed)) return `${AUDIO_ROOT}${trimmed}`
  return `${AUDIO_ROOT}${trimmed}.ogg`
}

/** The game's channels: the four defaults with the game's own merged over them, field by field. */
export function audioChannels(game: Game): Record<string, ChannelDef> {
  const out: Record<string, ChannelDef> = { ...DEFAULT_CHANNELS }
  for (const [id, def] of Object.entries(game.audio?.channels ?? {})) out[id] = { ...out[id], ...def }
  return out
}

/** A save's audio before anything has happened. */
export function emptyAudio(): AudioState {
  return { channels: {}, cues: [], seq: 0, shown: 0, started: {} }
}

function isPlaylist(def: TrackDef | PlaylistDef | undefined): def is PlaylistDef {
  return Boolean(def && 'playlist' in def)
}

function trackOf(game: Game, id: string): TrackDef | PlaylistDef | undefined {
  const tracks = game.audio?.tracks
  return tracks && Object.hasOwn(tracks, id) ? tracks[id] : undefined
}

function channelOf(def: TrackDef): string {
  return def.channel ?? 'sfx'
}

/** A `sound` effect, remembered. */
export function soundCue(state: GameState, track: string): GameState {
  const audio = state.audio ?? emptyAudio()
  const seq = audio.seq + 1
  return { ...state, audio: { ...audio, seq, cues: [...audio.cues, { seq, track }].slice(-CUES_KEPT) } }
}

/** An `audio` effect: a track or silence on a background channel, or the channel handed back when `track` is left out. */
export function setChannel(state: GameState, channel: string, track: string | null | undefined): GameState {
  const audio = state.audio ?? emptyAudio()
  const channels = { ...audio.channels }
  if (track === undefined) delete channels[channel]
  else channels[channel] = track
  return { ...state, audio: { ...audio, channels } }
}

/** One more scene entered. */
export function sceneShown(state: GameState): GameState {
  const audio = state.audio ?? emptyAudio()
  return { ...state, audio: { ...audio, shown: audio.shown + 1 } }
}

/** What the open scene puts on its channels, if a scene is open and says. */
function sceneAudio(state: GameState, game: Game): Record<string, string | null> | undefined {
  if (!state.sceneId) return undefined
  return sceneById(game, state.sceneId)?.render(state, sceneContext(state, game)).audio
}

/**
 * The track on each background channel, highest first: the open scene's,
 * an effect's, a plugin's, the game's default. A null at any of these is
 * silence, and nothing below it is asked.
 */
function resolve(state: GameState, game: Game, scene: Record<string, string | null> | undefined): Record<string, string | null> {
  const layers = [scene, state.audio?.channels, pluginAudio(game, state), game.audio?.default]
  const out: Record<string, string | null> = {}
  for (const [id, def] of Object.entries(audioChannels(game))) {
    if (def.mode !== 'background') continue
    let track: string | null = null
    for (const layer of layers) {
      const value = layer && Object.hasOwn(layer, id) ? layer[id] : undefined
      if (value !== undefined) {
        track = value
        break
      }
    }
    out[id] = track
  }
  return out
}

/**
 * Record what each background channel has started playing, and when. Called
 * after every command, so a shuffled playlist draws its order from the turn it
 * started, and replays exactly.
 */
export function noteStarted(state: GameState, game: Game): GameState {
  if (!game.audio) return state
  const audio = state.audio ?? emptyAudio()
  const now = resolve(state, game, sceneAudio(state, game))
  let started = audio.started
  for (const [channel, track] of Object.entries(now)) {
    if (track === null) {
      if (started[channel]) {
        started = { ...started }
        delete started[channel]
      }
    } else if (started[channel]?.track !== track) {
      started = { ...started, [channel]: { track, turn: state.turn } }
    }
  }
  return started === audio.started ? state : { ...state, audio: { ...audio, started } }
}

/** A playlist entry's track id. */
function entryTrack(entry: PlaylistDef['playlist'][number]): string {
  return typeof entry === 'string' ? entry : entry.track
}

/** A playlist entry's weight; 1 for a plain id. */
function entryWeight(entry: PlaylistDef['playlist'][number]): number {
  return typeof entry === 'string' ? 1 : (entry.weight ?? 1)
}

/**
 * A weighted shuffle drawn from these parts: the first by weight from all of
 * them, the next by weight from the rest, and so on.
 */
function weightedOrder<T>(items: readonly T[], weightOf: (item: T) => number, ...parts: (string | number)[]): T[] {
  const left = [...items]
  const out: T[] = []
  while (left.length) {
    const next = weighted(left, weightOf, ...parts, out.length) ?? left[0]
    out.push(next)
    left.splice(left.indexOf(next), 1)
  }
  return out
}

/** A shuffle drawn from these parts: the same parts, the same order. */
function shuffled<T>(items: readonly T[], ...parts: (string | number)[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = roll(i + 1, ...parts, i)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function channelView(state: GameState, game: Game, id: string, def: ChannelDef, wanted: string | null): AudioChannelView {
  const background = def.mode === 'background'
  const base: AudioChannelView = {
    mode: def.mode,
    track: null,
    src: null,
    loop: false,
    volume: 1,
    volumeSetting: def.volume ?? null,
    crossfade: background ? (def.crossfade ?? 1000) : 0,
    duck: def.duck ? { under: [...def.duck.under], to: def.duck.to } : null,
  }
  const entry = wanted === null ? undefined : trackOf(game, wanted)
  if (!background || wanted === null || !entry) return base
  if (!isPlaylist(entry)) {
    return { ...base, track: wanted, src: audioSrc(entry.src), loop: entry.loop ?? true, volume: entry.volume ?? 1 }
  }
  const order = entry.order ?? 'loop'
  let entries = entry.playlist.filter((member) => {
    const def = trackOf(game, entryTrack(member))
    return def && !isPlaylist(def)
  })
  if (order === 'shuffle') {
    const began = state.audio?.started?.[id]
    const turn = began?.track === wanted ? began.turn : state.turn
    entries = entries.some((member) => entryWeight(member) !== 1)
      ? weightedOrder(entries, entryWeight, 'playlist', id, wanted, state.seed, turn)
      : shuffled(entries, 'playlist', id, wanted, state.seed, turn)
  }
  const tracks = entries.map(entryTrack)
  const defs = tracks.map((member) => trackOf(game, member) as TrackDef)
  const srcs = defs.map((member) => audioSrc(member.src))
  const volumes = defs.map((member) => member.volume ?? 1)
  return {
    ...base,
    track: wanted,
    src: srcs[0] ?? null,
    loop: order !== 'inOrder',
    volume: volumes[0] ?? 1,
    playlist: { tracks, srcs, volumes, order },
  }
}

/**
 * `view.audio`: every channel resolved, and the sounds that are due. `scene`
 * is what the open scene rendered, when the caller has it; `beats` the open
 * scene's beats, whose sound and voice beats become cues.
 */
export function audioView(
  state: GameState,
  game: Game,
  scene: { audio?: Record<string, string | null>; beats: readonly SceneBeat[] } | null,
): AudioView {
  if (!game.audio) return { channels: {}, cues: [], muteSetting: null }
  const wanted = resolve(state, game, scene ? scene.audio : sceneAudio(state, game))
  const channels: Record<string, AudioChannelView> = {}
  for (const [id, def] of Object.entries(audioChannels(game))) {
    channels[id] = channelView(state, game, id, def, wanted[id] ?? null)
  }
  const audio = state.audio ?? emptyAudio()
  const cues: AudioCue[] = []
  const cue = (key: string, track: string, channel?: string) => {
    const def = trackOf(game, track)
    if (!def || isPlaylist(def)) return
    cues.push({ key, channel: channel ?? channelOf(def), track, src: audioSrc(def.src), volume: def.volume ?? 1 })
  }
  for (const entry of audio.cues) cue(`cue:${state.seed}:${entry.seq}`, entry.track)
  if (scene && state.sceneId) {
    scene.beats.forEach((beat, index) => {
      const key = `scene:${state.seed}:${audio.shown}:${index}`
      if (beat.kind === 'sound') cue(`${key}:${beat.track}`, beat.track)
      if (beat.kind === 'say' && beat.voice) cue(`${key}:${beat.voice}`, beat.voice, 'voice')
    })
  }
  return { channels, cues, muteSetting: game.audio.mute ?? null }
}

// Checks, used by the content checker (check.ts).

/** What is wrong with putting these tracks on these background channels: a scene's `audio`, a place's, the game's default. */
export function placementProblems(game: Game, audio: Record<string, string | null | undefined>): string[] {
  const channels = audioChannels(game)
  const out: string[] = []
  for (const [channel, track] of Object.entries(audio)) {
    const def = Object.hasOwn(channels, channel) ? channels[channel] : undefined
    if (!def) out.push(`unknown channel "${channel}"`)
    else if (def.mode !== 'background') out.push(`channel "${channel}" plays sounds, not background audio`)
    if (track === null || track === undefined) continue
    const entry = trackOf(game, track)
    if (!entry) out.push(`unknown track "${track}"`)
    else if (!isPlaylist(entry) && channels[channelOf(entry)]?.mode === 'cue') {
      out.push(`track "${track}" is a sound on channel "${channelOf(entry)}", not background audio`)
    }
  }
  return out
}

/** What is wrong with playing this track once, as a `sound` effect or `[[sound:id]]` does. */
export function cueProblems(game: Game, track: string): string[] {
  const entry = trackOf(game, track)
  if (!entry) return [`unknown track "${track}"`]
  if (isPlaylist(entry)) return [`"${track}" is a playlist, not a sound`]
  if (audioChannels(game)[channelOf(entry)]?.mode === 'background') {
    return [`track "${track}" is background audio on channel "${channelOf(entry)}", not a sound`]
  }
  return []
}

/** What `[[sound:id]]` and `[[voice:id]]` in this prose name that the game doesn't have. */
export function markupProblems(game: Game, text: string): string[] {
  return [...text.matchAll(/\[\[(?:sound|voice):([^\]]+)\]\]/g)].flatMap((match) => cueProblems(game, match[1].trim()))
}

/** What is wrong with `game.audio` itself, each with where: `track calm`, `channel music`, `audio`. */
export function manifestProblems(game: Game): { where: string; what: string }[] {
  const audio = game.audio
  if (!audio) return []
  const out: { where: string; what: string }[] = []
  const channels = audioChannels(game)
  const settingIs = (where: string, id: string, kind: 'range' | 'toggle') => {
    const setting = settingById(game, id)
    if (!setting) out.push({ where, what: `unknown setting "${id}"` })
    else if (setting.kind !== kind || settingAffects(setting) !== 'ui') out.push({ where, what: `setting "${id}" is not a ui ${kind} setting` })
  }
  for (const [id, entry] of Object.entries(audio.tracks ?? {})) {
    const where = `track ${id}`
    if (isPlaylist(entry)) {
      if (!entry.playlist.length) out.push({ where, what: 'a playlist with no tracks' })
      for (const listed of entry.playlist) {
        const member = entryTrack(listed)
        if (typeof listed !== 'string' && listed.weight !== undefined) {
          if (!(listed.weight > 0)) out.push({ where, what: `"${member}" has a weight of ${listed.weight}; a weight must be above 0` })
          else if ((entry.order ?? 'loop') !== 'shuffle') out.push({ where, what: `"${member}" has a weight, but only a shuffled playlist uses weights` })
        }
        const def = trackOf(game, member)
        if (!def) out.push({ where, what: `unknown track "${member}"` })
        else if (isPlaylist(def)) out.push({ where, what: `"${member}" is a playlist; a playlist holds tracks` })
        else if (channels[channelOf(def)]?.mode !== 'background') {
          out.push({ where, what: `track "${member}" is a sound on channel "${channelOf(def)}", not background audio` })
        }
      }
      continue
    }
    if (!Object.hasOwn(channels, channelOf(entry))) out.push({ where, what: `on undeclared channel "${channelOf(entry)}"` })
    if (entry.volume !== undefined && !(entry.volume >= 0 && entry.volume <= 1)) out.push({ where, what: 'volume is not between 0 and 1' })
  }
  for (const [id, def] of Object.entries(channels)) {
    const where = `channel ${id}`
    if (def.mode !== 'background' && def.mode !== 'cue') out.push({ where, what: 'mode is not "background" or "cue"' })
    if (def.volume !== undefined) settingIs(where, def.volume, 'range')
    for (const under of def.duck?.under ?? []) {
      if (!Object.hasOwn(channels, under)) out.push({ where, what: `ducks under unknown channel "${under}"` })
    }
    if (def.duck && !(def.duck.to >= 0 && def.duck.to <= 1)) out.push({ where, what: 'duck.to is not between 0 and 1' })
  }
  if (audio.mute !== undefined) settingIs('audio', audio.mute, 'toggle')
  for (const what of placementProblems(game, audio.default ?? {})) out.push({ where: 'audio default', what })
  return out
}
