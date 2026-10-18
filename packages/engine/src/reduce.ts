import { say } from './strings.ts'
import { rendering, warningIn, whyNotIn, type Rendering } from './availability.ts'
import type { Game } from './game.ts'
import type { Command, Effect, GameState } from './types.ts'
import { screen } from './screen.ts'
import { runCommandHooks } from './plugin.ts'
import { commandOf, type CommandRef } from './custom.ts'
import { startingState } from './intake.ts'
import { StartOver, commandContext, commandEntry, effectContext, effectEntry, featureContext } from './core.ts'
import { roll } from './random.ts'
import { afterSteps, screenSteps } from './features/registry.ts'

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

/**
 * What `apply` says about a command: the shape of a `Result`, with the state
 * on both sides. When `ok` is false the command was refused, `state` is the
 * one it was sent to, untouched, and `reason` says why.
 */
export type Applied =
  | { ok: true; state: GameState; reason?: never; newGame?: true }
  | { ok: false; state: GameState; reason: string }

class Refused extends Error {
  readonly detail: string

  constructor(detail: string) {
    super(detail)
    this.name = 'Refused'
    this.detail = detail
  }
}

/** Bail out of a command. Nothing changes, and the caller is told why. */
function refuse(detail: string): never {
  throw new Refused(detail)
}

/**
 * Record what the screen now shows that the save doesn't hold yet, such as the
 * pool picks and what each background channel has started playing: each
 * feature's `fromScreen`, from one `screen` of the state. So the view stays
 * pure and the scene is rendered once here. Only a game a feature wants a
 * screen for pays for it.
 */
function noteShown(state: GameState, game: Game): GameState {
  const steps = screenSteps.filter((step) => step.wants(game))
  if (!steps.length) return state
  const shown = screen(state, game)
  return steps.reduce((next, step) => step.record(next, shown, game, featureContext()), state)
}

/**
 * The steps after a command took, in order: the features' steps that come
 * before the plugins' `onCommand` hooks (the game's triggers fire, then a new
 * showing is seen), those hooks, the features' steps after them (a level
 * gained is noticed), then what the new state's screen shows.
 */
function after(before: GameState, ran: GameState, game: Game): GameState {
  const cx = featureContext()
  let next = ran
  for (const step of afterSteps.beforePlugins) next = step(before, next, game, cx)
  next = runCommandHooks(game, before, next)
  for (const step of afterSteps.afterPlugins) next = step(before, next, game, cx)
  return noteShown(next, game)
}

/**
 * Run a command and say whether it took. Prefer this over `dispatch` anywhere
 * the answer matters — a refusal and a no-op look identical in the state alone.
 */
export function apply(
  state: GameState | null,
  game: Game,
  ref: CommandRef,
): Applied {
  const command = commandOf(ref)
  if (command.type === 'start') {
    return {
      state: startingState(game, { seed: command.seed, kv: command.kv }),
      ok: true,
    }
  }
  if (!state) return { state: startingState(game), ok: true }
  // Every state comes in through `startingState` or `loadState`, so it is
  // already in this engine's and this game's shape.
  const current = state
  try {
    return { state: after(current, run(current, game, command), game), ok: true }
  } catch (error) {
    if (error instanceof Refused) {
      return { state: current, ok: false, reason: error.detail }
    }
    if (error instanceof StartOver) return { state: startedOver(current, game), ok: true, newGame: true }
    throw error
  }
}

/**
 * The new game a `newGame` command starts when `apply` runs it on its own:
 * the play settings of the run that ended, and a seed drawn from its seed and
 * turn, so the same log always starts the same game. A runner starts its own
 * instead, with the player's settings and a fresh seed.
 */
function startedOver(current: GameState, game: Game): GameState {
  return startingState(game, { seed: roll(2 ** 31, 'newGame', current.seed, current.turn), settings: current.settings })
}

export function dispatch(
  state: GameState | null,
  game: Game,
  command: CommandRef,
): GameState {
  return apply(state, game, command).state
}

function run(
  current: GameState,
  game: Game,
  command: Command,
): GameState {
  // The open scene, rendered once for the refusal, the warning and the choice.
  const rendered = rendering(current, game)
  const why = whyNotIn(rendered, current, game, command)
  if (why) refuse(why)
  const warning = warningIn(rendered, current, game, command)
  if (warning) refuse(warning)
  return runIn(rendered, current, game, command)
}

/**
 * Run a command already allowed: the game's own handler for its type, else its
 * entry's. Also how a choice runs the command it sends. Internal.
 */
export function runIn(rendered: Rendering, current: GameState, game: Game, command: Command): GameState {
  const custom = game.rules?.commands?.[command.type]
  if (custom) {
    const out = custom(current, command)
    return typeof out === 'string' ? refuse(out) : out
  }
  const entry = commandEntry(command)
  if (!entry) return refuse(say(game, 'notSupported'))
  return entry.run(current, command, game, commandContext(rendered))
}

export function applyEffects(
  state: GameState,
  game: Game,
  effects: Effect[],
): GameState {
  return runEffects(state, game, effects, false)
}

/**
 * `applyEffects`, told whether a turn is ending: while one is, a `turn` effect
 * does nothing. How a plugin's context applies effects, passing on what it was told.
 */
export function runEffects(
  state: GameState,
  game: Game,
  effects: readonly Effect[],
  ending: boolean,
): GameState {
  let next = state
  for (const effect of effects) {
    next = applyEffect(next, game, effect, ending)
  }
  return next
}

/** One effect, by its kind's entry. A kind the engine doesn't have does nothing; the content checker reports it. */
function applyEffect(
  state: GameState,
  game: Game,
  effect: Effect,
  ending: boolean,
): GameState {
  const entry = effectEntry(effect)
  return entry ? entry.apply(state, effect, game, effectContext(ending)) : state
}
