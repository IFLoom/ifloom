import type { Plugin, PluginEntry } from './plugin.ts'
import type { Condition } from './condition.ts'
import type { EffectRef } from './custom.ts'
import type { CommandRef } from './calls.ts'
import type { ActionCost } from './features/actions.ts'
import type { ChoiceUi, Ui } from './features/ui.ts'
import type { FeatureGame } from './features/registry.ts'
import type { VideoFlags } from './sceneBody.ts'
import type { DataScene } from './scene.ts'
import type { MigrationTools } from './intake.ts'
import type { Effect, Flat, GameState } from './types.ts'

export type { SettingDef } from './features/settings.ts'
export type { StoryletFields } from './features/scenes.ts'
export type { MinigameSceneFields } from './features/minigames.ts'

/**
 * Words a player reads when something is refused: written in place
 * (`'Closed.'`), or a line of the strings table by its key (`{ string:
 * 'shop/closed' }`), so a game rewords it once for every place it is used.
 * Read it with `reasonOf`.
 */
export type Reason = string | { string: string }

/**
 * How often something can happen: once in the whole game, or once a turn.
 * `reason` is what the player reads on a button once it is spent; the
 * engine's `done` string ("Already done.") if left out.
 */
export type Once = { per: 'game' | 'turn'; reason?: Reason }

/**
 * Why something the player could do is refused for now: a choice, an action,
 * a place, an app. Each entry is checked in order, and the first
 * whose `when` holds refuses it with its `reason`, which the button shows
 * greyed out. With `hide`, the button is left off the screen instead.
 */
export type Blocked = {
  /** Refused while this holds. */
  when: Condition
  /** What the player reads on the greyed-out button, and the refusal. */
  reason: Reason
  /** Leave it off the screen while `when` holds, rather than greyed out. */
  hide?: boolean
}

/**
 * Something the player can press: a scene's choice (`Choice`) or an action
 * (`ActionDef`). Both have these fields, read the same way: its words, when
 * it is offered and why it is refused, what it costs, what it does and a
 * command it sends, once a turn, and words and hints for the UI.
 *
 * Pressing one runs, in order: its command, its cost, then its effects.
 */
export type ButtonDef = {
  id: string
  /**
   * Its words, as written, with tokens filled: `'Order a tea'`. A scene's
   * choice with none shows its id; an action with none is never drawn as a
   * button.
   */
  label?: string
  /**
   * Words that depend on state, "Not today" before you have bought it,
   * "Right." after. The first whose `when` holds wins; `label` is the
   * fallback.
   */
  labels?: { when?: Condition; label: string }[]
  /** Only offered, and only done, while this holds. */
  when?: Condition
  /**
   * Shown but greyed out while one of these holds, with its reason (or left
   * off with `hide`), and refused with it. The first that holds wins.
   */
  blocked?: Blocked[]
  /** Stats it spends: checked before it runs, listed on its button, and paid after its command. */
  cost?: ActionCost
  /** Applied after the cost, in order. A plugin's or the game's own in short for one that is computed. */
  effects?: EffectRef[]
  /**
   * A command it sends as well, run first: a plugin's in short
   * (`{ 'devices/open': { id: 'messages' } }`) or the engine's. It is greyed
   * out with that command's reason while it would be refused, and its price
   * includes what the command spends. Any command but `choose`.
   */
  command?: CommandRef
  /**
   * Once in the game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`):
   * spent once it has been pressed, as `state.chosen` counts it. `reason` is
   * what the player reads on it afterwards: a choice stays on screen and pays
   * nothing more, an action is refused.
   */
  once?: Once
  /** Words the UI can style or filter it by. The engine gives them no meaning. */
  tags?: string[]
  /** A warning that it can't be undone, which the UI shows on it. */
  irreversible?: string
  /** Presentation hints for the UI, carried to its button as written. See `ChoiceUi`. */
  ui?: Ui<ChoiceUi>
}

/**
 * Something the player can do, as a button: the game's own in content's
 * `actions`, a plugin's (a place's, an app's). It is a `ButtonDef`, the
 * fields a choice has.
 *
 * Pressing one with only a `command` sends that command. One with a cost,
 * effects or `once` sends `{ type: 'action', id }`, which runs its command
 * first, then pays its cost and applies its effects: the game's by its id,
 * a plugin's as `'<plugin>/<id>'`. One with no `label` is never drawn as a
 * button: a choice's command, another button or a hotspot runs it.
 */
export type ActionDef = ButtonDef

export type SceneChoice = {
  id: string
  label: string
  visible?: boolean
  disabled?: string
  /** Words the UI can style or filter the choice by. The engine gives them no meaning. */
  tags?: string[]
  irreversible?: string
  effects: Effect[]
  /** Stats it spends, as the choice's `cost` says. */
  cost?: ActionCost
  /** A command it sends as well, run before its effects. See `Choice.command`. */
  command?: CommandRef
  /** Presentation hints for the UI, carried to the view's choice as written. See `ChoiceUi`. */
  ui?: Ui<ChoiceUi>
}

