import type { Game } from './game.ts'
import type { Command, Effect, GameState } from './types.ts'
import { buildEffects, customContext, type CustomContext, type EffectRef } from './custom.ts'
import type { QueryAnswer, QueryArgs, QueryRegistry } from './calls.ts'
// A cycle, and a needed one: applying effects runs plugins' effects and hooks, which apply effects.
import { runEffects } from './reduce.ts'
import type { Block } from './scene.ts'
import type { ActionDef, GameRules } from './game.ts'
import type { EntityRef, TraitDef } from './entities.ts'
import type { Content } from './loader.ts'
import type { Reference } from './references.ts'
import type { SceneUi, Ui } from './features/ui.ts'
import { styledBeats, type SceneBeat } from './sceneBody.ts'
import { blockBeats } from './beats.ts'
import type { MigrationTools } from './intake.ts'
import type { CommandStep, ContentStep } from './upgrade.ts'
import { callShape, readArgs, unfitArg, type AnyCalls, type CallArgs, type PluginData } from './pluginCalls.ts'
import { stringOf } from './strings.ts'

/** The arguments content passes to a plugin's condition, effect or command, as an object. */
export type PluginArgs = Record<string, unknown>

/** The name of a plugin's table of calls, `conditions`, `effects` or `commands`. */
export type CallTable = 'conditions' | 'effects' | 'commands'

/**
 * The context every plugin function gets besides the game state. It adds the plugin's own state, typed, to the
 * {@link CustomContext} a game's own functions get.
 *
 * `get` reads the plugin's state from a later game state, and `set` returns the game state with it replaced.
 */
export type PluginContext<S> = CustomContext & {
  /** The plugin's state in the game state the function was given, the same as `get()`. */
  slice: S
  /**
   * Returns the plugin's state in the game state the function was given, or in `on`. Its starting state (`start`) when
   * the save has none yet.
   *
   * Pass `on` from a function that has already changed the game state, such as by applying effects, to read the
   * plugin's state as it is now. It is the read that matches `set`.
   */
  get: (on?: GameState) => S
  /**
   * Returns the game state with the plugin's state replaced, on the state the function was given or on `on`. Pass `on`
   * from a function that has already changed other parts of the game state.
   */
  set: (next: S, on?: GameState) => GameState
  /**
   * Returns the state after a list of effects, applied to the state the function was given or to `on`. Any effect
   * works, a custom one or another plugin's included.
   *
   * A plugin's effect ends a turn with `apply([{ turn: true }])`.
   */
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
  /**
   * The record of the pool picks a `view` makes, for the reducer to keep. It is set only in `view`.
   *
   * Pass it to `pictureView` so a picture's pick stays the same on every visit. `beats` records its own.
   */
  picks?: Record<string, string>
  /**
   * Returns blocks rendered as beats, the way a scene's body is, for a message's words, a post's or an app's. Only the
   * blocks whose `when` holds are rendered.
   *
   * Words are filled in for this save, variants and pools drawn under `id` so a block's pick stays the same on every
   * visit, spoken lines given their speakers, and bold, italics and UI pieces made spans. Inline actions and tooltips
   * stay as plain words, since only a scene offers choices. In `view`, the reducer records the pool picks it makes.
   */
  beats: (blocks: readonly Block[], id: string) => SceneBeat[]
  /**
   * The value the plugin's own profile namespace (its id) held when the runner last read or wrote it. It is set only in
   * `view`, when a runner with a profile builds the view.
   *
   * It is frozen, so read it and never change it. It is undefined in a view built by `view(state, game)` alone and while
   * nothing is stored. Conditions, effects, commands and hooks never see it, so a replay always plays the same.
   */
  profile?: unknown
}

/**
 * Settings for `pluginContext` besides the state. `picks` collects a view's pool picks, `ending` makes a `turn` effect
 * do nothing while a turn is ending, and `profile` is the plugin's profile namespace.
 */
export type ContextOptions = { picks?: Record<string, string>; ending?: boolean; profile?: unknown; before?: GameState }

/**
 * The context `onTurn` and `onTurnDone` get, the game's and every plugin's, with `before` added. Its `apply` ends no
 * turn, so a `turn` effect applied through it does nothing.
 */
export type TurnContext<S = any> = PluginContext<S> & {
  /** The state as the turn ended, before the counter moved on and `resets` were put back. */
  before: GameState
}

/**
 * An effect that stands for other effects, in a plugin's or the game's `macros`. It returns those effects from the
 * state, so prices, locks and guards see them before it runs.
 *
 * Content calls it as any effect, `{ 'game/payRent': {} }`. It can return any effect content can write, another macro
 * included.
 */
export type Macro<S = any, A = PluginArgs> = (state: GameState, args: A, context: PluginContext<S>) => EffectRef[]

/**
 * A plugin guard's reason for refusing a command. A string refuses it as a lock does, and the button is disabled with
 * that reason.
 *
 * `{ reason, soft: true }` is a warning instead. The button stays pressable and shows the warning, but the reducer
 * still refuses the command, such as running the clock past dawn, where a UI offers bed in its place.
 */
export type Refusal = string | { reason: string; soft: true }

/** The question a plugin's `guard` gets, a command with the effects it would apply. */
export type Asked = {
  /** The command the guard is asked about. */
  command: Command
  /** The effects the command would apply. */
  effects: readonly Effect[]
}

