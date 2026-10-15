import type { Plugin, PluginEntry } from './plugin.ts'
import type { CollectionDef } from './collections.ts'
import type { InputDef } from './inputs.ts'
import type { TriggerDef } from './triggers.ts'
import type { ActivityDef } from './activity.ts'
import type { Condition } from './condition.ts'
import type { Lock } from './locks.ts'
import type { StatDef } from './stats.ts'
import type { EntityDef, KindDef } from './entities.ts'
import type { Custom } from './custom.ts'
import { bakeScene, isDataScene, type DataScene } from './scene.ts'
import type {
  Command,
  Effect,
  FlagValue,
  GameState,
  StatKey,
} from './types.ts'

/** Something to do, as a button: a command, and when it is offered. The game's own, a plugin's, a place's. */
export type ActionDef = {
  id: string
  label: string
  command: Command
  /** Only offered while this holds. */
  when?: Condition
  /**
   * Shown but greyed out while one of these holds, with its reason. For a
   * reason the engine already knows — a lock, an activity's requirement — let
   * `whyNot` say it instead.
   */
  blocked?: { when: Condition; reason: string }[]
}

export type ItemDef = {
  id: string
  name: string
  desc: string
  kind: 'gear' | 'stuff'
  start?: number
  use?: { label: string; effects: Effect[] }
}

export type SceneChoice = {
  id: string
  label: string
  visible?: boolean
  disabled?: string
  /** Words the UI can style or filter the choice by. The engine gives them no meaning. */
  tags?: string[]
  irreversible?: string
  effects: Effect[]
}

export type SceneMedia = {
  src: string
  alt?: string
  size: 'inline' | 'wide'
  /**
   * Where it sits relative to the prose. `lead` opens the scene, which is where
   * a establishing still belongs; anything else follows the body.
   */
  at?: 'lead' | 'end'
}

export type SceneView = {
  title?: string
  speaker?: string
  /** Drawn as a conversation. A scene with a speaker is one already. */
  frame?: 'talk'
  /** Words the UI can style the scene by: `['letter']`, `['flashback']`. The engine gives them no meaning. */
  tags?: string[]
  /**
   * A bespoke UI panel to render in place of the choice list, by name. The
   * panel holds whatever local state it likes — a clock, a selection — and
   * ends by dispatching one of the choices the scene already declared.
   */
  panel?: string
  /**
   * Whatever that panel needs, shaped by the content module that owns it. The
   * engine carries it without looking inside — a mod can ship a panel and its
   * data together without the engine knowing either.
   */
  panelData?: unknown
  portrait?: string
  /** The scene's prose, with its markup. Left out, the scene has no body text. */
  body?: string
  media?: SceneMedia[]
  choices: SceneChoice[]
}

/** What a hand-built scene's `render` can read besides the state. */
export type SceneCtx = {
  flag: (key: string) => FlagValue | undefined
  storylineFlag: (storylineId: string, key: string) => FlagValue | undefined
}

export type Scene = {
  id: string
  title?: string
  speaker?: string
  /** Drawn as a conversation. A scene with a speaker is one already. */
  frame?: 'talk'
  /** Words the UI can style the scene by: `['letter']`, `['flashback']`. The engine gives them no meaning. */
  tags?: string[]
  panel?: string
  render: (state: GameState, ctx: SceneCtx) => SceneView
}

/** Prose and variants members the declarative scenes draw on. */
export type ProseStore = {
  /** The words for a key, with `{{playerName}}` and friends filled in. */
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
}

/** A thread of the story, followed by its stages and flags, and closed for a while if need be. */
export type StorylineDef = {
  id: string
  name: string
}

/**
 * The parts of a game that are rules rather than content: what a turn's end
 * does, what is locked, how a stat may change.
 *
 * The engine calls these instead of importing the game, which is what lets it
 * leave this repo. Every field is optional; leave one out and the engine does
 * the plain thing.
 */
