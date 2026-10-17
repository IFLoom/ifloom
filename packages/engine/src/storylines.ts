import type { GameState, StorylineState } from './types.ts'

/** A storyline as a new game has it: open, with nothing in its kv store. */
export function emptyStoryline(): StorylineState {
  return { closedUntil: null, kv: {} }
}

/** A storyline's state, or an empty one if the save has none. */
export function storylineOf(state: GameState, id: string): StorylineState {
  return state.storylines[id] ?? emptyStoryline()
}

/** Is the storyline open: not closed, or closed until a turn that has come? */
export function storylineOpen(state: GameState, id: string): boolean {
  const closed = storylineOf(state, id).closedUntil
  return closed === null || state.turn >= closed
}
