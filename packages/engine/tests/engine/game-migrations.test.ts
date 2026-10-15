import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { SCHEMA, loadGame } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { definePlugin } from '../../src/plugin.ts'
import { apply, hydrate, startingState } from '../../src/reduce.ts'
import { migrateGame, saves, type SaveFile } from '../../src/save.ts'
import { statValue } from '../../src/stats.ts'
import type { GameState } from '../../src/types.ts'
import { view } from '../../src/view.ts'
import { fixture } from '../fixtures/town.ts'

/** A save file as an older build of the game wrote it. */
function fileOf(game: Game, state: GameState): string {
  const file: SaveFile = {
    ifloom: 1,
    meta: { game: game.id, slot: '1', name: 'Old', savedAt: 1, played: 0, turn: state.turn, when: null, player: null, packs: [], plugins: {}, version: state.version } as never,
    state,
  }
  return JSON.stringify(file)
}

/** The town as it was at version 1, and as it is now with more declared. */
const before = fixture()
function grown(extra: Partial<Game> = {}): Game {
  const game = fixture()
  return {
    ...game,
    stats: [...game.stats!, { id: 'patience', label: 'Patience', start: 7 }],
    items: [{ id: 'umbrella', name: 'Umbrella', desc: 'Blue.', kind: 'gear' }],
    kinds: [{ id: 'staff', label: 'Staff' }],
    entities: [{ id: 'ana', of: 'staff', name: 'Ana' }],
    settings: [{ id: 'hints', label: 'Hints', kind: 'toggle', default: true }],
    rules: { resets: { tidied: false } },
    ...extra,
  }
}

describe('the game’s own migrations', () => {
  it('record the game’s version in the state and the save’s meta', async () => {
    const game = grown({ version: 3 })
    expect(startingState(game).gameVersion).toBe(3)
    expect(startingState(before)).not.toHaveProperty('gameVersion')
    const store = saves(game, memoryDriver())
    expect((await store.write('1', startingState(game))).gameVersion).toBe(3)
    expect((await saves(before, memoryDriver()).write('1', startingState(before))).gameVersion).toBe(1)
  })

  it('run each step from the save’s version up, after the engine’s and plugins’ migrations', () => {
    const ran: string[] = []
    const clock = definePlugin({
      id: 'clock',
      version: 2,
      start: () => ({ hour: 9 }),
      migrations: { 1: (state) => ({ hour: (state as { h: number }).h }) },
    })
    const game = grown({
      version: 3,
      plugins: [clock],
      migrations: {
        1: (state) => {
          // The engine has carried the save to its shape, and the plugin's state is up to date.
          ran.push(`1:${state.media ? 'media' : 'none'}:${JSON.stringify(state.plugins.clock)}`)
          return { ...state, flags: { ...state.flags, one: true } }
        },
        2: (state) => {
          ran.push(`2:${String(state.flags.one)}`)
          return state
        },
      },
    })
    // A version-10 save, from before media, with the clock at its version 1.
    const { media: _media, ...old } = startingState(before)
    const state = { ...old, version: 10, plugins: { clock: { version: 1, state: { h: 7 } } } } as unknown as GameState
    const loaded = saves(game, memoryDriver()).importText(fileOf(game, state))
    if (typeof loaded === 'string') throw new Error(loaded)
    expect(ran).toEqual(['1:media:{"version":2,"state":{"hour":7}}', '2:true'])
    expect(loaded.state.gameVersion).toBe(3)
    expect(loaded.meta.gameVersion).toBe(1)
    // A save already at version 2 runs only the last step.
    ran.length = 0
    expect(migrateGame({ ...startingState(game), gameVersion: 2 }, game)).toMatchObject({ gameVersion: 3 })
    expect(ran).toEqual(['2:undefined'])
  })

  it('refuse a save from a newer version of the game', () => {
    const game = grown({ version: 2 })
    const newer = { ...startingState(game), gameVersion: 3 }
    expect(saves(game, memoryDriver()).importText(fileOf(game, newer))).toBe('That save was made with a newer version of this game.')
    const said = { ...game, strings: { gameNewer: 'Update the game first.' } }
    expect(migrateGame(newer, said)).toBe('Update the game first.')
    // A game that declares no version is version 1.
    expect(typeof migrateGame({ ...startingState(before), gameVersion: 2 }, before)).toBe('string')
  })

  it('fill what the game declares only when a step asks, and only the kinds it asks for', () => {
    const old = { ...startingState(before), sceneId: null }
    const read = (game: Game) => {
      const loaded = saves(game, memoryDriver()).importText(fileOf(game, old))
      if (typeof loaded === 'string') throw new Error(loaded)
      return loaded.state
    }
    const untouched = read(grown({ version: 2 }))
    expect(untouched.stats).not.toHaveProperty('patience')
    expect(untouched.items).not.toHaveProperty('umbrella')
    expect(untouched.entities.staff).toBeUndefined()
    expect(untouched.settings).toEqual({})
    expect(untouched.flags).not.toHaveProperty('tidied')
    // Missing stats still read as their start.
    const game = grown({ version: 2 })
    const waited = apply(untouched, game, { type: 'activity', id: 'wait' }).state
    expect(waited.stats).not.toHaveProperty('patience')
    expect(statValue(waited, game, 'patience')).toBe(7)
    expect(view(waited, game).statsById.patience.value).toBe(7)

    const some = read(grown({ version: 2, migrations: { 1: (_state, tools) => tools.fill(['stats', 'settings']) } }))
    expect(some.stats.patience).toBe(7)
    expect(some.settings).toEqual({ hints: true })
    expect(some.items).not.toHaveProperty('umbrella')

    const all = read(grown({ version: 2, migrations: { 1: (_state, tools) => tools.fill() } }))
    expect(all.stats.patience).toBe(7)
    expect(all.items.umbrella).toBe(1)
    expect(all.entities.staff.ana).toEqual({ name: 'Ana', stats: {}, flags: {} })
    expect(all.settings).toEqual({ hints: true })
    expect(all.flags.tidied).toBe(false)
  })

  it('leave a game with no version filling settings and entities by itself, as before', () => {
    const old = { ...startingState(before), sceneId: null, settings: undefined } as unknown as GameState
    const game = grown()
    const loaded = saves(game, memoryDriver()).importText(fileOf(game, old))
    if (typeof loaded === 'string') throw new Error(loaded)
    expect(loaded.state.settings).toEqual({ hints: true })
    expect(loaded.state.entities.staff.ana.name).toBe('Ana')
    expect(loaded.state).not.toHaveProperty('gameVersion')
    // Hydrate does the same for a state that never went through a save.
    expect(hydrate(old, game).settings).toEqual({ hints: true })
    expect(hydrate(old, grown({ version: 1 })).settings).toEqual({})
  })

  it('report a step keyed outside the versions it could carry', () => {
    const { problems } = loadGame([{ id: 'town', schema: SCHEMA }], {
      id: 'g',
      title: 'G',
      version: 2,
      migrations: { 0: (state) => state, 1: (state) => state, 2: (state) => state },
    })
    expect(problems.map(describeProblem)).toEqual([
      'base · migration 0 · a step is keyed by the version it upgrades from, 1 to 1',
      'base · migration 2 · a step is keyed by the version it upgrades from, 1 to 1',
    ])
  })
})
