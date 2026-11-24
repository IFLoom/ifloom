---
title: "Inventory"
description: "The inventory plugin lets the player use, drop and give away the things they hold."
---
`@ifloom/plugin-inventory` lets the player use, drop and give away the [things](/docs/reference/glossary#thing) they hold. A thing with the `inventory/usable` trait gets a button, such as "Eat the sandwich", that runs its effects and spends one. The engine keeps who holds what (the `give`, `take` and `move` effects and `view.held`), so the plugin keeps nothing in the save. The inventory needs no other plugin, and it cooperates with [places](/docs/reference/plugins/places), which says where a dropped thing goes. [Entities, things and traits](/docs/explanation/entities-and-traits#things-and-holders) explains holding, [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Give the player things to hold and use](/docs/how-to/give-the-player-things) builds things with it.

In the showcase: `examples/showcase/src/world/things.ts`, where the sandwich and the flapjack restore energy and the newspaper opens the job board with only its ads, kept so the player can read it again.

```ts
import { inventory, usableOf, inventoryKindsOf, type Usable, type InventoryData, type InventoryThing, type InventoryView } from '@ifloom/plugin-inventory'
```

## inventory

The plugin's factory, which returns the plugin with the id `inventory`. It takes no options and keeps no state. Every field of its result is in [`inventory`](/docs/api/plugin-inventory#inventory), and its helpers are listed under [Functions](#functions).

The inventory, the [shop](/docs/reference/plugins/shop) and the [wardrobe](/docs/reference/plugins/wardrobe) never name each other. Each reads what the player holds from the engine and its own trait on each thing, so a game uses any of them alone or all three, and one thing can carry a trait for each. With all three, the player buys a scarf, wears it, and gives it back to the stall with `inventory.give('clothing:scarf', 'vendor:stall')`, which takes it off and returns it to the stall's stock.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { inventory } from '@ifloom/plugin-inventory'
import { places } from '@ifloom/plugin-places'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [places({ start: 'flat' }), inventory()] })
```

## Content

### InventoryData

The plugin's content, in `data.inventory`. Every field is in [`InventoryData`](/docs/api/plugin-inventory#inventorydata).

`kinds` lists the kinds whose things the view shows, each as an entry with the kind's id so a mod can add one. With `kinds` left out, the view shows things of every kind. A game that keeps clothes in the wardrobe shows only its `item` kind:

```ts
import type { Content } from '@ifloom/engine'

export const bag: Content = { data: { inventory: { kinds: [{ id: 'item' }] } } }
```

## Traits

### Usable

The data of the `inventory/usable` trait, which makes a thing usable. Every field is in [`Usable`](/docs/api/plugin-inventory#usable).

`label` is the use button's label. `effects` are any [effects](/docs/reference/effects), a plugin's included, and they read the state as it was before one was spent, as an action's effects read it before its cost. With `keep: true`, using the thing spends none, for a book read again or a torch switched on.

`inventory.usable(label, effects, { keep })` writes the trait, to spread into `traits` beside other plugins' traits. As a [trait](/docs/reference/glossary#trait), it goes on a kind as a default, on an entity, or in content's [`traits`](/docs/reference/content#traits) table, where a mod can change what a thing does. A thing made in play `like` a usable one is usable too.

```ts
import type { Content } from '@ifloom/engine'
import { inventory } from '@ifloom/plugin-inventory'
import { jobs } from '@ifloom/plugin-jobs'

