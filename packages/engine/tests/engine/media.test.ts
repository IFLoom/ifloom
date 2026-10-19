import { describe, expect, it } from 'vitest'
import { loadGame, type Content } from '../../src/loader.ts'
import { apply } from '../../src/reduce.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { view } from '../../src/view.ts'
import { replay } from '../../src/runner.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { artSrc, mediaKind, parseBeats } from '../../src/sceneBody.ts'
import { pickKey, poolCandidates } from '../../src/features/media.ts'
import { SAVE_VERSION, type Command, type GameState } from '../../src/types.ts'
import type { Game, Scene } from '../../src/game.ts'
import type { DataScene } from '../../src/scene.ts'
import { unwrap } from '../fixtures/result.ts'

const video = { autoplay: true, loop: true, muted: true, controls: false }

describe('picture and video markup', () => {
  it('plays a video like a GIF unless its kv say otherwise', () => {
    expect(parseBeats('[[video:clips/kettle]]')).toEqual([{ kind: 'video', src: 'art/clips/kettle.mp4', size: 'inline', ...video }])
    expect(parseBeats('[[widevideo:clips/rain.webm|controls|once|sound|poster=clips/rain-still|Rain on the window]]')).toEqual([
      {
        kind: 'video',
        src: 'art/clips/rain.webm',
        poster: 'art/clips/rain-still.jpg',
        alt: 'Rain on the window',
        size: 'wide',
        // With controls it waits for the player to press play.
        autoplay: false,
        loop: false,
        muted: false,
        controls: true,
      },
    ])
  })

  it('draws a video file as a video, whichever markup names it', () => {
    expect(parseBeats('[[img:clips/kettle.mp4|once]]')[0]).toMatchObject({ kind: 'video', src: 'art/clips/kettle.mp4', loop: false })
    expect(parseBeats('[[wide:street.gif]]')[0]).toMatchObject({ kind: 'image', src: 'art/street.gif', size: 'wide' })
  })

  it('keeps the picture markup as it was: alt text and rot', () => {
    expect(parseBeats('[[img:cafe/cup|rot|A cup of tea]]')).toEqual([
      { kind: 'image', src: 'art/cafe/cup.jpg', alt: 'A cup of tea', size: 'inline', rotate: true },
    ])
  })

  it('leaves out a pool nobody resolved, rather than drawing a broken picture', () => {
    expect(parseBeats('Before.\n\n[[img:@door|night]]\n\nAfter.')).toEqual([
      { kind: 'text', text: 'Before.' },
      { kind: 'text', text: 'After.' },
    ])
  })

  it('knows a video by its extension, and gives a bare video name .mp4', () => {
    expect(mediaKind('clips/rain.webm')).toBe('video')
    expect(mediaKind('art/street.mp4')).toBe('video')
    expect(mediaKind('street.webp')).toBe('image')
    expect(artSrc('clips/rain', 'video')).toBe('art/clips/rain.mp4')
    expect(artSrc('clips/rain')).toBe('art/clips/rain.jpg')
  })
})

/** The flat, the high street and a café, with a pool of front doors and a layered stage. */
const pools = {
  door: [
    { src: 'door/blue-day.jpg', tags: ['blue', 'day'] },
    { src: 'door/blue-night.jpg', tags: ['blue', 'night'] },
    { src: 'door/red-day.jpg', tags: ['red', 'day'] },
    { src: 'door/red-night.jpg', tags: ['red', 'night'] },
  ],
  window: [{ src: 'flat/window-rain.mp4', tags: ['rain'] }],
}

function town(scenes: (Scene | DataScene)[], extra: Partial<Content> = {}) {
  const pack: Content = {
    name: 'town',
    media: { pools },
    prose: {
      'flat.wake': 'You wake to rain.',
      'flat.kettle': 'The kettle clicks off.',
      'flat.door': 'Someone is at the door.\n\n[[img:@door|red,night|The front door]]',
      'flat.out': 'Out you go.',
      'flat#leave': 'Leave',
      'flat#phone': 'Answer the phone',
      'flat#tea': 'Make tea',
      'doorstep#leave': 'Leave',
    },
    activities: [{ id: 'nap' }, { id: 'jog', blocked: [{ when: { not: { kv: 'rested' } }, reason: 'Too tired.' }] }],
    scenes,
    ...extra,
  }
  const loaded = loadGame([pack], { id: 'town', title: 'Small Town' })
  return loaded
}

