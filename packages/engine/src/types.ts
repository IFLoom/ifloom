/**
 * The save format's version. Every change to the shape of `GameState` bumps
 * it and adds a step to `MIGRATIONS` in save.ts.
 */
import type { CollectionEntry, CollectionItem } from './collections.ts'
import type { Notice } from './notices.ts'
import type { EntityState } from './entities.ts'
import type { Condition } from './condition.ts'
import type { EffectRef } from './custom.ts'
import type { PluginSlice } from './plugin.ts'
import type { AudioState } from './audio.ts'

export const SAVE_VERSION = 10 as const

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

export type GameState = {
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
  sceneId: string | null
  /**
   * How many times each scene has been entered. The engine's own record of what
   * the player has actually watched, so a chain can say "not until you have seen
   * the rung before this one" without every link needing a hand-written flag.
   *
   * Re-entering the scene you are already in — a hub redrawing itself after a
   * choice — is not a viewing and does not count.
   */
  seen: Record<string, number>
  /**
   * The turn each scene was first entered. The pace half of a ladder: `seen`
   * says the rung below has happened, this says how long ago, so a rung can
   * ask for a few turns to have passed however fast the stat behind it came in.
   */
  seenOn: Record<string, number>
  /**
   * How many times each choice has been picked, by `scene/choice`. Kept for
   * every choice, so content can branch on an earlier decision without each one
   * needing a flag of its own.
   */
  chosen: Record<string, number>
  /** The player's stats. An entity's are on the entity. */
  stats: Stats
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
  /** The value of each `play` setting the game declares, by id. */
  settings: Record<string, FlagValue>
  /** What effects have put on the audio channels, the last few sounds, and the count of scenes entered. */
  audio: AudioState
}

export type Command =
  /**
   * A new game. `seed` fixes its random draws (a UI passes a fresh one; left
   * out, it comes from the game's id). `flags` are written before the first
   * scene: a name asked for on a title screen, a difficulty.
   */
  | { type: 'start'; seed?: number; flags?: Record<string, FlagValue> }
  /** Anything the pack declares as an ActivityDef: paperwork, a jog, a drink. */
  | { type: 'activity'; id: string }
  | { type: 'scene'; id: string }
  | { type: 'choose'; id: string }
  | { type: 'leave' }
  | { type: 'use'; itemId: string }
  /** Mark one notice seen, or every one. */
  | { type: 'dismiss'; id?: string }
  /** Write what the player typed or picked. A button leaves `value` out and the UI asks. */
  | { type: 'input'; id: string; value?: FlagValue }
  /** Change a `play` setting. Ignores locks, like a menu would. */
  | { type: 'setting'; id: string; value: FlagValue }
  /** A plugin's command, by its full name: `{ type: 'custom', name: 'quests/track', with: { quest: 'bakery' } }`. */
  | { type: 'custom'; name: string; with?: Record<string, unknown> }

export type Effect =
  /** Change a stat by `by`, held to its range: the player's, or with `of`, an entity's (`'staff:ana'`, or `'$'` in an `each`). */
  | { kind: 'stat'; key: StatKey; by: number; of?: string }
  /** A plugin's effect, by its full name. Content writes `{ custom: name, with }`; the engine turns it into this. */
  | { kind: 'custom'; name: string; with?: Record<string, unknown> }
  /** Put a stat at a value, held to its range: energy back to full overnight. */
  | { kind: 'setStat'; key: StatKey; to: number; of?: string }
  | { kind: 'storylineFlag'; id: string; key: string; value: FlagValue }
  /**
   * Set a variable, or with `add`, add to its number (a variable that is not
   * a number counts as 0). With `of`, the variable is an entity's.
   */
  | { kind: 'flag'; key: string; value: FlagValue; of?: string }
  | { kind: 'flag'; key: string; add: number; of?: string }
  /**
   * A new entity of a kind. Its `id` is the next free number (`#1`, `#2`) if
   * left out, never reused; an id already there is left as it is.
   */
  | { kind: 'create'; of: string; entity: { id?: string; name: string; stats?: Record<string, number>; flags?: Record<string, FlagValue> } }
  /** Take an entity out of the game: `{ kind: 'remove', of: 'staff:ana' }`. */
  | { kind: 'remove'; of: string }
  /**
   * The same effects for every entity of a kind (where `where` holds), one
   * after another, with `'$'` as the one each time: wages, upkeep, a bad week.
   */
  | { kind: 'each'; of: string; where?: Condition; effects: EffectRef[] }
  | { kind: 'scene'; id: string | null }
  | { kind: 'item'; id: string; by: number }
  | { kind: 'phase'; value: Phase }
  | { kind: 'closeStoryline'; id: string; turns: number }
  /** End the turn, `by` times (1 if left out): the game's turn rules run each time. */
  | { kind: 'turn'; by?: number }
  /** Add an entry to a collection. An id already there is left as it is. */
  | { kind: 'collect'; to: string; entry: CollectionItem }
  /** Take an entry out of a collection. */
  | { kind: 'discard'; from: string; id: string }
  /** Tell the player something outside a scene. `text` is a prose key. */
  | { kind: 'notify'; title: string; text?: string; image?: string; tag?: string; id?: string }
  /**
   * Put a track on a background channel, kept in the save: `{ kind: 'audio', channel: 'music', track: 'calm' }`.
   * `track: null` silences the channel; leaving `track` out hands it back to the place or the game's default.
   */
  | { kind: 'audio'; channel: string; track?: string | null }
  /** Play a sound once, on its track's channel. */
  | { kind: 'sound'; track: string }
