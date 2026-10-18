---
title: "Panels"
description: "Open a named panel over the story, such as a shop's counter or a job board, from any action, choice or item, and draw it by name."
---
A panel is a piece of UI that content opens over the story by name: a shop's counter, a job board, the wardrobe. The engine keeps which panel is open and what it was opened with. The UI decides what each name draws.

Nothing opens a panel by itself. Content opens one with the [`panel` effect](/docs/reference/effects#panel), so a place's action, a person's scene, an item's `use`, an app's button, a choice or an inline `[[act:]]` link can each open one. Because it's an effect, saves and replays open it exactly as play did.

```ts
import type { OpenPanel } from '@ifloom/engine'
```

## A worked example

The showcase's café has a Go to the counter action that opens the shop plugin's vendor, and Ava's scene has a choice that opens the job board. The newspaper in your pocket opens the board with only its own ads on it.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { onlyAt } from '@ifloom/plugin-places'
import { openShop } from '@ifloom/plugin-shop'
import { openJobs } from '@ifloom/plugin-jobs'

export const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  activities: [
    // { kind: 'panel', panel: 'shop', with: { vendor: 'counter' } }
    { id: 'counter', blocked: [onlyAt(['cafe'])], effects: [openShop('counter')] },
  ],
  items: [
    {
      id: 'paper',
      name: 'newspaper',
      desc: 'Today’s Small Town Gazette. The back page is job ads.',
      // { kind: 'panel', panel: 'jobs', with: { job: ['dogs'] } }
      use: { label: 'Read the job ads', effects: [openJobs(['dogs'])] },
    },
  ],
  scenes: [
    {
      id: 'ava.hi',
      body: [{ text: 'ava.hi' }],
      choices: [
        // The scene closes and the board opens over the room, in one choice.
        { id: 'work', effects: [{ kind: 'scene', scene: null }, openJobs()] },
        { id: 'bye', effects: [{ kind: 'scene', scene: null }] },
      ],
    },
  ],
}
```

The café's location then lists `{ id: 'counter', label: 'Go to the counter', command: { type: 'activity', id: 'counter' } }` among its actions. Using an item spends one, so the paper is gone once read. The counter sells another for 2 coins.

## OpenPanel

```ts
type OpenPanel = {
  panel: string
  with: Record<string, unknown>
}
```

The panel that's open: its name and what it was opened with. `with` is `{}` when the effect gave none. It's [`state.panel`](/docs/reference/state#panel) and [`view.panel`](/docs/reference/view#panel), or `null` in both while no panel is open.

## Opening and closing

- **Open** one with `{ kind: 'panel', panel: 'shop', with: { vendor: 'counter' } }`. A panel already open is replaced.
- **Close** it from content with `{ kind: 'panel', panel: null }`.
- **Close** it from the UI with the [`closePanel`](/docs/reference/commands#closepanel) command, `{ type: 'closePanel' }`, when the player dismisses it. No lock stops it.

## How long a panel stays open

A panel stays open while the player uses it. Buying several things at the counter, selling one back or applying for a job are commands that change nothing about where the story is, so the panel stays.

It closes when a later command moves the story on:

- the command ends a [turn](/docs/reference/state#turn), such as a shift at the job or going to bed, or
- the command changes the scene on screen, such as a purchase that sets off a trigger's scene.

The command that opened the panel never closes it, even if it also ended a turn or closed a scene. That's why Ava's choice above can close her scene and open the board in one go. The check runs after the plugins' `onCommand` hooks, so a turn a hook ends closes the panel too.

Moving to another place doesn't close a panel by itself, because the engine keeps no places. In the React UI the panel is a modal dialog, so the player closes it before they can leave.

## Drawing a panel

Read `view.panel` and draw it over everything else by its name. Send `closePanel` when the player closes it.

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template: at the end of draw(view)
if (view.panel) {
  const dialog = add(root, 'section', '', 'panel')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-label', view.panel.panel)
  const box = add(dialog, 'div')
  if (view.panel.panel === 'shop') drawCounter(box, String(view.panel.with.vendor))
  else add(box, 'pre', JSON.stringify(view.panel.with, null, 2))
  add(box, 'button', 'Close').onclick = () => runner.apply({ type: 'closePanel' })
}
```

```ts tab="React" tab-group="framework"
// The React UI draws view.panel for you with PanelHost, which the default layout has.
// A panel of your own goes in mountGame's panels, by name, over a built-in one.
import { mountGame } from '@ifloom/react'
import { Pockets } from './Pockets.tsx'

mountGame(game, { panels: { pockets: Pockets } })
```

```vue tab="Vue" tab-group="framework"
<!-- src/Panel.vue, in the vue template; App.vue draws <Panel v-if="view.panel" :panel="view.panel" /> -->
<script setup lang="ts">
import type { OpenPanel } from '@ifloom/engine'
import { runner } from './runner.ts'
import Counter from './Counter.vue'

defineProps<{ panel: OpenPanel }>()
</script>

<template>
  <section class="panel" role="dialog" :aria-label="panel.panel">
    <div>
      <Counter v-if="panel.panel === 'shop'" :vendor="String(panel.with.vendor)" />
      <pre v-else>{{ JSON.stringify(panel.with, null, 2) }}</pre>
      <button @click="runner.apply({ type: 'closePanel' })">Close</button>
    </div>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Panel.svelte, in the svelte template; App.svelte draws {#if $view.panel}<Panel panel={$view.panel} />{/if} -->
<script lang="ts">
  import type { OpenPanel } from '@ifloom/engine'
  import { runner } from './runner.ts'
  import Counter from './Counter.svelte'

  let { panel }: { panel: OpenPanel } = $props()
</script>

<section class="panel" role="dialog" aria-label={panel.panel}>
  <div>
    {#if panel.panel === 'shop'}<Counter vendor={String(panel.with.vendor)} />{:else}<pre>{JSON.stringify(panel.with, null, 2)}</pre>{/if}
    <button onclick={() => runner.apply({ type: 'closePanel' })}>Close</button>
  </div>
</section>
```

The vanilla, Vue and Svelte templates start with a panel like this that shows the name and `with`, for you to replace with your own drawing. The shop's goods are in [`view.plugins.shop`](/docs/plugins/shop#shopview) and the jobs in [`view.plugins.jobs`](/docs/plugins/jobs#jobsview), with each button's command ready to send. The recipe [Opening a shop or a job board from anywhere](/docs/recipes/shops-and-job-boards) opens them from each kind of content.

The React UI's [`PanelHost`](/docs/react/components#panelhost) draws these names itself: `shop`, `jobs`, `wardrobe`, `inventory`, `quests`, `people`, `achievements`, `statuses` and `stats`. See [`BUILT_IN_PANELS`](/docs/react/components#built_in_panels).

## Checking a panel

The [content checker](/docs/reference/checks#in-an-effect) allows any panel name, because the UI decides what each one draws. A plugin that knows a panel checks its `with` with [`panelProblems`](/docs/reference/plugins#checking-panels):

- The shop's `shop` panel needs a `vendor` the game has: `unknown vendor "kiosk"`.
- The jobs plugin's `jobs` panel takes an optional `job` list of jobs the game has: `unknown job "circus"`.

## See it in an example

The showcase's café counter is in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts), Ava's choice in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) and the newspaper in [`examples/showcase/src/world/items.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/items.ts), and [`examples/showcase/tests/shell.test.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/shell.test.tsx) opens each in the React UI.
