---
title: "Add a plugin"
description: "How-to for adding a first-party plugin to a game: install its package, list it in the base's plugins in the right order, write its content, and show it with the React UI's plugins list."
---
Use this to add any first-party plugin, such as the calendar, places or quests, to a game you already have. The steps are the same for all seventeen; [First-party plugins](/docs/reference/plugins) lists them, and [How plugins work](/docs/explanation/plugins) explains what one adds.

## Install the package

Install the plugin's package beside the engine. Every plugin is `@ifloom/plugin-<id>`:

```sh tab="npm" tab-group="package-manager"
npm install @ifloom/plugin-quests
```

```sh tab="pnpm" tab-group="package-manager"
pnpm add @ifloom/plugin-quests
```

```sh tab="yarn" tab-group="package-manager"
yarn add @ifloom/plugin-quests
```

```sh tab="bun" tab-group="package-manager"
bun add @ifloom/plugin-quests
```

The package has `@ifloom/engine` as a peer dependency, so it uses the game's copy. Its React UI is in the same package, so there's nothing more to install for it.

## List it in the game's plugins

Call the plugin's factory in the `plugins` of the base you pass to [`loadGame`](/docs/reference/content#loadgame), in `src/game.ts`:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'

declare const town: Content

export default defineGame({
  build: () => loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), places({ start: 'flat' }), quests()] }),
})
```

Order the list with these rules:

1. **List the calendar first.** Plugins' [`onTurn`](/docs/reference/plugin-api#onturn-and-onturndone) hooks run in list order, and the calendar's moves the clock on. Plugins after it see the new day, and plugins before it see the old one.
2. **List places after the calendar.** Plugins' [labels](/docs/reference/plugin-api#label) join in list order, so the header reads `Day 1 · Monday morning · High Street`.
3. **Put the rest in any order.** The cast asks places where the player is by name, so its place in the list changes nothing.

A game chooses its plugins when it's built. A mod can bring content for a plugin the game has, but it can't add a plugin.

## Write its content

Content calls a plugin's conditions, effects and commands by their full name, `<id>/<name>`, with the arguments as an object. The plugin's helpers write them for you, and they are properties of its factory:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

const bed = { id: 'bed', label: 'Go to bed', when: places.at('flat'), command: calendar.sleep() }
```

A plugin's lists go under `data.<id>` in your content, such as `data.quests.quests`. A plugin whose content is entities has definers instead, such as `places.location({ … })` and `cast.person({ … })`, written in `entities`. Each plugin's reference page lists its content under `## Content`.

## Show it on screen

With the [React UI](/docs/reference/react), import the plugin's UI from its `/react` subpath and list it in `mountGame`'s `plugins`. With a UI of your own, render the plugin's view from `view.plugins.<id>`. The quest log, in each framework:

::include[../../../../snippets/plain/quests.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-quests.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Quests.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI's default layout puts each plugin's parts where its UI says, in the order of the list. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) places them in a layout of your own, and the [Render it yourself](/docs/how-to/render/start) pages render every plugin's view.

## Add the plugins it works with

No first-party plugin needs another. Some do more when the game has a partner, such as the shop's opening hours with the calendar, or the cast's people in the room with places. The [`cooperates`](/docs/reference/plugins#cooperates) table lists each partner and what happens without it.

## Check it worked

Run `npm run check`. It prints `No problems.` when the game has every plugin its content calls. A call to a plugin the game lacks shows up as a problem:

```text
story.ava · scene ava.park · no plugin condition named "quests/done"; the game has no plugin "quests"
```

Add the missing factory to `plugins`, or remove the call.

For more, see:

- [First-party plugins](/docs/reference/plugins), with a page for each plugin's factory, content and calls.
- [`Plugins`](/docs/reference/react/kit#plugins), the component that places plugin UIs.
- [How plugins work](/docs/explanation/plugins).