export const things: Content = {
  stats: [{ id: 'energy', label: 'Energy', start: 50, max: 100 }],
  kinds: [{ id: 'item', label: 'Thing', plural: 'Things', listed: false }],
  entities: [
    { id: 'sandwich', of: 'item', name: 'sandwich', at: 'player', traits: { ...inventory.usable('Eat the sandwich', [{ stat: 'energy', by: 25 }]) } },
    { id: 'paper', of: 'item', name: 'newspaper', at: 'player', traits: { ...inventory.usable('Read the job ads', [jobs.open(['dogs'])], { keep: true }) } },
  ],
}
```

## Commands

Each command takes the thing from the protagonist being played while they hold one, and otherwise from the player, so what the player kept across a switch is still theirs to use. Each goes through [locks](/docs/reference/locks) like any command, so a lock with `deny: ['inventory/use']` stops eating during a scene where it would be rude. Each is a [plugin call](/docs/reference/custom#plugincall), and its [`effectsOf`](/docs/reference/plugin-api#effectsof) lists what it would do, so a [guard](/docs/reference/plugin-api#guard) sees the effects.

### inventory/use

Runs the thing's `inventory/usable` effects and, unless the trait has `keep`, takes one away. The plugin refuses it in this order:

1. With `There is no such thing.` ([`noSuchThing`](/docs/reference/strings#refusals)) when the thing isn't in the game.
2. With `You have no <name>.` (`inventory/haveNone`) when the player holds none.
3. With `The <name> does not do anything.` (`inventory/doesNothing`) when the thing has no `inventory/usable` trait.

```ts fragment
{ 'inventory/use': { id: 'item:sandwich' } } // inventory.use('item:sandwich')
```

### inventory/drop

Takes one away from the player. The plugin asks for the [`places/holder`](/docs/reference/plugins/places#queries) query, and when the answer is a holder that can hold things, it moves the thing there. Places answers with the location's entity, so the dropped thing lies at the location, listed in the places view with a [pick-up](/docs/reference/plugins/places#placespickup) button. Without places, or with the player nowhere, a dropped thing is gone. The plugin refuses it as it refuses `inventory/use`, for a thing not in the game or one the player doesn't hold.

```ts fragment
{ 'inventory/drop': { id: 'item:paper' } } // inventory.drop('item:paper')
```

### inventory/give

Moves one to `to`, a [holder](/docs/reference/glossary#holder) such as `'character:ava'`. Besides the two refusals `inventory/drop` has, the plugin refuses it with `You already have it.` (`inventory/giveToSelf`) when `to` is the player or the protagonist being played. It refuses it with `You can’t give things to <name>.` (`inventory/cantGiveTo`) when `to` can't hold things, such as an entity of a kind that isn't [`unique`](/docs/reference/entities#unique) or one not in the game. The game decides who the player can give to by where it offers the command, such as a choice in Ava's scene.

```ts
import { holding, type Choice } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'
import { inventory } from '@ifloom/plugin-inventory'

export const gift: Choice = { id: 'gift', label: 'Give her the scarf', when: holding('clothing:scarf'), command: inventory.give('clothing:scarf', cast.character('ava')) }
```

## View

### InventoryView

The things the player holds as the player sees them, in `view.plugins.inventory`. Every field is in [`InventoryView`](/docs/api/plugin-inventory#inventoryview).

`things` lists the protagonist's things while one is played, then the player's, each in the game's order of its entities. It leaves out things of a kind `data.inventory.kinds` doesn't list, and things whose [`visible`](/docs/reference/entities#entitydef) condition doesn't hold, as [`view.held`](/docs/reference/view#heldview) does. A thing both the protagonist and the player hold is listed once for each.

### InventoryThing

One thing the player holds, with its buttons, an entry of `things`. Every field is in [`InventoryThing`](/docs/api/plugin-inventory#inventorything).

`name` and `description` have their tokens filled, and `description` is `null` when the thing has none. `image` goes through [`artSrc`](/docs/reference/prose#artsrc). `count` is how many `at` holds. `use` is a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled by the trait, or `null` for a thing with no use. `drop` is a button labelled with the thing's name. Each button carries the engine's refusal in `disabled` when it can't be pressed now.

```ts fragment
{ things: [{ ref: 'item:sandwich', name: 'sandwich', description: 'Cheese and pickle.', image: null, count: 1, at: 'player', use: { label: 'Eat the sandwich', … }, drop: { label: 'sandwich', … } }] }
```

[Render things to use and drop](/docs/how-to/render/things-plugins#render-things-to-use-and-drop) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-inventory/react` subpath renders the inventory for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### inventoryUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It renders [`InventoryCard`](#inventorycard) wherever the React UI's own [`Inventory`](/docs/reference/react/components#inventory) goes, in the side column and the `inventory` panel. Its type is in [`inventoryUi`](/docs/api/plugin-inventory#inventoryui). Without it, `Inventory` renders `view.held` with no buttons.

### INVENTORY_WORDS

