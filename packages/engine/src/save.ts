import { say } from './strings.ts'
import type { SaveDriver } from './drivers.ts'
import type { Game } from './game.ts'
import { pluginById, pluginLabel } from './plugin.ts'
import type { GameState } from './types.ts'
import { loadState } from './intake.ts'

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
  /** What `game.saveName` gave for the state, or null. */
  player: string | null
  /** The packs the game was loaded from; a missing one is reported on load. */
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

function isSaveFile(data: unknown): data is { ifloom: 1; meta: SaveMeta; state: unknown } {
  const file = data as { ifloom?: unknown; meta?: { game?: unknown } } | null
  return Boolean(file && file.ifloom === 1 && typeof file.meta?.game === 'string')
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
      player: game.saveName?.(state) ?? null,
      packs: game.packs ?? [],
      plugins: Object.fromEntries((game.plugins ?? []).map((plugin) => [plugin.id, plugin.version])),
      version: state.version,
      gameVersion: state.gameVersion ?? game.version ?? 1,
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
    const state = loadState(data.state, game)
    if (typeof state === 'string') return state
    const missingPacks = (data.meta.packs ?? []).filter((id) => !(game.packs ?? []).includes(id))
    const missingPlugins = Object.keys(data.meta.plugins ?? {}).filter((id) => !pluginById(game, id))
    // A save from before game versions says nothing of one: it was version 1.
    const recorded = (data.state as { gameVersion?: number }).gameVersion
    const meta = { ...data.meta, gameVersion: data.meta.gameVersion ?? recorded ?? 1 }
    return { meta, state, missingPacks, missingPlugins }
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
    /**
     * Every save this game has, newest first, then any that can't be read, as
     * `{ slot, broken }` with the reason, by slot. Tell them apart with
     * `'broken' in entry`; a broken one can still be removed.
     */
    async list(): Promise<SaveListing[]> {
      const out: SaveMeta[] = []
      const broken: BrokenSave[] = []
      for (const k of await driver.keys(prefix)) {
        const text = await driver.get(k)
        if (text === null) continue
        const loaded = read(text)
        if (typeof loaded === 'string') broken.push({ slot: k.slice(prefix.length), broken: loaded })
        else out.push(loaded.meta)
      }
      return [...out.sort((a, b) => b.savedAt - a.savedAt), ...broken.sort((a, b) => a.slot.localeCompare(b.slot))]
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
