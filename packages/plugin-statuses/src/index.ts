/**
 * The statuses plugin, which adds timed statuses, such as a coffee that perks the player up for two turns.
 *
 * A status lasts a number of turns. While it lasts, it changes the values the player's stats read through the
 * engine's stat modifiers, which write nothing. It can run effects as it starts, at the end of each turn and as it
 * ends, and applying an active status again refreshes it or adds a stack, as its `reapply` says.
 */
import { inRange, stringOf, type Condition, type EffectRef, type Game, type GameState, type Range } from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type EffectsOf,
  type PluginContext,
  type PluginProblem,
  type StatModifier,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** The rule for applying a status that is already active. `'refresh'` starts its turns again, and `'stack'` adds another stack. */
export type Reapply = 'refresh' | 'stack'

/** A change a status makes to the value one of the player's stats reads, per stack. */
export type StatusModifier = StatModifier

/** A timed status the game declares in `data.statuses.statuses`. It lasts `turns` turns from the turn it is applied in. */
export type StatusDef = {
  /** The status's id. */
  id: string
  /** The status's name, such as "Caffeinated". */
  name: string
  /** The status's description, a line for the UI to show. */
  description?: string
  /** The number of turns the status lasts, counting the end of the turn it was applied in. */
  turns: number
  /** The status's changes to the player's stats while it lasts, per stack. The plugin never writes them to the stats. */
  modifiers?: StatusModifier[]
  /**
   * The status's effects as it runs. `start` runs as the status starts, `turn` once per stack at the end of each turn,
   * and `end` once per stack that runs out.
   *
   * `start` also runs for each stack added, but not for a refresh or a stack that replaces the oldest at `max`. The
   * `turn` effects run before the status's turns go down.
   */
  effects?: { start?: EffectRef[]; turn?: EffectRef[]; end?: EffectRef[] }
  /** The rule for applying the status again while it is active. `'refresh'` if left out. */
  reapply?: Reapply
  /** The most stacks the status can have, with `reapply: 'stack'`. A new stack past it replaces the oldest, and there is no limit if left out. */
  max?: number
}

/** The record a save keeps for one active status, in {@link StatusesState}'s `active`. The plugin reads the status's definition from content. */
export type ActiveRecord = {
  /** The status's id. */
  id: string
  /** The turns left on each stack, oldest stack first. */
  left: number[]
}

/** The active statuses a save keeps for the player. The plugin reads each status's definition from content. */
export type StatusesState = {
  /** The active statuses, in the order they were first applied. */
  active: ActiveRecord[]
}

/** An active status as the player sees it, in `view.plugins.statuses.active`. */
export type ActiveStatus = {
  /** The status's id. */
  id: string
  /** The status's name. */
  name: string
  /** The status's description, or `''` when it has none. */
  description: string
  /** The turns left on the status's longest stack. */
  turnsLeft: number
  /** The number of the status's stacks still running, 1 unless it stacks. */
  stacks: number
  /** The status's changes to the stats now, all its stacks together, one entry per stat. */
  modifiers: StatModifier[]
}

/** The active statuses as the player sees them, in `view.plugins.statuses`. */
export type StatusesView = {
  /** The active statuses, in the order they were first applied. */
  active: ActiveStatus[]
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    statuses: StatusesView
  }
}

const ID = 'statuses'

/** The plugin's one list, `statuses`, as content writes it in `data.statuses.statuses` (a plugin's `data` holds its lists by name), with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, {
  statuses: list<StatusDef>({ noun: 'status', words: { name: true, description: true, effects: { start: 'effects', turn: 'effects', end: 'effects' } } }),
})

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** Active, with that many stacks if asked. */
    active: { status: arg.entry(DATA.statuses), stacks: arg.range().optional() },
  },
  effects: {
    /** Start it, refresh it or add a stack. */
    apply: { status: arg.entry(DATA.statuses) },
    /** Take every stack off, running its `end` effects only if asked. */
    remove: { status: arg.entry(DATA.statuses), runEnd: arg.boolean().optional(false) },
  },
  commands: {
    apply: { id: arg.entry(DATA.statuses) },
    remove: { id: arg.entry(DATA.statuses), runEnd: arg.boolean().optional(false) },
  },
})

function emptyState(): StatusesState {
  return { active: [] }
}

/** Returns the game's timed statuses, from `data.statuses.statuses` in its content and packs. */
export function statusesOf(game: Game): StatusDef[] {
  return DATA.statuses.all(game)
}

