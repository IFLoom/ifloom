---
title: "Things: carrying, selling, wearing"
description: "Which plugin does what with the things a player holds: the inventory, the shop, the wardrobe and places, alone or together, all on the same entities."
---
A thing in IFLoom is an [entity](/docs/reference/entities) that someone [holds](/docs/reference/entities#holding-things): a sandwich in your bag, a scarf on a stall, a parcel in the hall. The engine keeps who holds what. Each plugin reads one [trait](/docs/reference/entities#traits) on a thing and ignores the others, so you add only the plugins your game needs.

| You want the player to | Add | The thing carries |
|---|---|---|
| Have things, count them and lose them in the story | nothing | no trait: the `entity` and `move` effects and `{ entity, at }` are the engine's |
| Use, drop and give things away | [inventory](/docs/reference/plugins/inventory) | `inventory/usable` for a use button (drop and give need no trait) |
| Buy and sell things | [shop](/docs/reference/plugins/shop) | `shop/sellable` for a price, or the good's own `price` |
| Wear things in slots | [wardrobe](/docs/reference/plugins/wardrobe) | `wardrobe/wearable` with its slot |
| Find things in rooms and pick them up | [places](/docs/reference/plugins/places) | nothing: put it `at` a `location:<id>` |

Without any of them, the React UI's [`Inventory`](/docs/react/components#inventory) still lists what you hold from [`view.held`](/docs/reference/view#held).

## One thing, every plugin

A scarf that lies in the park, can be worn, and is worth 8 coins at the market stall:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'
import { wardrobe } from '@ifloom/plugin-wardrobe'

const scarf: Content = {
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

In a game with places, the park lists the scarf with a **Pick up** button. With the wardrobe, the player can then wear it. With the shop, a vendor that lists `{ entity: 'clothing:scarf' }` among its goods buys it back at its `buysBack` share of 8 coins. With the inventory, the player can drop it somewhere else, where it lies until they come back for it.

Take a plugin out and its part goes with it. Its trait stays on the scarf and does nothing, and the loader reports `data` for a plugin the game doesn't have, so leave that plugin's `data` out too.

## Places, people and vendors are entities too

The park the scarf lies in, the person who sells it and the stall are entities as well, each with its plugin's trait. You write them in the same `entities` list, each with its plugin's helper, which puts the entity's own fields (name, `description`, `image`) on the entity and the rest in the trait:

```ts
import type { Content } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'

const market: Content = {
  entities: [
    places.location({ id: 'park', name: 'Riverside Park', description: 'Small Town', exits: ['high-street'], body: [{ prose: 'place.park' }] }),
    cast.person({ id: 'ava', name: 'Ava', description: 'Runs the café', home: 'park' }),
    shop.vendor({ id: 'stall', name: 'The market stall', blocked: [places.onlyAt(['park'], undefined, { hide: true })], buysBack: 0.5, goods: [{ entity: 'clothing:scarf', stock: 1 }] }),
  ],
}
```

So a mod changes any of them the same way: it replaces the entity by its reference, `location:park`, or gives a [`traits`](/docs/reference/entities#traits) row to change only what the plugin reads. Any entity can carry one of these traits, so a person can keep a stall too: give `shop.vendor()` an `of: 'character'`, and the shop's commands name it as `'character:ava'`. Each plugin brings its kind (`location`, `character`, `vendor`), so leave out the entities of a plugin the game doesn't have.

## Three setups

- **The shop alone.** Vendors sell things the player then holds, and the React UI's `Inventory` shows them. Nothing is used or worn. See [Writing vendors](/docs/reference/plugins/shop#writing-vendors).
- **The wardrobe alone.** Clothes the player starts with or is given in the story, put on and taken off. See [Writing clothes](/docs/reference/plugins/wardrobe#writing-clothes).
- **All together.** A stall that sells a scarf and a pie, a scarf to wear and a pie to eat, and the scarf given back to the stall. See [With the shop and the wardrobe](/docs/reference/plugins/inventory#with-the-shop-and-the-wardrobe).

## Dropping and picking up

The inventory's drop asks places where the player is, through the `places/holder` query, and puts the thing down there. Neither plugin needs the other: with only places, things that content puts in rooms can be picked up but not dropped, and with only the inventory, a dropped thing is gone. See [Dropping and giving](/docs/reference/plugins/inventory#dropping-and-giving) and [Things lying in a place](/docs/reference/plugins/places#things-lying-in-a-place).

## See it in an example

The [showcase](/docs/guide/showcase#things-you-use) has all four: a sandwich to buy and eat, a raincoat and scarf to wear, a newspaper to drop in the flat and pick up again, and a shell to give to Ava.
