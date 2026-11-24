---
title: "Plugin UIs and the kit"
description: "How a plugin's React UI comes into a game through the plugins option, where the layout puts it, and the kit of exports any plugin UI, or a game's own UI, is built from."
---
This page is about `@ifloom/react`, the optional React UI. A plugin's engine side needs none of it.

Each first-party plugin with something for the player ships its React UI beside its engine code, as a subpath of its own package: `@ifloom/plugin-shop/react`, `@ifloom/plugin-quests/react`, and so on. The React UI itself names no plugin. A game lists the plugin UIs it wants, and each one brings its panels, words and parts to the page. A plugin someone else writes ships its UI the same way, built from the same exports this page lists, so it fits in as the first-party ones do.

Our UI is never the only way to draw a plugin. Leave a plugin's UI out of the list and draw the plugin yourself, from `view.plugins.<id>` or from the hooks its `/react` exports. That's as much a way to use a plugin as ours.

## The plugins option

```tsx
import { mountGame } from '@ifloom/react'
import { questsUi } from '@ifloom/plugin-quests/react'
import { shopUi } from '@ifloom/plugin-shop/react'
import module from './game.ts'

mountGame(module.build(), { plugins: [questsUi, shopUi] })
```

`plugins` is the same on [`mountGame`](/docs/react#mountgame), [`GameShell`](/docs/react#gameshell) and [`GameProvider`](/docs/react/components#gameprovider). It's a plain list, in the order you want things placed. Nothing is found by itself: a plugin UI you don't list is never drawn.

- **One for a plugin the game doesn't have does nothing.** The [debug plugin](/docs/plugins/debug)'s `debugUi` can be listed in every build, and draws nothing in a release built without the plugin.
- **The game's own go over a plugin UI's.** Your `panels`, `sections`, `inline` and `components` win over what a plugin UI brings under the same name.
- **Define the list once**, outside a component that re-renders, as the other options are. A new list on each render draws everything under the provider again.

A plugin UI is a plain object, so to leave out one thing it brings, spread it without that:

```tsx
import { achievementsUi } from '@ifloom/plugin-achievements/react'

import { mountGame } from '@ifloom/react'

// The achievements in a dialog even with pages on: no achievements page.
mountGame(game, { pages: true, plugins: [{ ...achievementsUi, pages: undefined }] })
```

## Where the layout puts them

A plugin UI's `layout` says what it places, and where. The [`DefaultLayout`](/docs/react/components#defaultlayout), and the copy of it the react and next templates give you, has a [`Plugins`](#plugins) at each spot, which draws what each listed plugin UI has for it, in the order of the list.

| Spot | Where | First-party plugin UIs that use it |
|---|---|---|
| `stats` | Inside the side column's Stats section, under the stats. | statuses |
| `sidebar` | The side column, after the Stats and Carrying sections. | quests, cast (People), achievements, cheats, devices |
| `room` | The story, after the scene and before the room's actions. | places |
| `story` | The end of the story, after the room's actions. | cast (who is here), debug |
| `strip` | The [`NoticeStrip`](/docs/react/components#noticestrip)'s row of counts, after the notices. | devices |

A layout of your own puts a `Plugins` wherever it likes, or draws a plugin's components itself, in any order, as [the showcase's layout](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/layout.tsx) does:

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

A panel, a page, a section in an app and the settings a plugin UI brings don't need a spot: [`PanelHost`](/docs/react/components#panelhost), the pages, the devices' apps and the menu draw them by name.

### Plugins

```tsx shape
function Plugins(props: { at: PluginSpot }): JSX.Element
```

What the game's plugin UIs place at one spot, in the order of its `plugins` list, and nothing for a plugin the game doesn't have.

### PluginSpot

```ts shape
type PluginSpot = 'stats' | 'sidebar' | 'room' | 'story' | 'strip'
```

The spots a layout has for plugin UIs, as the table above says.

### usePluginUis

```ts shape
function usePluginUis(): readonly PluginUi[]
```

The plugin UIs the game in context has: the provider's `plugins` whose plugin is in the game, each id once, in their order. It's also `useGame().plugins`.

## PluginUi

```ts shape
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

What a plugin's `/react` exports as `<id>Ui`. Every field but `id` is optional.

| Field | What it is |
|---|---|
| `id` | The plugin's id, as its engine side names it. The module does nothing in a game without that plugin. |
| `words` | Its words in English, by key. A game rewords any with `ui.<key>` in its strings, as it does the UI's own. The panels' and pages' titles and the settings button's label are keys of it. Declare it with [`pluginKit`](#pluginkit) and spread that in, so the module and its components share one table. |
| `panels` | [Panels](/docs/reference/panels) by name, which `PanelHost` draws when content opens one. See [`PluginPanel`](#pluginpanel). |
| `layout` | Components to place, by [spot](#where-the-layout-puts-them). Each is drawn with no props. |
| `sections` | Renderers for a plugin's section in a device's app, by that plugin's id: `messagesUi` has `messages`. This is how one plugin's UI draws inside another's without importing it. |
| `inline` | Components for [UI pieces](/docs/react/hints#inline-pieces) in prose, by name. [`checkUiHints`](/docs/react/hints#checkuihints) knows their names when it's given the module in `plugins`. |
| `hints` | The `ui` hints its components read, each a [`UiHint`](/docs/react/hints#uihint): its name, where content writes it and a check. `checkUiHints` checks them when it's given the module in `plugins`. |
| `pages` | Pages it adds among the [pages around the game](/docs/react/components#pages), by id, each with a title-screen button. See [`PluginPage`](#pluginpage). A game's own page of the same id goes over it. |
| `settings` | Something for the settings page, such as the unlocks plugin's code box: drawn there with pages on, and behind a menu button labelled `label`, a key of its words, without them. |
| `components` | Built-in components it draws in place of the UI's own, by name, as a game's [`components`](/docs/react/components#components) do. The calendar's UI draws its `CalendarClock` for `Clock`. |
| `provider` | Wraps the game, for state the module keeps beside the runner. The unlocks plugin's starts its codes on the runner. |

### PluginPanel

```ts shape
type PluginPanel = {
  component: PanelComponent
  title?: string | ((data: Readonly<Record<string, unknown>>, view: View) => string | undefined)
}
```

A panel a plugin UI draws by name. A game's own panel of the same name keeps the plugin UI's title.

| Field | Type | What it is |
|---|---|---|
| `component` | `PanelComponent` | Draws the panel. It gets what the panel was opened with as `data`, the panel's `with`. |
| `title` | `string \| ((data, view) => string \| undefined)` | The dialog's title when content's `with.title` gives none: a key of the module's words, or a function of `data` and the view, such as the shop's, which gives the vendor's name. |

### PluginPage

```ts shape
type PluginPage = { label: string; component: ComponentType; showOnTitle?: boolean }
```

A page a plugin UI adds, as a game's [`PageDef`](/docs/react/components#pagesoptions) does, except that `label`, the title-screen button's words, is a key of the module's words. Every page added, the plugin UIs' and the game's, is in [`usePage`](/docs/react/components#usepage)`().added`.

## The kit

A plugin's React UI is built from the React UI's two public entries, the same ones a game's UI uses: never a path inside the package, and never another plugin. The first-party plugins are held to that by a contract test.

- **`@ifloom/react/kit`** has what only a component of your own needs: [`pluginKit`](#pluginkit), [`usePlugin`](#useplugin), `PluginUi` and its types, [`UiHint`](/docs/react/hints#uihint), the kit's parts, `overridable`, the dialog and page parts, `Icon` and the shadcn/ui primitives.
- **`@ifloom/react`** has the rest, which a game's own layout uses too: `useGame`, `usePart`, `useWords`, `ChoiceButton`, `Picture`, `Section` and the other components.

These are the parts a plugin UI reaches for most.

| For | From `@ifloom/react/kit` | From `@ifloom/react` |
|---|---|---|
| The game | [`usePlugin`](#useplugin) and [`pluginKit`](#pluginkit) (a plugin's view, words and commands) | [`useGame`](/docs/react/components#usegame) (the runner, the view and `send`), [`usePluginUis`](#usepluginuis), [`useHolds`](/docs/react/components#useholds), [`usePage`](/docs/react/components#usepage), [`useProfile`](/docs/react/components#useprofile) |
| Words | | [`useWords`](/docs/react/components#usewords) with the module's table, `Words`, `Say` |
| Buttons and prices | [`buttonVariants`](/docs/react/components#button), [`badgeVariants`](/docs/react/components#badge) | [`ChoiceButton`](/docs/react/components#choicebutton), [`ChoiceList`](/docs/react/components#choicelist), [`PriceTag`](/docs/react/components#pricetag) |
| Dialogs | [`PartDialog`](/docs/react/components#partdialog), [`useDialogParts`](#usedialogparts), [`Dialog`](/docs/react/components#dialog) | |
| The page | [`PROSE`](#prose), [`PageHeading`](#pageheading-and-backbutton), [`BackButton`](#pageheading-and-backbutton), [`usePageParts`](#pageheading-and-backbutton) | [`Section`](/docs/react/components#section), [`StatGauge`](#statgauge) |
| Parts and overrides | [`useKitPart`](#usekitpart), [`KIT_PARTS`](#kit_parts), [`KIT_LOOKS`](#kit_looks), [`KIT_LAYOUT`](#kit_layout), [`overridable`](/docs/react/components#overridable), `Override` | [`usePart`](/docs/react/components#usepart), [`OverridableComponents`](/docs/react/components#overridablecomponents-and-partnames), [`PartNames`](/docs/react/components#overridablecomponents-and-partnames) |
| Pictures and prose | [`Icon`](/docs/react/components#icon) | [`Picture`](/docs/react/components#picture), [`Video`](/docs/react/components#video), [`Beat`](/docs/react/components#beat), [`LayeredPicture`](/docs/react/components#layeredpicture), [`assetUrl`](/docs/react/components#asseturl) |

## Writing a plugin's UI

`ifloom new my-plugin --template plugin` starts a plugin package with its `/react` subpath already there, and a test that draws it. In short, a plugin's UI:

- **Lives in `src/react/`**, exported as `./react` beside `.` in its `package.json`, built to `dist/react/`. `react`, `react-dom` and `@ifloom/react` are optional peers, so a game that draws the plugin another way installs none of them for it.
- **Declares itself once**, with [`pluginKit`](#pluginkit): the plugin's id and its words. Each component reads the plugin through [`usePlugin`](#useplugin), which gives its view typed, its words with the game's rewording over them, and a `send` that takes the commands the plugin's helpers write. The `<id>Ui` spreads the same declaration, so the words are written in one place.
- **Exports `<id>Ui`**, a `PluginUi`, with its components and hooks as named exports beside it: a default component a game gets by listing the module, and a hook that gives the same data and the plugin's commands with no markup.
- **Names its parts and components** by augmenting the React UI's interfaces, so a game's `classes` and `components` take them typed.

Here is a weather plugin's UI. Its engine side, `src/index.ts`, declares the view it puts at `view.plugins.weather`:

```ts
declare module '@ifloom/engine' {
  interface ViewRegistry {
    weather: { days: { day: number; label: string; rain: boolean }[] }
  }
}
```

Its `src/react/index.tsx` draws that view:

```tsx
import type { ComponentProps } from 'react'
import { usePart } from '@ifloom/react'
import { overridable, pluginKit, useKitPart, usePlugin, type Override, type PluginUi } from '@ifloom/react/kit'
import { weather } from '../index.ts'

export const WEATHER_WORDS = { weather: 'Weather', rain: 'Rain later', weatherMark: 'Mark rain' } as const

const WEATHER = pluginKit('weather', WEATHER_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    Forecast: Override<ComponentProps<typeof Forecast>>
  }
  interface PartNames {
    forecast: true
    'forecast-day': true
  }
}

