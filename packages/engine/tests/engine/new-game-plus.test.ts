import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { describeProblem } from '../../src/check.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { heldBy, heldCount } from '../../src/holdings.ts'
import { saves } from '../../src/save.ts'
import { SAVE_VERSION } from '../../src/types.ts'
import { fixture, loadWhole } from '../fixtures/town.ts'
import { unwrap } from '../fixtures/result.ts'

function game(carryOver: Game['carryOver']): Game {
  return {
    ...fixture(),
    kinds: [
      { id: 'thing', label: 'Thing' },
      { id: 'photo', label: 'Photo' },
    ],
    entities: [
      { id: 'umbrella', of: 'thing', name: 'Umbrella', desc: 'Black, with a bent spoke.', at: 'player' },
      { id: 'bun', of: 'thing', name: 'Bun', desc: 'From the bakery.' },
    ],
    carryOver,
  }
}

/** A game played for a while: stats up, kv keys set, things bought, the umbrella lost and a photo taken. */
function played(g: Game) {
  const state = startingState(g)
  return {
    ...state,
    stats: { ...state.stats, intelligence: 40, coins: 2000, luck: 7 },
    kv: { ...state.kv, readTheLetter: true, metRosa: 'twice', at: 'shop' },
    entities: { photo: { '#1': { name: 'The pier' } } },
    created: { photo: 1 },
    held: { player: { 'thing:umbrella': 0, 'thing:bun': 3, 'photo:#1': 1 } },
    turn: 12,
  }
}

describe('New Game+', () => {
  it('copies only the stats, kv keys and things held carryOver lists', () => {
    const g = game({ stats: ['intelligence'], kv: ['readTheLetter'], held: ['thing:bun'] })
    const plus = startingState(g, { carry: played(g) })
    expect(plus.stats).toEqual({ intelligence: 40, coins: 3, luck: 0 })
    expect(plus.kv).toEqual({ readTheLetter: true })
    expect(heldBy(plus, g, 'player')).toEqual([
      { ref: 'thing:umbrella', count: 1 },
      { ref: 'thing:bun', count: 3 },
    ])
    expect(plus.entities).toEqual({})
    expect(plus.turn).toBe(0)
  })

  it('holds a copied stat to its range, and copies everything held with all, things made in play too', () => {
    const g = game({ stats: ['coins'], held: 'all' })
    const plus = startingState(g, { carry: played(g) })
    expect(plus.stats.coins).toBe(999)
    expect(heldCount(plus, g, 'thing:umbrella', 'player')).toBe(0)
    expect(heldBy(plus, g, 'player')).toEqual([
      { ref: 'thing:bun', count: 3 },
      { ref: 'photo:#1', count: 1 },
    ])
    expect(plus.entities).toEqual({ photo: { '#1': { name: 'The pier' } } })
    expect(plus.created).toEqual({ photo: 1 })
  })

  it('copies nothing from a game with no carryOver, and lets given kv keys win', () => {
    expect(startingState(game(undefined), { carry: played(game(undefined)) }).kv).toEqual({})
    const g = game({ kv: ['metRosa'] })
    expect(startingState(g, { carry: played(g), kv: { metRosa: 'never' } }).kv).toEqual({ metRosa: 'never' })
  })

  it('is checked by the loader: unknown stats and kinds, and stats that are not the player’s', () => {
    const { scenes: _s, introScene: _in, storylines: _t, activities: _a, actions: _ac, stats, ...base } = fixture()
    const problems = loadWhole(
      [
        {
          name: 'base',
          kinds: [{ id: 'staff', label: 'Staff', plural: 'Staff' }],
          carryOver: { stats: ['intelligence', 'charm'], held: ['umbrella', 'staff:ana', 'thing:umbrella'] },
        },
        { name: 'core', stats },
      ],
      {
        ...base,
      },
    ).problems.map(describeProblem)
    expect(problems).toEqual([
      'base · carryOver · unknown stat "charm"',
      'base · carryOver · unknown entity "umbrella": name one as "kind:id"',
      'base · carryOver · unknown kind "thing"',
    ])
  })
})

describe('version 9 saves', () => {
  const settings: Game['settings'] = [
    { id: 'hints', label: 'Hints', kind: 'toggle', default: true },
    {
      id: 'difficulty',
      label: 'Difficulty',
      kind: 'choice',
      options: [
        { value: 'usual', label: 'Usual' },
        { value: 'hard', label: 'Hard' },
      ],
      default: 'usual',
    },
  ]

  it('carries a version-8 state forward with no settings', () => {
    const g = fixture()
    const { settings: _settings, audio: _audio, ...now } = startingState(g)
    expect(unwrap(loadState({ ...now, version: 8 }, g))).toEqual({
      ...now,
      version: SAVE_VERSION,
      settings: {},
      audio: { channels: {}, cues: [], seq: 0, shown: 0, started: {} },
    })
  })

  it('loads a version-8 save with every play setting at its default', async () => {
    const g = { ...fixture(), settings }
    const store = saves(g, memoryDriver())
    const { settings: _settings, ...old } = { ...startingState(g), version: 8 }
    const file = {
      ifloom: 1,
      meta: { game: g.id, slot: '1', name: 'Old', savedAt: 1, played: 0, turn: 0, when: null, player: null, packs: [], plugins: {}, version: 8 },
      state: old,
    }
    const loaded = store.importText(JSON.stringify(file))
    expect(loaded.ok && loaded.value.state.settings).toEqual({ hints: true, difficulty: 'usual' })
  })

  it('gives a play setting added since the save its default, and keeps the ones it had', async () => {
    const before = { ...fixture(), settings: settings.slice(0, 1) }
    const store = saves(before, memoryDriver())
    await store.write('1', startingState(before, { settings: { hints: false } }))
    const after = saves({ ...before, settings }, store.driver)
    const loaded = await after.read('1')
    expect(loaded.ok && loaded.value?.state.settings).toEqual({ hints: false, difficulty: 'usual' })
  })
})
