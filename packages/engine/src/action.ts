/**
 * Actions as the engine exports them, with the core's context bound in. The
 * feature, and what an action is, are in `features/actions.ts`.
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
 * The action `{ type: 'action', id }` does, in this state: one of the game's
 * content `actions` by its id, or a plugin's by `'<plugin>/<id>'`, as its
 * `action` answers, else among its buttons now. Undefined when there is none.
 */
export function actionOf(state: GameState, game: Game, id: string): ActionDef | undefined {
  const parts = pluginName(id)
  if (!parts) return game.actions?.find((action) => action.id === id)
  const plugin = pluginOf(game, parts.plugin)
  if (!plugin) return undefined
  const context = pluginContext(plugin, state, game)
  return plugin.action?.(state, parts.name, context) ?? plugin.buttons?.(state, context)?.find((action) => action.id === parts.name)
}

/**
 * Why the player cannot do this action right now, or undefined if they can.
 * Checked in the order the player would notice: a scene open, its `when`, a
 * lock, its own `blocked`, once a turn, what it costs, then whether its
 * command would be refused.
 */
export function actionBlocked(state: GameState, game: Game, action: ActionDef): string | undefined {
  // With the command context, so an action whose command would be refused is refused with that command's reason.
  return actions.actionBlocked(state, game, action, commandContext(rendering(state, game)))
}

/** The state with an action's cost paid. A derived stat is never written. */
export function payCost(state: GameState, game: Game, cost: actions.ActionCost): GameState {
  return actions.payCost(state, game, cost, featureContext())
}
