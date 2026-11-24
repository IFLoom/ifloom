---
title: "Opening a shop or a job board from anywhere"
description: "Open a vendor's counter or the job board from a place, a person, a thing the player uses or an app, with openShop and openJobs."
---
A shop or a job board doesn't appear on its own just because the player is somewhere. Your content opens it, so it can sit wherever it makes sense in your town: a counter in the café, a job board at the town hall, the job ads in a newspaper, a shop on a phone.

You open one with the [`panel` effect](/docs/reference/effects#panel). The shop and jobs plugins write it for you:

```ts
import { shop } from '@ifloom/plugin-shop'
import { jobs } from '@ifloom/plugin-jobs'

shop.open('counter')   // { panel: 'shop', with: { vendor: 'counter' } }
jobs.open()            // { panel: 'jobs' }
jobs.open(['dogs'])    // { panel: 'jobs', with: { job: ['dogs'] } }
```

Any list of effects can hold one. The sections below put them in each kind of content the showcase has.

## From a place

A location's action runs effects, so put the effect on the action. It's only offered in that place.

```ts
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'

const cafe = places.location({
  id: 'cafe', name: 'The Corner Café', description: 'Café', exits: ['high-street'],
  body: [{ prose: 'place.cafe' }],
  actions: [{ id: 'counter', label: 'Go to the counter', effects: [shop.open('counter')] }],
})
```

A town hall's job board is the same, with `jobs.open()` in its action's effects.

## From a person

A choice in a person's scene runs effects directly. To close the scene and show the board over the room, do both in one choice. The panel stays open because this choice opened it.

```ts
import { jobs } from '@ifloom/plugin-jobs'

const avaHi = {
  id: 'ava.hi',
  speaker: 'ava',
  body: [{ prose: 'ava.hi' }],
  choices: [
    { id: 'work', effects: [{ scene: null }, jobs.open()] },   // "Ask about weekend work"
    { id: 'bye', effects: [{ scene: null }] },
  ],
}
```

## From a thing the player uses

With the [inventory plugin](/docs/reference/plugins/inventory), a thing's use runs effects too. Using one spends it unless it's kept, so give a newspaper `keep` to let the player read it again.

```ts
import type { EntityDef } from '@ifloom/engine'
import { inventory } from '@ifloom/plugin-inventory'
import { jobs } from '@ifloom/plugin-jobs'

const paper: EntityDef = {
  id: 'paper',
  of: 'item',
  name: 'newspaper',
  description: 'Today’s Small Town Gazette. The back page is job ads.',
  at: 'player',
  traits: { ...inventory.usable('Read the job ads', [jobs.open(['dogs'])], { keep: true }) },
}
```

## From a phone or a laptop

An app's actions section has buttons that run effects too. A vendor with a [`places.onlyAt()`](/docs/reference/plugins/shop#where-it-stands) entry won't sell anywhere else, even with its counter open, so leave that entry out of an online shop.

```ts
import type { AppDef } from '@ifloom/plugin-devices'
import { shop } from '@ifloom/plugin-shop'

// In the content's entities.
const webshop = shop.vendor({ id: 'webshop', name: 'Pinecone Online', goods: [{ entity: 'clothing:scarf', price: { coins: 10 } }] })
const app: AppDef = {
  id: 'pinecone', name: 'Pinecone', icon: 'basket', on: 'phone',
  sections: [{ actions: [{ id: 'browse', label: 'Browse the shop', effects: [shop.open('webshop')] }] }],
}
```

## How long it stays open

The player can buy several things or apply for a job with the panel open. It closes when they close it, when another panel replaces it, or when a later command ends a turn or changes the scene, such as a shift that takes the morning. See [How long a panel stays open](/docs/reference/panels#how-long-a-panel-stays-open).

## Drawing it

The shop's and the jobs' React UIs draw both panels for you, as a [`ShopCounter`](/docs/reference/plugins/shop#shopcounter) and a [`JobBoard`](/docs/reference/plugins/jobs#jobboard) in a dialog, when the game lists `shopUi` and `jobsUi` in [`plugins`](/docs/reference/react/kit#the-plugins-option). In Vue, Svelte or plain JS, the templates start with a panel that shows its name, and [Drawing it](/docs/reference/panels#drawing-it) shows how to draw it by name in each.

## Checking it

`npx ifloom check` reports an `shop.open` for a vendor the game doesn't have, and an `jobs.open` that lists a job it doesn't have, at the place the effect is written:

```text
town · locations cafe · action counter: unknown vendor "kiosk"
town · trait inventory/usable on item:paper · unknown job "circus"
```
