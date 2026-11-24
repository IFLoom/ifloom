---
title: "@ifloom/plugin-shop"
description: "Every export of @ifloom/plugin-shop and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-shop` and `@ifloom/plugin-shop/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-shop

- Functions: [`sellableOf`](#sellableof), [`shop`](#shop), [`vendorOf`](#vendorof), [`vendorsOf`](#vendorsof)
- Types: [`DiscountDef`](#discountdef), [`GoodDef`](#gooddef), [`GoodView`](#goodview), [`Restock`](#restock), [`Sellable`](#sellable), [`ShopState`](#shopstate), [`ShopView`](#shopview), [`StockRecord`](#stockrecord), [`Vendor`](#vendor), [`VendorDef`](#vendordef), [`VendorView`](#vendorview)

### DiscountDef

Type. Explained in [Shop](/docs/plugins/shop#discountdef).

Goods marked down each day: how many, and the fraction off.

```ts shape
import type { DiscountDef } from '@ifloom/plugin-shop'
type DiscountDef = {
  off: number
  count?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `off` | `number` |  |  | The fraction off, such as `0.25` for a quarter. |
| `count` | `number` | yes |  | How many goods are marked down each day. 1 if left out. |

### GoodDef

Type. Explained in [Shop](/docs/plugins/shop#gooddef).

One thing a vendor sells.

```ts shape
import type { GoodDef } from '@ifloom/plugin-shop'
type GoodDef = {
  entity: EntityRef
  price?: Record<string, number>
  stock?: number
  restock?: Restock
  when?: Condition
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `entity` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The thing, by reference: `'food:apple'`. |
| `price` | `Record<string, number>` | yes |  | What one costs, by stat: `{ coins: 4 }`. Each stat should be spendable. The thing's `shop/sellable` price if left out. |
| `stock` | `number` | yes |  | How many the vendor holds: it starts with that many, and `restock` tops it back up to it. Never runs out if left out: each one bought is new. A unique thing is always sold from the vendor's stock, so give it `stock: 1` or start it with the vendor. |
| `restock` | [`Restock`](#restock) | yes |  | When the stock comes back up to `stock`. Never, if left out. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | Offered only while this holds. |

### GoodView

Type. Explained in [Shop](/docs/plugins/shop#goodview).

A good as the UI shows it.

```ts shape
import type { GoodView } from '@ifloom/plugin-shop'
type GoodView = {
  entity: EntityRef
  name: string
  description: string | null
  image: string | null
  stock: number | null
  owned: number
  off: number
  fullPrice: Price | null
  buy: RenderedChoice
  sell: RenderedChoice | null
  sellFor: Price | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `entity` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The thing: `'food:apple'`. |
| `name` | `string` |  |  | Its name. |
| `description` | `string \| null` |  |  | Its description; null with none. |
| `image` | `string \| null` |  |  | Its picture's path, through `artSrc`; null with none. |
| `stock` | `number \| null` |  |  | How many the vendor has left, or null when it never runs out. |
| `owned` | `number` |  |  | How many you hold. |
| `off` | `number` |  |  | The fraction off today, or 0. |
| `fullPrice` | [`Price`](/docs/api/engine#price) `\| null` |  |  | The price before today's discount, or null when there is none. |
| `buy` | [`RenderedChoice`](/docs/api/engine#renderedchoice) |  |  | The button that buys one: its price, and why it's greyed out, as any button has them. Send its `command`. |
| `sell` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that sells one back, or null if the vendor takes nothing back. |
| `sellFor` | [`Price`](/docs/api/engine#price) `\| null` |  |  | What selling one back pays, or null. |

### Restock

Type. Explained in [Shop](/docs/plugins/shop#restock).

When a good's stock comes back: every turn, or every day of the calendar (every turn without one).

```ts shape
import type { Restock } from '@ifloom/plugin-shop'
type Restock = 'turn' | 'day'
```

### Sellable

Type. Explained in [Shop](/docs/plugins/shop#sellable).

What the `shop/sellable` trait holds: what one is worth, by stat.

```ts shape
import type { Sellable } from '@ifloom/plugin-shop'
type Sellable = {
  price: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `price` | `Record<string, number>` |  |  | What one costs, by stat: `{ coins: 4 }`. A good's own `price` is used over it. |

### sellableOf

Function. Explained in [Shop](/docs/plugins/shop#sellableof).

What a thing is worth, by stat, when nobody says otherwise: its `shop/sellable` trait's price.

```ts shape
import { sellableOf } from '@ifloom/plugin-shop'
function sellableOf(state: GameState, game: Game, ref: EntityRef): Sellable | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref), [`Sellable`](#sellable).

### shop

Function. Explained in [Shop](/docs/plugins/shop#shop).

The plugin, with its helpers on it: `shop()` makes the plugin for the
game's `plugins`, and content is written with `shop.vendor({ ... })` and `shop.buy('counter', 'food:bun')`.

```ts shape
import { shop } from '@ifloom/plugin-shop'
function shop(): DefinedPlugin<ShopState, ShopView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`ShopState`](#shopstate), [`ShopView`](#shopview).

| Helper | Signature | Description |
|---|---|---|
| `shop.vendor` | `(def:` [`VendorDef`](#vendordef)`):` [`EntityDef`](/docs/api/engine#entitydef) |  |
| `shop.vendorRef` | `(vendor: string):` [`EntityRef`](/docs/api/engine#entityref) |  |
| `shop.sellable` | `(price: Record<string, number>): { 'shop/sellable':` [`Sellable`](#sellable) `}` |  |
| `shop.buy` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`, count?: number):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `shop.sell` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`, count?: number):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `shop.open` | `(vendor: string):` [`Effect`](/docs/api/engine#effect) |  |
| `shop.vendorOpen` | `(vendor: string):` [`Condition`](/docs/api/engine#condition) |  |
| `shop.inStock` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`):` [`Condition`](/docs/api/engine#condition) |  |
| `shop.outside` | `(...periods: string[]):` [`Condition`](/docs/api/engine#condition) |  |
| `shop.hours` | `(periods: readonly string[], reason?:` [`Reason`](/docs/api/engine#reason)`):` [`Blocked`](/docs/api/engine#blocked) |  |

### ShopState

Type. Explained in [Shop](/docs/plugins/shop#shopstate).

What the plugin keeps in a save. The stock itself is what each vendor holds.

```ts shape
import type { ShopState } from '@ifloom/plugin-shop'
type ShopState = {
  stocked: Record<string, Record<EntityRef, StockRecord>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stocked` | `Record<string, Record<`[`EntityRef`](/docs/api/engine#entityref)`,` [`StockRecord`](#stockrecord)`>>` |  |  | By vendor, then thing: when its stock was last topped up. |

### ShopView

Type. Explained in [Shop](/docs/plugins/shop#shopview).

```ts shape
import type { ShopView } from '@ifloom/plugin-shop'
type ShopView = {
  vendors: VendorView[]
  panel: VendorView | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `vendors` | [`VendorView[]`](#vendorview) |  |  | Every vendor, in the order the game declares them. |
| `panel` | [`VendorView`](#vendorview) `\| null` |  |  | The vendor whose counter the open `shop` panel shows, by its `with.vendor`, or null while no `shop` panel is open: what a UI draws in the panel, with no looking up. |

### StockRecord

Type. Explained in [Shop](/docs/plugins/shop#stockrecord).

When a vendor's stock of a good was last topped up: the turn or day it
restocks on, or 0 for a good that never does. `left` is a count an older
save carried in, not yet written to what the vendor holds.

```ts shape
import type { StockRecord } from '@ifloom/plugin-shop'
type StockRecord = {
  at: number
  left?: number
}
```

### Vendor

Type. Explained in [Shop](/docs/plugins/shop#vendor-1).

What the `shop/vendor` trait holds: what makes an entity a vendor the
player buys from. Its name is the entity's: "The counter".

```ts shape
import type { Vendor } from '@ifloom/plugin-shop'
type Vendor = {
  blocked?: Blocked[]
  goods: GoodDef[]
  buysBack?: number
  discounts?: DiscountDef
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | Refused while one of these holds, with its reason: what buying and selling are refused with, the first that holds winning. An entry with `hide` says where the vendor is: while it holds, the vendor isn't `here` (`places.onlyAt(['cafe'], undefined, { hide: true })`). Any other closes it, its reason what the player reads (`shop.hours(['morning', 'afternoon'])` writes opening hours as one, with the calendar). Open everywhere if left out. |
| `goods` | [`GoodDef[]`](#gooddef) |  |  | What it sells, in the order shown. |
| `buysBack` | `number` | yes |  | The fraction of a thing's price it pays to take one back. It takes nothing back if left out. |
| `discounts` | [`DiscountDef`](#discountdef) | yes |  | Goods marked down each day. None if left out. |

### VendorDef

Type. Explained in [Shop](/docs/plugins/shop#vendordef).

What `shop.vendor()` takes: an entity's fields (its `of` is `'vendor'` if left
out) and the `shop/vendor` trait's, side by side.

```ts shape
import type { VendorDef } from '@ifloom/plugin-shop'
type VendorDef = {
  blocked?: Blocked[]
  goods: GoodDef[]
  buysBack?: number
  discounts?: DiscountDef
  of?: string
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | Refused while one of these holds, with its reason: what buying and selling are refused with, the first that holds winning. An entry with `hide` says where the vendor is: while it holds, the vendor isn't `here` (`places.onlyAt(['cafe'], undefined, { hide: true })`). Any other closes it, its reason what the player reads (`shop.hours(['morning', 'afternoon'])` writes opening hours as one, with the calendar). Open everywhere if left out. |
| `goods` | [`GoodDef[]`](#gooddef) |  |  | What it sells, in the order shown. |
| `buysBack` | `number` | yes |  | The fraction of a thing's price it pays to take one back. It takes nothing back if left out. |
| `discounts` | [`DiscountDef`](#discountdef) | yes |  | Goods marked down each day. None if left out. |
| `of` | `string` | yes |  | Its kind: the plugin's own, `vendor`, if left out. |

### vendorOf

Function. Explained in [Shop](/docs/plugins/shop#vendorsof-vendorof-and-vendorref).

The `shop/vendor` trait of a vendor, named by its id (`'counter'`) or its
reference, with any good that names no thing left out: one content
declares, or one made in play. Undefined for anything else.

```ts shape
import { vendorOf } from '@ifloom/plugin-shop'
function vendorOf(state: GameState, game: Game, ref: string | null | undefined): Vendor | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`Vendor`](#vendor).

### vendorsOf

Function. Explained in [Shop](/docs/plugins/shop#vendorsof-vendorof-and-vendorref).

Every vendor in the game now, as references: every entity with the
`shop/vendor` trait, the ones content declares in its order, then those
made in play.

```ts shape
import { vendorsOf } from '@ifloom/plugin-shop'
function vendorsOf(state: GameState, game: Game): EntityRef[]
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref).

### VendorView

Type. Explained in [Shop](/docs/plugins/shop#vendorview).

A vendor as the UI shows it.

```ts shape
import type { VendorView } from '@ifloom/plugin-shop'
type VendorView = {
  id: string
  ref: EntityRef
  name: string
  here: boolean
  closed: string | null
  buysBack: boolean
  goods: GoodView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | Its id, as `buy` names it: the bare id for one of the `vendor` kind, else its whole reference. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | Its entity: `'vendor:counter'`. |
| `name` | `string` |  |  |  |
| `here` | `boolean` |  |  | Where the player is: refused by none of its `blocked` entries with `hide`. |
| `closed` | `string \| null` |  |  | Why it's closed, its first `blocked` entry without `hide` that holds, in the words `shop/buy` is refused with; null while it's open. |
| `buysBack` | `boolean` |  |  | Takes things back. |
| `goods` | [`GoodView[]`](#goodview) |  |  | The goods on offer now, in the order the vendor lists them. |

## @ifloom/plugin-shop/react

- Functions: [`useShop`](#useshop)
- Constants: [`SHOP_WORDS`](#shop_words), [`ShopCounter`](#shopcounter), [`ShopDialog`](#shopdialog), [`shopUi`](#shopui)
- Types: [`ShopControls`](#shopcontrols), [`ShopCounterProps`](#shopcounterprops), [`ShopDialogProps`](#shopdialogprops)

### SHOP_WORDS

Const.

The shop's words, in English. A game rewords any with `ui.<key>` in its strings: `{ 'ui.buy': 'Get' }`.

```ts shape
import { SHOP_WORDS } from '@ifloom/plugin-shop/react'
const SHOP_WORDS: {
  buy: 'Buy'
  sellFor: 'Sell for {price}'
  stockLeft: '{n} left'
  owned: 'You have {n}'
  percentOff: '{percent}% off'
  noGoods: 'Nothing for sale.'
}
```

### ShopControls

Type.

What `useShop` returns: the shop plugin's view, the vendors where the player is, and its commands.

```ts shape
import type { ShopControls } from '@ifloom/plugin-shop/react'
type ShopControls = {
  vendors: VendorView[]
  panel: VendorView | null
  here: VendorView[]
  buy: (vendor: string, entity: EntityRef, count?: number) => Result<GameState>
  sell: (vendor: string, entity: EntityRef, count?: number) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `vendors` | [`VendorView[]`](#vendorview) |  |  | Every vendor, in the order the game declares them. |
| `panel` | [`VendorView`](#vendorview) `\| null` |  |  | The vendor whose counter the open `shop` panel shows, by its `with.vendor`, or null while no `shop` panel is open: what a UI draws in the panel, with no looking up. |
| `here` | [`VendorView[]`](#vendorview) |  |  | The vendors at the player's location (every vendor, in a game without places): what a layout of your own can show where the player is. |
| `buy` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`, count?: number) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Buy `count` (1 if left out) of a thing, by its reference: sends `shop/buy`, refused with its reason as the buy button says. |
| `sell` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`, count?: number) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sell `count` (1 if left out) of a thing back: sends `shop/sell`. |

### ShopCounter

Const. Explained in [Shop](/docs/plugins/shop#shopcounter).

A vendor's goods: each with its picture and name and a line about it,
today's discount and the full price struck out, how many are left (when
they can run out) and how many the player has, a Buy button
with today's price, and a Sell button with what it pays when the vendor
buys back and the player has one. A greyed-out button says why on it. A
closed vendor says so above its goods.

```ts shape
import { ShopCounter } from '@ifloom/plugin-shop/react'
const ShopCounter: ComponentType<ShopCounterProps>
```

Uses: [`ShopCounterProps`](#shopcounterprops).

### ShopCounterProps

Type.

```ts shape
import type { ShopCounterProps } from '@ifloom/plugin-shop/react'
type ShopCounterProps = {
  vendor: VendorView
  className?: string
}
```

### ShopDialog

Const. Explained in [Shop](/docs/plugins/shop#shopdialog).

The vendor with this id in a dialog, titled with its name and drawn as a `ShopCounter`. Closed while `vendorId` is null or names no vendor.

```ts shape
import { ShopDialog } from '@ifloom/plugin-shop/react'
const ShopDialog: ComponentType<ShopDialogProps>
```

Uses: [`ShopDialogProps`](#shopdialogprops).

### ShopDialogProps

Type.

```ts shape
import type { ShopDialogProps } from '@ifloom/plugin-shop/react'
type ShopDialogProps = {
  vendorId: string | null
  onClose: () => void
}
```

### shopUi

Const. Explained in [Shop](/docs/plugins/shop#shopui).

The shop's React UI, for `plugins` on `mountGame` or `GameProvider`: the
`shop` panel, which `shop.open(vendor)` opens, drawn as that vendor's
`ShopCounter` and titled with its name, and the shop's words. The shop puts
nothing in the layout by itself: content opens a vendor.

```ts shape
import { shopUi } from '@ifloom/plugin-shop/react'
const shopUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useShop

Function. Explained in [Shop](/docs/plugins/shop#useshop).

The shop plugin's view with its commands, or null in a game without the plugin. `ShopDialog`, `ShopCounter` and the `shop` panel are drawn from it.

```ts shape
import { useShop } from '@ifloom/plugin-shop/react'
function useShop(): ShopControls | null
```

Uses: [`ShopControls`](#shopcontrols).
