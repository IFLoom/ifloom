/**
 * Audio, as data. The engine never plays a sound: it says what should be
 * playing on each channel and which one-shot sounds are due, and a player
 * (`@ifloom/audio`) does the playing. Everything here is worked out from the
 * state, so the same save always asks for the same sounds (ADR 0004).
 */
import type { Game } from '../game.ts'
import type { SceneBeat } from '../sceneBody.ts'
import type { GameState } from '../types.ts'
import { defineFeature, type FeatureContext } from './feature.ts'
import { settingAffects, settingOf } from './settings.ts'

/** A track the game declares in `audio.tracks`, a sound file it ships. It plays on the `'sfx'` channel unless `channel` says otherwise. */
export type TrackDef = {
  /** The track's file, under the game's `audio/` folder, such as `'audio/cafe.ogg'`. `audioSrc` turns it into a path. */
  src: string
  /**
   * The channel the track plays on. `'sfx'` if left out.
   *
   * A `sound` effect and `[[sound:id]]` play it there, and a background channel takes only a track whose channel is a
   * background one.
   */
  channel?: string
  /** The track's loop mark, true to repeat it while it's on a background channel. True if left out. */
  loop?: boolean
  /** The track's own volume, from 0 to 1. 1 if left out. */
  volume?: number
}

/** A playlist the game declares in `audio.tracks`, background tracks played one after another. Its order is `'loop'` if left out. */
export type PlaylistDef = {
  /**
   * The playlist's track ids, each on a background channel. In a shuffled playlist a track can carry a weight,
   * `{ track: 'rain', weight: 3 }`, which makes it likely to come earlier.
   *
   * A plain id has weight 1.
   */
  playlist: (string | { track: string; weight?: number })[]
  /**
   * The playlist's order. `'inOrder'` plays the list once, `'loop'` plays it over and over, and `'shuffle'` plays it
   * over and over in an order drawn from the save's seed. `'loop'` if left out.
   *
   * With weights, the shuffle draws the first track by weight, then the next from those left, and so on, so a heavier
   * track tends to play sooner.
   */
  order?: 'inOrder' | 'loop' | 'shuffle'
}

/**
 * An audio channel the game declares in `audio.channels`, merged over the default channels. It sets whether its
 * sounds replace each other or overlap, and how they fade.
 */
export type ChannelDef = {
  /** The channel's mode. A `background` channel plays one thing until it changes, and a `cue` channel plays each sound once, overlapping. */
  mode: 'background' | 'cue'
  /** The milliseconds a background channel takes to fade from one track to the next. 1000 for `music`, 600 for `ambience` and 1000 for others. */
  crossfade?: number
  /** The id of the ui setting, a range, that sets the channel's volume. */
  volume?: string
  /** The channel's ducking, quietening it to `to` (0 to 1) while any channel in `under` plays. No ducking if left out. */
  duck?: { under: string[]; to: number }
}

/** The audio the game declares in `audio`, its tracks, the channels they play on and the settings that set their volume. */
export type GameAudio = {
  /** The game's tracks and playlists, by id, each a file with its volume or a list of tracks to play in turn. */
  tracks: Record<string, TrackDef | PlaylistDef>
  /** The game's channels, merged over the defaults, `music` and `ambience` (background) and `sfx` and `voice` (cue). */
  channels?: Record<string, ChannelDef>
  /** The id of the ui setting, a toggle, that mutes everything while it's on, such as a "Mute" box. */
  mute?: string
  /** The id of the ui setting, a toggle, that plays sound only while it's on, such as a "Sound" box. It's the reverse of `mute`. */
  sound?: string
  /** The track each background channel plays when nothing else sets one, by channel. */
  default?: Record<string, string>
}

/** The audio a save keeps, in `state.audio`. The engine reads the tracks and channels from content. */
export type AudioState = {
  /**
   * The tracks `audio` effects have put on background channels, by channel. Null is silence, and a channel missing
   * here is left to the scene, the plugins and the defaults.
   */
  channels: Record<string, string | null>
  /** The last 20 `sound` effects, oldest first, each with its number in the running count. */
  cues: { seq: number; track: string }[]
  /** The number of `sound` effects there have been. */
  seq: number
  /** The number of times a scene has been entered, all scenes together. Each visit's sounds get keys of their own from it. */
  shown: number
  /** The track each background channel is playing and the turn it started, for a shuffled playlist's draw. */
  started: Record<string, { track: string; turn: number }>
}

