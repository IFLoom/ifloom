import type { Game } from '../../src/game.ts'

/**
 * A small game for the state intake's tests to load saves into, with a plugin whose state has a migration.
 */

/** The game saves load into, with a storyline, things, entities, a setting and the `clock` plugin. */
export function savesGame(extra: Partial<Game> = {}): Game {
  return {
    id: 'old-saves',
    title: 'Old saves',
    introScene: 'start',
    kv: { phase: 'open' },
    actions: [{ id: 'wait' }],
    stats: [
      { id: 'coins', label: 'Coins', start: 3 },
      { id: 'patience', label: 'Patience', start: 7 },
      { id: 'skill', label: 'Skill', of: 'staff', start: 1 },
    ],
    scenes: [{ id: 'start', body: [], choices: [] }],
    storylines: [
      { id: 'rosa', name: 'Rosa' },
      { id: 'ben', name: 'Ben' },
    ],
    kinds: [
      { id: 'staff', label: 'Staff' },
      { id: 'item', label: 'Item', listed: false },
      { id: 'photo', label: 'Photo', listed: false },
    ],
    entities: [
      { id: 'ana', of: 'staff', name: 'Ana' },
      { id: 'cleo', of: 'staff', name: 'Cleo' },
      { id: 'umbrella', of: 'item', name: 'Umbrella', description: 'Blue.', at: 'player' },
      { id: 'apple', of: 'item', name: 'Apple', description: 'Red.', at: { player: 2 } },
    ],
    settings: [{ id: 'hints', label: 'Hints', type: 'toggle', default: true }],
    resets: { tidied: false },
    plugins: [
      {
        id: 'clock',
        version: 2,
        start: () => ({ hour: 8 }),
        migrations: { 1: (state) => ({ hour: (state as { h: number }).h }) },
      },
    ],
    ...extra,
  }
}

/** The same game once it declares a version, with a step that fills everything in. */
export function savesVersioned(): Game {
  return savesGame({ version: 2, rules: { migrations: { 1: (_state, tools) => tools.fill() } } })
}
