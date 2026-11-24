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

Component. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#pageheading-and-backbutton).

Renders a page's Back button, the `page-back` part, which calls `usePage().back()`.

```ts shape
import { BackButton } from '@ifloom/react/kit'
function BackButton(): JSX.Element
```

## Badge

Component. Explained in [Components](/docs/reference/react/components#badge).

Renders shadcn/ui's badge, a small rounded label in a `<span>`.

```ts shape
import { Badge } from '@ifloom/react/kit'
function Badge(props: BadgeProps): JSX.Element
```

Uses: [`BadgeProps`](#badgeprops).

## BadgeProps

Type.

The props of `Badge`, a `<span>`'s props and a `variant`.

```ts shape
import type { BadgeProps } from '@ifloom/react/kit'
type BadgeProps = {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | null
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `variant` | `'default' \| 'secondary' \| 'outline' \| 'destructive' \| null` | yes |  | The badge's look, `default`, `secondary`, `outline` or `destructive`. `default` if left out. |

## badgeVariants

Function.

Returns the Tailwind classes for a badge's `variant`, shadcn/ui's badge variants. `default` if left out.

```ts fragment
function badgeVariants(props?: (ConfigVariants<{ variant: { default: string; secondary: string; outline: string; destructive: string; }; }> & ClassProp) | undefined): string
```

## Button

Component. Explained in [Components](/docs/reference/react/components#button).

Renders shadcn/ui's button, a `<button>` styled by `buttonVariants`.

```ts shape
import { Button } from '@ifloom/react/kit'
function Button(props: ButtonProps): JSX.Element
```

Uses: [`ButtonProps`](#buttonprops).

## ButtonProps

Type.

The props of `Button`, a `<button>`'s props with a `variant`, a `size` and `asChild`.

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

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `variant` | `'link' \| 'default' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive' \| null` | yes |  | The button's look, `default`, `secondary`, `outline`, `ghost`, `destructive` or `link`. `default` if left out. |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon' \| null` | yes |  | The button's size, `default`, `sm`, `lg` or `icon` (a square for one icon). `default` if left out. |
| `asChild` | `boolean` | yes |  | True to render the one child element with the button's classes in place of a `<button>`, through Radix's `Slot`. False if left out. |

## buttonVariants

Function.

Returns the Tailwind classes for a button's `variant` and `size`, shadcn/ui's button variants. `default` for both if left out.

```ts fragment
function buttonVariants(props?: (ConfigVariants<{ variant: { default: string; secondary: string; outline: string; ghost: string; destructive: string; link: string; }; size: { default: string; sm: string; lg: string; icon: string; }; }> & ClassProp) | undefined): string
```

## Card

Component. Explained in [Components](/docs/reference/react/components#card).

Renders shadcn/ui's card, a bordered `<div>` on the card colour.

```ts shape
import { Card } from '@ifloom/react/kit'
function Card(props: ComponentProps<'div'>): JSX.Element
```

## CardContent

Component.

Renders a card's content, a padded `<div>`.

```ts shape
import { CardContent } from '@ifloom/react/kit'
function CardContent(props: ComponentProps<'div'>): JSX.Element
```

## CardDescription

Component.

Renders a card's description as a `<p>` in the muted colour.

```ts shape
import { CardDescription } from '@ifloom/react/kit'
function CardDescription(props: ComponentProps<'p'>): JSX.Element
```

## CardFooter

Component.

Renders a card's footer, a padded `<div>` that lines its children up in a row.

```ts shape
import { CardFooter } from '@ifloom/react/kit'
function CardFooter(props: ComponentProps<'div'>): JSX.Element
```

## CardHeader

Component.

Renders a card's header, a `<div>` that stacks its title and description.

```ts shape
import { CardHeader } from '@ifloom/react/kit'
function CardHeader(props: ComponentProps<'div'>): JSX.Element
```

## CardTitle

Component.

Renders a card's title as an `<h3>`.

```ts shape
import { CardTitle } from '@ifloom/react/kit'
function CardTitle(props: ComponentProps<'h3'>): JSX.Element
```

## cn

Function. Explained in [Components](/docs/reference/react/components#cn).

Returns class names joined into one string, a later Tailwind class winning over an earlier one that conflicts. It's shadcn/ui's `cn`.

```ts fragment
function cn(...inputs: ClassValue[]): string
```

## Dialog

Component. Explained in [Components](/docs/reference/react/components#dialog).

Renders a dialog's root, Radix's `Dialog.Root`, which holds whether the dialog is open.

```ts fragment
function Dialog(props: DialogProps): ReactNode | Promise<ReactNode>
```

## DialogClose

Component.

Renders a control that closes its dialog, Radix's `Dialog.Close`.

```ts fragment
function DialogClose(props: DialogCloseProps & RefAttributes<HTMLButtonElement>): ReactNode
```

## DialogContent

Component.

Renders a dialog's box in a portal, over an overlay, with a close button in its corner.

```ts shape
import { DialogContent } from '@ifloom/react/kit'
function DialogContent(props: DialogContentProps): JSX.Element
```

Uses: [`DialogContentProps`](#dialogcontentprops).

## DialogContentProps

Type.

The props of `DialogContent`, Radix's `Dialog.Content` props with the options below.

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
| `bare` | `boolean` | yes |  | True to leave out the built-in classes on the content, the overlay and the close button, so the caller styles them all. False if left out. |
| `closeLabel` | `string` | yes |  | The close button's text for screen readers. `'Close'` if left out. |
| `closeIcon` | `ReactNode` | yes |  | The close button's icon. An X if left out. |
| `overlayProps` | `(DialogOverlayProps & RefAttributes<HTMLDivElement>) \| undefined` | yes |  | The props of the overlay behind the dialog, such as a `className` or a `data-part`. |
| `closeProps` | `(DialogCloseProps & RefAttributes<HTMLButtonElement>) \| undefined` | yes |  | The props of the close button. |

## DialogDescription

Component.

Renders a dialog's description in the muted colour, which screen readers read after the title.

```ts fragment
function DialogDescription(props: DialogDescriptionProps & RefAttributes<HTMLParagraphElement>): JSX.Element
```

## DialogHeader

Component.

Renders a dialog's header, a `<div>` that stacks its title and description.

```ts shape
import { DialogHeader } from '@ifloom/react/kit'
function DialogHeader(props: ComponentProps<'div'>): JSX.Element
```

## DialogTitle

Component.

Renders a dialog's title, which screen readers announce. `bare` leaves out its built-in classes.

```ts fragment
function DialogTitle(props: DialogTitleProps & RefAttributes<HTMLHeadingElement> & { bare?: boolean; }): JSX.Element
```

## DialogTrigger

Component.

Renders the control that opens its dialog, Radix's `Dialog.Trigger`.

```ts fragment
function DialogTrigger(props: DialogTriggerProps & RefAttributes<HTMLButtonElement>): ReactNode
```

## HintCheckContext

Type. Explained in [Presentation hints](/docs/reference/react/hints#hintcheckcontext).

The context a `UiHint`'s check receives, with the game, the target the hint is on and the game's transition names.

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
| `on` | [`UiTarget`](/docs/api/engine#uitarget) |  |  | The sort of target the hint is on, such as a scene, a choice, a block, a stat, an entity or the game. |
| `id` | `string` | yes |  | The target's id, such as a stat's, a scene's or a choice's id, or a kind's or an entity's reference. |
| `transitions` | `ReadonlySet<string>` |  |  | The transition names the game has, `TRANSITIONS` with the game's own `ui.transitionNames`. |

## Icon

Const. Explained in [Components](/docs/reference/react/components#icon).

Renders one of the UI's icons by name, with `label` as its accessible name. Replace `Icon` in `components` to use
your own set everywhere.

```ts shape
import { Icon } from '@ifloom/react/kit'
const Icon: ComponentType<{ name: IconName; label?: string; }>
```

Uses: [`IconName`](#iconname).

## IconName

Type.

The name of an icon the UI renders, named by its use.

```ts shape
import type { IconName } from '@ifloom/react/kit'
type IconName = 'close' | 'back' | 'warning' | 'voice' | 'zoom' | 'menu' | 'chevron'
```

## KIT_LAYOUT

Const. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#kit_layout).

The layout classes the React UI's built stylesheet always has, for laying out a plugin's parts. A class not listed
here may be missing from `styles.min.css`.

A UI that needs an unlisted class ships its own stylesheet.

They cover flex and grid, gaps, alignment, growing and shrinking, text sizes and weights, and an entry's buttons
beside its words from Tailwind's `sm` up. With these, the kit's looks, `buttonVariants`, `badgeVariants`, `PROSE`
and `useDialogParts`, a plugin's UI needs no stylesheet.

```ts shape
import { KIT_LAYOUT } from '@ifloom/react/kit'
const KIT_LAYOUT: readonly ['flex', 'inline-flex', 'grid', 'contents', 'hidden', 'flex-col', 'flex-row', 'flex-wrap', 'flex-1', 'shrink-0', 'min-w-0', 'w-full', 'items-start', 'items-center', 'items-end', 'justify-between', 'justify-end', 'self-start', 'self-end', 'self-center', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-3', 'gap-4', 'text-left', 'text-right', 'text-xs', 'text-sm', 'font-normal', 'font-medium', 'tabular-nums', 'truncate', 'sm:flex-row', 'sm:items-start', 'sm:w-44', 'sm:shrink-0']
```

## KIT_LOOKS

Const. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#kit_looks).

The Tailwind classes each kit part has with no preset, in the theme's tokens, which `useKitPart` starts from. A preset
restyles them by `data-kit`, and a game by `classes` or its own CSS.

A card is boxed, edged in the primary colour once done and dashed while still open. It's never faded, so its words
keep their contrast. A note is small and muted, a meter is a thin bar and an opener is a small outlined button.

```ts shape
import { KIT_LOOKS } from '@ifloom/react/kit'
const KIT_LOOKS: Readonly<Record<KitPart, string>>
```

Uses: [`KitPart`](#kitpart).

## KIT_PARTS

Const. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#kit_parts).

The kit's parts, the sorts of part any component can mark itself as with `data-kit` beside its own `data-part`. A
vendor's goods, a job and an achievement are all `card`s.

The presets style these and the theme's tokens, never a plugin's own parts. So a plugin's UI looks right in each
preset without a stylesheet of its own, and a game's stylesheet can restyle every card at once. The parts are these:

- `card`: a boxed entry in a list, such as a vendor's good, a job or an achievement.
- `item`: an entry in a list without a box, such as a status.
- `title`: an entry's name. `heading`: a list's heading.
- `note`: a line about an entry, quieter than its title.
- `meter`: a progress bar, with a `<span>` inside as wide as the progress.
- `commands`: a group of buttons for a plugin's commands, rather than a scene's choices.
- `opener`: a button that opens something over the page, such as a dialog.
- `form` and `input`: a form and its field for the player to type in, such as a code.
- `badge`: a small label on an entry. `thumb`: a small picture of it.
- `label`: a short word beside a value, such as a slot's name.

An entry that can be done sets `data-state` to `"done"`, or to `"open"` while it isn't yet. An entry the player
hasn't found yet carries `data-secret`.

```ts shape
import { KIT_PARTS } from '@ifloom/react/kit'
const KIT_PARTS: readonly ['card', 'item', 'title', 'heading', 'note', 'meter', 'commands', 'opener', 'form', 'input', 'badge', 'thumb', 'label']
```

## KitPart

Type. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#kitpart).

The name of a kit part in `KIT_PARTS`.

```ts shape
import type { KitPart } from '@ifloom/react/kit'
type KitPart = (typeof KIT_PARTS)[number]
```

## overridable

Function. Explained in [Components](/docs/reference/react/components#overridable).

Returns a component that renders `Default`, or the game's replacement registered under `name` in `components`. Every
component the UI exports is one.

```ts shape
import { overridable } from '@ifloom/react/kit'
function overridable<P extends object>(name: keyof OverridableComponents, Default: ComponentType<P>): ComponentType<P>
```

Uses: [`OverridableComponents`](/docs/api/react#overridablecomponents).

## Override

Type. Explained in [Components](/docs/reference/react/components#override).

A component that replaces a built-in one. It gets the same props, and the built-in component as `Default`.

```ts shape
import type { Override } from '@ifloom/react/kit'
type Override<P> = ComponentType<P & { Default: ComponentType<P> }>
```

## PageHeading

Component. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#pageheading-and-backbutton).

Renders a page's heading, the `page-heading` part, as the built-in pages have. A page a plugin or a game adds uses it too.

```ts shape
import { PageHeading } from '@ifloom/react/kit'
function PageHeading(props: { children: ReactNode }): JSX.Element
```

## PartDialog

Component. Explained in [Components](/docs/reference/react/components#partdialog).

Renders a dialog with the UI's `dialog` parts, open while `open` is true and titled `title`. It calls `onClose` when
the player closes it.

The menu, `PanelHost` and the plugins' UIs use it, and a layout of your own can too.

```ts shape
import { PartDialog } from '@ifloom/react/kit'
function PartDialog(props: { open: boolean; onClose: () => void; title: string; children: ReactNode }): JSX.Element
```

## PluginControls

Type. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#plugincontrols-and-pluginviewof).

The plugin's view, words and `send` that `usePlugin` returns to a component.

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
| `view` | [`PluginViewOf`](#pluginviewof)`<Id> \| undefined` |  |  | The plugin's slice of the view, `view.plugins[id]`, typed. It's undefined in a game without the plugin. |
| `words` | [`Say`](/docs/api/react#say)`<(keyof W & string) \|` [`UiStringKey`](/docs/api/react#uistringkey)`>` |  |  | Returns one of the plugin's words or the UI's by key, the game's `ui.<key>` string over the English. |
| `send` | `(command:` [`CommandRef`](/docs/api/engine#commandref)`) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends a command and returns the runner's result, so a caller can show a refusal. The command is one a plugin helper writes, `send(shop.buy(vendor, entity))`, or a `RenderedChoice`'s `command` from the view. |

## PluginKit

Type. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#pluginkit-1).

A plugin UI's id and words, declared once with `pluginKit`. Spread it into the `PluginUi` and pass it to
`usePlugin` in each component, so every component reads the same words and a typed view.

```ts shape
import type { PluginKit } from '@ifloom/react/kit'
type PluginKit<Id extends string = string, W extends Words = Words> = {
  readonly id: Id
  readonly words: W
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `Id` |  |  | The plugin's id, the same as its engine side's. |
| `words` | `W` |  |  | The UI's words in English, by key. A game rewords any of them with `ui.<key>` in its strings. |

## pluginKit

Function. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#pluginkit).

Returns the `PluginKit` for a plugin's id and its words, for `usePlugin` and the UI's `PluginUi`. The
words are empty if left out.

  const SHOP = pluginKit('shop', SHOP_WORDS)
  export const shopUi: PluginUi = { ...SHOP, panels: { ... } }
  // in a component: const { view, words, send } = usePlugin(SHOP)

```ts shape
import { pluginKit } from '@ifloom/react/kit'
function pluginKit<const Id extends string, const W extends Words = Record<never, string>>(id: Id, words?: W): PluginKit<Id, W>
```

Uses: [`Words`](/docs/api/react#words), [`PluginKit`](#pluginkit).

## PluginPage

Type. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#pluginpage).

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
| `label` | `string` |  |  | The label of the page's button on the title screen, as a key of the module's words or the UI's. |
| `component` | `ComponentType` |  |  | The component that renders the page. It renders inside the game, so `useGame()` works in it. |
| `showOnTitle` | `boolean` | yes |  | True to show a button for the page on the title screen. True if left out. |

## PluginPanel

Type. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#pluginpanel).

A panel a plugin UI renders by name, which content opens with the `panel` effect.

```ts shape
import type { PluginPanel } from '@ifloom/react/kit'
type PluginPanel = {
  component: PanelComponent
  title?: string | ((data: Readonly<Record<string, unknown>>, view: View) => string | undefined)
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `component` | [`PanelComponent`](/docs/api/react#panelcomponent) |  |  | The component that renders the panel. It gets the panel's `with` as `data`. |
| `title` | `string \| ((data: Readonly<Record<string, unknown>>, view:` [`View`](/docs/api/engine#view)`) => string \| undefined)` | yes |  | The panel dialog's title, as a key of the module's words or the UI's, or a function of the panel's `with` and the view. Content's `with.title` replaces it. |

## PluginUi

Type. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#pluginui).

A plugin's React UI, which its `/react` subpath exports (`shopUi`) for a game's `plugins` list. Every field but `id`
is optional.

It's a plain object, so a game spreads it and leaves out the parts it doesn't want, such as
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
| `id` | `string` |  |  | The plugin's id, the same as its engine side's. The UI does nothing in a game without that plugin. |
| `words` | [`Words`](/docs/api/react#words) | yes |  | The UI's words in English, by key. A game rewords any of them with `ui.<key>` in its strings. |
| `panels` | `Readonly<Record<string,` [`PluginPanel`](#pluginpanel)`>>` | yes |  | The UI's panels by name, which `PanelHost` renders when content opens one. A game's own `panels` of the same name replace them. |
| `layout` | `Readonly<Partial<Record<`[`PluginSpot`](/docs/api/react#pluginspot)`, readonly ComponentType[]>>>` | yes |  | The components the layout places, by spot. A layout of your own places them with `<Plugins at="…" />`, or renders them itself. |
| `sections` | `Readonly<Record<string,` [`PluginSectionComponent`](/docs/api/react#pluginsectioncomponent)`>>` | yes |  | The components that render a plugin's section in a device's app, by that plugin's id. The game's own `sections` replace them. |
| `inline` | [`InlineComponents`](/docs/api/react#inlinecomponents) | yes |  | The UI pieces it renders for `[[ui:name\|…]]` in prose, by name. The game's own `inline` replace them, and `checkUiHints` checks their names. |
| `hints` | `readonly` [`UiHint[]`](#uihint) | yes |  | The `ui` hints its components read, each a `UiHint`, so `checkUiHints` checks them as it checks the React UI's own. |
| `pages` | `Readonly<Record<string,` [`PluginPage`](#pluginpage)`>>` | yes |  | The pages it adds among the pages around the game, by id. A game's own page with the same id replaces one. |
| `settings` | `{ label: string; component: ComponentType }` | yes |  | The plugin UI's component for the settings page, such as a box for codes. Without pages it renders behind a menu button labelled by `label`, a key of the UI's words. |
| `components` | [`Components`](/docs/api/react#components) | yes |  | The built-in components it replaces, by name, as a game's `components` do. The game's own replace these. |
| `provider` | `ComponentType<{ children: ReactNode }>` | yes |  | A component that wraps the game, for state the UI keeps beside the runner, such as codes being entered. |

## PluginViewOf

Type. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#plugincontrols-and-pluginviewof).

The type of a plugin's slice of the view, `view.plugins[id]`, by the plugin's id. It's the plugin's entry in the
engine's `ViewRegistry`, or `unknown` for a plugin that declares none.

```ts shape
import type { PluginViewOf } from '@ifloom/react/kit'
type PluginViewOf<Id extends string> = Id extends keyof ViewRegistry ? ViewRegistry[Id] : unknown
```

Uses: [`ViewRegistry`](/docs/api/engine#viewregistry).

## PROSE

Const. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#prose).

The Tailwind classes for the story's reading column, as wide as `--width-prose` and placed by `--margin-prose`. The
column is centred unless `Story`'s `align` moves it.

Prose, choices, inputs, the scene's title, exits and the people here use it, while pictures and panels take the
story's full width.

```ts shape
import { PROSE } from '@ifloom/react/kit'
const PROSE: 'w-full max-w-(--width-prose) mx-(--margin-prose)'
```

## ScrollArea

Component. Explained in [Components](/docs/reference/react/components#scrollarea).

Renders shadcn/ui's scroll area, a box that scrolls its children vertically with a thin styled scrollbar.

```ts fragment
function ScrollArea(props: ScrollAreaProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## Separator

Component. Explained in [Components](/docs/reference/react/components#separator).

Renders shadcn/ui's separator, a one-pixel line. It's horizontal and decorative unless the props say otherwise.

```ts fragment
function Separator(props: SeparatorProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## Tabs

Component. Explained in [Components](/docs/reference/react/components#tabs).

Renders a set of tabs, Radix's `Tabs.Root`, which holds the open tab's value.

```ts fragment
function Tabs(props: TabsProps & RefAttributes<HTMLDivElement>): ReactNode
```

## TabsContent

Component.

Renders one tab's content, shown while its trigger is open.

```ts fragment
function TabsContent(props: TabsContentProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## TabsList

Component.

Renders the row of tab triggers.

```ts fragment
function TabsList(props: TabsListProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## TabsTrigger

Component.

Renders one tab's trigger, which opens the `TabsContent` with the same `value`.

```ts fragment
function TabsTrigger(props: TabsTriggerProps & RefAttributes<HTMLButtonElement>): JSX.Element
```

## Tooltip

Component. Explained in [Components](/docs/reference/react/components#tooltip).

Renders a tooltip's root, Radix's `Tooltip.Root`, which holds whether it's open.

```ts fragment
function Tooltip(props: TooltipProps): ReactNode | Promise<ReactNode>
```

## TooltipContent

Component.

Renders a tooltip's box in a portal, 4 pixels from its trigger unless `sideOffset` says otherwise.

```ts fragment
function TooltipContent(props: TooltipContentProps & RefAttributes<HTMLDivElement>): JSX.Element
```

## TooltipProvider

Component.

Renders the provider that tooltips below it share, Radix's `Tooltip.Provider`, which sets their delay.

```ts fragment
function TooltipProvider(props: TooltipProviderProps): ReactNode | Promise<ReactNode>
```

## TooltipTrigger

Component.

Renders the element that opens its tooltip on hover or focus, Radix's `Tooltip.Trigger`.

```ts fragment
function TooltipTrigger(props: TooltipTriggerProps & RefAttributes<HTMLButtonElement>): ReactNode
```

## UiHint

Type. Explained in [Presentation hints](/docs/reference/react/hints#uihint).

A `ui` hint a UI reads, declared once with its name, its targets and a check of its value. `checkUiHints` reports a
hint that no declaration names for its target, and runs each declaration's check.

A plugin UI declares its own in `PluginUi.hints`.

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
| `name` | `string` |  |  | The hint's key under `ui`. |
| `on` | `readonly` [`UiTarget[]`](/docs/api/engine#uitarget) |  |  | The sorts of target content can write the hint on. |
| `check` | `((value: unknown, cx:` [`HintCheckContext`](#hintcheckcontext)`) => string \| readonly string[] \| undefined)` | yes |  | Returns the problems with a value, or nothing when it's fine. Word each problem to follow the place it's reported at, such as `ui.timer "kettle" is not a timer the game has`. |

## useDialogParts

Function. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#usedialogparts).

Returns the attributes for a dialog's `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close` parts, with
`extra` classes on the dialog. Every dialog of the UI uses them, so they all look alike.

```ts shape
import { useDialogParts } from '@ifloom/react/kit'
function useDialogParts(extra?: string): { dialog: { 'data-part': PartKey; className: string; }; overlay: { 'data-part': PartKey; className: string; }; title: { 'data-part': PartKey; className: string; }; close: { 'data-part': PartKey; className: string; }; }
```

Uses: [`PartKey`](/docs/api/react#partkey).

## useKitPart

Function. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#usekitpart).

Returns the `data-part`, `data-kit` and `className` attributes for a part marked as one of the kit's. The game's
`unstyled` option drops the kit's look and `layout`, as it drops every built-in class.

The classes are the kit part's look from `KIT_LOOKS`, then `layout`, then the game's `classes` for the part, then
`className`. `useKitPart('card', 'job')` is a card, and a list entry with its buttons beside it is
`useKitPart('card', 'good', 'sm:flex-row sm:items-start')`.

```ts shape
import { useKitPart } from '@ifloom/react/kit'
function useKitPart(kit: KitPart, name: PartKey, layout?: string, className?: string): { 'data-part': PartKey; 'data-kit': KitPart; className: string }
```

Uses: [`KitPart`](#kitpart), [`PartKey`](/docs/api/react#partkey).

## usePageParts

Function.

Returns the attributes for a page's outer section, centred and as wide as `--width-reading`, as every built-in page
has. `part` names the part, `title-page` by default.

```ts shape
import { usePageParts } from '@ifloom/react/kit'
function usePageParts(className?: string, part?: PartKey): { 'data-part': PartKey; className: string; }
```

Uses: [`PartKey`](/docs/api/react#partkey).

## usePlugin

Function. Explained in [Plugin UIs and the kit](/docs/reference/react/kit#useplugin).

Returns a plugin's view, words and `send` from the running game, for a component of the plugin's UI. It re-renders
whenever the view changes.

The view is typed by the plugin's `ViewRegistry` entry, and the words are the kit's with the game's `ui.<key>`
strings over them.

```ts shape
import { usePlugin } from '@ifloom/react/kit'
function usePlugin<Id extends string, W extends Words>(kit: PluginKit<Id, W>): PluginControls<Id, W>
```

Uses: [`Words`](/docs/api/react#words), [`PluginKit`](#pluginkit), [`PluginControls`](#plugincontrols).