/**
 * A picture or a video in a scene's body, as a `{ media }` block. Give a file
 * as `src`, or ask a pool for one with `pool` and `tags`.
 */
export type SceneMedia = {
  src?: string
  /** A pool in `game.media.pools` to pick the file from. */
  pool?: string
  /** The tags the pick should have, most important first. See `poolCandidates`. */
  tags?: string[]
  alt?: string
  /** `'inline'` if left out. */
  size?: 'inline' | 'wide'
  /**
   * Where it sits. Left out, a `{ media }` block sits where it is in the body,
   * in order with the prose. `lead` opens the scene, which is where an
   * establishing still belongs; `end` follows the body.
   */
  at?: 'lead' | 'end'
  /** Draw it as a video. A `.mp4` or `.webm` file is one anyway. */
  video?: boolean
} & VideoFlags

/** Prose and variants members the declarative scenes draw on. */
export type ProseStore = {
  /** The words for a key, with `{{playerName}}` and friends filled in. */
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
  /** A member's weight in a variants list, 1 if it has none. Left out, every member weighs 1. */
  weight?: (name: string, key: string) => number
  /**
   * Every key the store has words for, so the content checker can read all
   * the prose's markup. Left out, it reads only the keys content names.
   */
  keys?: () => string[]
}

/** A thread of the story, followed by its kv, and closed for a while if need be. */
export type StorylineDef = {
  id: string
  name: string
}

/**
 * The game's own code: a plain object with what a plugin can have, for the
 * game itself, with no plugin to write. Content calls what it declares as it
 * calls a plugin's, with `game` as the plugin's id: `{ 'game/tired': true }`
 * as a condition, `{ 'game/payRent': {} }` as an effect, `{{catName}}` in
 * prose, `{ 'game/rest': true }` as a command.
 *
 * The engine runs it as the plugin `game`, the first of the game's plugins:
 * every hook and provider runs before every plugin's, with the same context a
 * plugin's gets (`PluginContext`, and `TurnContext` for the turn hooks), whose
 * `slice`, `get` and `set` read and write the game's own state when it has a
 * `start`. Every member is optional and means what a plugin's does (see
 * `Plugin`), but `migrations`, which carry the whole save from one version of
 * the game to the next. A plugin's identity, versions, content, words and declared calls and data are
 * the game's own content, so they aren't here. What is locked and what resets
 * each turn are content: `locks` and `resets`.
 */
export type GameRules<S = any> = Omit<
  Plugin<S>,
  | 'id'
  | 'version'
  | 'migrations'
  | 'cooperates'
  | 'contentVersion'
  | 'contentMigrations'
  | 'commandVersion'
  | 'commandMigrations'
  | 'content'
  | 'strings'
  | 'calls'
  | 'data'
> & {
  /**
   * Steps that carry a save from one version of the game to the next, keyed by
   * the version they upgrade from: step 1 takes a version-1 save to version 2.
   * They run when an older save loads, after the engine's and plugins' own
   * migrations, on the whole state. A version with no step is carried forward
   * unchanged. The version is the base's `version`.
   */
  migrations?: Record<number, (state: GameState, tools: MigrationTools) => GameState>
}

/** What a New Game+ takes from the game before: player stats, kv keys and what the player holds. */
export type CarryOver = {
  stats?: string[]
  /** kv keys, by name. */
  kv?: string[]
  /**
   * Things the player holds, by reference (`'food:apple'`), or `'all'` for
   * everything the player holds. A thing made in play comes with them.
   */
  held?: string[] | 'all'
}

/** The fields of a game the core reads itself. The features' (settings, stats, audio, media, the ending) are in `features/`. */
type CoreGame = {
  id: string
  title: string
  /**
   * The game's own version, a whole number from 1. Saves record it, and
   * `migrations` carry an older save forward. Declaring it also stops the
   * engine filling new stats, settings and entities into old saves by itself:
   * your migration steps (`rules.migrations`) fill them with `tools.fill()`. 1 if left out.
   */
  version?: number
  /** The ids of the packs the game was loaded with, in order (not its own content, which has none). Saves record them. */
  packs?: string[]
  prose?: ProseStore
  rules?: GameRules
  /**
   * The game's words for anything the engine or a plugin says to the player,
   * by key: `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`.
   * Packs can add theirs; a later pack's line wins.
   */
  strings?: Record<string, string>
  /** The plugins the game is built with, in the order their hooks run. */
  plugins?: readonly Plugin<any>[]
  /**
   * Content for plugins, by plugin id and then list: `data.quests.quests`.
   * Merged from packs by id, as scenes are.
   */
  data?: Record<string, Record<string, readonly PluginEntry[]>>
}

/** A game: what the core reads, and what each feature does. */
export type Game = Flat<CoreGame & FeatureGame>

/** The scene with this id, as content declares it, or undefined. */
export function sceneOf(game: Game, id: string): DataScene | undefined {
  return game.scenes.find((scene) => scene.id === id)
}
