/**
 * The actions helpers the engine exports, with the core's context bound in. The feature and the action types are in
 * `features/actions.ts`.
 */
import type { ActionDef, Game } from './game.ts'
import { commandContext, featureContext } from './core.ts'
import { rendering } from './availability.ts'
import * as actions from './features/actions.ts'
import { pluginOf, pluginContext, pluginName } from './plugin.ts'
import type { GameState } from './types.ts'

export type { ActionCost } from './features/actions.ts'
export { actionReferences, need } from './features/actions.ts'

/**
 * Returns the action that `{ type: 'action', id }` runs in this state. Returns undefined when there is none.
 *
 * A plain id names one of the game's `actions`. An id of the form `'<plugin>/<id>'` names a plugin's action, from its
 * `action` provider, else from the actions it offers now.
 */
export function actionOf(state: GameState, game: Game, id: string): ActionDef | undefined {
  const parts = pluginName(id)
  if (!parts) return game.actions?.find((action) => action.id === id)
  const plugin = pluginOf(game, parts.plugin)
  if (!plugin) return undefined
  const context = pluginContext(plugin, state, game)
  return plugin.action?.(state, parts.name, context) ?? plugin.actions?.(state, context)?.find((action) => action.id === parts.name)
}

/**
 * Returns the reason the player can't take this action now, or undefined when they can.
 *
 * The engine checks in the order the player would notice: an open scene, the action's `when`, a lock, its own
 * `blocked`, its `once`, its cost, then whether its command would be refused.
 */
export function actionBlocked(state: GameState, game: Game, action: ActionDef): string | undefined {
  // With the command context, so an action whose command would be refused is refused with that command's reason.
  return actions.actionBlocked(state, game, action, commandContext(rendering(state, game)))
}

/** Returns the state with an action's cost paid. The engine never writes a derived stat. */
export function payCost(state: GameState, game: Game, cost: actions.ActionCost): GameState {
  return actions.payCost(state, game, cost, featureContext())
}
