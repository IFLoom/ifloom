import { stringOf, type StringKey } from './strings.ts'
import type { SaveDriver } from './drivers.ts'
import type { Game } from './game.ts'
import { pluginOf, pluginLabel, pluginSaveName } from './plugin.ts'
import type { GameState } from './types.ts'
import { loadState } from './intake.ts'
import { fail, ok, type Result } from './result.ts'

/** The facts a save records about itself, for a load page. `list()` and `write` return it. */
export type SaveMeta = {
  /** The id of the game the save belongs to. Reading or importing another game's save is refused. */
  game: string
  /** The save's slot, such as `'1'`, `'auto'` or a name of the game's own. */
  slot: string
  /** The save's name, the player's, else the plugins' `when` words, else the turn. */
  name: string
  /** The time the save was written, in epoch milliseconds. */
  savedAt: number
  /** The time played when the save was written, in milliseconds, as the runner counted it. */
  played: number
  /** The number of turns that had passed when the save was written. */
  turn: number
  /** The time and place in the game in the plugins' words, such as "Day 3 · Wednesday morning · The café", or null when no plugin gives one. */
  when: string | null
  /**
   * The player's name for the save's game, such as the name the player typed, or null. It comes from the first
   * `saveName` that answers, the game's `rules.saveName` first, then each plugin's.
   */
  playerName: string | null
  /** The ids of the packs the game was loaded with. A mod among them that is missing on load is reported in `missingPacks`. */
  packs: string[]
  /** The version of each plugin the game was built with, by plugin id. */
  plugins: Record<string, number>
  /** The game's own version (`game.version`) the save was made with. 1 for a game that declares none. */
  gameVersion: number
}

/**
 * A save in a slot that can't be read, as `list()` gives it. The listing keeps it so the player can delete it.
 */
export type BrokenSave = {
  /** The broken save's slot. */
  slot: string
  /** The reason the save can't be read, in the words `read` would give. */
  broken: string
}

/** One entry of a game's saves from `list()`, a {@link SaveMeta} or a {@link BrokenSave}. Tell them apart with `'broken' in entry`. */
export type SaveListing = SaveMeta | BrokenSave

/**
 * A save as a driver stores it, the state with its {@link SaveMeta}. `ifloom` is this envelope's format, 1, apart from
 * the state's own `version` (`SAVE_VERSION`), which `loadState` carries forward.
 */
export type SaveFile = {
  /** The envelope's format, 1. */
  ifloom: 1
  /** The save's {@link SaveMeta}. */
  meta: SaveMeta
  /** The saved state, in the shape of the version that wrote it. */
  state: GameState
}

/** A save read back, with its state carried forward to this game through `loadState`. */
export type LoadedSave = {
  /** The save's {@link SaveMeta}. */
  meta: SaveMeta
  /** The save's state, carried forward to this game's version through `loadState`. */
  state: GameState
  /** The ids of the mods the save was made with that the game wasn't loaded with, such as a mod since turned off. */
  missingPacks: string[]
  /** The ids of the plugins the save was made with that this game does not have. The save keeps their state, unused. */
  missingPlugins: string[]
}

/** Settings for `Saves.write` besides the state. */
export type SaveExtra = {
  /** The player's name for the save. The plugins' `when` words, else the turn, if left out. */
  name?: string
  /** The time played, in milliseconds. 0 if left out. */
  played?: number
  /** The time the save was written, in epoch milliseconds. Now if left out. */
  savedAt?: number
}

/**
 * One game's save store, returned by `saves`. No call rejects, and a driver's failure answers with a reason a player can
 * read and the driver's error as its `cause`.
 */
export interface Saves {
  /** The driver that keeps the saves. */
  readonly driver: SaveDriver
  /** Writes a state to a slot and returns the save's {@link SaveMeta}. It fails with the `notSaved` string if the driver fails. */
  write(slot: string, state: GameState, extra?: SaveExtra): Promise<Result<SaveMeta>>
  /**
   * Returns the save in a slot, carried forward and checked against this game, or null when the slot is empty.
   *
   * A failure gives the reason the save can't be read, or the `notLoaded` string if the driver fails.
   */
  read(slot: string): Promise<Result<LoadedSave | null>>
  /**
   * Returns the game's saves, newest first, then any that can't be read as {@link BrokenSave}s, by slot. It fails with
   * the `notListed` string if the driver fails.
   *
   * Tell the two apart with `'broken' in entry`. A broken save can still be removed.
   */
  list(): Promise<Result<SaveListing[]>>
  /** Deletes the save in a slot, and does nothing if the slot is empty. It fails with the `notRemoved` string if the driver fails. */
  remove(slot: string): Promise<Result<void>>
  /** Returns a slot's save as text a player can keep as a file, or null if the slot is empty. It fails with the `notExported` string if the driver fails. */
  exportSlot(slot: string): Promise<Result<string | null>>
  /** Returns the save in text from a file the player chose, checked against this game. A text that isn't this game's save fails with the reason. */
  importText(text: string): Result<LoadedSave>
}

