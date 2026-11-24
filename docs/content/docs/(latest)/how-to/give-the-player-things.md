---
title: "Give the player things to hold and use"
description: "Give the player things to hold, and let them use, drop and give those things away with the inventory plugin."
---
Use this for anything the player carries, such as a sandwich, a note under the door or the photos they take. A [thing](/docs/reference/glossary#thing) is an entity a [holder](/docs/reference/glossary#holder) holds, so the engine needs no plugin to keep it. Each plugin adds one thing the player can do with it:

| You want the player to | Add | The thing carries |
|---|---|---|
| Have things, count them and lose them in the story | Nothing. | No trait, because the engine's `entity` and `move` effects and `entity` condition do it. |
| Use, drop and give things away | The [inventory](/docs/reference/plugins/inventory) plugin. | `inventory/usable` for a use button, and nothing for drop and give. |
| Buy and sell things | The [shop](/docs/reference/plugins/shop) plugin. | `shop/sellable` for a price, or the price on the vendor's good. |
| Wear things in slots | The [wardrobe](/docs/reference/plugins/wardrobe) plugin. | `wardrobe/wearable` with its slot. |
| Find things at a location and pick them up | The [places](/docs/reference/plugins/places) plugin. | Nothing, because it's placed `at` a `location:<id>`. |

## Declare the things

Declare a kind for each sort of thing in `kinds`, and the things in `entities`, in `src/world/things.ts`. A thing's `at` says who holds it at the start:

```ts
import type { Content } from '@ifloom/engine'

export const things: Content = {
  kinds: [
    { id: 'item', label: 'Thing', plural: 'Things', listed: false },
    { id: 'keepsake', label: 'Keepsake', unique: true, listed: false },
  ],
  entities: [
    { id: 'paper', of: 'item', name: 'newspaper', description: 'Today’s Small Town Gazette. The back page is job ads.', at: 'player' },
    { id: 'sandwich', of: 'item', name: 'sandwich', description: 'Cheese and pickle, wrapped in paper.' },
    { id: 'shell', of: 'keepsake', name: 'A river shell', description: 'Smooth and grey, from the bank by Ava’s bench.' },
  ],
}
```

A kind that isn't `unique` stacks, so the player holds a count of sandwiches. A [`unique`](/docs/reference/entities#unique) kind's things are each one particular thing, held by one holder at most, and a unique entity can hold others. `listed: false` keeps the kind out of `view.entities`, the list of the world's entities. What the player holds is still in `view.held`.

## Give a thing in play

Give and take things with the engine's helpers, in any effect list. The café's sandwich is a plain action with a cost:

```ts
import { give, type ActionDef } from '@ifloom/engine'

export const buySandwich: ActionDef = { id: 'buy-sandwich', label: 'Buy a sandwich', cost: { stats: { coins: 4 } }, effects: [give('item:sandwich')] }
```

`give('item:sandwich', 2)` gives two, `take('item:sandwich')` takes one, and `move('keepsake:shell', 'character:ava')` hands a thing to someone. Ask about holdings with `holding('item:sandwich')`, which holds while whoever the player is playing holds one. [Make a choice that needs a thing](/docs/how-to/gate-a-choice-on-a-thing) gates a choice on it.

## Make things in play

Make a thing the story can't declare in advance, such as a photo the player takes, with the [`create`](/docs/reference/effects#create) effect:

```ts
import type { ActionDef } from '@ifloom/engine'

export const photoPier: ActionDef = {
  id: 'photo-pier',
  label: 'Take a photo of the pier',
  effects: [{ create: 'photo', with: { id: 'pier', name: 'The pier', description: 'Gulls, and the end of the pier.', image: 'photo/pier.jpg' }, at: 'player' }],
}
```

Declare the `photo` kind as any other. Count what the player has made with `{ count: { of: 'photo', at: 'player' }, gte: 3 }`. For a thing with state of its own, such as a cake that goes stale, make it `like` a declared thing, so it reads its name and traits from that one: `{ create: 'food', like: 'food:cake', with: { stats: { fresh: 3 } }, at: 'you' }`.

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
  at: 'player',
  traits: { ...inventory.usable('Read the job ads', [jobs.open(['dogs'])], { keep: true }) },
}
```

`{ keep: true }` spends none, so the player can read the paper again. Put the trait on a kind to make every thing of it usable. To show only some kinds in the inventory, such as leaving clothes to the wardrobe, list them in `data.inventory.kinds`: `{ inventory: { kinds: [{ id: 'item' }, { id: 'keepsake' }] } }`.

## Let the player drop and give things away

The inventory's view gives each thing a `drop` button that sends `inventory.drop(ref)`, which the React UI's [`InventoryCard`](/docs/reference/plugins/inventory#inventorycard) shows when you pass it `drop`. With places in the game, a dropped thing lies at the location the player is at, and the room lists it with a Pick up button. Without places, it's gone. Content can put a thing at a location from the start, with its `at`:

```ts
import type { EntityDef } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const parcel: EntityDef = { id: 'parcel', of: 'item', name: 'parcel', at: places.locationRef('hall') }
```

To give a thing to someone, offer `inventory.give(ref, to)` where it fits the story, such as a choice in their scene:

```ts
import { holding, type Choice } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'
import { inventory } from '@ifloom/plugin-inventory'

