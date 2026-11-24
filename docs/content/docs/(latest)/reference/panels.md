---
title: "Panels"
description: "Open a named panel over the story, such as a shop's counter or a job board, from any action, choice or thing you use, and draw it by name."
---
A panel is a piece of UI that content opens over the story by name: a shop's counter, a job board, the wardrobe. The engine keeps which panel is open and what it was opened with. The UI decides what each name draws.

Nothing opens a panel by itself. Content opens one with the [`panel` effect](/docs/reference/effects#panel), so a place's action, a person's scene, a thing's use in the [inventory](/docs/plugins/inventory), an app's button, a choice or an inline `[[act:]]` link can each open one. Because it's an effect, saves and replays open it exactly as play did.

```ts
import type { OpenPanel, ScenePanel } from '@ifloom/engine'
import { panelOf } from '@ifloom/engine/plugin'
```

## A worked example

The showcase's café has a Go to the counter action that opens the shop plugin's vendor, and Ava's scene has a choice that opens the job board. The newspaper in your pocket opens the board with only its own ads on it.

```ts
import type { Content } from '@ifloom/engine'
import { shop } from '@ifloom/plugin-shop'
import { jobs } from '@ifloom/plugin-jobs'
import { inventory } from '@ifloom/plugin-inventory'

export const town: Content = {
  kinds: [{ id: 'item', label: 'Thing', listed: false }],
  entities: [
    {
      id: 'paper',
      of: 'item',
      name: 'newspaper',
      description: 'Today’s Small Town Gazette. The back page is job ads.',
      at: 'player',
      // { panel: 'jobs', with: { job: ['dogs'] } }, and the paper is kept to read again.
      traits: { ...inventory.usable('Read the job ads', [jobs.open(['dogs'])], { keep: true }) },
    },
  ],
  scenes: [
    {
      id: 'ava.hi',
      body: [{ prose: 'ava.hi' }],
      choices: [
        // The scene closes and the board opens over the room, in one choice.
        { id: 'work', effects: [{ scene: null }, jobs.open()] },
        { id: 'bye', effects: [{ scene: null }] },
      ],
    },
  ],
}
```

The café's location lists the counter among its actions, `{ id: 'counter', label: 'Go to the counter', effects: [shop.open('counter')] }`, which is `{ panel: 'shop', with: { vendor: 'counter' } }`. The paper is kept, so the player can read the ads again.

## OpenPanel

```ts
type OpenPanel = {
  panel: string
  with: Record<string, unknown>
  scene?: string
}
```

The panel that's open: its name and what it was opened with. `with` is `{}` when the effect gave none. It's [`state.panel`](/docs/reference/state#panel) and [`view.panel`](/docs/reference/view#panel), or `null` in both while no panel is open.

`scene` is there when the open scene holds the panel itself (see [A scene's panel](#a-scenes-panel)), and names that scene. A UI usually draws such a panel in the scene, in place of its choices.

## A plugin's panel

A plugin that has a panel of its own puts what that panel shows in its view, already filtered by what the panel was opened with, as its view's `panel`, and `null` while that panel isn't open. So a UI draws an open panel from one place and filters nothing itself. The [jobs](/docs/plugins/jobs#jobsview) plugin's `panel` is the jobs on the open board, only those its `with.job` lists, and the [shop](/docs/plugins/shop#shopview)'s is the vendor whose counter is open.

```ts
const board = view.plugins.jobs?.panel // null, or the jobs the board was opened with
```

### panelOf

```ts
function panelOf(state: GameState, game: Game): OpenPanel | null
```

The panel open now, as `view.panel` shows it: one the `panel` effect opened, else the open scene's own, else `null`. A plugin's `view` reads it to fill its own `panel`. A plugin of your own with a panel does the same:

```ts
view: (state, { game }) => {
  const open = panelOf(state, game)
  return { panel: open?.panel === 'tasks' ? tasksIn(open.with) : null }
}
```

## A scene's panel

```ts
type ScenePanel = { panel: string; with?: Record<string, unknown> }
```

A [data scene](/docs/reference/scenes#datascene) can hold a panel open for as long as it's on screen, with `panel`:

```ts
{ id: 'market.stall', title: 'The stall', panel: { panel: 'prices', with: { stall: 'bread' } }, body: [{ prose: 'market.stall' }], choices: [] }
```

While that scene is open, `view.panel` is `{ panel: 'prices', with: { stall: 'bread' }, scene: 'market.stall' }`, unless the `panel` effect has opened another one, which comes first. `closePanel` doesn't close a scene's panel: it goes when the scene does. A panel that needs numbers worked out from the state reads them from the view, or from a value the game declares.

## Opening and closing

- **Open** one with `{ panel: 'shop', with: { vendor: 'counter' } }`. A panel already open is replaced.
- **Close** it from content with `{ panel: null }`.
- **Close** it from the UI with the [`closePanel`](/docs/reference/commands#closepanel) command, `{ type: 'closePanel' }`, when the player dismisses it. No lock stops it.

## How long a panel stays open

A panel stays open while the player uses it. Buying several things at the counter, selling one back or applying for a job are commands that change nothing about where the story is, so the panel stays.

It closes when a later command moves the story on:

- the command ends a [turn](/docs/reference/state#turn), such as a shift at the job or going to bed, or
- the command changes the scene on screen, such as a purchase that sets off a trigger's scene.

The command that opened the panel never closes it, even if it also ended a turn or closed a scene. That's why Ava's choice above can close her scene and open the board in one go. The check runs after the plugins' `onCommand` hooks, so a turn a hook ends closes the panel too.

Moving to another place doesn't close a panel by itself, because the engine keeps no places. In the React UI the panel is a modal dialog, so the player closes it before they can leave.

## Drawing it

Read `view.panel`, an [`OpenPanel`](#openpanel), and draw it over everything else by its name. A plugin's panel is drawn from its view's `panel` (see [A plugin's panel](#a-plugins-panel)), and a game's own from what it was opened with. Send `{ type: 'closePanel' }` when the player closes it. A scene's own panel has `scene` set: it stays while the scene is open, so give it no Close button.

The React UI's [`PanelHost`](/docs/react/components#panelhost), in the default layout, draws the panels it knows, and a panel of your own goes in `panels` by its name. The Plain JS tab uses `runner` and `add` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/panel.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-panels.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Panel.vue]{meta='tab="Vue" tab-group="framework"'}

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
    <!-- The shop's counter is its view's panel, already the vendor the panel names. -->
    {#if panel.panel === 'shop'}<Counter />{:else}<pre>{JSON.stringify(panel.with, null, 2)}</pre>{/if}
    <button onclick={() => runner.apply({ type: 'closePanel' })}>Close</button>
  </div>
</section>
```

The vanilla, Vue and Svelte templates start with a panel like this that shows the name and `with`, for you to replace with your own drawing. The shop's goods are in [`view.plugins.shop`](/docs/plugins/shop#shopview) and the jobs in [`view.plugins.jobs`](/docs/plugins/jobs#jobsview), with each button's command ready to send. The recipe [Opening a shop or a job board from anywhere](/docs/recipes/shops-and-job-boards) opens them from each kind of content.

The React UI's [`PanelHost`](/docs/react/components#panelhost) draws `inventory` and `stats` itself (see [Built-in panels](/docs/react/components#built-in-panels)), and each plugin UI the game lists in [`plugins`](/docs/react/kit#the-plugins-option) brings its own: `shop`, `jobs`, `wardrobe`, `quests`, `people`, `achievements` and `statuses` from the first-party plugins.

## Checking a panel

The [content checker](/docs/reference/checks#in-an-effect) allows any panel name, because the UI decides what each one draws. A plugin that knows a panel says what its `with` names in [`references.panels`](/docs/reference/plugins#references):

- The shop's `shop` panel needs a `vendor` the game has: `unknown entity "vendor:kiosk"`.
- The jobs plugin's `jobs` panel takes an optional `job` list of jobs the game has: `unknown job "circus"`.

## See it in an example

The showcase's café counter is in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts), Ava's choice in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) and the newspaper in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts), and [`examples/showcase/tests/shell.test.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/shell.test.tsx) opens each in the React UI.
