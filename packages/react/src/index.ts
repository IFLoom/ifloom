/**
 * @ifloom/react — the React UI: components, built on shadcn/ui, that draw
 * an IFLoom game's view and send its commands.
 *
 * `GameShell` is the whole thing in one component. Everything it is made of is
 * exported too, as are the shadcn/ui primitives, so a game can rearrange it,
 * restyle it with the theme's CSS variables, or build its own screens from the
 * same parts.
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
export { KIT_PARTS, PART_KEYS, UiProvider, overridable, useKitPart, usePart } from './game/overrides.tsx'
export type { Classes, Components, KitPart, Override, OverridableComponents, PartKey, PartNames, UiOptions } from './game/overrides.tsx'
export { Plugins, usePluginUis } from './game/plugins.tsx'
export type { PluginPage, PluginPanel, PluginSpot, PluginUi } from './game/plugins.tsx'
export { Icon } from './game/icon.tsx'
export type { IconName } from './game/icon.tsx'
export { mountGame } from './game/mount.tsx'
export { useAudio } from './game/audio.ts'
export type { MountOptions } from './game/mount.tsx'
export { Scene, Beat } from './game/scene.tsx'
export { BUILT_IN_INLINE, InlineAction, InlineImage, InlineMail, InlineModal, InlineMono, InlineProp, InlineTrigger, Tip } from './game/inline.tsx'
export { useMotion, useReducedMotion } from './game/motion.tsx'
// The hints the React UI reads from content's `ui` fields, typed by augmenting the engine's hint interfaces.
export {
  DEFAULT_REVEAL_DELAY,
  DEFAULT_TRANSITION_MS,
  DICE_ROLL_MS,
  MAX_PIPS,
  TRANSITIONS,
  lastReveal,
  revealGroups,
  rollFor,
  screenTransition,
} from './hints.ts'
export type { Reveal, RevealGroup, RevealPoint, ScreenTransition, StatDisplay, Transition, TransitionName } from './hints.ts'
export { checkUiHints } from './check.ts'
export { ChoiceButton, ChoiceList, PriceTag } from './game/choices.tsx'
export { Clock, StatGauge, StatList, useClock } from './game/sidebar.tsx'
export type { ClockState } from './game/sidebar.tsx'
export { Notice, Notices } from './game/notices.tsx'
export { NoticeStrip } from './game/strip.tsx'
export { MinigameCard, useMinigame } from './game/minigame.tsx'
export { DiceOverlay, DiceRoll, useFreshRolls } from './game/dice.tsx'
export type { DiceRollProps } from './game/dice.tsx'
export { Countdown, Timers, timerShare, timerUrgent, useTimer, useTimers, useTicking } from './game/timers.tsx'
export type { CountdownProps } from './game/timers.tsx'
export { ChangeItem, Changes } from './game/changes.tsx'
export type { MinigameControls } from './game/minigame.tsx'
export type { KeyOptions } from './game/keys.tsx'
export { BUILT_IN_PANELS, PanelHost } from './game/panels.tsx'
export { DIALOG_CLASSES, PartDialog, useDialogParts } from './game/dialog.tsx'
export { Picture } from './game/picture.tsx'
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
export {
  BackButton,
  CreditsPage,
  GatePage,
  LoadPage,
  PageHeading,
  SettingsPage,
  TitlePage,
  WithPages,
  usePageParts,
  useProfile,
  usePage,
  useSetting,
} from './game/pages.tsx'
export type { Credit, GateOptions, Page, PageDef, PageState, PagesOptions } from './game/pages.tsx'
export { ModManager, useMods } from './game/mods.tsx'
export type { ModsState } from './game/mods.tsx'
export { UI_STRINGS, uiSay, useWords } from './game/words.ts'
export type { Say, UiStringKey, Words } from './game/words.ts'

// shadcn/ui primitives, for the game's own screens
export { Button, buttonVariants } from './components/ui/button.tsx'
export type { ButtonProps } from './components/ui/button.tsx'
export { Badge, badgeVariants } from './components/ui/badge.tsx'
export type { BadgeProps } from './components/ui/badge.tsx'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card.tsx'
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog.tsx'
export type { DialogContentProps } from './components/ui/dialog.tsx'
export { ScrollArea } from './components/ui/scroll-area.tsx'
export { Separator } from './components/ui/separator.tsx'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs.tsx'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip.tsx'
export { cn, ENTRY_CLASSES, PROSE } from './lib/utils.ts'
