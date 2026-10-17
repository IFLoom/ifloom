import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadGame, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { memoryDriver } from '../../src/drivers.ts'
import { mods, readMod } from '../../src/mods.ts'
import { PACK_STEPS, SCHEMA, upgradePack, type RawPack } from '../../src/upgrade.ts'
import { withCafe } from '../fixtures/cafe.ts'

/**
 * A made-up schema before the oldest real one, whose packs called prose
 * `lines`. The step is added for these tests only, so they hold whatever the
 * real steps are: an old pack goes through this one and then every real one.
 */
const OLD = 3
const renameLines = ({ lines, ...pack }: RawPack): RawPack => ({ ...pack, prose: lines })

beforeEach(() => {
  expect(PACK_STEPS[OLD]).toBeUndefined()
  PACK_STEPS[OLD] = renameLines
})
afterEach(() => {
  delete PACK_STEPS[OLD]
})

/** The cafe fixture's game, split into its base and its own pack. */
function cafe() {
  const { game } = withCafe()
  const { scenes, items, storylines, activities, stats, packs: _p, ...base } = game
  const own: Pack = { id: 'town', schema: SCHEMA, scenes, items, storylines, activities, stats, prose: { 'cafe.counter': 'Rosa wipes the counter.' } }
  return { base, own }
}

const oldPack = { id: 'evening', schema: OLD, lines: { 'cafe.counter': 'Lanterns over the counter tonight.' } }

describe('content migrations', () => {
  it('bring an old pack up to this schema, step by step, without changing it', () => {
    const upgraded = upgradePack(oldPack)
    expect(typeof upgraded !== 'string' && upgraded.schema).toBe(SCHEMA)
    expect(typeof upgraded !== 'string' && upgraded.prose).toEqual(oldPack.lines)
    expect(oldPack.schema).toBe(OLD)
  })

  it('leave a pack at this schema as it is', () => {
    const pack: Pack = { id: 'now', schema: SCHEMA, prose: { a: 'A.' } }
    expect(upgradePack(pack)).toBe(pack)
  })

  it('refuse a pack from a newer engine, or one older than any step', () => {
    expect(upgradePack({ schema: SCHEMA + 1 })).toBe(`written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}`)
    expect(upgradePack({ schema: OLD - 1 })).toBe(`written for schema ${OLD - 1}, too old for this engine to read (it reads ${SCHEMA})`)
  })

  it('let loadGame load an old pack, and skip a newer one with a problem', () => {
    const { base, own } = cafe()
    const future = { id: 'future', schema: SCHEMA + 1, prose: { 'cafe.counter': 'From the future.' } } as Pack
    const { game, problems } = loadGame([own, oldPack as unknown as Pack, future], base)
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
    expect(problems.filter((problem) => problem.pack !== 'town').map(describeProblem)).toEqual([`future · pack · written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}`])
  })

  it('let a player install an old mod, kept at this schema', async () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'evening', name: 'Evening', game: 'fixture', pack: oldPack })
    const store = mods('fixture', memoryDriver())
    const added = await store.add(file)
    expect(typeof added !== 'string' && added.pack).toMatchObject({ id: 'mod:evening', schema: SCHEMA, prose: oldPack.lines })
    const { base, own } = cafe()
    const { game, problems } = loadGame([own, ...(await store.packs())], base)
    expect(problems.filter((problem) => problem.pack === 'mod:evening')).toEqual([])
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
  })

  it('refuse a mod from a newer engine', () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'later', name: 'Later', game: 'fixture', pack: { id: 'later', schema: SCHEMA + 1 } })
    expect(readMod(file, 'fixture')).toBe(`That mod was written for a version this game cannot read (schema ${SCHEMA + 1}).`)
  })
})
