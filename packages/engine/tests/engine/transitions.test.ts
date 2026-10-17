import { describe, expect, it } from 'vitest'
import { SCHEMA, loadGame, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { definePlugin } from '../../src/plugin.ts'
import { parseBeats } from '../../src/sceneBody.ts'
import { view } from '../../src/view.ts'
import type { Game } from '../../src/game.ts'
import type { DataScene } from '../../src/scene.ts'
import type { GameState } from '../../src/types.ts'

const door: DataScene = {
  id: 'door',
  transition: 'fade',
  body: [{ text: 'door.text' }],
  choices: [
    { id: 'in', effects: [{ kind: 'scene', scene: 'hall' }] },
    { id: 'slow', effects: [{ kind: 'scene', scene: 'hall' }, { kind: 'transition', to: 'zoom', ms: 900 }] },
  ],
}
const hall: DataScene = {
  id: 'hall',
  transition: { in: 'slide-up', ms: 500 },
  body: [{ text: 'hall.text' }, { text: 'hall.more', reveal: { delay: 1200 } }, { text: 'hall.last', reveal: { as: 'slide-left' } }],
  choices: [
    { id: 'wait', effects: [{ kind: 'kv', key: 'waited', to: true }] },
    { id: 'out', effects: [{ kind: 'scene', scene: null }] },
  ],
}

const prose = {
  'door.text': 'A blue door.',
  'door#in': 'Go in',
  'door#slow': 'Go in slowly',
  'hall.text': 'A hall.',
  'hall.more': 'A clock ticks.',
  'hall.last': 'Somebody coughs.',
  'hall#wait': 'Wait',
  'hall#out': 'Leave',
}

function make(extra: Partial<Pack> = {}, base: Partial<Game> = {}) {
  const pack: Pack = { id: 'house', schema: SCHEMA, prose, scenes: [door, hall], ...extra }
  return loadGame([pack], { id: 'house', title: 'The House', introScene: 'door', ...base })
}

function choose(state: GameState, game: Game, id: string): GameState {
  const applied = apply(state, game, { type: 'choose', id })
  if (!applied.ok) throw new Error(applied.reason)
  return applied.state
}

describe('transitions', () => {
  it('give each screen a key and how it comes in and goes out', () => {
    const { game, problems } = make()
    expect(problems).toEqual([])
    const start = startingState(game)
    expect(view(start, game).transition).toEqual({ key: 'scene:door', in: 'fade', out: 'fade', ms: 300 })
    const inHall = choose(start, game, 'in')
    expect(view(inHall, game).transition).toEqual({ key: 'scene:hall', in: 'slide-up', out: 'none', ms: 500 })
    const room = choose(inHall, game, 'out')
    expect(view(room, game).transition).toEqual({ key: 'room', in: 'none', out: 'none', ms: 300 })
  })

  it('fall back on the game default', () => {
    const { game } = make({}, { transitions: { default: { in: 'fade', out: 'zoom', ms: 250 } } })
    const room = choose(choose(startingState(game), game, 'in'), game, 'out')
    expect(view(room, game).transition).toEqual({ key: 'room', in: 'fade', out: 'zoom', ms: 250 })
    // A scene's own wins, and what it leaves out comes from the default.
    expect(view(choose(startingState(game), game, 'in'), game).transition).toEqual({ key: 'scene:hall', in: 'slide-up', out: 'zoom', ms: 500 })
  })

  it('take how the next screen arrives from a transition effect, for one command', () => {
    const { game } = make()
    const arrived = choose(startingState(game), game, 'slow')
    expect(arrived.transition).toEqual({ to: 'zoom', ms: 900 })
    expect(view(arrived, game).transition).toEqual({ key: 'scene:hall', in: 'zoom', out: 'none', ms: 900 })
    // The next command clears it.
    const waited = choose(arrived, game, 'wait')
    expect(waited.transition).toBeNull()
    expect(view(waited, game).transition.in).toBe('slide-up')
  })

  it('give a place its stage transition', () => {
    const room = definePlugin({ id: 'room', version: 1, stage: () => ({ id: 'kitchen', title: 'Kitchen', transition: 'slide-left' }) })
    const { game } = make({}, { plugins: [room] })
    const left = choose(choose(startingState(game), game, 'in'), game, 'out')
    expect(view(left, game).transition).toEqual({ key: 'room:kitchen', in: 'slide-left', out: 'slide-left', ms: 300 })
  })
})

describe('reveals', () => {
  it('read [[reveal]] markup as beats, each timed from the scene coming on', () => {
    const beats = parseBeats('One.\n\n[[reveal]]\n\nTwo.\n\n[[reveal:1500|slide-up]]\n\nThree.\n\n[[reveal:0]]\n\nFour.')
    expect(beats).toEqual([
      { kind: 'text', text: 'One.' },
      { kind: 'reveal', delay: 800, as: 'fade', at: 800 },
      { kind: 'text', text: 'Two.' },
      { kind: 'reveal', delay: 1500, as: 'slide-up', at: 2300 },
      { kind: 'text', text: 'Three.' },
      { kind: 'reveal', delay: 0, as: 'fade', at: 2300 },
      { kind: 'text', text: 'Four.' },
    ])
  })

  it("keep who spoke last across a reveal, so a bare quote still answers", () => {
    const beats = parseBeats('Ava: "Morning."\n\n[[reveal]]\n\n"Morning."')
    expect(beats.map((beat) => (beat.kind === 'say' ? beat.who : beat.kind))).toEqual(['character', 'reveal', 'player'])
  })

  it("write a block's reveal into the body before it", () => {
    const { game } = make()
    const scene = view(choose(startingState(game), game, 'in'), game).scene
    expect(scene.body).toBe('A hall.\n\n[[reveal:1200]]\n\nA clock ticks.\n\n[[reveal|slide-left]]\n\nSomebody coughs.')
    expect(scene.beats.filter((beat) => beat.kind === 'reveal')).toEqual([
      { kind: 'reveal', delay: 1200, as: 'fade', at: 1200 },
      { kind: 'reveal', delay: 800, as: 'slide-left', at: 2000 },
    ])
  })

  it('leave out the reveal of a block that is not shown', () => {
    const quiet: DataScene = { ...hall, body: [{ text: 'hall.text' }, { text: 'hall.more', reveal: {}, when: { kv: 'never' } }] }
    const { game } = make({ scenes: [door, quiet] })
    expect(view(choose(startingState(game), game, 'in'), game).scene.body).toBe('A hall.')
  })
})

describe('the checker', () => {
  const problems = (extra: Partial<Pack> = {}, base: Partial<Game> = {}) => make(extra, base).problems.map(describeProblem)

  it('reports transition names the game does not know', () => {
    const odd: DataScene = {
      ...door,
      transition: { in: 'fdae', out: 'fade', ms: -1 },
      body: [{ text: 'door.text', reveal: { as: 'wipe', delay: 1.5 } }],
      choices: [{ id: 'in', effects: [{ kind: 'transition', to: 'spin' }] }],
    }
    expect(problems({ scenes: [odd, hall] })).toEqual([
      'house · scene door · unknown transition "wipe"',
      'house · scene door · a reveal\'s delay must be whole milliseconds, 0 or more',
      'house · scene door · unknown transition "spin"',
      'house · scene door · unknown transition "fdae"',
      'house · scene door · a transition\'s ms must be 0 or more',
    ])
  })

  it("allows the game's own names", () => {
    const curtain: DataScene = { ...door, transition: 'curtain', body: [{ text: 'door.text', reveal: { as: 'curtain' } }] }
    expect(problems({ scenes: [curtain, hall] }, { transitions: { names: ['curtain'], default: 'curtain' } })).toEqual([])
    expect(problems({}, { transitions: { default: 'curtain' } })).toEqual(['base · transitions · unknown transition "curtain"'])
  })

  it('reads [[reveal]] markup in prose', () => {
    expect(
      problems({ prose: { ...prose, 'hall.more': '[[reveal:soon|fade]]\n\nA clock ticks. [[reveal]] Then nothing.\n\n[[reveal|swirl]]' } }),
    ).toEqual([
      'house · prose hall.more · [[reveal]] has a delay of "soon"; it is whole milliseconds',
      'house · prose hall.more · unknown transition "swirl"',
      'house · prose hall.more · [[reveal]] goes on a line of its own, with a blank line before and after',
    ])
  })
})
