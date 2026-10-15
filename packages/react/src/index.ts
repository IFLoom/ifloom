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
export type { GameContextValue, GameProviderProps, ModsOption, PanelComponent, PluginSectionComponent } from './game/context.tsx'
export { GameShell } from './game/shell.tsx'
export { Actions, DEFAULT_LAYOUT, Parts, READING_LAYOUT, Sidebar, Title } from './game/layout.tsx'
export type { Layout, Part, PartName, SidebarProps } from './game/layout.tsx'
export { Frame } from './game/shell.tsx'
export type { FrameProps, GameShellProps } from './game/shell.tsx'
export { PART_KEYS, UiProvider, overridable, usePart } from './game/overrides.tsx'
export type { Classes, Components, Override, PartKey, UiOptions } from './game/overrides.tsx'
export { Icon } from './game/icon.tsx'
export type { IconName } from './game/icon.tsx'
export { mountGame } from './game/mount.tsx'
export type { MountOptions } from './game/mount.tsx'
export { SceneStage, Beat } from './game/scene.tsx'
export { ChoiceButton, ChoiceList, PriceTag } from './game/choices.tsx'
export { Clock, StatList, LocationPanel, PeoplePanel } from './game/sidebar.tsx'
export { Notice, Notices } from './game/notices.tsx'
export { QuestLog } from './game/quests.tsx'
export { DeviceButtons, DeviceDialog, DeviceScreen, AppSection, useDevices, useDevice } from './game/device.tsx'
export type { DevicesState, DeviceState } from './game/device.tsx'
export { MessagesSection, FeedSection } from './game/sections.tsx'
export { DebugPanel } from './game/debug.tsx'
export { Picture } from './game/picture.tsx'
export { assetUrl } from './game/assets.ts'
export { WardrobePanel } from './game/wardrobe.tsx'
export { Inventory } from './game/inventory.tsx'
export { EntityTable } from './game/entities.tsx'
export { InputField, InputFields } from './game/inputs.tsx'
export { Backlog, useBacklog } from './game/backlog.tsx'
export { SavesMenu, useSaves } from './game/saves.tsx'
export type { SavesState } from './game/saves.tsx'
export { GameMenu } from './game/menu.tsx'
export { CreditsScreen, GateScreen, LoadScreen, SettingsScreen, TitleScreen, useProfile, useScreen, useSetting } from './game/screens.tsx'
export type { Credit, GateOptions, Screen, ScreenDef, ScreenState, ScreensOptions } from './game/screens.tsx'
export { ModManager, useMods } from './game/mods.tsx'
export type { ModsState } from './game/mods.tsx'
export { UI_STRINGS, uiSay, useWords } from './game/words.ts'
export type { UiStringKey } from './game/words.ts'

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
export { cn } from './lib/utils.ts'
