import { describe, expect, it } from 'vitest'
import { audioChannels, audioSrc, type GameAudio } from '../../src/features/audio.ts'
import { SCHEMA, loadGame, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { definePlugin } from '../../src/plugin.ts'
import { apply } from '../../src/reduce.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { replay } from '../../src/runner.ts'
import { parseBeats } from '../../src/sceneBody.ts'
import { SAVE_VERSION, type GameState } from '../../src/types.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { view } from '../../src/view.ts'
import { fixture } from '../fixtures/town.ts'

/** Somewhere to stand in for places: the street hums while the `at` kv key says you're there. */
const street = definePlugin({
  id: 'street',
  version: 1,
  audio: (state) => (state.kv.at === 'street' ? { ambience: 'traffic', music: null } : undefined),
})

const audio: GameAudio = {
  tracks: {
    calm: { src: 'calm.ogg', channel: 'music' },
    tense: { src: 'music/tense.mp3', channel: 'music', volume: 0.6 },
    traffic: { src: 'traffic', channel: 'ambience' },
    rain: { src: 'rain.ogg', channel: 'ambience', loop: false },
    knock: { src: 'knock.ogg' },
    buzz: { src: 'buzz.ogg', volume: 0.5 },
    'ava.morning': { src: 'voice/ava-morning.ogg', channel: 'voice' },
    a: { src: 'a.ogg', channel: 'music' },
    b: { src: 'b.ogg', channel: 'music' },
    c: { src: 'c.ogg', channel: 'music' },
    d: { src: 'd.ogg', channel: 'music' },
    radio: { playlist: ['a', 'b', 'c', 'd'], order: 'shuffle' },
    album: { playlist: ['a', 'b'], order: 'inOrder' },
  },
  channels: { music: { mode: 'background', volume: 'musicVolume' }, sfx: { mode: 'cue', duck: { under: ['voice'], to: 0.3 } } },
  mute: 'muted',
  default: { music: 'calm' },
}

/** A front door that someone knocks at, Ava's good morning, and a radio. */
const house: Pack = {
  id: 'house',
  schema: SCHEMA,
  prose: {
    'door.knock': 'Someone is at the door.\n\n[[sound:knock]]\n\nAva: "Morning!" [[voice:ava.morning]]\n\n"Morning."',
    'door#open': 'Open it',
    'door#again': 'Listen again',
    'door#leave': 'Leave it',
    'storm.text': 'Rain on the window.',
    'storm#leave': 'Leave',
    'quiet.text': 'Nothing at all.',
    'quiet#leave': 'Leave',
  },
  scenes: [
    {
      id: 'door',
      audio: { music: 'tense' },
      body: [{ text: 'door.knock' }],
      choices: [
        { id: 'open', effects: [{ kind: 'scene', scene: null }] },
        { id: 'again', effects: [{ kind: 'sound', track: 'buzz' }] },
        { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
      ],
    },
    { id: 'storm', audio: { ambience: 'rain' }, body: [{ text: 'storm.text' }], choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }] },
    { id: 'quiet', audio: { music: null }, body: [{ text: 'quiet.text' }], choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }] },
  ],
  activities: [
    { id: 'radio', effects: [{ kind: 'audio', channel: 'music', to: 'radio' }] },
    { id: 'silence', effects: [{ kind: 'audio', channel: 'music', to: null }] },
    { id: 'default', effects: [{ kind: 'audio', channel: 'music' }] },
    { id: 'buzz', effects: [{ kind: 'sound', track: 'buzz' }] },
    { id: 'rest', effects: [{ kind: 'turn' }] },
  ],
  audio,
}

const settings = [
  { id: 'musicVolume', label: 'Music', affects: 'ui' as const, kind: 'range' as const, min: 0, max: 100, default: 80 },
  { id: 'muted', label: 'Mute', affects: 'ui' as const, kind: 'toggle' as const, default: false },
]

function baseOf() {
  const { scenes: _s, items: _i, storylines: _t, activities: _a, stats: _st, introScene: _in, actions: _ac, ...base } = fixture()
  return { ...base, settings }
}

function game(packs: Pack[] = [house]) {
  const loaded = loadGame(packs, { ...baseOf(), plugins: [street] })
  return loaded
}

function play(state: GameState, g: ReturnType<typeof game>['game'], ...commands: Parameters<typeof apply>[2][]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.refused).toBeUndefined()
    state = out.state
  }
  return state
}

const music = (state: GameState, g: ReturnType<typeof game>['game']) => view(state, g).audio.channels.music.track

