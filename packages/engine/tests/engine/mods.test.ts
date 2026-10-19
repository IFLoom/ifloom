import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import { SCHEMA, loadGame } from '../../src/loader.ts'
import { mods, readMod } from '../../src/mods.ts'
import { saves } from '../../src/save.ts'
import { startingState } from '../../src/intake.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { unwrap } from '../fixtures/result.ts'

const mod = (extra: object = {}) =>
  JSON.stringify({
    ifloomMod: 1,
    id: 'night-market',
    name: 'Night market',
    game: 'fixture',
    pack: { id: 'anything', schema: SCHEMA, prose: { 'cafe.counter': 'Lanterns over the counter tonight.' } },
    ...extra,
  })

describe('mods', () => {
  it('read a mod file for this game, naming its pack after the mod', () => {
    const read = readMod(mod(), 'fixture')
    expect(read.ok && read.value.pack.id).toBe('mod:night-market')
    expect(readMod('not json', 'fixture')).toEqual({ ok: false, reason: 'That is not a mod file.' })
    expect(readMod(mod({ game: undefined }), 'fixture')).toEqual({ ok: false, reason: 'That is not a mod file.' })
    expect(readMod(mod({ pack: { id: 'x' } }), 'fixture')).toEqual({ ok: false, reason: 'That is not a mod file.' })
    expect(readMod(mod({ game: 'other' }), 'fixture')).toEqual({ ok: false, reason: 'That mod is for another game (other).' })
    expect(readMod(mod({ pack: { id: 'x', schema: 99 } }), 'fixture')).toEqual({
      ok: false,
      reason: 'That mod was written for a version this game cannot read (schema 99).',
    })
  })

  it('are kept by a driver, on or off, and give the packs of the ones that are on', async () => {
    const store = mods('fixture', memoryDriver())
    expect(unwrap(await store.add(mod()))).toMatchObject({ id: 'night-market', enabled: true })
    expect((await store.packs()).map((pack) => pack.id)).toEqual(['mod:night-market'])
    await store.setEnabled('night-market', false)
    expect(await store.packs()).toEqual([])
    await store.remove('night-market')
    expect(await store.list()).toEqual([])
  })

  it("load over the game's content as packs, and saves record them, not the content", async () => {
    const store = mods('fixture', memoryDriver())
    await store.add(mod())
    const { game: base } = withCafe()
    const { scenes, items, storylines, activities, stats, packs: _p, ...rest } = base
    const own = { scenes, items, storylines, activities, stats, prose: { 'cafe.counter': 'Rosa wipes the counter.' } }
    const { game, problems } = loadGame([own], rest, { packs: await store.packs() })
    expect(problems.filter((problem) => problem.pack === 'mod:night-market')).toEqual([])
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
    const meta = await saves(game, memoryDriver()).write('1', startingState(game))
    expect(meta.packs).toEqual(['mod:night-market'])
  })
})
