/**
 * Undo and redo: the steps back and forward, as deep as the game says, and
 * the barriers no undo goes back past. Internal; `createRunner` composes it.
 */
import { holds, type Condition } from '../condition.ts'
import type { Game } from '../game.ts'
import { inlineChoices } from '../screen.ts'
import type { Command, GameState } from '../types.ts'
import type { View } from '../view.ts'
import type { BacklogEntry } from './backlog.ts'

/**
 * Undo and redo. Off unless the game asks for it; when on, `depth` steps deep,
 * and never back past a barrier.
 */
export type HistoryOptions = {
  /** How many steps back undo reaches. 50 if left out. */
  depth?: number
  /** No undo past a choice the game marks `irreversible`. On unless set false. */
  stopAtIrreversible?: boolean
  /** No undo past the start of a new turn. */
  stopAtNewTurn?: boolean
  /** No undo past any state where this holds, tested after each command. */
  stopWhen?: Condition
}

/** One place in play to step back or forward to: its state, its backlog and the commands that led there. */
export type Step = { state: GameState; backlog: BacklogEntry[]; commands: Command[] }

export type History = {
  /** Whether the game turned undo on. */
  readonly on: boolean
  readonly canUndo: boolean
  readonly canRedo: boolean
  /**
   * A command ran from `prior`: at a barrier, nothing before it can be undone;
   * otherwise `prior` is a step back, unless the command was a tick, which is
   * no step of its own. `shown` is the view the command was sent from.
   */
  ran(prior: Step, before: GameState, after: GameState, command: Command, shown: () => View): void
  /** Step back from `current`: the step to go to, or undefined with none. */
  undo(current: Step): Step | undefined
  /** Step forward again from `current` after an undo: the step to go to, or undefined with none. */
  redo(current: Step): Step | undefined
  /** Forget every step, for a state put in play from scratch. */
  clear(): void
}

export function history(game: Game, given: HistoryOptions | boolean | undefined): History {
  const options: HistoryOptions | null = given === true ? {} : given ? given : null
  const depth = options?.depth ?? 50
  let back: Step[] = []
  let forward: Step[] = []

  function barrier(before: GameState, after: GameState, command: Command, shown: () => View): boolean {
    if (!options) return false
    if (options.stopAtIrreversible !== false && command.type === 'choose') {
      const scene = shown().scene
      const choice = [...scene.choices, ...inlineChoices(scene.beats)].find((entry) => entry.id === command.id)
      if (choice?.irreversible) return true
    }
    if (options.stopAtNewTurn && after.turn !== before.turn) return true
    if (options.stopWhen && holds(after, game, options.stopWhen)) return true
    return false
  }

  return {
    on: options !== null,
    get canUndo() {
      return back.length > 0
    },
    get canRedo() {
      return forward.length > 0
    },
    ran(prior, before, after, command, shown) {
      if (!options) return
      if (barrier(before, after, command, shown)) {
        back = []
        forward = []
      }
      // A tick is no step of its own: one undo goes back to before the last command that wasn't one.
      else if (command.type !== 'tick') {
        back = [...back, prior].slice(-depth)
        forward = []
      }
    },
    undo(current) {
      const step = back.at(-1)
      if (!step) return undefined
      back = back.slice(0, -1)
      forward = [...forward, current]
      return step
    },
    redo(current) {
      const step = forward.at(-1)
      if (!step) return undefined
      forward = forward.slice(0, -1)
      back = [...back, current].slice(-depth)
      return step
    },
    clear() {
      back = []
      forward = []
    },
  }
}
