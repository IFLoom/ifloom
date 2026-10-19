---
title: "Inventory"
description: "Using, dropping and giving away the things you hold: a usable trait with a label and effects, and buttons for each thing in the view."
---
`@ifloom/plugin-inventory` lets the player do things with what they hold. A thing with the `inventory/usable` trait gets a button, such as "Eat the sandwich", that runs its effects and spends one. The plugin also drops things and gives them to someone who can hold them, such as a character.

What you hold is the engine's: things are [entities](/docs/reference/entities), and [`give`](/docs/reference/entities#give-take-move-and-holding), `take` and `move` change who [holds](/docs/reference/entities#holding-things) them. [`view.held`](/docs/reference/view#held) lists them without this plugin. Add it when holding things isn't enough and the player should use them.

```ts
import {
  inventory, usable, useThing, dropThing, giveThing,
  usableOf, inventoryData, inventoryView,
  type Usable, type InventoryData, type InventoryThing, type InventoryView,
} from '@ifloom/plugin-inventory'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-inventory": "^0.0.0"
  }
}
```

Then add `inventory()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

It needs no other plugin. It cooperates with [places](/docs/plugins/places) for where a dropped thing goes (see [Dropping and giving](#dropping-and-giving)).

## inventory

```ts
function inventory(): DefinedPlugin<null, InventoryView>
```

Builds the plugin, with the id `inventory`. It takes no options and keeps nothing in the save: what you hold is the engine's, and what a thing does is its trait.

## Making things usable

Give a thing the `inventory/usable` trait. `usable` writes it, to spread into an entity's or a kind's `traits`:

```ts
import type { Content } from '@ifloom/engine'
import { openJobs } from '@ifloom/plugin-jobs'
import { usable } from '@ifloom/plugin-inventory'

const things: Content = {
  stats: [{ id: 'energy', label: 'Energy', start: 50, max: 100 }],
  kinds: [{ id: 'item', label: 'Thing', plural: 'Things', listed: false }],
  entities: [
    { id: 'sandwich', of: 'item', name: 'sandwich', desc: 'Cheese and pickle.', at: 'player', traits: { ...usable('Eat the sandwich', [{ kind: 'stat', stat: 'energy', by: 25 }]) } },
    // Kept: reading the paper doesn't use it up.
    { id: 'paper', of: 'item', name: 'newspaper', at: 'player', traits: { ...usable('Read the job ads', [openJobs(['dogs'])], { keep: true }) } },
  ],
}
```

### Usable

```ts
type Usable = { label: string; effects: EffectRef[]; keep?: boolean }
const usable: (label: string, effects: EffectRef[], options?: { keep?: boolean }) => { 'inventory/usable': Usable }
```

| Field | What it is |
|---|---|
| `label` | The button's label: "Eat the sandwich". |
| `effects` | What using one does: any [effects](/docs/reference/effects), a plugin's included, such as opening a panel. They read the state as it was before one was spent, as an activity's effects read it before its cost. |
| `keep` | Using it doesn't spend one: a book you read again, a torch you switch on. One is spent if left out. |

It's a [trait](/docs/reference/entities#traits), so you can write it on a kind as a default (every kind of fruit is eaten), on an entity, or in content's `traits` table, where a mod can change what a thing does. A thing made in play [`like`](/docs/reference/effects#create) a usable one is usable too.

## Using

| Command | Helper | Does |
|---|---|---|
| `{ 'inventory/use': { id } }` | `useThing(ref)` | Runs the thing's `inventory/usable` effects and, unless it's kept, takes one away from you. |
| `{ 'inventory/drop': { id } }` | `dropThing(ref)` | Drops one. See [Dropping and giving](#dropping-and-giving). |
| `{ 'inventory/give': { id, to } }` | `giveThing(ref, to)` | Moves one from you to `to`, a holder: a unique entity such as `'character:ava'`. |

"You" is whoever the player is playing (see [Protagonists](/docs/reference/entities#protagonists-you-and-player)). Each command takes the thing from the protagonist while they hold one, and otherwise from the player, so what the player keeps across a switch is still theirs to use.

`inventory/use` is refused with:

- `There is no such thing.` (the engine's [`noSuchThing`](/docs/reference/strings#refusals)) when the thing isn't in the game.
- `You have no <name>.` (`inventory/haveNone`) when you hold none.
- `The <name> does not do anything.` (`inventory/doesNothing`) when it has no `inventory/usable` trait.

All three go through [locks](/docs/reference/locks) like any command, so a lock can say `deny: ['inventory/use']` during a scene where eating would be rude. A button for `inventory/use` greys out with the reason, and a [guard](/docs/reference/plugins#guards) sees the effects it would run.

## Dropping and giving

`inventory/drop` takes one away from you. With [places](/docs/plugins/places), it asks for somewhere to put it where you are, through the `places/holder` [query](/docs/reference/plugins#queries), and moves it there when the answer is a holder that can hold things. Places answers with the room's [entity](/docs/plugins/places#each-place-is-an-entity), so the thing lies in the room, listed in the places view with a button to [pick it up](/docs/plugins/places#things-lying-in-a-place) again. Without places, or with the player nowhere, a dropped thing is gone. It's refused with `There is no such thing.` and `You have no <name>.` as `use` is.

```ts
import { apply, type Game, type GameState } from '@ifloom/engine'
import { dropThing } from '@ifloom/plugin-inventory'
import { pickUp } from '@ifloom/plugin-places'

