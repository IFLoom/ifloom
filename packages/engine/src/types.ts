import type { PluginCall } from './calls.ts'
import type { PluginSlice } from './plugin.ts'
import type { FeatureCommands, FeatureConditions, FeatureEffects, FeatureState } from './features/registry.ts'

/**
 * The save format's version. Only a change to the shape of something saves
 * already have bumps it, with a step in `STEPS` (intake.ts) that reshapes it.
 * An added field doesn't: it declares a load default in `FIELDS` or in its
 * feature's `state`, and older saves get that default when they load.
 */
export const SAVE_VERSION = 13 as const

/** A value in the kv store: true/false, a number or text. */
export type KvValue = boolean | number | string

/**
 * Which stretch of the game the player is in, named by the game: an intro, a
 * first day, the open week. The engine gives the names no meaning; locks and
 * conditions that test `{ phase }` do.
 */
export type Phase = string

/** A stat's id. The game declares its stats; see `StatDef`. */
export type StatKey = string
/** Every declared stat's current value, by id. */
export type Stats = Record<StatKey, number>

export type StorylineState = {
  /** The turn it opens again, or null while it is open. */
  closedUntil: number | null
  kv: Record<string, KvValue>
}

/** One object type from an intersection of pieces, so it reads as one in an editor. */
export type Flat<T> = { [K in keyof T]: T[K] }

/** The fields of the save the core keeps itself. The features' are in `features/`. */
type CoreState = {
  version: typeof SAVE_VERSION
  /** Fixed per save. Keeps variant variants from dealing identically every run. */
  seed: number
  /** Each plugin's own state, by plugin id. */
  plugins: Record<string, PluginSlice>
  /**
   * The game's own version (`game.version`) the save was made with. Only
   * there when the game declares a version; a save without it is version 1.
   */
  gameVersion?: number
}

/**
 * The whole save: the core's fields and each feature's. Each field's new-game
 * value and load default are declared once, in `FIELDS` (intake.ts) or the
 * feature's `state`.
 */
export type GameState = Flat<CoreState & FeatureState>

export type StartOptions = {
  /** Fixes the save's random draws. Left out, it is hashed from the game's id, so tests deal the same cards. */
  seed?: number
  /** Keys to write to the kv store before the first scene: a name from a title screen, a difficulty. */
  kv?: Record<string, KvValue>
  /**
   * The player's stored values for the game's `play` settings, usually the
   * profile's `core:settings`. A setting given no value, or one it doesn't take,
   * starts at its default; ids the game doesn't declare are ignored.
   */
  settings?: Record<string, unknown>
  /**
   * The state a finished game ended on, for a New Game+: the stats, kv keys
   * and items the game's `carryOver` lists are copied from it.
   */
  carry?: GameState
}

/**
 * When a thing applies: a block of prose, a choice, a line in a variants.
 *
 * Plain nested data, so content stays serialisable and the loader can check it
 * — `{ storyline: 'baker' }` is verifiable against the declared storylines in a way
 * that an arbitrary function never was. Anything genuinely derived escapes
 * through `{ custom: name }`, a custom condition the game declares.
 */
export type Range = { gte?: number; gt?: number; lte?: number; lt?: number }

/** The conditions the core keeps itself, by the key that tells each apart. The features' are in `features/`. */
export type CoreConditions = {
  all: { all: Condition[] }
  any: { any: Condition[] }
  not: { not: Condition }
  /** A custom condition the game declares by this name, or a plugin's (`quests/done`), with what it is asked. */
  custom: { custom: string; with?: Record<string, unknown> }
}

/** Every kind of condition, by the key that tells it apart: the core's and the features'. */
export type ConditionMap = CoreConditions & FeatureConditions

/** The keys that tell one kind of condition from another. A plugin's short call (`{ 'quests/done': … }`) is read as `custom`. */
export type ConditionKind = keyof ConditionMap

/** The condition a key stands for. */
export type ConditionOf<K extends ConditionKind> = ConditionMap[K]

/**
 * A condition: one of the kinds in `ConditionMap`, told apart by its one kind
 * key, or a plugin's condition in short: `{ 'quests/done': { quest: 'bakery' } }`. See `PluginCall`.
 */
export type Condition = ConditionMap[ConditionKind] | PluginCall

/** The effects the core keeps itself, by kind. The features' are in `features/`. */
export type CoreEffects = {
  /**
   * A custom effect by name: the game's own, or a plugin's by its full name.
   * Content writes `{ custom: name, with }` or the short form; the engine
   * turns either into this. It runs in its turn, on the state the effects
   * before it left.
   */
  custom: { kind: 'custom'; name: string; with?: Record<string, unknown> }
}

/** Every kind of effect: the core's and the features'. */
export type EffectMap = CoreEffects & FeatureEffects

/** An effect: one of the kinds in `EffectMap`. */
export type Effect = EffectMap[keyof EffectMap]

/** The commands the core keeps itself, by type. The features' are in `features/`. */
export type CoreCommands = {
  /**
   * A new game. `seed` fixes its random draws (a UI passes a fresh one; left
   * out, it comes from the game's id). `kv` is written to the kv store before the first
   * scene: a name asked for on a title screen, a difficulty.
   */
  start: { type: 'start'; seed?: number; kv?: Record<string, KvValue> }
  /** A plugin's command, by its full name: `{ type: 'custom', name: 'quests/track', with: { id: 'bakery' } }`. */
  custom: { type: 'custom'; name: string; with?: Record<string, unknown> }
}

/** Every type of command: the core's and the features'. */
export type CommandMap = CoreCommands & FeatureCommands

/** A command: one of the types in `CommandMap`. */
export type Command = CommandMap[keyof CommandMap]

// Each map's keys are the kinds they hold: `stat` holds `{ kind: 'stat' }`. Each line is `true` only while that is so.
type KeysMatch<M, F extends string> = { [K in keyof M]: M[K] extends Record<F, K> ? true : false }[keyof M]
export const effectKeysMatch: [false] extends [KeysMatch<EffectMap, 'kind'>] ? false : true = true
export const commandKeysMatch: [false] extends [KeysMatch<CommandMap, 'type'>] ? false : true = true
