/**
 * The core's kinds of condition, effect and command that no feature owns yet,
 * as one provisional feature-like table, and the complete tables built from
 * it and the features' (`features/registry.ts`). The shared code (`holds`,
 * `explain`, `applyEffect`, `run`, `whyNotIn`, `effectsIn`, the reference
 * resolver) looks a kind up in `KINDS` and names no feature.
 *
 * Moving a kind into a feature (ROADMAP, architecture #4 step 2) moves its
 * entry out of here. `all`, `any`, `not` and custom calls stay in the core.
 *
 * Also the `FeatureContext` the core lends features: its helpers, built the
 * first time one is asked for, so nothing runs while the modules load.
 */
import { say } from './strings.ts'
import { holds } from './condition.ts'
import { buildEffects, customCall, customCondition, customValue } from './custom.ts'
import { anyOf, bindCurrent, entitiesOf, entityOf, newEntity, parseRef, removeEntity, writeEntity } from './entities.ts'
import { storylineOf, storylineOpen } from './storylines.ts'
import { collect, discard } from './collections.ts'
import { dismiss, notify } from './notices.ts'
import { inputById, inputRefusal, inputValue } from './inputs.ts'
import { activityBlocked, activityById, payCost } from './activity.ts'
import { itemById, sceneById, type Game } from './game.ts'
import { sceneContext } from './context.ts'
import { pluginAudio, pluginCommand, pluginEffect } from './plugin.ts'
import { endTurn, runEffects } from './reduce.ts'
import { roll, weighted } from './random.ts'
import type { Reference } from './references.ts'
import { bounded, counted, inRange, wanted, type CommandContext, type EffectContext, type FeatureContext, type Rendering } from './features/feature.ts'
import { withCore, type FeatureCommands, type FeatureConditions, type FeatureEffects } from './features/registry.ts'
import type {
  Command,
  Condition,
  ConditionKind,
  CoreCommands,
  CoreConditions,
  CoreEffects,
  Effect,
  FlagValue,
  GameState,
} from './types.ts'
import type { CommandEntry, ConditionEntry, EffectEntry } from './features/feature.ts'

let context: FeatureContext | undefined

/** The core's helpers, as features are lent them. */
export function featureContext(): FeatureContext {
  return (context ??= {
    holds,
    runEffects,
    endTurn: (state, game) => endTurn(state, game),
    weighted,
    roll,
    customValue,
    pluginAudio,
    sceneById,
    sceneView: (state, game) => (state.sceneId ? sceneById(game, state.sceneId)?.render(state, sceneContext(state, game)) : undefined),
  })
}

let effectContexts: [EffectContext, EffectContext] | undefined

/** The context an effect applies with: `ending` while a turn is ending. */
export function effectContext(ending: boolean): EffectContext {
  effectContexts ??= [
    { ...featureContext(), ending: false },
    { ...featureContext(), ending: true },
  ]
  return effectContexts[ending ? 1 : 0]
}

/** The context a command is asked about and run with: the open scene, rendered once. */
export function commandContext(rendered: Rendering): CommandContext {
  return { ...featureContext(), rendered }
}

/** The kind an `of` names, when it names one rather than `'$'`. */
function ofKind(ref: string | undefined): Reference[] {
  const parts = ref === undefined ? undefined : parseRef(ref)
  return parts ? [{ kind: parts.kind }] : []
}

const none = (): Reference[] => []

