---
title: "Components"
description: "Every component and hook @ifloom/react exports, from GameShell to the pages around the game, with what each renders."
---
These are the components and hooks of `@ifloom/react`, the optional React UI, so everything here is React only. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/how-to/render/start). [Choosing a UI](/docs/explanation/choosing-a-ui) says when to use which.

Every game component reads the [view](/docs/reference/view) through [`useGame`](#usegame), so it renders only inside a [`GameProvider`](#gameprovider), and [`GameShell`](#gameshell) is one. A game replaces any of them by name in [`components`](#components), and each entry names the `data-part`s it renders, which [React UI parts](/docs/reference/react/parts) lists. Each plugin's own React UI, such as the shop's counter, is under `## React UI` on that plugin's page. The [shadcn/ui primitives](/docs/reference/react/kit#shadcnui-primitives) are on the kit's page and need no provider. In the showcase: `examples/showcase/src/layout.tsx`.

Every component that takes `className` merges it over its own classes with [`cn`](/docs/reference/react/kit#cn), so a later Tailwind class wins: `<Scene className="gap-8" />`.

## The game

### GameShell

`GameShell` renders the whole UI: a [`GameProvider`](#gameprovider) with the game's sound, its [text size](#textsize) and, with `pages` on, the [pages](#pages), around its `layout`. Its props are in [`GameShellProps`](/docs/api/react#gameshellprops), and [The React UI](/docs/reference/react#gameshell) describes them.

`mountGame` renders a `GameShell` too. With no `layout`, it renders the [`DefaultLayout`](#defaultlayout). It passes [`components`](#components), [`classes`](#classes), `unstyled` and the other [`UiOptions`](#uioptions) to its provider.

```tsx given
import { GameShell } from '@ifloom/react'
import { Layout } from './layout.tsx'
import { panels } from './panels.tsx'

export const App = () => <GameShell runner={runner} panels={panels} layout={Layout} pages />
```

[Set up the React UI](/docs/how-to/react/set-up-the-react-ui) mounts it in a new game.

## Layouts

A layout is a component that renders the page from the regions and parts below. [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts) writes one, and [Arrange the layout](/docs/how-to/arrange-the-layout) makes the common changes.

### DefaultLayout

`DefaultLayout` is the React UI's own layout, which a `GameShell` with no `layout` renders and the `react` and `next` templates copy into `src/layout.tsx`. Its signature is in [`DefaultLayout`](/docs/api/react#defaultlayout). It renders these regions:

- **A [`Sidebar`](#sidebar)** with the [`Title`](#title), the [`Clock`](#clock), the [`GameMenu`](#gamemenu), a folding `stats` [section](#section) with the [`StatList`](#statlist), and a folding `inventory` section with the [`Inventory`](#inventory). The plugin UIs' parts for the `stats` and `sidebar` spots follow.
- **A [`Story`](#story)** with the [`Scene`](#scene) and the [`InputFields`](#inputfields), then the plugin UIs' `room` parts, the [`RoomActions`](#roomactions), and the plugin UIs' `story` parts.
- **A [`PanelHost`](#panelhost)**, and **an [`Overlay`](#overlay)** with the [`Notices`](#notices).

Each `<Plugins at="…" />` renders the parts the game's [plugin UIs](/docs/reference/react/kit#plugins) bring for that spot, in the order of its `plugins` list. A part with nothing to show renders nothing, and a section with nothing in it hides, so the layout suits any game.

### Game

`Game` renders the page, a layout's root inside the game's provider. Its props are in [`GameProps`](/docs/api/react#gameprops).

With a [`Sidebar`](#sidebar) anywhere inside it, the page is a grid that carries `data-has-sidebar`: the side column is `--width-sidebar` wide and the story fills the rest. Without one, the page is a single centred column up to `--width-reading` wide. With `pages` on, it renders on the `game` page only.

Parts: `page` (with `data-has-sidebar`).

### Sidebar

`Sidebar` renders the side column, an `<aside>` carrying `data-sidebar`, with its children in order. Its props are in [`SidebarProps`](/docs/api/react#sidebarprops).

Below Tailwind's `md` breakpoint (48rem), the column becomes a drawer. A slim `top-bar` holds the game's title, the [`Clock`](#clock) and a `drawer-button` labelled `ui.openSidebar`, which opens the column as a dialog from the left. Escape closes the drawer, and so does the state moving on, unless a dialog the drawer opened is still on top. Where `matchMedia` is missing, as on the server, it stays a column.

Parts: `sidebar`, `top-bar`, `top-bar-title`, `drawer-button`, `drawer` and `drawer-overlay`.

### Story

`Story` renders the main column, a `<main>` with its children in order. Its props are in [`StoryProps`](/docs/api/react#storyprops).

The scene's words, choices and inputs, and the room's buttons, form a reading column `--width-prose` wide. Pictures, panels and minigames use the whole width. `align` places the reading column, `'center'` or `'start'`, as `data-align` on the `<main>`. Left out, the `--margin-prose` token decides, and it centres the column unless a preset changes it.

```tsx fragment
<Story align="start">
  <Scene />
</Story>
```

Parts: `story`.

### Overlay

`Overlay` renders a box that floats at the bottom right of the window, across its width on a phone and `--width-notice` wide from `md`. Its props are in [`Overlay`](/docs/api/react#overlay). At the end of the page it sits after the content, so nothing is left under it, and it hides while it's empty. The default layout puts the [`Notices`](#notices) in it.

Parts: `overlay`.

### Section

`Section` renders a titled part of a layout, which hides itself when its children render nothing. Its props are in [`SectionProps`](/docs/api/react#sectionprops).

- **`collapsible`** puts a button on its title that folds it. The [profile](/docs/reference/profile)'s `ui:sections` keeps each player's choice by `id`, and `open` (default `true`) sets how it starts before the player chooses. Without a profile, the choice lasts until the page closes.
- **`dialog`** makes the title, with `badge` after it, a button that opens the children in a [`PartDialog`](#partdialog).
- **`when`** is a [condition](/docs/reference/conditions), and the section shows only while it holds, as [`When`](#when) does.

```tsx
import { Section } from '@ifloom/react'
import { WardrobeCard } from '@ifloom/plugin-wardrobe/react'
import { places } from '@ifloom/plugin-places'

<Section id="wardrobe" title="Wearing" collapsible when={places.at('flat')}>
  <WardrobeCard title={false} />
</Section>
```

A card inside a section has a title of its own, so pass `title={false}` to [`Inventory`](#inventory), [`WardrobeCard`](/docs/reference/plugins/wardrobe#wardrobecard) and the rest, or the heading shows twice.

Parts: `section` (with `data-section`, `data-open` when it folds and `data-dialog` when it opens a dialog), `section-title`, `section-toggle`, `section-body` and `section-badge`.

### When

`When` renders its children while `condition` holds, and nothing otherwise. Its props are in [`When`](/docs/api/react#when). Any [condition](/docs/reference/conditions) works, a plugin's included, and it's checked each time the view changes. It only reads, so it changes nothing in a save or a replay.

### useHolds

`useHolds` returns whether a condition holds on the state on show, using the engine's [`holds`](/docs/reference/conditions#holds). Its signature is in [`useHolds`](/docs/api/react#useholds).

No condition always holds. [`When`](#when) and `Section`'s `when` use it. It's for placing parts of a layout when the view has no field for the case, such as a sidebar section shown once the player has been somewhere. What the story shows belongs in content, where the [content checker](/docs/reference/checks) reads it.

```tsx
import { useHolds } from '@ifloom/react'

function RainBanner() {
  return useHolds({ kv: 'raining' }) ? <p>It's raining.</p> : null
}
```

### WithPages

`WithPages` renders its children, or with `pages` on, the [pages](#pages) around them, showing the children on the `game` page only. Its props are in [`WithPages`](/docs/api/react#withpages). [`GameShell`](#gameshell) has one, so you need it only under a `GameProvider` of your own.

### GameProvider

`GameProvider` connects every component under it to a [runner](/docs/reference/runner). Its props are in [`GameProviderProps`](/docs/api/react#gameproviderprops).

It subscribes to the runner and reads `runner.view()` again only when the state changes, or when the part of the profile the plugins' views show changes. `plugins` are the [plugin UIs](/docs/reference/react/kit#pluginui) to render. `panels`, `inline` and `sections` are the game's own, over what the plugin UIs bring under the same names. `mods` turns on the [mod manager](#modmanager). The [`UiOptions`](#uioptions) go to a [`UiProvider`](#uiprovider) inside it, and with `keys` on it listens for the [keyboard shortcuts](#keyoptions).

On its own it plays no sound, sizes no text and renders no pages. [`GameShell`](#gameshell) adds those around any `layout`, so you need the provider alone only for a root of your own, as [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts) writes.

Define `plugins`, `panels`, `inline`, `sections`, `mods`, `components` and `classes` once, outside your component. A new object on each render, such as `panels={{ StallPanel }}`, renders every component under the provider again.

### useGame

`useGame` returns the runner, its [snapshot](/docs/reference/runner#runnersnapshot), the [`View`](/docs/reference/view#view) on show and `send`. The fields are in [`GameContextValue`](/docs/api/react#gamecontextvalue).

Every component under the provider renders again when the runner hands a new snapshot: after a command, a setting, a save or a helper's report. `send` runs a command through `runner.apply` and returns its [`Result`](/docs/reference/common#result), so a component can show a refusal. It takes a plain command or a plugin's [`CommandRef`](/docs/reference/custom#commandref), such as `send(shop.buy('counter', 'item:sandwich'))`. `plugins` lists the plugin UIs whose plugin the game has, in their order. It throws outside a `GameProvider`.

```tsx
import { useState } from 'react'
import { places } from '@ifloom/plugin-places'
import { useGame } from '@ifloom/react'
import { Button } from '@ifloom/react/kit'

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

The runner covers what the view doesn't, such as `runner.undo()`, `runner.save(...)` and `runner.snapshot().backlog`.

### ModsOption

`ModsOption` is the game's [mods](/docs/reference/mods) for the [mod manager](#modmanager), passed as `mods` on `GameShell` or `GameProvider`. Every field is in [`ModsOption`](/docs/api/react#modsoption).

| Field | Meaning |
|---|---|
| `store` | The [`Mods`](/docs/reference/mods#mods) store the game loaded its mods from at start-up. |
| `problems` | The content checker's problems, written by [`describeProblem`](/docs/reference/checks#describeproblem). The manager shows each one that starts `mod:<id> ` under that mod. |
| `onChange` | The function that builds the game again with the mods as they now are, such as `() => location.reload()`. Without it, the manager never offers to restart. |

### PanelComponent

`PanelComponent` is the type of a game's own panel: a scene's panel, an app's panel section, or a [panel](/docs/reference/panels) content opens. Its type is in [`PanelComponent`](/docs/api/react#panelcomponent). Its `data` is the panel's `with`. [Add panels, sections, components and hints](/docs/how-to/react/extend-the-react-ui) writes one.

### InlineComponents

`InlineComponents` is a game's own components for [UI pieces](/docs/reference/prose#ui-pieces) in its prose, by name, for the provider's `inline`. Its type is in [`InlineComponents`](/docs/api/react#inlinecomponents).

One piece's component is an [`InlineComponent`](/docs/api/react#inlinecomponent), and its props are [`InlineProps`](/docs/api/react#inlineprops): the piece's `name`, its words as `text`, and its `args`, typed by what [`InlineUi`](/docs/reference/ui-hints#inlineui) declares for that name. Type a component as `InlineComponent<'stamp'>` to have its `args` typed. [The hints page](/docs/reference/react/hints#inlineui) lists the built-in pieces.

### PluginSectionComponent

`PluginSectionComponent` is the type of a component that renders a plugin's view inside a device's app. Its type is in [`PluginSectionComponent`](/docs/api/react#pluginsectioncomponent). `data` is that plugin's slice of [`view.plugins`](/docs/reference/view#view), and `with` is the section's `with`. A plugin UI registers its own in its `sections`, as the messages and feed UIs do.

## Customising

These options make the UI a game's own, below the theme's tokens. [Theme the React UI](/docs/how-to/react/theme-the-react-ui) and [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts) use them step by step.

### UiOptions

`UiOptions` is the settings [`mountGame`](/docs/reference/react#mountgame), [`GameShell`](#gameshell) and [`GameProvider`](#gameprovider) take for the UI's look and behaviour. Every field is in [`UiOptions`](/docs/api/react#uioptions).

It is two halves, for a wrapper that passes on only one. [`StyleOptions`](/docs/api/react#styleoptions) holds `components`, `classes` and `unstyled`. [`BehaviourOptions`](/docs/api/react#behaviouroptions) holds `viewer`, `keys` and `motion`.

| Field | Meaning |
|---|---|
| `unstyled` | Drops every built-in class and keeps the elements, their `data-part`s and their behaviour. `false` if left out. |
| `viewer` | Turns on the [`MediaViewer`](#mediaviewer). `true` if left out. With `false`, clicking a picture in the story does nothing. |
| `motion` | Turns on scene transitions, reveals and tumbling dice. `true` if left out. With `false`, or a player whose system asks for reduced motion, everything shows at once. |

### KeyOptions

`KeyOptions` is the keyboard shortcuts' settings, passed as `keys`. Every field is in [`KeyOptions`](/docs/api/react#keyoptions). `keys: true` turns on the built-in keys, and an object adds your own:

- **1 to 9** press the choices on screen in order: the open scene's choices, or the [`RoomActions`](#roomactions) while no scene is open. A greyed-out choice keeps its number, and its key does nothing. [Inline actions](#inlineaction) have no number.
- **Escape** opens the [`GameMenu`](#gamemenu)'s buttons in a dialog, when the menu is on screen.
- **`map`** sends a [command](/docs/reference/commands) for each key it lists, by its [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) name. These come first, so mapping `'1'` or `'Escape'` replaces it.

```tsx
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), {
  keys: { map: { w: { type: 'action', id: 'wait' } } },
})
```

The keys never fire while the player types in a field, holds Ctrl, Alt, Meta or Shift, or has a dialog open. A number key presses the [`ChoiceButton`](#choicebutton) rendered with that number, so it works in any layout that renders choices with it. A running [minigame](#minigamecard)'s keys come first, whether `keys` is on or not. Define `keys` once outside your component, since a new `map` on each render registers the listener again.

### Components

`Components` is a game's own components in place of built-in ones, by name. Its type is in [`Components`](/docs/api/react#components).

Each replacement renders everywhere the UI renders that component, with the same props plus `Default`, the built-in one. These are the names:

- **Layout**: `Game`, `Sidebar`, `Story`, `Overlay`, `Section`, `When`, `Title`, `Clock`, `StatList`, `RoomActions`, `Inventory`, `EntityTable` and `Icon`.
- **Scene**: `Scene`, `Beat`, `SceneHeader`, `BeatGroup`, `Fold`, `InlineAction`, `Tip`, `ChoiceList`, `ChoiceButton`, `PriceTag`, `InputFields`, `InputField`, `Picture`, `Video`, `LayeredPicture`, `Hotspot` and `MediaViewer`.
- **Around the story**: `Notices`, `Notice`, `NoticeStrip`, `MinigameCard`, `DiceRoll`, `DiceOverlay`, `Countdown`, `Timers`, `Changes`, `ChangeItem` and `PanelHost`.
- **Menu and pages**: `GameMenu`, `SavesMenu`, `Backlog`, `ModManager`, `TitlePage`, `SettingsPage`, `LoadPage`, `CreditsPage` and `GatePage`.

The built-in UI pieces are replaced in `inline` instead. A plugin UI adds its own names, such as `ShopCounter`, once you import its `/react`. Inside a replacement, render the built-in one through `Default`: importing it by name gives your replacement again.

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

[Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts) replaces one.

### `OverridableComponents` and `PartNames`

`OverridableComponents` is the interface of every name `components` takes, and `PartNames` is the interface of the parts plugin UIs add to [`PartKey`](#partkey). Their types are in [`OverridableComponents`](/docs/api/react#overridablecomponents) and [`PartNames`](/docs/api/react#partnames). A plugin's `/react` augments both, so `components`, `classes`, [`overridable`](#overridable) and [`usePart`](#usepart) take its names typed. [Write a plugin's React UI](/docs/how-to/react/write-a-plugins-react-ui) augments them.

### Override

`Override` is the type of one replacement in [`Components`](#components): a component that takes the built-in one's props and `Default`. Its type is in [`Override`](/docs/api/react-kit#override).

### Classes

`Classes` is Tailwind classes for parts, by `data-part` name. Its type is in [`Classes`](/docs/api/react#classes). A string is merged with the built-in classes as [`cn`](/docs/reference/react/kit#cn) merges them, so yours win where they clash. A function gets the built-in classes and returns the ones to use, so `() => 'font-serif'` replaces them.

```ts
import type { Classes } from '@ifloom/react'

const classes: Classes = {
  choice: 'rounded-none',
  'scene-title': (defaults) => `${defaults} uppercase tracking-widest`,
}
```

### PartKey

`PartKey` is a `data-part` name, one the React UI renders or one a plugin UI adds through [`PartNames`](#overridablecomponents-and-partnames). Its type is in [`PartKey`](/docs/api/react#partkey). Together they're every key [`Classes`](#classes) takes, and [React UI parts](/docs/reference/react/parts) says what each one is.

### UiProvider

`UiProvider` gives the components under it a game's `components`, `classes` and `unstyled`. Its props are in [`UiProvider`](/docs/api/react#uiprovider). [`GameProvider`](#gameprovider) has one inside it, so you need your own only to change one corner of the page. A nested provider merges its `components` and `classes` over the outer one's, and `unstyled` stays on once either turns it on.

```tsx
import { UiProvider } from '@ifloom/react'
import { QuestLog } from '@ifloom/plugin-quests/react'

<UiProvider classes={{ quest: 'border-dashed' }}>
  <QuestLog title="To do" />
</UiProvider>
```

### usePart

`usePart` returns the attributes for one part, its `data-part` and its classes, to spread onto an element. Its signature is in [`usePart`](/docs/api/react#usepart).

It works the classes out from `defaults` (the built-in ones), the game's [`classes`](#classes) for the name and `unstyled`, then adds `extra`, a `className` your caller passed. A replacement or a component of your own that uses it takes part in a game's `classes` and stylesheet.

```tsx
import { usePart, useGame } from '@ifloom/react'

function Purse() {
  const { view } = useGame()
  const attrs = usePart('stat-value', 'font-medium tabular-nums')
  return <p {...attrs}>{view.statsById.coins.text}</p>
}
```

### overridable

`overridable` returns a component that a game can replace by name in [`components`](#components), from `@ifloom/react/kit`. Its signature is in [`overridable`](/docs/api/react-kit#overridable). Every built-in component is made with it, and the name has to be a key of [`OverridableComponents`](#overridablecomponents-and-partnames). [Add panels, sections, components and hints](/docs/how-to/react/extend-the-react-ui) makes one.

### Icon

`Icon` renders one of the UI's icons by its [`IconName`](/docs/api/react-kit#iconname), from `@ifloom/react/kit`. Its props are in [`Icon`](/docs/api/react-kit#icon).

With a `label`, a screen reader reads it; without one, it's hidden from them. The built-in icons are [Lucide](https://lucide.dev)'s, and replacing `Icon` in `components` changes the set everywhere. The names say where each goes: `close` on dialogs and notices, `back` in an open app, `warning` on a choice or hotspot, `voice` on a line's replay button, `zoom` for enlarging a picture, `menu` on the phone's drawer button, and `chevron` on a section's title.

## The scene

### Scene

`Scene` renders the open scene, or the room while no scene is open. Its props are in [`Scene`](/docs/api/react#scene).

The room is a plugin's [room scene](/docs/reference/plugin-api#plugin), such as the [places](/docs/reference/plugins/places) plugin's, or else the game's title and an empty body. From top to bottom, `Scene` renders these parts:

1. The heading, a [`SceneHeader`](#sceneheader).
2. The scene's [`LayeredPicture`](#layeredpicture) when `view.scene.picture` has layers, or else its `image`, centred and at most `max-h-80` tall.
3. Each [`Beat`](#beat) of the body, a section with ui hints in a [`BeatGroup`](#beatgroup), and a block with a [`reveal`](/docs/reference/react/hints#reveal) hint in a `reveal` part that waits for it.
4. The inputs on offer while the scene is open, as [`InputField`](#inputfield)s in an `inputs` part.
5. The panel the scene holds, when a component of that name exists, else its choices as a [`ChoiceList`](#choicelist). With reveals to come, these wait in a `reveal` part with `data-reveal-choices`.

While a [minigame](/docs/reference/minigames) runs, `Scene` renders that instead: the panel named by the minigame's id, or else a [`MinigameCard`](#minigamecard). It runs the minigame's clock either way. The `<article>` carries `data-scene` with the scene's id, or `room`, and `data-minigame` while one runs.

The article sits in a `scene-transition` part and renders afresh whenever `view.scene.key` changes, playing the content's [`transition`](/docs/reference/react/hints#transition) hints. A block with a [`dice`](/docs/reference/react/hints#dice) hint gets a [`DiceRoll`](#diceroll) above it, and rolls no block names show in a [`DiceOverlay`](#diceoverlay). While the scene's speaker has a [`hue`](/docs/reference/react/hints#hue) hint, the article carries `data-speaker-hue` and `--ifloom-speaker-hue`. [`useScene`](#usescene) works all the timing out, and [Add a transition or reveal lines](/docs/how-to/add-a-transition) and [Roll dice for a check](/docs/how-to/roll-dice) use it.

A click on the scene, or any key, shows every reveal at once and does nothing else, so a number key can't press a choice that isn't shown yet. With [`motion`](#uioptions) off, everything shows at once. A scene that names a `panel` with no component shows its choices instead, with no warning.

Parts: `scene-transition`, `scene` (with `data-scene`), `scene-header`, `scene-portrait`, `scene-title`, `scene-image`, `beats`, `reveal`, `group`, `fold`, `fold-summary`, `fold-beats` and `inputs`.

[Render the scene](/docs/how-to/render/scene#render-the-scene) renders the same view in any framework.

### useScene

`useScene` returns everything [`Scene`](#scene) works out before it renders: the transition, the beats in the runs they're revealed in, the rolls and the wait. The fields are in [`SceneTiming`](/docs/api/react#scenetiming).

A scene of your own on it keeps the React UI's motion. The wait lasts as long as the last run, plus the transition in and the reveal's fade, then stops by itself. Coming back to a screen, or new rolls on the same one, start it again.

| Field | Meaning |
|---|---|
| `transition` | The screen's [`ScreenTransition`](/docs/api/react#screentransition): its `key` (`view.scene.key`, to key the element by), and how it comes `in` and goes `out`, in `ms`. The choice that led here, the snapshot's [`pressed`](/docs/reference/runner#pressed), decides how it comes in. |
| `groups` | The beats in runs, each a [`RevealGroup`](/docs/api/react#revealgroup) of [`RevealBeat`](/docs/api/react#revealbeat)s. The first run shows with the screen, and each later one has a [`RevealPoint`](/docs/api/react#revealpoint) saying when it comes. |
| `pending` | Whether runs are still to come. The choices can't be pressed until then. |
| `skip` | The function that shows everything at once. `Scene` calls it on a click or the first key. |
| `rolls` | The [`SceneRolls`](/docs/api/react#scenerolls): every roll in `view.rolls`, the `fresh` ones that tumble, and `at`, which counts each new set. A load, an undo or a redo brings no fresh rolls. |
| `unnamed` | The fresh rolls no beat on screen names, which `Scene` shows in a [`DiceOverlay`](#diceoverlay). |

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

`SceneHeader` renders the scene's heading: the speaker's portrait, when the scene has a speaker with a picture, and its title. Its props are in [`SceneHeader`](/docs/api/react#sceneheader). A replacement still comes in with the scene.

```tsx
import type { Components } from '@ifloom/react'

const components: Components = {
  SceneHeader: ({ scene }) => <h2 className="chapter">{scene.title}</h2>,
}
```

Parts: `scene-header`, `scene-portrait` and `scene-title`.

### BeatGroup

`BeatGroup` renders a section of the body that has ui hints, its beats in one `group` part. Its props are in [`BeatGroup`](/docs/api/react#beatgroup). Each hint that is a string, a number or a boolean becomes a `data-*` attribute in dashes, so `{ card: 'result' }` is `data-card="result"` and plain CSS can style the section as one box. A replacement keeps its reveals, since `Scene` works the runs out around it. [Add panels, sections, components and hints](/docs/how-to/react/extend-the-react-ui) styles a hint of a game's own.

Parts: `group`.

### Fold

`Fold` renders a section with a [`fold`](/docs/reference/react/hints#fold) hint, what [`fold()`](/docs/reference/flows#fold) writes, as a `<details>` the player opens and shuts. Its props are in [`Fold`](/docs/api/react#fold). It sits inside the section's `BeatGroup`, under `label`, the hint's words, and starts shut.

Parts: `fold`, `fold-summary` and `fold-beats`.

### useMotion

`useMotion` returns whether to play transitions and reveals: the [`motion`](#uioptions) option, unless the player's system asks for reduced motion. Its signature is in [`useMotion`](/docs/api/react#usemotion). [`useReducedMotion`](/docs/api/react#usereducedmotion) returns only the system's setting, and follows it when the player changes it. A replacement that animates anything asks one of them.

```tsx
import { useGame, useMotion } from '@ifloom/react'

function SceneTitle() {
  const { view } = useGame()
  const motion = useMotion()
  return <h2 data-transition-in={motion ? 'fade' : undefined}>{view.scene.title}</h2>
}
```

### Beat

`Beat` renders one beat of a body by its type. Its props are in [`Beat`](/docs/api/react#beat).

| Kind | Meaning |
|---|---|
| `text` | A paragraph. Its `spans` render in the line, an inline action as an [`InlineAction`](#inlineaction) and a tooltip as a [`Tip`](#tip). Bold and italics are the parts `bold` and `italic`. |
| `say` | A paragraph in `--speech` under the speaker's name, the `speaker-name` part. The player's own line is in `--player-speech` and indented. A line with a `voice` ends with a replay button while the audio player runs. A line whose beat has an `image` sits in a `line` part with the speaker's picture beside it, the `line-portrait` part, unless the [`portraits`](/docs/reference/react/hints#portraits) hint is `false`. A replacement reads the picture from the beat's `image`. |
| `image` | A [`Picture`](#picture), full width or at most `max-w-sm` for `size: 'inline'`, tilted a little by the [`tilt`](/docs/reference/react/hints#tilt) hint. |
| `video` | A [`Video`](#video), sized as a picture is. |
| `sound` | Nothing, because the audio player plays it. |
| `chose` | A choice made earlier in a [flowing scene](/docs/reference/flows): its label, small and in italics, after a `›`. |

```tsx
import { Beat } from '@ifloom/react'

<Beat beat={{ type: 'say', who: 'character', speaker: 'character:ava', name: 'Ava', text: '“Morning. What can I get you?”' }} />
```

While the viewer is on, a picture or a clip sits inside a `viewer-open` button that opens the [`MediaViewer`](#mediaviewer), labelled `ui.zoom` and the beat's alt text. A clip with controls has its own full-screen button instead. The [`Backlog`](#backlog), [`MessagesSection`](/docs/reference/plugins/messages#messagessection) and [`FeedSection`](/docs/reference/plugins/feed#feedsection) render their beats with `Beat`, so a replacement changes them all.

Parts: `beat` (with `data-beat`, and `data-who` on a spoken line), `speaker-name`, `voice-replay`, `viewer-open`, `bold` and `italic`.

### InlineAction

`InlineAction` renders an inline action in the prose, from an `action` [span](/docs/reference/prose#inlinespan), as a button inside the line that sends `choice.command`. Its props are in [`InlineAction`](/docs/api/react#inlineaction).

A price follows the words in a [`PriceTag`](#pricetag). A greyed-out one isn't `disabled`: it has `aria-disabled` and `data-disabled`, so Tab reaches it and pressing it shows the reason. The reason, a `warning` or an `irreversible` note is in a `tip-content` bubble, opened on hover, focus or a tap, and is the button's description. Inline actions have no [number key](#keyoptions).

Parts: `inline-action` (with `data-choice`, and `data-disabled`, `data-warning` and `data-irreversible` when they apply) and `tip-content`.

### Tip

`Tip` renders a tooltip in the prose, from a `tip` [span](/docs/reference/prose#inlinespan): its words as a button underlined with dots, and the note in a `tip-content` bubble with `role="tooltip"`. Its props are in [`Tip`](/docs/api/react#tip).

The bubble opens on hover, focus or a tap and closes on Escape, a tap elsewhere or the pointer leaving. The button's `aria-describedby` points at the note. The bubble sits in the page's `body`, so a scrolling panel can't clip it, and stays inside the window.

Parts: `tip` and `tip-content`.

### InlineTrigger

`InlineTrigger` renders the words of an [inline piece](/docs/reference/react/hints#inlineui) as a button in the line that opens something over the page. Its props are in [`InlineTrigger`](/docs/api/react#inlinetrigger). It has the part `inline-ui`, `data-ui` set to `name`, `aria-haspopup="dialog"` and `aria-expanded` from `open`, and focus returns to it when `open` goes back to false. The built-in `modal` and `image` use it.

### InlineModal

`InlineModal` renders the built-in `modal` piece, `[[ui:modal|words|key|title]]`, as an [`InlineTrigger`](#inlinetrigger) that opens a [`PartDialog`](#partdialog) with the prose line `key`. Its props are in [`InlineModal`](/docs/api/react#inlinemodal). The engine's [`proseBeats`](/docs/reference/prose#prosebeats) gives the line for this save, rendered in an `inline-modal` part, under `title` or else the words. A key with no prose shows the words alone. [Show a popup](/docs/how-to/show-a-popup) uses it.

### InlineImage

`InlineImage` renders the built-in `image` piece, `[[ui:image|words|path|alt]]`, as an [`InlineTrigger`](#inlinetrigger) that opens the picture in the [`MediaViewer`](#mediaviewer). Its props are in [`InlineImage`](/docs/api/react#inlineimage). The path resolves as [`[[img:…]]`](/docs/reference/prose#images) does, and `alt` falls back to the words. It opens even with `viewer: false`, because the words are the only way to see it.

### InlineMail

`InlineMail` renders the built-in `mail` piece, `[[ui:mail|body|From: Ava|Subject: Hello]]`, as a letter on a card, the part `inline-mail`. Its props are in [`InlineMail`](/docs/api/react#inlinemail). Each argument is a `mail-header` line, and the words are the `mail-body`, with their line breaks kept.

### InlineProp

`InlineProp` renders the built-in `prop` piece, `[[ui:prop|words|face]]`, as a note in the story's world in a dashed box, the part `inline-prop`. Its props are in [`InlineProp`](/docs/api/react#inlineprop). `data-face` carries the face (`sticky`, `clip` or `diary`) for a stylesheet to dress.

### InlineMono

`InlineMono` renders the built-in `mono` piece, `[[ui:mono|words]]`, in a monospace face, the part `inline-mono`, for a sign or a screen. Its props are in [`InlineMono`](/docs/api/react#inlinemono).

### Picture

`Picture` renders an `<img>` that renders nothing, and takes no space, when its file is missing or `src` is empty. Its props are an `<img>`'s, in [`Picture`](/docs/api/react#picture).

It loads lazily unless you pass `loading="eager"`, and still calls your `onError`. It remembers which `src` failed, so a new `src` on the same element gets its own chance. Its `src` goes through [`assetUrl`](#asseturl). While the game's pictures setting is off (the [`settings`](/docs/reference/react/hints#settings) hint's `images`), it renders nothing, except inside a [`KeepPicturesOn`](#keeppictureson). Every picture the UI's components render is a `Picture`.

```tsx fragment
import { Picture } from '@ifloom/react'

<Picture src={person.portrait} alt={person.name} className="size-8 rounded-full object-cover" />
```

It carries the `data-part` the component rendering it gives, such as `scene-portrait`.

### usePicturesShown

`usePicturesShown` returns whether pictures render where it's called: `false` only while the setting named in the [`settings`](/docs/reference/react/hints#settings) hint's `images` is off. Its signature is in [`usePicturesShown`](/docs/api/react#usepicturesshown). It's `true` outside a game and inside a [`KeepPicturesOn`](#keeppictureson). `Picture` and `Video` ask it.

```tsx
import { usePicturesShown } from '@ifloom/react'

function Postcard({ src }: { src: string }) {
  return usePicturesShown() ? <img src={src} alt="" /> : <p>(A postcard of the pier.)</p>
}
```

### KeepPicturesOn

`KeepPicturesOn` renders the pictures inside it whatever the pictures setting says. Its props are in [`KeepPicturesOn`](/docs/api/react#keeppictureson). `LayeredPicture` wraps itself in one, because its hotspots are part of play.

### Video

`Video` renders a video clip as a `<video playsinline>`, with `alt` as its `aria-label`. Its props are in [`VideoProps`](/docs/api/react#videoprops). The flags are a [`video` beat](/docs/reference/prose#videos)'s or a [`VideoView`](/docs/reference/media#videoview)'s, so either spreads in.

```tsx
import { Video } from '@ifloom/react'

<Video src="art/cafe/steam.mp4" poster="art/cafe/steam.jpg" autoplay loop muted controls={false} />
```

It loads nothing until it scrolls into view, then plays if `autoplay` is set and pauses when it scrolls out. Where `IntersectionObserver` is missing, it plays straight away. A clip with `muted: false` follows the [audio settings](/docs/reference/audio#audioview): muted by the mute or sound setting, at the volume of the game's `video` channel, else its `sfx` channel. Browsers refuse to start a clip with sound by itself, so give one `controls`. Its `src` and `poster` go through [`assetUrl`](#asseturl), and it renders nothing while pictures are off.

Parts: `video`.

### LayeredPicture

`LayeredPicture` renders a layered picture with hotspots, from a [`PictureView`](/docs/reference/media#pictureview). Its props are in [`LayeredPicture`](/docs/api/react#layeredpicture). [`Scene`](#scene) renders `view.scene.picture` with it, and [`LocationCard`](/docs/reference/plugins/places#locationcard) a location's picture.

```tsx
import { LayeredPicture, useGame } from '@ifloom/react'

function Room() {
  const { view } = useGame()
  return view.scene.picture ? <LayeredPicture picture={view.scene.picture} className="max-w-2xl" /> : null
}
```

The box takes the picture's `aspect`, or the first layer's own shape once it loads, and `16/9` until then. The layers stack bottom first, each filling the box with `object-fit: cover`, a [`Picture`](#picture) or a [`Video`](#video) with `data-layer`. A layer above the first needs transparent areas for the ones below to show. The [`Hotspot`](#hotspot)s go on top. [Add pictures and backgrounds](/docs/how-to/add-pictures-and-backgrounds) builds one.

Parts: `picture` and `picture-layer`.

### Hotspot

`Hotspot` renders one hotspot of a [`LayeredPicture`](#layeredpicture) as a `<button>` placed by its `rect`, in percent, that sends its `command`. Its props are in [`Hotspot`](/docs/api/react#hotspot); the hotspot is a [`HotspotView`](/docs/reference/media#hotspotview).

Its `label` is its `aria-label` and tooltip. It's invisible until the player points at it or tabs to it. A `disabled` one is dimmed, has `aria-disabled` and stays in the tab order, with its reason in `title` and read out. A `warning` shows the warning [`Icon`](#icon) in its corner.

Parts: `hotspot` (with `data-hotspot`) and `hotspot-warning`.

### MediaViewer

`MediaViewer` renders a picture or a clip from the story large over the page, in a [`Dialog`](/docs/reference/react/kit#dialog). Its props are in [`MediaViewerProps`](/docs/api/react#mediaviewerprops), and what it shows is a [`ViewerMedia`](/docs/api/react#viewermedia), an `image` or `video` beat.

[`Beat`](#beat) opens it when the player clicks a picture or a clip in a scene, the backlog, a message or a post. A layered picture's layers don't open it. Escape, a click outside and the close button (`ui.closeViewer`) close it. `viewer: false` in [`UiOptions`](#uioptions) turns it off for the whole game.

Parts: `viewer`, `viewer-close` and `dialog-overlay`.

### assetUrl

`assetUrl` returns where a picture is: its `data:` URL in a build made with [`ifloom build --inline-assets`](/docs/reference/cli#ifloom-build), and the path unchanged anywhere else. Its signature is in [`assetUrl`](/docs/api/react#asseturl). It ignores a leading `./`.

[`Picture`](#picture), [`Video`](#video) and [`DeviceScreen`](/docs/reference/plugins/devices#devicescreen) call it. A component of your own that renders a picture from a path must call it too, or use a `Picture`, because a one-file build has no `art/` folder.

```tsx
import { assetUrl } from '@ifloom/react'

function Postcard({ src }: { src: string }) {
  return <div className="h-40 bg-cover" style={{ backgroundImage: `url(${assetUrl(src)})` }} />
}
```

### ChoiceButton

`ChoiceButton` renders a [`RenderedChoice`](/docs/reference/view#renderedchoice) as a full-width button that sends its `command`. Its props are in [`ChoiceButton`](/docs/api/react#choicebutton). It renders a scene's choices, the room's actions and a character's buttons.

The button shows its label, a warning icon when the choice has a `warning`, its price as a [`PriceTag`](#pricetag), and its `irreversible` line in `--destructive`. A greyed-out choice is disabled and shows its reason. One with a warning that isn't greyed out shows the warning's words, so the player reads them first. With [`keys`](#keyoptions) on, its number shows first in a `<kbd>`. A choice's `tags` aren't rendered.

Parts: `choice` (with `data-choice`, and `data-choice-key` when keys are on), `choice-key`, `choice-label`, `choice-price`, `choice-warning`, `choice-irreversible` and `choice-reason`.

### ChoiceList

`ChoiceList` renders a column of [`ChoiceButton`](#choicebutton)s, and nothing for an empty list. Its props are in [`ChoiceList`](/docs/api/react#choicelist). `part` names it `'choices'` (the default) or `'actions'`, as [`RoomActions`](#roomactions) passes.

```tsx
import { ChoiceList, useGame } from '@ifloom/react'

function RoomButtons() {
  const { view } = useGame()
  return <ChoiceList choices={view.actions} />
}
```

Parts: `choices`, or `actions`.

### PriceTag

`PriceTag` renders a [`Price`](/docs/reference/view#price)'s `text` in `--price`, and nothing for a price with no text. Its props are in [`PriceTag`](/docs/api/react#pricetag). The text is each stat's cost, then the plugins' notes, joined by the engine's `priceSeparator` [string](/docs/reference/strings#buttons-and-labels).

Parts: `choice-price`.

## Stats, things and time

### Title

`Title` renders the game's title, `view.title`, as a heading. Its props are in [`Title`](/docs/api/react#title).

Parts: `title`.

### RoomActions

`RoomActions` renders the buttons offered while no scene is open, `view.actions`, as a [`ChoiceList`](#choicelist): the room's, the game's and the plugins' actions. Its props are in [`RoomActions`](/docs/api/react#roomactions). The default layout puts it at the bottom of the story.

Parts: `actions`.

### Clock

`Clock` renders [`view.when`](/docs/reference/view#view), the time in the plugins' words, such as `Day 3 · Wednesday afternoon`. Its props are in [`Clock`](/docs/api/react#clock). It renders nothing when no plugin says the time. The calendar's UI renders its [`CalendarClock`](/docs/reference/plugins/calendar#calendarclock) in its place.

Parts: `clock`.

### useClock

`useClock` returns the time from the running game as `{ when }`, `view.when` or `null` when no plugin says. The fields are in [`ClockState`](/docs/api/react#clockstate). The calendar's [`useCalendar`](/docs/reference/plugins/calendar#usecalendar) gives the day and the period apart.

```tsx
import { useClock } from '@ifloom/react'

function TopLine() {
  const { when } = useClock()
  return when ? <p className="text-xs uppercase">{when}</p> : null
}
```

### StatList

`StatList` renders the stats the view lists, each label beside its formatted value, such as `12 coins`. Its props are in [`StatList`](/docs/api/react#statlist). A stat the game doesn't list isn't in the view, and with no stats it renders nothing.

A stat with [`levels`](/docs/reference/stats#statlevels) shows its level in its label, the level's name from `levels.names` or else `ui.statLevel`, and a `progressbar` towards the next one (`ui.statProgress`). A stat whose [`display`](/docs/reference/react/hints#display) hint is `'bar'` gets a bar from its `min` to its `max`, and one with `'pips'` gets a pip per point, in rows of ten at most. A range over 20 renders as a bar. Both are a `meter` for screen readers.

```ts fragment
stats: [
  { id: 'energy', label: 'Energy', start: 80, max: 100, ui: { display: 'bar' } },
  { id: 'hearts', label: 'Hearts', start: 3, max: 5, ui: { display: 'pips' } },
]
```

[Build a HUD](/docs/how-to/build-a-hud) writes a bar of your own.

Parts: `stats`, `stat` (with `data-stat`), `stat-label`, `stat-value`, `stat-level`, `stat-progress`, `stat-bar`, `stat-pips` (with `--pips-per-row`) and `stat-pip` (with `data-filled`).

### EntityTable

`EntityTable` renders a table for each [kind](/docs/reference/entities#kinddef) in [`view.entities`](/docs/reference/view#entitiesview-and-entityview), headed with its `plural`. Its props are in [`EntityTable`](/docs/api/react#entitytable).

Each row is one entity: its picture, name and description, then its stats. The columns are every stat any row shows, and a row without one has a blank cell. `kinds` limits it to those kinds. It renders nothing when none has entities. The default layout leaves it out, and the café's layout puts it in the story.

```tsx
import { EntityTable } from '@ifloom/react'

<EntityTable kinds={['dish']} className="border-t pt-4" />
```

Parts: `entities` (with `data-kind`), `entity-heading`, `entity-table`, `entity-columns`, `entity-column`, `entity-row` (with `data-entity`), `entity-name`, `entity-image`, `entity-desc` and `entity-value`.

### Inventory

`Inventory` renders the things you hold, from [`view.held`](/docs/reference/view#heldview), each with its name, `×n` (`ui.heldCount`) and description. Its props are in [`InventoryProps`](/docs/api/react#inventoryprops).

The heading is `title`, else `ui.inventory`, and `false` leaves it out. It renders nothing while you hold nothing. The inventory plugin's UI renders its [`InventoryCard`](/docs/reference/plugins/inventory#inventorycard) in its place with the same props, adding use buttons and, with `drop`, a **Drop** button. This one ignores `drop`.

Parts: `inventory`, `inventory-title`, `thing` (with `data-thing` and `data-at`), `thing-name`, `thing-count` and `thing-text`.

## Inputs

### InputField

`InputField` renders one of the game's [inputs](/docs/reference/inputs), an [`InputView`](/docs/reference/view#inputview), under its label. Its props are in [`InputField`](/docs/api/react#inputfield).

A `text` or `number` input is a box and an **Enter** button (`ui.enter`) that sends [`input`](/docs/reference/commands#input), honouring `maxLength`, `min` and `max`. A `choice` input is a button per option, with the chosen one filled in. A refused value shows its reason under the field until one is accepted. The box follows the input's value when an undo or a load changes it. An empty number box sends no value, so the engine refuses it with `enterSomething`.

Parts: `input` (with `data-input`), `input-label`, `input-field`, `input-options`, `input-submit`, `input-error` and `button`.

### InputFields

`InputFields` renders an [`InputField`](#inputfield) for each input in `view.inputs` while no scene is open. Its props are in [`InputFields`](/docs/api/react#inputfields). While a scene is open it renders nothing, because [`Scene`](#scene) renders them between its words and its choices. A [lock](/docs/reference/locks) that denies `'*'` denies `input` too, so a scene that asks for a value while the game is locked lists `input` in the lock's `except`. [Ask for a name](/docs/how-to/ask-for-a-name) adds one.

Parts: `inputs`.

## What changed

### Changes

`Changes` renders the stats the last command moved, [`view.changes`](/docs/reference/changes#view), as [`ChangeItem`](#changeitem) pills such as `+30 coins`. Its props are in [`Changes`](/docs/api/react#changes).

It lists only the stats named in content's [`changes.stats`](/docs/reference/changes#changesdef), and renders nothing when the last command moved none. A `tick` that moved nothing keeps the list. The default layout leaves it out, so a layout places it, here after the scene:

::include[../../../../../snippets/react/changes.tsx]

Parts: `changes`, labelled `ui.changes`.

### ChangeItem

`ChangeItem` renders one [`ChangeView`](/docs/reference/changes#changeview) as a pill: its signed `text`, then its `name` when the view gives one. Its props are in [`ChangeItem`](/docs/api/react#changeitem). So `+30 coins` stands alone, while `+20%` reads `+20% Energy`. Its `title` says the stat's label, from what to what.

Parts: `change` (with `data-stat`, `data-of` for an entity's stat, and `data-dir` set to `up` or `down`), `change-text` and `change-label`.

## The player's menu

### GameMenu

`GameMenu` renders a row of buttons for what the runner offers, and nothing when there are none. Its props are in [`GameMenu`](/docs/api/react#gamemenu). It shows these buttons:

- **Saves** (`ui.saves`) when the runner has `saves`.
- **Backlog** (`ui.backlog`) when [`runner.offers`](/docs/reference/runner#runner)`.backlog` is on.
- **Mods** (`ui.mods`) when the provider has [`mods`](#modsoption).
- A button for each plugin UI's [`settings`](/docs/reference/react/kit#pluginui) while `pages` is off.
- **Undo** and **Redo** when `runner.offers.undo` is on, greyed out with nothing to undo or redo.
- **Settings** (`ui.settings`) and **Title screen** (`ui.titlePage`) with [`pages`](#pages) on.

Settings and Title screen switch to those pages. Saves, Backlog and Mods each open a dialog with a [`SavesMenu`](#savesmenu), a [`Backlog`](#backlog) or a [`ModManager`](#modmanager), and loading a save closes it. With [`keys`](#keyoptions) on, Escape opens the same buttons in a dialog headed `ui.menu`. The options of [`createRunner`](/docs/reference/runner#createrunner) decide which buttons the player sees.

Parts: `menu` (with `data-menu`), `menu-button`, `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### SavesMenu

`SavesMenu` renders the save and load screen over the runner's [`saves`](/docs/reference/runner#saves), and nothing when it has none. Its props are in [`SavesMenu`](/docs/api/react#savesmenu).

**Save in a new slot** (`ui.saveNew`) writes the next numbered slot, and **Import a save file** (`ui.importSave`) plays on from a `.json` file. Each slot, newest first, has **Load**, **Save**, **Export** and **Delete**, and export downloads `<game>-<slot>.json`. A save that can't be read is listed last with its reason and a **Delete** button. Saving over a slot gives it the default name, [`meta.when`](/docs/reference/saves#savemeta) or `Turn N`.

While the game's [`saveable`](/docs/reference/game#saveable) refuses, the Save buttons are greyed out with the reason from [`view.saving`](/docs/reference/view#savingview), and the menu carries `data-saving="blocked"`. A save made with mods or plugins this game lacks still loads, with a line naming them. `onLoaded` runs after a load or an import.

Parts: `saves` (with `data-saves`), `saves-actions`, `save-slot` (with `data-save-slot`), `save-name`, `save-details`, `saves-message`, `saves-blocked`, `saves-empty`, `file-button` and `button`.

### useSaves

`useSaves` returns the save slots from the running game and the functions [`SavesMenu`](#savesmenu) uses on them, for a save screen of your own. The fields are in [`SavesState`](/docs/api/react#savesstate).

`available` is `false` when the runner has no `saves`, and then nothing does anything. Each function resolves to whether it worked, and `message` says why the last one failed. While `saving.allowed` is `false`, `save` and `overwrite` are refused with the reason. `broken` lists the saves that can't be read, which only `remove` takes.

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

[Render a save and load screen](/docs/how-to/render/saves-and-settings#render-a-save-and-load-screen) renders one in any framework.

### Backlog

`Backlog` renders the runner's [backlog](/docs/reference/runner#backlogentry), oldest first, in a [`ScrollArea`](/docs/reference/react/kit#scrollarea). Its props are in [`Backlog`](/docs/api/react#backlog). Each entry shows its title and its beats as [`Beat`](#beat)s, then **You chose: …** (`ui.chose`) when the player made a choice there. It shows `ui.backlogEmpty` while empty, which it always is unless the runner was made with `backlog`.

Parts: `backlog`, `backlog-entry` (with `data-backlog`), `backlog-title`, `backlog-choice` and `backlog-empty`.

### useBacklog

`useBacklog` returns the backlog's entries, oldest first, from the runner's [snapshot](/docs/reference/runner#runnersnapshot). Its signature is in [`useBacklog`](/docs/api/react#usebacklog). It's empty unless the runner was made with `backlog`.

```tsx
import { useBacklog } from '@ifloom/react'

function LastChoice() {
  const last = useBacklog().findLast((entry) => entry.chose)
  return last ? <p className="text-sm">Last time: {last.chose}</p> : null
}
```

### ModManager

`ModManager` renders the mods screen over the provider's [`ModsOption`](#modsoption), and nothing without one. Its props are in [`ModManager`](/docs/api/react#modmanager).

**Add a mod file** (`ui.addMod`) reads a `.json` file through the store's [`add`](/docs/reference/mods#mods), and shows the store's reason when it can't. Each mod, in name order, shows its name, version and description, an **On**/**Off** button with `aria-pressed`, a **Delete** button, and its `problems`. After a change, **Restart with these mods** (`ui.applyMods`) calls `onChange`. [`GameMenu`](#gamemenu) and the [`SettingsPage`](#settingspage) open it.

A change takes effect only after the restart, since the running game was built with the mods as they were. The problems shown are the ones from start-up, so a new mod shows none until then. [Let players add mods](/docs/how-to/let-players-add-mods) sets it up.

Parts: `mods` (with `data-mods`), `mod` (with `data-mod`), `mod-name`, `mod-version`, `mod-state`, `mod-text`, `mod-problem`, `mods-message`, `mods-empty`, `mods-restart`, `mods-changed`, `file-button` and `button`.

### useMods

`useMods` returns the mods from the provider's `mods` and the functions [`ModManager`](#modmanager) uses on them. The fields are in [`ModsState`](/docs/api/react#modsstate). `available` is `false` without `mods`, `changed` says whether a restart would differ, and `message` says why the last change failed.

## Pages

With `pages` on, the game opens on a title screen, and the shell with the story is the `game` page. The other pages are `gate`, `title`, `load`, `settings` and `credits`, any a plugin UI adds, such as `achievements`, and any in `PagesOptions.pages`. [Add a title screen](/docs/how-to/add-a-title-screen) and [Add pages around the game](/docs/how-to/add-pages-around-the-game) set them up.

### PagesOptions

`PagesOptions` is the settings `pages` takes on [`mountGame`](/docs/reference/react#mountgame) and [`GameShell`](#gameshell), and `pages: true` is `{}`. Every field is in [`PagesOptions`](/docs/api/react#pagesoptions).

| Field | Meaning |
|---|---|
| `gate` | The [`GateOptions`](/docs/api/react#gateoptions) of a notice shown before the title screen, rendered by [`GatePage`](#gatepage). |
| `pages` | The game's own pages by id, each a [`PageDef`](/docs/api/react#pagedef). Each gets a title-screen button labelled `label` unless `showOnTitle` is `false`, and its `component` renders as the whole page. One with a plugin UI's page id replaces it. |

```tsx
import { mountGame, usePage } from '@ifloom/react'
import module from './game.ts'

function Postcards() {
  const { back } = usePage()
  return (
    <section>
      <h1>Postcards from the seaside</h1>
      <button onClick={back}>Back</button>
    </section>
  )
}

mountGame(module.build(), {
  pages: {
    subtitle: 'A new flat, a new town',
    pages: { postcards: { label: 'Postcards', component: Postcards } },
  },
})
```

### usePage

`usePage` returns the [`Page`](/docs/api/react#page) on show and the functions that move between pages. The fields are in [`PageState`](/docs/api/react#pagestate).

`go(page)` shows a page: `title`, `game` and `gate` start afresh, and any other goes on top. `back()` returns to the page under this one, or the title screen. `enabled` is `false` without `pages`, and then `page` is always `'game'`. `go('game')` only switches page, so start a game with [`runner.newGame`](/docs/reference/runner#newgame) or a load first.

### TitlePage

`TitlePage` renders the game's title, the `subtitle` and `art`, and a column of buttons each carrying `data-title-button`. Its props are in [`TitlePage`](/docs/api/react#titlepage). It shows these buttons:

- **Continue** (`ui.continue`) loads the newest save, when there is one.
- **New game** (`ui.newGame`) calls [`runner.newGame()`](/docs/reference/runner#newgame).
- **New Game+** (`ui.newGamePlus`) when the game declares [`carryOver`](/docs/how-to/offer-new-game-plus) and the profile's `core:finished` is set.
- **Load** (`ui.load`) when the runner has `saves`.
- **Settings** (`ui.settings`) when the game has a setting, a plugin UI's settings or mods.
- A button for each added page whose `showOnTitle` isn't `false`.
- **Credits** (`ui.credits`) when the game's [`credits`](/docs/reference/credits) name someone.

The first button is the main one. Parts: `title-page` (with `data-page="title"`), `title-art`, `title-name`, `title-subtitle`, `title-buttons` and `title-button`.

### SettingsPage

`SettingsPage` renders [`view.settings`](/docs/reference/view#settingview): a checkbox for a toggle, radio buttons for a choice, and a slider for a range. Its props are in [`SettingsPage`](/docs/api/react#settingspage).

Each change goes through [`runner.setSetting`](/docs/reference/runner#setsetting), which writes a ui setting to the profile and sends a play setting as a [`setting`](/docs/reference/commands#setting) command. A refused change shows its reason. The plugin UIs' [`settings`](/docs/reference/react/kit#pluginui) follow the list, then, with `mods`, a Mods section with the [`ModManager`](#modmanager). It says `ui.noSettings` when there's nothing to show. [Add a settings page](/docs/how-to/add-a-settings-page) declares the settings.

Parts: `settings-page`, `page-heading`, `settings`, `setting` (with `data-setting` and `data-affects`), `setting-label`, `setting-control`, `setting-value`, `settings-empty`, `settings-message`, `settings-mods`, `mods-title`, `mods-hint` and `page-back`.

### LoadPage

`LoadPage` renders every save, newest first, with a Load button each, a Delete button for one that can't be read, and an import button. Its props are in [`LoadPage`](/docs/api/react#loadpage). Loading goes to the game. Unlike [`SavesMenu`](#savesmenu), it can't save, since there may be no game in play.

Parts: `load-page`, `page-heading`, `saves`, `save-slot`, `save-name`, `save-details`, `saves-message`, `saves-empty`, `file-button`, `button` and `page-back`.

### CreditsPage

`CreditsPage` renders the game's [credits](/docs/reference/credits) from [`creditsOf`](/docs/reference/credits#creditsof), with a Back button. Its props are in [`CreditsPage`](/docs/api/react#creditspage). Each group has its title and description, and each credit shows its picture, its name, its role, then its description and licence. A credit with an `href` shows its name as a link, which opens in a new tab.

Parts: `credits-page`, `page-heading`, `credits`, `credit-group` (with `data-credit-group`), `credit-group-title`, `credit-group-description`, `credit-list`, `credit`, `credit-art`, `credit-name`, `credit-link`, `credit-role`, `credit-meta` and `page-back`.

### GatePage

`GatePage` renders the notice from `PagesOptions.gate` that the player confirms before the title screen, such as a content note. Its props are in [`GatePage`](/docs/api/react#gatepage). Every word on it is the game's, and the `text` splits into paragraphs on blank lines.

```tsx
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), {
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

Confirming stores `{ confirmedAt }` in the profile's `ui:gate` and goes to the title screen, so the gate shows once per device. Declining follows `href`, or does nothing without one. Without a profile the gate shows every time, and [`mountGame`](/docs/reference/react#mountgame) always has one.

Parts: `gate-page`, `gate-title`, `gate-text`, `gate-buttons`, `gate-confirm` and `gate-decline`.

### useSetting

`useSetting` returns a setting's value from the running game, as the snapshot's [`settings`](/docs/reference/runner#settings) holds it. Its signature is in [`useSetting`](/docs/api/react#usesetting). A ui setting's value comes from the profile and re-renders when it changes. A stored value that no longer suits the setting gives its default, and a setting the game doesn't declare gives `undefined`.

```tsx
import { useSetting } from '@ifloom/react'

function Story({ children }: { children: React.ReactNode }) {
  const size = useSetting('textSize')
  return <div className={size === 'large' ? 'text-lg' : undefined}>{children}</div>
}
```

### TextSize

`TextSize` copies the setting named in the [`settings`](/docs/reference/react/hints#settings) hint's `textSize` to `data-text-size` on `<html>`, and renders nothing. Its signature is in [`TextSize`](/docs/api/react#textsize). `GameShell` has one, so you need it only under a `GameProvider` of your own.

### useProfile

`useProfile` returns what the [profile](/docs/reference/profile) holds in a namespace, kept current as it's written. Its signature is in [`useProfile`](/docs/api/react#useprofile). It's `undefined` before the first read and without a profile. The title screen reads `useProfile('core:finished')` to offer New Game+.

```tsx fragment
const settings = useProfile<Record<string, unknown>>('core:settings')
```

## Around the story

### Notices

`Notices` renders the first `limit` (3 if left out) of the view's unseen [notices](/docs/reference/notices), each a [`Notice`](#notice), in a list with `role="status"`. Its props are in [`Notices`](/docs/api/react#notices). Under 48rem it shows the newest only, with a `notices-more` button (`ui.noticesMore`) for the rest. The default layout puts it in the [`Overlay`](#overlay).

```tsx
import { Notices } from '@ifloom/react'

<Notices limit={1} className="fixed top-4 left-1/2 w-96 -translate-x-1/2" />
```

Parts: `notices` and `notices-more`.

### Notice

`Notice` renders one [notice](/docs/reference/notices#notice): its picture, title and text, and a close button (`ui.dismiss`) that sends [`dismiss`](/docs/reference/commands#dismiss). Its props are in [`Notice`](/docs/api/react#notice). [Show a notice](/docs/how-to/show-a-notice) sends one.

```tsx
import type { Components } from '@ifloom/react'

const components: Components = {
  Notice: ({ notice, Default }) => (notice.image ? <Default notice={notice} /> : <p className="text-sm italic">{notice.title}</p>),
}
```

Parts: `notice` (with `data-notice`), `notice-image`, `notice-title`, `notice-text` and `notice-dismiss`.

### NoticeStrip

`NoticeStrip` renders a row of counts for what's waiting, each a button that opens where it is, in a `<nav>` labelled `ui.unread`. Its props are in [`NoticeStrip`](/docs/api/react#noticestrip).

**Notices** (`ui.notices`) counts the unseen notices and opens them in a dialog with **Mark all seen** (`ui.allSeen`). The plugin UIs' `strip` parts follow, such as the devices plugin's [`DeviceStrip`](/docs/reference/plugins/devices#devicestrip). It hides while nothing in it renders. The default layout leaves it out.

```tsx fragment
<Story>
  <NoticeStrip />
  <Scene />
</Story>
```

Parts: `notice-strip`, `notice-strip-item` (with `data-strip`, `notices` or the device and app ids) and `badge`.

## Dice, timers and minigames

### DiceRoll

`DiceRoll` renders one [`Roll`](/docs/reference/rolls#roll) from [`view.rolls`](/docs/reference/rolls#view): the dice, a face for each die, what was added, and once they settle, the total and with a target, its outcome. Its props are in [`DiceRollProps`](/docs/api/react#dicerollprops).

With `animate` (the default), the faces tumble for a second before they settle; the roll was made already. With [`motion`](#uioptions) off, it shows settled. A `status` region reads the result once the dice settle, worded by `ui.diceRolled`. [`Scene`](#scene) renders one above a block with a [`dice`](/docs/reference/react/hints#dice) hint. [Roll dice for a check](/docs/how-to/roll-dice) shows one.

```tsx
import { DiceRoll, useGame } from '@ifloom/react'

function LastRolls() {
  const { view } = useGame()
  return view.rolls.map((roll, at) => <DiceRoll key={at} roll={roll} animate={false} />)
}
```

Parts: `dice` (with `data-roll`, `data-state`, `data-passed` and `data-critical`), `dice-label`, `dice-faces`, `dice-face` (with `data-rolling`, `data-high` and `data-low`), `dice-plus`, `dice-total`, `dice-outcome` and `dice-critical`.

### DiceOverlay

`DiceOverlay` renders rolls the story doesn't name for a moment near the top of the window, a `DiceRoll` each. Its props are in [`DiceOverlay`](/docs/api/react#diceoverlay). It goes about two and a half seconds after the dice settle, or on its close button (`ui.diceDismiss`). [`Scene`](#scene) renders one for the fresh rolls no block's `dice` hint names, and a replacement of `() => null` shows none.

Parts: `dice-overlay` and `dice-dismiss`.

### Countdown

`Countdown` renders one running [timer](/docs/reference/timers) by id: its label, a bar that empties, and the seconds left (`ui.timerLeft`). Its props are in [`CountdownProps`](/docs/api/react#countdownprops).

The bar is a `progressbar` from 0 to the timer's `total`, labelled with its label. With a quarter or less left, the parts carry `data-urgent`. With [`motion`](#uioptions) off, only the seconds show. It renders nothing while the timer isn't running. A block with a [`timer`](/docs/reference/react/hints#timer) hint gets one under it, and a replacement changes that one too. [Add a countdown](/docs/how-to/add-a-countdown) starts a timer.

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

Parts: `timer` (with `data-timer` and `data-urgent`), `timer-label`, `timer-bar` and `timer-left`.

### Timers

`Timers` renders a [`Countdown`](#countdown) for every running timer, in the order they started, in a `timers` part. Its props are in [`Timers`](/docs/api/react#timers). The default layout leaves it out. [`GameProvider`](#gameprovider) runs the clock that ticks the timers, so a timer runs out on time whether or not anything renders it.

### `useTimer` and `useTimers`

`useTimers` returns [`view.timers`](/docs/reference/timers#view), and `useTimer` one [`TimerView`](/docs/reference/timers#timerview) from it by id, or `null` while that timer isn't running. Their signatures are in [`useTimer`](/docs/api/react#usetimer) and [`useTimers`](/docs/api/react#usetimers).

```tsx
import { useTimer } from '@ifloom/react'

function RingingPhone() {
  const ringing = useTimer('flat.ring')
  if (!ringing) return null
  return <span className="phone" style={{ opacity: 0.4 + (0.6 * ringing.left) / ringing.total }}>☎</span>
}
```

### MinigameCard

`MinigameCard` renders the running [minigame](/docs/reference/minigames), [`view.minigame`](/docs/reference/minigames#minigameview): its title, the state's `label` in a live region, a bar for the state's timer, and a button per live input. Its props are in [`MinigameCard`](/docs/api/react#minigamecard).

Each button sends [`{ type: 'minigame', input }`](/docs/reference/commands#minigame). The card maps the keyboard to the inputs: the keys the minigame lists, else the arrows, the space bar or an input's own letter. These keys work whether `keys` is on or not, and a held key doesn't repeat. A component in `panels` under the minigame's id replaces it for that minigame only. [Build a minigame](/docs/how-to/build-a-minigame) writes one.

Parts: `minigame` (with `data-minigame` and `data-state`), `minigame-title`, `minigame-state`, `minigame-timer`, `minigame-inputs` and `minigame-input` (with `data-input`).

### useMinigame

`useMinigame` returns the running minigame, or `null`, and `send`, which presses one of its inputs and returns the runner's result. The fields are in [`MinigameControls`](/docs/api/react#minigamecontrols). With `keys: true`, it maps the keyboard as [`MinigameCard`](#minigamecard) does.

Calling it runs the game's clock, one per runner, which sends a [`tick`](/docs/reference/commands#tick) about every 100 ms with the real time since the last. The clock pauses while the page is hidden, so a minigame waits for a player who looked away. [`Scene`](#scene) calls it while a minigame runs, so a root that leaves out `Scene` calls it itself.

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

## Panels

A [panel](/docs/reference/panels) is a named piece of UI that content opens over the story. The React UI renders its own, and each plugin UI the game lists brings its own, such as `shopUi`'s `shop`. [Open a panel](/docs/how-to/open-a-panel) opens one.

### PanelHost

`PanelHost` renders the open panel, [`view.panel`](/docs/reference/panels#view), in a [`PartDialog`](#partdialog), and closing the dialog sends [`closePanel`](/docs/reference/commands#closepanel). Its signature is in [`PanelHost`](/docs/api/react#panelhost).

It renders the game's own [`panels`](#panelcomponent) component of that name, else a listed plugin UI's, else a [built-in one](#built-in-panels), with the panel's `with` as `data`. A scene's own panel renders in the scene instead. The dialog's title is `with.title`, else the plugin UI's [title](/docs/reference/react/kit#pluginpanel), else the panel's name. A name nothing renders shows nothing, though the panel stays open in the state.

```tsx
import { mountGame } from '@ifloom/react'
import module from './game.ts'

function Noticeboard({ data }: { data: unknown }) {
  return <p>Lost: one grey cat, answers to Biscuit.</p>
}

mountGame(module.build(), { panels: { noticeboard: Noticeboard } })
```

Parts: `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`, with the panel in a `div` carrying `data-panel`.

### Built-in panels

The built-in panels are the ones [`PanelHost`](#panelhost) renders by name for what the engine keeps. A plugin UI's or the game's panel of the same name replaces one.

| Name | Meaning |
|---|---|
| `inventory` | The [`Inventory`](#inventory) without its heading, or the inventory plugin's [`InventoryCard`](/docs/reference/plugins/inventory#inventorycard) when the game lists its UI. |
| `stats` | The [`StatList`](#statlist). |

The first-party plugins' panels are on their pages: `shop`, `jobs`, `wardrobe`, `quests`, `people`, `achievements` and `statuses`.

### PartDialog

`PartDialog` renders a [`Dialog`](/docs/reference/react/kit#dialog) with the UI's `dialog` parts, as the menu, `PanelHost` and the plugin UIs do, from `@ifloom/react/kit`. Its props are in [`PartDialog`](/docs/api/react-kit#partdialog). It's open while `open` is true, titled `title`, and calls `onClose` when the player closes it.

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

`useAudio` plays the game's sound with the [audio player](/docs/reference/browser/audio-player) while the component is mounted, and returns the player, or `null` until it starts. Its signature is in [`useAudio`](/docs/api/react#useaudio).

Inside a [`GameProvider`](#gameprovider) it uses that runner, and outside one it takes `runner`. The other options go to [`startAudio`](/docs/reference/browser/audio-player#audiooptions). [`GameShell`](#gameshell) and `mountGame` start a player themselves, so you need it only under a `GameProvider` of your own, and one beside theirs takes over from it. [Add music and sound](/docs/how-to/add-music-and-sound) starts one.

```tsx given
import { GameProvider, useAudio } from '@ifloom/react'
import { MyPage } from './my-page.tsx'

function Sound() {
  useAudio({ log: console.debug })
  return null
}

export const App = () => (
  <GameProvider runner={runner}>
    <Sound />
    <MyPage />
  </GameProvider>
)
```

## Words

### `UiStringKey`, `Words` and `Say`

`UiStringKey` is a key of the UI's own English words, without the `ui.` prefix, and [The React UI](/docs/reference/react#strings) lists them. Their types are in [`UiStringKey`](/docs/api/react#uistringkey), [`Words`](/docs/api/react#words) and [`Say`](/docs/api/react#say). A `Words` is a table of words by key, such as a plugin UI's `SHOP_WORDS`. A `Say` is the function that words a key with its `{name}` values filled in.

### useWords

`useWords` returns the game's word for a key from the running game: `game.strings['ui.' + key]`, or the English. Its signature is in [`useWords`](/docs/api/react#usewords). It fills each `{name}` from `vars`, and says a key nothing has as written. Given a plugin UI's table, it says that table's keys too, typed. A plugin's own UI gets its words from [`usePlugin`](/docs/reference/react/kit#useplugin) instead.

```tsx
import { useWords } from '@ifloom/react'
import { QUESTS_WORDS } from '@ifloom/plugin-quests/react'

function JournalHeading() {
  const words = useWords(QUESTS_WORDS)
  return <h3>{words('quests')}</h3>
}
```
