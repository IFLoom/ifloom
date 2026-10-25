import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { FIELDS, loadState, startingState } from '../../src/intake.ts'
import { heldBy } from '../../src/holdings.ts'
import { entityDescription, proseStore } from '../../src/prose.ts'
import { replay } from '../../src/runner.ts'
import { saves } from '../../src/save.ts'
import { SAVE_VERSION, type GameState } from '../../src/types.ts'
import { OLD_SAVES, oldSavesGame, oldSavesVersioned } from '../fixtures/old-saves.ts'
import expected from '../fixtures/old-saves.expected.json'
import { unwrap } from '../fixtures/result.ts'

const games: [keyof typeof expected, () => Game][] = [
  ['unversioned', oldSavesGame],
  ['versioned', oldSavesVersioned],
]

function fileOf(game: Game, state: unknown): string {
  return JSON.stringify({
    ifloom: 1,
    meta: { game: game.id, slot: '1', name: 'Old', savedAt: 1, played: 0, turn: 0, when: null, player: null, packs: [], plugins: {}, version: 1 },
    state,
  })
}

describe('loadState', () => {
  for (const [name, make] of games) {
    it(`loads a save of every past version as the engine always has, in a game ${name === 'versioned' ? 'with' : 'with no'} version`, () => {
      expect(Object.keys(OLD_SAVES).map(Number)).toEqual(Array.from({ length: SAVE_VERSION }, (_, i) => i + 1))
      for (const [version, state] of Object.entries(OLD_SAVES)) {
        const game = make()
        const loaded = loadState(state, game)
        expect(unwrap(loaded), `version ${version}`).toEqual(expected[name][version as keyof (typeof expected)[typeof name]])
        const read = unwrap(saves(game, memoryDriver()).importText(fileOf(game, state)))
        expect(read.state, `version ${version} through the store`).toEqual(unwrap(loaded))
      }
    })
  }

  it('gives a new game back as it is', () => {
    for (const [, make] of games) {
      const game = make()
      const fresh = startingState(game, { seed: 9 })
      expect(unwrap(loadState(JSON.parse(JSON.stringify(fresh)), game))).toEqual(fresh)
    }
  })

  it('refuses what is not a state, and a version it has no route from', () => {
    const game = oldSavesGame()
    expect(loadState(null, game)).toEqual({ ok: false, reason: 'That is not a save file.' })
    expect(loadState('{}', game)).toEqual({ ok: false, reason: 'That is not a save file.' })
    expect(loadState({ ...OLD_SAVES[1], version: 0 }, game)).toEqual({ ok: false, reason: 'That save is from a version this game cannot read.' })
    expect(loadState({ ...OLD_SAVES[11], version: SAVE_VERSION + 1 }, game)).toEqual({
      ok: false,
      reason: 'That save is from a version this game cannot read.',
    })
    expect(loadState({ ...OLD_SAVES[11], version: 9.5 }, game)).toEqual({ ok: false, reason: 'That save is from a version this game cannot read.' })
    const newer = { ...OLD_SAVES[11], plugins: { clock: { version: 3, state: {} } } }
    expect(loadState(newer, game)).toEqual({ ok: false, reason: 'That save was made with a newer version of clock.' })
  })

  it('carries a version-15 save’s items and collections to things the player holds', () => {
    const base = oldSavesGame()
    const game: Game = {
      ...base,
      kinds: [...(base.kinds ?? []), { id: 'clothing', label: 'Clothing', unique: true }, { id: 'letters', label: 'Letters' }],
      // The scarf was an item, and is clothing now: the one entity with its id.
      entities: [...(base.entities ?? []), { id: 'scarf', of: 'clothing', name: 'Scarf' }],
    }
    game.prose = proseStore(game, { 'letter.gran': 'Love, {{grannyName}}.' })
    const old = {
      ...OLD_SAVES[15],
      items: { umbrella: 0, apple: 5, scarf: 1, kite: 2 },
      collections: {
        gallery: [{ id: 'pier', title: 'The pier', image: 'art/pier.jpg', data: { sunny: true }, turn: 3 }],
        letters: [
          { id: 'gran', text: 'letter.gran', turn: 4 },
          { id: 'gran', title: 'Twice', turn: 5 },
          { title: 'No id', turn: 6 },
        ],
      },
    }
    const loaded = unwrap(loadState(old, game))
    expect(loaded).not.toHaveProperty('items')
    expect(loaded).not.toHaveProperty('collections')
    expect(loaded.held.player).toEqual({ 'item:umbrella': 0, 'item:apple': 5, 'clothing:scarf': 1, 'item:kite': 2, 'photo:pier': 1, 'letters:gran': 1 })
    expect(loaded.entities.photo).toEqual({ pier: { name: 'The pier', image: 'art/pier.jpg', kv: { sunny: true } } })
    // A prose key's words, as written: their tokens are filled when the description is read.
    expect(loaded.entities.letters).toEqual({ gran: { description: 'Love, {{grannyName}}.' } })
    expect(heldBy(loaded, game, 'player').map((entry) => entry.ref)).toEqual(['item:apple', 'clothing:scarf', 'photo:pier', 'letters:gran'])
  })

  it('carries a version-20 save’s notices to their words, where their text was a prose key', () => {
    const game = oldSavesGame()
    game.prose = proseStore(game, { 'notice.rent': 'The rent is due on {{day}}.' })
    const old = {
      ...OLD_SAVES[20],
      notices: [
        { id: 'a', title: 'Rent', text: 'notice.rent', turn: 3, seen: false },
        { id: 'b', title: 'Note', text: 'Back soon.', turn: 4, seen: false },
      ],
    }
    expect(unwrap(loadState(old, game)).notices.map((notice) => notice.text)).toEqual(['The rent is due on {{day}}.', 'Back soon.'])
  })

  it('carries a version-21 save’s things made in play to their `description`, which was their `desc`', () => {
    const game = oldSavesGame()
    const old = {
      ...OLD_SAVES[21],
      entities: { item: { '#1': { name: 'Kite', desc: 'Red and torn.' }, '#2': { name: 'Map', description: 'Already new.' } } },
    }
    const loaded = unwrap(loadState(old, game))
    expect(loaded.entities.item).toEqual({ '#1': { name: 'Kite', description: 'Red and torn.' }, '#2': { name: 'Map', description: 'Already new.' } })
    expect(entityDescription(loaded, game, 'item:#1')).toBe('Red and torn.')
  })

  it('starts a command log from an old save', () => {
    const game = oldSavesGame()
    const played = replay(game, { game: game.id, start: OLD_SAVES[9] as unknown as GameState, commands: [{ type: 'action', id: 'wait' }] })
    expect(unwrap(played)).toMatchObject({ version: SAVE_VERSION, media: { picks: {} } })
    expect(replay(game, { game: game.id, start: { version: 0 } as unknown as GameState, commands: [] })).toEqual({
      ok: false,
      reason: 'That save is from a version this game cannot read.',
    })
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
      const loaded = unwrap(loadState(lacking, game)) as Record<string, unknown>
      expect(loaded[key], key).toEqual((field as { load: () => unknown }).load())
    }
  })
})
