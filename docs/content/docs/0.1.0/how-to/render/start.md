---
title: "Start your own UI"
description: "Put a game on screen with a UI of your own in plain JS, React or Vue, from the runner's snapshot and the player's commands."
---
Use these pages when you render the game with code of your own, or when you place the React UI's parts in a layout of your own. Start from the template for your framework (`vanilla`, `react` or `vue`), made as [Create a game](/docs/0.1.0/how-to/create-a-game) shows. [Choosing a UI](/docs/0.1.0/explanation/choosing-a-ui) compares the ways to put a game on screen.

Every example on these pages comes in three tabs:

- **Plain JS** is DOM code on the runner, as in the `vanilla` template's `src/main.ts`. Each part is a function `draw<Thing>(parent, snapshot)` that imports `runner`, `add` and `drawChoices` from `./runner.ts`.
- **React** uses the React UI, `@ifloom/react`. It places the ready-made part for the feature in a layout, or builds a component of your own with the React UI's hooks.
- **Vue** is a component with no props that reads `view`, `snapshot` and `runner` from `./runner.ts`, as the `vue` template's components do.

The site remembers the tab you choose on every page. Every example renders the showcase, Small Town (`examples/showcase`), so it uses the showcase's ids, such as the vendor `counter` and the timer `flat.ring`.

## Start the runner

Make the [runner](/docs/0.1.0/reference/runner) once, start the browser helpers beside it, render its snapshot, and render again on every change. The React UI's `mountGame` does all of it in one call.

```ts tab="Plain JS" tab-group="framework"
// src/main.ts: the vanilla template's start, cut down to the loop.
import type { RenderedChoice, RunnerSnapshot } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { browserRunner, startClock, startKeys } from '@ifloom/browser'
import module from './game.ts'

// The game module builds the game, and lists what the loader found wrong with it.
const { game, problems } = module.build()
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
const runner = await browserRunner(game)

// Each helper follows the runner by itself. startAudio plays view.audio from the first click or key press,
// startClock ticks the timers and minigames, and startKeys presses the choices on 1 to 9.
startAudio(runner)
startClock(runner)
startKeys(runner)

const root = document.querySelector<HTMLElement>('#root')!

/** An element with a class and some text, added to `parent`. The text goes in as textContent, so prose can't add markup. */
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = parent.appendChild(document.createElement(tag))
  if (text) element.textContent = text
  if (className) element.className = className
  return element
}

/** Buttons that send their commands, each greyed out with its reason when it can't be pressed. */
function drawChoices(parent: HTMLElement, choices: RenderedChoice[]): void {
  for (const choice of choices) {
    const button = add(parent, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    if (choice.disabled) button.title = choice.disabled
    button.onclick = () => runner.apply(choice.command)
    if (choice.disabled) add(parent, 'p', choice.disabled, 'reason')
  }
}

/** The whole screen, rendered again from each snapshot. */
function draw({ view }: RunnerSnapshot): void {
  root.replaceChildren()
  add(root, 'h1', view.title)
  if (view.scene.title) add(root, 'h2', view.scene.title)
  for (const beat of view.scene.beats) if (beat.type === 'text' || beat.type === 'say') add(root, 'p', beat.text)
  // The open scene's choices, or the room's actions while no scene is open.
  drawChoices(add(root, 'div', '', 'choices'), [...view.scene.choices, ...view.actions])
  add(root, 'p', view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · '), 'stats')
}

// Render again whenever the runner hands over a new snapshot.
runner.subscribe(draw)
draw(runner.snapshot())
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import module from './game.ts'

// mountGame makes the runner with browserRunner, plays the sound, runs the clock and maps the keys.
// Its default layout renders every part the Render it yourself pages cover.
mountGame(module.build())
```

```ts tab="Vue" tab-group="framework"
// src/runner.ts: the vue template's runner, and its snapshot as Vue state.
import { computed, shallowRef } from 'vue'
import { startAudio } from '@ifloom/audio'
import { browserRunner, startClock, startKeys } from '@ifloom/browser'
import module from './game.ts'

// The game module builds the game, and lists what the loader found wrong with it.
const { game, problems } = module.build()
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
export const runner = await browserRunner(game)

// The runner hands every listener a new snapshot whenever anything in it changes, so a shallowRef is enough.
export const snapshot = shallowRef(runner.snapshot())
runner.subscribe((next) => {
  snapshot.value = next
})
// The view, which is most of what the components render.
export const view = computed(() => snapshot.value.view)

// Each helper follows the runner by itself. The player plays view.audio from the first click or key press,
// and its play() plays a file on demand. startClock ticks the timers and minigames, and startKeys presses the choices on 1 to 9.
export const player = startAudio(runner)
startClock(runner)
startKeys(runner)
```

