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
import game from './game.ts'

mountGame(game, { plugins: [questsUi, shopUi] })
```

`plugins` is the same on [`mountGame`](/docs/react#mountgame), [`GameShell`](/docs/react#gameshell) and [`GameProvider`](/docs/react/components#gameprovider). It's a plain list, in the order you want things placed. Nothing is found by itself: a plugin UI you don't list is never drawn.

- **One for a plugin the game doesn't have does nothing.** The [debug plugin](/docs/plugins/debug)'s `debugUi` can be listed in every build, and draws nothing in a release built without the plugin.
- **The game's own go over a plugin UI's.** Your `panels`, `sections`, `inline` and `components` win over what a plugin UI brings under the same name.
- **Define the list once**, outside a component that re-renders, as the other options are. A new list on each render draws everything under the provider again.

A plugin UI is a plain object, so to leave out one thing it brings, spread it without that:

```tsx
import { achievementsUi } from '@ifloom/plugin-achievements/react'

// The achievements in a dialog even with pages on: no achievements page.
mountGame(game, { pages: true, plugins: [{ ...achievementsUi, pages: undefined }] })
```

## Where the layout puts them

A plugin UI's `layout` says what it places, and where. The [`DefaultLayout`](/docs/react/components#defaultlayout), and the copy of it the react and next templates give you, has a [`Plugins`](#plugins) at each spot, which draws what each listed plugin UI has for it, in the order of the list.

| Spot | Where | First-party plugin UIs that use it |
|---|---|---|
| `stats` | Inside the side column's Stats section, under the stats. | statuses |
| `sidebar` | The side column, after the Stats and Carrying sections. | quests, cast (People), wardrobe, achievements, cheats, devices |
| `room` | The story, after the scene and before the room's actions. | places |
| `story` | The end of the story, after the room's actions. | cast (who is here), debug |
| `strip` | The [`NoticeStrip`](/docs/react/components#noticestrip)'s row of counts, after the notices. | devices |

A layout of your own puts a `Plugins` wherever it likes, or draws a plugin's components itself, in any order, as [the showcase's layout](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/layout.tsx) does:

```tsx
import { Game, Plugins, SceneStage, Sidebar, Story } from '@ifloom/react'
import { QuestLog } from '@ifloom/plugin-quests/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <QuestLog />
        <Plugins at="sidebar" />
      </Sidebar>
      <Story>
        <SceneStage />
        <Plugins at="story" />
      </Story>
    </Game>
  )
}
```

A panel, a page, a section in an app and the settings a plugin UI brings don't need a spot: [`PanelHost`](/docs/react/components#panelhost), the pages, the devices' apps and the menu draw them by name.

### Plugins

```tsx
function Plugins(props: { at: PluginSpot }): JSX.Element
```

What the game's plugin UIs place at one spot, in the order of its `plugins` list, and nothing for a plugin the game doesn't have.

### PluginSpot

```ts
type PluginSpot = 'stats' | 'sidebar' | 'room' | 'story' | 'strip'
```

The spots a layout has for plugin UIs, as the table above says.

### usePluginUis

```ts
function usePluginUis(): readonly PluginUi[]
```

The plugin UIs the game in context has: the provider's `plugins` whose plugin is in the game, each id once, in their order. It's also `useGame().plugins`.

## PluginUi

```ts
type PluginUi = {
  id: string
  words?: Words
  panels?: Readonly<Record<string, PluginPanel>>
  layout?: Readonly<Partial<Record<PluginSpot, readonly ComponentType[]>>>
  sections?: Readonly<Record<string, PluginSectionComponent>>
  inline?: InlineComponents
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
| `words` | Its words in English, by key. A game rewords any with `ui.<key>` in its strings, as it does the UI's own. See [`useWords`](/docs/react/components#usewords). |
| `panels` | [Panels](/docs/reference/panels) by name, which `PanelHost` draws when content opens one. See [`PluginPanel`](#pluginpanel). |
| `layout` | Components to place, by [spot](#where-the-layout-puts-them). Each is drawn with no props. |
| `sections` | Renderers for a plugin's section in a device's app, by that plugin's id: `messagesUi` has `messages`. This is how one plugin's UI draws inside another's without importing it. |
| `inline` | Components for [UI pieces](/docs/react/hints#inline-pieces) in prose, by name. |
| `pages` | Pages it adds among the [pages around the game](/docs/react/components#pages), by id, each with a title-screen button. See [`PluginPage`](#pluginpage). A game's own page of the same id goes over it. |
| `settings` | Something for the settings page, such as the unlocks plugin's code box: drawn there with pages on, and behind a menu button labelled `label`, a key of its words, without them. |
| `components` | Built-in components it draws in place of the UI's own, by name, as a game's [`components`](/docs/react/components#components) do. The calendar's UI draws its `CalendarClock` for `Clock`. |
| `provider` | Wraps the game, for state the module keeps beside the runner. The unlocks plugin's starts its codes on the runner. |

### PluginPanel

```ts
type PluginPanel = {
  component: PanelComponent
  title?: string | ((data: Readonly<Record<string, unknown>>, view: View) => string | undefined)
}
```

A panel a plugin UI draws by name. `component` gets what the panel was opened with as `data`. The dialog's title is content's `with.title` if it gave one, else `title`: a key of the module's words, or a function of `data` and the view, such as the shop's, which gives the vendor's name. A game's own panel of the same name keeps the plugin UI's title.

### PluginPage

```ts
type PluginPage = { label: string; component: ComponentType; showOnTitle?: boolean }
```

A page a plugin UI adds, as a game's [`PageDef`](/docs/react/components#pagesoptions) does, except that `label`, the title-screen button's words, is a key of the module's words. Every page added, the plugin UIs' and the game's, is in [`usePage`](/docs/react/components#usepage)`().added`.

## The kit

A plugin's React UI is built from `@ifloom/react`'s own exports, the same ones a game's UI uses: never a path inside the package, and never another plugin. The first-party plugins are held to that by a contract test. Whatever the [Components](/docs/react/components) page lists is in the kit; these are the parts a plugin UI reaches for most.

| For | Exports |
|---|---|
| The game | [`useGame`](/docs/react/components#usegame) (the runner, the view and `send`), [`usePluginUis`](#usepluginuis), [`useHolds`](/docs/react/components#useholds), [`usePage`](/docs/react/components#usepage), [`useProfile`](/docs/react/components#useprofile) |
| Words | [`useWords`](/docs/react/components#usewords) with the module's table, [`uiSay`](/docs/react/components#uisay), `Words`, `Say` |
| Buttons and prices | [`ChoiceButton`](/docs/react/components#choicebutton), [`ChoiceList`](/docs/react/components#choicelist), [`PriceTag`](/docs/react/components#pricetag), [`usePriceText`](#usepricetext), [`buttonVariants`](/docs/react/components#button), [`badgeVariants`](/docs/react/components#badge) |
| Dialogs | [`PartDialog`](/docs/react/components#partdialog), [`useDialogParts`](#usedialogparts), [`DIALOG_CLASSES`](#usedialogparts), [`Dialog`](/docs/react/components#dialog) |
| The page | [`Section`](/docs/react/components#section), [`PROSE`](#prose), [`ENTRY_CLASSES`](#entry_classes), [`StatGauge`](#statgauge), [`PageHeading`](#pageheading-and-backbutton), [`BackButton`](#pageheading-and-backbutton), [`usePageParts`](#pageheading-and-backbutton) |
| Parts and overrides | [`usePart`](/docs/react/components#usepart), [`useKitPart`](#usekitpart), [`KIT_PARTS`](#kit_parts), [`overridable`](/docs/react/components#overridable), `Override`, [`OverridableComponents`](#overridablecomponents-and-partnames), [`PartNames`](#overridablecomponents-and-partnames) |
| Pictures and prose | [`Picture`](/docs/react/components#picture), [`Video`](/docs/react/components#video), [`Icon`](/docs/react/components#icon), [`Beat`](/docs/react/components#beat), [`Stage`](/docs/react/components#stage), [`assetUrl`](/docs/react/components#asseturl) |

## Writing a plugin's UI

`ifloom new my-plugin --template plugin` starts a plugin package with its `/react` subpath already there, and a test that draws it. In short, a plugin's UI:

- **Lives in `src/react/`**, exported as `./react` beside `.` in its `package.json`, built to `dist/react/`. `react`, `react-dom` and `@ifloom/react` are optional peers, so a game that draws the plugin another way installs none of them for it.
- **Exports `<id>Ui`**, a `PluginUi`, with its components and hooks as named exports beside it: a default component a game gets by listing the module, and a hook that gives the same data and the plugin's commands with no markup.
- **Names its parts and components** by augmenting the React UI's interfaces, so a game's `classes` and `components` take them typed:

```tsx
import type { ComponentProps } from 'react'
import { overridable, useGame, useKitPart, usePart, useWords, type Override, type PluginUi } from '@ifloom/react'
import type { WeatherView } from '../index.ts'

export const WEATHER_WORDS = { weather: 'Weather', rain: 'Rain later' } as const

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
  const words = useWords(WEATHER_WORDS)
  const weather = useGame().view.plugins.weather as WeatherView | undefined
  const list = usePart('forecast', 'flex flex-col gap-2 text-sm', className)
  const day = useKitPart('card', 'forecast-day', 'rounded-lg border p-3')
  if (!weather) return null
  return (
    <ul {...list}>
      {weather.days.map((entry) => (
        <li key={entry.day} {...day}>
          {entry.label}
          {entry.rain ? ` · ${words('rain')}` : null}
        </li>
      ))}
    </ul>
  )
}

export const Forecast = overridable('Forecast', ForecastImpl)

export const weatherUi: PluginUi = { id: 'weather', words: WEATHER_WORDS, layout: { sidebar: [Forecast] } }
```

Prefix your word keys with something of your plugin's, as the template does (`rainyDayMarked`), so they don't meet another plugin's under `ui.`.

## Styling a plugin's UI

A plugin's UI is styled the way the React UI's own parts are: by Tailwind classes on its parts, the theme's [tokens](/docs/react/customising#2-set-tokens-and-colours), and the kit's parts. The [presets](/docs/react/customising#1-pick-a-theme-preset) style the kit's parts and the tokens, and never a plugin's own parts by name, so a plugin's UI looks right in each preset as long as it marks what its parts are like.

- **Mark each part with what it's like**, with [`useKitPart`](#usekitpart): a vendor's good, a job and an achievement are all `card`s, their names `title`s, a line about them a `note`. A preset that rules its cards as a book's index rules every plugin's, first-party or not.
- **Use the classes the React UI already has.** The prebuilt `styles.min.css` holds the classes `@ifloom/react`'s own source uses, and a game with Tailwind finds the same through `@ifloom/react/styles.css`. Neither looks inside a plugin. So a class only your plugin uses isn't there. The first-party plugins use no class of their own, and a contract test holds them to it. [`ENTRY_CLASSES`](#entry_classes), [`DIALOG_CLASSES`](#usedialogparts), [`PROSE`](#prose), `buttonVariants` and `badgeVariants` cover the usual shapes.
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

```ts
function useKitPart(kit: KitPart, name: PartKey, defaults: string, extra?: string): { 'data-part': PartKey; 'data-kit': KitPart; className: string }
```

[`usePart`](/docs/react/components#usepart) for a part that's one of the kit's: it carries `data-kit` beside its own `data-part`, so a preset or a game's stylesheet styles it with every part like it.

```css
/* Every card any plugin draws, square. */
[data-kit="card"] { border-radius: 0; }
```

### KIT_PARTS

```ts
const KIT_PARTS: readonly KitPart[]
type KitPart = 'card' | 'item' | 'title' | 'heading' | 'note' | 'meter' | 'commands' | 'opener' | 'form' | 'input' | 'badge' | 'thumb' | 'label'
```

What a part can be like, as `data-kit` says.

| Kit part | What it is | First-party examples |
|---|---|---|
| `card` | An entry in a list, boxed. | A vendor's good, a job, an achievement, a cheat, an unlock. |
| `item` | An entry in a list, not boxed. | A status. |
| `title` | An entry's name. | A good's name, an achievement's title, a status's label. |
| `heading` | A list's heading. | The achievements', the jobs' and the statuses' headings, a cheats group's name. |
| `note` | A line about an entry, quieter than its title. | A good's description, a job's next rank, a status's summary. |
| `meter` | A bar of progress, with a `<span>` inside as wide as it has got. | An achievement's progress. |
| `commands` | Buttons that do something, not choices the story offers. | A good's Buy and Sell, a job's buttons, the cheats. |
| `opener` | A button that opens something over the page. | The Achievements and Cheats buttons, each device's button. |
| `form`, `input` | Where the player types something, and its box. | The code box. |
| `badge` | A small label on an entry. | A job's rank, a discount, a cheat's count of uses. |
| `thumb` | A small picture of an entry. | A good's picture, an achievement's. |
| `label` | A short word beside a value. | A wardrobe slot's name, the Drop button. |

An entry that can be done says how it stands in `data-state`, `"done"` or `"open"`, as an achievement does, and one the player hasn't found yet carries `data-secret`. The presets read those too: the terminal preset ticks a done entry's title.

### ENTRY_CLASSES

```ts
const ENTRY_CLASSES: { row: string; body: string; actions: string }
```

The classes a list entry with buttons of its own starts from, as a vendor's goods do: a bordered `row`, a column on a phone with the buttons beside the words from Tailwind's `sm` up; the `body`, with the words; and the `actions`, a column of buttons.

### PROSE

```ts
const PROSE: string
```

The reading column's classes: as wide as `--width-prose`, placed by `--margin-prose`. Prose, choices, exits and the people here use it, so a plugin part that reads like the story lines up with it.

### usePriceText

```ts
function usePriceText(): (price: Price | null | undefined) => string
```

A [price](/docs/reference/view#price) as one line of text, its stats then its notes, joined by the `priceSeparator` word, as a vendor's struck-out full price and a job's pay are written. [`PriceTag`](/docs/react/components#pricetag) draws one as a part.

### useDialogParts

```ts
function useDialogParts(extra?: string): { dialog; overlay; title; close }
const DIALOG_CLASSES: { dialog: string; overlay: string; title: string; close: string }
```

The `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close` parts every dialog of the UI is drawn with, for a [`Dialog`](/docs/react/components#dialog) of your own that should look like the rest, with `extra` classes on the dialog: the devices' UI makes a phone's narrower. `DIALOG_CLASSES` are their classes. [`PartDialog`](/docs/react/components#partdialog) is the whole dialog, done for you.

### StatGauge

```tsx
function StatGauge(props: { stat: StatView }): JSX.Element
```

A stat's value as a bar from its `min` to its `max`, or as pips, one per point, by its [`ui.display`](/docs/react/hints#display) hint: the `<dd>` [`StatList`](/docs/react/components#statlist) draws under a stat. The cast's UI draws it under each relationship. Parts: `stat-bar`, `stat-pips` and `stat-pip`.

### PageHeading and BackButton

```tsx
function PageHeading(props: { children: ReactNode }): JSX.Element
function BackButton(): JSX.Element
function usePageParts(className?: string, part?: PartKey): { 'data-part': PartKey; className: string }
```

What the built-in pages are made of, for a page a plugin UI or a game adds: a heading (the `page-heading` part), a Back button (`page-back`, `ui.back`, which calls `usePage().back()`), and the attributes for the page's outer section, centred and as wide as `--width-reading`, with `part` naming it (`title-page` if left out). The achievements page is all three:

```tsx
import { BackButton, PageHeading, usePageParts } from '@ifloom/react'

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

### OverridableComponents and PartNames

```ts
interface OverridableComponents { Game: Override<GameProps>; /* … every built-in component */ }
interface PartNames {}
```

The components a game's [`components`](/docs/react/components#components) can replace, and the parts a plugin UI adds to [`PART_KEYS`](/docs/react/components#part_keys). A plugin's `/react` augments both, as [above](#writing-a-plugins-ui), so `components` and `classes` take its names typed and `overridable` and `usePart` accept them.