function ForecastImpl({ className }: { className?: string }) {
  const { view, words, send } = usePlugin(WEATHER)
  const list = usePart('forecast', 'flex flex-col gap-2 text-sm', className)
  const day = useKitPart('card', 'forecast-day')
  if (!view) return null
  return (
    <ul {...list}>
      {view.days.map((entry) => (
        <li key={entry.day} {...day}>
          {entry.label}
          {entry.rain ? ` · ${words('rain')}` : <button onClick={() => send(weather.markRain(entry.day))}>{words('weatherMark')}</button>}
        </li>
      ))}
    </ul>
  )
}

export const Forecast = overridable('Forecast', ForecastImpl)

export const weatherUi: PluginUi = { ...WEATHER, layout: { sidebar: [Forecast] } }
```

`view` is the weather plugin's slice, typed by the `ViewRegistry` entry its engine side declares, and `weather.markRain` is one of its helpers, so nothing is cast and no command is written by hand.

Prefix your word keys with something of your plugin's, as the template does (`rainyDayMarked`), so they don't meet another plugin's under `ui.`.

### pluginKit

```ts shape
function pluginKit<const Id extends string, const W extends Words = Record<never, string>>(id: Id, words?: W): PluginKit<Id, W>
```

Declares a plugin's UI once: the plugin's id, as its engine side names it, and its words in English. Hand it to [`usePlugin`](#useplugin) in each component, and spread it into the module's `PluginUi`, `{ ...WEATHER, layout: { … } }`, so the `PluginUi`'s `id` and `words` come from the same place. A plugin UI with no words of its own leaves `words` out.

#### PluginKit

What `pluginKit` returns: the plugin's id and its words, typed, for `usePlugin` and the `PluginUi`.

```ts shape
type PluginKit<Id extends string = string, W extends Words = Words> = { readonly id: Id; readonly words: W }
```

### usePlugin

```ts shape
function usePlugin<Id extends string, W extends Words>(kit: PluginKit<Id, W>): PluginControls<Id, W>
```

What a component of a plugin's UI needs, inside a [`GameProvider`](/docs/react/components#gameprovider):

- `view` is the plugin's slice of the view, `view.plugins[id]`, typed as its engine side declares it in [`ViewRegistry`](/docs/reference/plugins#typed-calls-queries-and-views). It's `undefined` in a game without the plugin, and `unknown` for a plugin that declares no view type.
- `words` says the plugin's words or the UI's by key, the game's `ui.<key>` over the English, as [`useWords`](/docs/react/components#usewords) does with the table.
- `send` runs a command, as [`useGame`](/docs/react/components#usegame)'s does: a button's `command` from the view, or one the plugin's helpers write, such as `send(shop.buy(vendor, entity))`.

For the rest of the game, the runner, the snapshot or the whole view, use `useGame` beside it.

#### PluginControls and PluginViewOf

What `usePlugin` returns, and the type of its `view`: the plugin's slice as its `ViewRegistry` entry declares it, else `unknown`. The fields are described above.

```ts shape
type PluginControls<Id extends string, W extends Words> = {
  view: PluginViewOf<Id> | undefined
  words: Say<(keyof W & string) | UiStringKey>
  send: (command: CommandRef) => Applied
}
type PluginViewOf<Id extends string> = Id extends keyof ViewRegistry ? ViewRegistry[Id] : unknown
```

## Styling a plugin's UI

A plugin's UI is styled the way the React UI's own parts are: by Tailwind classes on its parts, the theme's [tokens](/docs/react/customising#2-set-tokens-and-colours), and the kit's parts. The [presets](/docs/react/customising#1-pick-a-theme-preset) style the kit's parts and the tokens, and never a plugin's own parts by name, so a plugin's UI looks right in each preset as long as it marks what its parts are like.

- **Mark each part with what it's like**, with [`useKitPart`](#usekitpart): a vendor's good, a job and an achievement are all `card`s, their names `title`s, a line about them a `note`. Each kit part brings its own look ([`KIT_LOOKS`](#kit_looks)), so `useKitPart('card', 'forecast-day')` is boxed like every other plugin's card with no preset loaded, and a preset that rules its cards as a book's index rules every plugin's, first-party or not.
- **Add only layout.** What you put over a kit part's look is where it sits: `useKitPart('card', 'good', 'sm:flex-row sm:items-start')` puts a good's buttons beside its words on a wider screen. [`KIT_LAYOUT`](#kit_layout) lists the layout classes the React UI's stylesheet always has. With those, `buttonVariants`, `badgeVariants`, [`PROSE`](#prose) and [`useDialogParts`](#usedialogparts), a plugin's UI needs no class of its own.
- **Why it matters.** The prebuilt `styles.min.css` holds the classes `@ifloom/react`'s own source uses, and a game with Tailwind finds the same through `@ifloom/react/styles.css`. Neither looks inside a plugin, so a class only your plugin uses isn't there, and the part shows unstyled. The first-party plugins use no class of their own, and a contract test holds them to it.
- **Anything more ships with the plugin.** If your UI needs classes or rules of its own, publish a stylesheet beside `/react`: its Tailwind source, with an `@source` line pointing at your `dist/react/`, for a game with its own Tailwind, and a prebuilt copy for a game without, as `@ifloom/react` publishes `styles.css` and `styles.min.css`. A game then imports yours after the React UI's:

```css
/* A game with Tailwind */
@import "@ifloom/react/styles.css";
@import "ifloom-plugin-weather/react.css";

