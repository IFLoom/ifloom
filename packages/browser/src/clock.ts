import type { Runner } from '@ifloom/engine'

/** Settings for `startClock`. Each is optional. */
export type ClockOptions = {
  /** The clock's interval between ticks while a timer or a minigame counts down, in milliseconds. 100 if left out. */
  every?: number
}

/**
 * Starts the clock that runs down the game's timers, and returns a function that stops it. The engine keeps no clock,
 * so start one per runner.
 *
 * While a timer in `view.timers` or the running minigame's timer counts down and the page is visible, the clock sends
 * a `tick` command with the real time since the last one, every 100 ms by default. It drops the time the page spends
 * hidden, so a timer waits for the player. It sends the time up to the moment the page hides, then starts afresh when
 * the page shows again. A timer that the last command started, or a minigame state it entered, counts from that
 * command rather than from the last tick.
 */
export function startClock(runner: Runner, options: ClockOptions = {}): () => void {
  const every = options.every ?? 100
  const page = typeof document === 'undefined' ? undefined : document
  let timer: ReturnType<typeof setInterval> | null = null
  let last = 0
  // True while this clock's own tick runs, so `update` knows the change is the clock's.
  let sending = false
  const tick = () => {
    const ms = Math.floor(performance.now() - last)
    if (ms < 1) return
    last += ms
    sending = true
    try {
      runner.apply({ type: 'tick', ms })
    } finally {
      sending = false
    }
  }
  const update = () => {
    const view = runner.view()
    const timed = view.timers.length > 0 || view.minigame?.timeLeft != null
    const run = timed && !page?.hidden
    if (run && timer === null) {
      last = performance.now()
      timer = setInterval(tick, every)
    } else if (!run && timer !== null) {
      clearInterval(timer)
      timer = null
    } else if (timer !== null && !sending && (runner.state.minigame?.elapsed === 0 || view.timers.some((entry) => entry.left === entry.total))) {
      // A command just started a timer, or moved the minigame to a new state: its clock starts now.
      last = performance.now()
    }
  }
  const visibility = () => {
    if (page?.hidden && timer !== null) tick()
    update()
  }
  const unsubscribe = runner.subscribe(update)
  page?.addEventListener('visibilitychange', visibility)
  update()
  return () => {
    unsubscribe()
    page?.removeEventListener('visibilitychange', visibility)
    if (timer !== null) clearInterval(timer)
    timer = null
  }
}
