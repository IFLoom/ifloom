import type { ConditionCall, EffectCall, ValueRef } from './calls.ts'
import type { Select } from './features/entities.ts'
import type { PluginSlice } from './plugin.ts'
import type { FeatureCommands, FeatureConditions, FeatureEffects, FeatureState } from './features/registry.ts'

/**
 * The save format's version. Only a change to the shape of a field saves already have bumps it, with a step in
 * `STEPS` that reshapes older saves.
 *
 * An added field doesn't bump it. The field declares a load default in `FIELDS` or in its feature's `state`, and an
 * older save gets that default when it loads.
 */
export const SAVE_VERSION = 24 as const

/** A value in the kv store, which is true or false, a number or text. */
export type KvValue = boolean | number | string

/** A stat's id. The game declares each stat with a `StatDef`. */
export type StatKey = string
/** The current values of the stats the save keeps, by stat id. */
export type Stats = Record<StatKey, number>

/** The state a save keeps for one storyline. Its definition is read from content. */
export type StorylineState = {
  /** The storyline's turn to open again, or null while it is open. */
  closedUntil: number | null
  /** The storyline's own kv keys, read and written with `of: 'storyline:<id>'`. */
  kv: Record<string, KvValue>
}

/** An intersection of object types flattened into one, so an editor shows it as one type. */
export type Flat<T> = { [K in keyof T]: T[K] }

/** The fields of the save the core keeps itself. The features' are in `features/`. */
type CoreState = {
  /** The save format's version, `SAVE_VERSION`. `loadState` carries an older save forward. */
  version: typeof SAVE_VERSION
  /**
   * The save's random seed, fixed when the game starts. Every seeded draw (variants, pools, rolls, storylets) mixes it
   * in, so two games draw differently.
   */
  seed: number
  /** The plugins' own state, by plugin id. */
  plugins: Record<string, PluginSlice>
  /**
   * The game's own version (`game.version`) the save was made with. It is set only when the game declares a version,
   * and a save without it counts as version 1.
   */
  gameVersion?: number
}

/**
 * The state a save keeps, the core's fields and each feature's. Definitions are read from content, so the save holds
 * only what play changed.
 *
 * Each field declares its new-game value and load default once, in `FIELDS` or in its feature's `state`.
 */
export type GameState = Flat<CoreState & FeatureState>

/** Settings for `startingState`. A new game left without them gets a seed hashed from the game's id. */
export type StartOptions = {
  /** The new game's random seed. Hashed from the game's id if left out, so tests draw the same. */
  seed?: number
  /** The kv keys written before the first scene, such as a name from a title page or a difficulty. */
  kv?: Record<string, KvValue>
  /**
   * The player's stored values for the game's `play` settings, usually the profile's `core:settings`. A missing or
   * invalid value starts at its default, and an undeclared id is ignored.
   */
  settings?: Record<string, unknown>
  /**
   * The state a finished game ended on, for a New Game+. The engine copies the stats, kv keys and things the game's
   * `carryOver` lists from it.
   */
  carry?: GameState
}

/**
 * A number content names that the engine works out when it reads it. Read one with `amountOf`.
 *
 * An amount is a number, a stat of the player's by id, a stat with `{ stat, of? }`, a kv key's number with
 * `{ kv, of? }` (a value that is not a number counts as 0), a value by name with `{ value, with? }`, or a count of
 * entities with `{ count, where?, units? }`, counted as the `count` condition counts. Amounts combine as a `Formula`
 * does (`sum`, `product`, `min`, `max`, `scale`, `clamp`), with any amount as a part, and `of` names the owner as it
 * does in conditions.
 *
 * Effects take one in `by` and `to`, ranges in their bounds, stats in `min` and `max`, and rolls in `plus` and
 * `against`. So `{ stat: 'coins', gte: { stat: 'rent' } }` holds while the player has at least the rent.
 */
export type Amount =
  | number
  | StatKey
  | { stat: StatKey; of?: string }
  | { kv: string; of?: string }
  | ValueRef
  | { count: string | Select; where?: Condition; units?: true }
  | { sum: Amount[] }
  | { product: Amount[] }
  | { min: Amount[] }
  | { max: Amount[] }
  | { scale: Amount; by: number }
  | { clamp: Amount; min?: number; max?: number }

/**
 * The bounds a condition compares a number with, so `{ gte: 3 }` holds for 3 or more. Each bound is an `Amount`, such
 * as `{ gte: { stat: 'rent' } }`.
 */
