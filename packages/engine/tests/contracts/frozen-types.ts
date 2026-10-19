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
 * `unique`, `listed`, `tags` and `marks`, and `View.entities` lists only what
 * is listed, each `EntityView` with `desc`, `image`, `tags` and `marks`.
 * Traits (phase 3): `Game.traits` and `Pack.traits` (`TraitTable`), and
 * `traits` on `KindDef`, `EntityDef` and `EntityState`. Holdings (phase 4):
 * `GameState.held` and `you`, `View.held`, the `entity` condition's `at` and
 * range, `count`'s `Select` and `units`, the `entity`, `move` and `you`
 * effects, `each`'s selection, and `create`'s `like` and `at` (its `of` and
 * `entity` optional with a `like`).
 */
import type {
  ActionDef,
  ActivityDef,
  AudioState,
  AudioView,
  CarryOver,
  CollectionDef,
  CollectionEntry,
  CollectionItem,
  CollectionView,
  Custom,
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
  ItemDef,
  KindDef,
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
  SavingView,
  Blocked,
  MigrationTools,
  Notice,
  NoticesView,
  Patch,
  Phase,
  Plugin,
  PluginCall,
  PluginEntry,
  PluginSlice,
  ProseStore,
  RenderedChoice,
  SAVE_VERSION,
  Scene,
  SceneBeat,
  SettingDef,
  SettingView,
  SpeakerView,
  StageView,
  StatDef,
  StatKey,
  StatView,
  StorylineDef,
  StorylineState,
  Stats,
  Transition,
  TransitionName,
  TransitionView,
  TriggerDef,
  VariantMember,
} from '../../src/index.ts'

export type FrozenRange = { gte?: number; gt?: number; lte?: number; lt?: number }

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
  | ({ kv: string; is?: KvValue; of?: string } & FrozenRange)
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
  /** A key in a storyline's kv store, read as `kv` reads one. */
  | ({ storylineKv: { storyline: string; key: string }; is?: KvValue } & FrozenRange)
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
  /** How many of an item the player carries. Bare, at least one. */
  | ({ item: string } & FrozenRange)
  /**
   * What is in a collection. With `entry`: that entry is there. Without: how many
   * entries there are, at least one if no range is given.
   */
  | ({ collection: string; entry?: string } & FrozenRange)
  /** The scene on screen is one of these. */
  | { scene: string[] }
  /** How many turns have passed. Turn 0 is the first, so `{ turn: { gte: 3 } }` is the fourth on. */
  | { turn: FrozenRange }
  | { phase: Phase[] }
  /**
   * A variable of the minigame being played, read as a number: bare, whether
   * it is above 0; with a range, whether it is in it. False with no minigame
   * running. `{ minigameVar: 'score', gte: 3 }`.
   */
  | ({ minigameVar: string } & FrozenRange)
  /** A custom condition the game declares by this name, or a plugin's (`quests/done`), with what it is asked. */
  | { custom: string; with?: Record<string, unknown> }
  /** A plugin's condition in short: `{ 'quests/done': { quest: 'bakery' } }`. See `PluginCall`. */
  | PluginCall

