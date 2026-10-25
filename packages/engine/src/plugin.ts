import type { Game } from './game.ts'
import type { Command, Effect, GameState } from './types.ts'
import { buildEffects, customContext, type CustomContext, type EffectRef } from './custom.ts'
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

/** What content passes to a plugin's condition, effect or command: `with`. */
export type PluginArgs = Record<string, unknown>

/** Which of a plugin's tables a call is to: its `conditions`, its `effects` or its `commands`. */
export type CallTable = 'conditions' | 'effects' | 'commands'

/**
 * What every plugin function is handed besides the game state: what a game's
 * own functions get (the game, `query`, `value` and `roll`; see
 * `CustomContext`), the plugin's own state, typed, and `set` to return the
 * game state with the plugin's state replaced.
 */
export type PluginContext<S> = CustomContext & {
  slice: S
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
   * reducer to record. Pass it to `stageView` so a stage's pick stays the
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
export type ContextOptions = { picks?: Record<string, string>; ending?: boolean; profile?: unknown }

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
 * is named by the noun it gives: `guard`, `price`, `label`, `stage`,
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
  /** Conditions content can test, by name, without the prefix. */
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>
  /**
   * Effects content can apply, by name. Each takes the state as the effects
   * before it left it and returns the next one, so two in one list compose.
   */
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState>
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
   * condition is: in prose as <code v-pre>{{v:id/name channel=texts}}</code>,
   * and as `{ value: 'id/name', with }` for a badge or a stat's ceiling.
   */
  values?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | number>
  /** A hook: at the start of each turn, after the game's own `rules.onTurn` and before any `onTurnDone`. Returns the next state. */
  onTurn?: (state: GameState, context: PluginContext<S>) => GameState
  /**
   * A hook: the end of a turn, once every plugin's `onTurn` has run (and the
   * game's `rules.onTurnDone`), so it sees what they did: the calendar's new
   * day, a status worn off. Returns the next state.
   */
  onTurnDone?: (state: GameState, context: PluginContext<S>) => GameState
  /**
   * A hook: one of the player's stats just changed, by a `stat` effect.
   * `before` is the state before it, `after` the state with it, `by` how far
   * it moved. Return `before` to say it did not take, `after` to let it, or
   * `after` with more besides. Runs after the game's `rules.onStat`, in
   * plugin order, each seeing what the one before returned.
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
   * What the screen shows while no scene is open: a room's description, a
   * shop front, a dashboard's heading. The first plugin that answers fills it;
   * with none, the screen is the game's title and its buttons.
   */
  stage?: (state: GameState, context: PluginContext<S>) => StageDef | undefined
  /**
   * Buttons offered while no scene is open, drawn before the game's own
   * `actions` and exactly like them: a room's things to do, say.
   */
  buttons?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
  /**
   * One of this plugin's actions that isn't among its buttons now, by id
   * without the prefix: an app's, say. `{ type: 'action', id: '<plugin>/<id>' }`
   * does it, as for a button with a cost or effects, which is looked up
   * among the buttons when this has none. Undefined when there is none.
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
   * with `traitOf`. Each id is the plugin's id, `/` and a name. Data only:
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
  /**
   * What is wrong with how content calls one of this plugin's conditions,
   * effects or commands, by name without the prefix, by a rule of the
   * plugin's own: `['nobody sells "fish"']`. Names it can say as references
   * belong in `references.calls` instead. Asked of every call the checker finds.
   */
  argProblems?: (table: CallTable, name: string, args: PluginArgs, game: Game) => string[]
  /**
   * What is wrong with what content opens a panel with (`{ panel,
   * with }`), for the panels this plugin's UI draws: `['unknown vendor
   * "fish"']` for `panel: 'shop'`. Answer `[]` for a panel that isn't this
   * plugin's; a panel no plugin knows is the UI's business. `tools` words the
   * ids it names as the checker does. Asked of every panel effect the checker finds.
   */
  panelProblems?: (panel: string, args: PluginArgs, game: Game, tools: CheckTools) => string[]
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

/** What the screen shows while no scene is open, from a plugin's `stage`. */
export type StageDef = {
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
   * character, a prose key. Asked of every call the checker finds.
   */
  calls?: (table: CallTable, name: string, args: PluginArgs, game: Game) => readonly Reference[]
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

export type PluginCommand<S = any> = {
  /**
   * Run even while a lock would stop it. For tools that stand outside the
   * story — a debugger — never for something the player does in it.
   */
  ignoresLocks?: boolean
  /** Why it cannot be done now, as the player reads it; undefined if it can. */
  whyNot?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | undefined
  run: (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState
  /** The effects running it would apply, for guards, prices and locks to see. None if left out. */
  effectsOf?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => Effect[]
  /**
   * The stats it spends, by id, for its button's price, as an action's
   * `cost.stats` gives them: `{ coins: 4 }`. Only the price shows it; `run`
   * does the spending, and `whyNot` says when there isn't enough. None if left out.
   */
  spends?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => Record<string, number> | undefined
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
    set: (next, on = state) => writeSlice(plugin, on, next),
    apply: (effects, on = state) => runEffects(on, game, buildEffects(on, game, effects), options.ending ?? false),
    beats: (blocks, id) => styledBeats(blockBeats(state, game, blocks, id, options.picks)),
  }
  if (options.picks) context.picks = options.picks
  if (options.profile !== undefined) context.profile = options.profile
  return context
}

/** The context the game's own hooks are handed, for this state: as a plugin's, with no state of its own. */
export function rulesContext(state: GameState, game: Game): PluginContext<undefined> {
  return pluginContext(rulesPlugin(game) ?? { id: GAME_ID, version: 1 }, state, game)
}

/** A plugin's query by full name, ready to ask. Undefined when the game does not have it. */
export function pluginQuery(game: Game | undefined, name: string) {
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
  if (!parts || pluginById(game, parts.plugin)) return false
  return (game?.plugins ?? []).some((plugin) => plugin.cooperates?.includes(parts.plugin))
}

/**
 * Declare a plugin. Returns it with `read` and `write` for its own state, and
 * `viewIn` for its slice of a view, for code outside the plugin (tests, a UI)
 * that needs them typed. Name both types, `definePlugin<State, View>`, so the
 * view's type is kept.
 */
export function definePlugin<S, V = unknown>(plugin: Plugin<S, V>): DefinedPlugin<S, V> {
  return {
    ...plugin,
    read: (state, game) => readSlice(plugin, state, game),
    write: (state, next) => writeSlice(plugin, state, next),
    viewIn: (view) => view.plugins[plugin.id] as V | undefined,
  }
}

/** The plugin id the game's own code answers to: content calls `rules` as `'game/name'`. No plugin can have it. */
export const GAME_ID = 'game'

/** The game's rules as the plugin machinery runs them, per rules object. */
const asPlugins = new WeakMap<GameRules, Plugin>()

/**
 * The game's own code as a plugin with the id `game`, so content calls it as
 * it calls a plugin (`{ 'game/tired': true }`), and its hooks and providers run
 * where a plugin's do. Its turn hooks, stat hook and effects are run by the
 * engine itself; see `endTurn`, the `stat` effect and `customEffect`.
 * Undefined for a game with no rules.
 */
export function rulesPlugin(game: Game | undefined): Plugin | undefined {
  const rules = game?.rules
  if (!rules) return undefined
  let plugin = asPlugins.get(rules)
  if (!plugin) {
    const { onTurn: _onTurn, onTurnDone: _onTurnDone, onStat: _onStat, effects: _effects, migrations: _migrations, saveName: _saveName, ...members } = rules
    plugin = { ...(members as Omit<Plugin, 'id' | 'version'>), id: GAME_ID, version: 1 }
    asPlugins.set(rules, plugin)
  }
  return plugin
}

/**
 * The game's rules, then its plugins, in the order their hooks and
 * providers run: the game's own code comes first, as if it were the first
 * plugin.
 */
export function pluginsOf(game: Game | undefined): readonly Plugin[] {
  const rules = rulesPlugin(game)
  const plugins = game?.plugins ?? []
  return rules ? [rules, ...plugins] : plugins
}

/** The plugin with this id, if the game has it; `game` is the game's own rules. */
export function pluginById(game: Game | undefined, id: string): Plugin | undefined {
  if (id === GAME_ID) return rulesPlugin(game)
  return game?.plugins?.find((plugin) => plugin.id === id)
}

/** Split `quests/done` into the plugin and the name; undefined for a name with no prefix. */
export function pluginName(name: string): { plugin: string; name: string } | undefined {
  const at = name.indexOf('/')
  if (at <= 0) return undefined
  return { plugin: name.slice(0, at), name: name.slice(at + 1) }
}

function member<K extends CallTable | 'values' | 'queries'>(
  game: Game | undefined,
  full: string,
  which: K,
): { plugin: Plugin; fn: NonNullable<Plugin[K]>[string] } | undefined {
  const parts = pluginName(full)
  if (!parts) return undefined
  const plugin = pluginById(game, parts.plugin)
  const table = plugin?.[which] as Record<string, NonNullable<Plugin[K]>[string]> | undefined
  if (!plugin || !table || !Object.hasOwn(table, parts.name)) return undefined
  return { plugin, fn: table[parts.name] }
}

/** A plugin's condition by full name, ready to call with the game state and `with`. */
export function pluginCondition(game: Game | undefined, name: string) {
  const found = member(game, name, 'conditions')
  if (!found || !game) return undefined
  return (state: GameState, args: PluginArgs = {}) => found.fn(state, args, pluginContext(found.plugin, state, game))
}

/** A plugin's effect by full name, ready to apply. `ending` while a turn is ending. */
export function pluginEffect(game: Game | undefined, name: string, ending = false) {
  const found = member(game, name, 'effects')
  if (!found || !game) return undefined
  return (state: GameState, args: PluginArgs) => found.fn(state, args, pluginContext(found.plugin, state, game, { ending }))
}

/** A plugin's command by full name: why not, and run. */
export function pluginCommand(game: Game | undefined, name: string) {
  const found = member(game, name, 'commands')
  if (!found || !game) return undefined
  const { plugin, fn } = found
  return {
    ignoresLocks: Boolean(fn.ignoresLocks),
    whyNot: (state: GameState, args: PluginArgs) => fn.whyNot?.(state, args, pluginContext(plugin, state, game)),
    effectsOf: (state: GameState, args: PluginArgs) => fn.effectsOf?.(state, args, pluginContext(plugin, state, game)) ?? [],
    spends: (state: GameState, args: PluginArgs) => fn.spends?.(state, args, pluginContext(plugin, state, game)),
    run: (state: GameState, args: PluginArgs) => fn.run(state, args, pluginContext(plugin, state, game)),
  }
}

/** A plugin's value by full name, ready to ask with arguments. */
export function pluginValue(game: Game | undefined, name: string) {
  const found = member(game, name, 'values')
  if (!found || !game) return undefined
  return (state: GameState, args: PluginArgs = {}) => found.fn(state, args, pluginContext(found.plugin, state, game))
}

/** Every plugin's `onTurn` hook, in the order the game lists them, as a turn ends: an effect they apply can end no turn. */
export function runTurnHooks(game: Game, state: GameState): GameState {
  let next = state
  for (const plugin of game.plugins ?? []) {
    if (plugin.onTurn) next = plugin.onTurn(next, pluginContext(plugin, next, game, { ending: true }))
  }
  return next
}

/** Every plugin's `onTurnDone` hook, in order, once the turn's `onTurn` hooks have all run. */
export function runTurnDoneHooks(game: Game, state: GameState): GameState {
  let next = state
  for (const plugin of game.plugins ?? []) {
    if (plugin.onTurnDone) next = plugin.onTurnDone(next, pluginContext(plugin, next, game, { ending: true }))
  }
  return next
}

/** Every plugin's `onStat` hook, in order, on a stat the player just had changed: each gets what the one before returned. */
export function runStatHooks(game: Game, before: GameState, after: GameState, stat: string, by: number): GameState {
  let next = after
  for (const plugin of game.plugins ?? []) {
    if (plugin.onStat) next = plugin.onStat(before, next, stat, by, pluginContext(plugin, next, game))
  }
  return next
}

/** Every plugin's `onCommand` hook, in order. */
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

/** The first plugin's stage, with the id its blocks are drawn under, or undefined if none answers. */
export function pluginStage(game: Game, state: GameState): (StageDef & { id: string }) | undefined {
  for (const plugin of pluginsOf(game)) {
    const stage = plugin.stage?.(state, pluginContext(plugin, state, game))
    if (stage) return { ...stage, id: stage.id ?? plugin.id }
  }
  return undefined
}

/** Every plugin's buttons, in plugin order, with the id of the plugin that offers each. */
export function pluginButtons(game: Game, state: GameState): { action: ActionDef; owner: string }[] {
  return pluginsOf(game).flatMap((plugin) =>
    (plugin.buttons?.(state, pluginContext(plugin, state, game)) ?? []).map((action) => ({ action, owner: plugin.id })),
  )
}

/** What a plugin says is wrong with how content calls it, by full name; nothing for a name with no plugin behind it. */
export function pluginArgProblems(game: Game, table: CallTable, full: string, args: PluginArgs): string[] {
  const parts = pluginName(full)
  if (!parts) return []
  return pluginById(game, parts.plugin)?.argProblems?.(table, parts.name, args, game) ?? []
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
