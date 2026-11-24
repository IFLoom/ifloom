---
title: "Theme the React UI"
description: "Give a game rendered with the React UI a look of its own, with a theme preset, colours, dark mode, a font and CSS."
---
This how-to is for `@ifloom/react`, the optional React UI. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/how-to/render/start).

Use this to change how the React UI looks without changing what it renders. The steps go from the smallest change to the biggest, so stop when the game looks right. The first five are CSS in `src/styles.css`. To move parts or replace components, see [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts).

## Pick a preset

A preset is a stylesheet that sets the fonts, the sizes, the colours and the shape of the page. Import one after the UI's own stylesheet:

```css
/* src/styles.css */
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/storybook.css";
```

| Key | Meaning |
|---|---|
| `paper` | A printed book. A serif page in one centred column, chapter titles in small caps, choices as underlined lines of text, and the stats as a quiet line at the foot. The Letter (`examples/novel`) uses it. |
| `terminal` | A green-screen text adventure. Monospace throughout, light text on black, square corners, choices as a numbered prompt list, and notices as a status line across the top that pushes the page down. |
| `studio` | A clean, modern app. Cards on a soft grey page, the side column on the right, bold headings, choices as raised cards, and the reading column kept to the start of the story. The Corner Café (`examples/cafe`) uses it. |
| `storybook` | Soft and friendly. Rounded type, a warm tinted page, big pill buttons, and dialogue in speech bubbles. The showcase uses it. |

