/**
 * What a core feature declares, and what the core lends it.
 *
 * A core feature (scenes, stats, entities, holdings, triggers and the rest; see
 * `FEATURES` in `registry.ts`) is a module that declares everything it adds in
 * one place: its slice of the state, its kinds of condition, effect and
 * command, its pack key, its checks and the references it resolves, its
 * piece of the view, its steps after a command, and what it fills and
 * carries. `registry.ts` merges them into the tables the core reads, so the
 * core's shared code names no feature.
 *
 * A feature is a leaf. It imports types, other features, and at runtime only
 * modules that import nothing back (strings, entities, holdings, notices, storylines,
 * context, the scene body). What it needs from the core,
 * such as `holds` or `runEffects`, comes in a `FeatureContext` argument, as a
 * plugin's context does. That keeps the registry free of import cycles. Core
 * features aren't plugins: see ADR 0007.
 */
import type { EffectRef } from '../custom.ts'
import type { ActionDef, CarryOver, Game } from '../game.ts'
import type { DataScene, RenderedScene } from '../scene.ts'
import type { StatModifier } from '../plugin.ts'
import type { Profile } from '../profile.ts'
import type { Reference } from '../references.ts'
import type { Amount, Command, Condition, Effect, GameState, KvValue, StartOptions } from '../types.ts'
import type { WordPart, WordWalk } from '../words.ts'

/** The core's helpers a feature calls, passed to every feature function that needs them. They match the engine's exported functions of the same names. */
export type FeatureContext = {
  /** Returns true when a condition holds, as `holds` does. */
  holds: (state: GameState, game: Game, condition: Condition | undefined) => boolean
  /** Applies effects and returns the next state. While `ending` is true, a `turn` effect does nothing. */
  runEffects: (state: GameState, game: Game, effects: readonly Effect[], ending: boolean) => GameState
  /** Runs every `onTurn` hook, the game's then each plugin's, as a turn ends. `before` is the state the turn ended on. */
  turnHooks: (state: GameState, game: Game, before: GameState) => GameState
  /** Runs every `onTurnDone` hook, the game's then each plugin's, once the `onTurn` hooks have run. */
  turnDoneHooks: (state: GameState, game: Game, before: GameState) => GameState
  /** Runs every `onStat` hook, the game's then each plugin's, for a player's stat that just changed. */
  statHooks: (before: GameState, after: GameState, stat: string, by: number, game: Game) => GameState
  /** Returns the effects a command would apply, worked out before it runs, as `effectsOf` does. */
  effectsOf: (state: GameState, game: Game, command: Command) => Effect[]
  /** Returns written effects, custom calls among them, as the effects they stand for. */
  buildEffects: (game: Game, refs: readonly EffectRef[]) => Effect[]
  /** Returns one of `items` drawn by weight and seeded by `parts`, as `weighted` does. Undefined when there are none. */
  weighted: <T>(items: readonly T[], weightOf: (item: T) => number | undefined, ...parts: (string | number)[]) => T | undefined
  /** Returns a whole number from 0 to `max - 1`, seeded by `parts`, as `draw` does. */
  draw: (max: number, ...parts: (string | number)[]) => number
  /** Returns the game's or a plugin's value function by name. Undefined when nobody declares it. */
  customValue: (game: Game | undefined, name: string) => ((state: GameState, args?: Record<string, unknown>) => string | number) | undefined
  /** Returns an `Amount` worked out in this state, as `amountOf` does. */
  amount: (state: GameState, game: Game, amount: Amount) => number
  /** Returns a line with its prose tokens filled in for this save, as `fillTokens` does. */
  fillTokens: (state: GameState, game: Game, text: string) => string
  /** Returns the plugins' `statModifiers` on the player's stats now. */
  statModifiers: (state: GameState, game: Game) => readonly StatModifier[]
  /** Returns the tracks the plugins put on background channels, by channel. */
  pluginAudio: (game: Game, state: GameState) => Record<string, string | null>
  /** Returns the action the `action` command names by this id in this state, the game's or a plugin's as `'<plugin>/<id>'`. */
  actionOf: (state: GameState, game: Game, id: string) => ActionDef | undefined
  /** Returns the scene the game declares with this id, as `sceneOf` does. */
  sceneOf: (game: Game, id: string) => DataScene | undefined
  /** Returns a scene rendered in this state, for a caller with no screen, such as a probe. */
  renderScene: (state: GameState, game: Game, scene: DataScene) => RenderedScene
}

