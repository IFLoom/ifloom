/**
 * The core's own kinds, and the complete tables built from them and the
 * features' (`features/registry.ts`). The core keeps only what is no
 * feature's: the `all`, `any` and `not` conditions, which hold or fail by
 * their parts, and the custom calls that are the plugins' seam (a custom
 * condition, effect and command), plus the `start` command. Every other kind
 * is a feature's. The shared code (`holds`, `explain`, `applyEffect`, `run`,
 * `whyNotIn`, `effectsIn`, the reference resolver) looks a kind up in `TABLES`
 * and names no feature.
 *
 * Also the `FeatureContext` the core lends features: its helpers, built the
 * first time one is asked for, so nothing runs while the modules load.
 */
import { stringOf } from './strings.ts'
import { holds } from './condition.ts'
import { buildEffects, customCall, customCondition, customContext, customEffect, customValue } from './custom.ts'
import { bakedScene } from './game.ts'
import { actionOf } from './action.ts'
import { sceneContext } from './context.ts'
import { fillTokens } from './prose.ts'
import { amountOf } from './amount.ts'
import {
  missingCall,
  pluginAudio,
  pluginCommand,
  pluginEffect,
  pluginStatModifiers,
  rulesContext,
  runStatHooks,
  runTurnDoneHooks,
  runTurnHooks,
} from './plugin.ts'
import { runEffects, runIn } from './reduce.ts'
import { effectsIn, effectsOf, whyNotIn } from './availability.ts'
import { draw, weighted } from './random.ts'
import type { Reference } from './references.ts'
import { type CommandContext, type EffectContext, type FeatureContext, type Rendering } from './features/feature.ts'
import { withCore, type FeatureCommands, type FeatureConditions, type FeatureEffects } from './features/registry.ts'
import type { Command, Condition, ConditionKey, CoreCommands, CoreConditions, CoreEffects, Effect, EffectKey } from './types.ts'
import type { CommandEntry, ConditionEntry, EffectEntry } from './features/feature.ts'

let context: FeatureContext | undefined

