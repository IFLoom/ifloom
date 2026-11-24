/**
 * The core features, merged. Imports the features and nothing else, so it
 * can be built when it loads whatever imports it first: every feature is a
 * leaf. It checks each feature's `requires`, and merges what they declare
 * into the tables and lists the core reads.
 *
 * The core's own kinds (`all`, `any`, `not`, the custom calls and `start`)
 * are in `core.ts`, which hands them to `withCore` for the complete tables.
 */
import type { CarryOver, Game } from '../game.ts'
import type { GameState } from '../types.ts'
import { actions, type ActionsShape } from './actions.ts'
import { audio, type AudioShape } from './audio.ts'
import { entities, type EntitiesShape } from './entities.ts'
import { holdings, type HoldingsShape } from './holdings.ts'
import { inputs, type InputsShape } from './inputs.ts'
import { locks, type LocksShape } from './locks.ts'
import type { ConditionEntry, CommandEntry, ContentKey, EffectEntry, Feature, FeatureShape, FieldsOf, RunnerHooks } from './feature.ts'
import { media, type MediaShape } from './media.ts'
import { minigames, type MinigamesShape } from './minigames.ts'
import { flowsFeature, type FlowsShape } from './flows.ts'
import { notices, type NoticesShape } from './notices.ts'
import { panels, type PanelsShape } from './panels.ts'
import { saving, type SavingShape } from './saving.ts'
import { scenes, type ScenesShape } from './scenes.ts'
import { settings, type SettingsShape } from './settings.ts'
import { stats, type StatsShape } from './stats.ts'
import { storylines, type StorylinesShape } from './storylines.ts'
import { triggers, type TriggersShape } from './triggers.ts'
import { timers, type TimersShape } from './timers.ts'
import { turns, type TurnsShape } from './turns.ts'
import { ui, type UiShape } from './ui.ts'
import { kv, type KvShape } from './kv.ts'
import { rolls, type RollsShape } from './rolls.ts'
import { phrases, type PhrasesShape } from './phrases.ts'
import { changes, type ChangesShape } from './changes.ts'
import { ending, type EndingShape } from './ending.ts'

/** Every core feature's shape. A new feature's goes here, and its value in `FEATURES`. */
type Shapes =
  | EntitiesShape
  | HoldingsShape
  | TurnsShape
  | KvShape
  | StorylinesShape
  | NoticesShape
  | ActionsShape
  | TriggersShape
  | InputsShape
  | SettingsShape
  | StatsShape
  | ScenesShape
  | MinigamesShape
  | FlowsShape
  | TimersShape
  | AudioShape
  | MediaShape
  | UiShape
  | PanelsShape
  | SavingShape
  | LocksShape
  | RollsShape
  | PhrasesShape
  | ChangesShape
  | EndingShape

/**
 * The core features, in the order their after-command steps, views, checks, fills and runner hooks run. The order
 * changes behaviour, so a new feature's place in it matters.
 *
 * @remarks
 * - Triggers come before scenes and audio, so a scene a trigger opens counts as seen in the same command.
 * - Minigames come straight after scenes, so a scene with a minigame starts it in the command that opens it.
 * - Timers come after minigames, whose clock their `tick` runs.
 * - Flows come after timers, so a scene's own minigame starts before its flow's, and a flow sees a minigame it waits
 *   on end in the same command.
 * - Settings come before audio, which requires them.
 * - Stats come before entities, so a loaded save's entities are filled after their stats.
 * - Panels run after the plugins' hooks, so a turn or scene a hook moves on closes the panel the command found open.
 * - Holdings, saving, ui and phrases can go anywhere, since they only apply, render, merge or check. Holdings sits
 *   beside entities, whose kinds it reads.
 * - Rolls run after the plugins' hooks, so the rolls a command keeps for the view include any a hook or a trigger made.
 * - Changes run after every other step, so the stats it compares are those the command left once everything had run.
 * - The ending goes last, so `finished` is checked after the rest.
 */
