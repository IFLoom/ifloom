import type { Plugin, PluginEntry } from './plugin.ts'
import type { Condition } from './condition.ts'
import type { Lock } from './locks.ts'
import type { Custom } from './custom.ts'
import type { MediaStage } from './features/media.ts'
import type { StoryletFields } from './features/scenes.ts'
import type { MinigameSceneFields } from './features/minigames.ts'
import type { TransitionFields } from './features/transitions.ts'
import type { FeatureGame } from './features/registry.ts'
import type { VideoFlags } from './sceneBody.ts'
import { bakeScene, isDataScene } from './scene.ts'
import type { MigrationTools } from './intake.ts'
import type {
  Command,
  Effect,
  Flat,
  KvValue,
  GameState,
  StatKey,
} from './types.ts'

export type { SettingDef } from './features/settings.ts'
export type { StoryletFields } from './features/scenes.ts'
export type { MinigameSceneFields } from './features/minigames.ts'

/**
 * Why something the player could do is refused for now: a choice, an action,
 * an activity, a place, an app. Each entry is checked in order, and the first
 * whose `when` holds refuses it with its `reason`, which the button shows
 * greyed out. With `hide`, the button is left off the screen instead.
 */
export type Blocked = {
  /** Refused while this holds. */
  when: Condition
  /** What the player reads on the greyed-out button, and the refusal. */
  reason: string
  /** Leave it off the screen while `when` holds, rather than greyed out. */
  hide?: boolean
}

/** Something to do, as a button: a command, and when it is offered. The game's own, a plugin's, a place's. */
export type ActionDef = {
  id: string
  label: string
  command: Command
  /** Only offered while this holds. */
  when?: Condition
  /**
   * Shown but greyed out while one of these holds, with its reason (or left
   * off with `hide`). For a reason the engine already knows, such as a lock
   * or an activity's own `blocked`, let `whyNot` say it instead.
   */
  blocked?: Blocked[]
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
  /** A layered picture with hotspots, drawn as the scene's stage. See `view.scene.stage`. */
  stage?: MediaStage
  /** What plays on background channels while the scene is open, by channel. Null silences one. */
  audio?: Record<string, string | null>
  choices: SceneChoice[]
}

/** What a hand-built scene's `render` can read besides the state. */
export type SceneCtx = {
  kv: (key: string) => KvValue | undefined
  storylineKv: (storylineId: string, key: string) => KvValue | undefined
  /**
   * Where the render's new pool picks go, when the engine is drawing a screen
   * and wants them recorded. Pass it to `renderScene` when a hand-built scene
   * wraps a data scene. Undefined otherwise.
   */
  picks?: Record<string, string>
}

export type Scene = StoryletFields & MinigameSceneFields & TransitionFields & {
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
  /** A member's weight in a variants list, 1 if it has none. Left out, every member weighs 1. */
  weight?: (name: string, key: string) => number
  /**
   * Every key the store has words for, so the content checker can read all
   * the prose's markup. Left out, it reads only the keys content names.
   */
  keys?: () => string[]
}

/** A thread of the story, followed by its stages and kv, and closed for a while if need be. */
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
  /** kv keys put back at the start of each turn: what "once this turn" was counting. */
  resets?: Record<string, KvValue>
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

/** What a New Game+ takes from the game before: player stats, kv keys and items, by id. */
export type CarryOver = {
  stats?: string[]
  /** kv keys, by name. */
  kv?: string[]
  /** Items by id, or `'all'` for every item the player has. */
  items?: string[] | 'all'
}

/** The fields of a game the core reads itself. The features' (settings, stats, audio, media) are in `features/`. */
type GameBase = {
  id: string
  title: string
  /**
   * The game's own version, a whole number from 1. Saves record it, and
   * `migrations` carry an older save forward. Declaring it also stops the
   * engine filling new stats, settings and entities into old saves by itself:
   * your migration steps fill them with `tools.fill()`. 1 if left out.
   */
  version?: number
  /**
   * Steps that carry a save from one version of the game to the next, keyed by
   * the version they upgrade from: step 1 takes a version-1 save to version 2.
   * They run when an older save loads, after the engine's and plugins' own
   * migrations. A version with no step is carried forward unchanged.
   */
  migrations?: Record<number, (state: GameState, tools: MigrationTools) => GameState>
  /** What a New Game+ carries over from the game before. See `startingState`'s `carry`. */
  carryOver?: CarryOver
  /**
   * The name a save is listed under, such as the name the player typed, or
   * null for none. Saves record it as `SaveMeta.player`. Left out, saves have no name.
   */
  saveName?: (state: GameState) => string | null
  /**
   * When the game counts as finished. The runner records the first time it
   * holds in the profile's `finished`, so a title screen can offer New Game+.
   */
  finished?: Condition
  /** The game's named functions: custom conditions, effects, values and panel data. */
  custom?: Custom
  /** The packs the game was loaded from, in order. Saves record them. */
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
export type Game = Flat<GameBase & FeatureGame>

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
