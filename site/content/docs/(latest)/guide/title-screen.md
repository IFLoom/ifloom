---
title: "The title screen and settings"
description: Open your game on a title screen, give the player settings, and offer New Game+ once they've finished.
---
This page shows you how to open your game on a title screen, add settings the player can change, and offer New Game+ once they've finished. It uses the [React UI](/docs/react). A game drawn some other way can build the same pages from the runner and the engine's [settings](/docs/reference/settings) and [profile](/docs/reference/profile), and [Without the React UI](#without-the-react-ui) builds a title screen in Vue and Svelte.

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

## Without the React UI

The title screen, the settings page and the rest are part of the React UI. A game drawn with the [`vue` or `svelte` template](/docs/guide/frameworks) builds its own from the runner. This one offers New game, and Continue once there's a save to go on from:

```vue tab="Vue"
<!-- src/TitleScreen.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { runner, view } from './runner.ts'

// New game, and Continue from the newest save once there is one (the autosave counts).
const emit = defineEmits<{ start: [] }>()
const newest = ref<string | null>(null)
onMounted(async () => {
  newest.value = (await runner.saves?.list())?.[0]?.slot ?? null
})

async function newGame() {
  await runner.newGame()
  emit('start')
}

async function carryOn(slot: string) {
  const loaded = await runner.load(slot)
  if (loaded && typeof loaded !== 'string') emit('start')
}
</script>

<template>
  <h1>{{ view.title }}</h1>
  <div class="choices">
    <button @click="newGame">New game</button>
    <button v-if="newest" @click="carryOn(newest)">Continue</button>
  </div>
</template>
```

```svelte tab="Svelte"
<!-- src/TitleScreen.svelte -->
<script lang="ts">
  import { runner, view } from './runner.ts'

  // New game, and Continue from the newest save once there is one (the autosave counts).
  let { onstart }: { onstart: () => void } = $props()
  const newest = runner.saves?.list().then((saves) => saves[0]?.slot ?? null)

  async function newGame() {
    await runner.newGame()
    onstart()
  }

  async function carryOn(slot: string) {
    const loaded = await runner.load(slot)
    if (loaded && typeof loaded !== 'string') onstart()
  }
</script>

<h1>{$view.title}</h1>
<div class="choices">
  <button onclick={newGame}>New game</button>
  {#await newest then slot}
    {#if slot}<button onclick={() => carryOn(slot)}>Continue</button>{/if}
  {/await}
</div>
```

Show it until the player starts, then the game:

```vue tab="Vue"
<!-- src/App.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import TitleScreen from './TitleScreen.vue'

const started = ref(false)
</script>

<template>
  <TitleScreen v-if="!started" @start="started = true" />
  <template v-else>
    <!-- the game, as the template draws it -->
  </template>
</template>
```

```svelte tab="Svelte"
<!-- src/App.svelte -->
<script lang="ts">
  import TitleScreen from './TitleScreen.svelte'

  let started = $state(false)
</script>

{#if !started}
  <TitleScreen onstart={() => (started = true)} />
{:else}
  <!-- the game, as the template draws it -->
{/if}
```

[`runner.saves.list()`](/docs/reference/saves#saves) lists the saves newest first, the autosave among them. [`runner.newGame()`](/docs/reference/runner#newgame) starts afresh with the player's stored settings, and [`runner.load`](/docs/reference/runner#the-runners-members) returns a string when a save can't be read, which is worth showing.

For a settings page, draw `view.settings`. Each [`SettingView`](/docs/reference/view#settingview) has its value and what kind of control it wants. Send a `play` setting as a [`setting`](/docs/reference/commands#setting) command, and change a `ui` setting with [`runner.setUiSetting`](/docs/reference/runner#setuisetting).

## Make it look like your game

Each of the four [presets](/docs/react/customising#1-pick-a-theme-preset) gives the title screen its own look. To change it, style its parts, such as `title-name` for the title and `title-button` for each button. [The pages](/docs/react/customising#the-pages) lists them all. To replace a page entirely, pass your own `TitlePage`, `SettingsPage`, `LoadPage`, `CreditsPage` or `GatePage` in [`components`](/docs/react/customising#6-replace-a-component).
