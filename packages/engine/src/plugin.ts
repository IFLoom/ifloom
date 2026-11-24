import type { Game } from './game.ts'
import type { Command, Effect, GameState } from './types.ts'
import { buildEffects, customContext, type CustomContext, type EffectRef } from './custom.ts'
import type { QueryAnswer, QueryArgs, QueryRegistry } from './calls.ts'
// A cycle, and a needed one: applying effects runs plugins' effects and hooks, which apply effects.
import { runEffects } from './reduce.ts'
import type { Block } from './scene.ts'
import type { ActionDef, GameRules } from './game.ts'
import type { TraitDef } from './entities.ts'
import type { Content } from './loader.ts'
import type { Reference } from './references.ts'
import type { SceneUi, Ui } from './features/ui.ts'
import { styledBeats, type SceneBeat } from './sceneBody.ts'
import { blockBeats } from './beats.ts'
import type { MigrationTools } from './intake.ts'
import type { CommandStep, ContentStep } from './upgrade.ts'
import { callShape, readArgs, unfitArg, type AnyCalls, type CallArgs, type PluginData } from './pluginCalls.ts'
import { stringOf } from './strings.ts'

/** What content passes to a plugin's condition, effect or command: `with`. */
export type PluginArgs = Record<string, unknown>

/** Which of a plugin's tables a call is to: its `conditions`, its `effects` or its `commands`. */
export type CallTable = 'conditions' | 'effects' | 'commands'

/**
 * What every plugin function is handed besides the game state: what a game's
 * own functions get (the game, `query`, `value` and `roll`; see
 * `CustomContext`), the plugin's own state, typed, `get` to read it from a
 * later game state and `set` to return the game state with it replaced.
 */
export type PluginContext<S> = CustomContext & {
  /** The plugin's state in the game state the function was handed: `get()`. */
  slice: S
  /**
   * The plugin's state in the state the function was handed, or in `on`, for
   * a function that has already changed the game state (applied effects, say)
   * and wants the plugin's state as it is now. Its starting state (`start`)
   * when the save has none yet. The read that matches `set`.
   */
  get: (on?: GameState) => S
  /**
   * The game state with the plugin's state replaced: on the state the function
   * was handed, or on `on`, for a function that has already changed other parts
   * of the game state and wants the plugin's state written onto that.
   */
  set: (next: S, on?: GameState) => GameState
  /**
   * Apply effects as content would — any effect, a custom one or another
   * plugin's included — to the state the function was handed, or to `on`. How
   * a plugin effect ends a turn: `apply([{ turn: true }])`.
   */
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
  /**
   * Only in `view`: where the pool picks the view makes are written, for the
   * reducer to record. Pass it to `pictureView` so a picture's pick stays the
   * same on every visit (`beats` records its own). Undefined elsewhere.
   */
  picks?: Record<string, string>
  /**
   * Blocks drawn as beats, as a scene's body is drawn: a message's words, a
   * post's, an app's. The blocks whose `when` holds, their words filled in
   * for this save, variants drawn and pools picked under `id` (so a block's
   * pick stays the same on every visit), spoken lines with their speakers,
   * and bold, italics and UI pieces as spans. Inline actions and tooltips stay
   * in the words as written, since only a scene offers choices. In `view`,
   * the pool picks it makes are recorded.
   */
  beats: (blocks: readonly Block[], id: string) => SceneBeat[]
  /**
   * Only in `view`, and only when a runner with a profile builds it: what the
   * plugin's own profile namespace (its id) held when the runner last read or
   * wrote it. Frozen, so read it and never change it. Undefined elsewhere, in
   * a view built by `view(state, game)` alone, and while nothing is stored.
   * Conditions, effects, commands and hooks never see it, so a replay always
   * plays the same.
   */
  profile?: unknown
}

/**
 * What a context is made for, besides the state: `picks` to collect a view's
 * pool picks, `ending` while a turn is ending, so a `turn` effect applied
 * through `apply` does nothing, as one in the turn's own rules does, and
 * `profile`, what a view is shown of the plugin's profile namespace.
 */
export type ContextOptions = { picks?: Record<string, string>; ending?: boolean; profile?: unknown; before?: GameState }

/**
 * What `onTurn` and `onTurnDone` are handed, the game's and every plugin's:
 * the context, with `before`, the state as the turn ended, before the
 * counter moved on and `resets` were put back. Its `apply` ends no turn: a
 * `turn` effect applied here does nothing.
 */
export type TurnContext<S = any> = PluginContext<S> & {
  /** The state as the turn ended, before the counter moved on and `resets` were put back. */
  before: GameState
}

