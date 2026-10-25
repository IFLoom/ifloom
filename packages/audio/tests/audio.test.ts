import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRunner, loadGame, memoryDriver, profile, startingState, type Game, type GameAudio, type Content } from '@ifloom/engine'
import { startAudio, type AudioLike, type AudioOptions } from '../src/index.ts'

/** An audio element that plays nothing, and says what it was told. */
class FakeAudio implements AudioLike {
  volume = 1
  loop = false
  currentTime = 0
  ended = false
  playing = false
  onended: ((event: Event) => void) | null = null
  src: string
  constructor(src: string) {
    this.src = src
  }
  play() {
    this.playing = true
    this.ended = false
    return Promise.resolve()
  }
  pause() {
    this.playing = false
  }
  /** The file runs out. */
  finish() {
    this.playing = false
    this.ended = true
    this.onended?.(new Event('ended'))
  }
}

const audio: GameAudio = {
  tracks: {
    calm: { src: 'calm.ogg', channel: 'music' },
    busy: { src: 'busy.ogg', channel: 'music', volume: 0.5 },
    a: { src: 'a.ogg', channel: 'music' },
    b: { src: 'b.ogg', channel: 'music' },
    c: { src: 'c.ogg', channel: 'music' },
    radio: { playlist: ['a', 'b', 'c'], order: 'loop' },
    album: { playlist: ['a', 'b'], order: 'inOrder' },
    murmur: { src: 'cafe-murmur.ogg', channel: 'ambience' },
    knock: { src: 'knock.ogg' },
    'ava.hello': { src: 'voice/ava-hello.ogg', channel: 'voice' },
    'ava.bye': { src: 'voice/ava-bye.ogg', channel: 'voice' },
  },
  channels: { music: { mode: 'background', volume: 'musicVolume' } },
  mute: 'muted',
  default: { music: 'calm' },
}

const flat: Content = {
  name: 'flat',
  prose: {
    hall: 'The hall of the flat.',
    cafe: 'Ava is behind the counter.\n\nAva: "Hello!" [[voice:ava.hello]]\n\nAva: "See you." [[voice:ava.bye]]',
  },
  scenes: [
    {
      id: 'hall',
      body: [{ prose: 'hall' }],
      choices: [
        { id: 'knock', label: 'Knock', effects: [{ sound: 'knock' }] },
        { id: 'cafe', label: 'Go to the café', effects: [{ scene: 'cafe' }] },
        { id: 'radio', label: 'Put the radio on', effects: [{ audio: 'music', to: 'radio' }] },
        { id: 'album', label: 'Put the album on', effects: [{ audio: 'music', to: 'album' }] },
        { id: 'again', label: 'Look around', effects: [] },
      ],
    },
    {
      id: 'cafe',
      audio: { music: 'busy', ambience: 'murmur' },
      body: [{ prose: 'cafe' }],
      choices: [{ id: 'leave', label: 'Leave', effects: [{ scene: 'hall' }] }],
    },
  ],
  audio,
}

function makeGame(change: (game: Game) => Game = (game) => game): Game {
  const { game, problems } = loadGame(
    [
      {
        name: 'base',
        settings: [
          { id: 'musicVolume', label: 'Music', affects: 'ui', type: 'range', min: 0, max: 100, default: 80 },
          { id: 'muted', label: 'Mute', affects: 'ui', type: 'toggle', default: false },
        ],
      },
      { name: 'base', introScene: 'hall' },
      flat,
    ],
    {
      id: 'flat',
      title: 'The Flat',
    },
  )
  expect(problems).toEqual([])
  return change(game)
}

