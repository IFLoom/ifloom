---
title: "Give the player things to hold and use"
description: "Give the player things with the inventory plugin, and let them use, drop and give those things away."
---
Use this for anything the player carries with the [inventory](/docs/0.1.2/reference/plugins/inventory) plugin, such as a sandwich, a note under the door or the photos they take. A [thing](/docs/0.1.2/reference/glossary#thing) is an entity, and the engine keeps no record of who has it: a plugin that keeps things, a [receiver](/docs/0.1.2/reference/glossary#receiver), does. A game that only needs to know whether the player has something can skip the plugins and [hand-roll an inventory with variables](/docs/0.1.2/how-to/hand-roll-an-inventory) instead.

Each plugin adds one thing the player can do with a thing:

| You want the player to | Add | The thing carries |
|---|---|---|
| Know they have something, in a scene or a choice | Nothing, or any plugin below. | Nothing: a [kv key](/docs/0.1.2/how-to/hand-roll-an-inventory) does it with no plugin. |
| Carry things, use, drop and give them away | The [inventory](/docs/0.1.2/reference/plugins/inventory) plugin. | `inventory/at` to start with it, `inventory/usable` for a use button. |
| Buy and sell things | The [shop](/docs/0.1.2/reference/plugins/shop) plugin. | `shop/sellable` for a price, or the price on the vendor's good. |
| Wear things in slots | The [wardrobe](/docs/0.1.2/reference/plugins/wardrobe) plugin. | `wardrobe/wearable` with its slot. |
| Find things at a location and pick them up | The [places](/docs/0.1.2/reference/plugins/places) plugin. | `places/lies` with the location. |

## Declare the things

Add the inventory to the game's `plugins`, then declare a kind for each sort of thing in `kinds`, and the things in `entities`, in `src/world/things.ts`. A thing's `inventory/at` trait says who carries it at the start:

```ts
import type { Content } from '@ifloom/engine'
import { inventory } from '@ifloom/plugin-inventory'

export const things: Content = {
  kinds: [
    { id: 'item', label: 'Thing', plural: 'Things', listed: false },
    { id: 'keepsake', label: 'Keepsake', unique: true, listed: false },
  ],
  entities: [
    { id: 'paper', of: 'item', name: 'newspaper', description: 'Today’s Small Town Gazette. The back page is job ads.', traits: { ...inventory.at('player') } },
    { id: 'sandwich', of: 'item', name: 'sandwich', description: 'Cheese and pickle, wrapped in paper.' },
    { id: 'shell', of: 'keepsake', name: 'A river shell', description: 'Smooth and grey, from the bank by Ava’s bench.' },
  ],
}
```

A kind that isn't `unique` stacks, so the player carries a count of sandwiches. A [`unique`](/docs/0.1.2/reference/entities#unique) kind's things are each one particular thing, which the inventory keeps with one holder at most. `listed: false` keeps the kind out of `view.entities`, the list of the world's entities. What the player carries is still in the inventory's view.

## Give a thing in play

Give and take things with the [`receive`](/docs/0.1.2/reference/effects#receive) and [`release`](/docs/0.1.2/reference/effects#release) effects, in any effect list. They name no plugin, so the same content works whichever plugin keeps the thing. The café's sandwich is a plain action with a cost:

```ts
import type { ActionDef } from '@ifloom/engine'

export const buySandwich: ActionDef = { id: 'buy-sandwich', label: 'Buy a sandwich', cost: { stats: { coins: 4 } }, effects: [{ receive: 'item:sandwich' }] }
```

`{ receive: 'item:sandwich', by: 2 }` gives two, `{ release: 'item:sandwich' }` takes one, and the inventory's `inventory.move('keepsake:shell', 'character:ava')` hands a thing to someone. Ask whether the player has one with [`{ owned: 'item:sandwich' }`](/docs/0.1.2/reference/conditions#owned), which counts what whoever the player is playing has. [Make a choice that needs a thing](/docs/0.1.2/how-to/gate-a-choice-on-a-thing) gates a choice on it.

With a wardrobe in the game too, list the order the plugins take things in the base's [`receivers`](/docs/0.1.2/reference/content#gamebase), such as `receivers: ['wardrobe', 'inventory']`. A bought shirt then goes straight to the wardrobe, and the sandwich falls through to the inventory.

## Make things in play

Make a thing the story can't declare in advance, such as a photo the player takes, with the [`create`](/docs/0.1.2/reference/effects#create) effect. Its `effects` run once it's made, with `'$'` as the new thing:

```ts
import type { ActionDef } from '@ifloom/engine'

export const photoPier: ActionDef = {
  id: 'photo-pier',
  label: 'Take a photo of the pier',
  effects: [{ create: 'photo', with: { id: 'pier', name: 'The pier', description: 'Gulls, and the end of the pier.', image: 'photo/pier.jpg' }, effects: [{ receive: '$' }] }],
}
```

Declare the `photo` kind as any other. Count the photos the player has with `{ count: { of: 'photo', where: { owned: '$' } }, gte: 3 }`. For a thing with state of its own, such as a cake that goes stale, make it `like` a declared thing, so it reads its name and traits from that one: `{ create: 'food', like: 'food:cake', with: { stats: { fresh: 3 } }, effects: [{ receive: '$' }] }`.

## Make a thing usable

Give the thing the `inventory/usable` trait with `inventory.usable(label, effects)`. The inventory then offers a button with that label, which runs the effects and spends one:

```ts
import type { EntityDef } from '@ifloom/engine'
import { inventory } from '@ifloom/plugin-inventory'
import { jobs } from '@ifloom/plugin-jobs'

export const sandwich: EntityDef = {
  id: 'sandwich',
  of: 'item',
  name: 'sandwich',
  traits: { ...inventory.usable('Eat the sandwich', [{ stat: 'energy', by: 25 }]) },
}

export const paper: EntityDef = {
  id: 'paper',
  of: 'item',
  name: 'newspaper',
  traits: { ...inventory.at('player'), ...inventory.usable('Read the job ads', [jobs.open(['dogs'])], { keep: true }) },
}
```

`{ keep: true }` spends none, so the player can read the paper again. Put the trait on a kind to make every thing of it usable. To show only some kinds in the inventory, such as leaving clothes to the wardrobe, list them in `data.inventory.kinds`: `{ inventory: { kinds: [{ id: 'item' }, { id: 'keepsake' }] } }`.

## Let the player drop and give things away

The inventory's view gives each thing a `drop` button that sends `inventory.drop(ref)`, which the React UI's [`InventoryCard`](/docs/0.1.2/reference/plugins/inventory#inventorycard) shows when you pass it `drop`. With places in the game, a dropped thing lies at the location the player is at, and the room lists it with a Pick up button. Without places, it's gone. Content can put a thing at a location from the start, with the places plugin's `places/lies` trait:

```ts fragment
{ id: 'parcel', of: 'item', name: 'parcel', traits: { 'places/lies': 'hall' } }
```

To give a thing to someone, offer `inventory.give(ref, to)` where it fits the story, such as a choice in their scene:

```ts
import type { Choice } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'
import { inventory } from '@ifloom/plugin-inventory'

export const gift: Choice = { id: 'gift', label: 'Give her the shell', when: { owned: 'keepsake:shell' }, command: inventory.give('keepsake:shell', cast.character('ava')) }
```

The one given to must be a unique entity, such as a character or a vendor.

## Offer an action everywhere

An action in the content's own `actions` is offered on every screen with no scene open, after the location's and the plugins' own. Give it a `when` to show it only while it applies, and a `blocked` entry to grey it out with a reason:

```ts
import type { ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const snack: ActionDef = {
  id: 'snack',
  label: 'Eat your sandwich',
  when: { owned: 'item:sandwich' },
  blocked: [{ when: calendar.period('late'), reason: 'Too late to eat.' }],
  effects: [{ release: 'item:sandwich' }, { stat: 'energy', by: 25 }],
}
```

A lock with `hide` that stops the action's command, or a `blocked` entry with `hide: true`, leaves its button off the screen.

## Give one thing a trait for each plugin

A thing can carry a trait for every plugin that reads it. Each plugin reads its own and ignores the others. This scarf lies in the park, can be worn, and sells for 8 coins:

```ts
import type { Content } from '@ifloom/engine'
import { shop } from '@ifloom/plugin-shop'
import { wardrobe } from '@ifloom/plugin-wardrobe'

export const scarf: Content = {
  kinds: [{ id: 'clothing', label: 'Clothing', unique: true, listed: false }],
  entities: [
    {
      id: 'scarf',
      of: 'clothing',
      name: 'scarf',
      description: 'Knitted, with a dropped stitch near one end.',
      traits: { 'places/lies': 'park', ...wardrobe.wearable('neck'), ...shop.sellable({ coins: 8 }) },
    },
  ],
}
```

Take a plugin out of the game and its trait does nothing. Leave that plugin's `data` out too, because the loader reports data for a plugin the game doesn't have.

## Check it worked

Run `npm run check`. It reports a thing of a kind the game doesn't declare, someone in `inventory/at` or a `receive`'s `to` who can't have things, and a `receive`, `release` or `owned` in a game with no plugin that keeps things. Then play in `npm run dev`: what the player carries is listed with its use button, and a dropped thing lies at the location with a Pick up button. To render them in a UI of your own, see [Render what the player holds](/docs/0.1.2/how-to/render/stats-and-things#render-what-the-player-holds) and [Render things to use and drop](/docs/0.1.2/how-to/render/things-plugins#render-things-to-use-and-drop).

In the showcase, Small Town, the things are in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts) and the river shell in `src/story/ava.ts`. For more, see:

- [Entities](/docs/0.1.2/reference/entities), with [`EntityDef`](/docs/0.1.2/reference/entities#entitydef) and [Receivers](/docs/0.1.2/reference/entities#receivers).
- [Inventory](/docs/0.1.2/reference/plugins/inventory), with the [`Usable`](/docs/0.1.2/reference/plugins/inventory#usable) trait.
- [Who has what](/docs/0.1.2/explanation/entities-and-traits#who-has-what) and [Traits give entities meaning](/docs/0.1.2/explanation/entities-and-traits#traits-give-entities-meaning).
