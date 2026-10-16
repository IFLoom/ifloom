import { say } from './strings.ts'
import { rendering, warningIn, whyNotIn } from './availability.ts'
import type { Game } from './game.ts'
import type { Command, Effect, GameState } from './types.ts'
import { fireTriggers } from './triggers.ts'
import { screen } from './screen.ts'
import { runAfter, runHooks } from './plugin.ts'
import { startingState } from './intake.ts'
import { commandContext, commandEntry, effectContext, effectEntry, featureContext } from './core.ts'
import { afterSteps, screenSteps } from './features/registry.ts'

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

export type Applied = {
  state: GameState
  /** False when the command was refused: state comes back untouched. */
  ok: boolean
  /** Why it was refused. Diagnostic, not necessarily player-facing. */
  refused?: string
}

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
 * The steps after a command took, in order: the game's triggers, the
 * features' steps that come straight after them (a new showing is seen), the
 * plugins' `after` hooks, the features' steps after those (a level gained is
 * noticed), then what the new state's screen shows.
 */
function after(before: GameState, ran: GameState, game: Game): GameState {
  const cx = featureContext()
  let next = fireTriggers(ran, game, (state, effects) => applyEffects(state, game, effects))
  for (const step of afterSteps.triggers) next = step(before, next, game, cx)
  next = runAfter(game, before, next)
  for (const step of afterSteps.hooks) next = step(before, next, game, cx)
  return noteShown(next, game)
}

/**
 * Run a command and say whether it took. Prefer this over `dispatch` anywhere
 * the answer matters — a refusal and a no-op look identical in the state alone.
 */
export function apply(
  state: GameState | null,
  game: Game,
  command: Command,
): Applied {
  if (command.type === 'start') {
    return {
      state: startingState(game, { seed: command.seed, flags: command.flags }),
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
      return { state: current, ok: false, refused: error.detail }
    }
    throw error
  }
}

export function dispatch(
  state: GameState | null,
  game: Game,
  command: Command,
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
  const custom = game.rules?.commands?.[command.type]
  if (custom) return custom(current, command) as GameState
  const entry = commandEntry(command)
  if (!entry) return refuse(say(game, 'notSupported'))
  return entry.run(current, command, game, commandContext(rendered))
}

/**
 * The end of a turn: the counter moves on, `resets` are put back, `rules.turn`'s
 * effects apply, then the game's `onTurn` and every plugin's `turn` hook run.
 * `before` is the state the turn ended on, which `rules.turn` is asked about.
 * What runs here runs with `ending` set, so a `turn` effect among it (in the
 * rules, or applied by a plugin through its context) does nothing: a turn
 * ending inside a turn's end would ask `rules.turn` again, and again.
 */
export function endTurn(state: GameState, game: Game, before: GameState = state): GameState {
  const next = state.turn + 1
  const rule = game.rules?.turn?.(before, next) ?? { effects: [] }
  const begun = runEffects(
    { ...state, turn: next, flags: { ...state.flags, ...game.rules?.resets } },
    game,
    rule.effects,
    true,
  )
  return runHooks(game, 'turn', game.rules?.onTurn?.(begun) ?? begun, true)
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
