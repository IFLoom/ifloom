---
title: "Add a title screen"
description: "Open the game on a title screen with New game and Continue, the React UI's own or one you render yourself."
---
Use this to open your game on a title screen rather than straight into the story. The [React UI](/docs/reference/react) has one built in, turned on with an option. With a UI of your own, you render the screen from the [runner](/docs/reference/runner).

## Turn on the title screen

In the React UI, pass `pages` to [`mountGame`](/docs/reference/react#mountgame). With a UI of your own, render a title screen before the game. This one offers New game, and Continue once there's a save to go on from:

```ts tab="Plain JS" tab-group="framework"
// src/title.ts
import type { Runner } from '@ifloom/engine'

/** New game, and Continue from the newest save once there is one (the autosave counts). `start` renders the game. */
export async function titleScreen(root: HTMLElement, runner: Runner, start: () => void): Promise<void> {
  root.replaceChildren()
  root.appendChild(document.createElement('h1')).textContent = runner.view().title
  const buttons = root.appendChild(document.createElement('div'))
  buttons.className = 'choices'
  const fresh = buttons.appendChild(document.createElement('button'))
  fresh.textContent = 'New game'
  fresh.onclick = async () => {
    await runner.newGame()
    start()
  }
  // Newest first; a save that can't be read is never the one to continue. Without storage, there's nothing to continue.
  const listed = await runner.saves?.list()
  const newest = listed?.ok ? listed.value.find((save) => !('broken' in save)) : undefined
  if (newest) {
    const carryOn = buttons.appendChild(document.createElement('button'))
    carryOn.textContent = 'Continue'
    carryOn.onclick = async () => {
      const loaded = await runner.load(newest.slot)
      if (loaded.ok) start()
    }
  }
}
```

```ts fragment tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template: the title screen first, then the game.
import { titleScreen } from './title.ts'

void titleScreen(root, runner, () => {
  runner.subscribe(({ view }) => draw(view))
  draw(runner.view())
})
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(module.build(), {
  layout: Layout,
  pages: {
    subtitle: 'A new flat, a new town, and a cat with no name.',
    art: 'art/title.jpg',
  },
})
```

```vue tab="Vue" tab-group="framework"
<!-- src/TitleScreen.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { runner, view } from './runner.ts'

// New game, and Continue from the newest save once there is one (the autosave counts).
const emit = defineEmits<{ start: [] }>()
const newest = ref<string | null>(null)
onMounted(async () => {
  const listed = await runner.saves?.list()
  newest.value = (listed?.ok ? listed.value : []).find((save) => !('broken' in save))?.slot ?? null
})

async function newGame() {
  await runner.newGame()
  emit('start')
}

async function carryOn(slot: string) {
  const loaded = await runner.load(slot)
  if (loaded.ok) emit('start')
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

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue: the title screen until the player starts, then the game -->
<script setup lang="ts">
import { ref } from 'vue'
import TitleScreen from './TitleScreen.vue'

const started = ref(false)
</script>

<template>
  <TitleScreen v-if="!started" @start="started = true" />
  <template v-else>
    <!-- the game, as the template renders it -->
  </template>
</template>
```

`pages: true` turns the React UI's title screen on with no subtitle or picture. A missing `art` file takes no space, so you can add the picture later. The credits come from your content's `credits`, which [Credit your team and supporters](/docs/how-to/credit-your-team-and-supporters) adds.

Your own title screen reads three things from the runner:

- [`runner.saves.list()`](/docs/reference/saves#saves) lists the saves newest first, the autosave among them, then any that can't be read, as `{ slot, broken }`. It answers a [`Result`](/docs/reference/common#result), which fails where the browser refuses storage, so the screen offers only New game then.
- [`runner.newGame()`](/docs/reference/runner#newgame) starts afresh with the player's stored settings.
- [`runner.load`](/docs/reference/runner#save-load-and-restore) loads a slot. Its `Result` fails with a `reason` when a save can't be read, so show that to the player.

## Know what the React UI's title screen offers

The React UI opens on the title screen, with the game's title and a New game button, and the player's menu gains a Title screen button that goes back. Other buttons show once there's something behind them:

- **Continue** loads the newest save, once the player has saved or the game has autosaved.
- **Load** opens a list of every save.
- **Settings** opens the settings page, once your game declares a setting (see [Add a settings page](/docs/how-to/add-a-settings-page)).
- **Credits** shows the credits, once your content's [`credits`](/docs/reference/credits) name someone.
- **New Game+** starts a new game that keeps a little of the last, once the player has finished the game (see [Offer New Game+](/docs/how-to/offer-new-game-plus)).

The title screen keeps settings and the finished mark in the player's [profile](/docs/reference/profile), so the runner needs one. `mountGame` and [`browserRunner`](/docs/reference/browser#browserrunner) make one for you. If you build your runner by hand, give it a profile:

```ts given
import { localStorageDriver } from '@ifloom/browser'
import { createRunner, profile, saves, startingState } from '@ifloom/engine'

const runner = createRunner(game, startingState(game), {
  saves: saves(game, localStorageDriver()),
  profile: profile(game, localStorageDriver()),
})
```

Then render [`GameShell`](/docs/reference/react#gameshell) with that runner and the same `pages` prop, as in `<GameShell runner={runner} pages={{ subtitle: 'A new flat, a new town' }} />`.

## Make it look like your game

Your own title screen looks however your stylesheet says. In the React UI, each [preset](/docs/how-to/react/theme-the-react-ui) gives the title screen its own look. To change it, style its parts, such as `title-name` for the title and `title-button` for each button:

```css
[data-part="title-name"] { font-family: "Georgia", serif; letter-spacing: 0.05em; }
[data-part="title-button"] { min-width: 12rem; }
```

[The pages](/docs/reference/react/parts#the-pages) lists every part of the title screen and the pages around it. To replace a page entirely, pass your own `TitlePage`, `SettingsPage`, `LoadPage`, `CreditsPage` or `GatePage` in `components`, as [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts) shows.

## Check it worked

Run `npm run dev`. The page opens on the title screen. Press New game, then save from the menu, and go back to the title screen with Title screen: Continue now shows and loads that save.

For more, see:

- [`PagesOptions`](/docs/reference/react/components#pagesoptions) and [`TitlePage`](/docs/reference/react/components#titlepage).
- [The runner](/docs/reference/runner) and [Saves](/docs/reference/saves).
- [Add pages around the game](/docs/how-to/add-pages-around-the-game), for a notice before the title screen and pages of your own.