/** A feature's context while effects apply. `ending` is true while a turn is ending. */
export type EffectContext = FeatureContext & { ending: boolean }

/**
 * The open scene, rendered at most once however many questions one state is asked. `scene()` renders it the first
 * time and returns the same rendering after.
 *
 * `screen` makes one and shares it between every choice.
 */
export type Rendering = {
  /** Returns the open scene rendered, the same rendering each time. Undefined when no scene is open. */
  scene: () => RenderedScene | undefined
}

/**
 * A feature's context while a command is asked about or run. It adds the open scene, rendered once, and ways to ask
 * about and run another command with the same rendering, for a choice that sends one.
 */
export type CommandContext = FeatureContext & {
  /** The open scene, rendered once for this command. */
  rendered: Rendering
  /** Returns the reason another command would be refused in this state, as `whyNot` does. */
  whyNotCommand: (state: GameState, game: Game, command: Command) => string | undefined
  /** Returns the effects another command would apply in this state, as `effectsOf` does. */
  effectsOfCommand: (state: GameState, game: Game, command: Command) => Effect[]
  /** Runs another command in this state as the reducer runs one it allows, without the steps after a command. */
  runCommand: (state: GameState, game: Game, command: Command) => GameState
}

/** A field of the state a feature declares, with its value in a new game and in a loaded state that lacks it. */
export type StateField<T> = {
  /** Returns the field's value in a new game. `undefined` leaves the field out. */
  start: (game: Game, options: StartOptions) => T
  /**
   * Returns the field's value for a loaded state that lacks it (or has null). It runs after the engine's own steps
   * and before the plugins' and the game's.
   *
   * Left out, the field is never filled, and a step or a fill rule owns it.
   */
  load?: () => T
  /** Returns true when a loaded value can be kept. A value that is there and not null is kept if left out. */
  keeps?: (value: unknown) => boolean
}

/** A feature's kind of condition, with how it holds, how it explains itself and what it names. */
export type ConditionEntry<C> = {
  /** Returns true when the condition holds in this state. */
  holds: (state: GameState, condition: C, game: Game, cx: FeatureContext) => boolean
  /** Returns one line for `explain`, the value the condition read and the value it wanted. */
  explain: (state: GameState, condition: C, game: Game, cx: FeatureContext) => string
  /** Returns the references the condition makes, for the content checker. Nested conditions come back as `{ when }`. */
  references: (condition: C) => Reference[]
}

/** A feature's kind of effect, with how it applies and what it names. */
export type EffectEntry<E> = {
  /** Returns the state with the effect applied. */
  apply: (state: GameState, effect: E, game: Game, cx: EffectContext) => GameState
  /** Returns the references the effect makes, for the content checker. */
  references: (effect: E) => Reference[]
}

/** A feature's type of command, with its refusal, how it runs, the effects it would apply and what it names. */
export type CommandEntry<C> = {
  /** Returns the reason the player reads when the command can't be done now. Undefined when it can, and it's asked after locks and guards. */
  whyNot: (state: GameState, command: C, game: Game, cx: CommandContext) => string | undefined
  /** Returns the state after the command runs. */
  run: (state: GameState, command: C, game: Game, cx: CommandContext) => GameState
  /** Returns the effects running the command would apply, for locks, guards and prices to see. None if left out. */
  effectsOf?: (state: GameState, command: C, game: Game, cx: CommandContext) => Effect[]
  /** Returns true when no lock or plugin guard stops the command. False if left out. */
  ignoresLocks?: (command: C, game: Game) => boolean
  /** Returns the stats the command spends, by id, for its button's price. None if left out. */
  spends?: (command: C, game: Game, state: GameState, cx: FeatureContext) => Record<string, number> | undefined
  /** Returns the references the command makes, for the content checker. */
  references: (command: C) => Reference[]
}

