/**
 * Actions as the engine exports them, with the core's context bound in. The
 * feature, and what an action is, are in `features/actions.ts`.
 */
import type { ActionDef, Game } from './game.ts'
import { featureContext } from './core.ts'
import * as actions from './features/actions.ts'
import { pluginById, pluginContext, pluginName } from './plugin.ts'
import type { GameState } from './types.ts'

export type { ActionCost } from './features/actions.ts'
export { actionReferences, need } from './features/actions.ts'

/**
 * The action `{ type: 'action', id }` does, in this state: one of the game's
 * content `actions` by its id, or a plugin's by `'<plugin>/<id>'`, as its
 * `action` answers, else among its buttons now. Undefined when there is none.
 */
export function actionById(state: GameState, game: Game, id: string): ActionDef | undefined {
  const parts = pluginName(id)
  if (!parts) return game.actions?.find((action) => action.id === id)
  const plugin = pluginById(game, parts.plugin)
  if (!plugin) return undefined
  const context = pluginContext(plugin, state, game)
  return plugin.action?.(state, parts.name, context) ?? plugin.buttons?.(state, context)?.find((action) => action.id === parts.name)
}

/**
 * Why the player cannot do this action right now, or undefined if they can.
 * Checked in the order the player would notice: a scene open, its `when`, a
 * lock, its own `blocked`, once a turn, then what it costs.
 */
export function actionBlocked(state: GameState, game: Game, action: ActionDef): string | undefined {
  return actions.actionBlocked(state, game, action, featureContext())
}

/** The state with an action's cost paid. A derived stat is never written. */
export function payCost(state: GameState, game: Game, cost: actions.ActionCost): GameState {
  return actions.payCost(state, game, cost, featureContext())
}