export const FEATURES = [
  turns,
  kv,
  storylines,
  notices,
  triggers,
  scenes,
  minigames,
  timers,
  flowsFeature,
  actions,
  inputs,
  settings,
  stats,
  audio,
  media,
  ui,
  panels,
  entities,
  holdings,
  locks,
  saving,
  rolls,
  phrases,
  changes,
  ending,
] as const

type UnionToIntersection<U> = (U extends unknown ? (piece: U) => void : never) extends (piece: infer I) => void ? I : never
type PartOf<T, K extends keyof FeatureShape> = T extends unknown ? (K extends keyof T ? (T[K] extends object ? T[K] : {}) : {}) : never
type Merged<K extends keyof FeatureShape> = UnionToIntersection<PartOf<Shapes, K>>

/** The core features' fields of `GameState`. */
export type FeatureState = Merged<'state'>
/** The core features' conditions, by key. */
export type FeatureConditions = Merged<'conditions'>
/** The core features' effects, by key. */
export type FeatureEffects = Merged<'effects'>
/** The core features' commands, by type. */
export type FeatureCommands = Merged<'commands'>
/** The core features' fields of `Game`. */
export type FeatureGame = Merged<'game'>
/** The core features' fields of `Pack`. */
export type FeaturePack = Merged<'pack'>
/** The core features' fields of `View`. */
export type FeatureView = Merged<'view'>
/** The core features' kinds of `Reference`, by the key that tells each apart. */
export type FeatureReferences = Merged<'references'>
/** The core features' pack keys that only a pack holds, never the game's content. */
export type FeaturePackOnly = Shapes extends infer T ? (T extends { packOnly: infer L } ? L : never) : never
/** The lists the core features' problems name. */
export type FeatureList = Shapes extends infer T ? (T extends { lists: infer L } ? L : never) : never

/** The name of a core feature. */
export type FeatureName = (typeof FEATURES)[number]['name']

type AnyFeature = Feature<FeatureShape>
const all = FEATURES as readonly unknown[] as readonly AnyFeature[]

/** Checks that each feature's `requires` names a feature registered before it. It throws when one doesn't, as the registry loads. */
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

/** The core features' condition entries, by key. Two features can't declare the same key. */
export const featureConditions = merged((feature) => feature.conditions as Record<string, unknown>, 'condition') as unknown as {
  [K in keyof FeatureConditions]: ConditionEntry<FeatureConditions[K]>
}
/** The core features' effect entries, by key. Two features can't declare the same key. */
export const featureEffects = merged((feature) => feature.effects as Record<string, unknown>, 'effect') as unknown as {
  [K in keyof FeatureEffects]: EffectEntry<FeatureEffects[K]>
}
/** The core features' command entries, by type. Two features can't declare the same type. */
export const featureCommands = merged((feature) => feature.commands as Record<string, unknown>, 'command') as unknown as {
  [K in keyof FeatureCommands]: CommandEntry<FeatureCommands[K]>
}
/** The core features' state fields, each with its start and load defaults. */
export const featureFields = merged((feature) => feature.state as Record<string, unknown>, 'state field') as unknown as FieldsOf<FeatureState>

/** The feature that answers for each list its problems name, so `loadGame` can find the pack an entry came from. */
export const listOwners = merged((feature) => Object.fromEntries(feature.lists.map((list) => [list, feature])), 'list') as Record<FeatureList, AnyFeature>

/** The kinds of condition, effect and command each feature declares, by feature. The kinds contract test holds the tables to it. */
export const featureKinds: Record<string, { conditions: string[]; effects: string[]; commands: string[] }> = Object.fromEntries(
  all.map((feature) => [
    feature.name,
    { conditions: Object.keys(feature.conditions), effects: Object.keys(feature.effects), commands: Object.keys(feature.commands) },
  ]),
)

/** The parts `MigrationTools.fill` can fill, by the features' names for them. */
export type FeatureFill = Shapes extends infer T ? (T extends { fill: infer F } ? F : never) : never