The words the inventory UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`INVENTORY_WORDS`](/docs/api/plugin-inventory#inventory_words). It holds one key, `ui.drop`, `Drop`.

### InventoryCard

Renders the things in `view.plugins.inventory`, each usable one with its use button, disabled with the engine's reason while it can't be used. It takes the props of the React UI's own `Inventory`, which are in [`InventoryCard`](/docs/api/plugin-inventory#inventorycard).

With `drop`, each thing also has a **Drop** button (`ui.drop`) that sends `inventory/drop`. Without the plugin, it renders `view.held`. A game replaces it as `InventoryCard` in [`components`](/docs/reference/react/components#components). Its parts are `inventory`, `inventory-title`, `thing` (with `data-thing`), `thing-name`, `thing-count`, `thing-text`, `thing-drop` and `choice`.

### useInventory

Returns the inventory view from the running game with a `use`, a `drop` and a `give` that send the plugin's commands, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useInventory`](/docs/api/plugin-inventory#useinventory).

### InventoryControls

The value `useInventory` returns, an [`InventoryView`](#inventoryview) with `use(ref)`, `drop(ref)` and `give(ref, to)`. Every field is in [`InventoryControls`](/docs/api/plugin-inventory#inventorycontrols). Each returns the runner's [`Result`](/docs/reference/common#result), so a refusal comes back with its reason.

::include[../../../../../snippets/react/use-inventory.tsx]

## Functions

The helpers are properties of `inventory` and write its trait and calls, typed:

- **`inventory.usable(label, effects, { keep }?)`** returns the [`inventory/usable`](#usable) trait, to spread into `traits`.
- **`inventory.use(ref)`**, **`inventory.drop(ref)`** and **`inventory.give(ref, to)`** return the [commands](#commands) as a [`CommandRef`](/docs/reference/custom#commandref).

### usableOf

Returns the thing's `inventory/usable` trait, read through the thing it was made `like`, or `undefined` for a thing with no use. Its signature is in [`usableOf`](/docs/api/plugin-inventory#usableof).

```ts given
import { usableOf } from '@ifloom/plugin-inventory'

usableOf(state, game, 'item:sandwich')?.label // 'Eat the sandwich'
```

### inventoryKindsOf

Returns the kinds in `data.inventory.kinds`, merged from the game's content and packs, or `undefined` when it lists none and the view shows every kind. Its signature is in [`inventoryKindsOf`](/docs/api/plugin-inventory#inventorykindsof).

## Checks

When the game loads, the checker reports problems with the trait on each usable thing, with `where` as `trait inventory/usable on <ref>`, and with the plugin's calls and content:

| Problem | Cause |
|---|---|
| `a usable thing needs a label for its button` | The trait's `label` is missing or empty. |
| `a usable thing needs its effects, a list` | The trait's `effects` isn't a list. |
| `unknown stat "focus"` | A usable thing's effects name something the game doesn't have. |
| `unknown entity "item:pear"` | A command names a thing the game doesn't have. |
| `"item:paper" can't hold itself` | An `inventory/give` names the thing as its own `to`. |
| `unknown kind "keepsake"` | An entry of `data.inventory.kinds` names a kind the game doesn't have. |

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings). `{thing}` is the thing's name, and `{to}` is the name of the holder given to. A thing the game doesn't have gets the engine's [`noSuchThing`](/docs/reference/strings#refusals).

| Key | Meaning |
|---|---|
| `inventory/haveNone` | `You have no {thing}.`, the refusal of a thing the player doesn't hold. |
| `inventory/doesNothing` | `The {thing} does not do anything.`, the refusal of [`inventory/use`](#inventoryuse) for a thing with no use. |
| `inventory/cantGiveTo` | `You can’t give things to {to}.`, the refusal of [`inventory/give`](#inventorygive) to something that can't hold things. |
| `inventory/giveToSelf` | `You already have it.`, the refusal of `inventory/give` to the player. |

## Caveats

- While a protagonist is played, a thing both they and the player hold is listed twice, and both buttons use the protagonist's first.
- A dropped thing in a game without places leaves the game's holdings for good. To keep a quest's key, give the player no drop button for it, and the React `InventoryCard` shows drop buttons only with `drop`.
- A game without the shop or the wardrobe leaves their `data` out, because the loader reports data for a plugin the game doesn't have.
