---
title: "Panels"
description: "Reference for OpenPanel, ScenePanel and panelOf: a named piece of UI that content opens over the story, such as a vendor's counter or a job board."
---
A panel is a named piece of UI that content opens over the story, such as a vendor's counter, a job board or the wardrobe. The engine keeps which panel is open and what it was opened with, and the UI decides what each name renders. The [`panel`](/docs/reference/effects#panel) effect opens one, so a choice, an action, an inline `[[act:]]` link or a thing's use can each open one, and [Open a shop, a job board or another panel](/docs/how-to/open-a-panel) opens one from each kind of content.

In the showcase: `examples/showcase/src/story/cafe.ts`, whose Go to the counter action opens the shop plugin's counter with `shop.open('counter')`.

```ts
import type { OpenPanel, ScenePanel } from '@ifloom/engine'
import { panelOf } from '@ifloom/engine/plugin'
```

## OpenPanel

The panel open over the story, with its name and what it was opened with. Every field is in [`OpenPanel`](/docs/api/engine#openpanel).

The state keeps one in [`state.panel`](/docs/reference/state#panel) and the view shows it in [`view.panel`](/docs/reference/view#view), each `null` while no panel is open. `with` is `{}` when the effect gave none. `scene` is set only when the open scene holds the panel itself, and names that scene (see [`ScenePanel`](#scenepanel)).

A panel stays open while the player uses it. Buying at a counter, selling one back or applying for a job changes nothing about where the story is, so the panel stays. A later command that ends a [turn](/docs/reference/state#turn) or changes the scene on screen closes it. The command that opened the panel never closes it, even when it also ends a turn or closes a scene, so one choice can close a scene and open a board. The engine runs this check after the plugins' `onCommand` hooks, so a turn a hook ends closes the panel too.

These effects open the counter, open the job board on one job, and close whatever is open:

```ts
import type { Effect } from '@ifloom/engine'

export const counter: Effect = { panel: 'shop', with: { vendor: 'counter' } }
export const dogWalking: Effect = { panel: 'jobs', with: { job: ['dogs'] } }
export const shut: Effect = { panel: null }
```

The UI closes a panel with the [`closePanel`](/docs/reference/commands#closepanel) command when the player dismisses it. No lock stops `closePanel`, and the engine refuses it only when no panel is open.

## ScenePanel

A panel a [data scene](/docs/reference/scenes#datascene) holds open for as long as the scene is on screen, in the scene's [`panel`](/docs/reference/scenes#panel). Every field is in [`ScenePanel`](/docs/api/engine#scenepanel).

While the scene is open, `view.panel` is the scene's panel with `scene` set, unless the `panel` effect has opened another one, which comes first. `closePanel` doesn't close a scene's panel. It goes when the scene does.

```ts
import type { DataScene } from '@ifloom/engine'

export const stall: DataScene = {
  id: 'market.stall',
  title: 'The bread stall',
  panel: { panel: 'prices', with: { stall: 'bread' } },
  body: [{ text: 'Loaves stacked high, and a chalkboard of prices.' }],
  choices: [{ id: 'leave', label: 'Walk on', effects: [{ scene: null }] }],
}
```

## View

`view.panel` is an [`OpenPanel`](#openpanel) or `null`. A plugin with a panel of its own also puts what that panel shows in its view's `panel`, already filtered by the panel's `with`, and `null` while that panel isn't open. The [jobs plugin](/docs/reference/plugins/jobs)'s `panel` is the jobs on the open board, and the [shop plugin](/docs/reference/plugins/shop)'s is the vendor whose counter is open, so a UI renders an open panel from one place and filters nothing. To render one, see [Render a panel](/docs/how-to/render/timers-minigames-panels#render-a-panel).

## Functions

### panelOf

Returns the panel open now, as `view.panel` shows it: the one the `panel` effect opened, else the open scene's own, else `null`. Every parameter is in [`panelOf`](/docs/api/engine-plugin#panelof).

A plugin's `view` calls it to fill its own `panel`. This plugin shows a board of tasks, narrowed to one when the panel was opened with `{ task }`:

```ts
import { definePlugin, panelOf } from '@ifloom/engine/plugin'

const TASKS = [
  { id: 'dishes', label: 'Wash up' },
  { id: 'floor', label: 'Sweep the floor' },
]

export const tasks = definePlugin<null>({
  id: 'tasks',
  version: 1,
  view: (state, { game }) => {
    const open = panelOf(state, game)
    if (open?.panel !== 'tasks') return { panel: null }
    return { panel: TASKS.filter((task) => open.with.task === undefined || open.with.task === task.id) }
  },
})
```

## Checks

The [content checker](/docs/reference/checks) allows any panel name, because the UI decides what each name renders. A plugin that knows a panel says what its `with` names in its [references](/docs/reference/plugin-checks), and the checker reports what the game lacks:

| Problem | Cause |
|---|---|
| `unknown entity "vendor:kiosk"` | A `shop` panel's `vendor` names a vendor the game doesn't have. |
| `unknown job "circus"` | A `jobs` panel's `job` list names a job the game doesn't have. |

The checker reads a scene's `panel` the same way, under `scene <id>`.

## Caveats

- Moving to another location doesn't close a panel, because the engine keeps no locations. The React UI renders a panel as a modal dialog, so the player closes it before they can leave.
- A scene's own panel outlasts `closePanel`. Give it no Close button, and leave the scene to close it.
