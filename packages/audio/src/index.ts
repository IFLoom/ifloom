/**
 * @ifloom/audio: plays what `view.audio` asks for, in the browser, with plain
 * `HTMLAudioElement`s and no framework. The engine works out what should be
 * playing; this only follows it.
 *
 *   import { startAudio } from '@ifloom/audio'
 *   const player = startAudio(runner)   // player() stops it; player.unlock(), player.play(src)
 */
import type { AudioChannelView, AudioCue, AudioView, CommandLog, KvValue, Runner } from '@ifloom/engine'

/** The part of an `HTMLAudioElement` that the audio player uses. Tests pass a fake through `AudioOptions.createAudio`. */
export type AudioLike = {
  /** Starts playing. The browser may refuse, by throwing or by rejecting the promise it returns. */
  play(): Promise<void> | void
  /** Pauses playing. */
  pause(): void
  /** The element's volume, from 0 to 1. */
  volume: number
  /** True when the element starts again from the beginning as it ends. */
  loop: boolean
  /** The element's position in the file, in seconds. */
  currentTime: number
  /** True once the element has played to its end. */
  readonly ended: boolean
  /** The handler the element calls when it plays to its end. */
  onended: ((event: Event) => void) | null
  /** The element's file. */
  src: string
}

/** Settings for `startAudio`. Each is optional. */
export type AudioOptions = {
  /** The function that makes the element for a file. `new Audio(src)` if left out. */
  createAudio?: (src: string) => AudioLike
  /** A function that receives a line for each decision the player makes, for debugging, such as `console.debug`. */
  log?: (message: string) => void
  /** The element whose first `pointerdown` or `keydown` unlocks sound. `document` if left out. */
  root?: EventTarget
}

/**
 * The audio player `startAudio` returns, a function that stops it with two methods on it. Calling it stops following
 * the runner and the page's clicks and key presses, and pauses every sound.
 */
export type AudioPlayer = (() => void) & {
  /** Allows sound now, as the first click or key press does, and starts the sounds that are due. */
  unlock(): void
  /** Plays a file once on a channel, such as a voice line again. The channel is `'sfx'` and the volume 1 if left out. */
  play(src: string, channel?: string, volume?: number): void
}

/** How often fades and ducking move, in milliseconds. */
const STEP = 50
/** How long ducking takes to go down or come back up, in milliseconds. */
const DUCK_MS = 300

/** A volume that moves toward a target, `rate` of the way from 0 to 1 per millisecond. */
type Ramp = { level: number; target: number; rate: number }

type Sound = { el: AudioLike; channel: string; src: string; volume: number; fade: Ramp }

type Background = {
  /** What the channel was last asked for: a file, a playlist, or null for silence. */
  wanted: string | null
  current: Sound | null
  /** Sounds fading out after a change. */
  outgoing: Sound[]
  playlist?: { srcs: string[]; volumes: number[]; order: 'inOrder' | 'loop' | 'shuffle'; index: number }
}

type Queued = { src: string; volume: number; label: string }

const clamp = (value: number) => Math.min(1, Math.max(0, value))

function step(ramp: Ramp, ms: number): void {
  if (ramp.level === ramp.target) return
  const by = ramp.rate > 0 ? ramp.rate * ms : 1
  ramp.level = ramp.level < ramp.target ? Math.min(ramp.target, ramp.level + by) : Math.max(ramp.target, ramp.level - by)
}

/** What a background channel is playing, as one string: the file, or the playlist and its files. */
function wantedOf(channel: AudioChannelView): string | null {
  if (channel.src === null) return null
  return channel.playlist ? `playlist ${channel.track}: ${channel.playlist.srcs.join(', ')}` : channel.src
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name || error.message : String(error)
}

/**
 * Starts playing a runner's `view.audio` in the browser, and returns the {@link AudioPlayer} that stops it. Nothing
 * plays until the player first clicks or presses a key, or until `unlock()`.
 *
 * Background channels crossfade when their file changes, and step through playlists. Each cue key plays once, and the
 * player counts the cues already in the view when it starts as heard, so loading a save replays nothing. Volumes and
 * muting follow the game's settings in the runner's snapshot.
 */
