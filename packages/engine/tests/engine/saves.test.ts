import { describe, expect, it } from 'vitest'
import { memoryDriver, type SaveDriver } from '../../src/drivers.ts'
import { startingState } from '../../src/intake.ts'
import { saves } from '../../src/save.ts'
import { SAVE_VERSION } from '../../src/types.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { unwrap } from '../fixtures/result.ts'

const drivers: [string, () => SaveDriver][] = [['memory', memoryDriver]]

describe.each(drivers)('saves through the %s driver', (_name, driver) => {
  it('writes a snapshot with what it says about itself, and reads it back', async () => {
    const { game } = withCafe()
    const store = saves(game, driver())
    const state = { ...startingState(game), turn: 4 }
    const meta = unwrap(await store.write('1', state, { played: 5000, savedAt: 100 }))
    expect(meta).toMatchObject({ game: 'fixture', slot: '1', turn: 4, when: null, played: 5000, packs: [] })
    // With no plugin to say when, the turn: counted from 1, as a player would.
    expect(meta.name).toBe('Turn 5')
    const back = await store.read('1')
    expect(back.ok && back.value?.state).toEqual(state)
    expect(await store.read('empty')).toEqual({ ok: true, value: null })
  })

  it('keeps the save format in the state alone, and reads a file whose meta still repeats it', async () => {
    const { game } = withCafe()
    const store = saves(game, driver())
    const meta = unwrap(await store.write('1', startingState(game)))
    expect(meta).not.toHaveProperty('version')
    const file = JSON.parse((await store.driver.get(`${game.id}.save.1`))!)
    expect(file).toMatchObject({ ifloom: 1, state: { version: SAVE_VERSION } })
    const older = store.importText(JSON.stringify({ ...file, meta: { ...file.meta, version: 23 } }))
    expect(older.ok && older.value.meta).toEqual(meta)
  })

  it('name a save with rules.saveName, and leave it unnamed without one', async () => {
    const { game } = withCafe()
    const named = {
      ...game,
      rules: {
        ...game.rules,
        saveName: (state: { kv: Record<string, unknown> }) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : undefined),
      },
    }
    const state = { ...startingState(game), kv: { playerName: 'Robin' } }
    expect(unwrap(await saves(named, driver()).write('1', state)).playerName).toBe('Robin')
    expect(unwrap(await saves(game, driver()).write('1', state)).playerName).toBeNull()
  })

  it('lists every save newest first, and forgets a removed one', async () => {
    const { game } = withCafe()
    const store = saves(game, driver())
    await store.write('a', startingState(game), { savedAt: 1 })
    await store.write('b', startingState(game), { savedAt: 2, name: 'Before the market' })
    expect(unwrap(await store.list()).map((meta) => ('name' in meta ? meta.name : meta.broken))).toEqual(['Before the market', expect.any(String)])
    await store.remove('b')
    expect(unwrap(await store.list()).map((meta) => meta.slot)).toEqual(['a'])
  })

  it('lists a save it can’t read last, marked broken, so it can be deleted', async () => {
    const { game } = withCafe()
    const store = saves(game, driver())
    await store.write('2', startingState(game), { savedAt: 1 })
    await store.driver.set(`${game.id}.save.1`, '{ half a save')
    await store.driver.set(`${game.id}.save.9`, JSON.stringify({ ifloom: 1, meta: { game: game.id }, state: { version: 999 } }))
    expect(unwrap(await store.list())).toEqual([
      expect.objectContaining({ slot: '2', savedAt: 1 }),
      { slot: '1', broken: 'That is not a save file.' },
      { slot: '9', broken: 'That save is from a version this game cannot read.' },
    ])
    await store.remove('1')
    expect(unwrap(await store.list()).map((entry) => entry.slot)).toEqual(['2', '9'])
  })
})

describe('a save store whose driver fails', () => {
  it('answers every call with a reason in the game’s words and the driver’s error, and never rejects', async () => {
    const { game } = withCafe()
    const gone = (): Promise<never> => Promise.reject(new Error('no storage here'))
    const store = saves({ ...game, strings: { notExported: 'Exports are off here.' } }, { ...memoryDriver(), get: gone, set: gone, remove: gone, keys: gone })
    const failed = (reason: string) => ({ ok: false, reason, cause: new Error('no storage here') })
    expect(await store.write('1', startingState(game))).toEqual(failed('The game could not be saved.'))
    expect(await store.read('1')).toEqual(failed('The game could not be loaded.'))
    expect(await store.list()).toEqual(failed('The saves could not be read.'))
    expect(await store.remove('1')).toEqual(failed('The save could not be deleted.'))
    expect(await store.exportSlot('1')).toEqual(failed('Exports are off here.'))
  })
})

describe('save files', () => {
  it('exports as text and imports back, refusing another game’s or a foreign file', async () => {
    const { game } = withCafe()
    const store = saves(game, memoryDriver())
    await store.write('1', startingState(game))
    const text = unwrap(await store.exportSlot('1'))!
    const back = store.importText(text)
    expect(back.ok && back.value.state.version).toBe(SAVE_VERSION)
    expect(store.importText('not json')).toEqual({ ok: false, reason: 'That is not a save file.' })
    const other = saves({ ...game, id: 'another' }, memoryDriver())
    expect(other.importText(text)).toEqual({ ok: false, reason: 'That save belongs to another game (fixture).' })
  })

  it('names the mods a save was made with that this game no longer has', async () => {
    const { game } = withCafe()
    const store = saves({ ...game, packs: [...(game.packs ?? []), 'mod:naps'] }, memoryDriver())
    await store.write('1', startingState(game))
    const text = unwrap(await store.exportSlot('1'))!
    const without = saves({ ...game, packs: ['town'] }, memoryDriver())
    const read = without.importText(text)
    // The game's own pack `cafe` is gone too, but only the mod is the player's to fix.
    expect(read.ok && read.value.missingPacks).toEqual(['mod:naps'])
  })

  it('keeps each game to its own keys in a shared driver', async () => {
    const { game } = withCafe()
    const shared = memoryDriver()
    await saves(game, shared).write('1', startingState(game))
    expect(await saves({ ...game, id: 'another' }, shared).read('1')).toEqual({ ok: true, value: null })
  })
})