function isSaveFile(data: unknown): data is { ifloom: 1; meta: SaveMeta; state: unknown } {
  const file = data as { ifloom?: unknown; meta?: { game?: unknown } } | null
  return Boolean(file?.ifloom === 1 && typeof file.meta?.game === 'string')
}

/**
 * Returns the {@link Saves} store of a game, kept by a driver. The game chooses its slots' names, such as `'auto'`,
 * `'quick'` or `'1'`.
 *
 * Each key starts with the game's id, because every game opened from disk shares one storage origin in Chromium, and
 * itch.io serves many games from shared domains. The format's version is inside the save (`loadState`), never in the
 * key, so a new version never orphans an old save.
 */
export function saves(game: Game, driver: SaveDriver): Saves {
  const prefix = `${game.id}.save.`
  const key = (slot: string) => `${prefix}${slot}`

  function meta(slot: string, state: GameState, extra: SaveExtra): SaveMeta {
    const when = pluginLabel(game, state)
    return {
      game: game.id,
      slot,
      // When and where, in the plugins' words; the turn if none says.
      name: extra.name ?? when ?? stringOf(game, 'turnLabel', { turn: state.turn + 1 }),
      savedAt: extra.savedAt ?? Date.now(),
      played: extra.played ?? 0,
      turn: state.turn,
      when,
      playerName: pluginSaveName(game, state),
      packs: game.packs ?? [],
      plugins: Object.fromEntries((game.plugins ?? []).map((plugin) => [plugin.id, plugin.version])),
      gameVersion: state.gameVersion ?? game.version ?? 1,
    }
  }

  /** Read a save file's text: carried forward, checked against this game. */
  function read(text: string): Result<LoadedSave> {
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return fail(stringOf(game, 'notASave'))
    }
    if (!isSaveFile(data)) return fail(stringOf(game, 'notASave'))
    if (data.meta.game !== game.id) return fail(stringOf(game, 'otherGame', { game: data.meta.game }))
    const loaded = loadState(data.state, game)
    if (!loaded.ok) return loaded
    const state = loaded.value
    // Only mods, which the player adds and can add back. An unlocked pack comes back with its code, and a save
    // from before content and packs were split also lists the game's own files, which the player can't fix.
    const missingPacks = (data.meta.packs ?? []).filter((id) => id.startsWith('mod:') && !(game.packs ?? []).includes(id))
    const missingPlugins = Object.keys(data.meta.plugins ?? {}).filter((id) => !pluginOf(game, id))
    // A save from before game versions says nothing of one: it was version 1.
    const recorded = (data.state as { gameVersion?: number }).gameVersion
    const meta: SaveMeta = { ...data.meta, gameVersion: data.meta.gameVersion ?? recorded ?? 1 }
    return ok({ meta, state, missingPacks, missingPlugins })
  }

  /** Run a step on the driver: its answer, or a failure in the game's words with the driver's error as its cause. */
  async function attempt<T>(reason: StringKey, step: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
      return await step()
    } catch (error) {
      return fail(stringOf(game, reason), error)
    }
  }

  return {
    driver,
    write: (slot, state, extra = {}) =>
      attempt('notSaved', async () => {
        const file: SaveFile = { ifloom: 1, meta: meta(slot, state, extra), state }
        await driver.set(key(slot), JSON.stringify(file))
        return ok(file.meta)
      }),
    read: (slot) =>
      attempt('notLoaded', async () => {
        const text = await driver.get(key(slot))
        return text === null ? ok(null) : read(text)
      }),
    list: () =>
      attempt('notListed', async () => {
        const out: SaveMeta[] = []
        const broken: BrokenSave[] = []
        for (const k of await driver.keys(prefix)) {
          const text = await driver.get(k)
          if (text === null) continue
          const loaded = read(text)
          if (!loaded.ok) broken.push({ slot: k.slice(prefix.length), broken: loaded.reason })
          else out.push(loaded.value.meta)
        }
        return ok([...out.sort((a, b) => b.savedAt - a.savedAt), ...broken.sort((a, b) => a.slot.localeCompare(b.slot))])
      }),
    remove: (slot) =>
      attempt('notRemoved', async () => {
        await driver.remove(key(slot))
        return ok(undefined)
      }),
    exportSlot: (slot) => attempt('notExported', async () => ok(await driver.get(key(slot)))),
    importText: read,
  }
}
