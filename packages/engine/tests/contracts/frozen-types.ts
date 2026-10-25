/**
 * The public shapes as they were before core features became modules that
 * register (ROADMAP, architecture #4), copied by hand from `types.ts`,
 * `condition.ts`, `game.ts`, `loader.ts` and `view.ts`. `types.test.ts`
 * holds the built types to these, both ways, so the `.d.ts` that the React UI,
 * the audio player and the plugins compile against doesn't drift.
 *
 * Remove this file and its test once the built shapes are the accepted baseline.
 *
 * Updated on purpose since: minigames (phase 5) added the `minigameVar`
 * condition, the `minigame` and `minigameVar` effects, the `tick` and
 * `minigame` commands, `GameState.minigame`, `Game.minigames`,
 * `Pack.minigames` and `View.minigame`. The kv store renamed flags:
 * `GameState.kv`, `KvValue`, the `kv` and `storylineKv` conditions and
 * effects (`to` and `by`), `CarryOver.kv`, the start command's `kv`, an
 * entity's `kv`, an input's `key`, and added `Game.saveName`. Content naming
 * (ADR 0008): effects name their target by its noun and set with `to` or
 * change with `by` (`setStat` is `stat` with `to`, `item` takes `to`,
 * `storylineKv` takes `by`); `has` folded into `item`, `counter` into
 * `storylineKv`, `{ turn: true }` became `{ turn: range }`, a collection
 * condition's `entry`; `use` takes `id`, `setting` and `input` take `to`.
 * Gating: `Blocked`, and an activity's `blocked` in place of `requires`.
 * Transitions: the `transition` effect, `GameState.transition`,
 * `Game.transitions` and `View.transition`. R5: the `tier` condition folded
 * into `level` (hidden bands are `levels.hidden`); `items`, `storylines` and
 * `activities` optional on `Game`. Panels: the `panel` effect, the
 * `closePanel` command, `GameState.panel` and `View.panel`. Last-time
 * records: `GameState.lastSeenOn`, `chosenOn` and `lastChosenOn`, and the
 * `since` condition's `last`. Organising a game: `Pack.overrides`. Content
 * and packs: `Content` (a pack's keys with an optional `name`, and no `id`,
 * `schema` or `patches`), and `Pack.overrides` gone. Things are entities
 * (phase 2): `EntityState` keeps only what play changed (its fields optional),
 * `EntityDef` gains `desc`, `image`, `tags` and `visible`, `KindDef` gains
 * `unique`, `listed`, `tags` and `flags`, and `View.entities` lists only what
 * is listed, each `EntityView` with `desc`, `image`, `tags` and `flags`.
 * Traits (phase 3): `Game.traits` and `Pack.traits` (`TraitTable`), and
 * `traits` on `KindDef`, `EntityDef` and `EntityState`. Holdings (phase 4):
 * `GameState.held` and `you`, `View.held`, the `entity` condition's `at` and
 * range, `count`'s `Select` and `units`, the `entity`, `move` and `you`
 * effects, `each`'s selection, and `create`'s `like` and `at` (its `of` and
 * `entity` optional with a `like`). Items and collections out (phase 6):
 * no `item` or `collection` condition, `item`, `collect` or `discard`
 * effect, `use` command, `GameState.items` or `collections`, `Game.items`,
 * `collections` or `Pack` keys for them, `View.pack` or `View.collections`;
 * `CarryOver.held` for `items`. Presentation in UI packages: no `transition`
 * effect, `GameState.transition`, `Game.transitions`, `View.transition` or
 * `view.scene.frame`; `Game.ui` and `view.scene.ui` (hints carried as
 * written) and `view.scene.key` (which screen this is). Dice rolls: the
 * `roll` effect and condition, `GameState.rolls` and `View.rolls`.
 * Timers: the `timer` condition and effect, `GameState.timers`,
 * `Game.timers`, `Pack.timers` and `View.timers` (the `tick` command, now
 * the timers feature's, is unchanged). Plugin-owned migrations:
 * `Pack.plugins`, the version of each plugin's content a pack was written for.
 * Save shape (save 18): `GameState.seen` and `chosen` are one `{ n, first, last }`
 * record per id, and `seenOn`, `lastSeenOn`, `chosenOn` and `lastChosenOn` are gone.
 * Data into content (API pass P2): `Game.locks` and `Game.resets` (from
 * `rules`), and the pack keys `actions`, `locks`, `resets`, `saveable`,
 * `finished`, `carryOver`, `startPhase` (now `kv`), `introScene` and `ui`. One panel
 * model: no `view.scene.panel` or `panelData`; a scene's `panel` is
 * `view.panel`, with `OpenPanel.scene`. One kv vocabulary (save 19): no
 * `storylineKv`, `minigameVar` or `phase` condition or effect, `GameState.phase`,
 * `View.phase` or `Phase`; the `kv` condition's `is` takes a list, the `kv`
 * effect takes `random`, `of` names a storyline or the minigame, and
 * `Game.kv` and `Pack.kv` are the kv store a new game starts with. One kind
 * of button: `activities` fold into `actions` (an `ActionDef` with a cost,
 * effects and once), and the `activity` command is `action`. Scenes and
 * beats (API pass P3): `view.scene.image` for `stageImage`, and
 * `SpeakerView` read from the speaker's entity. Flowing scenes: the `point`
 * effect, `GameState.flow`, and `view.scene.fresh`. One `Amount` (API pass
 * P5): range bounds, the `stat` effect's `by` and `to`, the `kv` effect's
 * `by` and `random`, the `entity` effect's `by` and `to`, `move`'s `by`, and
 * a roll's `plus` and `against` each take an `Amount`. Typed registries
 * (P5): a call in short is a `ConditionCall` or `EffectCall`, checked against
 * the registries a plugin augments, and `GameState.you` is an `EntityRef`,
 * now `${string}:${string}`. The prune (P6): `Game.scenes` and
 * `Pack.scenes` hold data scenes only, as hand-built scenes are internal.
 * Words (P7): `Pack.words` (and so `Content.words`), a translation's table.
 */
