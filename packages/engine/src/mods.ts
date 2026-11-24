import type { SaveDriver } from './drivers.ts'
import type { Pack } from './loader.ts'
import { fail, ok, type Result } from './result.ts'
import { upgradePack } from './upgrade.ts'

/**
 * A mod as a JSON file, with the game it is for and the pack it adds. A mod is data only, so no code runs that the game
 * didn't ship.
 */
export type ModFile = {
  /** The file's format, 1. */
  ifloomMod: 1
  /** The mod's id. Its pack is loaded as `mod:<id>`. */
  id: string
  /** The mod's name, for a mods page. */
  name: string
  /** The mod's own version, as its author writes it, such as `'1.2'`. */
  version?: string
  /** The id of the game the mod was made for. */
  game: string
  /** The mod's description, a line for a mods page. */
  description?: string
  /** The {@link Pack} the mod adds, laid over the game's content. */
  pack: Pack
}

/** A mod the player has added, as the mod store keeps it. */
export type InstalledMod = {
  /** The mod's id. */
  id: string
  /** The mod's name, for a mods page. */
  name: string
  /** The mod's own version, as its author writes it. */
  version?: string
  /** The mod's description, a line for a mods page. */
  description?: string
  /** True when the mod is on. A mod that is off stays installed and is left out of the game. */
  enabled: boolean
  /** The pack the mod adds, as the file wrote it, with its id set to `mod:<id>`. `loadGame` upgrades it. */
  pack: Pack
}

/** Returns the mod in a file's text, or the reason it can't be used with this game. */
export function readMod(text: string, gameId: string): Result<ModFile> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return fail('That is not a mod file.')
  }
  const mod = data as Partial<ModFile> | null
  if (
    mod?.ifloomMod !== 1 ||
    typeof mod.id !== 'string' ||
    typeof mod.name !== 'string' ||
    typeof mod.game !== 'string' ||
    !mod.pack ||
    typeof mod.pack.schema !== 'number'
  ) {
    return fail('That is not a mod file.')
  }
  if (mod.game !== gameId) return fail(`That mod is for another game (${mod.game}).`)
  // The pack is kept as the file wrote it, and `loadGame` upgrades it with the rest of the game's packs, so
  // the plugins' own steps run on it too. Here it is only checked that this engine can read its schema.
  if (!upgradePack(mod.pack, []).ok) return fail(`That mod was written for a version this game cannot read (schema ${mod.pack.schema}).`)
  // The pack is named after the mod, so problems and saves point at it.
  return ok({ ...(mod as ModFile), pack: { ...mod.pack, id: `mod:${mod.id}` } })
}

/**
 * One game's mod store, returned by `mods`. No call rejects, and a driver's failure answers with a reason and the
 * driver's error as its `cause`.
 */
export interface Mods {
  /** Returns the installed mods, on or off, in name order. A mod stored unreadably is left out. */
  list(): Promise<Result<InstalledMod[]>>
  /** Adds a mod from a file's text, turned on, replacing one with the same id. It returns the mod, or the reason it can't be added. */
  add(text: string): Promise<Result<InstalledMod>>
  /** Removes a mod, and does nothing if it isn't installed. */
  remove(id: string): Promise<Result<void>>
  /** Turns a mod on or off, and does nothing if it isn't installed. */
  setEnabled(id: string, enabled: boolean): Promise<Result<void>>
  /** Returns the packs of the mods that are on, in name order, to pass to `loadGame` as `packs`. */
  packs(): Promise<Result<Pack[]>>
}

/**
 * Returns the {@link Mods} store of a game, kept by a driver. In a browser, an IndexedDB driver keeps mods across reloads
 * with no server.
 */
export function mods(gameId: string, driver: SaveDriver): Mods {
  const prefix = `${gameId}.mod.`
  const key = (id: string) => `${prefix}${id}`

  /** Run a step on the driver: its answer, or `reason` with the driver's error as its cause. */
  async function attempt<T>(reason: string, step: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
      return await step()
    } catch (error) {
      return fail(reason, error)
    }
  }

  /** A stored mod, or undefined if what is stored can't be read. */
  function parsed(text: string | null): InstalledMod | undefined {
    if (!text) return undefined
    try {
      return JSON.parse(text) as InstalledMod
    } catch {
      return undefined
    }
  }

  const list = () =>
    attempt('The mods could not be read.', async () => {
      const out: InstalledMod[] = []
      for (const k of await driver.keys(prefix)) {
        const mod = parsed(await driver.get(k))
        if (mod) out.push(mod)
      }
      return ok(out.sort((a, b) => a.name.localeCompare(b.name)))
    })

  return {
    list,
    async add(text) {
      const read = readMod(text, gameId)
      if (!read.ok) return read
      const mod = read.value
      const installed: InstalledMod = {
        id: mod.id,
        name: mod.name,
        version: mod.version,
        description: mod.description,
        enabled: true,
        pack: mod.pack,
      }
      return attempt('The mod could not be added.', async () => {
        await driver.set(key(mod.id), JSON.stringify(installed))
        return ok(installed)
      })
    },
    remove: (id) =>
      attempt('The mod could not be removed.', async () => {
        await driver.remove(key(id))
        return ok(undefined)
      }),
    setEnabled: (id, enabled) =>
      attempt('The mod could not be changed.', async () => {
        const mod = parsed(await driver.get(key(id)))
        if (mod) await driver.set(key(id), JSON.stringify({ ...mod, enabled }))
        return ok(undefined)
      }),
    async packs() {
      const listed = await list()
      return listed.ok ? ok(listed.value.filter((mod) => mod.enabled).map((mod) => mod.pack)) : listed
    },
  }
}
