import type { Game } from './game.ts'
import type { Command, Effect, GameState } from './types.ts'
import type { EffectRef } from './custom.ts'
import type { Block } from './scene.ts'
import type { ActionDef } from './game.ts'
import type { EntityDef, KindDef } from './entities.ts'
import type { Reference } from './references.ts'

/** What content passes to a plugin's condition, effect or command: `with`. */
export type PluginArgs = Record<string, unknown>

/**
 * What every plugin function is handed besides the game state: the game, the
 * plugin's own state, typed, and `set` to return the game state with the
 * plugin's state replaced.
 */
export type PluginContext<S> = {
  game: Game
  slice: S
  /**
   * The game state with the plugin's state replaced: on the state the function
   * was handed, or on `on`, for a function that has already changed other parts
   * of the game state and wants the plugin's state written onto that.
   */
  set: (next: S, on?: GameState) => GameState
  /**
   * Ask another plugin something by its full name: `query('places/here')`.
   * Undefined when the game does not have that plugin, so a plugin can work
   * with a partner when it is there and without it when it is not.
   */
  query: <T = unknown>(name: string, args?: PluginArgs) => T | undefined
  /**
   * Apply effects as content would — any effect, a custom one or another
   * plugin's included — to the state the function was handed, or to `on`. How
   * a plugin effect ends a turn: `apply([{ kind: 'turn' }])`.
   */
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
}

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
 * Content calls a plugin by name with its id in front — `{ custom: 'quests/done',
 * with: { quest: 'bakery' } }` as a condition or effect, `{ type: 'custom', name:
 * 'quests/track', with: { quest: 'bakery' } }` as a command — the same way it
 * calls the game's own named code, so games and mods learn one form. A plugin
 * usually exports typed helpers that write those for authors working in code.
 *
 * Plugins are chosen when the game is built (`game.plugins`), never loaded while
 * it runs.
 */
