/**
 * Activities as the engine exports them, with the core's context bound in.
 * The feature, and what an activity is, are in `features/activities.ts`.
 */
import type { Game } from './game.ts'
import { featureContext } from './core.ts'
import * as activities from './features/activities.ts'
import type { GameState } from './types.ts'

export type { ActivityCost, ActivityDef, Requirement } from './features/activities.ts'
export { activityById, need } from './features/activities.ts'

/**
 * Why the player cannot do this right now, or undefined if they can.
 * Checked in the order the player would notice: where they are, what the
 * activity asks of them, then what it costs.
 */
export function activityBlocked(
  state: GameState,
  game: Game,
  activity: activities.ActivityDef,
): string | undefined {
  return activities.activityBlocked(state, game, activity, featureContext())
}

export function payCost(
  state: GameState,
  game: Game,
  cost: activities.ActivityCost,
): GameState {
  return activities.payCost(state, game, cost, featureContext())
}
