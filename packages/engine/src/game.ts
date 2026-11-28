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
 * The words a player reads when something is refused, written in place (`'Closed.'`) or as a strings key
 * (`{ string: 'shop/closed' }`). Read one with `reasonOf`.
 *
 * A key lets a game reword a reason once for every place that uses it.
 */
export type Reason = string | { string: string }

/**
 * A limit of once a game or once a turn on a choice, an action or a plugin's entry, such as a cheat. The engine counts
 * a choice's or an action's uses in `state.chosen`.
 */
export type Once = {
  /** The limit's span, `'game'` for once in the whole game or `'turn'` for once a turn. */
  per: 'game' | 'turn'
  /** The reason the player reads once the limit is spent. For a choice or an action, the engine's `done` string ("Already done.") if left out. */
  reason?: Reason
}

/**
 * A rule that refuses a choice, an action, a location or an app while its `when` holds. The first entry of a `blocked`
 * list whose `when` holds gives the `reason` the button shows.
 */
export type Blocked = {
  /** The rule's condition, which refuses the choice or action while it holds. */
  when: Condition
  /** The rule's reason, which the player reads on the greyed-out button and as the refusal. */
  reason: Reason
  /** The rule's hide mark. When true, the button is left off the screen while `when` holds, rather than greyed out. */
  hide?: boolean
}

/**
 * The fields a scene's choice (`Choice`) and an action (`ActionDef`) share, read the same way for both. Taking one
 * runs its command, then pays its cost, then applies its effects.
 */
export type ButtonDef = {
  /** The choice's or action's id, unique among its scene's choices or among the actions. */
  id: string
  /**
   * The button's words, with tokens filled, such as `'Order a tea'`. A choice with no label shows its id, and an action
   * with none is never rendered as a button.
   */
  label?: string
  /**
   * The button's words that depend on the state, such as "Not today" before you have bought it and "Right." after. The
   * first entry whose `when` holds wins, and `label` is the fallback.
   */
  labels?: { when?: Condition; label: string }[]
  /** The condition under which the choice or action is offered and can be taken. Always, if left out. */
  when?: Condition
  /**
   * The rules that refuse it for now. The first entry whose `when` holds greys the button out with its reason, or
   * leaves it off with `hide`.
   */
  blocked?: Blocked[]
  /** The stats it spends. The engine checks them before it runs, lists them on the button and pays them after its command. */
  cost?: ActionCost
  /** The effects it applies after its cost, in order. A plugin's or the game's effect in the short form does computed work. */
  effects?: EffectRef[]
  /**
   * The command the choice or action sends first, a plugin's in the short form or one of the engine's, but never
   * `choose`. The button is refused with that command's reason while the command would be.
   *
   * An example is `{ 'devices/open': { id: 'messages' } }`. The button's price includes what the command spends.
   */
  command?: CommandRef
  /**
   * The limit of once a game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), counted in `state.chosen`. Once
   * spent, a choice stays on screen and pays nothing more, and an action is refused, both with `reason`.
   */
  once?: Once
  /** The tags a UI can style or filter it by. The engine gives them no meaning. */
  tags?: string[]
  /** The warning that it can't be undone, which a UI shows on the button. */
  irreversible?: string
  /** The ui hints carried to its button in the view. See `ChoiceUi`. */
  ui?: Ui<ChoiceUi>
}

/**
 * An action the game declares in `actions`, or one a plugin offers (a location's, an app's). It has the fields of a
 * `ButtonDef`, the same as a choice.
 *
 * Taking one with only a `command` sends that command. One with a cost, effects or `once` sends
 * `{ type: 'action', id }`, which runs its command, pays its cost and applies its effects. The id is the game's own,
 * or `'<plugin>/<id>'` for a plugin's. An action with no `label` is never rendered as a button, so only a choice's
 * command, another action or a hotspot runs it.
 */
export type ActionDef = ButtonDef

/** A scene's choice after rendering, with its label worked out and its effects ready. Internal to the screen. */
export type SceneChoice = {
  /** The choice's id. */
  id: string
  /** The choice's label, worked out for this state. */
  label: string
  /** The choice's visible mark, false when its `when` fails or a `blocked` entry with `hide` holds. */
  visible?: boolean
  /** The choice's refusal from `blocked` or a spent `once`, or undefined while it can be taken. */
  disabled?: string
  /** The tags a UI can style or filter the choice by. The engine gives them no meaning. */
  tags?: string[]
  /** The choice's warning that it can't be undone. */
  irreversible?: string
  /** The choice's effects, ready to apply. A spent choice keeps only its `scene` effects. */
  effects: Effect[]
  /** The stats the choice spends, from its `cost`. */
  cost?: ActionCost
  /** The command the choice sends before its effects. See `Choice.command`. */
  command?: CommandRef
  /** The ui hints carried to the view's choice. See `ChoiceUi`. */
  ui?: Ui<ChoiceUi>
}

/**
 * A picture or a video in a scene's body, written as a `{ media }` block. Give a file as `src`, or have a pool draw
 * one with `pool` and `tags`.
 */
