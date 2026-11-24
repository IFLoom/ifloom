---
title: "Installation"
description: Start a new game with npm create ifloom, or add IFLoom to a project you already have, with npm, pnpm, yarn or bun.
---
There are two ways in. Start a new game from a template with one command, or add the engine to a project you already have.

## Requirements

- **Node 20.19 or later, or 22.12 or later.** Node 24 is recommended.
- **npm, pnpm, yarn or bun.** npm comes with Node.

## Start a new game

```sh tab="npm" tab-group="package-manager"
npm create ifloom@latest my-game
cd my-game
npm install
npm run dev
```

```sh tab="pnpm" tab-group="package-manager"
pnpm create ifloom my-game
cd my-game
pnpm install
pnpm dev
```

```sh tab="yarn" tab-group="package-manager"
yarn create ifloom my-game
cd my-game
yarn install
yarn run dev
```

```sh tab="bun" tab-group="package-manager"
bun create ifloom my-game
cd my-game
bun install
bun run dev
```

That makes a small game in the folder `my-game` and serves it in the browser, reloading as you edit. The command says what to run next with the package manager you used.

`--template` picks what to start from, and `--theme` picks the look of a game drawn with the React UI. With npm, put them after `--`, as in `npm create ifloom@latest my-game -- --template vue`. pnpm, yarn and bun take them as they are.

| You want | Template |
|---|---|
| A game in the browser as quickly as possible, drawn with the [React UI](/docs/reference/react) | `react`, the default |
| Your own look in plain JS, Vue or Svelte, with no React | `vanilla`, `vue` or `svelte` |
| A game on a page of a website, built with [Next.js](/docs/recipes/next) | `next` |
| A copy of an example: [The Letter, The Corner Café or Small Town](/docs/guide/shapes) | `novel`, `cafe` or `town` |
| A plugin package of your own, to publish on npm | `plugin`. See [Writing a plugin](/docs/reference/plugins). |

A `react` or `next` game gets one of the React UI's presets at random. Choose one with `--theme paper`, `terminal`, `studio` or `storybook`, or `--theme none` for the plain look. [How the pieces fit](/docs/guide/how-it-fits#which-pieces-you-need) says more about which pieces each one uses, and [`ifloom new`](/docs/reference/cli#ifloom-new) has every option.

### What's in the new game

A game made from the `react` template looks like this:

```
my-game/
├── AGENTS.md         notes for a coding agent: where the docs are, how to check its work
├── index.html        the page, with the #root element the game draws into
├── package.json      the scripts and the dependencies
├── tsconfig.json     TypeScript's settings
├── vite.config.ts    the Vite preset from @ifloom/cli/vite, with React's and Tailwind's plugins
├── .gitignore        leaves out node_modules, dist and playtest
└── src/
    ├── game.ts       puts the game together from the files below
    ├── world/
    │   └── stats.ts  what the whole game shares: here, one stat
    ├── story/
    │   └── opening.ts  the first scenes, their choices and their words
    ├── layout.tsx    the page: the side column with the stats, and the story
    ├── main.ts       starts the game with mountGame, on a title screen
    └── styles.css    imports the React UI's styles and a theme preset
```

Your content goes in `src/world/` and `src/story/`. Each file there exports [`Content`](/docs/reference/content#content), and `src/game.ts` only lists them for [`loadGame`](/docs/reference/content#loadgame), in its [game module](/docs/reference/cli#the-game-module), which the page and the CLI both build the game from. Things the whole game shares, such as stats and things, go in `world/`, a file for each kind. The story goes in `story/`, a file for each place, chapter or character's arc, with its scenes and words together. [Organising a game](/docs/guide/organising) explains the layout and when to split a file. `src/main.ts` hands the game to [`mountGame`](/docs/reference/react#mountgame) with `layout: Layout` and `pages: true`, so it opens on a [title screen](/docs/recipes/title-screen) and draws the page from `src/layout.tsx`.

`package.json` depends on `@ifloom/engine`, `@ifloom/react`, React and react-dom. Its dev dependencies are `@ifloom/cli`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss`, `typescript`, `@types/react` and `@types/react-dom`. Its scripts are `dev`, `build`, `check`, `playtest` and `typecheck`, which run the [CLI](/docs/reference/cli) and TypeScript.

## Add IFLoom to an existing project

Install the engine and the browser helpers, and the CLI for checking the game:

```sh tab="npm" tab-group="package-manager"
npm install @ifloom/engine @ifloom/browser
npm install --save-dev @ifloom/cli
```

```sh tab="pnpm" tab-group="package-manager"
pnpm add @ifloom/engine @ifloom/browser
pnpm add --save-dev @ifloom/cli
```

```sh tab="yarn" tab-group="package-manager"
yarn add @ifloom/engine @ifloom/browser
yarn add --dev @ifloom/cli
```

```sh tab="bun" tab-group="package-manager"
bun add @ifloom/engine @ifloom/browser
bun add --dev @ifloom/cli
```

In a React app, add `@ifloom/react` too if you want the ready-made [React UI](/docs/reference/react). A plugin you install brings its React UI in the same package, as `@ifloom/plugin-<name>/react`, so there's nothing more to install for it: list it in [`plugins`](/docs/reference/react/kit#the-plugins-option). With any other framework, or none, the engine and [`@ifloom/browser`](/docs/reference/browser) are all you need: `@ifloom/browser` has the runner that keeps saves in the browser, a minigame's clock and keyboard shortcuts. Add [`@ifloom/audio`](/docs/reference/browser/audio-player) for sound.

A game is one module, its [game module](/docs/reference/cli#the-game-module). Its default export is made with `defineGame`, and its `build` returns what [`loadGame`](/docs/reference/content#loadgame) returns. The page and the CLI both build the game from it:

```ts
// src/game.ts
import { loadGame, text, type Content } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'

const story: Content = {
  introScene: 'start',
  scenes: [{ id: 'start', title: 'The door', body: [text('A green door, half open. Someone inside is laughing.')], choices: [] }],
}

export default defineGame({
  build: () => loadGame([story], { id: 'my-game', title: 'My Game' }),
})
```

`@ifloom/cli/game` imports only the engine, so the page can import this module without bringing the CLI into the browser build.

Then draw it into an element on your page, here `<div id="game">`:

```ts tab="Plain JS" tab-group="framework"
// src/play.ts
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game } = module.build()

