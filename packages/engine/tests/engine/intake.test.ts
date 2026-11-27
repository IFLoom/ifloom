import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { FIELDS, loadState, startingState } from '../../src/intake.ts'
import { replay } from '../../src/runner.ts'
import { saves } from '../../src/save.ts'
import { SAVE_VERSION, type GameState } from '../../src/types.ts'
import { savesGame, savesVersioned } from '../fixtures/saves.ts'
import { unwrap } from '../fixtures/result.ts'

const games: (() => Game)[] = [savesGame, savesVersioned]

function fileOf(game: Game, state: unknown): string {
  return JSON.stringify({
    ifloom: 1,
    meta: { game: game.id, slot: '1', name: 'Old', savedAt: 1, played: 0, turn: 0, when: null, player: null, packs: [], plugins: {}, version: 1 },
    state,
  })
}

describe('loadState', () => {
  it('gives a new game back as it is, through loadState and through the save store', () => {
    for (const make of games) {
      const game = make()
      const fresh = startingState(game, { seed: 9 })
      expect(unwrap(loadState(JSON.parse(JSON.stringify(fresh)), game))).toEqual(fresh)
      expect(unwrap(saves(game, memoryDriver()).importText(fileOf(game, fresh))).state).toEqual(fresh)
    }
  })

  it('carries a plugin’s older state forward with the plugin’s own migrations', () => {
    const game = savesGame()
    const fresh = startingState(game)
    const old = { ...fresh, plugins: { clock: { version: 1, state: { h: 6 } } } }
    expect(unwrap(loadState(old, game)).plugins.clock).toEqual({ version: 2, state: { hour: 6 } })
  })

  it('refuses what is not a state, and a version it has no route from', () => {
    const game = savesGame()
    const fresh = startingState(game)
    expect(loadState(null, game)).toEqual({ ok: false, reason: 'That is not a save file.' })
    expect(loadState('{}', game)).toEqual({ ok: false, reason: 'That is not a save file.' })
    expect(loadState({ ...fresh, version: 0 }, game)).toEqual({ ok: false, reason: 'That save is from a version this game cannot read.' })
    expect(loadState({ ...fresh, version: SAVE_VERSION + 1 }, game)).toEqual({
      ok: false,
      reason: 'That save is from a version this game cannot read.',
    })
    expect(loadState({ ...fresh, version: 0.5 }, game)).toEqual({ ok: false, reason: 'That save is from a version this game cannot read.' })
    const newer = { ...fresh, plugins: { clock: { version: 3, state: {} } } }
    expect(loadState(newer, game)).toEqual({ ok: false, reason: 'That save was made with a newer version of clock.' })
  })

  it('starts a command log from a save that lacks a field, filling it', () => {
    const game = savesGame()
    const { media: _media, ...start } = startingState(game)
    const played = replay(game, { game: game.id, start: start as unknown as GameState, commands: [{ type: 'action', id: 'wait' }] })
    expect(unwrap(played)).toMatchObject({ version: SAVE_VERSION, media: { picks: {} } })
    expect(replay(game, { game: game.id, start: { version: 0 } as unknown as GameState, commands: [] })).toEqual({
      ok: false,
      reason: 'That save is from a version this game cannot read.',
    })
  })
})

describe('state fields', () => {
  it('are each declared once, and a new game has every one', () => {
    const game = savesVersioned()
    expect(Object.keys(startingState(game)).sort()).toEqual(Object.keys(FIELDS).sort())
  })

  it('fill a loaded state that lacks them from their load default', () => {
    // A game with a version, so nothing the game declares is filled on top.
    const game = savesVersioned()
    const fresh = startingState(game)
    const filled = Object.entries(FIELDS).filter(([, field]) => 'load' in field)
    expect(filled.length).toBeGreaterThan(5)
    for (const [key, field] of filled) {
      const { [key]: _gone, ...lacking } = fresh as Record<string, unknown>
      const loaded = unwrap(loadState(lacking, game)) as Record<string, unknown>
      expect(loaded[key], key).toEqual((field as { load: () => unknown }).load())
    }
  })
})
