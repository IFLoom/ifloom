---
title: "Open a shop, a job board or another panel"
description: "Open a vendor's counter, a job board or a panel of your own over the story from a location, a scene, a thing or an app."
---
Use this to put a shop's counter, a job board or a screen of your own over the story. A [panel](/docs/reference/glossary#panel) never opens because of where the player is. Your content opens it by name with the [`panel` effect](/docs/reference/effects#panel), so it can sit wherever it fits the town. The shop and jobs plugins write the effect for you:

```ts
import { shop } from '@ifloom/plugin-shop'
import { jobs } from '@ifloom/plugin-jobs'

export const counter = shop.open('counter') // { panel: 'shop', with: { vendor: 'counter' } }
export const board = jobs.open() // { panel: 'jobs' }
export const ads = jobs.open(['dogs']) // { panel: 'jobs', with: { job: ['dogs'] } }
```

Any effect list can hold one. You need the vendor or the jobs declared first, as [Shop](/docs/reference/plugins/shop#vendordef) and [Jobs](/docs/reference/plugins/jobs#jobdef) describe.

## Open a counter from a location

Put the effect on one of the location's [actions](/docs/how-to/add-a-location#give-it-things-to-do), so the room offers it only there. This is the showcase café's counter:

```ts
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'

export const cafe = places.location({
  id: 'cafe',
  name: 'The Corner Café',
  description: 'Café',
  exits: ['high-street'],
  body: [{ text: 'Six tables, one of them wobbly.' }],
  actions: [{ id: 'counter', label: 'Go to the counter', effects: [shop.open('counter')] }],
})
```

A town hall's job board is the same, with `jobs.open()` in its action's effects.

## Open the job board from a person

Put the effect in a choice of the person's scene. To close the scene and show the board over the room, do both in one choice:

```ts
import type { Choice } from '@ifloom/engine'
import { jobs } from '@ifloom/plugin-jobs'

export const work: Choice = { id: 'work', label: 'Ask about weekend work', effects: [{ scene: null }, jobs.open()] }
```

The board stays open, because the command that opens a panel never closes it, even when it also closes the scene.

## Open it from a thing the player uses

With the [inventory plugin](/docs/reference/plugins/inventory), give the thing the `inventory/usable` trait with the effect. Give it `keep: true` so that reading the paper doesn't use it up:

```ts
import type { EntityDef } from '@ifloom/engine'
import { inventory } from '@ifloom/plugin-inventory'
import { jobs } from '@ifloom/plugin-jobs'

export const paper: EntityDef = {
  id: 'paper',
  of: 'item',
  name: 'newspaper',
  description: 'Today’s Small Town Gazette. The back page is job ads.',
  at: 'player',
  traits: { ...inventory.usable('Read the job ads', [jobs.open(['dogs'])], { keep: true }) },
}
```

`jobs.open(['dogs'])` shows only the dog-walking job, as the paper's ads would.

## Open a shop from a phone or a laptop

Put the effect on a button in an app's actions section, from the [devices plugin](/docs/reference/plugins/devices). Opening a counter doesn't move the player, and a vendor with a `places.onlyAt()` entry in its `blocked` refuses to sell anywhere else, so leave that entry out of an online shop:

```ts
import type { AppDef } from '@ifloom/plugin-devices'
import { shop } from '@ifloom/plugin-shop'

export const webshop = shop.vendor({ id: 'webshop', name: 'Pinecone Online', goods: [{ entity: 'clothing:scarf', price: { coins: 10 } }] })

export const pinecone: AppDef = {
  id: 'pinecone',
  name: 'Pinecone',
  icon: 'basket',
  on: 'laptop',
  sections: [{ actions: [{ id: 'browse', label: 'Browse the shop', effects: [shop.open('webshop')] }] }],
}
```

Add `webshop` to the content's `entities`, and the app to `data.devices.apps`, beside a `laptop` device in `data.devices.devices`.

## Open a panel of your own

Name any panel in the effect, with what it needs in `with`:

```ts
import type { ActionDef } from '@ifloom/engine'

export const noticeboard: ActionDef = { id: 'noticeboard', label: 'Read the noticeboard', effects: [{ panel: 'noticeboard', with: { title: 'Noticeboard' } }] }
```

The engine keeps the panel's name and `with` in `view.panel`, and your UI decides what the name renders. In the React UI, add a component by that name to `mountGame`'s `panels`, as [`PanelHost`](/docs/reference/react/components#panelhost) shows. With a UI of your own, see [Render a panel](/docs/how-to/render/timers-minigames-panels#render-a-panel). To hold a panel open for as long as a scene is on screen, give the scene a [`panel`](/docs/reference/panels#scenepanel) instead, such as `panel: { panel: 'prices', with: { stall: 'bread' } }`.

## Close it

The player closes a panel in the UI, which sends the [`closePanel`](/docs/reference/commands#closepanel) command. Content closes it with `{ panel: null }`, and another `panel` effect replaces it. A panel also closes when a later command ends a turn or changes the scene, such as a shift that passes the morning, so the player can buy several things or apply for a job with it open.

## Check it worked

Run `npm run check`. It reports a `shop.open` for a vendor the game doesn't have, and a `jobs.open` that lists a job it doesn't have, where the effect is written:

```text
content · trait inventory/usable on item:paper · unknown job "circus"
```

Then play in `npm run dev` and press the button. The React UI shows the counter or the board in a dialog when the game lists `shopUi` and `jobsUi` in `plugins` (see [Add a plugin](/docs/how-to/add-a-plugin#show-it-on-screen)), and closing the dialog closes the panel. To render them in a UI of your own, see [Render a shop counter](/docs/how-to/render/things-plugins#render-a-shop-counter) and [Render a job board](/docs/how-to/render/things-plugins#render-a-job-board).

In the showcase, Small Town, the café's counter is in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts), Ava's `work` choice in `src/story/ava.ts` and the newspaper in `src/world/things.ts`. For more, see:

- [Panels](/docs/reference/panels), with [`OpenPanel`](/docs/reference/panels#openpanel) and [`ScenePanel`](/docs/reference/panels#scenepanel), and the [`panel` effect](/docs/reference/effects#panel).
- The [shop](/docs/reference/plugins/shop) and [jobs](/docs/reference/plugins/jobs) plugins.
- [Write a flowing scene](/docs/how-to/write-a-flowing-scene#play-a-minigame-or-open-a-panel-where-it-stands), to open a panel in the middle of a scene.
