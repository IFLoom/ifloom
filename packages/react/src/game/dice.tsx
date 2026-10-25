/**
 * Dice rolls, from `view.rolls`: the rolls the last command made with the
 * engine's `roll` effect. `DiceRoll` draws one: its dice tumble, settle on the
 * faces the engine rolled, then show the total and, against a target, whether
 * it passed. `Scene` draws it in the story before a block with a
 * `ui.dice` hint naming the roll's key, and holds that block back until the
 * dice settle. A roll no block names, such as one a trigger made, shows for a
 * moment in `DiceOverlay`, over the scene.
 *
 * Only what happened is shown: the faces, what was added, the total, the
 * target and the outcome. With motion off, or a player who asks for reduced
 * motion, the dice show settled at once. Either way the result is read out
 * by screen readers once it's there.
 */
import { useEffect, useRef, useState } from 'react'
import type { Roll, SceneBeat, View } from '@ifloom/engine'
import { DICE_ROLL_MS } from '../hints.ts'
import { useGame } from './context.tsx'
import { Icon } from './icon.tsx'
import { useMotion } from './motion.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** How long a roll the story doesn't name stays over the scene once its dice settle, in milliseconds. */
const OVERLAY_MS = 2600
/** How often a tumbling die changes face, in milliseconds. */
const TUMBLE_MS = 90

/** The sides of a roll's dice, from its notation: 6 for `'2d6'`. */
function sidesOf(roll: Roll): number {
  const sides = Number(roll.dice.split('d')[1])
  return Number.isInteger(sides) && sides > 1 ? sides : 6
}

/** The face a die shows while it tumbles: stepping through the sides, each die at its own pace. Only for show; the roll is the engine's. */
function tumbling(face: number, die: number, tick: number, sides: number): number {
  return ((face + tick * (die * 2 + 3)) % sides) + 1
}

/** A number added to the dice, as it's written beside them: `+3`, `−1`. */
function signed(n: number): string {
  return n < 0 ? `−${-n}` : `+${n}`
}

export type DiceRollProps = {
  roll: Roll
  /** Tumble before settling. True if left out; the motion option or a player's reduced-motion setting turns it off whatever this says. */
  animate?: boolean
  className?: string
}

function DiceRollImpl({ roll, animate = true, className }: DiceRollProps) {
  const words = useWords()
  const motion = useMotion()
  const moving = animate && motion
  const [rolling, setRolling] = useState(moving)
  const [tick, setTick] = useState(0)
  // Turned off part way (a click that shows the rest at once): settle now.
  if (rolling && !moving) setRolling(false)
  useEffect(() => {
    if (!rolling) return
    const spin = setInterval(() => setTick((n) => n + 1), TUMBLE_MS)
    const stop = setTimeout(() => setRolling(false), DICE_ROLL_MS)
    return () => {
      clearInterval(spin)
      clearTimeout(stop)
    }
  }, [rolling])
  const box = usePart(
    'dice',
    'not-prose inline-flex max-w-full flex-wrap items-center gap-2 self-start rounded-lg border bg-card px-3 py-2 shadow-card',
    className,
  )
  const label = usePart('dice-label', 'font-mono text-xs text-muted-foreground')
  const faces = usePart('dice-faces', 'flex flex-wrap gap-1.5')
  const face = usePart(
    'dice-face',
    'inline-flex size-9 items-center justify-center rounded-md border-2 border-foreground/70 bg-background font-mono text-base font-semibold tabular-nums text-foreground data-[rolling]:animate-[ifloom-dice-tumble_180ms_linear_infinite] data-[high]:border-primary data-[low]:opacity-70',
  )
  const plus = usePart('dice-plus', 'font-mono text-sm text-muted-foreground')
  const total = usePart('dice-total', 'font-mono text-lg font-semibold tabular-nums data-[settled]:animate-[ifloom-fade-in_300ms_ease-out]')
  const outcome = usePart(
    'dice-outcome',
    'rounded-full px-2 py-0.5 text-sm font-medium data-[passed=true]:bg-primary data-[passed=true]:text-primary-foreground data-[passed=false]:bg-muted data-[passed=false]:text-muted-foreground animate-[ifloom-fade-in_300ms_ease-out]',
  )
  const critical = usePart('dice-critical', 'text-sm font-semibold text-price animate-[ifloom-fade-in_300ms_ease-out]')
  const sides = sidesOf(roll)
  const told = [
    words('diceRolled', { dice: roll.dice, faces: roll.faces.join(', '), total: roll.total }),
    roll.against === undefined ? '' : words(roll.passed ? 'diceRolledPassed' : 'diceRolledFailed', { against: roll.against }),
    roll.critical ? words(roll.critical === 'max' ? 'diceCriticalMax' : 'diceCriticalMin') : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div
      {...box}
      data-roll={roll.key}
      data-state={rolling ? 'rolling' : 'settled'}
      data-passed={!rolling && roll.passed !== undefined ? String(roll.passed) : undefined}
      data-critical={!rolling ? roll.critical : undefined}
    >
      <span {...label} aria-hidden="true">
        {roll.dice}
      </span>
      <span {...faces} aria-hidden="true">
        {roll.faces.map((value, die) => (
          <span
            key={die}
            {...face}
            data-rolling={rolling ? '' : undefined}
            data-high={!rolling && value === sides ? '' : undefined}
            data-low={!rolling && value === 1 ? '' : undefined}
          >
            {rolling ? tumbling(value, die, tick, sides) : value}
          </span>
        ))}
      </span>
      {roll.plus ? (
        <span {...plus} aria-hidden="true">
          {signed(roll.plus)}
        </span>
      ) : null}
      {rolling ? null : (
        <>
          <span {...total} data-settled="" aria-hidden="true">
            = {roll.total}
          </span>
          {roll.against !== undefined ? (
            <span {...outcome} data-passed={String(roll.passed)} aria-hidden="true">
              {words(roll.passed ? 'dicePassed' : 'diceFailed')} · {words('diceNeeds', { against: roll.against })}
            </span>
          ) : null}
          {roll.critical ? (
            <span {...critical} aria-hidden="true">
              {words(roll.critical === 'max' ? 'diceCriticalMax' : 'diceCriticalMin')}
            </span>
          ) : null}
        </>
      )}
      {/* Read out once the dice settle: the faces, the total and the outcome. */}
      <span className="sr-only" role="status">
        {rolling ? '' : told}
      </span>
    </div>
  )
}

