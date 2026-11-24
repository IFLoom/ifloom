---
title: "Shop"
description: "Vendors that sell things for any spendable stat, with stock the vendor holds, restocking, selling back and seeded daily discounts."
---
`@ifloom/plugin-shop` adds vendors the player buys from and sells back to. What a vendor sells are [entities](/docs/reference/entities), things the player then holds, for prices in any of your [spendable stats](/docs/reference/stats#statdef), such as coins, energy or both. A good never runs out unless you give it a stock, which the vendor holds and can get back each turn or each day. A vendor can take things back for part of their price, and mark a few goods down each day.

```ts
import { shop, vendorsOf, vendorOf, sellableOf, type Vendor, type VendorDef, type GoodDef, type DiscountDef, type Restock, type Sellable, type ShopState, type StockRecord, type ShopView, type VendorView, type GoodView } from '@ifloom/plugin-shop'
```

The plugin's engine side draws nothing: its React UI is a [subpath of its own](#drawing-it), and any UI can draw it. You can put its `buy` commands on any button, such as a location's actions, and the button shows the price and greys out with the reason as any action's does. For a shop screen, its view lists every vendor and their goods, and [Building UI for plugins](/docs/recipes/plugin-ui#a-shop-counter) builds one.

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

Then add `shop()` to the game's `plugins`. [Adding one](/docs/reference/plugins#adding-one) has the details.

The plugin works on its own, and needs neither the [inventory](/docs/reference/plugins/inventory) nor the [wardrobe](/docs/reference/plugins/wardrobe): what it sells is held by the engine. It cooperates with the [calendar](/docs/reference/plugins/calendar) and [places](/docs/reference/plugins/places) when the game has them:

- **Calendar.** A vendor's opening hours, written with [`shop.hours()`](#opening-hours), are the calendar's periods, and "a day" for restocking and discounts is the calendar's day.
- **Places.** A vendor that stands somewhere lists [`places.onlyAt()`](/docs/reference/plugins/places#helpers) in its `blocked`, and the player can only buy there. See [Where it stands](#where-it-stands).

Without the calendar, a vendor with opening hours is always open and a day is a turn. Without places, a vendor's `places.onlyAt()` entry never holds, so the vendor is everywhere.

## shop

```ts shape
function shop(): DefinedPlugin<ShopState, ShopView>
```

Builds the plugin, with the id `shop`. It brings the `vendor` [kind](/docs/reference/entities#kinddef), unique and unlisted, which [`shop.vendor()`](#vendor) uses. A vendor is any entity that carries the plugin's `shop/vendor` trait, and that entity holds the vendor's stock.

## Writing vendors

A vendor is an entity, written with [`shop.vendor()`](#vendor) in your content's [`entities`](/docs/reference/content#content). Entities merge by reference, so a mod can add a vendor or replace one, and a [`traits`](/docs/reference/entities#traits) row changes what one sells. The things they sell are entities of your own kinds. This is a shop on its own, with no other plugin, the showcase's café counter:

```ts
import { holding, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'

const counter = shop.vendor({
  id: 'counter',
  name: 'The counter',
  blocked: [places.onlyAt(['cafe'], { string: 'shop/notHere' }, { hide: true }), shop.hours(['morning', 'afternoon'])],
  buysBack: 0.5,
  discounts: { off: 0.5 },
  goods: [
    // Never runs out: each one bought is a new sandwich. Its price is its sellable trait's.
    { entity: 'food:sandwich' },
    // Two a day: the counter holds them, and gets two again each morning.
    { entity: 'food:flapjack', price: { coins: 2 }, stock: 2, restock: 'day' },
  ],
})

const town: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12, max: 999, spendable: true, format: '{n} coins' }],
  kinds: [{ id: 'food', label: 'Food', listed: false }],
  entities: [
    { id: 'sandwich', of: 'food', name: 'sandwich', description: 'Cheese and pickle.', traits: { ...shop.sellable({ coins: 4 }) } },
    { id: 'flapjack', of: 'food', name: 'flapjack', description: 'Oats and syrup.' },
    counter,
  ],
}

// A button for a location's actions, or anywhere else a button goes.
const button = { id: 'flapjack', label: 'Buy a flapjack', command: shop.buy('counter', 'food:flapjack') }
// And a line that changes once you have one.
const line = { prose: 'cafe.full', when: holding('food:sandwich') }
```

The kind is unlisted (`listed: false`) because what the player holds already reaches the view as [`view.held`](/docs/reference/view#held), and a list of every food in the game would give the menu away.

### vendor

```ts shape
const shop: {
  vendor(def: VendorDef): EntityDef
}
```

Writes a vendor for your content's `entities`. You give it the entity's fields and the `shop/vendor` trait's fields side by side, and it returns an [`EntityDef`](/docs/reference/entities#entitydef) of the kind `vendor` with the trait's fields in `traits['shop/vendor']`.

```ts
import { shop } from '@ifloom/plugin-shop'

shop.vendor({ id: 'kiosk', name: 'The kiosk', goods: [{ entity: 'food:paper', price: { coins: 1 } }] })
// { id: 'kiosk', of: 'vendor', name: 'The kiosk', traits: { 'shop/vendor': { goods: [{ entity: 'food:paper', price: { coins: 1 } }] } } }
```

#### VendorDef

What `shop.vendor()` takes: the entity's fields and the [vendor trait](#the-vendor-trait)'s, side by side.

```ts shape
type VendorDef = Omit<EntityDef, 'of'> & Vendor & { of?: string }
```

| Field | What it is |
|---|---|
| `id` | Unique among the entities of its kind. Commands name a vendor of the `vendor` kind by it, and its entity is `'vendor:<id>'`. |
| `name` | What the player reads, such as "The counter". It's the entity's name, so prose tokens in it are filled in. |
| `of` | Another kind for the vendor, such as `'character'` for a person who sells. Commands then name it by its whole reference, `shop.buy('character:ava', 'food:bun')`. `'vendor'` if left out. |

The entity's other fields work as on any entity.

### The vendor trait

What makes an entity a vendor: its goods, its opening hours and what it buys back.

#### Vendor

```ts shape
type Vendor = {
  blocked?: Blocked[]
  goods: GoodDef[]
  buysBack?: number
  discounts?: DiscountDef
}
```

What the `shop/vendor` trait holds. The plugin declares the trait and types it, so `traitOf(state, game, 'vendor:counter', 'shop/vendor')` reads a `Vendor`.

| Field | What it is |
|---|---|
| `blocked` | When it's refused, as a list of [`Blocked`](/docs/reference/actions#blocked) entries. Buying and selling are refused with the `reason` of the first whose `when` holds. An entry with `hide` says where the vendor is, and while it holds the vendor isn't [`here`](#vendorview). Any other entry closes the vendor, and its reason is what the counter shows. [`shop.hours()`](#opening-hours) writes one for opening hours, and [`places.onlyAt()`](#where-it-stands) one for where it stands. Open everywhere if left out. |
| `goods` | What it sells, in the order it lists them. |
| `buysBack` | The fraction of a thing's price it pays to take one back, from 0 to 1. It takes nothing back if left out. |
| `discounts` | Goods marked down each day. See [Discounts](#discounts). |

### Opening hours

```ts shape
const shop: {
  hours(periods: readonly string[], reason?: Reason): Blocked
}
```

A `blocked` entry that closes a vendor outside these periods of the [calendar](/docs/reference/plugins/calendar)'s day. Its reason is `reason`, or the [`shop/closed`](#strings) string, `Closed.`, so a game rewords every closed counter in its strings at once. It's `{ when: shop.outside(...periods), reason }`.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { shop } from '@ifloom/plugin-shop'

shop.vendor({
  id: 'stall',
  name: 'The fruit stall',
  blocked: [shop.hours(['morning'], 'The stall packs up at noon.'), { when: calendar.weekend(), reason: 'No market at weekends.' }],
  goods: [{ entity: 'food:apple', price: { coins: 1 } }],
})
```

Without the calendar there is no period of the day, so the vendor is never closed by its hours.

### Where it stands

With the [places](/docs/reference/plugins/places) plugin, a vendor that stands somewhere lists [`places.onlyAt()`](/docs/reference/plugins/places#helpers) in its `blocked`, with `hide`:

```ts
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'

shop.vendor({
  id: 'counter',
  name: 'The counter',
  blocked: [places.onlyAt(['cafe'], { string: 'shop/notHere' }, { hide: true })],
  goods: [{ entity: 'food:sandwich' }],
})
```

Anywhere else, buying and selling are refused with the entry's reason. Here that's the shop's own [`shop/notHere`](#strings) string, `You aren’t at that shop.`, and with no reason it's places' `Not here.`. Because of `hide`, the vendor's `here` is `false` away from the café, so a UI that lists the vendors where the player is leaves it out, and it isn't shown as closed. Without `hide` the entry closes the vendor instead, and the counter shows its reason.

The entry's `when` is `places.away('cafe')`, which never holds in a game without places, so there the vendor sells everywhere. The places plugin checks the locations it names.

### GoodDef

```ts shape
type GoodDef = {
  entity: EntityRef
  price?: Record<string, number>
  stock?: number
  restock?: Restock
  when?: Condition
}
```

| Field | What it is |
|---|---|
| `entity` | The thing it sells, by reference, such as `'food:sandwich'`. It has to be an entity your content declares. A vendor sells each thing once. |
| `price` | What one costs, by stat, such as `{ coins: 4 }` or `{ coins: 2, energy: 5 }`. Each stat should be spendable. The thing's [`shop/sellable`](#the-sellable-trait) price if left out. |
| `stock` | How many the vendor holds. See [Stock](#stock). Never runs out if left out. |
| `restock` | When the vendor's stock comes back up to `stock`: every `'turn'`, or every `'day'` (the calendar's day, or a turn without it). Never, if left out. |
| `when` | Offered only while this holds. Otherwise the vendor doesn't list it, and buying it is refused as if it weren't for sale. |

#### Restock

When a good's stock comes back up: every turn, or every day.

```ts shape
type Restock = 'turn' | 'day'
```

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

```ts shape
const shop: {
  sellable(price: Record<string, number>): { 'shop/sellable': Sellable }
}
```

#### Sellable

What the `shop/sellable` trait holds: one thing's price, by stat.

```ts shape
type Sellable = { price: Record<string, number> }
```

A thing's price, for every vendor that lists it without a `price` of its own. It's a [trait](/docs/reference/entities#traits), so you can write it on a kind as a default, on the entity, or in content's `traits` table, where a mod can change it. `shop.sellable` writes it, to spread into `traits`:

```ts fragment
kinds: [{ id: 'fruit', label: 'Fruit', listed: false, traits: { ...sellable({ coins: 1 }) } }],
entities: [
  { id: 'apple', of: 'fruit', name: 'apple' },
  { id: 'fig', of: 'fruit', name: 'fig', traits: { ...sellable({ coins: 3 }) } },
],
```

The checker reports a good with neither a price nor the trait.

### Discounts

#### DiscountDef

How a vendor marks its goods down each day.

```ts shape
type DiscountDef = { off: number; count?: number }
```

Each day, `count` of the vendor's goods (1 if left out) are marked down by `off`, a fraction such as `0.25`. Which ones is drawn from the save's [seed](/docs/reference/state#seed), the vendor and the day, so it's the same every time the player looks that day, on every replay of the save, and a reload can't re-roll it. A good's price is rounded to the nearest whole number after the discount.

## Buying and selling

| Command | Helper | Does |
|---|---|---|
| `{ 'shop/buy': { vendor, entity, count? } }` | `shop.buy(vendor, entity, count?)` | Pays today's price for `count` of the thing (1 if left out) and gives them to you. |
| `{ 'shop/sell': { vendor, entity, count? } }` | `shop.sell(vendor, entity, count?)` | Takes `count` of the thing from you and pays the vendor's `buysBack` fraction of its full price, rounded down per thing. A good with a stock goes back to the vendor. |

"You" is whoever the player is playing (see [`'you'`](/docs/reference/entities#protagonists-you-and-player)). Paying applies a [`stat`](/docs/reference/effects#stat) effect for each stat, so the game's `rules.onStat` sees it, then an `entity` or a `move` effect.

`shop/buy` is refused with the first of these that applies:

1. `That isn’t for sale here.` for a vendor or thing that doesn't exist, or a good whose `when` doesn't hold.
2. The `reason` of the vendor's first `blocked` entry that holds, such as `You aren’t at that shop.` away from where it [stands](#where-it-stands), or `Closed.` outside the hours [`shop.hours()`](#opening-hours) wrote.
3. `Sold out.` when the vendor has fewer left than `count`.
4. The stat's own [`lacking`](/docs/reference/stats#statdef) line when the player has too little of it, such as `You need 4 coins.`

`shop/sell` is refused the same way, except it says `They don’t buy things back.` for a vendor with no `buysBack`, and `You don’t have that.` when you hold fewer than `count`.

Both are refused by [locks](/docs/reference/locks) like any command, and a lock can name them as `shop/buy` or `shop/*`.

### On a button

A button that sends `shop/buy` shows its price, because the command tells the engine what it spends (a plugin command's [`spends`](/docs/reference/plugins#plugincommand)). The price is today's, discount included, written through each stat's `format`. The button greys out with the same reason the command is refused with. So on the places map, a location's action is enough:

```ts
import { type ActionDef } from '@ifloom/engine'
import { shop } from '@ifloom/plugin-shop'

const actions: ActionDef[] = [
  { id: 'sandwich', label: 'Buy a sandwich for later', command: shop.buy('counter', 'food:sandwich') },
  { id: 'flapjack', label: 'Buy a flapjack', command: shop.buy('counter', 'food:flapjack') },
]
```

## Opening a counter

Nothing about a vendor is drawn by itself. Content opens a vendor's counter in the `shop` [panel](/docs/reference/panels) with `shop.open`, from anything that runs effects: a place's action, a choice in a person's scene, a thing's [use](/docs/reference/plugins/inventory), an app's button.

```ts
import type { ActionDef } from '@ifloom/engine'
import { shop } from '@ifloom/plugin-shop'

// In the café's location's actions. shop.open('counter') is { panel: 'shop', with: { vendor: 'counter' } }.
const counter: ActionDef = { id: 'counter', label: 'Go to the counter', effects: [shop.open('counter')] }
```

The counter stays open while the player buys and sells, and closes when a turn ends or the scene changes. See [How long a panel stays open](/docs/reference/panels#how-long-a-panel-stays-open).

Opening a counter doesn't move the player. A vendor with a [`places.onlyAt()`](#where-it-stands) entry still sells only there, so a counter opened from somewhere else greys its buttons out with that entry's reason. For a shop on a phone or a laptop, leave the entry out:

```ts
import type { AppDef } from '@ifloom/plugin-devices'
import { shop } from '@ifloom/plugin-shop'

// An online shop: nothing in its `blocked`, so it sells wherever the player is.
const webshop = shop.vendor({ id: 'webshop', name: 'Pinecone Online', goods: [{ entity: 'clothing:scarf', price: { coins: 10 } }] })
// A laptop app's actions section has a button that opens it.
const app: AppDef = {
  id: 'pinecone', name: 'Pinecone', icon: 'basket', on: 'laptop',
  sections: [{ actions: [{ id: 'browse', label: 'Browse the shop', effects: [shop.open('webshop')] }] }],
}
```

The checker reports an `shop.open` for a vendor the game doesn't have (`unknown entity "vendor:kiosk"`), and a `shop` panel opened with no `vendor`.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'shop/open': { vendor } }` | `shop.vendorOpen(vendor)` | The vendor is open now: none of its `blocked` entries without `hide` holds. So where the player is doesn't matter. |
| `{ 'shop/outside': { period } }` | `shop.outside(...periods)` | The [calendar](/docs/reference/plugins/calendar)'s period of the day is none of these. Never, in a game without the calendar. [`shop.hours()`](#opening-hours) closes a vendor with it. |
| `{ 'shop/inStock': { vendor, entity } }` | `shop.inStock(vendor, entity)` | The vendor offers the thing now and has at least one left. Always, for a good that never runs out. |

An unknown vendor or thing is false.

## Strings

| Key | English |
|---|---|
| `shop/unknown` | `That isn’t for sale here.` |
| `shop/notHere` | `You aren’t at that shop.`, for a vendor's [`places.onlyAt()`](#where-it-stands) entry: `{ string: 'shop/notHere' }`. The plugin doesn't use it itself. |
| `shop/closed` | `Closed.` |
| `shop/soldOut` | `Sold out.` |
| `shop/noBuyBack` | `They don’t buy things back.` |
| `shop/notOwned` | `You don’t have that.` |

## The view

`view(state, game).plugins.shop` is a `ShopView`. Each good carries ready-made buttons, built with the engine's [`renderAction`](/docs/reference/view#renderaction), so a UI draws them like any other button.

Its [React UI](#drawing-it) draws the `shop` panel as a [`ShopCounter`](#shopcounter) in a dialog, through [`PanelHost`](/docs/react/components#panelhost). [`useShop`](#useshop) gives the same data and the buy and sell commands with no markup, for a counter you place yourself.

### ShopView

```ts shape
type ShopView = { vendors: VendorView[]; panel: VendorView | null }
```

`vendors` is every vendor, in the order the game declares them. A UI usually shows the ones that are `here`. `panel` is the vendor whose counter the open `shop` panel shows, by its `with.vendor` (an id or a whole reference), or `null` while no `shop` panel is open. A UI draws the counter from it, with no looking up. It's worked out with the engine's [`panelOf`](/docs/reference/panels#panelof).

### VendorView

```ts shape
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
| `id` | How commands name it: its id for one of the `vendor` kind, else its whole reference. |
| `ref` | Its entity, such as `'vendor:counter'`, which holds its stock. |
| `name` | Its entity's name, tokens filled. |
| `here` | The player is where it is: none of its `blocked` entries with `hide` holds. True when it has none, such as a vendor with no [`places.onlyAt()`](#where-it-stands) entry or a game without places. |
| `closed` | Why it's closed, the reason of its first `blocked` entry without `hide` that holds, or `null` while it's open. |
| `buysBack` | It takes things back. |
| `goods` | The goods on offer now. A good whose `when` doesn't hold isn't listed, and nor is one whose thing was removed. |

### GoodView

```ts shape
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

| Field | What it is |
|---|---|
| `entity` | The thing, such as `'food:sandwich'`. |
| `name`, `description` | The thing's name and description, with prose tokens filled in. `description` is `null` when it has none. |
| `image` | Its picture's path, through `artSrc`, or `null`. |
| `stock` | How many the vendor has left, or `null` for a good that never runs out. |
| `owned` | How many you hold. |
| `off` | The fraction off today, or `0`. |
| `fullPrice` | The price before today's discount, as a [`Price`](/docs/reference/view#price), or `null` when there's no discount. |
| `buy` | The button that buys one: `label` (the thing's name), `price` (today's), `disabled` (why not, if it can't be bought), `warning` and `command`. |
| `sell` | The button that sells one back, or `null` for a vendor that takes nothing back. |
| `sellFor` | What selling one back pays, or `null`. |

## Drawing it

Nothing about a vendor is drawn until content opens its counter with [`shop.open`](#opening-a-counter). Then `view.panel` is `{ panel: 'shop', with: { vendor: 'counter' } }`, and [`view.plugins.shop.panel`](#shopview) is that vendor. Each good's `buy` and `sell` are ready-made buttons with today's price and the reason one can't be pressed, so you draw them like any other button and send their `command`.

With the React UI, list `shopUi` in `plugins` and the panel is drawn for you as a [`ShopCounter`](#shopcounter) in a dialog. In plain JS or Vue, draw the vendor when the open panel is `shop`. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, and the Vue tab the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../../snippets/plain/shop.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-shop.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/ShopCounter.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.shop`, or from [`useShop`](#useshop) with your own markup, and nothing of ours is drawn. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads `@ifloom/plugin-shop/react`.

### shopUi

```ts shape
const shopUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): the `shop` panel, which [`shop.open`](#opening-a-counter) opens, is drawn as that vendor's [`ShopCounter`](#shopcounter), titled with its name.

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

```tsx shape
function ShopDialog(props: ShopDialogProps): JSX.Element

type ShopDialogProps = { vendorId: string | null; onClose: () => void }
```

The vendor with this id in a [`Dialog`](/docs/react/components#dialog), titled with its name and drawn as a [`ShopCounter`](#shopcounter). It's closed while `vendorId` is `null` or names no vendor. It sends no command and keeps nothing in the state, so content usually opens a counter with [`shop.open`](/docs/reference/plugins/shop#opening-a-counter) instead. Use it for a button that is only UI:

::include[../../../../../snippets/react/shop-dialog.tsx]

Replaceable as `ShopDialog` in [`components`](/docs/react/components#components). Parts: `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### ShopCounter

```tsx shape
function ShopCounter(props: ShopCounterProps): JSX.Element

type ShopCounterProps = { vendor: VendorView; className?: string }
```

A vendor's goods, from its [`VendorView`](/docs/reference/plugins/shop#vendorview). A closed vendor shows why above its goods (`data-closed`). Each good (`data-good`, the thing's reference) shows its picture when it has one, its name and description, today's discount (`ui.percentOff`) with the full price struck out, how many are left (`ui.stockLeft`) for a good with a stock, and how many the player has (`ui.owned`). Then:

- **Buy** (`ui.buy`), a [`ChoiceButton`](/docs/react/components#choicebutton) built from the good's `buy` button, so it shows today's price and, when it's greyed out, the reason on it: `Sold out.`, `You need 10 coins.` or the vendor's closed line.
- **Sell for 2 coins** (`ui.sellFor`), from the good's `sell` button, when the vendor buys back and the player has one.

It says `ui.noGoods` when nothing is on offer.

Replaceable as `ShopCounter` in [`components`](/docs/react/components#components). Parts: `shop` (with `data-vendor`), `shop-closed`, `shop-empty`, `goods`, `good` (with `data-good`), `good-image`, `good-name`, `good-desc`, `good-details`, `good-off`, `good-full-price`, `good-stock`, `good-owned`, `good-actions` and `choice`.

### useShop

```ts shape
function useShop(): ShopControls | null

type ShopControls = ShopView & {
  here: VendorView[]
  buy: (vendor: string, entity: EntityRef, count?: number) => Result<GameState>
  sell: (vendor: string, entity: EntityRef, count?: number) => Result<GameState>
}
```

The shop plugin's view ([`ShopView`](/docs/reference/plugins/shop#shopview): `vendors`), the vendors at the player's location as `here`, and its commands, or `null` in a game without the plugin. `buy` and `sell` send `shop/buy` and `shop/sell`, one if `count` is left out. [`ShopDialog`](#shopdialog), [`ShopCounter`](#shopcounter) and the `shop` panel are drawn from it. `here` is what a layout of your own can show where the player is.

::include[../../../../../snippets/react/use-shop.tsx]

## The state

### ShopState

```ts shape
type ShopState = { stocked: Record<string, Record<EntityRef, StockRecord>> }
```

What the plugin keeps in a save, at `state.plugins.shop`. The stock itself is what each vendor's entity holds, in [`state.held`](/docs/reference/state#held). For each vendor and good with a stock, the plugin keeps the turn or day it last topped the stock up (`at`, 0 for a good that never restocks). When the turn or day moves on past `at`, the stock is back in full without anything having to run. `left` is a count an older save carried in that isn't written to what the vendor holds yet.

A save from before the plugin was added loads with every stock full. A save from the plugin's first version, which counted how many of each item had gone, is carried forward: each count becomes what the vendor has left, under the good whose thing has the item's id.

#### StockRecord

When the plugin last topped up one vendor's stock of one good.

```ts shape
type StockRecord = { at: number; left?: number }
```

| Field | What it is |
|---|---|
| `at` | The turn or day of the last top-up. `0` for a good that never restocks. |
| `left` | A count an older save carried in that isn't written to what the vendor holds yet. Usually absent. |

## For code

### Helpers

```ts shape
const shop: {
  (): DefinedPlugin<ShopState, ShopView>
  buy(vendor: string, entity: EntityRef, count?: number): CommandRef
  sell(vendor: string, entity: EntityRef, count?: number): CommandRef
  vendorOpen(vendor: string): Condition
  inStock(vendor: string, entity: EntityRef): Condition
  outside(...periods: string[]): Condition
  hours(periods: readonly string[], reason?: Reason): Blocked
  open(vendor: string): Effect
  sellable(price: Record<string, number>): { 'shop/sellable': Sellable }
}
```

`shop.open` opens the vendor's counter in the `shop` panel. See [Opening a counter](#opening-a-counter). `shop.hours` writes a vendor's opening hours. See [Opening hours](#opening-hours).

### vendorsOf, vendorOf and vendorRef

```ts shape
const shop: {
  vendorRef(vendor: string): EntityRef
}

function vendorsOf(state: GameState, game: Game): EntityRef[]
function vendorOf(state: GameState, game: Game, ref: string | null | undefined): Vendor | undefined
```

`vendorsOf` is every entity in the game now with the `shop/vendor` trait, as references: the vendors content declares, in their order, then those made in play.

`vendorOf` is the [`Vendor`](#the-vendor-trait) trait of the vendor with this id or reference, with any good that names no entity left out (the checker reports it).

`vendorRef` is the entity a vendor is, `shop.vendorRef('counter')` is `'vendor:counter'`, for a condition or an effect on what it holds. A reference is returned as written.

### sellableOf

```ts shape
function sellableOf(state: GameState, game: Game, ref: EntityRef): Sellable | undefined
```

A thing's `shop/sellable` trait, read through the thing it was made [`like`](/docs/reference/effects#create), so a copy made in play has its pattern's price.

## Checks

When the game loads, the plugin checks the `shop/vendor` trait on each vendor, and reports these problems against the content or pack each one came from, with `where` as `trait shop/vendor on <ref>`:

- A good that names no thing, such as one in your own content still written as `{ item: 'sandwich' }`. A pack written that way is [upgraded](/docs/reference/content#upgradepack) as it loads.
- An unknown thing (`good food:pear: unknown entity "food:pear"`), or a price in an unknown stat.
- A good with no price, whose thing has no `shop/sellable` trait.
- A price in a stat that isn't `spendable`, or is derived.
- A negative price or stock, `restock` on a good with no `stock`, or a stock above 1 for a unique thing.
- The same thing twice (`sells "…" twice`).
- `buysBack` outside 0 to 1, or a `discounts.off` that isn't more than 0 and at most 1.
- Anything `open` or a good's `when` names that the game doesn't have.
- An unknown location in a `places.onlyAt()` entry, when the game has places (`blocked: unknown entity "location:moon"`). The places plugin reports it.

A command that names a vendor or thing the game doesn't have gives `unknown entity "vendor:…"` or `unknown entity "…"` where it's written, and one that names an entity that isn't a vendor gives `"…" has no shop/vendor trait`. The `shop/sellable` trait's price is checked on each entity that has it.

A pack that still lists vendors in `data.shop.vendors`, as older content did, is carried forward by [`upgradePack`](/docs/reference/content#upgradepack): each vendor becomes an entity of the kind `vendor`, with its `id` and `name`, and the rest in the `shop/vendor` trait. Saves need nothing, because a vendor's entity was `vendor:<id>` before too.

## Gotchas

- **A traits row replaces the whole trait.** A mod that changes a vendor's goods with a `traits` row gives every field the vendor needs, its `blocked` included.
- **A place's opening hours and a vendor's are separate.** A location's [`blocked`](/docs/reference/plugins/places#the-location-trait) stops the player getting in, and a vendor's `blocked` stops it selling. The showcase sets both, so the café and its counter close together.
- **For days of the week, add an entry.** `shop.hours()` reads the period of the day. A counter shut at weekends adds `{ when: calendar.weekend(), reason: 'Closed at weekends.' }` beside it.
- **The price on a button is today's.** A discount drawn for today changes the price on the button, and tomorrow it may be back to full.
- **Selling back pays from the full price,** not today's discounted one.
- **Selling back a good that never runs out takes it from you,** and no vendor holds it after.

## See it in an example

Small Town: the café's `counter` in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts) sells sandwiches, two flapjacks a day that it holds, and the newspaper, buys back at half, and has a daily discount. Their prices are their `sellable` traits, in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts). The café's "Go to the counter" action opens it with `shop.open('counter')`.