export type GameRules = {
  /**
   * What the end of a turn brings: effects that apply, in order. Called with
   * the state as the turn ended and the number of the turn about to begin.
   */
  turn?: (state: GameState, nextTurn: number) => { effects: Effect[] }
  /** What the player cannot do for now, and why. Checked in order. */
  locks?: readonly Lock[]
  /** Variables put back at the start of each turn: what "once this turn" was counting. */
  resets?: Record<string, FlagValue>
  /**
   * The start of a new turn, after `turn`'s effects: anything it changes that
   * is not an effect — a stretch ending, a debt coming due.
   */
  onTurn?: (state: GameState) => GameState
  /**
   * Commands the game handles itself, by type. Return the next state, or a
   * string to refuse with that reason.
   */
  commands?: Partial<Record<Command['type'], (state: GameState, command: Command) => GameState | string>>
  /**
   * A stat just changed. Return `before` to say it did not take, `after` to
   * let it, or `after` with more besides.
   */
  onStat?: (before: GameState, after: GameState, key: StatKey, by: number) => GameState
}

/**
 * Something the player can change from a settings screen, declared by the
 * game. A `play` setting (the default) is part of the game state and saved
 * with it; a `ui` setting never enters the state and lives in the profile.
 */
export type SettingDef = {
  id: string
  /** What the settings screen calls it. */
  label: string
  /** `'play'` if left out: in the state, readable by conditions. `'ui'`: for the UI only. */
  affects?: 'play' | 'ui'
} & (
  | { kind: 'toggle'; default: boolean }
  | { kind: 'choice'; options: { value: string; label: string }[]; default: string }
  | { kind: 'range'; min: number; max: number; step?: number; default: number }
)

/** What a New Game+ takes from the game before: player stats, variables and items, by id. */
export type CarryOver = {
  stats?: string[]
  /** Variables, by name. */
  flags?: string[]
  /** Items by id, or `'all'` for every item the player has. */
  items?: string[] | 'all'
}

export type Game = {
  id: string
  title: string
  /** What the player can change from a settings screen. None if left out. */
  settings?: SettingDef[]
  /** What a New Game+ carries over from the game before. See `startingState`'s `carry`. */
  carryOver?: CarryOver
  /**
   * When the game counts as finished. The runner records the first time it
   * holds in the profile's `finished`, so a title screen can offer New Game+.
   */
  finished?: Condition
  /** The stretch a new game opens in. */
  startPhase?: string
  /** Every stat the game keeps. The engine has none of its own. */
  stats?: StatDef[]
  /** The kinds of thing the game keeps several of, each with its own stats. */
  kinds?: KindDef[]
  /** The things of those kinds there are at the start. More can be created in play. */
  entities?: EntityDef[]
  /** The game's named functions: custom conditions, effects, values and panel data. */
  custom?: Custom
  /**
   * Actions offered in every location, after each location's own — waiting,
   * checking a map. A game with none has none.
   */
  actions?: ActionDef[]
  /** The packs the game was loaded from, in order. Saves record them. */
  packs?: string[]
  /** The scene on screen on the first frame. Left out, the game opens on its idle screen. */
  introScene?: string
  activities: ActivityDef[]
  items: ItemDef[]
  /** Hand-written scenes and data scenes, side by side. */
  scenes: (Scene | DataScene)[]
  storylines: StorylineDef[]
  prose?: ProseStore
  rules?: GameRules
  /**
   * The game's words for anything the engine or a plugin says to the player,
   * by key: `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`.
   * Packs can add theirs; a later pack's line wins.
   */
  strings?: Record<string, string>
  /** Named lists the game keeps entries in: a gallery, notes, a ledger. */
  collections?: CollectionDef[]
  /** Effects that happen by themselves the first time a condition holds. */
  triggers?: TriggerDef[]
  /** What the player can type or pick, and the variable each one writes. */
  inputs?: InputDef[]
  /** The plugins the game is built with, in the order their hooks run. */
  plugins?: readonly Plugin<any>[]
  /**
   * Content for plugins, by plugin id and then list: `data.quests.quests`.
   * Merged from packs by id, as scenes are.
   */
  data?: Record<string, Record<string, readonly PluginEntry[]>>
}

export function itemById(game: Game, id: string) {
  return game.items.find((item) => item.id === id)
}

/**
 * A scene ready to render, by id. A data scene is baked into one the first
 * time it is asked for, so a game can list data scenes and hand-written ones
 * side by side.
 */
export function sceneById(game: Game, id: string): Scene | undefined {
  const found = game.scenes.find((scene) => scene.id === id)
  if (!found) return undefined
  return isDataScene(found) ? bakeScene(game, found) : found
}
