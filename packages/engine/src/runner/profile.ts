/**
 * The runner's side of the profile: its writes, queued in order; what each
 * plugin's view is shown of it; the namespaces something else follows, such
 * as the player's settings; and what a command records there (the features'
 * writes, `finished`, each plugin's `profile`). Internal; `createRunner`
 * composes it.
 */
import { holds } from '../condition.ts'
import type { Game } from '../game.ts'
import { pluginContext, pluginsOf, type Plugin } from '../plugin.ts'
import type { Profile } from '../profile.ts'
import { runnerHooks } from '../features/registry.ts'
import type { Command, GameState } from '../types.ts'

/** The runner's side of the profile, its writes queued in order. */
export type ProfileKeeper = {
  /** The profile kept, or undefined without one: then every write is dropped and nothing is read. */
  readonly profile: Profile | undefined
  /** Queue a write. A failure is reported and doesn't stop the ones after it. */
  remember(write: (profile: Profile) => Promise<unknown>): void
  /** Settles when every write queued so far is done, and every namespace followed has been first read. */
  settled(): Promise<void>
  /** What each plugin's view is shown of the profile, by plugin id: each namespace as last read or written, frozen. */
  shown(): Readonly<Record<string, unknown>>
  /**
   * Follow a namespace: `heard` gets what it holds once read, then every
   * write to it. A write heard while the first read is out is newer, so the
   * read is dropped. Without a profile, nothing is heard.
   */
  follow(namespace: string, heard: (value: unknown) => void): void
  /** After a command took: what it changes in the profile, from the features' runner hooks, the game's `finished` and each plugin's `profile`. */
  record(before: GameState, after: GameState, command: Command): void
}

/** Settings for `profileKeeper`. */
export type ProfileOptions = {
  /** The profile, or undefined for none. */
  profile?: Profile
  /** The clock `finished` is dated by. */
  now: () => number
  /** Told when a write fails. */
  onError?: (error: unknown) => void
  /** A plugin's namespace now reads differently: its view should be built again. */
  onShown: (plugin: Plugin<unknown>) => void
}

/** Returns the runner's side of the profile for a game. */
export function profileKeeper(game: Game, options: ProfileOptions): ProfileKeeper {
  const { profile, now, onError, onShown } = options
  let queue: Promise<unknown> = Promise.resolve()
  // Once `finished` is known to be recorded, it isn't looked at again.
  let finishedRecorded = false
  // The plugins with a view, by id: what their views see of the profile follows their namespaces.
  const viewers = new Map((profile ? pluginsOf(game) : []).filter((plugin) => plugin.view).map((plugin) => [plugin.id, plugin]))
  let shown: Readonly<Record<string, unknown>> = {}
  const followers = new Map<string, (value: unknown) => void>()

  function remember(write: (profile: Profile) => Promise<unknown>): void {
    if (!profile) return
    queue = queue.then(() => write(profile)).catch((error: unknown) => onError?.(error))
  }

  /** A plugin's namespace was read or written: if its view would see something new, it's built again. */
  function seen(namespace: string, value: unknown): void {
    const plugin = viewers.get(namespace)
    if (!plugin) return
    if (JSON.stringify(shown[namespace]) === JSON.stringify(value)) return
    shown = { ...shown, [namespace]: frozenCopy(value) }
    onShown(plugin)
  }

  if (profile) {
    profile.subscribe((namespace, value) => {
      const follower = followers.get(namespace)
      if (follower) follower(value)
      else seen(namespace, value)
    })
    for (const id of viewers.keys()) remember(async (store) => seen(id, await store.get(id)))
  }

  return {
    profile,
    remember,
    async settled() {
      await queue
    },
    shown: () => shown,
    follow(namespace, heard) {
      if (!profile) return
      let written = false
      followers.set(namespace, (value) => {
        written = true
        heard(value)
      })
      remember(async (store) => {
        const value = await store.get(namespace)
        if (!written) heard(value)
      })
    },
    record(before, after, command) {
      if (!profile) return
      // The features' first: a play setting changed is written for the next game.
      for (const hooks of runnerHooks) hooks.afterCommand?.(command, remember)
      if (game.finished && !finishedRecorded && holds(after, game, game.finished)) {
        finishedRecorded = true
        const at = now()
        remember((store) => store.update('core:finished', (stored) => stored ?? { at }))
      }
      // The game's own rules first, under `game`, then each plugin under its id.
      for (const plugin of pluginsOf(game)) {
        const keep = plugin.profile
        if (!keep) continue
        remember((store) => store.update(plugin.id, (stored) => keep(after, before, stored, pluginContext(plugin, after, game))))
      }
    },
  }
}

/** A deep, frozen copy of a JSON value from the profile, so a view can read it and never change what is stored. */
function frozenCopy(value: unknown): unknown {
  if (value === undefined) return undefined
  const freeze = (entry: unknown): unknown => {
    if (entry && typeof entry === 'object') {
      for (const inner of Object.values(entry)) freeze(inner)
      Object.freeze(entry)
    }
    return entry
  }
  return freeze(JSON.parse(JSON.stringify(value)))
}

/**
 * Returns the profile as `runner.profile` gives it, one that never rejects. A
 * read the driver fails answers undefined, and a write it fails is dropped,
 * each told to `onError`, so a UI can call it without a `catch`.
 */
export function reportingProfile(profile: Profile, onError: ((error: unknown) => void) | undefined): Profile {
  async function reported<T>(step: Promise<T>): Promise<T | undefined> {
    try {
      return await step
    } catch (error) {
      onError?.(error)
      return undefined
    }
  }
  return {
    get: <T>(namespace: string) => reported(profile.get<T>(namespace)),
    set: async (namespace, value) => {
      await reported(profile.set(namespace, value))
    },
    update: <T>(namespace: string, change: (current: T | undefined) => T | undefined) => reported(profile.update<T>(namespace, change)),
    subscribe: (listener) => profile.subscribe(listener),
  }
}
