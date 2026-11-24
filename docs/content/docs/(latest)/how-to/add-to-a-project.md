---
title: "Add IFLoom to an existing project"
description: "How-to for adding IFLoom to a web project you already have: install the packages, write the game module, render the game into a page, and add the CLI's scripts."
---
Use this to put a game in a project that already has its own build, such as a site or an app. You need Node 20.19 or later, or 22.12 or later. To start a game in a new folder, see [Create a game](/docs/how-to/create-a-game) instead.

## Install the packages

Install the engine and the browser helpers, and the CLI as a dev dependency:

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

Add `@ifloom/react` too for the ready-made [React UI](/docs/reference/react), and `@ifloom/audio` for sound with a UI of your own. A plugin is one more package, as [Add a plugin](/docs/how-to/add-a-plugin) shows.

## Write the game module

Make `src/game.ts`, the game module, whose default export `defineGame` makes. Its `build` returns what [`loadGame`](/docs/reference/content#loadgame) returns, and the page and the CLI both build the game from it:

```ts
// src/game.ts
import { loadGame, text, type Content } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'

const opening: Content = {
  introScene: 'door',
  scenes: [{ id: 'door', title: 'The door', body: [text('A green door, half open. Someone inside is laughing.')], choices: [] }],
}

export default defineGame({
  build: () => loadGame([opening], { id: 'my-game', title: 'My Game' }),
})
```

`@ifloom/cli/game` imports only the engine, so the page can import this module without bringing the CLI into the browser build. Split the content into files as the game grows (see [Organise your game's files](/docs/how-to/organise-your-files)).

## Render it into the page

Render the game into an element on your page, here `<div id="game">`. The React tab uses the React UI, and the others render the scene and its choices with code of your own:

```ts tab="Plain JS" tab-group="framework"
// src/play.ts
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game } = module.build()

const runner = await browserRunner(game)
const root = document.querySelector<HTMLElement>('#game')!

function render(): void {
  const view = runner.view()
  root.replaceChildren()
  for (const beat of view.scene.beats) {
    if (beat.type === 'text') root.append(Object.assign(document.createElement('p'), { textContent: beat.text }))
  }
  for (const choice of view.scene.choices) {
    const button = Object.assign(document.createElement('button'), { textContent: choice.label, disabled: Boolean(choice.disabled) })
    button.onclick = () => runner.apply(choice.command)
    root.append(button)
  }
}

runner.subscribe(render)
render()
```

```ts tab="React" tab-group="framework"
// src/play.ts
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
runner.subscribe((snapshot) => {
  view.value = snapshot.view
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
  </template>
  <button v-for="choice in view.scene.choices" :key="choice.id" :disabled="Boolean(choice.disabled)" @click="runner.apply(choice.command)">
    {{ choice.label }}
  </button>
</template>
```

[`browserRunner`](/docs/reference/browser#browserrunner) starts a new game with undo, saves in `localStorage` and an autosave each turn. The imports keep their `.ts` extensions, as the templates' do. Drop them if your TypeScript settings don't allow it. [Start your own UI](/docs/how-to/render/start) renders the rest of the game with your own code.

## Add the scripts

Add the CLI's commands to `package.json`:

```json
{
  "scripts": {
    "check": "ifloom check",
    "playtest": "ifloom playtest --turns 5 --out playtest/run.txt",
    "typecheck": "tsc --noEmit"
  }
}
```

A project that builds with Vite can also use `ifloom dev` and `ifloom build`, with the [Vite preset](/docs/reference/cli#the-vite-preset) in its `vite.config.ts`. A project that builds with something else keeps its own build. See [Build with Next.js](/docs/how-to/build-with-next), [Build with webpack](/docs/how-to/build-with-webpack) and [Build with esbuild](/docs/how-to/build-with-esbuild).

## Check it worked

Run the checks from the project's folder:

```sh tab="npm" tab-group="package-manager"
npm run check
npm run typecheck
```

```sh tab="pnpm" tab-group="package-manager"
pnpm check
pnpm typecheck
```

```sh tab="yarn" tab-group="package-manager"
yarn run check
yarn run typecheck
```

```sh tab="bun" tab-group="package-manager"
bun run check
bun run typecheck
```

`check` loads `src/game.ts` and prints `No problems.` when the game loads cleanly. Otherwise it lists each problem with the scene or key it's about. Then open the page: it shows "The door" and its words.

For more, see:

- [The CLI](/docs/reference/cli), for the game module and every command.
- [The runner](/docs/reference/runner) and [the view](/docs/reference/view), for what the page reads.
- [How the pieces fit](/docs/explanation/architecture), for the packages a game needs.
