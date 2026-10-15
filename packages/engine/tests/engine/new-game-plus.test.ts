import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { SCHEMA, loadGame } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { saves } from '../../src/save.ts'
import { SAVE_VERSION } from '../../src/types.ts'
import { fixture } from '../fixtures/town.ts'

function game(carryOver: Game['carryOver']): Game {
  return {
    ...fixture(),
    items: [
      { id: 'umbrella', name: 'Umbrella', desc: 'Black, with a bent spoke.', kind: 'gear' },
      { id: 'bun', name: 'Bun', desc: 'From the bakery.', kind: 'stuff' },
    ],
    carryOver,
  }
}

/** A game played for a while: stats up, variables set, things bought. */
function played(g: Game) {
  const state = startingState(g)
  return {
    ...state,
    stats: { ...state.stats, intelligence: 40, coins: 2000, luck: 7 },
    flags: { ...state.flags, readTheLetter: true, metRosa: 'twice', at: 'shop' },
    items: { umbrella: 0, bun: 3 },
    turn: 12,
  }
}

describe('New Game+', () => {
  it('copies only the stats, variables and items carryOver lists', () => {
    const g = game({ stats: ['intelligence'], flags: ['readTheLetter'], items: ['bun'] })
    const plus = startingState(g, { carry: played(g) })
    expect(plus.stats).toEqual({ intelligence: 40, coins: 3, luck: 0 })
    expect(plus.flags).toEqual({ readTheLetter: true })
    expect(plus.items).toEqual({ umbrella: 1, bun: 3 })
    expect(plus.turn).toBe(0)
  })

  it('holds a copied stat to its range, and copies every item with all', () => {
    const g = game({ stats: ['coins'], items: 'all' })
    const plus = startingState(g, { carry: played(g) })
    expect(plus.stats.coins).toBe(999)
    expect(plus.items).toEqual({ umbrella: 0, bun: 3 })
  })

  it('copies nothing from a game with no carryOver, and lets given variables win', () => {
    expect(startingState(game(undefined), { carry: played(game(undefined)) }).flags).toEqual({})
    const g = game({ flags: ['metRosa'] })
    expect(startingState(g, { carry: played(g), flags: { metRosa: 'never' } }).flags).toEqual({ metRosa: 'never' })
  })

  it('is checked by the loader: unknown stats and items, and stats that are not the player’s', () => {
    const { scenes: _s, introScene: _in, items: _i, storylines: _t, activities: _a, actions: _ac, stats, ...base } = fixture()
    const problems = loadGame([{ id: 'core', schema: SCHEMA, stats, items: [] }], {
      ...base,
      kinds: [{ id: 'staff', label: 'Staff', plural: 'Staff' }],
      carryOver: { stats: ['intelligence', 'charm'], items: ['umbrella'] },
    }).problems.map(describeProblem)
    expect(problems).toEqual(['base · carryOver · unknown stat "charm"', 'base · carryOver · unknown item "umbrella"'])
  })
})

describe('version 9 saves', () => {
  const settings: Game['settings'] = [
    { id: 'hints', label: 'Hints', kind: 'toggle', default: true },
    { id: 'difficulty', label: 'Difficulty', kind: 'choice', options: [{ value: 'usual', label: 'Usual' }, { value: 'hard', label: 'Hard' }], default: 'usual' },
  ]

  it('carries a version-8 state forward with no settings', () => {
    const g = fixture()
    const { settings: _settings, audio: _audio, ...now } = startingState(g)
    expect(loadState({ ...now, version: 8 }, g)).toEqual({ ...now, version: SAVE_VERSION, settings: {}, audio: { channels: {}, cues: [], seq: 0, shown: 0, started: {} } })
  })

  it('loads a version-8 save with every play setting at its default', async () => {
    const g = { ...fixture(), settings }
    const store = saves(g, memoryDriver())
    const { settings: _settings, ...old } = { ...startingState(g), version: 8 }
    const file = { ifloom: 1, meta: { game: g.id, slot: '1', name: 'Old', savedAt: 1, played: 0, turn: 0, when: null, player: null, packs: [], plugins: {}, version: 8 }, state: old }
    const loaded = store.importText(JSON.stringify(file))
    expect(typeof loaded !== 'string' && loaded.state.settings).toEqual({ hints: true, difficulty: 'usual' })
  })

  it('gives a play setting added since the save its default, and keeps the ones it had', async () => {
    const before = { ...fixture(), settings: settings.slice(0, 1) }
    const store = saves(before, memoryDriver())
    await store.write('1', startingState(before, { settings: { hints: false } }))
    const after = saves({ ...before, settings }, store.driver)
    const loaded = await after.read('1')
    expect(loaded && typeof loaded !== 'string' && loaded.state.settings).toEqual({ hints: false, difficulty: 'usual' })
  })
})
