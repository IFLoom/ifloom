/**
 * Timers: named countdowns in real time. A game declares each in `timers`,
 * with its length and the effects that run when it runs out; the `timer`
 * effect starts, stops, and adds time to one; the `timer` condition asks
 * whether one is running and how long it has left; `view.timers` shows each
 * running one for a UI to draw. A ringing phone, a timed choice, a fuse.
 *
 * The engine keeps no clock. Time passes by the `tick` command, which a UI
 * sends while anything counts down (`startClock` in `@ifloom/browser`), and
 * which is logged like any command, so a replay runs every timer out at the
 * same point. A tick also runs the clock of the minigame being played (its
 * state's `after`), and whatever runs out first in a tick goes first.
 *
 * The save keeps only how long each running timer has left and how long it
 * was set for. What it does when it runs out stays in content, read when it
 * runs out, as an entity's definition is.
 */
import { stringOf } from '../strings.ts'
import type { EffectRef } from '../custom.ts'
import type { Game } from '../game.ts'
import type { GameState, Range } from '../types.ts'
import { bounded, inRange, wanted } from '../range.ts'
import { defineFeature, mergedById, type FeatureContext } from './feature.ts'
import { minigameAdvanced, minigameDue, minigamePlay, minigameTimedOut } from './minigames.ts'

/** A timer a game declares: how long it runs, and what happens when it runs out. */
export type TimerDef = {
  id: string
  /** What a UI calls it, such as `'The phone'`. None if left out. */
  label?: string
  /** How long it runs when started, in milliseconds. */
  ms: number
  /** What happens when it runs out. Stopping it with `to: null` runs none of them. */
  effects?: EffectRef[]
}

/** A running timer, as the save keeps it: milliseconds left and its whole length. */
export type RunningTimer = {
  /** Milliseconds left. At 0 it runs out on the next tick. */
  left: number
  /** The length it was started with, in milliseconds, which adding time can raise. */
  total: number
}

/** A running timer, as a UI draws it. Its effects are never in the view. */
export type TimerView = {
  id: string
  /** Its `label`, or null. */
  label: string | null
  /** Milliseconds left. */
  left: number
  /** Its whole length, for a bar: `left / total` is the share left. */
  total: number
}

/** What the timers feature adds, as types. */
export type TimersShape = {
  state: {
    /** The running timers, by id, in the order they started. */
    timers: Record<string, RunningTimer>
  }
  conditions: {
    /**
     * A timer. Bare, whether it is running; with a range, whether it is
     * running with that many milliseconds left: `{ timer: 'phone', lte: 3000 }`.
     * False once it has run out or been stopped.
     */
    timer: { timer: string } & Range
  }
  effects: {
    /**
     * Start a declared timer, or start it again from the top: for its own `ms`,
     * or `to` milliseconds. `to: null` stops it without running its effects;
     * `by` adds milliseconds to a running one (a negative `by` takes them away,
     * down to 0, and at 0 it runs out on the next tick). Adding to a timer that
     * isn't running does nothing.
     */
    timer: { timer: string; to?: number | null } | { timer: string; by: number }
  }
  commands: {
    /**
     * Time passing: `ms` milliseconds off every running timer and the clock of
     * the minigame being played. Whatever runs out does so in the order it
     * would have, its effects running then. A UI sends it while anything
     * counts down. Refused with nothing counting down.
     */
    tick: { type: 'tick'; ms: number }
  }
  game: {
    /** The game's timers. None if left out. */
    timers?: TimerDef[]
  }
  pack: {
    /** Timers. A later pack's replaces an earlier one's by id. */
    timers?: TimerDef[]
  }
  view: {
    /** The running timers, in the order they started. */
    timers: TimerView[]
  }
  lists: 'timer'
}

/** The most things one tick runs out, so a timer that keeps starting itself again can't hang the game. */
const MOST_STEPS = 1000

/** A declared timer, by id. */
export function timerOf(game: Game, id: string): TimerDef | undefined {
  return game.timers?.find((entry) => entry.id === id)
}

/** A length in milliseconds: a number, at least 0. */
function length(ms: number): number {
  return Number.isFinite(ms) ? Math.max(ms, 0) : 0
}

/** Every running timer moved on by `ms`, none below 0. */
function advanced(timers: Record<string, RunningTimer>, ms: number): Record<string, RunningTimer> {
  if (ms <= 0 || !Object.keys(timers).length) return timers
  return Object.fromEntries(Object.entries(timers).map(([id, timer]) => [id, { ...timer, left: Math.max(timer.left - ms, 0) }]))
}

/** The timer that runs out next among those with nothing left: by id, so the order is the same however the save was read. */
function firstDone(timers: Record<string, RunningTimer>): string | undefined {
  let first: string | undefined
  for (const [id, timer] of Object.entries(timers)) {
    if (timer.left <= 0 && (first === undefined || id < first)) first = id
  }
  return first
}

/** A timer run out: it stops, then its effects run. One the game no longer declares just stops. */
function runOut(state: GameState, game: Game, id: string, cx: FeatureContext): GameState {
  const { [id]: _done, ...rest } = state.timers
  const stopped: GameState = { ...state, timers: rest }
  const effects = timerOf(game, id)?.effects ?? []
  return effects.length ? cx.runEffects(stopped, game, cx.buildEffects(game, effects), false) : stopped
}

