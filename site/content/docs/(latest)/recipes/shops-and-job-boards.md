---
title: "Opening a shop or a job board from anywhere"
description: "Open a vendor's counter or the job board from a place, a person, an item or an app, with openShop and openJobs."
---
A shop or a job board doesn't appear on its own just because the player is somewhere. Your content opens it, so it can sit wherever it makes sense in your town: a counter in the café, a job board at the town hall, the job ads in a newspaper, a shop on a phone.

You open one with the [`panel` effect](/docs/reference/effects#panel). The shop and jobs plugins write it for you:

```ts
import { openShop } from '@ifloom/plugin-shop'
import { openJobs } from '@ifloom/plugin-jobs'

openShop('counter')   // { kind: 'panel', panel: 'shop', with: { vendor: 'counter' } }
openJobs()            // { kind: 'panel', panel: 'jobs' }
openJobs(['dogs'])    // { kind: 'panel', panel: 'jobs', with: { job: ['dogs'] } }
```

Any list of effects can hold one. The sections below put them in each kind of content the showcase has.

## From a place

A location's action sends a command, so give the effect to an activity and point the action at it. `onlyAt` keeps the activity in the café, as the action is.

```ts
import { onlyAt, type LocationDef } from '@ifloom/plugin-places'
import { openShop } from '@ifloom/plugin-shop'

const activities = [{ id: 'counter', blocked: [onlyAt(['cafe'])], effects: [openShop('counter')] }]

const cafe: LocationDef = {
  id: 'cafe', name: 'The Corner Café', tag: 'Café', art: 'place/cafe', exits: ['high-street'],
  body: [{ text: 'place.cafe' }],
  actions: [{ id: 'counter', label: 'Go to the counter', command: { type: 'activity', id: 'counter' } }],
}
```

A town hall's job board is the same, with `openJobs()` in its activity.

## From a person

A choice in a person's scene runs effects directly. To close the scene and show the board over the room, do both in one choice. The panel stays open because this choice opened it.

```ts
import { openJobs } from '@ifloom/plugin-jobs'

const avaHi = {
  id: 'ava.hi',
  speaker: 'ava',
  body: [{ text: 'ava.hi' }],
  choices: [
    { id: 'work', effects: [{ kind: 'scene', scene: null }, openJobs()] },   // "Ask about weekend work"
    { id: 'bye', effects: [{ kind: 'scene', scene: null }] },
  ],
}
```

## From an item

An item's `use` runs effects too. Using an item spends one, so a newspaper is gone once read. Sell another at the counter if the player should be able to read it again.

```ts
import { openJobs } from '@ifloom/plugin-jobs'

const paper = {
  id: 'paper',
  name: 'newspaper',
  desc: 'Today’s Small Town Gazette. The back page is job ads.',
  use: { label: 'Read the job ads', effects: [openJobs(['dogs'])] },
}
```

## From a phone or a laptop

An app's actions section has buttons that send commands, so the button sends an activity that opens the panel. A vendor opened away from its `at` won't sell, so leave `at` out of an online shop.

```ts
import type { AppDef } from '@ifloom/plugin-devices'
import { openShop, type VendorDef } from '@ifloom/plugin-shop'

const webshop: VendorDef = { id: 'webshop', name: 'Pinecone Online', goods: [{ entity: 'clothing:scarf', price: { coins: 10 } }] }
const activities = [{ id: 'browse', effects: [openShop('webshop')] }]
const app: AppDef = {
  id: 'pinecone', name: 'Pinecone', icon: 'basket', on: 'phone',
  sections: [{ actions: [{ id: 'browse', label: 'Browse the shop', command: { type: 'activity', id: 'browse' } }] }],
}
```

## How long it stays open

The player can buy several things or apply for a job with the panel open. It closes when they close it, when another panel replaces it, or when a later command ends a turn or changes the scene, such as a shift that takes the morning. See [How long a panel stays open](/docs/reference/panels#how-long-a-panel-stays-open).

## Drawing it

The React UI draws both panels for you, as a [`ShopCounter`](/docs/react/components#shopcounter) and a [`JobBoard`](/docs/react/components#jobboard) in a dialog. In Vue, Svelte or plain JS, the templates start with a panel that shows its name, and [Drawing a panel](/docs/reference/panels#drawing-a-panel) shows how to draw it by name in each.

## Checking it

`npx ifloom check` reports an `openShop` for a vendor the game doesn't have, and an `openJobs` that lists a job it doesn't have, at the place the effect is written:

```text
town · activity counter · unknown vendor "kiosk"
town · item paper · unknown job "circus"
```
