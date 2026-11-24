/**
 * @ifloom/react: the React UI, components built on shadcn/ui that render an
 * IFLoom game's view and send its commands.
 *
 * `mountGame` and `GameShell` are the whole thing. Everything they're made of
 * is exported here too (the layout's regions, each component, the hooks they
 * read, and the options that restyle and replace them), so a game can
 * rearrange it, restyle it or replace any part. What you build components of
 * your own from, a plugin's UI above all (`PluginUi`, `pluginKit`, the kit's
 * parts, `overridable` and the shadcn/ui primitives), is in
 * `@ifloom/react/kit`.
 */

// The game
export { GameProvider, useGame } from './game/context.tsx'
export type {
  GameContextValue,
  GameProviderProps,
  InlineComponent,
  InlineComponents,
  InlineProps,
  ModsOption,
  PanelComponent,
  PluginSectionComponent,
} from './game/context.tsx'
export { GameShell } from './game/shell.tsx'
export type { GameShellProps } from './game/shell.tsx'
export { DefaultLayout, RoomActions, Title } from './game/layout.tsx'
export { Game, Overlay, Section, Sidebar, Story, When, useHolds } from './game/regions.tsx'
export type { GameProps, SectionProps, SidebarProps, StoryProps } from './game/regions.tsx'
export { UiProvider, usePart } from './game/overrides.tsx'
export type { BehaviourOptions, Classes, Components, OverridableComponents, PartKey, PartNames, StyleOptions, UiOptions } from './game/overrides.tsx'
export { Plugins, usePluginUis } from './game/plugins.tsx'
export type { PluginSpot } from './game/plugins.tsx'
export { mountGame } from './game/mount.tsx'
export { useAudio } from './game/audio.ts'
export type { MountOptions } from './game/mount.tsx'
export { Scene, Beat, BeatGroup, Fold, SceneHeader } from './game/scene.tsx'
export { useScene } from './game/timing.ts'
export type { RevealBeat, RevealGroup, RevealPoint, SceneRolls, SceneTiming, ScreenTransition } from './game/timing.ts'
export { InlineAction, InlineImage, InlineMail, InlineModal, InlineMono, InlineProp, InlineTrigger, Tip } from './game/inline.tsx'
export { useMotion, useReducedMotion } from './game/motion.tsx'
// The hints the React UI reads from content's `ui` fields, typed by augmenting the engine's hint interfaces.
export { TEXT_SIZES, TRANSITIONS } from './hints.ts'
export type { Reveal, StatDisplay, Transition, TransitionName } from './hints.ts'
export { checkUiHints, type CheckUiOptions } from './check.ts'
export { ChoiceButton, ChoiceList, PriceTag } from './game/choices.tsx'
export { Clock, StatGauge, StatList, useClock } from './game/sidebar.tsx'
export type { ClockState } from './game/sidebar.tsx'
export { Notice, Notices } from './game/notices.tsx'
export { NoticeStrip } from './game/strip.tsx'
export { MinigameCard, useMinigame } from './game/minigame.tsx'
export { DiceOverlay, DiceRoll } from './game/dice.tsx'
export type { DiceRollProps } from './game/dice.tsx'
export { Countdown, Timers, useTimer, useTimers } from './game/timers.tsx'
export type { CountdownProps } from './game/timers.tsx'
export { ChangeItem, Changes } from './game/changes.tsx'
export type { MinigameControls } from './game/minigame.tsx'
export type { KeyOptions } from './game/keys.tsx'
export { PanelHost } from './game/panels.tsx'
export { Picture } from './game/picture.tsx'
export { KeepPicturesOn, TextSize, usePicturesShown } from './game/display.tsx'
export { Video } from './game/video.tsx'
export type { VideoProps } from './game/video.tsx'
export { Hotspot, LayeredPicture } from './game/layered.tsx'
export { MediaViewer } from './game/viewer.tsx'
export type { MediaViewerProps, ViewerMedia } from './game/viewer.tsx'
export { assetUrl } from './game/assets.ts'
export { Inventory } from './game/inventory.tsx'
export type { InventoryProps } from './game/inventory.tsx'
export { EntityTable } from './game/entities.tsx'
export { InputField, InputFields } from './game/inputs.tsx'
export { Backlog, useBacklog } from './game/backlog.tsx'
export { SavesMenu, useSaves } from './game/saves.tsx'
export type { SavesState } from './game/saves.tsx'
export { GameMenu } from './game/menu.tsx'
export { CreditsPage, GatePage, LoadPage, SettingsPage, TitlePage, WithPages, useProfile, usePage, useSetting } from './game/pages.tsx'
export type { Credit, GateOptions, Page, PageDef, PageState, PagesOptions } from './game/pages.tsx'
export { ModManager, useMods } from './game/mods.tsx'
export type { ModsState } from './game/mods.tsx'
export { useWords } from './game/words.ts'
export type { Say, UiStringKey, Words } from './game/words.ts'
