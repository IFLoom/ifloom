---
title: "Building your own HUD"
description: "Build your own HUD from the view: a stat bar, a strip of unread counts and an objective line from the tracked quest, in plain DOM, React, Vue or Svelte."
---
Most games want their heads-up display to look like nothing else, so this page builds three pieces of one from the [view](/docs/reference/view):

- an energy bar that turns red as it runs low
- a strip of unread counts for notices and texts
- an objective line from the quest the player is tracking

The view is the same whatever draws it, so each piece reads the same fields in every framework. Each code block has a tab for plain DOM, React, Vue and Svelte:

- **Plain JS** pieces are functions that return an element, called from the `draw` function in the [`vanilla` template](/docs/guide/frameworks)'s `src/main.ts`.
- **React** pieces are components that read the view with [`useGame`](/docs/reference/react/components#usegame) from the [React UI](/docs/reference/react), whose stat list, [`NoticeStrip`](/docs/reference/react/components#noticestrip) and quest log are basic on purpose.
- **Vue** and **Svelte** pieces are components that read the view from the [`vue` or `svelte` template](/docs/guide/frameworks)'s `src/runner.ts`.

The examples use Small Town's stats and plugins, but the pattern is the same for any game.

## A stat bar

Every stat the game lists is in `view.stats` as a [`StatView`](/docs/reference/view#statview), with its `value`, its `min` and `max`, and its `text` as the game formats it. This bar takes the stat's key, so one piece draws a bar for any stat:

```ts tab="Plain JS" tab-group="framework"
// src/hud.ts
import type { View } from '@ifloom/engine'

/** A bar for one of the game's stats, by its key: statBar(view, 'energy'). */
export function statBar(view: View, key: string): HTMLElement | null {
  const stat = view.stats.find((entry) => entry.key === key)
  if (!stat) return null
  const range = stat.max - stat.min
  const share = range > 0 ? (stat.value - stat.min) / range : 0
  const meter = document.createElement('div')
  meter.className = 'meter'
  meter.setAttribute('role', 'meter')
  meter.setAttribute('aria-label', stat.label)
  meter.setAttribute('aria-valuemin', String(stat.min))
  meter.setAttribute('aria-valuemax', String(stat.max))
  meter.setAttribute('aria-valuenow', String(stat.value))
  meter.setAttribute('aria-valuetext', stat.text)
  const fill = meter.appendChild(document.createElement('div'))
  fill.style.width = `${share * 100}%`
  fill.style.background = share < 0.25 ? 'crimson' : 'seagreen'
  return meter
}
```

```tsx tab="React" tab-group="framework"
// src/hud/StatBar.tsx
import { useGame } from '@ifloom/react'

/** A bar for one of the game's stats, by its key: <StatBar stat="energy" />. */
export function StatBar({ stat: key }: { stat: string }) {
  const { view } = useGame()
  const stat = view.stats.find((entry) => entry.key === key)
  if (!stat) return null
  const range = stat.max - stat.min
  const share = range > 0 ? (stat.value - stat.min) / range : 0
  return (
    <div
      role="meter"
      aria-label={stat.label}
      aria-valuemin={stat.min}
      aria-valuemax={stat.max}
      aria-valuenow={stat.value}
      aria-valuetext={stat.text}
      className="h-3 overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full transition-[width]" style={{ width: `${share * 100}%`, background: share < 0.25 ? 'crimson' : 'seagreen' }} />
    </div>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/StatBar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { view } from './runner.ts'

// A bar for one of the game's stats, by its key: <StatBar stat="energy" />.
const props = defineProps<{ stat: string }>()
const stat = computed(() => view.value.stats.find((entry) => entry.key === props.stat))
const share = computed(() => (stat.value && stat.value.max > stat.value.min ? (stat.value.value - stat.value.min) / (stat.value.max - stat.value.min) : 0))
</script>

<template>
  <div
    v-if="stat"
    role="meter"
    :aria-label="stat.label"
    :aria-valuemin="stat.min"
    :aria-valuemax="stat.max"
    :aria-valuenow="stat.value"
    :aria-valuetext="stat.text"
    class="meter"
  >
    <div :style="{ width: `${share * 100}%`, background: share < 0.25 ? 'crimson' : 'seagreen' }" />
  </div>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/StatBar.svelte -->
<script lang="ts">
  import { view } from './runner.ts'

  // A bar for one of the game's stats, by its key: <StatBar stat="energy" />.
  let { stat: key }: { stat: string } = $props()
  const stat = $derived($view.stats.find((entry) => entry.key === key))
  const share = $derived(stat && stat.max > stat.min ? (stat.value - stat.min) / (stat.max - stat.min) : 0)
</script>

{#if stat}
  <div
    role="meter"
    aria-label={stat.label}
    aria-valuemin={stat.min}
    aria-valuemax={stat.max}
    aria-valuenow={stat.value}
    aria-valuetext={stat.text}
    class="meter"
  >
    <div style:width={`${share * 100}%`} style:background={share < 0.25 ? 'crimson' : 'seagreen'}></div>
  </div>
{/if}
```

`max` is the stat's ceiling right now, so a ceiling that grows during the game is already worked out. Give the bar `role="meter"` and the values, so a screen reader can say how full it is.

If you use the React UI and a plain bar is all you need, you don't have to write one. Give the stat the hint [`ui: { display: 'bar' }`](/docs/reference/react/hints#display) or `'pips'`, and the built-in [`StatList`](/docs/reference/react/components#statlist) draws it.

## A strip of unread counts

Unseen notices are in `view.notices.unseen`, newest first. A plugin's counts are in its slice of `view.plugins`, which you read by its type from the plugin's package. The [messages](/docs/reference/plugins/messages) plugin keeps an `unread` count:

```ts tab="Plain JS" tab-group="framework"
// src/hud.ts
import type { View } from '@ifloom/engine'

let showNotices = false

/** The unread counts. The bell shows the notices; `redraw` draws the page again with the list open or shut. */
export function unread(view: View, redraw: () => void): HTMLElement {
  const strip = document.createElement('div')
  strip.className = 'unread'
  const notices = view.notices.unseen
  const texts = view.plugins.messages?.unread ?? 0
  if (notices.length) {
    const bell = strip.appendChild(document.createElement('button'))
    bell.textContent = `🔔 ${notices.length}`
    bell.onclick = () => {
      showNotices = !showNotices
      redraw()
    }
  }
  if (texts) strip.appendChild(document.createElement('span')).textContent = `✉ ${texts}`
  if (showNotices) {
    const list = strip.appendChild(document.createElement('ul'))
    for (const notice of notices.slice(0, 10)) list.appendChild(document.createElement('li')).textContent = notice.title
  }
  return strip
}
```

```tsx tab="React" tab-group="framework"
// src/hud/Unread.tsx
import { useState } from 'react'
import { Notices, useGame } from '@ifloom/react'
import { DeviceDialog, useDevice } from '@ifloom/plugin-devices/react'

export function Unread() {
  const { view } = useGame()
  const phone = useDevice()
  const [showNotices, setShowNotices] = useState(false)
  const notices = view.notices.unseen.length
  const texts = view.plugins.messages?.unread ?? 0
  return (
    <div className="flex gap-3 text-sm">
      {notices ? <button onClick={() => setShowNotices(!showNotices)}>🔔 {notices}</button> : null}
      {texts ? <button onClick={() => phone.open('phone')}>✉ {texts}</button> : null}
      {showNotices ? <Notices limit={10} /> : null}
      {/* Without devicesUi in `plugins`, which draws it for you: the phone once it's out. */}
      <DeviceDialog />
    </div>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Unread.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { view } from './runner.ts'

const showNotices = ref(false)
const notices = computed(() => view.value.notices.unseen)
const texts = computed(() => view.value.plugins.messages?.unread ?? 0)
</script>

<template>
  <div class="unread">
    <button v-if="notices.length" @click="showNotices = !showNotices">🔔 {{ notices.length }}</button>
    <span v-if="texts">✉ {{ texts }}</span>
    <ul v-if="showNotices">
      <li v-for="notice in notices.slice(0, 10)" :key="notice.id">{{ notice.title }}</li>
    </ul>
  </div>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Unread.svelte -->
<script lang="ts">
  import { view } from './runner.ts'

  let showNotices = $state(false)
  const notices = $derived($view.notices.unseen)
  const texts = $derived($view.plugins.messages?.unread ?? 0)
</script>

<div class="unread">
  {#if notices.length}<button onclick={() => (showNotices = !showNotices)}>🔔 {notices.length}</button>{/if}
  {#if texts}<span>✉ {texts}</span>{/if}
  {#if showNotices}
    <ul>
      {#each notices.slice(0, 10) as notice (notice.id)}<li>{notice.title}</li>{/each}
    </ul>
  {/if}
</div>
```

A count of 0 draws nothing. The bell shows the newest notices, and sending `{ type: 'dismiss' }` with `runner.apply` marks them all seen (see [`dismiss`](/docs/reference/commands#dismiss)). In the React tab, the texts button opens the phone with [`useDevice`](/docs/reference/plugins/devices#usedevice) and a [`DeviceDialog`](/docs/reference/plugins/devices#devicedialog), the same pair the built-in device buttons use. In the others it's a count, which you can turn into a button that opens your own messages panel.

## An objective line

The [quests](/docs/reference/plugins/quests) plugin lists the active quests in `view.plugins.quests.active`, with the tracked one first. Each has its `title` and the `hint` for the stage the player is on:

```ts tab="Plain JS" tab-group="framework"
// src/hud.ts
import type { View } from '@ifloom/engine'

/** The tracked quest's name and hint, or null when none is tracked. */
export function objective(view: View): HTMLElement | null {
  const quest = view.plugins.quests?.active.find((entry) => entry.tracked)
  if (!quest) return null
  const line = document.createElement('p')
  line.className = 'objective'
  line.appendChild(document.createElement('strong')).textContent = quest.name
  if (quest.hint) line.append(` · ${quest.hint}`)
  return line
}
```

```tsx tab="React" tab-group="framework"
// src/hud/Objective.tsx
import { useGame } from '@ifloom/react'

export function Objective() {
  const { view } = useGame()
  const quest = view.plugins.quests?.active.find((entry) => entry.tracked)
  if (!quest) return null
  return (
    <p className="text-sm">
      <strong>{quest.name}</strong>
      {quest.hint ? <span className="text-muted-foreground"> · {quest.hint}</span> : null}
    </p>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Objective.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { view } from './runner.ts'

const quest = computed(() => view.value.plugins.quests?.active.find((entry) => entry.tracked))
</script>

<template>
  <p v-if="quest" class="objective">
    <strong>{{ quest.name }}</strong>
    <span v-if="quest.hint"> · {{ quest.hint }}</span>
  </p>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Objective.svelte -->
<script lang="ts">
  import { view } from './runner.ts'

  const quest = $derived($view.plugins.quests?.active.find((entry) => entry.tracked))
</script>

{#if quest}
  <p class="objective">
    <strong>{quest.name}</strong>
    {#if quest.hint}<span> · {quest.hint}</span>{/if}
  </p>
{/if}
```

The player picks which quest to track, which sends the quests plugin's `quests/track` command. To show the newest quest when none is tracked, take `active[0]` instead.

## Putting it on screen

Put the three pieces together in a bar over the scene:

```ts fragment tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template
import { objective, statBar, unread } from './hud.ts'

function draw(view: View): void {
  root.replaceChildren()
  const hud = add(root, 'div', '', 'hud')
  hud.append(...[objective(view), unread(view, () => draw(runner.view())), statBar(view, 'energy')].filter((part) => part !== null))
  // …then the title, the scene and its choices, as before.
}
```

```tsx tab="React" tab-group="framework"
// src/layout.tsx: the react template's, with the HUD over the story and no stat list at the side
import { Game, GameMenu, Notices, Overlay, PanelHost, RoomActions, Scene, Sidebar, Story, Title } from '@ifloom/react'
import { StatBar } from './hud/StatBar.tsx'
import { Objective } from './hud/Objective.tsx'
import { Unread } from './hud/Unread.tsx'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <GameMenu />
      </Sidebar>
      <Story>
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-4">
            <Objective />
            <Unread />
          </div>
          <StatBar stat="energy" />
        </div>
        <Scene />
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
<!-- src/App.vue, in the vue template -->
<script setup lang="ts">
import StatBar from './StatBar.vue'
import Objective from './Objective.vue'
import Unread from './Unread.vue'
</script>

<template>
  <div class="hud">
    <Objective />
    <Unread />
    <StatBar stat="energy" />
  </div>
  <!-- …then the title, the scene and its choices, as before. -->
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte, in the svelte template -->
<script lang="ts">
  import StatBar from './StatBar.svelte'
  import Objective from './Objective.svelte'
  import Unread from './Unread.svelte'
</script>

<div class="hud">
  <Objective />
  <Unread />
  <StatBar stat="energy" />
</div>
<!-- …then the title, the scene and its choices, as before. -->
```

In plain DOM, the pieces are drawn again with the rest of the page on every change. In Vue and Svelte, each component redraws itself when the view changes.

In the React UI, your components go anywhere in your [layout](/docs/reference/react#layouts), among the built-in parts. Here they make a bar across the top of the story, and take the place of the stat list at the side. For a HUD in a different place altogether, such as a bar fixed across the top of the window, change the [shape of the page](/docs/reference/react/customising#7-change-the-shape-of-the-page) or [write your own root](/docs/reference/react/customising#8-write-your-own-root). The components above work anywhere inside the game's provider.

## What just changed

Feedback after a choice, such as `+30 coins` or `-5% energy`, is already worked out for you in [`view.changes`](/docs/reference/changes), for the stats you name in your content's [`changes.stats`](/docs/reference/changes#changes). Each entry has its signed `text` in the stat's format and `by`, which says whether it went up or down. The React UI has a ready list for it, [`Changes`](/docs/reference/react/components#changes), that the default layout leaves out. Place it after the scene, and style its `change` parts by `data-dir`. [Changes](/docs/reference/changes#drawing-it) has the same list in plain DOM and Vue.

To draw a plugin that has no UI of its own, such as the shop or jobs, see [Building UI for plugins](/docs/recipes/plugin-ui).
