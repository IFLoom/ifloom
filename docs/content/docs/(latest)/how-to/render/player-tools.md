---
title: "Render cheats, unlocks and debug"
description: "How-to for rendering the cheats, unlocks and debug plugins in a UI of your own, in plain JS, React and Vue: a cheat menu, a box for entering supporter codes, and a debug readout with commands that ignore locks."
---
Render the tools that sit outside the story: the player's cheats from [cheats](/docs/reference/plugins/cheats), a box for codes from [unlocks](/docs/reference/plugins/unlocks), and a readout for yourself from [debug](/docs/reference/plugins/debug). Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) explains.

## Render the cheats

`view.plugins.cheats` holds the cheats the player can see as a [`CheatsView`](/docs/api/plugin-cheats#cheatsview), each a [`CheatView`](/docs/api/plugin-cheats#cheatview) with its group, how often this save has used it, and a ready `button`. The React UI's `cheatsUi` puts a [`CheatsButton`](/docs/api/plugin-cheats#cheatsbutton) in the side column that opens the [`CheatPanel`](/docs/api/plugin-cheats#cheatpanel).

::include[../../../../../snippets/plain/cheats.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-cheats.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Cheats.vue]{meta='tab="Vue" tab-group="framework"'}

Group the cheats by `group`, in the order the game declares them. A cheat's `button` has the reason it's refused in `disabled`, such as a supporter cheat before its code is entered, so render it greyed out with the reason. `used` counts the times this save has used the cheat, and the view's `used` counts them all. A cheat runs in any scene and through any lock, so the menu can stay on screen. [`useCheats`](/docs/api/plugin-cheats#usecheats) gives the cheats' view to a React component of your own.

## Render a box for codes

`view.plugins.unlocks` holds every unlock as an [`UnlocksView`](/docs/api/plugin-unlocks#unlocksview), each with whether the player has it, and the runner's snapshot holds where entering a code stands at `helpers.unlocks`, an [`UnlockStatus`](/docs/api/plugin-unlocks#unlockstatus). The React UI's `unlocksUi` starts codes on the runner and puts the [`UnlocksPanel`](/docs/api/plugin-unlocks#unlockspanel) on the settings page with pages on, or behind an **Enter a code** button in the menu without them.

::include[../../../../../snippets/plain/unlocks.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-unlocks-with.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Unlocks.vue]{meta='tab="Vue" tab-group="framework"'}

Entering a code isn't a command, because the plugin checks each code against a slow hash. Set it up in this order:

1. Before you build the game, open the content the player's codes unlock with [`unlockedPacks`](/docs/api/plugin-unlocks#unlockedpacks), from the game's id and its [profile](/docs/reference/profile). Use the same save driver the runner will use, and pass its `packs` to the game module's `build` as `unlocked`.
2. After you make the runner, start taking codes with [`startUnlocks(runner)`](/docs/api/plugin-unlocks#startunlocks), beside `startClock`. It records each remembered unlock in the game and reports in `helpers.unlocks`.
3. Send each code the player enters to [`enterCode(runner, code)`](/docs/api/plugin-unlocks#entercode). When its result's `restart` is true, the code opened content the game in play lacks, so reload the page to build the game again.

`helpers.unlocks.status` is `checking` while a code is checked, then `wrong` with its `reason`, or `unlocked` with what it `entered`. Disable the button while it's `checking`, since a check takes a fraction of a second per unlock on a phone. In React, `unlocksUiWith` takes the `problems` `unlockedPacks` returns and an `onChange` that reloads, as the React tab shows. [`useUnlocks`](/docs/api/plugin-unlocks#useunlocks) gives the unlocks' view to a React component of your own.

## Render a debug readout

`view.plugins.debug` holds a readout for the developer as a [`DebugView`](/docs/api/plugin-debug#debugview), with the locks that are on, how often each trigger has fired, and the save's seed. The React UI's [`DebugCard`](/docs/api/plugin-debug#debugcard), from `debugUi`, goes at the end of the story.

::include[../../../../../snippets/plain/debug.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-debug.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Debug.vue]{meta='tab="Vue" tab-group="framework"'}

The plugin's commands, such as `debug.stat('coins', 100)` and `debug.scene()`, ignore locks, so a button can send them at any time. A release build leaves the plugin out, so `view.plugins.debug` is undefined there and the readout renders nothing. That lets you keep it in your UI for every build, and `DebugCard` does the same. [`useDebug`](/docs/api/plugin-debug#usedebug) gives the debug view to a React component of your own.

For more on what these sections render, see:

- [Cheats](/docs/reference/plugins/cheats), [Unlocks](/docs/reference/plugins/unlocks) and [Debug](/docs/reference/plugins/debug).
- [The runner](/docs/reference/runner), for the snapshot's `helpers`.
- [Sell supporter content](/docs/how-to/sell-supporter-content) and [Debug a game](/docs/how-to/debug-a-game).