import type {
  Amount,
  EntityRef,
  ActionDef,
  AudioState,
  AudioView,
  CarryOver,
  DataScene,
  EffectRef,
  EntitiesView,
  EntityDef,
  EntityState,
  KvValue,
  GameAudio,
  GameMedia,
  GameRules,
  InputDef,
  InputView,
  KindDef,
  Lock,
  HeldView,
  Placement,
  Select,
  CreatedEntity,
  TraitTable,
  MinigameDef,
  MinigameState,
  MinigameView,
  MediaState,
  OpenPanel,
  Dice,
  Roll,
  RollsState,
  RunningTimer,
  TimerDef,
  TimerView,
  SavingView,
  Blocked,
  MigrationTools,
  Notice,
  NoticesView,
  Patch,
  Plugin,
  ConditionCall,
  EffectCall,
  PluginEntry,
  PluginSlice,
  ProseStore,
  RenderedChoice,
  SAVE_VERSION,
  SceneBeat,
  SettingDef,
  SettingView,
  SpeakerView,
  FlowState,
  StageView,
  StatDef,
  StatKey,
  StatView,
  StorylineDef,
  StorylineState,
  Stats,
  GameUi,
  SceneUi,
  Ui,
  TriggerDef,
  VariantMember,
} from '../../src/index.ts'

export type FrozenRange = { gte?: Amount; gt?: Amount; lte?: Amount; lt?: Amount }

