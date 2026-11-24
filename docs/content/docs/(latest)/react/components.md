---
title: "Components"
description: "Every component and hook @ifloom/react exports, from GameShell down to a single button, with its parts and props."
---
This page is about `@ifloom/react`, the optional React UI. The engine doesn't need it. To draw a game with plain DOM, Vue, Svelte or React by hand, see [Your own UI in any framework](/docs/guide/frameworks).

This page lists everything `@ifloom/react` and `@ifloom/react/kit` export, from the whole shell down to a single button. Each plugin's own React UI, such as the shop's counter, is on that plugin's page, under **Drawing it**, and [Plugin UIs and the kit](/docs/react/kit) says how they come into a game. Each game component reads the [view](/docs/reference/view) through [`useGame`](#usegame), so it has to sit inside a [`GameProvider`](#gameprovider). [`GameShell`](#gameshell) is one. The [shadcn/ui primitives](#shadcnui-primitives) at the end don't need a provider.

Every game component on this page can be replaced by its name in [`components`](#components), everywhere the UI draws it, and each entry lists the main [`data-part`](/docs/react/customising#the-data-part-reference)s it draws. [Make it your own](/docs/react/customising) shows how to use both.

```ts
import {
  GameShell, GameProvider, useGame, WithPages, DefaultLayout, Game, Sidebar, Story, Overlay, Section, When, useHolds, Title, RoomActions, Plugins, usePluginUis,
  Scene, Beat, SceneHeader, BeatGroup, Fold, useScene, InlineAction, Tip, InlineTrigger, InlineModal, InlineImage, InlineMail, InlineProp, InlineMono,
  Picture, Video, LayeredPicture, Hotspot, MediaViewer, assetUrl, ChoiceButton, ChoiceList, PriceTag, Clock, StatList, StatGauge, EntityTable, Inventory, useClock,
  InputField, InputFields, GameMenu, SavesMenu, Backlog, ModManager, useSaves, useBacklog, useMods, TitlePage, SettingsPage, LoadPage, CreditsPage, GatePage,
  usePage, useSetting, useProfile, Notices, NoticeStrip, MinigameCard, useMinigame, Countdown, Timers, useTimer, useTimers, PanelHost, useAudio, useWords, UiProvider, usePart,
  type GameShellProps, type GameProps, type SidebarProps, type StoryProps, type SectionProps, type GameProviderProps, type GameContextValue, type ModsOption,
  type PanelComponent, type PluginSectionComponent, type InlineComponent, type InlineComponents, type InlineProps, type UiStringKey, type Words, type Say,
  type PluginSpot, type SavesState, type ModsState, type ClockState, type InventoryProps, type PagesOptions, type Page, type PageDef, type PageState, type Credit,
  type GateOptions, type Classes, type Components, type OverridableComponents, type PartKey, type PartNames, type UiOptions, type StyleOptions, type BehaviourOptions,
  type KeyOptions, type MinigameControls, type CountdownProps, type SceneTiming, type ScreenTransition, type RevealGroup, type RevealPoint, type RevealBeat,
  type SceneRolls, type VideoProps, type MediaViewerProps, type ViewerMedia,
} from '@ifloom/react'
// The kit: what you build components of your own from, and the shadcn/ui primitives.
import {
  Icon, pluginKit, usePlugin, PageHeading, BackButton, usePageParts, PartDialog, useDialogParts, KIT_PARTS, KIT_LOOKS, KIT_LAYOUT, useKitPart, overridable, PROSE,
  Button, buttonVariants, Badge, badgeVariants, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogDescription, DialogClose, ScrollArea, Separator, Tabs, TabsList, TabsTrigger, TabsContent, Tooltip, TooltipProvider,
  TooltipTrigger, TooltipContent, cn,
  type IconName, type PluginUi, type PluginPanel, type PluginPage, type PluginKit, type PluginControls, type PluginViewOf, type Override, type KitPart,
  type UiHint, type HintCheckContext, type ButtonProps, type BadgeProps, type DialogContentProps,
} from '@ifloom/react/kit'
```

Most of this page is `@ifloom/react`. What you build components of your own from (a plugin's UI, `overridable`, the dialogs and page parts, `Icon` and the shadcn/ui primitives) is in `@ifloom/react/kit`, and each of those entries says so in its import line. [The React UI](/docs/react#the-two-entries) says what's in each.

Every component that takes `className` merges it over its own classes with [`cn`](#cn), so a later Tailwind class wins: `<Scene className="gap-8" />`.

### Identity attributes

Every element the UI draws carries a `data-part` naming what kind of thing it is, such as `choice` or `stat-value`. They're all listed in [the data-part reference](/docs/react/customising#the-data-part-reference). Many elements also carry a `data-` attribute saying which one it is, usually holding an id. You can style them from your stylesheet or find them in a test.

| Attribute | On |
|---|---|
| `data-sidebar` | The side column ([`Sidebar`](#sidebar)). |
| `data-scene` | The scene ([`Scene`](#scene)). |
| `data-choice` | Each choice or action button. |
| `data-exit`, `data-person` | Each exit, and each person here or met. |
| `data-stat`, `data-kind`, `data-entity` | Each stat row, entity table and entity row. |
| `data-thing`, `data-slot-id` | Each thing you hold (its reference) and each wardrobe slot. |
| `data-input` | Each input field. |
| `data-notice`, `data-quest` | Each notice and each active quest. |
| `data-status` | Each active status. |
| `data-achievement`, `data-earned`, `data-secret` | Each achievement, and on it whether it's earned and whether it's a secret not yet earned. |
| `data-vendor`, `data-closed`, `data-good` | Each vendor's button and counter, a counter while the vendor is closed, and each good. |
| `data-job`, `data-hired`, `data-fired` | Each job on the board, and on it whether the player holds it or was fired from it. |
| `data-device`, `data-open-app`, `data-app`, `data-entry` | Each device button, each app icon, an open app, and each entry in an app's list. |
| `data-frame`, `data-icon`, `data-face` | A device's frame, an app's icon name, and an [`InlineProp`](#inlineprop)'s face, for a stylesheet to dress. |
| `data-beat`, `data-who` | Each beat's type, and on a spoken line, `character` or `player`. |
| `data-from` | Each message bubble: `them` or `player`. |
| `data-has-sidebar` | The page, when the layout has a side column. |
| `data-channel`, `data-thread`, `data-post`, `data-feed` | Messages and feeds. |
| `data-save-slot`, `data-backlog`, `data-mod` | Each save slot, backlog entry and mod. |
| `data-inventory`, `data-menu`, `data-saves`, `data-mods` | Whole panels. A plugin's UI marks its own the same way, such as `data-quests` and `data-shop`. |

## The game

### GameShell

```tsx
function GameShell(props: GameShellProps): JSX.Element
```

The whole UI, and the one root every entry draws: `mountGame` draws it too. It's a [`GameProvider`](#gameprovider) with the game's sound, its [text size](#textsize) and, with `pages` on, the [pages](#pages), around the `layout` component, or [`DefaultLayout`](#defaultlayout) if you leave it out. The props, `GameShellProps`, are described on [The React UI](/docs/react#gameshell). It passes [`components`](#components), [`classes`](#classes), `unstyled` and the rest to the provider.

```tsx
import { GameShell } from '@ifloom/react'
import { Layout } from './layout.tsx'

<GameShell runner={runner} panels={panels} layout={Layout} pages />
```

## Layouts

A layout is a component that draws the page from these regions and the parts below. [The React UI](/docs/react#layouts) shows one whole, and [Layouts: sections, drawers and showing things in some rooms](/docs/recipes/layouts) the common changes.

### DefaultLayout

```tsx
function DefaultLayout(): JSX.Element
```

The React UI's own layout, which a `GameShell` with no `layout` draws, and which the react and next templates copy into `src/layout.tsx`:

- **A [`Sidebar`](#sidebar)** with the [`Title`](#title), the [`Clock`](#clock) and the [`GameMenu`](#gamemenu), then these [sections](#section), each titled with a UI word:
  - `stats` (`ui.stats`), collapsible and open, with the [`StatList`](#statlist), then what the plugin UIs place at `stats`
  - `inventory` (`ui.inventory`), collapsible, with the [`Inventory`](#inventory).
  Then what the plugin UIs place at `sidebar`: a Quests section, a People section, the Achievements and Cheats buttons and the devices' buttons, for a game that lists those plugins' UIs.
- **A [`Story`](#story)** with the [`Scene`](#scene) and the [`InputFields`](#inputfields), then what the plugin UIs place at `room` (where you are and the way out), the [`RoomActions`](#roomactions), and what they place at `story` (who is here, the debug card).
- **A [`PanelHost`](#panelhost)**, and **an [`Overlay`](#overlay)** with the [`Notices`](#notices).

Each `<Plugins at="…" />` draws what the game's [plugin UIs](/docs/react/kit#where-the-layout-puts-them) bring for that spot, in the order of its `plugins` list. Every part draws nothing when the game has nothing for it, and every section with nothing in it hides, so it suits any game.

### Game

```tsx
function Game(props: GameProps): JSX.Element

type GameProps = { className?: string; children?: ReactNode }
```

The page: a layout's root, inside the game's provider. With a [`Sidebar`](#sidebar) anywhere inside it, it's a grid, the side column `--width-sidebar` wide beside the story, which fills the rest of the window, and it carries `data-has-sidebar`. Without one, it's a single column up to `--width-reading` wide, centred. Its children are drawn in order.

With `pages` on in `GameShell` or `mountGame`, it's drawn on the `game` page and the title screen, settings and the rest in its place.

Replaceable as `Game` in [`components`](#components). Parts: `page` (with `data-has-sidebar`).

### Sidebar

```tsx
function Sidebar(props: SidebarProps): JSX.Element

type SidebarProps = { className?: string; children?: ReactNode }
```

The side column: an `<aside>` carrying `data-part="sidebar"` and `data-sidebar`, with its children in order.

Below Tailwind's `md` breakpoint (48rem) it becomes a drawer. A slim `top-bar` holds the game's title, the [`Clock`](#clock) and a `drawer-button`, labelled with `ui.openSidebar`. The button opens the column as a `drawer`, a dialog from the left: focus stays inside it, Escape closes it, and so does the player picking something (the state moving on), unless a dialog it opened is still open on top, such as a phone. Window width is read with `matchMedia`. Where there's none, as on the server, it's a column.

Replaceable as `Sidebar` in [`components`](#components). Parts: `sidebar`, `top-bar`, `top-bar-title`, `drawer-button`, `drawer` and `drawer-overlay`.

### Story

```tsx
function Story(props: StoryProps): JSX.Element

type StoryProps = { align?: 'center' | 'start'; className?: string; children?: ReactNode }
```

The main column, a `<main>`, with its children in order. It's as wide as the side column leaves.

The scene's title, its prose, the choices, the inputs, the place's name, the exits, the room's actions and the people here form a reading column `--width-prose` wide. On a wide screen that column sits in the middle of the story. Pictures, a place's layered picture, panels and minigames use the whole width.

- `align` places the reading column: `'center'` or `'start'`. It's written to the `<main>` as `data-align` and wins over the stylesheet.
- Left out, the [`--margin-prose`](/docs/react/customising#2-set-tokens-and-colours) token decides. It centres the column unless a preset or your stylesheet changes it.

```tsx
<Story align="start">
  <Scene />
</Story>
```

Replaceable as `Story` in [`components`](#components). Parts: `story`.

### Overlay

```tsx
function Overlay(props: { className?: string; children?: ReactNode }): JSX.Element
```

What floats over the page: a box after everything else, across the page, that sticks to the bottom right of the window (across its width on a phone, `--width-notice` wide from `md`). It floats over the page while you scroll, and at the end of the page it sits after the content, so nothing is left under it. It's hidden while it's empty. The default layout puts the [`Notices`](#notices) in it.

Replaceable as `Overlay` in [`components`](#components). Parts: `overlay`.

### Section

```tsx
function Section(props: SectionProps): JSX.Element | null

type SectionProps = {
  id: string
  title: string
  collapsible?: boolean
  dialog?: boolean
  open?: boolean
  when?: Condition
  badge?: ReactNode
  className?: string
  children?: ReactNode
}
```

A titled part of a layout, in the side column or the story. It hides itself when its children draw nothing, so a section for a plugin the game doesn't have takes no room.

- **`collapsible`** puts a button on its title that folds it. Each player's choice is kept in the [profile](/docs/reference/profile)'s `ui:sections`, by `id`, so it's the same next time. `open` is how it starts before the player has chosen, `true` if you leave it out. Without a profile, as with a bare [`createRunner`](/docs/reference/runner#createrunner), it's remembered until the page closes.
- **`dialog`** draws a button instead, with `badge` after the title, that opens the children in a [`PartDialog`](#partdialog) titled `title`.
- **`when`** is a [condition](/docs/reference/conditions): the section shows only while it holds, as [`When`](#when) does.

```tsx
import { Section } from '@ifloom/react'
import { WardrobeCard } from '@ifloom/plugin-wardrobe/react'
import { places } from '@ifloom/plugin-places'

<Section id="wardrobe" title="Wearing" collapsible when={places.at('flat')}>
  <WardrobeCard title={false} />
</Section>
```

**Gotcha.** The cards inside have titles of their own. Pass `title={false}` to [`QuestLog`](/docs/plugins/quests#questlog), [`Inventory`](#inventory), [`WardrobeCard`](/docs/plugins/wardrobe#wardrobecard) and the rest, or the title is there twice.

Replaceable as `Section` in [`components`](#components). Parts: `section` (with `data-section`, `data-open` when it folds and `data-dialog` when it opens a dialog), `section-title`, `section-toggle`, `section-body` and `section-badge`.

### When

```tsx
function When(props: { condition: Condition; children?: ReactNode }): JSX.Element | null
```

Its children while `condition` holds, and nothing otherwise. Any [condition](/docs/reference/conditions) works, a plugin's too, such as `{ 'places/at': { location: 'flat' } }`. It's checked against the game's state each time the view changes. It only reads, so it changes nothing in a save or a replay.

Replaceable as `When` in [`components`](#components).

### useHolds

```ts
function useHolds(condition: Condition | undefined): boolean
```

Whether `condition` holds now, with the engine's [`holds`](/docs/reference/conditions#holds) on the state on show. No condition always holds. [`When`](#when) and `Section`'s `when` use it.

It's an escape hatch for placing parts of your own layout. The [view](/docs/reference/view) already says what the player can see, and what the story shows belongs in content, where the [content checker](/docs/reference/checks) reads it. Reach for `useHolds` only when the view has no field for what you want, such as showing a section of the sidebar once the player has been somewhere.

```tsx
import { useHolds } from '@ifloom/react'

function RainBanner() {
  return useHolds({ kv: 'raining' }) ? <p>It's raining.</p> : null
}
```

### WithPages

```tsx
function WithPages(props: { pages?: boolean | PagesOptions; children: ReactNode }): JSX.Element | null
```

Its children, or with `pages` on, the [pages](#pages) around them: the children show only on the `game` page. [`GameShell`](#gameshell) uses it round the layout, so a layout doesn't need to. Use it under a `GameProvider` of your own.

### GameProvider

```tsx
function GameProvider(props: GameProviderProps): JSX.Element

type GameProviderProps = {
  runner: Runner
  plugins?: readonly PluginUi[]
  panels?: Record<string, PanelComponent>
  inline?: InlineComponents
  sections?: Record<string, PluginSectionComponent>
  mods?: ModsOption
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  children: ReactNode
}
```

Connects everything under it to a [runner](/docs/reference/runner). It subscribes to the runner, reads `runner.view()` again only when the state changes or what the plugins' views show of the profile does, and hands both down through [`useGame`](#usegame).

`plugins` are the [plugin UIs](/docs/react/kit#the-plugins-option) to draw, each from a plugin's `/react` subpath, such as `shopUi` from `@ifloom/plugin-shop/react`. `panels`, `inline` and `sections` are the same as on [`GameShell`](/docs/react#gameshell), and go over what the plugin UIs bring under the same names. `mods` turns on the [mod manager](#modmanager). See [`ModsOption`](#modsoption). `components`, `classes`, `unstyled`, `viewer` and `keys` are the [`UiOptions`](#uioptions), handed to a [`UiProvider`](#uiprovider) inside it. With `keys` on, the provider also listens for the [keyboard shortcuts](#keyoptions).

Use it on its own to build [your own layout](/docs/react/extending#your-own-layout). On its own it plays no sound, sizes no text and draws no pages. [`GameShell`](#gameshell) adds those, and takes any component as its `layout`, so you rarely need the provider alone.

**Gotcha.** Define `plugins`, `panels`, `inline`, `sections`, `mods`, `components` and `classes` once, outside your component. Don't write them inline, as in `panels={{ StallPanel }}`, in a component that re-renders. A new object on each render makes every component under the provider draw again. Leaving them out is fine, because the defaults are the same objects every time.

### useGame

```ts
function useGame(): GameContextValue

type GameContextValue = {
  runner: Runner
  mods?: ModsOption
  snapshot: RunnerSnapshot
  view: View
  send: (command: CommandRef) => Applied
  panels: Record<string, PanelComponent>
  inline: InlineComponents
  sections: Record<string, PluginSectionComponent>
  plugins: readonly PluginUi[]
}
```

Returns the runner, its [snapshot](/docs/reference/runner#runnersnapshot), the current [`View`](/docs/reference/view) (the snapshot's `view`) and `send`. Every component under the provider draws again when the runner hands a new snapshot: after a command, a setting, a save written or a helper's report. `send` runs a command through `runner.apply` and returns what [`apply`](/docs/reference/commands#apply) returned, so you can show a refusal. It takes a plain command or a plugin's as its helpers write it, a [`CommandRef`](/docs/reference/custom#commandref), so `send(shop.buy('counter', 'item:sandwich'))` works. `panels` are what the provider was given. `inline` and `sections` are the provider's over what the plugin UIs bring. `plugins` are the [plugin UIs](/docs/react/kit#usepluginuis) whose plugin the game has, in their order. `mods` is the provider's `mods`, if any. It throws outside a `GameProvider`.

```tsx
import { useState } from 'react'
import { places } from '@ifloom/plugin-places'
import { useGame } from '@ifloom/react'
import { Button } from '@ifloom/react/kit'

function Purse() {
  const { view } = useGame()
  return <p>{view.statsById.coins.text}</p>
}

function GoHome() {
  const { send } = useGame()
  const [said, setSaid] = useState<string>()
  return (
    <>
      <Button onClick={() => setSaid(send(places.go('flat')).reason)}>Go home</Button>
      {said ? <p className="text-sm text-muted-foreground">{said}</p> : null}
    </>
  )
}
```

Use the runner for what the view doesn't cover, such as `runner.undo()`, `runner.save(...)` and `runner.snapshot().backlog`.

### ModsOption

```ts
type ModsOption = {
  store: Mods
  problems?: string[]
  onChange?: () => void
}
```

The game's [mods](/docs/reference/mods), for the [mod manager](#modmanager). Pass it as `mods` on [`GameShell`](/docs/react#gameshell) or [`GameProvider`](#gameprovider).

| Field | What it is |
|---|---|
| `store` | The [`Mods`](/docs/reference/mods#mods) store the game loaded its mods from at start-up. |
| `problems` | What the [content checker](/docs/reference/checks) found, as [`describeProblem`](/docs/reference/checks#problem-and-describeproblem) writes it. Each problem that starts `mod:<id> ` is shown under that mod. The rest aren't shown. |
| `onChange` | Builds the game again with the mods as they now are, usually `() => location.reload()`. Without it, the manager never offers to restart. |

### PanelComponent

```ts
type PanelComponent = ComponentType<{ data: unknown }>
```

A game's own panel: a scene's bespoke panel, an app's panel section, or a [panel](/docs/reference/panels) content opens. `data` is what the panel was given in `with`: the scene's or the app section's, or what the open panel was opened with. See [Panels](/docs/react/extending#panels).

### InlineComponents

```ts
type InlineProps<N extends string = string> = { name: N; text: string; args: InlineUiArgs<N> }
type InlineComponent<N extends string = string> = ComponentType<InlineProps<N>>
type InlineComponents = { [N in keyof InlineUi]?: InlineComponent<N> } & { [name: string]: ComponentType<InlineProps<never>> | undefined }
```

A game's own components for [UI pieces](/docs/reference/prose#ui-pieces) in its prose, by name, for the provider's `inline`. Each gets the piece's `name`, its words as `text`, and the arguments after the words as `args`, typed by what [`InlineUi`](/docs/reference/ui-hints#inlineui) declares for that name. See [Inline pieces](/docs/react/hints#inline-pieces).

### PluginSectionComponent

```ts
type PluginSectionComponent = ComponentType<{ data: unknown; with: Record<string, unknown> }>
```

Draws a plugin's view inside an app. `data` is that plugin's slice of the view, at [`view.plugins[id]`](/docs/reference/view#plugins), and `with` is the section's `with`. A plugin UI registers its own in its `sections`, as the messages and feed UIs do. See [Plugin sections](/docs/react/extending#plugin-sections).

## Customising

How a game makes the UI look its own, below the theme's variables. [Make it your own](/docs/react/customising) walks through all of it, with examples.

### UiOptions

```ts
type UiOptions = StyleOptions & BehaviourOptions

type StyleOptions = {
  components?: Components
  classes?: Classes
  unstyled?: boolean
}

type BehaviourOptions = {
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
}
```

What [`mountGame`](/docs/react#mountgame), [`GameShell`](#gameshell) and [`GameProvider`](#gameprovider) take to change the UI's look and feel, written side by side in one object. `StyleOptions` are how it looks and `BehaviourOptions` how it behaves, for a wrapper of your own that passes on only one half. `unstyled: true` drops every built-in class, and keeps the elements, their `data-part`s and what they do. `viewer: false` turns off the [`MediaViewer`](#mediaviewer), so clicking a picture in the story does nothing. It's on if you leave it out. `keys` turns on the keyboard shortcuts: see [`KeyOptions`](#keyoptions). They're off if you leave it out. `motion: false` turns off scene transitions and prose reveals, so every scene and every line shows at once. It's on if you leave it out, and a player whose system asks for reduced motion gets everything at once either way. See [`Scene`](#scene).

### KeyOptions

```ts
type KeyOptions = {
  map?: Record<string, Command>
}
```

Keyboard shortcuts for the game. Pass `keys: true` for the built-in ones, or an object to add your own:

- **1 to 9** pick the choices on screen in order: the open scene's choices, or the room's buttons ([`RoomActions`](#roomactions)) when no scene is open. Each numbered [`ChoiceButton`](#choicebutton) shows its number in a small `choice-key` part and carries `data-choice-key` and `aria-keyshortcuts`. A greyed-out choice keeps its number, and its key does nothing. [Inline actions](#inlineaction) in the prose have no number: they're reached with Tab, like a link.
- **Escape** opens the [`GameMenu`](#gamemenu)'s buttons in a dialog, if the menu is on screen. With no menu, the key is left to the page.
- **`map`** sends a [command](/docs/reference/commands) for each key you list, by its [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) name. Your keys come first, so mapping `'1'` or `'Escape'` replaces what it does.

```tsx
import { mountGame } from '@ifloom/react'

mountGame(game, {
  keys: { map: { w: { type: 'action', id: 'wait' } } },  // 1 to 9, Escape, and W to wait
})
```

The keys never fire while the player is typing in an input, a textarea or a select, while Ctrl, Alt, Meta or Shift is held, or while a dialog is open. A number key presses the button that's drawn with that number, so it works with any layout that draws the choices with [`ChoiceButton`](#choicebutton), and does nothing on the title page.

While a [minigame](#minigamecard) runs, its own keys come first, and they work whether `keys` is on or not.

**Gotcha.** Like `panels`, define `keys` once outside your component. A new `map` object on each render re-registers the listener every time.

### Components

```ts
type Components = Partial<OverridableComponents>

interface OverridableComponents {
  Section: Override<SectionProps>
  Beat: Override<{ beat: SceneBeat }>
  // … one for each name below, and each a plugin UI adds
}
```

Your own components in place of built-in ones, by name. Each replacement is drawn everywhere the UI draws that component, with the same props plus `Default`, the built-in one. The names are `Game`, `Sidebar`, `Story`, `Overlay`, `Section`, `When`, `Title`, `Clock`, `StatList`, `RoomActions`, `Scene`, `Beat`, `SceneHeader`, `BeatGroup`, `Fold`, `InlineAction`, `Tip`, `ChoiceList`, `ChoiceButton`, `PriceTag`, `Notices`, `Notice`, `NoticeStrip`, `MinigameCard`, `DiceRoll`, `DiceOverlay`, `Countdown`, `Timers`, `GameMenu`, `SavesMenu`, `Backlog`, `ModManager`, `PanelHost`, `Inventory`, `EntityTable`, `InputFields`, `InputField`, `Picture`, `Video`, `LayeredPicture`, `Hotspot`, `MediaViewer`, `Icon`, `TitlePage`, `SettingsPage`, `LoadPage`, `CreditsPage` and `GatePage`. A plugin's UI adds its own to [`OverridableComponents`](/docs/react/kit#overridablecomponents-and-partnames), such as `ShopCounter` and `QuestLog`, so `components` takes them typed once you import the plugin's `/react`.

```tsx
import type { Components } from '@ifloom/react'

const components: Components = {
  Clock: ({ Default }) => (
    <div className="flex items-center gap-1 text-sm">
      <span aria-hidden>◷</span>
      <Default />
    </div>
  ),
}
```

**Gotcha.** Inside a replacement, draw the built-in one through `Default`. Importing it by name from `@ifloom/react` gives you your replacement again.

### Override

```ts
type Override<P> = ComponentType<P & { Default: ComponentType<P> }>
```

The type of one replacement in [`Components`](#components): a component that takes the built-in one's props `P`, and `Default`.

### Classes

```ts
type Classes = Partial<Record<PartKey, string | ((defaults: string) => string)>>
```

Tailwind classes for parts, by `data-part` name. A string is merged with the built-in classes by [tailwind-merge](https://github.com/dcastil/tailwind-merge), as [`cn`](#cn) does, so yours win where they clash. A function gets the built-in classes and returns the ones to use, so `() => 'font-serif'` replaces them outright.

```ts
import type { Classes } from '@ifloom/react'

const classes: Classes = {
  choice: 'rounded-none',
  'scene-title': (defaults) => `${defaults} uppercase tracking-widest`,
}
```

### PartKey

```ts
type PartKey = 'page' | 'sidebar' | 'story' | 'overlay' | 'title' | 'clock' | 'stats' | /* … */ 'gate-decline' | keyof PartNames
```

A `data-part` name: one the React UI itself draws, or one a plugin UI adds through [`PartNames`](/docs/react/kit#overridablecomponents-and-partnames). Together they're every key [`Classes`](#classes) takes. [The data-part reference](/docs/react/customising#the-data-part-reference) says what each one is.

### UiProvider

```tsx
function UiProvider(props: UiOptions & { children: ReactNode }): JSX.Element
```

Gives the components under it a game's `components`, `classes` and `unstyled`. [`GameProvider`](#gameprovider) has one inside it, so you only need your own to change one corner of the page. A nested provider adds to the outer one: its `components` and `classes` are merged over the outer ones, and `unstyled` stays on once either turns it on.

```tsx
import { UiProvider } from '@ifloom/react'
import { QuestLog } from '@ifloom/plugin-quests/react'

<UiProvider classes={{ quest: 'border-dashed' }}>
  <QuestLog title="To do" />
</UiProvider>
```

### usePart

```ts
function usePart(name: PartKey, defaults: string, extra?: string): { 'data-part': PartKey; className: string }
```

The attributes for one part: its `data-part`, and its classes worked out from `defaults` (the built-in classes), the game's [`classes`](#classes) for `name`, and `unstyled`. `extra` is a `className` your caller passed, added last. Spread the result onto the element. Use it in a replacement component, so a game's CSS and `classes` still reach it, or in your own components, so they take part too.

```tsx
import { usePart, useGame } from '@ifloom/react'

function Purse() {
  const { view } = useGame()
  const attrs = usePart('stat-value', 'font-medium tabular-nums')
  return <p {...attrs}>{view.statsById.coins.text}</p>
}
```

### overridable

```ts
function overridable<P extends object>(name: keyof Components, Default: ComponentType<P>): ComponentType<P>
```

Wraps a component so a game can replace it by `name` in [`components`](#components). Every built-in component is made with it. `name` has to be one of the [`Components`](#components) keys. See [Your own components in the system](/docs/react/extending#your-own-components-in-the-system).

### Icon

```tsx
function Icon(props: { name: IconName; label?: string }): JSX.Element

type IconName = 'close' | 'back' | 'warning' | 'voice' | 'zoom' | 'menu' | 'chevron'
```

One of the UI's icons, by what it's for: `close` on dialogs and notices, `back` in an open app, `warning` on a choice or a hotspot with a warning, `voice` on a spoken line's replay button, `zoom` for enlarging a picture, `menu` on the button that opens the side column on a phone, and `chevron` on a folding section. With a `label` it's labelled for screen readers. Without one it's hidden from them. The built-in icons are [Lucide](https://lucide.dev)'s. Replace `Icon` in `components` to use your own set everywhere.

## The scene

### Scene

```tsx
function Scene(props: { className?: string }): JSX.Element
```

The main column. It shows the scene on screen, or the room when no scene is open. The room is a plugin's [room scene](/docs/reference/plugins#scene), such as the [places](/docs/plugins/places) plugin's. Without one, the room is the game's title and an empty body.

From top to bottom, it draws:

- its heading, a [`SceneHeader`](#sceneheader): the speaker's portrait, unless [`view.scene.speaker`](/docs/reference/view#speakerview) or its `portrait` is `null`, and the title
- the scene's [`LayeredPicture`](#layeredpicture) when [`view.scene.picture`](/docs/reference/view#the-scene) has layers, or else its `image`, centred, at most `max-h-80` tall and never wider than the column, keeping its shape
- each [`Beat`](#beat) of the body, with the beats from each block with a [`reveal`](/docs/react/hints#reveal) hint in a `reveal` part that waits for it, and the beats of each section with ui hints in a `group` part (see **Groups** below)
- the inputs on offer while the scene is open, as [`InputField`](#inputfield)s in an `inputs` part, so a scene that asks for a name shows the field under its words
- the panel the scene holds, if anything draws one of that name (the game's own `panels`, else a listed plugin UI's, else a built-in one, as [`PanelHost`](#panelhost) finds them), or else the scene's choices as a [`ChoiceList`](#choicelist). With reveals to come, these wait for the last one, in a `reveal` part with `data-reveal-choices`. They can't be pressed or read out until then.

While a [minigame](/docs/reference/minigames) runs, it draws that instead of all of the above: the panel named by the minigame's id, found as [`PanelHost`](#panelhost) finds one, or else [`MinigameCard`](#minigamecard). It runs the minigame's clock either way, so your panel gets its ticks without asking. The `<article>` then also carries `data-minigame` with the minigame's id.

The `<article>` carries `data-scene` with the scene's id, or `room` when no scene is open.

**Transitions.** The article sits in a `scene-transition` part, and is drawn afresh whenever [`view.scene.key`](/docs/reference/view#the-scene) changes. It carries `data-transition-in` with the new screen's `in`, from the content's [`transition`](/docs/react/hints#transition) hints, which the base styles animate. A choice with its own `transition` hint decides how the screen it leads to comes in. The scene before goes out first: a copy of its HTML stays in its place for its `ms`, with `data-leaving` and `data-transition-out`, inert and hidden from screen readers. Then the new scene is drawn and comes in. The `scene-transition` part sets `--ifloom-transition-ms` for the CSS, and `data-motion="off"` when motion is off.

**Reveals.** Each `reveal` part carries `data-reveal` with its transition and `--ifloom-reveal-at` with its time. Its text is in the page from the start, so a screen reader reads it, and only its look waits. A click on the scene, or any key, shows the rest at once (the article gets `data-revealed`), and that key does nothing else, so a number key can't pick a choice that isn't shown yet. See [Transitions in the React UI](/docs/recipes/transitions#the-react-ui) to restyle them.

With [`motion`](#uioptions) off, or the player asking for reduced motion, none of this plays: no attribute is set and everything is shown at once.

**Dice.** A block with a [`dice`](/docs/react/hints#dice) hint gets the [`DiceRoll`](#diceroll) of the roll the last command made under that key, just above it. A new roll tumbles, and the block waits in a `reveal` part until the dice settle. A click or a key settles them at once. New rolls that no block on screen names show in a [`DiceOverlay`](#diceoverlay), which `Scene` draws after the scene.

**Groups.** The beats of a section with any ui hint are drawn together in a [`BeatGroup`](#beatgroup), and a section with a `fold` hint has its beats in a [`Fold`](#fold) inside its group. [Your own hints](/docs/react/hints#your-own-hints) shows a hint of a game's own, from `allow` to the CSS.

**Inputs.** While a scene is open, `Scene` draws [`view.inputs`](/docs/reference/view#inputview) after its words and before its choices. With reveals to come, they wait with the choices. The layout's [`InputFields`](#inputfields) draws only the inputs on offer while no scene is open, so nothing is drawn twice.

**Speakers.** While the scene's speaker has a [`hue`](/docs/react/hints#hue) hint, the article carries `data-speaker-hue` and `--ifloom-speaker-hue`, and their spoken lines are drawn in that colour.

**Your own scene.** All of the timing above is [`useScene`](#usescene), and the heading, a group and a fold are components of their own. To restyle one of those, replace it in `components` and the motion stays. To change more, write a `Scene` of your own on `useScene`.

**Gotcha.** If a scene names a `panel` that the game has no component for, it shows its choices instead, with no warning.

Replaceable as `Scene` in [`components`](#components). Parts: `scene-transition`, `scene` (with `data-scene`), `scene-header`, `scene-portrait`, `scene-title`, `scene-image`, `beats`, `reveal`, `group` (with a `data-*` for each scalar hint), `fold`, `fold-summary`, `fold-beats` and `inputs`.

### useScene

```tsx
function useScene(): SceneTiming

type SceneTiming = {
  view: View
  motion: boolean
  transition: ScreenTransition
  leave: { out?: TransitionName; ms?: number }
  groups: RevealGroup[]
  last: number
  pending: boolean
  revealed: boolean
  skip: () => void
  rolls: SceneRolls
  unnamed: readonly Roll[]
}

type ScreenTransition = { key: string; in: TransitionName; out: TransitionName; ms: number }
type RevealPoint = { delay: number; as: TransitionName; at: number }
type RevealBeat = { beat: SceneBeat; index: number; roll?: Roll }
type RevealGroup = { reveal: RevealPoint | null; dice?: Roll; beats: RevealBeat[] }
type SceneRolls = { all: readonly Roll[]; fresh: readonly Roll[]; at: number }
```

Everything [`Scene`](#scene) works out before it draws, with nothing drawn: the transition, the reveals, the dice and the wait. Write a scene of your own on it and it keeps the React UI's motion.

| Field | What it is |
|---|---|
| `view` | The view drawn. |
| `motion` | Whether anything moves, as [`useMotion`](#usemotion) says. With it false, nothing waits and every roll shows settled. |
| `transition` | How this screen comes in and goes out: the screen's [`transition`](/docs/react/hints#transition) hint over the game's, with the choice that led here (the runner's [`snapshot.pressed`](/docs/reference/runner#what-led-here)) deciding how it comes in. `key` is `view.scene.key`. Key the screen's element by it so it's drawn afresh on a new screen. |
| `leave` | How the screen before goes, when the choice that led here gives an `out` or `ms`. |
| `groups` | The scene's beats in runs: the first, shown with the screen (its `reveal` is `null`), then one for each block with a [`reveal`](/docs/react/hints#reveal) hint or a [`dice`](/docs/react/hints#dice) hint naming a new roll. `reveal.at` is when the run comes, in milliseconds from the screen coming on. A run with `dice` waits a second more for that roll's dice to tumble. A beat whose `dice` hint names a roll that isn't new has it as its `roll`, to draw settled. Empty while a minigame runs. |
| `last` | When the last run comes, or 0 with none. The choices come with it. |
| `pending` | Whether runs are still to come. Until then the choices can't be pressed. |
| `revealed` | Whether the player skipped the wait, or everything came in. Draw dice settled from then on. |
| `skip` | Shows everything at once. `Scene` calls it on a click on the scene. The first key press while `pending` calls it too, and does nothing else, so a number key can't pick a choice that isn't shown yet. |
| `rolls` | The rolls in [`view.rolls`](/docs/reference/view#rolls), and the new ones (`fresh`) the player just made, which tumble. A load, an undo or a redo brings none. `at` counts each new set, so key a [`DiceRoll`](#diceroll) by it to tumble again. |
| `unnamed` | New rolls that no beat on screen names, which `Scene` shows for a moment in a [`DiceOverlay`](#diceoverlay). |

It waits as long as the last run, plus the transition in and the reveal's own fade, then stops waiting by itself. Coming back to a screen, or new rolls on the same one, start the wait again.

```tsx
import { Beat, ChoiceList, useScene } from '@ifloom/react'

function PlainScene() {
  const { view, transition, groups, pending, skip } = useScene()
  return (
    <article key={transition.key} data-transition-in={transition.in} onClick={pending ? skip : undefined}>
      <h2>{view.scene.title}</h2>
      {groups.map((group, n) => (
        <div key={n} data-reveal={group.reveal?.as} style={{ animationDelay: `${group.reveal?.at ?? 0}ms` }}>
          {group.beats.map(({ beat, index }) => (
            <Beat key={index} beat={beat} />
          ))}
        </div>
      ))}
      {pending ? null : <ChoiceList choices={view.scene.choices} />}
    </article>
  )
}
```

### SceneHeader

```tsx
function SceneHeader(props: { scene: View['scene'] }): JSX.Element
```

The scene's heading: the speaker's portrait, when the scene has a speaker with a picture, and its title. `scene` is [`view.scene`](/docs/reference/view#the-scene). Replace it in `components` to draw the heading your own way, and it still comes in with the scene:

```tsx
const components: Components = {
  SceneHeader: ({ scene }) => <h2 className="chapter">{scene.title}</h2>,
}
```

Replaceable as `SceneHeader` in [`components`](#components). Parts: `scene-header`, `scene-portrait` and `scene-title`.

### BeatGroup

```tsx
function BeatGroup(props: { section: Ui<BlockUi>; children: ReactNode }): JSX.Element
```

A section of the scene's body with any ui hint: its beats, as `children`, in one `group` part. `section` is the section's hints. Each that's a string, a number or `true`/`false` becomes a `data-*` attribute, with a camel-case name written in dashes: `{ card: 'result' }` is `data-card="result"`, `{ wide: true }` is `data-wide`. So a section can be styled as one box with plain CSS. [Your own hints](/docs/react/hints#your-own-hints) shows a hint of a game's own, from `allow` to the CSS.

Replace it in `components` to draw a section your own way. Its beats still come in when their reveal says, since the runs are worked out around it.

Replaceable as `BeatGroup` in [`components`](#components). Parts: `group`.

### Fold

```tsx
function Fold(props: { label: string; children: ReactNode }): JSX.Element
```

A section with a [`fold`](/docs/react/hints#fold) hint, what [`fold()`](/docs/reference/flows#the-builders) writes, inside its `BeatGroup`. Its beats (`children`) are in a `<details>` the player opens and shuts, under `label`, the hint's words. It's shut to begin with.

Replaceable as `Fold` in [`components`](#components). Parts: `fold`, `fold-summary` and `fold-beats`.

### useMotion

```tsx
function useMotion(): boolean
function useReducedMotion(): boolean
```

`useMotion` says whether to play transitions and reveals: the [`motion`](#uioptions) option, unless the player's system asks for reduced motion. `useReducedMotion` says only the second, and follows the setting if the player changes it. Use them in a replacement component that animates anything.

```tsx
import { useGame, useMotion } from '@ifloom/react'

function SceneTitle() {
  const { view } = useGame()
  const motion = useMotion()
  return <h2 data-transition-in={motion ? 'fade' : undefined}>{view.scene.title}</h2>
}
```

### Beat

```tsx
function Beat(props: { beat: SceneBeat }): JSX.Element
```

One beat of a scene's body, drawn by its type:

| Kind | Drawn as |
|---|---|
| `text` | A paragraph. Its `spans`, when it has them, are drawn in the line: an inline action as an [`InlineAction`](#inlineaction) and a tooltip as a [`Tip`](#tip). |
| `say` | A paragraph in `--speech`, with the speaker's `name` over the words in a small label, the `speaker-name` part. The player's own line is in `--player-speech` and indented, under the player's name (`rules.saveName`, else the string `you`). A quote that answers the line before names no one, so it has no label. A line with a `voice` ends with a button that plays it again, while the [audio player](/docs/react#sound) is running. Its `spans` are drawn as a `text` beat's are. |
| `image` | A [`Picture`](#picture). It's full width, or at most `max-w-sm` for `size: 'inline'`, and tilted a little when its block has the [`tilt`](/docs/react/hints#tilt) hint. Clicking it opens the [`MediaViewer`](#mediaviewer). |
| `video` | A [`Video`](#video), sized as a picture is. Clicking it opens the `MediaViewer`, unless the clip has controls, which have a full-screen button of their own. |
| `sound` | Nothing. The audio player plays it. |
| `chose` | A pick made earlier in a [flowing scene](/docs/reference/flows): its label, small, set in and in italics, after a `›`. |

```tsx
import { Beat } from '@ifloom/react'

<Beat beat={{ type: 'say', who: 'character', speaker: 'character:ava', name: 'Ava', text: '“Morning. What can I get you?”' }} />
```

The [`Backlog`](#backlog), [`MessagesSection`](/docs/plugins/messages#messagessection) and [`FeedSection`](/docs/plugins/feed#feedsection) draw their beats with `Beat` too, so a replacement `Beat` changes them all.

While the viewer is on, a picture or a clip sits inside a `viewer-open` button whose `aria-label` is `ui.zoom` ("Enlarge"), followed by the beat's alt text when it has some. A picture whose file is missing draws nothing, button included.

To hide the names, hide the part: `[data-part="speaker-name"] { display: none }`.

Replaceable as `Beat` in [`components`](#components). Parts: `beat` (with `data-beat`, and `data-who` on a spoken line), `speaker-name`, `voice-replay` and `viewer-open`. A letter, a note or a sign is an [inline piece](/docs/react/hints#inline-pieces) inside a paragraph: see [`InlineMail`](#inlinemail), [`InlineProp`](#inlineprop) and [`InlineMono`](#inlinemono). A video beat is a `video` part, with `data-beat="video"`.

**Folds.** In `Scene`, the beats of a section with a [`fold`](/docs/react/hints#fold) hint (what `fold()` writes) are drawn together in a `fold` part, a `<details>` the player opens and shuts, shut to begin with, inside the section's `group` part. Its summary is the hint's words, in a `fold-summary` part, and the beats are in a `fold-beats` part.

A paragraph's [bold and italics](/docs/reference/prose#bold-and-italics) are a `<strong>` with the part `bold` and an `<em>` with the part `italic`, inside the beat. Restyle them with [`classes`](#classes) or CSS on `[data-part="bold"]`.

### InlineAction

```tsx
function InlineAction(props: { text: string; choice: RenderedChoice; className?: string }): JSX.Element
```

An inline action in the prose, from an `action` [span](/docs/reference/prose#inlinespan): `text` as a button inside the line, which sends `choice.command`. A price follows the words in a [`PriceTag`](#pricetag).

A greyed-out one isn't `disabled`. It has `aria-disabled="true"` and `data-disabled`, so it can still be reached with Tab and its reason read out, and pressing it does nothing but show the reason. The reason (or a `warning`, or an `irreversible` note) is in a `tip-content` bubble that opens on hover, on keyboard focus and on a tap, and closes on Escape or a tap elsewhere. It's also the button's description, through `aria-describedby`.

Inline actions have no [number key](#keyoptions). The number keys go on picking the choices in the list.

Replaceable as `InlineAction` in [`components`](#components). Parts: `inline-action` (with `data-choice`, and `data-disabled`, `data-warning` and `data-irreversible` when they apply) and `tip-content`.

### Tip

```tsx
function Tip(props: { text: string; tip: string; className?: string }): JSX.Element
```

A tooltip in the prose, from a `tip` [span](/docs/reference/prose#inlinespan): `text` as a button inside the line, underlined with dots, and `tip` in a `tip-content` bubble with `role="tooltip"`. The bubble opens on hover with a mouse, on keyboard focus and on a tap, and closes on Escape, on a tap elsewhere and when the pointer leaves. The button has `aria-describedby` pointing at the note, so a screen reader reads it, and `aria-expanded` while it's open.

The bubble is put in the page's `body`, so a scrolling panel can't clip it, and it's kept inside the window: under the words, or above them when there's no room below.

Replaceable as `Tip` in [`components`](#components). Parts: `tip` and `tip-content`.

### InlineTrigger

```tsx
function InlineTrigger(props: { name: string; open: boolean; onOpen: () => void; className?: string; children: ReactNode }): JSX.Element
```

The words of an [inline piece](/docs/react/hints#inline-pieces) as a button in the line that opens something over the page. It has the part `inline-ui`, `data-ui` set to `name`, `aria-haspopup="dialog"` and `aria-expanded` from `open`. When `open` goes back to false, focus returns to it, since a dialog opened this way has no trigger of its own to return to. The built-in `modal` and `image` use it, and so can yours.

### InlineModal

```tsx
function InlineModal(props: InlineProps<'modal'>): JSX.Element
```

The built-in `modal`, from `[[ui:modal|words|key]]` or `[[ui:modal|words|key|title]]`. The words are an [`InlineTrigger`](#inlinetrigger) that opens a [`PartDialog`](#partdialog) with the prose line `key`, as the engine's [`proseBeats`](/docs/reference/prose#prosebeats) gives it for this save, drawn as a scene's paragraphs are, inside an `inline-modal` part. The dialog is titled `title`, or the words when there's none. Escape, the close button or a click outside close it, and focus goes back to the words. A key with no prose shows the words alone. Replace it with a `modal` of your own in `inline`.

### InlineImage

```tsx
function InlineImage(props: InlineProps<'image'>): JSX.Element
```

The built-in `image`, from `[[ui:image|words|path]]` or `[[ui:image|words|path|alt]]`. The words are an [`InlineTrigger`](#inlinetrigger) that opens the picture at `path` in the [`MediaViewer`](#mediaviewer), the same lightbox a story's pictures open in. The path is resolved as [`[[img:…]]`](/docs/reference/prose#images) resolves it, and `alt` describes the picture, or the words when there's none. It opens even with `viewer: false`, because the words are the only way to see it. Replace it with an `image` of your own in `inline`.

### InlineMail

```tsx
function InlineMail(props: InlineProps<'mail'>): JSX.Element
```

The built-in `mail`, from `[[ui:mail|body|From: Ava|Subject: Hello]]`: a letter or an email as a card, the part `inline-mail` with `data-ui="mail"`. Each argument is a header line, drawn as written in a `mail-header` part, and the words are the body, in a `mail-body` part with its line breaks kept. Written as a paragraph of its own, it draws as one. Replace it with a `mail` of your own in `inline`.

### InlineProp

```tsx
function InlineProp(props: InlineProps<'prop'>): JSX.Element
```

The built-in `prop`, from `[[ui:prop|words|face]]`: a note in the story's world, such as a sticky note, a cutting or a page from a diary. It's a dashed box, the part `inline-prop`, with `data-face` set to the face (`sticky`, `clip` or `diary`) for a stylesheet to dress. Replace it with a `prop` of your own in `inline`.

### InlineMono

```tsx
function InlineMono(props: InlineProps<'mono'>): JSX.Element
```

The built-in `mono`, from `[[ui:mono|words]]`: the words in a monospace face, the part `inline-mono`, for a sign, a screen or a thought typed out. Replace it with a `mono` of your own in `inline`.

### Picture

```tsx
function Picture(props: ComponentProps<'img'>): JSX.Element | null
```

An `<img>` that draws nothing, and takes no space, when its file is missing or `src` is empty. You get no broken-image icon for a portrait that isn't drawn yet or art left out of a build. It takes every `<img>` prop, and still calls your `onError`. Every picture in the UI's components is a `Picture`.

It loads lazily, with `loading="lazy"` and `decoding="async"`, so a picture far down a long scene or a feed waits until the player scrolls near it. Pass `loading="eager"` to load one straight away.

```tsx
import { Picture } from '@ifloom/react'

<Picture src={person.portrait} alt={person.name} className="size-8 rounded-full object-cover" />
```

A `Picture` remembers which `src` failed. When the same element gets a new `src`, the new file gets its own chance to load, so a portrait that changes with the speaker doesn't need a `key`.

Its `src` goes through [`assetUrl`](#asseturl), so it finds a picture that `ifloom build --inline-assets` put inside the page.

While the game's pictures setting is off (the [`settings`](/docs/react/hints#settings) hint's `images`), it draws nothing, except inside a [`LayeredPicture`](#layeredpicture) or [`KeepPicturesOn`](#keeppictureson).

Replaceable as `Picture` in [`components`](#components). Parts: none of its own. It carries the `data-part` of the place it's drawn, such as `scene-portrait` or `notice-image`.

### usePicturesShown

```ts
function usePicturesShown(): boolean
```

Whether pictures are drawn where it's called: `false` only while the setting the game names in the [`settings`](/docs/react/hints#settings) hint's `images` is off. It's `true` outside a game, in a game that names no such setting, and inside a [`KeepPicturesOn`](#keeppictureson). `Picture` and `Video` ask it, so a picture component of your own can too:

```tsx
import { usePicturesShown } from '@ifloom/react'

function Postcard({ src }: { src: string }) {
  return usePicturesShown() ? <img src={src} alt="" /> : <p>(A postcard of the pier.)</p>
}
```

### KeepPicturesOn

```tsx
function KeepPicturesOn(props: { children: ReactNode }): JSX.Element
```

Draws the pictures inside it whatever the pictures setting says. `LayeredPicture` wraps itself in one, because its hotspots are part of play. Wrap a picture of your own the player has to click in one too.

### Video

```tsx
function Video(props: VideoProps): JSX.Element | null

type VideoProps = Omit<ComponentProps<'video'>, 'src' | 'poster' | 'autoPlay' | 'loop' | 'muted' | 'controls'> & {
  src: string
  poster?: string
  alt?: string
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
}
```

A video clip. [`Beat`](#beat) draws `video` beats with it, [`LayeredPicture`](#layeredpicture) draws video layers with it, and [`FeedSection`](/docs/plugins/feed#feedsection) draws a post's `video`. The flags are the ones on a [`video` beat](/docs/reference/prose#videos) or a [`VideoView`](/docs/reference/media#videoview), so you can spread either in. It's a `<video playsinline>`, and `alt` becomes its `aria-label`.

```tsx
import { Video } from '@ifloom/react'

<Video src="art/cafe/steam.mp4" poster="art/cafe/steam.jpg" autoplay loop muted controls={false} />
```

It loads nothing until it scrolls into view. Until then it has `preload="none"`. When an `IntersectionObserver` sees it on screen, it switches to `preload="auto"` (or `"metadata"` for a clip that waits for the player) and starts playing if `autoplay` is set. It pauses when it scrolls out of view, and plays again when it comes back. Where there's no `IntersectionObserver`, it plays straight away with the `autoplay` attribute.

**Sound.** A clip with `muted: false` follows the game's [audio settings](/docs/reference/audio), as the audio player does:

- it's muted while the ui setting named by [`view.audio.muteSetting`](/docs/reference/audio#audioview) is on, or the one named by `view.audio.soundSetting` is off
- its volume is the volume setting of the game's `video` channel, if the game declares one, or else of its `sfx` channel, scaled from the setting's `min` to its `max`
- with neither setting, it plays at full volume.

The values are read with [`useSetting`](#usesetting), so a change on the settings page applies at once.

**Gotcha.** Browsers often refuse to start a clip with sound by itself. Give a clip with sound `controls` (the `|controls` flag), so the player presses play.

While the game's pictures setting is off (the [`settings`](/docs/react/hints#settings) hint's `images`), it draws nothing, as [`Picture`](#picture) doesn't.

Its `src` and `poster` go through [`assetUrl`](#asseturl). Replaceable as `Video` in [`components`](#components). Parts: `video`.

### LayeredPicture

```tsx
function LayeredPicture(props: { picture: PictureView; className?: string }): JSX.Element
```

A layered picture with hotspots, from a [`PictureView`](/docs/reference/media#pictureview). [`Scene`](#scene) draws `view.scene.picture` with it, and [`LocationCard`](/docs/plugins/places#locationcard) draws a place's `location.picture`.

```tsx
import { LayeredPicture, useGame } from '@ifloom/react'

function Room() {
  const { view } = useGame()
  return view.scene.picture ? <LayeredPicture picture={view.scene.picture} className="max-w-2xl" /> : null
}
```

It draws a box with the picture's `aspect` as its `aspect-ratio`. With no `aspect`, it takes the first layer's own shape once that has loaded, and `16/9` until then. The layers are stacked inside it, bottom first, each filling the box with `object-fit: cover`. A picture layer is a [`Picture`](#picture) and a video layer is a [`Video`](#video), each with `data-layer` set to the layer's id. The [`Hotspot`](#hotspot)s go on top.

**Gotcha.** Every layer fills the whole box, so a layer above the first needs transparent areas (a PNG, a WebP or an SVG) for the ones below to show through.

Replaceable as `LayeredPicture` in [`components`](#components). Parts: `picture` (the box) and `picture-layer`.

### Hotspot

```tsx
function Hotspot(props: { hotspot: HotspotView }): JSX.Element
```

One hotspot on a [`LayeredPicture`](#layeredpicture), from a [`HotspotView`](/docs/reference/media#hotspotview). It's a `<button>` placed over the picture by its `rect`, in percent, with `data-hotspot` set to its id. Clicking it sends its `command`.

- **Label.** Its `aria-label` is the hotspot's `label`, which is also its tooltip.
- **Look.** It's invisible until the player points at it, which shows a faint outline, or tabs to it, which shows the focus ring.
- **Greyed out.** A hotspot with `disabled` is dimmed and gets `aria-disabled`. It stays in the tab order so a keyboard player can find it, but clicking it sends nothing. Its reason is in `title`, after the label, and in a screen-reader-only span the button points at with `aria-describedby`.
- **Warning.** A hotspot with a `warning` shows the warning [`Icon`](#icon) in its corner, and its warning is in `title` and read out the same way.

Replaceable as `Hotspot` in [`components`](#components). Parts: `hotspot` and `hotspot-warning`.

### MediaViewer

```tsx
function MediaViewer(props: MediaViewerProps): JSX.Element

type MediaViewerProps = { media: ViewerMedia; open: boolean; onOpenChange: (open: boolean) => void }
type ViewerMedia = Extract<SceneBeat, { type: 'image' } | { type: 'video' }>
```

A picture or a clip from the story, shown large over the page. [`Beat`](#beat) opens it when the player clicks an `image` or a `video` beat, in a scene, the [backlog](#backlog), a message or a post. A layered picture's layers don't open it. It's a [`Dialog`](#dialog), so Escape, a click outside and its close button (`ui.closeViewer`) all close it, and focus goes back to the picture.

Turn it off for the whole game with `viewer: false` in [`UiOptions`](#uioptions):

```ts
mountGame(loadGame(content, base), { viewer: false })
```

Replaceable as `MediaViewer` in [`components`](#components). Parts: `viewer` (the dialog), `viewer-close` and `dialog-overlay`.

### assetUrl

```ts
function assetUrl(src: string): string
```

Returns where a picture really is. A build made with [`ifloom build --inline-assets`](/docs/cli#one-file-pictures-and-all) carries its pictures inside `index.html`, in a map from path to `data:` URL. `assetUrl` looks `src` up in that map, ignoring a leading `./`, and returns the data URL. Anywhere else, it returns `src` unchanged. That covers `ifloom dev`, a plain build, and a path that isn't in the map.

```ts
import { assetUrl } from '@ifloom/react'

assetUrl('art/place/cafe.jpg')   // 'data:image/jpeg;base64,…' in a one-file build; 'art/place/cafe.jpg' otherwise
assetUrl('./art/place/cafe.jpg') // the same
```

[`Picture`](#picture) and [`Video`](#video) call it, and so does [`DeviceScreen`](/docs/plugins/devices#devicescreen) for a device's wallpaper, so everything the React UI draws is covered.

**Gotcha.** A component of your own that draws a picture from a path, with an `<img>` or a CSS `background-image`, must call `assetUrl` too or use a `Picture`. In a one-file build the `art/` folder is gone, so the bare path points at nothing.

```tsx
import { assetUrl } from '@ifloom/react'

function Postcard({ src }: { src: string }) {
  return <div className="h-40 bg-cover" style={{ backgroundImage: `url(${assetUrl(src)})` }} />
}
```

### ChoiceButton

```tsx
function ChoiceButton(props: { choice: RenderedChoice; className?: string }): JSX.Element
```

Draws a [`RenderedChoice`](/docs/reference/view#renderedchoice) as a full-width button that sends its `command`. It's used for a scene's choices, a room's actions and a person's buttons. The button shows:

- the label
- a warning icon when the choice carries a `warning`, labelled with the warning for screen readers. A warning means the button can be pressed but the game would refuse it, as with the calendar's `That would run past dawn.`
- its price, as a [`PriceTag`](#pricetag)
- its `irreversible` line, the warning that this can't be undone, in the destructive colour (`--destructive`)
- the reason it's greyed out, when it is. The button is then disabled
- the warning text, when it isn't greyed out and carries a `warning`, so the player reads it before pressing.

The button carries `data-choice` with the choice's id. With [`keys`](#keyoptions) on, a choice that a number key picks shows the number first, in a `<kbd>` hidden from screen readers, and the button carries `data-choice-key` and `aria-keyshortcuts` with it. A choice's `tags` aren't drawn. To style by them, write a component of your own.

Replaceable as `ChoiceButton` in [`components`](#components). Parts: `choice` (with `data-choice`, and `data-choice-key` when keys are on), `choice-key`, `choice-label`, `choice-price`, `choice-warning`, `choice-irreversible` and `choice-reason`.

### ChoiceList

```tsx
function ChoiceList(props: { choices: RenderedChoice[]; className?: string; part?: 'choices' | 'actions' }): JSX.Element | null
```

A column of [`ChoiceButton`](#choicebutton)s. It draws nothing for an empty list. `part` names the list for styling: `'choices'` (the default), or `'actions'` for the room's buttons, as [`RoomActions`](#roomactions) passes.

```tsx
import { ChoiceList, useGame } from '@ifloom/react'

function RoomButtons() {
  const { view } = useGame()
  return <ChoiceList choices={view.actions} />
}
```

Replaceable as `ChoiceList` in [`components`](#components). Parts: `choices`, or `actions` when `part` says so.

### PriceTag

```tsx
function PriceTag(props: { price: Price; className?: string }): JSX.Element | null
```

A [`Price`](/docs/reference/view#price) as the engine wrote it, in `--price`. It shows the price's `text`: each stat's `text`, then each of the plugins' `notes` (such as the calendar's `until afternoon`), joined by the engine's `priceSeparator` [string](/docs/reference/strings#buttons-and-labels) (` · `). It draws nothing for a price with neither.

Replaceable as `PriceTag` in [`components`](#components). Parts: `choice-price`.

## Stats, places and people

### Title

```tsx
function Title(props: { className?: string }): JSX.Element
```

The game's title, `view.title`, as a heading. The [`Clock`](#clock) is its own component.

Replaceable as `Title` in [`components`](#components). Parts: `title`.

### RoomActions

```tsx
function RoomActions(props: { className?: string }): JSX.Element | null
```

The buttons offered while no scene is open, `view.actions`, as a [`ChoiceList`](#choicelist). They include the room's buttons, the game's own and its plugins'. The default layout puts them at the bottom of the story.

Replaceable as `RoomActions` in [`components`](#components). Parts: `actions`.

### Clock

```tsx
function Clock(): JSX.Element | null
```

Where the game is in time: [`view.when`](/docs/reference/view#the-clock-and-the-player), as its plugins wrote it, such as the [calendar](/docs/plugins/calendar#the-label)'s `Day 3 · Wednesday afternoon`. It draws nothing when no plugin says what time it is, as in a game without a calendar. To reword it, change the calendar's `calendar/label` string. The calendar plugin's UI draws its [`CalendarClock`](/docs/plugins/calendar#calendarclock) in this one's place, with the day and the period marked for a stylesheet.

Replaceable as `Clock` in [`components`](#components). Parts: `clock`.

### useClock

```ts
function useClock(): ClockState

type ClockState = { when: string | null }
```

Where the game is in time, with no markup. `when` is [`view.when`](/docs/reference/view#the-clock-and-the-player), or `null` when no plugin says. [`Clock`](#clock) draws it. For the calendar's pieces (the day, the weekday, the period), use the calendar plugin's [`useCalendar`](/docs/plugins/calendar#usecalendar).

```tsx
import { useClock } from '@ifloom/react'

function TopLine() {
  const { when } = useClock()
  return when ? <p className="text-xs uppercase">{when}</p> : null
}
```

### StatList

```tsx
function StatList(): JSX.Element | null
```

The stats the view lists, each label beside its value written the way the game [formats](/docs/reference/stats) it (`12 coins`). A stat the game doesn't list, or whose `visible` doesn't hold, isn't in the view, so it isn't here either. It draws nothing when there are no stats. Each row carries `data-stat`.

A stat that declares [`levels`](/docs/reference/stats#levels) also shows its level inside its label, as "Level 2" (the word `ui.statLevel`). Under the row is a bar towards the next level, drawn from [`StatView.level`](/docs/reference/view#statview). The bar is a `progressbar` from 0 to 100, and its label for screen readers is the word `ui.statProgress`, such as "Cooking: 50% of the way to level 2". At the top level there's no bar, only the level. A stat without levels shows as before.

A stat whose [`display`](/docs/react/hints#display) hint is `'bar'` gets a bar under its row, filled from its `min` to its `max`. One with `'pips'` gets a row of pips instead, one for each point between `min` and `max`, with as many filled as the value is above `min`. A stat with a range of more than 20 is drawn as a bar even if it asks for pips. Both are a `meter` for screen readers, labelled with the stat's label, with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and the formatted value as `aria-valuetext`. Each filled pip carries `data-filled`. The value is still written beside the label.

```ts
stats: [
  { id: 'energy', label: 'Energy', start: 80, max: 100, ui: { display: 'bar' } },
  { id: 'hearts', label: 'Hearts', start: 3, max: 5, ui: { display: 'pips' } },
]
```

They're deliberately plain. For anything more, such as a bar that changes colour as it runs low, write your own: [Building your own HUD](/docs/recipes/hud) shows how.

To reword them, set the words in the game's [`strings`](/docs/react#words):

```ts
strings: { 'ui.statLevel': 'Lv {level}', 'ui.statProgress': '{label}: {percent}% to level {next}' }
```

Replaceable as `StatList` in [`components`](#components). Parts: `stats`, `stat` (with `data-stat`), `stat-label`, `stat-value`, `stat-level` (with `data-level`), `stat-progress`, `stat-bar`, `stat-pips` and `stat-pip` (with `data-filled` when it's filled).

### EntityTable

```tsx
function EntityTable(props: { kinds?: string[]; className?: string }): JSX.Element | null
```

The things the game keeps several of, from [`view.entities`](/docs/reference/view#entities). It draws a table for each [kind](/docs/reference/entities) in the view that has any entities, headed with the kind's `plural`. The view only has the kinds and entities that are [listed](/docs/reference/entities#listing), so nothing the player shouldn't see yet is drawn. Each row is one entity: its picture and name, its description under the name when it has one, then its stats written the way the game [formats](/docs/reference/stats) them.

The columns are every stat any row shows, in the order they first appear. A row that doesn't show a stat (because its `visible` doesn't hold for that entity) has a blank cell. Each section carries `data-kind` with the kind's id, and each row carries `data-entity` with its reference, such as `staff:ana`.

`kinds` limits it to those kinds. Without it, every kind in the view is drawn. It draws nothing when none of the kinds has any entities, so a game with no kinds gets no empty box. The default layout leaves it out, and the café's layout puts it in the story.

```tsx
import { EntityTable } from '@ifloom/react'

// The café's menu on its own, in the story:
<EntityTable kinds={['dish']} className="border-t pt-4" />
```

Replaceable as `EntityTable` in [`components`](#components). Parts: `entities`, `entity-heading`, `entity-table`, `entity-columns`, `entity-column`, `entity-row` (with `data-entity`), `entity-name`, `entity-image`, `entity-desc` and `entity-value`.

### Inventory

```tsx
function Inventory(props: InventoryProps): JSX.Element | null

type InventoryProps = { className?: string; title?: string | false; drop?: boolean }
```

What the player carries: the things you hold, from the engine's [`view.held`](/docs/reference/view#held). Each shows its name, `×n` (`ui.heldCount`) when there's more than one, and its description. The [inventory](/docs/plugins/inventory) plugin's UI draws its [`InventoryCard`](/docs/plugins/inventory#inventorycard) in this one's place, with the same props: a thing that has a use gets a button such as "Eat the sandwich", and with `drop` each gets a **Drop** button. This one has no buttons, and ignores `drop`.

The heading is `ui.inventory`, or `title`, and `false` leaves it out, as the `inventory` panel does. Each thing carries `data-thing` (its reference) and `data-at` (who holds it). It draws nothing when the player carries nothing.

```tsx
import { Inventory } from '@ifloom/react'

<Inventory className="border-t pt-4" />
```

Replaceable as `Inventory` in [`components`](#components). Parts: `inventory`, `inventory-title`, `thing` (with `data-thing`), `thing-name`, `thing-count` and `thing-text`.

## Inputs

### InputField

```tsx
function InputField(props: { input: InputView }): JSX.Element
```

One of the game's [inputs](/docs/reference/inputs), an [`InputView`](/docs/reference/view#inputview) from `view.inputs`. It shows the input's label, then:

- for `type: 'text'` or `'number'`, a box and an **Enter** button (`ui.enter`) that sends [`input`](/docs/reference/commands#input) with what was typed. The box honours `maxLength`, `min` and `max`
- for `type: 'choice'`, a button for each option, with the one already picked filled in. Each sends its value.

If the engine refuses the value, its reason shows under the field (`Keep it to 8 characters.`, say) until a value is accepted. The box follows the input's value when something else changes it, such as an undo or a load, so it always shows what the game holds. It carries `data-input` with the input's id.

**Gotcha.** An empty number box sends no value at all, not `0`, so the engine refuses it with `enterSomething` (`Enter something first.`).

Replaceable as `InputField` in [`components`](#components). Parts: `input` (with `data-input`), `input-label`, `input-field`, `input-options`, `input-submit`, `input-error` and `button` for each option.

### InputFields

```tsx
function InputFields(props: { className?: string }): JSX.Element | null
```

An [`InputField`](#inputfield) for every input in `view.inputs` while no scene is open. `view.inputs` holds the inputs whose `when` holds now. While a scene is open it draws nothing, because [`Scene`](#scene) draws them between its words and its choices. It also draws nothing when there are none. [`GameShell`](#gameshell) puts it under the scene, for an input a room offers.

```ts
// The showcase asks for the cat's name on moving day, and only then.
inputs: [{ id: 'catName', label: 'Name your cat', type: 'text', maxLength: 16, when: { kv: 'phase', is: ['arrival'] } }]
```

**Gotcha.** A [lock](/docs/reference/locks) that denies `'*'` denies `input` too. If a scene asks for a value while the rest of the game is locked, put `input` in the lock's `except`.

Replaceable as `InputFields` in [`components`](#components). Parts: `inputs`.

## What changed

### Changes

```tsx
function Changes(props: { className?: string }): JSX.Element | null
```

The stats the last command moved, from [`view.changes`](/docs/reference/changes), as a list of [`ChangeItem`](#changeitem) pills: `+30 coins`, `+20% Energy`, `+2 Ava`. Only the stats your content names in [`changes.stats`](/docs/reference/changes#changes) are listed, and with none named it never draws anything. It draws nothing when the last command moved nothing. A `tick` that moved nothing keeps the list, so the pills stay while a timer runs.

The default layout leaves it out. Place it in yours where you want the feedback, usually after the scene:

::include[../../../../snippets/react/changes.tsx]

Replaceable as `Changes` in [`components`](#components). Parts: `changes`, with its `aria-label` from `ui.changes` (`What changed`).

### ChangeItem

```tsx
function ChangeItem(props: { change: ChangeView }): JSX.Element
```

One [`ChangeView`](/docs/reference/changes#changeview) as a pill. It shows the change's `text`, signed and in the stat's own format, then its `name` when the view gives one: the entity's name for an entity's stat, or else the stat's `label`, unless the stat's `format` already has words in it. So `+30 coins` stands alone, while `+1` reads `+1 Mood` and `+20%` reads `+20% Energy`. Its `title` says the stat's label, from what to what.

It carries `data-stat` with the stat's id, `data-of` with the entity for an entity's stat, and `data-dir` set to `up` or `down`, for your CSS:

```css
[data-part='change'][data-dir='up'] { background: #e8f6ec; }
[data-part='change'][data-stat='coins'] { font-variant-numeric: tabular-nums; }
```

Replaceable as `ChangeItem` in [`components`](#components). Parts: `change`, `change-text` and `change-label`.

## The player's menu

### GameMenu

```tsx
function GameMenu(props: { className?: string }): JSX.Element | null
```

A row of buttons for what the runner offers:

- **Saves** (`ui.saves`) when the runner was made with `saves`
- **Backlog** (`ui.backlog`) when [`runner.offers`](/docs/reference/runner#the-runners-members)`.backlog` is on
- **Mods** (`ui.mods`) when the provider was given [`mods`](#modsoption)
- A button for each plugin UI's [`settings`](/docs/react/kit#pluginui), such as **Enter a code** for the unlocks plugin's, when `pages` is off. With pages on, they're on the settings page instead.
- **Undo** and **Redo** when `runner.offers.undo` is on. They're greyed out while there's nothing to undo or redo.
- **Settings** (`ui.settings`) and **Title screen** (`ui.titlePage`) when the game was drawn with [`pages`](#pages) on. Settings shows only if the game declares a [setting](/docs/reference/settings), has a plugin UI with settings, or has mods.

With [`keys`](#keyoptions) on, Escape opens the same buttons in a dialog headed **Menu** (`ui.menu`).

Settings and Title screen switch to those [pages](#pages). Settings opened from the game changes the game in play, and its Back button returns to it. Saves, Backlog and Mods each open a [`Dialog`](#dialog), with a close button labelled `ui.close` for screen readers, holding a [`SavesMenu`](#savesmenu), a [`Backlog`](#backlog) or a [`ModManager`](#modmanager). A plugin UI's button opens its settings the same way, titled with its label. Loading a save closes the dialog. The row carries `data-menu`. It draws nothing when there are no buttons to show.

So you choose what the player sees when you make the runner:

```ts
import { localStorageDriver } from '@ifloom/browser'
import { createRunner, saves, startingState } from '@ifloom/engine'

const runner = createRunner(game, startingState(game), {
  history: { depth: 50 },                    // Undo and Redo
  backlog: { limit: 200 },                   // Backlog
  saves: saves(game, localStorageDriver()),  // Saves
})
```

Replaceable as `GameMenu` in [`components`](#components). Parts: `menu`, `menu-button`, and for its dialog `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### SavesMenu

```tsx
function SavesMenu(props: { className?: string; onLoaded?: () => void }): JSX.Element | null
```

The save and load screen, over [`runner.saves`](/docs/reference/runner#the-runners-members):

- **Save in a new slot** (`ui.saveNew`) writes the next numbered slot. That's one more than the highest slot named with a number, so `1`, `2`, `3`.
- **Import a save file** (`ui.importSave`) reads a `.json` file through [`importText`](/docs/reference/saves#saves) and plays on from it with [`runner.restore`](/docs/reference/runner#the-runners-members).
- Every slot is listed newest first (`data-save-slot`), with its name and when it was saved. Each has buttons to **Load** it (`ui.load`), **Save** over it (`ui.save`), **Export** it (`ui.exportSave`) and **Delete** it (`ui.remove`). Export downloads a file named `<game>-<slot>.json`. A save that can't be read is listed last, marked `data-broken`, as `ui.brokenSave` with the reason and a **Delete** button. With no slots, it shows `ui.noSaves`.

While the game's [`saveable`](/docs/reference/game#saveable) refuses saving, **Save in a new slot** and each slot's **Save** are greyed out, with the reason under the buttons (part `saves-blocked`) and on hover. The menu then carries `data-saving="blocked"`. An entry with `hide` leaves the Save buttons off instead. Loading, exporting and importing still work. The reason comes from [`view.saving`](/docs/reference/view#saving).

If a save can't be read, the menu shows why. A save made with mods or plugins this game doesn't have still loads, with a line naming them (`ui.missingPacks`, `ui.missingPlugins`). `onLoaded` is called after a load or an import. The menu carries `data-saves`. It draws nothing when the runner has no `saves`.

```tsx
import { useState } from 'react'
import { SavesMenu } from '@ifloom/react'
import { Dialog, DialogContent, DialogTitle } from '@ifloom/react/kit'

function SavesDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Saves</DialogTitle>
        <SavesMenu onLoaded={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
```

**Gotcha.** Saving over a slot replaces its name with the default one. That's [`meta.when`](/docs/reference/saves#savemeta) (the day, period and place in the plugins' words), or `Turn N` when no plugin says.

Replaceable as `SavesMenu` in [`components`](#components). Parts: `saves`, `saves-actions`, `save-slot` (with `data-save-slot`), `save-name`, `save-details`, `saves-message`, `saves-blocked`, `saves-empty`, `file-button` and `button`.

### useSaves

```ts
function useSaves(): SavesState

type SavesState = {
  available: boolean
  saving: SavingView
  slots: SaveMeta[]
  broken: BrokenSave[]
  save: (name?: string) => Promise<boolean>
  overwrite: (slot: string) => Promise<boolean>
  load: (slot: string) => Promise<boolean>
  remove: (slot: string) => Promise<void>
  exportFile: (slot: string) => Promise<void>
  importFile: (file: File) => Promise<boolean>
  message: string | null
  missingPacks: string[]
  missingPlugins: string[]
}
```

The [`SavesMenu`](#savesmenu) without its look: the slots, and everything the menu does with them. Use it for a save screen of your own.

| Field | What it is |
|---|---|
| `available` | `false` when the runner was made without `saves`. Everything else then does nothing. |
| `saving` | Whether the game lets the player save now, and why not, as [`view.saving`](/docs/reference/view#saving) has it. While `allowed` is `false`, `save` and `overwrite` are refused with the reason, which `message` then holds. |
| `slots` | Every save that can be read, newest first, as [`SaveMeta`](/docs/reference/saves#savemeta), from the runner's [snapshot](/docs/reference/runner#the-saves-list), which follows every save and delete. |
| `broken` | Saves that are there but can't be read, as [`BrokenSave`](/docs/reference/saves#savelisting)s with why. They can only be deleted, with `remove`. |
| `save` | Saves in a new slot, the next free number, with `name` if you give one. `true` if it was written. |
| `overwrite` | Saves over a slot, with the default name. `true` if it was written. |
| `load` | Loads a slot. `true` if it loaded. |
| `remove` | Deletes a slot. |
| `exportFile` | Downloads a slot as `<game>-<slot>.json`. |
| `importFile` | Loads a save from a file the player kept. `true` if it loaded. |
| `message` | Why the last save, load or import failed, or `null`. |
| `missingPacks`, `missingPlugins` | What the last loaded save was made with that this game doesn't have. |

```tsx
import { useSaves } from '@ifloom/react'

function QuickSave() {
  const saves = useSaves()
  if (!saves.available || !saves.saving.visible) return null
  return (
    <button disabled={!saves.saving.allowed} title={saves.saving.reason ?? undefined} onClick={() => void saves.save('Before the park')}>
      Quick save
    </button>
  )
}
```

### Backlog

```tsx
function Backlog(props: { className?: string }): JSX.Element
```

[`runner.snapshot().backlog`](/docs/reference/runner#backlogentry), oldest first, in a [`ScrollArea`](#scrollarea). Each entry shows its title and its beats, drawn as [`Beat`](#beat)s. When the player made a choice in it, a line **You chose: …** (`ui.chose`) follows. Each entry carries `data-backlog` with its scene id. With nothing in it, it shows `ui.backlogEmpty`. It follows the view, so it stays current while open.

**Gotcha.** The runner has to be made with `backlog`. Without it, the list is always empty.

Replaceable as `Backlog` in [`components`](#components). Parts: `backlog`, `backlog-entry` (with `data-backlog`), `backlog-title`, `backlog-choice` and `backlog-empty`, with each beat a `beat`.

### useBacklog

```ts
function useBacklog(): readonly BacklogEntry[]
```

The backlog's [entries](/docs/reference/runner#backlogentry), oldest first, from the runner's [snapshot](/docs/reference/runner#runnersnapshot). It's the [`Backlog`](#backlog) without its look. It's empty unless the runner was made with `backlog`.

```tsx
import { useBacklog } from '@ifloom/react'

function LastChoice() {
  const last = useBacklog().findLast((entry) => entry.chose)
  return last ? <p className="text-sm">Last time: {last.chose}</p> : null
}
```

### ModManager

```tsx
function ModManager(props: { className?: string }): JSX.Element | null
```

The mods screen, over the [`ModsOption`](#modsoption) given to the provider:

- **Add a mod file** (`ui.addMod`) reads a `.json` file through the store's [`add`](/docs/reference/mods#mods). If the file can't be used, it shows why in the store's [words](/docs/reference/mods#what-add-checks), such as `That mod is for another game (corner-cafe).` A mod with the same id as one already there replaces it.
- Every mod added is listed in name order (`data-mod` with its id), with its name, version and description. Each has a button to turn it **On** or **Off** (`ui.modOn`, `ui.modOff`), which reads what the mod is now and carries `aria-pressed`, and a button to **Delete** it (`ui.remove`). Under it are the `problems` that start `mod:<id> `. With no mods, it shows `ui.noMods`.
- Once anything has changed, a line saying the change takes effect on a restart (`ui.modsChanged`) appears with **Restart with these mods** (`ui.applyMods`), which calls `onChange`.

The screen carries `data-mods`. It draws nothing when the provider has no `mods`. [`GameMenu`](#gamemenu) opens it in a dialog, and with [`pages`](#pages) on, the [`SettingsPage`](#settingspage) shows it too.

```tsx
import { GameProvider, ModManager } from '@ifloom/react'

<GameProvider runner={runner} mods={{ store, problems, onChange: () => location.reload() }}>
  <ModManager />
</GameProvider>
```

**Gotchas.**

- **Nothing changes until the restart.** A mod is part of the game, so turning one on or off changes the store, not the game that's running. The player keeps playing the game as it was loaded until `onChange` builds it again.
- **The problems are the ones from start-up.** A mod added since then shows no problems until the game is built again with it.

Replaceable as `ModManager` in [`components`](#components). Parts: `mods`, `mod` (with `data-mod`), `mod-name`, `mod-version`, `mod-state`, `mod-text`, `mod-problem`, `mods-message`, `mods-empty`, `mods-restart`, `mods-changed`, `file-button` and `button`.

### useMods

```ts
function useMods(): ModsState

type ModsState = {
  available: boolean
  list: InstalledMod[]
  add: (file: File) => Promise<boolean>
  toggle: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  changed: boolean
  restart: (() => void) | undefined
  problemsFor: (id: string) => string[]
  message: string | null
}
```

The [`ModManager`](#modmanager) without its look. It needs [`mods`](#modsoption) on the provider.

| Field | What it is |
|---|---|
| `available` | `false` when the provider was given no `mods`. |
| `list` | The mods the player has added, as [`InstalledMod`](/docs/reference/mods#installedmod)s. |
| `add` | Adds a mod from a file. `true` if it was added. Otherwise `message` says why. |
| `toggle` | Turns a mod on or off. |
| `remove` | Removes a mod. |
| `changed` | Whether anything changed since the game was built, so a restart would differ. |
| `restart` | The provider's `onChange`, which builds the game again. `undefined` if it gave none. |
| `problemsFor` | The loader's problems for one mod. |
| `message` | Why the last file couldn't be added, or `null`. |

## Pages

With `pages` on (see [mountGame](/docs/react#mountgame)), the game opens on a title screen instead of going straight into the story. The in-game shell is one page among several:

- `gate`, a notice the player confirms once, if you give one
- `title`, the title screen
- `game`, the shell with the story
- `load`, `settings` and `credits`
- any page a plugin UI adds, such as the [achievements plugin](/docs/plugins/achievements)'s `achievements`
- any page you add in `PagesOptions.pages`, by its id.

The title screen leads to every other page, and the [game menu](#gamemenu) leads back to it. [The title screen and settings](/docs/recipes/title-screen) walks through setting it up.

### PagesOptions

```ts
type PagesOptions = {
  subtitle?: string
  art?: string
  credits?: Credit[]
  gate?: GateOptions
  pages?: Record<string, PageDef>
}

type Credit = string | { label: string; href: string }
type GateOptions = { title: string; text: string; confirm: string; decline?: { label: string; href?: string } }
type PageDef = { label: string; component: ComponentType; showOnTitle?: boolean }
```

What `pages` takes on [`mountGame`](/docs/react#mountgame) and [`GameShell`](/docs/react#gameshell). `pages: true` is the same as `{}`.

| Field | What it is |
|---|---|
| `subtitle` | A line under the title. |
| `art` | A picture for the title screen, by path. It's drawn with [`Picture`](#picture), so a missing file takes no space. |
| `credits` | The credits page's lines. A string is a line, and `{ label, href }` is a link that opens in a new tab. Without credits there's no Credits button. |
| `gate` | A notice shown before the title screen. See [`GatePage`](#gatepage). |
| `pages` | Pages of your own, by id. Each gets a button on the title screen labelled `label`, unless `showOnTitle` is `false`. Its `component` is drawn with no props as the whole page, and leaves with `usePage().back()`. A page with the id of one a plugin UI adds, such as `achievements`, takes its place. |

```tsx
import { mountGame, usePage } from '@ifloom/react'

function Postcards() {
  const { back } = usePage()
  return (
    <section>
      <h1>Postcards from the seaside</h1>
      <button onClick={back}>Back</button>
    </section>
  )
}

mountGame(game, {
  pages: {
    subtitle: 'A new flat, a new town',
    credits: ['Written by you', { label: 'Made with IFLoom', href: 'https://ifloom.dev/' }],
    pages: { postcards: { label: 'Postcards', component: Postcards } },
  },
})
```

### usePage

```ts
function usePage(): PageState

type Page = 'gate' | 'title' | 'game' | 'load' | 'settings' | 'credits' | (string & {})

type PageState = {
  enabled: boolean
  page: Page
  from: Page | null
  go: (page: Page) => void
  back: () => void
  options: PagesOptions
  added: Readonly<Record<string, PageDef>>
}
```

Where the player is among the pages, and how to move between them.

| Field | What it is |
|---|---|
| `enabled` | `false` when the game was drawn without `pages`. Then `page` is always `'game'` and `go` and `back` do nothing. |
| `page` | The page showing. |
| `from` | The page under this one, which `back` returns to. `null` on the title screen, the gate and the game. |
| `go(page)` | Shows a page. `title`, `game` and `gate` start afresh, and any other page goes on top of the one showing. |
| `back()` | Returns to the page under this one, or to the title screen if there's none. |
| `options` | The `PagesOptions` the pages were set up with. |
| `added` | Every page added to the built-in ones, by id: the plugin UIs', with their labels worded, and the game's own `pages` over them. |

`go('game')` only switches page. To start a game, call [`runner.newGame`](/docs/reference/runner#newgame) or load a save first, as the title screen does.

### TitlePage

```tsx
function TitlePage(props: { className?: string }): JSX.Element
```

The game's title (`view.title`), the `subtitle` and `art` if given, and a column of buttons, each carrying `data-title-button`:

- **Continue** (`ui.continue`, `continue`) loads the newest save, by `savedAt`. It shows only when there is one.
- **New game** (`ui.newGame`, `new`) calls [`runner.newGame()`](/docs/reference/runner#newgame), which takes the player's stored settings from the profile.
- **New Game+** (`ui.newGamePlus`, `new-game-plus`) shows when the game declares [`carryOver`](/docs/reference/state#new-game) and the profile's `core:finished` is set. It starts a new game carrying over from the newest save's state, or from the state in play if there's no save.
- **Load** (`ui.load`, `load`) when the runner has `saves`.
- **Settings** (`ui.settings`, `settings`) when the game declares any setting, has a plugin UI with [`settings`](/docs/react/kit#pluginui) (the unlocks plugin's code box) or has [`mods`](#modsoption).
- A button for each page a plugin UI adds, such as **Achievements**, and each of your own pages, by its id, unless its `showOnTitle` is `false`.
- **Credits** (`ui.credits`, `credits`) when `credits` are given.

The first button is drawn as the main one: Continue when there's a save, otherwise New game. The section carries `data-page="title"`.

Replaceable as `TitlePage` in [`components`](#components). Parts: `title-page`, `title-art`, `title-name`, `title-subtitle`, `title-buttons` and `title-button`.

### SettingsPage

```tsx
function SettingsPage(props: { className?: string }): JSX.Element
```

The settings, drawn from [`view.settings`](/docs/reference/view#settings): a checkbox for a toggle, radio buttons for a choice, and a slider with its value beside it for a range. It says `ui.noSettings` when the game declares none, and has a Back button (`ui.back`).

Each value comes from [`runner.snapshot().settings`](/docs/reference/runner#settings), and each change goes through [`runner.setSetting`](/docs/reference/runner#setsetting):

- **A ui setting** is written to the profile.
- **A play setting** is sent as a [`setting`](/docs/reference/commands#setting) command, so it changes the game in play, and the runner writes it to the profile, so the next new game starts with it. Without a profile, New game keeps the settings in play.

A refused change shows its reason under the list.

Each plugin UI's [`settings`](/docs/react/kit#pluginui) follow the list, such as the unlocks plugin's code box. With [`mods`](#modsoption), a Mods section follows that: a heading (`ui.mods`), a line about mods (`ui.modsHint`) and the [`ModManager`](#modmanager), where the player adds, turns on or off and deletes mods and restarts with the change. With either, the page says nothing about having no settings, and the title screen and the menu offer Settings even when the game declares none. The menu keeps its own Mods button.

Replaceable as `SettingsPage` in [`components`](#components). Parts: `settings-page`, `page-heading`, `settings`, `setting` (with `data-setting` and `data-affects`), `setting-label`, `setting-control`, `setting-value`, `settings-empty`, `settings-message`, `settings-mods` (with `data-settings-mods`), `mods-title`, `mods-hint` and `page-back`.

### LoadPage

```tsx
function LoadPage(props: { className?: string }): JSX.Element
```

Every save, newest first, each with a Load button, any that can't be read with a Delete button, and a button to import a save file. Loading or importing goes to the game. It's built on [`useSaves`](#usesaves), and unlike [`SavesMenu`](#savesmenu) it can't save, since there may be no game in play to save.

Replaceable as `LoadPage` in [`components`](#components). Parts: `load-page`, `page-heading`, `saves`, `save-slot`, `save-name`, `save-details`, `saves-message`, `saves-empty`, `file-button`, `button` and `page-back`.

### CreditsPage

```tsx
function CreditsPage(props: { className?: string }): JSX.Element
```

The `credits` from `PagesOptions`, one per line, with a Back button. Links open in a new tab.

Replaceable as `CreditsPage` in [`components`](#components). Parts: `credits-page`, `page-heading`, `credits`, `credit`, `credit-link` and `page-back`.

### GatePage

```tsx
function GatePage(props: { className?: string }): JSX.Element | null
```

A notice the player has to confirm before they reach the title screen, from `PagesOptions.gate`. Use it for a content note or an age check. Every word on it is yours: `title`, the `text` split into paragraphs on blank lines, and the `confirm` and `decline` labels.

```ts
mountGame(game, {
  pages: {
    gate: {
      title: 'Before you start',
      text: 'This story mentions a house fire.\n\nIt happens off the page.',
      confirm: 'Carry on',
      decline: { label: 'Not today', href: 'https://example.com/' },
    },
  },
})
```

Confirming stores `{ confirmedAt }` in the profile's `ui:gate` namespace and goes to the title screen. After that, the gate isn't shown again on that device. Declining follows `href`, or does nothing if there's no `href`.

**Gotcha.** Without a profile, nothing is remembered, so the gate shows every time. [`mountGame`](/docs/react#mountgame) always has one.

Replaceable as `GatePage` in [`components`](#components). Parts: `gate-page`, `gate-title`, `gate-text`, `gate-buttons`, `gate-confirm` and `gate-decline`.

### useSetting

```ts
function useSetting(id: string): KvValue | undefined
```

A setting's current value, for your own components, as [`runner.snapshot().settings`](/docs/reference/runner#settings) gives it. A play setting's is the game in play's. A ui setting's comes from the profile, and the component redraws when it changes. If the stored value doesn't suit the setting any more, you get its default. It's `undefined` for a setting the game doesn't declare. Change one with [`runner.setSetting`](/docs/reference/runner#setsetting).

```tsx
import { useSetting } from '@ifloom/react'

function Story({ children }: { children: React.ReactNode }) {
  const size = useSetting('textSize')
  return <div className={size === 'large' ? 'text-lg' : undefined}>{children}</div>
}
```

### TextSize

```tsx
function TextSize(): null
```

Copies the setting the game names in the [`settings`](/docs/react/hints#settings) hint's `textSize` to `data-text-size` on `<html>`, now and whenever it changes, and takes it off when it's unmounted. It draws nothing. `GameShell` (and so `mountGame`) has one, so you only need it under a `GameProvider` of your own.

### useProfile

```ts
function useProfile<T = unknown>(namespace: string): T | undefined
```

What the [profile](/docs/reference/profile) holds in a namespace, kept up to date as it's written. It's `undefined` before the first read and when the runner has no profile. The title screen uses `useProfile('core:finished')` to decide whether to offer New Game+.

```tsx
const settings = useProfile<Record<string, unknown>>('core:settings')
```

## Around the story

### Notices

```tsx
function Notices(props: { className?: string; limit?: number }): JSX.Element | null
```

The first `limit` (default 3) of the view's unseen [notices](/docs/reference/notices), each drawn as a [`Notice`](#notice). The list has `role="status"`, so a screen reader announces a new one. It's the `'notices'` part, which the default layouts put in the overlay, at the bottom right of the window. On its own it sits wherever you put it.

On a narrow screen (under 48rem) it shows only the newest notice, with a `notices-more` button under it, `+1 more` (`ui.noticesMore`), that shows the rest. Pressed again, `Show fewer` (`ui.noticesFewer`) hides them. Wider screens show them all and no button.

```tsx
import { Notices } from '@ifloom/react'

<Notices limit={1} className="fixed top-4 left-1/2 w-96 -translate-x-1/2" />
```

Replaceable as `Notices` in [`components`](#components). Parts: `notices`.

### Notice

```tsx
Notice: (props: { notice: NoticeView }) => JSX.Element
```

One [notice](/docs/reference/notices): its picture, title and text, and a button with the close [`Icon`](#icon), labelled `ui.dismiss`, that sends [`dismiss`](/docs/reference/commands#dismiss). It carries `data-notice` with the notice's id. [`Notices`](#notices) draws one for each.

You can draw it yourself, or replace it through [`components`](#components) to draw each notice your own way and keep the list:

```tsx
import type { Components } from '@ifloom/react'

const components: Components = {
  Notice: ({ notice, Default }) => (notice.image ? <Default notice={notice} /> : <p className="text-sm italic">{notice.title}</p>),
}
```

Replaceable as `Notice` in [`components`](#components). Parts: `notice` (with `data-notice`), `notice-image`, `notice-title`, `notice-text` and `notice-dismiss`.

### NoticeStrip

```tsx
function NoticeStrip(props: { className?: string }): JSX.Element | null
```

A row of counts for what's waiting for the player, each a button that opens where it is:

- **Notices** (`ui.notices`) with the number of unseen [notices](/docs/reference/notices). It opens them all in a dialog, each a [`Notice`](#notice), with a **Mark all seen** button (`ui.allSeen`) that sends [`dismiss`](/docs/reference/commands#dismiss) with no id.
- What the plugin UIs place at its `strip` spot: the devices plugin's [`DeviceStrip`](/docs/plugins/devices#devicestrip), a count for each app with a badge, such as the phone's Messages, which opens the device on that app.

It's a `<nav>` labelled `ui.unread`, hidden while nothing in it is drawn. The default layout doesn't include it, so add it to your layout where you want it, such as at the top of the story:

```tsx
<Story>
  <NoticeStrip />
  <Scene />
</Story>
```

Each button carries `data-strip`: `notices`, or for the devices' counts the device and app ids, as `phone/texts`. It's kept basic on purpose. [Building your own HUD](/docs/recipes/hud) shows how to write your own from the view.

Replaceable as `NoticeStrip` in [`components`](#components). Parts: `notice-strip`, `notice-strip-item` (with `data-strip`) and `badge`, plus the dialog's parts.

## Dice

### DiceRoll

```tsx
function DiceRoll(props: DiceRollProps): JSX.Element

type DiceRollProps = { roll: Roll; animate?: boolean; className?: string }
```

One [roll](/docs/reference/rolls#roll) from [`view.rolls`](/docs/reference/view#rolls). From left to right: the dice (`2d6`), a face for each die, what was added (`+2`), and once they settle, the total, and with a target, Passed or Failed and what it needed. A die on its top face or on 1 is marked with `data-high` or `data-low`, and a critical gets Critical! or Fumble.

With `animate` (the default), the faces tumble for a second before they settle on the faces rolled. The tumbling numbers are only for show; the engine's roll was made already. With [`motion`](#uioptions) off, or the player asking for reduced motion, it shows settled at once. The result is in a `status` region, so a screen reader hears it once the dice settle, worded by `ui.diceRolled` and the strings after it. [`Scene`](#scene) draws it above a block with a [`dice`](/docs/react/hints#dice) hint, and [`DiceOverlay`](#diceoverlay) for the rest.

```tsx
import { DiceRoll, useGame } from '@ifloom/react'

function LastRolls() {
  const { view } = useGame()
  return view.rolls.map((roll, at) => <DiceRoll key={at} roll={roll} animate={false} />)
}
```

Replaceable as `DiceRoll` in [`components`](#components). Parts: `dice` (with `data-roll`, `data-state` `rolling` or `settled`, and once settled `data-passed` and `data-critical`), `dice-label`, `dice-faces`, `dice-face` (with `data-rolling`, `data-high` and `data-low`), `dice-plus`, `dice-total`, `dice-outcome` (with `data-passed`) and `dice-critical`. Each preset draws them its own way: printed in Paper, chunky in Storybook, tiles in Studio, and `[4] [6] = 10` in Terminal.

### DiceOverlay

```tsx
function DiceOverlay(props: { rolls: readonly Roll[]; className?: string }): JSX.Element | null
```

Rolls the story doesn't name, shown for a moment over the scene: a `DiceRoll` for each, near the top of the window. It goes about two and a half seconds after the dice settle, or when the player presses its close button (`ui.diceDismiss`). [`Scene`](#scene) draws one for the new rolls that no block's `dice` hint names, such as Small Town's ducks, counted by a trigger as you reach the park.

Replaceable as `DiceOverlay` in [`components`](#components). Parts: `dice-overlay` and `dice-dismiss`. To show these rolls somewhere else, replace it with a component that draws them where you like, or with `() => null` to show none.

## Timers

The game's [timers](/docs/reference/timers), from [`view.timers`](/docs/reference/view#timers). [`GameProvider`](#gameprovider) runs the clock that ticks them, so a timer runs out on time whether or not anything draws it. A block with a [`timer`](/docs/react/hints#timer) hint gets a `Countdown` under it, and your layout can put one anywhere else.

### Countdown

```tsx
function Countdown(props: CountdownProps): JSX.Element | null

type CountdownProps = { timer: string; label?: boolean; className?: string }
```

One running timer, by id: its `label` (unless `label={false}`), a bar that empties as it runs down, and the seconds left, worded by `ui.timerLeft` (`{seconds}s`). The bar is a `progressbar` labelled with the timer's label (or `ui.timeLeft`), from 0 to its `total`, and its inner `<span>` shrinks with `transform: scaleX()`, easing between ticks. The seconds are a `timer` region. With a quarter or less of it left, the countdown and its bar and seconds carry `data-urgent`, which the presets colour. With [`motion`](#uioptions) off, or the player asking for reduced motion, only the seconds show. It draws nothing while the timer isn't running, so it goes the moment the timer runs out or is stopped.

```tsx
import { Countdown, Game, Scene, Sidebar, Story } from '@ifloom/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Countdown timer="flat.ring" label={false} />
      </Sidebar>
      <Story>
        <Scene />
      </Story>
    </Game>
  )
}
```

Replaceable as `Countdown` in [`components`](#components), which also changes the one `Scene` draws for a hint. Parts: `timer` (with `data-timer` and `data-urgent`), `timer-label`, `timer-bar` (with `data-urgent`) and `timer-left` (with `data-urgent`). Paper draws a thin rule, Storybook a fat bar in a card, Studio a bordered strip, and Terminal a text-mode bar with a prompt.

### Timers

```tsx
function Timers(props: { className?: string }): JSX.Element | null
```

A `Countdown` for every running timer, in the order they started, in a `timers` part. Nothing while none runs. The default layout doesn't place it, so a timer only shows where a block's hint or your layout puts it. Replaceable as `Timers` in [`components`](#components).

### useTimer and useTimers

```ts
function useTimer(id: string): TimerView | null
function useTimers(): TimerView[]
```

`useTimers` is [`view.timers`](/docs/reference/view#timers), and `useTimer` one [`TimerView`](/docs/reference/timers#timerview) from it, or `null` while that timer isn't running. Only inside a [`GameProvider`](#gameprovider). Use them to draw a countdown of your own, from the timer's `left` and `total`:

```tsx
import { useTimer } from '@ifloom/react'

function RingingPhone() {
  const ringing = useTimer('flat.ring')
  if (!ringing) return null
  return <span className="phone" style={{ opacity: 0.4 + (0.6 * ringing.left) / ringing.total }}>☎</span>
}
```

## Minigames

### MinigameCard

```tsx
function MinigameCard(props: { className?: string }): JSX.Element | null
```

The [minigame](/docs/reference/minigames) being played, from [`view.minigame`](/docs/reference/minigames#minigameview). [`Scene`](#scene) draws it in place of the scene while one runs. From top to bottom, it shows:

- the minigame's `title`, as a heading
- the running state's words (`label`), in a polite live region so a screen reader reads each new one
- a bar counting down the state's timer, when it has one. It's a `progressbar` labelled `ui.timeLeft`, from 0 to `timeTotal`, and its inner `<span>` shrinks with `transform: scaleX()`, easing between ticks
- a button for each live input, which sends [`{ type: 'minigame', input }`](/docs/reference/commands#minigame). Each says the input's `label` from the view: the game's `minigame.<input>` [string](/docs/reference/strings#buttons-and-labels), `Up` to `Space` for the arrows and space, or its own name with a capital.

It runs the clock through [`useMinigame`](#useminigame), and maps the keyboard to the inputs. Each input takes the keys the minigame lists in its [`keys`](/docs/reference/minigames#minigamedef). An input it doesn't list takes the arrow keys for `up`, `down`, `left` and `right`, the space bar for `space`, and its own letter for a one-letter input. A key held down doesn't repeat. These keys work whether the game's [`keys`](#keyoptions) are on or not, and they come before them. The keys follow the same rules as the hotkeys: nothing while typing, with a modifier held or with a dialog open.

The `<section>` carries `data-minigame` with the minigame's id and `data-state` with its state, and each button `data-input`.

There are two ways to draw a minigame your own way:

- **One minigame.** Put a component in `panels` under the minigame's id. [`Scene`](#scene) draws it instead, given the [`MinigameView`](/docs/reference/minigames#minigameview) as `data`, and runs the clock for it. Call `useMinigame()` in it for `send`.
- **Every minigame.** Replace `MinigameCard` in [`components`](#components).

```tsx
import { GameShell, type Components, type PanelComponent } from '@ifloom/react'

const Coconuts: PanelComponent = () => <CoconutShy />   // just the coconut shy
const components: Components = {
  MinigameCard: ({ Default }) => <div className="rounded-xl border-4 p-4"><Default /></div>,  // every other minigame
}

<GameShell runner={runner} panels={{ coconut: Coconuts }} components={components} />
```

The [Minigames recipe](/docs/recipes/minigames#your-own-panel) builds a panel of your own.

Replaceable as `MinigameCard` in [`components`](#components). Parts: `minigame` (with `data-minigame` and `data-state`), `minigame-title`, `minigame-state`, `minigame-timer`, `minigame-inputs` and `minigame-input` (with `data-input`).

### useMinigame

```ts
function useMinigame(options?: { keys?: boolean }): MinigameControls

type MinigameControls = {
  minigame: MinigameView | null
  send: (input: string) => Applied
}
```

The minigame being played, as [`view.minigame`](/docs/reference/minigames#minigameview) has it, or `null`, and `send`, which presses one of its inputs and returns what [`apply`](/docs/reference/commands#apply) returned. With `keys: true`, it also maps the keyboard to the inputs the way [`MinigameCard`](#minigamecard) does. Only inside a [`GameProvider`](#gameprovider).

Its timers run on the game's clock, which [`GameProvider`](#gameprovider) runs. Every 100 ms or so, while the running state has a timer (`timeLeft` isn't `null`) or any of the game's timers runs, it sends [`{ type: 'tick', ms }`](/docs/reference/commands#tick) with the real time since the last tick, measured with `performance.now()`. So a browser that holds the timer back sends one bigger tick when it catches up, and the minigame's time stays true. The clock stops when nothing counts down, and starts again when something does. When an input moves the minigame to a new state, the clock starts afresh from that moment.

There's one clock per runner, which also ticks the game's [timers](#timers).

**Time while the page is hidden is dropped.** When the player switches tab or minimises the window, the clock sends the time up to that moment and pauses, and when the page shows again it carries on from there. A minigame waits for a player who looked away, instead of running out its timers unseen.

```tsx
import { useMinigame } from '@ifloom/react'

function ArrowPad() {
  const { minigame, send } = useMinigame({ keys: true })
  if (!minigame) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {minigame.inputs.map((input) => (
        <button key={input.id} onClick={() => send(input.id)}>{input.label}</button>
      ))}
    </div>
  )
}
```

**Gotcha.** Nothing ticks unless something calls it. [`Scene`](#scene) does while a minigame runs, so a game with its own root that leaves out `Scene` has to call `useMinigame()` somewhere, or the minigame's timers wait for ever.

## Panels

A [panel](/docs/reference/panels) is a named piece of UI that content opens over the story, such as a shop's counter. The React UI draws the ones its own parts have, and each plugin UI the game lists brings its own: `shopUi` the `shop` panel, `jobsUi` the `jobs` panel, and so on. [Plugin UIs and the kit](/docs/react/kit) has the rest of what a plugin's UI brings.

### PanelHost

```tsx
function PanelHost(): JSX.Element
```

What the `'panel'` part draws: the [panel](/docs/reference/panels) the `panel` effect opened, [`view.panel`](/docs/reference/view#panel), in a [`PartDialog`](#partdialog). A scene's own panel, one whose `view.panel` has a `scene`, isn't drawn here: the scene draws it in place of its choices. It draws the game's own [`panels`](#gameprovider) component of that name if there is one, else a listed plugin UI's panel of that name, else a [built-in one](#built-in-panels), and hands it what the panel was opened with as `data`. Closing the dialog, with its close button or Escape, sends [`closePanel`](/docs/reference/commands#closepanel).

The dialog is titled with `with.title` when content gave one, else the plugin UI's [title for the panel](/docs/react/kit#pluginpanel) (the vendor's name for the shop, `ui.jobs` for the job board), else a built-in panel's word, or else the panel's name. The panel is drawn inside a `div` with `data-panel` set to its name.

A name nothing draws shows nothing. The panel stays open in the state until it's closed or the story moves on, so draw every name your content opens.

```tsx
import { mountGame } from '@ifloom/react'

// { panel: 'noticeboard', with: { title: 'The noticeboard' } } opens this.
function Noticeboard({ data }: { data: unknown }) {
  return <p>Lost: one grey cat, answers to Biscuit.</p>
}

mountGame(game, { panels: { noticeboard: Noticeboard } })
```

The default layout has it in the overlay. In a layout of your own, put it anywhere inside the `GameProvider`. Replaceable as `PanelHost` in [`components`](#components). Parts: `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### Built-in panels

The panels [`PanelHost`](#panelhost) draws by name for what the engine itself keeps. A plugin UI's panels and a game's own `panels` of the same name go over them.

| Name | Draws |
|---|---|
| `inventory` | [`Inventory`](#inventory), without its heading, or the inventory plugin's [`InventoryCard`](/docs/plugins/inventory#inventorycard) when the game lists its UI |
| `stats` | [`StatList`](#statlist) |

The first-party plugins' panels are on their pages: `shop`, `jobs`, `wardrobe`, `quests`, `people`, `achievements` and `statuses`.

### PartDialog

```tsx
function PartDialog(props: { open: boolean; onClose: () => void; title: string; children: ReactNode }): JSX.Element
```

A [`Dialog`](#dialog) drawn with the UI's `dialog` parts, as the menu's, `PanelHost`'s and the plugin UIs' are. It's open while `open` is true, titled `title`, and calls `onClose` when the player closes it. Use it for a dialog of your own that should look like the rest.

```tsx
import { useState } from 'react'
import { Button, PartDialog } from '@ifloom/react/kit'

function Map() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Town map</Button>
      <PartDialog open={open} onClose={() => setOpen(false)} title="Small Town">
        <img src="art/map.png" alt="" />
      </PartDialog>
    </>
  )
}
```

Parts: `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

## Sound

### useAudio

```ts
function useAudio(options?: AudioOptions & { runner?: Runner }): AudioPlayer | null
```

Plays the game's sound with the [audio player](/docs/browser/audio-player) while the component is mounted, and stops it on unmount. Inside a [`GameProvider`](#gameprovider) it uses that runner. Outside one, pass `runner`. The other options go to [`startAudio`](/docs/browser/audio-player#audiooptions) once, when it starts. It returns the player, or `null` until it has started.

[`GameShell`](/docs/react#gameshell) and [`mountGame`](/docs/react#mountgame) start a player themselves, set with their `audio` option, so you need this only under a `GameProvider` of your own. One beside them takes over from theirs, so nothing plays twice. See [Sound](/docs/react#sound).

```tsx
function Sound() {
  useAudio({ log: console.debug })
  return null
}

<GameProvider runner={runner}>
  <Sound />
  <MyPage />
</GameProvider>
```

## Words

### UiStringKey, Words and Say

```ts
type UiStringKey = 'stats' | 'inventory' | /* ... */
type Words = Readonly<Record<string, string>>
type Say<K extends string = UiStringKey> = (key: K, vars?: Record<string, string | number>) => string
```

The UI's own words in English, by key without the `ui.` prefix. The full table is on [The React UI](/docs/react#words). `UiStringKey` is one of its keys. Each plugin UI has a table of its own, a `Words`, such as the shop's `SHOP_WORDS`, on the plugin's page.

Among them are `close` (the dialogs' close button) and `heldCount` (`×{n}` after a thing you hold). The words between the parts of a price are the engine's `priceSeparator` [string](/docs/reference/strings#buttons-and-labels).

### useWords

```ts
function useWords(): Say
function useWords<W extends Words>(words: W): Say<keyof W | UiStringKey>
```

The game's word for a key, inside a [`GameProvider`](#gameprovider): `game.strings['ui.' + key]`, or the English if the game doesn't set it. Each `{name}` is filled from `vars`, one with no value is left as written, and a key nothing has is said as it is. Given a plugin UI's table, it says that table's keys too, typed. A plugin's own UI gets its words from [`usePlugin`](/docs/react/kit#useplugin) instead, so it names its table once.

```tsx
import { useWords } from '@ifloom/react'
import { QUESTS_WORDS } from '@ifloom/plugin-quests/react'

function JournalHeading() {
  const words = useWords(QUESTS_WORDS)
  return <h3>{words('quests')}</h3>
}
```

## shadcn/ui primitives

These are the building blocks the components above are made from, exported from `@ifloom/react/kit` so your own screens match. They're [shadcn/ui](https://ui.shadcn.com)'s components, styled by the same [theme variables](/docs/react/customising#2-set-tokens-and-colours), and shadcn/ui's documentation for each applies. To add one this package doesn't have, see [More shadcn/ui components](/docs/react/extending#more-shadcnui-components).

The game components don't use `Button` and `Badge` themselves. They draw plain `<button>` and `<span>` elements with [`buttonVariants`](#button) and [`badgeVariants`](#badge) classes, run through [`usePart`](#usepart), so `classes` and `unstyled` reach every one.

### Button

```tsx
function Button(props: ButtonProps): JSX.Element
const buttonVariants: (options?: { variant?: ...; size?: ... }) => string

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}
```

A button. `asChild` puts the button's look on its one child instead, such as a link. `buttonVariants` returns the classes, for something that isn't a `Button` but should look like one.

```tsx
import { Button, buttonVariants } from '@ifloom/react/kit'

<Button variant="outline" size="sm" onClick={() => runner.undo()}>Undo</Button>
<a className={buttonVariants({ variant: 'link' })} href="https://example.com/credits">Credits</a>
```

### Badge

```tsx
function Badge(props: BadgeProps): JSX.Element
const badgeVariants: (options?: { variant?: ... }) => string

type BadgeProps = ComponentProps<'span'> & { variant?: 'default' | 'secondary' | 'outline' | 'destructive' }
```

A small pill, for a count or a status.

```tsx
import { Badge } from '@ifloom/react/kit'

<Badge variant="secondary">Open till 6</Badge>
```

### Card

```tsx
Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
```

A bordered box and its parts. Each is a `div` taking a `div`'s props, except `CardTitle`, which is an `h3`, and `CardDescription`, which is a `p`.

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

```tsx
Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose
```

A modal, built on Radix's Dialog. `Dialog` takes `open` and `onOpenChange`, or opens from a `DialogTrigger`. `DialogContent` is the box, with an overlay and a close button. Give it a `DialogTitle` for screen readers.

```ts
type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  bare?: boolean
  closeLabel?: string
  closeIcon?: ReactNode
  overlayProps?: ComponentProps<typeof DialogPrimitive.Overlay>
  closeProps?: ComponentProps<typeof DialogPrimitive.Close>
}
```

| Prop | What it does |
|---|---|
| `bare` | Skips the built-in classes on the box, the overlay and the close button, so you style all three. `DialogTitle` takes `bare` too. |
| `closeLabel` | The close button's screen-reader text. `'Close'` by default. |
| `closeIcon` | The close button's icon. Lucide's X by default. |
| `overlayProps` | Attributes for the overlay behind the box, such as a `className` or a `data-part`. |
| `closeProps` | Attributes for the close button. |

The [`GameMenu`](#gamemenu) and [`DeviceDialog`](/docs/plugins/devices#devicedialog) use `bare`, with the attributes from [`usePart`](#usepart), so their dialogs follow `classes` and `unstyled` like everything else.

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

```tsx
function ScrollArea(props: ComponentProps<typeof ScrollAreaPrimitive.Root>): JSX.Element
```

A box that scrolls, with a slim scrollbar. Give it a height.

```tsx
import { ScrollArea } from '@ifloom/react/kit'

<ScrollArea className="h-64">{backlog}</ScrollArea>
```

### Separator

```tsx
function Separator(props: ComponentProps<typeof SeparatorPrimitive.Root>): JSX.Element
```

A thin rule. Its `orientation` is `'horizontal'` (the default) or `'vertical'`.

### Tabs

```tsx
Tabs, TabsList, TabsTrigger, TabsContent
```

Tabs, built on Radix's Tabs. Each `TabsTrigger` shares a `value` with its `TabsContent`.

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

```tsx
Tooltip, TooltipProvider, TooltipTrigger, TooltipContent
```

A hint on hover or focus, built on Radix's Tooltip. Every tooltip needs a `TooltipProvider` above it. The game components don't use tooltips, so [`GameShell`](#gameshell) doesn't add one. Wrap your page in a `TooltipProvider` when your own components use them.

```tsx
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ifloom/react/kit'

<Tooltip>
  <TooltipTrigger asChild><Button size="icon" variant="ghost">?</Button></TooltipTrigger>
  <TooltipContent>The café's hours are on the door.</TooltipContent>
</Tooltip>
```

### cn

```ts
function cn(...inputs: ClassValue[]): string
```

Joins class names, skipping falsy ones, and lets a later Tailwind class win over an earlier one that sets the same thing. It's shadcn/ui's `cn`.

```ts
import { cn } from '@ifloom/react/kit'

cn('p-4 text-sm', closed && 'opacity-50', 'p-2') // 'text-sm opacity-50 p-2' when closed
```
