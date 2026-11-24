import type { Asked, CheckTools, Plugin, PluginArgs, PluginEntry, PluginProblem, PluginReferences, Refusal, RoomScene, StatModifier } from './plugin.ts'
import type { Condition } from './condition.ts'
import type { CustomCondition, CustomContext, CustomEffect, CustomValue, EffectRef, TurnContext } from './custom.ts'
import type { CommandRef } from './calls.ts'
import type { PictureDef } from './features/media.ts'
import type { ActionCost } from './features/actions.ts'
import type { ScenePanel } from './features/panels.ts'
import type { StoryletFields } from './features/scenes.ts'
import type { MinigameSceneFields } from './features/minigames.ts'
import type { BlockUi, ChoiceUi, SceneUi, Ui } from './features/ui.ts'
import type { FeatureGame } from './features/registry.ts'
import type { SceneBeat, VideoFlags } from './sceneBody.ts'
import { bakeScene, isDataScene, type Block, type DataScene } from './scene.ts'
import type { MigrationTools } from './intake.ts'
import type { Effect, Flat, KvValue, GameState, StatKey } from './types.ts'
import type { TraitDef } from './entities.ts'

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
 * A picture or a video in a scene's body, as a `{ media }` block or in
 * `SceneView.media`. Give a file as `src`, or ask a pool for one with `pool`
 * and `tags`.
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
   * establishing still belongs; `end` follows the body. In a hand-built
   * scene's `media`, left out means `end`.
   */
  at?: 'lead' | 'end'
  /** Draw it as a video. A `.mp4` or `.webm` file is one anyway. */
  video?: boolean
} & VideoFlags

export type SceneView = {
  title?: string
  speaker?: string
  /** Words the UI can style the scene by: `['letter']`, `['flashback']`. The engine gives them no meaning. */
  tags?: string[]
  /** The big picture to draw with it, through `artSrc`. Left out, the speaker's. */
  image?: string
  /** The scene's prose, with its markup. Left out, the scene has no body text. */
  body?: string
  media?: SceneMedia[]
  /** A layered picture with hotspots, drawn over the scene. See `view.scene.picture`. */
  picture?: PictureDef
  /** What plays on background channels while the scene is open, by channel. Null silences one. */
  audio?: Record<string, string | null>
  /**
   * Where each block that has `ui` hints starts in `body`, by character, for
   * the screen to put them on the beats. A data scene's render fills it; a
   * hand-built scene leaves it out.
   */
  blockUi?: { at: number; ui: Ui<BlockUi> }[]
  choices: SceneChoice[]
}

/** What a hand-built scene's `render` can read besides the state. */
export type SceneCtx = {
  /** A key in the player's kv store, or with `of: 'storyline:<id>'`, a storyline's. */
  kv: (key: string, of?: string) => KvValue | undefined
  /**
   * Where the render's new pool picks go, when the engine is drawing a screen
   * and wants them recorded. Pass it to `renderScene` when a hand-built scene
   * wraps a data scene. Undefined otherwise.
   */
  picks?: Record<string, string>
}

export type Scene = StoryletFields &
  MinigameSceneFields & {
    id: string
    title?: string
    speaker?: string
    /** Words the UI can style the scene by: `['letter']`, `['flashback']`. The engine gives them no meaning. */
    tags?: string[]
    /** A panel open for as long as the scene is. See `DataScene.panel`. */
    panel?: ScenePanel
    /** Presentation hints for the UI, carried to `view.scene.ui` as written. See `SceneUi`. */
    ui?: Ui<SceneUi>
    render: (state: GameState, ctx: SceneCtx) => SceneView
  }

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
 * The game's own code: a plain object of the hooks, tables and providers a
 * plugin can have, for the game itself, with no plugin to write. Content
 * calls what it declares as it calls a plugin's, with `game` as the plugin's
 * id: `{ 'game/tired': true }` as a condition, `{ 'game/postLatest': {} }` as
 * an effect, `{{catName}}` in prose, `{ 'game/rest': true }` as a
 * command.
 *
 * Every member is optional; leave one out and the engine does the plain
 * thing. The hooks are named as a plugin's are (ADR 0009): `on` and the
 * event, returning the next state. The game's code runs first, before every
 * plugin's, as if it were the first plugin. What is locked and what resets
 * each turn are content: `locks` and `resets`.
 */