export type FrozenCondition =
  | { all: FrozenCondition[] }
  | { any: FrozenCondition[] }
  | { not: FrozenCondition }
  /**
   * A key in the kv store. Bare, it asks whether it is set to anything
   * truthy; with `is`, whether it equals that; with a range, whether its
   * number is in it (a value that is not a number counts as 0):
   * `{ kv: 'lies', gte: 3 }`. With `of`, an entity's key:
   * `{ kv: 'role', of: '$', is: 'cook' }`.
   */
  | ({ kv: string; is?: KvValue | readonly KvValue[]; of?: string } & FrozenRange)
  /**
   * A `play` setting, read as a kv key is: bare, whether it is truthy
   * (`{ setting: 'hints' }`); with `is`, whether it equals that; with a range,
   * whether its number is in it.
   */
  | ({ setting: string; is?: KvValue } & FrozenRange)
  /**
   * How many times a choice has been picked, by `scene/choice`. Bare, at least
   * once: `{ chose: 'bakery.counter#buy-bread' }`.
   */
  | ({ chose: string } & FrozenRange)
  /**
   * A scene the player has already been through. The order half of a gate: a
   * stat says whether you are good enough yet, this says whether you have been
   * here yet. Bare, it asks for one viewing; `{ seen: 'x', gte: 2 }` for two.
   */
  | ({ seen: string } & FrozenRange)
  /**
   * Whole turns since a scene was first entered. The pace half of a gate:
   * `{ since: 'baker.first-coffee', gte: 5 }` holds from five turns after
   * the first coffee. A scene not yet seen fails every range, `lt` included — "not long
   * since" is not true of something that has not happened.
   */
  | ({ since: string; last?: boolean } & FrozenRange)
  /** A stat: the player's, or with `of`, an entity's (`'staff:ana'`, or `'$'` in an `each` or `where`). */
  | ({ stat: StatKey; of?: string } & FrozenRange)
  /**
   * How many entities of a kind there are, or with `where`, how many it holds
   * for (`'$'` in it is each one in turn). Bare, at least one:
   * `{ count: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, gte: 2 }`.
   */
  | ({ count: string | Select; where?: FrozenCondition; units?: true } & FrozenRange)
  /** An entity is in the game: `{ entity: 'staff:ana' }`; with `at` or a range, how many are held. */
  | ({ entity: string; at?: string } & FrozenRange)
  /**
   * The level a stat with `levels` is at: the player's, or with `of`, an
   * entity's. Bare, level 1 or more: `{ level: 'baking', gte: 2 }`. A stat
   * with no levels is always level 0.
   */
  | ({ level: StatKey; of?: string } & FrozenRange)
  /**
   * A storyline is open (`open: true`, the default): not closed, or closed
   * until a turn that has come. With `open: false`, that it is closed for now.
   */
  | { storyline: string; open?: boolean }
  /** The scene on screen is one of these. */
  | { scene: string[] }
  /** How many turns have passed. Turn 0 is the first, so `{ turn: { gte: 3 } }` is the fourth on. */
  | { turn: FrozenRange }
  /** A timer: bare, whether it is running; with a range, its milliseconds left. */
  | ({ timer: string } & FrozenRange)
  /** The latest roll under a key: made, passed or failed, critical. */
  | { roll: string; passed?: boolean; critical?: boolean | 'max' | 'min' }
  /** A plugin's condition in short: `{ 'quests/done': { quest: 'bakery' } }`. See `ConditionCall`. */
  | ConditionCall

/** The whole save. Each field's new-game value and load default are declared in `FIELDS`, intake.ts. */
export type FrozenGameState = {
  version: typeof SAVE_VERSION
  /** Fixed per save. Keeps variant variants from dealing identically every run. */
  seed: number
  /**
   * How many turns have passed: the engine's one clock. What a turn is belongs
   * to the game — a day, an hour, a week, a chapter — and everything the engine
   * dates (`seen`, `fired`, notices) is dated in turns.
   */
  turn: number
  sceneId: string | null
  /** Each scene entered, by id: how many times, and the turn of the first and the last. */
  seen: Record<string, { n: number; first: number; last: number }>
  /** Each choice picked, by `scene#choice`: how many times, and the turn of the first and the last. */
  chosen: Record<string, { n: number; first: number; last: number }>
  /** The player's stats. An entity's are on the entity. */
  stats: Stats
  /** What play changed about the game's entities, by kind and id: `entities.staff.ana`. */
  entities: Record<string, Record<string, EntityState>>
  /** How many of each kind have been created in play, for the next one's id. */
  created: Record<string, number>
  /**
   * Entities the game declared that were removed in play, by reference. A
   * declared entity a save does not have is added when it loads (a mod's new
   * character, say) unless it is here: gone for good.
   */
  removed: string[]
  /** What play changed about who holds what, by holder and then thing. */
  held: Record<string, Record<string, number>>
  /** The protagonist being played, or null for the player. */
  you: EntityRef | null
  storylines: Record<string, StorylineState>
  kv: Record<string, KvValue>
  /** What the game has told the player outside scenes, oldest first. */
  notices: Notice[]
  /** The turn each trigger last fired, by trigger id. */
  fired: Record<string, number>
  /** Each plugin's own state, by plugin id. */
  plugins: Record<string, PluginSlice>
  /** The value of each `play` setting the game declares, by id. */
  settings: Record<string, KvValue>
  /** What effects have put on the audio channels, the last few sounds, and the count of scenes entered. */
  audio: AudioState
  /** The file each pool request was given, so a revisit and a reload show the same one. */
  media: MediaState
  /** The minigame being played, or null. */
  minigame: MinigameState | null
  /** The open scene's visit of its flow: picks, jumps and waits passed, and what it waits on; or null. */
  flow: FlowState | null
  /** The panel open over the story, or null. */
  panel: OpenPanel | null
  /** The rolls made: how many, the last command's, and the latest under each key. */
  rolls: RollsState
  /** The running timers, by id. */
  timers: Record<string, RunningTimer>
  /**
   * The game's own version (`game.version`) the save was made with. Only
   * there when the game declares a version; a save without it is version 1.
   */
  gameVersion?: number
}