export type Range = {
  /** The range's lower bound, which the number must reach or pass. */
  gte?: Amount
  /** The range's lower bound, which the number must pass. */
  gt?: Amount
  /** The range's upper bound, which the number must not pass. */
  lte?: Amount
  /** The range's upper bound, which the number must stay below. */
  lt?: Amount
}

/** The conditions the core keeps itself, by the key that tells each apart. The features declare the rest. */
export type CoreConditions = {
  /** A condition that holds when every condition in `all` holds. */
  all: { all: Condition[] }
  /** A condition that holds when at least one condition in `any` holds. */
  any: { any: Condition[] }
  /** A condition that holds when `not` doesn't. */
  not: { not: Condition }
}

/** The table of every kind of condition, the core's and the features', by the key that tells it apart. Internal. */
export type ConditionMap = CoreConditions & FeatureConditions

/** A key that tells one kind of condition from another. A plugin's call in the short form (`{ 'quests/done': … }`) has none. */
export type ConditionKey = keyof ConditionMap

/** The kind of condition key `K` stands for. */
export type ConditionOf<K extends ConditionKey> = ConditionMap[K]

/**
 * A test of the state that holds or doesn't, written as plain data on a block, a choice or a variants member. Each
 * kind is told apart by its one key, such as `{ stat: 'coins', gte: 3 }`.
 *
 * A plugin's condition, or the game's own from its `rules`, is a `PluginCall` in the short form
 * (`{ 'quests/done': { quest: 'bakery' } }`), checked against `ConditionRegistry` when its name is declared there.
 * Being data, a condition stays serialisable and the content checker can check it.
 */
export type Condition = ConditionMap[ConditionKey] | ConditionCall

/**
 * The effects the core keeps itself, by the key that tells each apart. It is empty, since the features declare every
 * effect and a plugin's or the game's effect is a `PluginCall`.
 */
export type CoreEffects = Record<never, never>

/** The table of every effect, the core's and the features', by the key that tells it apart. Internal. */
export type EffectMap = CoreEffects & FeatureEffects

/** A key that tells one effect from another, such as `stat`, `kv` or `scene`. */
export type EffectKey = keyof EffectMap

/**
 * A change to the state, told apart by its one key as a condition is (`{ stat: 'coins', by: -2 }`, `{ scene: null }`).
 * It runs in its turn, on the state the effects before it left.
 *
 * A plugin's effect, or the game's own, is a `PluginCall` in the short form, such as
 * `{ 'quests/start': { quest: 'bakery' } }` or `{ 'game/payRent': {} }`.
 */
export type Effect = EffectMap[EffectKey] | EffectCall

/** The commands the core keeps itself, by type. The features declare the rest. */
export type CoreCommands = {
  /**
   * The command that starts a new game, with `kv` written to the kv store before the first scene. `seed` fixes its
   * random draws.
   *
   * A UI passes a fresh seed, and without one it is hashed from the game's id.
   */
  start: { type: 'start'; seed?: number; kv?: Record<string, KvValue> }
  /**
   * The command that starts over with a new game in place of this one, as a game-over choice sends it. A runner starts
   * it as `runner.newGame()` does, keeping the player's profile and settings.
   *
   * Without a runner, `apply` makes the new game from the state's play settings and a seed drawn from this one, and
   * reports it with `newGame: true`.
   */
  newGame: { type: 'newGame' }
  /** The command that runs a plugin's or the game's command by full name, as in `{ type: 'custom', name: 'quests/track', with: { id: 'bakery' } }`. */
  custom: { type: 'custom'; name: string; with?: Record<string, unknown> }
}

/** The table of every type of command, the core's and the features', by type. Internal. */
export type CommandMap = CoreCommands & FeatureCommands

/** A request to change the game, told apart by its `type`, such as `{ type: 'choose', id }`. The reducer applies it or refuses it. */
export type Command = CommandMap[keyof CommandMap]

// Each effect has the key it is told apart by: `stat` holds `{ stat }`. Each command's `type` is its key: `choose` holds
// `{ type: 'choose' }`. Each line is `true` only while that is so.
type KeyedBy<M> = { [K in keyof M]: M[K] extends Record<K, unknown> ? true : false }[keyof M]
type KeysMatch<M, F extends string> = { [K in keyof M]: M[K] extends Record<F, K> ? true : false }[keyof M]
/** A compile-time check that each effect carries the key it is told apart by. Internal. */
export const effectKeysMatch: [false] extends [KeyedBy<EffectMap>] ? false : true = true
/** A compile-time check that each command's `type` is its key. Internal. */
export const commandKeysMatch: [false] extends [KeysMatch<CommandMap, 'type'>] ? false : true = true
