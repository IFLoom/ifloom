---
title: "@ifloom/plugin-inventory"
description: "Every export of @ifloom/plugin-inventory and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-inventory` and `@ifloom/plugin-inventory/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-inventory

- Functions: [`inventory`](#inventory), [`inventoryKindsOf`](#inventorykindsof), [`usableOf`](#usableof)
- Types: [`InventoryData`](#inventorydata), [`InventoryThing`](#inventorything), [`InventoryView`](#inventoryview), [`Usable`](#usable)

### inventory

Function. Explained in [Inventory](/docs/reference/plugins/inventory#inventory).

The inventory plugin's factory, with its helpers as properties. `inventory()` returns the plugin for the game's
`plugins`, and content calls helpers such as `inventory.usable('Eat', effects)` and `inventory.use('food:apple')`.

```ts shape
import { inventory } from '@ifloom/plugin-inventory'
function inventory(): DefinedPlugin<null, InventoryView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`InventoryView`](#inventoryview).

| Helper | Signature | Description |
|---|---|---|
| `inventory.usable` | `(label: string, effects:` [`EffectRef[]`](/docs/api/engine#effectref)`, options?: { keep?: boolean }): { 'inventory/usable':` [`Usable`](#usable) `}` | Returns the `inventory/usable` trait, to spread into an entity's or a kind's `traits`. Using the thing spends one unless `keep` is true. |
| `inventory.use` | `(ref:` [`EntityRef`](/docs/api/engine#entityref)`):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `inventory/use` command, which uses one of a thing the player holds. |
| `inventory.drop` | `(ref:` [`EntityRef`](/docs/api/engine#entityref)`):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `inventory/drop` command, which drops one of a thing the player holds. |
| `inventory.give` | `(ref:` [`EntityRef`](/docs/api/engine#entityref)`, to:` [`Holder`](/docs/api/engine#holder)`):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `inventory/give` command, which gives one of a thing the player holds to another holder. |

### InventoryData

Type. Explained in [Inventory](/docs/reference/plugins/inventory#inventorydata).

The inventory plugin's content, which the game declares in `data.inventory`.

```ts shape
import type { InventoryData } from '@ifloom/plugin-inventory'
type InventoryData = {
  kinds?: { id: string }[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `kinds` | `{ id: string }[]` | yes |  | The kinds whose things the inventory shows in `InventoryView`, each an entry with the kind's id (`{ id: 'food' }`), so a mod can add one. Every kind if left out. |

### inventoryKindsOf

Function. Explained in [Inventory](/docs/reference/plugins/inventory#inventorykindsof).

Returns the kinds the inventory shows, from `data.inventory.kinds` in the game's content and packs. Returns undefined when every kind is shown.

```ts shape
import { inventoryKindsOf } from '@ifloom/plugin-inventory'
function inventoryKindsOf(game: Game): { id: string }[] | undefined
```

Uses: [`Game`](/docs/api/engine#game).

### InventoryThing

Type. Explained in [Inventory](/docs/reference/plugins/inventory#inventorything).

A thing the player holds as the player sees it, in `view.plugins.inventory.things`.

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
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The thing's entity reference, such as `'food:apple'`. |
| `name` | `string` |  |  | The thing's name. |
| `description` | `string \| null` |  |  | The thing's `description`, with its tokens filled, or null when it has none. |
| `image` | `string \| null` |  |  | The path of the thing's picture through `artSrc`, or null when it has none. |
| `count` | `number` |  |  | The number of this thing the holder holds. |
| `at` | [`Holder`](/docs/api/engine#holder) |  |  | The thing's holder, the protagonist being played or `'player'`. |
| `use` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that uses one, labelled by its trait, or null for a thing with no use. Its `command` is the one to send. |
| `drop` | [`RenderedChoice`](/docs/api/engine#renderedchoice) |  |  | The button that drops one. |

### InventoryView

Type. Explained in [Inventory](/docs/reference/plugins/inventory#inventoryview).

The inventory as the player sees it, in `view.plugins.inventory`.

```ts shape
import type { InventoryView } from '@ifloom/plugin-inventory'
type InventoryView = {
  things: InventoryThing[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `things` | [`InventoryThing[]`](#inventorything) |  |  | The things the inventory shows, the played protagonist's first and then the player's. |

### Usable

Type. Explained in [Inventory](/docs/reference/plugins/inventory#usable).

The data of the `inventory/usable` trait, which makes a thing usable. It gives the button's label, the effects of using one and whether one is kept.

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
| `label` | `string` |  |  | The label of the button that uses one, such as "Eat the sandwich". |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) |  |  | The effects of using one. They read the state as it was before one was spent. |
| `keep` | `boolean` | yes |  | True when using one doesn't spend it, as for a book read or a torch switched on. One is spent if left out. |

### usableOf

Function. Explained in [Inventory](/docs/reference/plugins/inventory#usableof).

Returns a thing's `inventory/usable` trait, read through the entity it was made `like`. Returns undefined for a thing with no use.

```ts shape
import { usableOf, type Usable } from '@ifloom/plugin-inventory'
function usableOf(state: GameState, game: Game, ref: EntityRef): Usable | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref), [`Usable`](#usable).

## @ifloom/plugin-inventory/react

- Functions: [`useInventory`](#useinventory)
- Constants: [`INVENTORY_WORDS`](#inventory_words), [`InventoryCard`](#inventorycard), [`inventoryUi`](#inventoryui)
- Types: [`InventoryControls`](#inventorycontrols)

### INVENTORY_WORDS

Const.

The inventory plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { INVENTORY_WORDS } from '@ifloom/plugin-inventory/react'
const INVENTORY_WORDS: { readonly drop: 'Drop'; }
```

### InventoryCard

Const. Explained in [Inventory](/docs/reference/plugins/inventory#inventorycard).

Renders the things the player holds from `view.plugins.inventory`, each usable one with a button. It replaces the
core `Inventory`, and falls back to `view.held` without the plugin.

It takes the core `Inventory`'s props.

A button that can't be used now is disabled with the engine's reason, and the `drop` prop adds a button that drops
one. A preset can style the parts `inventory`, `inventory-title`, `thing`, `thing-name`, `thing-count`, `thing-text`
and `thing-drop`.

```ts shape
import { InventoryCard } from '@ifloom/plugin-inventory/react'
const InventoryCard: ComponentType<InventoryProps>
```

Uses: [`InventoryProps`](/docs/api/react#inventoryprops).

### InventoryControls

Type.

The inventory plugin's view with functions that send its commands, as `useInventory` returns it.

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
| `things` | [`InventoryThing[]`](#inventorything) |  |  | The things the inventory shows, the played protagonist's first and then the player's. |
| `use` | `(ref:` [`EntityRef`](/docs/api/engine#entityref)`) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `inventory/use` for one of a thing the player holds. A refusal carries the same reason the button shows. |
| `drop` | `(ref:` [`EntityRef`](/docs/api/engine#entityref)`) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `inventory/drop` for one of a thing the player holds. |
| `give` | `(ref:` [`EntityRef`](/docs/api/engine#entityref)`, to:` [`Holder`](/docs/api/engine#holder)`) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `inventory/give`, which gives one of a thing the player holds to another holder. |

### inventoryUi

Const. Explained in [Inventory](/docs/reference/plugins/inventory#inventoryui).

The inventory plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders `InventoryCard` wherever
the core `Inventory` goes, in the sidebar and the `inventory` panel, and adds the plugin's words.

```ts shape
import { inventoryUi } from '@ifloom/plugin-inventory/react'
const inventoryUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useInventory

Function. Explained in [Inventory](/docs/reference/plugins/inventory#useinventory).

Returns the inventory plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useInventory } from '@ifloom/plugin-inventory/react'
function useInventory(): InventoryControls | null
```

Uses: [`InventoryControls`](#inventorycontrols).
