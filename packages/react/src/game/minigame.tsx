/**
 * Minigames in the React UI: `useMinigame` for the one being played and the
 * clock that drives its timers (shared with the game's timers), and `MinigameCard`, the basic card that
 * draws it.
 */
import { useEffect } from 'react'
import { startMinigameKeys } from '@ifloom/browser'
import type { Command, MinigameView, Runner } from '@ifloom/engine'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { useTicking } from './timers.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords, type UiStringKey } from './words.ts'

export type MinigameControls = {
  /** The minigame being played, as the view has it, or `null`. */
  minigame: MinigameView | null
  /** Press one of its inputs. Returns what `apply` returned, so a refusal can be shown. */
  send: (input: string) => ReturnType<Runner['apply']>
}

/**
 * The minigame being played, and a way to press its inputs. While it's
 * mounted it also runs the game's clock, `startClock` from `@ifloom/browser`
 * (as `GameProvider` does): a `tick` about every 100 ms while a timer runs,
 * with the real time that passed. With `keys: true` it also maps
 * the keyboard to the inputs, as `MinigameCard` does.
 */
export function useMinigame({ keys = false }: { keys?: boolean } = {}): MinigameControls {
  const { view, runner } = useGame()
  const minigame = view.minigame
  useTicking(runner)
  const send = (input: string) => runner.apply({ type: 'minigame', input } satisfies Command)
  const playing = minigame !== null
  // Before the game's hotkeys, which skip a key this takes.
  useEffect(() => (keys && playing ? startMinigameKeys(runner) : undefined), [keys, playing, runner])
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
 * `Scene` draws it in place of the scene while a minigame runs.
 */
export const MinigameCard = overridable('MinigameCard', MinigameCardImpl)
