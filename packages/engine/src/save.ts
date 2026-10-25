import { stringOf } from './strings.ts'
import type { SaveDriver } from './drivers.ts'
import type { Game } from './game.ts'
import { pluginOf, pluginLabel } from './plugin.ts'
import type { GameState } from './types.ts'
import { loadState } from './intake.ts'
import { fail, ok, type Result } from './result.ts'

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
  /** What `rules.saveName` gave for the state, such as the name the player typed, or null. */
  playerName: string | null
  /** The ids of the packs the game was loaded with; a missing mod is reported on load. */
  packs: string[]
  /** The plugins the game was built with, and the version of each one's state. */
  plugins: Record<string, number>
  /** The engine's save format version, `SAVE_VERSION`. */
  version: number
  /** The game's own version (`game.version`) the save was made with; 1 for a game that declares none. */
  gameVersion: number
}

/**
 * A save that is there but can't be read, as `list()` gives it: its slot, and
 * why, in the words `read` would give. Listed so the player can delete it.
 */
export type BrokenSave = { slot: string; broken: string }

/** One entry of a game's saves, as `list()` gives them: a save's meta, or a save that can't be read. */
export type SaveListing = SaveMeta | BrokenSave

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

/** What a save's write is given besides the state. */
export type SaveExtra = {
  /** The player's name for it. One made from where and when if left out. */
  name?: string
  /** Time played, in milliseconds. 0 if left out. */
  played?: number
  /** When it was written, epoch milliseconds. Now if left out. */
  savedAt?: number
}

/** One game's saves, as `saves` gives them. */
export interface Saves {
  /** Where the saves are kept. */
  readonly driver: SaveDriver
  /** Write a state to a slot, and return what the save says about itself. Rejects only if the driver fails. */
  write(slot: string, state: GameState, extra?: SaveExtra): Promise<SaveMeta>
  /**
   * A slot read back, carried forward and checked against this game. The
   * value is null when the slot is empty; a failure says why the save can't be read.
   */
  read(slot: string): Promise<Result<LoadedSave | null>>
  /**
   * Every save this game has, newest first, then any that can't be read, as
   * `{ slot, broken }` with the reason, by slot. Tell them apart with
   * `'broken' in entry`; a broken one can still be removed.
   */
  list(): Promise<SaveListing[]>
  /** Delete a slot. Nothing happens if it is empty. */
  remove(slot: string): Promise<void>
  /** A save as text a player can keep as a file, or null if the slot is empty. */
  exportSlot(slot: string): Promise<string | null>
  /** Text from a file a player picked, checked against this game: the save, or why it was refused. */
  importText(text: string): Result<LoadedSave>
}

function isSaveFile(data: unknown): data is { ifloom: 1; meta: SaveMeta; state: unknown } {
  const file = data as { ifloom?: unknown; meta?: { game?: unknown } } | null
  return Boolean(file?.ifloom === 1 && typeof file.meta?.game === 'string')
}

/**
 * One game's saves, kept wherever its driver keeps them.
 *
 * Keys carry the game's id: opened from disk, every game shares one storage
 * origin in Chromium, and itch.io serves many games from shared domains. The
 * format's version lives inside the save (`loadState`), never in the key, so a
 * new version never orphans an old save. Slots are names — `'auto'`,
 * `'quick'`, `'1'` — chosen by the game.
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
      playerName: game.rules?.saveName?.(state) ?? null,
      packs: game.packs ?? [],
      plugins: Object.fromEntries((game.plugins ?? []).map((plugin) => [plugin.id, plugin.version])),
      version: state.version,
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
    // A save from before version 18 called the player's name `player`.
    const { player: oldName, ...given } = data.meta as SaveMeta & { player?: string | null }
    const meta: SaveMeta = { ...given, playerName: given.playerName ?? oldName ?? null, gameVersion: given.gameVersion ?? recorded ?? 1 }
    return ok({ meta, state, missingPacks, missingPlugins })
  }

  return {
    driver,
    async write(slot, state, extra = {}) {
      const file: SaveFile = { ifloom: 1, meta: meta(slot, state, extra), state }
      await driver.set(key(slot), JSON.stringify(file))
      return file.meta
    },
    async read(slot) {
      const text = await driver.get(key(slot))
      return text === null ? ok(null) : read(text)
    },
    async list() {
      const out: SaveMeta[] = []
      const broken: BrokenSave[] = []
      for (const k of await driver.keys(prefix)) {
        const text = await driver.get(k)
        if (text === null) continue
        const loaded = read(text)
        if (!loaded.ok) broken.push({ slot: k.slice(prefix.length), broken: loaded.reason })
        else out.push(loaded.value.meta)
      }
      return [...out.sort((a, b) => b.savedAt - a.savedAt), ...broken.sort((a, b) => a.slot.localeCompare(b.slot))]
    },
    async remove(slot) {
      await driver.remove(key(slot))
    },
    async exportSlot(slot) {
      return driver.get(key(slot))
    },
    importText: read,
  }
}
