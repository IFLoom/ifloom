import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadGame, type Content, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { memoryDriver } from '../../src/drivers.ts'
import { mods, readMod } from '../../src/mods.ts'
import { COMMAND_STEPS, PACK_STEPS, SCHEMA, commandUpgrade, upgradePack, type RawCommand, type RawPack } from '../../src/upgrade.ts'
import type { Plugin } from '../../src/plugin.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { unwrap } from '../fixtures/result.ts'

/**
 * A made-up schema before the first, whose packs called prose `lines` and whose `look` command was `peek`. The steps
 * are added for these tests only, so the machinery is tested whatever the real steps are.
 */
const OLD = SCHEMA - 1
const renameLines = ({ lines, ...pack }: RawPack): RawPack => ({ ...pack, prose: lines })
const renamePeek = (command: RawCommand): RawCommand => (command.type === 'peek' ? { ...command, type: 'look' } : command)

beforeEach(() => {
  expect(PACK_STEPS[OLD]).toBeUndefined()
  expect(COMMAND_STEPS[OLD]).toBeUndefined()
  PACK_STEPS[OLD] = renameLines
  COMMAND_STEPS[OLD] = renamePeek
})
afterEach(() => {
  delete PACK_STEPS[OLD]
  delete COMMAND_STEPS[OLD]
})

/** The cafe fixture's game, split into its base and its own pack. */
function cafe() {
  const { game } = withCafe()
  const { id, title, rules, scenes, storylines, stats, introScene, kv, actions } = game
  const base = { id, title, rules }
  const own: Content = {
    name: 'town',
    scenes,
    storylines,
    stats,
    introScene,
    kv,
    actions,
    prose: { 'cafe.counter': 'Rosa wipes the counter.' },
  }
  return { base, own }
}

const oldPack = { id: 'mod:evening', schema: OLD, lines: { 'cafe.counter': 'Lanterns over the counter tonight.' } }

describe('content migrations', () => {
  it('bring an old pack up to this schema, step by step, without changing it', () => {
    const upgraded = upgradePack(oldPack, [])
    expect(upgraded.ok && upgraded.value.schema).toBe(SCHEMA)
    expect(upgraded.ok && upgraded.value.prose).toEqual(oldPack.lines)
    expect(oldPack.schema).toBe(OLD)
  })

  it('leave a pack at this schema as it is', () => {
    const pack: Pack = { id: 'now', schema: SCHEMA, prose: { a: 'A.' } }
    expect(unwrap(upgradePack(pack, []))).toBe(pack)
  })

  it('refuse a pack from a newer engine, or one older than any step', () => {
    expect(upgradePack({ schema: SCHEMA + 1 }, [])).toEqual({ ok: false, reason: `written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}` })
    expect(upgradePack({ schema: OLD - 1 }, [])).toEqual({
      ok: false,
      reason: `written for schema ${OLD - 1}, too old for this engine to read (it reads ${SCHEMA})`,
    })
  })

  it('refuse a pack older than the first schema when there are no steps', () => {
    delete PACK_STEPS[OLD]
    expect(upgradePack({ schema: SCHEMA - 1 }, [])).toEqual({
      ok: false,
      reason: `written for schema ${SCHEMA - 1}, too old for this engine to read (it reads ${SCHEMA})`,
    })
  })

  it('let loadGame load an old pack, and skip a newer one with a problem', () => {
    const { base, own } = cafe()
    const future = { id: 'future', schema: SCHEMA + 1, prose: { 'cafe.counter': 'From the future.' } } as Pack
    const { game, problems } = loadGame([own], base, { packs: [oldPack as unknown as Pack, future] })
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
    expect(problems.filter((problem) => problem.pack !== 'town').map(describeProblem)).toEqual([
      `future · pack · written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}`,
    ])
  })

  it('let a player install an old mod, kept as its file wrote it and upgraded as the game loads it', async () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'evening', name: 'Evening', game: 'fixture', pack: oldPack })
    const store = mods('fixture', memoryDriver())
    const added = await store.add(file)
    expect(added.ok && added.value.pack).toEqual({ ...oldPack, id: 'mod:evening' })
    const { base, own } = cafe()
    const { game, problems } = loadGame([own], base, { packs: unwrap(await store.packs()) })
    expect(problems.filter((problem) => problem.pack === 'mod:evening')).toEqual([])
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
  })

  it('refuse a mod from a newer engine', () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'later', name: 'Later', game: 'fixture', pack: { id: 'later', schema: SCHEMA + 1 } })
    expect(readMod(file, 'fixture')).toEqual({ ok: false, reason: `That mod was written for a version this game cannot read (schema ${SCHEMA + 1}).` })
  })

  it('upgrade an old command log’s commands as replay reads them, and leave a current one alone', () => {
    expect(unwrap(commandUpgrade([], { schema: OLD }))({ type: 'peek' })).toEqual({ type: 'look' })
    expect(unwrap(commandUpgrade([], { schema: SCHEMA }))({ type: 'peek' })).toEqual({ type: 'peek' })
    expect(commandUpgrade([], { schema: SCHEMA + 1 })).toEqual({ ok: false, reason: `written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}` })
  })
})

