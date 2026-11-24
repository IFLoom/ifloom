import type { GameState, StorylineState } from './types.ts'

/** Returns a storyline's state in a new game, open and with an empty kv store. */
export function emptyStoryline(): StorylineState {
  return { closedUntil: null, kv: {} }
}

/** Returns the storyline's state in this save, or an empty one when the save has none. */
export function storylineOf(state: GameState, id: string): StorylineState {
  return state.storylines[id] ?? emptyStoryline()
}

/** Returns true when the storyline is open. A storyline closed until a turn opens again once that turn comes. */
export function storylineOpen(state: GameState, id: string): boolean {
  const closed = storylineOf(state, id).closedUntil
  return closed === null || state.turn >= closed
}
