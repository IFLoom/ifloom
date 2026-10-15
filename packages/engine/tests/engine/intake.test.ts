import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { FIELDS, itemStart, loadState, startingState } from '../../src/intake.ts'
import { replay } from '../../src/runner.ts'
import { saves } from '../../src/save.ts'
import { SAVE_VERSION, type GameState } from '../../src/types.ts'
import { OLD_SAVES, oldSavesGame, oldSavesVersioned } from '../fixtures/old-saves.ts'
import expected from '../fixtures/old-saves.expected.json'

const games: [keyof typeof expected, () => Game][] = [
  ['unversioned', oldSavesGame],
  ['versioned', oldSavesVersioned],
]

function fileOf(game: Game, state: unknown): string {
  return JSON.stringify({ ifloom: 1, meta: { game: game.id, slot: '1', name: 'Old', savedAt: 1, played: 0, turn: 0, when: null, player: null, packs: [], plugins: {}, version: 1 }, state })
}

describe('loadState', () => {
  for (const [name, make] of games) {
    it(`loads a save of every past version as the engine always has, in a game ${name === 'versioned' ? 'with' : 'with no'} version`, () => {
      expect(Object.keys(OLD_SAVES).map(Number)).toEqual(Array.from({ length: SAVE_VERSION }, (_, i) => i + 1))
      for (const [version, state] of Object.entries(OLD_SAVES)) {
        const game = make()
        const loaded = loadState(state, game)
        expect(loaded, `version ${version}`).toEqual(expected[name][version as keyof (typeof expected)[typeof name]])
        const read = saves(game, memoryDriver()).importText(fileOf(game, state))
        if (typeof read === 'string') throw new Error(read)
        expect(read.state, `version ${version} through the store`).toEqual(loaded)
      }
    })
  }

  it('gives a new game back as it is', () => {
    for (const [, make] of games) {
      const game = make()
      const fresh = startingState(game, { seed: 9 })
      expect(loadState(JSON.parse(JSON.stringify(fresh)), game)).toEqual(fresh)
    }
  })

  it('refuses what is not a state, and a version it has no route from', () => {
    const game = oldSavesGame()
    expect(loadState(null, game)).toBe('That is not a save file.')
    expect(loadState('{}', game)).toBe('That is not a save file.')
    expect(loadState({ ...OLD_SAVES[1], version: 0 }, game)).toBe('That save is from a version this game cannot read.')
    expect(loadState({ ...OLD_SAVES[11], version: SAVE_VERSION + 1 }, game)).toBe('That save is from a version this game cannot read.')
    expect(loadState({ ...OLD_SAVES[11], version: 9.5 }, game)).toBe('That save is from a version this game cannot read.')
    const newer = { ...OLD_SAVES[11], plugins: { clock: { version: 3, state: {} } } }
    expect(loadState(newer, game)).toBe('That save was made with a newer version of clock.')
  })

  it('starts a command log from an old save', () => {
    const game = oldSavesGame()
    const played = replay(game, { game: game.id, start: OLD_SAVES[9] as unknown as GameState, commands: [{ type: 'activity', id: 'wait' }] })
    expect(played).toMatchObject({ version: SAVE_VERSION, media: { picks: {} } })
    expect(replay(game, { game: game.id, start: { version: 0 } as unknown as GameState, commands: [] })).toBe('That save is from a version this game cannot read.')
  })
})

describe('state fields', () => {
  it('are each declared once, and a new game has every one', () => {
    const game = oldSavesVersioned()
    expect(Object.keys(startingState(game)).sort()).toEqual(Object.keys(FIELDS).sort())
  })

  it('fill a loaded state that lacks them from their load default', () => {
    // A game with a version, so nothing the game declares is filled on top.
    const game = oldSavesVersioned()
    const fresh = startingState(game)
    const filled = Object.entries(FIELDS).filter(([, field]) => 'load' in field)
    expect(filled.length).toBeGreaterThan(5)
    for (const [key, field] of filled) {
      const { [key]: _gone, ...lacking } = fresh as Record<string, unknown>
      const loaded = loadState(lacking, game) as Record<string, unknown>
      expect(loaded[key], key).toEqual((field as { load: () => unknown }).load())
    }
  })
})

describe('itemStart', () => {
  it('is the item’s start, else one of gear and none of stuff', () => {
    expect(itemStart({ id: 'a', name: 'A', desc: '', kind: 'gear' })).toBe(1)
    expect(itemStart({ id: 'b', name: 'B', desc: '', kind: 'stuff' })).toBe(0)
    expect(itemStart({ id: 'c', name: 'C', desc: '', kind: 'gear', start: 0 })).toBe(0)
  })
})
