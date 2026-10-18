/**
 * What a core feature declares, and what the core lends it.
 *
 * A core feature (scenes, stats, items, entities, triggers and the rest; see
 * `FEATURES` in `registry.ts`) is a module that declares everything it adds in
 * one place: its slice of the state, its kinds of condition, effect and
 * command, its pack key, its checks and the references it resolves, its
 * piece of the view, its steps after a command, and what it fills and
 * carries. `registry.ts` merges them into the tables the core reads, so the
 * core's shared code names no feature.
 *
 * A feature is a leaf. It imports types, other features, and at runtime only
 * modules that import nothing back (strings, entities, notices, storylines,
 * collections, context, the scene body). What it needs from the core,
 * such as `holds` or `runEffects`, comes in a `FeatureContext` argument, as a
 * plugin's context does. That keeps the registry free of import cycles. Core
 * features aren't plugins: see ADR 0007.
 */
import type { EffectRef, TurnContext } from '../custom.ts'
import type { CarryOver, Game, Scene, SceneView } from '../game.ts'
import type { StatModifier } from '../plugin.ts'
import type { Profile } from '../profile.ts'
import type { Reference } from '../references.ts'
import type { TransitionView } from './transitions.ts'
import type { Command, Condition, Effect, GameState, StartOptions } from '../types.ts'

/** The core's helpers a feature can call. The core hands one to every hook that needs it. */
export type FeatureContext = {
  /** Whether a condition holds, as `holds` says. */
  holds: (state: GameState, condition: Condition | undefined, game?: Game) => boolean
  /** Apply effects; while `ending` is true, a `turn` effect does nothing. */
  runEffects: (state: GameState, game: Game, effects: readonly Effect[], ending: boolean) => GameState
  /** Every plugin's `onTurn` hook, as a turn ends. */
  turnHooks: (state: GameState, game: Game) => GameState
  /** What `rules.onTurn` is handed: `before` is the state as the turn ended, and its `apply` ends no turn. */
  turnContext: (state: GameState, game: Game, before: GameState) => TurnContext
  /** What a command would apply, worked out before it runs, as `effectsOf` says. */
  effectsOf: (state: GameState, game: Game, command: Command) => Effect[]
  /** Effects as content writes them (custom calls among them) as the effects they stand for, read against `state`. */
  buildEffects: (state: GameState, game: Game, refs: readonly EffectRef[]) => Effect[]
  /** One of `items` drawn by weight, seeded by `parts`; undefined when there are none. See `weighted`. */
  weighted: <T>(items: readonly T[], weightOf: (item: T) => number | undefined, ...parts: (string | number)[]) => T | undefined
  /** A whole number from 0 to `max - 1`, seeded by `parts`. See `roll`. */
  roll: (max: number, ...parts: (string | number)[]) => number
  /** A custom value by name, the game's or a plugin's. */
  customValue: (game: Game | undefined, name: string) => ((state: GameState, args?: Record<string, unknown>) => string | number) | undefined
  /** What the plugins' `statModifiers` change about the player's stats right now. */
  statModifiers: (state: GameState, game: Game) => readonly StatModifier[]
  /** What the plugins put on background channels, by channel. */
  pluginAudio: (game: Game, state: GameState) => Record<string, string | null>
  /** A scene ready to render, by id, as `sceneById` gives it. */
  sceneById: (game: Game, id: string) => Scene | undefined
  /** The open scene rendered, for a caller with no screen; undefined with none open. */
  sceneView: (state: GameState, game: Game) => SceneView | undefined
}

/** A feature's context while effects apply: `ending` while a turn is ending. */
export type EffectContext = FeatureContext & { ending: boolean }

/**
 * The open scene, rendered at most once however many questions are asked about
 * one state: `scene()` renders it the first time and hands back the same view
 * after. `screen` makes one and shares it between every choice.
 */
export type Rendering = { scene: () => SceneView | undefined }

/**
 * A feature's context while a command is asked about or run: the open scene,
 * rendered once, and another command asked about, worked out and run with that
 * same rendering, for a choice that sends one.
 */
export type CommandContext = FeatureContext & {
  rendered: Rendering
  /** Why another command would be refused in this state, as `whyNot` says. */
  whyNotCommand: (state: GameState, game: Game, command: Command) => string | undefined
  /** What another command would apply in this state, as `effectsOf` says. */
  effectsOfCommand: (state: GameState, game: Game, command: Command) => Effect[]
  /** Run another command in this state as the reducer runs one it allows, without the steps after a command. */
  runCommand: (state: GameState, game: Game, command: Command) => GameState
}