/** The features' after-command steps, in their declared order, by the slot they run in. */
export const afterSteps = {
  beforePlugins: all.flatMap((feature) => (feature.afterCommand?.at === 'beforePlugins' ? [feature.afterCommand.run] : [])),
  afterPlugins: all.flatMap((feature) => (feature.afterCommand?.at === 'afterPlugins' ? [feature.afterCommand.run] : [])),
}
/** The names of the features with after-command steps, in order, by the slot they run in. A contract test holds the order. */
export const afterOrder = {
  beforePlugins: all.flatMap((feature) => (feature.afterCommand?.at === 'beforePlugins' ? [feature.name] : [])),
  afterPlugins: all.flatMap((feature) => (feature.afterCommand?.at === 'afterPlugins' ? [feature.name] : [])),
}

/** The features' New Game+ steps, in order, each carrying its own key of `carryOver`. */
export const carrySteps = all.flatMap((feature) => (feature.carry ? [feature.carry.run] : []))

/** The check for each key of the game's `carryOver`, by the key. */
export const carryChecks = merged((feature) => (feature.carry?.check ? { [feature.carry.key]: feature.carry.check } : {}), 'carryOver key') as Partial<
  Record<keyof CarryOver, NonNullable<NonNullable<AnyFeature['carry']>['check']>>
>

/** The features' fill rules for `MigrationTools.fill`, by part, in the features' order. */
export const fillSteps = all.flatMap((feature) => (feature.fill ? [feature.fill] : [])) as unknown as readonly {
  part: FeatureFill
  unversioned?: boolean
  run: (state: GameState, game: Game) => GameState
}[]

/** The features' load steps, in order, each adding what the game declares and the save lacks on every load. */
export const loadSteps = all.flatMap((feature) => (feature.loaded ? [feature.loaded] : []))

/** The features' refusals, in order. They run before the plugins' guards. */
export const refusals = all.flatMap((feature) => (feature.refuses ? [feature.refuses] : []))

/** The features' resolvers, in order, each with its feature's name. */
export const resolverSteps = all.flatMap((feature) => (feature.resolve ? [{ name: feature.name, resolve: feature.resolve }] : []))

/** The features' markup checks, in order. */
export const markupChecks = all.flatMap((feature) => (feature.markup ? [feature.markup] : []))

/** The features' checks against a probe state, in order. */
export const probeChecks = all.flatMap((feature) => (feature.probe ? [feature.probe] : []))

/** The features' steps that record something from a screen, in order. */
export const screenSteps = all.flatMap((feature) => (feature.fromScreen ? [feature.fromScreen] : []))

/** The features' steps that finish a new game's state, in order. */
export const startSteps = all.flatMap((feature) => (feature.started ? [feature.started] : []))

/** The features' content checks, in order. */
export const featureChecks = all.flatMap((feature) => (feature.check ? [feature.check] : []))

/** The features' pieces of the view, in order. */
export const viewPieces = all.flatMap((feature) => (feature.view ? [feature.view] : [])) as readonly NonNullable<AnyFeature['view']>[]

/** The features' runner hooks, in order. */
export const runnerHooks: readonly RunnerHooks[] = all.flatMap((feature) => (feature.runner ? [feature.runner] : []))

/** The features with a pack key, in order. */
export const packFeatures = all.filter((feature) => feature.pack)

/**
 * The content rules for every feature's pack keys, by key, in the features' order. Each names the entries a piece of
 * content declares under the key and the words in it.
 *
 * Every key of `Pack` a feature brings is here, since `defineFeature` makes each feature give one.
 */
export const contentKeys = merged((feature) => (feature.content ?? {}) as Record<string, unknown>, 'pack key') as unknown as {
  [K in keyof FeaturePack]-?: ContentKey<NonNullable<FeaturePack[K]>>
}

/**
 * Returns the complete tables of conditions, effects and commands, the core's own entries and every feature's. It
 * throws when the core and a feature declare the same key.
 *
 * The types make the tables complete, so a kind in neither fails to compile where `core.ts` calls this.
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