declare const game: Game
declare const inFlat: GameState   // in the flat, holding the paper

const dropped = apply(inFlat, game, dropThing('item:paper')).state
dropped.held['location:flat']   // { 'item:paper': 1 }: it lies in the flat
apply(dropped, game, pickUp('item:paper')).state.held.player   // { 'item:paper': 1 }: back with you
```

`inventory/give` moves one to `to`. It's refused when you hold none, with `You already have it.` when `to` is you or the player, and with `You can’t give things to <name>.` when `to` can't hold things: a kind that isn't [`unique`](/docs/reference/entities#kinddef), or an entity that isn't in the game. Who you can give to in the story is yours to say, by where you put the button: a choice in Ava's scene, say.

```ts
import { giveThing } from '@ifloom/plugin-inventory'
import { character } from '@ifloom/plugin-cast'

choices: [{ id: 'gift', when: holding('clothing:scarf'), command: giveThing('clothing:scarf', character('ava')) }],
```

## With the shop and the wardrobe

The inventory, the [shop](/docs/plugins/shop) and the [wardrobe](/docs/plugins/wardrobe) know nothing about each other. Each one reads what you hold from the engine and its own trait on each thing, and ignores the others' traits. So you can use any of them alone, or all three, and a thing can carry a trait for each:

```ts
import type { Content } from '@ifloom/engine'
import { usable } from '@ifloom/plugin-inventory'
import { sellable } from '@ifloom/plugin-shop'
import { wearable } from '@ifloom/plugin-wardrobe'

