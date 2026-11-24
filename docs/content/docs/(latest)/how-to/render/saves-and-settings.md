---
title: "Render saves, settings and the backlog"
description: "How-to for rendering the screens around the story in a UI of your own, in plain JS, React and Vue: a save and load screen from the runner's snapshot, a settings screen, and the backlog with an Undo button."
---
Render the screens a player opens from a menu: saves to load, settings to change, and the [backlog](/docs/api/engine#backlogentry) of what was shown, with Undo. Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows. These parts read the runner's [snapshot](/docs/reference/glossary#snapshot) as well as its view, because saves, setting values, the backlog and undo belong to the runner rather than to the game state.

## Render a save and load screen

`snapshot.saves` lists the saves in the runner's save store, newest first, then any that can't be read. Each is a [`SaveMeta`](/docs/api/engine#savemeta) with its `name`, or `{ slot, broken }` with why it can't be read. The React UI's [`GameMenu`](/docs/api/react#gamemenu) opens its [`SavesMenu`](/docs/api/react#savesmenu), which you can also place yourself, and [`useSaves`](/docs/api/react#usesaves) does everything it does without its look.

::include[../../../../../snippets/plain/saves.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/saves.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Saves.vue]{meta='tab="Vue" tab-group="framework"'}

Save with `runner.save(slot)`, in a new numbered slot from [`nextSlot`](/docs/api/browser#nextslot), which skips named slots such as `auto`. Load with `runner.load(slot)`, and delete through the store with `runner.saves.remove(slot)`. Each is async and answers a [`Result`](/docs/reference/common#result) rather than throwing, so show its `reason` when it fails. The runner keeps `snapshot.saves` up to date, and a load replaces the game in play and calls your listener, so the screen renders again without code of yours.

`view.saving` says whether the game allows saving now, as a [`SavingView`](/docs/api/engine#savingview). Grey Save out while `allowed` is false, with `reason` as its title, and leave it off the screen while `visible` is false. A Continue button loads the first save in the list that isn't broken, the autosave included. [Write a save driver](/docs/how-to/write-a-save-driver) keeps saves somewhere other than `localStorage`.

## Render a settings screen

`view.settings` lists every [setting](/docs/reference/settings) the game declares, in order, as a [`SettingView`](/docs/api/engine#settingview) with its `label`, its `type`, its `default`, and the `options` of a choice or the range of a slider. The React UI renders a Settings page when you turn on its `pages`, and [`useSetting`](/docs/api/react#usesetting) reads one setting for a component of your own.

::include[../../../../../snippets/plain/settings.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-settings.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/react/settings.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Settings.vue]{meta='tab="Vue" tab-group="framework"'}

Read each setting's value from `snapshot.settings`, which holds both kinds. A `play` setting is part of the game state, and a `ui` setting is kept in the [profile](/docs/reference/profile) and never in the state. Change either kind with `runner.setSetting(id, to)`, which checks the value against the declaration and answers a `Result`. A `ui` setting does only what your UI makes of it, so copy it where your stylesheet can read it, such as `document.documentElement.dataset.textSize`. The runner calls your listener when a setting changes, so the screen renders again.

## Render the backlog and undo

`snapshot.backlog` lists what was shown, oldest first, each a [`BacklogEntry`](/docs/api/engine#backlogentry) with its `title`, its `beats` and the choice the player made. `snapshot.canUndo` and `snapshot.canRedo` say whether `runner.undo()` and `runner.redo()` have a step to take. The React UI's `GameMenu` offers the backlog and Undo when the runner has them, and [`Backlog`](/docs/api/react#backlog) renders the backlog wherever you place it.

::include[../../../../../snippets/plain/backlog.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/backlog.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Backlog.vue]{meta='tab="Vue" tab-group="framework"'}

The backlog stays empty unless the runner has it on, with `browserRunner(game, { backlog: true })`. The backlog keeps inline actions as plain words, so nothing in it can be pressed. `browserRunner` turns undo on, 50 steps deep, and `runner.offers` says which of the two a menu should offer.

For more on what these sections render, see:

- [Saves](/docs/reference/saves), [Settings](/docs/reference/settings), [The profile](/docs/reference/profile) and [The runner](/docs/reference/runner).
- [Browser helpers](/docs/api/browser), for `browserRunner` and `nextSlot`.
- [Add a settings page](/docs/how-to/add-a-settings-page) and [Write a save driver](/docs/how-to/write-a-save-driver).
