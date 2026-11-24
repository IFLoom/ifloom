---
title: "Render timers, minigames and panels"
description: "Render timer countdowns, a running minigame and an open panel in a UI of your own, in plain JS, React or Vue."
---
Render the countdowns of running timers, a minigame while the player plays it, and a [panel](/docs/reference/glossary#panel) open over the story. Set up the runner first, with `startClock` beside it, as [Start your own UI](/docs/how-to/render/start) shows. The engine keeps no clock, so timers and minigames stand still until something sends ticks.

## Render timers

`view.timers` lists each running [timer](/docs/reference/glossary#timer) in the order they started, as a [`TimerView`](/docs/api/engine#timerview) with its `id`, its `label`, and the milliseconds `left` of its `total`. The React UI's `Scene` renders a [`Countdown`](/docs/api/react#countdown) under a block whose `timer` hint names a timer, [`Timers`](/docs/api/react#timers) renders them all, and [`useTimer`](/docs/api/react#usetimer) gives you one to render your own way.

::include[../../../../../snippets/plain/timers.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/timers.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Timers.vue]{meta='tab="Vue" tab-group="framework"'}

Render the countdown from `left / total`, and the seconds from `left`. A timer is in the view only while it runs, so its countdown goes when it runs out or the game stops it. To put a countdown under the block that names it, read the block's hint from each beat, `beat.ui?.timer`. A `<progress>` moves in steps with each tick, so for a smooth bar scale a `div` with `transform: scaleX(left / total)` and a 100 ms linear transition.

## Render a minigame

`view.minigame` holds the [minigame](/docs/reference/minigames) being played, as a [`MinigameView`](/docs/api/engine#minigameview), and `view.scene` holds its title and the running state's words. The React UI's `Scene` renders a [`MinigameCard`](/docs/api/react#minigamecard) while one runs, and [`useMinigame`](/docs/api/react#useminigame) reads it for a component of your own.

::include[../../../../../snippets/plain/minigame.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/minigame.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Minigame.vue]{meta='tab="Vue" tab-group="framework"'}

Each of the minigame's `inputs` is a ready button, with its words in `label` and the `{ type: 'minigame', input }` it sends in `command`. Render a bar from `timeLeft` and `timeTotal` while the state has a timer, and read the minigame's own kv store in `kv`, such as a score. [`startKeys`](/docs/api/browser#startkeys) presses the inputs on the minigame's `keys`, or on the arrow keys and space, whatever renders the panel.

To render one minigame your own way, check `view.minigame.id`, such as the showcase's `arrows`. In the React UI, give `mountGame`'s `panels` a component under the minigame's id, such as `{ arrows: ArrowPad }`, and it renders in place of the `MinigameCard`.

## Render a panel

`view.panel` holds the panel open over the story, as an [`OpenPanel`](/docs/api/engine#openpanel) with its name in `panel` and what content opened it with in `with`, or null. The React UI's [`PanelHost`](/docs/api/react#panelhost) renders the panels it knows over the story in the default layout, and a panel of your own goes in `mountGame`'s `panels` under its name.

::include[../../../../../snippets/plain/panel.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-panels.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Panel.vue]{meta='tab="Vue" tab-group="framework"'}

Render the panel by its name, over everything else. A plugin's panel shows what its own view holds for it, such as the open counter's vendor in `view.plugins.shop.panel`, already filtered by the panel's `with`. Send `{ type: 'closePanel' }` when the player closes it. A scene's own panel has `scene` set and stays while the scene is open, so give it no Close button.

The `vanilla` and `vue` templates start with a panel that shows its name and `with`, for you to replace. In the React UI, `PanelHost` renders `inventory` and `stats` itself, and each plugin UI the game lists in `plugins` brings its own, such as `shop` and `jobs`. [Render the inventory, shop, jobs and wardrobe](/docs/how-to/render/things-plugins) renders the shop's and the jobs' panels.

For more on what these sections render, see:

- [Timers](/docs/reference/timers), [Minigames](/docs/reference/minigames) and [Panels](/docs/reference/panels).
- [Browser helpers](/docs/api/browser), for `startClock` and `startKeys`.
- [Add a countdown](/docs/how-to/add-a-countdown), [Build a minigame](/docs/how-to/build-a-minigame) and [Open a shop, a job board or another panel](/docs/how-to/open-a-panel).
