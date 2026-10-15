import { say } from './strings.ts'
import type { SaveDriver } from './drivers.ts'
import type { Game } from './game.ts'
import { migratePlugins, pluginById, pluginLabel } from './plugin.ts'
import { SAVE_VERSION, type GameState } from './types.ts'
import { hydrate } from './reduce.ts'

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

/** A save as it came off disk: some version of the shape, not necessarily this one. */
type Saved = Record<string, unknown> & { version?: unknown }

/**
 * One step per save version, keyed by the version it upgrades *from*.
 *
 * A save with no route to the current version is dropped rather than loaded
 * into a shape the engine would misread. This is the only place old saves are
 * allowed to be understood: when the save format changes after release, bump
 * `SAVE_VERSION` and add the step that carries the previous version forward in
 * the same change.
 */
const MIGRATIONS: Record<number, (state: Saved) => Saved> = {
  // 1 → 2: the player's name moves into variables, and choices start being remembered.
  1: ({ playerName, playerFirst, playerLast, ...state }) => ({
    ...state,
    flags: { playerName, playerFirst, playerLast, ...(state.flags as object) },
    chosen: {},
  }),
  // 2 → 3: one clock, the turn. A day was the only turn there was, so the turn
  // is the day, and everything stamped with a day is stamped with that turn.
  2: (state) => {
    const time = state.time as { day: number } | undefined
    const stamped = <T extends { day?: number }>(list: T[] = []) =>
      list.map(({ day, ...rest }) => ({ ...rest, turn: day ?? 0 }))
    const flags = Object.fromEntries(
      Object.entries((state.flags ?? {}) as Record<string, unknown>).map(([key, value]) => [
        key.startsWith('day:') ? `turn:${key.slice(4)}` : key,
        value,
      ]),
    )
    const storylines = Object.fromEntries(
      Object.entries((state.storylines ?? {}) as Record<string, { closedUntilDay?: number | null }>).map(
        ([id, { closedUntilDay, ...rest }]) => [id, { ...rest, closedUntil: closedUntilDay ?? null }],
      ),
    )
    const collections = Object.fromEntries(
      Object.entries((state.collections ?? {}) as Record<string, { day?: number }[]>).map(([id, list]) => [id, stamped(list)]),
    )
    return { ...state, turn: time?.day ?? 0, flags, storylines, collections, notices: stamped(state.notices as { day?: number }[]) }
  },
  // 3 → 4: entities, which a save from before them has none of.
  3: (state) => ({ ...state, entities: {}, created: {} }),
  // 4 → 5: the clock leaves the engine for the calendar plugin, with the same day and period
  // (the last one, 'sleep', is the calendar's 'late'). A game without the calendar keeps it unused.
  4: ({ time, ...state }) => {
    const clock = time as { day: number; period: string } | undefined
    if (!clock) return state
    const plugins = { ...(state.plugins as Record<string, unknown>) }
    plugins.calendar ??= { version: 1, state: { day: clock.day, period: clock.period === 'sleep' ? 'late' : clock.period } }
    return { ...state, plugins }
  },
  // 5 → 6: where the player is leaves the engine for the places plugin.
  5: ({ locationId, ...state }) => {
    if (locationId === null || locationId === undefined) return state
    const plugins = { ...(state.plugins as Record<string, unknown>) }
    plugins.places ??= { version: 1, state: { at: locationId } }
    return { ...state, plugins }
  },
  // 6 → 7: entities removed in play are remembered, so declared ones a save lacks can be added.
  6: (state) => ({ ...state, removed: [] }),
  // 7 → 8: storylines lose standing and rapport. A relationship is a stat the game declares on the cast's
  // characters now, and the engine cannot know which; a version-7 save's standing is dropped.
  7: (state) => ({
    ...state,
    storylines: Object.fromEntries(
      Object.entries((state.storylines ?? {}) as Record<string, { closedUntil?: number | null; flags?: Record<string, unknown> }>).map(
        ([id, { closedUntil, flags }]) => [id, { closedUntil: closedUntil ?? null, flags: flags ?? {} }],
      ),
    ),
  }),
  // 8 → 9: play settings join the state. Each one the game declares takes its default when the save loads.
  8: (state) => ({ ...state, settings: {} }),
  // 9 → 10: audio. Nothing has been played on a save from before it, and no scene counted as a showing.
  9: (state) => ({ ...state, audio: { channels: {}, cues: [], seq: 0, shown: 0, started: {} } }),
  // 10 → 11: media. Nothing has been picked from a pool yet; the first view picks as it always would.
  10: (state) => ({ ...state, media: { picks: {} } }),
}

/** Carry a save forward to the current version, or give up on it. */
export function migrate(data: unknown): GameState | null {
  if (!data || typeof data !== 'object') return null
  let state = data as Saved
  let version = typeof state.version === 'number' ? state.version : 0
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) return null
    version += 1
    state = { ...step(state), version }
  }
  if (version !== SAVE_VERSION) return null
  return state as unknown as GameState
}

export function deserialize(raw: string): GameState | null {
  try {
    const data = migrate(JSON.parse(raw))
    if (!data) return null
    if (typeof data.turn !== 'number' || !data.stats) {
      return null
    }
    return data
  } catch {
    return null
  }
}

