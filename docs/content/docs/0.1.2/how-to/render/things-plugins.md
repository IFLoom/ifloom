---
title: "Render the inventory, shop, jobs and wardrobe"
description: "Render the things to use and drop, a vendor's counter, a job board and what the player wears in a UI of your own."
---
Render the plugins that deal in [things](/docs/0.1.2/reference/glossary#thing) and work: what the player can use or drop from the [inventory](/docs/0.1.2/reference/plugins/inventory), a vendor's counter from the [shop](/docs/0.1.2/reference/plugins/shop), a board from [jobs](/docs/0.1.2/reference/plugins/jobs), and what the player wears from the [wardrobe](/docs/0.1.2/reference/plugins/wardrobe). Set up the runner first, as [Start your own UI](/docs/0.1.2/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) explains.

The shop's counter, the job board and the wardrobe open as [panels](/docs/0.1.2/reference/glossary#panel), so render each by its name from the panel part that [Render a panel](/docs/0.1.2/how-to/render/timers-minigames-panels#render-a-panel) builds. The Plain JS tabs here are the functions that part calls.

## Render things to use and drop

`view.plugins.inventory` holds what you hold as an [`InventoryView`](/docs/0.1.2/api/plugin-inventory#inventoryview), with each thing in `things`, the played protagonist's first and then the player's. The React UI's [`InventoryCard`](/docs/0.1.2/api/plugin-inventory#inventorycard), from `inventoryUi`, renders in place of the React UI's own `Inventory` in the side column.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** What you hold, each thing with a button to use it, when it has a use, and one to drop it. */
export function drawInventory(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const inventory = view.plugins.inventory
  if (!inventory) return
  for (const thing of inventory.things) {
    const row = add(parent, 'div', '', 'thing')
    add(row, 'span', thing.count > 1 ? `${thing.name} ×${thing.count}` : thing.name).title = thing.description ?? ''
    drawChoices(row, thing.use ? [thing.use, thing.drop] : [thing.drop])
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { inventoryUi } from '@ifloom/plugin-inventory/react'
import module from './game.ts'

// InventoryCard is rendered in the sidebar and the inventory panel, with a button that uses each usable thing.
mountGame(module.build(), { plugins: [inventoryUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// What you hold, each thing with a button to use it, when it has a use, and one to drop it.
</script>

<template>
  <div v-for="thing in view.plugins.inventory?.things" :key="`${thing.at}/${thing.ref}`" class="thing">
    <span :title="thing.description ?? ''">{{ thing.count > 1 ? `${thing.name} ×${thing.count}` : thing.name }}</span>
    <button
      v-for="button in thing.use ? [thing.use, thing.drop] : [thing.drop]"
      :key="button.id"
      :disabled="Boolean(button.disabled)"
      :title="button.disabled"
      @click="runner.apply(button.command)"
    >
      {{ button.label }}
    </button>
  </div>
</template>
```

Each thing has its `name`, `description`, `image` and `count`, a `drop` button, and a `use` button when it has a use. The plugin's strings word both buttons, and a refused one has its reason in `disabled`. `view.held` lists the same things without the buttons, which [Render what the player holds](/docs/0.1.2/how-to/render/stats-and-things#render-what-the-player-holds) renders. [`useInventory`](/docs/0.1.2/api/plugin-inventory#useinventory) gives the inventory's view to a React component of your own.

## Render a shop counter

`view.plugins.shop.panel` holds the vendor whose counter is open as a [`VendorView`](/docs/0.1.2/api/plugin-shop#vendorview), or null while none is. The React UI's `shopUi` renders the `shop` panel as that vendor's [`ShopCounter`](/docs/0.1.2/api/plugin-shop#shopcounter), in a dialog titled with its name.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// runner, add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The `shop` panel, from drawPanel: shop.open('counter') opens it with { vendor: 'counter' }. */
export function drawShop(parent: HTMLElement, { view }: RunnerSnapshot): void {
  // The vendor whose counter the open panel shows; null while it's shut.
  const vendor = view.plugins.shop?.panel
  if (!vendor) return
  add(parent, 'h2', vendor.name)
  if (vendor.closed) add(parent, 'p', vendor.closed, 'reason')
  for (const good of vendor.goods) {
    const row = add(parent, 'div', '', 'good')
    add(row, 'strong', good.name)
    if (good.buy.price) add(row, 'span', good.buy.price.text, 'price')
    if (good.stock !== null) add(row, 'span', `${good.stock} left`, 'stock')
    // Ready-made buttons, with today's price and why one can't be pressed.
    drawChoices(row, good.sell ? [good.buy, good.sell] : [good.buy])
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { shopUi } from '@ifloom/plugin-shop/react'
import module from './game.ts'

// The shop panel is rendered as the vendor's counter, in a dialog titled with its name.
mountGame(module.build(), { plugins: [shopUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The `shop` panel, shown from Panel.vue: shop.open('counter') opens it with { vendor: 'counter' }.
// The vendor whose counter the open panel shows; null while it's shut.
const vendor = computed(() => view.value.plugins.shop?.panel)
</script>

<template>
  <div v-if="vendor" class="shop">
    <h2>{{ vendor.name }}</h2>
    <p v-if="vendor.closed" class="reason">{{ vendor.closed }}</p>
    <div v-for="good in vendor.goods" :key="good.entity" class="good">
      <strong>{{ good.name }}</strong>
      <span v-if="good.buy.price" class="price">{{ good.buy.price.text }}</span>
      <span v-if="good.stock !== null" class="stock">{{ good.stock }} left</span>
      <!-- Ready-made buttons, with today's price and why one can't be pressed. -->
      <button
        v-for="button in good.sell ? [good.buy, good.sell] : [good.buy]"
        :key="button.id"
        :disabled="Boolean(button.disabled)"
        :title="button.disabled"
        @click="runner.apply(button.command)"
      >
        {{ button.label }}
      </button>
    </div>
  </div>
</template>
```

Nothing about a vendor shows until content opens its counter with `shop.open('counter')`, which sets `view.panel` to `{ panel: 'shop', with: { vendor: 'counter' } }`. Each of the vendor's `goods` is a [`GoodView`](/docs/0.1.2/api/plugin-shop#goodview) with a `buy` button, and a `sell` button when the vendor buys things back. Each button's `price` is today's, discount included, and its `disabled` is the reason it's refused, such as `Sold out.` or `You need 4 coins.`.

Render `fullPrice` struck out beside the price, since it's set only on a day the good is marked down. `stock` is null for a good that never runs out. `closed` is the reason the vendor is shut, such as its opening hours, while it is. [`useShop`](/docs/0.1.2/api/plugin-shop#useshop) gives the shop's view to a React component of your own.

A shop needs no counter. A location's actions can send `shop.buy` directly, and they come in `view.actions` with their price and reason like any other button. `view.plugins.shop.vendors` lists every vendor, with `here` and `closed` worked out, for a UI that shows a vendor without a panel.

## Render a job board

`view.plugins.jobs.panel` holds the jobs on the open board, each a [`JobView`](/docs/0.1.2/api/plugin-jobs#jobview), or null while the board is shut. The React UI's `jobsUi` renders the `jobs` panel as the [`JobBoard`](/docs/0.1.2/api/plugin-jobs#jobboard), in a dialog.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The `jobs` panel, from drawPanel: jobs.open() opens it, and jobs.open(['dogs']) with only those. */
export function drawJobs(parent: HTMLElement, { view }: RunnerSnapshot): void {
  // The jobs on the open board, already filtered by what it was opened with; null while it's shut.
  for (const job of view.plugins.jobs?.panel ?? []) {
    const card = add(parent, 'section', '', 'job')
    add(card, 'h3', job.rank ? `${job.name}: ${job.rank.name}` : job.name)
    add(card, 'p', job.description)
    if (job.pay) add(card, 'p', `Pays ${job.pay.text} a shift`)
    if (job.nextShift) add(card, 'p', job.nextShift.inDays ? `Next shift in ${job.nextShift.inDays} days` : 'A shift today')
    // Ready-made buttons: Apply while you don't have the job, Work and Quit while you do, each with why it can't be done.
    drawChoices(
      card,
      [job.apply, job.work, job.quit].filter((button) => button !== null),
    )
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { jobsUi } from '@ifloom/plugin-jobs/react'
import module from './game.ts'

// The jobs panel is rendered as the JobBoard, with only the jobs it was opened with if it names any.
mountGame(module.build(), { plugins: [jobsUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import type { RenderedChoice } from '@ifloom/engine'
import { runner, view } from './runner.ts'

// The `jobs` panel, shown from Panel.vue: jobs.open() opens it, and jobs.open(['dogs']) with only those.
// The view's panel is the jobs on the open board, already filtered; null while it's shut.
const jobs = computed(() => view.value.plugins.jobs?.panel ?? [])
const buttons = (...all: (RenderedChoice | null)[]) => all.filter((button) => button !== null)
</script>

<template>
  <section v-for="job in jobs" :key="job.id" class="job">
    <h3>
      {{ job.name }}<template v-if="job.rank">: {{ job.rank.name }}</template>
    </h3>
    <p>{{ job.description }}</p>
    <p v-if="job.pay">Pays {{ job.pay.text }} a shift</p>
    <p v-if="job.nextShift">{{ job.nextShift.inDays ? `Next shift in ${job.nextShift.inDays} days` : 'A shift today' }}</p>
    <!-- Ready-made buttons: Apply while you don't have the job, Work while you do, each with why it can't be done. -->
    <button
      v-for="button in buttons(job.apply, job.work, job.quit)"
      :key="button.id"
      :disabled="Boolean(button.disabled)"
      :title="button.disabled"
      @click="runner.apply(button.command)"
    >
      {{ button.label }}
    </button>
  </section>
</template>
```

Content opens the board with `jobs.open()`, or `jobs.open(['dogs'])` for only some jobs, and the plugin has already filtered `panel` to those. A job not held has an `apply` button, whose `disabled` is the reason an application is refused. A job held has a `work` button, with the shift's cost as its `price`, and a `quit` button.

Each job also has its `pay` for a shift, its `rank` while held, and `nextShift`. `nextShift.inDays` is how many days away the next shift is, 0 for today, and its `day` is the calendar's day, or the turn without a calendar. The plugin raises notices tagged `jobs` for promotions and firing. `view.plugins.jobs.jobs` lists every job, held or not, and [`useJobs`](/docs/0.1.2/api/plugin-jobs#usejobs) gives the jobs' view to a React component of your own.

## Render what the player wears

`view.plugins.wardrobe` holds what whoever you're playing wears as a [`WardrobeView`](/docs/0.1.2/api/plugin-wardrobe#wardrobeview), with each slot in `slots` and the things you could put on in `spare`. The React UI's `wardrobeUi` renders the `wardrobe` panel as the [`WardrobeCard`](/docs/0.1.2/api/plugin-wardrobe#wardrobecard), which a closet location's button opens.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** What you have on, slot by slot, with a button to take each thing off, and what else you could wear. */
export function drawWardrobe(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const wardrobe = view.plugins.wardrobe
  if (!wardrobe) return
  for (const slot of wardrobe.slots) {
    const row = add(parent, 'div', '', 'slot')
    add(row, 'span', `${slot.label}: ${slot.name ?? 'nothing'}`)
    // Ready-made buttons, worded by the plugin's strings: Take off, Wear raincoat.
    if (slot.takeOff) drawChoices(row, [slot.takeOff])
  }
  drawChoices(
    parent,
    wardrobe.spare.map((spare) => spare.wear),
  )
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { wardrobeUi } from '@ifloom/plugin-wardrobe/react'
import module from './game.ts'

// The wardrobe panel renders the WardrobeCard: a place with wardrobe.closet() gets a button that opens it.
mountGame(module.build(), { plugins: [wardrobeUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// What you have on, slot by slot, with a button to take each thing off, and what else you could wear.
// The buttons are ready-made, worded by the plugin's strings: Take off, Wear raincoat.
</script>

<template>
  <template v-if="view.plugins.wardrobe">
    <div v-for="slot in view.plugins.wardrobe.slots" :key="slot.id" class="slot">
      {{ slot.label }}: {{ slot.name ?? 'nothing' }}
      <button v-if="slot.takeOff" :disabled="Boolean(slot.takeOff.disabled)" @click="runner.apply(slot.takeOff.command)">{{ slot.takeOff.label }}</button>
    </div>
    <button
      v-for="spare in view.plugins.wardrobe.spare"
      :key="spare.entity"
      :disabled="Boolean(spare.wear.disabled)"
      :title="spare.wear.disabled"
      @click="runner.apply(spare.wear.command)"
    >
      {{ spare.wear.label }}
    </button>
  </template>
</template>
```

Each slot has its `label`, the `name` of the thing in it or null, and a `takeOff` button while it holds something. Each spare thing has a `wear` button, which the plugin's strings word, such as **Wear raincoat**. `wardrobeUi` adds nothing to the side column, so place [`WardrobeSection`](/docs/0.1.2/api/plugin-wardrobe#wardrobesection) in your layout's `Sidebar` to keep what the player wears on screen. [`useWardrobe`](/docs/0.1.2/api/plugin-wardrobe#usewardrobe) gives the wardrobe's view to a React component of your own.

For more on what these sections render, see:

- [Inventory](/docs/0.1.2/reference/plugins/inventory), [Shop](/docs/0.1.2/reference/plugins/shop), [Jobs](/docs/0.1.2/reference/plugins/jobs) and [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe).
- [Panels](/docs/0.1.2/reference/panels).
- [Give the player things to hold and use](/docs/0.1.2/how-to/give-the-player-things), [Open a shop, a job board or another panel](/docs/0.1.2/how-to/open-a-panel) and [Let the player get dressed](/docs/0.1.2/how-to/dress-the-player).
