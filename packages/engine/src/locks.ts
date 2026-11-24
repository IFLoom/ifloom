/**
 * The locks helpers the engine exports, with the core's context bound in. The feature and the lock types are in
 * `features/locks.ts`.
 */
import { effectsOf } from './availability.ts'
import type { Game } from './game.ts'
import { featureContext } from './core.ts'
import * as locks from './features/locks.ts'
import type { Command, Effect, GameState } from './types.ts'

export type { Lock, LockTarget } from './features/locks.ts'

/** Returns the first lock that stops this command now, or undefined when none does. */
export function lockOn(state: GameState, game: Game, command: Command): locks.Lock | undefined {
  return lockIn(state, game, command, () => effectsOf(state, game, command))
}

/**
 * Returns the first lock that stops this command now, as {@link lockOn} does, reading its effects from `effects`.
 * The engine calls `effects` only when a lock names an effect, so `whyNot` renders the open scene once.
 */
export function lockIn(state: GameState, game: Game, command: Command, effects: () => readonly Effect[]): locks.Lock | undefined {
  return locks.lockIn(state, game, command, effects, featureContext())
}

/** Returns the reason a lock stops this command now, or undefined when nothing stops it. */
export function lockedBy(state: GameState, game: Game, command: Command): string | undefined {
  return lockOn(state, game, command)?.reason
}

/**
 * Returns true while a lock that stops everything is on. Until it lifts, the player moves only through its scenes,
 * with no exits, characters or actions in the room.
 */
export function lockedOut(state: GameState, game: Game): boolean {
  return locks.lockedOut(state, game, featureContext())
}
