---
title: "Render stats, things and what changed"
description: "Render the stats, the things the player holds, what the last command changed, notices and dice rolls in a UI of your own."
---
Render the numbers and lists around the story: the player's stats, the [things](/docs/reference/glossary#thing) the player holds, what the last command changed, notices and dice. Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows.

## Render the stats

`view.stats` lists the player's stats that are listed and visible now, in the order the game declares them, each a [`StatView`](/docs/api/engine#statview). The React UI's [`StatList`](/docs/api/react#statlist) renders them in the side column of the default layout, as bars or pips when a stat's `display` hint asks.

::include[../../../../../snippets/plain/stats.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/stats.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Stats.vue]{meta='tab="Vue" tab-group="framework"'}

Each stat has its `label`, its value written through its `format` as `text`, such as "12 coins", and its `min` and `max` for a bar. A stat with levels has `level`, with its level, the value the next one starts at, and `progress` towards it from 0 to 1. `view.statsById` has every stat by id, listed or not, for one you render your own way, such as a purse in the corner.

## Render what the player holds

`view.held` lists the things you hold, the protagonist's first while one is played, then the player's, each a [`HeldView`](/docs/api/engine#heldview) with its `name`, `description`, `image` and `count`. `view.entities` lists each listed [kind](/docs/reference/glossary#kind) with its entities, as [`EntitiesView`](/docs/api/engine#entitiesview)s. The React UI's [`Inventory`](/docs/api/react#inventory) renders what you hold in the side column of the default layout, and [`EntityTable`](/docs/api/react#entitytable) renders a listed kind as a table wherever you place it.

::include[../../../../../snippets/plain/entities.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/entities.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Entities.vue]{meta='tab="Vue" tab-group="framework"'}

Each entity in `view.entities` carries the stats the player can see on it and its kind's [flags](/docs/reference/glossary#flags), such as `{ met: true }`. Split or style the list by its flags, such as the people you've met and the rest. The engine has already left out every entity that isn't listed, so your UI hides nothing more.

## Render what changed

`view.changes` lists the stats the last command moved, each a [`ChangeView`](/docs/api/engine#changeview) with its signed `text`, the `name` of what moved, and `by`, which is positive when it went up. The React UI's [`Changes`](/docs/api/react#changes) renders them as pills, and the default layout leaves it out, so the React tab places it after the scene.

::include[../../../../../snippets/plain/changes.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/changes.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Changes.vue]{meta='tab="Vue" tab-group="framework"'}

The list stays empty until the game names the stats to track in its content's `changes.stats` ([`ChangesDef`](/docs/api/engine#changesdef)). It compares the stats before and after the command, so a stat that went up and back down in one command isn't listed. A change from a plugin's modifier, such as a status starting, is listed too.

## Render notices

`view.notices.unseen` lists every [notice](/docs/reference/notices) the player hasn't dismissed, newest first, each a [`NoticeView`](/docs/api/engine#noticeview) with its `title`, `text`, `image` and `tag`. The React UI's [`Notices`](/docs/api/react#notices) renders them as toasts in a corner, in the default layout's `Overlay`, and [`NoticeStrip`](/docs/api/react#noticestrip) renders them as a strip over the story instead.

::include[../../../../../snippets/plain/notices.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/notices.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Notices.vue]{meta='tab="Vue" tab-group="framework"'}

Send `{ type: 'dismiss', id }` when the player has read a notice, or `{ type: 'dismiss' }` to dismiss them all. `view.notices.byTag` counts the unseen notices by tag, for a badge on the post or the phone.

## Render dice rolls

`view.rolls` lists the rolls the last command made, in order, each a [`Roll`](/docs/api/engine#roll) with its dice, each die's face, what was added, the total and, with a target, whether it passed. The React UI's `Scene` renders a [`DiceRoll`](/docs/api/react#diceroll) above a block whose `dice` hint names the roll, and the other rolls over the scene for a moment.

::include[../../../../../snippets/plain/rolls.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/rolls.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Rolls.vue]{meta='tab="Vue" tab-group="framework"'}

The next command clears `view.rolls`, so each roll shows once. To put the dice beside the line that tells the outcome, find the beat whose block names the roll in its hint, `beat.ui?.dice`. Put the rolls in an element with `aria-live="polite"`, so a screen reader reads the result.

For more on what these sections render, see:

- [Stats](/docs/reference/stats), [Entities](/docs/reference/entities), [Changes](/docs/reference/changes), [Notices](/docs/reference/notices) and [Rolls](/docs/reference/rolls).
- [The view](/docs/reference/view).
- [Give the player things to hold and use](/docs/how-to/give-the-player-things), [Tell the player when something happens](/docs/how-to/show-a-notice) and [Roll dice for a check](/docs/how-to/roll-dice).
