---
title: "Make it your own"
description: Give an IFLoom game drawn with the React UI a look of its own, from a theme preset and a few CSS variables up to replacing components, the page frame or the whole root.
---
You can change how the React UI looks at any depth, from swapping one colour to drawing every screen yourself. This page goes from the smallest change to the biggest. Start at the top and stop when the game looks the way you want.

1. [Pick a theme preset](#1-pick-a-theme-preset)
2. [Set tokens and colours](#2-set-tokens-and-colours)
3. [Style parts with plain CSS](#3-style-parts-with-plain-css)
4. [Change the built-in classes](#4-change-the-built-in-classes)
5. [Rearrange the parts](#5-rearrange-the-parts)
6. [Replace a component](#6-replace-a-component)
7. [Replace the frame](#7-replace-the-frame)
8. [Write your own root](#8-write-your-own-root)
9. [Use another framework](#9-use-another-framework)

The first three steps are CSS only. The rest are options you pass to [`mountGame`](/docs/react#mountgame) (or to [`GameShell`](/docs/react#gameshell) and [`GameProvider`](/docs/react/components#gameprovider), which take the same ones).

## 1. Pick a theme preset

A preset is a stylesheet that changes the fonts, the sizes, the colours and the shape of the page. Import one after the UI's own stylesheet:

```css
/* src/styles.css */
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/storybook.css";
```

| Preset | What it looks like |
|---|---|
| `paper` | A printed book. A serif page in one centred column, chapter titles in small caps, choices as underlined lines of text rather than buttons, and the stats as a quiet line at the foot. The Letter (`examples/novel`) uses it. |
| `terminal` | A green-screen text adventure. Monospace throughout, light text on black, no rounded corners, choices as a numbered prompt list, and notices as a status line across the top of the page, which pushes the rest down rather than covering it. |
| `studio` | A clean, modern app. Cards on a soft grey page, the side column on the right, generous spacing, bold headings and choices as raised cards. The Corner Café (`examples/cafe`) uses it. |
| `storybook` | Soft and friendly. Rounded type, a warm tinted page, big pill buttons, and dialogue in speech bubbles. Small Town (`examples/showcase`) uses it. |

[`ifloom new`](/docs/cli#ifloom-new) writes this import for you. Pass `--theme paper` (or any of the four) to choose one. Leave it out and a blank game gets one at random, so two new games don't start out looking the same.

Without a preset, you get the UI's plain default look: a system sans-serif, neutral colours and the side column on the left.

Each preset is plain CSS that sets the [tokens](#2-set-tokens-and-colours) and styles a few [parts](#3-style-parts-with-plain-css). Read the one you picked in `node_modules/@ifloom/react/src/themes/` to see what it changes. It's a good starting point for a preset of your own.

## 2. Set tokens and colours

Everything the UI draws takes its fonts, sizes, gaps and colours from CSS variables. Set them in `:root`, after the imports:

```css
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/storybook.css";

:root {
  --primary: oklch(0.55 0.12 230);
  --font-heading: Georgia, "Times New Roman", serif;
  --width-sidebar: 20rem;
  --gap-beats: 1.25rem;
}
```

These are the design tokens:

| Token | What it sets | Default |
|---|---|---|
| `--font-body` | The font for everything. The UI's `font-body` class. | The system sans-serif |
| `--font-heading` | The game's title, scene titles and panel headings. | `var(--font-body)` |
| `--text-title` | The size of the game's title. | `1.125rem` |
| `--text-scene-title` | The size of a scene's title. | `1.5rem` |
| `--leading-prose` | The line height of a scene's text. | `1.625` |
| `--shadow-card` | The shadow under notices. The presets use it for their cards too. | A soft drop shadow |
| `--width-page` | How wide the page grows with a side column. | `72rem` |
| `--width-reading` | How wide the page grows without one. | `42rem` |
| `--width-sidebar` | The side column's width on a wide screen. | `18rem` |
| `--width-notice` | The width of the notices in the bottom corner. | `20rem` |
| `--gap-page` | The space between the side column and the stage, and between parts on the stage. | `1.5rem` |
| `--gap-beats` | The space between the paragraphs and lines of a scene. | `0.75rem` |

And these are the colours. They're shadcn/ui's, plus three of the UI's own at the end:

| Variables | What they colour |
|---|---|
| `--background`, `--foreground` | The page and its text. |
| `--card`, `--card-foreground` | Cards, notices, letters in a scene. |
| `--popover`, `--popover-foreground` | Tooltips and popovers. |
| `--primary`, `--primary-foreground` | Primary buttons, badges, the player's side of a message thread. |
| `--secondary`, `--secondary-foreground` | Choice buttons, the other side of a message thread. |
| `--muted`, `--muted-foreground` | Quiet text: tags, stat labels, the reason a button is greyed out. |
| `--accent`, `--accent-foreground` | Hovered buttons and app icons. |
| `--destructive`, `--destructive-foreground` | App badges, errors, and a choice's `irreversible` line. |
| `--border`, `--input`, `--ring` | Borders, inputs, the focus ring. |
| `--radius` | Corner rounding. The smaller and larger radii are worked out from it. |
| `--speech` | A character's spoken line. |
| `--player-speech` | The player's spoken line. |
| `--price` | A price on a button. |

Each colour is also a Tailwind colour, so `text-speech`, `bg-primary` and `border-border` work in your own components. The same goes for the tokens: `font-heading`, `text-scene-title` and `shadow-card` are classes you can use.

**Dark mode.** The stylesheet has a light set of colours and a dark set. The dark one applies inside an element with the class `dark`, as in shadcn/ui. Put `class="dark"` on `<html>` to turn it on, and set your own dark colours under `.dark`:

```css
.dark {
  --primary: oklch(0.75 0.1 230);
}
```

A preset sets its colours on `:root`, and they apply whether `dark` is on or not. `terminal` is dark already. To give another preset a dark version, write your `.dark` colours after its import, so they come later and win.

### Fonts

The tokens name fonts that are already on the player's computer: system stacks such as `ui-serif, Georgia, serif`. That's on purpose. A built game opens from disk and can't fetch anything while it runs, so a font from Google Fonts or another server won't load.

To use a font file, put it in your game's `src` folder and point an `@font-face` at it with a relative URL. Vite bundles it with the game when it builds:

```css
@font-face {
  font-family: "Riverside";
  src: url("./fonts/riverside.woff2") format("woff2");
  font-display: swap;
}

:root {
  --font-heading: "Riverside", Georgia, serif;
}
```

Check the font's licence lets you ship it inside a game.

## 3. Style parts with plain CSS

Every element the UI draws carries a `data-part` attribute naming what it is: `scene-title`, `choice`, `stat-value`, `notice` and so on. Write ordinary CSS against them:

```css
[data-part="scene-title"] {
  font-variant: small-caps;
  letter-spacing: 0.04em;
}

[data-part="choice"] {
  border-radius: 0;
  border-left: 4px solid var(--primary);
}

/* The player's own lines, set apart */
[data-part="beat"][data-beat="say"][data-who="player"] {
  font-style: italic;
}

/* Ava's name in the café's colour */
[data-part="person"][data-person="ava"] [data-part="person-name"] {
  color: oklch(0.5 0.12 40);
}

/* Low energy shows in red */
[data-part="stat"][data-stat="energy"] [data-part="stat-value"] {
  color: var(--destructive);
}
```

Some parts carry a second attribute that says more:

| Attribute | On | Values |
|---|---|---|
| `data-beat` | Every `beat`, and a video beat's `video` | The beat's kind: `text`, `mono`, `say`, `image`, `video`, `mail` or `prop`. |
| `data-who` | A `say` beat | `character` or `player`. |
| `data-face` | A `prop` beat | The prop's face, such as a sign or a note. |
| `data-from` | Every `bubble` | `them` or `player`. |
| `data-has-sidebar` | The `page` | Present when the layout has a side column. |
| `data-frame` | A device's `dialog` | The device's frame: `phone`, `laptop`, or a name of the game's own. |
| `data-icon` | Every `app-icon` | The app's icon name, for a stylesheet to map to a picture. |
| `data-layer` | Every `stage-layer` | The layer's id, when it has one. |
| `data-hotspot` | Every `hotspot` | The hotspot's id. |

The older identity attributes are still there too: `data-choice`, `data-stat`, `data-person`, `data-exit`, `data-item`, `data-quest` and the rest, each holding the id of what it shows. [Components](/docs/react/components#identity-attributes) lists them all. The full list of parts is in the [reference](#the-data-part-reference) at the end of this page.

### Why your CSS wins

You don't need `!important` or long selectors to beat the built-in look. Tailwind puts all of its classes in a [cascade layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) called `utilities`, and CSS that isn't in any layer beats CSS that is, whatever its specificity. Your stylesheet and the presets aren't in a layer, so `[data-part="choice"] { border-radius: 0 }` wins over the button's `rounded-md`.

**Gotcha.** If you put your own rules inside an `@layer` (such as `@layer components`), they're layered too, and Tailwind's `utilities` layer comes after them and wins. Leave your overrides outside any layer.

## 4. Change the built-in classes

Plain CSS adds to the look. When you'd rather change the Tailwind classes themselves, pass `classes`, keyed by the same `data-part` names:

```ts
import { mountGame, type Classes } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

const classes: Classes = {
  // A string is merged with the built-in classes, and yours win where they clash.
  'scene-title': 'text-3xl tracking-tight',
  choice: 'rounded-none',
  // A function gets the built-in classes and returns the ones to use, so this replaces them.
  stats: () => 'flex flex-wrap gap-x-4 text-xs uppercase',
}

mountGame(game, { classes })
```

A string is merged with [tailwind-merge](https://github.com/dcastil/tailwind-merge), the same way [`cn`](/docs/react/components#cn) works. `rounded-none` replaces the button's `rounded-md`, and every other class stays. A function `(defaults) => string` is given the built-in classes as one string and returns what to use instead. Return a new string to replace them, or build on the old one.

Every part named in the [reference](#the-data-part-reference) takes classes. When several elements share a name, such as `button` or `beat`, the classes go on all of them.

### unstyled

To start from nothing, pass `unstyled: true`. Every built-in class goes. The elements, their `data-part`s and their behaviour stay, ready for your own CSS or your own `classes`:

```ts
mountGame(game, {
  unstyled: true,
  classes: {
    page: 'mx-auto max-w-prose p-6',
    choice: 'block w-full py-2 text-left underline-offset-4 hover:underline',
  },
})
```

With `unstyled`, a string in `classes` is all the part gets, as there's nothing left to merge with.

**Gotchas.**

- **A few inner wrappers keep their classes.** Elements with no `data-part` of their own, such as the span that holds a choice's label text or the list inside the saves menu, keep their small layout classes. So do the shadcn/ui primitives inside a part, such as the backlog's scroll area, and screen-reader-only text stays hidden.
- **The variables stay.** `unstyled` drops classes, not the theme. Your page still has its background and text colour from the stylesheet.

### Bringing your own Tailwind

`@ifloom/react/styles.css` imports Tailwind, the UI's theme, and a little base CSS for the page. If your game has its own Tailwind set-up, import `@ifloom/react/theme.css` instead. It has the tokens, the colours, dark mode and the `@source` line that makes Tailwind scan the UI's components, but no `@import "tailwindcss"`:

```css
@import "tailwindcss";
@import "@ifloom/react/theme.css";
```

To leave out Tailwind's preflight (its CSS reset), import its theme and utilities on their own:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "@ifloom/react/theme.css";
```

`theme.css` doesn't set the page's background or text colour, or the default border colour. `styles.css` does that, so add it yourself if you want it:

```css
body {
  background: var(--background);
  color: var(--foreground);
}
```

## 5. Rearrange the parts

The page has three regions: the side column, the stage and an overlay that floats at the bottom of the window and sits after the content at the end of the page. `layout` says which parts go in each, in order:

```ts
import { mountGame } from '@ifloom/react'
import game from './game.ts'

mountGame(game, {
  layout: {
    sidebar: ['title', 'stats', 'menu', 'devices', 'location', 'people', 'actions'],
    stage: ['notices', 'scene', 'inputs', 'quests'],
    overlay: [],
  },
})
```

This puts the notices at the top of the stage instead of in the bottom corner, and leaves the inventory and the wardrobe out. The parts and the default lists are on [The React UI](/docs/react#layouts). Your own components can go in any list too.

**Gotcha.** A list you leave out keeps its default, except `sidebar`, which becomes no side column. The default overlay is `['notices']`, so moving `'notices'` to the stage without `overlay: []` draws them twice.

`layout` decides what goes where, not the shape of the page. To put the side column on the right, use CSS (`studio` does it with an `order` and a grid template on `[data-part="page"][data-has-sidebar]`). For a header bar or another shape entirely, [replace the frame](#7-replace-the-frame).

## 6. Replace a component

Every built-in component can be replaced by name, everywhere it's drawn. Pass your own in `components`. It gets the same props as the built-in one, plus `Default`, the built-in one itself, so you can hand back any case you don't want to change.

Here a game draws its spoken lines and letters its own way and leaves the other beats alone:

```tsx
// src/main.tsx
import type { SceneBeat } from '@ifloom/engine'
import { mountGame, usePart, type Components, type Override } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

const TownBeat: Override<{ beat: SceneBeat }> = ({ beat, Default }) => {
  const line = usePart('beat', 'border-l-2 border-speech pl-4 leading-prose italic')
  const letter = usePart('beat', 'mx-auto max-w-md rotate-1 bg-card p-6 font-heading shadow-card')
  if (beat.kind === 'say' && beat.who === 'character') {
    return (
      <blockquote {...line} data-beat="say" data-who="character">
        {beat.text}
      </blockquote>
    )
  }
  if (beat.kind === 'mail') {
    return (
      <article {...letter} data-beat="mail">
        <p className="whitespace-pre-wrap">{beat.body}</p>
      </article>
    )
  }
  return <Default beat={beat} />
}

const components: Components = { Beat: TownBeat }

mountGame(game, { components })
```

The names you can replace are the keys of [`Components`](/docs/react/components#components): `Frame`, `Sidebar`, `Title`, `Clock`, `StatList`, `LocationPanel`, `PeoplePanel`, `Actions`, `SceneStage`, `Beat`, `ChoiceList`, `ChoiceButton`, `PriceTag`, `Notices`, `Notice`, `GameMenu`, `SavesMenu`, `Backlog`, `ModManager`, `QuestLog`, `Inventory`, `WardrobePanel`, `EntityTable`, `InputFields`, `InputField`, `DeviceButtons`, `DeviceDialog`, `DeviceScreen`, `AppSection`, `MessagesSection`, `FeedSection`, `DebugPanel`, `Picture` and `Icon`.

A replacement applies wherever the UI draws that component, not just in one spot. The `Beat` above also draws the beats in the [backlog](/docs/react/components#backlog), and a replaced `ChoiceButton` draws a scene's choices, the room's actions, each person's buttons and the inventory's **Use** buttons.

[`Icon`](/docs/react/components#icon) is the smallest one to replace. It draws the close, back and warning icons, so one component swaps the UI's whole icon set:

```tsx
import type { Components } from '@ifloom/react'

const GLYPHS = { close: '×', back: '←', warning: '!' }

const components: Components = {
  Icon: ({ name, label }) => <span aria-label={label} aria-hidden={label ? undefined : true}>{GLYPHS[name]}</span>,
}
```

**Gotchas.**

- **Keep the `data-part`.** Spread [`usePart`](/docs/react/components#usepart)'s result onto your element, as above, so plain CSS, `classes` and `unstyled` still reach it. Add the second attributes (`data-beat`, `data-who`) yourself if your CSS uses them.
- **Define `components` once**, outside any component, as with `panels`. A new object on every render redraws everything under the provider.
- **Don't draw the built-in one by importing it.** Inside your `Beat`, importing `Beat` from `@ifloom/react` gives you your own replacement again, and it calls itself forever. Use `Default`.

## 7. Replace the frame

The frame is the page's skeleton: where the side column, the stage and the overlay go. [`Frame`](/docs/react/components#frame) gets each region already drawn, so a new frame only arranges them. This one is a header bar over a single reading column:

```tsx
import { mountGame, usePart, type Components, type FrameProps } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

function TopBarFrame({ sidebar, stage, overlay, className }: FrameProps) {
  const page = usePart('page', 'flex min-h-screen flex-col font-body', className)
  const main = usePart('stage', 'mx-auto flex w-full max-w-(--width-reading) flex-col gap-(--gap-page) p-4')
  const over = usePart('overlay', 'fixed top-4 right-4 z-40 w-(--width-notice)')
  return (
    <div {...page} data-has-sidebar={sidebar ? '' : undefined}>
      {sidebar ? <header className="border-b bg-card px-4 py-2">{sidebar}</header> : null}
      <main {...main}>{stage}</main>
      {overlay ? <div {...over}>{overlay}</div> : null}
    </div>
  )
}

const components: Components = { Frame: TopBarFrame }

mountGame(game, {
  components,
  classes: { sidebar: () => 'flex flex-wrap items-center gap-4' },
  layout: { sidebar: ['title', 'stats', 'menu'], stage: ['scene', 'inputs', 'actions'] },
})
```

The `classes` turn the side column's own `<aside>` into a row, and the layout puts only a few short parts in it.

`sidebar` is `null` when the layout has no side column, and `overlay` is `null` when the overlay list is empty. `className` is what was passed to `GameShell`.

## 8. Write your own root

For a page that isn't a side column and a stage at all, give `mountGame` your own root component as `app`. It's drawn inside the game's provider, so [`useGame`](/docs/react/components#usegame), the hooks and every built-in component work in it. `components`, `classes` and `unstyled` still apply to any built-in part you use:

```tsx
// src/main.tsx
import { SceneStage, InputFields, Notices, mountGame, useGame, useSaves } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

function TownApp() {
  const { view, runner } = useGame()
  const saves = useSaves()
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-heading text-title">{view.title}</h1>
        <p className="text-sm text-muted-foreground">{view.when}</p>
      </header>
      <SceneStage />
      <InputFields />
      <footer className="flex gap-3 text-sm">
        {saves.available ? <button onClick={() => void saves.save('Quick save')}>Quick save</button> : null}
        <button disabled={!runner.canUndo} onClick={() => runner.undo()}>
          Undo
        </button>
      </footer>
      <Notices className="fixed right-4 bottom-4 w-80" />
    </div>
  )
}

mountGame(game, { app: TownApp })
```

`layout` and `className` are ignored when you pass `app`, since there's no `GameShell` to use them.

The menus have hooks that give you their state and actions without their look, so your own screens don't have to talk to the runner directly:

| Hook | What it gives you |
|---|---|
| [`useSaves`](/docs/react/components#usesaves) | The save slots, and saving, loading, deleting, exporting and importing them. |
| [`useBacklog`](/docs/react/components#usebacklog) | The backlog's entries, kept current. |
| [`useMods`](/docs/react/components#usemods) | The player's mods, and adding, toggling and removing them. |
| [`useDevices`](/docs/react/components#usedevices) | The devices in the view. |
| [`useDevice`](/docs/react/components#usedevice) | Which device is open, and how to open and close one. |
| [`useWords`](/docs/react/components#usewords) | The UI's words in the game's language. |

Your own components can also join the override system, so the next game that uses them can restyle or replace them the same way. See [Your own components](/docs/react/extending#your-own-components-in-the-system).

## 9. Use another framework

If React isn't what you want, leave this package out. The engine has no framework of its own. [Using another framework](/docs/guide/frameworks) walks through the Vue, Svelte and plain-DOM templates.

## Not looking like every other IFLoom game

Players notice when games share a look. A dozen games on the same engine with the same buttons and the same side column start to feel like one game with different words. Changing `--primary` isn't enough to stop that. Colour is the first thing people change and the last thing they remember.

What makes a game look like itself is mostly shape and type:

- **Pick a preset that fits the game**, or make your own from one. A preset is a short stylesheet, and copying one into your `src/styles.css` and changing it is a fine way to start.
- **Change the fonts.** A serif, a rounded face or a monospace changes the feel more than any colour. Bundle a font file if no system font fits.
- **Change the layout.** Move the side column, drop it, put the stats under the scene, or move the notices. A different [frame](#7-replace-the-frame) changes the whole silhouette of the page.
- **Change how choices look.** They're what the player looks at most. Lines of text, numbered prompts, cards and pills each make a different game.
- **Replace one or two components** that matter to your story, such as `Beat` for the way people talk, or `Notice` for news.

## The data-part reference

Every `data-part` the UI draws. Each name is also a key for [`classes`](#4-change-the-built-in-classes). The list is exported as [`PART_KEYS`](/docs/react/components#part_keys).

### The page

| Part | What it is |
|---|---|
| `page` | The whole page, drawn by [`Frame`](/docs/react/components#frame). Carries `data-has-sidebar` when there's a side column. |
| `sidebar` | The side column, an `<aside>`. |
| `stage` | The `<main>` that holds the stage's parts. |
| `overlay` | The box after the stage that sticks to the bottom of the window, holding the notices by default. It's hidden while it's empty. |
| `title` | The game's title. |
| `clock` | Where the game is in time, under the title. |

### Stats

| Part | What it is |
|---|---|
| `stats` | The list of stats. |
| `stat` | One stat's row. Carries `data-stat`. |
| `stat-label` | A stat's label. |
| `stat-value` | A stat's value, as the game formats it. |
| `stat-level` | A levelled stat's level (`ui.statLevel`, "Level 2"), inside its label. Carries `data-level`. |
| `stat-progress` | A levelled stat's bar towards its next level, a `progressbar` holding one `<span>` as wide as the progress, labelled with `ui.statProgress`. Not drawn at the top level. The `paper` preset hides it, so a stat there shows only its level. |
| `stat-bar` | A stat with `display: 'bar'`: a `meter` holding one `<span>` as wide as the value is from `min` to `max`. |
| `stat-pips` | A stat with `display: 'pips'`: a `meter` holding a pip for each point. |
| `stat-pip` | One pip. Carries `data-filled` when it's filled. |

### Where you are, and who's there

| Part | What it is |
|---|---|
| `location` | The location panel. |
| `location-name` | The location's name. |
| `location-text` | The location's tag, under its name. |
| `exits` | The row of exit buttons. |
| `exit` | One exit button. Carries `data-exit`. |
| `people` | The list of people here. |
| `people-title` | A heading for the people list. The built-in panel doesn't draw one, so it's there for a replacement `PeoplePanel` to use. |
| `person` | One person. Carries `data-person`. |
| `person-portrait` | Their portrait. |
| `person-name` | Their name. |
| `person-role` | Their role, under the name. |
| `person-actions` | Their buttons. |

### Scenes

| Part | What it is |
|---|---|
| `scene` | The scene, an `<article>`. Carries `data-scene`, and `data-minigame` while a minigame runs. |
| `scene-header` | The row with the speaker's portrait and the title. |
| `scene-portrait` | The speaker's portrait. |
| `scene-title` | The scene's title. |
| `stage-image` | The picture on the stage, above the text. |
| `beats` | The scene's text, holding every beat. |
| `beat` | One beat. Carries `data-beat` with its kind, and a `say` beat carries `data-who`. |
| `mail-header` | One header line of a letter (a `mail` beat). |
| `mail-body` | A letter's body. |
| `voice-replay` | The button after a spoken line that plays its voice again. |

### Pictures, videos and the stage

| Part | What it is |
|---|---|
| `video` | A video clip, drawn by [`Video`](/docs/react/components#video). A video beat's carries `data-beat="video"`. |
| `stage-picture` | A layered [`Stage`](/docs/react/components#stage)'s box, with the stage's `aspect-ratio`. |
| `stage-layer` | One layer in it, a picture or a video. Carries `data-layer` with the layer's id. |
| `hotspot` | A hotspot button over the stage. Carries `data-hotspot`, and `aria-disabled` when it's greyed out. |
| `hotspot-warning` | The warning icon in a hotspot's corner. |
| `viewer-open` | The button around a picture or a clip in the story that opens the viewer. |
| `viewer` | The [`MediaViewer`](/docs/react/components#mediaviewer) dialog, holding the picture or the clip. |
| `viewer-close` | The viewer's close button. |

### Choices and buttons

| Part | What it is |
|---|---|
| `choices` | A scene's list of choices, or an app's. |
| `actions` | The room's and the game's buttons, when no scene is open. |
| `choice` | One choice or action button. Carries `data-choice`, and `data-choice-key` with its number when [keys](/docs/react/components#keyoptions) are on. |
| `choice-key` | The number key that picks a choice, a `<kbd>` at the start of its label. Only with keys on. |
| `choice-label` | The button's label, with the warning icon. |
| `choice-warning` | The warning written under a button that can be pressed but would be refused. |
| `choice-price` | What the choice costs. |
| `choice-irreversible` | The line that says a choice can't be undone. |
| `choice-reason` | Why a button is greyed out. |
| `button` | Any other button: in the saves menu, the mod manager, the quest log, the wardrobe, inputs, message threads, feeds and the debug panel. |
| `badge` | A count or a **New** badge in the quest log, or a count in the notice strip. |

### Notices

| Part | What it is |
|---|---|
| `notices` | The list of notices. Carries `data-collapsed` while a phone shows only the newest. |
| `notices-more` | The button under the notices on a phone that shows the rest, or hides them again. Carries `aria-expanded`. |
| `notice` | One notice. Carries `data-notice`. |
| `notice-image` | Its picture. |
| `notice-title` | Its title. |
| `notice-text` | Its text. |
| `notice-dismiss` | Its dismiss button. |
| `notice-strip` | The [`NoticeStrip`](/docs/react/components#noticestrip), a `<nav>` of unread counts. |
| `notice-strip-item` | One count in it, a button. Carries `data-strip`: `notices`, or the device and app as `phone/texts`. |

### Minigames

| Part | What it is |
|---|---|
| `minigame` | The [`MinigamePanel`](/docs/react/components#minigamepanel), a `<section>`. Carries `data-minigame` and `data-state`. |
| `minigame-title` | The minigame's title. |
| `minigame-state` | The running state's words. |
| `minigame-timer` | The countdown bar, a `progressbar` holding one `<span>` scaled with `transform: scaleX()`. Only while the state has a timer. |
| `minigame-inputs` | The row of input buttons. |
| `minigame-input` | One input button. Carries `data-input`. |

### The menu and its dialogs

| Part | What it is |
|---|---|
| `menu` | The player's menu, the row of buttons. |
| `menu-button` | Each button in it: Saves, Backlog, Mods, Undo and Redo. With keys on, Escape opens the same buttons in a dialog. |
| `dialog` | A dialog box: the menu's dialog, or a device's. A device's carries `data-frame`. |
| `dialog-overlay` | The dimmed page behind a dialog. |
| `dialog-title` | A dialog's title. |
| `dialog-close` | A dialog's close button. |
| `saves` | The saves menu. |
| `saves-actions` | The row with **Save in a new slot** and **Import a save file**. |
| `save-slot` | One save slot. Carries `data-save-slot`. |
| `save-name` | The slot's name. |
| `save-details` | When it was saved. |
| `saves-message` | Why a load or an import failed, or which packs and plugins a save was missing. |
| `saves-empty` | The line shown when there are no saves. |
| `file-button` | The label that opens a file picker, in the saves menu and the mod manager. |
| `backlog` | The backlog's scrolling list. |
| `backlog-entry` | One scene in it. Carries `data-backlog`. |
| `backlog-title` | The scene's title. |
| `backlog-choice` | The **You chose** line. |
| `backlog-empty` | The line shown when the backlog is empty. |
| `mods` | The mod manager. |
| `mod` | One mod. Carries `data-mod`. |
| `mod-name` | Its name. |
| `mod-version` | Its version. |
| `mod-state` | Its **On** or **Off** button. |
| `mod-text` | Its description. |
| `mod-problem` | A problem the loader found in it. |
| `mods-message` | Why a mod file couldn't be added. |
| `mods-empty` | The line shown when no mods are added. |

### Plugins' panels

| Part | What it is |
|---|---|
| `quests` | The quest log. |
| `quests-title` | Its heading. |
| `quest` | One active quest. Carries `data-quest`. |
| `quest-title` | The quest's title. |
| `quest-stage` | How far it has got (`2 of 3`). |
| `quest-summary` | Its summary. |
| `quest-hint` | The hint for what to do next. |
| `quests-done` | The list of finished quests. |
| `quest-done` | One finished quest. |
| `inventory` | What the player carries. |
| `inventory-title` | Its heading. |
| `item` | One item. Carries `data-item`. |
| `item-name` | Its name. |
| `item-count` | How many, when there's more than one. |
| `item-text` | Its description. |
| `wardrobe` | The wardrobe panel. |
| `wardrobe-title` | Its heading. |
| `wardrobe-slot` | One slot. Carries `data-slot-id`. |
| `wardrobe-slot-name` | The slot's label. |
| `wardrobe-worn` | What's in the slot. |
| `entities` | The entity tables, all kinds. |
| `entity-table` | One kind's table. |
| `entity-heading` | The kind's heading. |
| `entity-columns` | The table's header row. |
| `entity-column` | One column heading. |
| `entity-row` | One entity's row. Carries `data-entity`. |
| `entity-name` | The entity's name. |
| `entity-value` | One of its stats. |
| `inputs` | Every input on offer. |
| `input` | One input. Carries `data-input`. |
| `input-label` | Its label. |
| `input-field` | The text or number box. |
| `input-options` | The row of options for a `choice` input. |
| `input-submit` | The **Enter** button. |
| `input-error` | Why the value was refused. |

### Devices, apps, messages and feeds

| Part | What it is |
|---|---|
| `devices` | The row of device buttons. |
| `device-button` | One device's button. Carries `data-device`. |
| `device-badge` | The badge on it. |
| `device-screen` | An open device, inside its dialog. |
| `app` | An open app. Carries `data-app`. |
| `app-header` | The row with the back button and the app's name. |
| `app-title` | The app's name. |
| `app-back` | The back button. |
| `app-launcher` | The home screen's grid of apps, with the wallpaper. |
| `app-button` | One app on the home screen. Carries `data-open-app`. |
| `app-icon` | Its icon square. Carries `data-icon`. |
| `app-badge` | Its badge. |
| `app-prose` | A `prose` section of an app. |
| `app-entries` | A `list` section of an app. |
| `app-entry` | One entry in it. Carries `data-entry`. |
| `app-entry-image` | The entry's picture. |
| `app-entry-title` | Its title. |
| `app-entry-text` | Its text. |
| `channel` | A messages channel. Carries `data-channel`. |
| `thread` | One thread in it. Carries `data-thread`. |
| `thread-title` | The thread's heading, with the sender's name. |
| `thread-portrait` | The sender's portrait. |
| `message` | One message with the reply under it. |
| `bubble` | A message bubble. Carries `data-from`, `them` or `player`. The message's beats are inside it. |
| `feed` | A feed. Carries `data-feed`. |
| `post` | One post. Carries `data-post`. |
| `post-author` | The poster's name and portrait. |
| `post-portrait` | The poster's portrait. |
| `post-image` | The post's picture. |
| `post-text` | Its words, as beats. |
| `post-meta` | Its likes. |
| `post-comment` | One comment. |
| `post-comment-name` | The commenter's name. |

### The debug panel

| Part | What it is |
|---|---|
| `debug` | The whole panel. |
| `debug-header` | The row with the heading, the seed and the undo buttons. |
| `debug-title` | The heading. |
| `debug-seed` | The seed. |
| `debug-form` | One of the **Set** tab's forms. |
| `debug-label` | A form's label. |
| `debug-field` | A box in a form. |
| `debug-error` | Why a form's command was refused. |
| `debug-section` | One tab's content. |
| `debug-heading` | A heading in the **Why not** tab. |
| `debug-list` | A list in the **Why not** tab. |
| `debug-state` | The game state as JSON. |
| `debug-log` | The command log. |

### The pages

These are drawn only when `pages` is on. See [Pages](/docs/react/components#pages).

| Part | What it is |
|---|---|
| `title-page` | The title screen. Carries `data-page="title"`. |
| `title-art` | Its picture, when `art` is given. |
| `title-name` | The game's title. |
| `title-subtitle` | The line under it, when `subtitle` is given. |
| `title-buttons` | The column of buttons. |
| `title-button` | Each button in it. Carries `data-title-button` with what it does: `continue`, `new`, `new-game-plus`, `load`, `settings`, `credits`, or the id of a page of your own. |
| `page-heading` | The heading of the settings, load and credits pages. |
| `page-back` | Their Back button. |
| `settings-page` | The settings page. |
| `settings` | Its list of settings. |
| `setting` | One setting. Carries `data-setting` with its id and `data-affects` with `play` or `ui`. |
| `setting-label` | The setting's label. |
| `setting-control` | Its checkbox, radio buttons or slider. |
| `setting-value` | A slider's value, beside it. |
| `settings-empty` | The line shown when the game has no settings. |
| `load-page` | The load page. Its slots use the saves menu's parts, `save-slot` and the rest. |
| `credits-page` | The credits page. |
| `credits` | Its list. |
| `credit` | One line of it. |
| `credit-link` | A line that is a link. |
| `gate-page` | The gate, before the title screen. |
| `gate-title` | Its title. |
| `gate-text` | Its paragraphs. |
| `gate-buttons` | The row with its buttons. |
| `gate-confirm` | The button that moves on. |
| `gate-decline` | The button that doesn't. A link when it has an `href`. |

Each of the four presets gives the title screen its own look: a centred column with a large title, and buttons in the preset's style.
