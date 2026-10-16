---
title: "The title screen and settings"
description: Open your game on a title screen, give the player settings, and offer New Game+ once they've finished.
---
This page shows you how to open your game on a title screen, add settings the player can change, and offer New Game+ once they've finished. It uses the [React UI](/docs/react). A game drawn some other way can build the same pages from the engine's [settings](/docs/reference/settings) and [profile](/docs/reference/profile).

## Turn on the title screen

Pass `pages` to [`mountGame`](/docs/react#mountgame):

```ts
// src/main.ts
import { READING_LAYOUT, mountGame } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

mountGame(game, { layout: READING_LAYOUT, pages: true })
```

The page now opens on a title screen with the game's title and a New game button. New game starts the story with [`runner.newGame`](/docs/reference/runner#newgame). The player's menu gains a **Title screen** button that goes back.

Other buttons appear once there's something behind them:

- **Continue** loads the newest save. It shows once the player has saved, or the game has autosaved.
- **Load** opens a list of every save.
- **Settings** shows once your game declares a setting.
- **Credits** shows once you give some credits.
- **New Game+** shows once the player has finished the game, if it carries anything over.

Instead of `true`, give it options for a subtitle, a picture and credits:

```ts
mountGame(game, {
  layout: READING_LAYOUT,
  pages: {
    subtitle: 'A new flat, a new town, and a cat with no name.',
    art: 'art/title.jpg',
    credits: ['Written by you', { label: 'Made with IFLoom', href: 'https://ifloom.github.io/ifloom/' }],
  },
})
```

A credit is a line of text, or a link with a `label` and an `href`. A missing `art` file takes no space, so you can add the picture later.

If you build your runner by hand and draw [`GameShell`](/docs/react#gameshell) yourself, pass the same `pages` prop to it, and give the runner a profile so settings are kept between games:

```tsx
import { createRunner, localStorageDriver, profile, saves, startingState } from '@ifloom/engine'

const runner = createRunner(game, startingState(game), {
  saves: saves(game, localStorageDriver()),
  profile: profile(game, localStorageDriver()),
})

<GameShell runner={runner} pages={{ subtitle: 'A new flat, a new town' }} />
```

`mountGame` makes the profile for you.

## Add settings

Declare settings in your pack's `settings`. Here's one of each kind the [showcase](/docs/guide/showcase) uses:

```ts
const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  settings: [
    { id: 'hints', label: 'Show hints', kind: 'toggle', default: true },
    {
      id: 'textSize',
      label: 'Text size',
      kind: 'choice',
      affects: 'ui',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Large' },
      ],
      default: 'normal',
    },
  ],
  // …
}
```

The settings page draws each one for you: a checkbox for a toggle, radio buttons for a choice, and a slider for a range. The player reaches it from the title screen, or from the menu during a game.

A setting is either part of the game or only part of how it looks. [Settings](/docs/reference/settings) has the details, and the next two sections show each kind in use.

### A setting the story reads

`hints` leaves out `affects`, so it's a play setting. Its value is in the game state and the save, and a condition reads it like a variable:

```ts
body: [
  { text: 'place.high-street' },
  { text: 'place.high-street/hint', when: { setting: 'hints' } },
],
```

Where the player changes it matters:

- **From the title screen**, before a game, the new value is stored in the profile. The game in play doesn't change, and the next new game starts with it.
- **During a game**, from the menu, the UI sends a [`setting`](/docs/reference/commands#setting) command. The change applies at once, it's logged with the other commands, and it's stored in the profile for later games too.

A save keeps the settings it was made with, so loading an old save brings its own values back.

### A setting only the page reads

`textSize` has `affects: 'ui'`, so it never enters the game state. Conditions can't read it. It lives only in the player's [profile](/docs/reference/profile), and your own code applies it.

In a component, read it with [`useSetting`](/docs/react/components#usesetting). It redraws when the player changes it:

```tsx
import { useSetting } from '@ifloom/react'

function Story({ children }: { children: React.ReactNode }) {
  const size = useSetting('textSize')
  return <div className={size === 'large' ? 'text-lg' : undefined}>{children}</div>
}
```

To apply it to every page, including the title screen, put it on the page instead. The showcase copies it from the profile to an attribute on `<html>`:

```ts
// src/main.tsx
function showTextSize(settings: unknown) {
  const size = (settings as Record<string, unknown> | undefined)?.textSize
  document.documentElement.dataset.textSize = size === 'large' ? 'large' : 'normal'
}
void stored.get('settings').then(showTextSize)
stored.subscribe((namespace, value) => {
  if (namespace === 'settings') showTextSize(value)
})
```

Then the stylesheet uses the attribute. The React UI sizes everything in `rem`, so a larger root font scales the whole page:

```css
/* src/styles.css */
:root[data-text-size="large"] {
  font-size: 118.75%;
}
```

Here `stored` is the profile given to the runner. With `mountGame`, it's `runner.profile`.

## Offer New Game+

New Game+ starts a new game that keeps a little of the last one. Say when the game counts as finished, and what carries over, in the base you pass to [`loadGame`](/docs/reference/loader#loadgame):

```ts
loadGame([letter], {
  id: 'the-letter',
  title: 'The Letter',
  introScene: 'ch1.mat',
  finished: { scene: ['end.kept', 'end.posted'] },
  carryOver: { flags: ['readBefore'] },
})
```

The first time `finished` holds, the runner records it in the profile. From then on the title screen shows **New Game+**. It starts a new game carrying over from the newest save, or from the game in play if there's no save. Only what `carryOver` lists is kept. Everything else starts fresh. See [New Game+](/docs/reference/state#new-game) for exactly what's copied.

The Letter sets `readBefore` as the reader reaches an ending, and its first chapter has a line that only a second reader sees:

```ts
{ id: 'post', effects: [{ kind: 'flag', key: 'readBefore', value: true }, { kind: 'scene', id: 'end.posted' }] }

body: [
  { text: 'ch1.mat' },
  { text: 'ch1.mat/again', when: { flag: 'readBefore' } },
],
```

## A notice before the title screen

Some games need the player to read something first, such as a content note. Give `pages` a `gate`:

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

The player sees it before the title screen. Blank lines in `text` split it into paragraphs. Confirming moves on to the title screen and is remembered in the profile, so the notice doesn't show again on that device. Declining follows `href`. Without an `href`, the decline button does nothing and the player stays on the notice. Every word on it is yours, and IFLoom adds nothing.

## Pages of your own

A game or a plugin package can add a page and a button for it on the title screen, such as a gallery or a list of endings found. Give `pages.pages` a component for each, by id:

```tsx
import { mountGame, useProfile, usePage } from '@ifloom/react'

function Endings() {
  const { back } = usePage()
  const finished = useProfile<{ at: number }>('finished')
  return (
    <section>
      <h1>Endings</h1>
      <p>{finished ? 'You have reached an ending.' : 'No endings yet.'}</p>
      <button onClick={back}>Back</button>
    </section>
  )
}

mountGame(game, {
  pages: { pages: { endings: { label: 'Endings', component: Endings } } },
})
```

The component is drawn as the whole page, with no props. Use [`usePage`](/docs/react/components#usepage) to move between pages and [`useProfile`](/docs/react/components#useprofile) to read what outlives a save. Set `showOnTitle: false` to leave its button off the title screen, and open it yourself with `usePage().go('endings')`.

## Make it look like your game

Each of the four [presets](/docs/react/customising#1-pick-a-theme-preset) gives the title screen its own look. To change it, style its parts, such as `title-name` for the title and `title-button` for each button. [The pages](/docs/react/customising#the-pages) lists them all. To replace a page entirely, pass your own `TitlePage`, `SettingsPage`, `LoadPage`, `CreditsPage` or `GatePage` in [`components`](/docs/react/customising#6-replace-a-component).
