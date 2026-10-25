import type { SaveDriver } from '@ifloom/engine'

/*
 * The browser's save drivers: where a game in a browser keeps its saves, its
 * profile and its mods. The engine's save store speaks only to a `SaveDriver`,
 * and keeps the in-memory one, `memoryDriver`, for tests.
 */

/** The parts of the Web Storage API a driver needs. `localStorage` is one. */
export type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  key: (index: number) => string | null
  readonly length: number
}

/**
 * Saves in `localStorage` (or any Web Storage). Simple and everywhere, but
 * small: around 5MB per origin, and in Chromium every page opened from disk
 * shares one origin. Pass a storage to use another, as tests do.
 */
export function localStorageDriver(storage?: StorageLike): SaveDriver {
  const store = () => {
    const found = storage ?? (globalThis as { localStorage?: StorageLike }).localStorage
    if (!found) throw new Error('localStorage is not available here')
    return found
  }
  return {
    name: 'localStorage',
    get: async (key) => store().getItem(key),
    set: async (key, value) => store().setItem(key, value),
    remove: async (key) => store().removeItem(key),
    keys: async (prefix) => {
      const s = store()
      const out: string[] = []
      for (let i = 0; i < s.length; i += 1) {
        const key = s.key(i)
        if (key?.startsWith(prefix)) out.push(key)
      }
      return out
    },
  }
}

/* The slice of IndexedDB the driver touches, typed here so a test can hand in
 * its own. */
type Request<T> = {
  result: T
  error: unknown
  onsuccess: (() => void) | null
  onerror: (() => void) | null
}
type ObjectStore = {
  get: (key: string) => Request<unknown>
  put: (value: string, key: string) => Request<unknown>
  delete: (key: string) => Request<unknown>
  getAllKeys: () => Request<unknown[]>
}
type Database = {
  objectStoreNames: { contains: (name: string) => boolean }
  createObjectStore: (name: string) => unknown
  transaction: (store: string, mode: 'readonly' | 'readwrite') => { objectStore: (name: string) => ObjectStore }
}
type OpenRequest = Request<Database> & { onupgradeneeded: (() => void) | null }
/** The parts of `indexedDB` a driver needs. */
export type IndexedDbLike = { open: (name: string, version?: number) => OpenRequest }

function settle<T>(request: Request<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Saves in IndexedDB: asynchronous and roomy, the right home for long games,
 * big backlogs and mod data. Opens (and if needed creates) one database with
 * one store of strings by key.
 */
export function indexedDbDriver(options: { database?: string; store?: string; indexedDB?: IndexedDbLike } = {}): SaveDriver {
  const databaseName = options.database ?? 'ifloom'
  const storeName = options.store ?? 'saves'
  let opened: Promise<Database> | undefined
  const open = () => {
    if (opened) return opened
    const factory = options.indexedDB ?? (globalThis as { indexedDB?: IndexedDbLike }).indexedDB
    if (!factory) return Promise.reject(new Error('IndexedDB is not available here'))
    const request = factory.open(databaseName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName)
      }
    }
    opened = settle(request)
    return opened
  }
  const store = async (mode: 'readonly' | 'readwrite') => (await open()).transaction(storeName, mode).objectStore(storeName)
  return {
    name: 'indexedDB',
    get: async (key) => {
      const value = await settle((await store('readonly')).get(key))
      return typeof value === 'string' ? value : null
    },
    set: async (key, value) => void (await settle((await store('readwrite')).put(value, key))),
    remove: async (key) => void (await settle((await store('readwrite')).delete(key))),
    keys: async (prefix) => {
      const keys = await settle((await store('readonly')).getAllKeys())
      return keys.filter((key): key is string => typeof key === 'string' && key.startsWith(prefix))
    },
  }
}
