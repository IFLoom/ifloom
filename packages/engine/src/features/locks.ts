/**
 * Locks: what the player can't do for now, and why. Content lists them in
 * `locks`; a command a lock stops is refused with its reason, and its button
 * greyed out with the same line.
 */
import type { Game } from '../game.ts'
import type { Command, Condition, Effect, GameState } from '../types.ts'
import { appended, defineFeature, listWords, type FeatureContext } from './feature.ts'

/**
 * A lock the game declares in `locks`, which stops some commands while its `when` holds. The engine refuses the
 * command with `reason`, and the view greys out its button with the same line.
 *
 * A game's stretches are locks, such as an intro that keeps you at one location or a first morning that only lets you
 * get to work. The reducer and the view read the same first lock that matches, so they can't disagree.
 */
export type Lock = {
  /** The lock's id, so a later pack can replace it. A lock with no id is always added. */
  id?: string
  /** The lock's condition. The lock is on while it holds. */
  when: Condition
  /**
   * The commands the lock stops, by type. `'*'` stops every command not in `except`.
   *
   * A plugin's commands can be named one by one (`'quests/track'`) or all at once (`'quests/*'`), and `'custom'`
   * stops every plugin command.
   */
  deny: readonly LockTarget[]
  /** The commands the lock lets through all the same, named as in `deny`. */
  except?: readonly LockTarget[]
  /**
   * The effect a command must apply for the lock to stop it, named by its key. That's the engine's key (`'turn'`)
   * or a plugin's name (`'calendar/pass'`), checked against `effectsOf`.
   */
  effect?: string
  /**
   * The lock's hide mark, true to leave the buttons it stops off the screen rather than greyed out. It covers the
   * room's buttons, the places plugin's exits included, and never a command that ignores locks.
   */
  hide?: boolean
  /** The lock's reason, the line both the refusal and the greyed-out button show. */
  reason: string
}

/** The locks feature's content key, as types. */
export type LocksShape = {
  game: {
    /** The game's locks, checked in order. The first one that stops a command gives the reason. */
    locks?: Lock[]
  }
  pack: {
    /** The pack's locks, added after the content's. A lock with the `id` of an earlier one replaces it. */
    locks?: Lock[]
  }
  lists: 'lock'
}

/** A name a lock's `deny` and `except` take. It's a command type, `'*'`, a plugin command (`'quests/track'`) or a whole plugin (`'quests/*'`). */
export type LockTarget = Command['type'] | '*' | `${string}/${string}`

function names(list: readonly LockTarget[] | undefined, command: Command): boolean {
  if (!list) return false
  if (list.includes(command.type)) return true
  // A plugin's action, `{ type: 'action', id: 'devices/camera' }`, is the plugin's as its commands are, so `devices/*` names it.
  if (command.type === 'action') return command.id.includes('/') && list.includes(`${command.id.split('/')[0]}/*` as LockTarget)
  if (command.type !== 'custom') return false
  const plugin = command.name.split('/')[0]
  return list.includes(command.name as LockTarget) || list.includes(`${plugin}/*`)
}

function covers(lock: Lock, command: Command): boolean {
  if (names(lock.except, command)) return false
  return lock.deny.includes('*') || names(lock.deny, command)
}

/**
 * Returns the first lock that stops the command now, or undefined. `effects` lists the command's effects, and it's
 * called only when a lock names an effect.
 */
export function lockIn(state: GameState, game: Game, command: Command, effects: () => readonly Effect[], cx: FeatureContext): Lock | undefined {
  for (const lock of game.locks ?? []) {
    if (!covers(lock, command)) continue
    if (!cx.holds(state, game, lock.when)) continue
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

/** Returns the reason of the lock that stops the command now. Undefined when no lock stops it. */
export function lockedBy(state: GameState, game: Game, command: Command, cx: FeatureContext): string | undefined {
  return lockIn(state, game, command, () => cx.effectsOf(state, game, command), cx)?.reason
}

/** Returns true while a lock that denies `'*'` is on. Its `except` isn't considered. */
export function lockedOut(state: GameState, game: Game, cx: FeatureContext): boolean {
  return (game.locks ?? []).some((lock) => lock.deny.includes('*') && cx.holds(state, game, lock.when))
}

/** The locks feature, which refuses a command a lock stops before any plugin's guard runs. */
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
  content: {
    // Locks are added, each file its own; only a lock's id, when it has one, names it.
    locks: {
      declares: (locks) => locks.flatMap((lock) => (lock.id === undefined ? [] : [`lock "${lock.id}"`])),
      words: listWords('locks', 'lock', { reason: true }),
    },
  },
  lists: ['lock'],
  check: (game, tools) => {
    ;(game.locks ?? []).forEach((lock, index) => {
      const id = lock.id ?? String(index)
      tools.check({ list: 'lock', id }, `lock ${id}`, [{ when: lock.when }])
    })
  },
})