export type FrozenCommand =
  /**
   * A new game. `seed` fixes its random draws (a UI passes a fresh one; left
   * out, it comes from the game's id). `kv` are written before the first
   * scene: a name asked for on a title screen, a difficulty.
   */
  | { type: 'start'; seed?: number; kv?: Record<string, KvValue> }
  | { type: 'newGame' }
  /** An action, by its id: the game's, or a plugin's as `'<plugin>/<id>'`. */
  | { type: 'action'; id: string }
  | { type: 'scene'; id: string }
  | { type: 'choose'; id: string }
  | { type: 'leave' }
  /** Mark one notice seen, or every one. */
  | { type: 'dismiss'; id?: string }
  /** Write what the player typed or picked. A button leaves `to` out and the UI asks. */
  | { type: 'input'; id: string; to?: KvValue }
  /** Change a `play` setting. Ignores locks, like a menu would. */
  | { type: 'setting'; id: string; to: KvValue }
  /** Time passing in the minigame being played. */
  | { type: 'tick'; ms: number }
  /** An input to the minigame being played, by name. */
  | { type: 'minigame'; input: string }
  /** Close the open panel. */
  | { type: 'closePanel' }
  /** A plugin's command, by its full name: `{ type: 'custom', name: 'quests/track', with: { id: 'bakery' } }`. */
  | { type: 'custom'; name: string; with?: Record<string, unknown> }

export type FrozenEffect =
  /** Change a stat `by` an amount or put it `to` a value, held to its range: the player's, or with `of`, an entity's. */
  | { stat: StatKey; by: Amount; of?: string }
  | { stat: StatKey; to: Amount; of?: string }
  /** Set a kv key `to` a value, change its number `by` an amount, or draw it at random: the player's, or with `of`, someone else's. */
  | { kv: string; to: KvValue; of?: string }
  | { kv: string; by: Amount; of?: string }
  | { kv: string; random: [Amount, Amount]; of?: string }
  /** A new entity of a kind, made `with` what it is given, `like` another, given `at` a holder. */
  | { create: string; like?: string; with?: CreatedEntity; at?: Placement }
  /** Take an entity out of the game. */
  | { remove: string }
  /** The same effects for every entity of a kind, or of a selection, where `where` holds, with `'$'` as each. */
  | { each: string | Select; where?: FrozenCondition; effects: EffectRef[] }
  /** Change how many of a thing a holder (`'you'` if left out) holds, `by` or `to`. */
  | { entity: string; at?: string; by: Amount }
  | { entity: string; at?: string; to: Amount }
  /** Move a thing to another holder. */
  | { move: string; from?: string; to: string; by?: Amount }
  /** Play as a protagonist, or `null` for the player. */
  | { you: string | null }
  /** Open a scene, close the one on screen with null, or draw one from a set. */
  | { scene: string | null | { from: string; otherwise?: string } }
  | { closeStoryline: string; turns: number }
  /** End the turn, once or `by` times. */
  | { turn: true | { by: number } }
  /** Tell the player something outside a scene. `text` is a prose key. */
  | { notify: string; text?: string; image?: string; tag?: string; id?: string }
  /** Put a track on a background channel, kept in the save. */
  | { audio: string; to?: string | null }
  /** Play a sound once, on its track's channel. */
  | { sound: string }
  /** Start a minigame, in its `start` state. One already running is dropped. */
  | { minigame: string }
  /** Start a timer (for its `ms` or `to`), stop it (`to: null`), or add time (`by`). */
  | { timer: string; to?: number | null }
  | { timer: string; by: number }
  /** Throw dice, keep the total in the kv store under the key, and record the roll. */
  | { roll: string; dice: Dice; plus?: Amount; against?: Amount }
  /** Open a panel by name, with what it needs; `panel: null` closes it. */
  | { panel: string | null; with?: Record<string, unknown> }
  /** In a choice of a flowing scene: carry the flow on from this point. */
  | { point: string }
  /** A plugin's effect or the game's own, in short. */
  | EffectCall

