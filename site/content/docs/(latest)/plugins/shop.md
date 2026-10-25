---
title: "Shop"
description: "Vendors that sell things for any spendable stat, with stock the vendor holds, restocking, selling back and seeded daily discounts."
---
`@ifloom/plugin-shop` adds vendors the player buys from and sells back to. What a vendor sells are [entities](/docs/reference/entities), things the player then holds, for prices in any of your [spendable stats](/docs/reference/stats#statdef), such as coins, energy or both. A good never runs out unless you give it a stock, which the vendor holds and can get back each turn or each day. A vendor can take things back for part of their price, and mark a few goods down each day.

```ts
import {
  shop, buy, sell, vendorOpen, inStock, openShop, sellable,
  vendorDefs, vendorRef, sellableOf, shopView,
  type VendorDef, type GoodDef, type DiscountDef, type Restock, type Sellable,
  type ShopState, type StockRecord, type ShopView, type VendorView, type GoodView,
} from '@ifloom/plugin-shop'
```

The plugin's engine side draws nothing: its React UI is a [subpath of its own](#the-react-ui), and any UI can draw it. You can put its `buy` commands on any button, such as a location's actions, and the button shows the price and greys out with the reason as any action's does. For a shop screen, its view lists every vendor and their goods, and [Building UI for plugins](/docs/recipes/plugin-ui#a-shop-counter) builds one.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-shop": "^0.0.0"
  }
}
```

Then add `shop()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

The plugin works on its own, and needs neither the [inventory](/docs/plugins/inventory) nor the [wardrobe](/docs/plugins/wardrobe): what it sells is held by the engine. It cooperates with the [calendar](/docs/plugins/calendar) and [places](/docs/plugins/places) when the game has them:

- **Calendar.** A vendor's `hours` are the calendar's periods, and "a day" for restocking and discounts is the calendar's day.
- **Places.** A vendor's `at` lists the locations it stands at, and the player can only buy there.

Without the calendar, a vendor with `hours` is always open and a day is a turn. Without places, a vendor with `at` is everywhere.

## shop

```ts
function shop(): DefinedPlugin<ShopState, ShopView>
```