[`ifloom new`](/docs/reference/cli#ifloom-new) writes this import, with the preset you name in `--theme`, or one at random when you name none. With no preset, the UI renders in a system sans-serif, in neutral colours, with the side column on the left.

A preset is plain CSS that sets the tokens below and styles a few parts. It styles the UI's own parts and the [kit's parts](/docs/reference/react/kit#kitpart), never a plugin's own by name, so every plugin's UI looks right in every preset. Read yours in `node_modules/@ifloom/react/src/themes/` to see what it changes, or copy it into `src/styles.css` as the start of your own.

## Set tokens and colours

The UI takes every font, size, gap and colour from CSS variables. Set them on `:root`, after the imports:

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

These are the design tokens, with their defaults:

| Key | Meaning |
|---|---|
| `--font-body` | The font for everything, the system sans-serif by default. |
| `--font-heading` | The font of the game's title, scene titles and card headings, `var(--font-body)` by default. |
| `--text-title` | The size of the game's title, `1.125rem` by default. |
| `--text-scene-title` | The size of a scene's title, `1.5rem` by default. |
| `--leading-prose` | The line height of a scene's text, `1.625` by default. |
| `--shadow-card` | The shadow under notices, which the presets use for their cards too. |
| `--width-prose` | The width of the story's reading column, `70ch` by default. Pictures and panels use the whole story. |
| `--margin-prose` | The reading column's `margin-inline`, `auto` by default, which centres it. `0 auto` keeps it to the start, and [`Story`](/docs/reference/react/components#story)'s `align` wins over it. |
| `--width-reading` | The page's widest without a side column, `42rem` by default. With one, the page is as wide as the window. |
| `--width-sidebar` | The side column's width on a wide screen, `18rem` by default. |
| `--width-notice` | The width of the notices in the bottom corner, `20rem` by default. |
| `--gap-page` | The space between the side column and the story, and between parts in the story, `1.5rem` by default. |
| `--gap-beats` | The space between the paragraphs and lines of a scene, `0.75rem` by default. |

The colours are shadcn/ui's, with three of the UI's own at the end:

| Key | Meaning |
|---|---|
| `--background`, `--foreground` | The page and its text. |
| `--card`, `--card-foreground` | Cards, notices and letters in a scene. |
| `--popover`, `--popover-foreground` | Tooltips and popovers. |
| `--primary`, `--primary-foreground` | Primary buttons, badges, and the player's side of a message thread. |
| `--secondary`, `--secondary-foreground` | Choice buttons, and the other side of a message thread. |
| `--muted`, `--muted-foreground` | Quiet text, such as tags, stat labels and the reason a button is greyed out. |
| `--accent`, `--accent-foreground` | Hovered buttons and app icons. |
| `--destructive`, `--destructive-foreground` | App badges, errors, and a choice's `irreversible` line. |
| `--border`, `--input`, `--ring` | Borders, inputs and the focus ring. |
| `--radius` | Corner rounding. The UI works the smaller and larger radii out from it. |
| `--speech` | A character's spoken line. |
| `--player-speech` | The player's spoken line. |
| `--price` | A price on a button. |

Each colour and token is a Tailwind class too, so `text-speech`, `bg-primary`, `font-heading` and `shadow-card` work in your own components.

## Add a dark mode

The stylesheet has a light set of colours and a dark set. The dark set applies inside an element with the class `dark`, as in shadcn/ui, so put `class="dark"` on `<html>` to turn it on. Set your own dark colours under `.dark`:

```css
.dark {
  --primary: oklch(0.75 0.1 230);
}
```

A preset sets its colours on `:root`, and they apply whether `dark` is on or not. `terminal` is dark already. To give another preset a dark version, write your `.dark` colours after its import, so they come later and win.

## Bundle a font

The tokens name fonts already on the player's computer, such as `ui-serif, Georgia, serif`. A built game opens from disk and fetches nothing while it runs, so a font from Google Fonts or another server won't load. Put the font file in `src/` instead, and point an `@font-face` at it with a relative URL. Vite bundles it with the game:

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

Check that the font's licence lets you ship it inside a game.

## Style parts with CSS

Every element the UI renders carries a `data-part` attribute that names it, such as `scene-title`, `choice` or `stat-value`. Write ordinary CSS against them, with the [identity attributes](/docs/reference/react/parts#identity-attributes) to pick one of several:

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

[React UI parts](/docs/reference/react/parts) lists every part and the attributes each carries. A device's dialog carries `data-frame` and each app icon `data-icon`, so a stylesheet can draw a phone's bezel or map an icon's name to a picture.

A plugin UI's part carries `data-kit` too when it's like one of the [kit's parts](/docs/reference/react/kit#kitpart): a vendor's good, a job and an achievement are each a `card`. Style the kit's part to restyle all of them at once, whichever plugin rendered them:

```css
[data-kit="card"] {
  border-radius: 0;
  border-width: 0 0 1px;
}

/* An earned achievement, or anything else that's done */
[data-kit="card"][data-state="done"] {
  background: var(--secondary);
}
```

:::warning[Keep your rules out of a layer]
Your CSS beats the built-in classes with no `!important`, because Tailwind puts its classes in a [cascade layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) called `utilities`, and CSS outside any layer wins over CSS inside one. A rule you put inside an `@layer`, such as `@layer components`, is layered too, and Tailwind's `utilities` layer comes after it and wins.
:::

## Change the built-in classes

Pass `classes` to change the Tailwind classes on a part, keyed by its `data-part` name:

```ts
import { mountGame, type Classes } from '@ifloom/react'
import module from './game.ts'
import './styles.css'

const classes: Classes = {
  // A string is merged with the built-in classes, and yours win where they clash.
  'scene-title': 'text-3xl tracking-tight',
  choice: 'rounded-none',
  // A function gets the built-in classes and returns the ones to use.
  stats: () => 'flex flex-wrap gap-x-4 text-xs uppercase',
}

mountGame(module.build(), { classes })
```

The UI merges a string with [tailwind-merge](https://github.com/dcastil/tailwind-merge), as [`cn`](/docs/reference/react/kit#cn) does, so `rounded-none` replaces the button's `rounded-md` and every other class stays. A function gets the built-in classes as one string, and its result replaces them. Where several elements share a name, such as `button` or `beat`, the classes go on all of them.

## Start from no classes

Pass `unstyled: true` to drop every built-in class. The elements, their `data-part`s and their behaviour stay, ready for your CSS or your `classes`:

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

With `unstyled`, a string in `classes` is all the part gets, since nothing is left to merge with. The tokens and colours stay, so the page keeps its background and text colour. A few inner wrappers with no `data-part` of their own keep their layout classes, such as the span around a choice's label, and so do the shadcn/ui primitives inside a part, such as the backlog's scroll area.

## Bring your own `tailwindcss`

When your game has its own Tailwind set-up, import `@ifloom/react/theme.css` in place of `styles.css`. It holds the tokens, the colours, dark mode and the `@source` line that makes Tailwind scan the UI's components, with no `@import "tailwindcss"`:

```css
@import "tailwindcss";
@import "@ifloom/react/theme.css";
```

To leave out Tailwind's preflight, its CSS reset, import its theme and utilities on their own:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "@ifloom/react/theme.css";
```

`theme.css` sets no page background or text colour. Add them yourself:

```css
body {
  background: var(--background);
  color: var(--foreground);
}
```

The first-party plugins' UIs use only classes the UI's own components use, so they need nothing more. A plugin of someone else's that ships a stylesheet says so in its README. Import it after this one.

## Use the prebuilt stylesheet

`@ifloom/react/styles.min.css` is `styles.css` already run through Tailwind and minified, and each preset has a prebuilt copy beside it. Import them in `src/main.ts` in place of `src/styles.css`:

```ts
// src/main.ts
import '@ifloom/react/styles.min.css'
import '@ifloom/react/themes/paper.min.css'
```

Then take `tailwindcss()` out of `vite.config.ts`, and `tailwindcss` and `@tailwindcss/vite` out of your dev dependencies. Tokens, presets and rules on `data-part` and `data-kit` work as before, from a stylesheet of your own imported after these. The `classes` option has only the classes the UI already uses, since nothing builds new ones, so restyle with CSS instead.

## Make it look like no other IFLoom game

A new colour on the same shapes still looks like the same game. Shape and type make a game look like itself:

- **Pick a preset that fits the game**, or copy one into `src/styles.css` and change it.
- **Change the fonts.** A serif, a rounded face or a monospace changes the feel more than any colour. Bundle a font file if no system font fits.
- **Change the layout.** Move the side column, drop it, put the stats under the scene, or move the notices. [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts#change-the-shape-of-the-page) changes the shape of the page.
- **Change how choices look.** The player looks at them most. Lines of text, numbered prompts, cards and pills each make a different game.
- **Replace one or two components** that matter to your story, such as `Beat` for the way people talk, or `Notice` for news.

## Check it worked

Run `npm run dev`. The page takes the preset's fonts and shape, a choice shows your border, and the player's own lines are in italics. Put `class="dark"` on `<html>` in the browser's developer tools, and the page switches to your dark colours.

For more, see:

- [React UI parts](/docs/reference/react/parts), for every `data-part` and the attributes it carries.
- [`Classes`](/docs/reference/react/components#classes) and [`UiOptions`](/docs/reference/react/components#uioptions).
- [Kit parts](/docs/reference/react/kit#kit-parts), for the parts the presets style in every plugin UI.
- [Arrange the layout](/docs/how-to/arrange-the-layout), for sections, the reading column and the phone's drawer.
