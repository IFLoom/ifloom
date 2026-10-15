import type { GameState } from './types.ts'

/** How many notices the state keeps. The oldest go first. */
export const NOTICES_KEPT = 50

/**
 * Something the game tells the player outside a scene: a message arrived, a
 * quest moved on, the rent is due. Raised by the `notify` effect, shown by the
 * UI as a badge or a toast, and marked seen with the `dismiss` command.
 */
export type Notice = {
  id: string
  /** A short line, as written. */
  title: string
  /** A prose key for more words, if there are any. */
  text?: string
  image?: string
  /** What it is about, for badges: `'messages'`, `'quests'`. */
  tag?: string
  /** The turn it was raised. */
  turn: number
  seen: boolean
}

/** The state with a notice raised. One with the id of an earlier notice replaces it, unseen, as the newest. */
export function notify(state: GameState, notice: Omit<Notice, 'id' | 'turn' | 'seen'> & { id?: string }): GameState {
  const list = state.notices ?? []
  // A made-up id is the first free one for this turn, so a full list never hands out one in use.
  let id = notice.id
  for (let n = 0; id === undefined; n += 1) {
    const candidate = `notice.${state.turn}.${n}`
    if (!list.some((entry) => entry.id === candidate)) id = candidate
  }
  const next = [...list.filter((entry) => entry.id !== id), { ...notice, id, turn: state.turn, seen: false }]
  return { ...state, notices: next.slice(Math.max(0, next.length - NOTICES_KEPT)) }
}

/** The state with one notice, or every notice, marked seen. */
export function dismiss(state: GameState, id?: string): GameState {
  const list = state.notices ?? []
  if (!list.some((entry) => !entry.seen && (id === undefined || entry.id === id))) return state
  return { ...state, notices: list.map((entry) => (id === undefined || entry.id === id ? { ...entry, seen: true } : entry)) }
}
