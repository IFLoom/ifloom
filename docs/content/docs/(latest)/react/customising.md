---
title: "Make it your own"
description: Give an IFLoom game drawn with the React UI a look of its own, from a theme preset and a few CSS variables up to replacing components, the page frame or the whole root.
---
This page is about `@ifloom/react`, the optional React UI. The engine doesn't need it. To draw a game with plain DOM, Vue, Svelte or React by hand, see [Your own UI in any framework](/docs/guide/frameworks).

You can change how the React UI looks at any depth, from swapping one colour to drawing every screen yourself. This page goes from the smallest change to the biggest. Start at the top and stop when the game looks the way you want.

1. [Pick a theme preset](#1-pick-a-theme-preset)
2. [Set tokens and colours](#2-set-tokens-and-colours)
3. [Style parts with plain CSS](#3-style-parts-with-plain-css)
4. [Change the built-in classes](#4-change-the-built-in-classes)
5. [Rearrange the parts in layout.tsx](#5-rearrange-the-parts-in-layouttsx)
6. [Replace a component](#6-replace-a-component)
7. [Change the shape of the page](#7-change-the-shape-of-the-page)
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
| `studio` | A clean, modern app. Cards on a soft grey page, the side column on the right, generous spacing, bold headings and choices as raised cards, with the reading column kept to the start of the story. The Corner Café (`examples/cafe`) uses it. |
| `storybook` | Soft and friendly. Rounded type, a warm tinted page, big pill buttons, and dialogue in speech bubbles. Small Town (`examples/showcase`) uses it. |

[`ifloom new`](/docs/cli#ifloom-new) writes this import for you. Pass `--theme paper` (or any of the four) to choose one. Leave it out and a `react` game gets one at random, so two new games don't start out looking the same.

Without a preset, you get the UI's plain default look: a system sans-serif, neutral colours and the side column on the left.

Each preset is plain CSS that sets the [tokens](#2-set-tokens-and-colours) and styles a few [parts](#3-style-parts-with-plain-css). It styles the React UI's own parts and the [kit's parts](/docs/react/kit#kit_parts), never a plugin's own by name, so every plugin's UI, first-party or not, looks right in each preset. Read the one you picked in `node_modules/@ifloom/react/src/themes/` to see what it changes. It's a good starting point for a preset of your own.

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
| `--font-heading` | The game's title, scene titles and card headings. | `var(--font-body)` |
| `--text-title` | The size of the game's title. | `1.125rem` |
| `--text-scene-title` | The size of a scene's title. | `1.5rem` |
| `--leading-prose` | The line height of a scene's text. | `1.625` |
| `--shadow-card` | The shadow under notices. The presets use it for their cards too. | A soft drop shadow |
| `--width-prose` | The width of the story's reading column: the scene's title and prose, the choices, the inputs, the exits and the people here. Pictures and panels use the whole column. | `70ch` |
| `--margin-prose` | Where the reading column sits when the story is wider than it, as `margin-inline`. `auto` centres it, `0 auto` keeps it to the start. [`Story`'s `align`](/docs/react/components#story) wins over it. | `auto` |
| `--width-reading` | How wide the page grows without a side column. With one, the page is as wide as the window. | `42rem` |
| `--width-sidebar` | The side column's width on a wide screen. | `18rem` |
| `--width-notice` | The width of the notices in the bottom corner. | `20rem` |
| `--gap-page` | The space between the side column and the story, and between parts in the story. | `1.5rem` |
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

/* No names over spoken lines */
[data-part="speaker-name"] {
  display: none;
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
| `data-beat` | Every `beat`, and a video beat's `video` | The beat's type: `text`, `say`, `image` or `video`. |
| `data-who` | A `say` beat | `character` or `player`. |
| `data-face` | An `inline-prop` | The note's face, `sticky`, `clip` or `diary`. |
| `data-from` | Every `bubble` | `them` or `player`. The typing bubble is `them`, with `data-typing` too. |
| `data-card`, and any hint of your own | A `group` | The section's hint, as written. See [Your own hints](/docs/react/hints#your-own-hints). |
| `data-dir` | Every `change` | `up` or `down`. With `data-stat` and, for an entity's stat, `data-of`. |
| `data-has-sidebar` | The `page` | Present when the layout has a side column. |
| `data-frame` | A device's `dialog` | The device's frame: `phone`, `laptop`, or a name of the game's own. |
| `data-icon` | Every `app-icon` | The app's icon name, for a stylesheet to map to a picture. |
| `data-layer` | Every `picture-layer` | The layer's id, when it has one. |
| `data-hotspot` | Every `hotspot` | The hotspot's id. |
| `data-transition-in` | The `scene` | How it comes in: a [transition name](/docs/react/hints#transitionname). Not set with motion off. |
| `data-transition-out`, `data-leaving` | The copy of the scene before | How it goes out. |
| `data-reveal` | Every `reveal` | How its beats come in. |
| `data-revealed` | The `scene` | Present once the player has shown every reveal at once. |
| `data-speaker-hue` | The `scene` | Present while the speaker has a [`hue`](/docs/react/hints#hue), which is in `--ifloom-speaker-hue`. |

A part that a plugin's UI draws carries `data-kit` too when it's like one of the [kit's parts](/docs/react/kit#kit_parts): a vendor's good, a job and an achievement are each a `card`, their names a `title`. Style the kit's part to restyle all of them at once, whatever plugin drew them:

```css
[data-kit="card"] {
  border-radius: 0;
  border-width: 0 0 1px;
}

/* An achievement once it's earned, or anything else that's done. */
[data-kit="card"][data-state="done"] {
  background: var(--secondary);
}
```

The older identity attributes are still there too: `data-choice`, `data-stat`, `data-person`, `data-exit`, `data-thing`, `data-quest` and the rest, each holding the id of what it shows. [Components](/docs/react/components#identity-attributes) lists them all. The full list of parts is in the [reference](#the-data-part-reference) at the end of this page.

### Why your CSS wins

You don't need `!important` or long selectors to beat the built-in look. Tailwind puts all of its classes in a [cascade layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) called `utilities`, and CSS that isn't in any layer beats CSS that is, whatever its specificity. Your stylesheet and the presets aren't in a layer, so `[data-part="choice"] { border-radius: 0 }` wins over the button's `rounded-md`.

**Gotcha.** If you put your own rules inside an `@layer` (such as `@layer components`), they're layered too, and Tailwind's `utilities` layer comes after them and wins. Leave your overrides outside any layer.

## 4. Change the built-in classes

Plain CSS adds to the look. When you'd rather change the Tailwind classes themselves, pass `classes`, keyed by the same `data-part` names:

```ts
import { mountGame, type Classes } from '@ifloom/react'
import module from './game.ts'
import './styles.css'

const classes: Classes = {
  // A string is merged with the built-in classes, and yours win where they clash.
  'scene-title': 'text-3xl tracking-tight',
  choice: 'rounded-none',
  // A function gets the built-in classes and returns the ones to use, so this replaces them.
  stats: () => 'flex flex-wrap gap-x-4 text-xs uppercase',
}

mountGame(module.build(), { classes })
```

A string is merged with [tailwind-merge](https://github.com/dcastil/tailwind-merge), the same way [`cn`](/docs/react/components#cn) works. `rounded-none` replaces the button's `rounded-md`, and every other class stays. A function `(defaults) => string` is given the built-in classes as one string and returns what to use instead. Return a new string to replace them, or build on the old one.

Every part named in the [reference](#the-data-part-reference) takes classes. When several elements share a name, such as `button` or `beat`, the classes go on all of them.

### unstyled

To start from nothing, pass `unstyled: true`. Every built-in class goes. The elements, their `data-part`s and their behaviour stay, ready for your own CSS or your own `classes`:

```ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), {
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

`@ifloom/react/styles.css` imports Tailwind, the UI's theme, and a little base CSS for the page. If your game has its own Tailwind set-up, import `@ifloom/react/theme.css` instead. It has the tokens, the colours, dark mode and the `@source` line that makes Tailwind scan the UI's components, but no `@import "tailwindcss"`. The first-party plugins' UIs use only classes those components use, so they need nothing more. A plugin of someone else's that ships a stylesheet of its own says so; import it after this one.

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

### Without Tailwind

The stylesheet also comes prebuilt. `@ifloom/react/styles.min.css` is `styles.css` already run through Tailwind and minified, and each preset has a prebuilt copy beside it, such as `@ifloom/react/themes/paper.min.css`. Import them in place of your `src/styles.css`, and take Tailwind's plugin out of `vite.config.ts` and `tailwindcss` and `@tailwindcss/vite` out of your dev dependencies:

```ts
// src/main.ts
import '@ifloom/react/styles.min.css'
import '@ifloom/react/themes/paper.min.css'
```

The first-party plugins' UIs need no stylesheet of their own here either: every class they use is in `styles.min.css`. Variables, presets, `data-part` and `data-kit` rules work as before, from a plain stylesheet of your own imported after them. The `classes` option only has the Tailwind classes the UI already uses, since nothing builds new ones, so restyle with CSS instead.

## 5. Rearrange the parts in layout.tsx

The page is a component, the layout. The react and next templates start you with `src/layout.tsx`, a copy of the UI's own [`DefaultLayout`](/docs/react/components#defaultlayout), and pass it to `mountGame` as `layout`. Everything on the page is a component in it, so you rearrange the page by editing JSX:

```tsx
// src/layout.tsx
import { Clock, Game, GameMenu, Inventory, Notices, Overlay, PanelHost, RoomActions, Scene, Section, Sidebar, StatList, Story, Title } from '@ifloom/react'
import { Exits } from '@ifloom/plugin-places/react'
import { PeopleHere } from '@ifloom/plugin-cast/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <StatList />
        <GameMenu />
      </Sidebar>
      <Story>
        <Notices />
        <Scene />
        <Exits />
        <RoomActions />
        <PeopleHere />
        <Section id="inventory" title="In your bag" collapsible open={false}>
          <Inventory title={false} />
        </Section>
      </Story>
      <PanelHost />
    </Game>
  )
}
```

This puts the notices at the top of the story instead of in the bottom corner, moves the inventory under the story in a section that starts folded, and leaves the quests and the wardrobe out. The regions and the default layout are on [The React UI](/docs/react#layouts). Your own components go anywhere among the built-in ones.

**Gotchas.**

- **Moving a part means deleting it where it was.** A component written twice is drawn twice.
- **No `Overlay`, no corner.** Without one, nothing floats over the page, so put `Notices` somewhere else or the player won't see them.
- **Keep `PanelHost`** if content opens [panels](/docs/reference/panels).

The layout decides what goes where. To put the side column on the right, use CSS: `studio` does it with an `order` on the side column and a grid template on `[data-part="page"][data-has-sidebar]`.

## 6. Replace a component

Every built-in component can be replaced by name, everywhere it's drawn. Pass your own in `components`. It gets the same props as the built-in one, plus `Default`, the built-in one itself, so you can hand back any case you don't want to change.

Here a game draws its spoken lines and letters its own way and leaves the other beats alone:

```tsx
// src/main.tsx
import type { SceneBeat } from '@ifloom/engine'
import { mountGame, usePart, type Components } from '@ifloom/react'
import type { Override } from '@ifloom/react/kit'
import module from './game.ts'
import './styles.css'

const TownBeat: Override<{ beat: SceneBeat }> = ({ beat, Default }) => {
  const line = usePart('beat', 'border-l-2 border-speech pl-4 leading-prose italic')
  const picture = usePart('beat', 'mx-auto max-w-md rotate-1 rounded-lg shadow-card')
  if (beat.type === 'say' && beat.who === 'character') {
    return (
      <blockquote {...line} data-beat="say" data-who="character">
        {beat.text}
      </blockquote>
    )
  }
  if (beat.type === 'image') return <img {...picture} data-beat="image" src={beat.src} alt={beat.alt ?? ''} />
  return <Default beat={beat} />
}

const components: Components = { Beat: TownBeat }

mountGame(module.build(), { components })
```

The names you can replace are the keys of [`Components`](/docs/react/components#components): the React UI's own, such as `Game`, `Sidebar`, `Story`, `Section`, `Title`, `Clock`, `StatList`, `RoomActions`, `Scene`, `SceneHeader`, `BeatGroup`, `Fold`, `Beat`, `ChoiceButton`, `Notices`, `GameMenu`, `Inventory`, `Picture` and `Icon`, and every component a plugin's UI draws, such as `ShopCounter`, `QuestLog` and `DebugCard`, once you import that plugin's `/react`.

To change how the scene's heading, a section with ui hints or a fold looks, replace [`SceneHeader`](/docs/react/components#sceneheader), [`BeatGroup`](/docs/react/components#beatgroup) or [`Fold`](/docs/react/components#fold). The transitions, reveals and dice stay as they were, since `Scene` times them around those parts. For a scene laid out quite differently, write your own `Scene` on [`useScene`](/docs/react/components#usescene), which gives you the same timing with nothing drawn.

A replacement applies wherever the UI draws that component, not only in one spot. The `Beat` above also draws the beats in the [backlog](/docs/react/components#backlog), and a replaced `ChoiceButton` draws a scene's choices, the room's actions, and the buttons the plugins' UIs draw with it, such as each person's and the inventory's Use buttons.

[`Icon`](/docs/react/components#icon) is the smallest one to replace. It draws every icon the UI uses, such as close, back and warning, so one component swaps the UI's whole icon set:

```tsx
import type { Components } from '@ifloom/react'
import type { IconName } from '@ifloom/react/kit'

const GLYPHS: Record<IconName, string> = { close: '×', back: '←', warning: '!', voice: '♪', zoom: '+', menu: '≡', chevron: '›' }

const components: Components = {
  Icon: ({ name, label }) => <span aria-label={label} aria-hidden={label ? undefined : true}>{GLYPHS[name]}</span>,
}
```

**Gotchas.**

- **Keep the `data-part`.** Spread [`usePart`](/docs/react/components#usepart)'s result onto your element, as above, so plain CSS, `classes` and `unstyled` still reach it. Add the second attributes (`data-beat`, `data-who`) yourself if your CSS uses them.
- **Define `components` once**, outside any component, as with `panels`. A new object on every render redraws everything under the provider.
- **Don't draw the built-in one by importing it.** Inside your `Beat`, importing `Beat` from `@ifloom/react` gives you your own replacement again, and it calls itself forever. Use `Default`.

## 7. Change the shape of the page

The regions are components too, so the shape of the page is yours. [`Game`](/docs/react/components#game) draws the `page` part, a grid with the side column and the story when it has a `Sidebar`, and passes `className` on. Anything inside it is drawn in order, so a header bar is a `<header>` before the story:

```tsx
// src/layout.tsx
import { Clock, Game, GameMenu, InputFields, Notices, Overlay, PanelHost, RoomActions, Scene, StatList, Story, Title } from '@ifloom/react'

export function Layout() {
  return (
    <Game className="max-w-(--width-reading)">
      <header className="flex flex-wrap items-center gap-4 border-b pb-2">
        <Title />
        <Clock />
        <StatList />
        <GameMenu />
      </header>
      <Story>
        <Scene />
        <InputFields />
        <RoomActions />
      </Story>
      <PanelHost />
      <Overlay className="fixed top-4 right-4 bottom-auto">
        <Notices />
      </Overlay>
    </Game>
  )
}
```

With no `Sidebar`, `Game` is one centred column, so the header sits over the story. Every region takes `className`, merged over its own classes, and `classes` reaches them by their parts (`page`, `sidebar`, `story`, `overlay`), as it reaches any other.

**On a phone** (below Tailwind's `md`, 48rem), `Sidebar` draws a slim `top-bar` with the title, the clock and a `drawer-button`. The button opens the side column as a `drawer`, a dialog that slides in from the left. Focus stays inside it, Escape closes it, and it closes by itself after the player picks something, unless a dialog it opened (a phone, a section's dialog) is still open. Style it with those parts. To keep the side column as a column on phones too, leave `Sidebar` out and draw your own `<aside>` with the parts in it.

**Sections** are how the side column stays short. [`Section`](/docs/react/components#section) is a titled block with three ways to show:

- **As it is.** A heading and its children.
- **`collapsible`.** A button on its title folds it in place. The player's choice is remembered per `id` in the profile, so a folded section stays folded next time. `open={false}` starts it folded.
- **`dialog`.** A button, with an optional `badge`, that opens the children in a dialog.

A section hides itself when nothing in it draws anything, and `when` shows it only while a condition holds. [Layouts: sections, drawers and showing things in some rooms](/docs/recipes/layouts) has examples.

## 8. Write your own root

For a page that isn't a side column and a story at all, give `mountGame` your own component as `layout`. Any component works. It's drawn inside the game's provider, with the sound, the text size and the pages as the default layout has them, so [`useGame`](/docs/react/components#usegame), the hooks and every built-in component work in it. `components`, `classes` and `unstyled` still apply to any built-in part you use:

```tsx
// src/main.tsx
import { Scene, InputFields, Notices, mountGame, useGame, useSaves } from '@ifloom/react'
import module from './game.ts'
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
      <Scene />
      <InputFields />
      <footer className="flex gap-3 text-sm">
        {saves.available ? <button onClick={() => void saves.save('Quick save')}>Quick save</button> : null}
        <button disabled={!runner.snapshot().canUndo} onClick={() => runner.undo()}>
          Undo
        </button>
      </footer>
      <Notices className="fixed right-4 bottom-4 w-80" />
    </div>
  )
}

mountGame(module.build(), { layout: TownApp })
```

It doesn't need `Game`, `Sidebar` or `Story`, but it can use them like any other layout.

The menus have hooks that give you their state and actions without their look, so your own screens don't have to talk to the runner directly:

| Hook | What it gives you |
|---|---|
| [`useSaves`](/docs/react/components#usesaves) | The save slots, and saving, loading, deleting, exporting and importing them. |
| [`useBacklog`](/docs/react/components#usebacklog) | The backlog's entries, kept current. |
| [`useMods`](/docs/react/components#usemods) | The player's mods, and adding, toggling and removing them. |
| [`useDevices`](/docs/reference/plugins/devices#usedevices) | The devices in the view. |
| [`useDevice`](/docs/reference/plugins/devices#usedevice) | Which device is out, and how to bring one out and put it away. |
| [`useWords`](/docs/react/components#usewords) | The UI's words in the game's language. |

Your own components can also join the override system, so the next game that uses them can restyle or replace them the same way. See [Your own components](/docs/react/extending#your-own-components-in-the-system).

## 9. Use another framework

If React isn't what you want, leave this package out. The engine has no framework of its own. [Your own UI in any framework](/docs/guide/frameworks) walks through the Vue, Svelte and plain-DOM templates.

## Not looking like every other IFLoom game

Players notice when games share a look. A dozen games on the same engine with the same buttons and the same side column start to feel like one game with different words. Changing `--primary` isn't enough to stop that, because a new colour on the same shapes still looks like the same game.

What makes a game look like itself is mostly shape and type:

- **Pick a preset that fits the game**, or make your own from one. A preset is a short stylesheet, and copying one into your `src/styles.css` and changing it is a fine way to start.
- **Change the fonts.** A serif, a rounded face or a monospace changes the feel more than any colour. Bundle a font file if no system font fits.
- **Change the layout.** Move the side column, drop it, put the stats under the scene, or move the notices. A different [shape of page](#7-change-the-shape-of-the-page) changes the whole silhouette.
- **Change how choices look.** They're what the player looks at most. Lines of text, numbered prompts, cards and pills each make a different game.
- **Replace one or two components** that matter to your story, such as `Beat` for the way people talk, or `Notice` for news.

## The data-part reference

Every `data-part` the UI draws. Each name is also a key for [`classes`](#4-change-the-built-in-classes). Each is a [`PartKey`](/docs/react/components#partkey).

### The page

| Part | What it is |
|---|---|
| `page` | The whole page, drawn by [`Game`](/docs/react/components#game). Carries `data-has-sidebar` when there's a side column. |
| `sidebar` | The side column, an `<aside>`. On a phone it's inside the `drawer`. |
| `story` | The `<main>` that holds the story's parts. It carries `data-align` when `Story` has `align`. |
| `overlay` | The box after the story that sticks to the bottom of the window, holding the notices by default. It's hidden while it's empty. |
| `title` | The game's title. |
| `clock` | Where the game is in time. |
| `section` | A [`Section`](/docs/react/components#section). Carries `data-section` with its id, `data-open` (`true` or `false`) when it folds, and `data-dialog` when it opens in a dialog. |
| `section-title` | A section's title. |
| `section-toggle` | The button that folds a section (with `aria-expanded`), or opens its dialog. |
| `section-body` | What's in a section. It has `hidden` while the section is folded. |
| `section-badge` | The section's `badge`, after its title. |
| `top-bar` | On a phone, the bar across the top with the title, the clock and the drawer button. |
| `top-bar-title` | The game's title in the top bar. |
| `drawer-button` | The button in the top bar that opens the drawer. |
| `drawer` | The side column on a phone, a dialog that slides in from the left. |
| `drawer-overlay` | The shade behind the drawer. |

### Stats

| Part | What it is |
|---|---|
| `stats` | The list of stats. |
| `stat` | One stat's row. Carries `data-stat`. |
| `stat-label` | A stat's label. |
| `stat-value` | A stat's value, as the game formats it. |
| `stat-level` | A levelled stat's level (`ui.statLevel`, "Level 2"), inside its label. Carries `data-level`. |
| `stat-progress` | A levelled stat's bar towards its next level, a `progressbar` holding one `<span>` as wide as the progress, labelled with `ui.statProgress`. Not drawn at the top level. The `paper` preset hides it, so a stat there shows only its level. |
| `stat-bar` | A stat with the hint `ui: { display: 'bar' }`: a `meter` holding one `<span>` as wide as the value is from `min` to `max`. |
| `stat-pips` | A stat with `ui: { display: 'pips' }`: a `meter` holding a pip for each point. |
| `stat-pip` | One pip. Carries `data-filled` when it's filled. |

### Scenes

| Part | What it is |
|---|---|
| `scene-transition` | Holds the scene while it changes, and the copy of the scene before (`data-leaving`) while it goes. |
| `scene` | The scene, an `<article>`. Carries `data-scene`, `data-transition-in` with how it comes in, and `data-minigame` while a minigame runs. |
| `scene-header` | The row with the speaker's portrait and the title. |
| `scene-portrait` | The speaker's portrait. |
| `scene-title` | The scene's title. |
| `scene-image` | The scene's `image`, above the text, when it has no layered picture. |
| `beats` | The scene's text, holding every beat. |
| `beat` | One beat. Carries `data-beat` with its kind, and a `say` beat carries `data-who`. |
| `speaker-name` | The name over a spoken line: the speaker's, or the player's on their own lines. Not drawn on a line that names no one. Each preset styles it, and `display: none` hides it. |
| `reveal` | The beats from a block with a [`reveal`](/docs/react/hints#reveal) hint, which wait for it. Carries `data-reveal` with its transition. The choices waiting for the last reveal are one too, with `data-reveal-choices`. |
| `group` | The beats of a section with any ui hint, drawn together. Carries a `data-*` attribute for each hint that's a string, a number or true/false, such as `data-card="result"`. See [Your own hints](/docs/react/hints#your-own-hints). |
| `fold` | A section with a [`fold`](/docs/react/hints#fold) hint, as a `<details>`, inside its `group`. |
| `fold-summary` | The words a fold opens by. |
| `fold-beats` | A fold's beats. |
| `inline-mail` | A letter, from `[[ui:mail\|…]]`. |
| `mail-header` | One header line of a letter. |
| `mail-body` | A letter's body. |
| `inline-prop` | A note, from `[[ui:prop\|…]]`. Carries `data-face`. |
| `inline-mono` | Words in a monospace face, from `[[ui:mono\|…]]`. |
| `voice-replay` | The button after a spoken line that plays its voice again. |
| `inline-action` | An [inline action](/docs/react/components#inlineaction) in the prose, a button inside the line. Carries `data-choice`, and `data-disabled` while it's greyed out (it stays focusable, with `aria-disabled`). Each preset styles it as its own kind of link. |
| `tip` | A [tooltip](/docs/react/components#tip)'s words in the prose, a button underlined with dots. |
| `tip-content` | The bubble with a tooltip's note, or an inline action's reason. It's put in the page's `body`, with `role="tooltip"`, and carries `data-open` while it shows. |
| `inline-ui` | The words of an [inline piece](/docs/react/hints#inline-pieces), `[[ui:modal\|…]]` or `[[ui:image\|…]]`, a button inside the line. Carries `data-ui` with the piece's name, `aria-haspopup="dialog"` and `aria-expanded`. Each preset styles it apart from inline actions and tooltips. |
| `inline-modal` | The text inside the dialog a `modal` piece opens, below the `dialog-title`. |
| `bold` | Words in [bold](/docs/reference/prose#bold-and-italics) in the prose, a `<strong>`. The presets give it their own weight or colour, and the terminal preset makes it glow. |
| `italic` | Words in [italics](/docs/reference/prose#bold-and-italics) in the prose, an `<em>`. |

### Pictures, videos and layered pictures

| Part | What it is |
|---|---|
| `video` | A video clip, drawn by [`Video`](/docs/react/components#video). A video beat's carries `data-beat="video"`. |
| `picture` | A [`LayeredPicture`](/docs/react/components#layeredpicture)'s box, with the picture's `aspect-ratio`. |
| `picture-layer` | One layer in it, a picture or a video. Carries `data-layer` with the layer's id. |
| `hotspot` | A hotspot button over the picture. Carries `data-hotspot`, and `aria-disabled` when it's greyed out. |
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
| `button` | Any other button: in the saves menu, the mod manager, the quest log, the wardrobe, inputs, message threads, feeds and the debug card. |
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
| `minigame` | The [`MinigameCard`](/docs/react/components#minigamecard), a `<section>`. Carries `data-minigame` and `data-state`. |
| `minigame-title` | The minigame's title. |
| `minigame-state` | The running state's words. |
| `minigame-timer` | The countdown bar, a `progressbar` holding one `<span>` scaled with `transform: scaleX()`. Only while the state has a timer. |
| `minigame-inputs` | The row of input buttons. |
| `minigame-input` | One input button. Carries `data-input`. |

### What changed

| Part | What it is |
|---|---|
| `changes` | [`Changes`](/docs/react/components#changes), the list of what the last command moved. |
| `change` | One [`ChangeItem`](/docs/react/components#changeitem). Carries `data-stat`, `data-of` for an entity's stat, and `data-dir` (`up` or `down`). |
| `change-text` | The change in the stat's format, signed: `+30 coins`. |
| `change-label` | The entity's name, or the stat's label unless its format has words in it. |

### Timers

| Part | What it is |
|---|---|
| `timers` | [`Timers`](/docs/react/components#timers-1), a list of every running timer's countdown. |
| `timer` | One [`Countdown`](/docs/react/components#countdown). Carries `data-timer` (its id) and `data-urgent` with a quarter or less left. |
| `timer-label` | The timer's label. |
| `timer-bar` | The bar, a `progressbar` holding one `<span>` scaled with `transform: scaleX()`. Carries `data-urgent`. Left out with motion off. |
| `timer-left` | The seconds left, a `timer` region. Carries `data-urgent`. |

### Dice rolls

| Part | What it is |
|---|---|
| `dice` | One [`DiceRoll`](/docs/react/components#diceroll). Carries `data-roll` (its key), `data-state` (`rolling` or `settled`), and once settled `data-passed` and `data-critical`. |
| `dice-label` | The dice thrown, such as `2d6`. |
| `dice-faces` | The row of faces. |
| `dice-face` | One die. Carries `data-rolling` while it tumbles, and `data-high` or `data-low` on its top face or on 1. |
| `dice-plus` | What was added, such as `+2`. |
| `dice-total` | The total, once the dice settle. |
| `dice-outcome` | Passed or Failed, and what it needed. Carries `data-passed`. |
| `dice-critical` | Critical! or Fumble. |
| `dice-overlay` | The [`DiceOverlay`](/docs/react/components#diceoverlay) over the scene, for rolls no block names. |
| `dice-dismiss` | The overlay's close button. |

### The menu and its dialogs

| Part | What it is |
|---|---|
| `menu` | The player's menu, the row of buttons. |
| `menu-button` | Each button in it: Saves, Backlog, Mods, Undo and Redo. With keys on, Escape opens the same buttons in a dialog. |
| `dialog` | A dialog box: the menu's, a device's, the notice strip's, the shop's, the cheats' or the achievements'. A device's carries `data-frame`. Each is in the preset's body font, no taller than the window, and scrolls inside. |
| `dialog-overlay` | The dimmed page behind a dialog. |
| `dialog-title` | A dialog's title. |
| `dialog-close` | A dialog's close button. |
| `saves` | The saves menu. |
| `saves-actions` | The row with **Save in a new slot** and **Import a save file**. |
| `save-slot` | One save slot. Carries `data-save-slot`. |
| `save-name` | The slot's name. |
| `save-details` | When it was saved. |
| `saves-message` | Why a load or an import failed, or which packs and plugins a save was missing. |
| `saves-blocked` | Why saving is refused now, under the greyed-out Save buttons. |
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
| `mods-restart` | The line and button that appear once a mod has changed. |
| `mods-changed` | The line saying a restart applies the change. |

### What you carry, the entities and inputs

| Part | What it is |
|---|---|
| `inventory` | What the player carries. |
| `inventory-title` | Its heading. |
| `thing` | One thing you hold, carrying `data-thing` and `data-at`. |
| `thing-name` | Its name. |
| `thing-count` | How many, when there's more than one. |
| `thing-text` | Its description. |
| `entities` | The entity tables, all kinds. |
| `entity-table` | One kind's table. |
| `entity-heading` | The kind's heading. |
| `entity-columns` | The table's header row. |
| `entity-column` | One column heading. |
| `entity-row` | One entity's row. Carries `data-entity`. |
| `entity-name` | The entity's name, with its picture and description inside. |
| `entity-image` | Its picture, when it has one. |
| `entity-desc` | Its description, when it has one. |
| `entity-value` | One of its stats. |
| `inputs` | The inputs on offer: in a scene, between its words and its choices, or outside one from `InputFields`. |
| `input` | One input. Carries `data-input`. |
| `input-label` | Its label. |
| `input-field` | The text or number box. |
| `input-options` | The row of options for a `choice` input. |
| `input-submit` | The **Enter** button. |
| `input-error` | Why the value was refused. |

### The plugins' parts

Each plugin's React UI, from its `/react`, draws parts of its own when the game lists it in [`plugins`](/docs/react/kit#the-plugins-option). Importing that `/react` adds its parts to `PartKey`, so `classes` takes them typed. Each one that's like a part of the kit carries `data-kit` too, which is what the presets style: see [Plugin UIs and the kit](/docs/react/kit#kit_parts).

#### Places

From [`@ifloom/plugin-places/react`](/docs/reference/plugins/places#drawing-it).

| Part | What it is |
|---|---|
| `location` | The location card: the place's picture, name and tag. |
| `location-name` | The location's name. |
| `location-text` | The location's tag, under its name. |
| `location-things` | The list of things lying here. |
| `location-thing` | One of them, with its Pick up button. Carries `data-thing`. |
| `location-thing-name` | Its name, with how many when there's more than one. |
| `location-thing-pick` | Its **Pick up** button, greyed out with the reason when it can't be picked up. |
| `exits` | The row of exit buttons. |
| `exit` | One exit button. Carries `data-exit`. |

#### Cast

From [`@ifloom/plugin-cast/react`](/docs/reference/plugins/cast#drawing-it).

| Part | What it is |
|---|---|
| `people` | The list of people here. |
| `person` | One person. Carries `data-person`. |
| `person-portrait` | Their portrait. |
| `person-name` | Their name. |
| `person-desc` | Their `description`, under the name, such as `Runs the café`. |
| `person-actions` | Their buttons. |
| `relationships` | Everyone the player has met, in [`Relationships`](/docs/reference/plugins/cast#relationships). |
| `relationship` | One of them. Carries `data-person`. Their portrait, name and description use the `person-` parts. |
| `relationship-header` | The row with their portrait, name and description. |
| `relationship-stats` | The stats the game keeps on them, each with the `stat-` parts. |

#### Quests

From [`@ifloom/plugin-quests/react`](/docs/reference/plugins/quests#drawing-it).

| Part | What it is |
|---|---|
| `quests` | The quest log. |
| `quests-title` | Its heading. Kit part: `heading`. |
| `quest` | One active quest. Carries `data-quest`. Kit part: `card`. |
| `quest-title` | The quest's title. Kit part: `title`. |
| `quest-stage` | How far it has got (`2 of 3`). Kit part: `note`. |
| `quest-summary` | Its summary. Kit part: `note`. |
| `quest-hint` | The hint for what to do next. |
| `quests-done` | The list of finished quests. |
| `quest-done` | One finished quest. |

#### Inventory

From [`@ifloom/plugin-inventory/react`](/docs/reference/plugins/inventory#drawing-it).

| Part | What it is |
|---|---|
| `thing-drop` | Its drop button, with `drop` on. |

#### Wardrobe

From [`@ifloom/plugin-wardrobe/react`](/docs/reference/plugins/wardrobe#drawing-it).

| Part | What it is |
|---|---|
| `wardrobe` | The wardrobe card. |
| `wardrobe-title` | Its heading. Kit part: `heading`. |
| `wardrobe-slot` | One slot. Carries `data-slot-id`, and `data-worn` with what's in it. |
| `wardrobe-slot-name` | The slot's label. Kit part: `label`. |
| `wardrobe-worn` | What's in the slot. |

#### Statuses

From [`@ifloom/plugin-statuses/react`](/docs/reference/plugins/statuses#drawing-it).

| Part | What it is |
|---|---|
| `statuses` | The list of active statuses. |
| `statuses-title` | Its heading. Kit part: `heading`. |
| `status` | One status. Carries `data-status`. Kit part: `item`. |
| `status-label` | Its label, with the stacks and the turns left. Kit part: `title`. |
| `status-stacks` | How many stacks (`×2`), when there's more than one. |
| `status-turns` | The turns left. Kit part: `note`. |
| `status-summary` | Its summary. Kit part: `note`. |
| `status-modifiers` | What it does to the stats (`+10 Energy`). |

#### Achievements

From [`@ifloom/plugin-achievements/react`](/docs/reference/plugins/achievements#drawing-it).

| Part | What it is |
|---|---|
| `achievements-button` | The sidebar's **Achievements** button, with the count on a `badge`. Kit part: `opener`. |
| `achievements` | The achievement list, in the page or the dialog. |
| `achievements-title` | Its heading, when it has one. Kit part: `heading`. |
| `achievements-count` | How many are earned, in the heading. |
| `achievements-empty` | What it says when the game has none. |
| `achievement` | One achievement. Carries `data-achievement`, and `data-earned` or `data-secret`. Kit part: `card`. |
| `achievement-image` | Its picture. Kit part: `thumb`. |
| `achievement-title` | Its title, or `???`, with the **Earned** badge. Kit part: `title`. |
| `achievement-earned` | The **Earned** badge. Kit part: `badge`. |
| `achievement-text` | Its description. Kit part: `note`. |
| `achievement-progress` | The progress bar. Fill it with `> span`. Kit part: `meter`. |
| `achievement-progress-text` | The count under it (`5 of 20`). |

#### Cheats

From [`@ifloom/plugin-cheats/react`](/docs/reference/plugins/cheats#drawing-it).

| Part | What it is |
|---|---|
| `cheats-button` | The sidebar's **Cheats** button. Kit part: `opener`. |
| `cheats` | The cheat panel, in its dialog. Kit part: `commands`. |
| `cheats-group` | One group of cheats. Carries `data-cheats-group`, empty for the cheats with no group. |
| `cheats-group-title` | The group's heading. Kit part: `heading`. |
| `cheat` | One cheat: its `choice` button, its description and how often it was used. Carries `data-cheat`, and `data-used` once it has been used. Kit part: `card`. |
| `cheat-text` | Its description. Kit part: `note`. |
| `cheat-used` | How many times this save has used it, on a badge. Kit part: `badge`. |

#### Unlocks

From [`@ifloom/plugin-unlocks/react`](/docs/reference/plugins/unlocks#drawing-it).

| Part | What it is |
|---|---|
| `unlocks` | The code box and the list of unlocks. |
| `unlocks-title` | Its **Enter a code** heading. Kit part: `heading`. |
| `unlock-form` | The text box and the **Unlock** button. Kit part: `form`. |
| `unlock-input` | The text box. Kit part: `input`. |
| `unlocks-message` | Why the last code didn't work. |
| `unlocks-entered` | What the last code unlocked. |
| `unlock-problem` | Content the profile remembers that couldn't be opened. |
| `unlocks-list` | The list of unlocks. |
| `unlock` | One unlock. Carries `data-unlock`, and `data-unlocked` once it's unlocked. Kit part: `card`. |
| `unlock-name` | Its label, with its badge. Kit part: `title`. |
| `unlock-state` | The **Locked** or **Unlocked** badge. Kit part: `badge`. |
| `unlock-text` | Its description. Kit part: `note`. |

#### Shop

From [`@ifloom/plugin-shop/react`](/docs/reference/plugins/shop#drawing-it).

| Part | What it is |
|---|---|
| `shop` | A vendor's counter, in its dialog. Carries `data-vendor`, and `data-closed` while it's closed. |
| `shop-closed` | Why it's closed. |
| `shop-empty` | What it says when nothing is on offer. |
| `goods` | The list of goods. |
| `good` | One good. Carries `data-good`. Kit part: `card`. |
| `good-image` | Its picture, when the thing has one. Kit part: `thumb`. |
| `good-name` | Its name. Kit part: `title`. |
| `good-desc` | Its description, when it has one. Kit part: `note`. |
| `good-details` | The line under it: the discount, the full price, the stock and how many the player has. |
| `good-off` | Today's discount (`50% off`). Kit part: `badge`. |
| `good-full-price` | The price before it, struck out. |
| `good-stock` | How many are left. |
| `good-owned` | How many the player has. |
| `good-actions` | The **Buy** and **Sell** buttons, each a `choice`. Kit part: `commands`. |

#### Jobs

From [`@ifloom/plugin-jobs/react`](/docs/reference/plugins/jobs#drawing-it).

| Part | What it is |
|---|---|
| `jobs` | The job board. |
| `jobs-title` | Its heading. Kit part: `heading`. |
| `job` | One job. Carries `data-job`, and `data-hired` or `data-fired`. Kit part: `card`. |
| `job-title` | Its title, with the rank and **Let go** badges. Kit part: `title`. |
| `job-rank` | The rank held. Kit part: `badge`. |
| `job-fired` | The **Let go** badge. Kit part: `badge`. |
| `job-text` | Its description. Kit part: `note`. |
| `job-details` | The lines about pay, the next shift and the next rank. |
| `job-pay` | What a shift pays. |
| `job-shift` | When the next shift is. |
| `job-next` | The next rank, and how far off it is. Kit part: `note`. |
| `job-record` | The shifts worked and missed. Kit part: `note`. |
| `job-actions` | The **Apply** or **Work a shift** button (a `choice`) and **Quit** (a `button`). Kit part: `commands`. |

#### Devices

From [`@ifloom/plugin-devices/react`](/docs/reference/plugins/devices#drawing-it).

| Part | What it is |
|---|---|
| `devices` | The row of device buttons. |
| `device-button` | One device's button. Carries `data-device`. Kit part: `opener`. |
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
| `app-entry` | One entry in it. Carries `data-entry`. Kit part: `card`. |
| `app-entry-image` | The entry's picture. Kit part: `thumb`. |
| `app-entry-title` | Its title. Kit part: `title`. |
| `app-entry-text` | Its text. Kit part: `note`. |

#### Messages

From [`@ifloom/plugin-messages/react`](/docs/reference/plugins/messages#drawing-it).

| Part | What it is |
|---|---|
| `channel` | A messages channel. Carries `data-channel`. |
| `conversations` | The conversation list, one row a thread. |
| `conversation` | One thread in the list, a button that opens it. Carries `data-thread`, and `data-unread` with the count while any is unread. |
| `conversation-portrait` | The sender's portrait in the list. |
| `conversation-name` | The sender's name in the list. |
| `conversation-last` | The thread's last line, or that they're typing. |
| `conversation-unread` | The unread dot. |
| `messages-empty` | The line a channel with nothing in it shows. |
| `thread` | An open thread. Carries `data-thread`. |
| `thread-back` | The button back to the list. |
| `thread-title` | The thread's heading, with the sender's name. |
| `thread-portrait` | The sender's portrait. |
| `message` | One message with the reply under it. |
| `bubble` | A message bubble. Carries `data-from`, `them` or `player`. The message's beats are inside it. The typing bubble carries `data-typing` too. |
| `typing` | The three dots in the typing bubble. |

#### Feed

From [`@ifloom/plugin-feed/react`](/docs/reference/plugins/feed#drawing-it).

| Part | What it is |
|---|---|
| `feed` | A feed. Carries `data-feed`. |
| `post` | One post. Carries `data-post`. Kit part: `card`. |
| `post-author` | The poster's name and portrait. |
| `post-portrait` | The poster's portrait. |
| `post-image` | The post's picture. |
| `post-text` | Its words, as beats. |
| `post-meta` | Its likes. Kit part: `note`. |
| `post-comment` | One comment. |
| `post-comment-name` | The commenter's name. |

#### Debug

From [`@ifloom/plugin-debug/react`](/docs/reference/plugins/debug#drawing-it).

| Part | What it is |
|---|---|
| `debug` | The whole card. |
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
| `title-button` | Each button in it. Carries `data-title-button` with what it does: `continue`, `new`, `new-game-plus`, `load`, `settings`, `achievements`, `credits`, or the id of a page of your own. |
| `page-heading` | The heading of the settings, load, credits and achievements pages. |
| `page-back` | Their Back button. |
| `settings-page` | The settings page. |
| `settings` | Its list of settings. |
| `setting` | One setting. Carries `data-setting` with its id and `data-affects` with `play` or `ui`. |
| `setting-label` | The setting's label. |
| `setting-control` | Its checkbox, radio buttons or slider. |
| `setting-value` | A slider's value, beside it. |
| `settings-empty` | The line shown when the game has no settings. |
| `settings-message` | Why the last change to a setting was refused. |
| `settings-mods` | The settings page's Mods section, when the game has mods. Carries `data-settings-mods`. |
| `mods-title` | Its heading. |
| `mods-hint` | The line under the heading. |
| `load-page` | The load page. Its slots use the saves menu's parts, `save-slot` and the rest. |
| `credits-page` | The credits page. |
| `credits` | Its list. |
| `credit` | One line of it. |
| `credit-link` | A line that is a link. |
| `achievements-page` | The achievements page, in a game with the achievements plugin. Its list uses the `achievements` parts. |
| `gate-page` | The gate, before the title screen. |
| `gate-title` | Its title. |
| `gate-text` | Its paragraphs. |
| `gate-buttons` | The row with its buttons. |
| `gate-confirm` | The button that moves on. |
| `gate-decline` | The button that doesn't. A link when it has an `href`. |

Each of the four presets gives the title screen its own look: a centred column with a large title, and buttons in the preset's style.