/**
 * A system added to the engine, with its own state and the conditions, effects, commands, hooks and view that work on
 * it. A game lists its plugins in `plugins` and never loads one later.
 *
 * Its members follow one naming rule. A hook runs at an event, returns the next state and is named `on` and the event
 * (`onTurn`, `onCommand`). A provider answers a question, never changes the state and is named by the noun it gives
 * (`guard`, `price`, `label`, `scene`, `actions`, `audio`, `statModifiers`, `view`, `profile`). Tables of named
 * functions (`conditions`, `effects`, `commands`, `queries`, `values`) are plural nouns, and nothing is nested.
 *
 * Content calls a plugin by name with its id in front, as in `{ 'quests/done': { quest: 'bakery' } }`, the same way it
 * calls the game's own code (`{ 'game/tired': true }`). A plugin's helpers write those calls for authors working in
 * code.
 */
export type Plugin<S = any, V = unknown> = {
  /** The plugin's id, the prefix on everything it adds. It holds letters, digits and `-`. */
  id: string
  /**
   * The version of the plugin's state's shape. Bump it when the shape changes, and add the step that carries the
   * previous version forward to `migrations`.
   */
  version: number
  /** Returns the plugin's state in a new game. A plugin with no state leaves it out. */
  start?: (game: Game) => S
  /**
   * The plugin's state migrations, one step per version, keyed by the version each upgrades from. A save whose state
   * has no route forward is refused.
   *
   * Each step gets the plugin's old state and the same `MigrationTools` a game's migration gets, and returns the
   * plugin's new state.
   */
  migrations?: Record<number, (state: unknown, tools: MigrationTools) => unknown>
  /**
   * The version of the shape of the content and packs written for the plugin, its `data`, calls' arguments, strings and
   * traits. 1 if left out.
   *
   * Bump it when that shape changes, and add the step that carries a pack of the previous version forward to
   * `contentMigrations`. Packs record the version they were written for in `plugins`.
   */
  contentVersion?: number
  /**
   * The plugin's content migrations, one step per content version, keyed by the version each upgrades from. A version
   * with no step changed nothing a pack holds.
   *
   * `upgradePack` runs them on every pack the game loads, mods included, after the engine's own steps for the same
   * schema. See `ContentStep` and `ContentTools`.
   */
  contentMigrations?: Record<number, ContentStep>
  /**
   * The version of the plugin's commands' arguments, which command logs record. 1 if left out.
   *
   * Bump it when a command is renamed or its arguments change, and add the step to `commandMigrations`, so an old log
   * still replays.
   */
  commandVersion?: number
  /**
   * The plugin's command migrations, one step per command version, keyed by the version each upgrades from. `replay`
   * runs an older log's commands through them. See `CommandStep`.
   */
  commandMigrations?: Record<number, CommandStep>
  /**
   * The declaration of the plugin's conditions, effects and commands, each with the arguments it takes, from
   * `defineCalls`. Every declared call needs an implementation, and every implementation a declaration.
   *
   * The implementations get their arguments read by it. The content checker reports a call that leaves an argument out,
   * gets one wrong or names something the game lacks, and a translation reaches the words in a call's arguments.
   */
  calls?: AnyCalls
  /**
   * The declaration of the lists in the plugin's `data`, each with its entry's noun and its fields a player reads, from
   * `defineData`. A translation's `words` table reaches those fields by `<plugin>/<list>.<id>.<field>`, such as
   * `quests/quests.coffee.name`.
   */
  data?: PluginData
  /** The plugin's conditions content can test, by name without the prefix. */
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>
  /**
   * The plugin's effects content can apply, by name without the prefix. Each takes the state the effects before it
   * left and returns the next one, so two in one list compose.
   *
   * Prices and guards can't see what an effect does until it runs. An effect that only stands for other effects belongs
   * in `macros` instead.
   */
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState>
  /**
   * The plugin's macros, effects that stand for other effects, by name without the prefix. A name is an effect's or a
   * macro's, never both.
   *
   * Content calls one as any effect. It returns the effects it stands for, worked out from the state, so a button's
   * price and the guards see what it would do. See `Macro`.
   */
  macros?: Record<string, Macro<S>>
  /** The plugin's commands a choice or action can send, by name without the prefix. */
  commands?: Record<string, PluginCommand<S>>
  /**
   * The plugin's strings, the lines a player reads, by name without the prefix, in English. A game overrides one as
   * `strings['<id>/<name>']`, and the plugin reads them with `stringOf(game, '<id>/<name>')`.
   */
  strings?: Record<string, string>
  /**
   * The plugin's queries, answers other plugins ask for by name without importing it, such as
   * `context.query('calendar/whenNext', { when })`. A query answers what a condition's yes or no can't, such as a
   * location, a time or a list.
   */
  queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
  /**
   * The ids of the plugins this one works with when the game has them. Content may name their calls in a game without
   * them, where the condition is false and the effect does nothing.
   *
   * The content checker lets those calls pass.
   */
  cooperates?: string[]
  /**
   * Returns the changes to what the player's stats read now, worked out from the plugin's state, such as a timed boost.
   * It must not read stats itself, or it reads itself.
   *
   * Nothing is written into the state. Every reading of the stat (conditions, derived stats, costs, the view) sees the
   * changed value, and `stat` effects still write the kept value underneath.
   */
  statModifiers?: (state: GameState, context: PluginContext<S>) => readonly StatModifier[] | undefined
  /**
   * The plugin's values, words and numbers content reads by name with arguments, as a condition is asked. Prose prints
   * one as `{{id/name channel=texts}}`, and an `Amount` reads one as `{ value: 'id/name', with }`.
   */
  values?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | number>
  /**
   * The hook run at the end of a turn, once the counter has moved on and `resets` are back. It returns the next state,
   * and the hooks run in order, the game's first.
   *
   * `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing.
   */
  onTurn?: (state: GameState, context: TurnContext<S>) => GameState
  /**
   * The hook run once every `onTurn` has run, so it sees their changes, such as the calendar's new day. It returns the
   * next state and runs in the same order and context as `onTurn`.
   */
  onTurnDone?: (state: GameState, context: TurnContext<S>) => GameState
  /**
   * The hook run when a `stat` effect changes one of the player's stats. `before` is the state before it, `after` the
   * state with it, and `by` how far it moved.
   *
   * Return `before` to undo the change, `after` to keep it, or `after` with more changes. The hooks run in order, the
   * game's first, each seeing what the one before returned.
   */
  onStat?: (before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S>) => GameState
  /**
   * The hook run after every command that took, with the state before and the state after. It returns the next state,
   * and its context is the state after.
   */
  onCommand?: (before: GameState, after: GameState, context: PluginContext<S>) => GameState
  /**
   * Returns a {@link Refusal} for a command, given the effects it would apply, or undefined to let it through. The
   * engine asks it after the locks, of every command but the ones that ignore locks.
   */
  guard?: (state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined
  /**
   * Returns the plugin's words for what a button costs that the engine can't say, such as `['until evening']`. The
   * engine asks it with the effects the button would apply.
   */
  price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
  /** Returns a few words on the time or place in the game for a header or a save, such as "Day 3 · Wednesday morning". */
  label?: (state: GameState, context: PluginContext<S>) => string | undefined
  /**
   * Returns the name a save is listed under, such as the name the player typed. It is kept as `SaveMeta.playerName` and
   * shown for `@you`'s lines.
   *
   * The first that answers names it, the game's first. With none, saves have no player name.
   */
  saveName?: (state: GameState, context: PluginContext<S>) => string | undefined
  /**
   * Returns the {@link RoomScene} the screen shows while no scene is open, such as a location's description or a
   * dashboard's heading. The first plugin that answers fills it.
   *
   * With none, the room shows the game's title and its actions.
   */
  scene?: (state: GameState, context: PluginContext<S>) => RoomScene | undefined
  /**
   * Returns the actions offered while no scene is open, such as a location's things to do. The view lists them before
   * the game's own `actions`, rendered the same way.
   */
  actions?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
  /**
   * Returns one of the plugin's actions that isn't among its `actions` now, by id without the prefix, such as an app's.
   * Undefined when there is none.
   *
   * `{ type: 'action', id: '<plugin>/<id>' }` runs it, as for an action with a cost or effects. Without this provider,
   * the engine looks the id up among the plugin's `actions`.
   */
  action?: (state: GameState, id: string, context: PluginContext<S>) => ActionDef | undefined
  /**
   * The content the plugin brings, merged first, under the game's content and packs, which can replace anything in it by
   * id.
   *
   * It holds the plugin's kinds of entity, such as the cast's `character`, unlisted in the view unless the kind sets
   * `listed`. A game that redeclares a kind keeps the fields it leaves out. It can also hold scenes, prose, actions or
   * `data`.
   */
  content?: Content
  /**
   * The traits the plugin gives meaning to, each id the plugin's id, `/` and a name. A trait is data only, and the
   * plugin's code decides what it does.
   *
   * Content writes them on a kind, an entity or content's `traits` table, and the plugin reads them with `traitOf` or
   * `declaredTrait`.
   */
  traits?: readonly TraitDef<any, any>[]
  /**
   * Returns the tracks the plugin plays on background channels, by channel, such as a location's ambience. Null
   * silences a channel, and the first plugin that names a channel wins it.
   *
   * A plugin's track is below an open scene's and an `audio` effect's, and above the game's default. A channel left out
   * is the next plugin's, then the default's.
   */
  audio?: (state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined
  /**
   * Returns the plugin's view, which a UI reads at `view.plugins[id]`. Declare its type `V` in `ViewRegistry` under the
   * plugin's id, and every view types `view.plugins[id]` as `V`.
   */
  view?: (state: GameState, context: PluginContext<S>) => V
  /**
   * Returns the value the plugin keeps in the player's profile, which outlives saves and new games, such as earned
   * achievements. Return undefined to leave the stored value.
   *
   * The runner asks it after every command that took, with the state after, the state before and the value the
   * plugin's profile namespace (its id) holds now. Only a runner with a `profile` asks, and `apply` never does.
   */
  profile?: (state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown
  /**
   * The references the plugin's calls and content make, which the content checker resolves as it resolves the
   * engine's own. See `PluginReferences`.
   */
  references?: PluginReferences
  /**
   * Returns the problems the plugin's own rules find that a reference can't express, such as two entries with one id
   * or an exit to nowhere. The content checker runs it after the references.
   *
   * `tools` words problems with anything else the plugin names as the checker does.
   */
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
  /**
   * The plugin's answers to the `receive` and `release` effects and the `owned` condition, for a plugin that keeps
   * things.
   *
   * An inventory or a wardrobe declares one. See `Receiver`.
   */
  receiver?: Receiver<S>
  /**
   * Returns a New Game+'s state with what the plugin carries from the game before laid over it, such as the things
   * the player kept. The plugin starts fresh if left out.
   *
   * `fresh` is the new game's state so far, and `context.get(from)` reads the old game's slice. `context.set` writes the
   * new one, and the plugin may copy an entity made in play with `writeEntity`.
   */
  carry?: (fresh: GameState, from: GameState, context: PluginContext<S>) => GameState
}

/**
 * A plugin that keeps things, as the `receive` and `release` effects and the `owned` condition ask it.
 *
 * The core keeps nothing itself. It asks the game's receivers in the order of the game's `receivers`, else of its
 * `plugins`.
 *
 * `to`, `from` and `of` are someone (`'player'`, `'you'` or a unique entity) or undefined, when the receiver chooses
 * its own default.
 */
export type Receiver<S = any> = {
  /** Returns true when the receiver takes this thing, such as a wardrobe for things that are worn. Every thing if left out. */
  claims?: (state: GameState, ref: EntityRef, context: PluginContext<S>) => boolean
  /** Returns the state with `count` of the thing given to `to`. */
  receive: (state: GameState, ref: EntityRef, count: number, to: string | undefined, context: PluginContext<S>) => GameState
  /** Returns how many of the thing `of` has here. */
  owned: (state: GameState, ref: EntityRef, of: string | undefined, context: PluginContext<S>) => number
  /** Returns the state with `count` of the thing taken from `from`. The core never asks for more than `owned` says. */
  release: (state: GameState, ref: EntityRef, count: number, from: string | undefined, context: PluginContext<S>) => GameState
}

/**
 * A change to what one of the player's stats reads, from a plugin's `statModifiers`. The stat reads
 * `(value + adds) × multipliers`, held to its range, with its adds summed and its multipliers multiplied together.
 */
export type StatModifier = {
  /** The id of the stat the modifier changes. */
  stat: string
  /** The amount added to the stat's value. 0 if left out. */
  add?: number
  /** The factor the stat's value, with the adds, is multiplied by. 1 if left out. */
  multiply?: number
}

/** The screen shown while no scene is open, from a plugin's `scene` provider. */
export type RoomScene = {
  /** The room's title, such as a location's name. */
  title: string
  /**
   * The room's picture, a path in the game's `art/` folder or a URL, such as a location's `image`.
   *
   * The view gives it as `view.scene.image`, which a UI shows with the room, as the React UI does above the words.
   */
  image?: string
  /** The room's body, as a scene's blocks, such as prose keys, variants and conditions. */
  body?: readonly Block[]
  /**
   * The id the room's blocks are rendered under. The plugin's id if left out.
   *
   * Variants drawn here rotate per id, so a location gives its own id to keep its lines its own.
   */
  id?: string
  /** The room's `ui` hints, carried to `view.scene.ui` as a scene's are. See `SceneUi`. */
  ui?: Ui<SceneUi>
}

/**
 * The references a plugin's calls and content make. The content checker resolves each against the game and reports
 * what is missing, worded and placed as its own problems are.
 */
export type PluginReferences = {
  /**
   * Returns the references a call to one of the plugin's conditions, effects or commands makes, by name without the
   * prefix, from the call's arguments. The checker asks it of every call it finds.
   *
   * A reference can be a location, a character or a prose key. A rule of the plugin's own about the arguments is a
   * `{ problem }`, such as `{ problem: 'count must be a whole number' }`.
   */
  calls?: (table: CallTable, name: string, args: PluginArgs, game: Game) => readonly Reference[]
  /**
   * Returns the references opening one of the plugin's panels makes, from its `with`, such as
   * `[{ entity: 'vendor:fish', carrying: 'shop/vendor' }]` for `panel: 'shop'`. The checker asks it of every panel it
   * finds.
   *
   * Return nothing for a panel that isn't the plugin's. A UI checks a panel no plugin claims.
   */
  panels?: (panel: string, args: PluginArgs, game: Game) => readonly Reference[]
  /**
   * Returns the references the plugin's content makes, entry by entry, such as
   * `{ list: 'locations', id: 'cafe', refs: [...] }`. The checker reports a problem against `<list> <id>`, on the pack the
   * entry came from.
   */
  content?: (game: Game) => readonly ContentReferences[]
}

/** The references one entry of a plugin's content makes. */
export type ContentReferences = {
  /** The name of the plugin's list the entry is in. */
  list: string
  /** The entry's id. */
  id: string
  /** The references the entry makes. */
  refs: readonly Reference[]
}

/** The tools the content checker gives a plugin's `check`. */
export type CheckTools = {
  /** Returns the checker's words for each reference in a list that names something the game doesn't have. */
  problems: (refs: readonly Reference[]) => string[]
}

/** One entry of a plugin's content in a pack, with an id and the fields the plugin reads. */
export type PluginEntry = {
  /** The entry's id. */
  id: string
  [field: string]: unknown
}

/** A fault a plugin's `check` finds in its content, with the list and entry it is in. */
export type PluginProblem = {
  /** The name of the plugin's list the entry is in. */
  list: string
  /** The entry's id. */
  id: string
  /** The fault, in the words the report shows. */
  what: string
}

/** A command a plugin declares in its `commands`, with its refusal, its run and what it would apply. */
export type PluginCommand<S = any, A = PluginArgs> = {
  /**
   * The setting that runs the command even while a lock would stop it. Use it for tools outside the story, such as a
   * debugger, never for something the player does in it.
   */
  ignoresLocks?: boolean
  /** Returns the reason the command can't run now, in the player's words, or undefined if it can. */
  whyNot?: (state: GameState, args: A, context: PluginContext<S>) => string | undefined
  /** Returns the state after the command. The engine calls it only when `whyNot` gave no reason. */
  run: (state: GameState, args: A, context: PluginContext<S>) => GameState
  /** Returns the effects running the command would apply, for guards, prices and locks to see. None if left out. */
  effectsOf?: (state: GameState, args: A, context: PluginContext<S>) => Effect[]
  /**
   * Returns the stats the command spends, by id, for its button's price, as an action's `cost.stats` gives them, such as
   * `{ coins: 4 }`. None if left out.
   *
   * Only the price shows it. `run` does the spending, and `whyNot` refuses when there isn't enough.
   */
  spends?: (state: GameState, args: A, context: PluginContext<S>) => Record<string, number> | undefined
}

/** The state a save keeps for one plugin, with the version of its shape. */
export type PluginSlice = {
  /** The plugin's `version` the state was written in. */
  version: number
  /** The plugin's state. */
  state: unknown
}

/** A plugin returned by `definePlugin`, with typed `read` and `write` for its own state. */
export type DefinedPlugin<S, V = unknown> = Plugin<S, V> & {
  /** Returns the plugin's state in a game state, or its starting state if the save has none yet. */
  read(state: GameState, game: Game): S
  /** Returns the game state with the plugin's state replaced. */
  write(state: GameState, next: S): GameState
}

function readSlice<S>(plugin: Plugin<S>, state: GameState, game: Game): S {
  const slice = state.plugins?.[plugin.id]
  if (slice) return slice.state as S
  return plugin.start ? plugin.start(game) : (undefined as S)
}

function writeSlice<S>(plugin: Plugin<S>, state: GameState, next: S): GameState {
  return {
    ...state,
    plugins: { ...state.plugins, [plugin.id]: { version: plugin.version, state: next } },
  }
}

/** Returns the context a plugin's functions get for a game state. */
export function pluginContext<S>(plugin: Plugin<S>, state: GameState, game: Game, options: ContextOptions = {}): PluginContext<S> {
  const context: PluginContext<S> = {
    ...customContext(state, game),
    slice: readSlice(plugin, state, game),
    get: (on = state) => readSlice(plugin, on, game),
    set: (next, on = state) => writeSlice(plugin, on, next),
    apply: (effects, on = state) => runEffects(on, game, buildEffects(game, effects), options.ending ?? false),
    beats: (blocks, id) => styledBeats(blockBeats(state, game, blocks, id, options.picks)),
  }
  if (options.picks) context.picks = options.picks
  if (options.profile !== undefined) context.profile = options.profile
  if (options.before) (context as TurnContext<S>).before = options.before
  return context
}

/**
 * Returns a plugin's query by full name, ready to ask, or undefined when the game doesn't have it.
 *
 * As with `context.query`, a name declared in `QueryRegistry` takes its arguments and answers its type. Any other name
 * takes any arguments, with the answer's type given.
 */
export function pluginQuery<K extends keyof QueryRegistry>(
  game: Game | undefined,
  name: K,
): ((state: GameState, ...args: QueryArgs<K>) => QueryAnswer<K>) | undefined
export function pluginQuery<T = unknown>(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => T) | undefined
export function pluginQuery(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => unknown) | undefined {
  const found = member(game, name, 'queries')
  if (!found || !game) return undefined
  return (state: GameState, args: PluginArgs = {}) => found.fn(state, args, pluginContext(found.plugin, state, game))
}

/**
 * Returns true for a name from a plugin the game doesn't have but one of its plugins cooperates with. Content may name
 * it, and the call is skipped.
 */
export function absentPartner(game: Game | undefined, name: string): boolean {
  const parts = pluginName(name)
  if (!parts || pluginOf(game, parts.plugin)) return false
  return (game?.plugins ?? []).some((plugin) => plugin.cooperates?.includes(parts.plugin))
}

type CallTables = 'conditions' | 'effects' | 'macros' | 'commands'

/** Each declared call in a table, implemented, handed its arguments as the declaration reads them. */
type Implemented<S, C, T extends 'conditions' | 'effects', R> = {
  [K in keyof CallArgs<C, T>]: (state: GameState, args: CallArgs<C, T>[K], context: PluginContext<S>) => R
}

/**
 * The plugin `definePlugin` takes. When it declares its `calls`, its conditions, effects, macros and commands must be
 * exactly the declared ones, each given its arguments typed.
 *
 * A declared effect is implemented in `effects` or `macros`.
 */
export type PluginDef<S, V, C extends AnyCalls> = Omit<Plugin<S, V>, CallTables | 'calls'> & TypedCalls<S, V, C>

/** The call tables of a plugin or the game's rules: as written with no `calls`, else exactly the declared calls, typed. */
type TypedCalls<S, V, C extends AnyCalls> = [C] extends [never]
  ? Pick<Plugin<S, V>, CallTables>
  : {
      calls: C
      conditions?: Implemented<S, C, 'conditions', boolean>
      effects?: Partial<Implemented<S, C, 'effects', GameState>>
      macros?: { [K in keyof CallArgs<C, 'effects'>]?: Macro<S, CallArgs<C, 'effects'>[K]> }
      commands?: { [K in keyof CallArgs<C, 'commands'>]: PluginCommand<S, CallArgs<C, 'commands'>[K]> }
    }

/**
 * The game's rules `defineRules` takes. When they declare their `calls`, their conditions, effects, macros and
 * commands must be exactly the declared ones, each given its arguments typed.
 */
export type RulesDef<S, C extends AnyCalls> = Omit<GameRules<S>, CallTables | 'calls'> & TypedCalls<S, unknown, C>

/**
 * Returns the game's rules as written, with each condition, effect, macro and command handed its arguments as the
 * rules' `calls` declare them.
 *
 * It throws when a declared call has no implementation or an implemented one has no declaration.
 *
 * Declare the calls with `defineCalls('game', …)` and name its type, `defineRules<State, typeof CALLS>`. The content
 * checker then checks every `game/` call content writes against the declaration, as it checks a plugin's.
 */
export function defineRules<S = any, C extends AnyCalls = never>(def: RulesDef<S, C>): GameRules<S> {
  const rules = def as unknown as GameRules<S>
  if (rules.calls) matchCalls({ ...rules, id: GAME_ID, version: 1 } as Plugin)
  return rules
}

/**
 * Returns a plugin with `read` and `write` for its own state, for code outside it such as tests. It throws when a
 * declared call has no implementation or an implemented one has no declaration.
 *
 * Name the types, `definePlugin<State, View, typeof CALLS>`, so the view's type is kept and each call's implementation
 * gets its arguments as `CALLS` (`defineCalls`) declares them. The plugin's view is typed by its `ViewRegistry` entry.
 */
export function definePlugin<S, V = unknown, C extends AnyCalls = never>(def: PluginDef<S, V, C>): DefinedPlugin<S, V> {
  const plugin = def as unknown as Plugin<S, V>
  if (plugin.calls) matchCalls(plugin)
  return {
    ...plugin,
    read: (state, game) => readSlice(plugin, state, game),
    write: (state, next) => writeSlice(plugin, state, next),
  }
}

/** Every declared call implemented, and every implemented one declared; the calls' id the plugin's. */
function matchCalls(plugin: Plugin) {
  const calls = plugin.calls!
  const wrong: string[] = []
  if (calls.id !== plugin.id) wrong.push(`its calls are declared for "${calls.id}"`)
  const pairs: [CallTable, string[]][] = [
    ['conditions', Object.keys(plugin.conditions ?? {})],
    ['effects', [...Object.keys(plugin.effects ?? {}), ...Object.keys(plugin.macros ?? {})]],
    ['commands', Object.keys(plugin.commands ?? {})],
  ]
  for (const [table, implemented] of pairs) {
    const have = new Set(implemented)
    const declared = new Set(Object.keys(calls[table] ?? {}))
    for (const name of declared) if (!have.has(name)) wrong.push(`"${plugin.id}/${name}" is declared in its calls' ${table} but not implemented`)
    for (const name of have) if (!declared.has(name)) wrong.push(`"${plugin.id}/${name}" is implemented but not declared in its calls' ${table}`)
  }
  if (wrong.length) throw new Error(`The plugin "${plugin.id}": ${wrong.join('; ')}.`)
}

/** Content's arguments for one of a plugin's calls, as its implementation is handed them: read by its declaration, or as written for a call it doesn't declare. */
function argsFor(plugin: Plugin, table: CallTable, name: string, args: PluginArgs | undefined): PluginArgs {
  const shape = callShape(plugin.calls, table, name)
  return shape ? readArgs(shape, args) : (args ?? {})
}

/** The plugin id the game's own code answers to: content calls `rules` as `'game/name'`. No plugin can have it. */
export const GAME_ID = 'game'

/** The game's rules as the plugin machinery runs them, per rules object. */
const asPlugins = new WeakMap<GameRules, Plugin>()

/**
 * The game's own code as a plugin with the id `game`, so content calls it as
 * it calls a plugin (`{ 'game/tired': true }`), and every hook and provider of
 * it runs where a plugin's does, first, with a plugin's context. Every member
 * is a plugin's but `migrations`: the game's carry the whole save from one
 * version of the game to the next, so `loadState` runs them after the plugins'
 * own, and the plugin `game` has none. Undefined for a game with no rules.
 */
export function rulesPlugin(game: Game | undefined): Plugin | undefined {
  const rules = game?.rules
  if (!rules) return undefined
  let plugin = asPlugins.get(rules)
  if (!plugin) {
    const { migrations: _migrations, ...members } = rules
    plugin = { ...members, id: GAME_ID, version: 1 }
    asPlugins.set(rules, plugin)
  }
  return plugin
}

/**
 * The game's rules, then its plugins, in the order their hooks and
 * providers run: the game's own code comes first, as if it were the first
 * plugin. Every hook and provider is run over this one list, by the
 * functions below (`runTurnHooks`, `runStatHooks`, `pluginGuards` and the
 * rest), and the plugins' states are started and carried over it too.
 */
export function pluginsOf(game: Game | undefined): readonly Plugin[] {
  const rules = rulesPlugin(game)
  const plugins = game?.plugins ?? []
  return rules ? [rules, ...plugins] : plugins
}

/**
 * Returns the words the checker and `explain` give for a call by name that nobody declares,
 * saying whose it would be: `no game condition named "game/tired"`, `no
 * plugin effect named "quests/finsh"`, with why when the plugin isn't there
 * or the name has no owner in front.
 */
export function missingCall(game: Game | undefined, what: 'condition' | 'effect' | 'command' | 'value', name: string): string {
  const parts = pluginName(name)
  if (!parts) return `no game ${what} named "${name}"; the game's own code is called with "game/" in front, as "game/${name}"`
  if (parts.plugin === GAME_ID) return `no game ${what} named "${name}"`
  const plugin = pluginOf(game, parts.plugin)
  return `no plugin ${what} named "${name}"${plugin ? '' : `; the game has no plugin "${parts.plugin}"`}`
}

/** The plugin with this id, if the game has it; `game` is the game's own rules. */
export function pluginOf(game: Game | undefined, id: string): Plugin | undefined {
  if (id === GAME_ID) return rulesPlugin(game)
  return game?.plugins?.find((plugin) => plugin.id === id)
}

/** Split `quests/done` into the plugin and the name; undefined for a name with no prefix. */
export function pluginName(name: string): { plugin: string; name: string } | undefined {
  const at = name.indexOf('/')
  if (at <= 0) return undefined
  return { plugin: name.slice(0, at), name: name.slice(at + 1) }
}

function member<K extends CallTable | 'macros' | 'values' | 'queries'>(
  game: Game | undefined,
  full: string,
  which: K,
): { plugin: Plugin; fn: NonNullable<Plugin[K]>[string] } | undefined {
  const parts = pluginName(full)
  if (!parts) return undefined
  const plugin = pluginOf(game, parts.plugin)
  const table = plugin?.[which] as Record<string, NonNullable<Plugin[K]>[string]> | undefined
  if (!plugin || !table || !Object.hasOwn(table, parts.name)) return undefined
  return { plugin, fn: table[parts.name] }
}

/** A plugin's condition by full name, ready to call with the game state and `with`. */
export function pluginCondition(game: Game | undefined, name: string) {
  const found = member(game, name, 'conditions')
  if (!found || !game) return undefined
  const own = pluginName(name)!.name
  return (state: GameState, args: PluginArgs = {}) => found.fn(state, argsFor(found.plugin, 'conditions', own, args), pluginContext(found.plugin, state, game))
}

/** A plugin's effect by full name, ready to apply. `ending` while a turn is ending. */
export function pluginEffect(game: Game | undefined, name: string, ending = false) {
  const found = member(game, name, 'effects')
  if (!found || !game) return undefined
  const own = pluginName(name)!.name
  return (state: GameState, args: PluginArgs) =>
    found.fn(state, argsFor(found.plugin, 'effects', own, args), pluginContext(found.plugin, state, game, { ending }))
}

/** A macro by full name, the game's (`game/payRent`) or a plugin's, ready to work out the effects it stands for. */
export function pluginMacro(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => EffectRef[]) | undefined {
  const found = member(game, name, 'macros')
  if (!found || !game) return undefined
  const own = pluginName(name)!.name
  return (state: GameState, args: PluginArgs = {}) => found.fn(state, argsFor(found.plugin, 'effects', own, args), pluginContext(found.plugin, state, game))
}

/** A plugin's command by full name: why not, and run. */
export function pluginCommand(game: Game | undefined, name: string) {
  const found = member(game, name, 'commands')
  if (!found || !game) return undefined
  const { plugin, fn } = found
  const own = pluginName(name)!.name
  const read = (args: PluginArgs | undefined) => argsFor(plugin, 'commands', own, args)
  const shape = callShape(plugin.calls, 'commands', own)
  /** A command sent with an argument its declaration doesn't take that way is refused: a UI or a log built it wrong. */
  const unfit = (args: PluginArgs | undefined) => {
    const wrong = shape && unfitArg(shape, args)
    return wrong ? stringOf(game, 'badArgument', wrong) : undefined
  }
  return {
    ignoresLocks: Boolean(fn.ignoresLocks),
    whyNot: (state: GameState, args: PluginArgs) => fn.whyNot?.(state, read(args), pluginContext(plugin, state, game)) ?? unfit(args),
    effectsOf: (state: GameState, args: PluginArgs) => fn.effectsOf?.(state, read(args), pluginContext(plugin, state, game)) ?? [],
    spends: (state: GameState, args: PluginArgs) => fn.spends?.(state, read(args), pluginContext(plugin, state, game)),
    run: (state: GameState, args: PluginArgs) => fn.run(state, read(args), pluginContext(plugin, state, game)),
  }
}

/** A plugin's value by full name, ready to ask with arguments. */
export function pluginValue(game: Game | undefined, name: string) {
  const found = member(game, name, 'values')
  if (!found || !game) return undefined
  return (state: GameState, args: PluginArgs = {}) => found.fn(state, args, pluginContext(found.plugin, state, game))
}

/** Every `onTurn` hook, the game's then each plugin's, as a turn ends: `before` is the state the turn ended on, and an effect they apply can end no turn. */
export function runTurnHooks(game: Game, state: GameState, before: GameState = state): GameState {
  let next = state
  for (const plugin of pluginsOf(game)) {
    if (plugin.onTurn) next = plugin.onTurn(next, pluginContext(plugin, next, game, { ending: true, before }) as TurnContext)
  }
  return next
}

/** Every `onTurnDone` hook, the game's then each plugin's, once the turn's `onTurn` hooks have all run. */
export function runTurnDoneHooks(game: Game, state: GameState, before: GameState = state): GameState {
  let next = state
  for (const plugin of pluginsOf(game)) {
    if (plugin.onTurnDone) next = plugin.onTurnDone(next, pluginContext(plugin, next, game, { ending: true, before }) as TurnContext)
  }
  return next
}

/** Every `onStat` hook, the game's then each plugin's, on a stat the player just had changed: each gets what the one before returned. */
export function runStatHooks(game: Game, before: GameState, after: GameState, stat: string, by: number): GameState {
  let next = after
  for (const plugin of pluginsOf(game)) {
    if (plugin.onStat) next = plugin.onStat(before, next, stat, by, pluginContext(plugin, next, game))
  }
  return next
}

/** Every `onCommand` hook, the game's then each plugin's. */
export function runCommandHooks(game: Game, before: GameState, after: GameState): GameState {
  let next = after
  for (const plugin of pluginsOf(game)) {
    if (plugin.onCommand) next = plugin.onCommand(before, next, pluginContext(plugin, next, game))
  }
  return next
}

/** Every refusal the plugins' guards give this command, hard or soft, in plugin order. */
export function pluginGuards(game: Game, state: GameState, asked: Asked): Refusal[] {
  const out: Refusal[] = []
  for (const plugin of pluginsOf(game)) {
    const refusal = plugin.guard?.(state, asked, pluginContext(plugin, state, game))
    if (refusal !== undefined) out.push(refusal)
  }
  return out
}

/** Every plugin's stat modifiers for this state, in plugin order. */
export function pluginStatModifiers(game: Game, state: GameState): StatModifier[] {
  const out: StatModifier[] = []
  for (const plugin of pluginsOf(game)) {
    if (plugin.statModifiers) out.push(...(plugin.statModifiers(state, pluginContext(plugin, state, game)) ?? []))
  }
  return out
}

/** Every plugin's notes on what these effects cost, in plugin order. */
export function pluginPrices(game: Game, state: GameState, effects: readonly Effect[]): string[] {
  return pluginsOf(game).flatMap((plugin) => plugin.price?.(state, effects, pluginContext(plugin, state, game)) ?? [])
}

/** Every plugin's label, joined: where the game is, or null if no plugin says. */
export function pluginLabel(game: Game, state: GameState): string | null {
  const parts = pluginsOf(game).flatMap((plugin) => plugin.label?.(state, pluginContext(plugin, state, game)) || [])
  return parts.length ? parts.join(' · ') : null
}

/** The name a save is listed under: the first that answers, the game's `saveName` then each plugin's, or null. */
export function pluginSaveName(game: Game, state: GameState): string | null {
  for (const plugin of pluginsOf(game)) {
    const name = plugin.saveName?.(state, pluginContext(plugin, state, game))
    if (name) return name
  }
  return null
}

/** The first plugin's room scene, with the id its blocks are drawn under, or undefined if none answers. */
export function pluginScene(game: Game, state: GameState): (RoomScene & { id: string }) | undefined {
  for (const plugin of pluginsOf(game)) {
    const scene = plugin.scene?.(state, pluginContext(plugin, state, game))
    if (scene) return { ...scene, id: scene.id ?? plugin.id }
  }
  return undefined
}

/** Every plugin's actions, in plugin order, with the id of the plugin that offers each. */
export function pluginActions(game: Game, state: GameState): { action: ActionDef; owner: string }[] {
  return pluginsOf(game).flatMap((plugin) =>
    (plugin.actions?.(state, pluginContext(plugin, state, game)) ?? []).map((action) => ({ action, owner: plugin.id })),
  )
}

/** Returns true when any plugin guards or prices commands. If none does, nothing needs a command's effects. */
export function pluginsWatch(game: Game): boolean {
  return pluginsOf(game).some((plugin) => plugin.guard || plugin.price)
}

/** What the plugins put on background channels: for each channel, the first plugin's that names it. */
export function pluginAudio(game: Game, state: GameState): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const plugin of pluginsOf(game)) {
    const audio = plugin.audio?.(state, pluginContext(plugin, state, game))
    for (const [channel, track] of Object.entries(audio ?? {})) {
      if (track !== undefined && !Object.hasOwn(out, channel)) out[channel] = track
    }
  }
  return out
}

/**
 * Every plugin's view, by id. The pool picks they make are written into
 * `picks`. `profile` is what the runner holds of the profile, by namespace;
 * each view sees only its own.
 */
export function pluginViews(
  state: GameState,
  game: Game,
  picks: Record<string, string> = {},
  profile?: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const plugin of pluginsOf(game)) {
    if (plugin.view) out[plugin.id] = pluginView(plugin, state, game, picks, profile?.[plugin.id])
  }
  return out
}

/** One plugin's view, with what its profile namespace holds. Undefined for a plugin with no view. */
export function pluginView(plugin: Plugin, state: GameState, game: Game, picks: Record<string, string>, stored: unknown): unknown {
  return plugin.view?.(state, pluginContext(plugin, state, game, { picks, profile: stored }))
}
