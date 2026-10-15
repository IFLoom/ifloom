---
description: Draw an IFLoom game with Vue, Svelte, plain DOM or anything else, using the runner's view, apply and subscribe. Walks through the vanilla template and sketches Vue and Svelte bindings.
---

# Using another framework

The engine has no DOM and no framework. The [React UI](/react/) is the ready-made way to draw a game, but you can draw one with Vue, Svelte, plain DOM or anything else that can show text and buttons. This page shows how.

To start, make a game from the `vanilla` template, which draws the game with plain DOM:

```sh
npm run new -- my-game --template vanilla
npm install
npm run dev -w my-game
```

It's the same two-scene game as the `blank` template. Its `package.json` depends on `@ifloom/engine` and `@ifloom/cli` only, with no React.

## What the engine gives a UI

A UI talks to the engine through a [runner](/reference/runner). You need four things from it:

```ts
import { createRunner, startingState, type Command, type View } from '@ifloom/engine'

const runner = createRunner(game, startingState(game), options)

runner.view()              // View: what to draw right now
runner.apply(command)      // run a command, such as a choice the player pressed
runner.subscribe(listener) // call listener after every change of state; returns a function that stops it
```

The loop is always the same:

1. Draw `runner.view()`.
2. When the player presses something, send its `command` with `runner.apply`.
3. When the runner calls your listener, draw `runner.view()` again.

`subscribe` hears about every change, not only your own commands. Undo, redo and loading a save all call it too, so you don't need to redraw after each of those yourself.

`runner.view()` builds a fresh object each time you call it. Call it once per change and keep the result, rather than calling it from every component.

## The vanilla template, step by step

Here's the template's `src/main.ts` in three parts.

