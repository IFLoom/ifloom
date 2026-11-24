/**
 * @ifloom/react/kit: what you build React components of your own from, on
 * top of `@ifloom/react`. A plugin's UI is the main one, and a game's own
 * screens use the same pieces.
 *
 * - A plugin's UI: `PluginUi`, declared once with `pluginKit` and read in each
 *   component with `usePlugin`, with the hints it reads (`UiHint`).
 * - Parts that bring their own look (`useKitPart`, `KIT_PARTS`, `KIT_LOOKS`,
 *   `KIT_LAYOUT`) and `overridable`, which makes a component one a game's
 *   `components` can replace.
 * - Dialogs and pages that look like the UI's own: `PartDialog`,
 *   `useDialogParts`, `PageHeading`, `BackButton`, `usePageParts`, `PROSE`.
 * - The shadcn/ui primitives the UI is made of, with `cn` and `Icon`.
 *
 * Everything a game draws with (`useGame`, `usePart`, `ChoiceButton`,
 * `Picture`, `Section`, the words) is in `@ifloom/react`.
 */

// A plugin's UI
export { pluginKit, usePlugin } from './game/plugins.tsx'
export type { PluginControls, PluginKit, PluginPage, PluginPanel, PluginUi, PluginViewOf } from './game/plugins.tsx'
export type { HintCheckContext, UiHint } from './hints.ts'

// Parts with a look of their own, and components a game can replace
export { KIT_LAYOUT, KIT_LOOKS, KIT_PARTS, useKitPart } from './game/kit.ts'
export type { KitPart } from './game/kit.ts'
export { overridable } from './game/overrides.tsx'
export type { Override } from './game/overrides.tsx'

// Dialogs and pages like the UI's own
export { PartDialog, useDialogParts } from './game/dialog.tsx'
export { BackButton, PageHeading, usePageParts } from './game/pages.tsx'
export { Icon } from './game/icon.tsx'
export type { IconName } from './game/icon.tsx'

// shadcn/ui primitives
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
export { cn, PROSE } from './lib/utils.ts'