/** An audio channel as the audio player needs it, in `view.audio.channels`. */
export type AudioChannelView = {
  /** The channel's mode. `background` plays a track or playlist until it changes, and `cue` plays one-shot sounds, listed in `cues`. */
  mode: 'background' | 'cue'
  /** The id of the track or playlist playing. Null for silence, and always null on a cue channel. */
  track: string | null
  /** The file to play, through `audioSrc`, a playlist's first. Null for silence. */
  src: string | null
  /** The channel's loop mark, true when the track repeats. A playlist repeats as a whole unless its order is `'inOrder'`. */
  loop: boolean
  /** The track's own volume, from 0 to 1, or a playlist's first track's. The player multiplies it by the volume setting's value. */
  volume: number
  /** The id of the ui setting that sets the channel's volume. Null when there's none. */
  volumeSetting: string | null
  /** The milliseconds to fade between tracks. 0 on a cue channel. */
  crossfade: number
  /** The channel's ducking, quietening it to `to` (0 to 1) while any channel in `under` plays. Null when it doesn't duck. */
  duck: { under: string[]; to: number } | null
  /** The playlist's tracks, files, volumes and order, already shuffled when it shuffles. Left out for a single track. */
  playlist?: { tracks: string[]; srcs: string[]; volumes: number[]; order: 'inOrder' | 'loop' | 'shuffle' }
}

/** A one-shot sound that is due, in `view.audio.cues`. The audio player plays each key once. */
export type AudioCue = {
  /** The cue's key, the same for the same sound in the same visit across view calls and reloads. */
  key: string
  /** The cue channel the sound plays on, `sfx` or `voice` unless the game declares others. */
  channel: string
  /** The track's id in `audio.tracks`. */
  track: string
  /** The file to play, through `audioSrc`. */
  src: string
  /** The track's own volume, from 0 to 1. The player multiplies it by the channel's volume setting. */
  volume: number
}

/** The audio feature's state, effects, content key, view and references, as types. */
export type AudioShape = {
  state: {
    /** The audio a save keeps, the tracks effects put on channels, the last sounds and the count of scenes entered. */
    audio: AudioState
  }
  effects: {
    /**
     * An effect that puts a background channel `to` a track, kept in the save, such as `{ audio: 'music', to: 'calm' }`.
     * `to: null` silences the channel, and leaving `to` out returns it to the scene, the plugins or the default.
     */
    audio: { audio: string; to?: string | null }
    /** An effect that plays a track once, on the track's channel. */
    sound: { sound: string }
  }
  game: {
    /** The game's tracks and channels. No audio if left out. */
    audio?: GameAudio
  }
  pack: {
    /**
     * The pack's tracks, channels and defaults, over the content's. A later pack's track or channel replaces an
     * earlier one with the same id, and its `mute`, `sound` and `default` entries win too.
     */
    audio?: Partial<GameAudio>
  }
  view: {
    /** The audio each channel should play and the sounds that are due. Empty when the game has no audio. */
    audio: AudioView
  }
  lists: 'track' | 'channel' | 'audio'
  references: {
    /** A reference to background audio, a track (or silence) on a channel. */
    channel: { channel: string; track: string | null | undefined }
    /** A reference to a track played once. */
    sound: { sound: string }
    /** A reference to a sound file, through `audioSrc`. */
    audio: { audio: string }
  }
}