describe('audio', () => {
  it('loads with nothing wrong, and puts sound files under audio/', () => {
    expect(game().problems).toEqual([])
    expect(audioSrc('calm.ogg')).toBe('audio/calm.ogg')
    expect(audioSrc('/audio/music/calm.mp3')).toBe('audio/music/calm.mp3')
    expect(audioSrc('traffic')).toBe('audio/traffic.ogg')
  })

  it('merges a game’s channels over the defaults, field by field', () => {
    const { game: g } = game()
    expect(audioChannels(g)).toEqual({
      music: { mode: 'background', crossfade: 1000, volume: 'musicVolume' },
      ambience: { mode: 'background', crossfade: 600 },
      sfx: { mode: 'cue', duck: { under: ['voice'], to: 0.3 } },
      voice: { mode: 'cue' },
    })
  })

  it('shows every channel with its settings, and an empty view for a game without audio', () => {
    const { game: g } = game()
    const shown = view(startingState(g), g).audio
    expect(shown.muteSetting).toBe('muted')
    expect(shown.channels.music).toEqual({
      mode: 'background',
      track: 'calm',
      src: 'audio/calm.ogg',
      loop: true,
      volume: 1,
      volumeSetting: 'musicVolume',
      crossfade: 1000,
      duck: null,
    })
    expect(shown.channels.sfx).toMatchObject({ mode: 'cue', track: null, src: null, crossfade: 0, duck: { under: ['voice'], to: 0.3 } })
    expect(view(startingState(fixture()), fixture()).audio).toEqual({ channels: {}, cues: [], muteSetting: null })
  })

  describe('chooses each background channel', () => {
    it('by the open scene first, then an effect, then a plugin, then the game’s default', () => {
      const { game: g } = game()
      let state: GameState = { ...startingState(g), kv: { at: 'house' } }
      expect(music(state, g)).toBe('calm')
      // A plugin: the street silences the music and hums.
      state = { ...state, kv: { at: 'street' } }
      expect(music(state, g)).toBeNull()
      expect(view(state, g).audio.channels.ambience.track).toBe('traffic')
      // An effect wins over the plugin.
      state = play(state, g, { type: 'activity', id: 'radio' })
      expect(music(state, g)).toBe('radio')
      // The open scene wins over the effect, and lets it back when it closes.
      state = play(state, g, { type: 'scene', id: 'door' })
      expect(view(state, g).audio.channels.music).toMatchObject({ track: 'tense', src: 'audio/music/tense.mp3', volume: 0.6 })
      state = play(state, g, { type: 'choose', id: 'leave' })
      expect(music(state, g)).toBe('radio')
    })

    it('with null as silence at any level, and a channel the scene leaves out passed down', () => {
      const { game: g } = game()
      const state = { ...startingState(g), kv: { at: 'house' } }
      expect(music(play(state, g, { type: 'scene', id: 'quiet' }), g)).toBeNull()
      // The storm's scene names only the ambience; the music is still the default.
      const storm = play(state, g, { type: 'scene', id: 'storm' })
      expect(view(storm, g).audio.channels.ambience).toMatchObject({ track: 'rain', loop: false })
      expect(music(storm, g)).toBe('calm')
      const silenced = play(state, g, { type: 'activity', id: 'silence' })
      expect(music(silenced, g)).toBeNull()
      expect(silenced.audio.channels).toEqual({ music: null })
      // Left out, the track hands the channel back.
      const handed = play(silenced, g, { type: 'activity', id: 'default' })
      expect(handed.audio.channels).toEqual({})
      expect(music(handed, g)).toBe('calm')
    })
  })

  describe('effects', () => {
    it('keep a sound as a cue with a running count, the last 20 only', () => {
      const { game: g } = game()
      let state: GameState = { ...startingState(g), kv: { at: 'house' } }
      state = play(state, g, { type: 'activity', id: 'buzz' })
      expect(state.audio.cues).toEqual([{ seq: 1, track: 'buzz' }])
      expect(view(state, g).audio.cues).toEqual([
        { key: `cue:${state.seed}:1`, channel: 'sfx', track: 'buzz', src: 'audio/buzz.ogg', volume: 0.5 },
      ])
      for (let n = 0; n < 24; n += 1) state = play(state, g, { type: 'activity', id: 'buzz' })
      expect(state.audio.seq).toBe(25)
      expect(state.audio.cues).toHaveLength(20)
      expect(state.audio.cues[0].seq).toBe(6)
    })
  })

  describe('markup', () => {
    it('reads [[sound:id]] on its own line as a sound beat, and [[voice:id]] after a spoken line as its voice', () => {
      const beats = parseBeats('The phone buzzes.\n\n[[sound:buzz]]\n\nAva: "Morning!" [[voice:ava.morning]]\n\n"Morning." [[voice:you.morning]]')
      expect(beats).toEqual([
        { kind: 'text', text: 'The phone buzzes.' },
        { kind: 'sound', track: 'buzz' },
        { kind: 'say', who: 'character', text: 'Morning!', voice: 'ava.morning' },
        { kind: 'say', who: 'player', text: 'Morning.', voice: 'you.morning' },
      ])
    })

    it('leaves [[voice:id]] that does not end a spoken line as it is', () => {
      expect(parseBeats('The kettle clicks. [[voice:ava.morning]]')).toEqual([{ kind: 'text', text: 'The kettle clicks. [[voice:ava.morning]]' }])
    })
  })

  describe('cue keys', () => {
    it('give a scene’s sound and voice beats, in beat order, voices on the voice channel', () => {
      const { game: g } = game()
      const state = play({ ...startingState(g), kv: { at: 'house' } }, g, { type: 'scene', id: 'door' })
      const { cues } = view(state, g).audio
      expect(cues).toEqual([
        { key: `scene:${state.seed}:1:1:knock`, channel: 'sfx', track: 'knock', src: 'audio/knock.ogg', volume: 1 },
        { key: `scene:${state.seed}:1:2:ava.morning`, channel: 'voice', track: 'ava.morning', src: 'audio/voice/ava-morning.ogg', volume: 1 },
      ])
    })

    it('are the same across view calls, a choice that stays in the scene, and a reload', () => {
      const { game: g } = game()
      const state = play({ ...startingState(g), kv: { at: 'house' } }, g, { type: 'scene', id: 'door' })
      const keys = (s: GameState) => view(s, g).audio.cues.map((cue) => cue.key)
      expect(keys(state)).toEqual(keys(state))
      const again = play(state, g, { type: 'choose', id: 'again' })
      // The scene's beats keep their keys; the buzz is new.
      expect(keys(again)).toEqual([`cue:${state.seed}:1`, ...keys(state)])
      expect(keys(loadState(JSON.parse(JSON.stringify(again)), g) as GameState)).toEqual(keys(again))
    })

    it('are new each time the scene is entered', () => {
      const { game: g } = game()
      const first = play({ ...startingState(g), kv: { at: 'house' } }, g, { type: 'scene', id: 'door' })
      const second = play(first, g, { type: 'choose', id: 'open' }, { type: 'scene', id: 'door' })
      const keys = (s: GameState) => view(s, g).audio.cues.map((cue) => cue.key)
      expect(keys(second)).toHaveLength(2)
      expect(keys(second).some((key) => keys(first).includes(key))).toBe(false)
    })
  })

  describe('playlists', () => {
    it('play in order once, or shuffled from the seed and the turn they started, replaying the same', () => {
      const { game: g } = game()
      const album = { ...g, audio: { ...g.audio!, default: { music: 'album' } } }
      expect(view(startingState(album), album).audio.channels.music).toMatchObject({
        track: 'album',
        src: 'audio/a.ogg',
        loop: false,
        playlist: { tracks: ['a', 'b'], srcs: ['audio/a.ogg', 'audio/b.ogg'], volumes: [1, 1], order: 'inOrder' },
      })

      const start = { ...startingState(g, { seed: 7 }), kv: { at: 'house' } }
      const commands = [{ type: 'activity', id: 'rest' }, { type: 'activity', id: 'radio' }, { type: 'activity', id: 'rest' }] as const
      const played = play(start, g, ...commands)
      const order = view(played, g).audio.channels.music.playlist!
      expect(order.order).toBe('shuffle')
      expect([...order.tracks].sort()).toEqual(['a', 'b', 'c', 'd'])
      // Started on turn 1, and still drawn from turn 1 after a turn has passed.
      expect(played.audio.started.music).toEqual({ track: 'radio', turn: 1 })
      expect(view(replay(g, { game: g.id, start, commands: [...commands] }) as GameState, g).audio.channels.music.playlist).toEqual(order)
      // Another seed, another order.
      const others = [1, 2, 3, 4, 5].map((seed) => view(play({ ...start, seed }, g, ...commands), g).audio.channels.music.playlist!.tracks.join())
      expect(others.some((tracks) => tracks !== order.tracks.join())).toBe(true)
    })
  })

  describe('checks', () => {
    const broken: Pack = {
      id: 'broken',
      schema: SCHEMA,
      prose: { 'bad.text': 'Hush.\n\n[[sound:calm]]\n\n"Hi." [[voice:nobody]]', 'bad#go': 'Go' },
      scenes: [{ id: 'bad', audio: { music: 'knock', sfx: 'calm', stereo: 'calm' }, body: [{ text: 'bad.text' }], choices: [{ id: 'go', effects: [{ kind: 'sound', track: 'radio' }] }] }],
      activities: [{ id: 'bang', effects: [{ kind: 'sound', track: 'bang' }, { kind: 'audio', channel: 'music', to: 'gone' }] }],
      audio: {
        tracks: {
          hiss: { src: 'hiss.ogg', channel: 'radio', volume: 2 },
          mix: { playlist: ['calm', 'knock', 'nothing'] },
        },
        channels: { voice: { mode: 'cue', volume: 'muted', duck: { under: ['radio'], to: 0.2 } } },
        mute: 'musicVolume',
        default: { ambience: 'knock' },
      },
    }

    it('report every audio problem in the loader, against the pack it came from', () => {
      const problems = game([house, broken]).problems.map(describeProblem)
      expect(problems).toEqual([
        'broken · scene bad · "radio" is a playlist, not a sound',
        'broken · scene bad · track "knock" is a sound on channel "sfx", not background audio',
        'broken · scene bad · channel "sfx" plays sounds, not background audio',
        'broken · scene bad · unknown channel "stereo"',
        'broken · activity bang · unknown track "bang"',
        'broken · activity bang · unknown track "gone"',
        'broken · track hiss · on undeclared channel "radio"',
        'broken · track hiss · volume is not between 0 and 1',
        'broken · track mix · track "knock" is a sound on channel "sfx", not background audio',
        'broken · track mix · unknown track "nothing"',
        'broken · channel voice · setting "muted" is not a ui range setting',
        'broken · channel voice · ducks under unknown channel "radio"',
        'broken · audio · setting "musicVolume" is not a ui toggle setting',
        'broken · audio default · track "knock" is a sound on channel "sfx", not background audio',
        'broken · prose bad.text · track "calm" is background audio on channel "music", not a sound',
        'broken · prose bad.text · unknown track "nobody"',
      ])
    })

    it('report a mute or volume setting the game does not have', () => {
      const pack: Pack = { id: 'p', schema: SCHEMA, audio: { tracks: {}, channels: { music: { mode: 'background', volume: 'loud' } }, mute: 'quiet' } }
      expect(loadGame([pack], baseOf()).problems.map(describeProblem)).toEqual([
        'p · channel music · unknown setting "loud"',
        'p · audio · unknown setting "quiet"',
      ])
    })

    it('report the same for the game, checked again', () => {
      const { game: g } = game([house, broken])
      expect(problemsOf(g)).toEqual(
        expect.arrayContaining([
          'track hiss: on undeclared channel "radio"',
          'track mix: unknown track "nothing"',
          'channel voice: ducks under unknown channel "radio"',
          'audio: setting "musicVolume" is not a ui toggle setting',
          'audio default: track "knock" is a sound on channel "sfx", not background audio',
          'scene bad: unknown channel "stereo"',
          'prose bad.text: track "calm" is background audio on channel "music", not a sound',
          'prose bad.text: unknown track "nobody"',
          'scene bad: "radio" is a playlist, not a sound',
          'activity bang: unknown track "bang"',
          'activity bang: unknown track "gone"',
        ]),
      )
      expect(problemsOf(game().game)).toEqual([])
    })
  })

  describe('saves', () => {
    it('carry a version-9 save forward with nothing played and no showings', () => {
      const { game: g } = game()
      const { audio: _audio, media: _media, ...now } = startingState(g)
      expect(loadState({ ...now, version: 9 }, g)).toEqual({ ...now, version: SAVE_VERSION, audio: { channels: {}, cues: [], seq: 0, shown: 0, started: {} }, media: { picks: {} } })
    })

    it('keep the effects’ channels and cues', () => {
      const { game: g } = game()
      const state = play({ ...startingState(g), kv: { at: 'house' } }, g, { type: 'activity', id: 'radio' }, { type: 'activity', id: 'buzz' })
      expect((loadState(JSON.parse(JSON.stringify(state)), g) as GameState).audio).toEqual(state.audio)
    })
  })
})
