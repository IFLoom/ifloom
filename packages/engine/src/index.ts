/**
 * @ifloom/engine — everything a game needs, from one import.
 *
 * Grouped as the docs are: the game you declare, the state it runs on, the
 * logic that moves it, the systems built in, and the view a UI draws.
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
export { clampStat, formatStat, lackingLine, statOf, statLevel, statValue } from './stats.ts'
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

// Plugins: systems added to the engine, chosen when the game is built
export type {
  Asked,
  CallTable,
  CheckTools,
  ContentReferences,
  DefinedPlugin,
  Macro,
  Plugin,
  PluginArgs,
  PluginCommand,
  PluginContext,
  PluginDef,
  PluginEntry,
  PluginProblem,
  PluginReferences,
  PluginSlice,
  Refusal,
  RoomScene,
  StatModifier,
  TurnContext,
} from './plugin.ts'
export { definePlugin, pluginQuery } from './plugin.ts'
// A plugin's calls and data lists, declared once
export type {
  Arg,
  ArgIn,
  ArgOut,
  ArgShape,
  ArgsIn,
  ArgsOut,
  CallArgs,
  CallShapes,
  CallWriter,
  CommandsOf,
  ConditionsOf,
  DataList,
  EffectsOf,
  ListSpec,
  PluginCalls,
  PluginData,
  WrittenAs,
} from './pluginCalls.ts'
export { arg, defineCalls, defineData, list } from './pluginCalls.ts'
export type { TraitEntityDef, TraitKind, TraitKindSpec } from './traitKinds.ts'
export { defineTraitKind } from './traitKinds.ts'
export type { SpeakerView } from './speakers.ts'
export { speakerOf } from './speakers.ts'
export type { CastContact, PartnerQueries, SenderView } from './partners.ts'

// Scenes and prose
export type { Block, Choice, DataScene, FlowChoice } from './scene.ts'
export type { BlockExtras } from './flow.ts'
export { cases, choice, decide, fold, image, jump, minigame, panel, point, say, text, when } from './flow.ts'
export type { VariantMember } from './prose.ts'
export { entityDescription, entityName, fillTokens } from './prose.ts'
export type { InlinePart, InlineSpan, SceneBeat, VideoFlags, VideoView } from './sceneBody.ts'
export { artSrc, inlineMarkup, mediaType, parseBeats, styledBeats } from './sceneBody.ts'

// Media: pools, and the picture
export type { GameMedia, HotspotDef, HotspotView, PictureDef, MediaState, PoolFile, PictureLayer, PictureLayerView, PictureView } from './features/media.ts'

// Presentation hints: carried to the view as written, given meaning by a UI package
export type { BlockUi, ChoiceUi, EntityUi, GameUi, InlineUi, InlineUiArgs, SceneUi, StatUi, Ui } from './features/ui.ts'

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

// Actions and locks
export type { ActionCost } from './action.ts'
export { actionOf, actionReferences, need } from './action.ts'
export { effectsOf, warningOf, whyNot } from './availability.ts'
export type { Lock, LockTarget } from './locks.ts'
export { lockOn, lockedOut } from './locks.ts'

// Entities, holdings, notices, triggers and input
export type { EntityDef, EntityRef, EntityState, Holder, KindDef, Placement, TraitData, TraitDef, TraitRegistry, TraitTable, TraitTools } from './entities.ts'
export {
  PLAYER,
  YOU,
  anyOf,
  bindCurrent,
  entitiesOf,
  entityImage,
  entityKv,
  entityOf,
  entityTags,
  traitOf,
  entityUi,
  isUnique,
  kindOf,
  parseRef,
  protagonist,
  resolveHolder,
  setTraitState,
  declaredTrait,
  declaredWithTrait,
  traitState,
  withTrait,
  writeEntity,
} from './entities.ts'
export type { CreatedEntity, Select } from './features/entities.ts'
export type { HeldView } from './features/holdings.ts'
export { canHold, give, heldBy, heldCount, holderOf, holdersOf, holding, move, take } from './holdings.ts'
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
export type { Change } from './features/changes.ts'
export type { Phrase, PhraseRow, PhraseWithArgs, Phrases } from './features/phrases.ts'

// Storylines
export { storylineOf, storylineOpen } from './storylines.ts'

// Randomness
export { chance, draw, drawOne, hash, weighted } from './random.ts'

// Loading, checking and saving
export type { Content, GameBase, Loaded, LoadOptions, Pack, Patch } from './loader.ts'
export { SCHEMA, loadGame } from './loader.ts'
export type { CommandStep, ContentStep, ContentTools, PackContext, RawCommand, RawPack } from './upgrade.ts'
export { upgradePack } from './upgrade.ts'
export type { WordField, WordPart, WordShape } from './words.ts'
export { translatableFields } from './words.ts'
export type { Checked, FileRef, Probe, Problem } from './check.ts'
export { checkGame, describeProblem } from './check.ts'
export type { Reference } from './references.ts'
export type { BrokenSave, LoadedSave, SaveExtra, SaveFile, SaveListing, SaveMeta, Saves } from './save.ts'
export { saves } from './save.ts'
export type { SaveDriver } from './drivers.ts'
export { memoryDriver } from './drivers.ts'
export type { InstalledMod, ModFile, Mods } from './mods.ts'
export { mods, readMod } from './mods.ts'
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
export { panelOf, renderAction, screen, pictureView, priceView } from './screen.ts'
export type { StatView, View, EntitiesView, EntityView, InputView, NoticeView, NoticesView, SettingView } from './view.ts'
export { view } from './view.ts'