First it starts the game. This is what [`mountGame`](/react/#mountgame) does for the React UI, written out:

```ts
// src/main.ts
import { createRunner, localStorageDriver, saves, startingState, type View } from '@ifloom/engine'
import loaded from './game.ts'
import './styles.css'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})
```

`loadGame` returns the game and a list of problems, which `npm run check` also prints. The runner gets a random seed, undo 50 steps deep, saves in `localStorage` and an autosave each turn. See [`RunnerOptions`](/reference/runner#runneroptions) for the rest.

Then a function draws one view into `#root`:

```ts
const root = document.querySelector<HTMLElement>('#root')!

function draw(view: View): void {
  root.replaceChildren()
  const title = root.appendChild(document.createElement('h1'))
  title.textContent = view.title

  if (view.scene.title) root.appendChild(document.createElement('h2')).textContent = view.scene.title
  for (const paragraph of view.scene.body.split('\n\n')) {
    root.appendChild(document.createElement('p')).textContent = paragraph
  }

  const choices = root.appendChild(document.createElement('div'))
  choices.className = 'choices'
  // A scene's choices, or the game's own buttons when no scene is open.
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = choices.appendChild(document.createElement('button'))
    button.textContent = choice.label
    button.disabled = Boolean(choice.disabled)
    if (choice.disabled) button.title = choice.disabled
    button.onclick = () => runner.apply(choice.command)
  }

  const stats = root.appendChild(document.createElement('p'))
  stats.className = 'stats'
  stats.textContent = view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ')
}
```

Every button the player can press is a [`RenderedChoice`](/reference/view#renderedchoice). It carries its `label`, its `command`, and `disabled` with the reason when it can't be pressed. The button sends the command as it is, so your UI never builds a command for a choice itself.

Last, it draws once and redraws on every change:

```ts
runner.subscribe(() => draw(runner.view()))
draw(runner.view())
```

That's the whole UI. It clears and redraws the page each time, which is fine for a page this small.

### Adding an input

The template draws scenes, buttons and stats, and nothing else. A game that asks for a value, such as the name in [Your first story](/guide/first-story), needs its [inputs](/reference/inputs) drawn too. Each one is an [`InputView`](/reference/view#inputview), and you send what the player enters as an `input` command. Add this to `draw`:

```ts
for (const input of Object.values(view.inputs)) {
  const form = root.appendChild(document.createElement('form'))
  const field = form.appendChild(document.createElement('input'))
  field.placeholder = input.label
  if (input.kind === 'number') field.type = 'number'
  if (input.maxLength) field.maxLength = input.maxLength
  form.onsubmit = (event) => {
    event.preventDefault()
    const value = input.kind === 'number' ? Number(field.value) : field.value
    runner.apply({ type: 'input', id: input.id, value })
  }
}
```

An input of kind `choice` has its `options` instead, each with a `value` and a `label`, for a list of buttons or a select.

## What to draw

The [view reference](/reference/view) lists every field. These are the ones most games need, roughly in order:

- `title`, the game's title, and `when`, where the game is in time and place when a plugin says.
- `scene.title`, and `scene.beats` for the prose. Each [beat](/reference/prose#scenebeat) is a paragraph, a spoken line, a picture or a prop. The template draws `scene.body`, the raw prose, which is fine for plain paragraphs.
- `scene.choices` while a scene is open, and `actions` while none is.
- `stats`, the player's stats to show.
- `inputs`, any value the game is asking for.
- `notices`, news the player hasn't dismissed.
- `scene.speaker` and `scene.stageImage`, who is talking and the picture to show with them.
- `plugins`, each plugin's own part of the view, by plugin id. The places plugin's exits are at `plugins.places`, for example. Each plugin's page documents its slice.

`entities`, `collections` and `pack` are there when your game has them.

## Vue and Svelte

The two sketches below bind the same runner to Vue and Svelte. They're sketches, not templates: they haven't been run as games, and you'll want to check them against each framework's own docs.

Both frameworks need their Vite plugin. Add it through the [Vite preset](/cli/#the-vite-preset)'s `vite` option. The preset adds React and Tailwind only when the game depends on `@ifloom/react` (or on `react` or `tailwindcss`), so a game made from the vanilla template gets neither, and your framework's plugin is the only one.

### Vue

Install Vue and its Vite plugin into your game:

```sh
npm install vue @vitejs/plugin-vue -w my-game
```

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { ifloom } from '@ifloom/cli/vite'

export default ifloom({ vite: { plugins: [vue()] } })
```

Keep the runner and the current view in one module. A `shallowRef` suits the view, because it's replaced whole on every change and Vue doesn't need to look inside it:

```ts
// src/runner.ts
import { shallowRef } from 'vue'
import { createRunner, localStorageDriver, saves, startingState } from '@ifloom/engine'
import loaded from './game.ts'

const { game } = loaded

export const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})

export const view = shallowRef(runner.view())
runner.subscribe(() => {
  view.value = runner.view()
})
```

Then any component can draw it:

::: v-pre

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { runner, view } from './runner.ts'
</script>

<template>
  <h1>{{ view.title }}</h1>
  <h2 v-if="view.scene.title">{{ view.scene.title }}</h2>
  <p v-for="(paragraph, at) in view.scene.body.split('\n\n')" :key="at">{{ paragraph }}</p>
  <button
    v-for="(choice, at) in [...view.scene.choices, ...view.actions]"
    :key="at"
    :disabled="Boolean(choice.disabled)"
    :title="choice.disabled"
    @click="runner.apply(choice.command)"
  >
    {{ choice.label }}
  </button>
</template>
```

:::

```ts
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#root')
```

### Svelte

Install Svelte and its Vite plugin into your game:

```sh
npm install svelte @sveltejs/vite-plugin-svelte -w my-game
```

```ts
// vite.config.ts
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { ifloom } from '@ifloom/cli/vite'

export default ifloom({ vite: { plugins: [svelte()] } })
```

A `readable` store fits the runner closely. Its start function subscribes to the runner, and returns the runner's own stop function:

```ts
// src/runner.ts
import { readable } from 'svelte/store'
import { createRunner, localStorageDriver, saves, startingState } from '@ifloom/engine'
import loaded from './game.ts'

const { game } = loaded

export const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})

export const view = readable(runner.view(), (set) => runner.subscribe(() => set(runner.view())))
```

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { runner, view } from './runner.ts'
</script>

<h1>{$view.title}</h1>
{#if $view.scene.title}<h2>{$view.scene.title}</h2>{/if}
{#each $view.scene.body.split('\n\n') as paragraph}<p>{paragraph}</p>{/each}
{#each [...$view.scene.choices, ...$view.actions] as choice}
  <button disabled={Boolean(choice.disabled)} title={choice.disabled} onclick={() => runner.apply(choice.command)}>
    {choice.label}
  </button>
{/each}
```

```ts
// src/main.ts
import { mount } from 'svelte'
import App from './App.svelte'

mount(App, { target: document.querySelector('#root')! })
```

## Next

- [The runner](/reference/runner) lists everything else a runner does, such as undo, saves and the backlog.
- [The view](/reference/view) describes every field you can draw.
- [Commands](/reference/commands) lists the commands you can send.