/** The core's conditions. `all`, `any` and `not` are asked part by part in `holds` and `explain` too. */
const conditions: { [K in keyof CoreConditions]: ConditionEntry<CoreConditions[K]> } = {
  all: {
    holds: (state, condition, game, cx) => condition.all.every((entry) => cx.holds(state, entry, game)),
    explain: (_state, condition) => `all of ${condition.all.length}`,
    references: (condition) => condition.all.map((when) => ({ when })),
  },
  any: {
    holds: (state, condition, game, cx) => condition.any.some((entry) => cx.holds(state, entry, game)),
    explain: (_state, condition) => `any of ${condition.any.length}`,
    references: (condition) => condition.any.map((when) => ({ when })),
  },
  not: {
    holds: (state, condition, game, cx) => !cx.holds(state, condition.not, game),
    explain: () => 'not',
    references: (condition) => [{ when: condition.not }],
  },
  flag: {
    holds: (state, condition) => {
      const flags = condition.of === undefined ? state.flags : entityOf(state, condition.of)?.flags
      // An entity that is not there has no variables to test: false, whatever was asked.
      if (!flags) return false
      const value = flags[condition.flag]
      if (condition.is !== undefined) return value === condition.is
      if (bounded(condition)) return inRange(counted(value), condition)
      return Boolean(value)
    },
    explain: (state, condition) => {
      const owner = condition.of === undefined ? state.flags : entityOf(state, condition.of)?.flags
      if (!owner) return `${condition.of} is not in the game; wants it there`
      const value = owner[condition.flag]
      const want = condition.is !== undefined ? `= ${JSON.stringify(condition.is)}` : bounded(condition) ? wanted(condition) : 'set'
      return `${condition.of === undefined ? '' : `${condition.of} `}flag ${condition.flag} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
    },
    references: (condition) => ofKind(condition.of),
  },
  storylineFlag: {
    holds: (state, condition) => {
      const { storyline, key, is } = condition.storylineFlag
      const value = storylineOf(state, storyline).flags[key]
      return is === undefined ? Boolean(value) : value === is
    },
    explain: (state, condition) => {
      const { storyline, key, is } = condition.storylineFlag
      const value = storylineOf(state, storyline).flags[key]
      const want = is === undefined ? 'set' : `= ${JSON.stringify(is)}`
      return `storyline ${storyline} flag ${key} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
    },
    references: (condition) => [{ storyline: condition.storylineFlag.storyline }],
  },
  count: {
    holds: (state, condition, game, cx) => inRange(counting(state, condition, game, cx), condition),
    explain: (state, condition, game, cx) =>
      `${counting(state, condition, game, cx)} ${condition.count}${condition.where ? ' where it holds' : ''}; wants ${wanted(condition)}`,
    references: (condition) => [{ kind: condition.count }, { when: bindCurrent(condition.where, anyOf(condition.count)) }],
  },
  entity: {
    holds: (state, condition) => entityOf(state, condition.entity) !== undefined,
    explain: (state, condition) => `${condition.entity} is ${entityOf(state, condition.entity) ? '' : 'not '}in the game`,
    references: (condition) => ofKind(condition.entity),
  },
  storyline: {
    holds: (state, condition) => storylineOpen(state, condition.storyline) === (condition.open ?? true),
    explain: (state, condition) => {
      const open = storylineOpen(state, condition.storyline)
      return `storyline ${condition.storyline} is ${open ? 'open' : 'closed'}; wants it ${condition.open ?? true ? 'open' : 'closed'}`
    },
    references: (condition) => [{ storyline: condition.storyline }],
  },
  counter: {
    holds: (state, condition) => inRange(counted(storylineOf(state, condition.counter.storyline).flags[condition.counter.key]), condition),
    explain: (state, condition) => {
      const { storyline, key } = condition.counter
      const value = storylineOf(state, storyline).flags[key]
      return `counter ${storyline}.${key} is ${typeof value === 'number' ? value : 0}; wants ${wanted(condition)}`
    },
    references: (condition) => [{ storyline: condition.counter.storyline }],
  },
  item: {
    holds: (state, condition) => inRange(state.items[condition.item] ?? 0, condition),
    explain: (state, condition) => `item ${condition.item}: ${state.items[condition.item] ?? 0} carried; wants ${wanted(condition)}`,
    references: (condition) => [{ item: condition.item }],
  },
  has: {
    holds: (state, condition) => (state.items[condition.has] ?? 0) > 0,
    explain: (state, condition) => `item ${condition.has}: ${state.items[condition.has] ?? 0} owned; wants at least 1`,
    references: (condition) => [{ item: condition.has }],
  },
  collection: {
    holds: (state, condition) => {
      const entries = state.collections?.[condition.collection] ?? []
      if (condition.id !== undefined) return entries.some((entry) => entry.id === condition.id)
      if (!bounded(condition)) return entries.length > 0
      return inRange(entries.length, condition)
    },
    explain: (state, condition) => {
      const entries = state.collections?.[condition.collection] ?? []
      if (condition.id !== undefined) {
        return `${condition.collection} ${entries.some((entry) => entry.id === condition.id) ? 'has' : 'lacks'} ${condition.id}; wants it there`
      }
      return `${condition.collection} has ${entries.length}; wants ${bounded(condition) ? wanted(condition) : 'at least 1'}`
    },
    references: (condition) => [{ collection: condition.collection }],
  },
  turn: {
    holds: (state, condition) => inRange(state.turn, condition),
    explain: (state, condition) => `turn ${state.turn}; wants ${wanted(condition)}`,
    references: none,
  },
  phase: {
    holds: (state, condition) => condition.phase.includes(state.phase),
    explain: (state, condition) => `phase is ${state.phase || '(none)'}; wants one of ${condition.phase.join(', ')}`,
    references: none,
  },
  // Also a plugin's call in short, `{ 'quests/done': { quest: 'bakery' } }`, read as `{ custom }`.
  custom: {
    // An undeclared custom condition is a content fault the checker reports; here it
    // simply does not apply, so a broken mod hides content rather than crashing.
    holds: (state, condition, game) => {
      const call = customCall(condition)
      const fn = call && customCondition(game, call.custom)
      return fn ? fn(state, call.with ?? {}) : false
    },
    explain: (_state, condition, game) => {
      const call = customCall(condition)
      if (!call) return 'a custom condition with no name'
      return customCondition(game, call.custom) ? `custom condition ${call.custom}` : `custom condition ${call.custom} is not declared by the game`
    },
    references: (condition) => {
      const call = customCall(condition)
      return call ? [{ call: 'conditions', name: call.custom, with: call.with }] : []
    },
  },
}