/** The core's helpers, as features are lent them. */
export function featureContext(): FeatureContext {
  return (context ??= {
    holds,
    runEffects,
    turnHooks: (state, game) => runTurnHooks(game, state),
    turnDoneHooks: (state, game) => runTurnDoneHooks(game, state),
    statHooks: (before, after, stat, by, game) => {
      const ruled = game.rules?.onStat ? game.rules.onStat(before, after, stat, by, rulesContext(after, game)) : after
      return runStatHooks(game, before, ruled, stat, by)
    },
    turnContext: (state, game, before) => ({
      ...customContext(state, game),
      before,
      apply: (effects, on = state) => runEffects(on, game, buildEffects(game, effects), true),
    }),
    buildEffects: (game, refs) => buildEffects(game, refs),
    effectsOf: (state, game, command) => effectsOf(state, game, command),
    weighted,
    draw,
    customValue,
    amount: (state, game, amount) => amountOf(state, game, amount),
    fillTokens,
    pluginAudio,
    statModifiers: (state, game) => pluginStatModifiers(game, state),
    bakedScene,
    actionOf: (state, game, id) => actionOf(state, game, id),
    sceneView: (state, game) => (state.sceneId ? bakedScene(game, state.sceneId)?.render(state, sceneContext(state, game)) : undefined),
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
  return {
    ...featureContext(),
    rendered,
    whyNotCommand: (state, game, command) => whyNotIn(rendered, state, game, command),
    effectsOfCommand: (state, game, command) => effectsIn(rendered, state, game, command),
    runCommand: (state, game, command) => runIn(rendered, state, game, command),
  }
}

const none = (): Reference[] => []

/** The core's conditions. `all`, `any` and `not` are asked part by part in `holds` and `explain` too. */
const conditions: { [K in keyof CoreConditions]: ConditionEntry<CoreConditions[K]> } = {
  all: {
    holds: (state, condition, game, cx) => condition.all.every((entry) => cx.holds(state, game, entry)),
    explain: (_state, condition) => `all of ${condition.all.length}`,
    references: (condition) => condition.all.map((when) => ({ when })),
  },
  any: {
    holds: (state, condition, game, cx) => condition.any.some((entry) => cx.holds(state, game, entry)),
    explain: (_state, condition) => `any of ${condition.any.length}`,
    references: (condition) => condition.any.map((when) => ({ when })),
  },
  not: {
    holds: (state, condition, game, cx) => !cx.holds(state, game, condition.not),
    explain: () => 'not',
    references: (condition) => [{ when: condition.not }],
  },
}

/**
 * A call in short, a plugin's or the game's own: `{ 'quests/done': { quest: 'bakery' } }`,
 * `{ 'game/tired': true }`. It has no kind key; its one key is the name.
 */
const callCondition: ConditionEntry<Condition> = {
  // An undeclared one is a content fault the checker reports; here it simply
  // does not apply, so a broken mod hides content rather than crashing.
  holds: (state, condition, game) => {
    const call = customCall(condition)
    const fn = call && customCondition(game, call.custom)
    return fn ? fn(state, call.with ?? {}) : false
  },
  explain: (_state, condition, game) => {
    const call = customCall(condition)
    if (!call) return 'a call with no name'
    return customCondition(game, call.custom) ? `condition ${call.custom}` : missingCall(game, 'condition', call.custom)
  },
  references: (condition) => {
    const call = customCall(condition)
    return call ? [{ call: 'conditions', name: call.custom, with: call.with }] : []
  },
}

/** How deep the game's own effects are running inside each other: ten deep is a loop, not a design. */
let customDepth = 0

/** The core's effects: none. A call by name is `callEffect`. */
const effects: { [K in keyof CoreEffects]: EffectEntry<CoreEffects[K]> } = {}

/**
 * An effect in short: a plugin's, or the game's own worked out now, on the
 * state the effects before it left. It has no key of the engine's; its one
 * key is the name.
 */
const callEffect: EffectEntry<Effect> = {
  apply: (state, effect, game, cx) => {
    const call = customCall(effect)
    if (!call) return state
    const fromPlugin = pluginEffect(game, call.custom, cx.ending)
    if (fromPlugin) return fromPlugin(state, call.with ?? {})
    // A plugin the game no longer has does nothing, as an unknown effect of the game's does.
    const fn = customEffect(game, call.custom)
    if (!fn || customDepth >= 10) return state
    customDepth += 1
    try {
      return cx.runEffects(state, game, buildEffects(game, fn(state, call.with ?? {})), cx.ending)
    } finally {
      customDepth -= 1
    }
  },
  references: (effect) => {
    const call = customCall(effect)
    return call ? [{ call: 'effects', name: call.custom, with: call.with }] : []
  },
}

/**
 * Thrown by `newGame`'s run, from wherever it runs (on its own, or sent by a
 * choice), and caught by `apply`, which makes the new game. Internal.
 */
export class StartOver extends Error {
  constructor() {
    super('newGame')
    this.name = 'StartOver'
  }
}

/** The core's commands. `start` is handled by `apply` before any of these are asked. */
const commands: { [K in keyof CoreCommands]: CommandEntry<CoreCommands[K]> } = {
  start: {
    whyNot: (_state, _command, game) => stringOf(game, 'notSupported'),
    run: (state) => state,
    references: none,
  },
  newGame: {
    // Always offered: the game decides where, by the choices and buttons that send it.
    whyNot: () => undefined,
    // The run in play ends here, so nothing after it in a choice runs; `apply` starts the next.
    run: () => {
      throw new StartOver()
    },
    // No lock keeps a player in a run that's over.
    ignoresLocks: () => true,
    references: none,
  },
  custom: {
    whyNot: (state, command, game) => {
      const fn = pluginCommand(game, command.name)
      if (!fn) return stringOf(game, 'noSuchAction')
      return fn.whyNot(state, command.with ?? {})
    },
    run: (state, command, game) => pluginCommand(game, command.name)!.run(state, command.with ?? {}),
    effectsOf: (state, command, game) => pluginCommand(game, command.name)?.effectsOf(state, command.with ?? {}) ?? [],
    // What a plugin's command says it spends, for its button's price: a shop's price, say.
    spends: (command, game, state) => pluginCommand(game, command.name)?.spends(state, command.with ?? {}),
    // A plugin command that says it ignores locks: a debugger's.
    ignoresLocks: (command, game) => Boolean(pluginCommand(game, command.name)?.ignoresLocks),
    references: (command) => [{ call: 'commands', name: command.name, with: command.with }],
  },
}

/**
 * Every kind of condition, effect and command, by its key: the core's and the
 * features'. Typed complete, so a kind with no entry fails to compile here.
 */
export const TABLES = withCore<CoreConditions, CoreEffects, CoreCommands>({ conditions, effects, commands })

// No kind is both the core's and a feature's. Each line is `true` only while that is so.
// Each Extract is `never` while that holds, which is the point; the type-aware lint reads it as a redundant union.
/* oxlint-disable typescript/no-redundant-type-constituents, typescript/no-duplicate-type-constituents */
export const coreAndFeaturesApart: [
  | Extract<keyof CoreConditions, keyof FeatureConditions>
  | Extract<keyof CoreEffects, keyof FeatureEffects>
  | Extract<keyof CoreCommands, keyof FeatureCommands>,
] extends [never]
  ? true
  : false = true
/* oxlint-enable typescript/no-redundant-type-constituents, typescript/no-duplicate-type-constituents */

/** Every kind of condition, by the key that tells it apart. */
export const CONDITION_KEYS = Object.keys(TABLES.conditions) as ConditionKey[]
/** Every key that tells an effect apart. */
export const EFFECT_KEYS = Object.keys(TABLES.effects) as EffectKey[]
/** Every type of command. */
export const COMMAND_TYPES = Object.keys(TABLES.commands) as CoreCommandType[]
type CoreCommandType = keyof CoreCommands | keyof FeatureCommands

/**
 * The kind keys a condition has: one for a well-formed one, none or several
 * for one the checker reports. A call in short (`{ 'quests/done': … }`) has none.
 */
export function conditionKeys(condition: Condition): ConditionKey[] {
  return Object.keys(condition).filter((key): key is ConditionKey => Object.hasOwn(TABLES.conditions, key))
}

/** The entry for a condition's one kind, or a call's, or undefined for a condition with neither or several kinds. */
export function conditionEntry(condition: Condition): ConditionEntry<Condition> | undefined {
  const kinds = conditionKeys(condition)
  if (kinds.length === 1) return TABLES.conditions[kinds[0]] as ConditionEntry<Condition>
  return !kinds.length && customCall(condition) ? callCondition : undefined
}

/** The keys an effect has that tell effects apart: one for a well-formed one, none for a call in short, several for one the checker reports. */
export function effectKeys(effect: object): EffectKey[] {
  return Object.keys(effect).filter((key): key is EffectKey => Object.hasOwn(TABLES.effects, key))
}

/** The entry for an effect's one key, or a call's, or undefined for an effect with neither or several keys. */
export function effectEntry(effect: Effect): EffectEntry<Effect> | undefined {
  const keys = effectKeys(effect)
  if (keys.length === 1) return TABLES.effects[keys[0]] as EffectEntry<Effect>
  return !keys.length && customCall(effect) ? callEffect : undefined
}

/** The entry for a command's type, or undefined for a type the engine doesn't have. */
export function commandEntry(command: { type: string }): CommandEntry<Command> | undefined {
  return Object.hasOwn(TABLES.commands, command.type) ? (TABLES.commands[command.type as CoreCommandType] as CommandEntry<Command>) : undefined
}
