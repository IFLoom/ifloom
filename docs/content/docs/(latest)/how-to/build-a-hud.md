---
title: "Build a HUD"
description: "Build a heads-up display of your own with a stat bar, unread counts and the tracked quest's objective, in plain JS, React or Vue."
---
Use this when the React UI's stat list, notice strip and quest log are too plain for your game. Each piece of a HUD reads the [view](/docs/reference/view), which is the same whatever renders it, so each tab below reads the same fields. Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows. In React, each piece reads the view with [`useGame`](/docs/reference/react/components#usegame) and sits in your layout beside the React UI's parts. The examples use the showcase's stats and plugins.

## Add a stat bar

Find the stat in `view.stats`, a list of [`StatView`](/docs/api/engine#statview)s with each one's `value`, `min`, `max` and `text`. This bar takes the stat's id, so one piece renders a bar for any stat:

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

`max` is the stat's ceiling now, so a ceiling that grows during the game is already worked out. `role="meter"` and the values let a screen reader say how full it is.

If a plain bar is all you need in the React UI, give the stat the hint [`ui: { display: 'bar' }`](/docs/reference/react/hints#display) or `'pips'`, and the built-in [`StatList`](/docs/reference/react/components#statlist) renders it. `StatList` is plain on purpose, so write your own, as above, for a bar that changes colour. To reword a levelled stat's "Level 2" or its bar's label, set `ui.statLevel` or `ui.statProgress` in your content's [`strings`](/docs/reference/react#strings).

## Add a strip of unread counts

Read the unseen notices from `view.notices.unseen`, newest first, and a plugin's counts from its part of `view.plugins`. The [messages](/docs/reference/plugins/messages) plugin keeps an `unread` count:

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

A count of 0 renders nothing. The bell shows the newest notices, and sending `{ type: 'dismiss' }` with `runner.apply` marks them all seen (see [`dismiss`](/docs/reference/commands#dismiss)). In the React tab, the texts button opens the phone with [`useDevice`](/docs/reference/plugins/devices#usedevice) and a [`DeviceDialog`](/docs/reference/plugins/devices#devicedialog), the pair the built-in device buttons use. In the other tabs it's a count, which you can turn into a button that opens your own messages panel.

## Add an objective line

Read the active quests from `view.plugins.quests.active`, which the [quests](/docs/reference/plugins/quests) plugin lists with the tracked one first. Each has its `name` and the `hint` for the stage the player is on:

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

The player chooses which quest to track, which sends the quests plugin's `quests/track` command. To show the newest quest when none is tracked, take `active[0]` instead.

## Put it on screen

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

In plain JS, the pieces render again with the rest of the page on every change. In Vue and React, each component renders again when the view changes. In the React UI, your components go anywhere in your [layout](/docs/reference/react/components#defaultlayout), among the built-in parts: here they make a bar across the top of the story and take the place of the stat list at the side. For a bar fixed across the top of the window, see [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts). The components work anywhere inside the game's provider.

## Check it worked

Play in `npm run dev` and work shifts at the café, which cost 25 energy each: the bar shrinks and turns red below a quarter. Meet Ava and sleep, and the strip shows ✉ 1 for her text. Start a quest and track it, and its name and hint show in the objective line.

## Variations

**What just changed.** Feedback after a choice, such as `+30 coins`, is already worked out in [`view.changes`](/docs/reference/changes), for the stats your content names in `changes.stats`. The React UI's [`Changes`](/docs/reference/react/components#changes) renders it, and the default layout leaves it out, so place it after the scene. [Render what changed](/docs/how-to/render/stats-and-things#render-what-changed) has the same list in plain JS and Vue.

For more, see:

- [The view](/docs/reference/view) and [`StatView`](/docs/api/engine#statview).
- [Render the stats](/docs/how-to/render/stats-and-things#render-the-stats) and [Render notices](/docs/how-to/render/stats-and-things#render-notices).
- [Render the quest log](/docs/how-to/render/progress-plugins#render-the-quest-log).
- [Arrange the layout](/docs/how-to/arrange-the-layout), for the rest of the page.