/* A game without: in its page, or its own stylesheet */
@import "@ifloom/react/styles.min.css";
@import "ifloom-plugin-weather/react.min.css";
```

### useKitPart

```ts shape
function useKitPart(kit: KitPart, name: PartKey, layout?: string, className?: string): { 'data-part': PartKey; 'data-kit': KitPart; className: string }
```

The attributes for a part that's one of the kit's: its `data-part`, its `data-kit` and its classes. The classes are the kit part's look from [`KIT_LOOKS`](#kit_looks), then `layout` over it, then the game's [`classes`](/docs/react/components#classes) for the part, then `className`, a caller's. Where two clash, the later one wins, as in [`cn`](/docs/react/components#cn). With [`unstyled`](/docs/react/customising#unstyled) on, the look and the layout go, as every built-in class does, and `className` stays.

```tsx fragment
const day = useKitPart('card', 'forecast-day')                               // a card, as every plugin's
const good = useKitPart('card', 'good', 'sm:flex-row sm:items-start')        // its buttons beside it from sm up
const button = useKitPart('opener', 'almanac-button', undefined, className)  // a caller's className last
```

A preset or a game's stylesheet styles a kit part with every part like it:

```css
/* Every card any plugin draws, square. */
[data-kit="card"] { border-radius: 0; }
```

### KIT_PARTS

```ts shape
const KIT_PARTS: readonly KitPart[]
```

Every [`KitPart`](#kitpart), in a list, for a check or a stylesheet of your own.

#### KitPart

What a part can be like, as `data-kit` says. [`useKitPart`](#usekitpart) takes one.

```ts shape
type KitPart = 'card' | 'item' | 'title' | 'heading' | 'note' | 'meter' | 'commands' | 'opener' | 'form' | 'input' | 'badge' | 'thumb' | 'label'
```

| Kit part | What it is | First-party examples |
|---|---|---|
| `card` | An entry in a list, boxed. | A vendor's good, a job, an achievement, a cheat, an unlock, a quest, a post, an app's entry. |
| `item` | An entry in a list, not boxed. | A status. |
| `title` | An entry's name. | A good's name, an achievement's title, a status's label. |
| `heading` | A list's heading. | The achievements', the jobs', the quests' and the statuses' headings, a cheats group's name. |
| `note` | A line about an entry, quieter than its title. | A good's description, a job's next rank, a status's summary. |
| `meter` | A bar of progress, with a `<span>` inside as wide as it has got. | An achievement's progress. |
| `commands` | Buttons that do something, not choices the story offers. | A good's Buy and Sell, a job's buttons, the cheats. |
| `opener` | A button that opens something over the page. | The Achievements and Cheats buttons, each device's button. |
| `form`, `input` | Where the player types something, and its box. | The code box. |
| `badge` | A small label on an entry. | A job's rank, a discount, a cheat's count of uses. |
| `thumb` | A small picture of an entry. | A good's picture, an achievement's. |
| `label` | A short word beside a value. | A wardrobe slot's name. |

An entry that can be done says how it stands in `data-state`, `"done"` or `"open"`, as an achievement does, and one the player hasn't found yet carries `data-secret`. The presets read those too: the terminal preset ticks a done entry's title.

### KIT_LOOKS

```ts shape
const KIT_LOOKS: Readonly<Record<KitPart, string>>
```

How each kit part looks with no preset, in the theme's tokens: the classes [`useKitPart`](#usekitpart) starts from. They're in `@ifloom/react`'s own source, so its stylesheet always has them.

| Kit part | Its look |
|---|---|
| `card` | A column with a gap, a rounded border and padding. Edged in the primary colour while `data-state="done"`, dashed while `"open"`. |
| `item` | A column with a small gap, no border. |
| `title` | A row that wraps, medium weight. |
| `heading` | A row in the heading font, semibold. |
| `note` | Small, muted text. |
| `meter` | A thin rounded bar in the muted colour, its `<span>` filled in the primary colour. |
| `commands` | A column of buttons with a small gap. |
| `opener` | A small outlined button, at the start of its row. |
| `form`, `input` | A row that wraps; a box with a border, as tall as a small button. |
| `badge` | A secondary [badge](/docs/react/components#badge). |
| `thumb` | A 3rem square picture, rounded, cropped to fit. |
| `label` | Muted text. |

### KIT_LAYOUT

```ts shape
const KIT_LAYOUT: readonly string[]
```

The layout classes the React UI's stylesheet always has, for laying out a plugin's parts: `flex`, `grid`, `contents`, `hidden`, the flex directions, `flex-wrap`, `flex-1`, `shrink-0`, `min-w-0`, `w-full`, alignment (`items-*`, `justify-between`, `justify-end`, `self-*`), gaps from `gap-0.5` to `gap-4`, `text-left`, `text-right`, `text-xs`, `text-sm`, `font-normal`, `font-medium`, `tabular-nums`, `truncate`, and `sm:flex-row`, `sm:items-start`, `sm:w-44` and `sm:shrink-0` for an entry's buttons beside its words on a wider screen. A first-party plugin puts only these over a kit part's look, and a contract test holds it to that. A class not listed may still be in the stylesheet today, because the React UI happens to use it, but nothing promises it stays.

### PROSE

```ts shape
const PROSE: string
```

The reading column's classes: as wide as `--width-prose`, placed by `--margin-prose`. Prose, choices, exits and the people here use it, so a plugin part that reads like the story lines up with it.

### useDialogParts

```ts shape
function useDialogParts(extra?: string): Record<'dialog' | 'overlay' | 'title' | 'close', { 'data-part': PartKey; className: string }>
```

The attributes for the `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close` parts every dialog of the UI is drawn with, for a [`Dialog`](/docs/react/components#dialog) of your own that should look like the rest, with `extra` classes on the dialog: the devices' UI makes a phone's narrower. [`PartDialog`](/docs/react/components#partdialog) is the whole dialog, done for you.

### StatGauge

```tsx shape
function StatGauge(props: { stat: StatView }): JSX.Element
```

A stat's value as a bar from its `min` to its `max`, or as pips, one per point in rows of ten at most, by its [`ui.display`](/docs/react/hints#display) hint: the `<dd>` [`StatList`](/docs/react/components#statlist) draws under a stat. The cast's UI draws it under each relationship. Parts: `stat-bar`, `stat-pips` and `stat-pip`.

### PageHeading and BackButton

```tsx shape
function PageHeading(props: { children: ReactNode }): JSX.Element
function BackButton(): JSX.Element
function usePageParts(className?: string, part?: PartKey): { 'data-part': PartKey; className: string }
```

What the built-in pages are made of, for a page a plugin UI or a game adds: a heading (the `page-heading` part), a Back button (`page-back`, `ui.back`, which calls `usePage().back()`), and the attributes for the page's outer section, centred and as wide as `--width-reading`, with `part` naming it (`title-page` if left out). The achievements page is all three:

```tsx
import { BackButton, PageHeading, usePageParts } from '@ifloom/react/kit'

function AlmanacPage() {
  const section = usePageParts()
  return (
    <section {...section}>
      <PageHeading>The almanac</PageHeading>
      <BackButton />
    </section>
  )
}
```
