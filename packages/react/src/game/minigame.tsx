/**
 * Minigames in the React UI: `useMinigame` for the one being played and the
 * clock that drives its timers, and `MinigameCard`, the basic card that
 * draws it.
 */
import { useEffect, useRef } from 'react'
import type { Command, MinigameView, Runner } from '@ifloom/engine'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { dialogOpen, ignoredKey } from './keys.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords, type UiStringKey } from './words.ts'

/** How often the clock ticks while a timer runs, in milliseconds. */
const TICK_EVERY = 100

/**
 * The clock for one runner. It ticks while the minigame being played has a
 * timer running and the page is visible, sending the real time since the
 * last tick. Time while the page is hidden is dropped: the tick on hiding
 * sends what passed until then, and the clock starts afresh on showing.
 */
function startClock(runner: Runner): () => void {
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
    const run = timed && !document.hidden
    if (run && timer === null) {
      last = performance.now()
      timer = setInterval(tick, TICK_EVERY)
    } else if (!run && timer !== null) {
      clearInterval(timer)
      timer = null
    } else if (timer !== null && runner.state.minigame?.elapsed === 0) {
      // An input just moved it to a new state, whose clock starts now.
      last = performance.now()
    }
  }
  const visibility = () => {
    if (document.hidden && timer !== null) tick()
    update()
  }
  const unsubscribe = runner.subscribe(update)
  document.addEventListener('visibilitychange', visibility)
  update()
  return () => {
    unsubscribe()
    document.removeEventListener('visibilitychange', visibility)
    if (timer !== null) clearInterval(timer)
  }
}

/** One clock per runner, however many components ask for it. */
const clocks = new WeakMap<Runner, { users: number; stop: () => void }>()

function useClock(runner: Runner): void {
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

/** The keys a minigame input gets when the game gives it none. */
const DEFAULT_KEYS: Record<string, string[]> = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  space: [' '],
}

/** The keys for each input: the game's, else the defaults, else the input's own name when it's one letter. */
function keysFor(minigame: MinigameView): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const input of new Set([...minigame.inputs, ...Object.keys(minigame.keys)])) {
    out[input] = minigame.keys[input] ?? DEFAULT_KEYS[input] ?? (input.length === 1 ? [input] : [])
  }
  return out
}

/** The input a key presses, if any. One-letter keys match either case. */
function inputFor(keys: Record<string, string[]>, key: string): string | undefined {
  const pressed = key.length === 1 ? key.toLowerCase() : key
  return Object.keys(keys).find((input) => keys[input].some((entry) => (entry.length === 1 ? entry.toLowerCase() : entry) === pressed))
}

export type MinigameControls = {
  /** The minigame being played, as the view has it, or `null`. */
  minigame: MinigameView | null
  /** Press one of its inputs. Returns what `apply` returned, so a refusal can be shown. */
  send: (input: string) => ReturnType<Runner['apply']>
}

/**
 * The minigame being played, and a way to press its inputs. While it's
 * mounted it also runs the game's clock: a `tick` about every 100 ms while a
 * timer runs, with the real time that passed. With `keys: true` it also maps
 * the keyboard to the inputs, as `MinigameCard` does.
 */
export function useMinigame({ keys = false }: { keys?: boolean } = {}): MinigameControls {
  const { view, runner } = useGame()
  const minigame = view.minigame
  useClock(runner)
  const latest = useRef(minigame)
  latest.current = minigame
  const send = (input: string) => runner.apply({ type: 'minigame', input } satisfies Command)
  const playing = minigame !== null
  useEffect(() => {
    if (!keys || !playing) return
    // Before the game's hotkeys, which skip a key this takes.
    const onKey = (event: KeyboardEvent) => {
      const now = latest.current
      if (!now || event.repeat || ignoredKey(event) || dialogOpen()) return
      const input = inputFor(keysFor(now), event.key)
      if (input === undefined) return
      event.preventDefault()
      if (now.inputs.includes(input)) runner.apply({ type: 'minigame', input })
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [keys, playing, runner])
  return { minigame, send }
}

/** The built-in words for the inputs the defaults know. */
const INPUT_WORDS: Record<string, UiStringKey> = {
  up: 'minigameUp',
  down: 'minigameDown',
  left: 'minigameLeft',
  right: 'minigameRight',
  space: 'minigameSpace',
}

function MinigameCardImpl({ className }: { className?: string }) {
  const { minigame, send } = useMinigame({ keys: true })
  const { runner } = useGame()
  const words = useWords()
  const panel = usePart('minigame', 'flex flex-col gap-4', className)
  const title = usePart('minigame-title', 'font-heading text-scene-title font-semibold')
  const stateText = usePart('minigame-state', 'text-lg leading-prose')
  const timer = usePart(
    'minigame-timer',
    'h-2 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:origin-left [&>span]:bg-primary [&>span]:transition-transform [&>span]:duration-100 [&>span]:ease-linear',
  )
  const inputs = usePart('minigame-inputs', 'flex flex-wrap gap-2')
  const button = usePart('minigame-input', buttonVariants({ variant: 'secondary' }))
  if (!minigame) return null
  const { timeLeft, timeTotal } = minigame
  const share = timeLeft !== null && timeTotal ? Math.max(0, Math.min(1, timeLeft / timeTotal)) : null
  // A game names an input in its strings as `ui.minigame.<input>`; the arrows and space have words of their own.
  const label = (input: string) =>
    runner.game.strings?.[`ui.minigame.${input}`] ?? (INPUT_WORDS[input] ? words(INPUT_WORDS[input]) : input.charAt(0).toUpperCase() + input.slice(1))
  return (
    <section {...panel} data-minigame={minigame.id} data-state={minigame.state}>
      {minigame.title ? <h2 {...title}>{minigame.title}</h2> : null}
      {minigame.label ? (
        <p {...stateText} aria-live="polite">
          {minigame.label}
        </p>
      ) : null}
      {share !== null ? (
        <div {...timer} role="progressbar" aria-label={words('timeLeft')} aria-valuemin={0} aria-valuemax={timeTotal!} aria-valuenow={timeLeft!}>
          <span style={{ transform: `scaleX(${share})` }} />
        </div>
      ) : null}
      {minigame.inputs.length ? (
        <div {...inputs}>
          {minigame.inputs.map((input) => (
            <button key={input} type="button" {...button} data-input={input} onClick={() => send(input)}>
              {label(input)}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

/**
 * The minigame being played: its title, the running state's words, a bar
 * counting down its timer, and a button for each live input. The keyboard
 * presses inputs too: the minigame's `keys`, else the arrows and space.
 * `SceneStage` draws it in place of the scene while a minigame runs.
 */
export const MinigameCard = overridable('MinigameCard', MinigameCardImpl)