export type SceneMedia = {
  /** The media's file, a path in the game's `art/` folder or a URL. */
  src?: string
  /** The pool in `game.media.pools` that draws the file. */
  pool?: string
  /** The tags the pool's pick should have, most important first. See `poolCandidates`. */
  tags?: string[]
  /** The media's alternative text, for a screen reader. */
  alt?: string
  /** The media's size, `'inline'` or `'wide'`. `'inline'` if left out. */
  size?: 'inline' | 'wide'
  /**
   * The media's position. `lead` opens the scene, as an establishing picture does, and `end` follows the body. A block
   * with none sits where it is in the body, in order with the prose.
   */
  at?: 'lead' | 'end'
  /** The video mark, which renders the file as a video. A `.mp4` or `.webm` file is a video without it. */
  video?: boolean
} & VideoFlags

/** The store of prose keys and variants lists that scenes read. `loadGame` makes it from the content's `prose`. */
export type ProseStore = {
  /** The store's function that returns a prose key's line, with its tokens filled for `state`. */
  line: (key: string, state?: GameState) => string | undefined
  /** The store's function that returns a variants list's members by its name, in declaration order. */
  variants: (name: string) => string[]
  /** The store's function that returns a member's weight in a variants list. Every member weighs 1 if left out. */
  weight?: (name: string, key: string) => number
  /**
   * The store's function that lists every prose key, so the content checker can read all the prose's markup. The
   * checker reads only the keys content names if left out.
   */
  keys?: () => string[]
}

/**
 * A storyline the game declares in `storylines`, a thread of the story with its own kv keys. A storyline can close
 * until a later turn.
 */
export type StorylineDef = {
  /** The storyline's id, read as `storyline:<id>` in a kv effect's `of`. */
  id: string
  /** The storyline's name, as the player reads it. */
  name: string
}

/**
 * The game's own code, a plain object with the members a plugin has. Content calls its members with `game` as the
 * plugin id, such as the condition `{ 'game/tired': true }`.
 *
 * The engine runs it as the plugin `game`, before every other plugin, with the same context (`PluginContext`, and
 * `TurnContext` for the turn hooks). Its `slice`, `get` and `set` read and write the game's own state when it has a
 * `start`. Every member is optional and means what a plugin's does (see `Plugin`), except `migrations`, which carry
 * the whole save from one version of the game to the next.
 *
 * A plugin's id, versions, content, strings and data are the game's own content, so `GameRules` leaves them out.
 * Locks and per-turn resets are content too, in `locks` and `resets`. Its `calls`, declared with `defineCalls('game',
 * …)` and passed through `defineRules`, type its members' arguments and let the content checker check every `game/`
 * call against them.
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
  | 'data'
  | 'receiver'
  | 'carry'
> & {
  /**
   * The game's save migrations, keyed by the game `version` each upgrades from, so step 1 takes a version-1 save to
   * version 2. A version with no step is carried forward unchanged.
   *
   * They run on the whole state when an older save loads, after the engine's and plugins' own migrations.
   */
  migrations?: Record<number, (state: GameState, tools: MigrationTools) => GameState>
}

/** The stats and kv keys a New Game+ carries over from the game before, declared in `carryOver`. A plugin carries its own state with its `carry`. */
export type CarryOver = {
  /** The player's stats to carry, by id. */
  stats?: string[]
  /** The player's kv keys to carry, by key. */
  kv?: string[]
}

/** The fields of a game the core reads itself. The features declare the rest, such as settings, stats and audio. */
type CoreGame = {
  /** The game's id. Saves and packs record it, so a save from another game is refused. */
  id: string
  /** The game's title, which a title page shows. */
  title: string
  /**
   * The game's own version, a whole number from 1. Saves record it, and `rules.migrations` carry an older save forward.
   * 1 if left out.
   *
   * Declaring it also stops the engine filling new stats, settings and entities into old saves by itself, so your
   * migration steps fill them with `tools.fill()`.
   */
  version?: number
  /** The ids of the packs the game was loaded with, in order. Saves record them, and the game's own content has no id. */
  packs?: string[]
  /** The game's prose keys and variants lists, with their weights. `loadGame` makes it from the content's `prose`. */
  prose?: ProseStore
  /** The game's own code, its hooks, providers and the calls content makes as `game/<name>`. See `GameRules`. */
  rules?: GameRules
  /**
   * The game's lines in place of the engine's and plugins' strings, by key, such as
   * `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`. Packs can add theirs, and a later pack's line wins.
   */
  strings?: Record<string, string>
  /** The plugins the game is built with, in the order their hooks run. */
  plugins?: readonly Plugin<any>[]
  /**
   * The order the `receive` effect asks the plugins that keep things, by plugin id. The order of `plugins` if left out.
   *
   * `['wardrobe', 'inventory']` sends clothes to the wardrobe and the rest to the inventory.
   */
  receivers?: readonly string[]
  /**
   * The plugins' content, by plugin id and then list, such as `data.quests.quests`. `loadGame` merges packs' entries by
   * id, as it does scenes.
   */
  data?: Record<string, Record<string, readonly PluginEntry[]>>
}

/** A loaded game, the core's fields and each feature's. `loadGame` makes it from the base, the content and the packs. */
export type Game = Flat<CoreGame & FeatureGame>

/** Returns the scene with this id from the game's content, or undefined when there is none. */
export function sceneOf(game: Game, id: string): DataScene | undefined {
  return game.scenes.find((scene) => scene.id === id)
}