/** The parts of a screen a feature's `fromScreen` and view read, the pool picks it made and the track each background channel resolved to. */
export type ShownScreen = {
  /** The pool picks the screen made, by pick key. */
  picks: Record<string, string>
  /** The track each background channel resolved to. */
  audio: { tracks: Record<string, string | null> }
}

/** An entry in one of a feature's lists, which `loadGame` uses to name the pack a problem came from. Undefined is the game itself. */
export type FeatureSource = { list: string; id?: string } | undefined

/** The content checker's tools a feature's `check` uses. */
export type FeatureCheckTools = {
  /** Reports a problem at `where`. */
  problem: (source: FeatureSource, where: string, what: string) => void
  /** Reports every reference that names something the game doesn't have, at `where`. */
  check: (source: FeatureSource, where: string, refs: readonly Reference[]) => void
  /** Records a file the game names, by the path the page asks for. */
  file: (where: string, type: 'picture' | 'video' | 'audio', path: string | null) => void
  /** Reports each id that appears twice in one list, once, as `two settings share this id`. A loaded game can't have these. */
  twice: (list: string, plural: string, ids: readonly string[]) => void
}

/** A feature's merge of its pack keys for one load. The game's own entries go first, then each pack's in order. */
export type PackMerge<G, P> = {
  /** Adds the entries the game declares itself, before any pack. */
  base: (game: G) => void
  /**
   * Adds a plugin's own content (`Plugin.content`), before the game's content and packs. Left out, the plugin's
   * content merges as a pack does, with `add`.
   */
  plugin?: (content: P, plugin: string) => void
  /** Adds one pack's entries over those before. */
  add: (pack: P, from: string) => void
  /** Writes the merged result onto the game. */
  finish: (game: Game) => void
  /** Returns the pack an entry in one of the feature's lists came from. Undefined for the game itself. */
  from: (list: string, id: string | undefined) => string | undefined
}

/** The place an after-command step runs, before the plugins' `onCommand` hooks or after them. */
export type AfterSlot = 'beforePlugins' | 'afterPlugins'

/** A state the content checker renders every scene against, one of `checkGame`'s `probes`. */
export type FeatureProbe = {
  /** The probe's name, used in the problems it finds. */
  name: string
  /** The state the scenes are rendered against. */
  state: GameState
}

/** The content checker's tools a feature's resolvers use. */
export type ResolveTools = {
  /** Returns the problems with these references, worded for `where`. A reference that holds others is looked inside. */
  resolve: (refs: readonly Reference[], where: string) => string[]
  /** Records a file the game names, by the path the page asks for. */
  file: (where: string, type: 'picture' | 'video' | 'audio', path: string | null) => void
  /** Reports a warning at `where`, something that may go wrong in play. A warning fails no check. */
  warn: (where: string, what: string) => void
}

/** A feature's resolvers, one for each reference it declares, by the key that tells it apart. Each returns the game's lacks, worded as problems. */
export type Resolvers<R> = { [K in keyof R]-?: (ref: R[K], where: string) => string[] }

/** The types a feature declares for each part it adds. Each key is optional. */
export type FeatureShape = {
  /** The feature's fields of the state. */
  state?: object
  /** The feature's conditions, by key, such as `{ setting: { setting: string } }`. */
  conditions?: object
  /** The feature's effects, by key. */
  effects?: object
  /** The feature's commands, by type. */
  commands?: object
  /** The feature's fields of the game. */
  game?: object
  /** The feature's fields of a pack. */
  pack?: object
  /** The feature's fields of the view. */
  view?: object
  /** The feature's kinds of `Reference`, by the key that tells each apart, such as `{ timer: { timer: string } }`. Its `resolve` answers for each. */
  references?: object
  /** The feature's lists, as its problems name them, such as `'setting'`. */
  lists?: string
  /** The name `MigrationTools.fill` fills the feature's part by, such as `'settings'`. */
  fill?: string
  /** The keys of the feature's `pack` that only a pack holds, never the game's content, such as `'patches'`. */
  packOnly?: string
}

