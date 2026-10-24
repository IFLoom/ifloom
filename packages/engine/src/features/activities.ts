/**
 * Activities and actions. An activity is something the player can do
 * standing in a room, which may cost stats and asks for what it needs; an
 * action is a button the game offers in every room.
 */
import { say } from '../strings.ts'
import type { EffectRef } from '../custom.ts'
import type { ActionDef, Blocked, Game } from '../game.ts'
import type { Condition, Effect, GameState } from '../types.ts'
import { defineFeature, mergedById, together, type FeatureContext } from './feature.ts'
import { lockedBy } from './locks.ts'
import { clampStat, lackingLine, statDef, statValue } from './stats.ts'

/**
 * One thing the player can do standing in a room: paperwork, a jog, a drink.
 *
 * Its `blocked` list is the single source of truth for both halves of an
 * activity: the reducer refuses on it, and the view renders its reason as the
 * disabled text. They cannot drift, because there is only one of them.
 */
export type ActivityDef = {
  id: string
  cost?: ActivityCost
  /** Refused while one of these holds, with its reason; a button for it is left off the screen with `hide`. */
  blocked?: readonly Blocked[]
  /** Applied after the cost, in order. `{ custom: name }` for one that is computed. */
  effects?: readonly EffectRef[]
}

export type ActivityCost = {
  /** Stats it spends, by id, in the order the button should list them. */
  stats?: Record<string, number>
  /** Refusal lines by stat id, when this activity's voice beats the stat's own. */
  reasons?: Record<string, string>
}

/** What the activities feature adds, as types. */
export type ActivitiesShape = {
  commands: {
    /** Anything the pack declares as an ActivityDef: paperwork, a jog, a drink. */
    activity: { type: 'activity'; id: string }
  }
  game: {
    /** What the player can do, by id, as an action's or a choice's command sends it. None if left out. */
    activities?: ActivityDef[]
    /**
     * Actions offered in every location, after each location's own — waiting,
     * checking a map. A game with none has none.
     */
    actions?: ActionDef[]
  }
  pack: {
    activities?: ActivityDef[]
    /** Actions offered in every location, by id: a later pack's replaces an earlier one's. */
    actions?: ActionDef[]
  }
  lists: 'activity' | 'action'
}

/**
 * A `blocked` entry written the other way round: refused with `reason` unless
 * `when` holds. `need('Not on an empty stomach.', { stat: 'energy', gte: 2 })`.
 */
export function need(reason: string, when: Condition): Blocked {
  return { when: { not: when }, reason }
}

export function activityById(game: Game, id: string): ActivityDef | undefined {
  return (game.activities ?? []).find((activity) => activity.id === id)
}

/**
 * Why the player cannot do this right now, or undefined if they can.
 * Checked in the order the player would notice: where they are, what the
 * activity asks of them, then what it costs.
 */
export function activityBlocked(state: GameState, game: Game, activity: ActivityDef, cx: FeatureContext): string | undefined {
  if (state.sceneId) return say(game, 'finishFirst')
  const locked = lockedBy(state, game, { type: 'activity', id: activity.id }, cx)
  if (locked) return locked
  for (const entry of activity.blocked ?? []) {
    if (cx.holds(state, entry.when, game)) return entry.reason
  }
  const cost = activity.cost ?? {}
  for (const [id, amount] of Object.entries(cost.stats ?? {})) {
    if (amount > 0 && statValue(state, game, id, undefined, cx) < amount) {
      return cost.reasons?.[id] ?? lackingLine(statDef(game, id), id, amount, game)
    }
  }
  return undefined
}

/** The state with an activity's cost paid. A derived stat is never written. */
export function payCost(state: GameState, game: Game, cost: ActivityCost, cx: FeatureContext): GameState {
  let next = state
  for (const [id, amount] of Object.entries(cost.stats ?? {})) {
    // A derived stat is never written; the loader reports one spent.
    if (!amount || statDef(game, id)?.derive !== undefined) continue
    const value = clampStat(next, game, id, (next.stats[id] ?? 0) - amount, cx)
    next = { ...next, stats: { ...next.stats, [id]: value } }
  }
  return next
}

export const activities = defineFeature<ActivitiesShape>({
  name: 'activities',
  commands: {
    activity: {
      whyNot: (state, command, game, cx) => {
        const activity = activityById(game, command.id)
        if (!activity) return say(game, 'noSuchAction')
        return activityBlocked(state, game, activity, cx)
      },
      // Activities are content. The engine only knows how to charge for one and
      // apply what falls out; the reasons it can be refused live in the pack.
      run: (state, command, game, cx) => {
        const activity = activityById(game, command.id)!
        const next = payCost(state, game, activity.cost ?? {}, cx)
        // Computed effects read the state as it was before the cost was paid.
        return cx.runEffects(next, game, cx.buildEffects(state, game, activity.effects ?? []), false)
      },
      effectsOf: (state, command, game, cx) => {
        const activity = activityById(game, command.id)
        if (!activity) return []
        const paid: Effect[] = Object.entries(activity.cost?.stats ?? {}).map(([key, amount]) => ({ kind: 'stat', stat: key, by: -amount }))
        return [...paid, ...cx.buildEffects(state, game, activity.effects ?? [])]
      },
      spends: (command, game) => activityById(game, command.id)?.cost?.stats,
      references: (command) => [{ activity: command.id }],
    },
  },
  // What the base game declares isn't merged: its activities and actions come from its content and packs.
  pack: together(
    mergedById<ActivitiesShape['game'], ActivitiesShape['pack'], ActivityDef>(
      { pack: (pack) => pack.activities },
      (game, list) => {
        game.activities = list
      },
      undefined,
      'activity',
    ),
    mergedById<ActivitiesShape['game'], ActivitiesShape['pack'], ActionDef>(
      { pack: (pack) => pack.actions },
      (game, list) => {
        if (list.length) game.actions = list
      },
      undefined,
      'action',
    ),
  ),
  lists: ['activity', 'action'],
  check: (game, tools) => {
    tools.twice(
      'activity',
      'activities',
      (game.activities ?? []).map((entry) => entry.id),
    )
    const statOf = new Map((game.stats ?? []).map((stat) => [stat.id, stat]))
    for (const activity of game.activities ?? []) {
      const source = { list: 'activity', id: activity.id }
      const where = `activity ${activity.id}`
      tools.check(source, where, [...(activity.blocked ?? []).map((entry) => ({ when: entry.when })), { effects: activity.effects }])
      for (const id of Object.keys(activity.cost?.stats ?? {})) {
        const def = statOf.get(id)
        if (!def) tools.problem(source, where, `spends unknown stat "${id}"`)
        else if (def.derive !== undefined) tools.problem(source, where, `spends stat "${id}", which is derived and never written`)
      }
    }
    tools.twice(
      'action',
      'actions',
      (game.actions ?? []).map((entry) => entry.id),
    )
    for (const action of game.actions ?? []) {
      tools.check({ list: 'action', id: action.id }, `action ${action.id}`, [
        { when: action.when },
        ...(action.blocked ?? []).map((entry) => ({ when: entry.when })),
        { command: action.command },
        { ui: action.ui },
      ])
    }
  },
  resolve: (game) => {
    const ids = new Set((game.activities ?? []).map((activity) => activity.id))
    return { activity: (ref) => (ids.has(ref.activity) ? [] : [`unknown activity "${ref.activity}"`]) }
  },
})