/** What a save says about itself, for a load screen. */
export type SaveMeta = {
  /** The game it belongs to; another game's save is refused on import. */
  game: string
  slot: string
  /** The player's name for it, or one made from where and when. */
  name: string
  /** When it was written, epoch milliseconds. */
  savedAt: number
  /** Time played, in milliseconds, as the runner counted it. */
  played: number
  /** How many turns had passed. */
  turn: number
  /** When and where the game was, in plugins' words ("Day 3 · Wednesday morning · The café"), or null if none says. */
  when: string | null
  /** The `playerName` variable, when the game asked for one. */
  player: string | null
  /** The packs the game was loaded from; a missing one is reported on load. */
  packs: string[]
  /** The plugins the game was built with, and the version of each one's state. */
  plugins: Record<string, number>
  version: number
}

/** A save as it is written: the state, and what it says about itself. */
export type SaveFile = { ifloom: 1; meta: SaveMeta; state: GameState }

/** A save read back: what it says about itself, and the state, carried forward. */
export type LoadedSave = {
  meta: SaveMeta
  state: GameState
  missingPacks: string[]
  /** Plugins the save was made with that this game does not have. Their state is kept, unused. */
  missingPlugins: string[]
}

function isSaveFile(data: unknown): data is { ifloom: 1; meta: SaveMeta; state: unknown } {
  const file = data as { ifloom?: unknown; meta?: { game?: unknown } } | null
  return Boolean(file && file.ifloom === 1 && typeof file.meta?.game === 'string')
}

/**
 * One game's saves, kept wherever its driver keeps them.
 *
 * Keys carry the game's id: opened from disk, every game shares one storage
 * origin in Chromium, and itch.io serves many games from shared domains. The
 * format's version lives inside the save (`migrate`), never in the key, so a
 * new version never orphans an old save. Slots are names — `'auto'`,
 * `'quick'`, `'1'` — chosen by the game.
 */
export function saves(game: Game, driver: SaveDriver) {
  const prefix = `${game.id}.save.`
  const key = (slot: string) => `${prefix}${slot}`

  function meta(slot: string, state: GameState, extra: { name?: string; played?: number; savedAt?: number }): SaveMeta {
    const when = pluginLabel(game, state)
    return {
      game: game.id,
      slot,
      // When and where, in the plugins' words; the turn if none says.
      name: extra.name ?? when ?? say(game, 'turnLabel', { turn: state.turn + 1 }),
      savedAt: extra.savedAt ?? Date.now(),
      played: extra.played ?? 0,
      turn: state.turn,
      when,
      player: typeof state.flags.playerName === 'string' ? state.flags.playerName : null,
      packs: game.packs ?? [],
      plugins: Object.fromEntries((game.plugins ?? []).map((plugin) => [plugin.id, plugin.version])),
      version: state.version,
    }
  }

  /** Read a save file's text: carried forward, checked against this game. */
  function read(text: string): LoadedSave | string {
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return say(game, 'notASave')
    }
    if (!isSaveFile(data)) return say(game, 'notASave')
    if (data.meta.game !== game.id) return say(game, 'otherGame', { game: data.meta.game })
    const carried = migrate(data.state)
    if (!carried) return say(game, 'saveTooOld')
    const state = migratePlugins(carried, game)
    if (typeof state === 'string') return state
    const missingPacks = (data.meta.packs ?? []).filter((id) => !(game.packs ?? []).includes(id))
    const missingPlugins = Object.keys(data.meta.plugins ?? {}).filter((id) => !pluginById(game, id))
    // Brought up to date with the game as it is now: a declared entity the save lacks joins it.
    return { meta: data.meta, state: hydrate(state, game), missingPacks, missingPlugins }
  }

  return {
    driver,
    /** Write a state to a slot, and return what the save says about itself. */
    async write(
      slot: string,
      state: GameState,
      extra: { name?: string; played?: number; savedAt?: number } = {},
    ): Promise<SaveMeta> {
      const file: SaveFile = { ifloom: 1, meta: meta(slot, state, extra), state }
      await driver.set(key(slot), JSON.stringify(file))
      return file.meta
    },
    /** A slot read back, or null if it is empty; a string says why it could not be read. */
    async read(slot: string): Promise<LoadedSave | string | null> {
      const text = await driver.get(key(slot))
      return text === null ? null : read(text)
    },
    /** Every save this game has, newest first. Unreadable ones are left out. */
    async list(): Promise<SaveMeta[]> {
      const out: SaveMeta[] = []
      for (const k of await driver.keys(prefix)) {
        const text = await driver.get(k)
        const loaded = text === null ? null : read(text)
        if (loaded && typeof loaded !== 'string') out.push(loaded.meta)
      }
      return out.sort((a, b) => b.savedAt - a.savedAt)
    },
    async remove(slot: string): Promise<void> {
      await driver.remove(key(slot))
    },
    /** A save as text a player can keep as a file. */
    async exportSlot(slot: string): Promise<string | null> {
      return driver.get(key(slot))
    },
    /** Text from a file a player picked, checked; a string says why it was refused. */
    importText: read,
  }
}

export type Saves = ReturnType<typeof saves>