export const gift: Choice = { id: 'gift', label: 'Give her the shell', when: holding('keepsake:shell'), command: inventory.give('keepsake:shell', cast.character('ava')) }
```

The receiver must be a unique entity, such as a character or a vendor.

## Offer an action everywhere

An action in the content's own `actions` is offered on every screen with no scene open, after the location's and the plugins' own. Give it a `when` to show it only while it applies, and a `blocked` entry to grey it out with a reason:

```ts
import { holding, take, type ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const snack: ActionDef = {
  id: 'snack',
  label: 'Eat your sandwich',
  when: holding('item:sandwich'),
  blocked: [{ when: calendar.period('late'), reason: 'Too late to eat.' }],
  effects: [take('item:sandwich'), { stat: 'energy', by: 25 }],
}
```

A lock with `hide` that stops the action's command, or a `blocked` entry with `hide: true`, leaves its button off the screen.

## Give one thing a trait for each plugin

A thing can carry a trait for every plugin that reads it. Each plugin reads its own and ignores the others. This scarf lies in the park, can be worn, and sells for 8 coins:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
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
      at: places.locationRef('park'),
      traits: { ...wardrobe.wearable('neck'), ...shop.sellable({ coins: 8 }) },
    },
  ],
}
```

Take a plugin out of the game and its trait does nothing. Leave that plugin's `data` out too, because the loader reports data for a plugin the game doesn't have.

## Check it worked

Run `npm run check`. It reports a thing of a kind the game doesn't declare, an `at` that names a holder the game lacks, and a `give` to a holder that can't hold things. Then play in `npm run dev`: what the player holds is listed with its use button, and a dropped thing lies at the location with a Pick up button. To render them in a UI of your own, see [Render what the player holds](/docs/how-to/render/stats-and-things#render-what-the-player-holds) and [Render things to use and drop](/docs/how-to/render/things-plugins#render-things-to-use-and-drop).

In the showcase, Small Town, the things are in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts) and the river shell in `src/story/ava.ts`. For more, see:

- [Entities](/docs/reference/entities), with [`EntityDef`](/docs/reference/entities#entitydef), [give, take, move and holding](/docs/reference/entities#give-take-move-and-holding) and [`Holder` and `Placement`](/docs/reference/entities#holder-and-placement).
- [Inventory](/docs/reference/plugins/inventory), with the [`Usable`](/docs/reference/plugins/inventory#usable) trait.
- [Things and holders](/docs/explanation/entities-and-traits#things-and-holders) and [Traits give entities meaning](/docs/explanation/entities-and-traits#traits-give-entities-meaning).