const runner = await browserRunner(game)
const root = document.querySelector<HTMLElement>('#game')!

function draw(): void {
  const view = runner.view()
  root.replaceChildren()
  for (const beat of view.scene.beats) {
    // Narration, and a spoken line. A game with pictures has image beats too.
    if (beat.type === 'text') root.append(Object.assign(document.createElement('p'), { textContent: beat.text }))
    if (beat.type === 'say') root.append(Object.assign(document.createElement('p'), { textContent: `“${beat.text}”` }))
  }
  for (const choice of view.scene.choices) {
    const button = Object.assign(document.createElement('button'), { textContent: choice.label, disabled: Boolean(choice.disabled) })
    button.onclick = () => runner.apply(choice.command)
    root.append(button)
  }
}

runner.subscribe(draw)
draw()
```

```ts tab="React" tab-group="framework"
// src/play.ts, with the React UI
import { mountGame } from '@ifloom/react'
import '@ifloom/react/styles.min.css'
import module from './game.ts'

mountGame(module.build(), { root: '#game' })
```

```ts tab="Vue" tab-group="framework"
// src/runner.ts
import { shallowRef } from 'vue'
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game } = module.build()

export const runner = await browserRunner(game)
export const view = shallowRef(runner.view())
runner.subscribe(() => {
  view.value = runner.view()
})
```

```vue tab="Vue" tab-group="framework"
<!-- src/Game.vue -->
<script setup lang="ts">
import { runner, view } from './runner.ts'
</script>

<template>
  <template v-for="(beat, at) in view.scene.beats" :key="at">
    <p v-if="beat.type === 'text'">{{ beat.text }}</p>
    <p v-else-if="beat.type === 'say'">“{{ beat.text }}”</p>
  </template>
  <button v-for="choice in view.scene.choices" :key="choice.id" :disabled="Boolean(choice.disabled)" @click="runner.apply(choice.command)">
    {{ choice.label }}
  </button>
</template>
```

```ts fragment tab="Svelte" tab-group="framework"
// src/runner.ts
import { readable } from 'svelte/store'
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game } = module.build()

export const runner = await browserRunner(game)
export const view = readable(runner.view(), (set) => runner.subscribe((snapshot) => set(snapshot.view)))
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Game.svelte -->
<script lang="ts">
  import { runner, view } from './runner.ts'
</script>

{#each $view.scene.beats as beat}
  {#if beat.type === 'text'}<p>{beat.text}</p>{/if}
  {#if beat.type === 'say'}<p>“{beat.text}”</p>{/if}
{/each}
{#each $view.scene.choices as choice (choice.id)}
  <button disabled={Boolean(choice.disabled)} onclick={() => runner.apply(choice.command)}>{choice.label}</button>
{/each}
```

The runner holds the game in play. `runner.view()` is the [view](/docs/reference/view), everything there is to draw right now, worked out from the game's state. Its `scene.beats` is the scene's words, split into pieces such as a paragraph or a spoken line, each with a `type` (see [The beats](/docs/guide/running-a-game#the-beats)). Every choice carries the `command` it sends, and `runner.apply(choice.command)` plays it. The runner then calls what you gave `runner.subscribe`, so the page draws again. [Running a game](/docs/guide/running-a-game) goes through all of it.

[`browserRunner`](/docs/reference/browser#browserrunner) starts a new game with undo, saves in `localStorage` and an autosave each turn. The snippets import with `.ts` extensions, as the templates do. Drop them if your project's TypeScript settings don't allow it. To build with your project's own bundler, see the recipes for [Next.js](/docs/recipes/next), [webpack](/docs/recipes/webpack) and [esbuild](/docs/recipes/esbuild).

## Check it works

In the game's folder:

```sh tab="npm" tab-group="package-manager"
npm run check       # npx ifloom check in a project without the script
npm run typecheck
```

```sh tab="pnpm" tab-group="package-manager"
pnpm check          # pnpm exec ifloom check in a project without the script
pnpm typecheck
```

```sh tab="yarn" tab-group="package-manager"
yarn run check      # yarn ifloom check in a project without the script
yarn run typecheck
```

```sh tab="bun" tab-group="package-manager"
bun run check       # bunx ifloom check in a project without the script
bun run typecheck
```

`check` loads `src/game.ts` and prints `No problems.` when the game loads cleanly. If it lists problems, each one names the scene or key it's about. `typecheck` runs TypeScript over the game.

To try IFLoom's latest unreleased code instead, see [Working from the repository](/docs/guide/from-the-repository).

Next, write [your first story](/docs/guide/first-story).