export type GameRules<S = any> = {
  /**
   * Steps that carry a save from one version of the game to the next, keyed by
   * the version they upgrade from: step 1 takes a version-1 save to version 2.
   * They run when an older save loads, after the engine's and plugins' own
   * migrations. A version with no step is carried forward unchanged. The
   * version is the base's `version`.
   */
  migrations?: Record<number, (state: GameState, tools: MigrationTools) => GameState>
  /**
   * The name a save is listed under, such as the name the player typed, or
   * null for none. Saves record it as `SaveMeta.playerName`. Left out, saves have no name.
   */
  saveName?: (state: GameState) => string | null
  /**
   * A hook: the end of a turn. Called once the turn counter has moved on and
   * the content's `resets` are back, with the state then and a `TurnContext`, whose
   * `before` is the state as the turn ended. Return the next state: apply
   * effects with `context.apply`, in order, each seeing the ones before it.
   * Runs before every plugin's `onTurn`, so a plugin's clock still reads the
   * turn that ended. To act on what the plugins did, use `onTurnDone`.
   */
  onTurn?: (state: GameState, context: TurnContext) => GameState
  /**
   * A hook: the end of a turn, after every plugin's `onTurn` and before any
   * plugin's `onTurnDone`. The same arguments as `onTurn`, but the state has
   * the plugins' changes (the calendar's new day, a status worn off), so it
   * is where "each new day" goes. `before` is still the state as the turn ended.
   */
  onTurnDone?: (state: GameState, context: TurnContext) => GameState
  /**
   * A hook: one of the player's stats just changed. Return `before` to say it
   * did not take, `after` to let it, or `after` with more besides. Runs before
   * any plugin's `onStat`.
   */
  onStat?: (before: GameState, after: GameState, stat: StatKey, by: number, context: RulesContext<S>) => GameState
  /** A hook: after every command that took, with the state it started from and the state after. Returns the next state. */
  onCommand?: (before: GameState, after: GameState, context: RulesContext<S>) => GameState
  /** Conditions content can test, by name: `{ 'game/tired': true }`. */
  conditions?: Record<string, CustomCondition>
  /**
   * Effects content can apply, by name: `{ 'game/payRent': {} }`. Each works
   * out the effects it stands for from the state and returns them, so a
   * button's price and the guards see what it would do. It can return
   * anything content can write, a plugin's effects and the game's own included.
   */
  effects?: Record<string, CustomEffect>
  /** Words and numbers content can read by name: `{{catName}}`, a stat's `max: { value: 'game/ceiling' }`. */
  values?: Record<string, CustomValue>
  /** Answers code can ask by name with `context.query('game/name')`. */
  queries?: Record<string, (state: GameState, args: PluginArgs, context: CustomContext) => unknown>
  /** Commands a button can send, by name: `{ 'game/rest': true }`, logged as `{ type: 'custom', name: 'game/rest' }`. */
  commands?: Record<string, RulesCommand<S>>
  /** Whether a command may go ahead, given what it would do. As a plugin's `guard`. */
  guard?: (state: GameState, asked: Asked, context: RulesContext<S>) => Refusal | undefined
  /** What a button costs that the engine cannot say, in the game's words. As a plugin's `price`. */
  price?: (state: GameState, effects: readonly Effect[], context: RulesContext<S>) => string[] | undefined
  /** Where the game is, in a few words for a header or a save, before the plugins'. As a plugin's `label`. */
  label?: (state: GameState, context: RulesContext<S>) => string | undefined
  /** What the screen shows while no scene is open, before any plugin's. As a plugin's `scene`. */
  scene?: (state: GameState, context: RulesContext<S>) => RoomScene | undefined
  /** Actions offered while no scene is open, before the plugins'. As a plugin's `actions`. */
  actions?: (state: GameState, context: RulesContext<S>) => readonly ActionDef[] | undefined
  /** One of the game's actions that isn't in content, by id: `{ type: 'action', id: 'game/<id>' }` does it. As a plugin's `action`. */
  action?: (state: GameState, id: string, context: RulesContext<S>) => ActionDef | undefined
  /** Changes to what the player's stats read right now. As a plugin's `statModifiers`. */
  statModifiers?: (state: GameState, context: RulesContext<S>) => readonly StatModifier[] | undefined
  /** What plays on background channels, before the plugins'. As a plugin's `audio`. */
  audio?: (state: GameState, context: RulesContext<S>) => Record<string, string | null> | undefined
  /** What the UI needs from the game's own code, at `view.plugins.game`. */
  view?: (state: GameState, context: RulesContext<S>) => unknown
  /** What the game keeps in the player's profile, under `game`. As a plugin's `profile`. */
  profile?: (state: GameState, previous: GameState, stored: unknown, context: RulesContext<S>) => unknown
  /**
   * The game's own state, as a plugin's is: what a new game starts with,
   * kept in saves at `state.plugins.game` and read in the game's functions as
   * `context.slice`, written with `context.set`. For what the game's code
   * keeps that isn't a stat, a kv key or an entity. A save from before the
   * game had one starts it fresh; reshape it in `migrations`.
   */
  start?: (game: Game) => S
  /**
   * The game's own traits, as a plugin declares its: each id without a `/`
   * (`cosy`), with the `check`, `references` and `words` the checker and a
   * translation's `words` table read for every entity that carries it.
   */
  traits?: readonly TraitDef<any, any>[]
  /**
   * What the game's own calls name (`references.calls`, asked of every
   * `game/…` call the checker finds) and the panels its UI draws
   * (`references.panels`), as a plugin's `references` say.
   */
  references?: PluginReferences
  /** Rules of the game's own for the content checker, as a plugin's `check`. Its problems are reported against the base. */
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
}

