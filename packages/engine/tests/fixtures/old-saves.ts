import type { Game } from '../../src/game.ts'

/**
 * A save of every format version the engine has had, 1 to 17, each in the
 * shape that version wrote, and a small game to load them into. Tests load
 * them through `loadState` and the save store and compare the result with
 * `old-saves.expected.json`, which the engine wrote before the state intake
 * existed (when loading was `migrate`, `migratePlugins`, `migrateGame` and
 * `hydrate`). So a change to the intake that changes how an old save loads fails.
 *
 * Imports nothing but types, so the expected file can be written again by an
 * older checkout of the engine.
 */

/**
 * The game the saves load into: grown since they were made, by a storyline, a
 * thing, an entity and a setting. Its items were things of an `item` kind
 * from version 16, and its gallery's entries `photo` things.
 */
export function oldSavesGame(extra: Partial<Game> = {}): Game {
  return {
    id: 'old-saves',
    title: 'Old saves',
    introScene: 'start',
    startPhase: 'open',
    activities: [{ id: 'wait' }],
    stats: [
      { id: 'coins', label: 'Coins', start: 3 },
      { id: 'patience', label: 'Patience', start: 7 },
      { id: 'skill', label: 'Skill', of: 'staff', start: 1 },
    ],
    scenes: [{ id: 'start', render: () => ({ choices: [] }) }],
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
      { id: 'umbrella', of: 'item', name: 'Umbrella', desc: 'Blue.', at: 'player' },
      { id: 'apple', of: 'item', name: 'Apple', desc: 'Red.', at: { player: 2 } },
    ],
    settings: [{ id: 'hints', label: 'Hints', kind: 'toggle', default: true }],
    rules: { resets: { tidied: false } },
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
export function oldSavesVersioned(): Game {
  return oldSavesGame({ version: 2, migrations: { 1: (_state, tools) => tools.fill() } })
}

const v1 = {
  version: 1,
  seed: 42,
  phase: 'open',
  sceneId: null,
  playerName: 'Robin Hale',
  playerFirst: 'Robin',
  playerLast: 'Hale',
  time: { day: 4, period: 'sleep' },
  locationId: 'shop',
  stats: { coins: 9 },
  storylines: { rosa: { standing: 40, rapport: 3, closedUntilDay: 6, flags: { met: true } } },
  flags: { 'day:counter.chat': 4, tidy: true },
  items: { umbrella: 0 },
  collections: { gallery: [{ id: 'house', day: 2 }] },
  notices: [{ id: 'n', title: 'Rent', day: 3, seen: false }],
  fired: { rent: 3 },
  plugins: {},
  seen: { start: 1 },
  seenOn: { start: 0 },
}

const { playerName: _name, playerFirst: _first, playerLast: _last, ...unnamed } = v1
const v2 = {
  ...unnamed,
  version: 2,
  flags: { playerName: 'Robin Hale', playerFirst: 'Robin', playerLast: 'Hale', 'day:counter.chat': 4, tidy: true },
  chosen: { 'start/go': 1 },
}

const v3 = {
  ...v2,
  version: 3,
  turn: 4,
  flags: { playerName: 'Robin Hale', playerFirst: 'Robin', playerLast: 'Hale', 'turn:counter.chat': 4, tidy: true },
  storylines: { rosa: { standing: 40, rapport: 3, closedUntil: 6, flags: { met: true } } },
  collections: { gallery: [{ id: 'house', turn: 2 }] },
  notices: [{ id: 'n', title: 'Rent', turn: 3, seen: false }],
  plugins: { clock: { version: 1, state: { h: 7 } } },
}

const v4 = { ...v3, version: 4, entities: { staff: { ana: { name: 'Ana', stats: { skill: 4 }, flags: {} } } }, created: { staff: 0 } }

const { time: _time, ...timeless } = v4
const v5 = { ...timeless, version: 5, plugins: { ...v4.plugins, calendar: { version: 1, state: { day: 4, period: 'late' } } } }

const { locationId: _at, ...placeless } = v5
const v6 = { ...placeless, version: 6, plugins: { ...v5.plugins, places: { version: 1, state: { at: 'shop' } } } }

const v7 = { ...v6, version: 7, removed: ['staff:cleo'] }

const v8 = { ...v7, version: 8, storylines: { rosa: { closedUntil: 6, flags: { met: true } } } }

const v9 = { ...v8, version: 9, settings: { hints: false } }

const v10 = { ...v9, version: 10, audio: { channels: { music: 'calm' }, cues: [], seq: 2, shown: 3, started: {} } }

const v11 = { ...v10, version: 11, media: { picks: { 'door||start|0': 'door/red.jpg' } } }

const { flags: v11Flags, ...unflagged } = v11
const v12 = {
  ...unflagged,
  version: 12,
  kv: v11Flags,
  storylines: { rosa: { closedUntil: 6, kv: { met: true } } },
  entities: { staff: { ana: { name: 'Ana', stats: { skill: 4 }, kv: {} } } },
  // A game with the timed-effects plugin, which the game no longer has: its state is kept.
  plugins: { ...v11.plugins, effects: { version: 1, state: { active: [{ id: 'cold', left: [2] }] } } },
}

// The statuses plugin's state, under the timed-effects plugin's id it had until 13.
const { effects: v12Effects, ...v12Plugins } = v12.plugins
const v13 = { ...v12, version: 13, plugins: { ...v12Plugins, statuses: v12Effects } }

// Choices picked are counted by `scene#choice`; until 14 it was `scene/choice`.
const v14 = { ...v13, version: 14, chosen: { 'start#go': 1 } }

// An entity's record keeps only what play changed: Ana's skill, and Dev, hired in play, with the name he was given.
const v15 = { ...v14, version: 15, entities: { staff: { ana: { stats: { skill: 4 } }, '#1': { name: 'Dev', stats: { skill: 2 } } } }, created: { staff: 1 } }

// Items and collections are things: the umbrella's 0 is the player's, and the gallery's house a photo they hold.
const { items: _items, collections: _collections, ...thingless } = v15
const v16 = {
  ...thingless,
  version: 16,
  entities: { ...v15.entities, photo: { house: { name: 'The house', image: 'photo/house.jpg' } } },
  held: { player: { 'item:umbrella': 0, 'photo:house': 1 } },
  // How the next screen comes in, as a `transition` effect left it; a save of 16 kept it.
  transition: { to: 'fade', ms: 400 },
}

// The save no longer keeps a transition: how a screen comes in is the UI's, from a choice's hints.
const { transition: _transition, ...still } = v16
const v17 = { ...still, version: 17 }

/** Each version's save state, by version. */
export const OLD_SAVES: Record<number, Record<string, unknown>> = {
  1: v1,
  2: v2,
  3: v3,
  4: v4,
  5: v5,
  6: v6,
  7: v7,
  8: v8,
  9: v9,
  10: v10,
  11: v11,
  12: v12,
  13: v13,
  14: v14,
  15: v15,
  16: v16,
  17: v17,
}
