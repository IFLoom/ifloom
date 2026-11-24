---
title: "Plugin UIs and the kit"
description: "The kit in @ifloom/react/kit that plugin UIs are built from, with pluginKit, usePlugin, its parts and the shadcn/ui primitives."
---
This page documents `@ifloom/react`, the optional React UI, and stays React only. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/how-to/render/start).

A plugin UI is the React UI a plugin ships in its `/react` subpath, such as `@ifloom/plugin-shop/react`. A game lists the ones it wants in `plugins`, and each brings its panels, words, pages and the parts the layout places. `@ifloom/react/kit` is the entry a plugin UI, or a game's own component, is built from. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) lists them in a game, and [Write a plugin's React UI](/docs/how-to/react/write-a-plugins-react-ui) builds one. In the showcase: `examples/showcase/src/ui.ts`.

A plugin UI imports only the React UI's two public entries, never a path inside the package and never another plugin, and a contract test holds the first-party plugins to that. `@ifloom/react/kit` holds the exports on this page and these, documented with the components:

- [`overridable`](/docs/reference/react/components#overridable) and `Override`, which make a component one a game's `components` can replace.
- [`PartDialog`](/docs/reference/react/components#partdialog), a dialog that looks like the UI's own.
- [`Icon`](/docs/reference/react/components#icon) and `IconName`.
- [`UiHint`](/docs/reference/react/hints#uihint) and [`HintCheckContext`](/docs/reference/react/hints#hintcheckcontext), the hints a plugin UI reads.

## Plugin UIs

### Plugins

`Plugins` renders the parts the game's plugin UIs bring for one spot, in the order of its `plugins` list. Its props are in [`Plugins`](/docs/api/react#plugins).

It renders nothing for a plugin UI whose plugin the game doesn't have, so a list can name the [debug plugin](/docs/reference/plugins/debug)'s `debugUi` in every build. The [`DefaultLayout`](/docs/reference/react/components#defaultlayout) has one at each spot, and a layout of your own can put one anywhere or render a plugin's components itself.

```tsx
import { Game, Plugins, Scene, Sidebar, Story } from '@ifloom/react'
import { QuestLog } from '@ifloom/plugin-quests/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <QuestLog />
        <Plugins at="sidebar" />
      </Sidebar>
      <Story>
        <Scene />
        <Plugins at="story" />
      </Story>
    </Game>
  )
}
```

### PluginSpot

`PluginSpot` is a place in a layout where plugin UIs put their parts. Its values are in [`PluginSpot`](/docs/api/react#pluginspot).

| Key | Meaning |
|---|---|
| `stats` | The side column's Stats section, under the stats. The statuses UI uses it. |
| `sidebar` | The side column, after the Stats and Carrying sections. The quests, cast (People), achievements, cheats and devices UIs use it. |
| `room` | The story, after the scene and before the room's actions. The places UI uses it. |
| `story` | The end of the story, after the room's actions. The cast (who is here) and debug UIs use it. |
| `strip` | The [`NoticeStrip`](/docs/reference/react/components#noticestrip)'s row of counts, after the notices. The devices UI uses it. |

A panel, a page, a section in an app and a plugin's settings need no spot, since [`PanelHost`](/docs/reference/react/components#panelhost), the pages, the devices' apps and the menu render them by name.

### usePluginUis

`usePluginUis` returns the plugin UIs of the game in context: the provider's `plugins` whose plugin the game has, each id once, in their order. Its signature is in [`usePluginUis`](/docs/api/react#usepluginuis). It is the same list as `useGame().plugins`.

### PluginUi

`PluginUi` is what a plugin's `/react` subpath exports as `<id>Ui`, such as `shopUi`. Every field is in [`PluginUi`](/docs/api/react-kit#pluginui), and every field but `id` is optional.

| Field | Meaning |
|---|---|
| `id` | The plugin's id, as its engine side names it. The plugin UI does nothing in a game without that plugin. |
| `words` | Its words in English, by key, which a game rewords with `ui.<key>` in its strings. Its panels' and pages' titles and its settings label are keys of it. |
| `panels` | [Panels](/docs/reference/panels) by name, each a [`PluginPanel`](#pluginpanel), which [`PanelHost`](/docs/reference/react/components#panelhost) renders when content opens one. |
| `layout` | Components to render with no props, by [spot](#pluginspot). |
| `sections` | Renderers for a plugin's section in a device's app, by that plugin's id, such as `messagesUi`'s `messages`. |
| `inline` | Components for [inline pieces](/docs/reference/react/hints#inlineui) by name, which [`checkUiHints`](/docs/reference/react/hints#checkuihints) knows when it's given the plugin UI. |
| `hints` | The `ui` hints its components read, each a [`UiHint`](/docs/reference/react/hints#uihint), which `checkUiHints` checks when it's given the plugin UI. |
| `pages` | Pages it adds among the pages around the game, by id, each a [`PluginPage`](#pluginpage). |
| `settings` | A component the settings page renders with pages on, or a menu button labelled `label` opens without them. The unlocks UI's code box is one. |
| `components` | Built-in components it renders in place of the UI's own, by name, as a game's [`components`](/docs/reference/react/components#components) do. The calendar UI's `CalendarClock` replaces `Clock`. |
| `provider` | A component that wraps the game, for state the plugin UI keeps beside the runner. The unlocks UI's starts its codes. |

A game's own `panels`, `sections`, `inline` and `components` win over a plugin UI's under the same name. A plugin UI is a plain object, so a game leaves one thing out by spreading it without that:

```tsx
import { achievementsUi } from '@ifloom/plugin-achievements/react'
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), { pages: true, plugins: [{ ...achievementsUi, pages: undefined }] })
```

### PluginPanel

`PluginPanel` is a [panel](/docs/reference/panels) a plugin UI renders by name, in its `panels`. Every field is in [`PluginPanel`](/docs/api/react-kit#pluginpanel).

`component` renders the panel and gets the panel's `with` as `data`. `title` is the dialog's title when the panel's `with.title` gives none: a key of the plugin UI's words, or a function of `data` and the view, such as the shop's, which gives the vendor's name. A game's own panel of the same name keeps the plugin UI's title.

### PluginPage

`PluginPage` is a page a plugin UI adds among the [pages around the game](/docs/reference/react/components#pages), in its `pages`. Every field is in [`PluginPage`](/docs/api/react-kit#pluginpage).

It works as a game's [`PageDef`](/docs/api/react#pagedef) does, except that `label`, the title-screen button's words, is a key of the plugin UI's words. A game's own page with the same id replaces it, and [`usePage`](/docs/reference/react/components#usepage)`().added` lists every page added.

### pluginKit

`pluginKit` returns a plugin UI's declaration, its plugin's id and its English words, typed. Its signature is in [`pluginKit`](/docs/api/react-kit#pluginkit).

Each component hands the declaration to [`usePlugin`](#useplugin), and the `PluginUi` spreads it, so the id and the words are written in one place. A plugin UI with no words of its own leaves `words` out. Prefix the word keys with something of the plugin's, since every plugin UI's keys share the `ui.` namespace.

```tsx
import { pluginKit, type PluginUi } from '@ifloom/react/kit'
import { Forecast } from './forecast.tsx'

export const WEATHER_WORDS = { weather: 'Weather', weatherRain: 'Rain later' } as const

export const WEATHER = pluginKit('weather', WEATHER_WORDS)

export const weatherUi: PluginUi = { ...WEATHER, layout: { sidebar: [Forecast] } }
```

### PluginKit

`PluginKit` is what `pluginKit` returns, the plugin's `id` and its `words`. Its type is in [`PluginKit`](/docs/api/react-kit#pluginkit-1).

### usePlugin

`usePlugin` returns a plugin's view, its words and `send` from the running game. Its signature is in [`usePlugin`](/docs/api/react-kit#useplugin), and it renders only inside a [`GameProvider`](/docs/reference/react/components#gameprovider).

`view` is `view.plugins[id]`, typed by the plugin's [`ViewRegistry`](/docs/reference/plugin-views) entry, `undefined` in a game without the plugin, and `unknown` for a plugin that declares no view type. `words` says a key of the plugin's table or the UI's, the game's `ui.<key>` over the English. `send` runs a command as [`useGame`](/docs/reference/react/components#usegame)'s does, such as one the plugin's helpers write. For the runner or the whole view, use `useGame` beside it.

```tsx
import { pluginKit, usePlugin } from '@ifloom/react/kit'
import { QUESTS_WORDS } from '@ifloom/plugin-quests/react'

const QUESTS = pluginKit('quests', QUESTS_WORDS)

export function QuestCount() {
  const { view, words } = usePlugin(QUESTS)
  if (!view) return null
  return <p>{words('quests')}: {view.active.length}</p>
}
```

### PluginControls and PluginViewOf

`PluginControls` is what `usePlugin` returns, and `PluginViewOf` is the type of its `view`. Their fields are in [`PluginControls`](/docs/api/react-kit#plugincontrols) and [`PluginViewOf`](/docs/api/react-kit#pluginviewof).

## Kit parts

A kit part is a kind of part many plugin UIs render, such as a card or a title, marked with `data-kit`. The presets style the kit's parts and never a plugin's own parts by name, so a plugin UI that marks its parts looks right in every preset. [React UI parts](/docs/reference/react/parts) lists which plugin part is which kit part.

### useKitPart

`useKitPart` returns the attributes for a part that is one of the kit's: its `data-part`, its `data-kit` and its classes. Its signature is in [`useKitPart`](/docs/api/react-kit#usekitpart).

The classes are the kit part's look from [`KIT_LOOKS`](#kit_looks), then `layout`, then the game's [`classes`](/docs/reference/react/components#classes) for the part, then `className`, and a later class wins where two clash. With `unstyled` on, the look and the layout go, and `className` stays.

```tsx fragment
const day = useKitPart('card', 'forecast-day')
const good = useKitPart('card', 'good', 'sm:flex-row sm:items-start')
const button = useKitPart('opener', 'almanac-button', undefined, className)
```

A stylesheet styles every part like it with one rule:

```css
[data-kit="card"] { border-radius: 0; }
```

### KIT_PARTS

`KIT_PARTS` is every [`KitPart`](#kitpart) in a list, for a check or a stylesheet of your own. Its value is in [`KIT_PARTS`](/docs/api/react-kit#kit_parts).

### KitPart

`KitPart` is a kind of part, as `data-kit` says. Its values are in [`KitPart`](/docs/api/react-kit#kitpart).

| Key | Meaning |
|---|---|
| `card` | A boxed entry in a list, such as a vendor's good, a job, an achievement, a cheat, an unlock, a quest, a post or an app's entry. |
| `item` | An entry in a list that isn't boxed, such as a status. |
| `title` | An entry's name, such as a good's name or a status's label. |
| `heading` | A list's heading, such as the quests' heading or a cheats group's name. |
| `note` | A line about an entry, quieter than its title, such as a good's description. |
| `meter` | A bar of progress with a `<span>` inside as wide as the progress, such as an achievement's. |
| `commands` | Buttons that do something and aren't choices the story offers, such as a good's Buy and Sell. |
| `opener` | A button that opens something over the page, such as the Achievements button or a device's. |
| `form`, `input` | A place where the player types, and its box, such as the code box. |
| `badge` | A small label on an entry, such as a job's rank or a discount. |
| `thumb` | A small picture of an entry, such as a good's. |
| `label` | A short word beside a value, such as a wardrobe slot's name. |

An entry that can be done carries `data-state`, `"done"` or `"open"`, and one the player hasn't found yet carries `data-secret`. The presets read both, and the terminal preset ticks a done entry's title.

### KIT_LOOKS

`KIT_LOOKS` is each kit part's classes with no preset, in the theme's tokens, which `useKitPart` starts from. Its value is in [`KIT_LOOKS`](/docs/api/react-kit#kit_looks).

| Key | Meaning |
|---|---|
| `card` | A column with a gap, a rounded border and padding, edged in the primary colour while `data-state="done"` and dashed while `"open"`. |
| `item` | A column with a small gap and no border. |
| `title` | A row that wraps, in medium weight. |
| `heading` | A row in the heading font, semibold. |
| `note` | Small, muted text. |
| `meter` | A thin rounded bar in the muted colour, its `<span>` filled in the primary colour. |
| `commands` | A column of buttons with a small gap. |
| `opener` | A small outlined button at the start of its row. |
| `form`, `input` | A row that wraps, and a bordered box as tall as a small button. |
| `badge` | A secondary [badge](#badge). |
| `thumb` | A 3rem square picture, rounded and cropped to fit. |
| `label` | Muted text. |

### KIT_LAYOUT

`KIT_LAYOUT` is the layout classes the React UI's stylesheet always holds, for a plugin UI to put over a kit part's look. Its value is in [`KIT_LAYOUT`](/docs/api/react-kit#kit_layout).

It holds `flex`, `grid`, `contents`, `hidden`, the flex directions, `flex-wrap`, `flex-1`, `shrink-0`, `min-w-0`, `w-full`, the `items-*` and `self-*` alignments, `justify-between`, `justify-end`, gaps from `gap-0.5` to `gap-4`, `text-left`, `text-right`, `text-xs`, `text-sm`, `font-normal`, `font-medium`, `tabular-nums` and `truncate`. It also holds `sm:flex-row`, `sm:items-start`, `sm:w-44` and `sm:shrink-0`, for an entry's buttons beside its words on a wider screen. The prebuilt `styles.min.css` and Tailwind's scan of `@ifloom/react` both find only the classes the React UI's own source uses, so a class outside this list may be missing. A contract test holds the first-party plugins to it.

## Dialogs and pages

These exports render a plugin UI's or a game's own dialogs and pages to match the UI's.

### PROSE

`PROSE` is the reading column's classes: as wide as `--width-prose` and placed by `--margin-prose`. Its value is in [`PROSE`](/docs/api/react-kit#prose). Prose, choices, exits and the people here use it, so a part that reads like the story lines up with them.

### useDialogParts

`useDialogParts` returns the attributes for the `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close` parts, for a [`Dialog`](#dialog) of your own that should look like the UI's. Its signature is in [`useDialogParts`](/docs/api/react-kit#usedialogparts). `extra` adds classes to the dialog, as the devices UI does to make a phone's narrower. [`PartDialog`](/docs/reference/react/components#partdialog) is a whole dialog made from them.

### PageHeading and BackButton

`PageHeading` renders a page's heading, the `page-heading` part, and `BackButton` renders its Back button, the `page-back` part labelled `ui.back`, which calls `usePage().back()`. Their signatures are in [`PageHeading`](/docs/api/react-kit#pageheading), [`BackButton`](/docs/api/react-kit#backbutton) and [`usePageParts`](/docs/api/react-kit#usepageparts).

`usePageParts` returns the attributes for a page's outer section, centred and as wide as `--width-reading`, with `part` naming it, `title-page` if left out. The achievements page is made of all three:

```tsx
import { BackButton, PageHeading, usePageParts } from '@ifloom/react/kit'

export function AlmanacPage() {
  const section = usePageParts()
  return (
    <section {...section}>
      <PageHeading>The almanac</PageHeading>
      <BackButton />
    </section>
  )
}
```

### StatGauge

`StatGauge` renders a stat's value as a bar from its `min` to its `max`, or as pips, by its [`display`](/docs/reference/react/hints#display) hint. Its props are in [`StatGauge`](/docs/api/react#statgauge). It is the `<dd>` the [`StatList`](/docs/reference/react/components#statlist) renders under a stat, and the cast UI renders one under each relationship. A row holds ten pips at most. Parts: `stat-bar`, `stat-pips` and `stat-pip`.

## shadcn/ui primitives

The primitives are [shadcn/ui](https://ui.shadcn.com)'s components, exported from `@ifloom/react/kit` and styled by the same theme tokens, so a game's own screens match the UI. shadcn/ui's documentation applies to each. The game components render plain elements with [`buttonVariants`](#button) and [`badgeVariants`](#badge) classes through [`usePart`](/docs/reference/react/components#usepart), so `classes` and `unstyled` reach every one. [Add panels, sections, components and hints](/docs/how-to/react/extend-the-react-ui) adds a primitive this package lacks.

### Button

`Button` renders a button with a `variant` and a `size`. Its props are in [`ButtonProps`](/docs/api/react-kit#buttonprops). [`buttonVariants`](/docs/api/react-kit#buttonvariants) returns the classes for an element that should look like one, and `asChild` puts the look on its one child.

```tsx given
import { Button, buttonVariants } from '@ifloom/react/kit'

<>
  <Button variant="outline" size="sm" onClick={() => runner.undo()}>Undo</Button>
  <a className={buttonVariants({ variant: 'link' })} href="https://example.com/credits">Credits</a>
</>
```

### Badge

`Badge` renders a small pill for a count or a status. Its props are in [`BadgeProps`](/docs/api/react-kit#badgeprops), and [`badgeVariants`](/docs/api/react-kit#badgevariants) returns its classes.

```tsx
import { Badge } from '@ifloom/react/kit'

<Badge variant="secondary">Open till 6</Badge>
```

### Card

`Card` renders a bordered box, with `CardHeader`, `CardTitle` (an `h3`), `CardDescription` (a `p`), `CardContent` and `CardFooter` for its parts. Their props are in [`Card`](/docs/api/react-kit#card).

```tsx
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ifloom/react/kit'

<Card>
  <CardHeader>
    <CardTitle>The bakery</CardTitle>
    <CardDescription>Fresh at seven.</CardDescription>
  </CardHeader>
  <CardContent>Two loaves left.</CardContent>
  <CardFooter><Button size="sm">Buy one</Button></CardFooter>
</Card>
```

### Dialog

`Dialog` renders a modal on Radix's Dialog, with `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` and `DialogClose`. Its props are in [`Dialog`](/docs/api/react-kit#dialog), and the box's in [`DialogContentProps`](/docs/api/react-kit#dialogcontentprops).

`DialogContent` is the box, with an overlay and a close button, and needs a `DialogTitle` for screen readers. Its `bare` drops the built-in classes on all three, and `overlayProps` and `closeProps` pass attributes to the overlay and the close button. The [`GameMenu`](/docs/reference/react/components#gamemenu) and [`DeviceDialog`](/docs/reference/plugins/devices#devicedialog) use `bare` with [`usePart`](/docs/reference/react/components#usepart).

```tsx
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@ifloom/react/kit'

<Dialog>
  <DialogTrigger asChild><Button variant="outline">Map</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Small Town</DialogTitle>
      <DialogDescription>Your flat, the high street, the café, the park and the office.</DialogDescription>
    </DialogHeader>
    <DialogClose asChild><Button>Close</Button></DialogClose>
  </DialogContent>
</Dialog>
```

### ScrollArea

`ScrollArea` renders a box that scrolls with a slim scrollbar, and needs a height. Its props are in [`ScrollArea`](/docs/api/react-kit#scrollarea).

```tsx given
import { ScrollArea } from '@ifloom/react/kit'

<ScrollArea className="h-64">{runner.snapshot().backlog.map((entry, index) => <p key={index}>{entry.title}</p>)}</ScrollArea>
```

### Separator

`Separator` renders a thin rule, `'horizontal'` unless its `orientation` says `'vertical'`. Its props are in [`Separator`](/docs/api/react-kit#separator).

### Tabs

`Tabs` renders tabs on Radix's Tabs, with `TabsList`, `TabsTrigger` and `TabsContent`, each trigger sharing a `value` with its content. Its props are in [`Tabs`](/docs/api/react-kit#tabs).

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ifloom/react/kit'

<Tabs defaultValue="today">
  <TabsList>
    <TabsTrigger value="today">Today</TabsTrigger>
    <TabsTrigger value="week">This week</TabsTrigger>
  </TabsList>
  <TabsContent value="today">Market day.</TabsContent>
  <TabsContent value="week">The café shuts early on Sunday.</TabsContent>
</Tabs>
```

### Tooltip

`Tooltip` renders a hint on hover or focus on Radix's Tooltip, with `TooltipTrigger` and `TooltipContent`. Its props are in [`Tooltip`](/docs/api/react-kit#tooltip). Each tooltip needs a `TooltipProvider` above it, and [`GameShell`](/docs/reference/react#gameshell) adds none, since the game components use no tooltips.

```tsx
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ifloom/react/kit'

<Tooltip>
  <TooltipTrigger asChild><Button size="icon" variant="ghost">?</Button></TooltipTrigger>
  <TooltipContent>The café's hours are on the door.</TooltipContent>
</Tooltip>
```

### cn

`cn` returns class names joined, skipping falsy ones, with a later Tailwind class winning over an earlier one that sets the same thing. Its signature is in [`cn`](/docs/api/react-kit#cn). It is shadcn/ui's `cn`.

```ts
import { cn } from '@ifloom/react/kit'

cn('p-4 text-sm', false, 'p-2') // 'text-sm p-2'
```