/** One field of the state: what a new game has, and what a loaded state that lacks it gets. */
export type StateField<T> = {
  /** A new game's value. `undefined` leaves the field out. */
  start: (game: Game, options: StartOptions) => T
  /**
   * What a loaded state gets when the field is missing (or null), after the
   * engine's own steps and before the plugins' and the game's. Left out, the
   * field is never filled: a step or a fill rule owns it.
   */
  load?: () => T
  /** Whether a loaded value can be kept. Default: it is there and not null. */
  keeps?: (value: unknown) => boolean
}

/** A kind of condition: whether it holds, why, and what it names. */
export type ConditionEntry<C> = {
  holds: (state: GameState, condition: C, game: Game | undefined, cx: FeatureContext) => boolean
  /** One line for `explain`: what it read, what it wanted. */
  explain: (state: GameState, condition: C, game: Game | undefined, cx: FeatureContext) => string
  /** What it names, for the content checker. Nested conditions come back as `{ when }`. */
  references: (condition: C) => Reference[]
}

/** A kind of effect: what it does, and what it names. */
export type EffectEntry<E> = {
  apply: (state: GameState, effect: E, game: Game, cx: EffectContext) => GameState
  references: (effect: E) => Reference[]
}

/** A type of command: why not, what it does, what it would apply, and what it names. */
export type CommandEntry<C> = {
  /** Why it can't be done now, as the player reads it; undefined if it can. Asked after locks and guards. */
  whyNot: (state: GameState, command: C, game: Game, cx: CommandContext) => string | undefined
  run: (state: GameState, command: C, game: Game, cx: CommandContext) => GameState
  /** What running it would apply, for locks, guards and prices to see. None if left out. */
  effectsOf?: (state: GameState, command: C, game: Game, cx: CommandContext) => Effect[]
  /** Whether no lock or plugin guard stops it. False if left out. */
  ignoresLocks?: (command: C, game: Game) => boolean
  /** The stats it spends, by id, for its button's price. None if left out. */
  spends?: (command: C, game: Game, state: GameState) => Record<string, number> | undefined
  references: (command: C) => Reference[]
}

/** What `fromScreen` and a view piece read: the pool picks a screen made, the track each background channel resolved to, and its transition. */
export type ShownScreen = {
  picks: Record<string, string>
  audio: { tracks: Record<string, string | null> }
  /** The screen's transition, as the view has it. */
  transition: TransitionView
}

/** An entry in one of a feature's lists, for `loadGame` to name the pack a problem came from. Undefined is the game itself. */
export type FeatureSource = { list: string; id?: string } | undefined

/** What the content checker lends a feature's `check`. */
export type FeatureCheckTools = {
  /** Report a problem at `where`. */
  problem: (source: FeatureSource, where: string, what: string) => void
  /** Report everything these references name that the game doesn't have, at `where`. */
  check: (source: FeatureSource, where: string, refs: readonly Reference[]) => void
  /** Record a file the game names, as the page asks for it. */
  file: (where: string, kind: 'picture' | 'video' | 'audio', path: string | null) => void
  /** Report each id that is in one list twice, once: `two settings share this id`. A loaded game can't have these. */
  twice: (list: string, plural: string, ids: readonly string[]) => void
}

/** One load's merge of a feature's pack key: the base game's first, then each pack's in order. */
export type PackMerge<G, P> = {
  /** What the base game declares itself, before any pack. */
  base: (game: G) => void
  /** One pack's, laid over what came before. */
  add: (pack: P, from: string) => void
  /** Write the merged result onto the game. */
  finish: (game: Game) => void
  /** The pack an entry in one of the feature's lists came from; undefined for the base. */
  from: (list: string, id: string | undefined) => string | undefined
}

/** Where an after-command step runs: before the plugins' `onCommand` hooks, or after them. */
export type AfterSlot = 'beforePlugins' | 'afterPlugins'

/** A state to render every scene against, for the content checker: `checkGame`'s `probes`. */
export type FeatureProbe = { name: string; state: GameState }

/** What the content checker lends a feature's resolvers. */
export type ResolveTools = {
  /** What these references name that the game doesn't have, worded for `where`: how a reference that holds more is looked inside. */
  resolve: (refs: readonly Reference[], where: string) => string[]
  /** Record a file the game names, as the page asks for it. */
  file: (where: string, kind: 'picture' | 'video' | 'audio', path: string | null) => void
}

/** The references that have `K` as a key. */
export type ReferenceOf<K extends string> = Extract<Reference, { [P in K]: unknown }>

type ReferenceKey = Reference extends infer R ? (R extends unknown ? keyof R & string : never) : never