/** The audio as the audio player needs it, in `view.audio`. It's empty when the game has no audio. */
export type AudioView = {
  /** Every channel with its track resolved, from the open scene, then an effect, then a plugin, then the game's default. */
  channels: Record<string, AudioChannelView>
  /** The sounds that are due, from `sound` effects and the open scene's sound and voice beats, in order. */
  cues: AudioCue[]
  /** The id of the ui setting that mutes everything while it's on. Null when there's none. */
  muteSetting: string | null
  /** The id of the ui setting that mutes everything while it's off. Null when there's none. */
  soundSetting: string | null
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
 * Returns a sound file's path relative to the page, under `audio/`. A bare name gets `.ogg`.
 *
 * Like `artSrc`, the path is relative and never starts with `/`.
 */
export function audioSrc(path: string): string {
  const trimmed = path.replace(/^\/?audio\//, '').replace(/^\//, '')
  if (/\.(ogg|oga|opus|mp3|wav|m4a|aac|flac|webm)$/i.test(trimmed)) return `${AUDIO_ROOT}${trimmed}`
  return `${AUDIO_ROOT}${trimmed}.ogg`
}

/** Returns the game's channels, the four defaults with the game's own merged over them field by field. */
export function audioChannels(game: Game): Record<string, ChannelDef> {
  const out: Record<string, ChannelDef> = { ...DEFAULT_CHANNELS }
  for (const [id, def] of Object.entries(game.audio?.channels ?? {})) out[id] = { ...out[id], ...def }
  return out
}

/** Returns a save's audio before anything has played. */
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

/** Returns the state with a `sound` effect recorded as a cue. The save keeps the last 20. */
export function soundCue(state: GameState, track: string): GameState {
  const audio = state.audio ?? emptyAudio()
  const seq = audio.seq + 1
  return { ...state, audio: { ...audio, seq, cues: [...audio.cues, { seq, track }].slice(-CUES_KEPT) } }
}

/** Returns the state with a track or silence put on a background channel. Leaving `track` out removes the channel's override. */
export function setChannel(state: GameState, channel: string, track: string | null | undefined): GameState {
  const audio = state.audio ?? emptyAudio()
  const channels = { ...audio.channels }
  if (track === undefined) delete channels[channel]
  else channels[channel] = track
  return { ...state, audio: { ...audio, channels } }
}

/** Returns the state with one more scene entered counted, so that visit's sounds get keys of their own. */
export function sceneShown(state: GameState): GameState {
  const audio = state.audio ?? emptyAudio()
  return { ...state, audio: { ...audio, shown: audio.shown + 1 } }
}

/**
 * The track on each background channel, highest first: the open scene's,
 * an effect's, a plugin's, the game's default. A null at any of these is
 * silence, and nothing below it is asked.
 */
function resolve(state: GameState, game: Game, scene: Record<string, string | null> | undefined, cx: FeatureContext): Record<string, string | null> {
  const layers = [scene, state.audio?.channels, cx.pluginAudio(game, state), game.audio?.default]
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
 * Returns the track each background channel should play in this state. `scene` is what the open scene puts on its
 * channels, when the caller has rendered it, and the result is empty when the game has no audio.
 */
export function audioTracks(state: GameState, game: Game, scene: Record<string, string | null> | undefined, cx: FeatureContext): Record<string, string | null> {
  return game.audio ? resolve(state, game, scene, cx) : {}
}

/**
 * Returns the state with the track each background channel started playing, and the turn it started. The reducer
 * calls it after every command with `screen.audio.tracks`.
 *
 * A shuffled playlist draws its order from the turn it started, so it replays exactly. Without `tracks`, the tracks
 * are worked out from the open scene's `audio`.
 */
export function noteStarted(state: GameState, game: Game, tracks: Record<string, string | null> | undefined, cx: FeatureContext): GameState {
  if (!game.audio) return state
  const audio = state.audio ?? emptyAudio()
  const now = tracks ?? resolve(state, game, state.sceneId ? cx.sceneOf(game, state.sceneId)?.audio : undefined, cx)
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
function weightedOrder<T>(cx: FeatureContext, items: readonly T[], weightOf: (item: T) => number, ...parts: (string | number)[]): T[] {
  const left = [...items]
  const out: T[] = []
  while (left.length) {
    const next = cx.weighted(left, weightOf, ...parts, out.length) ?? left[0]
    out.push(next)
    left.splice(left.indexOf(next), 1)
  }
  return out
}

/** A shuffle drawn from these parts: the same parts, the same order. */
function shuffled<T>(cx: FeatureContext, items: readonly T[], ...parts: (string | number)[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = cx.draw(i + 1, ...parts, i)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function channelView(state: GameState, game: Game, id: string, def: ChannelDef, wanted: string | null, cx: FeatureContext): AudioChannelView {
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
      ? weightedOrder(cx, entries, entryWeight, 'playlist', id, wanted, state.seed, turn)
      : shuffled(cx, entries, 'playlist', id, wanted, state.seed, turn)
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
 * Returns `view.audio`, every channel resolved and the sounds that are due. `tracks` is what `audioTracks` returned.
 *
 * `beats` are the open scene's beats, whose sound and voice beats become cues, or null when no scene is open.
 */
export function audioView(
  state: GameState,
  game: Game,
  tracks: Record<string, string | null>,
  beats: readonly SceneBeat[] | null,
  cx: FeatureContext,
): AudioView {
  if (!game.audio) return { channels: {}, cues: [], muteSetting: null, soundSetting: null }
  const channels: Record<string, AudioChannelView> = {}
  for (const [id, def] of Object.entries(audioChannels(game))) {
    channels[id] = channelView(state, game, id, def, tracks[id] ?? null, cx)
  }
  const audio = state.audio ?? emptyAudio()
  const cues: AudioCue[] = []
  const cue = (key: string, track: string, channel?: string) => {
    const def = trackOf(game, track)
    if (!def || isPlaylist(def)) return
    cues.push({ key, channel: channel ?? channelOf(def), track, src: audioSrc(def.src), volume: def.volume ?? 1 })
  }
  for (const entry of audio.cues) cue(`cue:${state.seed}:${entry.seq}`, entry.track)
  if (beats && state.sceneId) {
    beats.forEach((beat, index) => {
      const key = `scene:${state.seed}:${audio.shown}:${index}`
      if (beat.type === 'sound') cue(`${key}:${beat.track}`, beat.track)
      if (beat.type === 'say' && beat.voice) cue(`${key}:${beat.voice}`, beat.voice, 'voice')
    })
  }
  return { channels, cues, muteSetting: game.audio.mute ?? null, soundSetting: game.audio.sound ?? null }
}

// Checks, used by the content checker (check.ts).

/** Returns the problems with putting these tracks on these background channels, as a scene's `audio`, a location's or the game's default does. */
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

/** Returns the problems with playing this track once, as a `sound` effect or `[[sound:id]]` does. Empty when there are none. */
export function cueProblems(game: Game, track: string): string[] {
  const entry = trackOf(game, track)
  if (!entry) return [`unknown track "${track}"`]
  if (isPlaylist(entry)) return [`"${track}" is a playlist, not a sound`]
  if (audioChannels(game)[channelOf(entry)]?.mode === 'background') {
    return [`track "${track}" is background audio on channel "${channelOf(entry)}", not a sound`]
  }
  return []
}

/** Returns the problems with the `[[sound:id]]` and `[[voice:id]]` markup in this prose, such as a track the game doesn't have. */
export function markupProblems(game: Game, text: string): string[] {
  return [...text.matchAll(/\[\[(?:sound|voice):([^\]]+)\]\]/g)].flatMap((match) => cueProblems(game, match[1].trim()))
}

/** Returns the problems with the game's `audio` itself, each with where it is, such as `track calm`, `channel music` or `audio`. */
export function manifestProblems(game: Game): { where: string; what: string }[] {
  const audio = game.audio
  if (!audio) return []
  const out: { where: string; what: string }[] = []
  const channels = audioChannels(game)
  const settingIs = (where: string, id: string, type: 'range' | 'toggle') => {
    const setting = settingOf(game, id)
    if (!setting) out.push({ where, what: `unknown setting "${id}"` })
    else if (setting.type !== type || settingAffects(setting) !== 'ui') out.push({ where, what: `setting "${id}" is not a ui ${type} setting` })
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
  if (audio.sound !== undefined) settingIs('audio', audio.sound, 'toggle')
  for (const what of placementProblems(game, audio.default ?? {})) out.push({ where: 'audio default', what })
  return out
}

/** The audio feature, which keeps the channels and cues a save needs and renders `view.audio`. */
export const audio = defineFeature<AudioShape>({
  name: 'audio',
  // A channel's volume and the mute and sound switches are ui settings.
  requires: ['settings'],
  state: {
    // The opening scene is the first showing.
    audio: { start: (game) => ({ ...emptyAudio(), shown: game.introScene ? 1 : 0 }), load: emptyAudio },
  },
  // What the opening screen starts playing, and when.
  started: (state, game, cx) => noteStarted(state, game, undefined, cx),
  effects: {
    audio: {
      apply: (state, effect) => setChannel(state, effect.audio, effect.to),
      references: (effect) => [{ channel: effect.audio, track: effect.to }],
    },
    sound: {
      apply: (state, effect) => soundCue(state, effect.sound),
      references: (effect) => [{ sound: effect.sound }],
    },
  },
  // Merged by id: tracks, and channels field by field; the last `mute`, the last `sound` and each channel's last `default` win.
  pack: {
    merge: () => {
      const tracks = new Map<string, { value: TrackDef | PlaylistDef; from: string }>()
      const channels = new Map<string, { value: ChannelDef; from: string }>()
      const defaults: Record<string, string> = {}
      let mute: string | undefined
      let sound: string | undefined
      let audioFrom = 'base'
      let hasAudio = false
      const add = (from: string, audio: Partial<GameAudio> | undefined) => {
        if (!audio) return
        hasAudio = true
        for (const [id, value] of Object.entries(audio.tracks ?? {})) tracks.set(id, { value, from })
        for (const [id, value] of Object.entries(audio.channels ?? {})) channels.set(id, { value: { ...channels.get(id)?.value, ...value }, from })
        if (audio.mute !== undefined || audio.sound !== undefined || audio.default !== undefined) audioFrom = from
        if (audio.mute !== undefined) mute = audio.mute
        if (audio.sound !== undefined) sound = audio.sound
        Object.assign(defaults, audio.default ?? {})
      }
      return {
        base: (game) => add('base', game.audio),
        add: (pack, from) => add(from, pack.audio),
        finish: (game) => {
          if (!hasAudio) {
            delete game.audio
            return
          }
          const audio: GameAudio = { tracks: Object.fromEntries([...tracks].map(([id, entry]) => [id, entry.value])) }
          if (channels.size) audio.channels = Object.fromEntries([...channels].map(([id, entry]) => [id, entry.value]))
          if (mute !== undefined) audio.mute = mute
          if (sound !== undefined) audio.sound = sound
          if (Object.keys(defaults).length) audio.default = defaults
          game.audio = audio
        },
        from: (list, id) => {
          if (list === 'audio') return audioFrom
          if (id === undefined) return undefined
          return (list === 'track' ? tracks : channels).get(id)?.from
        },
      }
    },
  },
  content: { audio: { declares: (audio) => Object.keys(audio.tracks ?? {}).map((key) => `track "${key}"`), words: null } },
  lists: ['track', 'channel', 'audio'],
  // The manifest and its files.
  check: (game, tools) => {
    for (const { where, what } of manifestProblems(game)) {
      const cut = where.indexOf(' ')
      const [list, id] = [where.slice(0, cut), where.slice(cut + 1)]
      tools.problem(list === 'track' || list === 'channel' ? { list, id } : { list: 'audio' }, where, what)
    }
    for (const [id, track] of Object.entries(game.audio?.tracks ?? {})) {
      if (!('playlist' in track)) tools.file(`track ${id}`, 'audio', audioSrc(track.src))
    }
  },
  // Background audio, a cue and a sound file, wherever content names them.
  resolve: (game, tools) => ({
    channel: (ref) => placementProblems(game, { [ref.channel]: ref.track }),
    sound: (ref) => cueProblems(game, ref.sound),
    audio: (ref, where) => {
      tools.file(where, 'audio', audioSrc(ref.audio))
      return []
    },
  }),
  // The sounds prose markup names.
  markup: (game, text) => markupProblems(game, text),
  view: (_state, _game, shown) => {
    const { tracks: _tracks, ...audio } = shown.audio as AudioView & { tracks: unknown }
    return { audio }
  },
  // A new showing: its sounds get keys of their own. Where `witnessed` counted it, straight after the triggers.
  afterCommand: {
    at: 'beforePlugins',
    run: (before, after) => (after.sceneId && after.sceneId !== before.sceneId ? sceneShown(after) : after),
  },
  // What each background channel started playing, from the new state's screen. Only a game with audio.
  fromScreen: {
    wants: (game) => Boolean(game.audio),
    record: (state, shown, game, cx) => noteStarted(state, game, shown.audio.tracks, cx),
  },
})
