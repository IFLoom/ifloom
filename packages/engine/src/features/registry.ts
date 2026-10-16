/**
 * The core features, merged. Imports the features and nothing else, so it
 * can be built when it loads whatever imports it first: every feature is a
 * leaf. It checks each feature's `requires`, and merges what they declare
 * into the tables and lists the core reads.
 *
 * The core's own kinds that no feature owns yet are a provisional feature of
 * their own in `core.ts`, which hands them to `withCore` for the complete
 * tables. Moving a kind into a feature moves its entry out of that table.
 */
import { audio, type AudioShape } from './audio.ts'
import type { ConditionEntry, CommandEntry, EffectEntry, Feature, FeatureShape, FieldsOf, RunnerHooks } from './feature.ts'
import { media, type MediaShape } from './media.ts'
import { scenes, type ScenesShape } from './scenes.ts'
import { settings, type SettingsShape } from './settings.ts'
import { stats, type StatsShape } from './stats.ts'

/** Every core feature's shape. A new feature's goes here, and its value in `FEATURES`. */
type Shapes = SettingsShape | StatsShape | ScenesShape | AudioShape | MediaShape

/**
 * The core features, in the order their after-command steps, views, checks
 * and runner hooks run.
 */
export const FEATURES = [settings, stats, scenes, audio, media] as const

type UnionToIntersection<U> = (U extends unknown ? (piece: U) => void : never) extends (piece: infer I) => void ? I : never
type PartOf<T, K extends keyof FeatureShape> = T extends unknown ? (K extends keyof T ? (T[K] extends object ? T[K] : {}) : {}) : never
type Merged<K extends keyof FeatureShape> = UnionToIntersection<PartOf<Shapes, K>>

/** The features' fields of `GameState`. */
export type FeatureState = Merged<'state'>
/** The features' conditions, by kind key. */
export type FeatureConditions = Merged<'conditions'>
/** The features' effects, by kind. */
export type FeatureEffects = Merged<'effects'>
/** The features' commands, by type. */
export type FeatureCommands = Merged<'commands'>
/** The features' fields of `Game`. */
export type FeatureGame = Merged<'game'>
/** The features' fields of `Pack`. */
export type FeaturePack = Merged<'pack'>
/** The features' fields of `View`. */
export type FeatureView = Merged<'view'>
/** The lists the features' problems name. */
export type FeatureList = Shapes extends infer T ? (T extends { lists: infer L } ? L : never) : never

/** The name of a core feature. */
export type FeatureName = (typeof FEATURES)[number]['name']

type AnyFeature = Feature<FeatureShape>
const all = FEATURES as readonly unknown[] as readonly AnyFeature[]

/** Each feature's `requires` names a feature that comes before it. Throws when one doesn't, as the registry loads. */
export function checkRequires(features: readonly { name: string; requires: readonly string[] }[]): void {
  const seen = new Set<string>()
  for (const feature of features) {
    for (const needed of feature.requires) {
      if (!features.some((entry) => entry.name === needed)) throw new Error(`Feature "${feature.name}" requires "${needed}", which is not registered.`)
      if (!seen.has(needed)) throw new Error(`Feature "${feature.name}" requires "${needed}", which must be registered before it.`)
    }
    if (seen.has(feature.name)) throw new Error(`Two features are named "${feature.name}".`)
    seen.add(feature.name)
  }
}

checkRequires(all)

/** One table merged from every feature's, refusing a kind two features both declare. */
function merged<T>(part: (feature: AnyFeature) => Record<string, T>, noun: string): Record<string, T> {
  const out: Record<string, T> = {}
  const owner: Record<string, string> = {}
  for (const feature of all) {
    for (const [key, entry] of Object.entries(part(feature))) {
      if (Object.hasOwn(out, key)) throw new Error(`The ${noun} "${key}" is declared by both "${owner[key]}" and "${feature.name}".`)
      out[key] = entry
      owner[key] = feature.name
    }
  }
  return out
}