export type Plugin<S = any> = {
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
   */
  migrations?: Record<number, (state: unknown) => unknown>
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
   * `say(game, '<id>/<name>')`.
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
  /** Words and numbers prose can print with <code v-pre>{{v:id/name}}</code>. */
  values?: Record<string, (state: GameState, context: PluginContext<S>) => string | number>
  hooks?: {
    /** At the start of each turn, after the game's own `onTurn`. */
    turn?: (state: GameState, context: PluginContext<S>) => GameState
    /** After every command that took, with the state it started from. The context is the state after. */
    after?: (before: GameState, after: GameState, context: PluginContext<S>) => GameState
  }
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
   * Who a scene's `speaker` id is, for the screen: a name and a face. The first
   * plugin that answers is believed; with none, a scene has no speaker shown.
   */
  speaker?: (id: string, state: GameState, context: PluginContext<S>) => SpeakerView | undefined
  /** Kinds of entity this plugin brings: the people of a cast. A game may redeclare one by id. */
  kinds?: readonly KindDef[]
  /**
   * Entities there at the start, made from the plugin's content when the game
   * is loaded. One the game declares itself, with the same kind and id, wins.
   */
  entities?: (game: Game) => readonly EntityDef[]
  /**
   * What plays on background channels, by channel: a place's ambience. Below
   * an open scene's choice and an `audio` effect's, above the game's default.
   * Null silences a channel; a channel left out is the next plugin's, then
   * the default's. The first plugin that names a channel wins it.
   */
  audio?: (state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined
  /** What the UI needs from this plugin, at `view.plugins[id]`. */
  view?: (state: GameState, context: PluginContext<S>) => unknown
  /**
   * What the plugin keeps in the player's profile, which outlives saves and
   * new games: earned achievements, a gallery of endings. The runner calls
   * `onCommand` after every command that took, with what the plugin's profile
   * namespace (its id) holds now. Return a new value to store, or undefined to
   * leave it. Only a runner with a `profile` calls it; `apply` never does.
   */
  profile?: {
    onCommand?: (state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown
  }
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
  argProblems?: (kind: 'conditions' | 'effects' | 'commands', name: string, args: PluginArgs, game: Game) => string[]
}

/** Who is speaking in a scene, as the screen draws them. */
export type SpeakerView = {
  id: string
  name: string
  /** A colour for their lines, as a hue from 0 to 360; null for the UI's own. */
  hue: number | null
  /** Their picture; null for none. */
  portrait: string | null
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
  calls?: (kind: 'conditions' | 'effects' | 'commands', name: string, args: PluginArgs, game: Game) => readonly Reference[]
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
}

/** A plugin's state as a save keeps it: the shape's version, and the state. */
export type PluginSlice = { version: number; state: unknown }

/** A plugin, plus typed access to its own state. */
export type DefinedPlugin<S> = Plugin<S> & {
  /** This plugin's state, or its starting state if the save has none yet. */
  read(state: GameState, game: Game): S
  /** The game state with this plugin's state replaced. */
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

/** The context a plugin's functions get, for this game state. */
export function pluginContext<S>(plugin: Plugin<S>, state: GameState, game: Game): PluginContext<S> {
  return {
    game,
    slice: readSlice(plugin, state, game),
    set: (next, on = state) => writeSlice(plugin, on, next),
    query: <T,>(name: string, args: PluginArgs = {}) => pluginQuery(game, name)?.(state, args) as T | undefined,
    apply: (effects, on = state) => applier!(on, game, effects),
  }
}

/**
 * How `apply` runs effects. Set by the reducer when it loads, so this module
 * need not import it: the reducer imports this one.
 */
let applier: ((state: GameState, game: Game, effects: readonly EffectRef[]) => GameState) | null = null

/** The reducer hands over how it applies effects. Called once, by reduce.ts. */
export function useApplier(fn: (state: GameState, game: Game, effects: readonly EffectRef[]) => GameState): void {
  applier = fn
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
 * Declare a plugin. Returns it with `read` and `write` for its own state, for
 * code outside the plugin — tests, a UI — that needs it typed.
 */
export function definePlugin<S>(plugin: Plugin<S>): DefinedPlugin<S> {
  return {
    ...plugin,
    read: (state, game) => readSlice(plugin, state, game),
    write: (state, next) => writeSlice(plugin, state, next),
  }
}

/** The plugin with this id, if the game has it. */
export function pluginById(game: Game | undefined, id: string): Plugin | undefined {
  return game?.plugins?.find((plugin) => plugin.id === id)
}

/** Split `quests/done` into the plugin and the name; undefined for a name with no prefix. */
export function pluginName(name: string): { plugin: string; name: string } | undefined {
  const at = name.indexOf('/')
  if (at <= 0) return undefined
  return { plugin: name.slice(0, at), name: name.slice(at + 1) }
}

function member<K extends 'conditions' | 'effects' | 'commands' | 'values' | 'queries'>(
  game: Game | undefined,
  full: string,
  kind: K,
): { plugin: Plugin; fn: NonNullable<Plugin[K]>[string] } | undefined {
  const parts = pluginName(full)
  if (!parts) return undefined
  const plugin = pluginById(game, parts.plugin)
  const table = plugin?.[kind] as Record<string, NonNullable<Plugin[K]>[string]> | undefined
  if (!plugin || !table || !Object.hasOwn(table, parts.name)) return undefined
  return { plugin, fn: table[parts.name] }
}

/** A plugin's condition by full name, ready to call with the game state and `with`. */
export function pluginCondition(game: Game | undefined, name: string) {
  const found = member(game, name, 'conditions')
  if (!found || !game) return undefined
  return (state: GameState, args: PluginArgs) => found.fn(state, args, pluginContext(found.plugin, state, game))
}

/** A plugin's effect by full name, ready to apply. */
export function pluginEffect(game: Game | undefined, name: string) {
  const found = member(game, name, 'effects')
  if (!found || !game) return undefined
  return (state: GameState, args: PluginArgs) => found.fn(state, args, pluginContext(found.plugin, state, game))
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
    run: (state: GameState, args: PluginArgs) => fn.run(state, args, pluginContext(plugin, state, game)),
  }
}

/** A plugin's value by full name. */
export function pluginValue(game: Game | undefined, name: string) {
  const found = member(game, name, 'values')
  if (!found || !game) return undefined
  return (state: GameState) => found.fn(state, pluginContext(found.plugin, state, game))
}

/** Run one hook on every plugin that has it, in the order the game lists them. */
export function runHooks(
  game: Game,
  hook: 'turn',
  state: GameState,
): GameState {
  let next = state
  for (const plugin of game.plugins ?? []) {
    const fn = plugin.hooks?.[hook]
    if (fn) next = fn(next, pluginContext(plugin, next, game))
  }
  return next
}

/** Every plugin's `after` hook, in order. */
export function runAfter(game: Game, before: GameState, after: GameState): GameState {
  let next = after
  for (const plugin of game.plugins ?? []) {
    const fn = plugin.hooks?.after
    if (fn) next = fn(before, next, pluginContext(plugin, next, game))
  }
  return next
}

/** Every refusal the plugins' guards give this command, hard or soft, in plugin order. */
export function pluginGuards(game: Game, state: GameState, asked: Asked): Refusal[] {
  const out: Refusal[] = []
  for (const plugin of game.plugins ?? []) {
    const refusal = plugin.guard?.(state, asked, pluginContext(plugin, state, game))
    if (refusal !== undefined) out.push(refusal)
  }
  return out
}

/** Every plugin's notes on what these effects cost, in plugin order. */
export function pluginPrices(game: Game, state: GameState, effects: readonly Effect[]): string[] {
  return (game.plugins ?? []).flatMap((plugin) => plugin.price?.(state, effects, pluginContext(plugin, state, game)) ?? [])
}

/** Every plugin's label, joined: where the game is, or null if no plugin says. */
export function pluginLabel(game: Game, state: GameState): string | null {
  const parts = (game.plugins ?? []).flatMap((plugin) => plugin.label?.(state, pluginContext(plugin, state, game)) || [])
  return parts.length ? parts.join(' · ') : null
}

/** The first plugin's stage, with the id its blocks are drawn under, or undefined if none answers. */
export function pluginStage(game: Game, state: GameState): (StageDef & { id: string }) | undefined {
  for (const plugin of game.plugins ?? []) {
    const stage = plugin.stage?.(state, pluginContext(plugin, state, game))
    if (stage) return { ...stage, id: stage.id ?? plugin.id }
  }
  return undefined
}

/** Who a speaker id is, as the first plugin that knows says; undefined if none does. */
export function pluginSpeaker(game: Game, state: GameState, id: string): SpeakerView | undefined {
  for (const plugin of game.plugins ?? []) {
    const speaker = plugin.speaker?.(id, state, pluginContext(plugin, state, game))
    if (speaker) return speaker
  }
  return undefined
}

/** Every plugin's buttons, in plugin order. */
export function pluginButtons(game: Game, state: GameState): ActionDef[] {
  return (game.plugins ?? []).flatMap((plugin) => [...(plugin.buttons?.(state, pluginContext(plugin, state, game)) ?? [])])
}

/** What a plugin says is wrong with how content calls it, by full name; nothing for a name with no plugin behind it. */
export function pluginArgProblems(game: Game, kind: 'conditions' | 'effects' | 'commands', full: string, args: PluginArgs): string[] {
  const parts = pluginName(full)
  if (!parts) return []
  return pluginById(game, parts.plugin)?.argProblems?.(kind, parts.name, args, game) ?? []
}

/** Does any plugin guard or price commands? If none does, nothing needs to know a command's effects. */
export function pluginsWatch(game: Game): boolean {
  return (game.plugins ?? []).some((plugin) => plugin.guard || plugin.price)
}

/** What the plugins put on background channels: for each channel, the first plugin's that names it. */
export function pluginAudio(game: Game, state: GameState): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const plugin of game.plugins ?? []) {
    const audio = plugin.audio?.(state, pluginContext(plugin, state, game))
    for (const [channel, track] of Object.entries(audio ?? {})) {
      if (track !== undefined && !Object.hasOwn(out, channel)) out[channel] = track
    }
  }
  return out
}

/** Every plugin's view, by id. */
export function pluginViews(state: GameState, game: Game): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const plugin of game.plugins ?? []) {
    if (plugin.view) out[plugin.id] = plugin.view(state, pluginContext(plugin, state, game))
  }
  return out
}