/**
 * What the game's own hooks, commands and providers are handed besides the
 * state: what a game's function gets (`CustomContext`), `apply` for effects,
 * and in `view` the pool picks and the profile, as a plugin's context has them.
 */
export type RulesContext<S = any> = CustomContext & {
  /** Apply effects as content would, to the state the function was handed, or to `on`. */
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
  /** The game's own state, as `rules.start` began it and `set` last wrote it. Undefined with no `start`. */
  slice: S
  /** The game's own state in the state the function was handed, or in `on`. See `PluginContext.get`. */
  get: (on?: GameState) => S
  /** The state with the game's own state replaced: the state the function was handed, or `on`. */
  set: (next: S, on?: GameState) => GameState
  /** Only in `view`: where the pool picks it makes are written. See `PluginContext.picks`. */
  picks?: Record<string, string>
  /** Blocks drawn as beats, as a scene's body is. See `PluginContext.beats`. */
  beats: (blocks: readonly Block[], id: string) => SceneBeat[]
  /** Only in `view`, with a runner that has a profile: what the profile holds under `game`. */
  profile?: unknown
}

/** A command of the game's own, as `rules.commands` declares it: as a plugin's `PluginCommand`, with the game's context. */
export type RulesCommand<S = any> = {
  /** Run even while a lock would stop it. For tools outside the story, never for something the player does in it. */
  ignoresLocks?: boolean
  /** Why it cannot be done now, as the player reads it; undefined if it can. */
  whyNot?: (state: GameState, args: PluginArgs, context: RulesContext<S>) => string | undefined
  run: (state: GameState, args: PluginArgs, context: RulesContext<S>) => GameState
  /** The effects running it would apply, for guards, prices and locks to see. */
  effectsOf?: (state: GameState, args: PluginArgs, context: RulesContext<S>) => Effect[]
  /** The stats it spends, by id, for its button's price. */
  spends?: (state: GameState, args: PluginArgs, context: RulesContext<S>) => Record<string, number> | undefined
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

/** The fields of a game the core reads itself. The features' (settings, stats, audio, media) are in `features/`. */
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
  /** What a New Game+ carries over from the game before. See `startingState`'s `carry`. */
  carryOver?: CarryOver
  /**
   * When the game counts as finished. The runner records the first time it
   * holds in the profile's `core:finished`, so a title screen can offer New Game+.
   */
  finished?: Condition
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

/**
 * A scene ready to render, by id: the data scene baked the first time it is
 * asked for. Internal; the engine's own tests also hand in scenes already
 * baked, which pass through as they are.
 */
export function bakedScene(game: Game, id: string): Scene | undefined {
  const found: Scene | DataScene | undefined = game.scenes.find((scene) => scene.id === id)
  if (!found) return undefined
  return isDataScene(found) ? bakeScene(game, found) : found
}
