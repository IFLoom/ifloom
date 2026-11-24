import { stringOf } from './strings.ts'
import { sceneOf, type Game } from './game.ts'
import { defaultRuntime, renderScene, type RenderedScene } from './scene.ts'
import { pluginGuards, pluginsWatch } from './plugin.ts'
import { commandContext, commandEntry, featureContext } from './core.ts'
import { refusals } from './features/registry.ts'
import type { Rendering } from './features/feature.ts'
import type { Command, Effect, GameState } from './types.ts'
import { commandOf, previewEffects, type CommandRef } from './custom.ts'

export type { Rendering } from './features/feature.ts'

/**
 * Returns the reason the player can't send this command now, or undefined when they can.
 *
 * The reducer refuses a command with this reason, and the view greys out its button with the same words. So a button
 * and the rule behind it can't disagree, and every refusal is a sentence the player can read.
 *
 * The engine checks in the order the player would notice: the core's refusals such as a lock first, then the plugins'
 * guards, then the command's own needs.
 */
export function whyNot(state: GameState, game: Game, command: CommandRef): string | undefined {
  return whyNotIn(rendering(state, game), state, game, commandOf(command))
}

/** Returns a rendering of this state's open scene, made the first time it is asked for. `picks` collects the scene's new pool picks. */
export function rendering(state: GameState, game: Game, picks?: Record<string, string>): Rendering {
  let done = false
  let view: RenderedScene | undefined
  return {
    scene: () => {
      if (!done) {
        done = true
        const scene = state.sceneId ? sceneOf(game, state.sceneId) : undefined
        view = scene && renderScene(scene, state, defaultRuntime(game), picks)
      }
      return view
    },
  }
}

/**
 * Returns the reason the player can't send this command now, as {@link whyNot} does, reading the open scene from
 * `rendered`. Pass `effects` when you already have the command's effects.
 */
export function whyNotIn(rendered: Rendering, state: GameState, game: Game, command: Command, effects?: readonly Effect[]): string | undefined {
  const exempt = ignoresLocks(game, command)
  let known = effects
  const effectsNow = () => (known ??= effectsIn(rendered, state, game, command))
  // What the features refuse first, such as a lock.
  if (!exempt) {
    const cx = featureContext()
    for (const refuse of refusals) {
      const refused = refuse(state, command, game, effectsNow, cx)
      if (refused) return refused
    }
  }
  if (!exempt && pluginsWatch(game)) {
    const refused = pluginGuards(game, state, { command, effects: effectsNow() }).find((entry) => typeof entry === 'string')
    if (refused !== undefined) return refused
  }
  const entry = commandEntry(command)
  return entry ? entry.whyNot(state, command, game, commandContext(rendered)) : stringOf(game, 'notSupported')
}

/**
 * Returns true when no lock or plugin guard can stop this command. A setting is one, since it changes the menu rather
 * than the story, and so is a plugin command that declares it ignores locks.
 */
export function ignoresLocks(game: Game, command: Command): boolean {
  return commandEntry(command)?.ignoresLocks?.(command, game) ?? false
}

/**
 * Returns the effects a command would apply, worked out before it runs. Plugins' guards and prices, and locks on an
 * effect, read them.
 *
 * An action gives its cost as stat effects, then its effects. A choice gives its effects, and a plugin command gives
 * its `effectsOf`. Any other command gives none.
 */
export function effectsOf(state: GameState, game: Game, command: CommandRef): Effect[] {
  return effectsIn(rendering(state, game), state, game, commandOf(command))
}

/**
 * Returns the effects a command would apply, as {@link effectsOf} does, reading the open scene from `rendered`.
 * The game's own `game/…` effects among them are worked out against `state`, so a price or a guard sees what they
 * would do.
 */
export function effectsIn(rendered: Rendering, state: GameState, game: Game, command: Command): Effect[] {
  return previewEffects(state, game, commandEntry(command)?.effectsOf?.(state, command, game, commandContext(rendered)) ?? [])
}

/**
 * Returns a plugin guard's soft refusal of a command, or undefined when there is none. Pass `effects` when you already
 * have the command's effects.
 *
 * A UI shows the warning and offers another way, as the calendar offers bed before dawn, so `whyNot` leaves it out.
 * The reducer still refuses the command with it.
 */
export function warningOf(state: GameState, game: Game, command: CommandRef, effects?: readonly Effect[]): string | undefined {
  return warningIn(rendering(state, game), state, game, commandOf(command), effects)
}

/** Returns a plugin guard's soft refusal of a command, as {@link warningOf} does, reading the open scene from `rendered`. */
export function warningIn(rendered: Rendering, state: GameState, game: Game, command: Command, effects?: readonly Effect[]): string | undefined {
  if (!pluginsWatch(game)) return undefined
  if (ignoresLocks(game, command)) return undefined
  const soft = pluginGuards(game, state, { command, effects: effects ?? effectsIn(rendered, state, game, command) }).find((entry) => typeof entry !== 'string')
  return soft?.reason
}