/**
 * One roll the engine made: its dice, tumbling for `DICE_ROLL_MS` and then
 * settling on the rolled faces, what was added, the total, and with a target,
 * passed or failed and what it needed. A die on its top face or on 1 is marked,
 * and so is a critical. Parts: `dice` (with `data-roll`, `data-state`
 * `rolling` or `settled`, `data-passed` and `data-critical`), `dice-label`,
 * `dice-faces`, `dice-face`, `dice-plus`, `dice-total`, `dice-outcome` and
 * `dice-critical`. A screen reader hears the result once the dice settle.
 */
export const DiceRoll = overridable('DiceRoll', DiceRollImpl)

/** Whether any of these beats has a `ui.dice` hint naming this roll's key. */
function named(beats: readonly SceneBeat[], roll: Roll): boolean {
  return beats.some((beat) => beat.ui?.dice === roll.key)
}

/**
 * The rolls the last command made, while they're new: empty for rolls a
 * loaded save or an undo brings back, so only the rolls the player just made
 * tumble: those that came with one command more than the view before. `at`
 * counts each new set, to start them afresh.
 */
export function useFreshRolls(): { rolls: Roll[]; at: number } {
  const { view, runner } = useGame()
  const count = runner.log().commands.length
  const seen = useRef<{ count: number; view: View; rolls: Roll[]; at: number } | null>(null)
  if (!seen.current) seen.current = { count, view, rolls: [], at: 0 }
  else if (seen.current.view !== view) {
    // One command more than the view before: the player's (or a redo). A load or an undo moves the log some other way.
    const fresh = count === seen.current.count + 1 && view.rolls.length > 0
    seen.current = { count, view, rolls: fresh ? view.rolls : [], at: fresh ? seen.current.at + 1 : seen.current.at }
  }
  return { rolls: seen.current.rolls, at: seen.current.at }
}

function DiceOverlayImpl({ rolls, className }: { rolls: readonly Roll[]; className?: string }) {
  const words = useWords()
  const [shown, setShown] = useState(true)
  const over = usePart(
    'dice-overlay',
    'fixed inset-x-0 top-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-col items-center gap-2 animate-[ifloom-slide-up-in_250ms_ease-out]',
    className,
  )
  const dismiss = usePart(
    'dice-dismiss',
    'absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground [&_svg]:size-3.5',
  )
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), DICE_ROLL_MS + OVERLAY_MS)
    return () => clearTimeout(timer)
  }, [])
  if (!shown || !rolls.length) return null
  return (
    <div {...over}>
      {rolls.map((roll, index) => (
        <div key={index} className="relative">
          <DiceRoll roll={roll} />
          {index === 0 ? (
            <button type="button" {...dismiss} aria-label={words('diceDismiss')} title={words('diceDismiss')} onClick={() => setShown(false)}>
              <Icon name="close" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/**
 * Rolls the story doesn't name, shown for a moment over the scene: those the
 * last command made that no block's `ui.dice` hint names, such as a roll a
 * trigger made as the player came in. Each is a `DiceRoll`; the whole is the
 * `dice-overlay` part, which goes after a few seconds or when the player
 * dismisses it (`dice-dismiss`). `Scene` draws it.
 */
export const DiceOverlay = overridable('DiceOverlay', DiceOverlayImpl)

/** The fresh rolls no beat on screen names, for `DiceOverlay`. */
export function unnamedRolls(rolls: readonly Roll[], beats: readonly SceneBeat[]): Roll[] {
  return rolls.filter((roll) => !named(beats, roll))
}
