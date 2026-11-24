---
title: "Render timers, minigames and panels"
description: "Render timer countdowns, a running minigame and an open panel in a UI of your own, in plain JS, React or Vue."
---
Render the countdowns of running timers, a minigame while the player plays it, and a [panel](/docs/0.1.0/reference/glossary#panel) open over the story. Set up the runner first, with `startClock` beside it, as [Start your own UI](/docs/0.1.0/how-to/render/start) shows. The engine keeps no clock, so timers and minigames stand still until something sends ticks.

## Render timers

`view.timers` lists each running [timer](/docs/0.1.0/reference/glossary#timer) in the order they started, as a [`TimerView`](/docs/0.1.0/api/engine#timerview) with its `id`, its `label`, and the milliseconds `left` of its `total`. The React UI's `Scene` renders a [`Countdown`](/docs/0.1.0/api/react#countdown) under a block whose `timer` hint names a timer, [`Timers`](/docs/0.1.0/api/react#timers) renders them all, and [`useTimer`](/docs/0.1.0/api/react#usetimer) gives you one to render your own way.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts, which runs startClock(runner) to send the ticks.
import { add } from './runner.ts'

/** A countdown for each running timer: its label, a bar that empties, and the seconds left. */
export function drawTimers(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const timer of view.timers) {
    const box = add(parent, 'div', '', 'timer')
    box.dataset.timer = timer.id
    // A quarter or less left: render it as urgent.
    if (timer.left <= timer.total / 4) box.dataset.urgent = ''
    if (timer.label) add(box, 'span', timer.label, 'timer-label')
    Object.assign(add(box, 'progress'), { max: timer.total, value: timer.left })
    add(box, 'span', `${Math.ceil(timer.left / 1000)}s`, 'timer-left')
  }
}
```

```tsx tab="React" tab-group="framework"
import { Game, Scene, Sidebar, Story, Timers, useTimer } from '@ifloom/react'

// Scene renders a Countdown under a block whose `timer` hint names a timer. A layout of your own can put them anywhere.
export function Layout() {
  return (
    <Game>
      <Sidebar>
        {/* A countdown for every running timer. */}
        <Timers />
        <RingingPhone />
      </Sidebar>
      <Story>
        <Scene />
      </Story>
    </Game>
  )
}

// One timer your own way: the phone fades as it rings out.
export function RingingPhone() {
  const ringing = useTimer('flat.ring')
  if (!ringing) return null
  return <span style={{ opacity: 0.4 + (0.6 * ringing.left) / ringing.total }}>☎</span>
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { view } from './runner.ts'

// A countdown for each running timer: its label, a bar that empties, and the seconds left.
// The vue template's runner.ts runs startClock(runner) to send the ticks.
</script>

<template>
  <div v-for="timer in view.timers" :key="timer.id" class="timer" :data-timer="timer.id" :data-urgent="timer.left <= timer.total / 4 ? '' : undefined">
    <span v-if="timer.label" class="timer-label">{{ timer.label }}</span>
    <progress :max="timer.total" :value="timer.left" />
    <span class="timer-left">{{ Math.ceil(timer.left / 1000) }}s</span>
  </div>
</template>
```

Render the countdown from `left / total`, and the seconds from `left`. A timer is in the view only while it runs, so its countdown goes when it runs out or the game stops it. To put a countdown under the block that names it, read the block's hint from each beat, `beat.ui?.timer`. A `<progress>` moves in steps with each tick, so for a smooth bar scale a `div` with `transform: scaleX(left / total)` and a 100 ms linear transition.

## Render a minigame

`view.minigame` holds the [minigame](/docs/0.1.0/reference/minigames) being played, as a [`MinigameView`](/docs/0.1.0/api/engine#minigameview), and `view.scene` holds its title and the running state's words. The React UI's `Scene` renders a [`MinigameCard`](/docs/0.1.0/api/react#minigamecard) while one runs, and [`useMinigame`](/docs/0.1.0/api/react#useminigame) reads it for a component of your own.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts, which runs startClock(runner) to send the ticks.
import { add, drawChoices } from './runner.ts'

/** The minigame being played, under the scene's title and beats (its words): a bar counting down its timer, and a button for each input that does something now. */
export function drawMinigame(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const minigame = view.minigame
  if (!minigame) return
  const box = add(parent, 'section', '', 'minigame')
  box.dataset.state = minigame.state
  if (minigame.timeLeft !== null && minigame.timeTotal) {
    const timer = add(box, 'div', '', 'timer')
    timer.setAttribute('role', 'progressbar')
    timer.setAttribute('aria-label', 'Time left')
    add(timer, 'span').style.transform = `scaleX(${minigame.timeLeft / minigame.timeTotal})`
  }
  // Each input is a button like any other, labelled by the game's minigame.<input> strings: Up, Space.
  drawChoices(add(box, 'div', '', 'choices'), minigame.inputs)
}
```

```tsx tab="React" tab-group="framework"
import { useMinigame } from '@ifloom/react'

// Scene renders a MinigameCard while one runs, and runs its clock. For one minigame of your own, give mountGame's
// `panels` a component under the minigame's id, such as `{ arrows: ArrowPad }`.
export function ArrowPad() {
  // With keys: true, the arrow keys press the inputs too.
  const { minigame, send } = useMinigame({ keys: true })
  if (!minigame) return null
  return (
    <div className="arrows">
      <p>{minigame.label}</p>
      {/* Each input's words come from the game's minigame.<input> strings: Up, Space. */}
      {minigame.inputs.map((input) => (
        <button key={input.id} onClick={() => send(input.id)}>
          {input.label}
        </button>
      ))}
    </div>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// The minigame being played, under the scene's title and beats (its words): a bar counting down its timer, and a
// button for each input that does something now. The vue template's runner.ts runs startClock(runner) to send the ticks.
</script>

<template>
  <section v-if="view.minigame" class="minigame" :data-state="view.minigame.state">
    <div v-if="view.minigame.timeLeft !== null && view.minigame.timeTotal" class="timer" role="progressbar" aria-label="Time left">
      <span :style="{ transform: `scaleX(${view.minigame.timeLeft / view.minigame.timeTotal})` }" />
    </div>
    <div class="choices">
      <!-- Each input's words come from the game's minigame.<input> strings: Up, Space. -->
      <button v-for="input in view.minigame.inputs" :key="input.id" @click="runner.apply(input.command)">{{ input.label }}</button>
    </div>
  </section>
</template>
```

Each of the minigame's `inputs` is a ready button, with its words in `label` and the `{ type: 'minigame', input }` it sends in `command`. Render a bar from `timeLeft` and `timeTotal` while the state has a timer, and read the minigame's own kv store in `kv`, such as a score. [`startKeys`](/docs/0.1.0/api/browser#startkeys) presses the inputs on the minigame's `keys`, or on the arrow keys and space, whatever renders the panel.

To render one minigame your own way, check `view.minigame.id`, such as the showcase's `arrows`. In the React UI, give `mountGame`'s `panels` a component under the minigame's id, such as `{ arrows: ArrowPad }`, and it renders in place of the `MinigameCard`.

## Render a panel

`view.panel` holds the panel open over the story, as an [`OpenPanel`](/docs/0.1.0/api/engine#openpanel) with its name in `panel` and what content opened it with in `with`, or null. The React UI's [`PanelHost`](/docs/0.1.0/api/react#panelhost) renders the panels it knows over the story in the default layout, and a panel of your own goes in `mountGame`'s `panels` under its name.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'
import { drawShop } from './shop.ts'

/** The panel open over the story, rendered by its name, with a Close button unless a scene holds it open. */
export function drawPanel(parent: HTMLElement, snapshot: RunnerSnapshot): void {
  const { view } = snapshot
  if (!view.panel) return
  const dialog = add(parent, 'section', '', 'panel')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-label', view.panel.panel)
  const box = add(dialog, 'div')
  // The shop's counter (see the shop plugin's page); any other panel shows what it was opened with.
  if (view.panel.panel === 'shop') drawShop(box, snapshot)
  else add(box, 'pre', JSON.stringify(view.panel.with, null, 2))
  if (!view.panel.scene) add(box, 'button', 'Close').onclick = () => runner.apply({ type: 'closePanel' })
}
```

```tsx tab="React" tab-group="framework"
import { Inventory, mountGame, type PanelComponent } from '@ifloom/react'
import module from './game.ts'

// PanelHost, in the default layout, renders view.panel by its name. A panel of your own goes in `panels`, over a built-in one:
// content opens this one with { panel: 'pockets' }, and it's given what the panel was opened with as `data`.
const Pockets: PanelComponent = () => <Inventory title="Your pockets" />

mountGame(module.build(), { panels: { pockets: Pockets } })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'
import ShopCounter from './ShopCounter.vue'

// The panel open over the story, rendered by its name, with a Close button unless a scene holds it open.
// The vue template's App.vue renders <Panel v-if="view.panel" :panel="view.panel" />; this one reads view.panel itself.
</script>

<template>
  <section v-if="view.panel" class="panel" role="dialog" :aria-label="view.panel.panel">
    <div>
      <!-- The shop's counter (see the shop plugin's page); any other panel shows what it was opened with. -->
      <ShopCounter v-if="view.panel.panel === 'shop'" />
      <pre v-else>{{ JSON.stringify(view.panel.with, null, 2) }}</pre>
      <button v-if="!view.panel.scene" @click="runner.apply({ type: 'closePanel' })">Close</button>
    </div>
  </section>
</template>
```

Render the panel by its name, over everything else. A plugin's panel shows what its own view holds for it, such as the open counter's vendor in `view.plugins.shop.panel`, already filtered by the panel's `with`. Send `{ type: 'closePanel' }` when the player closes it. A scene's own panel has `scene` set and stays while the scene is open, so give it no Close button.

The `vanilla` and `vue` templates start with a panel that shows its name and `with`, for you to replace. In the React UI, `PanelHost` renders `inventory` and `stats` itself, and each plugin UI the game lists in `plugins` brings its own, such as `shop` and `jobs`. [Render the inventory, shop, jobs and wardrobe](/docs/0.1.0/how-to/render/things-plugins) renders the shop's and the jobs' panels.

For more on what these sections render, see:

- [Timers](/docs/0.1.0/reference/timers), [Minigames](/docs/0.1.0/reference/minigames) and [Panels](/docs/0.1.0/reference/panels).
- [Browser helpers](/docs/0.1.0/api/browser), for `startClock` and `startKeys`.
- [Add a countdown](/docs/0.1.0/how-to/add-a-countdown), [Build a minigame](/docs/0.1.0/how-to/build-a-minigame) and [Open a shop, a job board or another panel](/docs/0.1.0/how-to/open-a-panel).
