---
title: "Hand-roll an inventory with variables"
description: "Keep what the player has in kv keys, as a Twine or SugarCube story does, and read them in conditions and scenes with no plugin."
---
Use this when the story only needs to know what the player has, such as a key for the shed, a coffee machine in the kitchen or three coffees from the café. The engine keeps no inventory of its own, so a thing the player has can be a [kv key](/docs/reference/glossary#kv): an effect sets it, a condition reads it, and a scene says so. It's how a Twine or SugarCube story does it, and it needs no plugin.

## Give the player something

Set a key in the effects of whatever gives it, such as a choice, an action or a trigger. Use `true` for a thing they either have or don't, and a number for a thing they can have several of:

```ts
import type { DataScene } from '@ifloom/engine'

export const shed: DataScene = {
  id: 'shed',
  title: 'The shed',
  body: [{ text: 'A key hangs on a nail by the door.' }],
  choices: [
    { id: 'take', label: 'Take the key', when: { not: { kv: 'hasShedKey' } }, effects: [{ kv: 'hasShedKey', to: true }] },
    { id: 'leave', label: 'Leave', effects: [{ scene: null }] },
  ],
}
```

A key nobody has set reads as 0, so a new game needs no line for it. A thing the player starts with goes in the content's starting `kv`, such as `kv: { hasUmbrella: true }`.

## Buy something with a stat

Spend a [stat](/docs/reference/stats) in the action's `cost` and count the purchase in a key. The café sells coffee, and the hardware shop a coffee machine that goes straight to the kitchen, since nothing has to be carried:

```ts
import type { ActionDef } from '@ifloom/engine'

export const buyCoffee: ActionDef = {
  id: 'coffee',
  label: 'Buy a coffee',
  cost: { stats: { coins: 3 } },
  effects: [{ kv: 'coffees', by: 1 }],
}

export const buyMachine: ActionDef = {
  id: 'machine',
  label: 'Buy the coffee machine',
  cost: { stats: { coins: 80 } },
  when: { not: { kv: 'kitchen.coffeeMachine' } },
  effects: [{ kv: 'kitchen.coffeeMachine', to: true }],
}
```

`when` takes the machine off the shelf once it's bought, so it sells once.

## Gate a choice and use the thing up

Read the key in a choice's `when`, or in a `blocked` entry to grey the choice out with a reason. Change the key in its effects to use the thing up:

```ts
import { need, type Choice } from '@ifloom/engine'

export const unlock: Choice = {
  id: 'unlock',
  label: 'Unlock the shed',
  blocked: [need('It’s locked.', { kv: 'hasShedKey' })],
  effects: [{ kv: 'shedOpen', to: true }, { scene: 'shed' }],
}

export const drink: Choice = {
  id: 'drink',
  label: 'Drink a coffee',
  when: { kv: 'coffees', gte: 1 },
  effects: [{ kv: 'coffees', by: -1 }, { stat: 'energy', by: 10 }],
}
```

## Let the scene say what they have

Give a block of text a `when`, so it shows only while the player has the thing, and print a count with a [token](/docs/reference/prose#tokens):

```ts
import type { DataScene } from '@ifloom/engine'

export const kitchen: DataScene = {
  id: 'kitchen',
  title: 'Your kitchen',
  body: [
    { text: 'A kettle, a sink, a window over the yard.' },
    { text: 'The new coffee machine gleams on the counter.', when: { kv: 'kitchen.coffeeMachine' } },
    { text: 'You have {{coffees}} coffees from the café.', when: { kv: 'coffees', gte: 1 } },
  ],
  choices: [{ id: 'out', label: 'Go out', effects: [{ scene: null }] }],
}
```

A list the player can open, such as a bag, is a scene of its own with one line per thing, each with its `when`, and an action that opens it with `{ scene: 'bag' }`.

## When to reach for a plugin

The keys are the base, and the plugins are shortcuts on top. Add one when the game needs what keys make you write by hand:

- **The [inventory](/docs/reference/plugins/inventory)** lists what the player carries with a use and a drop button on each, lets them give things to people, and keeps one particular thing in one place.
- **The [wardrobe](/docs/reference/plugins/wardrobe)** keeps clothes in slots and what each person has on.
- **The [shop](/docs/reference/plugins/shop)** keeps stock and prices. Its goods can still set keys, so a coffee machine bought there can set `kitchen.coffeeMachine` and go nowhere.

With a plugin, a thing is an entity, given with [`receive`](/docs/reference/effects#receive) and asked about with [`owned`](/docs/reference/conditions#owned), as [Give the player things to hold and use](/docs/how-to/give-the-player-things) shows. The two mix in one game.

## Check it worked

Run `npm run check`. It reports a scene, a stat or a token that names nothing. Then play in `npm run dev`: take the key and the Unlock choice opens, buy a coffee and the kitchen counts it. To carry what the player had into a second run, list the keys in [`carryOver`](/docs/how-to/offer-new-game-plus).

For more, see:

- [The kv store](/docs/reference/state#kv), the [`kv` condition](/docs/reference/conditions#kv) and the [`kv` effect](/docs/reference/effects#kv).
- [Twine phrasebook](/docs/reference/twine-phrasebook#inventory-and-things), for SugarCube's `$inventory`.
- [Who has what](/docs/explanation/entities-and-traits#who-has-what).
