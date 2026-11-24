/**
 * The runner's saves: the store it writes to, watched so its listing follows
 * every write and removal; its writes, queued in order; the autosave policy;
 * and saving now, refused while the game says so. Internal; `createRunner`
 * composes it.
 */
import type { Game } from '../game.ts'
import { fail, type Result } from '../result.ts'
import type { LoadedSave, SaveListing, SaveMeta, Saves } from '../save.ts'
import { stringOf } from '../strings.ts'
import type { GameState } from '../types.ts'

/** Settings for autosave, when the runner saves on its own. Autosave is off unless `createRunner` is given these. */
export type AutosaveOptions = {
  /** The slot autosave writes to. `'auto'` if left out. */
  slot?: string
  /**
   * The moment autosave writes, after every command or only when the scene or the turn changes. It skips a save while
   * the game's `saveable` refuses saving.
   */
  every: 'command' | 'scene' | 'turn'
}

/** The runner's saves, its writes and its autosave. */
export type SaveKeeper = {
  /** The saves written to, watched: what they write and remove shows in `listed`. Undefined without saves. */
  readonly store: Saves | undefined
  /** Every save, as `saves.list()` orders them: read once when the keeper starts, then kept up to date. */
  listed(): readonly SaveListing[]
  /** After any change of state, save if the policy says so. `ticking` for a `tick`, which isn't a command for `'command'`. */
  changed(before: GameState, after: GameState, ticking: boolean, played: () => number): void
  /** Save `state` to a slot now, or why not. */
  save(slot: string, state: GameState, name: string | undefined, played: number): Promise<Result<SaveMeta>>
  /** Read a slot: the save, null when it's empty, or why it can't be read. */
  load(slot: string): Promise<Result<LoadedSave | null>>
  /** Settles when every write queued so far, and the first listing, are done. */
  settled(): Promise<void>
}

/** Settings for `saveKeeper`. */
export type SaveOptions = {
  /** The save store, or undefined for none. */
  saves?: Saves
  /** The autosave policy, or undefined for none. */
  autosave?: AutosaveOptions
  /** Told the driver's error whenever the store answers a failure it caused. */
  onError?: (error: unknown) => void
  /** Why the game refuses saving in this state, or undefined when it allows it. */
  refuses: (state: GameState) => string | undefined
  /** The listing changed. */
  changedList: () => void
}

/** Returns the runner's saves for a game, its writes queued in order. */
export function saveKeeper(game: Game, options: SaveOptions): SaveKeeper {
  const { saves: given, autosave, onError, refuses, changedList } = options
  let queue: Promise<unknown> = Promise.resolve()
  let listed: readonly SaveListing[] = []

  /** Tell `onError` about a failure the driver caused, and pass the answer on. */
  function reported<T>(result: Result<T>): Result<T> {
    if (!result.ok && result.cause !== undefined) onError?.(result.cause)
    return result
  }

  /** Change the listing, and say so. */
  function relist(entries: readonly SaveListing[]): void {
    listed = sortedSaves(entries)
    changedList()
  }

  const store: Saves | undefined = given && {
    driver: given.driver,
    async write(slot, toSave, extra) {
      const written = reported(await given.write(slot, toSave, extra))
      if (written.ok) relist([written.value, ...listed.filter((entry) => entry.slot !== slot)])
      return written
    },
    read: async (slot) => reported(await given.read(slot)),
    list: async () => reported(await given.list()),
    async remove(slot) {
      const removed = reported(await given.remove(slot))
      if (removed.ok && listed.some((entry) => entry.slot === slot)) relist(listed.filter((entry) => entry.slot !== slot))
      return removed
    },
    exportSlot: async (slot) => reported(await given.exportSlot(slot)),
    importText: (text) => given.importText(text),
  }

  // The saves as they are when the runner starts, before any write it queues; `settled` waits for them.
  if (store) {
    queue = queue.then(async () => {
      const first = await store.list()
      if (first.ok) relist(first.value)
    })
  }

  /** Whether the autosave policy wants a save now. */
  function due(before: GameState, after: GameState, ticking: boolean): boolean {
    const every = autosave?.every
    if (!every || !store) return false
    if (every === 'command') return !ticking
    if (every === 'scene') return before.sceneId !== after.sceneId
    return before.turn !== after.turn
  }

  return {
    store,
    listed: () => listed,
    changed(before, after, ticking, played) {
      // While the game's `saveable` refuses, autosave waits for the next change that's due.
      if (!store || !due(before, after, ticking) || refuses(after) !== undefined) return
      const slot = autosave?.slot ?? 'auto'
      // A write that fails is reported, and the ones after it still run.
      queue = queue.then(() => store.write(slot, after, { played: played() }))
    },
    async save(slot, state, name, played) {
      if (!store) return fail(stringOf(game, 'noSaves'))
      const refused = refuses(state)
      if (refused !== undefined) return fail(refused)
      await queue
      return store.write(slot, state, { name, played })
    },
    async load(slot) {
      if (!store) return fail(stringOf(game, 'noSaves'))
      return store.read(slot)
    },
    async settled() {
      await queue
    },
  }
}

/** Saves as `saves.list()` orders them: newest first, then the ones that can't be read, by slot. */
function sortedSaves(entries: readonly SaveListing[]): SaveListing[] {
  const readable = entries.filter((entry): entry is SaveMeta => !('broken' in entry)).sort((a, b) => b.savedAt - a.savedAt)
  const broken = entries.filter((entry) => 'broken' in entry).sort((a, b) => a.slot.localeCompare(b.slot))
  return [...readable, ...broken]
}
