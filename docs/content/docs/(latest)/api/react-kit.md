---
title: "@ifloom/react/kit"
description: "Every export of @ifloom/react/kit, what a plugin's or a game's own React components are built from: its signature and its fields."
---
Generated from the source of `@ifloom/react/kit` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Components: [`BackButton`](#backbutton), [`Badge`](#badge), [`Button`](#button), [`Card`](#card), [`CardContent`](#cardcontent), [`CardDescription`](#carddescription), [`CardFooter`](#cardfooter), [`CardHeader`](#cardheader), [`CardTitle`](#cardtitle), [`Dialog`](#dialog), [`DialogClose`](#dialogclose), [`DialogContent`](#dialogcontent), [`DialogDescription`](#dialogdescription), [`DialogHeader`](#dialogheader), [`DialogTitle`](#dialogtitle), [`DialogTrigger`](#dialogtrigger), [`PageHeading`](#pageheading), [`PartDialog`](#partdialog), [`ScrollArea`](#scrollarea), [`Separator`](#separator), [`Tabs`](#tabs), [`TabsContent`](#tabscontent), [`TabsList`](#tabslist), [`TabsTrigger`](#tabstrigger), [`Tooltip`](#tooltip), [`TooltipContent`](#tooltipcontent), [`TooltipProvider`](#tooltipprovider), [`TooltipTrigger`](#tooltiptrigger)
- Functions: [`badgeVariants`](#badgevariants), [`buttonVariants`](#buttonvariants), [`cn`](#cn), [`overridable`](#overridable), [`pluginKit`](#pluginkit-1), [`useDialogParts`](#usedialogparts), [`useKitPart`](#usekitpart), [`usePageParts`](#usepageparts), [`usePlugin`](#useplugin)
- Constants: [`Icon`](#icon), [`KIT_LAYOUT`](#kit_layout), [`KIT_LOOKS`](#kit_looks), [`KIT_PARTS`](#kit_parts), [`PROSE`](#prose)
- Types: [`BadgeProps`](#badgeprops), [`ButtonProps`](#buttonprops), [`DialogContentProps`](#dialogcontentprops), [`HintCheckContext`](#hintcheckcontext), [`IconName`](#iconname), [`KitPart`](#kitpart), [`Override`](#override), [`PluginControls`](#plugincontrols), [`PluginKit`](#pluginkit), [`PluginPage`](#pluginpage), [`PluginPanel`](#pluginpanel), [`PluginUi`](#pluginui), [`PluginViewOf`](#pluginviewof), [`UiHint`](#uihint)

## BackButton

Component. Explained in [Plugin UIs and the kit](/docs/react/kit#pageheading-and-backbutton).

The page's Back button, the `page-back` part: `usePage().back()`.

```ts shape
import { BackButton } from '@ifloom/react/kit'
function BackButton(): JSX.Element
```

## Badge

Component. Explained in [Components](/docs/react/components#badge).

```ts shape
import { Badge } from '@ifloom/react/kit'
function Badge(props: BadgeProps): JSX.Element
```

Uses: [`BadgeProps`](#badgeprops).

## BadgeProps

Type. Explained in [Components](/docs/react/components#badgeprops).

```ts shape
import type { BadgeProps } from '@ifloom/react/kit'
type BadgeProps = {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | null
  // …
}
```

Plugins add fields of their own to it, which their pages list.

## badgeVariants

Function.

```ts fragment
function badgeVariants(props?: (ConfigVariants<{ variant: { default: string; secondary: string; outline: string; destructive: string; }; }> & ClassProp) | undefined): string
```

## Button

Component. Explained in [Components](/docs/react/components#button).

```ts shape
import { Button } from '@ifloom/react/kit'
function Button(props: ButtonProps): JSX.Element
```

Uses: [`ButtonProps`](#buttonprops).

## ButtonProps

Type. Explained in [Components](/docs/react/components#buttonprops).

```ts shape
import type { ButtonProps } from '@ifloom/react/kit'
type ButtonProps = {
  variant?: 'link' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | null
  size?: 'default' | 'sm' | 'lg' | 'icon' | null
  asChild?: boolean
  // …
}
```

Plugins add fields of their own to it, which their pages list.

## buttonVariants

Function.

```ts fragment
function buttonVariants(props?: (ConfigVariants<{ variant: { default: string; secondary: string; outline: string; ghost: string; destructive: string; link: string; }; size: { default: string; sm: string; lg: string; icon: string; }; }> & ClassProp) | undefined): string
```

## Card

Component. Explained in [Components](/docs/react/components#card).

```ts shape
import { Card } from '@ifloom/react/kit'
function Card(props: ComponentProps<'div'>): JSX.Element
```

## CardContent

Component.

```ts shape
import { CardContent } from '@ifloom/react/kit'
function CardContent(props: ComponentProps<'div'>): JSX.Element
```

## CardDescription

Component.

```ts shape
import { CardDescription } from '@ifloom/react/kit'
function CardDescription(props: ComponentProps<'p'>): JSX.Element
```

## CardFooter

Component.

```ts shape
import { CardFooter } from '@ifloom/react/kit'
function CardFooter(props: ComponentProps<'div'>): JSX.Element
```

## CardHeader

Component.

```ts shape
import { CardHeader } from '@ifloom/react/kit'
function CardHeader(props: ComponentProps<'div'>): JSX.Element
```

## CardTitle

Component.

```ts shape
import { CardTitle } from '@ifloom/react/kit'
function CardTitle(props: ComponentProps<'h3'>): JSX.Element
```

## cn

Function. Explained in [Components](/docs/react/components#cn).

Join class names, letting a later Tailwind class win over an earlier one. shadcn/ui's `cn`.

```ts fragment
function cn(...inputs: ClassValue[]): string
```

## Dialog

Component. Explained in [Components](/docs/react/components#dialog).

```ts fragment
function Dialog(props: DialogProps): ReactNode | Promise<ReactNode>
```

## DialogClose

Component.

```ts fragment
function DialogClose(props: DialogCloseProps & RefAttributes<HTMLButtonElement>): ReactNode
```

## DialogContent

Component.

```ts shape
import { DialogContent } from '@ifloom/react/kit'
function DialogContent(props: DialogContentProps): JSX.Element
```

Uses: [`DialogContentProps`](#dialogcontentprops).

## DialogContentProps

Type. Explained in [Components](/docs/react/components#dialogcontentprops).

```ts fragment
type DialogContentProps = {
  bare?: boolean
  closeLabel?: string
  closeIcon?: ReactNode
  overlayProps?: (DialogOverlayProps & RefAttributes<HTMLDivElement>) | undefined
  closeProps?: (DialogCloseProps & RefAttributes<HTMLButtonElement>) | undefined
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `bare` | `boolean` | yes |  | Skip the built-in classes on the content, the overlay and the close button, so the caller styles them all. |
| `closeLabel` | `string` | yes |  | The screen-reader text on the close button. |
| `closeIcon` | `ReactNode` | yes |  | The close button's icon. |
| `overlayProps` | `(DialogOverlayProps & RefAttributes<HTMLDivElement>) \| undefined` | yes |  | Attributes for the overlay behind the dialog (a `className`, a `data-part`). |
| `closeProps` | `(DialogCloseProps & RefAttributes<HTMLButtonElement>) \| undefined` | yes |  | Attributes for the close button. |

## DialogDescription

Component.

```ts fragment
function DialogDescription(props: DialogDescriptionProps & RefAttributes<HTMLParagraphElement>): JSX.Element
```

## DialogHeader

Component.

```ts shape
import { DialogHeader } from '@ifloom/react/kit'
function DialogHeader(props: ComponentProps<'div'>): JSX.Element
```

## DialogTitle

Component.

```ts fragment
function DialogTitle(props: DialogTitleProps & RefAttributes<HTMLHeadingElement> & { bare?: boolean; }): JSX.Element
```

## DialogTrigger

Component.

```ts fragment
function DialogTrigger(props: DialogTriggerProps & RefAttributes<HTMLButtonElement>): ReactNode
```

## HintCheckContext

Type. Explained in [Presentation hints](/docs/react/hints#hintcheckcontext).

What a hint's check is told: the game, what the hint is written on (and its id, where it has one), and the transition names the game has.

```ts shape
import type { HintCheckContext } from '@ifloom/react/kit'
type HintCheckContext = {
  game: Game
  on: UiTarget
  id?: string
  transitions: ReadonlySet<string>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | [`Game`](/docs/api/engine#game) |  |  | The loaded game, for a hint that names something in it. |
| `on` | [`UiTarget`](/docs/api/engine#uitarget) |  |  | What the hint is written on: a scene, a choice, a block, a stat, an entity or the game. |
| `id` | `string` | yes |  | The id of what it's written on: a stat's, a scene's, a choice's, a kind's or an entity's reference. |
| `transitions` | `ReadonlySet<string>` |  |  | `TRANSITIONS` and the game's own `ui.transitionNames`. |

## Icon

Const. Explained in [Components](/docs/react/components#icon).

One of the UI's icons. Replace it in `components` to use your own set everywhere.

```ts shape
import { Icon } from '@ifloom/react/kit'
const Icon: ComponentType<{ name: IconName; label?: string; }>
```

Uses: [`IconName`](#iconname).

## IconName

Type. Explained in [Components](/docs/react/components#iconname).

The icons the UI draws, by what they're for.

```ts shape
import type { IconName } from '@ifloom/react/kit'
type IconName = 'close' | 'back' | 'warning' | 'voice' | 'zoom' | 'menu' | 'chevron'
```

## KIT_LAYOUT

Const. Explained in [Plugin UIs and the kit](/docs/react/kit#kit_layout).

The layout classes the React UI's stylesheet always has, for laying out a
plugin's parts: flex and grid, gaps, alignment, growing and shrinking, text
sizes and weights, and an entry's buttons beside its words from Tailwind's
`sm` up. With the kit's
looks, `buttonVariants`, `badgeVariants`, `PROSE` and `useDialogParts`, a
plugin's UI needs no class of its own, so it needs no stylesheet. A class
not here may be missing from `styles.min.css`; a UI that needs one ships
its own stylesheet.

```ts shape
import { KIT_LAYOUT } from '@ifloom/react/kit'
const KIT_LAYOUT: readonly ['flex', 'inline-flex', 'grid', 'contents', 'hidden', 'flex-col', 'flex-row', 'flex-wrap', 'flex-1', 'shrink-0', 'min-w-0', 'w-full', 'items-start', 'items-center', 'items-end', 'justify-between', 'justify-end', 'self-start', 'self-end', 'self-center', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-3', 'gap-4', 'text-left', 'text-right', 'text-xs', 'text-sm', 'font-normal', 'font-medium', 'tabular-nums', 'truncate', 'sm:flex-row', 'sm:items-start', 'sm:w-44', 'sm:shrink-0']
```

## KIT_LOOKS

Const. Explained in [Plugin UIs and the kit](/docs/react/kit#kit_looks).

How each kit part looks with no preset, in the theme's tokens: the classes
`useKitPart` starts from. A card is boxed, edged in the primary colour once
done and dashed while still open (never faded, so its words keep their
contrast); a note is small and muted; a meter is a thin bar; an opener is
a small outlined button; and so on. A preset
restyles them by `data-kit`, and a game by `classes` or its own CSS.

```ts shape
import { KIT_LOOKS } from '@ifloom/react/kit'
const KIT_LOOKS: Readonly<Record<KitPart, string>>
```

Uses: [`KitPart`](#kitpart).

## KIT_PARTS

Const. Explained in [Plugin UIs and the kit](/docs/react/kit#kit_parts).

What a part is like, whatever drew it, carried as `data-kit` beside its own
`data-part`: a plugin's goods, jobs and achievements are all `card`s. The
presets style these and the theme's tokens, never a plugin's own parts, so
a plugin's UI looks right in each preset without a stylesheet of its own,
and a game's stylesheet can restyle every card at once.

- `card`: an entry in a list, boxed: a vendor's good, a job, an achievement.
- `item`: an entry in a list, not boxed: a status.
- `title`: an entry's name. `heading`: a list's heading.
- `note`: a line about an entry, quieter than its title.
- `meter`: a bar of progress, with a `<span>` inside as wide as it's got.
- `commands`: buttons that do something, not choices the story offers.
- `opener`: a button that opens something over the page, such as a dialog.
- `form` and `input`: where the player types something, such as a code.
- `badge`: a small label on an entry. `thumb`: a small picture of it.
- `label`: a short word beside a value, such as a slot's name.

An entry that can be done says how it stands in `data-state`: `"done"`, or
`"open"` while it isn't yet. One the player hasn't found yet carries `data-secret`.

```ts shape
import { KIT_PARTS } from '@ifloom/react/kit'
const KIT_PARTS: readonly ['card', 'item', 'title', 'heading', 'note', 'meter', 'commands', 'opener', 'form', 'input', 'badge', 'thumb', 'label']
```

## KitPart

Type. Explained in [Plugin UIs and the kit](/docs/react/kit#kitpart).

```ts shape
import type { KitPart } from '@ifloom/react/kit'
type KitPart = (typeof KIT_PARTS)[number]
```

## overridable

Function. Explained in [Components](/docs/react/components#overridable).

A built-in component that a game can replace by `name`. Used for every component the UI exports.

```ts shape
import { overridable } from '@ifloom/react/kit'
function overridable<P extends object>(name: keyof OverridableComponents, Default: ComponentType<P>): ComponentType<P>
```

Uses: [`OverridableComponents`](/docs/api/react#overridablecomponents).

## Override

Type. Explained in [Components](/docs/react/components#override).

A replacement for a built-in component. It gets the same props, and the built-in one as `Default`.

```ts shape
import type { Override } from '@ifloom/react/kit'
type Override<P> = ComponentType<P & { Default: ComponentType<P> }>
```

## PageHeading

Component. Explained in [Plugin UIs and the kit](/docs/react/kit#pageheading-and-backbutton).

A page's heading, as the built-in pages have: the `page-heading` part. A page a plugin or game adds uses it too.

```ts shape
import { PageHeading } from '@ifloom/react/kit'
function PageHeading(props: { children: ReactNode }): JSX.Element
```

## PartDialog

Component. Explained in [Components](/docs/react/components#partdialog).

A dialog drawn with the UI's `dialog` parts, as the menu's is: open while
`open` is true, titled `title`, calling `onClose` when the player closes it.
`PanelHost` and the plugins' UIs use it, and a layout of your own can too.

```ts shape
import { PartDialog } from '@ifloom/react/kit'
function PartDialog(props: { open: boolean; onClose: () => void; title: string; children: ReactNode }): JSX.Element
```

## PluginControls

Type. Explained in [Plugin UIs and the kit](/docs/react/kit#plugincontrols-and-pluginviewof).

What `usePlugin` gives a component: the plugin's view, its words and a way to send its commands.

```ts shape
import type { PluginControls } from '@ifloom/react/kit'
type PluginControls<Id extends string, W extends Words> = {
  view: PluginViewOf<Id> | undefined
  words: Say<(keyof W & string) | UiStringKey>
  send: (command: CommandRef) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `view` | [`PluginViewOf`](#pluginviewof)`<Id> \| undefined` |  |  | The plugin's slice of the view, `view.plugins[id]`, typed; undefined in a game without the plugin. |
| `words` | [`Say`](/docs/api/react#say)`<(keyof W & string) \|` [`UiStringKey`](/docs/api/react#uistringkey)`>` |  |  | Say one of the plugin's words, or the UI's, by key: the game's `ui.<key>` over the English. |
| `send` | `(command:` [`CommandRef`](/docs/api/engine#commandref)`) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Run a command, as the plugin's helpers write it: `send(shop.buy(vendor, entity))`, or a button's `command` from the view. Returns what `runner.apply` returned, so a caller can show a refusal. |

## PluginKit

Type. Explained in [Plugin UIs and the kit](/docs/react/kit#pluginkit-1).

One plugin's UI, declared once: its id and its words. Spread it into the
module's `PluginUi`, and hand it to `usePlugin` in each component, so the
words are written in one place and the view comes typed.

```ts shape
import type { PluginKit } from '@ifloom/react/kit'
type PluginKit<Id extends string = string, W extends Words = Words> = {
  readonly id: Id
  readonly words: W
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `Id` |  |  | The plugin's id, as its engine side names it. |
| `words` | `W` |  |  | Its words in English, by key. A game rewords any with `ui.<key>` in its strings. |

## pluginKit

Function. Explained in [Plugin UIs and the kit](/docs/react/kit#pluginkit).

Declare a plugin's UI once, by the plugin's id and its words, for
`usePlugin` and the module's `PluginUi`:

  const SHOP = pluginKit('shop', SHOP_WORDS)
  export const shopUi: PluginUi = { ...SHOP, panels: { ... } }
  // in a component: const { view, words, send } = usePlugin(SHOP)

```ts shape
import { pluginKit } from '@ifloom/react/kit'
function pluginKit<const Id extends string, const W extends Words = Record<never, string>>(id: Id, words?: W): PluginKit<Id, W>
```

Uses: [`Words`](/docs/api/react#words), [`PluginKit`](#pluginkit).

## PluginPage

Type. Explained in [Plugin UIs and the kit](/docs/react/kit#pluginpage).

A page a plugin UI adds among the pages around the game, as a game's `PageDef` does.

```ts shape
import type { PluginPage } from '@ifloom/react/kit'
type PluginPage = {
  label: string
  component: ComponentType
  showOnTitle?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `label` | `string` |  |  | The title screen's button for it: a key of the module's words (or the UI's). |
| `component` | `ComponentType` |  |  | What the page shows. It's drawn inside the game, so `useGame()` works in it. |
| `showOnTitle` | `boolean` | yes |  | Whether the title screen offers it. On unless set false. |

## PluginPanel

Type. Explained in [Plugin UIs and the kit](/docs/react/kit#pluginpanel).

A panel a plugin UI draws by name, for content's `panel` effect.

```ts shape
import type { PluginPanel } from '@ifloom/react/kit'
type PluginPanel = {
  component: PanelComponent
  title?: string | ((data: Readonly<Record<string, unknown>>, view: View) => string | undefined)
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `component` | [`PanelComponent`](/docs/api/react#panelcomponent) |  |  | What it draws, given what the panel was opened with as `data`. |
| `title` | `string \| ((data: Readonly<Record<string, unknown>>, view:` [`View`](/docs/api/engine#view)`) => string \| undefined)` | yes |  | The dialog's title: a key of the module's words (or the UI's), or a function of what the panel was opened with and the view. Content's `with.title` goes over it. |

## PluginUi

Type. Explained in [Plugin UIs and the kit](/docs/react/kit#pluginui).

A plugin's React UI, as its `/react` subpath exports it (`shopUi`), for a
game's `plugins` list. Everything in it is optional, and it's a plain
object: spread it and leave out what you don't want, such as
`{ ...achievementsUi, pages: undefined }`.

```ts shape
import type { PluginUi } from '@ifloom/react/kit'
type PluginUi = {
  id: string
  words?: Words
  panels?: Readonly<Record<string, PluginPanel>>
  layout?: Readonly<Partial<Record<PluginSpot, readonly ComponentType[]>>>
  sections?: Readonly<Record<string, PluginSectionComponent>>
  inline?: InlineComponents
  hints?: readonly UiHint[]
  pages?: Readonly<Record<string, PluginPage>>
  settings?: { label: string; component: ComponentType }
  components?: Components
  provider?: ComponentType<{ children: ReactNode }>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The plugin's id, as its engine side names it. The module does nothing in a game without that plugin. |
| `words` | [`Words`](/docs/api/react#words) | yes |  | Its words in English, by key. A game rewords any with `ui.<key>` in its strings. |
| `panels` | `Readonly<Record<string,` [`PluginPanel`](#pluginpanel)`>>` | yes |  | Panels by name, which `PanelHost` draws when content opens one. A game's own `panels` of the same name go over these. |
| `layout` | `Readonly<Partial<Record<`[`PluginSpot`](/docs/api/react#pluginspot)`, readonly ComponentType[]>>>` | yes |  | What the default layout places, by spot. A layout of your own places them with `<Plugins at="…" />`, or draws the components itself. |
| `sections` | `Readonly<Record<string,` [`PluginSectionComponent`](/docs/api/react#pluginsectioncomponent)`>>` | yes |  | Renderers for a plugin's section in a device's app, by that plugin's id. The game's own `sections` go over these. |
| `inline` | [`InlineComponents`](/docs/api/react#inlinecomponents) | yes |  | Inline pieces it draws, for `[[ui:name\|…]]` in prose. The game's own `inline` go over these. `checkUiHints` knows their names. |
| `hints` | `readonly` [`UiHint[]`](#uihint) | yes |  | The `ui` hints its components read, declared as `UI_HINTS` declares the React UI's, so `checkUiHints` checks them. |
| `pages` | `Readonly<Record<string,` [`PluginPage`](#pluginpage)`>>` | yes |  | Pages it adds among the pages around the game, by id. A game's own page of the same id goes over it. |
| `settings` | `{ label: string; component: ComponentType }` | yes |  | Something for the settings page, such as a code box: drawn there with pages on, and behind a menu button labelled `label` (a key of its words) without them. |
| `components` | [`Components`](/docs/api/react#components) | yes |  | Built-in components it replaces by name, as a game's `components` do. The game's own go over these. |
| `provider` | `ComponentType<{ children: ReactNode }>` | yes |  | Wraps the game, for state the module keeps beside the runner, such as codes being entered. |

## PluginViewOf

Type. Explained in [Plugin UIs and the kit](/docs/react/kit#plugincontrols-and-pluginviewof).

A plugin's slice of the view, by its id: the type its engine side declares
in the engine's `ViewRegistry`, or `unknown` for a plugin that declares none.

```ts shape
import type { PluginViewOf } from '@ifloom/react/kit'
type PluginViewOf<Id extends string> = Id extends keyof ViewRegistry ? ViewRegistry[Id] : unknown
```

Uses: [`ViewRegistry`](/docs/api/engine#viewregistry).

## PROSE

Const. Explained in [Plugin UIs and the kit](/docs/react/kit#prose).

The story's reading column: capped at `--width-prose` and placed by
`--margin-prose` (centred by default; `Story`'s `align` sets it). Prose,
choices, inputs, the scene's title, exits and the people here use it;
pictures and panels keep the whole column.

```ts shape
import { PROSE } from '@ifloom/react/kit'
const PROSE: 'w-full max-w-(--width-prose) mx-(--margin-prose)'
```

## ScrollArea

Component. Explained in [Components](/docs/react/components#scrollarea).

```ts fragment
function ScrollArea(props: ScrollAreaProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## Separator

Component. Explained in [Components](/docs/react/components#separator).

```ts fragment
function Separator(props: SeparatorProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## Tabs

Component. Explained in [Components](/docs/react/components#tabs).

```ts fragment
function Tabs(props: TabsProps & RefAttributes<HTMLDivElement>): ReactNode
```

## TabsContent

Component.

```ts fragment
function TabsContent(props: TabsContentProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## TabsList

Component.

```ts fragment
function TabsList(props: TabsListProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## TabsTrigger

Component.

```ts fragment
function TabsTrigger(props: TabsTriggerProps & RefAttributes<HTMLButtonElement>): JSX.Element
```

## Tooltip

Component. Explained in [Components](/docs/react/components#tooltip).

```ts fragment
function Tooltip(props: TooltipProps): ReactNode | Promise<ReactNode>
```

## TooltipContent

Component.

```ts fragment
function TooltipContent(props: TooltipContentProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## TooltipProvider

Component.

```ts fragment
function TooltipProvider(props: TooltipProviderProps): ReactNode | Promise<ReactNode>
```

## TooltipTrigger

Component.

```ts fragment
function TooltipTrigger(props: TooltipTriggerProps & RefAttributes<HTMLButtonElement>): ReactNode
```

## UiHint

Type. Explained in [Presentation hints](/docs/react/hints#uihint).

A `ui` hint a UI reads, declared once: its name, where content writes it,
and what's wrong with a value (each problem worded as it follows the place,
`ui.timer "kettle" is not a timer the game has`). `checkUiHints` reports a
hint no declaration names for that place, and runs each one's check. A
plugin UI brings its own in `PluginUi.hints`.

```ts shape
import type { UiHint } from '@ifloom/react/kit'
type UiHint = {
  name: string
  on: readonly UiTarget[]
  check?: ((value: unknown, cx: HintCheckContext) => string | readonly string[] | undefined)
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | The key content writes under `ui`. |
| `on` | `readonly` [`UiTarget[]`](/docs/api/engine#uitarget) |  |  | Where it's written. |
| `check` | `((value: unknown, cx:` [`HintCheckContext`](#hintcheckcontext)`) => string \| readonly string[] \| undefined)` | yes |  | The problems with a value, if any. |

## useDialogParts

Function. Explained in [Plugin UIs and the kit](/docs/react/kit#usedialogparts).

The `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close` parts, with `extra` classes on the dialog.

```ts shape
import { useDialogParts } from '@ifloom/react/kit'
function useDialogParts(extra?: string): { dialog: { 'data-part': PartKey; className: string; }; overlay: { 'data-part': PartKey; className: string; }; title: { 'data-part': PartKey; className: string; }; close: { 'data-part': PartKey; className: string; }; }
```

Uses: [`PartKey`](/docs/api/react#partkey).

## useKitPart

Function. Explained in [Plugin UIs and the kit](/docs/react/kit#usekitpart).

The attributes for a part that's one of the kit's: its `data-part`, its
`data-kit` and its classes, the kit part's look (`KIT_LOOKS`) with `layout`
over it, then a game's `classes` for the part, then `className`, a
caller's. `unstyled` drops the look and the layout, as it does every
built-in class. So `useKitPart('card', 'job')` is a card, and a list entry
with its buttons beside it is `useKitPart('card', 'good', 'sm:flex-row sm:items-start')`.

```ts shape
import { useKitPart } from '@ifloom/react/kit'
function useKitPart(kit: KitPart, name: PartKey, layout?: string, className?: string): { 'data-part': PartKey; 'data-kit': KitPart; className: string }
```

Uses: [`KitPart`](#kitpart), [`PartKey`](/docs/api/react#partkey).

## usePageParts

Function.

The attributes for a page's outer section, as every built-in page has: centred, as wide as `--width-reading`. `part` names it.

```ts shape
import { usePageParts } from '@ifloom/react/kit'
function usePageParts(className?: string, part?: PartKey): { 'data-part': PartKey; className: string; }
```

Uses: [`PartKey`](/docs/api/react#partkey).

## usePlugin

Function. Explained in [Plugin UIs and the kit](/docs/react/kit#useplugin).

A plugin's view, words and commands, for a component of its UI: what
`pluginKit` declared, bound to the game in context. The view is typed by
the plugin's `ViewRegistry` entry, the words are its table with the game's
rewording over them, and `send` takes the commands its helpers write.

```ts shape
import { usePlugin } from '@ifloom/react/kit'
function usePlugin<Id extends string, W extends Words>(kit: PluginKit<Id, W>): PluginControls<Id, W>
```

Uses: [`Words`](/docs/api/react#words), [`PluginKit`](#pluginkit), [`PluginControls`](#plugincontrols).