/** Returns the status with this id, or undefined when the game has none. */
export function statusOf(game: Game, id: string): StatusDef | undefined {
  return DATA.statuses.get(game, id)
}

/** The modifiers of every stack of these statuses, summed per stat: adds added, multipliers multiplied. */
function combined(game: Game, active: readonly ActiveRecord[]): StatModifier[] {
  const byStat = new Map<string, { add: number; multiply: number }>()
  for (const record of active) {
    const def = statusOf(game, record.id)
    for (let n = 0; n < record.left.length; n += 1) {
      for (const modifier of def?.modifiers ?? []) {
        const sum = byStat.get(modifier.stat) ?? { add: 0, multiply: 1 }
        sum.add += modifier.add ?? 0
        sum.multiply *= modifier.multiply ?? 1
        byStat.set(modifier.stat, sum)
      }
    }
  }
  return [...byStat].map(([stat, sum]) => ({
    stat,
    ...(sum.add !== 0 ? { add: sum.add } : {}),
    ...(sum.multiply !== 1 ? { multiply: sum.multiply } : {}),
  }))
}

/** Everything the UI needs to show what's active. */
function statusesView(record: StatusesState, game: Game): StatusesView {
  const active: ActiveStatus[] = []
  for (const entry of record.active) {
    const def = statusOf(game, entry.id)
    if (!def || !entry.left.length) continue
    active.push({
      id: def.id,
      name: def.name,
      description: def.description ?? '',
      turnsLeft: Math.max(...entry.left),
      stacks: entry.left.length,
      modifiers: combined(game, [entry]),
    })
  }
  return { active }
}

/** The state with the status applied: started, refreshed or stacked. Unknown statuses do nothing. */
function applyTo(state: GameState, id: string, context: PluginContext<StatusesState>): GameState {
  const def = statusOf(context.game, id)
  if (!def) return state
  const slice = context.get(state)
  const turns = Math.max(1, Math.floor(def.turns))
  const at = slice.active.findIndex((entry) => entry.id === id)
  const current = at >= 0 ? slice.active[at] : undefined
  let left: number[]
  let started = true
  if (!current) left = [turns]
  else if ((def.reapply ?? 'refresh') === 'refresh') {
    left = current.left.map(() => turns)
    started = false
  } else if (def.max !== undefined && current.left.length >= def.max) {
    // At its most stacks: the oldest is taken off and a fresh one put on.
    left = [...current.left.slice(1), turns]
    started = false
  } else left = [...current.left, turns]
  const active = current ? slice.active.map((entry, n) => (n === at ? { id, left } : entry)) : [...slice.active, { id, left }]
  const next = context.set({ active }, state)
  return started && def.effects?.start?.length ? context.apply(def.effects.start, next) : next
}

/** The state with every stack of the status taken off, running its `end` effects once per stack if asked. */
function removeFrom(state: GameState, id: string, runEnd: boolean, context: PluginContext<StatusesState>): GameState {
  const slice = context.get(state)
  const current = slice.active.find((entry) => entry.id === id)
  if (!current) return state
  let next = context.set({ active: slice.active.filter((entry) => entry !== current) }, state)
  const end = runEnd ? statusOf(context.game, id)?.effects?.end : undefined
  if (end?.length) for (let n = 0; n < current.left.length; n += 1) next = context.apply(end, next)
  return next
}

/** The end of a turn: each stack's `turn` effects, a turn off every stack, then `end` for each stack that ran out. */
function endTurn(state: GameState, context: PluginContext<StatusesState>): GameState {
  const { game } = context
  let next = state
  for (const record of context.get(state).active) {
    const turn = statusOf(game, record.id)?.effects?.turn
    if (turn?.length) for (let n = 0; n < record.left.length; n += 1) next = context.apply(turn, next)
  }
  // The `turn` effects may have applied or removed statuses: count down what is active now.
  const ended: string[] = []
  const active: ActiveRecord[] = []
  for (const record of context.get(next).active) {
    const left = record.left.map((turns) => turns - 1)
    const kept = left.filter((turns) => turns > 0)
    for (let n = kept.length; n < left.length; n += 1) ended.push(record.id)
    if (kept.length) active.push({ id: record.id, left: kept })
  }
  next = context.set({ active }, next)
  for (const id of ended) {
    const end = statusOf(game, id)?.effects?.end
    if (end?.length) next = context.apply(end, next)
  }
  return next
}

