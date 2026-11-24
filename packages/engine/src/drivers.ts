/**
 * A store of text by key that the save store and the profile write to. Every driver is asynchronous, even over
 * synchronous storage, so a game can swap one for another.
 *
 * The save store talks to a driver and nothing else, so a game chooses where its saves are kept. `@ifloom/browser` has
 * drivers for localStorage and IndexedDB, `memoryDriver` keeps them in memory, and a game can write its own, such as a
 * desktop wrapper's file system or a sync service.
 */
export type SaveDriver = {
  /** The driver's name, such as "localStorage" or "indexedDB", for diagnostics and the debug panel. */
  name: string
  /** Returns the text stored under a key, or null if there's none. */
  get: (key: string) => Promise<string | null>
  /** Stores text under a key, replacing what was there. */
  set: (key: string, value: string) => Promise<void>
  /** Deletes a key, and does nothing if it isn't there. */
  remove: (key: string) => Promise<void>
  /** Returns every key that starts with a prefix. */
  keys: (prefix: string) => Promise<string[]>
}

/** Returns a {@link SaveDriver} that keeps saves in memory, gone when the page is. Use it for tests and previews. */
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