function setup(game = makeGame()) {
  const store = profile(game, memoryDriver())
  const runner = createRunner(game, startingState(game, { seed: 7 }), { profile: store, history: { depth: 10 } })
  const made: FakeAudio[] = []
  const lines: string[] = []
  const root = new EventTarget()
  const options: AudioOptions = {
    createAudio: (src) => {
      const el = new FakeAudio(src)
      made.push(el)
      return el
    },
    log: (line) => lines.push(line),
    root,
  }
  const playing = () => made.filter((el) => el.playing).map((el) => el.src)
  const choose = (id: string) => expect(runner.apply({ type: 'choose', id }).ok).toBe(true)
  const click = () => root.dispatchEvent(new Event('pointerdown'))
  const last = (src: string) => made.filter((el) => el.src === src).at(-1)!
  return { game, runner, store, made, lines, root, options, playing, choose, click, last }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('startAudio', () => {
  it('plays nothing until the first click or key press, then starts what is due', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.choose('knock')
    vi.advanceTimersByTime(2000)
    expect(t.made).toEqual([])
    t.root.dispatchEvent(new Event('keydown'))
    expect(t.playing()).toEqual(['audio/calm.ogg', 'audio/knock.ogg'])
    expect(t.lines).toContain('unlocked')
    player()
  })

  it('unlocks on demand', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    player.unlock()
    expect(t.playing()).toEqual(['audio/calm.ogg'])
    player()
  })

  it('crossfades when the file changes, and leaves it alone when it does not', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.click()
    const calm = t.last('audio/calm.ogg')
    vi.advanceTimersByTime(1000)
    expect(calm.volume).toBeCloseTo(0.8)
    expect(calm.loop).toBe(true)

    // A choice that changes nothing on the music channel doesn't restart it.
    t.choose('again')
    t.choose('knock')
    expect(t.made.filter((el) => el.src === 'audio/calm.ogg')).toHaveLength(1)

    t.choose('cafe')
    const busy = t.last('audio/busy.ogg')
    expect(t.lines).toContain('music: crossfade to audio/busy.ogg over 1000 ms')
    vi.advanceTimersByTime(500)
    expect(calm.playing).toBe(true)
    expect(calm.volume).toBeGreaterThan(0)
    expect(calm.volume).toBeLessThan(0.8)
    expect(busy.volume).toBeGreaterThan(0)
    vi.advanceTimersByTime(600)
    expect(calm.playing).toBe(false)
    expect(busy.volume).toBeCloseTo(0.5 * 0.8)
    expect(t.playing()).toContain('audio/cafe-murmur.ogg')
    player()
  })

  it('plays a playlist in order, and wraps round unless it plays once', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.click()
    t.choose('radio')
    const order = () => t.made.filter((el) => el.src !== 'audio/calm.ogg').map((el) => el.src)
    expect(order()).toEqual(['audio/a.ogg'])
    expect(t.last('audio/a.ogg').loop).toBe(false)
    t.last('audio/a.ogg').finish()
    t.last('audio/b.ogg').finish()
    t.last('audio/c.ogg').finish()
    expect(order()).toEqual(['audio/a.ogg', 'audio/b.ogg', 'audio/c.ogg', 'audio/a.ogg'])

    t.choose('album')
    vi.advanceTimersByTime(2000)
    t.last('audio/a.ogg').finish()
    t.last('audio/b.ogg').finish()
    expect(order().slice(4)).toEqual(['audio/a.ogg', 'audio/b.ogg'])
    expect(t.lines).toContain('music: playlist finished')
    expect(t.playing()).toEqual([])
    player()
  })

  it('plays each cue once, and none of the old ones after a reload', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.click()
    t.choose('knock')
    t.choose('again')
    t.choose('knock')
    expect(t.made.filter((el) => el.src === 'audio/knock.ogg')).toHaveLength(2)
    expect(t.lines.filter((line) => line.startsWith('sfx: play cue:7:'))).toEqual(['sfx: play cue:7:1 knock', 'sfx: play cue:7:2 knock'])
    player()

    // A new page on the same state: the same keys, already heard.
    const before = t.made.length
    const again = startAudio(t.runner, t.options)
    again.unlock()
    expect(t.made.slice(before).map((el) => el.src)).toEqual(['audio/calm.ogg'])
    again()
  })

  it('plays nothing kept in a state it jumps to, such as an undo', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.click()
    t.choose('knock')
    t.choose('again')
    t.runner.undo()
    t.runner.redo()
    expect(t.made.filter((el) => el.src === 'audio/knock.ogg')).toHaveLength(1)
    player()
  })

  it('queues voices, one after another, while sounds overlap', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.click()
    t.choose('cafe')
    expect(t.playing().filter((src) => src.includes('voice'))).toEqual(['audio/voice/ava-hello.ogg'])
    t.last('audio/voice/ava-hello.ogg').finish()
    expect(t.playing().filter((src) => src.includes('voice'))).toEqual(['audio/voice/ava-bye.ogg'])
    expect(t.lines.filter((line) => line.startsWith('voice:'))).toEqual([
      'voice: queue scene:7:2:1:ava.hello ava.hello',
      'voice: play scene:7:2:1:ava.hello ava.hello',
      'voice: queue scene:7:2:2:ava.bye ava.bye',
      'voice: play scene:7:2:2:ava.bye ava.bye',
    ])
    // The same line again, through the replay a UI offers.
    player.play('audio/voice/ava-hello.ogg', 'voice')
    expect(t.playing().filter((src) => src.includes('voice'))).toEqual(['audio/voice/ava-bye.ogg'])
    t.last('audio/voice/ava-bye.ogg').finish()
    expect(t.last('audio/voice/ava-hello.ogg').playing).toBe(true)
    player()
  })

  it('sets volumes from the settings, the defaults, and mute', async () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.click()
    vi.advanceTimersByTime(1000)
    const calm = t.last('audio/calm.ogg')
    // Nothing stored yet: the setting's default, 80 of 0 to 100.
    expect(calm.volume).toBeCloseTo(0.8)
    t.runner.setSetting('musicVolume', 25)
    await t.runner.settled()
    expect(calm.volume).toBeCloseTo(0.25)
    t.runner.setSetting('muted', true)
    await t.runner.settled()
    expect(calm.volume).toBe(0)
    t.runner.setSetting('muted', false)
    await t.runner.settled()
    expect(calm.volume).toBeCloseTo(0.25)
    player()

    // A new player reads what's stored.
    const again = startAudio(t.runner, t.options)
    again.unlock()
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.last('audio/calm.ogg').volume).toBeCloseTo(0.25)
    again()
  })

  it('plays at full volume with no profile and no settings', () => {
    const game = makeGame((game) => ({ ...game, settings: [], audio: { ...game.audio!, channels: {}, mute: undefined } }))
    const runner = createRunner(game, startingState(game, { seed: 7 }))
    const made: FakeAudio[] = []
    const player = startAudio(runner, { createAudio: (src) => (made.push(new FakeAudio(src)), made.at(-1)!), root: new EventTarget() })
    player.unlock()
    vi.advanceTimersByTime(1000)
    expect(made[0].volume).toBe(1)
    player()
  })

  it('ducks only a channel that asks to', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.click()
    t.choose('cafe')
    vi.advanceTimersByTime(1000)
    // Music doesn't duck under the voice unless it says so.
    expect(t.last('audio/busy.ogg').volume).toBeCloseTo(0.4)
    expect(t.lines.some((line) => line.includes('duck'))).toBe(false)
    player()

    const d = setup(
      makeGame((game) => ({
        ...game,
        audio: { ...game.audio!, channels: { music: { mode: 'background', volume: 'musicVolume', duck: { under: ['voice'], to: 0.5 } } } },
      })),
    )
    const ducking = startAudio(d.runner, d.options)
    d.click()
    d.choose('cafe')
    vi.advanceTimersByTime(1000)
    expect(d.lines).toContain('music: duck to 0.5')
    expect(d.last('audio/busy.ogg').volume).toBeCloseTo(0.2)
    d.last('audio/voice/ava-hello.ogg').finish()
    d.last('audio/voice/ava-bye.ogg').finish()
    vi.advanceTimersByTime(400)
    expect(d.last('audio/busy.ogg').volume).toBeCloseTo(0.4)
    ducking()
  })

  it('notes a refused play quietly and carries on', async () => {
    const t = setup()
    const player = startAudio(t.runner, {
      ...t.options,
      createAudio: (src) => {
        const el = new FakeAudio(src)
        el.play = () => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }))
        t.made.push(el)
        return el
      },
    })
    t.click()
    t.choose('cafe')
    await vi.advanceTimersByTimeAsync(10)
    expect(t.lines).toContain('music: play refused for audio/calm.ogg (NotAllowedError)')
    // The refused voice doesn't hold up the next one.
    expect(t.made.map((el) => el.src)).toContain('audio/voice/ava-bye.ogg')
    player()
  })

  it('tries refused music again on the next click', async () => {
    const t = setup()
    let allowed = false
    const player = startAudio(t.runner, {
      ...t.options,
      createAudio: (src) => {
        const el = new FakeAudio(src)
        const play = el.play.bind(el)
        el.play = () => (allowed ? play() : Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })))
        t.made.push(el)
        return el
      },
    })
    player.unlock()
    await vi.advanceTimersByTimeAsync(10)
    expect(t.playing()).toEqual([])
    allowed = true
    t.click()
    expect(t.playing()).toEqual(['audio/calm.ogg'])
    expect(t.lines).toContain('music: try audio/calm.ogg again')
    player()
  })

  it('stops listening and pauses everything on stop()', () => {
    const t = setup()
    const player = startAudio(t.runner, t.options)
    t.click()
    t.choose('cafe')
    expect(t.playing().length).toBeGreaterThan(0)
    player()
    expect(t.playing()).toEqual([])
    const count = t.made.length
    t.choose('leave')
    t.choose('knock')
    vi.advanceTimersByTime(2000)
    expect(t.made.length).toBe(count)
  })
})