type Part<T extends FeatureShape, K extends keyof FeatureShape> = T[K] extends object ? T[K] : {}

/** A feature's state fields, each with its start and load defaults. */
export type FieldsOf<S> = { [K in keyof S]-?: StateField<S[K]> }

/**
 * A feature as `defineFeature` takes it. It must answer for what its shape declares, so a feature with references
 * has a `resolve`.
 */
export type FeatureSpec<T extends FeatureShape> = FeatureParts<T> &
  (keyof Part<T, 'references'> extends never ? unknown : { resolve: (game: Game, tools: ResolveTools) => Resolvers<Part<T, 'references'>> }) &
  (keyof Part<T, 'pack'> extends never ? unknown : { pack: PackSpec<T>; content: ContentKeys<T> })

/** How a feature's pack keys merge: a later pack's entries over an earlier one's. */
type PackSpec<T extends FeatureShape> = { merge: (problem: (from: string, where: string, what: string) => void) => PackMerge<Part<T, 'game'>, Part<T, 'pack'>> }

type PackOnly<T extends FeatureShape> = T extends { packOnly: infer P } ? P : never

/** The content rules for each of a feature's pack keys. Every key must have one, so a new key can't go unchecked or untranslated. */
export type ContentKeys<T extends FeatureShape> = {
  [K in keyof Part<T, 'pack'>]-?: ContentKey<NonNullable<Part<T, 'pack'>[K]>> & (K extends PackOnly<T> ? { packOnly: true } : { packOnly?: undefined })
}

/**
 * The content rules for one pack key, beside how it merges. They list the entries a piece of content declares under
 * it, for the report of one entry declared twice, and the words a translation can replace.
 */
export type ContentKey<V> = {
  /**
   * Returns the entries one piece of content declares under the key, each worded as the report names it, such as
   * `scene "cafe.counter"`. Null for a key whose entries add up across files, such as `saveable`.
   */
  declares: ((value: V) => readonly string[]) | null
  /**
   * Walks the fields under the key that a player reads in the merged game, as `translatableFields` lists them. Null
   * for a key with no words a translation gives, or whose words another key's walk covers.
   */
  words: ((game: Game, walk: WordWalk) => void) | null
  /** The pack-only mark, true for a key only a pack holds, never the game's content, such as `patches`. */
  packOnly?: true
}

/** Returns a `declares` function for a list by id, naming each entry by its noun and id, such as `stat "energy"`. */
export const byId =
  (noun: string) =>
  (list: readonly { id: string }[]): string[] =>
    list.map((entry) => `${noun} "${entry.id}"`)

/** Returns a `declares` function for a record, naming each key by its noun, such as `kv "phase"`. */
export const byKey =
  (noun: string) =>
  (record: object): string[] =>
    Object.keys(record).map((key) => `${noun} "${key}"`)

/** Returns a `declares` function for a key that holds one value, naming the key by its noun. */
export const once = (noun: string) => (): string[] => [noun]

/**
 * Returns a `words` function for one of the game's lists, walking each entry's words by `shape` under
 * `<noun>.<id>.<field>`, such as `action.wait.label`. `noun` is the list as the feature's problems name it.
 */
export const listWords =
  (list: keyof Game, noun: string, shape: WordPart) =>
  (_game: Game, walk: WordWalk): void =>
    walk.list(list, noun, shape)

