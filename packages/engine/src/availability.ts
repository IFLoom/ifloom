import { say } from './strings.ts'
import { activityBlocked, activityById } from './activity.ts'
import { sceneContext } from './context.ts'
import { itemById, sceneById, type Game, type SceneView } from './game.ts'
import { lockIn } from './locks.ts'
import { pluginCommand, pluginGuards, pluginsWatch } from './plugin.ts'
import { buildEffects } from './custom.ts'
import { inputRefusal } from './inputs.ts'
import { settingRefusal } from './settings.ts'
import type { Command, Effect, GameState } from './types.ts'

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

/**
 * The open scene, rendered at most once however many questions are asked about
 * one state: `scene()` renders it the first time and hands back the same view
 * after. `screen` makes one and shares it between every choice, so a scene is
 * not rendered again for each choice's availability and effects.
 */
export type Rendering = { scene: () => SceneView | undefined }

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
  switch (command.type) {
    case 'dismiss':
      return undefined
    case 'setting':
      return settingRefusal(game, command.id, command.value)
    case 'input':
      return inputRefusal(state, game, command.id, command.value)
    case 'custom': {
      const fn = pluginCommand(game, command.name)
      if (!fn) return say(game, 'noSuchAction')
      return fn.whyNot(state, command.with ?? {})
    }
    case 'activity': {
      const activity = activityById(game, command.id)
      if (!activity) return say(game, 'noSuchAction')
      return activityBlocked(state, game, activity)
    }
    case 'scene':
      if (state.sceneId) return say(game, 'finishFirst')
      return sceneById(game, command.id) ? undefined : say(game, 'noSuchScene')
    case 'choose': {
      if (!state.sceneId) return say(game, 'nothingToChoose')
      // A scene the game no longer has is let through: choosing closes it.
      if (!sceneById(game, state.sceneId)) return undefined
      const choice = rendered.scene()!.choices.find((entry) => entry.id === command.id)
      if (!choice || choice.visible === false) return say(game, 'notOnOffer')
      return choice.disabled
    }
    case 'leave':
      return undefined
    case 'use': {
      const item = itemById(game, command.itemId)
      if (!item) return say(game, 'noSuchThing')
      if (!item.use) return say(game, 'doesNothing', { item: item.name })
      return (state.items[command.itemId] ?? 0) > 0 ? undefined : say(game, 'haveNone', { item: item.name })
    }
    default:
      return say(game, 'notSupported')
  }
}

/**
 * Commands no lock or plugin guard stops: a setting, which is a menu's
 * business rather than the story's, and a plugin command that says it ignores
 * locks.
 */
function ignoresLocks(game: Game, command: Command): boolean {
  if (command.type === 'setting') return true
  return command.type === 'custom' && Boolean(pluginCommand(game, command.name)?.ignoresLocks)
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
  switch (command.type) {
    case 'activity': {
      const activity = activityById(game, command.id)
      if (!activity) return []
      const paid: Effect[] = Object.entries(activity.cost?.stats ?? {}).map(([key, amount]) => ({ kind: 'stat', key, by: -amount }))
      return [...paid, ...buildEffects(state, game, activity.effects ?? [])]
    }
    case 'choose': {
      const choice = rendered.scene()?.choices.find((entry) => entry.id === command.id)
      return choice ? [...choice.effects] : []
    }
    case 'use': {
      const item = itemById(game, command.itemId)
      return item?.use ? [{ kind: 'item', id: command.itemId, by: -1 }, ...item.use.effects] : []
    }
    case 'custom':
      return pluginCommand(game, command.name)?.effectsOf(state, command.with ?? {}) ?? []
    default:
      return []
  }
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
