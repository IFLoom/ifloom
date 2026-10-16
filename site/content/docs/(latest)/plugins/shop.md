---
title: "Shop"
description: "Vendors that sell items for any spendable stat, with limited stock, restocking, selling back and seeded daily discounts."
---
`@ifloom/plugin-shop` adds vendors the player buys from and sells back to. A vendor sells items for prices in any of your [spendable stats](/docs/reference/stats#statdef), such as coins, energy or both. A good can have limited stock that comes back each turn or each day. A vendor can take items back for part of their price, and mark a few goods down each day.

```ts
import {
  shop, buy, sell, vendorOpen, inStock,
  vendorDefs, shopView,
  type VendorDef, type GoodDef, type DiscountDef, type Restock,
  type ShopState, type SoldRecord, type ShopView, type VendorView, type GoodView,
} from '@ifloom/plugin-shop'
```

The plugin has no UI of its own. You can put its `buy` commands on any button, such as a location's actions, and the button shows the price and greys out with the reason as an activity's does. For a shop screen, its view lists every vendor and their goods, and [Building UI for plugins](/docs/guide/plugin-ui#a-shop-counter) builds one.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-shop": "0.0.0"
  }
}
```

Then add `shop()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

The plugin works on its own. It cooperates with the [calendar](/docs/plugins/calendar) and [places](/docs/plugins/places) when the game has them:

- **Calendar.** A vendor's `hours` are the calendar's periods, and "a day" for restocking and discounts is the calendar's day.
- **Places.** A vendor's `at` lists the locations it stands at, and the player can only buy there.

Without the calendar, a vendor with `hours` is always open and a day is a turn. Without places, a vendor with `at` is everywhere.

## shop

```ts
function shop(): DefinedPlugin<ShopState>
```

Builds the plugin, with the id `shop`. Nothing has been sold in a new game.

## Writing vendors

Vendors are content. They go in a pack's [`data`](/docs/reference/loader#pack) under `shop.vendors`, and are merged by id, so a mod can add a vendor or replace one. This is the showcase's café counter:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { buy, type VendorDef } from '@ifloom/plugin-shop'

const counter: VendorDef = {
  id: 'counter',
  name: 'The counter',
  at: ['cafe'],
  hours: ['morning', 'afternoon'],
  buysBack: 0.5,
  discounts: { off: 0.5 },
  goods: [
    { item: 'sandwich', price: { coins: 4 } },
    { item: 'flapjack', price: { coins: 2 }, stock: 2, restock: 'day' },
  ],
}

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'coins', label: 'Coins', start: 12, max: 999, spendable: true, format: '{n} coins' }],
  items: [
    { id: 'sandwich', name: 'sandwich', desc: 'Cheese and pickle.', kind: 'stuff' },
    { id: 'flapjack', name: 'flapjack', desc: 'Oats and syrup.', kind: 'stuff' },
  ],
  data: { shop: { vendors: [counter] } },
}