/** How many entities of a kind a `count` condition counts. */
function counting(state: GameState, condition: CoreConditions['count'], game: Game | undefined, cx: FeatureContext): number {
  const refs = entitiesOf(state, condition.count)
  return condition.where ? refs.filter((ref) => cx.holds(state, bindCurrent(condition.where, ref), game)).length : refs.length
}

/** The core's effects. */
const effects: { [K in keyof CoreEffects]: EffectEntry<CoreEffects[K]> } = {
  custom: {
    apply: (state, effect, game, cx) => {
      // A plugin the game no longer has does nothing, as an unknown custom effect does.
      const fn = pluginEffect(game, effect.name, cx.ending)
      return fn ? fn(state, effect.with ?? {}) : state
    },
    references: (effect) => [{ call: 'effects', name: effect.name, with: effect.with, long: true }],
  },
  storylineFlag: {
    apply: (state, effect) => {
      const cur = storylineOf(state, effect.id)
      return { ...state, storylines: { ...state.storylines, [effect.id]: { ...cur, flags: { ...cur.flags, [effect.key]: effect.value } } } }
    },
    references: (effect) => [{ storyline: effect.id }],
  },
  flag: {
    apply: (state, effect) => {
      const entity = effect.of === undefined ? undefined : entityOf(state, effect.of)
      if (effect.of !== undefined && !entity) return state
      const flags = entity ? entity.flags : state.flags
      let value: FlagValue
      if ('add' in effect) {
        const was = flags[effect.key]
        value = (typeof was === 'number' ? was : 0) + effect.add
      } else value = effect.value
      if (entity) return writeEntity(state, effect.of!, { ...entity, flags: { ...flags, [effect.key]: value } })
      return { ...state, flags: { ...state.flags, [effect.key]: value } }
    },
    references: (effect) => ofKind(effect.of),
  },
  create: {
    apply: (state, effect, game) => {
      const kind = state.entities?.[effect.of] ?? {}
      const made = (id: string) => writeEntity(state, `${effect.of}:${id}`, newEntity(game, effect.of, effect.entity))
      // A given id is used as it is, unless it is taken, or a whole number that would sort first.
      if (effect.entity.id !== undefined) {
        if (kind[effect.entity.id] || /^\d+$/.test(effect.entity.id)) return state
        // Back after being removed: no longer gone for good.
        const back = made(effect.entity.id)
        const ref = `${effect.of}:${effect.entity.id}`
        return back.removed?.includes(ref) ? { ...back, removed: back.removed.filter((entry) => entry !== ref) } : back
      }
      // The next free number, `#1`, `#2`, never reused. Not a bare number: object keys
      // that look like numbers sort before the rest, and entities keep the order they came.
      let n = state.created?.[effect.of] ?? 0
      do n += 1
      while (kind[`#${n}`])
      return { ...made(`#${n}`), created: { ...state.created, [effect.of]: n } }
    },
    references: (effect) => [{ kind: effect.of }, ...Object.keys(effect.entity.stats ?? {}).map((stat) => ({ stat, starts: effect.of }))],
  },
  remove: {
    apply: (state, effect, game) => {
      if (!entityOf(state, effect.of)) return state
      const gone = removeEntity(state, effect.of)
      // A declared one stays gone when the save is next loaded.
      const declared = (game.entities ?? []).some((entity) => `${entity.of}:${entity.id}` === effect.of)
      return declared && !(gone.removed ?? []).includes(effect.of) ? { ...gone, removed: [...(gone.removed ?? []), effect.of] } : gone
    },
    references: (effect) => ofKind(effect.of),
  },
  each: {
    apply: (state, effect, game, cx) => {
      // Who it runs for is decided before it starts: one created on the way is not visited, one removed is skipped.
      let next = state
      for (const ref of entitiesOf(state, effect.of)) {
        if (!entityOf(next, ref)) continue
        if (effect.where && !cx.holds(next, bindCurrent(effect.where, ref), game)) continue
        next = cx.runEffects(next, game, buildEffects(next, game, bindCurrent(effect.effects, ref)), cx.ending)
      }
      return next
    },
    references: (effect) => {
      // Inside, `'$'` is one of the kind it runs over.
      const one = anyOf(effect.of)
      return [{ kind: effect.of }, { within: `in each ${effect.of}`, refs: [{ when: bindCurrent(effect.where, one) }, { effects: bindCurrent(effect.effects, one) }] }]
    },
  },
  item: {
    apply: (state, effect) => ({ ...state, items: { ...state.items, [effect.id]: Math.max(0, (state.items[effect.id] ?? 0) + effect.by) } }),
    references: (effect) => [{ item: effect.id }],
  },
  phase: {
    apply: (state, effect) => ({ ...state, phase: effect.value }),
    references: none,
  },
  closeStoryline: {
    apply: (state, effect) => {
      const cur = storylineOf(state, effect.id)
      return { ...state, storylines: { ...state.storylines, [effect.id]: { ...cur, closedUntil: state.turn + effect.turns } } }
    },
    references: (effect) => [{ storyline: effect.id }],
  },
  turn: {
    apply: (state, effect, game, cx) => {
      if (cx.ending) return state
      let next = state
      for (let n = 0; n < (effect.by ?? 1); n += 1) next = cx.endTurn(next, game)
      return next
    },
    references: none,
  },
  collect: {
    apply: (state, effect, game) => collect(state, game, effect.to, effect.entry),
    references: (effect) => [
      { collection: effect.to },
      ...(effect.entry.text !== undefined ? [{ prose: effect.entry.text }] : []),
      ...(effect.entry.image !== undefined ? [{ picture: effect.entry.image, asWritten: true }] : []),
    ],
  },
  discard: {
    apply: (state, effect) => discard(state, effect.from, effect.id),
    references: (effect) => [{ collection: effect.from }],
  },
  notify: {
    apply: (state, effect) => {
      const { kind: _kind, ...notice } = effect
      return notify(state, notice)
    },
    references: (effect) => [
      ...(effect.text !== undefined ? [{ prose: effect.text }] : []),
      ...(effect.image !== undefined ? [{ picture: effect.image, asWritten: true }] : []),
    ],
  },
}