/** How a feature resolves the references it answers for, by the key that tells each apart: what the game lacks, worded as a problem. */
export type Resolvers = { [K in ReferenceKey]?: (ref: ReferenceOf<K>, where: string) => string[] }

/** The kinds of things a feature declares, as types. Each key is optional. */
export type FeatureShape = {
  /** Its fields of the state. */
  state?: object
  /** Its conditions, by kind key: `{ setting: { setting: string } }`. */
  conditions?: object
  /** Its effects, by kind. */
  effects?: object
  /** Its commands, by type. */
  commands?: object
  /** Its fields of the game. */
  game?: object
  /** Its fields of a pack. */
  pack?: object
  /** Its fields of the view. */
  view?: object
  /** Its lists, as problems name them: `'setting'`. */
  lists?: string
  /** What `MigrationTools.fill` fills for it, by name: `'settings'`. */
  fill?: string
}

type Part<T extends FeatureShape, K extends keyof FeatureShape> = T[K] extends object ? T[K] : {}

/** A feature's state fields, each with its start and load defaults. */
export type FieldsOf<S> = { [K in keyof S]-?: StateField<S[K]> }

/** A feature as `defineFeature` takes it. */
export type FeatureSpec<T extends FeatureShape> = {
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
   * What the game declares and a loaded save lacks, filled in. `kind` names it
   * for `MigrationTools.fill`; `unversioned` fills it on every load of a game
   * that declares no `version` too.
   */
  fill?: { kind: T['fill'] & string; unversioned?: boolean; run: (state: GameState, game: Game) => GameState }
  /** What every load adds that the game declares and the save lacks, whatever the game's version. */
  loaded?: (state: GameState, game: Game) => GameState
  /** Its pack key: how a later pack's entries go over an earlier one's. */
  pack?: { merge: (problem: (from: string, where: string, what: string) => void) => PackMerge<Part<T, 'game'>, Part<T, 'pack'>> }
  /** The lists its problems name, which `pack.merge` answers for. */
  lists?: readonly (T['lists'] & string)[]
  /** Its own checks on the game's content. */
  check?: (game: Game, tools: FeatureCheckTools, cx: FeatureContext) => void
  /** The references it answers for, resolved against one game. Called once per check. */
  resolve?: (game: Game, tools: ResolveTools) => Resolvers
  /** What is wrong with prose markup it reads, such as a sound or a pool it names. It records the files the markup names. */
  markup?: (game: Game, text: string, where: string, tools: ResolveTools) => string[]
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
  /** A step after every command that took, before the screen is drawn, in the features' declared order. */
  afterCommand?: { at: AfterSlot; run: (before: GameState, after: GameState, game: Game, cx: FeatureContext) => GameState }
  /** What it records from the one screen of the new state. `wants` says whether the game needs a screen for it at all. */
  fromScreen?: { wants: (game: Game) => boolean; record: (state: GameState, shown: ShownScreen, game: Game, cx: FeatureContext) => GameState }
  /** What it does in a runner. */
  runner?: RunnerHooks
}

/** A feature's part in a runner. */
export type RunnerHooks = {
  /** After a command took. `remember` queues a write to the profile; only a runner with a profile calls this. */
  afterCommand?: (command: Command, remember: (write: (profile: Profile) => Promise<unknown>) => void) => void
}

/** A feature as the registry holds it: every table there, empty if it declares none. */
export type Feature<T extends FeatureShape> = FeatureSpec<T> & {
  requires: readonly string[]
  state: FieldsOf<Part<T, 'state'>>
  conditions: { [K in keyof Part<T, 'conditions'>]: ConditionEntry<Part<T, 'conditions'>[K]> }
  effects: { [K in keyof Part<T, 'effects'>]: EffectEntry<Part<T, 'effects'>[K]> }
  commands: { [K in keyof Part<T, 'commands'>]: CommandEntry<Part<T, 'commands'>[K]> }
  lists: readonly (T['lists'] & string)[]
}

/**
 * Declare a core feature. Internal: core features are part of the engine,
 * and a game or a plugin adds to the engine with `definePlugin` instead.
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
 * A pack key merged by id: a later pack's entry replaces an earlier one's in
 * its place, and a new one goes at the end. `base` reads what the base game
 * declares itself, when the base can declare any. `key` is the id it merges
 * by: `id` if left out.
 */
export function mergedById<G, P, T>(
  read: { base?: (game: G) => readonly T[] | undefined; pack: (pack: P) => readonly T[] | undefined },
  write: (game: Game, entries: T[]) => void,
  key: (entry: T) => string = (entry) => (entry as { id: string }).id,
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
        from: (_list, id) => (id === undefined ? undefined : merged.get(id)?.from),
      }
    },
  }
}