// A button for a location's actions, or anywhere else a button goes.
const button = { id: 'flapjack', label: 'Buy a flapjack', command: buy('counter', 'flapjack') }
```

### VendorDef

```ts
type VendorDef = {
  id: string
  name: string
  at?: string[]
  hours?: string[]
  open?: Condition
  closed?: string
  goods: GoodDef[]
  buysBack?: number
  discounts?: DiscountDef
}
```

| Field | What it is |
|---|---|
| `id` | Unique among vendors. Commands name the vendor by it. |
| `name` | What the player reads, such as "The counter". |
| `at` | The [places](/docs/plugins/places) locations it stands at. Checked when the game has places. Everywhere if left out. |
| `hours` | The [calendar](/docs/plugins/calendar)'s periods it's open in, such as `['morning', 'afternoon']`. Always open if left out. |
| `open` | A [condition](/docs/reference/conditions) it's only open while, on top of `hours`, such as `weekday(0, 1, 2, 3, 4)`. |
| `closed` | What the player reads while it's closed. `Closed.` (the [`shop/closed`](#strings) string) if left out. |
| `goods` | What it sells, in the order it lists them. |
| `buysBack` | The fraction of an item's price it pays to take one back, from 0 to 1. It takes nothing back if left out. |
| `discounts` | Goods marked down each day. See [Discounts](#discounts). |

### GoodDef

```ts
type GoodDef = {
  item: string
  price: Record<string, number>
  stock?: number
  restock?: Restock
  when?: Condition
}
type Restock = 'turn' | 'day'
```

| Field | What it is |
|---|---|
| `item` | The [item](/docs/reference/game#itemdef) it sells, by id. A vendor sells each item once. |
| `price` | What one costs, by stat, such as `{ coins: 4 }` or `{ coins: 2, energy: 5 }`. Each stat should be spendable. |
| `stock` | How many there are. No limit if left out. |
| `restock` | When the stock comes back in full: every `'turn'`, or every `'day'` (the calendar's day, or a turn without it). Never, if left out. |
| `when` | Offered only while this holds. Otherwise the vendor doesn't list it, and buying it is refused as if it weren't for sale. |

### Discounts

```ts
type DiscountDef = { off: number; count?: number }
```

Each day, `count` of the vendor's goods (1 if left out) are marked down by `off`, a fraction such as `0.25`. Which ones is drawn from the save's [seed](/docs/reference/state#seed), the vendor and the day, so it's the same every time the player looks that day, on every replay of the save, and a reload can't re-roll it. A good's price is rounded to the nearest whole number after the discount.

## Buying and selling

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'shop/buy', with: { vendor, item, count? } }` | `buy(vendor, item, count?)` | Pays today's price for `count` of the item (1 if left out) and gives them to the player. |
| `{ type: 'custom', name: 'shop/sell', with: { vendor, item, count? } }` | `sell(vendor, item, count?)` | Takes `count` of the item from the player and pays the vendor's `buysBack` fraction of its full price, rounded down per item. A limited good goes back into stock. |

