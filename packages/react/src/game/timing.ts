/**
 * The scene's timing, without the drawing: how the screen comes in and goes,
 * which runs of beats wait for a reveal or for dice, when the choices come,
 * and how the player skips the wait. `useScene` is all of it as one hook;
 * `Scene` draws from it, and so can a scene of a game's own that keeps the
 * same motion.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Game, GameState, Roll, SceneBeat, View } from '@ifloom/engine'
import { DEFAULT_REVEAL_DELAY, DEFAULT_TRANSITION_MS, DICE_ROLL_MS, type Transition, type TransitionName } from '../hints.ts'
import { useGame } from './context.tsx'
import { useMotion, useSkipKey } from './motion.tsx'

/** How long a reveal takes to come in, as `--ifloom-reveal-ms` sets it in the base styles. Only for when to stop waiting for a skip. */
export const REVEAL_MS = 400

/** The screen on show, and how it comes in and goes out. */
export type ScreenTransition = { key: string; in: TransitionName; out: TransitionName; ms: number }

/** A reveal as the React UI plays it: where the prose holds back, how long since the run before (`delay`), how it comes in (`as`), and when, from the screen coming on (`at`). */
export type RevealPoint = { delay: number; as: TransitionName; at: number }

/** One beat of a run, with its index in the scene's beats, and the roll drawn settled before it, if its `ui.dice` names one that isn't new. */
export type RevealBeat = { beat: SceneBeat; index: number; roll?: Roll }

/** A run of a scene's beats, and the reveal that holds it back (null for the first, shown with the screen). */
export type RevealGroup = {
  reveal: RevealPoint | null
  /** A new roll whose dice tumble before this run, which waits for them to settle: the one its first beat's `ui.dice` names. */
  dice?: Roll
  beats: RevealBeat[]
}

/** The rolls on screen: all the last command made, the new ones that tumble, and `at`, which counts each new set. */
export type SceneRolls = { all: readonly Roll[]; fresh: readonly Roll[]; at: number }

/** Everything `Scene` works out before it draws: see `useScene`. */
export type SceneTiming = {
  /** The view drawn. */
  view: View
  /** Whether transitions, reveals and tumbling dice play: the `motion` option, unless the player asks for reduced motion. */
  motion: boolean
  /** How this screen comes in and goes out. `key` is `view.scene.key`: key the screen's element by it. */
  transition: ScreenTransition
  /** How the screen before goes, when the choice that led here says (its `out` and `ms`), over that screen's own. */
  leave: { out?: TransitionName; ms?: number }
  /** The scene's beats in runs: those shown with the screen, then each that waits for a reveal or for dice. Empty while a minigame runs. */
  groups: RevealGroup[]
  /** When the last run comes, in milliseconds from the screen coming on; 0 with none. The choices come with it. */
  last: number
  /** Whether runs are still to come: until then the choices can't be pressed, and a click or a key calls `skip`. */
  pending: boolean
  /** Whether the player skipped the wait, or every run came in. Dice drawn after it show settled. */
  revealed: boolean
  /** Show everything at once. */
  skip: () => void
  /** The rolls on screen. */
  rolls: SceneRolls
  /** New rolls that no beat on screen names, for a moment over the scene (`DiceOverlay`). */
  unnamed: readonly Roll[]
}

/** A transition as a name or a pair, as the pair. */
function asPair(spec: Transition | TransitionName | undefined): Transition {
  if (spec === undefined) return {}
  return typeof spec === 'string' ? { in: spec, out: spec } : spec
}

/** How the screen in `view` comes and goes: its own `ui.transition` over the game's, with `pressed` (the transition of the choice that led here) deciding how it comes in. */
export function screenTransition(view: View, game: Game, pressed?: Transition | TransitionName): ScreenTransition {
  const own = asPair(view.scene.ui?.transition)
  const fallback = asPair(game.ui?.transition)
  // A choice's bare name says only how the next screen comes in.
  const lead = typeof pressed === 'string' ? { in: pressed } : (pressed ?? {})
  return {
    key: view.scene.key,
    in: lead.in ?? own.in ?? fallback.in ?? 'none',
    out: own.out ?? fallback.out ?? 'none',
    ms: lead.ms ?? own.ms ?? fallback.ms ?? DEFAULT_TRANSITION_MS,
  }
}

/** How a choice's transition says the screen it leaves goes off: its `out` and `ms`, if it gives them. */
function leavingOf(pressed: Transition | TransitionName | undefined): { out?: TransitionName; ms?: number } {
  return typeof pressed === 'object'
    ? { ...(pressed.out !== undefined ? { out: pressed.out } : {}), ...(pressed.ms !== undefined ? { ms: pressed.ms } : {}) }
    : {}
}

/** The roll a beat's `ui.dice` names among `rolls`: the last one under that key. */
function rollFor(beat: SceneBeat, rolls: readonly Roll[]): Roll | undefined {
  const key = beat.ui?.dice
  return typeof key === 'string' ? rolls.findLast((roll) => roll.key === key) : undefined
}

