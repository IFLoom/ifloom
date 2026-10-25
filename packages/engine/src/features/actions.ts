/**
 * Actions: what the player can do, as buttons. The game's own are content's
 * `actions`, offered in every room while no scene is open; a plugin's are its
 * buttons (a place's) or answered by its `action` (an app's). One with a
 * cost, effects or `once` is run by the `action` command, by its id.
 */
import { stringOf } from '../strings.ts'
import type { ActionDef, Blocked, Game } from '../game.ts'
import type { Command, Condition, Effect, GameState } from '../types.ts'
import { commandOf } from '../calls.ts'
import type { Reference } from '../references.ts'
import { defineFeature, mergedById, type CommandContext, type FeatureContext } from './feature.ts'
import { lockedBy } from './locks.ts'
import { clampStat, lackingLine, statOf, statValue } from './stats.ts'

/** What an action costs. */
export type ActionCost = {
  /** Stats it spends, by id, in the order the button should list them. */
  stats?: Record<string, number>
  /** Refusal lines by stat id, when this action's voice beats the stat's own. */
  reasons?: Record<string, string>
}

/** What the actions feature adds, as types. */
export type ActionsShape = {
  commands: {
    /**
     * Do an action by its id: the game's (`{ type: 'action', id: 'wait' }`),
     * or a plugin's with its id in front (`'places/coffee'`).
     */
    action: { type: 'action'; id: string }
  }
  game: {
    /**
     * What the player can do, by id. One with a `label` is a button in every
     * room while no scene is open; one with none is done only by
     * `{ type: 'action', id }`. None if left out.
     */
    actions?: ActionDef[]
  }
  pack: {
    /** Actions, by id: a later pack's replaces an earlier one's. */
    actions?: ActionDef[]
  }
  lists: 'action'
}

/**
 * A `blocked` entry written the other way round: refused with `reason` unless
 * `when` holds. `need('Not on an empty stomach.', { stat: 'energy', gte: 2 })`.
 */
export function need(reason: string, when: Condition): Blocked {
  return { when: { not: when }, reason }
}

/** Does pressing this action's button send `{ type: 'action' }`, rather than its command alone? */
export function runsAsAction(action: ActionDef): boolean {
  return Boolean(action.effects?.length || action.cost || action.once || !action.command)
}

/** The state with an action counted in `chosen` under its id, on this turn: how its `once` knows. */
function countedOnce(state: GameState, id: string): GameState {
  const was = state.chosen?.[id]
  const times = was ? { n: was.n + 1, first: was.first, last: state.turn } : { n: 1, first: state.turn, last: state.turn }
  return { ...state, chosen: { ...state.chosen, [id]: times } }
}

/** Has the action been done this turn, as its `once` counts it? */
export function doneThisTurn(state: GameState, id: string): boolean {
  return state.chosen?.[id]?.last === state.turn
}

/**
 * Why the player cannot do this action right now, or undefined if they can.
 * Checked in the order the player would notice: a scene open, a lock, its
 * own `blocked`, once a turn, what it costs, then the command it sends.
 * `id` is the id the `action` command names it by.
 */
export function actionBlocked(
  state: GameState,
  game: Game,
  action: ActionDef,
  cx: FeatureContext & Partial<CommandContext>,
  id = action.id,
): string | undefined {
  if (state.sceneId) return stringOf(game, 'finishFirst')
  if (!cx.holds(state, game, action.when)) return stringOf(game, 'notOnOffer')
  const locked = lockedBy(state, game, { type: 'action', id }, cx)
  if (locked) return locked
  for (const entry of action.blocked ?? []) {
    if (cx.holds(state, game, entry.when)) return entry.reason
  }
  if (action.once && doneThisTurn(state, id)) return action.once.reason
  const short = costRefusal(state, game, action.cost, cx)
  if (short) return short
  if (action.command && commandOf(action.command).type === 'choose') return stringOf(game, 'notOnOffer')
  const sends = sent(action, id)
  return sends && cx.whyNotCommand ? deeper(() => cx.whyNotCommand!(state, game, sends)) : undefined
}

/** Why a button can't be paid for now: the first stat it spends that the player has too little of, in its words or the stat's. */
export function costRefusal(state: GameState, game: Game, cost: ActionCost | undefined, cx: FeatureContext): string | undefined {
  for (const [stat, amount] of Object.entries(cost?.stats ?? {})) {
    if (amount > 0 && statValue(state, game, stat, undefined, cx) < amount) {
      return cost?.reasons?.[stat] ?? lackingLine(game, stat, amount)
    }
  }
  return undefined
}

/** The state with an action's cost paid. A derived stat is never written. */
export function payCost(state: GameState, game: Game, cost: ActionCost, cx: FeatureContext): GameState {
  let next = state
  for (const [id, amount] of Object.entries(cost.stats ?? {})) {
    // A derived stat is never written; the loader reports one spent.
    if (!amount || statOf(game, id)?.derive !== undefined) continue
    const value = clampStat(next, game, id, (next.stats[id] ?? 0) - amount, cx)
    next = { ...next, stats: { ...next.stats, [id]: value } }
  }
  return next
}

