import type { SaveDriver } from './drivers.ts'
import type { Game } from './game.ts'

/**
 * What outlives a save: the player's settings, whether they have finished the
 * game, and whatever plugins keep (achievements, say). One JSON object of
 * namespaces, kept at `<game id>.profile` in a save driver.
 *
 * Core uses two namespaces: `settings` (every setting's stored value, by id)
 * and `finished` (`{ at }`, when the game was first finished). A plugin uses
 * its own id.
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

/** A game's profile, kept wherever its driver keeps things. Reads and writes run one at a time, in order. */
export function profile(game: Game, driver: SaveDriver): Profile {
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
    data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
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
    get: <T,>(namespace: string) => next(async () => (await read())[namespace] as T | undefined),
    set: (namespace, value) => next(() => write(namespace, value)),
    update: <T,>(namespace: string, change: (current: T | undefined) => T | undefined) =>
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
