---
title: "@ifloom/plugin-shop"
description: "Every export of @ifloom/plugin-shop and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-shop` and `@ifloom/plugin-shop/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-shop

- Functions: [`sellableOf`](#sellableof), [`shop`](#shop), [`vendorOf`](#vendorof), [`vendorsOf`](#vendorsof)
- Types: [`DiscountDef`](#discountdef), [`GoodDef`](#gooddef), [`GoodView`](#goodview), [`Restock`](#restock), [`Sellable`](#sellable), [`ShopOptions`](#shopoptions), [`ShopState`](#shopstate), [`ShopView`](#shopview), [`Stock`](#stock), [`StockRecord`](#stockrecord), [`Vendor`](#vendor), [`VendorDef`](#vendordef), [`VendorView`](#vendorview)

### DiscountDef

Type. Explained in [Shop](/docs/reference/plugins/shop#discountdef).

A vendor's daily discounts, which the game declares in its `discounts`. The vendor marks `count` goods down each day, drawn from the save's seed.

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
| `count` | `number` | yes |  | The number of goods marked down each day. 1 if left out. |

### GoodDef

Type. Explained in [Shop](/docs/reference/plugins/shop#gooddef).

A good the game declares in a vendor's `goods`, a thing the vendor sells with its price and stock.

```ts shape
import type { GoodDef } from '@ifloom/plugin-shop'
type GoodDef = {
  entity: EntityRef
  price?: Record<string, number>
  stock?: Stock
  restock?: Restock
  when?: Condition
  deliver?: false | string
  onBuy?: EffectRef[]
  onSell?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `entity` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The reference of the thing sold, such as `'food:apple'`. A game that keeps things in kv keys declares a light entity, a name and no traits. |
| `price` | `Record<string, number>` | yes |  | The price of one, by stat, such as `{ coins: 4 }`, each stat spendable. The thing's `shop/sellable` price if left out. |
| `stock` | [`Stock`](#stock) | yes |  | The number the vendor has, which `restock` tops back up to, or `'unlimited'`, or `'once'` for one sale only. `'once'` suits upgrades and unique things. `'unlimited'` if left out, or `'once'` for a unique thing. |
| `restock` | [`Restock`](#restock) | yes |  | The interval a number `stock` is topped back up at. Never if left out. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | The condition that must hold for the good to be on offer. |
| `deliver` | `false \| string` | yes |  | The plugin a purchase goes to, or `false` to give nothing, so the purchase is only its `onBuy`, such as a kv flag. A plugin's id gives it to that plugin's receiver, as a `receive`'s `via` does. To whichever plugin that keeps things claims it first if left out. |
| `onBuy` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | Effects that run for each one bought, after it's given, with `'$'` as the thing, such as `[{ kv: 'kitchen.coffeeMachine', to: true }]`. |
| `onSell` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | Effects that run for each one sold back, after it's taken, with `'$'` as the thing. |

### GoodView

Type. Explained in [Shop](/docs/reference/plugins/shop#goodview).

A good as the player sees it, in a `VendorView`'s `goods`.

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
| `entity` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The reference of the thing sold, such as `'food:apple'`. |
| `name` | `string` |  |  | The thing's name. |
| `description` | `string \| null` |  |  | The thing's description, or null when it has none. |
| `image` | `string \| null` |  |  | The path of the thing's picture through `artSrc`, or null when it has none. |
| `stock` | `number \| null` |  |  | The number the vendor has left, or null when the good never runs out. |
| `owned` | `number` |  |  | The number of this thing the player owns, across the plugins that keep things. |
| `off` | `number` |  |  | The fraction off today, or 0. |
| `fullPrice` | [`Price`](/docs/api/engine#price) `\| null` |  |  | The price before today's discount, or null when there is no discount. |
| `buy` | [`RenderedChoice`](/docs/api/engine#renderedchoice) |  |  | The button that buys one, with its price and any reason it's disabled. Its `command` is the one to send. |
| `sell` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that sells one back, or null when the vendor buys nothing back. |
| `sellFor` | [`Price`](/docs/api/engine#price) `\| null` |  |  | The price the vendor pays to buy one back, or null when it buys nothing back. |

### Restock

Type. Explained in [Shop](/docs/reference/plugins/shop#restock).

The interval a good's stock is topped up at, every turn or every calendar day. `'day'` means every turn in a game without the calendar.

```ts shape
import type { Restock } from '@ifloom/plugin-shop'
type Restock = 'turn' | 'day'
```

### Sellable

Type. Explained in [Shop](/docs/reference/plugins/shop#sellable).

The data of the `shop/sellable` trait, a thing's price wherever a vendor sells it without a price of its own.

```ts shape
import type { Sellable } from '@ifloom/plugin-shop'
type Sellable = {
  price: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `price` | `Record<string, number>` |  |  | The price of one, by stat, such as `{ coins: 4 }`. A good's own `price` overrides it. |

### sellableOf

Function. Explained in [Shop](/docs/reference/plugins/shop#sellableof).

Returns a thing's `shop/sellable` trait, its price where a good gives none. Returns undefined for a thing without the trait.

```ts shape
import { sellableOf } from '@ifloom/plugin-shop'
function sellableOf(state: GameState, game: Game, ref: EntityRef): Sellable | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref), [`Sellable`](#sellable).

### shop

Function. Explained in [Shop](/docs/reference/plugins/shop#shop).

The shop plugin's factory, with its helpers as properties. `shop()` returns the plugin for the game's `plugins`, and
content calls helpers such as `shop.vendor({ ... })` and `shop.buy('counter', 'food:bun')`.

```ts shape
import { shop } from '@ifloom/plugin-shop'
function shop(options?: ShopOptions): DefinedPlugin<ShopState, ShopView>
```

Uses: [`ShopOptions`](#shopoptions), [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`ShopState`](#shopstate), [`ShopView`](#shopview).

| Helper | Signature | Description |
|---|---|---|
| `shop.vendor` | `(def:` [`VendorDef`](#vendordef)`):` [`EntityDef`](/docs/api/engine#entitydef) | Returns a vendor for content's `entities`, an entity with the `shop/vendor` trait, from the entity's fields and the trait's. |
| `shop.vendorRef` | `(vendor: string):` [`EntityRef`](/docs/api/engine#entityref) | Returns the entity reference of a vendor; a bare id is one of the `vendor` kind. |
| `shop.sellable` | `(price: Record<string, number>): { 'shop/sellable':` [`Sellable`](#sellable) `}` | Returns the `shop/sellable` trait, to spread into an entity's or a kind's `traits`. |
| `shop.buy` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`, count?: number):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `shop/buy` command, which buys `count` of a thing from a vendor, 1 if left out. |
| `shop.sell` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`, count?: number):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `shop/sell` command, which sells `count` of a thing back to a vendor, 1 if left out. |
| `shop.open` | `(vendor: string):` [`Effect`](/docs/api/engine#effect) | Returns the effect that opens the vendor's counter in the `shop` panel. |
| `shop.vendorOpen` | `(vendor: string):` [`Condition`](/docs/api/engine#condition) | Returns the `shop/open` condition, which holds while the vendor is open, wherever the player is. |
| `shop.inStock` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`):` [`Condition`](/docs/api/engine#condition) | Returns the `shop/inStock` condition, which holds while the vendor offers the thing and has one left. |
| `shop.outside` | `(...periods: string[]):` [`Condition`](/docs/api/engine#condition) | Returns the `shop/outside` condition, which holds while the calendar's period is none of these. |
| `shop.hours` | `(periods: readonly string[], reason?:` [`Reason`](/docs/api/engine#reason)`):` [`Blocked`](/docs/api/engine#blocked) | Returns a `blocked` entry for a vendor's opening hours, which closes it outside these calendar periods. |

### ShopOptions

Type. Explained in [Shop](/docs/reference/plugins/shop#shopoptions).

The shop plugin's settings, which the game passes to `shop()`.

```ts shape
import type { ShopOptions } from '@ifloom/plugin-shop'
type ShopOptions = {
  onBuy?: EffectRef[]
  onSell?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `onBuy` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | Effects that run for each one of anything bought from any vendor, after the good's and the vendor's, with `'$'` as the thing. |
| `onSell` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | Effects that run for each one of anything sold back to any vendor, after the good's and the vendor's, with `'$'` as the thing. |

### ShopState

Type. Explained in [Shop](/docs/reference/plugins/shop#shopstate).

The stock a save keeps for the vendors, only the goods play changed. The plugin reads the goods from content.

```ts shape
import type { ShopState } from '@ifloom/plugin-shop'
type ShopState = {
  stock: Record<string, Record<EntityRef, StockRecord>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stock` | `Record<string, Record<`[`EntityRef`](/docs/api/engine#entityref)`,` [`StockRecord`](#stockrecord)`>>` |  |  | The number of each limited good each vendor has left, by vendor and then by thing. |

### ShopView

Type. Explained in [Shop](/docs/reference/plugins/shop#shopview).

The vendors as the player sees them, in `view.plugins.shop`.

```ts shape
import type { ShopView } from '@ifloom/plugin-shop'
type ShopView = {
  vendors: VendorView[]
  panel: VendorView | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `vendors` | [`VendorView[]`](#vendorview) |  |  | The game's vendors, in the order the game declares them. |
| `panel` | [`VendorView`](#vendorview) `\| null` |  |  | The vendor the open `shop` panel shows, named by its `with.vendor`, or null while no `shop` panel is open. A UI renders it in the panel as it is. |

### Stock

Type. Explained in [Shop](/docs/reference/plugins/shop#stock).

The number of a good a vendor has, which `restock` tops back up, or `'unlimited'`, or `'once'` for a single sale.

```ts shape
import type { Stock } from '@ifloom/plugin-shop'
type Stock = number | 'unlimited' | 'once'
```

### StockRecord

Type. Explained in [Shop](/docs/reference/plugins/shop#stockrecord).

The record a save keeps of one good's stock once play changed it, in `ShopState`'s `stock`.

```ts shape
import type { StockRecord } from '@ifloom/plugin-shop'
type StockRecord = {
  left: number
  at: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `left` | `number` |  |  | The number the vendor had left then. |
| `at` | `number` |  |  | The turn or day it was written on, which a `restock` compares with now, or 0 for a good that never restocks. |

### Vendor

Type. Explained in [Shop](/docs/reference/plugins/shop#vendor).

The data of the `shop/vendor` trait, which makes an entity a vendor the player buys from. The vendor's name, such as "The counter", is the entity's.

```ts shape
import type { Vendor } from '@ifloom/plugin-shop'
type Vendor = {
  blocked?: Blocked[]
  goods: GoodDef[]
  buysBack?: number
  discounts?: DiscountDef
  onBuy?: EffectRef[]
  onSell?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | The reasons the vendor refuses to trade. The first entry that holds gives the reason, and the vendor is open everywhere if left out. While an entry with `hide` holds, the vendor isn't `here`, as with `places.onlyAt(['cafe'], undefined, { hide: true })`. Any other entry closes the vendor with its reason, as the opening hours `shop.hours(['morning', 'afternoon'])` writes do. |
| `goods` | [`GoodDef[]`](#gooddef) |  |  | The vendor's goods, in the order shown. |
| `buysBack` | `number` | yes |  | The fraction of a good's full price the vendor pays to buy one back. It buys nothing back if left out. |
| `discounts` | [`DiscountDef`](#discountdef) | yes |  | The vendor's daily discounts. None if left out. |
| `onBuy` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | Effects that run for each one of any good bought from the vendor, after the good's own, with `'$'` as the thing. |
| `onSell` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | Effects that run for each one of any good sold back to the vendor, after the good's own, with `'$'` as the thing. |

### VendorDef

Type. Explained in [Shop](/docs/reference/plugins/shop#vendordef).

A vendor the game declares in `entities` with `shop.vendor()`. It has an entity's fields and the `shop/vendor` trait's side by side.

```ts shape
import type { VendorDef } from '@ifloom/plugin-shop'
type VendorDef = {
  blocked?: Blocked[]
  goods: GoodDef[]
  buysBack?: number
  discounts?: DiscountDef
  onBuy?: EffectRef[]
  onSell?: EffectRef[]
  of?: string
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | The reasons the vendor refuses to trade. The first entry that holds gives the reason, and the vendor is open everywhere if left out. While an entry with `hide` holds, the vendor isn't `here`, as with `places.onlyAt(['cafe'], undefined, { hide: true })`. Any other entry closes the vendor with its reason, as the opening hours `shop.hours(['morning', 'afternoon'])` writes do. |
| `goods` | [`GoodDef[]`](#gooddef) |  |  | The vendor's goods, in the order shown. |
| `buysBack` | `number` | yes |  | The fraction of a good's full price the vendor pays to buy one back. It buys nothing back if left out. |
| `discounts` | [`DiscountDef`](#discountdef) | yes |  | The vendor's daily discounts. None if left out. |
| `onBuy` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | Effects that run for each one of any good bought from the vendor, after the good's own, with `'$'` as the thing. |
| `onSell` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | Effects that run for each one of any good sold back to the vendor, after the good's own, with `'$'` as the thing. |
| `of` | `string` | yes |  | The vendor's kind. The plugin's own kind, `vendor`, if left out. |

### vendorOf

Function. Explained in [Shop](/docs/reference/plugins/shop#vendorof).

Returns the `shop/vendor` trait of a vendor, named by its id (`'counter'`) or reference, without any good that names
no thing. Returns undefined for anything that isn't a vendor.

```ts shape
import { vendorOf } from '@ifloom/plugin-shop'
function vendorOf(state: GameState, game: Game, ref: string | null | undefined): Vendor | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`Vendor`](#vendor).

### vendorsOf

Function. Explained in [Shop](/docs/reference/plugins/shop#vendorsof).

Returns the references of every vendor in the game now, each entity with the `shop/vendor` trait. Those content
declares come first in its order, then those made in play.

```ts shape
import { vendorsOf } from '@ifloom/plugin-shop'
function vendorsOf(state: GameState, game: Game): EntityRef[]
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref).

### VendorView

Type. Explained in [Shop](/docs/reference/plugins/shop#vendorview).

A vendor as the player sees it, in `view.plugins.shop.vendors`.

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
| `id` | `string` |  |  | The vendor's id as `shop.buy` names it, the bare id for one of the `vendor` kind, else its full reference. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The vendor's entity reference, such as `'vendor:counter'`. |
| `name` | `string` |  |  | The vendor's name. |
| `here` | `boolean` |  |  | True while none of the vendor's `blocked` entries with `hide` holds, so the vendor is where the player is. |
| `closed` | `string \| null` |  |  | The reason the vendor is closed, from its first `blocked` entry without `hide` that holds, or null while it's open. |
| `buysBack` | `boolean` |  |  | True when the vendor buys things back. |
| `goods` | [`GoodView[]`](#goodview) |  |  | The goods on offer now, in the order the vendor lists them. |

## @ifloom/plugin-shop/react

- Functions: [`useShop`](#useshop)
- Constants: [`SHOP_WORDS`](#shop_words), [`ShopCounter`](#shopcounter), [`ShopDialog`](#shopdialog), [`shopUi`](#shopui)
- Types: [`ShopControls`](#shopcontrols), [`ShopCounterProps`](#shopcounterprops), [`ShopDialogProps`](#shopdialogprops)

### SHOP_WORDS

Const. Explained in [Shop](/docs/reference/plugins/shop#shop_words).

The shop plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings, such as `{ 'ui.buy': 'Get' }`.

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

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `buy` | `'Buy'` |  |  | The label of a good's buy button. |
| `sellFor` | `'Sell for {price}'` |  |  | The label of a good's sell button, with its `{price}`. |
| `stockLeft` | `'{n} left'` |  |  | The count of a good the vendor has left, with `{n}`. |
| `owned` | `'You have {n}'` |  |  | The count of a good the player holds, with `{n}`. |
| `percentOff` | `'{percent}% off'` |  |  | The badge on a good with today's discount, with its `{percent}`. |
| `noGoods` | `'Nothing for sale.'` |  |  | The line a vendor's counter shows while it has no goods. |

### ShopControls

Type. Explained in [Shop](/docs/reference/plugins/shop#shopcontrols).

The shop plugin's view with the vendors here and functions that send its commands, as `useShop` returns it.

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
| `vendors` | [`VendorView[]`](#vendorview) |  |  | The game's vendors, in the order the game declares them. |
| `panel` | [`VendorView`](#vendorview) `\| null` |  |  | The vendor the open `shop` panel shows, named by its `with.vendor`, or null while no `shop` panel is open. A UI renders it in the panel as it is. |
| `here` | [`VendorView[]`](#vendorview) |  |  | The vendors whose `here` is true, for a layout of your own to show. |
| `buy` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`, count?: number) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `shop/buy` for `count` of a thing, 1 if left out. A refusal carries the same reason the buy button shows. |
| `sell` | `(vendor: string, entity:` [`EntityRef`](/docs/api/engine#entityref)`, count?: number) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `shop/sell` for `count` of a thing, 1 if left out. |

### ShopCounter

Const. Explained in [Shop](/docs/reference/plugins/shop#shopcounter).

Renders a vendor's goods from a `VendorView`, each with its picture, name, price, stock and a buy button. A
sell button shows when the vendor buys back and the player holds one.

Each good also shows its description, today's discount and how many the player holds.
A disabled button shows its reason, and a closed vendor shows its reason above its goods. A preset can style the
parts `shop`, `shop-closed`, `shop-empty`, `goods`, `good`, `good-name`, `good-desc`, `good-image`, `good-details`,
`good-off`, `good-full-price`, `good-stock`, `good-owned` and `good-actions`.

```ts shape
import { ShopCounter } from '@ifloom/plugin-shop/react'
const ShopCounter: ComponentType<ShopCounterProps>
```

Uses: [`ShopCounterProps`](#shopcounterprops).

### ShopCounterProps

Type.

Props for `ShopCounter`.

```ts shape
import type { ShopCounterProps } from '@ifloom/plugin-shop/react'
type ShopCounterProps = {
  vendor: VendorView
  className?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `vendor` | [`VendorView`](#vendorview) |  |  | The vendor to render, from `view.plugins.shop`. |
| `className` | `string` | yes |  | The class added to the counter's root. |

### ShopDialog

Const. Explained in [Shop](/docs/reference/plugins/shop#shopdialog).

Renders the vendor with this id from `view.plugins.shop.vendors` as a `ShopCounter` in a dialog titled with its name.
The dialog is closed while `vendorId` is null or names no vendor.

```ts shape
import { ShopDialog } from '@ifloom/plugin-shop/react'
const ShopDialog: ComponentType<ShopDialogProps>
```

Uses: [`ShopDialogProps`](#shopdialogprops).

### ShopDialogProps

Type.

Props for `ShopDialog`.

```ts shape
import type { ShopDialogProps } from '@ifloom/plugin-shop/react'
type ShopDialogProps = {
  vendorId: string | null
  onClose: () => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `vendorId` | `string \| null` |  |  | The id of the vendor to show, or null to keep the dialog closed. |
| `onClose` | `() => void` |  |  | The function the dialog calls when the player closes it. |

### shopUi

Const. Explained in [Shop](/docs/reference/plugins/shop#shopui).

The shop plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `shop` panel, which
`shop.open(vendor)` opens, as that vendor's `ShopCounter` titled with its name, and adds the plugin's words.

It adds nothing to the layout, so a counter shows only when content opens one.

```ts shape
import { shopUi } from '@ifloom/plugin-shop/react'
const shopUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useShop

Function. Explained in [Shop](/docs/reference/plugins/shop#useshop).

Returns the shop plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useShop } from '@ifloom/plugin-shop/react'
function useShop(): ShopControls | null
```

Uses: [`ShopControls`](#shopcontrols).
