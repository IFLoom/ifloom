---
title: "Components"
description: "Every component and hook @ifloom/react exports, from GameShell down to a single button, with its parts and props."
---
This page is about `@ifloom/react`, the optional React UI. The engine doesn't need it. To draw a game with plain DOM, Vue, Svelte or React by hand, see [Your own UI in any framework](/docs/guide/frameworks).

This page lists everything `@ifloom/react` exports, from the whole shell down to a single button. Each game component reads the [view](/docs/reference/view) through [`useGame`](#usegame), so it has to sit inside a [`GameProvider`](#gameprovider). [`GameShell`](#gameshell) is one. The [shadcn/ui primitives](#shadcnui-primitives) at the end don't need a provider.

Every game component on this page can be replaced by its name in [`components`](#components), everywhere the UI draws it, and each entry lists the main [`data-part`](/docs/react/customising#the-data-part-reference)s it draws. [Make it your own](/docs/react/customising) shows how to use both.

```ts
import {
  // the game
  GameShell, GameProvider, useGame, Frame, Icon,
  DEFAULT_LAYOUT, READING_LAYOUT, Parts, Title, Actions,
  SceneStage, Beat, InlineAction, Tip, Picture, Video, Stage, Hotspot, MediaViewer, assetUrl, ChoiceButton, ChoiceList, PriceTag,
  Sidebar, Clock, StatList, EntityTable, LocationCard, PeopleCard, Inventory, WardrobeCard,
  useClock, usePlaces, usePeople, useWardrobe,
  InputField, InputFields,
  GameMenu, SavesMenu, Backlog, ModManager, useSaves, useBacklog, useMods,
  TitlePage, SettingsPage, LoadPage, CreditsPage, GatePage, usePage, useSetting, useProfile,
  Notices, NoticeStrip, QuestLog, useQuests, MinigameCard, useMinigame,
  StatusList, useStatuses, AchievementList, AchievementsButton, AchievementsPage, useAchievements,
  ShopButtons, ShopDialog, ShopCounter, useShop, JobBoard, useJobs,
  DeviceButtons, DeviceDialog, DeviceScreen, AppSection, useDevices, useDevice,
  MessagesSection, FeedSection, useMessages, useFeed, DebugCard, useDebug,
  useAudio,
  UI_STRINGS, uiSay, useWords,
  PART_KEYS, UiProvider, usePart, overridable,
  type GameShellProps, type Layout, type Part, type PartName, type GameProviderProps, type GameContextValue, type ModsOption, type UnlocksOption,
  type PanelComponent, type PluginSectionComponent, type SidebarProps, type UiStringKey, type FrameProps, type IconName,
  type SavesState, type ModsState, type DevicesState, type DeviceState,
  type ClockState, type PlacesControls, type QuestsControls, type WardrobeControls, type WardrobeSlotControls,
  type MessagesControls, type FeedControls, type DebugControls, type ShopControls, type JobsControls,
  type PagesOptions, type Page, type PageDef, type PageState, type Credit, type GateOptions,
  type Classes, type Components, type Override, type PartKey, type UiOptions, type KeyOptions, type MinigameControls,
  type VideoProps, type MediaViewerProps, type ViewerMedia,
  // shadcn/ui
  Button, buttonVariants, Badge, badgeVariants,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
  ScrollArea, Separator, Tabs, TabsList, TabsTrigger, TabsContent,
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent, cn,
  type ButtonProps, type BadgeProps, type DialogContentProps,
} from '@ifloom/react'
```

Every component that takes `className` merges it over its own classes with [`cn`](#cn), so a later Tailwind class wins: `<SceneStage className="gap-8" />`.

### Identity attributes

Every element the UI draws carries a `data-part` naming what kind of thing it is, such as `choice` or `stat-value`. They're all listed in [the data-part reference](/docs/react/customising#the-data-part-reference). Many elements also carry a `data-` attribute saying which one it is, usually holding an id. You can style them from your stylesheet or find them in a test.

| Attribute | On |
|---|---|
| `data-sidebar` | The side column ([`Sidebar`](#sidebar)). |
| `data-scene` | The stage ([`SceneStage`](#scenestage)). |
| `data-choice` | Each choice or action button. |
| `data-exit`, `data-person` | Each exit and each person in the sidebar. |
| `data-stat`, `data-kind`, `data-entity` | Each stat row, entity table and entity row. |
| `data-item`, `data-slot-id` | Each item carried and each wardrobe slot. |
| `data-input` | Each input field. |
| `data-notice`, `data-quest` | Each notice and each active quest. |
| `data-status` | Each active status. |
| `data-achievement`, `data-earned`, `data-secret` | Each achievement, and on it whether it's earned and whether it's a secret not yet earned. |
| `data-vendor`, `data-closed`, `data-good` | Each vendor's button and counter, a counter while the vendor is closed, and each good. |
| `data-job`, `data-hired`, `data-fired` | Each job on the board, and on it whether the player holds it or was fired from it. |
| `data-device`, `data-open-app`, `data-app`, `data-entry` | Each device button, each app icon, an open app, and each entry in an app's list. |
| `data-frame`, `data-icon`, `data-face` | A device's frame, an app's icon name, and a `prop` beat's face, for a stylesheet to dress. |
| `data-beat`, `data-who` | Each beat's kind, and on a spoken line, `character` or `player`. |
| `data-from` | Each message bubble: `them` or `player`. |
| `data-has-sidebar` | The page, when the layout has a side column. |
| `data-channel`, `data-thread`, `data-post`, `data-feed` | Messages and feeds. |
| `data-save-slot`, `data-backlog`, `data-mod` | Each save slot, backlog entry and mod. |
| `data-inventory`, `data-wardrobe`, `data-menu`, `data-saves`, `data-mods`, `data-quests`, `data-debug`, `data-statuses`, `data-achievements`, `data-shop`, `data-jobs` | Whole panels. |

## The game

### GameShell

```tsx
function GameShell(props: GameShellProps): JSX.Element
```

The whole UI. It's a [`GameProvider`](#gameprovider) around a [`Frame`](#frame), which places a side column, a stage and an overlay. The side column is a [`Sidebar`](#sidebar), and the stage and the overlay are drawn with [`Parts`](#parts). All three come from `layout`, or from [`DEFAULT_LAYOUT`](#default_layout) if you leave it out. There's no side column when the layout has no `sidebar` or an empty one, and nothing over the page when the overlay is empty. The props, `GameShellProps`, and the layouts are described on [The React UI](/docs/react#gameshell).

It takes [`components`](#components), [`classes`](#classes) and `unstyled` like the provider, and passes them on.

```tsx
import { DEFAULT_LAYOUT, GameShell } from '@ifloom/react'

<GameShell runner={runner} panels={panels} layout={{ ...DEFAULT_LAYOUT, stage: [<WeatherBanner key="w" />, ...DEFAULT_LAYOUT.stage] }} />
```

### Layout

```ts
type Layout = { sidebar?: readonly Part[]; stage?: readonly Part[]; overlay?: readonly Part[] }
type Part = PartName | ReactNode
type PartName =
  | 'title' | 'stats' | 'entities' | 'menu' | 'devices' | 'separator' | 'location' | 'people'
  | 'actions' | 'inventory' | 'wardrobe' | 'scene' | 'inputs' | 'quests' | 'debug' | 'notices'
  | 'notice-strip' | 'statuses' | 'achievements' | 'shop' | 'jobs'
```

What [`GameShell`](#gameshell)'s `layout` takes: the parts of the side column, the stage and the overlay, in order. A `PartName` is a built-in part, and each draws nothing when the game has nothing for it. Anything else is drawn as it is. The table of which component each name draws is on [The React UI](/docs/react#layouts).

When you give a layout, a missing `stage` or `overlay` means `DEFAULT_LAYOUT`'s, but a missing `sidebar` means no side column.

### DEFAULT_LAYOUT

```ts
const DEFAULT_LAYOUT: {
  sidebar: readonly ['title', 'stats', 'statuses', 'entities', 'menu', 'achievements', 'devices', 'separator', 'location', 'people', 'actions', 'shop', 'inventory', 'wardrobe']
  stage: readonly ['scene', 'inputs', 'quests', 'jobs', 'debug']
  overlay: readonly ['notices']
}
```

The React UI's own layout, which a `GameShell` with no `layout` draws. Everything goes at the side and the scene goes on the stage. Spread it to change one list and keep the other:

```tsx
import { DEFAULT_LAYOUT, GameShell } from '@ifloom/react'

<GameShell runner={runner} layout={{ ...DEFAULT_LAYOUT, stage: [<WeatherBanner key="w" />, ...DEFAULT_LAYOUT.stage] }} />
```

### READING_LAYOUT

```ts
const READING_LAYOUT: {
  sidebar: readonly []
  stage: readonly ['title', 'scene', 'inputs', 'actions', 'stats', 'statuses', 'menu', 'achievements']
  overlay: readonly ['notices']
}
```

A page to read, for a novel. With no side column, the page is a single narrow column: the title over the scene, then the inputs, the buttons, the stats and the player's menu. The statuses and the achievements button show only in a game with those plugins. The Letter uses it: `<GameShell runner={runner} layout={READING_LAYOUT} />`.

### Parts

```tsx
function Parts(props: { parts: readonly Part[] }): JSX.Element
```

Draws `parts` in order. Each [`PartName`](#layout) becomes its built-in component, and anything else is drawn as it is. `GameShell` draws its stage and overlay with it, and [`Sidebar`](#sidebar) its column. It doesn't wrap anything around them, so you can use it inside an element of your own:

```tsx
import { Parts } from '@ifloom/react'

<section className="flex flex-col gap-3">
  <Parts parts={['stats', 'entities', <Purse key="purse" />]} />
</section>
```

### GameProvider

```tsx
function GameProvider(props: GameProviderProps): JSX.Element

type GameProviderProps = {
  runner: Runner
  panels?: Record<string, PanelComponent>
  sections?: Record<string, PluginSectionComponent>
  mods?: ModsOption
  unlocks?: UnlocksOption
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  children: ReactNode
}
```

Connects everything under it to a [runner](/docs/reference/runner). It subscribes to the runner, reads `runner.view()` again only when the state changes or what the plugins' views show of the profile does, and hands both down through [`useGame`](#usegame).

`panels` and `sections` are the same as on [`GameShell`](/docs/react#gameshell). The built-in renderers for `messages` and `feed` are added to `sections`, and yours win over them. `mods` turns on the [mod manager](#modmanager). See [`ModsOption`](#modsoption). `unlocks` turns on the [code box](#unlockspanel): the provider calls its `start` with the runner once it's drawn, and stops what it started when it goes. See [`UnlocksOption`](#unlocksoption). `components`, `classes`, `unstyled`, `viewer` and `keys` are the [`UiOptions`](#uioptions), handed to a [`UiProvider`](#uiprovider) inside it. With `keys` on, the provider also listens for the [keyboard shortcuts](#keyoptions).

Use it on its own to build [your own layout](/docs/react/extending#your-own-layout).

**Gotcha.** Define `panels`, `sections`, `mods`, `unlocks`, `components` and `classes` once, outside your component. Don't write them inline, as in `panels={{ StallPanel }}`, in a component that re-renders. A new object on each render makes every component under the provider draw again. Leaving them out is fine, because the defaults are the same objects every time.

### useGame

```ts
function useGame(): GameContextValue

type GameContextValue = {
  runner: Runner
  mods?: ModsOption
  unlocks?: UnlocksOption & { codes: UnlockCodes | null }
  view: View
  send: (command: Command) => Applied
  panels: Record<string, PanelComponent>
  sections: Record<string, PluginSectionComponent>
}
```

Returns the runner, the current [`View`](/docs/reference/view) and `send`. `send` runs a command through `runner.apply` and returns what [`apply`](/docs/reference/commands#apply) returned, so you can show a refusal. `panels` and `sections` are what the provider was given, with the built-in sections added. `mods` is the provider's `mods`, if any. `unlocks` is the provider's `unlocks`, if any, with `codes`, the [`UnlockCodes`](/docs/plugins/unlocks#unlockcodes) its `start` gave, or `null` until the provider has started them. It throws outside a `GameProvider`.

```tsx
import { useState } from 'react'
import { go } from '@ifloom/plugin-places'
import { Button, useGame } from '@ifloom/react'

function Purse() {
  const { view } = useGame()
  return <p>{view.statsById.coins.text}</p>
}

function GoHome() {
  const { send } = useGame()
  const [said, setSaid] = useState<string>()
  return (
    <>
      <Button onClick={() => setSaid(send(go('flat')).reason)}>Go home</Button>
      {said ? <p className="text-sm text-muted-foreground">{said}</p> : null}
    </>
  )
}
```

Use the runner for what the view doesn't cover, such as `runner.undo()`, `runner.save(...)` and `runner.backlog()`.

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

### UnlocksOption

```ts
type UnlocksOption = {
  start: (runner: Runner) => UnlockCodes
  problems?: string[]
  onChange?: () => void
}
```

Codes the player can enter, for a game with the [unlocks plugin](/docs/plugins/unlocks). Pass it as `unlocks` on [`GameShell`](/docs/react#gameshell), [`GameProvider`](#gameprovider) or [`mountGame`](/docs/react#mountgame). The React UI imports no plugin code, so you hand it the plugin's `startUnlocks`:

```tsx
import { startUnlocks } from '@ifloom/plugin-unlocks'

<GameShell runner={runner} pages={{}} unlocks={{ start: startUnlocks, problems: opened.problems, onChange: () => location.reload() }} />
```

| Field | What it is |
|---|---|
| `start` | [`startUnlocks`](/docs/plugins/unlocks#startunlocks). The provider calls it with its runner. |
| `problems` | What [`unlockedPacks`](/docs/plugins/unlocks#unlockedpacks) couldn't open, shown under the code box. |
| `onChange` | Builds the game again with the content a code has just opened, usually `() => location.reload()`. Without it, the box never offers to restart. |

```tsx
import { indexedDbDriver, mods } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import { smallTown } from './game.ts'

const store = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const { game, problems } = smallTown({ mods: await store.packs() })
// … make the runner …
<GameShell runner={runner} mods={{ store, problems, onChange: () => location.reload() }} />
```

### PanelComponent

```ts
type PanelComponent = ComponentType<{ data: unknown }>
```

A game's own panel: a scene's bespoke panel, or an app's panel section. `data` is what the game's [custom panel](/docs/reference/custom#panels) returned. See [Panels](/docs/react/extending#panels).

### PluginSectionComponent

```ts
type PluginSectionComponent = ComponentType<{ data: unknown; with: Record<string, unknown> }>
```

Draws a plugin's view inside an app. `data` is that plugin's slice of the view, at [`view.plugins[id]`](/docs/reference/view#plugins), and `with` is the section's `with`. See [Plugin sections](/docs/react/extending#plugin-sections).

## Customising

How a game makes the UI look its own, below the theme's variables. [Make it your own](/docs/react/customising) walks through all of it, with examples.

### UiOptions

```ts
type UiOptions = {
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
}
```

What [`mountGame`](/docs/react#mountgame), [`GameShell`](#gameshell) and [`GameProvider`](#gameprovider) take to change the UI's look and feel. `unstyled: true` drops every built-in class, and keeps the elements, their `data-part`s and what they do. `viewer: false` turns off the [`MediaViewer`](#mediaviewer), so clicking a picture in the story does nothing. It's on if you leave it out. `keys` turns on the keyboard shortcuts: see [`KeyOptions`](#keyoptions). They're off if you leave it out. `motion: false` turns off scene transitions and prose reveals, so every scene and every line shows at once. It's on if you leave it out, and a player whose system asks for reduced motion gets everything at once either way. See [`SceneStage`](#scenestage).

### KeyOptions

```ts
type KeyOptions = {
  map?: Record<string, Command>
}
```

Keyboard shortcuts for the game. Pass `keys: true` for the built-in ones, or an object to add your own:

- **1 to 9** pick the choices on screen in order: the open scene's choices, or the room's buttons ([`Actions`](#actions)) when no scene is open. Each numbered [`ChoiceButton`](#choicebutton) shows its number in a small `choice-key` part and carries `data-choice-key` and `aria-keyshortcuts`. A greyed-out choice keeps its number, and its key does nothing. [Inline actions](#inlineaction) in the prose have no number: they're reached with Tab, like a link.
- **Escape** opens the [`GameMenu`](#gamemenu)'s buttons in a dialog, if the menu is on screen. With no menu, the key is left to the page.
- **`map`** sends a [command](/docs/reference/commands) for each key you list, by its [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) name. Your keys come first, so mapping `'1'` or `'Escape'` replaces what it does.

```tsx
import { mountGame } from '@ifloom/react'

mountGame(game, {
  keys: { map: { w: { type: 'activity', id: 'wait' } } },  // 1 to 9, Escape, and W to wait
})
```

The keys never fire while the player is typing in an input, a textarea or a select, while Ctrl, Alt, Meta or Shift is held, or while a dialog is open. A number key presses the button that's drawn with that number, so it works with any layout that draws the choices with [`ChoiceButton`](#choicebutton), and does nothing on the title page.

While a [minigame](#minigamecard) runs, its own keys come first, and they work whether `keys` is on or not.

**Gotcha.** Like `panels`, define `keys` once outside your component. A new `map` object on each render re-registers the listener every time.

### Components

```ts
type Components = Partial<{
  Frame: Override<FrameProps>
  Beat: Override<{ beat: SceneBeat }>
  // … one for each name below
}>
```

Your own components in place of built-in ones, by name. Each replacement is drawn everywhere the UI draws that component, with the same props plus `Default`, the built-in one. The names are `Frame`, `Sidebar`, `Title`, `Clock`, `StatList`, `LocationCard`, `PeopleCard`, `Actions`, `SceneStage`, `Beat`, `InlineAction`, `Tip`, `ChoiceList`, `ChoiceButton`, `PriceTag`, `Notices`, `Notice`, `NoticeStrip`, `MinigameCard`, `GameMenu`, `SavesMenu`, `Backlog`, `ModManager`, `QuestLog`, `StatusList`, `AchievementList`, `AchievementsButton`, `AchievementsPage`, `ShopButtons`, `ShopDialog`, `ShopCounter`, `JobBoard`, `Inventory`, `WardrobeCard`, `EntityTable`, `InputFields`, `InputField`, `DeviceButtons`, `DeviceDialog`, `DeviceScreen`, `AppSection`, `MessagesSection`, `FeedSection`, `DebugCard`, `Picture`, `Video`, `Stage`, `Hotspot`, `MediaViewer`, `Icon`, `TitlePage`, `SettingsPage`, `LoadPage`, `CreditsPage` and `GatePage`.

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

### PART_KEYS

```ts
const PART_KEYS: readonly PartKey[]
type PartKey = 'page' | 'sidebar' | 'stage' | 'overlay' | 'title' | 'clock' | 'stats' | /* … */ 'debug-log'
```

Every `data-part` the UI draws, which is also every key [`Classes`](#classes) takes. `PartKey` is one of them. [The data-part reference](/docs/react/customising#the-data-part-reference) says what each one is.

### UiProvider

```tsx
function UiProvider(props: UiOptions & { children: ReactNode }): JSX.Element
```

Gives the components under it a game's `components`, `classes` and `unstyled`. [`GameProvider`](#gameprovider) has one inside it, so you only need your own to change one corner of the page. A nested provider adds to the outer one: its `components` and `classes` are merged over the outer ones, and `unstyled` stays on once either turns it on.

```tsx
import { QuestLog, UiProvider } from '@ifloom/react'

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

### Frame

```tsx
function Frame(props: FrameProps): JSX.Element

type FrameProps = {
  sidebar: ReactNode
  stage: ReactNode
  overlay: ReactNode
  className?: string
}
```

The page's skeleton: where the side column, the stage and the overlay go. [`GameShell`](#gameshell) draws each region from the layout and hands them to `Frame` already drawn. `sidebar` is `null` when the layout has no side column, and `overlay` is `null` when the overlay is empty. `className` is `GameShell`'s.

The built-in frame is a grid: the side column on the left of the stage on wide screens, stacked on narrow ones, with the overlay last, across the page, sticking to the bottom right of the window. Replace it in `components` for a top bar, a column on the right, a full-screen stage or any other shape of page. See [Replace the frame](/docs/react/customising#7-replace-the-frame).

Parts: `page` (with `data-has-sidebar` when there's a side column), `stage` and `overlay`.

### Icon

```tsx
function Icon(props: { name: IconName; label?: string }): JSX.Element

type IconName = 'close' | 'back' | 'warning' | 'voice' | 'zoom'
```

One of the UI's icons, by what it's for: `close` on dialogs and notices, `back` in an open app, `warning` on a choice or a hotspot with a warning, `voice` on a spoken line's replay button, and `zoom` for enlarging a picture. With a `label` it's labelled for screen readers. Without one it's hidden from them. The built-in icons are [Lucide](https://lucide.dev)'s. Replace `Icon` in `components` to use your own set everywhere.

## The stage

### SceneStage

```tsx
function SceneStage(props: { className?: string }): JSX.Element
```

The main column. It shows the scene on screen, or the room when no scene is open. The room is a plugin's [stage](/docs/reference/plugins#stage), such as the [places](/docs/plugins/places) plugin's. Without one, the room is the game's title and an empty body.

From top to bottom, it draws:

- the speaker's portrait, unless [`view.scene.speaker`](/docs/reference/view#speakerview) or its `portrait` is `null`;
- the title;
- the scene's [`Stage`](#stage) when [`view.scene.stage`](/docs/reference/view#the-scene) has layers, or else its stage picture, centred, at most `max-h-80` tall and never wider than the stage, keeping its shape;
- each [`Beat`](#beat) of the body, with the beats after each [reveal](/docs/reference/transitions#reveals) in a `reveal` part that waits for it;
- the game's panel for the scene, if the scene names one and `panels` has it, or else the scene's choices as a [`ChoiceList`](#choicelist). With reveals to come, these wait for the last one, in a `reveal` part with `data-reveal-choices`. They can't be pressed or read out until then.

While a [minigame](/docs/reference/minigames) runs, it draws that instead of all of the above: the game's panel named by the minigame's id, if `panels` has one, or else [`MinigameCard`](#minigamecard). It runs the minigame's clock either way, so your panel gets its ticks without asking. The `<article>` then also carries `data-minigame` with the minigame's id.

The `<article>` carries `data-scene` with the scene's id, or `stage` when no scene is open.

**Transitions.** The article sits in a `scene-transition` part, and is drawn afresh whenever [`view.transition.key`](/docs/reference/view#transition) changes. It carries `data-transition-in` with the new screen's `in`, which the base styles animate. The scene before goes out first: a copy of its HTML stays in its place for its `ms`, with `data-leaving` and `data-transition-out`, inert and hidden from screen readers. Then the new scene is drawn and comes in. The `scene-transition` part sets `--ifloom-transition-ms` for the CSS, and `data-motion="off"` when motion is off.

**Reveals.** Each `reveal` part carries `data-reveal` with its transition and `--ifloom-reveal-at` with its time. Its text is in the page from the start, so a screen reader reads it, and only its look waits. A click on the scene, or any key, shows the rest at once (the article gets `data-revealed`), and that key does nothing else, so a number key can't pick a choice that isn't shown yet. See [Transitions in the React UI](/docs/recipes/transitions#the-react-ui) to restyle them.

With [`motion`](#uioptions) off, or the player asking for reduced motion, none of this plays: no attribute is set and everything is shown at once.

**Gotcha.** If a scene names a `panel` that the game has no component for, it shows its choices instead, with no warning.

Replaceable as `SceneStage` in [`components`](#components). Parts: `scene-transition`, `scene` (with `data-scene`), `scene-header`, `scene-portrait`, `scene-title`, `stage-image`, `beats` and `reveal`.

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
  return <h2 data-transition-in={motion ? view.transition.in : undefined}>{view.scene.title}</h2>
}
```

### Beat

```tsx
function Beat(props: { beat: SceneBeat }): JSX.Element
```

One beat of a scene's body, drawn by kind:

| Kind | Drawn as |
|---|---|
| `text` | A paragraph. Its `spans`, when it has them, are drawn in the line: an inline action as an [`InlineAction`](#inlineaction) and a tooltip as a [`Tip`](#tip). |
| `mono` | A paragraph in a monospace font. |
| `say` | A paragraph in `--speech`. The player's own line is in `--player-speech` and indented. A line with a `voice` ends with a button that plays it again, while the [audio player](/docs/react#sound) is running. Its `spans` are drawn as a `text` beat's are. |
| `image` | A [`Picture`](#picture). It's full width, or at most `max-w-sm` for `size: 'inline'`, and tilted a little with `rotate`. Clicking it opens the [`MediaViewer`](#mediaviewer). |
| `video` | A [`Video`](#video), sized as a picture is. Clicking it opens the `MediaViewer`, unless the clip has controls, which have a full-screen button of their own. |
| `mail` | A card with its headers (each written with `ui.mailHeader`), then the body. |
| `prop` | A dashed box, with `data-face` set to its face for a stylesheet to dress. |
| `sound` | Nothing. The audio player plays it. |
| `reveal` | Nothing. [`SceneStage`](#scenestage) holds back the beats after it. |

```tsx
import { Beat } from '@ifloom/react'

<Beat beat={{ kind: 'say', who: 'character', text: '“Morning. What can I get you?”' }} />
```

The [`Backlog`](#backlog), [`MessagesSection`](#messagessection) and [`FeedSection`](#feedsection) draw their beats with `Beat` too, so a replacement `Beat` changes them all.

While the viewer is on, a picture or a clip sits inside a `viewer-open` button whose `aria-label` is `ui.zoom` ("Enlarge"), followed by the beat's alt text when it has some. A picture whose file is missing draws nothing, button included.

Replaceable as `Beat` in [`components`](#components). Parts: `beat` (with `data-beat`, and `data-who` on a spoken line), `mail-header`, `mail-body`, `voice-replay` and `viewer-open`. A video beat is a `video` part, with `data-beat="video"`.

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

```tsx
import type { Components } from '@ifloom/react'

// A tooltip that's always written out in brackets instead.
const components: Components = {
  Tip: ({ text, tip }) => (
    <span data-part="tip">
      {text} ({tip})
    </span>
  ),
}
```

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

Replaceable as `Picture` in [`components`](#components). Parts: none of its own. It carries the `data-part` of the place it's drawn, such as `scene-portrait` or `notice-image`.

### Video

```tsx
function Video(props: VideoProps): JSX.Element

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

A video clip. [`Beat`](#beat) draws `video` beats with it, [`Stage`](#stage) draws video layers with it, and [`FeedSection`](#feedsection) draws a post's `video`. The flags are the ones on a [`video` beat](/docs/reference/prose#videos) or a [`VideoView`](/docs/reference/media#videoview), so you can spread either in. It's a `<video playsinline>`, and `alt` becomes its `aria-label`.

```tsx
import { Video } from '@ifloom/react'

<Video src="art/cafe/steam.mp4" poster="art/cafe/steam.jpg" autoplay loop muted controls={false} />
```

It loads nothing until it scrolls into view. Until then it has `preload="none"`. When an `IntersectionObserver` sees it on screen, it switches to `preload="auto"` (or `"metadata"` for a clip that waits for the player) and starts playing if `autoplay` is set. It pauses when it scrolls out of view, and plays again when it comes back. Where there's no `IntersectionObserver`, it plays straight away with the `autoplay` attribute.

**Sound.** A clip with `muted: false` follows the game's [audio settings](/docs/reference/audio), as the audio player does:

- it's muted while the ui setting named by [`view.audio.muteSetting`](/docs/reference/audio#audioview) is on;
- its volume is the volume setting of the game's `video` channel, if the game declares one, or else of its `sfx` channel, scaled from the setting's `min` to its `max`;
- with neither setting, it plays at full volume.

The values are read with [`useSetting`](#usesetting), so a change on the settings page applies at once.

**Gotcha.** Browsers often refuse to start a clip with sound by itself. Give a clip with sound `controls` (the `|controls` flag), so the player presses play.

Its `src` and `poster` go through [`assetUrl`](#asseturl). Replaceable as `Video` in [`components`](#components). Parts: `video`.

### Stage

```tsx
function Stage(props: { stage: StageView; className?: string }): JSX.Element
```

A layered picture with hotspots, from a [`StageView`](/docs/reference/media#stageview). [`SceneStage`](#scenestage) draws `view.scene.stage` with it, and [`LocationCard`](#locationcard) draws a place's `location.stage`.

```tsx
import { Stage, useGame } from '@ifloom/react'

function Room() {
  const { view } = useGame()
  return view.scene.stage ? <Stage stage={view.scene.stage} className="max-w-2xl" /> : null
}
```

It draws a box with the stage's `aspect` as its `aspect-ratio`. With no `aspect`, it takes the first layer's own shape once that has loaded, and `16/9` until then. The layers are stacked inside it, bottom first, each filling the box with `object-fit: cover`. A picture layer is a [`Picture`](#picture) and a video layer is a [`Video`](#video), each with `data-layer` set to the layer's id. The [`Hotspot`](#hotspot)s go on top.

**Gotcha.** Every layer fills the whole box, so a layer above the first needs transparent areas (a PNG, a WebP or an SVG) for the ones below to show through.

Replaceable as `Stage` in [`components`](#components). Parts: `stage-picture` (the box) and `stage-layer`.

### Hotspot

```tsx
function Hotspot(props: { hotspot: HotspotView }): JSX.Element
```

One hotspot on a [`Stage`](#stage), from a [`HotspotView`](/docs/reference/media#hotspotview). It's a `<button>` placed over the picture by its `rect`, in percent, with `data-hotspot` set to its id. Clicking it sends its `command`.

- **Label.** Its `aria-label` is the hotspot's `label`, which is also its tooltip.
- **Look.** It's invisible until the player points at it, which shows a faint outline, or tabs to it, which shows the focus ring.
- **Greyed out.** A hotspot with `disabled` is dimmed and gets `aria-disabled`. It stays in the tab order so a keyboard player can find it, but clicking it sends nothing. Its reason is in `title`, after the label, and in a screen-reader-only span the button points at with `aria-describedby`.
- **Warning.** A hotspot with a `warning` shows the warning [`Icon`](#icon) in its corner, and its warning is in `title` and read out the same way.

Replaceable as `Hotspot` in [`components`](#components). Parts: `hotspot` and `hotspot-warning`.

### MediaViewer

```tsx
function MediaViewer(props: MediaViewerProps): JSX.Element

type MediaViewerProps = { media: ViewerMedia; open: boolean; onOpenChange: (open: boolean) => void }
type ViewerMedia = Extract<SceneBeat, { kind: 'image' } | { kind: 'video' }>
```

A picture or a clip from the story, shown large over the page. [`Beat`](#beat) opens it when the player clicks an `image` or a `video` beat, in a scene, the [backlog](#backlog), a message or a post. Stage layers don't open it. It's a [`Dialog`](#dialog), so Escape, a click outside and its close button (`ui.closeViewer`) all close it, and focus goes back to the picture.

Turn it off for the whole game with `viewer: false` in [`UiOptions`](#uioptions):

```ts
mountGame(loadGame(packs, base), { viewer: false })
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

[`Picture`](#picture) and [`Video`](#video) call it, and so does [`DeviceScreen`](#devicescreen) for a device's wallpaper, so everything the React UI draws is covered.

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

- the label;
- a warning icon when the choice carries a `warning`, labelled with the warning for screen readers. A warning means the button can be pressed but the game would refuse it, as with the calendar's `That would run past dawn.`;
- its price, as a [`PriceTag`](#pricetag);
- its `irreversible` line, the warning that this can't be undone, in the destructive colour (`--destructive`);
- the reason it's greyed out, when it is. The button is then disabled;
- the warning text, when it isn't greyed out and carries a `warning`, so the player reads it before pressing.

The button carries `data-choice` with the choice's id. With [`keys`](#keyoptions) on, a choice that a number key picks shows the number first, in a `<kbd>` hidden from screen readers, and the button carries `data-choice-key` and `aria-keyshortcuts` with it. A choice's `tags` aren't drawn. To style by them, write a component of your own.

Replaceable as `ChoiceButton` in [`components`](#components). Parts: `choice` (with `data-choice`, and `data-choice-key` when keys are on), `choice-key`, `choice-label`, `choice-price`, `choice-warning`, `choice-irreversible` and `choice-reason`.

### ChoiceList

```tsx
function ChoiceList(props: { choices: RenderedChoice[]; className?: string; part?: 'choices' | 'actions' }): JSX.Element | null
```

A column of [`ChoiceButton`](#choicebutton)s. It draws nothing for an empty list. `part` names the list for styling: `'choices'` (the default), or `'actions'` for the room's buttons, as [`Actions`](#actions) passes.

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

A [`Price`](/docs/reference/view#price) as the engine wrote it, in `--price`. It shows each stat's `text`, then each of the plugins' `notes` (such as the calendar's `until afternoon`), joined with `ui.priceSeparator` (` · `). It draws nothing for a price with neither.

Replaceable as `PriceTag` in [`components`](#components). Parts: `choice-price`.

## The sidebar

### Sidebar

```tsx
function Sidebar(props: SidebarProps): JSX.Element

type SidebarProps = { className?: string; parts?: readonly Part[] }
```

The side column: an `<aside>` carrying `data-part="sidebar"` and `data-sidebar`, with its `parts` drawn by [`Parts`](#parts). [`GameShell`](#gameshell) draws its side column with it, passing the layout's `sidebar` list. Use it on its own in a page of your own.

If you leave out `parts`, you get [`DEFAULT_LAYOUT`](#default_layout)`.sidebar`: [`Title`](#title), [`StatList`](#statlist), [`EntityTable`](#entitytable), [`GameMenu`](#gamemenu), [`DeviceButtons`](#devicebuttons), a [`Separator`](#separator), [`LocationCard`](#locationcard), [`PeopleCard`](#peoplecard), [`Actions`](#actions), [`Inventory`](#inventory) and [`WardrobeCard`](#wardrobecard).

```tsx
import { Sidebar } from '@ifloom/react'

<Sidebar className="order-last" parts={['title', 'stats', 'menu']} />
```

Replaceable as `Sidebar` in [`components`](#components). Parts: `sidebar`.

### Title

```tsx
function Title(): JSX.Element
```

The game's title, `view.title`, as a heading, with the [`Clock`](#clock) under it. This is the `'title'` part.

Replaceable as `Title` in [`components`](#components). Parts: `title`.

### Actions

```tsx
function Actions(): JSX.Element
```

The buttons offered while no scene is open, `view.actions`, as a [`ChoiceList`](#choicelist). They include the room's buttons, the game's own and its plugins'. This is the `'actions'` part.

Replaceable as `Actions` in [`components`](#components). Parts: `actions`.

### Clock

```tsx
function Clock(): JSX.Element | null
```

Where the game is in time: [`view.when`](/docs/reference/view#the-clock-and-the-player), as its plugins wrote it, such as the [calendar](/docs/plugins/calendar#the-label)'s `Day 3 · Wednesday afternoon`. It draws nothing when no plugin says what time it is, as in a game without a calendar. To reword it, change the calendar's `calendar/label` string.

Replaceable as `Clock` in [`components`](#components). Parts: `clock`.

### useClock

```ts
function useClock(): ClockState

type ClockState = { when: string | null; calendar: CalendarView | null }
```

Where the game is in time, with no markup. `when` is [`view.when`](/docs/reference/view#the-clock-and-the-player), or `null` when no plugin says. `calendar` is the [calendar](/docs/plugins/calendar)'s own view, piece by piece ([`CalendarView`](/docs/plugins/calendar#the-view): the day, the weekday, the period and its label, and whether the curfew binds), or `null` in a game without it. [`Clock`](#clock) draws `when`.

```tsx
import { useClock } from '@ifloom/react'

function DayBadge() {
  const { calendar } = useClock()
  return calendar ? <span className="rounded border px-2 text-xs">{calendar.weekday}</span> : null
}
```

### StatList

```tsx
function StatList(): JSX.Element | null
```

The stats the view lists, each label beside its value written the way the game [formats](/docs/reference/stats) it (`12 coins`). A stat the game doesn't list, or whose `visible` doesn't hold, isn't in the view, so it isn't here either. It draws nothing when there are no stats. Each row carries `data-stat`.

A stat that declares [`levels`](/docs/reference/stats#levels) also shows its level inside its label, as "Level 2" (the word `ui.statLevel`). Under the row is a bar towards the next level, drawn from [`StatView.level`](/docs/reference/view#statview). The bar is a `progressbar` from 0 to 100, and its label for screen readers is the word `ui.statProgress`, such as "Cooking: 50% of the way to level 2". At the top level there's no bar, only the level. A stat without levels shows as before.

A stat whose [`display`](/docs/reference/stats#statdef) is `'bar'` gets a bar under its row, filled from its `min` to its `max`. One with `'pips'` gets a row of pips instead, one for each point between `min` and `max`, with as many filled as the value is above `min`. A stat with a range of more than 20 is drawn as a bar even if it asks for pips. Both are a `meter` for screen readers, labelled with the stat's label, with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and the formatted value as `aria-valuetext`. Each filled pip carries `data-filled`. The value is still written beside the label.

```ts
stats: [
  { id: 'energy', label: 'Energy', start: 80, max: 100, display: 'bar' },
  { id: 'hearts', label: 'Hearts', start: 3, max: 5, display: 'pips' },
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

The things the game keeps several of, from [`view.entities`](/docs/reference/view#entities). It draws a table for each [kind](/docs/reference/entities) that has any entities, headed with the kind's `plural`. Each row is one entity: its name, then its stats written the way the game [formats](/docs/reference/stats) them.

The columns are every stat any row shows, in the order they first appear. A row that doesn't show a stat (because its `visible` doesn't hold for that entity) has a blank cell. Each section carries `data-kind` with the kind's id, and each row carries `data-entity` with its reference, such as `staff:ana`.

`kinds` limits it to those kinds. Without it, every kind is drawn. It draws nothing when none of the kinds has any entities, so a game with no kinds gets no empty box. The `'entities'` [part](#layout) draws it with every kind.

```tsx
import { EntityTable } from '@ifloom/react'

// The café's menu on its own, beside the stage:
<EntityTable kinds={['dish']} className="border-t pt-4" />
```

Replaceable as `EntityTable` in [`components`](#components). Parts: `entities`, `entity-heading`, `entity-table`, `entity-columns`, `entity-column`, `entity-row` (with `data-entity`), `entity-name` and `entity-value`.

### LocationCard

```tsx
function LocationCard(): JSX.Element | null
```

Where the player is, with its name and tag, and an outline button for each exit. It reads the [places](/docs/plugins/places) plugin's view at [`view.plugins.places`](/docs/plugins/places#the-view), typed with the plugin's `PlacesView` but without importing the plugin's code. Each button shows the exit's `label`, sends its own [`command`](/docs/plugins/places#exitview) and carries `data-exit`. An exit the player can't take is greyed out.

A place with a [stage](/docs/plugins/places#the-picture-stage) shows it above the name as a [`Stage`](#stage), with its hotspots. The places plugin leaves the hotspots out while a scene is open, so the room can't be used from behind a scene.

It draws nothing in a game without the places plugin, or while the plugin's `location` is `null` (the player is nowhere). So a novel's sidebar has no empty box.

**Gotcha.** An exit's reason, or its warning, is in the button's `title` and shows on hover. It isn't printed on the button as a choice's is. An exit that a lock hides isn't in the view at all.

Replaceable as `LocationCard` in [`components`](#components). Parts: `location`, `location-name`, `location-text`, `exits` and `exit` (with `data-exit`).

### usePlaces

```ts
function usePlaces(): PlacesControls | null

type PlacesControls = PlacesView & { go: (exit: string) => Result<GameState> }
```

The [places](/docs/plugins/places) plugin's view ([`PlacesView`](/docs/plugins/places#the-view): `location` and `exits`) with a way to travel, or `null` in a game without the plugin. `go(id)` sends the exit's own command, by the id of the place it leads to, and returns what [`runner.apply`](/docs/reference/runner#the-runners-members) did, so a refusal comes back with its reason. [`LocationCard`](#locationcard) is drawn from it.

```tsx
import { usePlaces } from '@ifloom/react'

function ExitList() {
  const places = usePlaces()
  if (!places) return null
  return (
    <ul>
      {places.exits.map((exit) => (
        <li key={exit.id}>
          <button disabled={Boolean(exit.disabled)} onClick={() => places.go(exit.id)}>{exit.label}</button>
        </li>
      ))}
    </ul>
  )
}
```

### PeopleCard

```tsx
function PeopleCard(): JSX.Element | null
```

Who is here, read from the [cast plugin](/docs/plugins/cast)'s view at `view.plugins.cast.present`. For each person it shows their portrait and role (when they have them) and their name, with a [`ChoiceButton`](#choicebutton) for each thing the player can do with them, such as **Talk**. Each person carries `data-person`. It draws nothing when nobody is here, and nothing in a game without the cast, since the engine has no people of its own.

Replaceable as `PeopleCard` in [`components`](#components). Parts: `people`, `person` (with `data-person`), `person-portrait`, `person-name`, `person-role` and `person-actions`.

### usePeople

```ts
function usePeople(): CastView | null
```

The [cast](/docs/plugins/cast) plugin's view: `present`, who is here with their buttons as [`RenderedChoice`](/docs/reference/view#renderedchoice)s, and `people`, everyone the player has met. `null` in a game without the plugin. Send a button's `command` with [`useGame`](#usegame)'s `send`, or draw it with [`ChoiceButton`](#choicebutton). [`PeopleCard`](#peoplecard) is drawn from it.

### Inventory

```tsx
function Inventory(props: { className?: string }): JSX.Element | null
```

What the player carries, from [`view.pack`](/docs/reference/view#the-players-numbers-and-things). Each item shows its name, `×n` (`ui.itemCount`) when there's more than one, and its description. An item with a [`use`](/docs/reference/game#itemdef) gets a [`ChoiceButton`](#choicebutton) labelled with its `useLabel` that sends [`use`](/docs/reference/commands#use). When [`whyNot`](/docs/reference/actions#whynot) says it can't be used now, the button is greyed out with that reason on it.

The heading is `ui.inventory`, and each item carries `data-item`. It draws nothing when the player carries nothing.

```tsx
import { Inventory } from '@ifloom/react'

// In the showcase, a sandwich from the café: "Eat the sandwich" puts 25 energy back.
<Inventory className="border-t pt-4" />
```

Replaceable as `Inventory` in [`components`](#components). Parts: `inventory`, `inventory-title`, `item` (with `data-item`), `item-name`, `item-count` and `item-text`.

### WardrobeCard

```tsx
function WardrobeCard(props: { className?: string }): JSX.Element | null
```

The [wardrobe plugin](/docs/plugins/wardrobe)'s view. Each slot (`data-slot-id`) shows its label and what's in it, or `ui.nothingOn`. When something is in a slot, it has a **Take off** button (`ui.takeOff`). Each spare piece of clothing for that slot gets a **Wear …** button (`ui.wearItem`, with the item's name as `item`). The buttons send `wardrobe/takeOff` and `wardrobe/wear`.

A button that can't be used now is greyed out, with [`whyNot`](/docs/reference/actions#whynot)'s reason in its `title`. The heading is `ui.wardrobe`. It draws nothing in a game without the plugin.

**Gotcha.** As with an exit, the reason is in the `title` and shows on hover. It isn't printed on the button.

Replaceable as `WardrobeCard` in [`components`](#components). Parts: `wardrobe`, `wardrobe-title`, `wardrobe-slot` (with `data-slot-id`), `wardrobe-slot-name`, `wardrobe-worn` and `button`.

### useWardrobe

```ts
function useWardrobe(): WardrobeControls | null

type WardrobeControls = Omit<WardrobeView, 'slots'> & {
  slots: WardrobeSlotControls[]
  wear: (id: string) => Result<GameState>
  takeOff: (slot: string) => Result<GameState>
}
type WardrobeSlotControls = WardrobeView['slots'][number] & {
  takeOff: RenderedChoice | null
  wear: RenderedChoice[]
}
```

The [wardrobe](/docs/plugins/wardrobe) plugin's view, with a button for each thing the player can do, or `null` in a game without the plugin. Each slot has `takeOff`, a [`RenderedChoice`](/docs/reference/view#renderedchoice) that takes off what's in it (`null` when it's empty), and `wear`, one for each spare piece of clothing for that slot, labelled with its name. Each is greyed out with the engine's reason when it can't be done now. `wear(id)` and `takeOff(slot)` send the commands directly. [`WardrobeCard`](#wardrobecard) is drawn from it.

## Inputs

### InputField

```tsx
function InputField(props: { input: InputView }): JSX.Element
```

One of the game's [inputs](/docs/reference/inputs), an [`InputView`](/docs/reference/view#inputview) from `view.inputs`. It shows the input's label, then:

- for `kind: 'text'` or `'number'`, a box and an **Enter** button (`ui.enter`) that sends [`input`](/docs/reference/commands#input) with what was typed. The box honours `maxLength`, `min` and `max`;
- for `kind: 'choice'`, a button for each option, with the one already picked filled in. Each sends its value.

If the engine refuses the value, its reason shows under the field (`Keep it to 8 characters.`, say) until a value is accepted. The box follows the input's value when something else changes it, such as an undo or a load, so it always shows what the game holds. It carries `data-input` with the input's id.

**Gotcha.** An empty number box sends no value at all, not `0`, so the engine refuses it with `enterSomething` (`Enter something first.`).

Replaceable as `InputField` in [`components`](#components). Parts: `input` (with `data-input`), `input-label`, `input-field`, `input-options`, `input-submit`, `input-error` and `button` for each option.

### InputFields

```tsx
function InputFields(props: { className?: string }): JSX.Element | null
```

An [`InputField`](#inputfield) for every input in `view.inputs`, which holds the inputs whose `when` holds now. It draws nothing when there are none. [`GameShell`](#gameshell) puts it under the scene.

```ts
// The showcase asks for the cat's name on moving day, and only then.
inputs: [{ id: 'catName', label: 'Name your cat', kind: 'text', maxLength: 16, when: { phase: ['arrival'] } }]
```

**Gotcha.** A [lock](/docs/reference/locks) that denies `'*'` denies `input` too. If a scene asks for a value while the rest of the game is locked, put `input` in the lock's `except`.

Replaceable as `InputFields` in [`components`](#components). Parts: `inputs`.

## The player's menu

### GameMenu

```tsx
function GameMenu(props: { className?: string }): JSX.Element | null
```

A row of buttons for what the runner offers:

- **Saves** (`ui.saves`) when the runner was made with `saves`;
- **Backlog** (`ui.backlog`) when [`runner.offers`](/docs/reference/runner#the-runners-members)`.backlog` is on;
- **Mods** (`ui.mods`) when the provider was given [`mods`](#modsoption);
- **Enter a code** (`ui.enterCode`) when the provider was given [`unlocks`](#unlocksoption), the game has the unlocks plugin and `pages` is off. With pages on, codes are entered on the settings page instead.
- **Undo** and **Redo** when `runner.offers.undo` is on. They're greyed out while there's nothing to undo or redo.
- **Settings** (`ui.settings`) and **Title screen** (`ui.titlePage`) when the game was drawn with [`pages`](#pages) on. Settings shows only if the game declares a [setting](/docs/reference/settings), or takes codes.

With [`keys`](#keyoptions) on, Escape opens the same buttons in a dialog headed **Menu** (`ui.menu`).

Settings and Title screen switch to those [pages](#pages). Settings opened from the game changes the game in play, and its Back button returns to it. Saves, Backlog and Mods each open a [`Dialog`](#dialog), with a close button labelled `ui.close` for screen readers, holding a [`SavesMenu`](#savesmenu), a [`Backlog`](#backlog) or a [`ModManager`](#modmanager). Enter a code opens an [`UnlocksPanel`](#unlockspanel) the same way. Loading a save closes the dialog. The row carries `data-menu`. It draws nothing when there are no buttons to show.

So you choose what the player sees when you make the runner:

```ts
import { createRunner, localStorageDriver, saves, startingState } from '@ifloom/engine'

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

If a save can't be read, the menu shows why. A save made with packs or plugins this game doesn't have still loads, with a line naming them (`ui.missingPacks`, `ui.missingPlugins`). `onLoaded` is called after a load or an import. The menu carries `data-saves`. It draws nothing when the runner has no `saves`.

```tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, SavesMenu } from '@ifloom/react'

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

Replaceable as `SavesMenu` in [`components`](#components). Parts: `saves`, `saves-actions`, `save-slot` (with `data-save-slot`), `save-name`, `save-details`, `saves-message`, `saves-empty`, `file-button` and `button`.

### useSaves

```ts
function useSaves(): SavesState

type SavesState = {
  available: boolean
  slots: SaveMeta[]
  broken: BrokenSave[]
  refresh: () => Promise<void>
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
| `slots` | Every save that can be read, newest first, as [`SaveMeta`](/docs/reference/saves#savemeta). Read again whenever the view changes. |
| `broken` | Saves that are there but can't be read, as [`BrokenSave`](/docs/reference/saves#savelisting)s with why. They can only be deleted, with `remove`. |
| `refresh` | Reads the slots again. |
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
  if (!saves.available) return null
  return <button onClick={() => void saves.save('Before the park')}>Quick save</button>
}
```

### Backlog

```tsx
function Backlog(props: { className?: string }): JSX.Element
```

[`runner.backlog()`](/docs/reference/runner#backlogentry), oldest first, in a [`ScrollArea`](#scrollarea). Each entry shows its title and its beats, drawn as [`Beat`](#beat)s. When the player made a choice in it, a line **You chose: …** (`ui.chose`) follows. Each entry carries `data-backlog` with its scene id. With nothing in it, it shows `ui.backlogEmpty`. It follows the view, so it stays current while open.

**Gotcha.** The runner has to be made with `backlog`. Without it, the list is always empty.

Replaceable as `Backlog` in [`components`](#components). Parts: `backlog`, `backlog-entry` (with `data-backlog`), `backlog-title`, `backlog-choice` and `backlog-empty`, with each beat a `beat`.

### useBacklog

```ts
function useBacklog(): BacklogEntry[]
```

The backlog's [entries](/docs/reference/runner#backlogentry), oldest first, read again whenever the view changes. It's the [`Backlog`](#backlog) without its look. It's empty unless the runner was made with `backlog`.

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

- **Add a mod file** (`ui.addMod`) reads a `.json` file through the store's [`add`](/docs/reference/mods#mods). If the file can't be used, it shows why in the words of [`readMod`](/docs/reference/mods#readmod), such as `That mod is for another game (corner-cafe).` A mod with the same id as one already there replaces it.
- Every mod added is listed in name order (`data-mod` with its id), with its name, version and description. Each has a button to turn it **On** or **Off** (`ui.modOn`, `ui.modOff`), which reads what the mod is now, and a button to **Delete** it (`ui.remove`). Under it are the `problems` that start `mod:<id> `. With no mods, it shows `ui.noMods`.
- Once anything has changed, **Restart with these mods** (`ui.applyMods`) appears and calls `onChange`.

The screen carries `data-mods`. It draws nothing when the provider has no `mods`.

```tsx
import { GameProvider, ModManager } from '@ifloom/react'

<GameProvider runner={runner} mods={{ store, problems, onChange: () => location.reload() }}>
  <ModManager />
</GameProvider>
```

**Gotchas.**

- **Nothing changes until the restart.** A mod is part of the game, so turning one on or off changes the store, not the game that's running. The player keeps playing the game as it was loaded until `onChange` builds it again.
- **The problems are the ones from start-up.** A mod added since then shows no problems until the game is built again with it.

Replaceable as `ModManager` in [`components`](#components). Parts: `mods`, `mod` (with `data-mod`), `mod-name`, `mod-version`, `mod-state`, `mod-text`, `mod-problem`, `mods-message`, `mods-empty`, `file-button` and `button`.

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

- `gate`, a notice the player confirms once, if you give one;
- `title`, the title screen;
- `game`, the shell with the story;
- `load`, `settings` and `credits`;
- `achievements`, the [`AchievementsPage`](#achievementspage), in a game with the [achievements plugin](/docs/plugins/achievements);
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
  achievements?: boolean
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
| `pages` | Pages of your own, by id. Each gets a button on the title screen labelled `label`, unless `showOnTitle` is `false`. Its `component` is drawn with no props as the whole page, and leaves with `usePage().back()`. A page with the id `achievements` takes the place of the built-in one. |
| `achievements` | The achievements page and its title-screen button, in a game with the [achievements plugin](/docs/plugins/achievements). On unless it's `false`. With it off, the [`AchievementsButton`](#achievementsbutton) opens the list in a dialog instead. |

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

type Page = 'gate' | 'title' | 'game' | 'load' | 'settings' | 'credits' | 'achievements' | (string & {})

type PageState = {
  enabled: boolean
  page: Page
  from: Page | null
  go: (page: Page) => void
  back: () => void
  options: PagesOptions
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
- **Settings** (`ui.settings`, `settings`) when the game declares any setting.
- **Achievements** (`ui.achievements`, `achievements`) in a game with the [achievements plugin](/docs/plugins/achievements), unless `achievements` is `false` or you added your own page with that id.
- A button for each of your own pages, by its id.
- **Credits** (`ui.credits`, `credits`) when `credits` are given.

The first button is drawn as the main one: Continue when there's a save, otherwise New game. The section carries `data-page="title"`.

Replaceable as `TitlePage` in [`components`](#components). Parts: `title-page`, `title-art`, `title-name`, `title-subtitle`, `title-buttons` and `title-button`.

### SettingsPage

```tsx
function SettingsPage(props: { className?: string }): JSX.Element
```

The settings, drawn from [`view.settings`](/docs/reference/view#settings): a checkbox for a toggle, radio buttons for a choice, and a slider with its value beside it for a range. It says `ui.noSettings` when the game declares none, and has a Back button (`ui.back`).

Each value comes from [`runner.settings()`](/docs/reference/runner#settings), and each change goes through [`runner.setSetting`](/docs/reference/runner#setsetting):

- **A ui setting** is written to the profile.
- **A play setting** is sent as a [`setting`](/docs/reference/commands#setting) command, so it changes the game in play, and the runner writes it to the profile, so the next new game starts with it. Without a profile, New game keeps the settings in play.

A refused change shows its reason under the list.

With [`unlocks`](#unlocksoption) on the provider, an [`UnlocksPanel`](#unlockspanel) follows the list, for entering a code, and the page says nothing about having no settings.

Replaceable as `SettingsPage` in [`components`](#components). Parts: `settings-page`, `page-heading`, `settings`, `setting` (with `data-setting` and `data-affects`), `setting-label`, `setting-control`, `setting-value`, `settings-empty`, `settings-message` and `page-back`.

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

A setting's current value, for your own components, as [`runner.settings()`](/docs/reference/runner#settings) gives it. A play setting's is the game in play's. A ui setting's comes from the profile, and the component redraws when it changes. If the stored value doesn't suit the setting any more, you get its default. It's `undefined` for a setting the game doesn't declare. Change one with [`runner.setSetting`](/docs/reference/runner#setsetting).

```tsx
import { useSetting } from '@ifloom/react'

function Story({ children }: { children: React.ReactNode }) {
  const size = useSetting('textSize')
  return <div className={size === 'large' ? 'text-lg' : undefined}>{children}</div>
}
```

### useProfile

```ts
function useProfile<T = unknown>(namespace: string): T | undefined
```

What the [profile](/docs/reference/profile) holds in a namespace, kept up to date as it's written. It's `undefined` before the first read and when the runner has no profile. The title screen uses `useProfile('core:finished')` to decide whether to offer New Game+.

```tsx
const settings = useProfile<Record<string, unknown>>('core:settings')
```

## Around the stage

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
- Each app with a badge on any of the game's [devices](/docs/plugins/devices), such as the phone's Messages, with its count (or an empty badge for a badge that's only on or off). It opens the device in a [`DeviceDialog`](#devicedialog) and sends the app's command, so the device opens on that app. A greyed-out app isn't listed.

It's a `<nav>` labelled `ui.unread`, and it draws nothing when nothing is unread. It's the `'notice-strip'` part, which no built-in layout includes, so add it where you want it:

```tsx
import { DEFAULT_LAYOUT, GameShell } from '@ifloom/react'

<GameShell runner={runner} layout={{ ...DEFAULT_LAYOUT, stage: ['notice-strip', ...DEFAULT_LAYOUT.stage] }} />
```

Each button carries `data-strip`: `notices`, or the device and app ids as `phone/texts`. It's kept basic on purpose. [Building your own HUD](/docs/recipes/hud) shows how to write your own from the view.

Replaceable as `NoticeStrip` in [`components`](#components). Parts: `notice-strip`, `notice-strip-item` (with `data-strip`) and `badge`, plus the dialog's parts.

## Minigames

### MinigameCard

```tsx
function MinigameCard(props: { className?: string }): JSX.Element | null
```

The [minigame](/docs/reference/minigames) being played, from [`view.minigame`](/docs/reference/minigames#minigameview). [`SceneStage`](#scenestage) draws it in place of the scene while one runs. From top to bottom, it shows:

- the minigame's `title`, as a heading;
- the running state's words (`label`), in a polite live region so a screen reader reads each new one;
- a bar counting down the state's timer, when it has one. It's a `progressbar` labelled `ui.timeLeft`, from 0 to `timeTotal`, and its inner `<span>` shrinks with `transform: scaleX()`, easing between ticks;
- a button for each live input, which sends [`{ type: 'minigame', input }`](/docs/reference/commands#minigame). The inputs `up`, `down`, `left`, `right` and `space` are labelled with `ui.minigameUp` and the rest. Any other input is labelled with the game's `ui.minigame.<input>` string, or its own name with a capital.

It runs the clock through [`useMinigame`](#useminigame), and maps the keyboard to the inputs. Each input takes the keys the minigame lists in its [`keys`](/docs/reference/minigames#minigamedef). An input it doesn't list takes the arrow keys for `up`, `down`, `left` and `right`, the space bar for `space`, and its own letter for a one-letter input. A key held down doesn't repeat. These keys work whether the game's [`keys`](#keyoptions) are on or not, and they come before them. The keys follow the same rules as the hotkeys: nothing while typing, with a modifier held or with a dialog open.

The `<section>` carries `data-minigame` with the minigame's id and `data-state` with its state, and each button `data-input`.

There are two ways to draw a minigame your own way:

- **One minigame.** Put a component in `panels` under the minigame's id. [`SceneStage`](#scenestage) draws it instead, given the [`MinigameView`](/docs/reference/minigames#minigameview) as `data`, and runs the clock for it. Call `useMinigame()` in it for `send`.
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

While any component that calls it is on screen, it runs the minigame's clock. Every 100 ms or so, while the running state has a timer (`timeLeft` isn't `null`), it sends [`{ type: 'tick', ms }`](/docs/reference/commands#tick) with the real time since the last tick, measured with `performance.now()`. So a browser that holds the timer back sends one bigger tick when it catches up, and the minigame's time stays true. The clock stops when the minigame ends or its state has no timer, and starts again when one does. When an input moves the minigame to a new state, the clock starts afresh from that moment.

There's one clock per runner however many components call it, so a panel and a HUD that both use it don't tick twice.

**Time while the page is hidden is dropped.** When the player switches tab or minimises the window, the clock sends the time up to that moment and pauses, and when the page shows again it carries on from there. A minigame waits for a player who looked away, instead of running out its timers unseen.

```tsx
import { useMinigame } from '@ifloom/react'

function ArrowPad() {
  const { minigame, send } = useMinigame({ keys: true })
  if (!minigame) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {minigame.inputs.map((input) => (
        <button key={input} onClick={() => send(input)}>{input}</button>
      ))}
    </div>
  )
}
```

**Gotcha.** Nothing ticks unless something calls it. [`SceneStage`](#scenestage) does while a minigame runs, so a game with its own root that leaves out `SceneStage` has to call `useMinigame()` somewhere, or the minigame's timers wait for ever.

### QuestLog

```tsx
function QuestLog(props: { className?: string; title?: string }): JSX.Element | null
```

The [quests plugin](/docs/plugins/quests)'s view. Each active quest (`data-quest`) shows its summary, the hint for what to do next, and how far it has got (`ui.questStage`). It has a **New** badge when it has changed, and a button to track or untrack it, which sends `quests/track`. The finished quests follow, struck through. While anything is new, the heading shows a count and a **Mark all seen** button (`ui.allSeen`) sends `quests/seen`.

`title` replaces the heading, `ui.quests`, for this one list. It draws nothing in a game without the plugin.

Replaceable as `QuestLog` in [`components`](#components). Parts: `quests`, `quests-title`, `quest` (with `data-quest`), `quest-title`, `quest-summary`, `quest-hint`, `quest-stage`, `quests-done`, `quest-done`, `badge` and `button`.

### useQuests

```ts
function useQuests(): QuestsControls | null

type QuestsControls = QuestsView & {
  track: (id: string | null) => Result<GameState>
  seen: () => Result<GameState>
}
```

The [quests](/docs/plugins/quests) plugin's view ([`QuestsView`](/docs/plugins/quests#the-view): `active`, `done`, `toFind` and `updates`) with its two commands, or `null` in a game without the plugin. `track(id)` sends `quests/track`, and `track(null)` tracks none. `seen()` sends `quests/seen`. [`QuestLog`](#questlog) is drawn from it.

```tsx
import { useQuests } from '@ifloom/react'

function Objective() {
  const quests = useQuests()
  const tracked = quests?.active.find((quest) => quest.tracked)
  return tracked ? <p className="text-sm">{tracked.title}: {tracked.hint}</p> : null
}
```

### DebugCard

```tsx
function DebugCard(props: { className?: string }): JSX.Element | null
```

A panel for the person testing the game, when the game has the [debug plugin](/docs/plugins/debug). It draws nothing in a game without the plugin, so a release build that [leaves the plugin out](/docs/plugins/debug#leave-it-out-of-release-builds) shows no panel.

| Tab | What it has |
|---|---|
| **Set** | A form each for a stat, a kv key, an item, an entity's stat, a location, a scene, the time and the turn, each sending a debug command. The entity's stat form (**Stat of**) takes the stat, the entity as content names it (such as `character:ava`) and the value. The location form appears only when the game has the [places](/docs/plugins/places) plugin, and the time form only when it has the [calendar](/docs/plugins/calendar). There's also a button to close the scene (`ui.closeScene`). A refusal shows beside its form. Typing `true`, `false` or a number into the variable form sends that value as itself. |
| **Why not** | The locks that are on, with what each denies, and every greyed-out action, choice and person's button on screen with its reason. |
| **State** | The whole game state, as JSON. |
| **Log** | The [command log](/docs/reference/runner#commandlog), one command a line. |

The heading shows the seed, with **Undo** and **Redo** buttons for the runner's history. They're greyed out while there's nothing to undo or redo, and the runner only keeps history when it's made with `history`.

The heading, buttons, tabs, form rows (**Stat**, **kv key**, **Item**, **Stat of**, **Go**, **Scene**, **Time**, **Turn**) and **Why not** headings go through [`useWords`](#usewords), under the `ui.` keys listed on [The React UI](/docs/react#words).

**Gotchas.**

- **The placeholders are in English.** Each form's placeholders (`stat`, `value`, `key` and the rest) aren't in the strings table.
- **A number box needs a number.** An empty box, or words that aren't a number, are refused with `debug/notANumber` rather than set to 0.

Replaceable as `DebugCard` in [`components`](#components). Parts: `debug`, `debug-header`, `debug-title`, `debug-seed`, `debug-section`, `debug-form`, `debug-label`, `debug-field`, `debug-error`, `debug-heading`, `debug-list`, `debug-state`, `debug-log` and `button`.

### useDebug

```ts
function useDebug(): DebugControls | null

type DebugControls = DebugView & {
  greyed: RenderedChoice[]
  state: GameState
  log: Command[]
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  run: (name: string, args?: Record<string, unknown>) => Result<GameState>
}
```

The [debug](/docs/plugins/debug) plugin's view (the locks on, the triggers fired and the seed) with what the debug card shows, or `null` in a game built without the plugin. `greyed` is every greyed-out action, choice and person's button on screen. `run(name, args)` sends `debug/<name>`, so `run('stat', { stat: 'coins', to: 50 })` sets a stat. [`DebugCard`](#debugcard) is drawn from it.

## Plugins' defaults

Every first-party plugin that has something for the player has a default here, which `GameShell` draws when the game has the plugin, and a hook that gives the same data and actions with no markup. The default is a thin layer on its hook. So you can keep the default, restyle it with its parts, replace it by name in [`components`](#components), take its part out of the [layout](#layout), or draw your own from the hook.

| Plugin | Default | Hook | Where `DEFAULT_LAYOUT` puts it |
|---|---|---|---|
| [calendar](/docs/plugins/calendar) | [`Clock`](#clock) | [`useClock`](#useclock) | Under the title. |
| [places](/docs/plugins/places) | [`LocationCard`](#locationcard) | [`usePlaces`](#useplaces) | Sidebar, `'location'`. |
| [cast](/docs/plugins/cast) | [`PeopleCard`](#peoplecard) | [`usePeople`](#usepeople) | Sidebar, `'people'`. |
| [wardrobe](/docs/plugins/wardrobe) | [`WardrobeCard`](#wardrobecard) | [`useWardrobe`](#usewardrobe) | Sidebar, `'wardrobe'`. |
| [statuses](/docs/plugins/statuses) | [`StatusList`](#statuslist) | [`useStatuses`](#usestatuses) | Sidebar, `'statuses'`, under the stats. |
| [achievements](/docs/plugins/achievements) | [`AchievementList`](#achievementlist), in a page or a dialog | [`useAchievements`](#useachievements) | Sidebar, `'achievements'`: a button under the menu. |
| [cheats](/docs/plugins/cheats) | [`CheatPanel`](#cheatpanel), in a dialog | [`useCheats`](#usecheats) | Sidebar, `'cheats'`: a button under the achievements. |
| [unlocks](/docs/plugins/unlocks) | [`UnlocksPanel`](#unlockspanel) | [`useUnlocks`](#useunlocks) | The settings page, or the menu without pages, when the provider has [`unlocks`](#unlocksoption). |
| [shop](/docs/plugins/shop) | [`ShopCounter`](#shopcounter), in a dialog | [`useShop`](#useshop) | Sidebar, `'shop'`: a button for each vendor here. |
| [jobs](/docs/plugins/jobs) | [`JobBoard`](#jobboard) | [`useJobs`](#usejobs) | Stage, `'jobs'`, under the quests. |
| [quests](/docs/plugins/quests) | [`QuestLog`](#questlog) | [`useQuests`](#usequests) | Stage, `'quests'`. |
| [devices](/docs/plugins/devices) | [`DeviceButtons`](#devicebuttons) | [`useDevices`](#usedevices) | Sidebar, `'devices'`. |
| [messages](/docs/plugins/messages) | [`MessagesSection`](#messagessection) | [`useMessages`](#usemessages) | In an app. |
| [feed](/docs/plugins/feed) | [`FeedSection`](#feedsection) | [`useFeed`](#usefeed) | In an app. |
| [debug](/docs/plugins/debug) | [`DebugCard`](#debugcard) | [`useDebug`](#usedebug) | Stage, `'debug'`. |

The [generators](/docs/plugins/generators) plugin has nothing for the player, so it has no default. A contract test in `packages/react` fails if a first-party plugin with a view has neither a default and a hook nor a reason in its list.

Each hook returns `null` in a game without its plugin (`useDevices` returns `[]`, and `useClock` always returns its object). A hook that has commands returns them as functions, each giving back what [`runner.apply`](/docs/reference/runner#the-runners-members) did, so a refusal comes back with its reason. Buttons the plugin's view already carries, as [`RenderedChoice`](/docs/reference/view#renderedchoice)s, have their price and the reason they're greyed out: draw them with [`ChoiceButton`](#choicebutton), or send their `command`.

To turn one off, leave its part out of the layout. To replace one, name your own in `components`:

```tsx
import { DEFAULT_LAYOUT, GameShell, useJobs, type Components } from '@ifloom/react'

// No job board; your own shop button in place of the built-in one.
const layout = { ...DEFAULT_LAYOUT, stage: DEFAULT_LAYOUT.stage.filter((part) => part !== 'jobs') }

function Shifts() {
  const jobs = useJobs()
  return <p className="text-sm">Jobs held: {jobs?.held.length ?? 0}</p>
}

const components: Components = { ShopButtons: ({ Default }) => <div className="border-t pt-2"><Default /></div> }

<GameShell runner={runner} layout={{ ...layout, sidebar: [...layout.sidebar, <Shifts key="shifts" />] }} components={components} />
```

In Vue, Svelte or plain JS, read the same slice from `view.plugins.<id>` by the type the plugin exports. [Building UI for plugins](/docs/recipes/plugin-ui) shows each in every framework.

### StatusList

```tsx
function StatusList(props: { className?: string; title?: string }): JSX.Element | null
```

The [statuses](/docs/plugins/statuses) active now, from [`StatusesView`](/docs/plugins/statuses#the-view). Each status (`data-status`) shows its label, its stacks when there's more than one (`ui.statusStacks`, `×2`), the turns left on its longest stack (`ui.turnsLeft`, or `ui.turnLeft` for the last one), its summary, and what it does to the stats, such as `+10 Energy` (`ui.modifierAdd` and `ui.modifierMultiply`, with the stat's label). The heading is `ui.statuses`, or `title`.

It draws nothing while no status is active, so the sidebar has no empty box most of the time, and nothing in a game without the plugin.

Replaceable as `StatusList` in [`components`](#components). Parts: `statuses`, `statuses-title`, `status` (with `data-status`), `status-label`, `status-stacks`, `status-turns`, `status-summary` and `status-modifiers`.

### useStatuses

```ts
function useStatuses(): StatusesView | null
```

The statuses plugin's view, `active`, each an [`ActiveStatus`](/docs/plugins/statuses#statusesview) with its `label`, `summary`, `turnsLeft`, `stacks` and `modifiers`. `null` in a game without the plugin. [`StatusList`](#statuslist) is drawn from it.

```tsx
import { useStatuses } from '@ifloom/react'

function StatusIcons() {
  const active = useStatuses()?.active ?? []
  return <p>{active.map((status) => `${status.label} (${status.turnsLeft})`).join(', ')}</p>
}
```

### AchievementList

```tsx
function AchievementList(props: { className?: string; title?: string | false }): JSX.Element | null
```

Every [achievement](/docs/plugins/achievements) the game has, in the order it declares them, under a heading with how many are earned (`ui.achievements` and `ui.achievementsCount`, `1 of 3`). Each one (`data-achievement`) shows its picture, its title and its description. An earned one carries `data-earned` and an **Earned** badge (`ui.achievementEarned`). It counts as earned when this save or any other earned it, since the profile remembers it. A secret one not yet earned carries `data-secret` and shows as `???`, with no description or progress. One with [progress](/docs/plugins/achievements#progress) not yet earned has a bar (a `progressbar` labelled with its title) and `5 of 20` under it (`ui.achievementProgress`).

`title` replaces the heading, and `false` leaves it out, as the page and the dialog do. It draws nothing in a game without the plugin.

Replaceable as `AchievementList` in [`components`](#components). Parts: `achievements`, `achievements-title`, `achievements-count`, `achievements-empty`, `achievement` (with `data-achievement`, `data-earned` and `data-secret`), `achievement-image`, `achievement-title`, `achievement-text`, `achievement-progress`, `achievement-progress-text` and `badge`.

### AchievementsButton

```tsx
function AchievementsButton(props: { className?: string }): JSX.Element | null
```

What the `'achievements'` part draws: a button labelled **Achievements** with the count (`1 of 3`) on a badge. With [pages](#pages) on, it goes to the [`AchievementsPage`](#achievementspage). Without them, or with `PagesOptions.achievements` set to `false`, it opens an [`AchievementList`](#achievementlist) in a [`Dialog`](#dialog). Opening it sends no command. It draws nothing in a game without the plugin.

Replaceable as `AchievementsButton` in [`components`](#components). Parts: `achievements-button`, `badge`, and for its dialog `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### AchievementsPage

```tsx
function AchievementsPage(props: { className?: string }): JSX.Element
```

The `achievements` page, among the [pages](#pages) around the game: a heading (`ui.achievements`), the [`AchievementList`](#achievementlist), and a **Back** button. The title screen has a button for it in a game with the plugin. On the title screen the progress counts come from whatever state the runner holds, and what's earned comes from the profile too, so it's right before a game starts. The section carries `data-page="achievements"`.

Replaceable as `AchievementsPage` in [`components`](#components), or by a page of your own with the id `achievements` in `PagesOptions.pages`. Parts: `achievements-page`, `page-heading` and `page-back`.

### useAchievements

```ts
function useAchievements(): AchievementsView | null
```

The achievements plugin's view ([`AchievementsView`](/docs/plugins/achievements#achievementsview): `achievements`, `earned` and `total`), or `null` in a game without the plugin. [`AchievementList`](#achievementlist) and the button are drawn from it.

```tsx
import { useAchievements } from '@ifloom/react'

function Trophies() {
  const data = useAchievements()
  return data ? <span>{data.earned}/{data.total}</span> : null
}
```

### CheatPanel

```tsx
function CheatPanel(props: { className?: string }): JSX.Element | null
```

The [cheats](/docs/plugins/cheats) the player can see, from [`CheatsView`](/docs/plugins/cheats#cheatsview). The ones with no `group` come first, with no heading, then each group under its name, in the order the groups first appear. Each cheat (`data-cheat`) is a [`ChoiceButton`](#choicebutton) from its `button`, greyed out with its reason while it's refused, such as `For supporters.` or `Already used.` for a `once` cheat. Under it are its description and, once used, a badge saying how often (`ui.cheatUsedOnce`, `ui.cheatUsedTimes`).

It draws nothing in a game without the plugin, or while every cheat is hidden.

Replaceable as `CheatPanel` in [`components`](#components). Parts: `cheats`, `cheats-group` (with `data-cheats-group`), `cheats-group-title`, `cheat` (with `data-cheat` and `data-used`), `cheat-text`, `cheat-used` and `choice`.

### CheatsButton

```tsx
function CheatsButton(props: { className?: string }): JSX.Element | null
```

What the `'cheats'` part draws: a **Cheats** button (`ui.cheats`) that opens a [`CheatPanel`](#cheatpanel) in a [`Dialog`](#dialog). Opening it sends no command. It draws nothing in a game without the plugin, or while it has no cheat the player can see, so a game whose cheats all wait hidden for an unlock shows no button until then.

Replaceable as `CheatsButton` in [`components`](#components). Parts: `cheats-button`, and for its dialog `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### useCheats

```ts
function useCheats(): CheatsControls | null

type CheatsControls = CheatsView & {
  groups: CheatGroup[]
  use: (cheat: string) => Result<GameState>
}

type CheatGroup = { name: string | null; cheats: CheatView[] }
```

The cheats plugin's view ([`CheatsView`](/docs/plugins/cheats#cheatsview): `cheats` and `used`), the cheats by group as `groups`, and `use`, which sends `cheats/use`. `null` in a game without the plugin. `groups` has the cheats with no group first, as a group named `null`. [`CheatPanel`](#cheatpanel) and the button are drawn from it.

```tsx
import { useCheats } from '@ifloom/react'

function QuickCoins() {
  const cheats = useCheats()
  const coins = cheats?.cheats.find((cheat) => cheat.id === 'coins')
  if (!coins) return null
  return <button disabled={Boolean(coins.button.disabled)} onClick={() => cheats!.use('coins')}>{coins.label}</button>
}
```

### UnlocksPanel

```tsx
function UnlocksPanel(props: { className?: string }): JSX.Element | null
```

Entering a code, and the game's [unlocks](/docs/plugins/unlocks). Under an **Enter a code** heading (`ui.enterCode`) are a text box (`ui.code`) and an **Unlock** button (`ui.unlock`), which says **Checking…** (`ui.checkingCode`) while the code is checked. A wrong code shows the plugin's reason as an alert. One that works says **Unlocked: Supporter edition.** (`ui.unlockedNow`, or `ui.unlockedAlready`), and when it opened content the game in play doesn't have, a **Restart to add it** button (`ui.restartForUnlock`) calls the option's `onChange`. The option's `problems` follow, then each unlock (`data-unlock`, and `data-unlocked` once it's unlocked) with its label, a **Locked** or **Unlocked** badge (`ui.locked`, `ui.unlocked`) and its description.

The box shows only when the provider has [`unlocks`](#unlocksoption) and its codes have started. Without it the list still shows. It draws nothing in a game without the plugin, or with no unlocks. The settings page and the menu draw it for you.

Replaceable as `UnlocksPanel` in [`components`](#components). Parts: `unlocks`, `unlocks-title`, `unlock-form`, `unlock-input`, `button`, `unlocks-message`, `unlocks-entered`, `unlock-problem`, `unlocks-list`, `unlock` (with `data-unlock` and `data-unlocked`), `unlock-name`, `unlock-state` and `unlock-text`.

### useUnlocks

```ts
function useUnlocks(): UnlocksControls | null

type UnlocksControls = UnlocksView & {
  available: boolean
  enter: (code: string) => Promise<boolean>
  checking: boolean
  entered: Entered | null
  message: string | null
  restart: (() => void) | undefined
  problems: string[]
}
```

The unlocks plugin's view ([`UnlocksView`](/docs/plugins/unlocks#unlocksview): `unlocks`, `unlocked` and `total`) and the code box's state, or `null` in a game without the plugin.

| Field | What it is |
|---|---|
| `available` | Whether codes can be entered: the provider has `unlocks`, and has started them. |
| `enter` | Tries a code with [`UnlockCodes.enter`](/docs/plugins/unlocks#unlockcodes). Resolves to whether it worked. |
| `checking` | True while a code is being checked. |
| `entered` | What the last code that worked unlocked, as [`Entered`](/docs/plugins/unlocks#entered), or `null`. |
| `message` | Why the last code didn't work, or `null`. |
| `restart` | The option's `onChange`, when the last code opened content that needs it. Otherwise undefined. |
| `problems` | The option's `problems`. |

```tsx
import { useState } from 'react'
import { useUnlocks } from '@ifloom/react'

function CodeBox() {
  const unlocks = useUnlocks()
  const [code, setCode] = useState('')
  if (!unlocks?.available) return null
  return (
    <form onSubmit={(event) => { event.preventDefault(); void unlocks.enter(code) }}>
      <input value={code} onChange={(event) => setCode(event.target.value)} />
      <button disabled={unlocks.checking}>Unlock</button>
      {unlocks.message ?? (unlocks.entered ? `Unlocked: ${unlocks.entered.label}.` : null)}
      {unlocks.restart ? <button type="button" onClick={unlocks.restart}>Restart</button> : null}
    </form>
  )
}
```

### ShopButtons

```tsx
function ShopButtons(props: { className?: string }): JSX.Element | null
```

What the `'shop'` part draws: a button for each [vendor](/docs/plugins/shop) at the player's location (`data-vendor`), labelled `ui.shopAt` (`Shop at The counter`). A closed vendor's button has a **Closed** badge (`ui.vendorClosed`) and still opens, so the player can see what's sold. A button opens its vendor in a [`ShopDialog`](#shopdialog), which sends no command. In a game without the [places](/docs/plugins/places) plugin every vendor is everywhere, so every vendor gets a button.

It draws nothing where no vendor stands, and nothing in a game without the plugin.

Replaceable as `ShopButtons` in [`components`](#components). Parts: `vendors`, `vendor-button` (with `data-vendor`) and `vendor-closed`.

### ShopDialog

```tsx
function ShopDialog(props: { vendorId: string | null; onClose: () => void }): JSX.Element
```

The vendor with this id in a [`Dialog`](#dialog), titled with its name and drawn as a [`ShopCounter`](#shopcounter). It's closed while `vendorId` is `null` or names no vendor. Use it to open a vendor from a button of your own, such as one on a character:

```tsx
import { useState } from 'react'
import { Button, ShopDialog } from '@ifloom/react'

function StallButton() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen('stall')}>The fruit stall</Button>
      <ShopDialog vendorId={open} onClose={() => setOpen(null)} />
    </>
  )
}
```

Replaceable as `ShopDialog` in [`components`](#components). Parts: `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### ShopCounter

```tsx
function ShopCounter(props: { vendor: VendorView; className?: string }): JSX.Element
```

A vendor's goods, from its [`VendorView`](/docs/plugins/shop#vendorview). A closed vendor shows why above its goods (`data-closed`). Each good (`data-good`) shows its name, today's discount (`ui.percentOff`) with the full price struck out, how many are left (`ui.stockLeft`) for a good with stock, and how many the player has (`ui.owned`). Then:

- **Buy** (`ui.buy`), a [`ChoiceButton`](#choicebutton) built from the good's `buy` button, so it shows today's price and, when it's greyed out, the reason on it: `Sold out.`, `You need 10 coins.` or the vendor's closed line.
- **Sell for 2 coins** (`ui.sellFor`), from the good's `sell` button, when the vendor buys back and the player has one.

It says `ui.noGoods` when nothing is on offer.

Replaceable as `ShopCounter` in [`components`](#components). Parts: `shop` (with `data-vendor`), `shop-closed`, `shop-empty`, `goods`, `good` (with `data-good`), `good-name`, `good-details`, `good-off`, `good-full-price`, `good-stock`, `good-owned`, `good-actions` and `choice`.

### useShop

```ts
function useShop(): ShopControls | null

type ShopControls = ShopView & {
  here: VendorView[]
  buy: (vendor: string, item: string, count?: number) => Result<GameState>
  sell: (vendor: string, item: string, count?: number) => Result<GameState>
}
```

The shop plugin's view ([`ShopView`](/docs/plugins/shop#shopview): `vendors`), the vendors at the player's location as `here`, and its commands, or `null` in a game without the plugin. `buy` and `sell` send `shop/buy` and `shop/sell`, one if `count` is left out. [`ShopButtons`](#shopbuttons), [`ShopDialog`](#shopdialog) and [`ShopCounter`](#shopcounter) are drawn from it.

```tsx
import { useShop } from '@ifloom/react'

function QuickCoffee() {
  const shop = useShop()
  const coffee = shop?.here[0]?.goods.find((good) => good.item === 'coffee')
  if (!shop || !coffee) return null
  return <button disabled={Boolean(coffee.buy.disabled)} onClick={() => shop.buy(shop.here[0].id, 'coffee')}>Coffee to go</button>
}
```

### JobBoard

```tsx
function JobBoard(props: { className?: string; title?: string }): JSX.Element | null
```

Every [job](/docs/plugins/jobs), held or not, from [`JobView`](/docs/plugins/jobs#jobview)s, under the heading `ui.jobs` or `title`. Each job (`data-job`, with `data-hired` while it's held and `data-fired` once the player was fired) shows its title, the rank held on a badge (unless it has the job's own title), its description, and:

- what a shift pays (`ui.jobPay`, `Pays 12 coins a shift`);
- the next shift (`ui.shiftToday`, `ui.shiftTomorrow` or `ui.shiftInDays`), for a job held;
- the next rank and how many more shifts it needs (`ui.jobNextRank`, `ui.jobNextRankOne`, or `ui.jobNextRankSoon` when shifts aren't what's missing);
- the shifts worked and missed (`ui.jobShifts`, `ui.jobMissed`);
- **Let go** (`ui.jobFired`) on a job the player was fired from.

A job not held has **Apply** (`ui.applyJob`), a [`ChoiceButton`](#choicebutton) from the job's `apply` button, greyed out with the reason of its first `blocked` entry that holds. A job held has **Work a shift** (`ui.workShift`), with the shift's cost as its price and the reason it can't be worked now, such as `No shift today.`, and a **Quit** button (`ui.quitJob`) that sends `jobs/quit`.

It draws nothing in a game without the plugin or with no jobs.

Replaceable as `JobBoard` in [`components`](#components). Parts: `jobs`, `jobs-title`, `job` (with `data-job`, `data-hired` and `data-fired`), `job-title`, `job-rank`, `job-fired`, `job-text`, `job-details`, `job-pay`, `job-shift`, `job-next`, `job-record`, `job-actions`, `choice` and `button`.

### useJobs

```ts
function useJobs(): JobsControls | null

type JobsControls = JobsView & {
  held: JobView[]
  apply: (job: string) => Result<GameState>
  work: (job: string) => Result<GameState>
  quit: (job: string) => Result<GameState>
}
```

The jobs plugin's view ([`JobsView`](/docs/plugins/jobs#jobsview): `jobs`), the jobs held as `held`, and its commands, or `null` in a game without the plugin. `apply`, `work` and `quit` send `jobs/apply`, `jobs/work` and `jobs/quit`. [`JobBoard`](#jobboard) is drawn from it.

```tsx
import { useJobs } from '@ifloom/react'

function NextShift() {
  const job = useJobs()?.held[0]
  if (!job?.nextShift) return null
  return <p className="text-sm">{job.title}: next shift in {job.nextShift.inDays} days</p>
}
```

## Devices

These components draw the [devices plugin](/docs/plugins/devices)'s view, and so a [phone](/docs/plugins/phone). In a game without the plugin they draw nothing.

### DeviceButtons

```tsx
function DeviceButtons(): JSX.Element | null
```

A button for each device offered from the sidebar (`sidebar: true`), with its badge. Each button opens the device in a [`DeviceDialog`](#devicedialog) and carries `data-device`. Opening the dialog sends no command and costs nothing.

Replaceable as `DeviceButtons` in [`components`](#components). Parts: `devices`, `device-button` (with `data-device`) and `device-badge`.

### DeviceDialog

```tsx
function DeviceDialog(props: { deviceId: string | null; onClose: () => void }): JSX.Element
```

The device with this id in a [`Dialog`](#dialog), titled with its name and drawn as a [`DeviceScreen`](#devicescreen). It's closed while `deviceId` is `null` or matches no device. `onClose` is called when the player closes it. The content carries `data-frame` with the device's frame, and a phone's dialog is narrower.

```tsx
import { useState } from 'react'
import { Button, DeviceDialog } from '@ifloom/react'

function LaptopButton() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <Button onClick={() => setOpen('laptop')}>Laptop</Button>
      <DeviceDialog deviceId={open} onClose={() => setOpen(null)} />
    </>
  )
}
```

Replaceable as `DeviceDialog` in [`components`](#components). Parts: `dialog` (with `data-frame`), `dialog-overlay`, `dialog-title` and `dialog-close`.

### DeviceScreen

```tsx
function DeviceScreen(props: { device: DeviceView }): JSX.Element
```

A device, open. With no app open, it shows the home screen: the wallpaper (through [`assetUrl`](#asseturl)) and a grid of apps. Each app is a button with its name, a badge and an icon square carrying `data-icon`, and it sends the app's command (`devices/open`). A locked app is greyed out, with its reason only in its `title`, shown on hover. Unlike a [`ChoiceButton`](#choicebutton), the icon doesn't print the reason.

With an app open (`data-app`), it shows a **Back** button (`ui.back`, sending `devices/close`), the app's name, and each of the app's sections as an [`AppSection`](#appsection).

`device` is one entry of [`useDevices`](#usedevices), a [`DeviceView`](/docs/plugins/devices#deviceview).

Replaceable as `DeviceScreen` in [`components`](#components). Parts: `device-screen`, `app` (with `data-app`), `app-header`, `app-back`, `app-title`, `app-launcher`, `app-button` (with `data-open-app`), `app-icon` (with `data-icon`) and `app-badge`.

### AppSection

```tsx
function AppSection(props: { section: SectionView }): JSX.Element | null
```

One [`SectionView`](/docs/plugins/devices#sectionview) of an open app, drawn by kind:

| Kind | Drawn as |
|---|---|
| `prose` | A paragraph, with line breaks kept. |
| `actions` | A [`ChoiceList`](#choicelist). |
| `list` | Each entry (`data-entry`) with its picture, title, text and actions. |
| `plugin` | The renderer in `sections` for that plugin id, given the plugin's view and the section's `with`. Nothing if there's no renderer. |
| `panel` | The component in `panels` with the panel's name, given its data. Nothing if there's no component. |

Replaceable as `AppSection` in [`components`](#components). Parts: `app-prose`, `app-entries`, `app-entry` (with `data-entry`), `app-entry-image`, `app-entry-title` and `app-entry-text`.

### useDevices

```ts
function useDevices(): DevicesState

type DevicesState = DeviceView[]
```

The devices in the view, `view.plugins.devices.devices`, as [`DeviceView`](/docs/plugins/devices#deviceview)s. It returns `[]` in a game without the plugin. Use it for a device button of your own:

```tsx
import { Badge, useDevices } from '@ifloom/react'

function PhoneBadge() {
  const phone = useDevices().find((device) => device.id === 'phone')
  if (!phone) return null
  return <Badge>{phone.badge}</Badge>
}
```

### useDevice

```ts
function useDevice(): DeviceState

type DeviceState = {
  openId: string | null
  device: DeviceView | null
  open: (id: string) => void
  close: () => void
}
```

Which device is open in a dialog, and how to open and close one. `device` is the open device as the view has it, or `null`, also when `openId` no longer names one. Each call keeps its own state, so call it once and share it between your buttons and the dialog. [`DeviceButtons`](#devicebuttons) uses it.

```tsx
import { DeviceDialog, useDevice } from '@ifloom/react'

function PhoneButton() {
  const { openId, open, close } = useDevice()
  return (
    <>
      <button onClick={() => open('phone')}>Phone</button>
      <DeviceDialog deviceId={openId} onClose={close} />
    </>
  )
}
```

## Plugin sections

These are the two built-in renderers for an app's `{ plugin }` section. [`GameProvider`](#gameprovider) registers them under `messages` and `feed`. Register your own under the same id to replace one.

### MessagesSection

```tsx
const MessagesSection: PluginSectionComponent
```

A [messages](/docs/plugins/messages) channel, the one named by the section's `with.channel` (`data-channel`). Each thread (`data-thread`) shows under its sender's name and portrait, with its messages as bubbles. A message's [`beats`](/docs/plugins/messages#messageview) are drawn with [`Beat`](#beat), so a picture or a clip in it shows in the bubble and opens in the viewer. Under each message is the reply the player sent, or the replies on offer as buttons.

Opening the channel marks nothing read, so the unread count stays until the player clears it. While the channel has unread messages, a **Mark all read** button (`ui.allRead`) sends `messages/read` for the channel. It draws nothing if the channel isn't in the view.

Replaceable as `MessagesSection` in [`components`](#components). Parts: `channel`, `thread`, `thread-title`, `thread-portrait`, `message`, `bubble` (with `data-from`) and `button`.

### useMessages

```ts
function useMessages(): MessagesControls | null

type MessagesControls = MessagesView & { read: (channel: string) => Result<GameState> }
```

The [messages](/docs/plugins/messages) plugin's view (its channels, each with threads and an unread count, and the unread count over all) with its command, or `null` in a game without the plugin. `read(channel)` sends `messages/read`. A reply on offer has its own `command`; send it with [`useGame`](#usegame)'s `send`. [`MessagesSection`](#messagessection) is drawn from it.

### FeedSection

```tsx
const FeedSection: PluginSectionComponent
```

A [feed](/docs/plugins/feed), the one named by `with.feed` (`data-feed`). Each post (`data-post`) shows the poster's name and portrait, its picture, its `video` (a [`Video`](#video), playing like a GIF), its words, its likes (`ui.likes`) and its comments. The words are the post's [`beats`](/docs/plugins/feed#postview), drawn with [`Beat`](#beat), so pictures and clips in them show in order.

Opening the feed marks nothing seen. While it has unseen posts, a **Mark all seen** button (`ui.allSeen`) sends `feed/seen` for the feed. It draws nothing if the feed isn't in the view.

Replaceable as `FeedSection` in [`components`](#components). Parts: `feed`, `post`, `post-author`, `post-portrait`, `post-image`, `post-text`, `post-meta`, `post-comment`, `post-comment-name` and `button`.

### useFeed

```ts
function useFeed(): FeedControls | null

type FeedControls = FeedsView & { seen: (feed: string) => Result<GameState> }
```

The [feed](/docs/plugins/feed) plugin's view (its feeds, each with posts and an unread count) with its command, or `null` in a game without the plugin. `seen(feed)` sends `feed/seen`. [`FeedSection`](#feedsection) is drawn from it.

## Sound

### useAudio

```ts
function useAudio(options?: AudioOptions & { runner?: Runner }): AudioPlayer | null
```

Plays the game's sound with the [audio player](/docs/browser/audio-player) while the component is mounted, and stops it on unmount. Inside a [`GameProvider`](#gameprovider) it uses that runner; outside one, pass `runner`. The other options go to [`startAudio`](/docs/browser/audio-player#audiooptions) once, when it starts. It returns the player, or `null` until it has started. [`mountGame`](/docs/react#mountgame) starts the player itself, so use this only with a `GameShell` you draw yourself. See [Sound](/docs/react#sound).

```tsx
function App() {
  useAudio({ runner, log: console.debug })
  return <GameShell runner={runner} />
}
```

## Words

### UI_STRINGS

```ts
const UI_STRINGS: { quests: string; questNew: string; /* ... */ }
type UiStringKey = keyof typeof UI_STRINGS
```

The UI's own words in English, by key without the `ui.` prefix. The full table is on [The React UI](/docs/react#words). `UiStringKey` is one of its keys.

Among them are `close` (the dialogs' close button), `priceSeparator` (between the parts of a price), `itemCount` (`×{n}` after an item), `wearItem` (`Wear {item}`), `mailHeader` (`{key}: {value}` for a letter's headers), and the debug panel's form rows, `debugStat` to `debugTurn`.

### uiSay

```ts
function uiSay(game: Game, key: UiStringKey, vars?: Record<string, string | number>): string
```

Returns the game's word for a key, `game.strings['ui.' + key]`, or the English if the game doesn't set it. Each `{name}` is filled from `vars`. One with no value is left as written.

```ts
import { uiSay } from '@ifloom/react'

uiSay(game, 'quests')                              // 'To do' in the showcase, which sets strings: { 'ui.quests': 'To do' }
uiSay(game, 'questStage', { stage: 1, stages: 3 }) // '1 of 3'
```

### useWords

```ts
function useWords(): (key: UiStringKey, vars?: Record<string, string | number>) => string
```

`uiSay` for the game in context, inside a [`GameProvider`](#gameprovider).

```tsx
import { useWords } from '@ifloom/react'

function JournalHeading() {
  const words = useWords()
  return <h3>{words('quests')}</h3>
}
```

## shadcn/ui primitives

These are the building blocks the components above are made from, exported so your own screens match. They're [shadcn/ui](https://ui.shadcn.com)'s components, styled by the same [theme variables](/docs/react/customising#2-set-tokens-and-colours), and shadcn/ui's documentation for each applies. To add one this package doesn't have, see [More shadcn/ui components](/docs/react/extending#more-shadcnui-components).

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
import { Button, buttonVariants } from '@ifloom/react'

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
import { Badge } from '@ifloom/react'

<Badge variant="secondary">Open till 6</Badge>
```

### Card

```tsx
Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
```

A bordered box and its parts. Each is a `div` taking a `div`'s props, except `CardTitle`, which is an `h3`, and `CardDescription`, which is a `p`.

```tsx
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ifloom/react'

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

The [`GameMenu`](#gamemenu) and [`DeviceDialog`](#devicedialog) use `bare`, with the attributes from [`usePart`](#usepart), so their dialogs follow `classes` and `unstyled` like everything else.

```tsx
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@ifloom/react'

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
import { ScrollArea } from '@ifloom/react'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ifloom/react'

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
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ifloom/react'

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
import { cn } from '@ifloom/react'

cn('p-4 text-sm', closed && 'opacity-50', 'p-2') // 'text-sm opacity-50 p-2' when closed
```