/**
 * Run the clocks down by `ms`. Whatever would run out first does, its effects
 * run, and the rest of `ms` goes on: so one long tick runs out everything it
 * covers in the order it would have, and a timer those effects start counts
 * from that moment. The minigame being played as the tick starts runs its clock
 * too, until it ends or another starts; at the same moment, its timer goes
 * before the named ones.
 */
function tick(state: GameState, game: Game, ms: number, cx: FeatureContext): GameState {
  let next = state
  let left = ms
  const play = minigamePlay(state)
  for (let steps = 0; steps < MOST_STEPS; steps += 1) {
    const same = play !== undefined && minigamePlay(next) === play
    const minigame = same ? minigameDue(next, game) : undefined
    const timers = Object.values(next.timers).map((timer) => timer.left)
    const soonest = Math.min(minigame ?? Infinity, ...timers)
    const step = Math.min(soonest, left)
    if (step > 0) {
      next = { ...next, timers: advanced(next.timers, step) }
      if (same) next = minigameAdvanced(next, step)
      left -= step
    }
    if (soonest > step) return next
    next = minigame !== undefined && minigame <= soonest ? minigameTimedOut(next, game, cx) : runOut(next, game, firstDone(next.timers)!, cx)
  }
  return next
}

/** Whether anything counts down: a running timer, or the minigame's. */
function counting(state: GameState, game: Game): boolean {
  return Object.keys(state.timers).length > 0 || minigameDue(state, game) !== undefined
}

/** What is wrong with a timer effect's `to` or `by`. */
function amountProblems(ref: { to?: unknown; by?: unknown }): string[] {
  if (ref.by !== undefined && !(typeof ref.by === 'number' && Number.isFinite(ref.by))) return ['a timer’s by must be a number of milliseconds']
  if (ref.to !== undefined && ref.to !== null && !(typeof ref.to === 'number' && Number.isFinite(ref.to) && ref.to > 0)) {
    return ['a timer’s to must be a number of milliseconds above 0, or null to stop it']
  }
  return []
}

export const timers = defineFeature<TimersShape>({
  name: 'timers',
  requires: ['minigames'],
  state: {
    timers: {
      start: () => ({}),
      load: () => ({}),
      keeps: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
    },
  },
  conditions: {
    timer: {
      holds: (state, condition) => {
        const running = state.timers[condition.timer]
        return running !== undefined && (!bounded(condition) || inRange(running.left, condition))
      },
      explain: (state, condition) => {
        const running = state.timers[condition.timer]
        const want = bounded(condition) ? `running with ${wanted(condition)} ms left` : 'running'
        return `timer ${condition.timer} is ${running ? `running with ${running.left} ms left` : 'not running'}; wants ${want}`
      },
      references: (condition) => [{ timer: condition.timer }],
    },
  },
  effects: {
    timer: {
      apply: (state, effect, game) => {
        const running = state.timers[effect.timer]
        if ('by' in effect) {
          if (!running || !Number.isFinite(effect.by)) return state
          const left = Math.max(running.left + effect.by, 0)
          return { ...state, timers: { ...state.timers, [effect.timer]: { left, total: Math.max(running.total, left) } } }
        }
        if (effect.to === null) {
          if (!running) return state
          const { [effect.timer]: _stopped, ...rest } = state.timers
          return { ...state, timers: rest }
        }
        const def = timerOf(game, effect.timer)
        // A timer the game doesn't declare has nothing to run out into. The content checker reports it.
        if (!def) return state
        const ms = length(effect.to ?? def.ms)
        return { ...state, timers: { ...state.timers, [effect.timer]: { left: ms, total: ms } } }
      },
      references: (effect) => [{ timer: effect.timer, to: 'to' in effect ? effect.to : undefined, by: 'by' in effect ? effect.by : undefined }],
    },
  },
  commands: {
    tick: {
      whyNot: (state, command, game) => {
        if (!counting(state, game)) return stringOf(game, 'noTimer')
        return Number.isFinite(command.ms) && command.ms > 0 ? undefined : stringOf(game, 'tickLength')
      },
      run: (state, command, game, cx) => tick(state, game, command.ms, cx),
      // Time passes whatever is open: no lock or guard stops the clock.
      ignoresLocks: () => true,
      references: () => [],
    },
  },
  pack: mergedById<TimersShape['game'], TimersShape['pack'], TimerDef>({ base: (game) => game.timers, pack: (pack) => pack.timers }, (game, list) => {
    game.timers = list
  }),
  lists: ['timer'],
  check: (game, tools) => {
    const list = game.timers ?? []
    tools.twice(
      'timer',
      'timers',
      list.map((entry) => entry.id),
    )
    for (const timer of list) {
      const source = { list: 'timer', id: timer.id }
      const where = `timer ${timer.id}`
      if (!(typeof timer.ms === 'number' && Number.isFinite(timer.ms) && timer.ms > 0)) tools.problem(source, where, 'a timer needs ms above 0')
      tools.check(source, where, [{ effects: timer.effects }])
    }
  },
  resolve: (game) => {
    const ids = new Set((game.timers ?? []).map((entry) => entry.id))
    return {
      timer: (ref) => [...(ids.has(ref.timer) ? [] : [`unknown timer "${ref.timer}"`]), ...amountProblems(ref)],
    }
  },
  view: (state, game) => ({
    timers: Object.entries(state.timers).map(([id, running]) => ({
      id,
      label: timerOf(game, id)?.label ?? null,
      left: running.left,
      total: running.total,
    })),
  }),
})