/**
 * An effect that stands for other effects, in a plugin's or the game's
 * `macros`: it works out from the state the effects it stands for and returns
 * them, anything content can write, another macro included. Content calls it
 * as any effect, `{ 'game/payRent': {} }`, and because what it returns is
 * effects, a button's price, the locks and the guards see what it would do
 * before it runs.
 */
export type Macro<S = any, A = PluginArgs> = (state: GameState, args: A, context: PluginContext<S>) => EffectRef[]

/**
 * Why a plugin will not let a command through. A string is a refusal, as a
 * lock's is: the button is greyed out with it. `soft` is a warning instead: the
 * button stays pressable and shows the warning, and the reducer refuses the
 * command all the same — running the clock past dawn, say, where a UI offers
 * bed in its place.
 */
export type Refusal = string | { reason: string; soft: true }

/** What a guard is asked about: the command, and the effects it would apply. */
export type Asked = { command: Command; effects: readonly Effect[] }

/**
 * A system added to the engine: its own state, and the conditions, effects,
 * commands, hooks and view that work on it.
 *
 * Its members follow one naming rule (ADR 0009). A hook runs at an event and
 * returns the next state, and is named `on` and the event: `onTurn`,
 * `onCommand`. A provider answers a question and never changes the state, and
 * is named by the noun it gives: `guard`, `price`, `label`, `scene`,
 * `buttons`, `audio`, `statModifiers`, `view`, `profile`. Tables of
 * named functions (`conditions`, `effects`, `commands`, `queries`, `values`)
 * are plural nouns. Nothing is nested: there is no `hooks: {}`.
 *
 * Content calls a plugin by name with its id in front, `{ 'quests/done':
 * { quest: 'bakery' } }`, as a condition, an effect or a command, the same way
 * it calls the game's own code (`{ 'game/tired': true }`), so games and mods
 * learn one form. A plugin
 * usually exports typed helpers that write those for authors working in code.
 *
 * Plugins are chosen when the game is built (`game.plugins`), never loaded while
 * it runs.
 */
