/**
 * Timers in the React UI: the game's clock, `useTimer` and `useTimers` for
 * what `view.timers` shows, `Countdown` to draw one, and `Timers` to draw them
 * all.
 *
 * The engine keeps the time left; this only draws it. `GameProvider` runs the
 * clock (`startClock` from `@ifloom/browser`), which sends a `tick` about
 * every 100 ms while any timer or a minigame's timer counts down, so a timer
 * runs out whether or not anything draws it. A block with a `ui.timer` hint
 * gets that timer's `Countdown` after it; a layout can place `Countdown` or
 * `Timers` anywhere else. A timer nothing draws runs unseen.
 */
import { useEffect } from 'react'
import { startClock } from '@ifloom/browser'
import type { Runner, TimerView } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { useMotion } from './motion.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** One clock per runner, however many components ask for it. */
const clocks = new WeakMap<Runner, { users: number; stop: () => void }>()

/** Run the game's clock while this component is mounted: one per runner, however many providers share it. `GameProvider` calls it. */
export function useTicking(runner: Runner): void {
  useEffect(() => {
    let clock = clocks.get(runner)
    if (!clock) {
      clock = { users: 0, stop: startClock(runner) }
      clocks.set(runner, clock)
    }
    clock.users += 1
    const held = clock
    return () => {
      held.users -= 1
      if (!held.users) {
        held.stop()
        clocks.delete(runner)
      }
    }
  }, [runner])
}

/** Returns the running timers from `view.timers`, in the order they started, and re-renders with each new view. */
export function useTimers(): TimerView[] {
  return useGame().view.timers
}

/**
 * Returns one running timer by id from `view.timers`, or null when it isn't running because it hasn't started, has
 * stopped or has run out.
 */
export function useTimer(id: string): TimerView | null {
  return useGame().view.timers.find((timer) => timer.id === id) ?? null
}

/** The share of a timer left, from 0 to 1. */
export function timerShare(timer: TimerView): number {
  return timer.total > 0 ? Math.max(0, Math.min(1, timer.left / timer.total)) : 0
}

/** Whether a timer is nearly out: a quarter or less of it left. The countdown marks it `data-urgent`. */
export function timerUrgent(timer: TimerView): boolean {
  return timerShare(timer) <= 0.25
}

/** The props of `Countdown`. */
export type CountdownProps = {
  /** The timer's id. `Countdown` renders nothing while it isn't running. */
  timer: string
  /** True to show the timer's `label` above the bar. True if left out. */
  label?: boolean
  /** Classes added to the `timer` part's own. */
  className?: string
}

function CountdownImpl({ timer, label = true, className }: CountdownProps) {
  const running = useTimer(timer)
  const words = useWords()
  const motion = useMotion()
  const box = usePart('timer', 'not-prose flex flex-col gap-1.5', className)
  const title = usePart('timer-label', 'text-sm font-medium text-muted-foreground')
  const bar = usePart(
    'timer-bar',
    'h-2 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:origin-left [&>span]:bg-primary [&>span]:transition-transform [&>span]:duration-100 [&>span]:ease-linear data-[urgent]:[&>span]:bg-destructive',
  )
  const left = usePart('timer-left', 'font-mono text-sm tabular-nums text-muted-foreground data-[urgent]:font-semibold data-[urgent]:text-destructive')
  if (!running) return null
  const share = timerShare(running)
  const urgent = timerUrgent(running) ? '' : undefined
  const seconds = Math.ceil(running.left / 1000)
  return (
    <div {...box} data-timer={running.id} data-urgent={urgent}>
      {label && running.label ? <span {...title}>{running.label}</span> : null}
      {/* With motion off, or a player who asks for reduced motion, only the seconds count down. */}
      {motion ? (
        <div
          {...bar}
          data-urgent={urgent}
          role="progressbar"
          aria-label={running.label ?? words('timeLeft')}
          aria-valuemin={0}
          aria-valuemax={running.total}
          aria-valuenow={running.left}
        >
          <span style={{ transform: `scaleX(${share})` }} />
        </div>
      ) : null}
      <span {...left} data-urgent={urgent} role="timer">
        {words('timerLeft', { seconds })}
      </span>
    </div>
  )
}

/**
 * Renders a running timer by id as the `timer` part, with its label, a bar that empties and the seconds left. It
 * renders nothing once the timer has run out or stopped.
 *
 * It's marked `data-urgent` with a quarter or less to go. With motion off, or for a player who asks for reduced
 * motion, only the seconds show.
 */
export const Countdown = overridable('Countdown', CountdownImpl)

function TimersImpl({ className }: { className?: string }) {
  const timers = useTimers()
  const list = usePart('timers', 'flex flex-col gap-3', className)
  if (!timers.length) return null
  return (
    <div {...list}>
      {timers.map((timer) => (
        <Countdown key={timer.id} timer={timer.id} />
      ))}
    </div>
  )
}

/** Renders a `Countdown` for every running timer in `view.timers`, in the order they started, and nothing while none runs. */
export const Timers = overridable('Timers', TimersImpl)