/** The whole save. Each field's new-game value and load default are declared in `FIELDS`, intake.ts. */
export type FrozenGameState = {
  version: typeof SAVE_VERSION
  /** Fixed per save. Keeps variant variants from dealing identically every run. */
  seed: number
  phase: Phase
  /**
   * How many turns have passed: the engine's one clock. What a turn is belongs
   * to the game — a day, an hour, a week, a chapter — and everything the engine
   * dates (`seenOn`, `fired`, collection entries, notices) is dated in turns.
   */
  turn: number
  sceneId: string | null
  /**
   * How many times each scene has been entered. The engine's own record of what
   * the player has actually watched, so a chain can say "not until you have seen
   * the rung before this one" without every link needing a hand-written kv key.
   *
   * Re-entering the scene you are already in — a hub redrawing itself after a
   * choice — is not a viewing and does not count.
   */
  seen: Record<string, number>
  /**
   * The turn each scene was first entered. The pace half of a ladder: `seen`
   * says the rung below has happened, this says how long ago, so a rung can
   * ask for a few turns to have passed however fast the stat behind it came in.
   */
  seenOn: Record<string, number>
  /** The turn each scene was last entered. */
  lastSeenOn: Record<string, number>
  /**
   * How many times each choice has been picked, by `scene/choice`. Kept for
   * every choice, so content can branch on an earlier decision without each one
   * needing a kv key of its own.
   */
  chosen: Record<string, number>
  /** The turn each choice was first picked. */
  chosenOn: Record<string, number>
  /** The turn each choice was last picked. */
  lastChosenOn: Record<string, number>
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
  you: string | null
  storylines: Record<string, StorylineState>
  kv: Record<string, KvValue>
  items: Record<string, number>
  /** Each collection's entries, by collection id, oldest first. */
  collections: Record<string, CollectionEntry[]>
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
  /** How the screen after the last command arrives, as a `transition` effect set it, or null. */
  transition: { to: TransitionName; ms?: number } | null
  /** The panel open over the story, or null. */
  panel: OpenPanel | null
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
  /** Anything the pack declares as an ActivityDef: paperwork, a jog, a drink. */
  | { type: 'activity'; id: string }
  | { type: 'scene'; id: string }
  | { type: 'choose'; id: string }
  | { type: 'leave' }
  | { type: 'use'; id: string }
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
  | { kind: 'stat'; stat: StatKey; by: number; of?: string }
  | { kind: 'stat'; stat: StatKey; to: number; of?: string }
  /** A plugin's effect, by its full name. Content writes `{ custom: name, with }`; the engine turns it into this. */
  | { kind: 'custom'; name: string; with?: Record<string, unknown> }
  | { kind: 'storylineKv'; storyline: string; key: string; to: KvValue }
  | { kind: 'storylineKv'; storyline: string; key: string; by: number }
  /**
   * Set a key `to` a value, or change its number `by` an amount (a value
   * that is not a number counts as 0). With `of`, the key is an entity's.
   */
  | { kind: 'kv'; key: string; to: KvValue; of?: string }
  | { kind: 'kv'; key: string; by: number; of?: string }
  /**
   * A new entity of a kind. Its `id` is the next free number (`#1`, `#2`) if
   * left out, never reused; an id already there is left as it is.
   */
  | { kind: 'create'; of: string; like?: string; entity?: CreatedEntity; at?: Placement }
  | { kind: 'create'; of?: string; like: string; entity?: CreatedEntity; at?: Placement }
  /** Take an entity out of the game: `{ kind: 'remove', entity: 'staff:ana' }`. */
  | { kind: 'remove'; entity: string }
  /**
   * The same effects for every entity of a kind (where `where` holds), one
   * after another, with `'$'` as the one each time: wages, upkeep, a bad week.
   */
  | ({ kind: 'each'; effects: EffectRef[] } & Select)
  /** Change how many of a thing a holder (`'you'` if left out) holds, `by` or `to`. */
  | { kind: 'entity'; entity: string; at?: string; by: number }
  | { kind: 'entity'; entity: string; at?: string; to: number }
  /** Move a thing to another holder. */
  | { kind: 'move'; entity: string; from?: string; to: string; by?: number }
  /** Play as a protagonist, or `null` for the player. */
  | { kind: 'you'; to: string | null }
  | { kind: 'scene'; scene: string | null }
  /**
   * Open one scene drawn at random from the scenes whose `drawnFrom` names
   * `from` and whose `when` holds, by their `weight`. With none to draw, open
   * `otherwise` if given, else do nothing. A storylet draw: `{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }`.
   */
  | { kind: 'scene'; from: string; otherwise?: string }
  | { kind: 'item'; item: string; by: number }
  | { kind: 'item'; item: string; to: number }
  | { kind: 'phase'; to: Phase }
  | { kind: 'closeStoryline'; storyline: string; turns: number }
  /** End the turn, `by` times (1 if left out): the game's turn rules run each time. */
  | { kind: 'turn'; by?: number }
  /** Add an entry to a collection. An id already there is left as it is. */
  | { kind: 'collect'; collection: string; entry: CollectionItem }
  /** Take an entry out of a collection, by its id. */
  | { kind: 'discard'; collection: string; entry: string }
  /** Tell the player something outside a scene. `text` is a prose key. */
  | { kind: 'notify'; title: string; text?: string; image?: string; tag?: string; id?: string }
  /**
   * Put a track on a background channel, kept in the save: `{ kind: 'audio', channel: 'music', to: 'calm' }`.
   * `track: null` silences the channel; leaving `track` out hands it back to the place or the game's default.
   */
  | { kind: 'audio'; channel: string; track?: string | null }
  /** Play a sound once, on its track's channel. */
  | { kind: 'sound'; track: string }
  /** Start a minigame, in its `start` state. One already running is dropped. */
  | { kind: 'minigame'; minigame: string }
  /** Set a variable of the minigame being played, change it, or draw it at random. */
  | { kind: 'minigameVar'; key: string; to: number }
  | { kind: 'minigameVar'; key: string; by: number }
  | { kind: 'minigameVar'; key: string; random: [number, number] }
  /** Open a panel by name, with what it needs; `panel: null` closes it. */
  | { kind: 'panel'; panel: string | null; with?: Record<string, unknown> }
  /** The screen this command leaves on comes in with `to`. */
  | { kind: 'transition'; to: TransitionName; ms?: number }

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
   * null for none. Saves record it as `SaveMeta.player`. Left out, saves have no name.
   */
  saveName?: (state: FrozenGameState) => string | null
  /**
   * When the game counts as finished. The runner records the first time it
   * holds in the profile's `core:finished`, so a title screen can offer New Game+.
   */
  finished?: FrozenCondition
  /** The stretch a new game opens in. */
  startPhase?: string
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
  activities?: ActivityDef[]
  items?: ItemDef[]
  /** Hand-written scenes and data scenes, side by side. */
  scenes: (Scene | DataScene)[]
  storylines?: StorylineDef[]
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
  /** The default transition for every scene and room, and the game's own transition names. */
  transitions?: { default?: Transition | TransitionName; names?: string[] }
}