function game(scenes: (Scene | DataScene)[], extra: Partial<Content> = {}): Game {
  const loaded = town(scenes, extra)
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const open = (g: Game, id: string, seed = 7): GameState => ({ ...startingState(g, { seed }), sceneId: id })

describe('media in a data scene’s body', () => {
  const flat: DataScene = {
    id: 'flat',
    body: [
      { media: { src: 'flat/morning', at: 'lead' } },
      { text: 'flat.wake' },
      { media: { src: 'flat/kettle.mp4', alt: 'The kettle', size: 'wide' } },
      { text: 'flat.kettle' },
      { media: { src: 'flat/mug', at: 'end' } },
      { media: { src: 'flat/cat' }, when: { kv: 'cat' } },
    ],
    choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
  }

  it('sits where it is written, with a lead still first and an end one last', () => {
    const g = game([flat])
    expect(view(open(g, 'flat'), g).scene.beats).toEqual([
      { kind: 'image', src: 'art/flat/morning.jpg', size: 'inline' },
      { kind: 'text', text: 'You wake to rain.' },
      { kind: 'video', src: 'art/flat/kettle.mp4', alt: 'The kettle', size: 'wide', ...video },
      { kind: 'text', text: 'The kettle clicks off.' },
      { kind: 'image', src: 'art/flat/mug.jpg', size: 'inline' },
    ])
  })

  it('writes in-place media into the body as the markup that draws it', () => {
    const g = game([flat])
    expect(view(open(g, 'flat'), g).scene.body).toBe('You wake to rain.\n\n[[widevideo:flat/kettle.mp4|The kettle]]\n\nThe kettle clicks off.')
  })

  it('leaves out a block whose condition fails', () => {
    const g = game([flat])
    const state = { ...open(g, 'flat'), kv: { cat: true } }
    expect(view(state, g).scene.beats.at(-2)).toEqual({ kind: 'image', src: 'art/flat/cat.jpg', size: 'inline' })
  })

  it('takes video kv on a block', () => {
    const g = game([{ id: 'flat', body: [{ media: { src: 'flat/kettle', video: true, controls: true, poster: 'flat/kettle-still' } }], choices: [] }])
    expect(view(open(g, 'flat'), g).scene.beats).toEqual([
      {
        kind: 'video',
        src: 'art/flat/kettle.mp4',
        poster: 'art/flat/kettle-still.jpg',
        size: 'inline',
        autoplay: false,
        loop: true,
        muted: true,
        controls: true,
      },
    ])
  })
})

describe('pools', () => {
  const doorstep: DataScene = {
    id: 'doorstep',
    body: [{ text: 'flat.door' }, { media: { pool: 'door', tags: ['blue', 'red'] } }, { media: { pool: 'window', at: 'lead' } }],
    choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
  }

  it('prefer the files with every tag, then drop tags from the end of the request', () => {
    const g = game([doorstep], {})
    const srcs = (tags: string[]) => poolCandidates(g, 'door', tags).map((file) => file.src)
    expect(srcs(['red', 'night'])).toEqual(['door/red-night.jpg'])
    // Nothing is blue and green: drop green, and every blue door will do.
    expect(srcs(['blue', 'green'])).toEqual(['door/blue-day.jpg', 'door/blue-night.jpg'])
    // Nothing is green at all: no tags, any door.
    expect(srcs(['green', 'blue'])).toHaveLength(4)
    expect(srcs([])).toHaveLength(4)
  })

  it('resolve in markup and in blocks, each pick kept per scene and block', () => {
    const g = game([doorstep], {})
    const beats = view(open(g, 'doorstep'), g).scene.beats
    expect(beats[0]).toEqual({ kind: 'video', src: 'art/flat/window-rain.mp4', size: 'inline', ...video })
    expect(beats[2]).toEqual({ kind: 'image', src: 'art/door/red-night.jpg', alt: 'The front door', size: 'inline' })
    expect(beats[3]).toMatchObject({ kind: 'image', src: expect.stringMatching(/^art\/door\/blue-(day|night)\.jpg$/) })
  })

  it('are drawn from the seed: the same save always gets the same file', () => {
    const g = game([doorstep], {})
    const pickFor = (seed: number) => view(open(g, 'doorstep', seed), g).scene.beats[3]
    expect(pickFor(7)).toEqual(pickFor(7))
    const seen = new Set(Array.from({ length: 20 }, (_, seed) => (pickFor(seed) as { src: string }).src))
    expect(seen).toEqual(new Set(['art/door/blue-day.jpg', 'art/door/blue-night.jpg']))
  })

  it('are recorded after a command, under pool, tags, owner and slot, and the view then reads them', () => {
    const g = game([doorstep], { activities: [{ id: 'knock', effects: [{ kind: 'scene', scene: 'doorstep' }] }] })
    const before = startingState(g, { seed: 7 })
    expect(before.media).toEqual({ picks: {} })
    const after = apply(before, g, { type: 'activity', id: 'knock' }).state
    expect(Object.keys(after.media.picks).sort()).toEqual(['door|blue,red|doorstep|1', 'door|red,night|doorstep|0.0', 'window||doorstep|2'])
    expect(after.media.picks['door|red,night|doorstep|0.0']).toBe('door/red-night.jpg')
    expect(pickKey({ pool: 'door', tags: ['blue', 'red'], owner: 'doorstep', slot: '1' })).toBe('door|blue,red|doorstep|1')
    // What was recorded is what the screen showed before it was recorded.
    expect(view(after, g).scene.beats).toEqual(view({ ...after, media: { picks: {} } }, g).scene.beats)
  })

  it('stay the same across a reload, even once the pool has more files', () => {
    const g = game([doorstep], { activities: [{ id: 'knock', effects: [{ kind: 'scene', scene: 'doorstep' }] }] })
    const after = apply(startingState(g, { seed: 7 }), g, { type: 'activity', id: 'knock' }).state
    const shown = view(after, g).scene.beats[3]
    const loaded = unwrap(loadState(JSON.parse(JSON.stringify(after)), g))
    const more: Game = { ...g, media: { pools: { ...pools, door: [{ src: 'door/blue-dusk.jpg', tags: ['blue', 'red'] }, ...pools.door] } } }
    expect(view(loaded, more).scene.beats[3]).toEqual(shown)
    // A pick whose file has gone from the pool is drawn again.
    const fewer: Game = { ...g, media: { pools: { ...pools, door: [{ src: 'door/green.jpg', tags: ['blue'] }] } } }
    expect(view(loaded, fewer).scene.beats[3]).toMatchObject({ src: 'art/door/green.jpg' })
  })

  it('replay exactly', () => {
    const g = game([doorstep], { activities: [{ id: 'knock', effects: [{ kind: 'scene', scene: 'doorstep' }] }] })
    const start = startingState(g, { seed: 3 })
    const commands: Command[] = [
      { type: 'activity', id: 'knock' },
      { type: 'choose', id: 'leave' },
      { type: 'activity', id: 'knock' },
    ]
    let state = start
    for (const command of commands) state = apply(state, g, command).state
    const replayed = replay(g, { game: g.id, start, commands })
    expect(unwrap(replayed)).toEqual(state)
    expect(view(unwrap(replayed), g).scene.beats).toEqual(view(state, g).scene.beats)
  })

  it('resolve in a hand-built scene’s body and media, by position', () => {
    const porch: Scene = {
      id: 'porch',
      render: () => ({ body: 'The porch.\n\n[[wide:@door|blue,day]]', media: [{ pool: 'door', tags: ['red', 'day'], at: 'lead' }], choices: [] }),
    }
    const g = game([porch])
    const state = apply({ ...startingState(g), sceneId: null }, g, { type: 'scene', id: 'porch' }).state
    expect(view(state, g).scene.beats).toEqual([
      { kind: 'image', src: 'art/door/red-day.jpg', size: 'inline' },
      { kind: 'text', text: 'The porch.' },
      { kind: 'image', src: 'art/door/blue-day.jpg', size: 'wide' },
    ])
    expect(state.media.picks).toEqual({ 'door|blue,day|porch|body.0': 'door/blue-day.jpg', 'door|red,day|porch|media.0': 'door/red-day.jpg' })
  })
})

describe('the stage', () => {
  const flat: DataScene = {
    id: 'flat',
    stage: {
      aspect: '4/3',
      layers: [
        { id: 'room', src: 'flat/room' },
        { id: 'rain', pool: 'window', when: { kv: 'raining' } },
        { id: 'phone', src: 'flat/phone.png', when: { kv: 'ringing' } },
      ],
      hotspots: [
        { id: 'door', rect: [80, 20, 20, 80], label: 'The front door', choice: 'leave' },
        { id: 'kettle', rect: [10, 50, 10, 15], label: 'The kettle', choice: 'tea' },
        { id: 'phone', rect: [40, 60, 10, 10], label: 'The phone', choice: 'phone', layer: 'phone' },
        { id: 'jog', rect: [0, 0, 10, 10], label: 'Go for a jog', command: { type: 'activity', id: 'jog' } },
        { id: 'nap', rect: [0, 90, 10, 10], label: 'Nap', command: { type: 'activity', id: 'nap' }, when: { kv: 'tired' } },
      ],
    },
    body: [{ text: 'flat.wake' }],
    choices: [
      { id: 'leave', blocked: [{ when: { not: { kv: 'dressed' } }, reason: 'Get dressed first.' }], effects: [{ kind: 'scene', scene: null }] },
      { id: 'tea', when: { kv: 'kettle' }, effects: [] },
      { id: 'phone', effects: [] },
    ],
  }

  it('draws the layers whose conditions hold, and only the hotspots it can', () => {
    const g = game([flat])
    expect(view(open(g, 'flat'), g).scene.stage).toEqual({
      aspect: '4/3',
      layers: [{ id: 'room', src: 'art/flat/room.jpg' }],
      hotspots: [
        // A choice hotspot is the choice: its command, and why it can't be taken.
        { id: 'door', rect: [80, 20, 20, 80], label: 'The front door', command: { type: 'choose', id: 'leave' }, disabled: 'Get dressed first.' },
        // A command hotspot is worked out as an action's button is. Inside a scene, that is "finish first".
        { id: 'jog', rect: [0, 0, 10, 10], label: 'Go for a jog', command: { type: 'activity', id: 'jog' }, disabled: 'Finish this first.' },
      ],
    })
  })

  it('shows a layer and the hotspot tied to it once both can be', () => {
    const g = game([flat])
    const state = { ...open(g, 'flat'), kv: { raining: true, ringing: true, kettle: true, dressed: true } }
    const stage = view(state, g).scene.stage!
    expect(stage.layers).toEqual([
      { id: 'room', src: 'art/flat/room.jpg' },
      { id: 'rain', src: 'art/flat/window-rain.mp4', video },
      { id: 'phone', src: 'art/flat/phone.png' },
    ])
    expect(stage.hotspots.map((hotspot) => [hotspot.id, hotspot.disabled ?? null, hotspot.layer ?? null])).toEqual([
      ['door', null, null],
      ['kettle', null, null],
      ['phone', null, 'phone'],
      ['jog', 'Finish this first.', null],
    ])
  })

  it('is null for a scene without one, and while no scene is open', () => {
    const g = game([flat, { id: 'bare', body: [{ text: 'flat.out' }], choices: [] }])
    expect(view(open(g, 'bare'), g).scene.stage).toBeNull()
    expect(view({ ...startingState(g), sceneId: null }, g).scene.stage).toBeNull()
  })

  it('keeps stageImage as it was', () => {
    const portrait: Scene = { id: 'portrait', render: () => ({ portrait: 'art/people/ava.jpg', choices: [] }) }
    const g = game([portrait])
    expect(view(open(g, 'portrait'), g).scene).toMatchObject({ stageImage: 'art/people/ava.jpg', stage: null })
  })
})

describe('media checks', () => {
  const what = (loaded: ReturnType<typeof town>) => loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)

  it('report unknown pools, tags no file has and empty pools', () => {
    const loaded = town([{ id: 'flat', body: [{ media: { pool: 'cupboard' } }, { media: { pool: 'door', tags: ['green'] } }, { media: {} }], choices: [] }], {
      media: { pools: { ...pools, shelf: [] } },
    })
    expect(what(loaded)).toEqual([
      'scene flat: media: unknown pool "cupboard"',
      'scene flat: media: no file in pool "door" is tagged "green"',
      'scene flat: media: needs a src or a pool',
      'pool shelf: a pool with no files',
    ])
  })

  it('report unknown kv and video kv on a picture in markup', () => {
    const loaded = town([], {
      prose: {
        'flat.a': '[[video:clips/rain|contols|Rain]]',
        'flat.b': '[[img:flat/mug|controls|A mug]]',
        'flat.c': '[[video:clips/rain|speed=2]]',
        'flat.d': '[[img:@cupboard]]',
        'flat.e': '[[video:clips/rain|rot]]',
      },
    })
    expect(what(loaded)).toEqual([
      'prose flat.a: "contols" and "Rain" can\'t all be alt text in [[video:clips/rain|contols|Rain]]; is one a misspelt flag?',
      'prose flat.b: video flag "controls" on a picture in [[img:flat/mug|controls|A mug]]',
      'prose flat.c: unknown flag "speed=2" in [[video:clips/rain|speed=2]]',
      'prose flat.d: unknown pool "cupboard"',
      'prose flat.e: flag "rot" turns a picture, not a video, in [[video:clips/rain|rot]]',
    ])
  })

  it('report a video flag on a picture block', () => {
    const loaded = town([{ id: 'flat', body: [{ media: { src: 'flat/mug', sound: true } }], choices: [] }])
    expect(what(loaded)).toEqual(['scene flat: media: video flag "sound" on a picture'])
  })

  it('report what is wrong with a stage’s hotspots and layers', () => {
    const loaded = town([
      {
        id: 'flat',
        stage: {
          layers: [
            { id: 'room', src: 'flat/room' },
            { id: 'room', pool: 'door', tags: ['green'] },
            { src: 'flat/mug', once: true },
          ],
          hotspots: [
            { id: 'door', rect: [80, 20, 30, 80], label: 'Door', choice: 'leave', command: { type: 'activity', id: 'nap' } },
            { id: 'door', rect: [0, 0, 10, 10], label: 'Door again', choice: 'sing' },
            { id: 'rug', rect: [0, 0, 10, 10], label: 'Rug' },
            { id: 'cat', rect: [-5, 0, 10, 10], label: 'Cat', command: { type: 'activity', id: 'stroke' }, layer: 'cat', when: { kv: 'cat' } },
          ],
        },
        body: [],
        choices: [{ id: 'leave', effects: [] }],
      },
    ])
    expect(what(loaded)).toEqual([
      'scene flat: stage layer room: two layers share this id',
      'scene flat: stage layer room: no file in pool "door" is tagged "green"',
      'scene flat: stage layer 2: video flag "once" on a picture',
      'scene flat: hotspot door: needs exactly one of command and choice',
      'scene flat: hotspot door: rect runs off the stage: x + width and y + height must be 100 or less',
      'scene flat: hotspot door: two hotspots share this id',
      'scene flat: hotspot door: no choice "sing" in this scene',
      'scene flat: hotspot rug: needs exactly one of command and choice',
      'scene flat: hotspot cat: unknown layer "cat"',
      'scene flat: hotspot cat: rect is outside 0 to 100',
      'scene flat: hotspot cat: unknown activity "stroke"',
    ])
  })

  it('are made for a hand-built game too, and its scenes rendered against probes', () => {
    const { game: g } = town(
      [
        {
          id: 'flat',
          body: [{ text: 'flat.bad' }, { media: { pool: 'cupboard' } }],
          stage: { layers: [], hotspots: [{ id: 'x', rect: [0, 0, 10, 10], label: 'X', choice: 'nope' }] },
          choices: [],
        },
        {
          id: 'porch',
          render: () => ({
            stage: {
              layers: [{ id: 'a', src: 'porch' }],
              hotspots: [{ id: 'y', rect: [0, 0, 50, 50], label: 'Y', layer: 'b', command: { type: 'scene', id: 'garden' } }],
            },
            choices: [],
          }),
        },
      ],
      { prose: { 'flat.bad': '[[img:@door|green]]' }, media: { pools: { ...pools, shelf: [] } } },
    )
    expect(problemsOf(g, [{ name: 'start', state: startingState(g) }])).toEqual([
      'scene flat: media: unknown pool "cupboard"',
      'scene flat: hotspot x: no choice "nope" in this scene',
      'pool shelf: a pool with no files',
      'prose flat.bad: no file in pool "door" is tagged "green"',
      'scene porch (start): hotspot y: unknown layer "b"',
      'scene porch (start): hotspot y: opens unknown scene "garden"',
    ])
  })
})

describe('saves', () => {
  it('carry a version-10 save forward with nothing picked', () => {
    const g = game([])
    const { media: _media, ...now } = startingState(g)
    expect(unwrap(loadState({ ...now, version: 10 }, g))).toEqual({ ...now, version: SAVE_VERSION, media: { picks: {} } })
  })
})