/**
 * A scene's beats in runs: those shown with the screen, then each block with
 * `ui.reveal` and the beats after it. A block whose `ui.dice` names one of
 * `fresh` starts a run too, which waits `DICE_ROLL_MS` more for the dice to
 * settle. Every other beat whose `ui.dice` names one of `all` gets that roll,
 * drawn settled.
 */
export function revealGroups(beats: readonly SceneBeat[], all: readonly Roll[], fresh: readonly Roll[]): RevealGroup[] {
  const groups: RevealGroup[] = [{ reveal: null, beats: [] }]
  let at = 0
  beats.forEach((beat, index) => {
    const reveal = beat.ui?.reveal
    const dice = rollFor(beat, fresh)
    if (reveal || dice) {
      const wait = reveal ? (typeof reveal.delay === 'number' && reveal.delay >= 0 ? reveal.delay : DEFAULT_REVEAL_DELAY) : 0
      const delay = wait + (dice ? DICE_ROLL_MS : 0)
      at += delay
      groups.push({ reveal: { delay, as: reveal?.as ?? 'fade', at }, ...(dice ? { dice } : {}), beats: [] })
    }
    const settled = dice ? undefined : rollFor(beat, all)
    groups.at(-1)!.beats.push({ beat, index, ...(settled ? { roll: settled } : {}) })
  })
  return groups
}

/** The new rolls no beat names, for `DiceOverlay`. */
function unnamedRolls(rolls: readonly Roll[], beats: readonly SceneBeat[]): Roll[] {
  return rolls.filter((roll) => !beats.some((beat) => beat.ui?.dice === roll.key))
}

/**
 * The rolls the last command made, while they're new: empty for rolls a
 * loaded save, an undo or a redo brings back (the snapshot isn't `fresh`),
 * so only the rolls the player just made tumble. `at` counts each new set.
 */
function useFreshRolls(): { rolls: readonly Roll[]; at: number } {
  const { snapshot } = useGame()
  const seen = useRef<{ state: GameState; rolls: readonly Roll[]; at: number } | null>(null)
  if (!seen.current) seen.current = { state: snapshot.state, rolls: [], at: 0 }
  else if (seen.current.state !== snapshot.state) {
    const fresh = snapshot.fresh && snapshot.view.rolls.length > 0
    seen.current = { state: snapshot.state, rolls: fresh ? snapshot.view.rolls : [], at: fresh ? seen.current.at + 1 : seen.current.at }
  }
  return seen.current
}

/**
 * The scene's timing and state, with nothing drawn: what `Scene` draws from.
 * Use it in a scene of your own to keep the React UI's motion.
 *
 * - The transition: the screen's `ui.transition` over the game's, with the
 *   choice that led here (the runner's `snapshot.pressed`) deciding how it
 *   comes in and, with an `out`, how the screen before goes.
 * - The runs: the beats shown with the screen, then each block with a
 *   `ui.reveal`, or a `ui.dice` naming a roll the last command just made,
 *   and the beats after it, each with when it comes.
 * - The wait: `pending` until the player clicks or presses a key (the first
 *   key press after a screen comes on calls `skip`, and does nothing else),
 *   or until the last run has come in.
 * - The dice: new rolls (`rolls.fresh`) tumble before their run; any other
 *   roll a beat names is on its `roll`, drawn settled; new rolls no beat
 *   names are `unnamed`.
 *
 * With motion off, nothing waits: `pending` is false and every roll is settled.
 */
export function useScene(): SceneTiming {
  const { view, runner, snapshot } = useGame()
  const motion = useMotion()
  const pressed = snapshot.pressed?.ui?.transition
  const transition = screenTransition(view, runner.game, pressed)
  const fresh = useFreshRolls()
  const playing = view.minigame !== null
  const rolled = motion && !playing ? fresh.rolls : []
  const groups = playing ? [] : revealGroups(view.scene.beats, view.rolls, rolled)
  const last = groups.reduce((latest, group) => Math.max(latest, group.reveal?.at ?? 0), 0)
  // Skipped for this visit to the screen and this set of rolls: coming back, or new rolls on the same screen, hold the runs back again.
  const visit = useRef({ key: transition.key, n: 0 })
  if (visit.current.key !== transition.key) visit.current = { key: transition.key, n: visit.current.n + 1 }
  const token = `${visit.current.n}#${fresh.at}`
  const [skipped, setSkipped] = useState<string | null>(null)
  const [cameIn, setCameIn] = useState<string | null>(null)
  const revealed = skipped === token || cameIn === token
  const pending = motion && last > 0 && !revealed
  const skip = useCallback(() => setSkipped(token), [token])
  useSkipKey(pending, skip)
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setCameIn(token), last + transition.ms + REVEAL_MS)
    return () => clearTimeout(timer)
  }, [pending, last, transition.ms, token])
  return {
    view,
    motion,
    transition,
    leave: leavingOf(pressed),
    groups,
    last,
    pending,
    revealed,
    skip,
    rolls: { all: view.rolls, fresh: fresh.rolls, at: fresh.at },
    unnamed: playing ? [] : unnamedRolls(fresh.rolls, view.scene.beats),
  }
}
