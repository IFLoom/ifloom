import type { ActivityDef } from '../../src/activity.ts'
import type { Game } from '../../src/game.ts'
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

export const activities: ActivityDef[] = [
  { id: 'wait' },
  // The turn ends, as a night's sleep or the end of a week would end it.
  { id: 'rest', effects: [{ kind: 'turn' }] },
  { id: 'tidy', requires: [{ when: { kv: 'at', is: 'house' }, reason: 'Not here.' }] },
  { id: 'read', effects: [{ kind: 'stat', key: 'intelligence', by: 2 }] },
  // Going somewhere, as far as the engine's tests need to: the stand-in reads `at`.
  ...['house', 'street', 'shop'].map((place) => ({
    id: `go-${place}`,
    requires: [{ when: { not: { kv: 'at', is: place } }, reason: 'You are already here.' }],
    effects: [{ kind: 'kv' as const, key: 'at', to: place }],
  })),
]

export function fixture(rules: Game['rules'] = {}): Game {
  const game: Game = {
    id: 'fixture',
    title: 'Fixture',
    introScene: 'start',
    startPhase: 'open',
    activities,
    stats: [
      { id: 'intelligence', label: 'Intelligence', start: 5, bands: [10, 20] },
      { id: 'coins', label: 'Coins', start: 3, max: 999, format: '{n}c' },
      { id: 'luck', label: 'Luck', visible: { kv: 'feelingLucky' } },
    ],
    items: [],
    scenes: [
      // Where a new game opens: nothing to read, and nothing to do but carry on.
      { id: 'start', render: () => ({ choices: [] }) },
      {
        id: 'rosa.hello',
        render: () => ({ body: 'Rosa looks up from the dough.', choices: [{ id: 'bye', label: 'Bye', effects: [{ kind: 'scene', id: null }] }] }),
      },
    ],
    storylines: [{ id: 'rosa', name: 'Rosa' }],
    // Offered while no scene is open.
    actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
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
    kv: { at: 'house', ...patch.kv },
  }
}

/** Be somewhere, as the stand-in for places reads it. */
export const standAt = (state: GameState, place: string): GameState => ({ ...state, kv: { ...state.kv, at: place } })
