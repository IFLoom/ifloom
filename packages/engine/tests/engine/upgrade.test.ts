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

  it('turn schema 4 flags into the kv store, however deep they sit', () => {
    const v4 = {
      id: 'evening',
      schema: 4,
      prose: { flag: 'A prose key called flag stays as it is.' },
      inputs: [{ id: 'name', label: 'Name', kind: 'text', variable: 'playerName', when: { not: { flag: 'playerName' } } }],
      entities: [{ id: 'ana', of: 'staff', name: 'Ana', flags: { role: 'cook' } }],
      scenes: [
        {
          id: 'cafe.evening',
          body: [{ text: 'cafe.evening/back', when: { all: [{ flag: 'visits', gte: 3 }, { storylineFlag: { storyline: 'rosa', key: 'met' } }] } }],
          choices: [
            {
              id: 'stay',
              blocked: [{ when: { any: [{ flag: 'role', of: 'staff:ana', is: 'cook' }] }, reason: 'Busy.' }],
              effects: [
                { kind: 'flag', key: 'metAva', value: true },
                { kind: 'flag', key: 'visits', add: 1 },
                { kind: 'storylineFlag', id: 'rosa', key: 'met', value: true },
                { kind: 'create', of: 'staff', entity: { name: 'Bo', flags: { role: 'waiter' } } },
              ],
            },
          ],
        },
      ],
      data: { cast: { characters: [{ id: 'rosa', name: 'Rosa', flags: { mood: 'calm' } }] } },
    }
    const pack = upgradePack(v4) as unknown as Record<string, unknown>
    expect(pack).toEqual({
      id: 'evening',
      schema: SCHEMA,
      prose: { flag: 'A prose key called flag stays as it is.' },
      inputs: [{ id: 'name', label: 'Name', kind: 'text', key: 'playerName', when: { not: { kv: 'playerName' } } }],
      entities: [{ id: 'ana', of: 'staff', name: 'Ana', kv: { role: 'cook' } }],
      scenes: [
        {
          id: 'cafe.evening',
          body: [{ text: 'cafe.evening/back', when: { all: [{ kv: 'visits', gte: 3 }, { storylineKv: { storyline: 'rosa', key: 'met' } }] } }],
          choices: [
            {
              id: 'stay',
              blocked: [{ when: { any: [{ kv: 'role', of: 'staff:ana', is: 'cook' }] }, reason: 'Busy.' }],
              effects: [
                { kind: 'kv', key: 'metAva', to: true },
                { kind: 'kv', key: 'visits', by: 1 },
                { kind: 'storylineKv', id: 'rosa', key: 'met', to: true },
                { kind: 'create', of: 'staff', entity: { name: 'Bo', kv: { role: 'waiter' } } },
              ],
            },
          ],
        },
      ],
      data: { cast: { characters: [{ id: 'rosa', name: 'Rosa', kv: { mood: 'calm' } }] } },
    })
    // The pack it was given is left alone.
    expect(v4.entities[0].flags).toEqual({ role: 'cook' })
  })

  it('install a schema 4 mod that sets flags, and play it with the kv store', async () => {
    const file = JSON.stringify({
      ifloomMod: 1,
      id: 'regulars',
      name: 'Regulars',
      game: 'fixture',
      pack: {
        id: 'regulars',
        schema: 4,
        triggers: [{ id: 'regular', when: { flag: 'visits', gte: 2 }, effects: [{ kind: 'flag', key: 'regular', value: true }] }],
      },
    })
    const added = await mods('fixture', memoryDriver()).add(file)
    expect(typeof added !== 'string' && added.pack).toEqual({
      id: 'mod:regulars',
      schema: SCHEMA,
      triggers: [{ id: 'regular', when: { kv: 'visits', gte: 2 }, effects: [{ kind: 'kv', key: 'regular', to: true }] }],
    })
  })
})