/** What a feature can declare, each part optional. */
type FeatureParts<T extends FeatureShape> = {
  /** Its name, as other features' `requires` name it. */
  name: string
  /** The features it needs, by name. The registry refuses to build without them. */
  requires?: readonly string[]
  state?: FieldsOf<Part<T, 'state'>>
  conditions?: { [K in keyof Part<T, 'conditions'>]: ConditionEntry<Part<T, 'conditions'>[K]> }
  effects?: { [K in keyof Part<T, 'effects'>]: EffectEntry<Part<T, 'effects'>[K]> }
  commands?: { [K in keyof Part<T, 'commands'>]: CommandEntry<Part<T, 'commands'>[K]> }
  /** A new game's state once every field has its start value: what can only be worked out from the whole state. */
  started?: (state: GameState, game: Game, cx: FeatureContext) => GameState
  /**
   * Its key of `game.carryOver`, what a New Game+ takes from it, and what is
   * wrong with what it lists. `run` reads `from`, the state the game before
   * ended on; `fresh` is the new game's state before anything is carried, and
   * what comes back is laid over it.
   */
  carry?: {
    key: keyof CarryOver
    run: (fresh: GameState, game: Game, from: GameState, options: StartOptions, cx: FeatureContext) => Partial<GameState>
    check?: (game: Game, tools: FeatureCheckTools) => void
  }
  /**
   * What the game declares and a loaded save lacks, filled in. `part` names it
   * for `MigrationTools.fill`; `unversioned` fills it on every load of a game
   * that declares no `version` too.
   */
  fill?: { part: T['fill'] & string; unversioned?: boolean; run: (state: GameState, game: Game) => GameState }
  /** What every load adds that the game declares and the save lacks, whatever the game's version. */
  loaded?: (state: GameState, game: Game) => GameState
  /** Its pack keys: how a later pack's entries go over an earlier one's. Required with a `pack` in its shape. */
  pack?: PackSpec<T>
  /** What each of its pack keys declares and the words in it. Required with a `pack` in its shape. */
  content?: ContentKeys<T>
  /** The lists its problems name, which `pack.merge` answers for. */
  lists?: readonly (T['lists'] & string)[]
  /** Its own checks on the game's content. */
  check?: (game: Game, tools: FeatureCheckTools, cx: FeatureContext) => void
  /** The references it declares, each resolved against one game. Called once per check. */
  resolve?: (game: Game, tools: ResolveTools) => Resolvers<Part<T, 'references'>>
  /** What is wrong with prose markup it reads, such as a sound or a pool it names. It records the files the markup names. */
  markup?: (game: Game, text: string, where: string, tools: ResolveTools, shownWhen?: Condition) => string[]
  /** Its checks against one probe state. */
  probe?: (game: Game, probe: FeatureProbe, tools: FeatureCheckTools, cx: FeatureContext) => void
  /**
   * Why no command can be run now, asked before the plugins' guards and never
   * of a command that ignores locks. `effects` works the command's effects
   * out when first asked.
   */
  refuses?: (state: GameState, command: Command, game: Game, effects: () => readonly Effect[], cx: FeatureContext) => string | undefined
  /** Its piece of the view. */
  view?: (state: GameState, game: Game, shown: ShownScreen, cx: FeatureContext) => Part<T, 'view'>
  /**
   * A step after every command that took, before the screen is drawn, in the
   * features' declared order. `command` is the one that ran, to tell a tick
   * from a pick.
   */
  afterCommand?: { at: AfterSlot; run: (before: GameState, after: GameState, game: Game, cx: FeatureContext, command: Command) => GameState }
  /** What it records from the one screen of the new state. `wants` says whether the game needs a screen for it at all. */
  fromScreen?: { wants: (game: Game) => boolean; record: (state: GameState, shown: ShownScreen, game: Game, cx: FeatureContext) => GameState }
  /** What it does in a runner. */
  runner?: RunnerHooks
}

/** A feature's part in a runner. The runner names no feature and calls these in the features' order. */
export type RunnerHooks = {
  /** Runs after a command took. `remember` queues a write to the profile, and only a runner with a profile calls this. */
  afterCommand?: (command: Command, remember: (write: (profile: Profile) => Promise<unknown>) => void) => void
  /**
   * Returns the reason the runner can't save this state now. The runner refuses `save` with it, and an autosave waits
   * for the next one due. Undefined when it can save.
   */
  refusesSave?: (state: GameState, game: Game, cx: FeatureContext) => string | undefined
  /** The player's settings as a runner keeps them. Only one feature gives them. */
  settings?: PlayerSettings
}

