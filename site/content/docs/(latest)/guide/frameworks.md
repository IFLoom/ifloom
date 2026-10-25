---
title: "Your own UI in any framework"
description: Draw an IFLoom game yourself in plain JS, React by hand, Vue or Svelte. The vanilla, vue and svelte templates each draw the scene, choices, inputs, stats and minigames and play sound; this page shows their code side by side.
---
The engine has no DOM and no framework, so you can draw a game with Vue, Svelte, plain DOM or anything else that can show text and buttons. The [React UI](/docs/react) is one ready-made way, and this page is the other: a UI of your own on the [runner](/docs/guide/running-a-game). Three templates start you off:

| Template | Draws with | Type-check |
|---|---|---|
| `vue` | Vue 3 single-file components | `vue-tsc`, as `npm run typecheck` |
| `svelte` | Svelte 5 components | `svelte-check`, as `npm run typecheck` |
| `vanilla` | Plain DOM, no framework | `tsc`, as `npm run typecheck` |

```sh
npm create ifloom@latest my-game -- --template vue
cd my-game
npm install
npm run dev
```

Each plays the same two-scene game as the `react` template, with no React. Each draws the scene and its beats, the choices with the reason a greyed-out one can't be pressed, any inputs the game asks for, the stats and a running minigame, and plays the game's sound with [`@ifloom/audio`](/docs/browser/audio-player). The clock for timers and minigames and the keyboard shortcuts come from [`@ifloom/browser`](/docs/browser) (see [Minigames](#minigames)). They share the game and its stylesheet:

- `src/game.ts`, which puts the game together from `src/world/stats.ts` and `src/story/opening.ts` (see [Organising a game](/docs/guide/organising)).
- `src/styles.css`, a plain stylesheet.

The rest of this page goes through their code piece by piece, with a tab for each framework. The React tab shows React by hand, without the React UI, for when you want React but none of `@ifloom/react`. The tab you pick is remembered, and every other page of the docs shows the same one. [A UI from scratch](/docs/guide/ui-from-scratch) explains the plain JS version in more detail, if you want to know what each part is for.

## The loop

A UI talks to the engine through a [runner](/docs/reference/runner). You need three things from it, and [Running a game](/docs/guide/running-a-game#the-loop) goes through them in full:

```ts
import { browserRunner } from '@ifloom/engine'

const runner = await browserRunner(game)

runner.view()              // View: what to draw right now
runner.apply(command)      // run a command, such as a choice the player pressed
runner.subscribe(listener) // call listener after every change of state; returns a function that stops it
```

Draw `runner.view()`, send the `command` of whatever the player presses with `runner.apply`, and draw again when the runner calls your listener. `subscribe` hears undo, redo and loading a save too, and `runner.view()` returns the same object until the state changes, so a framework that compares values redraws exactly when there's something new.

## Start the runner

Each template makes the runner once, in a module of its own, and turns the view into the framework's kind of state. Components import `runner` and the view from there.

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import { browserRunner, type InputView, type MinigameView, type SceneBeat, type View } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { startClock, startKeys } from '@ifloom/browser'
import loaded from './game.ts'
import './styles.css'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
const runner = await browserRunner(game)

// Plays what the game's `audio` asks for, from the first click or key press.
startAudio(runner)
// Ticks the game's timers and a minigame's, and maps the keyboard: 1 to 9 pick the choices, and a minigame's keys press its inputs.
startClock(runner)
startKeys(runner)

// ...

runner.subscribe(() => draw(runner.view()))
draw(runner.view())
```

```ts tab="React" tab-group="framework"
// src/runner.ts
import { useSyncExternalStore } from 'react'
import { browserRunner } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { startClock, startKeys } from '@ifloom/browser'
import loaded from './game.ts'

export const runner = await browserRunner(loaded.game)
// Its `play` plays a file on demand, such as a voice line again.
export const player = startAudio(runner)
startClock(runner)
startKeys(runner)

/** The view, drawn again after every change. `runner.view()` returns the same object until the state changes, as useSyncExternalStore needs. */
export const useView = () => useSyncExternalStore(runner.subscribe, runner.view)
```

```ts tab="Vue" tab-group="framework"
// src/runner.ts
/**
 * The game's runner, and its view as Vue state. Components read `view` and
 * send commands with `runner.apply`; nothing else talks to the engine.
 */
import { shallowRef } from 'vue'
import { browserRunner } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { startClock, startKeys } from '@ifloom/browser'
import loaded from './game.ts'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
export const runner = await browserRunner(game)

// The view is replaced whole after every change, so a shallowRef is enough:
// Vue only needs to know that it changed, not to look inside it.
export const view = shallowRef(runner.view())
runner.subscribe(() => {
  view.value = runner.view()
})

// Plays what the game's `audio` asks for, from the first click or key press.
// Its `play` plays a file on demand, such as a voice line again.
export const player = startAudio(runner)
// Ticks the game's timers and a minigame's, and maps the keyboard: 1 to 9 pick the choices, and a minigame's keys press its inputs.
startClock(runner)
startKeys(runner)
```

```ts tab="Svelte" tab-group="framework"
// src/runner.ts
/**
 * The game's runner, and its view as a Svelte store. Components read `$view`
 * and send commands with `runner.apply`; nothing else talks to the engine.
 */
import { readable } from 'svelte/store'
import { browserRunner } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { startClock, startKeys } from '@ifloom/browser'
import loaded from './game.ts'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
export const runner = await browserRunner(game)

// A readable store fits the runner: it starts by subscribing, and stops with
// the function `subscribe` returns.
export const view = readable(runner.view(), (set) => runner.subscribe(() => set(runner.view())))

// Plays what the game's `audio` asks for, from the first click or key press.
// Its `play` plays a file on demand, such as a voice line again.
export const player = startAudio(runner)
// Ticks the game's timers and a minigame's, and maps the keyboard: 1 to 9 pick the choices, and a minigame's keys press its inputs.
startClock(runner)
startKeys(runner)
```

[`browserRunner`](/docs/reference/runner#browserrunner) gives the runner a random seed, undo 50 steps deep, saves in `localStorage` and an autosave each turn. Pass it any [`RunnerOptions`](/docs/reference/runner#runneroptions) to change those, such as `browserRunner(game, { backlog: true })`. `loadGame` returns the game and a list of problems, which `npm run check` also prints.

- **Plain JS** draws the whole page again in its listener, which is fine for a page this small.
- **React** reads it with `useSyncExternalStore`, which needs exactly what `runner.subscribe` and `runner.view` are.
- **Vue** keeps the view in a `shallowRef`. The view is replaced whole after every change, so Vue doesn't need to look inside it.
- **Svelte** wraps it in a `readable` store, which components read as `$view`. The store's start function subscribes to the runner and returns the runner's own stop function.

Then `main.ts` mounts the app on `#root` in `index.html`. Plain JS has no app to mount, so its `draw` fills `#root` itself:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
const root = document.querySelector<HTMLElement>('#root')!

/** An element with a class and some text, added to `parent`. */
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = parent.appendChild(document.createElement(tag))
  if (text) element.textContent = text
  if (className) element.className = className
  return element
}
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import './styles.css'

createRoot(document.querySelector('#root')!).render(createElement(App))
```

```ts tab="Vue" tab-group="framework"
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#root')
```

```ts tab="Svelte" tab-group="framework"
// src/main.ts
import { mount } from 'svelte'
import App from './App.svelte'
import './styles.css'

mount(App, { target: document.querySelector('#root')! })
```

## Add the framework's Vite plugin

The [Vite preset](/docs/cli#the-vite-preset) knows no framework. React, Vue and Svelte each need their Vite plugin, which goes in its `vite.plugins`. The templates do this already:

```ts tab="Plain JS" tab-group="framework"
// vite.config.ts
import { ifloom } from '@ifloom/cli/vite'

// Plain DOM needs no plugin.
export default ifloom()
```

```ts tab="React" tab-group="framework"
// vite.config.ts
import react from '@vitejs/plugin-react'
import { ifloom } from '@ifloom/cli/vite'

export default ifloom({ vite: { plugins: [react()] } })
```

```ts tab="Vue" tab-group="framework"
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { ifloom } from '@ifloom/cli/vite'

// The preset knows no framework, so the game adds Vue's plugin.
export default ifloom({ vite: { plugins: [vue()] } })
```

```ts tab="Svelte" tab-group="framework"
// vite.config.ts
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { ifloom } from '@ifloom/cli/vite'

// The preset knows no framework, so the game adds Svelte's plugin.
export default ifloom({ vite: { plugins: [svelte()] } })
```

React by hand starts from the `vanilla` template: add `react`, `react-dom` and `@vitejs/plugin-react` to its `package.json`, and React's plugin to `vite.plugins`. The [React UI](/docs/react) also needs Tailwind's plugin, as the `react` template has.

## Draw the scene and its choices

The app draws the title, the scene, its choices and the stats:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
function draw(view: View): void {
  root.replaceChildren()
  add(root, 'h1', view.title)

  // While a minigame runs, the scene's title and beats are the minigame's.
  if (view.scene.title) add(root, 'h2', view.scene.title)
  for (const beat of view.scene.beats) drawBeat(beat)
  if (view.minigame) drawMinigame(view.minigame)

  const inputs = add(root, 'div', '', 'inputs')
  for (const input of Object.values(view.inputs)) drawInput(inputs, input)

  const choices = add(root, 'div', '', 'choices')
  // A scene's choices, or the game's own buttons when no scene is open.
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = add(choices, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    if (choice.disabled) button.title = choice.disabled
    button.onclick = () => runner.apply(choice.command)
    // Why it can't be pressed, such as "You need 4 coins."
    if (choice.disabled) add(choices, 'p', choice.disabled, 'reason')
  }

  add(root, 'p', view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · '), 'stats')
}
```

```tsx tab="React" tab-group="framework"
// src/App.tsx
import { Fragment } from 'react'
import { runner, useView } from './runner.ts'
import { Beat } from './Beat.tsx'
import { InputField } from './InputField.tsx'
import { Minigame } from './Minigame.tsx'

export function App() {
  const view = useView()
  // A scene's choices, or the game's own buttons when no scene is open.
  const choices = [...view.scene.choices, ...view.actions]
  return (
    <>
      <h1>{view.title}</h1>
      {/* While a minigame runs, the scene's title and beats are the minigame's. */}
      {view.scene.title ? <h2>{view.scene.title}</h2> : null}
      {view.scene.beats.map((beat, at) => (
        <Beat key={at} beat={beat} />
      ))}
      {view.minigame ? <Minigame minigame={view.minigame} /> : null}

      <div className="inputs">
        {Object.values(view.inputs).map((input) => (
          <InputField key={input.id} input={input} />
        ))}
      </div>

      <div className="choices">
        {choices.map((choice, at) => (
          <Fragment key={at}>
            <button disabled={Boolean(choice.disabled)} title={choice.disabled} onClick={() => runner.apply(choice.command)}>
              {choice.label}
            </button>
            {/* Why it can't be pressed, such as "You need 4 coins." */}
            {choice.disabled ? <p className="reason">{choice.disabled}</p> : null}
          </Fragment>
        ))}
      </div>

      <p className="stats">{view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ')}</p>
    </>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'
import Beat from './Beat.vue'
import InputField from './InputField.vue'
import Minigame from './Minigame.vue'

// A scene's choices, or the game's own buttons when no scene is open.
const choices = computed(() => [...view.value.scene.choices, ...view.value.actions])
</script>

<template>
  <h1>{{ view.title }}</h1>
  <!-- While a minigame runs, the scene's title and beats are the minigame's. -->
  <h2 v-if="view.scene.title">{{ view.scene.title }}</h2>
  <Beat v-for="(beat, at) in view.scene.beats" :key="at" :beat="beat" />
  <Minigame v-if="view.minigame" :minigame="view.minigame" />

  <div class="inputs">
    <InputField v-for="input in Object.values(view.inputs)" :key="input.id" :input="input" />
  </div>

  <div class="choices">
    <template v-for="(choice, at) in choices" :key="at">
      <button :disabled="Boolean(choice.disabled)" :title="choice.disabled" @click="runner.apply(choice.command)">
        {{ choice.label }}
      </button>
      <!-- Why it can't be pressed, such as "You need 4 coins." -->
      <p v-if="choice.disabled" class="reason">{{ choice.disabled }}</p>
    </template>
  </div>

  <p class="stats">{{ view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ') }}</p>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte -->
<script lang="ts">
  import { runner, view } from './runner.ts'
  import Beat from './Beat.svelte'
  import InputField from './InputField.svelte'
  import Minigame from './Minigame.svelte'

  // A scene's choices, or the game's own buttons when no scene is open.
  const choices = $derived([...$view.scene.choices, ...$view.actions])
</script>

<h1>{$view.title}</h1>
<!-- While a minigame runs, the scene's title and beats are the minigame's. -->
{#if $view.scene.title}<h2>{$view.scene.title}</h2>{/if}
{#each $view.scene.beats as beat, at (at)}<Beat {beat} />{/each}
{#if $view.minigame}<Minigame minigame={$view.minigame} />{/if}

<div class="inputs">
  {#each Object.values($view.inputs) as input (input.id)}<InputField {input} />{/each}
</div>

<div class="choices">
  {#each choices as choice, at (at)}
    <button disabled={Boolean(choice.disabled)} title={choice.disabled} onclick={() => runner.apply(choice.command)}>
      {choice.label}
    </button>
    <!-- Why it can't be pressed, such as "You need 4 coins." -->
    {#if choice.disabled}<p class="reason">{choice.disabled}</p>{/if}
  {/each}
</div>

<p class="stats">{$view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ')}</p>
```

Every button the player can press is a [`RenderedChoice`](/docs/reference/view#renderedchoice). It carries its `label`, its `command`, and `disabled` with the reason when it can't be pressed. The templates grey the button out and print the reason under it. The button sends the command as it is, so your UI never builds a command for a choice itself.

`view.scene.choices` are the open scene's choices. When no scene is open, the game's own buttons are in `view.actions` instead, so drawing both covers either case.

The templates lay this out as a page in one file of its own: `src/Layout.vue`, `src/Layout.svelte`, or `src/layout.ts` in plain JS, as the React UI has `src/layout.tsx`. It has a side column with the title, the clock and the stats in a `<details>` that folds, the story with the scene and its choices, and the bottom of the story with `view.actions`. On a phone the side column sits above the story. [Layouts](/docs/recipes/layouts) shows the changes most games make to it.

## Beats

A scene's prose comes as [beats](/docs/reference/prose#scenebeat): a paragraph, a spoken line, a picture or a video. A letter or a sticky note is a [UI piece](/docs/reference/prose#letters-notes-and-signs) inside a paragraph, which the templates show as its words. Draw `view.scene.beats` rather than `view.scene.body`, which is the raw prose with its markup.

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
/** One paragraph of a scene: narration, a spoken line, a picture, a clip. A sound beat is heard, not drawn. */
function drawBeat(beat: SceneBeat): void {
  switch (beat.type) {
    case 'text':
      add(root, 'p', beat.text)
      break
    case 'say':
      add(root, 'p', beat.text, 'beat-say').dataset.who = beat.who
      break
    case 'image':
      Object.assign(add(root, 'img', '', 'beat-image'), { src: beat.src, alt: beat.alt ?? '' })
      break
    case 'video':
      Object.assign(add(root, 'video', '', 'beat-image'), {
        src: beat.src,
        poster: beat.poster ?? '',
        autoplay: beat.autoplay,
        loop: beat.loop,
        muted: beat.muted,
        controls: beat.controls,
        playsInline: true,
      })
      break
  }
}
```

```tsx tab="React" tab-group="framework"
// src/Beat.tsx
import type { SceneBeat } from '@ifloom/engine'

/** One paragraph of a scene: narration, a spoken line, a picture, a clip. A sound beat is heard, not drawn. */
export function Beat({ beat }: { beat: SceneBeat }) {
  switch (beat.type) {
    case 'text':
      return <p>{beat.text}</p>
    case 'say':
      return (
        <p className="beat-say" data-who={beat.who}>
          {beat.text}
        </p>
      )
    case 'image':
      return <img className="beat-image" src={beat.src} alt={beat.alt ?? ''} />
    case 'video':
      return (
        <video
          className="beat-image"
          src={beat.src}
          poster={beat.poster}
          autoPlay={beat.autoplay}
          loop={beat.loop}
          muted={beat.muted}
          controls={beat.controls}
          playsInline
        />
      )
    default:
      return null
  }
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Beat.vue -->
<script setup lang="ts">
import type { SceneBeat } from '@ifloom/engine'

// One paragraph of a scene: narration, a spoken line, a picture, a clip. A sound beat is heard, not drawn.
defineProps<{ beat: SceneBeat }>()
</script>

<template>
  <p v-if="beat.type === 'text'">{{ beat.text }}</p>
  <p v-else-if="beat.type === 'say'" class="beat-say" :data-who="beat.who">{{ beat.text }}</p>
  <img v-else-if="beat.type === 'image'" class="beat-image" :src="beat.src" :alt="beat.alt ?? ''" />
  <video
    v-else-if="beat.type === 'video'"
    class="beat-image"
    :src="beat.src"
    :poster="beat.poster"
    :autoplay="beat.autoplay"
    :loop="beat.loop"
    :muted="beat.muted"
    :controls="beat.controls"
    playsinline
  />
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Beat.svelte -->
<script lang="ts">
  import type { SceneBeat } from '@ifloom/engine'

  // One paragraph of a scene: narration, a spoken line, a picture, a clip. A sound beat is heard, not drawn.
  let { beat }: { beat: SceneBeat } = $props()
</script>

{#if beat.type === 'text'}
  <p>{beat.text}</p>
{:else if beat.type === 'say'}
  <p class="beat-say" data-who={beat.who}>{beat.text}</p>
{:else if beat.type === 'image'}
  <img class="beat-image" src={beat.src} alt={beat.alt ?? ''} />
{:else if beat.type === 'video'}
  <video
    class="beat-image"
    src={beat.src}
    poster={beat.poster}
    autoplay={beat.autoplay}
    loop={beat.loop}
    muted={beat.muted}
    controls={beat.controls}
    playsinline
  ></video>
{/if}
```

A spoken line's `who` is `'character'` or `'player'`, which the stylesheet uses to set the player's lines apart. The scene's speaker is `view.scene.speaker`, with their name and picture, and the big picture is `view.scene.image`. A spoken line's `speaker` names the entity it's written under, when there is one. A sound beat draws nothing, because the audio player plays it.

## Inputs

An [input](/docs/reference/inputs) is a value the game asks the player for, such as a name. Each is an [`InputView`](/docs/reference/view#inputview) in `view.inputs`, and you send what the player enters as an `input` command:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
/** A value the game asks for, such as the player's name. What they enter goes back as an `input` command. */
function drawInput(parent: HTMLElement, input: InputView): void {
  if (input.type === 'choice') {
    for (const option of input.options) {
      add(parent, 'button', option.label).onclick = () => runner.apply({ type: 'input', id: input.id, to: option.value })
    }
    return
  }
  const form = add(parent, 'form')
  const label = add(form, 'label', input.label)
  const field = add(label, 'input')
  field.type = input.type === 'number' ? 'number' : 'text'
  field.value = input.value === null ? '' : String(input.value)
  if (input.maxLength !== null) field.maxLength = input.maxLength
  if (input.min !== null) field.min = String(input.min)
  if (input.max !== null) field.max = String(input.max)
  add(form, 'button', 'OK').type = 'submit'
  form.onsubmit = (event) => {
    event.preventDefault()
    runner.apply({ type: 'input', id: input.id, to: input.type === 'number' ? Number(field.value) : field.value })
  }
}
```

```tsx tab="React" tab-group="framework"
// src/InputField.tsx
import { useState, type FormEvent } from 'react'
import type { InputView } from '@ifloom/engine'
import { runner } from './runner.ts'

/** A value the game asks for, such as the player's name. What they enter goes back as an `input` command. */
export function InputField({ input }: { input: InputView }) {
  const [value, setValue] = useState(input.value === null ? '' : String(input.value))
  if (input.type === 'choice') {
    return (
      <div className="inputs" role="group" aria-label={input.label}>
        {input.options.map((option) => (
          <button key={String(option.value)} onClick={() => runner.apply({ type: 'input', id: input.id, to: option.value })}>
            {option.label}
          </button>
        ))}
      </div>
    )
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    runner.apply({ type: 'input', id: input.id, to: input.type === 'number' ? Number(value) : value })
  }
  return (
    <form onSubmit={submit}>
      <label>
        {input.label}
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          type={input.type === 'number' ? 'number' : 'text'}
          maxLength={input.maxLength ?? undefined}
          min={input.min ?? undefined}
          max={input.max ?? undefined}
        />
      </label>
      <button type="submit">OK</button>
    </form>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/InputField.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import type { InputView } from '@ifloom/engine'
import { runner } from './runner.ts'

// A value the game asks for, such as the player's name. What they enter goes back as an `input` command.
const props = defineProps<{ input: InputView }>()
const value = ref(props.input.value === null ? '' : String(props.input.value))

function submit() {
  runner.apply({ type: 'input', id: props.input.id, to: props.input.type === 'number' ? Number(value.value) : value.value })
}
</script>

<template>
  <div v-if="input.type === 'choice'" class="inputs" role="group" :aria-label="input.label">
    <button v-for="option in input.options" :key="String(option.value)" @click="runner.apply({ type: 'input', id: input.id, to: option.value })">
      {{ option.label }}
    </button>
  </div>
  <form v-else @submit.prevent="submit">
    <label>
      {{ input.label }}
      <input
        v-model="value"
        :type="input.type === 'number' ? 'number' : 'text'"
        :maxlength="input.maxLength ?? undefined"
        :min="input.min ?? undefined"
        :max="input.max ?? undefined"
      />
    </label>
    <button type="submit">OK</button>
  </form>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/InputField.svelte -->
<script lang="ts">
  import type { InputView } from '@ifloom/engine'
  import { runner } from './runner.ts'

  // A value the game asks for, such as the player's name. What they enter goes back as an `input` command.
  let { input }: { input: InputView } = $props()
  // svelte-ignore state_referenced_locally
  let value = $state(input.value === null ? '' : String(input.value))

  function submit(event: SubmitEvent) {
    event.preventDefault()
    runner.apply({ type: 'input', id: input.id, to: input.type === 'number' ? Number(value) : value })
  }
</script>

{#if input.type === 'choice'}
  <div class="inputs" role="group" aria-label={input.label}>
    {#each input.options as option (option.value)}
      <button onclick={() => runner.apply({ type: 'input', id: input.id, to: option.value })}>{option.label}</button>
    {/each}
  </div>
{:else}
  <form onsubmit={submit}>
    <label>
      {input.label}
      <input
        bind:value
        type={input.type === 'number' ? 'number' : 'text'}
        maxlength={input.maxLength ?? undefined}
        min={input.min ?? undefined}
        max={input.max ?? undefined}
      />
    </label>
    <button type="submit">OK</button>
  </form>
{/if}
```

An input of type `choice` has its `options`, each with a `value` and a `label`, so the templates draw a button for each. The input stays in `view.inputs` while its `when` holds, which for a name is usually until the player has given one.

## Minigames

While a [minigame](/docs/reference/minigames) runs, `view.minigame` describes it, and the scene shows its words: `view.scene.title` is the minigame's label and `view.scene.beats` are the running state's words. The choices are empty. So the app draws the scene as usual, and adds a panel for the minigame's timer and inputs:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
/** The minigame being played: a bar counting down its timer, and a button for each input that does something now. */
function drawMinigame(minigame: MinigameView): void {
  const section = add(root, 'section', '', 'minigame')
  section.dataset.state = minigame.state
  if (minigame.timeLeft !== null && minigame.timeTotal) {
    const timer = add(section, 'div', '', 'timer')
    timer.setAttribute('role', 'progressbar')
    timer.setAttribute('aria-label', 'Time left')
    add(timer, 'span').style.transform = `scaleX(${minigame.timeLeft / minigame.timeTotal})`
  }
  const inputs = add(section, 'div', '', 'choices')
  for (const input of minigame.inputs) add(inputs, 'button', input).onclick = () => runner.apply({ type: 'minigame', input })
}
```

```tsx tab="React" tab-group="framework"
// src/Minigame.tsx
import type { MinigameView } from '@ifloom/engine'
import { runner } from './runner.ts'

/** The minigame being played: a bar counting down its timer, and a button for each input that does something now. */
export function Minigame({ minigame }: { minigame: MinigameView }) {
  return (
    <section className="minigame" data-state={minigame.state}>
      {minigame.timeLeft !== null && minigame.timeTotal ? (
        <div className="timer" role="progressbar" aria-label="Time left">
          <span style={{ transform: `scaleX(${minigame.timeLeft / minigame.timeTotal})` }} />
        </div>
      ) : null}
      <div className="choices">
        {minigame.inputs.map((input) => (
          <button key={input} onClick={() => runner.apply({ type: 'minigame', input })}>
            {input}
          </button>
        ))}
      </div>
    </section>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Minigame.vue -->
<script setup lang="ts">
import type { MinigameView } from '@ifloom/engine'
import { runner } from './runner.ts'

// The minigame being played: a bar counting down its timer, and a button for each input that does something now.
defineProps<{ minigame: MinigameView }>()
</script>

<template>
  <section class="minigame" :data-state="minigame.state">
    <div v-if="minigame.timeLeft !== null && minigame.timeTotal" class="timer" role="progressbar" aria-label="Time left">
      <span :style="{ transform: `scaleX(${minigame.timeLeft / minigame.timeTotal})` }" />
    </div>
    <div class="choices">
      <button v-for="input in minigame.inputs" :key="input" @click="runner.apply({ type: 'minigame', input })">{{ input }}</button>
    </div>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Minigame.svelte -->
<script lang="ts">
  import type { MinigameView } from '@ifloom/engine'
  import { runner } from './runner.ts'

  // The minigame being played: a bar counting down its timer, and a button for each input that does something now.
  let { minigame }: { minigame: MinigameView } = $props()
</script>

<section class="minigame" data-state={minigame.state}>
  {#if minigame.timeLeft !== null && minigame.timeTotal}
    <div class="timer" role="progressbar" aria-label="Time left">
      <span style:transform={`scaleX(${minigame.timeLeft / minigame.timeTotal})`}></span>
    </div>
  {/if}
  <div class="choices">
    {#each minigame.inputs as input (input)}
      <button onclick={() => runner.apply({ type: 'minigame', input })}>{input}</button>
    {/each}
  </div>
</section>
```

Pressing an input sends `{ type: 'minigame', input }`. A minigame with timers needs something more, because the engine has no clock. Something has to send a [`tick`](/docs/reference/commands#tick) with the time that passed. The templates start two helpers from [`@ifloom/browser`](/docs/browser) once, beside the runner, as [Start the runner](#start-the-runner) shows:

- [`startClock(runner)`](/docs/browser#startclock) sends a `tick` about every 100 ms while a [timer](/docs/reference/timers) or a minigame's timer runs and the page is visible, with the real time that passed. Time while the page is hidden is dropped, so the round waits for the player.
- [`startKeys(runner)`](/docs/browser#startkeys) maps the keyboard: a minigame's own `keys`, or the arrow keys and space, press its inputs, and 1 to 9 pick the choices on screen.

They're plain DOM, so every framework uses them the same way, and the React UI runs the same code. Each returns a function that stops it.

The [Minigames recipe](/docs/recipes/minigames#your-own-panel) draws a panel for one minigame by its id, in each framework.

## Panels

Content can open a [panel](/docs/reference/panels) over the story, such as a shop's counter or a job board. `view.panel` is its name and what it was opened with, or `null`. The templates draw a placeholder dialog with the name, what it was opened with and a Close button that sends `{ type: 'closePanel' }`. Replace its body with your own drawing for each name your game opens.

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, called at the end of draw(view) when view.panel isn't null
function drawPanel(panel: OpenPanel): void {
  const dialog = add(root, 'section', '', 'panel')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', panel.panel)
  const box = add(dialog, 'div')
  add(box, 'h2', panel.panel)
  add(box, 'pre', JSON.stringify(panel.with, null, 2))
  add(box, 'button', 'Close').onclick = () => runner.apply({ type: 'closePanel' })
}
```

```tsx tab="React" tab-group="framework"
// src/Panel.tsx, drawn by App as {view.panel ? <Panel panel={view.panel} /> : null}
import type { OpenPanel } from '@ifloom/engine'
import { runner } from './runner.ts'

export function Panel({ panel }: { panel: OpenPanel }) {
  return (
    <section className="panel" role="dialog" aria-modal="true" aria-label={panel.panel}>
      <div>
        <h2>{panel.panel}</h2>
        <pre>{JSON.stringify(panel.with, null, 2)}</pre>
        <button onClick={() => runner.apply({ type: 'closePanel' })}>Close</button>
      </div>
    </section>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Panel.vue, drawn by App.vue as <Panel v-if="view.panel" :panel="view.panel" /> -->
<script setup lang="ts">
import type { OpenPanel } from '@ifloom/engine'
import { runner } from './runner.ts'

defineProps<{ panel: OpenPanel }>()
</script>

<template>
  <section class="panel" role="dialog" aria-modal="true" :aria-label="panel.panel">
    <div>
      <h2>{{ panel.panel }}</h2>
      <pre>{{ JSON.stringify(panel.with, null, 2) }}</pre>
      <button @click="runner.apply({ type: 'closePanel' })">Close</button>
    </div>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Panel.svelte, drawn by App.svelte as {#if $view.panel}<Panel panel={$view.panel} />{/if} -->
<script lang="ts">
  import type { OpenPanel } from '@ifloom/engine'
  import { runner } from './runner.ts'

  let { panel }: { panel: OpenPanel } = $props()
</script>

<section class="panel" role="dialog" aria-modal="true" aria-label={panel.panel}>
  <div>
    <h2>{panel.panel}</h2>
    <pre>{JSON.stringify(panel.with, null, 2)}</pre>
    <button onclick={() => runner.apply({ type: 'closePanel' })}>Close</button>
  </div>
</section>
```

The React UI draws panels itself with [`PanelHost`](/docs/react/components#panelhost), which knows the shop's and the jobs' panels by name.

## What else to draw

The [view reference](/docs/reference/view) lists every field. Beyond what the templates draw, these are the ones games most often want:

- `when`, where the game is in time and place, when a plugin says.
- `notices`, news the player hasn't dismissed. Send `{ type: 'dismiss' }` to clear them.
- `scene.speaker` and `scene.image`, who is talking and the picture to show with them.
- `plugins`, each plugin's own part of the view, by plugin id. The places plugin's exits are at `plugins.places`, for example. Each plugin's page documents its slice, and [Building UI for plugins](/docs/recipes/plugin-ui) draws some of them.
- `settings`, for a settings page. See [The title screen and settings](/docs/recipes/title-screen#add-settings).

`entities` and `held` are there when your game has them.

## Sound

If your game lists tracks in [`game.audio`](/docs/reference/audio), the templates already play them. [`startAudio`](/docs/browser/audio-player#startaudio) follows the runner, not your components, so it works the same whatever draws the page. Start it once, next to the runner, as each template's runner module does. Nothing plays until the player first clicks or presses a key, because browsers don't allow it sooner. Pass `{ log: console.debug }` to see what the player is doing in the console.

A spoken line with a voice is a `say` [beat](/docs/reference/prose#scenebeat) with a `voice` track id. To offer a button that plays it again, keep the player `startAudio` returned and call its [`play`](/docs/browser/audio-player#audioplayer) with the track's file:

```ts
import { audioSrc } from '@ifloom/engine'

const player = startAudio(runner)
const track = game.audio?.tracks[beat.voice]
if (track && 'src' in track) player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
```

## Next

- [The runner](/docs/reference/runner) lists everything else a runner does, such as undo, saves and the backlog.
- [The view](/docs/reference/view) describes every field you can draw.
- [Commands](/docs/reference/commands) lists the commands you can send.
- [Building your own HUD](/docs/recipes/hud), [Building UI for plugins](/docs/recipes/plugin-ui) and [The title screen](/docs/recipes/title-screen) show what they build in each framework.
