/**
 * Locks as the engine exports them, with the core's context bound in. The
 * feature, and what a lock is, are in `features/locks.ts`.
 */
import { effectsOf } from './availability.ts'
import type { Game } from './game.ts'
import { featureContext } from './core.ts'
import * as locks from './features/locks.ts'
import type { Command, Effect, GameState } from './types.ts'

export type { Lock, LockTarget } from './features/locks.ts'

/** The first lock that stops this command right now, if any. */
export function lockOn(
  state: GameState,
  game: Game,
  command: Command,
): locks.Lock | undefined {
  return lockIn(state, game, command, () => effectsOf(state, game, command))
}

/**
 * `lockOn`, with the command's effects from `effects`, asked only when a lock
 * names an effect: how `whyNot` shares one rendering of the open scene.
 */
export function lockIn(
  state: GameState,
  game: Game,
  command: Command,
  effects: () => readonly Effect[],
): locks.Lock | undefined {
  return locks.lockIn(state, game, command, effects, featureContext())
}

/** Why this command is stopped right now, or undefined if nothing stops it. */
export function lockedBy(
  state: GameState,
  game: Game,
  command: Command,
): string | undefined {
  return lockOn(state, game, command)?.reason
}

/**
 * Is a lock on that stops everything? While one is, the player is in a
 * stretch that only moves through its scenes: there are no exits, no people
 * to approach, nothing to do in the room.
 */
export function lockedOut(state: GameState, game: Game): boolean {
  return locks.lockedOut(state, game, featureContext())
}
