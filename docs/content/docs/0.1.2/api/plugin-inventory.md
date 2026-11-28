---
title: "@ifloom/plugin-inventory"
description: "Every export of @ifloom/plugin-inventory and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-inventory` and `@ifloom/plugin-inventory/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-inventory

- Functions: [`canHold`](#canhold), [`heldBy`](#heldby), [`heldCount`](#heldcount), [`holderOf`](#holderof), [`holdersOf`](#holdersof), [`inventory`](#inventory), [`inventoryKindsOf`](#inventorykindsof), [`usableOf`](#usableof)
- Types: [`Holder`](#holder), [`InventoryData`](#inventorydata), [`InventoryOptions`](#inventoryoptions), [`InventoryState`](#inventorystate), [`InventoryThing`](#inventorything), [`InventoryView`](#inventoryview), [`Placement`](#placement), [`Usable`](#usable)

### canHold

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#canhold).

Returns true when `holder` can hold things now. The player always can, and a unique entity can while it is in the game.

```ts shape
import { canHold } from '@ifloom/plugin-inventory'
function canHold(state: GameState, game: Game, holder: string): boolean
```

Uses: [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game).

### heldBy

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#heldby).

Returns the things a holder holds, `'you'` if left out, each with its count, in the game's order of its entities.

```ts shape
import { heldBy } from '@ifloom/plugin-inventory'
function heldBy(state: GameState, game: Game, at?: string): { ref: EntityRef; count: number }[]
```

Uses: [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game), [`EntityRef`](/docs/0.1.2/api/engine#entityref).

### heldCount

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#heldcount).

Returns the count of a thing a holder holds, `'you'` if left out. Returns 0 for a thing not held there or not in the game.

```ts shape
import { heldCount } from '@ifloom/plugin-inventory'
function heldCount(state: GameState, game: Game, ref: string, at?: string): number
```

Uses: [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game).

### Holder

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#holder).

A holder of things, `'player'`, a unique entity (`'character:ava'`) or `'you'`, whoever the player is playing now.

```ts shape
import type { Holder } from '@ifloom/plugin-inventory'
type Holder = EntityRef | typeof PLAYER | typeof YOU
```

Uses: [`EntityRef`](/docs/0.1.2/api/engine#entityref).

### holderOf

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#holderof).

Returns the holder of a thing when one holder has it, as always for a unique thing. Undefined when no one holds it.

```ts shape
import { holderOf } from '@ifloom/plugin-inventory'
function holderOf(state: GameState, game: Game, ref: string): Holder | undefined
```

Uses: [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game), [`Holder`](#holder).

### holdersOf

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#holdersof).

Returns each holder of a thing with its count, in no set order.

```ts shape
import { holdersOf } from '@ifloom/plugin-inventory'
function holdersOf(state: GameState, game: Game, ref: string): { holder: Holder; count: number }[]
```

Uses: [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game), [`Holder`](#holder).

### inventory

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventory).

The inventory plugin's factory, with its helpers as properties. `inventory()` returns the plugin for the game's
`plugins`, and content calls helpers such as `inventory.usable('Eat', effects)` and `inventory.use('food:apple')`.

```ts shape
import { inventory } from '@ifloom/plugin-inventory'
function inventory(options?: InventoryOptions): DefinedPlugin<InventoryState, InventoryView>
```

Uses: [`InventoryOptions`](#inventoryoptions), [`DefinedPlugin`](/docs/0.1.2/api/engine-plugin#definedplugin), [`InventoryState`](#inventorystate), [`InventoryView`](#inventoryview).

| Helper | Signature | Description |
|---|---|---|
| `inventory.usable` | `(label: string, effects:` [`EffectRef[]`](/docs/0.1.2/api/engine#effectref)`, options?: { keep?: boolean }): { 'inventory/usable':` [`Usable`](#usable) `}` | Returns the `inventory/usable` trait, to spread into an entity's or a kind's `traits`. Using the thing spends one unless `keep` is true. |
| `inventory.at` | `(placement:` [`Placement`](#placement)`): { 'inventory/at':` [`Placement`](#placement) `}` | Returns the `inventory/at` trait, to spread into an entity's `traits`, naming who holds it at the start. |
| `inventory.use` | `(ref:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `inventory/use` command, which uses one of a thing the player holds. |
| `inventory.drop` | `(ref:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `inventory/drop` command, which drops one of a thing the player holds. |
| `inventory.give` | `(ref:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`, to:` [`Holder`](#holder)`):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `inventory/give` command, which gives one of a thing the player holds to someone. |
| `inventory.move` | `(entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`, to:` [`Holder`](#holder)`, options?: { from?:` [`Holder`](#holder)`; by?: number }):` [`EffectRef`](/docs/0.1.2/api/engine#effectref) | Returns the `inventory/move` effect, which moves a thing from one holder to another, from `'you'` if `from` is left out. |
| `inventory.set` | `(entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`, to: number, holder?:` [`Holder`](#holder)`):` [`EffectRef`](/docs/0.1.2/api/engine#effectref) | Returns the `inventory/set` effect, which sets how many of a thing a holder (`'you'` if left out) holds. |

### InventoryData

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventorydata).

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

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventorykindsof).

Returns the kinds the inventory shows, from `data.inventory.kinds` in the game's content and packs. Returns undefined when every kind is shown.

```ts shape
import { inventoryKindsOf } from '@ifloom/plugin-inventory'
function inventoryKindsOf(game: Game): { id: string }[] | undefined
```

Uses: [`Game`](/docs/0.1.2/api/engine#game).

### InventoryOptions

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventoryoptions).

The inventory plugin's settings, which the game passes to `inventory()`.

```ts shape
import type { InventoryOptions } from '@ifloom/plugin-inventory'
type InventoryOptions = {
  carryOver?: readonly string[] | 'all'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `carryOver` | `readonly string[] \| 'all'` | yes |  | The things a New Game+ keeps in the player's own inventory, by reference (`'food:apple'`), or `'all'` for everything the player holds, things made in play included. Nothing if left out. |

### InventoryState

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventorystate).

The inventory's state, the counts play changed.

```ts shape
import type { InventoryState } from '@ifloom/plugin-inventory'
type InventoryState = {
  held: Record<string, Record<string, number>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `held` | `Record<string, Record<string, number>>` |  |  | The counts play changed, by holder and then thing. A count stays once written, 0 included. |

### InventoryThing

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventorything).

A thing someone holds as the player sees it, in `view.plugins.inventory.things`.

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
| `ref` | [`EntityRef`](/docs/0.1.2/api/engine#entityref) |  |  | The thing's entity reference, such as `'food:apple'`. |
| `name` | `string` |  |  | The thing's name. |
| `description` | `string \| null` |  |  | The thing's `description`, with its tokens filled, or null when it has none. |
| `image` | `string \| null` |  |  | The path of the thing's picture through `artSrc`, or null when it has none. |
| `count` | `number` |  |  | The number of this thing the holder holds. |
| `at` | [`Holder`](#holder) |  |  | The thing's holder, the protagonist being played or `'player'`. |
| `use` | [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) `\| null` |  |  | The button that uses one, labelled by its trait, or null for a thing with no use. Its `command` is the one to send. |
| `drop` | [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) |  |  | The button that drops one. |

### InventoryView

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventoryview).

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

### Placement

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#placement).

A thing's starting place, one holder for one of it or a count for each holder (`{ player: 2, 'place:larder': 6 }`).

```ts shape
import type { Placement } from '@ifloom/plugin-inventory'
type Placement = Holder | Partial<Record<Holder, number>>
```

Uses: [`Holder`](#holder).

### Usable

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#usable).

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
| `effects` | [`EffectRef[]`](/docs/0.1.2/api/engine#effectref) |  |  | The effects of using one. They read the state as it was before one was spent. |
| `keep` | `boolean` | yes |  | True when using one doesn't spend it, as for a book read or a torch switched on. One is spent if left out. |

### usableOf

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#usableof).

Returns a thing's `inventory/usable` trait, read through the entity it was made `like`. Returns undefined for a thing with no use.

```ts shape
import { usableOf, type Usable } from '@ifloom/plugin-inventory'
function usableOf(state: GameState, game: Game, ref: EntityRef): Usable | undefined
```

Uses: [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game), [`EntityRef`](/docs/0.1.2/api/engine#entityref), [`Usable`](#usable).

## @ifloom/plugin-inventory/react

- Components: [`InventorySection`](#inventorysection)
- Functions: [`useInventory`](#useinventory)
- Constants: [`INVENTORY_WORDS`](#inventory_words), [`InventoryCard`](#inventorycard), [`inventoryUi`](#inventoryui)
- Types: [`InventoryControls`](#inventorycontrols), [`InventoryProps`](#inventoryprops)

### INVENTORY_WORDS

Const. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventory_words).

The inventory plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { INVENTORY_WORDS } from '@ifloom/plugin-inventory/react'
const INVENTORY_WORDS: {
  inventory: 'Carrying'
  heldCount: '×{n}'
  drop: 'Drop'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `inventory` | `'Carrying'` |  |  | The heading over the things the player carries. |
| `heldCount` | `'×{n}'` |  |  | The count beside a thing held more than once, with `{n}` for the number. |
| `drop` | `'Drop'` |  |  | The label of the button that drops one. |

### InventoryCard

Const. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventorycard).

Renders the things the player holds from `view.plugins.inventory`, each usable one with a button. It renders nothing
while they hold nothing, or in a game without the plugin.

A button that can't be used now is disabled with the engine's reason, and the `drop` prop adds a button that drops
one. A preset can style the parts `inventory`, `inventory-title`, `thing`, `thing-name`, `thing-count`, `thing-text`
and `thing-drop`.

```ts shape
import { InventoryCard } from '@ifloom/plugin-inventory/react'
const InventoryCard: ComponentType<InventoryProps>
```

Uses: [`InventoryProps`](#inventoryprops).

### InventoryControls

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventorycontrols).

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
| `use` | `(ref:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends `inventory/use` for one of a thing the player holds. A refusal carries the same reason the button shows. |
| `drop` | `(ref:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends `inventory/drop` for one of a thing the player holds. |
| `give` | `(ref:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`, to:` [`Holder`](#holder)`) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends `inventory/give`, which gives one of a thing the player holds to someone. |

### InventoryProps

Type. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventoryprops).

The props of `InventoryCard`.

```ts shape
import type { InventoryProps } from '@ifloom/plugin-inventory/react'
type InventoryProps = {
  className?: string
  title?: string | false
  drop?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `className` | `string` | yes |  | Classes added to the `inventory` part's own. |
| `title` | `string \| false` | yes |  | The heading, the `inventory` word if left out. `false` leaves it out, as under a section's title. |
| `drop` | `boolean` | yes |  | True to give each thing a button that drops one. |

### InventorySection

Component. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventorysection).

Renders `InventoryCard` in a folding sidebar section titled with the `inventory` word. It hides itself while nothing is held.

```ts shape
import { InventorySection } from '@ifloom/plugin-inventory/react'
function InventorySection(): JSX.Element
```

### inventoryUi

Const. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#inventoryui).

The inventory plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds `InventorySection` to the
sidebar and an `inventory` panel, and the plugin's words.

```ts shape
import { inventoryUi } from '@ifloom/plugin-inventory/react'
const inventoryUi: PluginUi
```

Uses: [`PluginUi`](/docs/0.1.2/api/react-kit#pluginui).

### useInventory

Function. Explained in [Inventory](/docs/0.1.2/reference/plugins/inventory#useinventory).

Returns the inventory plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useInventory } from '@ifloom/plugin-inventory/react'
function useInventory(): InventoryControls | null
```

Uses: [`InventoryControls`](#inventorycontrols).