Paying applies a [`stat`](/docs/reference/effects#stat) effect for each stat, so the game's `rules.onStat` sees it, then an [`item`](/docs/reference/effects#item) effect.

`shop/buy` is refused with the first of these that applies:

1. `That isn’t for sale here.` for a vendor or item that doesn't exist, or a good whose `when` doesn't hold.
2. `You aren’t at that shop.` when the game has places and the player isn't at one of the vendor's `at`.
3. The vendor's `closed` line, or `Closed.`, outside its `hours` or while its `open` doesn't hold.
4. `Sold out.` when there are fewer left than `count`.
5. The stat's own [`lacking`](/docs/reference/stats#statdef) line when the player has too little of it, such as `You need 4 coins.`

`shop/sell` is refused the same way, except it says `They don’t buy things back.` for a vendor with no `buysBack`, and `You don’t have that.` when the player has fewer than `count`.

Both are refused by [locks](/docs/reference/locks) like any command, and a lock can name them as `shop/buy` or `shop/*`.

### On a button

A button that sends `shop/buy` shows its price, because the command tells the engine what it spends (a plugin command's [`spends`](/docs/reference/plugins#plugincommand)). The price is today's, discount included, written through each stat's `format`. The button greys out with the same reason the command is refused with. So on the places map, a location's action is enough:

```ts
import { type ActionDef } from '@ifloom/engine'
import { buy } from '@ifloom/plugin-shop'

const actions: ActionDef[] = [
  { id: 'sandwich', label: 'Buy a sandwich for later', command: buy('counter', 'sandwich') },
  { id: 'flapjack', label: 'Buy a flapjack', command: buy('counter', 'flapjack') },
]
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'shop/open', with: { vendor } }` | `vendorOpen(vendor)` | The vendor is open now. Where the player is doesn't matter. |
| `{ custom: 'shop/inStock', with: { vendor, item } }` | `inStock(vendor, item)` | The vendor offers the item now and has at least one left. |

An unknown vendor or item is false.

## Strings

| Key | English |
|---|---|
| `shop/unknown` | `That isn’t for sale here.` |
| `shop/notHere` | `You aren’t at that shop.` |
| `shop/closed` | `Closed.` |
| `shop/soldOut` | `Sold out.` |
| `shop/noBuyBack` | `They don’t buy things back.` |
| `shop/notOwned` | `You don’t have that.` |

## The view

`view(state, game).plugins.shop` is a `ShopView`. Each good carries ready-made buttons, built with the engine's [`renderAction`](/docs/reference/view#renderaction), so a UI draws them like any other button.

### ShopView

```ts
type ShopView = { vendors: VendorView[] }
```

Every vendor, in the order the game declares them. A UI usually shows the ones that are `here`.

### VendorView

```ts
type VendorView = {
  id: string
  name: string
  here: boolean
  open: boolean
  closed: string | null
  buysBack: boolean
  goods: GoodView[]
}
```

| Field | What it is |
|---|---|
| `here` | The player is at one of its `at`, or it has none, or the game has no places plugin. |
| `open`, `closed` | Whether it's open, and if not, why, in the words `shop/buy` would be refused with. |
| `buysBack` | It takes things back. |
| `goods` | The goods on offer now. A good whose `when` doesn't hold isn't listed. |

### GoodView

```ts
type GoodView = {
  item: string
  name: string
  stock: number | null
  owned: number
  off: number
  fullPrice: Price | null
  buy: RenderedChoice
  sell: RenderedChoice | null
  sellFor: Price | null
}
```

| Field | What it is |
|---|---|
| `name` | The item's name. |
| `stock` | How many are left, or `null` for no limit. |
| `owned` | How many the player has. |
| `off` | The fraction off today, or `0`. |
| `fullPrice` | The price before today's discount, as a [`Price`](/docs/reference/view#price), or `null` when there's no discount. |
| `buy` | The button that buys one: `label` (the item's name), `price` (today's), `disabled` (why not, if it can't be bought), `warning` and `command`. |
| `sell` | The button that sells one back, or `null` for a vendor that takes nothing back. |
| `sellFor` | What selling one back pays, or `null`. |

## The state

### ShopState

```ts
type ShopState = { sold: Record<string, Record<string, SoldRecord>> }
type SoldRecord = { n: number; at: number }
```

What the plugin keeps in a save, at `state.plugins.shop`. For each vendor and limited good, it's how many have gone (`n`) and the turn or day that count belongs to (`at`). When the turn or day moves on past `at`, the good is back in full stock without anything having to run. A save from before the plugin was added loads with everything in stock.

## For code

### Helpers

```ts
const buy: (vendor: string, item: string, count?: number) => Command
const sell: (vendor: string, item: string, count?: number) => Command
const vendorOpen: (vendor: string) => Condition
const inStock: (vendor: string, item: string) => Condition
```

### vendorDefs

```ts
function vendorDefs(game: Game): VendorDef[]
```

The game's vendors, merged from its packs: `game.data.shop.vendors`.

### shopView

```ts
function shopView(state: GameState, slice: ShopState, cx: Pick<PluginContext<ShopState>, 'game' | 'query'>): ShopView
```

The `ShopView` for a state. The plugin's view is `shopView(state, slice, context)`. It needs the context's `query` to ask the calendar and places.

## Checks

When the game loads, the plugin reports these problems against the pack each vendor came from, with `where` as `vendors <id>`:

- An unknown item, or a price in an unknown stat (`good sandwich: unknown stat "gold"`).
- A price in a stat that isn't `spendable`, or is derived.
- A negative price or stock, or `restock` on a good with no `stock`.
- The same item twice (`sells "…" twice`).
- `buysBack` outside 0 to 1, or a `discounts.off` that isn't more than 0 and at most 1.
- Anything `open` or a good's `when` names that the game doesn't have.
- An unknown location in `at`, when the game has places.

A command that names a vendor or item the game doesn't have gives `unknown vendor "…"` or `unknown item "…"` where it's written.

## Gotchas

- **The calendar's `hours` and the places map's opening hours are separate.** A location's [`locked`](/docs/plugins/places#locationdef) stops the player getting in; a vendor's `hours` stops it selling. The showcase sets both, so the café and its counter close together.
- **A vendor's `hours` are asked of the calendar.** They're period ids, not a condition. For days of the week, add `open: weekday(…)`.
- **The price on a button is today's.** A discount drawn for today changes the price on the button, and tomorrow it may be back to full.
- **Selling back pays from the full price,** not today's discounted one.
