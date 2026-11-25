import type { GameState } from './types.ts'

/** The number of notices the state keeps. The oldest go first when there are more. */
export const NOTICES_KEPT = 50

/**
 * A message the game gives the player outside a scene, such as a quest moving on or the rent falling due. The `notify`
 * effect raises one, and the `dismiss` command marks it seen.
 *
 * A UI shows a notice as a badge or a toast.
 */
export type Notice = {
  /** The notice's id. A notice raised with the id of an earlier one replaces it. */
  id: string
  /** The notice's short line, kept as written. The view fills its tokens. */
  title: string
  /** The notice's longer words, kept as written. The view fills their tokens. */
  text?: string
  /** The notice's picture, as a path in the game's `art/` folder (`'notes/bins.jpg'`) or a URL. */
  image?: string
  /** The notice's subject, for grouping badges, such as `'messages'` or `'quests'`. */
  tag?: string
  /** The turn the notice was raised on. */
  turn: number
  /** The notice's seen mark, true once the player has dismissed it. */
  seen: boolean
}

/** Returns the state with a notice raised. A notice with the id of an earlier one replaces it, unseen, as the newest. */
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

/** Returns the state with the notice `id` marked seen, or every notice when `id` is left out. */
export function dismiss(state: GameState, id?: string): GameState {
  const list = state.notices ?? []
  if (!list.some((entry) => !entry.seen && (id === undefined || entry.id === id))) return state
  return { ...state, notices: list.map((entry) => (id === undefined || entry.id === id ? { ...entry, seen: true } : entry)) }
}