const market: Content = {
  stats: [
    { id: 'coins', label: 'Coins', start: 20, spendable: true },
    { id: 'energy', label: 'Energy', start: 50, max: 100 },
  ],
  kinds: [
    { id: 'clothing', label: 'Clothing', unique: true, listed: false },
    { id: 'food', label: 'Food', listed: false },
  ],
  entities: [
    { id: 'scarf', of: 'clothing', name: 'scarf', traits: { ...wearable('neck'), ...sellable({ coins: 8 }) } },
    { id: 'pie', of: 'food', name: 'pie', traits: { ...usable('Eat the pie', [{ kind: 'stat', stat: 'energy', by: 20 }]), ...sellable({ coins: 3 }) } },
  ],
  data: {
    shop: { vendors: [{ id: 'stall', name: 'Stall', buysBack: 0.5, goods: [{ entity: 'clothing:scarf', stock: 1 }, { entity: 'food:pie' }] }] },
    wardrobe: { slots: [{ id: 'neck', label: 'Neck' }] },
  },
}
```

With all three, the player buys the scarf from the stall, wears it, eats a pie, and gives the scarf back to the stall with `giveThing('clothing:scarf', 'vendor:stall')`. It comes off as it goes, and the stall has it to sell again. With only the shop, the same content sells both, and nothing is worn or eaten. With only the wardrobe, the scarf can be worn once something gives it to the player. A game without a plugin leaves its `data` out, since the loader reports data for a plugin the game doesn't have.

## The view

`view(state, game).plugins.inventory` is an `InventoryView`: what you hold, with a button to use each thing that has a use and one to drop it, built with the engine's [`renderAction`](/docs/reference/view#renderaction) so a UI draws them like any other button.

The [React UI](/docs/react)'s [`Inventory`](/docs/react/components#inventory) draws it, and [`useInventory`](/docs/react/components#useinventory) gives the same data and the commands with no markup. Without the plugin, `Inventory` draws `view.held` with no buttons.

### InventoryView

```ts
type InventoryView = { things: InventoryThing[] }
type InventoryThing = {
  ref: EntityRef
  name: string
  desc: string | null
  image: string | null
  count: number
  at: Holder
  use: RenderedChoice | null
  drop: RenderedChoice
}
```

| Field | What it is |
|---|---|
| `things` | What you hold: the protagonist's things while one is played, then the player's, each in the game's order of its entities. A thing whose `visible` doesn't hold is left out, as in `view.held`. |
| `ref` | The thing, such as `'item:sandwich'`. |
| `name`, `desc` | Its name and description, with prose tokens filled in. `desc` is `null` when it has none. |
| `image` | Its picture's path, through `artSrc`, or `null`. |
| `count`, `at` | How many are held, and who holds them: the protagonist or `'player'`. |
| `use` | The button that uses one, labelled by its trait, or `null` for a thing that does nothing. |
| `drop` | The button that drops one, labelled with its name. |

### InventoryData

```ts
type InventoryData = { kinds?: { id: string }[] }
```

The plugin's content, in `data.inventory`. `kinds` is the kinds whose things the view shows, every kind if left out. Each is an entry with the kind's id, as plugin content always is, so a mod can add one. A game with clothes in the wardrobe and keepsakes on a shelf might show only its `item` kind:

```ts
data: { inventory: { kinds: [{ id: 'item' }] } }
```

The checker reports a kind the game doesn't have.

## For code

### Helpers

```ts
const usable: (label: string, effects: EffectRef[], options?: { keep?: boolean }) => { 'inventory/usable': Usable }
const useThing: (ref: EntityRef) => CommandRef
const dropThing: (ref: EntityRef) => CommandRef
const giveThing: (ref: EntityRef, to: Holder) => CommandRef
```

### usableOf

```ts
function usableOf(state: GameState, game: Game, ref: EntityRef): Usable | undefined
```

The thing's `inventory/usable` trait, read through what it was made `like`, or undefined when it does nothing.

### inventoryData and inventoryView

```ts
function inventoryData(game: Game): InventoryData
function inventoryView(state: GameState, game: Game): InventoryView
```

`inventoryData` is the game's `data.inventory`, merged from its content and packs. `inventoryView` is the plugin's view for a state.

## Strings

| Key | English |
|---|---|
| `inventory/haveNone` | `You have no {thing}.` |
| `inventory/doesNothing` | `The {thing} does not do anything.` |
| `inventory/cantGiveTo` | `You can’t give things to {to}.` |
| `inventory/giveToSelf` | `You already have it.` |

`{thing}` is the thing's name. A thing the game doesn't have is refused with the engine's own [`noSuchThing`](/docs/reference/strings#refusals).

## Checks

When the game loads, the checker reports:

- A usable thing with no label, or effects that aren't a list (`trait inventory/usable on <ref>`).
- Anything a usable thing's effects name that the game doesn't have, such as an unknown stat.
- A command naming a thing the game doesn't have (`unknown entity "…"`), or a `give` to something that can't hold things.
- A kind in `data.inventory.kinds` the game doesn't have.

## Gotchas

- **The view lists a thing once for each holder.** While a protagonist is played, a thing both they and the player hold is listed twice, and its button uses the protagonist's first.
- **Dropping is for good, for now.** Without somewhere to put it, a dropped thing leaves the game's holdings. To keep a quest's key, give the player no drop button for it: the React `Inventory` shows drop buttons only with `drop`.

## See it in an example

Small Town: [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts) gives the sandwich and the flapjack a use that restores energy, and the newspaper one that opens the job board with only the paper's ads, kept so you can read it again.