/** The keys that tell one effect from another. */
export type FrozenEffectKey =
  | 'stat'
  | 'kv'
  | 'create'
  | 'remove'
  | 'each'
  | 'entity'
  | 'move'
  | 'you'
  | 'scene'
  | 'closeStoryline'
  | 'turn'
  | 'notify'
  | 'audio'
  | 'sound'
  | 'minigame'
  | 'timer'
  | 'roll'
  | 'panel'
  | 'point'

/** The screen this command leaves on comes in with `to`. */

export type FrozenGame = {
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
  migrations?: Record<number, (state: FrozenGameState, tools: MigrationTools) => FrozenGameState>
  /** What the player can change from a settings screen. None if left out. */
  settings?: SettingDef[]
  /** What a New Game+ carries over from the game before. See `startingState`'s `carry`. */
  carryOver?: CarryOver
  /**
   * The name a save is listed under, such as the name the player typed, or
   * null for none. Saves record it as `SaveMeta.playerName`. Left out, saves have no name.
   */
  saveName?: (state: FrozenGameState) => string | null
  /**
   * When the game counts as finished. The runner records the first time it
   * holds in the profile's `core:finished`, so a title screen can offer New Game+.
   */
  finished?: FrozenCondition
  /** The stretch a new game opens in. */
  kv?: Record<string, KvValue>
  /** When saving is refused, and why. Always allowed if left out. */
  saveable?: Blocked[]
  /** Every stat the game keeps. The engine has none of its own. */
  stats?: StatDef[]
  /** The kinds of thing the game keeps several of, each with its own stats. */
  kinds?: KindDef[]
  /** The things of those kinds there are at the start. More can be created in play. */
  entities?: EntityDef[]
  /** Traits by id and then entity: rows given to `loadGame`, every entity's once loaded. */
  traits?: TraitTable
  /**
   * Actions offered in every location, after each location's own — waiting,
   * checking a map. A game with none has none.
   */
  actions?: ActionDef[]
  /** The packs the game was loaded from, in order. Saves record them. */
  packs?: string[]
  /** The scene on screen on the first frame. Left out, the game opens on its idle screen. */
  introScene?: string
  /** Hand-written scenes and data scenes, side by side. */
  scenes: DataScene[]
  storylines?: StorylineDef[]
  prose?: ProseStore
  rules?: GameRules
  /**
   * The game's words for anything the engine or a plugin says to the player,
   * by key: `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`.
   * Packs can add theirs; a later pack's line wins.
   */
  strings?: Record<string, string>
  /** Effects that happen by themselves the first time a condition holds. */
  triggers?: TriggerDef[]
  /** What the player can type or pick, and the kv key each one writes. */
  inputs?: InputDef[]
  /** The plugins the game is built with, in the order their hooks run. */
  plugins?: readonly Plugin<any>[]
  /**
   * Content for plugins, by plugin id and then list: `data.quests.quests`.
   * Merged from packs by id, as scenes are.
   */
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  /** The game's sounds and channels. No audio if left out. */
  audio?: GameAudio
  /** The game's pools of pictures and videos. None if left out. */
  media?: GameMedia
  /** The game's minigames. None if left out. */
  minigames?: MinigameDef[]
  /** The game's timers. None if left out. */
  timers?: TimerDef[]
  /** Presentation hints for the whole game, carried as written. */
  ui?: Ui<GameUi>
  /** What the player cannot do for now, and why. */
  locks?: Lock[]
  /** kv keys put back at the start of each turn. */
  resets?: Record<string, KvValue>
}

