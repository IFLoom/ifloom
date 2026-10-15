import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { indexedDbDriver, localStorageDriver, memoryDriver, type SaveDriver, type StorageLike } from '../../src/drivers.ts'
import { startingState } from '../../src/intake.ts'
import { saves } from '../../src/save.ts'
import { SAVE_VERSION } from '../../src/types.ts'
import { withCafe } from '../fixtures/cafe.ts'

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
  ['memory', memoryDriver],
  ['localStorage', () => localStorageDriver(webStorage())],
  ['indexedDB', () => indexedDbDriver({ database: `test-${Math.random()}` })],
]

describe.each(drivers)('saves through the %s driver', (_name, driver) => {
  it('writes a snapshot with what it says about itself, and reads it back', async () => {
    const { game } = withCafe()
    const store = saves(game, driver())
    const state = { ...startingState(game), turn: 4 }
    const meta = await store.write('1', state, { played: 5000, savedAt: 100 })
    expect(meta).toMatchObject({ game: 'fixture', slot: '1', turn: 4, when: null, played: 5000, packs: ['town', 'cafe'] })
    // With no plugin to say when, the turn: counted from 1, as a player would.
    expect(meta.name).toBe('Turn 5')
    const back = await store.read('1')
    expect(back && typeof back !== 'string' && back.state).toEqual(state)
    expect(await store.read('empty')).toBeNull()
  })

  it('lists every save newest first, and forgets a removed one', async () => {
    const { game } = withCafe()
    const store = saves(game, driver())
    await store.write('a', startingState(game), { savedAt: 1 })
    await store.write('b', startingState(game), { savedAt: 2, name: 'Before the market' })
    expect((await store.list()).map((meta) => meta.name)).toEqual(['Before the market', expect.any(String)])
    await store.remove('b')
    expect((await store.list()).map((meta) => meta.slot)).toEqual(['a'])
  })
})

describe('save files', () => {
  it('exports as text and imports back, refusing another game’s or a foreign file', async () => {
    const { game } = withCafe()
    const store = saves(game, memoryDriver())
    await store.write('1', startingState(game))
    const text = (await store.exportSlot('1'))!
    const back = store.importText(text)
    expect(typeof back !== 'string' && back.state.version).toBe(SAVE_VERSION)
    expect(store.importText('not json')).toBe('That is not a save file.')
    const other = saves({ ...game, id: 'another' }, memoryDriver())
    expect(other.importText(text)).toBe('That save belongs to another game (fixture).')
  })

  it('names the packs a save was made with that this game no longer has', async () => {
    const { game } = withCafe()
    const store = saves(game, memoryDriver())
    await store.write('1', startingState(game))
    const text = (await store.exportSlot('1'))!
    const without = saves({ ...game, packs: ['town'] }, memoryDriver())
    const read = without.importText(text)
    expect(typeof read !== 'string' && read.missingPacks).toEqual(['cafe'])
  })

  it('keeps each game to its own keys in a shared driver', async () => {
    const { game } = withCafe()
    const shared = memoryDriver()
    await saves(game, shared).write('1', startingState(game))
    expect(await saves({ ...game, id: 'another' }, shared).read('1')).toBeNull()
  })
})
