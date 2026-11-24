---
title: "Render the inventory, shop, jobs and wardrobe"
description: "How-to for rendering the inventory, shop, jobs and wardrobe plugins in a UI of your own, in plain JS, React and Vue: things to use and drop, a vendor's counter with prices and discounts, a job board, and what the player wears."
---
Render the plugins that deal in [things](/docs/reference/glossary#thing) and work: what the player can use or drop from the [inventory](/docs/reference/plugins/inventory), a vendor's counter from the [shop](/docs/reference/plugins/shop), a board from [jobs](/docs/reference/plugins/jobs), and what the player wears from the [wardrobe](/docs/reference/plugins/wardrobe). Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) explains.

The shop's counter, the job board and the wardrobe open as [panels](/docs/reference/glossary#panel), so render each by its name from the panel part that [Render a panel](/docs/how-to/render/timers-minigames-panels#render-a-panel) builds. The Plain JS tabs here are the functions that part calls.

## Render things to use and drop

`view.plugins.inventory` holds what you hold as an [`InventoryView`](/docs/api/plugin-inventory#inventoryview), with each thing in `things`, the played protagonist's first and then the player's. The React UI's [`InventoryCard`](/docs/api/plugin-inventory#inventorycard), from `inventoryUi`, renders in place of the React UI's own `Inventory` in the side column.

::include[../../../../../snippets/plain/inventory.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-inventory.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Inventory.vue]{meta='tab="Vue" tab-group="framework"'}

Each thing has its `name`, `description`, `image` and `count`, a `drop` button, and a `use` button when it has a use. The plugin's strings word both buttons, and a refused one has its reason in `disabled`. `view.held` lists the same things without the buttons, which [Render what the player holds](/docs/how-to/render/stats-and-things#render-what-the-player-holds) renders. [`useInventory`](/docs/api/plugin-inventory#useinventory) gives the inventory's view to a React component of your own.

## Render a shop counter

`view.plugins.shop.panel` holds the vendor whose counter is open as a [`VendorView`](/docs/api/plugin-shop#vendorview), or null while none is. The React UI's `shopUi` renders the `shop` panel as that vendor's [`ShopCounter`](/docs/api/plugin-shop#shopcounter), in a dialog titled with its name.

::include[../../../../../snippets/plain/shop.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-shop.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/ShopCounter.vue]{meta='tab="Vue" tab-group="framework"'}

Nothing about a vendor shows until content opens its counter with `shop.open('counter')`, which sets `view.panel` to `{ panel: 'shop', with: { vendor: 'counter' } }`. Each of the vendor's `goods` is a [`GoodView`](/docs/api/plugin-shop#goodview) with a `buy` button, and a `sell` button when the vendor buys things back. Each button's `price` is today's, discount included, and its `disabled` is the reason it's refused, such as `Sold out.` or `You need 4 coins.`.

Render `fullPrice` struck out beside the price, since it's set only on a day the good is marked down. `stock` is null for a good that never runs out. `closed` is the reason the vendor is shut, such as its opening hours, while it is. [`useShop`](/docs/api/plugin-shop#useshop) gives the shop's view to a React component of your own.

A shop needs no counter. A location's actions can send `shop.buy` directly, and they come in `view.actions` with their price and reason like any other button. `view.plugins.shop.vendors` lists every vendor, with `here` and `closed` worked out, for a UI that shows a vendor without a panel.

## Render a job board

`view.plugins.jobs.panel` holds the jobs on the open board, each a [`JobView`](/docs/api/plugin-jobs#jobview), or null while the board is shut. The React UI's `jobsUi` renders the `jobs` panel as the [`JobBoard`](/docs/api/plugin-jobs#jobboard), in a dialog.

::include[../../../../../snippets/plain/jobs.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-jobs.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/JobBoard.vue]{meta='tab="Vue" tab-group="framework"'}

Content opens the board with `jobs.open()`, or `jobs.open(['dogs'])` for only some jobs, and the plugin has already filtered `panel` to those. A job not held has an `apply` button, whose `disabled` is the reason an application is refused. A job held has a `work` button, with the shift's cost as its `price`, and a `quit` button.

Each job also has its `pay` for a shift, its `rank` while held, and `nextShift`. `nextShift.inDays` is how many days away the next shift is, 0 for today, and its `day` is the calendar's day, or the turn without a calendar. The plugin raises notices tagged `jobs` for promotions and firing. `view.plugins.jobs.jobs` lists every job, held or not, and [`useJobs`](/docs/api/plugin-jobs#usejobs) gives the jobs' view to a React component of your own.

## Render what the player wears

`view.plugins.wardrobe` holds what whoever you're playing wears as a [`WardrobeView`](/docs/api/plugin-wardrobe#wardrobeview), with each slot in `slots` and the things you could put on in `spare`. The React UI's `wardrobeUi` renders the `wardrobe` panel as the [`WardrobeCard`](/docs/api/plugin-wardrobe#wardrobecard), which a closet location's button opens.

::include[../../../../../snippets/plain/wardrobe.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-wardrobe.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Wardrobe.vue]{meta='tab="Vue" tab-group="framework"'}

Each slot has its `label`, the `name` of the thing in it or null, and a `takeOff` button while it holds something. Each spare thing has a `wear` button, which the plugin's strings word, such as **Wear raincoat**. `wardrobeUi` adds nothing to the side column, so place [`WardrobeSection`](/docs/api/plugin-wardrobe#wardrobesection) in your layout's `Sidebar` to keep what the player wears on screen. [`useWardrobe`](/docs/api/plugin-wardrobe#usewardrobe) gives the wardrobe's view to a React component of your own.

For more on what these sections render, see:

- [Inventory](/docs/reference/plugins/inventory), [Shop](/docs/reference/plugins/shop), [Jobs](/docs/reference/plugins/jobs) and [Wardrobe](/docs/reference/plugins/wardrobe).
- [Panels](/docs/reference/panels).
- [Give the player things to hold and use](/docs/how-to/give-the-player-things), [Open a shop, a job board or another panel](/docs/how-to/open-a-panel) and [Let the player get dressed](/docs/how-to/dress-the-player).
