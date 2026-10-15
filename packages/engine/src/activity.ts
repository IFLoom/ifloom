import { say } from './strings.ts'
import { holds, type Condition } from './condition.ts'
import type { EffectRef } from './custom.ts'
import type { Game } from './game.ts'
import { lockedBy } from './locks.ts'
import { clampStat, lackingLine, statDef, statValue } from './stats.ts'
import type { GameState } from './types.ts'

/**
 * One thing the player can do standing in a room: paperwork, a jog, a drink.
 *
 * The requirement list is the single source of truth for both halves of an
 * activity — the reducer refuses on it, and the view renders its reason as the
 * disabled text. They cannot drift, because there is only one of them.
 */
export type ActivityDef = {
  id: string
  cost?: ActivityCost
  requires?: readonly Requirement[]
  /** Applied after the cost, in order. `{ custom: name }` for one that is computed. */
  effects?: readonly EffectRef[]
}

export type ActivityCost = {
  /** Stats it spends, by id, in the order the button should list them. */
  stats?: Record<string, number>
  /** Refusal lines by stat id, when this activity's voice beats the stat's own. */
  reasons?: Record<string, string>
}

export type Requirement = {
  /** Shown to the player when the requirement is not met. */
  reason: string
  /** Met while this holds. */
  when: Condition
}

/** A requirement: met while `when` holds, and `reason` when it does not. */
export function need(reason: string, when: Condition): Requirement {
  return { reason, when }
}

export function activityById(
  game: Game,
  id: string,
): ActivityDef | undefined {
  return game.activities.find((activity) => activity.id === id)
}

/**
 * Why the player cannot do this right now, or undefined if they can.
 * Checked in the order the player would notice: where they are, what the
 * activity asks of them, then what it costs.
 */
export function activityBlocked(
  state: GameState,
  game: Game,
  activity: ActivityDef,
): string | undefined {
  if (state.sceneId) return say(game, 'finishFirst')
  const locked = lockedBy(state, game, { type: 'activity', id: activity.id })
  if (locked) return locked
  for (const requirement of activity.requires ?? []) {
    if (!holds(state, requirement.when, game)) return requirement.reason
  }
  const cost = activity.cost ?? {}
  for (const [id, amount] of Object.entries(cost.stats ?? {})) {
    if (amount > 0 && statValue(state, game, id) < amount) {
      return cost.reasons?.[id] ?? lackingLine(statDef(game, id), id, amount, game)
    }
  }
  return undefined
}

export function payCost(
  state: GameState,
  game: Game,
  cost: ActivityCost,
): GameState {
  let next = state
  for (const [id, amount] of Object.entries(cost.stats ?? {})) {
    // A derived stat is never written; the loader reports one spent.
    if (!amount || statDef(game, id)?.derive !== undefined) continue
    const value = clampStat(next, game, id, (next.stats[id] ?? 0) - amount)
    next = { ...next, stats: { ...next.stats, [id]: value } }
  }
  return next
}