Builds the plugin, with the id `shop`. It brings the `vendor` [kind](/docs/reference/entities#kinddef): unique and unlisted, one entity for each vendor, `'vendor:<id>'`, named as the vendor is. That entity holds the vendor's stock.

## Writing vendors

Vendors are content. They go in your content's [`data`](/docs/reference/loader#content) under `shop.vendors`, and are merged by id, so a mod can add a vendor or replace one. The things they sell are entities of your own kinds. This is a shop on its own, with no other plugin, the showcase's café counter:

```ts
import { holding, type Content } from '@ifloom/engine'
import { buy, sellable, type VendorDef } from '@ifloom/plugin-shop'

const counter: VendorDef = {
  id: 'counter',
  name: 'The counter',
  at: ['cafe'],
  hours: ['morning', 'afternoon'],
  buysBack: 0.5,
  discounts: { off: 0.5 },
  goods: [
    // Never runs out: each one bought is a new sandwich. Its price is its sellable trait's.
    { entity: 'food:sandwich' },
    // Two a day: the counter holds them, and gets two again each morning.
    { entity: 'food:flapjack', price: { coins: 2 }, stock: 2, restock: 'day' },
  ],
}

const town: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12, max: 999, spendable: true, format: '{n} coins' }],
  kinds: [{ id: 'food', label: 'Food', listed: false }],
  entities: [
    { id: 'sandwich', of: 'food', name: 'sandwich', desc: 'Cheese and pickle.', traits: { ...sellable({ coins: 4 }) } },
    { id: 'flapjack', of: 'food', name: 'flapjack', desc: 'Oats and syrup.' },
  ],
  data: { shop: { vendors: [counter] } },
}

// A button for a location's actions, or anywhere else a button goes.
const button = { id: 'flapjack', label: 'Buy a flapjack', command: buy('counter', 'food:flapjack') }
// And a line that changes once you have one.
const line = { text: 'cafe.full', when: holding('food:sandwich') }
```

The kind is unlisted (`listed: false`) because what the player holds already reaches the view as [`view.held`](/docs/reference/view#held), and a list of every food in the game would give the menu away.

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
| `id` | Unique among vendors. Commands name the vendor by it, and its entity is `'vendor:<id>'`. |
| `name` | What the player reads, such as "The counter". Its entity's name too, so prose tokens in it are filled in. |
| `at` | The [places](/docs/plugins/places) locations it stands at. Checked when the game has places. Everywhere if left out. |
| `hours` | The [calendar](/docs/plugins/calendar)'s periods it's open in, such as `['morning', 'afternoon']`. Always open if left out. |
| `open` | A [condition](/docs/reference/conditions) it's only open while, on top of `hours`, such as `weekday(0, 1, 2, 3, 4)`. |
| `closed` | What the player reads while it's closed. `Closed.` (the [`shop/closed`](#strings) string) if left out. |
| `goods` | What it sells, in the order it lists them. |
| `buysBack` | The fraction of a thing's price it pays to take one back, from 0 to 1. It takes nothing back if left out. |
| `discounts` | Goods marked down each day. See [Discounts](#discounts). |

### GoodDef

```ts
type GoodDef = {
  entity: EntityRef
  price?: Record<string, number>
  stock?: number
  restock?: Restock
  when?: Condition
}
type Restock = 'turn' | 'day'
```

| Field | What it is |
|---|---|
| `entity` | The thing it sells, by reference, such as `'food:sandwich'`. It has to be an entity your content declares. A vendor sells each thing once. |
| `price` | What one costs, by stat, such as `{ coins: 4 }` or `{ coins: 2, energy: 5 }`. Each stat should be spendable. The thing's [`shop/sellable`](#the-sellable-trait) price if left out. |
| `stock` | How many the vendor holds. See [Stock](#stock). Never runs out if left out. |
| `restock` | When the vendor's stock comes back up to `stock`: every `'turn'`, or every `'day'` (the calendar's day, or a turn without it). Never, if left out. |
| `when` | Offered only while this holds. Otherwise the vendor doesn't list it, and buying it is refused as if it weren't for sale. |

### Stock

A good with no `stock` never runs out. Buying one gives the player a new one with the [`entity`](/docs/reference/effects#entity) effect, and selling it back takes it away. Nobody holds it in between, so `stock` in the view is `null`.

A good with a `stock` is held by the vendor's entity, as any [holder](/docs/reference/entities#holding-things) holds things:

- The vendor starts with `stock` of it. Content can place more with it too, as with any holder: `at: { 'vendor:market': 3 }` on the thing.
- Buying [`move`](/docs/reference/effects#move)s one from the vendor to the player, and it's sold out when the vendor has none.
- Selling one back moves it from the player to the vendor, so it's for sale again.
- With `restock`, the vendor is topped back up to `stock` each turn or day. It never goes above what it already holds, so selling things back can leave it with more.

So `{ entity: 'food:flapjack', at: 'vendor:counter', gte: 1 }` is a condition on what the counter has left, and an effect can take stock away or add to it. The shop writes a restock to what the vendor holds after the next command; until then the view and `shop/inStock` already count it.

A unique thing is always sold from the vendor's stock, since there's only one of it. Give it `stock: 1`, or start it with the vendor. A restock never takes it back from whoever holds it.

### The sellable trait

```ts
type Sellable = { price: Record<string, number> }
const sellable: (price: Record<string, number>) => { 'shop/sellable': Sellable }
```

A thing's price, for every vendor that lists it without a `price` of its own. It's a [trait](/docs/reference/entities#traits), so you can write it on a kind as a default, on the entity, or in content's `traits` table, where a mod can change it. `sellable` writes it, to spread into `traits`:

```ts
kinds: [{ id: 'fruit', label: 'Fruit', listed: false, traits: { ...sellable({ coins: 1 }) } }],
entities: [
  { id: 'apple', of: 'fruit', name: 'apple' },
  { id: 'fig', of: 'fruit', name: 'fig', traits: { ...sellable({ coins: 3 }) } },
],
```

The checker reports a good with neither a price nor the trait.

### Discounts

```ts
type DiscountDef = { off: number; count?: number }
```

Each day, `count` of the vendor's goods (1 if left out) are marked down by `off`, a fraction such as `0.25`. Which ones is drawn from the save's [seed](/docs/reference/state#seed), the vendor and the day, so it's the same every time the player looks that day, on every replay of the save, and a reload can't re-roll it. A good's price is rounded to the nearest whole number after the discount.

## Buying and selling

| Command | Helper | Does |
|---|---|---|
| `{ 'shop/buy': { vendor, entity, count? } }` | `buy(vendor, entity, count?)` | Pays today's price for `count` of the thing (1 if left out) and gives them to you. |
| `{ 'shop/sell': { vendor, entity, count? } }` | `sell(vendor, entity, count?)` | Takes `count` of the thing from you and pays the vendor's `buysBack` fraction of its full price, rounded down per thing. A good with a stock goes back to the vendor. |

"You" is whoever the player is playing (see [`'you'`](/docs/reference/entities#protagonists-you-and-player)). Paying applies a [`stat`](/docs/reference/effects#stat) effect for each stat, so the game's `rules.onStat` sees it, then an `entity` or a `move` effect.

`shop/buy` is refused with the first of these that applies:

1. `That isn’t for sale here.` for a vendor or thing that doesn't exist, or a good whose `when` doesn't hold.
2. `You aren’t at that shop.` when the game has places and the player isn't at one of the vendor's `at`.
3. The vendor's `closed` line, or `Closed.`, outside its `hours` or while its `open` doesn't hold.
4. `Sold out.` when the vendor has fewer left than `count`.
5. The stat's own [`lacking`](/docs/reference/stats#statdef) line when the player has too little of it, such as `You need 4 coins.`

`shop/sell` is refused the same way, except it says `They don’t buy things back.` for a vendor with no `buysBack`, and `You don’t have that.` when you hold fewer than `count`.

Both are refused by [locks](/docs/reference/locks) like any command, and a lock can name them as `shop/buy` or `shop/*`.

### On a button

A button that sends `shop/buy` shows its price, because the command tells the engine what it spends (a plugin command's [`spends`](/docs/reference/plugins#plugincommand)). The price is today's, discount included, written through each stat's `format`. The button greys out with the same reason the command is refused with. So on the places map, a location's action is enough:

```ts
import { type ActionDef } from '@ifloom/engine'
import { buy } from '@ifloom/plugin-shop'

const actions: ActionDef[] = [
  { id: 'sandwich', label: 'Buy a sandwich for later', command: buy('counter', 'food:sandwich') },
  { id: 'flapjack', label: 'Buy a flapjack', command: buy('counter', 'food:flapjack') },
]
```

## Opening a counter

Nothing about a vendor is drawn by itself. Content opens a vendor's counter in the `shop` [panel](/docs/reference/panels) with `openShop`, from anything that runs effects: a place's action, a choice in a person's scene, a thing's [use](/docs/plugins/inventory), an app's button.

```ts
import { openShop } from '@ifloom/plugin-shop'

// In the café's location. openShop('counter') is { panel: 'shop', with: { vendor: 'counter' } }.
actions: [{ id: 'counter', label: 'Go to the counter', effects: [openShop('counter')] }],
```

The counter stays open while the player buys and sells, and closes when a turn ends or the scene changes. See [How long a panel stays open](/docs/reference/panels#how-long-a-panel-stays-open).

Opening a counter doesn't move the player. A vendor with `at` still sells only there, so a counter opened from somewhere else greys its buttons out with `You aren’t at that shop.` For a shop on a phone or a laptop, leave `at` out:

```ts
// An online shop: no `at`, so it sells wherever the player is.
const webshop: VendorDef = { id: 'webshop', name: 'Pinecone Online', goods: [{ entity: 'clothing:scarf', price: { coins: 10 } }] }
// A laptop app's actions section has a button that opens it.
const app: AppDef = {
  id: 'pinecone', name: 'Pinecone', icon: 'basket', on: 'laptop',
  sections: [{ actions: [{ id: 'browse', label: 'Browse the shop', effects: [openShop('webshop')] }] }],
}
```

The checker reports an `openShop` for a vendor the game doesn't have (`unknown vendor "kiosk"`), and a `shop` panel opened with no `vendor`.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'shop/open': { vendor } }` | `vendorOpen(vendor)` | The vendor is open now. Where the player is doesn't matter. |
| `{ 'shop/inStock': { vendor, entity } }` | `inStock(vendor, entity)` | The vendor offers the thing now and has at least one left. Always, for a good that never runs out. |

An unknown vendor or thing is false.

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

Its [React UI](#the-react-ui) draws the `shop` panel as a [`ShopCounter`](#shopcounter) in a dialog, through [`PanelHost`](/docs/react/components#panelhost). [`useShop`](#useshop) gives the same data and the buy and sell commands with no markup, for a counter you place yourself.

### ShopView

```ts
type ShopView = { vendors: VendorView[] }
```

Every vendor, in the order the game declares them. A UI usually shows the ones that are `here`.

### VendorView

```ts
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

| Field | What it is |
|---|---|
| `ref` | Its entity, `'vendor:<id>'`, which holds its stock. |
| `here` | The player is at one of its `at`, or it has none, or the game has no places plugin. |
| `closed` | Why it's closed, in the words `shop/buy` would be refused with, or `null` while it's open. |
| `buysBack` | It takes things back. |
| `goods` | The goods on offer now. A good whose `when` doesn't hold isn't listed, and nor is one whose thing was removed. |

### GoodView

```ts
type GoodView = {
  entity: EntityRef
  name: string
  desc: string | null
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

| Field | What it is |
|---|---|
| `entity` | The thing, such as `'food:sandwich'`. |
| `name`, `desc` | The thing's name and description, with prose tokens filled in. `desc` is `null` when it has none. |
| `image` | Its picture's path, through `artSrc`, or `null`. |
| `stock` | How many the vendor has left, or `null` for a good that never runs out. |
| `owned` | How many you hold. |
| `off` | The fraction off today, or `0`. |
| `fullPrice` | The price before today's discount, as a [`Price`](/docs/reference/view#price), or `null` when there's no discount. |
| `buy` | The button that buys one: `label` (the thing's name), `price` (today's), `disabled` (why not, if it can't be bought), `warning` and `command`. |
| `sell` | The button that sells one back, or `null` for a vendor that takes nothing back. |
| `sellFor` | What selling one back pays, or `null`. |

## The React UI

`@ifloom/plugin-shop/react` draws a vendor's counter, for a game drawn with [`@ifloom/react`](/docs/react). List `shopUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and the `shop` panel, which [`openShop`](#opening-a-counter) opens, is drawn as that vendor's [`ShopCounter`](#shopcounter), titled with its name.

It's yours to leave out. Draw the plugin yourself from `view.plugins.shop`, or from [`useShop`](#useshop) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

```tsx
import { mountGame } from '@ifloom/react'
import { shopUi } from '@ifloom/plugin-shop/react'

mountGame(game, { plugins: [shopUi] })
```

### shopUi

```ts
const shopUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): the `shop` panel, which [`openShop`](#opening-a-counter) opens, is drawn as that vendor's [`ShopCounter`](#shopcounter), titled with its name.

Its words are in `SHOP_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.buy': '…' }`.

| Key | English |
|---|---|
| `ui.buy` | `Buy` |
| `ui.sellFor` | `Sell for {price}` |
| `ui.stockLeft` | `{n} left` |
| `ui.owned` | `You have {n}` |
| `ui.percentOff` | `{percent}% off` |
| `ui.noGoods` | `Nothing for sale.` |

### ShopDialog

```tsx
function ShopDialog(props: ShopDialogProps): JSX.Element

type ShopDialogProps = { vendorId: string | null; onClose: () => void }
```

The vendor with this id in a [`Dialog`](/docs/react/components#dialog), titled with its name and drawn as a [`ShopCounter`](#shopcounter). It's closed while `vendorId` is `null` or names no vendor. It sends no command and keeps nothing in the state, so content usually opens a counter with [`openShop`](/docs/plugins/shop#opening-a-counter) instead. Use it for a button that is only UI:

```tsx
import { useState } from 'react'
import { Button } from '@ifloom/react'
import { ShopDialog } from '@ifloom/plugin-shop/react'

function StallButton() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen('stall')}>The fruit stall</Button>
      <ShopDialog vendorId={open} onClose={() => setOpen(null)} />
    </>
  )
}
```

Replaceable as `ShopDialog` in [`components`](/docs/react/components#components). Parts: `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### ShopCounter

```tsx
function ShopCounter(props: ShopCounterProps): JSX.Element

type ShopCounterProps = { vendor: VendorView; className?: string }
```

A vendor's goods, from its [`VendorView`](/docs/plugins/shop#vendorview). A closed vendor shows why above its goods (`data-closed`). Each good (`data-good`, the thing's reference) shows its picture when it has one, its name and description, today's discount (`ui.percentOff`) with the full price struck out, how many are left (`ui.stockLeft`) for a good with a stock, and how many the player has (`ui.owned`). Then:

- **Buy** (`ui.buy`), a [`ChoiceButton`](/docs/react/components#choicebutton) built from the good's `buy` button, so it shows today's price and, when it's greyed out, the reason on it: `Sold out.`, `You need 10 coins.` or the vendor's closed line.
- **Sell for 2 coins** (`ui.sellFor`), from the good's `sell` button, when the vendor buys back and the player has one.

It says `ui.noGoods` when nothing is on offer.

Replaceable as `ShopCounter` in [`components`](/docs/react/components#components). Parts: `shop` (with `data-vendor`), `shop-closed`, `shop-empty`, `goods`, `good` (with `data-good`), `good-image`, `good-name`, `good-desc`, `good-details`, `good-off`, `good-full-price`, `good-stock`, `good-owned`, `good-actions` and `choice`.

### useShop

```ts
function useShop(): ShopControls | null

type ShopControls = ShopView & {
  here: VendorView[]
  buy: (vendor: string, entity: string, count?: number) => Result<GameState>
  sell: (vendor: string, entity: string, count?: number) => Result<GameState>
}
```

The shop plugin's view ([`ShopView`](/docs/plugins/shop#shopview): `vendors`), the vendors at the player's location as `here`, and its commands, or `null` in a game without the plugin. `buy` and `sell` send `shop/buy` and `shop/sell`, one if `count` is left out. [`ShopDialog`](#shopdialog), [`ShopCounter`](#shopcounter) and the `shop` panel are drawn from it. `here` is what a layout of your own can show where the player is.

```tsx
import { useShop } from '@ifloom/plugin-shop/react'

function QuickCoffee() {
  const shop = useShop()
  const coffee = shop?.here[0]?.goods.find((good) => good.entity === 'food:coffee')
  if (!shop || !coffee) return null
  return <button disabled={Boolean(coffee.buy.disabled)} onClick={() => shop.buy(shop.here[0].id, 'food:coffee')}>Coffee to go</button>
}
```

## The state

### ShopState

```ts
type ShopState = { stocked: Record<string, Record<EntityRef, StockRecord>> }
type StockRecord = { at: number; left?: number }
```

What the plugin keeps in a save, at `state.plugins.shop`. The stock itself is what each vendor's entity holds, in [`state.held`](/docs/reference/state#held). For each vendor and good with a stock, the plugin keeps the turn or day it last topped the stock up (`at`, 0 for a good that never restocks). When the turn or day moves on past `at`, the stock is back in full without anything having to run. `left` is a count an older save carried in that isn't written to what the vendor holds yet.

A save from before the plugin was added loads with every stock full. A save from the plugin's first version, which counted how many of each item had gone, is carried forward: each count becomes what the vendor has left, under the good whose thing has the item's id.

## For code

### Helpers

```ts
const buy: (vendor: string, entity: EntityRef, count?: number) => CommandRef
const sell: (vendor: string, entity: EntityRef, count?: number) => CommandRef
const vendorOpen: (vendor: string) => Condition
const inStock: (vendor: string, entity: EntityRef) => Condition
const openShop: (vendor: string) => Effect
const sellable: (price: Record<string, number>) => { 'shop/sellable': Sellable }
```

`openShop` opens the vendor's counter in the `shop` panel. See [Opening a counter](#opening-a-counter).

### vendorDefs and vendorRef

```ts
function vendorDefs(game: Game): VendorDef[]
function vendorRef(vendor: string): EntityRef
```

`vendorDefs` is the game's vendors, merged from its content and packs: `game.data.shop.vendors`. A good that names no entity is left out, and the checker reports it. `vendorRef` is the entity a vendor is, `'vendor:counter'`, for a condition or an effect on what it holds.

### sellableOf

```ts
function sellableOf(state: GameState, game: Game, ref: EntityRef): Sellable | undefined
```

A thing's `shop/sellable` trait, read through the thing it was made [`like`](/docs/reference/effects#create), so a copy made in play has its pattern's price.

### shopView

```ts
function shopView(state: GameState, slice: ShopState, cx: Pick<PluginContext<ShopState>, 'game' | 'query'>): ShopView
```

The `ShopView` for a state. The plugin's view is `shopView(state, slice, context)`. It needs the context's `query` to ask the calendar and places.

## Checks

When the game loads, the plugin reports these problems against the content or pack each vendor came from, with `where` as `vendors <id>`:

- A good that names no thing, such as one in your own content still written as `{ item: 'sandwich' }`. A pack written that way is [upgraded](/docs/reference/loader#upgradepack) as it loads.
- An unknown thing (`good food:pear: unknown entity "food:pear"`), or a price in an unknown stat.
- A good with no price, whose thing has no `shop/sellable` trait.
- A price in a stat that isn't `spendable`, or is derived.
- A negative price or stock, `restock` on a good with no `stock`, or a stock above 1 for a unique thing.
- The same thing twice (`sells "…" twice`).
- `buysBack` outside 0 to 1, or a `discounts.off` that isn't more than 0 and at most 1.
- Anything `open` or a good's `when` names that the game doesn't have.
- An unknown location in `at`, when the game has places.

A command that names a vendor or thing the game doesn't have gives `unknown vendor "…"` or `unknown entity "…"` where it's written. The trait's price is checked on each entity that has it.

## Gotchas

- **The calendar's `hours` and the places map's opening hours are separate.** A location's [`blocked`](/docs/plugins/places#locationdef) stops the player getting in, and a vendor's `hours` stops it selling. The showcase sets both, so the café and its counter close together.
- **A vendor's `hours` are asked of the calendar.** They're period ids, not a condition. For days of the week, add `open: weekday(…)`.
- **The price on a button is today's.** A discount drawn for today changes the price on the button, and tomorrow it may be back to full.
- **Selling back pays from the full price,** not today's discounted one.
- **Selling back a good that never runs out takes it from you,** and no vendor holds it after.

## See it in an example

Small Town: the café's `counter` in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts) sells sandwiches, two flapjacks a day that it holds, and the newspaper, buys back at half, and has a daily discount. Their prices are their `sellable` traits, in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts). The café's "Go to the counter" action opens it with `openShop('counter')`.