/**
 * The outcome of changing a setting in a runner. It's sent as a `command` when the game in play keeps it, written to
 * the profile as `stored`, or `refused` with the reason.
 */
export type SettingChange = { command: Command } | { stored: KvValue } | { refused: string }

/**
 * The player's settings as a runner keeps them, some in the game in play and some only in the profile under
 * `namespace`. The runner reads and writes the profile, and these functions give the values and how one changes.
 */
export type PlayerSettings = {
  /** The profile namespace the player's settings are kept under. */
  namespace: string
  /**
   * Returns every setting's value now. A setting the game in play keeps reads `state`, others read `stored` (the
   * profile's, or nothing without one), and either falls back to its default.
   */
  values: (game: Game, state: GameState, stored: Record<string, unknown> | undefined) => Record<string, KvValue>
  /** Returns the values that come from `stored` alone, so a runner tells listeners when a write to the profile changes one. */
  fromStored: (game: Game, stored: Record<string, unknown> | undefined) => Record<string, KvValue>
  /** Returns the outcome of changing setting `id` to `to`. `profile` is true when the runner has a profile to keep it in. */
  change: (game: Game, id: string, to: KvValue, profile: boolean) => SettingChange
}

/** A feature as the registry holds it, with every table present and empty when the feature declares none. */
export type Feature<T extends FeatureShape> = FeatureSpec<T> & {
  /** The names of the features this one needs. */
  requires: readonly string[]
  /** The feature's state fields. */
  state: FieldsOf<Part<T, 'state'>>
  /** The feature's conditions, by key. */
  conditions: { [K in keyof Part<T, 'conditions'>]: ConditionEntry<Part<T, 'conditions'>[K]> }
  /** The feature's effects, by key. */
  effects: { [K in keyof Part<T, 'effects'>]: EffectEntry<Part<T, 'effects'>[K]> }
  /** The feature's commands, by type. */
  commands: { [K in keyof Part<T, 'commands'>]: CommandEntry<Part<T, 'commands'>[K]> }
  /** The lists the feature's problems name. */
  lists: readonly (T['lists'] & string)[]
}

/**
 * Returns a core feature, with every table filled in. It's internal, since a game or a plugin adds to the engine
 * with `definePlugin` instead.
 *
 * Name its shape (`T`) so every table is checked against its kinds.
 */
export function defineFeature<T extends FeatureShape>(spec: FeatureSpec<T>): Feature<T> {
  return {
    requires: [],
    lists: [],
    ...spec,
    state: spec.state ?? ({} as FieldsOf<Part<T, 'state'>>),
    conditions: spec.conditions ?? ({} as Feature<T>['conditions']),
    effects: spec.effects ?? ({} as Feature<T>['effects']),
    commands: spec.commands ?? ({} as Feature<T>['commands']),
  }
}

/**
 * Returns the merge for a pack key whose entries have ids. A later pack's entry replaces an earlier one in its place,
 * and a new one goes at the end.
 *
 * `read.base` reads what the game declares itself, when it can declare any. `key` returns the id entries merge by,
 * their `id` if left out.
 */
export function mergedById<G, P, T>(
  read: { base?: (game: G) => readonly T[] | undefined; pack: (pack: P) => readonly T[] | undefined },
  write: (game: Game, entries: T[]) => void,
  key: (entry: T) => string = (entry) => (entry as { id: string }).id,
  list?: string,
): { merge: () => PackMerge<G, P> } {
  return {
    merge: () => {
      const merged = new Map<string, { value: T; from: string }>()
      const add = (list: readonly T[] | undefined, from: string) => {
        for (const entry of list ?? []) merged.set(key(entry), { value: entry, from })
      }
      return {
        base: (game) => add(read.base?.(game), 'base'),
        add: (pack, from) => add(read.pack(pack), from),
        finish: (game) =>
          write(
            game,
            [...merged.values()].map((entry) => entry.value),
          ),
        // With `list`, only that list's entries: a feature with two lists by id merges each apart.
        from: (asked, id) => (id === undefined || (list !== undefined && asked !== list) ? undefined : merged.get(id)?.from),
      }
    },
  }
}