/** The features' conditions, by kind key. */
export const featureConditions = merged((feature) => feature.conditions as Record<string, unknown>, 'condition') as unknown as {
  [K in keyof FeatureConditions]: ConditionEntry<FeatureConditions[K]>
}
/** The features' effects, by kind. */
export const featureEffects = merged((feature) => feature.effects as Record<string, unknown>, 'effect') as unknown as {
  [K in keyof FeatureEffects]: EffectEntry<FeatureEffects[K]>
}
/** The features' commands, by type. */
export const featureCommands = merged((feature) => feature.commands as Record<string, unknown>, 'command') as unknown as {
  [K in keyof FeatureCommands]: CommandEntry<FeatureCommands[K]>
}
/** The features' state fields, each with its start and load defaults. */
export const featureFields = merged((feature) => feature.state as Record<string, unknown>, 'state field') as unknown as FieldsOf<FeatureState>

/** Which feature answers for each list its problems name, for `loadGame` to find the pack an entry came from. */
export const listOwners = merged((feature) => Object.fromEntries(feature.lists.map((list) => [list, feature])), 'list') as Record<
  FeatureList,
  AnyFeature
>

/** The kinds each feature declares, by feature: the runtime list the kinds contract holds the tables to. */
export const featureKinds: Record<string, { conditions: string[]; effects: string[]; commands: string[] }> = Object.fromEntries(
  all.map((feature) => [
    feature.name,
    { conditions: Object.keys(feature.conditions), effects: Object.keys(feature.effects), commands: Object.keys(feature.commands) },
  ]),
)

/** The features that do something after a command, in their declared order, by where they run. */
export const afterSteps = {
  triggers: all.flatMap((feature) => (feature.afterCommand?.at === 'triggers' ? [feature.afterCommand.run] : [])),
  hooks: all.flatMap((feature) => (feature.afterCommand?.at === 'hooks' ? [feature.afterCommand.run] : [])),
}

/** The features that record something from a screen, in order. */
export const screenSteps = all.flatMap((feature) => (feature.fromScreen ? [feature.fromScreen] : []))

/** The features that finish a new game's state, in order. */
export const startSteps = all.flatMap((feature) => (feature.started ? [feature.started] : []))

/** The features' checks, in order. */
export const featureChecks = all.flatMap((feature) => (feature.check ? [feature.check] : []))

/** The features' pieces of the view, in order. */
export const viewPieces = all.flatMap((feature) => (feature.view ? [feature.view] : [])) as readonly NonNullable<AnyFeature['view']>[]

/** The features' runner hooks, in order. */
export const runnerHooks: readonly RunnerHooks[] = all.flatMap((feature) => (feature.runner ? [feature.runner] : []))

/** The features with a pack key, in order. */
export const packFeatures = all.filter((feature) => feature.pack)

/**
 * The complete tables: the core's provisional entries for the kinds no
 * feature owns yet, and every feature's. The types make it complete: a kind
 * in neither fails to compile where `core.ts` calls this.
 */
export function withCore<C extends object, E extends object, K extends object>(core: {
  conditions: { [P in keyof C]: ConditionEntry<C[P]> }
  effects: { [P in keyof E]: EffectEntry<E[P]> }
  commands: { [P in keyof K]: CommandEntry<K[P]> }
}): {
  conditions: { [P in keyof C]: ConditionEntry<C[P]> } & typeof featureConditions
  effects: { [P in keyof E]: EffectEntry<E[P]> } & typeof featureEffects
  commands: { [P in keyof K]: CommandEntry<K[P]> } & typeof featureCommands
} {
  const join = <T extends object, U extends object>(mine: T, theirs: U, noun: string): T & U => {
    for (const key of Object.keys(mine)) {
      if (Object.hasOwn(theirs, key)) throw new Error(`The ${noun} "${key}" is declared by the core and by a feature.`)
    }
    return { ...mine, ...theirs }
  }
  return {
    conditions: join(core.conditions, featureConditions, 'condition'),
    effects: join(core.effects, featureEffects, 'effect'),
    commands: join(core.commands, featureCommands, 'command'),
  }
}
