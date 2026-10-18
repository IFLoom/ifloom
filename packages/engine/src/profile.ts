import type { SaveDriver } from './drivers.ts'
import type { Game } from './game.ts'

/**
 * What outlives a save: the player's settings, whether they have finished the
 * game, and whatever plugins keep (achievements, say). One JSON object of
 * namespaces, kept at `<game id>.profile` in a save driver.
 *
 * The engine uses two namespaces: `core:settings` (every setting's stored
 * value, by id) and `core:finished` (`{ at }`, when the game was first
 * finished). A UI uses `ui:` names (the React gate is `ui:gate`). A plugin
 * uses its own bare id, which can't hold a `:`, so the prefixes are reserved.
 */
export type Profile = {
  /** What a namespace holds, or undefined if nothing does. */
  get: <T = unknown>(namespace: string) => Promise<T | undefined>
  /** Store a value in a namespace. Undefined clears it. */
  set: (namespace: string, value: unknown) => Promise<void>
  /**
   * Change a namespace from what it holds now, with no other write in
   * between. Return undefined (or the same value) to leave it. Resolves to
   * what it holds afterwards.
   */
  update: <T = unknown>(namespace: string, change: (current: T | undefined) => T | undefined) => Promise<T | undefined>
  /** Hear about every write, with the namespace and its new value. Returns the way to stop. */
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
 * A game's profile, kept wherever its driver keeps things. Reads and writes
 * run one at a time, in order. Only the game's `id` is read, so a profile can
 * be opened before the game is built: `profile({ id: 'small-town' }, driver)`.
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