A UI talks to the engine through three members of the [`Runner`](/docs/0.1.0/api/engine#runner):

- `runner.snapshot()` returns the [`RunnerSnapshot`](/docs/0.1.0/api/engine#runnersnapshot), one value with all a UI renders. It holds the view, the settings, the backlog, undo and the saves.
- `runner.apply(command)` runs a command, such as the `command` of the button the player pressed.
- `runner.subscribe(listener)` calls `listener` with each new snapshot, and returns the function that stops it.

The runner makes a new snapshot whenever any part of it changes, and returns the same object until then. A framework that compares values therefore renders again exactly when something is new. React reads it with `useSyncExternalStore(runner.subscribe, runner.snapshot)`, and the Vue tab keeps it in a `shallowRef`. In Vue, `src/main.ts` then mounts the app with `createApp(App).mount('#root')`.

[`browserRunner`](/docs/0.1.0/api/browser#browserrunner) gives the runner a random seed, undo 50 steps deep, saves in `localStorage` and an autosave each turn. Pass it any [`RunnerOptions`](/docs/0.1.0/api/engine#runneroptions) to change those, such as `browserRunner(game, { backlog: true })`. Each helper follows the runner on its own, and returns the function that stops it:

- [`startAudio`](/docs/0.1.0/api/audio#startaudio) plays the game's music and sounds. Browsers allow no sound before the player clicks or presses a key, so nothing plays until then.
- [`startClock`](/docs/0.1.0/api/browser#startclock) sends a `tick` about every 100 ms while a timer or a minigame's timer runs. The engine keeps no clock of its own.
- [`startKeys`](/docs/0.1.0/api/browser#startkeys) presses the choices on screen on the keys 1 to 9, and a minigame's inputs on its keys.

Each template's `vite.config.ts` already adds its framework's Vite plugin to the [Vite preset](/docs/0.1.0/api/cli-vite), which knows no framework.

## Put the parts together

Split the screen into parts as it grows, one for each feature the other pages render. Each part reads the snapshot and sends its own commands, so the parts don't depend on each other.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts. Each part below imports runner, add and drawChoices from there too.
import { add } from './runner.ts'
import { drawActions } from './actions.ts'
import { drawHeld } from './entities.ts'
import { drawInputs } from './inputs.ts'
import { drawNotices } from './notices.ts'
import { drawPanel } from './panel.ts'
import { drawScene } from './scene.ts'
import { drawStats } from './stats.ts'

/** The screen, put together from the parts on the Render it yourself pages: a side column, the story, the notices and any open panel. */
export function drawLayout(parent: HTMLElement, snapshot: RunnerSnapshot): void {
  parent.replaceChildren()
  const side = add(parent, 'aside', '', 'sidebar')
  add(side, 'h1', snapshot.view.title)
  drawStats(side, snapshot)
  drawHeld(side, snapshot)
  const story = add(parent, 'main', '', 'story')
  drawScene(story, snapshot)
  drawInputs(story, snapshot)
  drawActions(add(story, 'div', '', 'actions'), snapshot)
  drawNotices(parent, snapshot)
  drawPanel(parent, snapshot)
}
```

```tsx tab="React" tab-group="framework"
import { Game, InputFields, Inventory, Notices, Overlay, PanelHost, RoomActions, Scene, Section, Sidebar, StatList, Story, Title } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`: the React UI's parts, placed as the default layout places them.
// Each Render it yourself page names the part for its feature.
export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <Section id="stats" title="Stats" collapsible open>
          <StatList />
        </Section>
        <Inventory />
      </Sidebar>
      <Story>
        <Scene />
        <InputFields />
        <RoomActions />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { view } from './runner.ts'
import Actions from './Actions.vue'
import Entities from './Entities.vue'
import Inputs from './Inputs.vue'
import Notices from './Notices.vue'
import Panel from './Panel.vue'
import Scene from './Scene.vue'
import Stats from './Stats.vue'

// The screen, put together from the parts on the Render it yourself pages: a side column, the story, the notices and any open panel.
// Each part imports runner and view from ./runner.ts.
</script>

<template>
  <aside class="sidebar">
    <h1>{{ view.title }}</h1>
    <Stats />
    <Entities />
  </aside>
  <main class="story">
    <Scene />
    <Inputs />
    <Actions />
  </main>
  <Notices />
  <Panel />
</template>
```

In Plain JS, move the runner, `add` and `drawChoices` from `src/main.ts` into `src/runner.ts` and export them. Then call `drawLayout(root, snapshot)` from the listener. In React, pass the layout to `mountGame(module.build(), { layout: Layout })`, and [Arrange the layout](/docs/0.1.0/how-to/arrange-the-layout) moves and folds its sections. In Vue, render `<Layout />` from `src/App.vue`.

The other pages render one feature in each section:

- [Render the scene and its choices](/docs/0.1.0/how-to/render/scene) covers the scene, flowing scenes, the room's actions, inline choices and tooltips, inputs, and transitions.
- [Render stats, things and what changed](/docs/0.1.0/how-to/render/stats-and-things) covers stats, the things the player holds, listed entities, changes, notices and dice rolls.
- [Render pictures and play sound](/docs/0.1.0/how-to/render/pictures-and-sound) covers layered pictures with hotspots, and the audio player.
- [Render timers, minigames and panels](/docs/0.1.0/how-to/render/timers-minigames-panels) covers countdowns, a running minigame and a panel over the story.
- [Render saves, settings and the backlog](/docs/0.1.0/how-to/render/saves-and-settings) covers a load screen, a settings screen, the backlog and undo.

Each plugin adds its own part of the view under `view.plugins`, by plugin id, such as the places plugin's ways out at `view.plugins.places.exits`. The plugins' pages in this section render them: [the calendar, locations and people](/docs/0.1.0/how-to/render/world-plugins), [quests, achievements and statuses](/docs/0.1.0/how-to/render/progress-plugins), [the inventory, shop, jobs and wardrobe](/docs/0.1.0/how-to/render/things-plugins), [messages, the feed and devices](/docs/0.1.0/how-to/render/phone-plugins), and [cheats, unlocks and debug](/docs/0.1.0/how-to/render/player-tools).

For every field and member, see:

- [The view](/docs/0.1.0/reference/view) and [`View`](/docs/0.1.0/api/engine#view).
- [The runner](/docs/0.1.0/reference/runner).
- [Commands](/docs/0.1.0/reference/commands).
- [Browser helpers](/docs/0.1.0/api/browser) and [the audio player](/docs/0.1.0/api/audio).
