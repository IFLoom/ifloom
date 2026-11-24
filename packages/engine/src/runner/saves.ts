/**
 * The runner's saves: the store it writes to, watched so its listing follows
 * every write and removal; its writes, queued in order; the autosave policy;
 * and saving now, refused while the game says so. Internal; `createRunner`
 * composes it.
 */
import type { Game } from '../game.ts'
import { fail, ok, type Result } from '../result.ts'
import type { SaveListing, SaveMeta, Saves } from '../save.ts'
import { stringOf } from '../strings.ts'
import type { GameState } from '../types.ts'

/** When the runner saves on its own. Off unless the game sets it. */
export type AutosaveOptions = {
  /** The slot it writes to. `'auto'` if left out. */
  slot?: string
  /** After every command, or only when the scene or the turn changes. Skipped while the game's `saveable` refuses saving. */
  every: 'command' | 'scene' | 'turn'
}

export type SaveKeeper = {
  /** The saves written to, watched: what they write and remove shows in `listed`. Undefined without saves. */
  readonly store: Saves | undefined
  /** Every save, as `saves.list()` orders them: read once when the keeper starts, then kept up to date. */
  listed(): readonly SaveListing[]
  /** After any change of state, save if the policy says so. `ticking` for a `tick`, which isn't a command for `'command'`. */
  changed(before: GameState, after: GameState, ticking: boolean, played: () => number): void
  /** Save `state` to a slot now, or why not. */
  save(slot: string, state: GameState, name: string | undefined, played: number): Promise<Result<SaveMeta>>
  /** Settles when every write queued so far, and the first listing, are done. */
  settled(): Promise<void>
}

export type SaveOptions = {
  saves?: Saves
  autosave?: AutosaveOptions
  /** Told when a write fails. */
  onError?: (error: unknown) => void
  /** Why the game refuses saving in this state, or undefined when it allows it. */
  refuses: (state: GameState) => string | undefined
  /** The listing changed. */
  changedList: () => void
}

export function saveKeeper(game: Game, options: SaveOptions): SaveKeeper {
  const { saves: given, autosave, onError, refuses, changedList } = options
  let queue: Promise<SaveMeta | null> = Promise.resolve(null)
  let listed: readonly SaveListing[] = []

  /** Queue a write. A failure is reported and does not stop the ones after it. */
  function queueWrite(write: () => Promise<SaveMeta>): Promise<SaveMeta | null> {
    const next = queue.then(write).catch((error: unknown) => {
      onError?.(error)
      return null
    })
    queue = next
    return next
  }

  const store: Saves | undefined = given && {
    driver: given.driver,
    async write(slot, toSave, extra) {
      const meta = await given.write(slot, toSave, extra)
      listed = sortedSaves([meta, ...listed.filter((entry) => entry.slot !== meta.slot)])
      changedList()
      return meta
    },
    read: (slot) => given.read(slot),
    list: () => given.list(),
    async remove(slot) {
      await given.remove(slot)
      if (!listed.some((entry) => entry.slot === slot)) return
      listed = listed.filter((entry) => entry.slot !== slot)
      changedList()
    },
    exportSlot: (slot) => given.exportSlot(slot),
    importText: (text) => given.importText(text),
  }

  // The saves as they are when the runner starts, before any write it queues; `settled` waits for them.
  if (store) {
    queue = queue
      .then(async () => {
        listed = await store.list()
        changedList()
        return null
      })
      .catch((error: unknown) => {
        onError?.(error)
        return null
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
      void queueWrite(() => store.write(slot, after, { played: played() }))
    },
    async save(slot, state, name, played) {
      if (!store) return fail(stringOf(game, 'noSaves'))
      const refused = refuses(state)
      if (refused !== undefined) return fail(refused)
      await queue
      try {
        return ok(await store.write(slot, state, { name, played }))
      } catch (error) {
        onError?.(error)
        return fail(stringOf(game, 'notSaved'))
      }
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
