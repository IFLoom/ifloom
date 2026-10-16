import type { CollectionEntry, CollectionItem } from './collections.ts'
import type { Notice } from './notices.ts'
import type { EntityState } from './entities.ts'
import type { EffectRef, PluginCall } from './custom.ts'
import type { PluginSlice } from './plugin.ts'
import type { FeatureCommands, FeatureConditions, FeatureEffects, FeatureState } from './features/registry.ts'

/**
 * The save format's version. A change to the shape of `GameState` bumps it.
 * A new field declares its defaults in `FIELDS` (intake.ts) or in its
 * feature's `state`; a field whose shape changes also gets a step in `STEPS`.
 */
export const SAVE_VERSION = 11 as const

export type FlagValue = boolean | number | string

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
  flags: Record<string, FlagValue>
}

/** One object type from an intersection of pieces, so it reads as one in an editor. */
export type Flat<T> = { [K in keyof T]: T[K] }

/** The fields of the save the core keeps itself. The features' are in `features/`. */
type CoreState = {
  version: typeof SAVE_VERSION
  /** Fixed per save. Keeps variant variants from dealing identically every run. */
  seed: number
  phase: Phase
  /**
   * How many turns have passed: the engine's one clock. What a turn is belongs
   * to the game — a day, an hour, a week, a chapter — and everything the engine
   * dates (`seenOn`, `fired`, collection entries, notices) is dated in turns.
   */
  turn: number
  /** The things the game keeps several of, by kind and id: `entities.staff.ana`. */
  entities: Record<string, Record<string, EntityState>>
  /** How many of each kind have been created in play, for the next one's id. */
  created: Record<string, number>
  /**
   * Entities the game declared that were removed in play, by reference. A
   * declared entity a save does not have is added when it loads (a mod's new
   * character, say) unless it is here: gone for good.
   */
  removed: string[]
  storylines: Record<string, StorylineState>
  flags: Record<string, FlagValue>
  items: Record<string, number>
  /** Each collection's entries, by collection id, oldest first. */
  collections: Record<string, CollectionEntry[]>
  /** What the game has told the player outside scenes, oldest first. */
  notices: Notice[]
  /** The turn each trigger last fired, by trigger id. */
  fired: Record<string, number>
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
  /** Variables to write before the first scene: a name from a title screen, a difficulty. */
  flags?: Record<string, FlagValue>
  /**
   * The player's stored values for the game's `play` settings, usually the
   * profile's `settings`. A setting given no value, or one it doesn't take,
   * starts at its default; ids the game doesn't declare are ignored.
   */
  settings?: Record<string, unknown>
  /**
   * The state a finished game ended on, for a New Game+: the stats, variables
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
  /**
   * A variable. Bare, it asks whether it is set to anything truthy; with `is`,
   * whether it equals that; with a range, whether its number is in it (a
   * variable that is not a number counts as 0): `{ flag: 'lies', gte: 3 }`.
   * With `of`, an entity's variable: `{ flag: 'role', of: '$', is: 'cook' }`.
   */
  flag: { flag: string; is?: FlagValue; of?: string } & Range
  storylineFlag: { storylineFlag: { storyline: string; key: string; is?: FlagValue } }
  /**
   * How many entities of a kind there are, or with `where`, how many it holds
   * for (`'$'` in it is each one in turn). Bare, at least one:
   * `{ count: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, gte: 2 }`.
   */
  count: { count: string; where?: Condition } & Range
  /** An entity is in the game: `{ entity: 'staff:ana' }`. */
  entity: { entity: string }
  /**
   * A storyline is open (`open: true`, the default): not closed, or closed
   * until a turn that has come. With `open: false`, that it is closed for now.
   */
  storyline: { storyline: string; open?: boolean }
  counter: { counter: { storyline: string; key: string } } & Range
  item: { item: string } & Range
  /** Owns at least one. */
  has: { has: string }
  /**
   * What is in a collection. With `id`: that entry is there. Without: how many
   * entries there are, at least one if no range is given.
   */
  collection: { collection: string; id?: string } & Range
  /** How many turns have passed. Turn 0 is the first, so `{ turn: true, gte: 3 }` is the fourth on. */
  turn: { turn: true } & Range
  phase: { phase: Phase[] }
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
  /** A plugin's effect, by its full name. Content writes `{ custom: name, with }`; the engine turns it into this. */
  custom: { kind: 'custom'; name: string; with?: Record<string, unknown> }
  storylineFlag: { kind: 'storylineFlag'; id: string; key: string; value: FlagValue }
  /**
   * Set a variable, or with `add`, add to its number (a variable that is not
   * a number counts as 0). With `of`, the variable is an entity's.
   */
  flag: { kind: 'flag'; key: string; value: FlagValue; of?: string } | { kind: 'flag'; key: string; add: number; of?: string }
  /**
   * A new entity of a kind. Its `id` is the next free number (`#1`, `#2`) if
   * left out, never reused; an id already there is left as it is.
   */
  create: { kind: 'create'; of: string; entity: { id?: string; name: string; stats?: Record<string, number>; flags?: Record<string, FlagValue> } }
  /** Take an entity out of the game: `{ kind: 'remove', of: 'staff:ana' }`. */
  remove: { kind: 'remove'; of: string }
  /**
   * The same effects for every entity of a kind (where `where` holds), one
   * after another, with `'$'` as the one each time: wages, upkeep, a bad week.
   */
  each: { kind: 'each'; of: string; where?: Condition; effects: EffectRef[] }
  item: { kind: 'item'; id: string; by: number }
  phase: { kind: 'phase'; value: Phase }
  closeStoryline: { kind: 'closeStoryline'; id: string; turns: number }
  /** End the turn, `by` times (1 if left out): the game's turn rules run each time. */
  turn: { kind: 'turn'; by?: number }
  /** Add an entry to a collection. An id already there is left as it is. */
  collect: { kind: 'collect'; to: string; entry: CollectionItem }
  /** Take an entry out of a collection. */
  discard: { kind: 'discard'; from: string; id: string }
  /** Tell the player something outside a scene. `text` is a prose key. */
  notify: { kind: 'notify'; title: string; text?: string; image?: string; tag?: string; id?: string }
}

/** Every kind of effect: the core's and the features'. */
export type EffectMap = CoreEffects & FeatureEffects

/** An effect: one of the kinds in `EffectMap`. */
export type Effect = EffectMap[keyof EffectMap]

/** The commands the core keeps itself, by type. The features' are in `features/`. */
export type CoreCommands = {
  /**
   * A new game. `seed` fixes its random draws (a UI passes a fresh one; left
   * out, it comes from the game's id). `flags` are written before the first
   * scene: a name asked for on a title screen, a difficulty.
   */
  start: { type: 'start'; seed?: number; flags?: Record<string, FlagValue> }
  /** Anything the pack declares as an ActivityDef: paperwork, a jog, a drink. */
  activity: { type: 'activity'; id: string }
  use: { type: 'use'; itemId: string }
  /** Mark one notice seen, or every one. */
  dismiss: { type: 'dismiss'; id?: string }
  /** Write what the player typed or picked. A button leaves `value` out and the UI asks. */
  input: { type: 'input'; id: string; value?: FlagValue }
  /** A plugin's command, by its full name: `{ type: 'custom', name: 'quests/track', with: { quest: 'bakery' } }`. */
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