/** The core's commands. `start` is handled by `apply` before any of these are asked. */
const commands: { [K in keyof CoreCommands]: CommandEntry<CoreCommands[K]> } = {
  start: {
    whyNot: (_state, _command, game) => say(game, 'notSupported'),
    run: (state) => state,
    references: none,
  },
  activity: {
    whyNot: (state, command, game) => {
      const activity = activityById(game, command.id)
      if (!activity) return say(game, 'noSuchAction')
      return activityBlocked(state, game, activity)
    },
    // Activities are content. The engine only knows how to charge for one and
    // apply what falls out; the reasons it can be refused live in the pack.
    run: (state, command, game, cx) => {
      const activity = activityById(game, command.id)!
      const next = payCost(state, game, activity.cost ?? {})
      // Computed effects read the state as it was before the cost was paid.
      return cx.runEffects(next, game, buildEffects(state, game, activity.effects ?? []), false)
    },
    effectsOf: (state, command, game) => {
      const activity = activityById(game, command.id)
      if (!activity) return []
      const paid: Effect[] = Object.entries(activity.cost?.stats ?? {}).map(([key, amount]) => ({ kind: 'stat', key, by: -amount }))
      return [...paid, ...buildEffects(state, game, activity.effects ?? [])]
    },
    references: (command) => [{ activity: command.id }],
  },
  use: {
    whyNot: (state, command, game) => {
      const item = itemById(game, command.itemId)
      if (!item) return say(game, 'noSuchThing')
      if (!item.use) return say(game, 'doesNothing', { item: item.name })
      return (state.items[command.itemId] ?? 0) > 0 ? undefined : say(game, 'haveNone', { item: item.name })
    },
    run: (state, command, game, cx) => {
      const item = itemById(game, command.itemId)!
      return cx.runEffects(state, game, [{ kind: 'item', id: command.itemId, by: -1 }, ...item.use!.effects], false)
    },
    effectsOf: (_state, command, game) => {
      const item = itemById(game, command.itemId)
      return item?.use ? [{ kind: 'item', id: command.itemId, by: -1 }, ...item.use.effects] : []
    },
    references: (command) => [{ item: command.itemId }],
  },
  dismiss: {
    whyNot: () => undefined,
    run: (state, command) => dismiss(state, command.id),
    references: none,
  },
  input: {
    whyNot: (state, command, game) => inputRefusal(state, game, command.id, command.value),
    run: (state, command, game) => {
      const input = inputById(game, command.id)!
      const key = input.variable ?? input.id
      return { ...state, flags: { ...state.flags, [key]: inputValue(input, command.value!) } }
    },
    references: (command) => [{ input: command.id }],
  },
  custom: {
    whyNot: (state, command, game) => {
      const fn = pluginCommand(game, command.name)
      if (!fn) return say(game, 'noSuchAction')
      return fn.whyNot(state, command.with ?? {})
    },
    run: (state, command, game) => pluginCommand(game, command.name)!.run(state, command.with ?? {}),
    effectsOf: (state, command, game) => pluginCommand(game, command.name)?.effectsOf(state, command.with ?? {}) ?? [],
    // A plugin command that says it ignores locks: a debugger's.
    ignoresLocks: (command, game) => Boolean(pluginCommand(game, command.name)?.ignoresLocks),
    references: (command) => [{ call: 'commands', name: command.name, with: command.with }],
  },
}

