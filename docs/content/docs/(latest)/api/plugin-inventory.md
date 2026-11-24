---
title: "@ifloom/plugin-inventory"
description: "Every export of @ifloom/plugin-inventory and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-inventory` and `@ifloom/plugin-inventory/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-inventory

- Functions: [`inventory`](#inventory), [`inventoryKindsOf`](#inventorykindsof), [`usableOf`](#usableof)
- Types: [`InventoryData`](#inventorydata), [`InventoryThing`](#inventorything), [`InventoryView`](#inventoryview), [`Usable`](#usable)

### inventory

Function. Explained in [Inventory](/docs/plugins/inventory#inventory).

The plugin, with its helpers on it: `inventory()` makes the plugin for the
game's `plugins`, and content is written with `inventory.usable('Eat', effects)` and `inventory.use('food:apple')`.

```ts shape
import { inventory } from '@ifloom/plugin-inventory'
function inventory(): DefinedPlugin<null, InventoryView>
```

| Helper | Signature | Description |
|---|---|---|
| `inventory.usable` | `(label: string, effects: EffectRef[], options?: { keep?: boolean }): { 'inventory/usable': Usable }` |  |
| `inventory.use` | `(ref: EntityRef): CommandRef` |  |
| `inventory.drop` | `(ref: EntityRef): CommandRef` |  |
| `inventory.give` | `(ref: EntityRef, to: Holder): CommandRef` |  |

### InventoryData

Type. Explained in [Inventory](/docs/plugins/inventory#inventorydata).

The plugin's content, `data.inventory`.

```ts shape
import type { InventoryData } from '@ifloom/plugin-inventory'
type InventoryData = {
  kinds?: { id: string }[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `kinds` | `{ id: string }[]` | yes |  | The kinds the inventory shows, in `InventoryView`, each an entry with the kind's id (`{ id: 'item' }`), so a mod can add one. Every kind, if left out. |

### inventoryKindsOf

Function. Explained in [Inventory](/docs/plugins/inventory#inventorykindsof).

The kinds the inventory shows, from `data.inventory.kinds` in the game's content and packs; undefined for every kind.

```ts shape
import { inventoryKindsOf } from '@ifloom/plugin-inventory'
function inventoryKindsOf(game: Game): { id: string }[] | undefined
```

### InventoryThing

Type. Explained in [Inventory](/docs/plugins/inventory#inventorything).

One thing you hold, as the UI draws it.

```ts shape
import type { InventoryThing } from '@ifloom/plugin-inventory'
type InventoryThing = {
  ref: EntityRef
  name: string
  description: string | null
  image: string | null
  count: number
  at: Holder
  use: RenderedChoice | null
  drop: RenderedChoice
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `ref` | `EntityRef` |  |  | How content names it: `'food:apple'`. |
| `name` | `string` |  |  |  |
| `description` | `string \| null` |  |  | Its entity's `description`, tokens filled; null with none. |
| `image` | `string \| null` |  |  | Its picture's path, through `artSrc`; null with none. |
| `count` | `number` |  |  | How many are held. |
| `at` | `Holder` |  |  | Who holds it: the protagonist being played, or `'player'`. |
| `use` | `RenderedChoice \| null` |  |  | The button that uses one, labelled by its trait, or null for a thing with no use. Send its `command`. |
| `drop` | `RenderedChoice` |  |  | The button that drops one. |

### InventoryView

Type. Explained in [Inventory](/docs/plugins/inventory#inventoryview).

What a UI reads at `view.plugins.inventory`.

```ts shape
import type { InventoryView } from '@ifloom/plugin-inventory'
type InventoryView = {
  things: InventoryThing[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `things` | `InventoryThing[]` |  |  | What you hold that the inventory shows: the protagonist's things while one is played, then the player's. |

### Usable

Type. Explained in [Inventory](/docs/plugins/inventory#usable).

What the `inventory/usable` trait holds: the button's label, what using one does, and whether it is kept.

```ts shape
import type { Usable } from '@ifloom/plugin-inventory'
type Usable = {
  label: string
  effects: EffectRef[]
  keep?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `label` | `string` |  |  | The button: "Eat the sandwich". |
| `effects` | `EffectRef[]` |  |  | What using one does. They read the state as it was before one was spent. |
| `keep` | `boolean` | yes |  | Using it doesn't spend one: a book read, a torch switched on. One is spent if left out. |

### usableOf

Function. Explained in [Inventory](/docs/plugins/inventory#usableof).

What makes a thing usable, when it is: its `inventory/usable` trait, read through what it was made `like`.

```ts shape
import { usableOf, type Usable } from '@ifloom/plugin-inventory'
function usableOf(state: GameState, game: Game, ref: EntityRef): Usable | undefined
```

## @ifloom/plugin-inventory/react

- Functions: [`useInventory`](#useinventory)
- Constants: [`INVENTORY_WORDS`](#inventory_words), [`InventoryCard`](#inventorycard), [`inventoryUi`](#inventoryui)
- Types: [`InventoryControls`](#inventorycontrols)

### INVENTORY_WORDS

Const.

The inventory plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { INVENTORY_WORDS } from '@ifloom/plugin-inventory/react'
const INVENTORY_WORDS: { readonly drop: 'Drop'; }
```

### InventoryCard

Const. Explained in [Inventory](/docs/plugins/inventory#inventorycard).

What you carry, with the inventory plugin's buttons: the things you hold,
each with a button that uses it when it's usable, greyed out with the
engine's reason when it can't be used now, and with `drop` a button that
drops one. It takes the same props as the core `Inventory`, and the
inventory UI draws it in that one's place. A thin default on `useInventory`.

```ts shape
import { InventoryCard } from '@ifloom/plugin-inventory/react'
const InventoryCard: ComponentType<InventoryProps>
```

### InventoryControls

Type.

What `useInventory` returns: the inventory plugin's view, and its commands.

```ts shape
import type { InventoryControls } from '@ifloom/plugin-inventory/react'
type InventoryControls = {
  things: InventoryThing[]
  use: (ref: EntityRef) => Result<GameState>
  drop: (ref: EntityRef) => Result<GameState>
  give: (ref: EntityRef, to: Holder) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `things` | `InventoryThing[]` |  |  | What you hold that the inventory shows: the protagonist's things while one is played, then the player's. |
| `use` | `(ref: EntityRef) => Result<GameState>` |  |  | Use one of a thing you hold: sends `inventory/use`, refused with its reason as the button says. |
| `drop` | `(ref: EntityRef) => Result<GameState>` |  |  | Drop one of a thing you hold: sends `inventory/drop`. |
| `give` | `(ref: EntityRef, to: Holder) => Result<GameState>` |  |  | Give one of a thing you hold to someone who can hold things: sends `inventory/give`. |

### inventoryUi

Const. Explained in [Inventory](/docs/plugins/inventory#inventoryui).

The inventory plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: `InventoryCard` drawn wherever the core `Inventory` is,
in the side column and the `inventory` panel, and the inventory's words.

```ts shape
import { inventoryUi } from '@ifloom/plugin-inventory/react'
const inventoryUi: PluginUi
```

### useInventory

Function. Explained in [Inventory](/docs/plugins/inventory#useinventory).

The inventory plugin's view with its commands, or null in a game without the plugin. `InventoryCard` is drawn from it.

```ts shape
import { useInventory } from '@ifloom/plugin-inventory/react'
function useInventory(): InventoryControls | null
```
