---
title: "Inventory"
description: "The inventory plugin keeps the things the player and other people carry, and lets the player use, drop and give them away."
---
`@ifloom/plugin-inventory` keeps the [things](/docs/0.1.2/reference/glossary#thing) the player and other people carry, and lets the player use, drop and give them away. A thing with the `inventory/usable` trait gets a button, such as "Eat the sandwich", that runs its effects and spends one.

The plugin is an optional shortcut. A game in the Twine style keeps what the player has in [kv keys](/docs/0.1.2/reference/state#kv), such as `{ kv: 'hasKey', to: true }`, and reads them in conditions, as [Hand-roll an inventory with variables](/docs/0.1.2/how-to/hand-roll-an-inventory) shows. The inventory saves writing that for every thing: it keeps counts per person in its own state, lists them with use and drop buttons, and refuses what can't be done with a reason.

It needs no other plugin. It's a [receiver](/docs/0.1.2/reference/glossary#receiver): a [`receive`](/docs/0.1.2/reference/effects#receive) the game's other receivers don't claim gives the thing to someone's inventory, [`release`](/docs/0.1.2/reference/effects#release) takes it back, and [`owned`](/docs/0.1.2/reference/conditions#owned) counts it. With [places](/docs/0.1.2/reference/plugins/places), a dropped thing lies where the player is. [Add a plugin](/docs/0.1.2/how-to/add-a-plugin) installs it, and [Give the player things to hold and use](/docs/0.1.2/how-to/give-the-player-things) builds things with it.

In the showcase: `examples/showcase/src/world/things.ts`, where the sandwich and the flapjack restore energy and the newspaper opens the job board with only its ads, kept so the player can read it again.

```ts
import {
  inventory,
  usableOf,
  inventoryKindsOf,
  canHold,
  heldBy,
  heldCount,
  holderOf,
  holdersOf,
  type Usable,
  type Holder,
  type Placement,
  type InventoryData,
  type InventoryOptions,
  type InventoryState,
  type InventoryThing,
  type InventoryView,
} from '@ifloom/plugin-inventory'
```

## inventory

The plugin's factory, which returns the plugin with the id `inventory`. It takes [`InventoryOptions`](#inventoryoptions). Every field of its result is in [`inventory`](/docs/0.1.2/api/plugin-inventory#inventory), and its helpers are listed under [Functions](#functions).

The inventory claims every thing, so in a game with other receivers it goes last in the game's [`receivers`](/docs/0.1.2/reference/content#gamebase) order and takes what the others leave. With the [wardrobe](/docs/0.1.2/reference/plugins/wardrobe) listed first, `receivers: ['wardrobe', 'inventory']`, a bought shirt goes straight to the wardrobe and a bought sandwich to the inventory. Neither plugin names the other.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { inventory } from '@ifloom/plugin-inventory'
import { places } from '@ifloom/plugin-places'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [places({ start: 'flat' }), inventory()] })
```

### InventoryOptions

The plugin's settings. Every field is in [`InventoryOptions`](/docs/0.1.2/api/plugin-inventory#inventoryoptions).

`carryOver` lists the things a New Game+ keeps in the player's own inventory, by reference, or `'all'` for everything the player holds. A thing made in play is carried with its record. Nothing is carried if it's left out.

```ts fragment
inventory({ carryOver: ['item:lucky-coin'] })
```

### InventoryState

The plugin's state in the save, `held`: the counts play changed, by holder and then thing. A count written once is kept, 0 included, so a thing used up stays used up. Counts play hasn't changed are read from each thing's [`inventory/at`](#placement) trait, so a thing a later version of the game starts somewhere reaches an older save. Every field is in [`InventoryState`](/docs/0.1.2/api/plugin-inventory#inventorystate).

## Content

### InventoryData

The plugin's content, in `data.inventory`. Every field is in [`InventoryData`](/docs/0.1.2/api/plugin-inventory#inventorydata).

`kinds` lists the kinds whose things the view shows, each as an entry with the kind's id so a mod can add one. With `kinds` left out, the view shows things of every kind. A game that keeps clothes in the wardrobe shows only its `item` kind:

```ts
import type { Content } from '@ifloom/engine'

export const bag: Content = { data: { inventory: { kinds: [{ id: 'item' }] } } }
```

## Traits

### Holder

Someone who holds things: `'player'`, a unique entity such as `'character:ava'`, or `'you'`, whoever the player is playing now. Its type is in [`Holder`](/docs/0.1.2/api/plugin-inventory#holder).

### Placement

The data of the `inventory/at` trait, where a thing starts: one holder for one of it, or a count for each holder, such as `{ player: 2, 'place:larder': 6 }`. `inventory.at(placement)` writes the trait. A thing with no `inventory/at` starts held by nobody. Its type is in [`Placement`](/docs/0.1.2/api/plugin-inventory#placement).

### Usable

The data of the `inventory/usable` trait, which makes a thing usable. Every field is in [`Usable`](/docs/0.1.2/api/plugin-inventory#usable).

`label` is the use button's label. `effects` are any [effects](/docs/0.1.2/reference/effects), a plugin's included, and they read the state as it was before one was spent, as an action's effects read it before its cost. With `keep: true`, using the thing spends none, for a book read again or a torch switched on.

`inventory.usable(label, effects, { keep })` writes the trait, to spread into `traits` beside other plugins' traits. As a [trait](/docs/0.1.2/reference/glossary#trait), it goes on a kind as a default, on an entity, or in content's [`traits`](/docs/0.1.2/reference/content#traits) table, where a mod can change what a thing does. A thing made in play `like` a usable one is usable too.

```ts
import type { Content } from '@ifloom/engine'
import { inventory } from '@ifloom/plugin-inventory'
import { jobs } from '@ifloom/plugin-jobs'

export const things: Content = {
  stats: [{ id: 'energy', label: 'Energy', start: 50, max: 100 }],
  kinds: [{ id: 'item', label: 'Thing', plural: 'Things', listed: false }],
  entities: [
    { id: 'sandwich', of: 'item', name: 'sandwich', traits: { ...inventory.at('player'), ...inventory.usable('Eat the sandwich', [{ stat: 'energy', by: 25 }]) } },
    { id: 'paper', of: 'item', name: 'newspaper', traits: { ...inventory.at('player'), ...inventory.usable('Read the job ads', [jobs.open(['dogs'])], { keep: true }) } },
  ],
}
```

## Receiving

As a receiver, the inventory claims every thing:

- **`receive`** adds the count to `to`, or to the protagonist being played (the player when there's none) if `to` is left out. A unique thing goes to one holder and is taken from whoever had it.
- **`owned`** counts what `of` holds, or, left out, what the protagonist holds plus what the player holds, since what the household shares is the protagonist's to use.
- **`release`** takes from `from`, or, left out, from the protagonist first and then the player.

```ts fragment
{ receive: 'item:sandwich', by: 2 }                // two, to whoever is played
{ owned: 'item:sandwich', gte: 1 }                 // has one
{ release: 'item:sandwich', via: 'inventory' }     // from the inventory only
```

## Effects

Content uses `receive` and `release` to give and take things whichever plugin keeps them. These effects target the inventory by name:

### inventory/move

Moves `by` of the thing `entity` (all there is if left out) `from` one holder (`'you'` if left out) `to` another. It does nothing when `to` can't hold things or the thing would end up holding itself.

```ts fragment
{ 'inventory/move': { entity: 'item:scarf', to: 'character:ava' } } // inventory.move('item:scarf', 'character:ava')
```

### inventory/set

Sets how many of the thing `entity` a holder (`at`, `'you'` if left out) holds `to` a count, at least 0 and at most 1 for a unique thing.

```ts fragment
{ 'inventory/set': { entity: 'item:sandwich', to: 0 } } // inventory.set('item:sandwich', 0)
```

## Values

`inventory/count` is how many of a thing someone holds, `at` them (`'you'` if left out). Prose prints it as `{{inventory/count entity=item:sandwich}}`, and the [`value`](/docs/0.1.2/reference/conditions#value) condition reads it.

## Commands

Each command takes the thing from the protagonist being played while they hold one, and otherwise from the player, so what the player kept across a switch is still theirs to use. Each goes through [locks](/docs/0.1.2/reference/locks) like any command, so a lock with `deny: ['inventory/use']` stops eating during a scene where it would be rude. Each is a [plugin call](/docs/0.1.2/reference/custom#plugincall), and its [`effectsOf`](/docs/0.1.2/reference/plugin-api#effectsof) lists what it would do, so a [guard](/docs/0.1.2/reference/plugin-api#guard) sees the effects.

### inventory/use

Runs the thing's `inventory/usable` effects and, unless the trait has `keep`, takes one away. The plugin refuses it in this order:

1. With `There is no such thing.` ([`noSuchThing`](/docs/0.1.2/reference/strings#refusals)) when the thing isn't in the game.
2. With `You have no <name>.` (`inventory/haveNone`) when the player holds none.
3. With `The <name> does not do anything.` (`inventory/doesNothing`) when the thing has no `inventory/usable` trait.

```ts fragment
{ 'inventory/use': { id: 'item:sandwich' } } // inventory.use('item:sandwich')
```

### inventory/drop

Takes one away from the player, then runs [`places/put`](/docs/0.1.2/reference/plugins/places#placesput) for the thing, so with places it lies where the player is, listed in the places view with a [pick-up](/docs/0.1.2/reference/plugins/places#placespickup) button. Without places, or with the player nowhere, a dropped thing is gone. The plugin refuses it as it refuses `inventory/use`, for a thing not in the game or one the player doesn't hold.

```ts fragment
{ 'inventory/drop': { id: 'item:paper' } } // inventory.drop('item:paper')
```

### inventory/give

Moves one to `to`, someone such as `'character:ava'`. Besides the two refusals `inventory/drop` has, the plugin refuses it with `You already have it.` (`inventory/giveToSelf`) when `to` is the player or the protagonist being played. It refuses it with `You can’t give things to <name>.` (`inventory/cantGiveTo`) when `to` can't hold things, such as an entity of a kind that isn't [`unique`](/docs/0.1.2/reference/entities#unique) or one not in the game. The game decides who the player can give to by where it offers the command, such as a choice in Ava's scene.

```ts
import type { Choice } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'
import { inventory } from '@ifloom/plugin-inventory'

export const gift: Choice = { id: 'gift', label: 'Give her the scarf', when: { owned: 'clothing:scarf' }, command: inventory.give('clothing:scarf', cast.character('ava')) }
```

## View

### InventoryView

The things the player holds as the player sees them, in `view.plugins.inventory`. Every field is in [`InventoryView`](/docs/0.1.2/api/plugin-inventory#inventoryview).

`things` lists the protagonist's things while one is played, then the player's, each in the game's order of its entities. It leaves out things of a kind `data.inventory.kinds` doesn't list, and things whose [`visible`](/docs/0.1.2/reference/entities#entitydef) condition doesn't hold. A thing both the protagonist and the player hold is listed once for each.

### InventoryThing

One thing the player holds, with its buttons, an entry of `things`. Every field is in [`InventoryThing`](/docs/0.1.2/api/plugin-inventory#inventorything).

`name` and `description` have their tokens filled, and `description` is `null` when the thing has none. `image` goes through [`artSrc`](/docs/0.1.2/reference/prose#artsrc). `count` is how many `at` holds. `use` is a [`RenderedChoice`](/docs/0.1.2/reference/view#renderedchoice) labelled by the trait, or `null` for a thing with no use. `drop` is a button labelled with the thing's name. Each button carries the engine's refusal in `disabled` when it can't be pressed now.

```ts fragment
{ things: [{ ref: 'item:sandwich', name: 'sandwich', description: 'Cheese and pickle.', image: null, count: 1, at: 'player', use: { label: 'Eat the sandwich', … }, drop: { label: 'sandwich', … } }] }
```

[Render things to use and drop](/docs/0.1.2/how-to/render/things-plugins#render-things-to-use-and-drop) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-inventory/react` subpath renders the inventory for a game that uses [`@ifloom/react`](/docs/0.1.2/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) adds it to a game.

### inventoryUi

The plugin's [`PluginUi`](/docs/0.1.2/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It adds [`InventorySection`](#inventorysection) to the sidebar and an `inventory` panel that renders [`InventoryCard`](#inventorycard). Its type is in [`inventoryUi`](/docs/0.1.2/api/plugin-inventory#inventoryui). Without it, the React UI shows nothing of what the player holds.

### INVENTORY_WORDS

The words the inventory UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`INVENTORY_WORDS`](/docs/0.1.2/api/plugin-inventory#inventory_words).

| Key | Meaning |
|---|---|
| `inventory` | `Carrying`, the heading and the section's title. |
| `heldCount` | `×{n}`, the count beside a thing held more than once. |
| `drop` | `Drop`, the drop button. |

### InventoryProps

The props of `InventoryCard`. `className` adds classes to the `inventory` part, `title` replaces the heading or leaves it out as `false`, and `drop` gives each thing a **Drop** button. Every field is in [`InventoryProps`](/docs/0.1.2/api/plugin-inventory#inventoryprops).

### InventoryCard

Renders the things in `view.plugins.inventory`, each usable one with its use button, disabled with the engine's reason while it can't be used. It renders nothing while nothing is held, or in a game without the plugin. Its props are [`InventoryProps`](#inventoryprops), and its type is in [`InventoryCard`](/docs/0.1.2/api/plugin-inventory#inventorycard).

With `drop`, each thing also has a **Drop** button (`ui.drop`) that sends `inventory/drop`. A game replaces it as `InventoryCard` in [`components`](/docs/0.1.2/reference/react/components#components). Its parts are `inventory`, `inventory-title`, `thing` (with `data-thing` and `data-at`), `thing-name`, `thing-count`, `thing-text`, `thing-drop` and `choice`.

### InventorySection

Renders `InventoryCard` in a folding sidebar section with the id `inventory`, titled with the `inventory` word. It hides itself while nothing is held. Its type is in [`InventorySection`](/docs/0.1.2/api/plugin-inventory#inventorysection).

### useInventory

Returns the inventory view from the running game with a `use`, a `drop` and a `give` that send the plugin's commands, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useInventory`](/docs/0.1.2/api/plugin-inventory#useinventory).

### InventoryControls

The value `useInventory` returns, an [`InventoryView`](#inventoryview) with `use(ref)`, `drop(ref)` and `give(ref, to)`. Every field is in [`InventoryControls`](/docs/0.1.2/api/plugin-inventory#inventorycontrols). Each returns the runner's [`Result`](/docs/0.1.2/reference/common#result), so a refusal comes back with its reason.

```tsx
import { useInventory } from '@ifloom/plugin-inventory/react'

export function Snacks() {
  const bag = useInventory()
  if (!bag) return null
  const food = bag.things.filter((thing) => thing.ref.startsWith('item:') && thing.use)
  return food.map((thing) => (
    <button key={thing.ref} onClick={() => bag.use(thing.ref)}>
      {thing.use?.label}
    </button>
  ))
}
```

## Functions

The helpers are properties of `inventory` and write its traits and calls, typed:

- **`inventory.at(placement)`** returns the [`inventory/at`](#placement) trait, to spread into `traits`.
- **`inventory.usable(label, effects, { keep }?)`** returns the [`inventory/usable`](#usable) trait.
- **`inventory.move(entity, to, { from, by }?)`** and **`inventory.set(entity, to, holder?)`** return the [effects](#effects).
- **`inventory.use(ref)`**, **`inventory.drop(ref)`** and **`inventory.give(ref, to)`** return the [commands](#commands) as a [`CommandRef`](/docs/0.1.2/reference/custom#commandref).

### heldCount

Returns how many of a thing a holder holds in the inventory, `'you'` if left out, or 0 for a thing not held there or not in the game. Its signature is in [`heldCount`](/docs/0.1.2/api/plugin-inventory#heldcount).

```ts given
import { heldCount } from '@ifloom/plugin-inventory'

heldCount(state, game, 'item:sandwich', 'player') // 1
```

### heldBy

Returns the things a holder holds, `'you'` if left out, each with its count, in the game's order of its entities. Its signature is in [`heldBy`](/docs/0.1.2/api/plugin-inventory#heldby).

### holdersOf

Returns each holder of a thing with its count, in no set order. Its signature is in [`holdersOf`](/docs/0.1.2/api/plugin-inventory#holdersof).

### holderOf

Returns the holder of a thing when one holder has it, as always for a unique thing, or `undefined` when no one holds it. Its signature is in [`holderOf`](/docs/0.1.2/api/plugin-inventory#holderof).

### canHold

Returns true when someone can hold things now: the player always can, and a unique entity can while it's in the game. Its signature is in [`canHold`](/docs/0.1.2/api/plugin-inventory#canhold).

### usableOf

Returns the thing's `inventory/usable` trait, read through the thing it was made `like`, or `undefined` for a thing with no use. Its signature is in [`usableOf`](/docs/0.1.2/api/plugin-inventory#usableof).

```ts given
import { usableOf } from '@ifloom/plugin-inventory'

usableOf(state, game, 'item:sandwich')?.label // 'Eat the sandwich'
```

### inventoryKindsOf

Returns the kinds in `data.inventory.kinds`, merged from the game's content and packs, or `undefined` when it lists none and the view shows every kind. Its signature is in [`inventoryKindsOf`](/docs/0.1.2/api/plugin-inventory#inventorykindsof).

## Checks

When the game loads, the checker reports problems with the traits on each thing, with `where` as `trait <id> on <ref>`, and with the plugin's calls and content:

| Problem | Cause |
|---|---|
| `a usable thing needs a label for its button` | The `inventory/usable` trait's `label` is missing or empty. |
| `a usable thing needs its effects, a list` | The trait's `effects` isn't a list. |
| `unknown stat "focus"` | A usable thing's effects name something the game doesn't have. |
| `inventory/at can't be "you" where a thing starts: …` | An `inventory/at` names `'you'`, who is nobody until play starts. |
| `inventory/at names the entity itself: nothing can hold itself` | A thing starts held by itself. |
| `inventory/at gives "…" 2.5: a count is a whole number above 0` | A start count isn't a whole number above 0. |
| `unknown someone "pal": …`, `"…" isn't someone: its kind "food" isn't unique` | A holder isn't the player or a unique entity. |
| `a unique thing starts in one place, one of it` | A unique thing starts with more than one holder, or more than one of it. |
| `holders go round in a cycle: … → …` | Unique things start inside each other. |
| `unknown entity "item:pear"` | A call names a thing the game doesn't have. |
| `"item:paper" can't hold itself` | An `inventory/give` or `inventory/move` names the thing as its own `to`. |
| `unknown kind "keepsake"` | An entry of `data.inventory.kinds` names a kind the game doesn't have. |

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/0.1.2/reference/strings#stringkey-and-strings). `{thing}` is the thing's name, and `{to}` is the name of whoever it's given to. A thing the game doesn't have gets the engine's [`noSuchThing`](/docs/0.1.2/reference/strings#refusals).

| Key | Meaning |
|---|---|
| `inventory/haveNone` | `You have no {thing}.`, the refusal of a thing the player doesn't hold. |
| `inventory/doesNothing` | `The {thing} does not do anything.`, the refusal of [`inventory/use`](#inventoryuse) for a thing with no use. |
| `inventory/cantGiveTo` | `You can’t give things to {to}.`, the refusal of [`inventory/give`](#inventorygive) to someone who can't hold things. |
| `inventory/giveToSelf` | `You already have it.`, the refusal of `inventory/give` to the player. |

## Caveats

- While a protagonist is played, a thing both they and the player hold is listed twice, and both buttons use the protagonist's first.
- A dropped thing in a game without places leaves the inventory for good. To keep a quest's key, give the player no drop button for it, and the React `InventoryCard` shows drop buttons only with `drop`.
- The inventory forgets a thing that's removed from the game, and what a removed holder held.
- A game without the shop or the wardrobe leaves their `data` out, because the loader reports data for a plugin the game doesn't have.
