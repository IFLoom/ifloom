import type { SaveDriver } from './drivers.ts'
import type { Game } from './game.ts'

/**
 * The player's record that outlives a save, such as settings, whether they have finished the game, and plugins' records
 * like achievements. It is one JSON object of namespaces, kept at `<game id>.profile` in a save driver.
 *
 * The engine uses two namespaces, `core:settings` (each setting's stored value, by id) and `core:finished` (`{ at }`,
 * when the game was first finished). A UI uses `ui:` names, such as the React UI's gate, `ui:gate`. A plugin uses its
 * own bare id, which can't hold a `:`, so the prefixes are reserved.
 */
export type Profile = {
  /** Returns the value a namespace holds, or undefined if it holds none. */
  get: <T = unknown>(namespace: string) => Promise<T | undefined>
  /** Stores a value in a namespace. Undefined clears it. */
  set: (namespace: string, value: unknown) => Promise<void>
  /**
   * Changes a namespace from the value it holds now, with no other write in between, and returns the value it holds
   * afterwards. Return undefined, or the same value, from `change` to leave it.
   */
  update: <T = unknown>(namespace: string, change: (current: T | undefined) => T | undefined) => Promise<T | undefined>
  /** Calls a listener with the namespace and new value of every write, and returns a function that stops it. */
  subscribe: (listener: (namespace: string, value: unknown) => void) => () => void
}

/** Namespaces a profile stored before they took the `core:` and `ui:` prefixes, and their names now. */
const RENAMED: Readonly<Record<string, string>> = { settings: 'core:settings', finished: 'core:finished', gate: 'ui:gate' }

/**
 * Move the namespaces of a profile stored under the old names to the new
 * ones. Returns undefined when nothing needed moving. A new name already
 * holding a value keeps it.
 */
function renamed(data: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!Object.keys(RENAMED).some((old) => old in data)) return undefined
  const out = { ...data }
  for (const [old, now] of Object.entries(RENAMED)) {
    if (!(old in out)) continue
    if (!(now in out)) out[now] = out[old]
    delete out[old]
  }
  return out
}

/**
 * Returns the {@link Profile} of a game, kept by a driver. Reads and writes run one at a time, in order.
 *
 * It reads only the game's `id`, so a profile can be opened before the game is built, as in
 * `profile({ id: 'small-town' }, driver)`.
 */
export function profile(game: Pick<Game, 'id'>, driver: SaveDriver): Profile {
  const key = `${game.id}.profile`
  const listeners = new Set<(namespace: string, value: unknown) => void>()
  let data: Record<string, unknown> | undefined
  let queue: Promise<unknown> = Promise.resolve()

  /** Run one step after every one before it; a failed step does not stop the next. */
  function next<T>(step: () => Promise<T>): Promise<T> {
    const run = queue.then(step)
    queue = run.catch(() => undefined)
    return run
  }

  async function read(): Promise<Record<string, unknown>> {
    if (data) return data
    const text = await driver.get(key)
    let parsed: unknown = null
    try {
      parsed = text === null ? null : JSON.parse(text)
    } catch {
      // An unreadable profile starts again empty.
    }
    const stored = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    // A profile from before the prefixes is moved once, and written back moved.
    const moved = renamed(stored)
    if (moved) await driver.set(key, JSON.stringify(moved))
    data = moved ?? stored
    return data
  }

  async function write(namespace: string, value: unknown): Promise<void> {
    const current = await read()
    const updated = { ...current }
    if (value === undefined) delete updated[namespace]
    else updated[namespace] = value
    await driver.set(key, JSON.stringify(updated))
    data = updated
    for (const listener of listeners) listener(namespace, value)
  }

  return {
    get: <T>(namespace: string) => next(async () => (await read())[namespace] as T | undefined),
    set: (namespace, value) => next(() => write(namespace, value)),
    update: <T>(namespace: string, change: (current: T | undefined) => T | undefined) =>
      next(async () => {
        const current = (await read())[namespace] as T | undefined
        const value = change(current)
        if (value === undefined || value === current) return current
        await write(namespace, value)
        return value
      }),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
