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
  RulesCommand,
  RulesContext,
  ActionDef,
  ButtonDef,
  Blocked,
  ProseStore,
  Scene,
  SceneChoice,
  SceneCtx,
  SceneMedia,
  SceneView,
  CarryOver,
  SettingDef,
  StorylineDef,
  StoryletFields,
} from './game.ts'
export { sceneById } from './game.ts'
export { settingValue } from './features/settings.ts'
export type { Formula, StatDef, StatLevels, StatRound, StatWords } from './stats.ts'
export { clampStat, formatStat, lackingLine, levelAt, startingStats, statDef, statLevel, statMax, statValue } from './stats.ts'
export type { CommandRef, CustomCondition, CustomContext, TurnContext, CustomEffect, CustomValue, EffectRef, PluginCall, ValueRef } from './custom.ts'
export { buildEffects, callOf, commandOf, customCondition, customEffect, customValue, hasCustomEffect, previewEffects } from './custom.ts'

// Plugins: systems added to the engine, chosen when the game is built
export type {
  Asked,
  CallTable,
  CheckTools,
  ContentReferences,
  DefinedPlugin,
  Plugin,
  PluginArgs,
  PluginCommand,
  PluginContext,
  PluginEntry,
  PluginProblem,
  PluginReferences,
  PluginSlice,
  Refusal,
  StageDef,
  StatModifier,
} from './plugin.ts'
export { definePlugin, pluginById, pluginQuery } from './plugin.ts'
export type { SpeakerView } from './speakers.ts'
export { speakerOf } from './speakers.ts'

// Scenes and prose
export type { Block, Choice, DataScene, FlowChoice } from './scene.ts'
export { bakeScene, isDataScene } from './scene.ts'
export type { BlockExtras } from './flow.ts'
export { choice, decide, fold, image, jump, minigame, panel, point, say, text, when } from './flow.ts'
export type { VariantMember } from './prose.ts'
export { entityDesc, entityName, fillTokens, proseStore } from './prose.ts'
export type { InlinePart, InlineSpan, SceneBeat, VideoFlags, VideoView } from './sceneBody.ts'
export { artSrc, inlineMarkup, mediaType, parseBeats, styledBeats } from './sceneBody.ts'

// Media: pools, and the stage
export type { GameMedia, HotspotDef, HotspotView, MediaStage, MediaState, PoolFile, StageLayer, StageLayerView, StageView } from './features/media.ts'

// Presentation hints: carried to the view as written, given meaning by a UI package
export type { BlockUi, ChoiceUi, EntityUi, GameUi, InlineUi, InlineUiArgs, SceneUi, StatUi, Ui } from './features/ui.ts'
export { uiProblems } from './features/ui.ts'

// Audio
export type { AudioChannelView, AudioCue, AudioState, AudioView, ChannelDef, GameAudio, PlaylistDef, TrackDef } from './features/audio.ts'
export { audioChannels, audioSrc } from './features/audio.ts'
export { sceneContext } from './context.ts'

// The state
export type { Command, Effect, KvValue, GameState, StatKey, Stats, StorylineState } from './types.ts'
export type { Times } from './features/scenes.ts'
export type { FlowState, FlowStep } from './features/flows.ts'
export { SAVE_VERSION } from './types.ts'

// Player-facing words
export type { StringKey, Strings } from './strings.ts'
export { STRINGS, stringOf } from './strings.ts'

// Running the game
export type { Result } from './result.ts'
export type { Applied } from './reduce.ts'
export { apply, applyEffects, dispatch } from './reduce.ts'
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
export { actionBlocked, actionById, actionReferences, need, payCost } from './action.ts'
export { effectsOf, warningOf, whyNot } from './availability.ts'
export type { Lock, LockTarget } from './locks.ts'
export { lockOn, lockedBy, lockedOut } from './locks.ts'

