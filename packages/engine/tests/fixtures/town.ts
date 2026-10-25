import type { ActionDef, Game } from '../../src/game.ts'
import { loadGame, type Content, type GameBase, type LoadOptions } from '../../src/loader.ts'
import { proseStore } from '../../src/prose.ts'
import { startingState } from '../../src/intake.ts'
import type { GameState } from '../../src/types.ts'

/**
 * The smallest game that exercises the engine: a few things to do, three
 * stats, a scene and a storyline. Tests build on it rather than on any real
 * game, so they say what the engine does with nothing but its own rules.
 *
 * The engine has no places. Where the player is, as far as these tests need
 * one, is the kv key `at`, moved by the `go-*` activities.
 */

/** What there is to do in the town. Only waiting is a button; the rest are done by their commands. */
export const activities: ActionDef[] = [
  // Offered while no scene is open.
  { id: 'wait', label: 'Wait a while' },
  // The turn ends, as a night's sleep or the end of a week would end it.
  { id: 'rest', effects: [{ turn: true }] },
  { id: 'tidy', blocked: [{ when: { not: { kv: 'at', is: 'house' } }, reason: 'Not here.' }] },
  { id: 'read', effects: [{ stat: 'intelligence', by: 2 }] },
  // Going somewhere, as far as the engine's tests need to: the stand-in reads `at`.
  ...['house', 'street', 'shop'].map((place) => ({
    id: `go-${place}`,
    blocked: [{ when: { kv: 'at', is: place }, reason: 'You are already here.' }],
    effects: [{ kv: 'at', to: place }],
  })),
]

/** The town, with the rules given, and the locks and resets among them as the content's. */
export function fixture({ locks, resets, ...rules }: Game['rules'] & Pick<Game, 'locks' | 'resets'> = {}): Game {
  const game: Game = {
    ...(locks ? { locks } : {}),
    ...(resets ? { resets } : {}),
    id: 'fixture',
    title: 'Fixture',
    introScene: 'start',
    kv: { phase: 'open' },
    actions: activities,
    stats: [
      { id: 'intelligence', label: 'Intelligence', start: 5, levels: { at: [10, 20], hidden: true } },
      { id: 'coins', label: 'Coins', start: 3, max: 999, format: '{n}c' },
      { id: 'luck', label: 'Luck', visible: { kv: 'feelingLucky' } },
    ],
    scenes: [
      // Where a new game opens: nothing to read, and nothing to do but carry on.
      { id: 'start', body: [], choices: [] },
      { id: 'rosa.hello', body: [{ text: 'Rosa looks up from the dough.' }], choices: [{ id: 'bye', label: 'Bye', effects: [{ scene: null }] }] },
    ],
    storylines: [{ id: 'rosa', name: 'Rosa' }],
    rules,
  }
  game.prose = proseStore(game, townProse)
  return game
}

/** The town's words, keyed the way a pack keys them. */
export const townProse: Record<string, string> = {
  'house.note': 'A note on the mat.',
}

/** A fresh game in the fixture, at home with nothing on screen. */
export function begin(game: Game, patch: Partial<GameState> = {}): GameState {
  const state = startingState(game)
  return {
    ...state,
    sceneId: null,
    turn: 2,
    ...patch,
    kv: { ...state.kv, at: 'house', ...patch.kv },
  }
}

/** Be somewhere, as the stand-in for places reads it. */
export const standAt = (state: GameState, place: string): GameState => ({ ...state, kv: { ...state.kv, at: place } })

/** The keys of a game that `loadGame` takes as its base; the rest are content. */
const BASE: (keyof GameBase)[] = ['id', 'title', 'version', 'plugins', 'rules']

/**
 * `loadGame`, given a game written as one object: what the base holds goes in
 * the base, and the rest goes in a piece of content named `base`, before the
 * content given. What a loaded game works out for itself (its prose store, its
 * packs) is left out.
 */
export function loadWhole(content: readonly Content[], whole: Partial<Game> & Pick<Game, 'id' | 'title'>, options?: LoadOptions) {
  const base: Record<string, unknown> = {}
  const own: Record<string, unknown> = { name: 'base' }
  for (const [key, value] of Object.entries(whole)) {
    if (value === undefined || key === 'prose' || key === 'packs') continue
    if ((BASE as string[]).includes(key)) base[key] = value
    else own[key] = value
  }
  return loadGame([own as Content, ...content], base as GameBase, options)
}
