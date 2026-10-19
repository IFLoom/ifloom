import type { Runner } from '@ifloom/engine'

/** How `startClock` ticks. */
export type ClockOptions = {
  /** How often to tick while anything counts down, in milliseconds. 100 if left out. */
  every?: number
}

/**
 * The clock the game's timers need, which the engine doesn't keep. While
 * anything counts down (a timer in `view.timers`, or the timer of the
 * minigame being played) and the page is visible, it sends a `tick` with the
 * real time since the last one, about every 100 ms. Time while the page is
 * hidden is dropped: the tick on hiding sends what passed until then, and the
 * clock starts afresh on showing, so a timer waits for the player. A timer a
 * command has just started, or a minigame state just entered, counts from
 * that command, not from the last tick. Returns the way to stop it. Start one
 * per runner.
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