export type Plugin<S = any, V = unknown> = {
  /** Its name, and the prefix on everything it adds. Letters, digits and `-`. */
  id: string
  /**
   * The version of its state's shape. Bump it when the shape changes, and add
   * the step that carries the previous version forward to `migrations`.
   */
  version: number
  /** Its state in a new game. A plugin with no state leaves this out. */
  start?: (game: Game) => S
  /**
   * One step per version, keyed by the version it upgrades *from*, as the
   * engine's own saves are. A save whose state has no route forward is refused.
   * Each step gets the plugin's old state and the same `MigrationTools` a
   * game's migration gets, and returns the plugin's new state.
   */
  migrations?: Record<number, (state: unknown, tools: MigrationTools) => unknown>
  /**
   * The version of the shape of what content and packs write for it: its
   * `data`, its calls' arguments, its strings and its traits. 1 if left out.
   * Bump it when that shape changes, and add the step that carries a pack
   * of the previous version forward to `contentMigrations`. Packs record the
   * version they were written for in `plugins`.
   */
  contentVersion?: number
  /**
   * One step per content version, keyed by the version it upgrades *from*.
   * `upgradePack` runs them on every pack the game loads, mods included,
   * after the engine's own steps for the same schema. A version with no step
   * changed nothing a pack holds. See `ContentStep` and `ContentTools`.
   */
  contentMigrations?: Record<number, ContentStep>
  /**
   * The version of its commands' arguments, as command logs record them.
   * 1 if left out. Bump it when a command is renamed or its arguments change,
   * and add the step to `commandMigrations`, so an old log still replays.
   */
  commandVersion?: number
  /**
   * One step per command version, keyed by the version it upgrades *from*:
   * what `replay` plays an older log's commands through. See `CommandStep`.
   */
  commandMigrations?: Record<number, CommandStep>
  /**
   * Its conditions, effects and commands, each declared once with what it
   * takes (`defineCalls`): the implementations below are handed their
   * arguments read by it, the content checker reports what a call leaves out,
   * gets wrong or names that the game lacks, and a translation reaches the
   * words in a call's arguments. Every declared call has an implementation,
   * and every implementation a declaration.
   */
  calls?: AnyCalls
  /**
   * The lists of its pack `data`, each declared once with its entry's noun
   * and which of its fields are words a player reads (`defineData`), so a
   * translation's `words` table reaches them, keyed
   * `<plugin>/<list>.<id>.<field>`: `quests/quests.coffee.name`.
   */
  data?: PluginData
  /** Conditions content can test, by name, without the prefix. */
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>
  /**
   * Effects content can apply, by name. Each takes the state as the effects
   * before it left it and returns the next one, so two in one list compose.
   * What one does is hidden from prices and guards until it runs; an effect
   * that only stands for other effects is a `macro` instead.
   */
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState>
  /**
   * Effects that stand for other effects, by name, called by content as any
   * effect is: each returns the effects it stands for, worked out from the
   * state, so a button's price and the guards see what it would do. A name is
   * an effect's or a macro's, never both. See `Macro`.
   */
  macros?: Record<string, Macro<S>>
  /** Commands a button can send, by name. */
  commands?: Record<string, PluginCommand<S>>
  /**
   * The plugin's player-facing lines, by name without the prefix, in English.
   * A game overrides one as `strings['<id>/<name>']`; the plugin reads them with
   * `stringOf(game, '<id>/<name>')`.
   */
  strings?: Record<string, string>
  /**
   * Answers other plugins can ask for by name, without importing this one:
   * `context.query('calendar/whenNext', { when })`. For what a condition's yes
   * or no cannot say — a place, a time, a list.
   */
  queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
  /**
   * The plugins this one works with when the game has them, by id. Content may
   * then name their conditions and effects even in a game without them: the
   * loader lets it pass, and the condition is false and the effect does nothing.
   */
  cooperates?: string[]
  /**
   * Changes to what the player's stats read right now, worked out from the
   * plugin's state: a timed boost, say. Nothing is written into the state;
   * every reading of the stat (conditions, derived stats, costs, the view)
   * sees the changed value, and `stat` effects still write the
   * kept value underneath. Must not read stats itself, or it reads itself.
   */
  statModifiers?: (state: GameState, context: PluginContext<S>) => readonly StatModifier[] | undefined
  /**
   * Words and numbers content can read by name, asked with arguments as a
   * condition is: in prose as <code v-pre>{{id/name channel=texts}}</code>,
   * and as `{ value: 'id/name', with }` for a badge or a stat's ceiling.
   */
  values?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | number>
  /**
   * A hook: the end of a turn, once the counter has moved on and `resets` are
   * back, in the order the hooks run (the game's first). Returns the next
   * state. `context.before` is the state as the turn ended, and a `turn`
   * effect applied through `context.apply` does nothing.
   */
  onTurn?: (state: GameState, context: TurnContext<S>) => GameState
  /**
   * A hook: the end of a turn, once every `onTurn` has run, so it sees what
   * they did: the calendar's new day, a status worn off. In the same order
   * and with the same context as `onTurn`. Returns the next state.
   */
  onTurnDone?: (state: GameState, context: TurnContext<S>) => GameState
  /**
   * A hook: one of the player's stats just changed, by a `stat` effect.
   * `before` is the state before it, `after` the state with it, `by` how far
   * it moved. Return `before` to say it did not take, `after` to let it, or
   * `after` with more besides. Runs in the order the hooks run (the
   * game's first), each seeing what the one before returned.
   */
  onStat?: (before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S>) => GameState
  /**
   * A hook: after every command that took, with the state it started from and
   * the state after. The context is the state after. Returns the next state.
   */
  onCommand?: (before: GameState, after: GameState, context: PluginContext<S>) => GameState
  /**
   * Whether a command may go ahead, given what it would do (`effectsOf`).
   * Asked of every command but the ones that ignore locks, after the locks.
   */
  guard?: (state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined
  /**
   * What a button costs that the engine cannot say, in the plugin's words:
   * `['until evening']`. Asked with the effects the button would apply.
   */
  price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
  /** Where the game is, in a few words for a header or a save: "Day 3 · Wednesday morning". */
  label?: (state: GameState, context: PluginContext<S>) => string | undefined
  /**
   * The name a save is listed under, such as the name the player typed, kept
   * as `SaveMeta.playerName` and shown for `@you`'s lines. The first that
   * answers names it (the game's first); with none, saves have no name.
   */
  saveName?: (state: GameState, context: PluginContext<S>) => string | undefined
  /**
   * What the screen shows while no scene is open: a room's description, a
   * shop front, a dashboard's heading. The first plugin that answers fills it;
   * with none, the screen is the game's title and its buttons.
   */
  scene?: (state: GameState, context: PluginContext<S>) => RoomScene | undefined
  /**
   * Actions offered while no scene is open, drawn as buttons before the
   * game's own `actions` and exactly like them: a room's things to do, say.
   */
  actions?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
  /**
   * One of this plugin's actions that isn't among its `actions` now, by id
   * without the prefix: an app's, say. `{ type: 'action', id: '<plugin>/<id>' }`
   * does it, as for a button with a cost or effects, which is looked up
   * among the `actions` when this has none. Undefined when there is none.
   */
  action?: (state: GameState, id: string, context: PluginContext<S>) => ActionDef | undefined
  /**
   * Content the plugin brings, merged first, under the game's content and
   * packs, which can replace anything in it by id: its kinds of entity (the
   * people of a cast, unlisted in the view unless the kind sets `listed`; a
   * game that redeclares one keeps what it leaves out), and any scenes,
   * prose, actions or `data` it ships with.
   */
  content?: Content
  /**
   * Traits this plugin gives meaning to: named data entities carry, written
   * on a kind, an entity or content's `traits` table, which the plugin reads
   * with `declaredTrait`. Each id is the plugin's id, `/` and a name. Data only:
   * what a trait does is the plugin's code.
   */
  traits?: readonly TraitDef<any, any>[]
  /**
   * What plays on background channels, by channel: a place's ambience. Below
   * an open scene's choice and an `audio` effect's, above the game's default.
   * Null silences a channel; a channel left out is the next plugin's, then
   * the default's. The first plugin that names a channel wins it.
   */
  audio?: (state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined
  /** What the UI needs from this plugin, at `view.plugins[id]`. `V` is its type, which `viewIn` reads back. */
  view?: (state: GameState, context: PluginContext<S>) => V
  /**
   * What the plugin keeps in the player's profile, which outlives saves and
   * new games: earned achievements, a gallery of endings. The runner asks it
   * after every command that took, with the state after, the state before and
   * what the plugin's profile namespace (its id) holds now. Return a new value
   * to store, or undefined to leave it. Only a runner with a `profile` asks;
   * `apply` never does.
   */
  profile?: (state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown
  /**
   * What this plugin's calls and content name, for the content checker to
   * resolve as it resolves the engine's own. See `PluginReferences`.
   */
  references?: PluginReferences
  /**
   * Rules of this plugin's own that a reference can't say: two entries with
   * one id, an exit to nowhere. Run by the content checker after the
   * references; `tools` words anything else the plugin names as the checker does.
   */
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
}

/**
 * A change to what one of the player's stats reads, from a plugin's
 * `statModifiers`. A stat's adds are summed and its multipliers multiplied
 * together, and it reads `(value + adds) × multipliers`, held to its range.
 */
export type StatModifier = {
  stat: string
  /** Added to the value. 0 if left out. */
  add?: number
  /** What the value, with the adds, is multiplied by. 1 if left out. */
  multiply?: number
}

/** What the screen shows while no scene is open, from a plugin's `scene`. */
export type RoomScene = {
  /** The heading: a room's name. */
  title: string
  /** What is written there, as a scene's blocks: prose keys, variants, conditions. */
  body?: readonly Block[]
  /**
   * The id its blocks are drawn under. Variants drawn here rotate per id, so a
   * place gives its own id to keep its lines its own. The plugin's id if left out.
   */
  id?: string
  /** Presentation hints for the room, carried to `view.scene.ui` as a scene's are. See `SceneUi`. */
  ui?: Ui<SceneUi>
}

/**
 * What a plugin's calls and content name. The content checker resolves every
 * reference against the game and reports what is missing, worded and placed
 * as its own problems are.
 */
export type PluginReferences = {
  /**
   * What a call to one of its conditions, effects or commands names, by name
   * without the prefix, from what content passes in `with`: a location, a
   * character, a prose key. Asked of every call the checker finds. A rule of
   * the plugin's own about the arguments is a `{ problem }`: `{ problem:
   * 'count must be a whole number' }`.
   */
  calls?: (table: CallTable, name: string, args: PluginArgs, game: Game) => readonly Reference[]
  /**
   * What content opening one of the panels this plugin's UI draws names,
   * from what it is opened with (`{ panel, with }`): `[{ entity:
   * 'vendor:fish', carrying: 'shop/vendor' }]` for `panel: 'shop'`. Answer
   * nothing for a panel that isn't this plugin's; a panel no plugin knows is
   * the UI's business. Asked of every panel the checker finds.
   */
  panels?: (panel: string, args: PluginArgs, game: Game) => readonly Reference[]
  /**
   * What its content names, entry by entry: `{ list: 'locations', id: 'cafe',
   * refs: [...] }`. A problem is reported against `<list> <id>`, and pinned
   * on the pack that entry came from.
   */
  content?: (game: Game) => readonly ContentReferences[]
}

/** What one entry of a plugin's content names. `list` and `id` say where, as a `PluginProblem` does. */
export type ContentReferences = { list: string; id: string; refs: readonly Reference[] }

/** What the content checker lends a plugin's `check`. */
export type CheckTools = {
  /** What these references name that the game doesn't have, in the checker's words. */
  problems: (refs: readonly Reference[]) => string[]
}

/** One entry of a plugin's content in a pack: an id, and whatever fields the plugin reads. */
export type PluginEntry = { id: string; [field: string]: unknown }

/** Something wrong in a plugin's content: which list, which entry, what. */
export type PluginProblem = { list: string; id: string; what: string }

export type PluginCommand<S = any, A = PluginArgs> = {
  /**
   * Run even while a lock would stop it. For tools that stand outside the
   * story — a debugger — never for something the player does in it.
   */
  ignoresLocks?: boolean
  /** Why it cannot be done now, as the player reads it; undefined if it can. */
  whyNot?: (state: GameState, args: A, context: PluginContext<S>) => string | undefined
  run: (state: GameState, args: A, context: PluginContext<S>) => GameState
  /** The effects running it would apply, for guards, prices and locks to see. None if left out. */
  effectsOf?: (state: GameState, args: A, context: PluginContext<S>) => Effect[]
  /**
   * The stats it spends, by id, for its button's price, as an action's
   * `cost.stats` gives them: `{ coins: 4 }`. Only the price shows it; `run`
   * does the spending, and `whyNot` says when there isn't enough. None if left out.
   */
  spends?: (state: GameState, args: A, context: PluginContext<S>) => Record<string, number> | undefined
}

/** A plugin's state as a save keeps it: the shape's version, and the state. */
export type PluginSlice = { version: number; state: unknown }

/** A plugin, plus typed access to its own state. */
export type DefinedPlugin<S, V = unknown> = Plugin<S, V> & {
  /** This plugin's state, or its starting state if the save has none yet. */
  read(state: GameState, game: Game): S
  /** The game state with this plugin's state replaced. */
  write(state: GameState, next: S): GameState
  /**
   * This plugin's slice of a view, `view.plugins[id]`, typed as its `view`
   * returns it. Undefined when the view has none: a game without the plugin,
   * or a plugin with no `view`.
   */
  viewIn(view: { readonly plugins: Readonly<Record<string, unknown>> }): V | undefined
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

/** The context a plugin's functions get, for this game state. */
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
 * A plugin's query by full name, ready to ask. Undefined when the game does
 * not have it. As `context.query`, a name declared in `QueryRegistry` takes
 * its arguments and answers its type; any other takes any arguments, with the
 * answer's type given.
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
 * Is this a name from a plugin the game does not have, but one of its plugins
 * cooperates with? Content may name it; it is simply not there.
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
 * What `definePlugin` takes: a plugin, whose conditions, effects, macros and
 * commands, when it declares its `calls`, are exactly the declared ones, each
 * handed its arguments typed. An effect is in `effects` or `macros`.
 */
export type PluginDef<S, V, C extends AnyCalls> = Omit<Plugin<S, V>, CallTables | 'calls'> &
  ([C] extends [never]
    ? Pick<Plugin<S, V>, CallTables>
    : {
        calls: C
        conditions?: Implemented<S, C, 'conditions', boolean>
        effects?: Partial<Implemented<S, C, 'effects', GameState>>
        macros?: { [K in keyof CallArgs<C, 'effects'>]?: Macro<S, CallArgs<C, 'effects'>[K]> }
        commands?: { [K in keyof CallArgs<C, 'commands'>]: PluginCommand<S, CallArgs<C, 'commands'>[K]> }
      })

/**
 * Declare a plugin. Returns it with `read` and `write` for its own state, and
 * `viewIn` for its slice of a view, for code outside the plugin (tests, a UI)
 * that needs them typed. Name the types, `definePlugin<State, View, typeof
 * CALLS>`, so the view's type is kept and each call's implementation is
 * handed its arguments as `CALLS` (`defineCalls`) declares them.
 *
 * Throws when a declared call has no implementation, or an implemented one no
 * declaration: a mistake in the plugin's code, never in content.
 */
export function definePlugin<S, V = unknown, C extends AnyCalls = never>(def: PluginDef<S, V, C>): DefinedPlugin<S, V> {
  const plugin = def as unknown as Plugin<S, V>
  if (plugin.calls) matchCalls(plugin)
  return {
    ...plugin,
    read: (state, game) => readSlice(plugin, state, game),
    write: (state, next) => writeSlice(plugin, state, next),
    viewIn: (view) => view.plugins[plugin.id] as V | undefined,
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
 * What the checker and `explain` say of a call by name that nobody declares,
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

/** Does any plugin guard or price commands? If none does, nothing needs to know a command's effects. */
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
