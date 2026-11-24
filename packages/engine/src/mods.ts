import type { SaveDriver } from './drivers.ts'
import type { Pack } from './loader.ts'
import { fail, ok, type Result } from './result.ts'
import { upgradePack } from './upgrade.ts'

/**
 * A mod as a file: what it is, which game it is for, and the pack it adds.
 * Data only — scenes, prose, locations, patches, plugin content — so it can do
 * nothing a pack can't, and nothing runs that the game didn't ship.
 */
export type ModFile = {
  /** The format of this file: 1. */
  ifloomMod: 1
  id: string
  name: string
  /** The mod's own version, as its author writes it: `'1.2'`. */
  version?: string
  /** The game it was made for, by id. */
  game: string
  /** A line for the mods screen. */
  description?: string
  /** The content it adds: a `Pack`, laid over the game's content. */
  pack: Pack
}

/** A mod the player has added, as the store keeps it. */
export type InstalledMod = {
  id: string
  name: string
  /** The mod's own version, as its author writes it. */
  version?: string
  /** A line for the mods screen. */
  description?: string
  /** Off mods stay installed and are left out of the game. */
  enabled: boolean
  /** The content it adds, as the mod file wrote it. */
  pack: Pack
}

/** Read a mod file a player picked: the mod, or why it can't be used with this game. */
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
 * One game's installed mods, as `mods` gives them. Nothing here rejects: when
 * the driver fails, each answers a failure that says so, with the driver's
 * error as its `cause`.
 */
export interface Mods {
  /** Every installed mod, on or off, in name order. One stored unreadably is left out. */
  list(): Promise<Result<InstalledMod[]>>
  /** Add a mod from a file's text, on, replacing one with the same id. The mod, or why it can't be added. */
  add(text: string): Promise<Result<InstalledMod>>
  /** Remove a mod. Nothing happens if it isn't installed. */
  remove(id: string): Promise<Result<void>>
  /** Turn a mod on or off. Nothing happens if it isn't installed. */
  setEnabled(id: string, enabled: boolean): Promise<Result<void>>
  /** The packs of the mods that are on, in name order, to load over the game's content as `packs`. */
  packs(): Promise<Result<Pack[]>>
}

/**
 * One game's installed mods, kept wherever its driver keeps them — IndexedDB
 * in a browser, so a mod survives reloads and needs no server.
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
