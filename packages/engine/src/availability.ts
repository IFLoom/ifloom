import { say } from './strings.ts'
import { sceneContext } from './context.ts'
import { sceneById, type Game, type SceneView } from './game.ts'
import { lockIn } from './locks.ts'
import { pluginGuards, pluginsWatch } from './plugin.ts'
import { commandContext, commandEntry } from './core.ts'
import type { Rendering } from './features/feature.ts'
import type { Command, Effect, GameState } from './types.ts'

export type { Rendering } from './features/feature.ts'

/**
 * Why the player cannot do this right now, or undefined if they can.
 *
 * The one place availability is decided. The reducer refuses a command with
 * this line, and the view greys its button out with the same line — so a
 * button and the rule behind it cannot disagree, and a refusal is always a
 * sentence the player can be shown.
 *
 * Checked in the order the player would notice: a lock first, then a command
 * the game handles itself, then what the command needs.
 */
export function whyNot(state: GameState, game: Game, command: Command): string | undefined {
  return whyNotIn(rendering(state, game), state, game, command)
}

/** A rendering of this state's open scene, done when first asked for. `picks` collects a data scene's new pool picks. */
export function rendering(state: GameState, game: Game, picks?: Record<string, string>): Rendering {
  let done = false
  let view: SceneView | undefined
  return {
    scene: () => {
      if (!done) {
        done = true
        const scene = state.sceneId ? sceneById(game, state.sceneId) : undefined
        view = scene?.render(state, sceneContext(state, game, picks))
      }
      return view
    },
  }
}

/**
 * `whyNot`, asking `rendered` for the open scene instead of rendering it.
 * `effects` saves working the command's effects out again when the caller has them.
 */
export function whyNotIn(rendered: Rendering, state: GameState, game: Game, command: Command, effects?: readonly Effect[]): string | undefined {
  const exempt = ignoresLocks(game, command)
  let known = effects
  const effectsNow = () => (known ??= effectsIn(rendered, state, game, command))
  const locked = exempt ? undefined : lockIn(state, game, command, effectsNow)?.reason
  if (locked) return locked
  if (!exempt && pluginsWatch(game)) {
    const refused = pluginGuards(game, state, { command, effects: effectsNow() }).find((entry) => typeof entry === 'string')
    if (refused !== undefined) return refused
  }
  const custom = game.rules?.commands?.[command.type]
  if (custom) {
    const out = custom(state, command)
    return typeof out === 'string' ? out : undefined
  }
  const entry = commandEntry(command)
  return entry ? entry.whyNot(state, command, game, commandContext(rendered)) : say(game, 'notSupported')
}

/**
 * Commands no lock or plugin guard stops, as their type's entry says: a
 * setting, which is a menu's business rather than the story's, and a plugin
 * command that says it ignores locks.
 */
export function ignoresLocks(game: Game, command: Command): boolean {
  return commandEntry(command)?.ignoresLocks?.(command, game) ?? false
}

/**
 * What a command would apply, worked out before it runs, for plugins' guards
 * and prices and locks by effect to look at: an activity's cost (as stat
 * effects) then its effects, a choice's effects, an item's use, a plugin
 * command's `effectsOf`. Anything else applies nothing that can be known ahead.
 */
export function effectsOf(state: GameState, game: Game, command: Command): Effect[] {
  return effectsIn(rendering(state, game), state, game, command)
}

/** `effectsOf`, asking `rendered` for the open scene instead of rendering it. */
export function effectsIn(rendered: Rendering, state: GameState, game: Game, command: Command): Effect[] {
  return commandEntry(command)?.effectsOf?.(state, command, game, commandContext(rendered)) ?? []
}

/**
 * A warning on a command that can still be pressed: a plugin guard's soft
 * refusal. Not a reason it cannot be done — a UI shows it and offers something
 * else, as a calendar offers bed before dawn — so it is kept apart from
 * `whyNot`; the reducer still refuses the command with it. `effects` saves
 * working them out again when the caller has them.
 */
export function warningOf(state: GameState, game: Game, command: Command, effects?: readonly Effect[]): string | undefined {
  return warningIn(rendering(state, game), state, game, command, effects)
}

/** `warningOf`, asking `rendered` for the open scene instead of rendering it. */
export function warningIn(rendered: Rendering, state: GameState, game: Game, command: Command, effects?: readonly Effect[]): string | undefined {
  if (!pluginsWatch(game)) return undefined
  if (ignoresLocks(game, command)) return undefined
  const soft = pluginGuards(game, state, { command, effects: effects ?? effectsIn(rendered, state, game, command) }).find(
    (entry) => typeof entry !== 'string',
  )
  return soft?.reason
}