/**
 * A community plugin whose content and commands changed once. Version 1
 * named a bell `bell` in its calls and gave each bell a `tone`; version 2
 * names it `id` and calls it a `sound`.
 */
function bells(): Plugin<{ rung: string[] }> {
  const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
  const sound = (entry: unknown) => {
    if (!isRecord(entry) || !('tone' in entry)) return entry
    const { tone, ...rest } = entry
    return { ...rest, sound: tone }
  }
  return {
    id: 'bells',
    version: 1,
    start: () => ({ rung: [] }),
    contentVersion: 2,
    contentMigrations: {
      1: (pack, tools) => {
        const data = isRecord(pack.data) ? pack.data : {}
        const list = isRecord(data.bells) && Array.isArray(data.bells.bells) ? data.bells.bells : undefined
        const moved = list ? { ...pack, data: { ...data, bells: { bells: list.map(sound) } } } : pack
        return tools.calls(moved, (call) =>
          call.name.startsWith('bells/') && isRecord(call.with) && 'bell' in call.with ? { name: call.name, with: { id: call.with.bell } } : call,
        )
      },
    },
    commandVersion: 2,
    commandMigrations: {
      1: (command) =>
        command.type === 'custom' && command.name === 'bells/ring' && isRecord(command.with) && 'bell' in command.with
          ? { ...command, with: { id: command.with.bell } }
          : command,
    },
    commands: {
      ring: { run: (_state, args, context) => context.set({ rung: [...context.slice.rung, String(args.id)] }) },
    },
  }
}

describe('plugin-owned migrations', () => {
  const written = {
    id: 'mod:chimes',
    schema: SCHEMA,
    plugins: { bells: 1 },
    data: { bells: { bells: [{ id: 'chapel', tone: 'low' }] } },
    actions: [{ id: 'ring', label: 'Ring', command: { 'bells/ring': { bell: 'chapel' } } }],
  }
  const base = { id: 'chimes', title: 'Chimes', plugins: [bells()] }

  it('run a plugin’s own content steps from the version a pack records, and record where it got to', () => {
    expect(unwrap(upgradePack(written, [bells()]))).toEqual({
      id: 'mod:chimes',
      schema: SCHEMA,
      plugins: { bells: 2 },
      data: { bells: { bells: [{ id: 'chapel', sound: 'low' }] } },
      actions: [{ id: 'ring', label: 'Ring', command: { 'bells/ring': { id: 'chapel' } } }],
    })
    // At the plugin's version, nothing is done.
    const now = { ...written, plugins: { bells: 2 } }
    expect(unwrap(upgradePack(now, [bells()]))).toBe(now)
  })

  it('read a pack that records no version for a plugin as written for its current version', () => {
    const { plugins: _plugins, ...unrecorded } = written
    expect(unwrap(upgradePack(unrecorded, [bells()]))).toBe(unrecorded)
  })

  it('refuse a pack written for a newer version of a plugin than the game has', () => {
    const newer = { ...written, plugins: { bells: 3 } }
    expect(upgradePack(newer, [bells()])).toEqual({ ok: false, reason: "written for version 3 of the bells plugin's content, this game's reads 2" })
    const { problems } = loadGame([{ name: 'town' }], base, { packs: [newer] })
    expect(problems.map(describeProblem)).toContain("mod:chimes · pack · written for version 3 of the bells plugin's content, this game's reads 2")
  })

  it('let loadGame run a mod’s plugin steps, so an installed mod keeps working after a plugin changes', async () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'chimes', name: 'Chimes', game: 'chimes', pack: written })
    const store = mods('chimes', memoryDriver())
    expect((await store.add(file)).ok).toBe(true)
    const { game, problems } = loadGame([{ name: 'town' }], base, { packs: unwrap(await store.packs()) })
    expect(problems.filter((problem) => problem.pack === 'mod:chimes')).toEqual([])
    expect((game.actions?.[0] as { command?: unknown } | undefined)?.command).toEqual({ 'bells/ring': { id: 'chapel' } })
  })

  it('run only the command steps a log’s versions need', () => {
    const ring = { type: 'custom', name: 'bells/ring', with: { bell: 'chapel' } }
    // A log that records no versions is read as the oldest, so every step runs.
    expect(unwrap(commandUpgrade([bells()]))(ring)).toEqual({ ...ring, with: { id: 'chapel' } })
    expect(unwrap(commandUpgrade([bells()], { schema: SCHEMA, plugins: { bells: 2 } }))(ring)).toEqual(ring)
    expect(unwrap(commandUpgrade([bells()], { schema: SCHEMA, plugins: { bells: 1 } }))(ring)).toEqual({ ...ring, with: { id: 'chapel' } })
    expect(commandUpgrade([bells()], { schema: SCHEMA, plugins: { bells: 3 } })).toEqual({
      ok: false,
      reason: "written for version 3 of the bells plugin's commands, this game's reads 2",
    })
  })
})