/** What a cost applies, as stat effects, for guards, prices and locks to see. */
export const costEffects = (cost: ActionCost | undefined): Effect[] =>
  Object.entries(cost?.stats ?? {}).map(([stat, amount]): Effect => ({ stat, by: -amount }))

/**
 * The command an action sends, if it sends one that isn't a choice, nor the
 * action itself, nor another action while actions are already that deep in
 * each other: ten deep is a loop, not a design.
 */
const sent = (action: ActionDef, id: string): Command | undefined => {
  const command = action.command && commandOf(action.command)
  if (!command || command.type === 'choose') return undefined
  if (command.type === 'action' && (command.id === id || depth >= 10)) return undefined
  return command
}

/** How deep actions are running each other's commands. */
let depth = 0

/** `fn`, one action deeper. */
function deeper<T>(fn: () => T): T {
  depth += 1
  try {
    return fn()
  } finally {
    depth -= 1
  }
}

export const actions = defineFeature<ActionsShape>({
  name: 'actions',
  commands: {
    action: {
      whyNot: (state, command, game, cx) => {
        const action = cx.actionOf(state, game, command.id)
        if (!action) return stringOf(game, 'noSuchAction')
        return actionBlocked(state, game, action, cx, command.id)
      },
      // Counted first when it's once a turn, then its command, its cost and its effects, in that order.
      run: (state, command, game, cx) => {
        const action = cx.actionOf(state, game, command.id)!
        const counted = action.once ? countedOnce(state, command.id) : state
        const sends = sent(action, command.id)
        const ran = sends ? deeper(() => cx.runCommand(counted, game, sends)) : counted
        const paid = payCost(ran, game, action.cost ?? {}, cx)
        return cx.runEffects(paid, game, cx.buildEffects(game, action.effects ?? []), false)
      },
      effectsOf: (state, command, game, cx) => {
        const action = cx.actionOf(state, game, command.id)
        if (!action) return []
        const sends = sent(action, command.id)
        return [
          ...(sends ? deeper(() => cx.effectsOfCommand(state, game, sends)) : []),
          ...costEffects(action.cost),
          ...cx.buildEffects(game, action.effects ?? []),
        ]
      },
      spends: (command, game, state, cx) => cx.actionOf(state, game, command.id)?.cost?.stats,
      references: (command) => [{ action: command.id }],
    },
  },
  // What the base game declares isn't merged: its actions come from its content and packs.
  pack: mergedById<ActionsShape['game'], ActionsShape['pack'], ActionDef>(
    { pack: (pack) => pack.actions },
    (game, list) => {
      if (list.length) game.actions = list
    },
    undefined,
    'action',
  ),
  lists: ['action'],
  check: (game, tools) => {
    tools.twice(
      'action',
      'actions',
      (game.actions ?? []).map((entry) => entry.id),
    )
    const statsById = new Map((game.stats ?? []).map((stat) => [stat.id, stat]))
    for (const action of game.actions ?? []) {
      const source = { list: 'action', id: action.id }
      const where = `action ${action.id}`
      tools.check(source, where, actionReferences(action))
      for (const id of Object.keys(action.cost?.stats ?? {})) {
        const def = statsById.get(id)
        if (!def) tools.problem(source, where, `spends unknown stat "${id}"`)
        else if (def.derive !== undefined) tools.problem(source, where, `spends stat "${id}", which is derived and never written`)
      }
      const sends = action.command && commandOf(action.command)
      if (sends?.type === 'choose') tools.problem(source, where, "an action's command can't be a choice")
      if (sends?.type === 'action' && sends.id === action.id)
        tools.problem(source, where, "an action's command can't be the action itself; give it the effects")
    }
  },
  resolve: (game) => {
    const ids = new Set((game.actions ?? []).map((action) => action.id))
    // A plugin's action is its own to answer for, in this state; only the game's are known before play.
    return { action: (ref) => (ref.action.includes('/') || ids.has(ref.action) ? [] : [`unknown action "${ref.action}"`]) }
  },
})

/**
 * What an action names, for the content checker: its conditions, effects,
 * command and hints, and its words. For a plugin whose content holds actions
 * (a place's, an app's) to hand to its `references`.
 */
export function actionReferences(action: ActionDef): Reference[] {
  return [
    { words: action.label, field: 'label' },
    ...(action.labels ?? []).flatMap((entry) => [{ words: entry.label, field: 'label' }, { when: entry.when }]),
    { when: action.when },
    ...(action.blocked ?? []).map((entry) => ({ when: entry.when })),
    { effects: action.effects },
    { command: action.command },
    { ui: action.ui },
  ]
}