export type FrozenPack = {
  id: string
  /** Schema this pack was written against. Refused if it is not ours. */
  schema: number
  scenes?: (Scene | DataScene)[]
  items?: ItemDef[]
  storylines?: StorylineDef[]
  activities?: ActivityDef[]
  /** Stats the game keeps. A later pack can redeclare one by id. */
  stats?: StatDef[]
  /** Kinds of thing the game keeps several of. A later pack can redeclare one by id. */
  kinds?: KindDef[]
  /** Things of those kinds there at the start. A later pack can redeclare one by kind and id. */
  entities?: EntityDef[]
  /** Traits given to entities, by trait id and then entity, over what each declares. */
  traits?: TraitTable
  collections?: CollectionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  /** What the player can change from a settings screen. A later pack can redeclare one by id. */
  settings?: SettingDef[]
  /** Player-facing words by key, over the engine's and plugins' own. Later packs override earlier ones. */
  strings?: Record<string, string>
  /** Prose by key. Later packs override earlier ones. */
  prose?: Record<string, string>
  /**
   * Variants membership by variants name, in draw order. Later packs append.
   * A member is a prose key, or `{ text: key, weight }` to be drawn more or
   * less often than the rest.
   */
  variants?: Record<string, VariantMember[]>
  /** Named functions content calls. A later pack's replaces an earlier one's by name. */
  custom?: Custom
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
}

/** The game's own content: a pack's keys, with a name for problems and no id, schema or patches. */
export type FrozenContent = Omit<FrozenPack, 'id' | 'schema' | 'patches'> & { name?: string }

export type FrozenView = {
  title: string
  phase: FrozenGameState['phase']
  /** How many turns have passed: 0 on the first. */
  turn: number
  /** Where the game is in time, in plugins' words ("Day 3 · Wednesday morning"), or null if none says. */
  when: string | null
  scene: {
    id: string | null
    title: string
    body: string
    beats: SceneBeat[]
    frame: 'stage' | 'talk'
    /** The scene's tags, for the UI to style it by. */
    tags: string[]
    /** A bespoke panel to render instead of the choice list, by name. */
    panel: string | null
    /** What that panel needs. Opaque here; the panel knows its own shape. */
    panelData: unknown
    speaker: SpeakerView | null
    stageImage: string | null
    /** The scene's layered picture and its hotspots, or null when it has none. See `stageView`. */
    stage: StageView | null
    choices: RenderedChoice[]
  }
  actions: RenderedChoice[]
  stats: StatView[]
  /** Every declared stat, by id, whether or not it is listed. */
  statsById: Record<string, StatView>
  pack: {
    id: string
    name: string
    desc: string
    count: number
    useLabel?: string
  }[]
  inScene: boolean
  /** Every declared collection, with its entries oldest first and their words filled in. */
  collections: Record<string, CollectionView>
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
  /** The screen on show, and how it comes in and goes out. */
  transition: TransitionView
  /** The panel open over the story, or null. */
  panel: OpenPanel | null
  /** Whether the player can save now. */
  saving: SavingView
}
