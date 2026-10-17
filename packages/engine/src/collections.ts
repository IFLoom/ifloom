import type { Game } from './game.ts'
import type { KvValue, GameState } from './types.ts'

/**
 * A named list the game keeps entries in: photos taken, notes written, letters
 * found, a ledger. Effects add to it with `collect` and take from it with
 * `discard`; the `{ collection }` condition asks what is in it.
 */
export type CollectionDef = {
  id: string
  /** What the player sees it called. */
  name: string
  /** Keep at most this many; the oldest go first. No limit if left out. */
  max?: number
}

/** An entry as content writes it in a `collect` effect. */
export type CollectionItem = {
  /** Unique within the collection. Collecting an id that is already there does nothing. */
  id: string
  /** A short label, as written. */
  title?: string
  /** A prose key for the entry's words. */
  text?: string
  image?: string
  /** Anything else the game wants to keep with it. */
  data?: Record<string, KvValue>
}

/** An entry as the state keeps it: what was collected, and the turn it was. */
export type CollectionEntry = CollectionItem & { turn: number }

export function collectionById(game: Game, id: string): CollectionDef | undefined {
  return game.collections?.find((entry) => entry.id === id)
}

/** The entries in a collection, oldest first. */
export function collected(state: GameState, id: string): CollectionEntry[] {
  return state.collections?.[id] ?? []
}

/** The state with an entry added, unless it is already there. */
export function collect(state: GameState, game: Game, to: string, item: CollectionItem): GameState {
  const entries = collected(state, to)
  if (entries.some((entry) => entry.id === item.id)) return state
  const max = collectionById(game, to)?.max
  let next = [...entries, { ...item, turn: state.turn }]
  if (max !== undefined && next.length > max) next = next.slice(next.length - max)
  return { ...state, collections: { ...state.collections, [to]: next } }
}

/** The state with an entry taken out, if it is there. */
export function discard(state: GameState, from: string, id: string): GameState {
  const entries = collected(state, from)
  if (!entries.some((entry) => entry.id === id)) return state
  return { ...state, collections: { ...state.collections, [from]: entries.filter((entry) => entry.id !== id) } }
}
