/**
 * What a minigame needs from the page that the engine can't do itself: a
 * clock and the keyboard. Both are plain DOM, so any framework can use them.
 * Start each once, beside the runner.
 */
import type { Runner } from '@ifloom/engine'

/**
 * The engine has no clock. This sends a `tick` with the time that passed,
 * about ten times a second, while a minigame's timer runs and the page is
 * visible. Time while the page is hidden is dropped, so the round waits.
 */
export function startClock(runner: Runner): () => void {
  let last = performance.now()
  const timer = setInterval(() => {
    const ms = Math.floor(performance.now() - last)
    last += ms
    if (ms > 0 && !document.hidden && runner.view().minigame?.timeLeft != null) runner.apply({ type: 'tick', ms })
  }, 100)
  return () => clearInterval(timer)
}

/** The keys an input gets when the minigame gives it none. */
const DEFAULT_KEYS: Record<string, string[]> = { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], space: [' '] }

/** Presses a minigame's input when one of its keys goes down: the minigame's own `keys`, else the arrow keys and space. */
export function startKeys(runner: Runner): () => void {
  const onKey = (event: KeyboardEvent) => {
    const minigame = runner.view().minigame
    if (!minigame || event.repeat || (event.target as Element | null)?.closest?.('input, textarea, select')) return
    const input = minigame.inputs.find((name) => (minigame.keys[name] ?? DEFAULT_KEYS[name] ?? []).includes(event.key))
    if (input === undefined) return
    event.preventDefault()
    runner.apply({ type: 'minigame', input })
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}
