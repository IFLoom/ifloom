import type { Effect, GameState } from './types.ts'

/**
 * Lines that only land once a turn.
 *
 * A conversation that costs no time and pays a stat is an unbounded farm
 * without this. Capping the payout rather than the conversation keeps the
 * prose available and stops the grind, and it never takes progress away: come
 * back next turn and the line works again.
 */
const PREFIX = 'turn:'

/** Has the line with this id already landed this turn? */
export function usedThisTurn(state: GameState, id: string): boolean {
  const turn = state.kv[`${PREFIX}${id}`]
  return typeof turn === 'number' && turn === state.turn
}

/** The effect that records the line as landed this turn. */
export function markUsed(state: GameState, id: string): Effect {
  return { kv: `${PREFIX}${id}`, to: state.turn }
}

/**
 * The payout for a line, or nothing if it has already landed this turn. Pair
 * it with `usedBlock` so the choice explains itself instead of going quiet.
 */
export function oncePerTurn(state: GameState, id: string, effects: readonly Effect[]): Effect[] {
  if (usedThisTurn(state, id)) return []
  return [...effects, markUsed(state, id)]
}

/** Disabled text for a line already used this turn, or undefined while it is live. */
export function usedBlock(state: GameState, id: string, reason: string): string | undefined {
  return usedThisTurn(state, id) ? reason : undefined
}