/** Returns the statuses plugin for the game's `plugins`. The game declares its statuses in `data.statuses.statuses`. */
function statusesPlugin(): DefinedPlugin<StatusesState, StatusesView> {
  return definePlugin<StatusesState, StatusesView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    start: emptyState,
    strings: { unknown: 'Nothing like that can happen.', notActive: 'That isn’t affecting you.' },
    conditions: {
      /** `{ 'statuses/active': { status, stacks? } }`: active, with that many stacks if asked. */
      active: (state, { status, stacks }, { slice, game }) => {
        const record = slice.active.find((entry) => entry.id === status)
        if (!record) return false
        return stacks ? inRange(state, game, record.left.length, stacks) : true
      },
    },
    effects: {
      /** `{ 'statuses/apply': { status } }`: start it, refresh it or add a stack. */
      apply: (state, { status }, context) => applyTo(state, status, context),
      /** `{ 'statuses/remove': { status, runEnd? } }`: take every stack off, running its `end` effects only if asked. */
      remove: (state, { status, runEnd }, context) => removeFrom(state, status, runEnd, context),
    },
    commands: {
      /** `{ 'statuses/apply': { id } }`. */
      apply: {
        whyNot: (_state, { id }, { game }) => (statusOf(game, id) ? undefined : stringOf(game, 'statuses/unknown')),
        run: (state, { id }, context) => applyTo(state, id, context),
        effectsOf: (_state, { id }) => [CALLS.effects.apply({ status: id })],
      },
      /** `{ 'statuses/remove': { id, runEnd? } }`. */
      remove: {
        whyNot: (_state, { id }, { slice, game }) => (slice.active.some((entry) => entry.id === id) ? undefined : stringOf(game, 'statuses/notActive')),
        run: (state, { id, runEnd }, context) => removeFrom(state, id, runEnd, context),
        effectsOf: (_state, { id, runEnd }) => [CALLS.effects.remove({ status: id, runEnd })],
      },
    },
    statModifiers: (_state, { slice, game }) => (slice.active.length ? combined(game, slice.active) : undefined),
    onTurn: (state, context) => (context.slice.active.length ? endTurn(state, context) : state),
    view: (_state, { slice, game }) => statusesView(slice, game),
    references: {
      content: (game) =>
        DATA.statuses.content(game, (def) => [
          ...(def.modifiers ?? []).map((modifier) => ({ stat: modifier.stat })),
          { within: 'effects.start', refs: [{ effects: def.effects?.start }] },
          { within: 'effects.turn', refs: [{ effects: def.effects?.turn }] },
          { within: 'effects.end', refs: [{ effects: def.effects?.end }] },
        ]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const def of statusesOf(game)) {
        const problem = (what: string) => problems.push(DATA.statuses.problem(def.id, what))
        if (!(def.turns >= 1)) problem('turns must be 1 or more')
        if (def.max !== undefined && (def.reapply ?? 'refresh') !== 'stack') problem('max only applies with reapply: "stack"')
        if (def.max !== undefined && !(def.max >= 1)) problem('max must be 1 or more')
        for (const modifier of def.modifiers ?? []) {
          if (game.stats?.find((stat) => stat.id === modifier.stat)?.of !== undefined) {
            problem(`stat "${modifier.stat}" belongs to ${game.stats.find((stat) => stat.id === modifier.stat)?.of}, not the player`)
          }
        }
      }
      return problems
    },
  })
}

/** Returns the `statuses/active` condition, which holds while the status is active, with a number of stacks in the range if given. */
const statusActive = (id: string, stacks?: Range): Condition => CALLS.conditions.active(stacks ? { status: id, stacks } : { status: id })
/** Returns the `statuses/apply` effect, which starts the status, or refreshes or stacks it if it's already active. */
const applyStatus = (id: string): EffectRef => CALLS.effects.apply({ status: id })
/** Returns the `statuses/remove` effect, which takes every stack of the status off. With `runEnd`, its `end` effects run once per stack. */
const removeStatus = (id: string, runEnd = false): EffectRef => CALLS.effects.remove(runEnd ? { status: id, runEnd } : { status: id })

/**
 * The statuses plugin's factory, with its helpers as properties. `statuses()` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `statuses.apply('caffeinated')`.
 */
export const statuses = Object.assign(statusesPlugin, {
  /** Returns the `statuses/active` condition, which holds while the status is active, with a number of stacks in the range if given. */
  active: statusActive,
  /** Returns the `statuses/apply` effect, which starts the status, or refreshes or stacks it if it's already active. */
  apply: applyStatus,
  /** Returns the `statuses/remove` effect, which takes every stack of the status off, running its `end` effects with `runEnd`. */
  remove: removeStatus,
})
