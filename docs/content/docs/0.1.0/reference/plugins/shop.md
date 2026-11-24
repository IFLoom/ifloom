---
title: "Shop"
description: "The shop plugin adds vendors who sell things for any spendable stat, with stock, restocking, selling back and daily discounts."
---
`@ifloom/plugin-shop` adds vendors the player buys [things](/docs/0.1.0/reference/glossary#thing) from and sells them back to, for prices in any spendable [stat](/docs/0.1.0/reference/stats#statdef), such as coins, energy or both. A vendor is an [entity](/docs/0.1.0/reference/glossary#entity) carrying the `shop/vendor` [trait](/docs/0.1.0/reference/glossary#trait), and it holds the stock of each good that has one. The shop needs no other plugin, and it cooperates with the [calendar](/docs/0.1.0/reference/plugins/calendar) for opening hours and days, and with [places](/docs/0.1.0/reference/plugins/places) for where a vendor stands. [Add a plugin](/docs/0.1.0/how-to/add-a-plugin) installs it, and [Open a shop, a job board or another panel](/docs/0.1.0/how-to/open-a-panel) opens a vendor's counter.

In the showcase: `examples/showcase/src/story/cafe.ts`, whose `counter` sells sandwiches, two flapjacks a day and the newspaper, buys back at half price and marks one good down each day, with the prices in `examples/showcase/src/world/things.ts`.

```ts
import {
  shop,
  vendorsOf,
  vendorOf,
  sellableOf,
  type DiscountDef,
  type GoodDef,
  type GoodView,
  type Restock,
  type Sellable,
  type ShopState,
  type ShopView,
  type StockRecord,
  type Vendor,
  type VendorDef,
  type VendorView,
} from '@ifloom/plugin-shop'
```

## shop

The plugin's factory, which returns the plugin with the id `shop`. It takes no options, because the vendors are entities a mod can change. Every field of its result is in [`shop`](/docs/0.1.0/api/plugin-shop#shop), and its helpers are listed under [Functions](#functions).

The plugin brings the kind `vendor` in its own content, [`unique`](/docs/0.1.0/reference/entities#unique) so each vendor can hold its stock, and not [`listed`](/docs/0.1.0/reference/entities#listed). After each command that goes through, the plugin's [`onCommand`](/docs/0.1.0/reference/plugin-api#oncommand) hook writes every restock that came due to what each vendor holds. The view and the conditions count a due restock before the hook writes it.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), places({ start: 'flat' }), shop()] })
```

## Content

### VendorDef

A vendor the game declares in `entities`, written with `shop.vendor()`: the entity's fields and the [`Vendor`](#vendor) trait's fields side by side. Every field is in [`VendorDef`](/docs/0.1.0/api/plugin-shop#vendordef).

`shop.vendor()` returns an [`EntityDef`](/docs/0.1.0/reference/entities#entitydef) of the kind `vendor` with the trait's fields in `traits['shop/vendor']`. The plugin's calls name a vendor of that kind by its bare id, `shop.buy('counter', …)`, and its entity is `vendor:counter`. `of` makes the vendor an entity of another kind, such as a person who sells, and the calls then name it by its whole reference, `shop.buy('character:ava', 'food:bun')`.

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'

export const cafe: Content = {
  kinds: [{ id: 'food', label: 'Food', listed: false }],
  entities: [
    { id: 'sandwich', of: 'food', name: 'sandwich', description: 'Cheese and pickle.', traits: { ...shop.sellable({ coins: 4 }) } },
    { id: 'flapjack', of: 'food', name: 'flapjack', description: 'Oats and syrup.' },
    shop.vendor({
      id: 'counter',
      name: 'The counter',
      blocked: [places.onlyAt(['cafe'], { string: 'shop/notHere' }, { hide: true }), shop.hours(['morning', 'afternoon'])],
      buysBack: 0.5,
      discounts: { off: 0.5 },
      goods: [{ entity: 'food:sandwich' }, { entity: 'food:flapjack', price: { coins: 2 }, stock: 2, restock: 'day' }],
    }),
  ],
}
```

The loader merges entities by reference, so a pack's `vendor:counter` replaces the counter whole. A pack that changes only the goods gives a [`traits`](/docs/0.1.0/reference/content#traits) row instead, which replaces the whole trait and keeps the entity's name.

### GoodDef

One thing a vendor sells, an entry of its `goods`. Every field is in [`GoodDef`](/docs/0.1.0/api/plugin-shop#gooddef).

`entity` names the thing by reference, and a vendor sells each thing once. `price` is what one costs, by stat, and with no `price` the good costs the thing's [`Sellable`](#sellable) price. A good whose `when` doesn't hold isn't on offer, so the view leaves it out and `shop/buy` refuses it as if the vendor didn't sell it.

A good with no `stock` never runs out. Buying one makes a new one for the player with the [`entity`](/docs/0.1.0/reference/effects#entity) effect, and selling one back removes it, so no vendor holds it in between. A good with a `stock` is held by the vendor's entity, as any [holder](/docs/0.1.0/reference/glossary#holder) holds things:

- The vendor starts with `stock` of it, and content can place more with it, such as `at: { 'vendor:market': 3 }` on the thing.
- Buying [`move`](/docs/0.1.0/reference/effects#move)s one from the vendor to the player, and the good is sold out when the vendor holds none.
- Selling one back moves it from the player to the vendor, so it's for sale again.
- With `restock`, the vendor is topped up to `stock` each turn or each day, and never brought down, so selling things back can leave it with more.

A vendor always sells a [unique](/docs/0.1.0/reference/entities#unique) thing from its stock, because there is only one of it, so give it `stock: 1` or start it with the vendor. A restock never takes a unique thing back from whoever holds it. `{ entity: 'food:flapjack', at: 'vendor:counter', gte: 1 }` is a condition on what the counter has left, and an effect can add to its stock or take it away.

### Restock

When a good's stock comes back up to its `stock`, `'turn'` or `'day'`. Its values are in [`Restock`](/docs/0.1.0/api/plugin-shop#restock).

A day is the calendar's day, or a turn in a game without the calendar. A good with no `restock` is never topped up.

### DiscountDef

How a vendor marks goods down each day, in its `discounts`. Every field is in [`DiscountDef`](/docs/0.1.0/api/plugin-shop#discountdef).

Each day, `count` of the vendor's goods (1 if left out) cost `off` less, a fraction such as `0.25`. The plugin draws which ones from the save's [seed](/docs/0.1.0/reference/random), the vendor and the day, so the pick is the same every time the player looks that day, on every replay, and after a reload. The plugin rounds a marked-down price to the nearest whole number.

## Traits

### Vendor

The data of the `shop/vendor` trait, which makes any entity carrying it a vendor the player buys from. Every field is in [`Vendor`](/docs/0.1.0/api/plugin-shop#vendor). The plugin types it in `TraitRegistry`, so [`traitOf`](/docs/0.1.0/reference/entities#traitof) reads a `Vendor`.

| Field | Meaning |
|---|---|
| `blocked` | [`Blocked`](/docs/0.1.0/reference/actions#blocked) entries that refuse buying and selling while their `when` holds, with the reason of the first that holds. An entry with `hide` says where the vendor is, and while it holds the vendor isn't `here`. Any other entry closes the vendor, and its reason is the view's `closed`. The vendor trades everywhere and always with none. |
| `goods` | The [goods](#gooddef) on offer, in the order the view lists them. |
| `buysBack` | The fraction of a thing's full price the vendor pays to take one back, from 0 to 1. The vendor takes nothing back if left out. |
| `discounts` | The vendor's [daily discounts](#discountdef). None if left out. |

`shop.hours(periods, reason?)` writes a `blocked` entry that closes the vendor outside these periods of the calendar's day, `{ when: shop.outside(...periods), reason }`. Its reason is the `shop/closed` string if left out, so a game rewords every closed counter at once. In a game without the calendar there is no period, so opening hours never close a vendor. For days of the week, add an entry beside it, such as `{ when: calendar.weekend(), reason: 'No market at weekends.' }`.

A vendor that stands somewhere lists [`places.onlyAt()`](/docs/0.1.0/reference/plugins/places#functions) in its `blocked` with `hide`, as the counter does above. Away from the café, buying and selling are refused with the entry's reason, and the vendor's `here` is `false`, so a UI that lists the vendors here leaves it out. The entry's `when` is `places.away('cafe')`, which never holds in a game without places, so there the vendor sells everywhere.

A vendor's `blocked` and its location's `blocked` are separate. The location's stops the player walking in, and the vendor's stops it trading, so the showcase sets both to close the café and its counter together.

### Sellable

The data of the `shop/sellable` trait, a thing's price wherever a vendor sells it without a `price` of its own. Every field is in [`Sellable`](/docs/0.1.0/api/plugin-shop#sellable).

`shop.sellable(price)` writes the trait, to spread into `traits` beside other plugins' traits, such as the [inventory](/docs/0.1.0/reference/plugins/inventory)'s `usable`. The trait goes on a kind as a default, on an entity, or in content's [`traits`](/docs/0.1.0/reference/content#traits) table, where a mod can change a price. A thing made in play `like` a sellable one has its price.

```ts
import type { Content } from '@ifloom/engine'
import { shop } from '@ifloom/plugin-shop'

export const market: Content = {
  kinds: [{ id: 'fruit', label: 'Fruit', listed: false, traits: { ...shop.sellable({ coins: 1 }) } }],
  entities: [
    { id: 'apple', of: 'fruit', name: 'apple' },
    { id: 'fig', of: 'fruit', name: 'fig', traits: { ...shop.sellable({ coins: 3 }) } },
  ],
}
```

## Conditions

Each condition is a [plugin call](/docs/0.1.0/reference/custom#plugincall), written by the helper beside it. An unknown vendor or thing is false.

### shop/open

Holds while the vendor is open, when none of its `blocked` entries without `hide` holds. Where the player is doesn't matter.

```ts fragment
{ 'shop/open': { vendor: 'counter' } } // shop.vendorOpen('counter')
```

### shop/outside

Holds while the calendar's period of the day is none of these. It never holds in a game without the calendar. `shop.hours()` closes a vendor with it.

```ts fragment
{ 'shop/outside': { period: ['morning', 'afternoon'] } } // shop.outside('morning', 'afternoon')
```

### shop/inStock

Holds while the vendor offers the thing now and has at least one left. It always holds for a good that never runs out, while the good is on offer.

```ts fragment
{ 'shop/inStock': { vendor: 'counter', entity: 'food:flapjack' } } // shop.inStock('counter', 'food:flapjack')
```

## Commands

Both commands list the effects they apply, so a [lock](/docs/0.1.0/reference/locks) with `effect` sees them, and a lock names them `shop/buy` and `shop/sell`, or both as `shop/*`. Paying applies a [`stat`](/docs/0.1.0/reference/effects#stat) effect for each stat, so the game's [`onStat`](/docs/0.1.0/reference/rules) hook sees it. "You" is whoever the player is playing, [`'you'`](/docs/0.1.0/reference/glossary#you).

### shop/buy

Pays today's price for `count` of the thing (1 if left out) and gives them to you. A good with a stock moves from the vendor, and any other good is made new.

```ts fragment
{ 'shop/buy': { vendor: 'counter', entity: 'food:flapjack' } } // shop.buy('counter', 'food:flapjack')
```

The command tells the engine what it spends (the [`spends`](/docs/0.1.0/reference/plugin-api#spends) of a plugin command), so a button that sends it shows today's price, discount included, written through each stat's `format`. Its `disabled` is the reason the command would be refused. A location's action that sends `shop.buy` is a shop on its own, with no counter.

The plugin refuses it, in this order:

1. With `That isn’t for sale here.` (`shop/unknown`) for a vendor or thing the game doesn't have, or a good whose `when` doesn't hold.
2. With the reason of the vendor's first `blocked` entry that holds, such as `You aren’t at that shop.` or `Closed.`.
3. With `Sold out.` (`shop/soldOut`) when the vendor holds fewer than `count`.
4. With the stat's [`lacking`](/docs/0.1.0/reference/stats#statwords) line, such as `You need 4 coins.`, when you have too little.

### shop/sell

Takes `count` of the thing from you (1 if left out) and pays the vendor's `buysBack` fraction of its full price, rounded down for each one. A good with a stock goes back to the vendor, and any other good is removed.

```ts fragment
{ 'shop/sell': { vendor: 'counter', entity: 'food:sandwich' } } // shop.sell('counter', 'food:sandwich')
```

The plugin refuses it, in this order:

1. With `That isn’t for sale here.` for a vendor or thing the game doesn't have, or a good whose `when` doesn't hold.
2. With `They don’t buy things back.` (`shop/noBuyBack`) for a vendor with no `buysBack`.
3. With the reason of the vendor's first `blocked` entry that holds.
4. With `You don’t have that.` (`shop/notOwned`) when you hold fewer than `count`.

## State

### ShopState

The restocks a save keeps at `state.plugins.shop`. Every field is in [`ShopState`](/docs/0.1.0/api/plugin-shop#shopstate).

The stock itself is what each vendor's entity holds, in [`state.held`](/docs/0.1.0/reference/state#held), and the plugin reads the goods from content. For each vendor and good with a stock, the save keeps a [`StockRecord`](#stockrecord). A UI reads [`ShopView`](#shopview) instead.

### StockRecord

When the plugin last topped up one vendor's stock of one good, in `stocked`, by vendor and then by thing. Every field is in [`StockRecord`](/docs/0.1.0/api/plugin-shop#stockrecord).

`at` is the turn or the day of the last top-up, and `0` for a good that never restocks. When the turn or the day moves past `at`, the stock reads as full again before anything writes it.

## View

The plugin adds nothing to the room or the screen. A vendor shows when content opens its counter in the `shop` [panel](/docs/0.1.0/reference/panels) with `shop.open(vendor)`, or when a UI lists the vendors itself.

### ShopView

The vendors as the player sees them, in `view.plugins.shop`. Every field is in [`ShopView`](/docs/0.1.0/api/plugin-shop#shopview).

`vendors` lists every vendor, in the order the game declares them, those made in play last. `panel` is the vendor whose counter the open `shop` panel shows, found by its `with.vendor` as an id or a whole reference through the engine's [`panelOf`](/docs/0.1.0/reference/panels#panelof), or `null` while no `shop` panel is open.

```ts fragment
{ vendors: [{ id: 'counter', ref: 'vendor:counter', name: 'The counter', here: true, closed: null, buysBack: true, goods: [ … ] }], panel: null }
```

### VendorView

One vendor as the player sees it, an entry of `vendors`. Every field is in [`VendorView`](/docs/0.1.0/api/plugin-shop#vendorview).

`id` is how the commands name the vendor, its bare id for one of the `vendor` kind and its whole reference for any other. `here` is `true` while none of its `blocked` entries with `hide` holds. `closed` is the reason of its first `blocked` entry without `hide` that holds, or `null` while it's open. `goods` lists the goods on offer now, leaving out one whose `when` doesn't hold or whose thing the game doesn't have.

### GoodView

One good as the player sees it, an entry of a vendor's `goods`. Every field is in [`GoodView`](/docs/0.1.0/api/plugin-shop#goodview).

`buy` and `sell` are [`RenderedChoice`](/docs/0.1.0/reference/view#renderedchoice) buttons labelled with the thing's name, each with today's `price` and the reason it's refused in `disabled`. `sell` and `sellFor` are `null` for a vendor that takes nothing back. `stock` is `null` for a good that never runs out, `owned` counts what you hold, and `off` is today's discount. `fullPrice` is the price before the discount, and `null` on a day the good isn't marked down.

[Render a shop counter](/docs/0.1.0/how-to/render/things-plugins#render-a-shop-counter) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-shop/react` subpath renders a vendor's counter for a game that uses [`@ifloom/react`](/docs/0.1.0/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/0.1.0/how-to/react/show-plugin-uis) adds it to a game.

### shopUi

The plugin's [`PluginUi`](/docs/0.1.0/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It renders the `shop` panel as the open vendor's [`ShopCounter`](#shopcounter), titled with its name, and adds nothing else to the layout. Its type is in [`shopUi`](/docs/0.1.0/api/plugin-shop#shopui).

### SHOP_WORDS

The words the shop UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`SHOP_WORDS`](/docs/0.1.0/api/plugin-shop#shop_words).

| Key | Meaning |
|---|---|
| `ui.buy` | `Buy`, the label of a good's buy button. |
| `ui.sellFor` | `Sell for {price}`, the label of a good's sell button. |
| `ui.stockLeft` | `{n} left`, the stock of a good that can run out. |
| `ui.owned` | `You have {n}`, the count you hold. |
| `ui.percentOff` | `{percent}% off`, the badge on a good marked down today. |
| `ui.noGoods` | `Nothing for sale.`, the line of a vendor with nothing on offer. |

### ShopCounter

Renders one vendor's goods from its [`VendorView`](#vendorview). Its props are in [`ShopCounterProps`](/docs/0.1.0/api/plugin-shop#shopcounterprops).

A closed vendor shows its `closed` line above its goods. Each good shows its picture, name and description, today's discount with the full price struck out, the stock left and the count you hold. Its **Buy** button is a [`ChoiceButton`](/docs/0.1.0/reference/react/components#choicebutton) from the good's `buy`, so it shows the price and the reason it's refused, such as `Sold out.`. A **Sell for 2 coins** button from the good's `sell` follows while the vendor buys back and you hold one.

A game replaces it as `ShopCounter` in [`components`](/docs/0.1.0/reference/react/components#components). Its parts are `shop` (with `data-vendor`, and `data-closed` while closed), `shop-closed`, `shop-empty`, `goods`, `good` (with `data-good`), `good-image`, `good-name`, `good-desc`, `good-details`, `good-off`, `good-full-price`, `good-stock`, `good-owned`, `good-actions` and `choice`.

### ShopDialog

Renders the vendor with the id `vendorId` as a `ShopCounter` in a dialog titled with its name, closed while `vendorId` is `null` or names no vendor. Its props are in [`ShopDialogProps`](/docs/0.1.0/api/plugin-shop#shopdialogprops).

It sends no command and keeps nothing in the state, so it suits a button that is only UI. Content opens a counter that the save remembers with `shop.open()` instead. A game replaces it as `ShopDialog` in `components`, and its parts are `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

```tsx
import { useState } from 'react'
import { Button } from '@ifloom/react/kit'
import { ShopDialog } from '@ifloom/plugin-shop/react'

export function CounterButton() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen('counter')}>
        The café counter
      </Button>
      <ShopDialog vendorId={open} onClose={() => setOpen(null)} />
    </>
  )
}
```

### useShop

Returns the shop's view from the running game with the vendors here and a `buy` and a `sell` that send its commands, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useShop`](/docs/0.1.0/api/plugin-shop#useshop).

### ShopControls

The value `useShop` returns, a [`ShopView`](#shopview) with `here`, `buy(vendor, entity, count?)` and `sell(vendor, entity, count?)`. Every field is in [`ShopControls`](/docs/0.1.0/api/plugin-shop#shopcontrols). `here` lists the vendors whose `here` is `true`, and `buy` and `sell` return the runner's [`Result`](/docs/0.1.0/reference/common#result), so a refusal comes back with its reason.

```tsx
import { useShop } from '@ifloom/plugin-shop/react'

export function QuickSandwich() {
  const shop = useShop()
  const counter = shop?.here[0]
  const sandwich = counter?.goods.find((good) => good.entity === 'item:sandwich')
  if (!shop || !counter || !sandwich) return null
  return (
    <button disabled={Boolean(sandwich.buy.disabled)} onClick={() => shop.buy(counter.id, 'item:sandwich')}>
      A sandwich to go
    </button>
  )
}
```

## Functions

The helpers are properties of `shop` and write its calls, typed:

- **`shop.vendor(def)`** returns a vendor's [`EntityDef`](#vendordef).
- **`shop.vendorRef(vendor)`** returns a vendor's entity reference, `'vendor:counter'` for `'counter'`, and a reference as written.
- **`shop.sellable(price)`** returns the [`shop/sellable`](#sellable) trait, to spread into `traits`.
- **`shop.hours(periods, reason?)`** returns a [`blocked`](#vendor) entry for opening hours.
- **`shop.buy(vendor, entity, count?)`** and **`shop.sell(vendor, entity, count?)`** return the [commands](#commands) as a [`CommandRef`](/docs/0.1.0/reference/custom#commandref).
- **`shop.vendorOpen(vendor)`**, **`shop.outside(...periods)`** and **`shop.inStock(vendor, entity)`** return the [conditions](#conditions).
- **`shop.open(vendor)`** returns the engine's [`panel`](/docs/0.1.0/reference/effects#panel) effect that opens the vendor's counter, `{ panel: 'shop', with: { vendor } }`.

The café's action opens the counter:

```ts
import type { ActionDef } from '@ifloom/engine'
import { shop } from '@ifloom/plugin-shop'

export const counter: ActionDef = { id: 'counter', label: 'Go to the counter', effects: [shop.open('counter')] }
```

### vendorsOf

Returns every entity in the game now that carries the `shop/vendor` trait, as references, those content declares in its order and then those made in play. Its signature is in [`vendorsOf`](/docs/0.1.0/api/plugin-shop#vendorsof).

### vendorOf

Returns the [`Vendor`](#vendor) trait of the vendor with this id or reference, leaving out any good that names no thing, or `undefined` for anything that isn't a vendor. Its signature is in [`vendorOf`](/docs/0.1.0/api/plugin-shop#vendorof).

### sellableOf

Returns a thing's [`Sellable`](#sellable) trait, read through the thing it was made `like`, or `undefined` for a thing without one. Its signature is in [`sellableOf`](/docs/0.1.0/api/plugin-shop#sellableof).

```ts given
import { sellableOf, vendorOf, vendorsOf } from '@ifloom/plugin-shop'

vendorsOf(state, game) // ['vendor:counter']
vendorOf(state, game, 'counter')?.buysBack // 0.5
sellableOf(state, game, 'food:sandwich')?.price // { coins: 4 }
```

## Checks

When the game loads, the plugin checks the `shop/vendor` trait on each vendor. A vendor's problems are pinned on the content or pack it came from, with `where` as `trait shop/vendor on <ref>`.

| Problem | Cause |
|---|---|
| `a vendor needs its goods: goods: [] for none` | The trait has no `goods` list. |
| `a good names no thing: write { entity: "kind:id" }` | A good has no `entity`. |
| `good gem:ruby: unknown entity "gem:ruby"` | A good, its price or its `when` names something the game doesn't have. |
| `sells "food:apple" twice` | Two goods name the same thing. |
| `good gem:ruby: no price: give the good a price, or the thing a shop/sellable trait` | A good has no `price`, and its thing has no `shop/sellable` trait. |
| `good stone:moon: price in stat "charm", which is not spendable` | A price is in a stat that isn't `spendable`, or one that is derived. |
| `good stone:moon: price must be 0 or more`, `stock must be 0 or more` | A price or a stock is negative. |
| `good stone:moon: restock needs a stock` | A good has `restock` and no `stock`. |
| `good gem:ruby: a unique thing has a stock of 1 at most` | A unique thing's `stock` is above 1. |
| `buysBack must be between 0 and 1`, `discounts.off must be more than 0 and at most 1` | `buysBack` or `discounts.off` is out of range. |
| `blocked: unknown entity "location:moon"` | A `blocked` entry names something the game doesn't have, such as a location in `places.onlyAt()`, which places reports. |

A `shop/buy`, `shop/sell` or condition that names a vendor or thing the game doesn't have gives `unknown entity "vendor:kiosk"` where it's written, and one that names an entity without the trait gives `"item:paper" has no shop/vendor trait`. A `count` that isn't a whole number from 1 is reported too. A `shop` panel opened for a vendor the game doesn't have gives `unknown entity "vendor:kiosk"`, and one with no vendor gives `the shop panel needs a vendor: { vendor: "<id>" }`. The `shop/sellable` trait's price is checked on each entity that carries it.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/0.1.0/reference/strings#stringkey-and-strings).

| Key | Meaning |
|---|---|
| `shop/unknown` | `That isn’t for sale here.`, the refusal of a vendor, thing or good that isn't on offer. |
| `shop/notHere` | `You aren’t at that shop.`, a reason for a vendor's `places.onlyAt()` entry, written `{ string: 'shop/notHere' }`. The plugin doesn't use it itself. |
| `shop/closed` | `Closed.`, the reason `shop.hours()` writes when given none. |
| `shop/soldOut` | `Sold out.` |
| `shop/noBuyBack` | `They don’t buy things back.` |
| `shop/notOwned` | `You don’t have that.` |

## Caveats

- A `traits` row replaces the whole `shop/vendor` trait, so a mod that changes a vendor's goods gives every field the vendor needs, its `blocked` included.
- Selling back pays from the full price, not from today's discounted one.
- Selling back a good that never runs out removes the thing, and no vendor holds it after.
- Opening a counter doesn't move the player, so a counter opened away from a vendor with a `places.onlyAt()` entry shows every button refused with that entry's reason.
