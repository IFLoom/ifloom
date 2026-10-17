import type { Runner } from '@ifloom/engine'

/** How `startClock` ticks. */
export type ClockOptions = {
  /** How often to tick while a timer runs, in milliseconds. 100 if left out. */
  every?: number
}

/**
 * The clock a minigame's timers need, which the engine doesn't keep. While
 * the minigame being played has a timer running and the page is visible, it
 * sends a `tick` with the real time since the last one, about every 100 ms.
 * Time while the page is hidden is dropped: the tick on hiding sends what
 * passed until then, and the clock starts afresh on showing, so a round
 * waits for the player. Returns the way to stop it. Start one per runner.
 */
export function startClock(runner: Runner, options: ClockOptions = {}): () => void {
  const every = options.every ?? 100
  const page = typeof document === 'undefined' ? undefined : document
  let timer: ReturnType<typeof setInterval> | null = null
  let last = 0
  const tick = () => {
    const ms = Math.floor(performance.now() - last)
    if (ms < 1) return
    last += ms
    runner.apply({ type: 'tick', ms })
  }
  const update = () => {
    const timed = runner.view().minigame?.timeLeft != null
    const run = timed && !page?.hidden
    if (run && timer === null) {
      last = performance.now()
      timer = setInterval(tick, every)
    } else if (!run && timer !== null) {
      clearInterval(timer)
      timer = null
    } else if (timer !== null && runner.state.minigame?.elapsed === 0) {
      // An input just moved it to a new state, whose clock starts now.
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
