/**
 * What a core feature declares, and what the core lends it.
 *
 * A core feature (settings, audio, media, scenes, stats) is a module that
 * declares everything it adds in one place: its slice of the state, its kinds
 * of condition, effect and command, its pack key, its checks, its piece of the
 * view and its steps after a command. `registry.ts` merges them into the
 * tables the core reads, so the core's shared code names no feature.
 *
 * A feature is a leaf. It imports types, and at runtime only modules that
 * import nothing back (strings, entities, notices, storylines, the scene
 * body). What it needs from the core, such as `holds` or `runEffects`, comes
 * in a `FeatureContext` argument, as a plugin's context does. That keeps the
 * registry free of import cycles. Core features aren't plugins: see ADR 0007.
 */
import type { Game, Scene, SceneView } from '../game.ts'
import type { Profile } from '../profile.ts'
import type { Reference } from '../references.ts'
import type { Command, Condition, Effect, GameState, Range, StartOptions } from '../types.ts'

/** The core's helpers a feature can call. The core hands one to every hook that needs it. */
export type FeatureContext = {
  /** Whether a condition holds, as `holds` says. */
  holds: (state: GameState, condition: Condition | undefined, game?: Game) => boolean
  /** Apply effects; while `ending` is true, a `turn` effect does nothing. */
  runEffects: (state: GameState, game: Game, effects: readonly Effect[], ending: boolean) => GameState
  /** End the turn: the counter moves on and the game's and plugins' turn rules run. */
  endTurn: (state: GameState, game: Game) => GameState
  /** One of `items` drawn by weight, seeded by `parts`; undefined when there are none. See `weighted`. */
  weighted: <T>(items: readonly T[], weightOf: (item: T) => number | undefined, ...parts: (string | number)[]) => T | undefined
  /** A whole number from 0 to `max - 1`, seeded by `parts`. See `roll`. */
  roll: (max: number, ...parts: (string | number)[]) => number
  /** A custom value by name, the game's or a plugin's. */
  customValue: (game: Game | undefined, name: string) => ((state: GameState) => string | number) | undefined
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

/** A feature's context while a command is asked about or run: the open scene, rendered once. */
export type CommandContext = FeatureContext & { rendered: Rendering }

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
  references: (command: C) => Reference[]
}

/** What `fromScreen` reads: the pool picks a screen made, and the track each background channel resolved to. */
export type ShownScreen = {
  picks: Record<string, string>
  audio: { tracks: Record<string, string | null> }
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

/** Where an after-command step runs: straight after the game's triggers, or after the plugins' `after` hooks. */
export type AfterSlot = 'triggers' | 'hooks'

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
  /** Its pack key: how a later pack's entries go over an earlier one's. */
  pack?: { merge: (problem: (from: string, where: string, what: string) => void) => PackMerge<Part<T, 'game'>, Part<T, 'pack'>> }
  /** The lists its problems name, which `pack.merge` answers for. */
  lists?: readonly (T['lists'] & string)[]
  /** Its own checks on the game's content. */
  check?: (game: Game, tools: FeatureCheckTools) => void
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
  /** What a new game the runner starts is given, from the profile. */
  newGame?: (start: StartOptions, profile: Profile | undefined) => Promise<StartOptions>
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

/** Is the number in the range? A range with no bounds asks whether it is above 0. */
export function inRange(value: number, range: Range): boolean {
  if (!bounded(range)) return value > 0
  if (range.gte !== undefined && value < range.gte) return false
  if (range.gt !== undefined && value <= range.gt) return false
  if (range.lte !== undefined && value > range.lte) return false
  if (range.lt !== undefined && value >= range.lt) return false
  return true
}

/** Does the range have any bound at all? */
export function bounded(range: Range): boolean {
  return range.gte !== undefined || range.gt !== undefined || range.lte !== undefined || range.lt !== undefined
}

/** What a range asks for, in words: `3 or more and below 10`. */
export function wanted(range: Range): string {
  const parts = [
    range.gte !== undefined ? `${range.gte} or more` : '',
    range.gt !== undefined ? `more than ${range.gt}` : '',
    range.lte !== undefined ? `${range.lte} or less` : '',
    range.lt !== undefined ? `below ${range.lt}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' and ') : 'more than 0'
}

/** A value read as a number: a variable that is not a number counts as 0. */
export function counted(value: unknown): number {
  return typeof value === 'number' ? value : 0
}
