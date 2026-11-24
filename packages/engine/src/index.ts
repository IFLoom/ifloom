/**
 * The main entry of `@ifloom/engine`, with the types and functions you write and run a game with.
 *
 * The exports follow the docs' order: the game you declare, the state it runs on, the logic that changes it, the
 * built-in systems and the view a UI renders. The plugin API is at `@ifloom/engine/plugin`, and test helpers are at
 * `@ifloom/engine/testing`.
 */

// The game: what you declare
export type {
  Game,
  GameRules,
  ActionDef,
  ButtonDef,
  Blocked,
  Once,
  Reason,
  ProseStore,
  SceneMedia,
  CarryOver,
  SettingDef,
  StorylineDef,
  StoryletFields,
} from './game.ts'
export { sceneOf } from './game.ts'
export type { Formula, StatDef, StatLevels, StatRound, StatWords } from './stats.ts'
export { clampStat, lackingLine, statOf, statLevel, statValue } from './stats.ts'
export type { CommandRef, CustomContext, EffectRef, PluginCall, Query, ValueRef } from './custom.ts'
// The registries a plugin (or the game) augments to type its calls by name, its queries and its view
export type {
  CommandCall,
  CommandRegistry,
  ConditionCall,
  ConditionRegistry,
  EffectCall,
  EffectRegistry,
  ViewRegistry,
  ViewsIn,
  QueryRegistry,
} from './custom.ts'
export { buildEffects, callOf, commandOf } from './custom.ts'

// Asking a plugin a question by name
export { pluginQuery } from './plugin.ts'
export type { SpeakerView } from './speakers.ts'

// Scenes and prose
export type { Block, Choice, DataScene, FlowChoice } from './scene.ts'
export type { BlockExtras } from './flow.ts'
export { cases, choice, decide, fold, image, jump, minigame, panel, point, say, text, when } from './flow.ts'
export type { VariantMember } from './prose.ts'
export { entityDescription, entityName, fillTokens } from './prose.ts'
export { proseBeats } from './beats.ts'
export type { BeatSize, InlinePart, InlineSpan, SceneBeat, VideoFlags, VideoView } from './sceneBody.ts'
export { artSrc, inlineMarkup, mediaType } from './sceneBody.ts'

// Media: pools, and the picture
export type { GameMedia, HotspotDef, HotspotView, PictureDef, MediaState, PoolFile, PictureLayer, PictureLayerView, PictureView } from './features/media.ts'

// Presentation hints: carried to the view as written, given meaning by a UI package
export type { BlockUi, ChoiceUi, EntityUi, GameUi, InlineUi, InlineUiArgs, SceneUi, StatUi, Ui, UiTarget } from './features/ui.ts'

// Audio
export type { AudioChannelView, AudioCue, AudioState, AudioView, ChannelDef, GameAudio, PlaylistDef, TrackDef } from './features/audio.ts'
export { audioSrc } from './features/audio.ts'

// The state
export type { Command, Effect, KvValue, GameState, StatKey, Stats, StorylineState } from './types.ts'
export type { Times } from './features/scenes.ts'
export type { FlowState, FlowStep } from './features/flows.ts'
export { SAVE_VERSION } from './types.ts'

// Player-facing words
export type { StringKey, Strings } from './strings.ts'
export { STRINGS, reasonOf, stringOf } from './strings.ts'

// Running the game
export type { Result } from './result.ts'
export type { Applied } from './reduce.ts'
export { apply, applyEffects } from './reduce.ts'
export type { FillPart, MigrationTools, StartOptions } from './intake.ts'
export { loadState, startingState } from './intake.ts'

// Conditions, and why they hold
export type { Condition, Range } from './condition.ts'
export type { Amount } from './types.ts'
export { holds } from './condition.ts'
export { amountOf, inRange } from './amount.ts'
export type { Explanation } from './explain.ts'
export { explain, explainText } from './explain.ts'

// Actions
export type { ActionCost } from './action.ts'
export { actionOf, need } from './action.ts'
export { effectsOf, whyNot } from './availability.ts'

// Entities, holdings, notices, triggers and input
export type { EntityDef, EntityRef, EntityState, Holder, KindDef, Placement, TraitData, TraitRegistry, TraitSource, TraitTable } from './entities.ts'
export {
  PLAYER,
  YOU,
  entitiesOf,
  entityImage,
  entityKv,
  entityOf,
  entityTags,
  traitOf,
  isUnique,
  parseRef,
  protagonist,
  resolveHolder,
  declaredTrait,
  declaredWithTrait,
  withTrait,
  writeEntity,
} from './entities.ts'
export type { CreatedEntity, CreateFields, Select } from './features/entities.ts'
export type { HeldView } from './features/holdings.ts'
export { canHold, give, heldBy, heldCount, holderOf, holding, move, take } from './holdings.ts'
export type { Notice } from './notices.ts'
export { dismiss, notify } from './notices.ts'
export type { TriggerDef } from './features/triggers.ts'
export type { InputDef } from './features/inputs.ts'

// Minigames
export type {
  MinigameDef,
  MinigameInput,
  MinigameSceneFields,
  MinigameState,
  MinigameStateDef,
  MinigameTarget,
  MinigameTransition,
  MinigameView,
} from './features/minigames.ts'

// Timers
export type { RunningTimer, TimerDef, TimerView } from './features/timers.ts'

// Panels
export type { OpenPanel, ScenePanel } from './features/panels.ts'
export type { SavingView } from './features/saving.ts'
export type { Dice, Roll, RollsState } from './features/rolls.ts'
export type { Change, ChangesDef, ChangeView } from './features/changes.ts'
export type { Phrase, PhraseRow, PhraseWithArgs, Phrases } from './features/phrases.ts'

// Storylines
export { storylineOpen } from './storylines.ts'

// Randomness
export { chance, draw, drawOne, hash, weighted } from './random.ts'

// Loading, checking and saving
export type { Content, GameBase, Loaded, LoadOptions, Pack, Patch } from './loader.ts'
export { SCHEMA, loadGame } from './loader.ts'
export type { RawPack } from './upgrade.ts'
export { upgradePack } from './upgrade.ts'
export type { WordField, WordPart, WordShape } from './words.ts'
export { translatableFields } from './words.ts'
export type { Checked, FileRef, Probe, Problem, UiField, UiInContent, TextLine } from './check.ts'
export { checkGame, describeProblem, uiInContent } from './check.ts'

export type { BrokenSave, LoadedSave, SaveExtra, SaveFile, SaveListing, SaveMeta, Saves } from './save.ts'
export { saves } from './save.ts'
export type { SaveDriver } from './drivers.ts'
export { memoryDriver } from './drivers.ts'
export type { InstalledMod, ModFile, Mods } from './mods.ts'
export { mods } from './mods.ts'
export type { Profile } from './profile.ts'
export { profile } from './profile.ts'

// The runner a UI drives
export type {
  AutosaveOptions,
  BacklogEntry,
  BacklogOptions,
  CommandLog,
  HelperRegistry,
  HelpersIn,
  HistoryOptions,
  Runner,
  RunnerOptions,
  RunnerSnapshot,
} from './runner.ts'
export { createRunner, replay } from './runner.ts'

// The view a UI draws, and the screen it is built from
export type { Price, RenderedChoice, Screen, ScreenChoice, ScreenScene, ViewOptions } from './screen.ts'
export { inlineChoices } from './screen.ts'
export { screen } from './screen.ts'
export type { StatView, View, EntitiesView, EntityView, InputView, NoticeView, NoticesView, SettingView } from './view.ts'
export { view } from './view.ts'
