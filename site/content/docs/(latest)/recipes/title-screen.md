---
title: "The title screen and settings"
description: Open your game on a title screen, give the player settings, and offer New Game+ once they've finished.
---
The [React UI](/docs/react) has a title screen, a settings page and New Game+ built in, and you turn them on with an option. A game drawn with plain DOM, Vue or Svelte builds the same screens from the [runner](/docs/reference/runner), the engine's [settings](/docs/reference/settings) and the player's [profile](/docs/reference/profile). Each code block has a tab for each.

## Turn on the title screen

In the React UI, pass `pages` to [`mountGame`](/docs/react#mountgame). With the other templates, draw a title screen of your own before the game. This one offers New game, and Continue once there's a save to go on from:

```ts tab="Plain JS" tab-group="framework"
// src/title.ts
import type { Runner } from '@ifloom/engine'

/** New game, and Continue from the newest save once there is one (the autosave counts). `start` draws the game. */
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
  // Newest first; a save that can't be read is never the one to continue.
  const newest = (await runner.saves?.list())?.find((save) => !('broken' in save))
  if (newest) {
    const carryOn = buttons.appendChild(document.createElement('button'))
    carryOn.textContent = 'Continue'
    carryOn.onclick = async () => {
      const loaded = await runner.load(newest.slot)
      if (loaded.ok) start()
    }
  }
}

// src/main.ts, in the vanilla template: the title screen first, then the game.
void titleScreen(root, runner, () => {
  runner.subscribe(() => draw(runner.view()))
  draw(runner.view())
})
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(module.build(), { layout: Layout, pages: true })
```

```ts tab="React" tab-group="framework"
// Or, instead of `true`, a subtitle, a picture and credits:
mountGame(game, {
  layout: Layout,
  pages: {
    subtitle: 'A new flat, a new town, and a cat with no name.',
    art: 'art/title.jpg',
    credits: ['Written by you', { label: 'Made with IFLoom', href: 'https://ifloom.dev/' }],
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
  newest.value = (await runner.saves?.list())?.find((save) => !('broken' in save))?.slot ?? null
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
    <!-- the game, as the template draws it -->
  </template>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/TitleScreen.svelte -->
<script lang="ts">
  import { runner, view } from './runner.ts'

  // New game, and Continue from the newest save once there is one (the autosave counts).
  let { onstart }: { onstart: () => void } = $props()
  const newest = runner.saves?.list().then((saves) => saves.find((save) => !('broken' in save))?.slot ?? null)

  async function newGame() {
    await runner.newGame()
    onstart()
  }

  async function carryOn(slot: string) {
    const loaded = await runner.load(slot)
    if (loaded.ok) onstart()
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

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte: the title screen until the player starts, then the game -->
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

The runner gives you what a title screen needs:

- [`runner.saves.list()`](/docs/reference/saves#saves) lists the saves newest first, the autosave among them, then any that can't be read, as `{ slot, broken }`.
- [`runner.newGame()`](/docs/reference/runner#newgame) starts afresh with the player's stored settings.
- [`runner.load`](/docs/reference/runner#the-runners-members) loads a slot. It returns a string when a save can't be read, so show that to the player.

A subtitle, a picture or credits are markup you add to your own screen.

In the React UI, the page opens on a title screen with the game's title and a New game button. New game starts the story with `runner.newGame`, and the player's menu gains a Title screen button that goes back. Other buttons appear once there's something behind them:

- **Continue** loads the newest save. It shows once the player has saved, or the game has autosaved.
- **Load** opens a list of every save.
- **Settings** shows once your game declares a setting.
- **Credits** shows once you give some credits.
- **New Game+** shows once the player has finished the game, if it carries anything over.

A credit is a line of text, or a link with a `label` and an `href`. A missing `art` file takes no space, so you can add the picture later.

Settings are kept between games in the player's profile, so the runner needs one. [`browserRunner`](/docs/browser#browserrunner) and `mountGame` make one for you. If you build your runner by hand, give it a profile:

```ts
import { localStorageDriver } from '@ifloom/browser'
import { createRunner, profile, saves, startingState } from '@ifloom/engine'

const runner = createRunner(game, startingState(game), {
  saves: saves(game, localStorageDriver()),
  profile: profile(game, localStorageDriver()),
})
```

In the React UI, draw [`GameShell`](/docs/react#gameshell) with that runner and pass it the same `pages` prop, as in `<GameShell runner={runner} pages={{ subtitle: 'A new flat, a new town' }} />`.

## Add settings

Declare settings in your content's `settings`. This declares one of each kind the [showcase](/docs/guide/showcase) uses:

```ts
const town: Content = {
  settings: [
    { id: 'hints', label: 'Show hints', type: 'toggle', default: true },
    {
      id: 'textSize',
      label: 'Text size',
      type: 'choice',
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

The React UI's settings page draws each one for you: a checkbox for a toggle, radio buttons for a choice, and a slider for a range. The player reaches it from the title screen, or from the menu during a game. With the other templates, draw `view.settings` yourself. Each [`SettingView`](/docs/reference/view#settingview) has its value and the kind of control it wants. Read every value with [`runner.settings()`](/docs/reference/runner#settings), and send a change of either kind with [`runner.setSetting`](/docs/reference/runner#setsetting).

A setting is either part of the game or only part of how it looks. [Settings](/docs/reference/settings) has the details, and the next two sections show each kind in use.

### A setting the story reads

`hints` leaves out `affects`, so it's a play setting. Its value is in the game state and the save, and a condition reads it like a kv key:

```ts
body: [
  { prose: 'place.high-street' },
  { prose: 'place.high-street.hint', when: { setting: 'hints' } },
],
```

When the player changes it, from the title screen or the menu, `runner.setSetting` sends a [`setting`](/docs/reference/commands#setting) command. The change applies to the game in play at once, it's logged with the other commands, and it's stored in the profile, so the next new game starts with it too.

A save keeps the settings it was made with, so loading an old save brings its own values back.

### A setting only the page reads

`textSize` has `affects: 'ui'`, so it never enters the game state. Conditions can't read it. It lives only in the player's [profile](/docs/reference/profile), and your own code applies it.

Read it where you draw the story, with [`runner.settings()`](/docs/reference/runner#settings). The runner calls its listeners when the player changes it, so whatever redraws on a change picks it up. In the React UI, [`useSetting`](/docs/react/components#usesetting) reads it and redraws the component:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template. In draw():
root.classList.toggle('large', runner.settings().textSize === 'large')
```

```tsx tab="React" tab-group="framework"
import { useSetting } from '@ifloom/react'

function Story({ children }: { children: React.ReactNode }) {
  const size = useSetting('textSize')
  return <div className={size === 'large' ? 'text-lg' : undefined}>{children}</div>
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Story.vue -->
<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { runner } from './runner.ts'

const size = ref(runner.settings().textSize)
const stop = runner.subscribe(() => (size.value = runner.settings().textSize))
onUnmounted(stop)
</script>

<template>
  <div :class="{ large: size === 'large' }"><slot /></div>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Story.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { runner } from './runner.ts'

  let { children }: { children: Snippet } = $props()
  let size = $state(runner.settings().textSize)
  $effect(() => runner.subscribe(() => (size = runner.settings().textSize)))
</script>

<div class:large={size === 'large'}>{@render children()}</div>
```

To apply it to every page, including the title screen, put it on the page instead. This works the same whatever draws the game. The showcase copies it from the runner to an attribute on `<html>`:

```ts
// src/main.tsx
function showTextSize() {
  document.documentElement.dataset.textSize = runner.settings().textSize === 'large' ? 'large' : 'normal'
}
showTextSize()
runner.subscribe(showTextSize)
```

Then the stylesheet uses the attribute. The React UI sizes everything in `rem`, so a larger root font scales the whole page, and so will your own stylesheet if it does the same:

```css
/* src/styles.css */
:root[data-text-size="large"] {
  font-size: 118.75%;
}
```

## Offer New Game+

New Game+ starts a new game that keeps a little of the last one. Say when the game counts as finished, and what carries over, in your [content](/docs/reference/loader#content):

```ts
export const endings: Content = {
  finished: { scene: ['end.kept', 'end.posted'] },
  carryOver: { kv: ['readBefore'] },
}
```

The Letter puts them in `story/ch3.ts`, beside its endings. The first time `finished` holds, the runner records it in the profile's `core:finished`. From then on the React UI's title screen shows a New Game+ button. It starts a new game carrying over from the newest save, or from the game in play if there's no save. On a title screen of your own, offer it once `runner.profile.get('core:finished')` has a value, and start it with [`runner.newGame({ carry })`](/docs/reference/runner#newgame), where `carry` is the state to carry over from, such as `runner.state`. Only what `carryOver` lists is kept. Everything else starts fresh. See [New Game+](/docs/reference/state#new-game) for exactly what's copied.

The Letter sets `readBefore` as the reader reaches an ending, and its first chapter has a line that only a second reader sees:

```ts
{ id: 'post', effects: [{ kv: 'readBefore', to: true }, { scene: 'end.posted' }] }

body: [
  { prose: 'ch1.mat' },
  { prose: 'ch1.mat.again', when: { kv: 'readBefore' } },
],
```

## A notice before the title screen

Some games need the player to read something first, such as a content note. In the React UI, give `pages` a `gate`. With the other templates, draw the notice before the title screen, and remember in the profile that the player has read it:

```ts tab="Plain JS" tab-group="framework"
// src/gate.ts
import type { Runner } from '@ifloom/engine'

/** The notice, unless the player confirmed it before on this device. `next` draws the title screen. */
export async function gate(root: HTMLElement, runner: Runner, next: () => void): Promise<void> {
  if (await runner.profile?.get('ui:gate')) return next()
  root.replaceChildren()
  root.appendChild(document.createElement('h1')).textContent = 'Before you start'
  root.appendChild(document.createElement('p')).textContent = 'This story mentions a house fire.'
  root.appendChild(document.createElement('p')).textContent = 'It happens off the page.'
  const confirm = root.appendChild(document.createElement('button'))
  confirm.textContent = 'Carry on'
  confirm.onclick = async () => {
    await runner.profile?.set('ui:gate', true)
    next()
  }
  Object.assign(root.appendChild(document.createElement('a')), { href: 'https://example.com/', textContent: 'Not today' })
}
```

```ts tab="React" tab-group="framework"
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

```vue tab="Vue" tab-group="framework"
<!-- src/Gate.vue: draw it before the title screen until it emits `done` -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { runner } from './runner.ts'

const emit = defineEmits<{ done: [] }>()
onMounted(async () => {
  if (await runner.profile?.get('ui:gate')) emit('done')
})

async function confirm() {
  await runner.profile?.set('ui:gate', true)
  emit('done')
}
</script>

<template>
  <h1>Before you start</h1>
  <p>This story mentions a house fire.</p>
  <p>It happens off the page.</p>
  <button @click="confirm">Carry on</button>
  <a href="https://example.com/">Not today</a>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Gate.svelte: draw it before the title screen until it calls `ondone` -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { runner } from './runner.ts'

  let { ondone }: { ondone: () => void } = $props()
  onMount(async () => {
    if (await runner.profile?.get('ui:gate')) ondone()
  })

  async function confirm() {
    await runner.profile?.set('ui:gate', true)
    ondone()
  }
</script>

<h1>Before you start</h1>
<p>This story mentions a house fire.</p>
<p>It happens off the page.</p>
<button onclick={confirm}>Carry on</button>
<a href="https://example.com/">Not today</a>
```

The player sees it before the title screen. Confirming moves on to the title screen and is remembered in the profile, so the notice doesn't show again on that device. Declining follows the link. Every word on it is yours, and IFLoom adds nothing.

In the React UI's `gate`, blank lines in `text` split it into paragraphs, and declining follows `href`. Without an `href`, the decline button does nothing and the player stays on the notice.

## Pages of your own

A game can add a screen of its own, such as a gallery or a list of endings found. This one reads `core:finished`, which the runner writes to the profile the first time the game is finished. In the React UI, give `pages.pages` a component for each page, by id, and the title screen gets a button for it. With the other templates, show it from a button on your own title screen:

```ts tab="Plain JS" tab-group="framework"
// src/endings.ts
import type { Runner } from '@ifloom/engine'

/** The endings page. `back` draws the title screen again. */
export async function endings(root: HTMLElement, runner: Runner, back: () => void): Promise<void> {
  const finished = await runner.profile?.get<{ at: number }>('core:finished')
  root.replaceChildren()
  root.appendChild(document.createElement('h1')).textContent = 'Endings'
  root.appendChild(document.createElement('p')).textContent = finished ? 'You have reached an ending.' : 'No endings yet.'
  const button = root.appendChild(document.createElement('button'))
  button.textContent = 'Back'
  button.onclick = back
}
```

```tsx tab="React" tab-group="framework"
import { mountGame, useProfile, usePage } from '@ifloom/react'

function Endings() {
  const { back } = usePage()
  const finished = useProfile<{ at: number }>('core:finished')
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

```vue tab="Vue" tab-group="framework"
<!-- src/Endings.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { runner } from './runner.ts'

const emit = defineEmits<{ back: [] }>()
const finished = ref<{ at: number }>()
onMounted(async () => {
  finished.value = await runner.profile?.get<{ at: number }>('core:finished')
})
</script>

<template>
  <section>
    <h1>Endings</h1>
    <p>{{ finished ? 'You have reached an ending.' : 'No endings yet.' }}</p>
    <button @click="emit('back')">Back</button>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Endings.svelte -->
<script lang="ts">
  import { runner } from './runner.ts'

  let { onback }: { onback: () => void } = $props()
  const finished = runner.profile?.get<{ at: number }>('core:finished')
</script>

<section>
  <h1>Endings</h1>
  {#await finished then reached}
    <p>{reached ? 'You have reached an ending.' : 'No endings yet.'}</p>
  {/await}
  <button onclick={onback}>Back</button>
</section>
```

In the React UI, the component is drawn as the whole page, with no props. Use [`usePage`](/docs/react/components#usepage) to move between pages and [`useProfile`](/docs/react/components#useprofile) to read what outlives a save. Set `showOnTitle: false` to leave its button off the title screen, and open it yourself with `usePage().go('endings')`. A plugin package can add a page the same way.

## Make it look like your game

Your own title screen looks however your stylesheet says. In the React UI, each of the four [presets](/docs/react/customising#1-pick-a-theme-preset) gives the title screen its own look. To change it, style its parts, such as `title-name` for the title and `title-button` for each button. [The pages](/docs/react/customising#the-pages) lists them all. To replace a page entirely, pass your own `TitlePage`, `SettingsPage`, `LoadPage`, `CreditsPage` or `GatePage` in [`components`](/docs/react/customising#6-replace-a-component).
