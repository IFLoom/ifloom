import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { loadGame, memoryDriver, profile, saves, startingState, type Game, type SaveDriver } from '@ifloom/engine'
import { browserRunner, indexedDbDriver, localStorageDriver, type StorageLike } from '../src/index.ts'

function game(extra: Partial<Game> = {}): Game {
  const { game, problems } = loadGame(
    [
      { introScene: 'porch' },
      {
        scenes: [{ id: 'porch', title: 'The porch', body: [{ prose: 'porch' }], choices: [{ id: 'wait', label: 'Wait', effects: [{ turn: true }] }] }],
        prose: { porch: 'A cat naps on the step.' },
      },
    ],
    { id: 'porch', title: 'The porch' },
  )
  expect(problems).toEqual([])
  return { ...game, ...extra }
}

function webStorage(): StorageLike {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  }
}

const drivers: [string, () => SaveDriver][] = [
  ['localStorage', () => localStorageDriver(webStorage())],
  ['indexedDB', () => indexedDbDriver({ database: `test-${Math.random()}` })],
]

describe.each(drivers)('the %s driver', (_name, driver) => {
  it('gets, sets, removes and lists keys by prefix', async () => {
    const one = driver()
    expect(await one.get('a.1')).toBeNull()
    await one.set('a.1', 'one')
    await one.set('a.2', 'two')
    await one.set('b.1', 'other')
    expect(await one.get('a.1')).toBe('one')
    expect((await one.keys('a.')).sort()).toEqual(['a.1', 'a.2'])
    await one.remove('a.1')
    expect(await one.keys('a.')).toEqual(['a.2'])
  })

  it('keeps a save the engine writes, and reads it back', async () => {
    const played = game()
    const store = saves(played, driver())
    const state = { ...startingState(played), turn: 4 }
    await store.write('1', state, { played: 5000, savedAt: 100 })
    const back = await store.read('1')
    expect(back.ok && back.value?.state).toEqual(state)
  })
})

describe('browserRunner', () => {
  it('starts a browser game with undo, saves and an autosave each turn, any of which a game can change', async () => {
    const played = game()
    const store = saves(played, memoryDriver())
    const runner = await browserRunner(played, { saves: store, profile: undefined })
    expect(runner.offers.undo).toBe(true)
    expect(runner.saves).toBe(store)
    expect(typeof runner.state.seed).toBe('number')
    const plain = await browserRunner(played, { history: false, saves: store, profile: undefined, start: { ...runner.state, seed: 7 } })
    expect(plain.offers.undo).toBe(false)
    expect(plain.state.seed).toBe(7)
  })

  it('starts a browser game with the settings in its profile', async () => {
    const played = game({
      settings: [
        { id: 'hints', label: 'Hints', type: 'toggle', default: true },
        { id: 'volume', label: 'Volume', type: 'range', min: 0, max: 10, affects: 'ui', default: 5 },
      ],
    })
    const prof = profile(played, memoryDriver())
    await prof.set('core:settings', { hints: false, volume: 2 })
    const runner = await browserRunner(played, { saves: saves(played, memoryDriver()), profile: prof })
    expect(runner.state.settings).toEqual({ hints: false })
    expect(runner.settings()).toEqual({ hints: false, volume: 2 })
  })
})