// Entities, holdings, notices, triggers and input
export type { EntityDef, EntityRef, EntityState, Holder, KindDef, Placement, TraitData, TraitDef, Traits, TraitTable, TraitTools } from './entities.ts'
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
  entityTrait,
  entityUi,
  everyEntity,
  isUnique,
  kindById,
  ownerOf,
  parseRef,
  protagonist,
  resolveHolder,
  setTraitState,
  traitOf,
  traitState,
  withTrait,
  writeEntity,
} from './entities.ts'
export type { CreatedEntity, Select } from './features/entities.ts'
export type { HeldView } from './features/holdings.ts'
export { canHold, give, heldBy, heldCount, heldTotal, holderOf, holdersOf, holding, move, take } from './holdings.ts'
export type { Notice } from './notices.ts'
export { NOTICES_KEPT, dismiss, notify } from './notices.ts'
export type { TriggerDef } from './triggers.ts'
export { fireTriggers } from './triggers.ts'
export type { InputDef } from './inputs.ts'

// Minigames
export type {
  MinigameDef,
  MinigameSceneFields,
  MinigameState,
  MinigameStateDef,
  MinigameTarget,
  MinigameTransition,
  MinigameView,
} from './features/minigames.ts'
export { minigameDef } from './features/minigames.ts'

// Timers
export type { RunningTimer, TimerDef, TimerView } from './features/timers.ts'
export { timerDef } from './features/timers.ts'

// Panels
export type { OpenPanel, ScenePanel } from './features/panels.ts'
export type { SavingView } from './features/saving.ts'
export type { Dice, Roll, RollsState } from './features/rolls.ts'
export { readDice } from './features/rolls.ts'
export { inputById, inputRefusal, inputValue } from './inputs.ts'

// Storylines
export { emptyStoryline, storylineOf, storylineOpen } from './storylines.ts'

// Progress, limits, randomness
export type { Stage, Stages } from './progress.ts'
export { bumped, count, counted, turnsSince, stageAt, stageDone, stageNext, stageOpen, stagesDone } from './progress.ts'
export { markUsed, oncePerTurn, usedBlock, usedThisTurn } from './once.ts'
export { chance, hash, pick, roll, weighted } from './random.ts'

// Loading, checking and saving
export type { Content, GameBase, Loaded, LoadOptions, Pack, Patch } from './loader.ts'
export { SCHEMA, loadGame } from './loader.ts'
export type { CommandStep, ContentStep, ContentTools, PackContext, RawCommand, RawPack } from './upgrade.ts'
export { upgradePack } from './upgrade.ts'
export type { Checked, FileRef, Probe, Problem } from './check.ts'
export { checkGame, describeProblem } from './check.ts'
export type { Reference } from './references.ts'
export type { BrokenSave, LoadedSave, SaveExtra, SaveFile, SaveListing, SaveMeta, Saves } from './save.ts'
export { saves } from './save.ts'
export type { IndexedDbLike, SaveDriver, StorageLike } from './drivers.ts'
export { indexedDbDriver, localStorageDriver, memoryDriver } from './drivers.ts'
export type { InstalledMod, ModFile, Mods } from './mods.ts'
export { mods, readMod } from './mods.ts'
export type { Profile } from './profile.ts'
export { profile } from './profile.ts'

// The runner a UI drives
export type { AutosaveOptions, BacklogEntry, BacklogOptions, CommandLog, HistoryOptions, Runner, RunnerOptions } from './runner.ts'
export { browserRunner, createRunner, replay } from './runner.ts'

// The view a UI draws, and the screen it is built from
export type { Price, RenderedChoice, Screen, ScreenChoice, ScreenScene, ViewOptions } from './screen.ts'
export { inlineChoices } from './screen.ts'
export { renderAction, screen, stageView } from './screen.ts'
export type { StatView, View, EntitiesView, EntityView, InputView, NoticeView, NoticesView, SettingView } from './view.ts'
export { view } from './view.ts'
