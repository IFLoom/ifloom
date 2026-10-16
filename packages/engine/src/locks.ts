import { effectsOf } from './availability.ts'
import { holds, type Condition } from './condition.ts'
import type { Game } from './game.ts'
import type { Command, Effect, GameState } from './types.ts'

/**
 * Something the player cannot do for now, and why.
 *
 * A game's stretches — an intro that holds you in one room, a first morning
 * that only lets you get to work — are locks: data that says what is stopped,
 * while what holds, and the line the player reads. The reducer refuses on the
 * first lock that matches and the view greys the button out with the same
 * line, so the two cannot disagree.
 */
export type Lock = {
  /** While this holds, the lock is on. */
  when: Condition
  /**
   * Commands it stops, by type. `'*'` stops everything not in `except`. A
   * plugin's commands can be named one by one (`'quests/track'`) or all at once
   * (`'quests/*'`); `'custom'` stops every plugin command.
   */
  deny: readonly LockTarget[]
  except?: readonly LockTarget[]
  /**
   * Only commands that would apply this effect: a built-in kind (`'turn'`) or
   * a plugin's effect by name (`'calendar/pass'`). See `effectsOf`.
   */
  effect?: string
  /**
   * Leave a button this lock stops off the screen instead of greying it out:
   * an exit, a room's action, a game or plugin button. Not one that ignores locks.
   */
  hide?: boolean
  /** Why. The refusal and the disabled text are this same line. */
  reason: string
}

/** What a lock's `deny` and `except` can name: a command type, `'*'`, or a plugin command or plugin. */
export type LockTarget = Command['type'] | '*' | `${string}/${string}`

function names(list: readonly LockTarget[] | undefined, command: Command): boolean {
  if (!list) return false
  if (list.includes(command.type)) return true
  if (command.type !== 'custom') return false
  const plugin = command.name.split('/')[0]
  return list.includes(command.name as LockTarget) || list.includes(`${plugin}/*`)
}

function covers(lock: Lock, command: Command): boolean {
  if (names(lock.except, command)) return false
  return lock.deny.includes('*') || names(lock.deny, command)
}

/** The first lock that stops this command right now, if any. */
export function lockOn(
  state: GameState,
  game: Game,
  command: Command,
): Lock | undefined {
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
): Lock | undefined {
  for (const lock of game.rules?.locks ?? []) {
    if (!covers(lock, command)) continue
    if (!holds(state, lock.when, game)) continue
    if (lock.effect !== undefined) {
      const effect = lock.effect
      const applies = effects().some((entry) =>
        entry.kind === 'custom' ? entry.name === effect : entry.kind === effect,
      )
      if (!applies) continue
    }
    return lock
  }
  return undefined
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
  return (game.rules?.locks ?? []).some(
    (lock) => lock.deny.includes('*') && holds(state, lock.when, game),
  )
}
