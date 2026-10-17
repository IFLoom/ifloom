import type { SaveDriver } from './drivers.ts'
import type { Pack } from './loader.ts'
import { upgradePack } from './upgrade.ts'

/**
 * A mod as a file: what it is, which game it is for, and the pack it adds.
 * Data only — scenes, prose, locations, patches, plugin content — so it can do
 * nothing a pack can't, and nothing runs that the game didn't ship.
 */
export type ModFile = {
  ifloomMod: 1
  id: string
  name: string
  version?: string
  /** The game it was made for, by id. */
  game: string
  description?: string
  pack: Pack
}

/** A mod the player has added, as the store keeps it. */
export type InstalledMod = {
  id: string
  name: string
  version?: string
  description?: string
  /** Off mods stay installed and are left out of the game. */
  enabled: boolean
  pack: Pack
}

/** Read a mod file a player picked: the mod, or why it can't be used with this game. */
export function readMod(text: string, gameId: string): ModFile | string {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return 'That is not a mod file.'
  }
  const mod = data as Partial<ModFile> | null
  if (
    !mod ||
    mod.ifloomMod !== 1 ||
    typeof mod.id !== 'string' ||
    typeof mod.name !== 'string' ||
    typeof mod.game !== 'string' ||
    !mod.pack ||
    typeof mod.pack.schema !== 'number'
  ) {
    return 'That is not a mod file.'
  }
  if (mod.game !== gameId) return `That mod is for another game (${mod.game}).`
  // An older pack is upgraded now, so the store keeps it in this engine's schema.
  const pack = upgradePack(mod.pack)
  if (typeof pack === 'string') return `That mod was written for a version this game cannot read (schema ${mod.pack.schema}).`
  // The pack is named after the mod, so problems and saves point at it.
  return { ...(mod as ModFile), pack: { ...pack, id: `mod:${mod.id}` } }
}

/**
 * One game's installed mods, kept wherever its driver keeps them — IndexedDB
 * in a browser, so a mod survives reloads and needs no server.
 */
export function mods(gameId: string, driver: SaveDriver) {
  const prefix = `${gameId}.mod.`
  const key = (id: string) => `${prefix}${id}`
  async function list(): Promise<InstalledMod[]> {
    const out: InstalledMod[] = []
    for (const k of await driver.keys(prefix)) {
      const text = await driver.get(k)
      if (text) out.push(JSON.parse(text) as InstalledMod)
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }
  return {
    list,
    /** Add a mod from a file's text, on. Returns it, or why it can't be added. Replaces one with the same id. */
    async add(text: string): Promise<InstalledMod | string> {
      const mod = readMod(text, gameId)
      if (typeof mod === 'string') return mod
      const installed: InstalledMod = {
        id: mod.id,
        name: mod.name,
        version: mod.version,
        description: mod.description,
        enabled: true,
        pack: mod.pack,
      }
      await driver.set(key(mod.id), JSON.stringify(installed))
      return installed
    },
    async remove(id: string): Promise<void> {
      await driver.remove(key(id))
    },
    async setEnabled(id: string, enabled: boolean): Promise<void> {
      const text = await driver.get(key(id))
      if (!text) return
      await driver.set(key(id), JSON.stringify({ ...(JSON.parse(text) as InstalledMod), enabled }))
    },
    /** The packs of the mods that are on, in name order, to load after the game's own. */
    async packs(): Promise<Pack[]> {
      return (await list()).filter((mod) => mod.enabled).map((mod) => mod.pack)
    },
  }
}

export type Mods = ReturnType<typeof mods>