export function startAudio(runner: Runner, options: AudioOptions = {}): AudioPlayer {
  const create = options.createAudio ?? ((src: string) => new Audio(src) as AudioLike)
  const log = options.log ?? (() => {})
  const root = options.root ?? (typeof document === 'undefined' ? undefined : document)

  let audio: AudioView = runner.view().audio
  let lastLog: CommandLog = runner.log()
  let settings: Readonly<Record<string, KvValue>> = runner.snapshot().settings
  let unlocked = false
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const heard = new Set(audio.cues.map((cue) => cue.key))
  const backgrounds = new Map<string, Background>()
  /** One-shot sounds playing now, by channel. */
  const oneShots = new Map<string, Set<Sound>>()
  const voiceQueue: Queued[] = []
  let voiceNow: Sound | null = null
  const ducks = new Map<string, Ramp>()
  /** Background sounds the browser wouldn't start, tried again on the next click or key press. */
  const refusedSounds = new Set<Sound>()

  // Settings

  /** A range setting as 0 to 1 from its min to its max; 1 if the game has no such setting. */
  function rangeGain(id: string): number {
    const setting = runner.game.settings?.find((entry) => entry.id === id)
    if (setting?.type !== 'range') return 1
    const at = Number(settings[id] ?? setting.default)
    return setting.max > setting.min ? clamp((at - setting.min) / (setting.max - setting.min)) : 1
  }

  /** Silent while the game's mute toggle is on, or its sound toggle is off. */
  function muted(): boolean {
    const mute = audio.muteSetting
    const sound = audio.soundSetting
    return (mute ? settings[mute] === true : false) || (sound ? settings[sound] === false : false)
  }

  function gain(channel: string): number {
    if (muted()) return 0
    const setting = audio.channels[channel]?.volumeSetting
    return (setting ? rangeGain(setting) : 1) * (ducks.get(channel)?.level ?? 1)
  }

  // Volumes, fades and ducking

  function everySound(): Sound[] {
    const out: Sound[] = []
    for (const background of backgrounds.values()) {
      if (background.current) out.push(background.current)
      out.push(...background.outgoing)
    }
    for (const set of oneShots.values()) out.push(...set)
    return out
  }

  function applyVolumes(): void {
    for (const sound of everySound()) sound.el.volume = clamp(sound.volume * gain(sound.channel) * sound.fade.level)
  }

  function moving(): boolean {
    for (const sound of everySound()) if (sound.fade.level !== sound.fade.target) return true
    for (const ramp of ducks.values()) if (ramp.level !== ramp.target) return true
    return false
  }

  function tick(): void {
    timer = undefined
    for (const sound of everySound()) step(sound.fade, STEP)
    for (const ramp of ducks.values()) step(ramp, STEP)
    for (const [channel, background] of backgrounds) {
      const gone = background.outgoing.filter((sound) => sound.fade.level === 0)
      for (const sound of gone) {
        sound.el.pause()
        log(`${channel}: faded out ${sound.src}`)
      }
      background.outgoing = background.outgoing.filter((sound) => sound.fade.level > 0)
    }
    applyVolumes()
    if (moving()) timer = setTimeout(tick, STEP)
  }

  /** Set every volume now, and keep ticking while anything is still moving. */
  function kick(): void {
    applyVolumes()
    if (!stopped && timer === undefined && moving()) timer = setTimeout(tick, STEP)
  }

  function isPlaying(channel: string): boolean {
    const current = backgrounds.get(channel)?.current
    if (current && !current.el.ended) return true
    return Boolean(oneShots.get(channel)?.size)
  }

  /** Point each ducking channel at its quiet level while anything it ducks under plays, and back up after. */
  function updateDucks(): void {
    for (const [id, channel] of Object.entries(audio.channels)) {
      if (!channel.duck) {
        ducks.delete(id)
        continue
      }
      const ramp = ducks.get(id) ?? { level: 1, target: 1, rate: 1 / DUCK_MS }
      const target = channel.duck.under.some(isPlaying) ? channel.duck.to : 1
      if (target !== ramp.target) log(`${id}: duck to ${target}`)
      ramp.target = target
      ducks.set(id, ramp)
    }
    kick()
  }

  // Playing

  /** Start an element. A refused `play()` is noted in the log, and `failed` runs. */
  function start(channel: string, src: string, volume: number, loop: boolean, fadeMs: number, failed?: () => void): Sound {
    const el = create(src)
    el.loop = loop
    const sound: Sound = { el, channel, src, volume, fade: fadeMs > 0 ? { level: 0, target: 1, rate: 1 / fadeMs } : { level: 1, target: 1, rate: 0 } }
    el.volume = clamp(volume * gain(channel) * sound.fade.level)
    const refused = (error: unknown) => {
      // A pause before the file started (a fast crossfade, say) aborts the play; that isn't the browser saying no.
      const name = errorName(error)
      log(name === 'AbortError' ? `${channel}: stopped ${src} before it started` : `${channel}: play refused for ${src} (${name})`)
      if (name === 'NotAllowedError' && !failed) refusedSounds.add(sound)
      failed?.()
    }
    try {
      const started = el.play()
      if (started && typeof started.catch === 'function') started.catch(refused)
    } catch (error) {
      refused(error)
    }
    return sound
  }

  function oneShot(channel: string, src: string, volume: number, done?: () => void): Sound {
    let set = oneShots.get(channel)
    if (!set) oneShots.set(channel, (set = new Set()))
    let finished = false
    let sound: Sound | undefined
    const finish = () => {
      if (finished) return
      finished = true
      if (sound) set.delete(sound)
      done?.()
      updateDucks()
    }
    sound = start(channel, src, volume, false, 0, finish)
    if (!finished) {
      set.add(sound)
      sound.el.onended = finish
    }
    updateDucks()
    return sound
  }

  function playVoice(): void {
    if (voiceNow || stopped) return
    const next = voiceQueue.shift()
    if (!next) return
    log(`voice: play ${next.label}`)
    let done = false
    let sound: Sound | undefined
    sound = oneShot('voice', next.src, next.volume, () => {
      done = true
      if (sound === undefined || voiceNow === sound) voiceNow = null
      playVoice()
    })
    if (!done) voiceNow = sound
  }

  function queueVoice(entry: Queued): void {
    log(`voice: queue ${entry.label}`)
    voiceQueue.push(entry)
    playVoice()
  }

  function playCue(cue: AudioCue): void {
    if (cue.channel === 'voice') return queueVoice({ src: cue.src, volume: cue.volume, label: `${cue.key} ${cue.track}` })
    log(`${cue.channel}: play ${cue.key} ${cue.track}`)
    oneShot(cue.channel, cue.src, cue.volume)
  }

  function playlistNext(id: string, background: Background): void {
    const list = background.playlist
    if (!list) return
    let index = list.index + 1
    if (index >= list.srcs.length) {
      if (list.order === 'inOrder') {
        background.current = null
        log(`${id}: playlist finished`)
        updateDucks()
        return
      }
      index = 0
    }
    list.index = index
    log(`${id}: next in playlist, ${list.srcs[index]}`)
    playlistTrack(id, background, 0)
  }

  function playlistTrack(id: string, background: Background, fadeMs: number): void {
    const list = background.playlist!
    const sound = start(id, list.srcs[list.index], list.volumes[list.index] ?? 1, false, fadeMs)
    sound.el.onended = () => {
      if (background.current === sound) playlistNext(id, background)
    }
    background.current = sound
  }

  function syncBackground(id: string, channel: AudioChannelView): void {
    let background = backgrounds.get(id)
    if (!background) backgrounds.set(id, (background = { wanted: null, current: null, outgoing: [] }))
    const wanted = wantedOf(channel)
    if (wanted === background.wanted) {
      // The same file or playlist: keep playing it, at the view's volume.
      if (background.current && !channel.playlist) background.current.volume = channel.volume
      return
    }
    background.wanted = wanted
    const old = background.current
    background.current = null
    background.playlist = undefined
    if (old) {
      if (channel.crossfade > 0) {
        old.fade.target = 0
        old.fade.rate = 1 / channel.crossfade
        background.outgoing.push(old)
      } else {
        old.el.pause()
      }
    }
    if (wanted === null) {
      log(`${id}: silence`)
      return
    }
    if (channel.playlist) {
      const { srcs, volumes, order } = channel.playlist
      background.playlist = { srcs, volumes, order, index: 0 }
      log(old ? `${id}: crossfade to ${wanted} over ${channel.crossfade} ms` : `${id}: play ${wanted}`)
      playlistTrack(id, background, channel.crossfade)
      return
    }
    log(old ? `${id}: crossfade to ${channel.src} over ${channel.crossfade} ms` : `${id}: play ${channel.src}`)
    const sound = start(id, channel.src!, channel.volume, channel.loop, channel.crossfade)
    sound.el.onended = () => updateDucks()
    background.current = sound
  }

  /** Follow the view: the background channels, then any cue not heard yet. */
  function sync(): void {
    if (stopped) return
    // The runner keeps one view per state, so this is the view the UI drew, not a new one.
    const full = runner.view()
    audio = full.audio
    const commandLog = runner.log()
    // One command more is play going on. Anything else (a load, a new game, an
    // undo) is a jump: the sound effects kept in that state are old news. A
    // scene's own sounds still play, once, for the scene now on screen.
    const jumped = commandLog !== lastLog && !(commandLog.start === lastLog.start && commandLog.commands.length === lastLog.commands.length + 1)
    lastLog = commandLog
    if (jumped) {
      for (const cue of audio.cues) if (cue.key.startsWith('cue:')) heard.add(cue.key)
    }
    if (!unlocked) return
    for (const [id, channel] of Object.entries(audio.channels)) {
      if (channel.mode === 'background') syncBackground(id, channel)
    }
    for (const cue of audio.cues) {
      if (heard.has(cue.key)) continue
      heard.add(cue.key)
      playCue(cue)
    }
    updateDucks()
  }

  /** The first click or key press unlocks; a later one starts again any background sound the browser refused. */
  function onGesture(): void {
    if (!unlocked) return unlock()
    for (const sound of refusedSounds) {
      refusedSounds.delete(sound)
      const background = backgrounds.get(sound.channel)
      if (background?.current !== sound) continue
      log(`${sound.channel}: try ${sound.src} again`)
      try {
        const started = sound.el.play()
        if (started && typeof started.catch === 'function') started.catch(() => refusedSounds.add(sound))
      } catch {
        refusedSounds.add(sound)
      }
    }
  }

  function unlock(): void {
    if (unlocked || stopped) return
    unlocked = true
    log('unlocked')
    sync()
  }

  // Wiring

  const stopRunner = runner.subscribe(() => {
    // The runner hands back the same settings object until one changes.
    const now = runner.snapshot().settings
    if (now !== settings && !stopped) {
      settings = now
      log(`settings changed${muted() ? ', muted' : ''}`)
      kick()
    }
    sync()
  })
  root?.addEventListener('pointerdown', onGesture, true)
  root?.addEventListener('keydown', onGesture, true)
  log(`started, ${heard.size} cue${heard.size === 1 ? '' : 's'} already heard; waiting for a click or key press`)

  const stop = () => {
    if (stopped) return
    stopped = true
    stopRunner()
    root?.removeEventListener('pointerdown', onGesture, true)
    root?.removeEventListener('keydown', onGesture, true)
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    for (const sound of everySound()) sound.el.pause()
    refusedSounds.clear()
    backgrounds.clear()
    oneShots.clear()
    voiceQueue.length = 0
    voiceNow = null
    log('stopped')
  }
  return Object.assign(stop, {
    unlock,
    play(src: string, channel = 'sfx', volume = 1) {
      if (stopped) return
      unlock()
      if (channel === 'voice') return queueVoice({ src, volume, label: src })
      log(`${channel}: play ${src}`)
      oneShot(channel, src, volume)
    },
  })
}