export type FrozenPack = {
  id: string
  /** Schema this pack was written against. Refused if it is not ours. */
  schema: number
  /** The version of each plugin's content it was written for. */
  plugins?: Record<string, number>
  scenes?: DataScene[]
  storylines?: StorylineDef[]
  /** Stats the game keeps. A later pack can redeclare one by id. */
  stats?: StatDef[]
  /** Kinds of thing the game keeps several of. A later pack can redeclare one by id. */
  kinds?: KindDef[]
  /** Things of those kinds there at the start. A later pack can redeclare one by kind and id. */
  entities?: EntityDef[]
  /** Traits given to entities, by trait id and then entity, over what each declares. */
  traits?: TraitTable
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  /** What the player can change from a settings screen. A later pack can redeclare one by id. */
  settings?: SettingDef[]
  /** Player-facing words by key, over the engine's and plugins' own. Later packs override earlier ones. */
  strings?: Record<string, string>
  /** Prose by key. Later packs override earlier ones. */
  prose?: Record<string, string>
  /** Other words for the content's fields, by key: a translation. Later packs override earlier ones. */
  words?: Record<string, string>
  /**
   * Variants membership by variants name, in draw order. Later packs append.
   * A member is a prose key, or `{ text: key, weight }` to be drawn more or
   * less often than the rest.
   */
  variants?: Record<string, VariantMember[]>
  /** Surgical changes to content an earlier pack declared. */
  patches?: Patch[]
  /**
   * Content for the game's plugins, by plugin id and then list:
   * `{ quests: { quests: [...] } }`. A later pack's entry replaces an earlier
   * one's by id, as scenes do.
   */
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  /**
   * Sounds, channels and defaults over the game's own. A later pack's track
   * or channel replaces an earlier one's by id; its `mute` and `default`
   * entries win too.
   */
  audio?: Partial<GameAudio>
  /** Pools of pictures and videos. A later pack's pool replaces an earlier one's by id. */
  media?: GameMedia
  /** Minigames. A later pack's replaces an earlier one's by id. */
  minigames?: MinigameDef[]
  /** Timers. A later pack's replaces an earlier one's by id. */
  timers?: TimerDef[]
  /** Actions offered in every location. A later pack's replaces an earlier one's by id. */
  actions?: ActionDef[]
  /** Locks after the ones before; one with an earlier one's `id` takes its place. */
  locks?: Lock[]
  /** kv keys reset each turn. A later pack's value replaces an earlier one's by key. */
  resets?: Record<string, KvValue>
  /** When saving is refused, after the entries before. */
  saveable?: Blocked[]
  /** When the game counts as finished. A later pack's replaces an earlier one's. */
  finished?: FrozenCondition
  /** What a New Game+ carries over. A later pack's replaces an earlier one's. */
  carryOver?: CarryOver
  /** The stretch a new game opens in. A later pack's replaces an earlier one's. */
  kv?: Record<string, KvValue>
  /** The scene on screen on the first frame. A later pack's replaces an earlier one's. */
  introScene?: string
  /** Presentation hints for the whole game, hint by hint. */
  ui?: Ui<GameUi>
}

/** The game's own content: a pack's keys, with a name for problems and no id, schema or patches. */
export type FrozenContent = Omit<FrozenPack, 'id' | 'schema' | 'plugins' | 'patches'> & { name?: string }

export type FrozenView = {
  title: string
  /** How many turns have passed: 0 on the first. */
  turn: number
  /** Where the game is in time, in plugins' words ("Day 3 · Wednesday morning"), or null if none says. */
  when: string | null
  scene: {
    id: string | null
    /** Which screen this is: `scene:<id>`, `minigame:<id>`, `room:<stage id>` or `room`. */
    key: string
    title: string
    body: string
    beats: SceneBeat[]
    fresh: number
    /** The scene's tags, for the UI to style it by. */
    tags: string[]
    speaker: SpeakerView | null
    image: string | null
    /** The scene's layered picture and its hotspots, or null when it has none. See `stageView`. */
    stage: StageView | null
    choices: RenderedChoice[]
    /** The scene's presentation hints, as written. */
    ui?: Ui<SceneUi>
  }
  actions: RenderedChoice[]
  stats: StatView[]
  /** Every declared stat, by id, whether or not it is listed. */
  statsById: Record<string, StatView>
  inScene: boolean
  /** Each listed kind's listed, visible entities, by kind id. */
  entities: Record<string, EntitiesView>
  /** What you hold: the protagonist's things while one is played, then the player's. */
  held: HeldView[]
  notices: NoticesView
  /** The inputs on offer now, by id, with the value each holds. */
  inputs: Record<string, InputView>
  /** What each plugin gives the UI, by plugin id. */
  plugins: Record<string, unknown>
  /** Every setting the game declares, in order, for a settings screen. */
  settings: SettingView[]
  /** What should be playing on each channel, and the sounds that are due. Empty when the game has no audio. */
  audio: AudioView
  /** The minigame being played, or null. */
  minigame: MinigameView | null
  /** The panel open over the story, or null. */
  panel: OpenPanel | null
  /** The rolls the last command made. */
  rolls: Roll[]
  /** The running timers. */
  timers: TimerView[]
  /** Whether the player can save now. */
  saving: SavingView
}
