import type { ConditionCall, EffectCall, ValueRef } from './calls.ts'
import type { Select } from './features/entities.ts'
import type { PluginSlice } from './plugin.ts'
import type { FeatureCommands, FeatureConditions, FeatureEffects, FeatureState } from './features/registry.ts'

/**
 * The save format's version. Only a change to the shape of something saves
 * already have bumps it, with a step in `STEPS` (intake.ts) that reshapes it.
 * An added field doesn't: it declares a load default in `FIELDS` or in its
 * feature's `state`, and older saves get that default when they load.
 */
export const SAVE_VERSION = 24 as const

/** A value in the kv store: true/false, a number or text. */
export type KvValue = boolean | number | string

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
   * and things the game's `carryOver` lists are copied from it.
   */
  carry?: GameState
}

/**
 * When a thing applies: a block of prose, a choice, a line in a variants.
 *
 * Plain nested data, so content stays serialisable and the loader can check it
 * — `{ storyline: 'baker' }` is verifiable against the declared storylines in a way
 * that an arbitrary function never was. Anything genuinely derived escapes
 * through `{ 'game/name': args }`, a condition the game's `rules` declare.
 */
/**
 * A number content names, worked out when it is read: a number as written, a
 * stat of the player's by id, a stat with `{ stat, of? }`, a
 * kv key's number with `{ kv, of? }` (a value that is not a number counts as
 * 0), a value by name with `{ value, with? }`, or how many entities there are
 * with `{ count, where?, units? }`, counted as the `count` condition counts.
 * They combine as a `Formula` does (`sum`, `product`, `min`, `max`, `scale`,
 * `clamp`), with any amount as a part. `of` names whose, as it does in conditions. Read one with `amountOf`.
 * Effects take one in `by` and `to`, ranges in their bounds, stats in `min`
 * and `max`, and rolls in `plus` and `against`:
 * `{ stat: 'coins', gte: { stat: 'rent' } }` holds while the player has at
 * least the rent.
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
 * Bounds a number is compared with, as conditions compare one: `{ gte: 3 }`
 * is 3 or more. Each bound is an `Amount`, so it can be another number in
 * the game: `{ gte: { stat: 'rent' } }`.
 */
export type Range = { gte?: Amount; gt?: Amount; lte?: Amount; lt?: Amount }

/** The conditions the core keeps itself, by the key that tells each apart. The features' are in `features/`. */
export type CoreConditions = {
  all: { all: Condition[] }
  any: { any: Condition[] }
  not: { not: Condition }
}

/** Every kind of condition, by the key that tells it apart: the core's and the features'. */
export type ConditionMap = CoreConditions & FeatureConditions

/** The keys that tell one kind of condition from another. A plugin's call in short (`{ 'quests/done': … }`) has none. */
export type ConditionKey = keyof ConditionMap

/** The condition a key stands for. */
export type ConditionOf<K extends ConditionKey> = ConditionMap[K]

/**
 * A condition: one of the kinds in `ConditionMap`, told apart by its one kind
 * key, or a plugin's condition in short: `{ 'quests/done': { quest: 'bakery' } }`,
 * checked against `ConditionRegistry` when the plugin declares its calls. See `PluginCall`.
 */
export type Condition = ConditionMap[ConditionKey] | ConditionCall

/**
 * The effects the core keeps itself, by the key that tells each apart. The
 * features' are in `features/`. The core has none: a call to a plugin's
 * effect or the game's own is a `PluginCall`.
 */
export type CoreEffects = Record<never, never>

/** Every effect, by the key that tells it apart: the core's and the features'. */
export type EffectMap = CoreEffects & FeatureEffects

/** The keys that tell one effect from another, as conditions are told apart: `stat`, `kv`, `scene`. */
export type EffectKey = keyof EffectMap

/**
 * An effect: one of the effects in `EffectMap`, told apart by its one key, as
 * a condition is (`{ stat: 'coins', by: -2 }`, `{ scene: null }`), or a
 * plugin's effect or the game's own in short: `{ 'quests/start': { quest: 'bakery' } }`,
 * `{ 'game/payRent': {} }`. It runs in its turn, on the state the effects
 * before it left. See `PluginCall`.
 */
export type Effect = EffectMap[EffectKey] | EffectCall

/** The commands the core keeps itself, by type. The features' are in `features/`. */
export type CoreCommands = {
  /**
   * A new game. `seed` fixes its random draws (a UI passes a fresh one; left
   * out, it comes from the game's id). `kv` is written to the kv store before the first
   * scene: a name asked for on a title screen, a difficulty.
   */
  start: { type: 'start'; seed?: number; kv?: Record<string, KvValue> }
  /**
   * Start over: a new game in place of this one, as a game-over choice
   * sends it. A runner starts it as `runner.newGame()` does, keeping the
   * player's profile and settings. On its own, `apply` makes the new game
   * from the state's play settings and a seed drawn from this one, and says
   * so with `newGame: true`.
   */
  newGame: { type: 'newGame' }
  /** A plugin's command, by its full name: `{ type: 'custom', name: 'quests/track', with: { id: 'bakery' } }`. */
  custom: { type: 'custom'; name: string; with?: Record<string, unknown> }
}

/** Every type of command: the core's and the features'. */
export type CommandMap = CoreCommands & FeatureCommands

/** A command: one of the types in `CommandMap`. */
export type Command = CommandMap[keyof CommandMap]

// Each effect has the key it is told apart by: `stat` holds `{ stat }`. Each command's `type` is its key: `choose` holds
// `{ type: 'choose' }`. Each line is `true` only while that is so.
type KeyedBy<M> = { [K in keyof M]: M[K] extends Record<K, unknown> ? true : false }[keyof M]
type KeysMatch<M, F extends string> = { [K in keyof M]: M[K] extends Record<F, K> ? true : false }[keyof M]
export const effectKeysMatch: [false] extends [KeyedBy<EffectMap>] ? false : true = true
export const commandKeysMatch: [false] extends [KeysMatch<CommandMap, 'type'>] ? false : true = true
