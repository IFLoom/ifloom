/**
 * The core's own kinds, and the complete tables built from them and the
 * features' (`features/registry.ts`). The core keeps only what is no
 * feature's: the `all`, `any` and `not` conditions, which hold or fail by
 * their parts, and the custom calls that are the plugins' seam (a custom
 * condition, effect and command), plus the `start` command. Every other kind
 * is a feature's. The shared code (`holds`, `explain`, `applyEffect`, `run`,
 * `whyNotIn`, `effectsIn`, the reference resolver) looks a kind up in `KINDS`
 * and names no feature.
 *
 * Also the `FeatureContext` the core lends features: its helpers, built the
 * first time one is asked for, so nothing runs while the modules load.
 */
import { say } from './strings.ts'
import { holds } from './condition.ts'
import { buildEffects, customCall, customCondition, customValue } from './custom.ts'
import { sceneById } from './game.ts'
import { sceneContext } from './context.ts'
import { pluginAudio, pluginCommand, pluginEffect, pluginStatModifiers, runHooks } from './plugin.ts'
import { runEffects } from './reduce.ts'
import { effectsOf } from './availability.ts'
import { roll, weighted } from './random.ts'
import type { Reference } from './references.ts'
import { type CommandContext, type EffectContext, type FeatureContext, type Rendering } from './features/feature.ts'
import { withCore, type FeatureCommands, type FeatureConditions, type FeatureEffects } from './features/registry.ts'
import type {
  Command,
  Condition,
  ConditionKind,
  CoreCommands,
  CoreConditions,
  CoreEffects,
  Effect,
} from './types.ts'
import type { CommandEntry, ConditionEntry, EffectEntry } from './features/feature.ts'

let context: FeatureContext | undefined

/** The core's helpers, as features are lent them. */
export function featureContext(): FeatureContext {
  return (context ??= {
    holds,
    runEffects,
    turnHooks: (state, game) => runHooks(game, 'turn', state, true),
    buildEffects: (state, game, refs) => buildEffects(state, game, refs),
    effectsOf: (state, game, command) => effectsOf(state, game, command),
    weighted,
    roll,
    customValue,
    pluginAudio,
    statModifiers: (state, game) => pluginStatModifiers(game, state),
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
}

/** The core's commands. `start` is handled by `apply` before any of these are asked. */
const commands: { [K in keyof CoreCommands]: CommandEntry<CoreCommands[K]> } = {
  start: {
    whyNot: (_state, _command, game) => say(game, 'notSupported'),
    run: (state) => state,
    references: none,
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
