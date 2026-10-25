/**
 * Locks: what the player can't do for now, and why. Content lists them in
 * `locks`; a command a lock stops is refused with its reason, and its button
 * greyed out with the same line.
 */
import type { Game } from '../game.ts'
import type { Command, Condition, Effect, GameState } from '../types.ts'
import { appended, defineFeature, type FeatureContext } from './feature.ts'

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
  /**
   * A name for it, so a later pack can replace it: a pack's lock with the
   * same id takes its place. Left out, a lock is simply added.
   */
  id?: string
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
   * Only commands that would apply this effect: the engine's by its key
   * (`'turn'`) or a plugin's by name (`'calendar/pass'`). See `effectsOf`.
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

/** What the locks feature adds, as types. */
export type LocksShape = {
  game: {
    /** What the player cannot do for now, and why. Checked in order; the first that stops a command gives the reason. */
    locks?: Lock[]
  }
  pack: {
    /** Locks after the ones before; one with the `id` of an earlier one takes its place. */
    locks?: Lock[]
  }
  lists: 'lock'
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

/**
 * The first lock that stops this command right now, if any, with the
 * command's effects from `effects`, asked only when a lock names an effect.
 */
export function lockIn(state: GameState, game: Game, command: Command, effects: () => readonly Effect[], cx: FeatureContext): Lock | undefined {
  for (const lock of game.locks ?? []) {
    if (!covers(lock, command)) continue
    if (!cx.holds(state, lock.when, game)) continue
    if (lock.effect !== undefined) {
      const effect = lock.effect
      // An effect's key names it, as a call's one key is its name.
      const applies = effects().some((entry) => Object.hasOwn(entry, effect))
      if (!applies) continue
    }
    return lock
  }
  return undefined
}

/** Why this command is stopped right now, or undefined if nothing stops it. */
export function lockedBy(state: GameState, game: Game, command: Command, cx: FeatureContext): string | undefined {
  return lockIn(state, game, command, () => cx.effectsOf(state, game, command), cx)?.reason
}

/** Is a lock on that stops everything? */
export function lockedOut(state: GameState, game: Game, cx: FeatureContext): boolean {
  return (game.locks ?? []).some((lock) => lock.deny.includes('*') && cx.holds(state, lock.when, game))
}

export const locks = defineFeature<LocksShape>({
  name: 'locks',
  // A lock is the first thing that stops a command: before the plugins' guards and what the command itself needs.
  refuses: (state, command, game, effects, cx) => lockIn(state, game, command, effects, cx)?.reason,
  pack: appended<LocksShape['game'], LocksShape['pack'], Lock>(
    'lock',
    (pack) => pack.locks,
    (game, list) => {
      game.locks = list
    },
  ),
  lists: ['lock'],
  check: (game, tools) => {
    ;(game.locks ?? []).forEach((lock, index) => {
      const id = lock.id ?? String(index)
      tools.check({ list: 'lock', id }, `lock ${id}`, [{ when: lock.when }])
    })
  },
})