/**
 * Every kind of condition, effect and command, by its key: the core's and the
 * features'. Typed complete, so a kind with no entry fails to compile here.
 */
export const KINDS = withCore<CoreConditions, CoreEffects, CoreCommands>({ conditions, effects, commands })

// No kind is both the core's and a feature's. Each line is `true` only while that is so.
export const coreAndFeaturesApart: [Extract<keyof CoreConditions, keyof FeatureConditions> | Extract<keyof CoreEffects, keyof FeatureEffects> | Extract<keyof CoreCommands, keyof FeatureCommands>] extends [never] ? true : false = true

/** Every kind of condition, by the key that tells it apart. */
export const CONDITION_KINDS = Object.keys(KINDS.conditions) as ConditionKind[]
/** Every kind of effect. */
export const EFFECT_KINDS = Object.keys(KINDS.effects) as Effect['kind'][]
/** Every type of command. */
export const COMMAND_KINDS = Object.keys(KINDS.commands) as CoreCommandType[]
type CoreCommandType = keyof CoreCommands | keyof FeatureCommands

/**
 * The kind keys a condition has: one for a well-formed one, none or several
 * for one the checker reports. A plugin's short call (`{ 'quests/done': … }`)
 * and `{ custom }` are `custom`.
 */
export function conditionKinds(condition: Condition): ConditionKind[] {
  const kinds = Object.keys(condition).filter((key): key is ConditionKind => Object.hasOwn(KINDS.conditions, key))
  return !kinds.length && customCall(condition) ? ['custom'] : kinds
}

/** The entry for a condition's one kind, or undefined for a condition with none or several. */
export function conditionEntry(condition: Condition): ConditionEntry<Condition> | undefined {
  const kinds = conditionKinds(condition)
  return kinds.length === 1 ? (KINDS.conditions[kinds[0]] as ConditionEntry<Condition>) : undefined
}

/** The entry for an effect's kind, or undefined for a kind the engine doesn't have. */
export function effectEntry(effect: Effect): EffectEntry<Effect> | undefined {
  return Object.hasOwn(KINDS.effects, effect.kind) ? (KINDS.effects[effect.kind] as EffectEntry<Effect>) : undefined
}

/** The entry for a command's type, or undefined for a type the engine doesn't have. */
export function commandEntry(command: { type: string }): CommandEntry<Command> | undefined {
  return Object.hasOwn(KINDS.commands, command.type) ? (KINDS.commands[command.type as CoreCommandType] as CommandEntry<Command>) : undefined
}