/**
 * Returns the merge for a pack key that holds one value, such as the scene a game opens on. A later pack's value
 * replaces an earlier one whole, and `list` names the key in problems.
 */
export function lastWins<G, P, T>(list: string, read: (pack: P) => T | undefined, write: (game: Game, value: T) => void): { merge: () => PackMerge<G, P> } {
  return {
    merge: () => {
      let kept: { value: T; from: string } | undefined
      return {
        base: () => {},
        add: (pack, from) => {
          const value = read(pack)
          if (value !== undefined) kept = { value, from }
        },
        finish: (game) => {
          if (kept) write(game, kept.value)
        },
        from: (asked) => (asked === list ? kept?.from : undefined),
      }
    },
  }
}

/**
 * Returns the merge for a pack key that is a record. Each key a later pack gives replaces an earlier one's and the
 * rest stay, and `list` names the key in problems.
 */
export function mergedByKey<G, P, T>(
  list: string,
  read: (pack: P) => Readonly<Record<string, T>> | undefined,
  write: (game: Game, record: Record<string, T>) => void,
): { merge: () => PackMerge<G, P> } {
  return {
    merge: () => {
      const merged = new Map<string, { value: T; from: string }>()
      return {
        base: () => {},
        add: (pack, from) => {
          for (const [key, value] of Object.entries(read(pack) ?? {})) merged.set(key, { value, from })
        },
        finish: (game) => {
          if (merged.size) write(game, Object.fromEntries([...merged].map(([key, entry]) => [key, entry.value])))
        },
        from: (asked, key) => (asked === list && key !== undefined ? merged.get(key)?.from : undefined),
      }
    },
  }
}

/**
 * Returns the merge for a pack key that is a list without required ids, such as `saveable`. Each pack's entries go
 * after those before, and `list` names the key in problems.
 *
 * An entry with an `id` replaces an earlier one with that id in its place, so a pack can change one it didn't write.
 */
export function appended<G, P, T extends { id?: string }>(
  list: string,
  read: (pack: P) => readonly T[] | undefined,
  write: (game: Game, entries: T[]) => void,
): { merge: () => PackMerge<G, P> } {
  return {
    merge: () => {
      const merged: { value: T; from: string }[] = []
      return {
        base: () => {},
        add: (pack, from) => {
          for (const entry of read(pack) ?? []) {
            const at = entry.id === undefined ? -1 : merged.findIndex((earlier) => earlier.value.id === entry.id)
            if (at >= 0) merged[at] = { value: entry, from }
            else merged.push({ value: entry, from })
          }
        },
        finish: (game) => {
          if (merged.length)
            write(
              game,
              merged.map((entry) => entry.value),
            )
        },
        // By its id, or by its place in the list for one with none.
        from: (asked, id) => {
          if (asked !== list || id === undefined) return undefined
          return (merged.find((entry) => entry.value.id === id) ?? (/^\d+$/.test(id) ? merged[Number(id)] : undefined))?.from
        },
      }
    },
  }
}

/** Returns one merge for several pack keys of one feature. Each part merges its own key. */
export function together<G, P>(
  ...parts: { merge: (problem: (from: string, where: string, what: string) => void) => PackMerge<G, P> }[]
): { merge: (problem: (from: string, where: string, what: string) => void) => PackMerge<G, P> } {
  return {
    merge: (problem) => {
      const merges = parts.map((part) => part.merge(problem))
      return {
        base: (game) => merges.forEach((merge) => merge.base(game)),
        plugin: (content, plugin) => merges.forEach((merge) => (merge.plugin ?? merge.add)(content, plugin)),
        add: (pack, from) => merges.forEach((merge) => merge.add(pack, from)),
        finish: (game) => merges.forEach((merge) => merge.finish(game)),
        from: (list, id) => {
          for (const merge of merges) {
            const found = merge.from(list, id)
            if (found !== undefined) return found
          }
          return undefined
        },
      }
    },
  }
}
