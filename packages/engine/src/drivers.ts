/**
 * Where saves are kept. The save store speaks to a driver and nothing else, so
 * a game picks where its saves live (the browser's localStorage or IndexedDB
 * from `@ifloom/browser`, memory for tests, or a driver of its own, such as a
 * desktop wrapper's file system or a sync service the player signs into)
 * without the rest of the engine knowing which.
 *
 * Every driver is asynchronous, whether or not its storage is, so a game can
 * swap one for another without changing a line that calls it.
 */
export type SaveDriver = {
  /** For diagnostics and the debug panel: "localStorage", "indexedDB"… */
  name: string
  /** The text stored under a key, or null if there's none. */
  get: (key: string) => Promise<string | null>
  /** Store text under a key, replacing what was there. */
  set: (key: string, value: string) => Promise<void>
  /** Delete a key. Nothing happens if it isn't there. */
  remove: (key: string) => Promise<void>
  /** Every key that starts with this prefix. */
  keys: (prefix: string) => Promise<string[]>
}

/** Saves in memory, gone when the page is. For tests and previews. */
export function memoryDriver(): SaveDriver {
  const store = new Map<string, string>()
  return {
    name: 'memory',
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => void store.set(key, value),
    remove: async (key) => void store.delete(key),
    keys: async (prefix) => [...store.keys()].filter((key) => key.startsWith(prefix)),
  }
}
