---
title: "Start your own UI"
description: "Put a game on screen with a UI of your own in plain JS, React or Vue, from the runner's snapshot and the player's commands."
---
Use these pages when you render the game with code of your own, or when you place the React UI's parts in a layout of your own. Start from the template for your framework (`vanilla`, `react` or `vue`), made as [Create a game](/docs/how-to/create-a-game) shows. [Choosing a UI](/docs/explanation/choosing-a-ui) compares the ways to put a game on screen.

Every example on these pages comes in three tabs:

- **Plain JS** is DOM code on the runner, as in the `vanilla` template's `src/main.ts`. Each part is a function `draw<Thing>(parent, snapshot)` that imports `runner`, `add` and `drawChoices` from `./runner.ts`.
- **React** uses the React UI, `@ifloom/react`. It places the ready-made part for the feature in a layout, or builds a component of your own with the React UI's hooks.
- **Vue** is a component with no props that reads `view`, `snapshot` and `runner` from `./runner.ts`, as the `vue` template's components do.

The site remembers the tab you choose on every page. Every example renders the showcase, Small Town (`examples/showcase`), so it uses the showcase's ids, such as the vendor `counter` and the timer `flat.ring`.

## Start the runner

Make the [runner](/docs/reference/runner) once, start the browser helpers beside it, render its snapshot, and render again on every change. The React UI's `mountGame` does all of it in one call.

::include[../../../../../snippets/plain/start.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-game.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/start.ts]{meta='tab="Vue" tab-group="framework"'}

A UI talks to the engine through three members of the [`Runner`](/docs/api/engine#runner):

- `runner.snapshot()` returns the [`RunnerSnapshot`](/docs/api/engine#runnersnapshot), one value with all a UI renders. It holds the view, the settings, the backlog, undo and the saves.
- `runner.apply(command)` runs a command, such as the `command` of the button the player pressed.
- `runner.subscribe(listener)` calls `listener` with each new snapshot, and returns the function that stops it.

The runner makes a new snapshot whenever any part of it changes, and returns the same object until then. A framework that compares values therefore renders again exactly when something is new. React reads it with `useSyncExternalStore(runner.subscribe, runner.snapshot)`, and the Vue tab keeps it in a `shallowRef`. In Vue, `src/main.ts` then mounts the app with `createApp(App).mount('#root')`.

[`browserRunner`](/docs/api/browser#browserrunner) gives the runner a random seed, undo 50 steps deep, saves in `localStorage` and an autosave each turn. Pass it any [`RunnerOptions`](/docs/api/engine#runneroptions) to change those, such as `browserRunner(game, { backlog: true })`. Each helper follows the runner on its own, and returns the function that stops it:

- [`startAudio`](/docs/api/audio#startaudio) plays the game's music and sounds. Browsers allow no sound before the player clicks or presses a key, so nothing plays until then.
- [`startClock`](/docs/api/browser#startclock) sends a `tick` about every 100 ms while a timer or a minigame's timer runs. The engine keeps no clock of its own.
- [`startKeys`](/docs/api/browser#startkeys) presses the choices on screen on the keys 1 to 9, and a minigame's inputs on its keys.

Each template's `vite.config.ts` already adds its framework's Vite plugin to the [Vite preset](/docs/api/cli-vite), which knows no framework.

## Put the parts together

Split the screen into parts as it grows, one for each feature the other pages render. Each part reads the snapshot and sends its own commands, so the parts don't depend on each other.

::include[../../../../../snippets/plain/layout.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/layout.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Layout.vue]{meta='tab="Vue" tab-group="framework"'}

In Plain JS, move the runner, `add` and `drawChoices` from `src/main.ts` into `src/runner.ts` and export them. Then call `drawLayout(root, snapshot)` from the listener. In React, pass the layout to `mountGame(module.build(), { layout: Layout })`, and [Arrange the layout](/docs/how-to/arrange-the-layout) moves and folds its sections. In Vue, render `<Layout />` from `src/App.vue`.

The other pages render one feature in each section:

- [Render the scene and its choices](/docs/how-to/render/scene) covers the scene, flowing scenes, the room's actions, inline choices and tooltips, inputs, and transitions.
- [Render stats, things and what changed](/docs/how-to/render/stats-and-things) covers stats, the things the player holds, listed entities, changes, notices and dice rolls.
- [Render pictures and play sound](/docs/how-to/render/pictures-and-sound) covers layered pictures with hotspots, and the audio player.
- [Render timers, minigames and panels](/docs/how-to/render/timers-minigames-panels) covers countdowns, a running minigame and a panel over the story.
- [Render saves, settings and the backlog](/docs/how-to/render/saves-and-settings) covers a load screen, a settings screen, the backlog and undo.

Each plugin adds its own part of the view under `view.plugins`, by plugin id, such as the places plugin's ways out at `view.plugins.places.exits`. The plugins' pages in this section render them: [the calendar, locations and people](/docs/how-to/render/world-plugins), [quests, achievements and statuses](/docs/how-to/render/progress-plugins), [the inventory, shop, jobs and wardrobe](/docs/how-to/render/things-plugins), [messages, the feed and devices](/docs/how-to/render/phone-plugins), and [cheats, unlocks and debug](/docs/how-to/render/player-tools).

For every field and member, see:

- [The view](/docs/reference/view) and [`View`](/docs/api/engine#view).
- [The runner](/docs/reference/runner).
- [Commands](/docs/reference/commands).
- [Browser helpers](/docs/api/browser) and [the audio player](/docs/api/audio).
