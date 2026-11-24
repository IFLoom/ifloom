---
title: "Build with esbuild"
description: "Build an IFLoom game with esbuild, with a dev server and a short script that makes the single index.html that opens from disk."
---
Use esbuild if you want a small build set-up. It compiles TypeScript and JSX itself, so your game needs no loader, and a build script of about twenty lines makes the one `index.html` that opens from disk. `ifloom check` and `ifloom playtest` work beside it.

## Install esbuild

Besides the `@ifloom` packages your game uses, add esbuild as a dev dependency:

```sh
npm install --save-dev esbuild
```

For the React UI, also add `tailwindcss` and `@tailwindcss/cli`, and `react` and `react-dom` if npm hasn't installed them with `@ifloom/react`.

## Compile TypeScript

There's nothing to set up. The @ifloom packages are compiled JavaScript with type declarations, and esbuild compiles your own `.ts` and `.tsx` files itself. Pass `--jsx=automatic` if your own code has JSX, as the `react` template's `src/layout.tsx` does.

## Add the styles

esbuild bundles plain CSS you import from your code, so the `vanilla`, `vue` and `svelte` templates' stylesheet needs nothing more. esbuild writes it beside the script as `main.css`.

The React UI's stylesheet is written for Tailwind CSS v4, which esbuild doesn't run. Build it with Tailwind's own CLI instead, and don't import it from `main.ts`:

```css
/* src/styles.css */
@import "@ifloom/react/styles.css";
```

```sh
npx tailwindcss -i src/styles.css -o tailwind.css
```

To go without Tailwind, import the prebuilt stylesheet from `main.ts` as plain CSS, with a preset if you like, and leave out the Tailwind steps below.

```ts
import '@ifloom/react/styles.min.css'
import '@ifloom/react/themes/paper.min.css'
```

## Set up the page and the dev server

`index.html` points at the files esbuild and Tailwind write:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Game</title>
    <link rel="stylesheet" href="./main.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

With the React UI, the stylesheet is `./tailwind.css` instead.

```json
{
  "scripts": {
    "dev": "esbuild src/main.ts --bundle --format=esm --jsx=automatic --outdir=. --servedir=. --watch",
    "dev:css": "tailwindcss -i src/styles.css -o tailwind.css --watch",
    "build": "tailwindcss -i src/styles.css -o tailwind.css --minify && node build.js",
    "check": "ifloom check",
    "playtest": "ifloom playtest --turns 5 --out playtest/run.txt",
    "typecheck": "tsc --noEmit"
  }
}
```

`npm run dev` serves the folder and builds `main.js` and `main.css` in memory on each change, without writing them to disk. With the React UI, run `npm run dev:css` beside it in a second terminal. Without it, leave out `dev:css` and the Tailwind step of `build`.

`--format=esm` keeps the bundle an ES module, because the templates' `main.ts` awaits the runner at the top level.

## Mount the game

The entry is the template's `src/main.ts`, unchanged:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts: the vanilla template's, cut down
import { browserRunner, startClock, startKeys } from '@ifloom/browser'
import { startAudio } from '@ifloom/audio'
import module from './game.ts'
import './styles.css'

const { game } = module.build()

const runner = await browserRunner(game)
startAudio(runner)
startClock(runner)
startKeys(runner)

const root = document.querySelector<HTMLElement>('#root')!
// ...render runner.view() into root, as in "Start your own UI"
```

```ts tab="React" tab-group="framework"
// src/main.ts: the react template's, without the stylesheet, which Tailwind's CLI builds
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'

mountGame(module.build(), { layout: Layout, pages: true })
```

```ts tab="Vue" tab-group="framework"
// src/main.ts: the vue template's. The .vue files need an esbuild plugin.
import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#root')
```

```ts fragment tab="Svelte" tab-group="framework"
// src/main.ts: the svelte template's. The .svelte files need an esbuild plugin.
import { mount } from 'svelte'
import App from './App.svelte'
import './styles.css'

mount(App, { target: document.querySelector('#root')! })
```

esbuild has no Vue or Svelte compiler of its own. Their components need a plugin, such as [esbuild-svelte](https://github.com/EMH333/esbuild-svelte) or one of the [community's Vue plugins](https://github.com/esbuild/community-plugins), run from a build script like the one below. Plain JS and the React UI need nothing more.

TypeScript doesn't know what importing a `.css` file gives. Declare it once, in `src/css.d.ts`:

```ts
declare module '*.css'
```

## Build the single offline file

esbuild can make the one `index.html` that opens from disk. Bundle without writing files, then put the script and the styles inside the page:

```js
// build.js
// One index.html with the game's script and styles inside it, to open from disk.
import { build } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const { outputFiles } = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2023',
  jsx: 'automatic',
  minify: true,
  outdir: '.',
  write: false,
})
// What esbuild just made, or else a file on disk, such as Tailwind's output.
const built = new Map(outputFiles.map((file) => [basename(file.path), file.text]))
const read = (name) => built.get(name) ?? readFileSync(name, 'utf8')

const html = readFileSync('index.html', 'utf8')
  .replace(/<link rel="stylesheet" href="\.\/([^"]+)" \/>/g, (_, name) => `<style>${read(name)}</style>`)
  // `</script` inside the script would end the tag early.
  .replace(/<script type="module" src="\.\/([^"]+)"><\/script>/g, (_, name) => `<script type="module">${read(name).replaceAll('</script', '<\\/script')}</script>`)
mkdirSync('dist', { recursive: true })
writeFileSync('dist/index.html', html)
console.log(`dist/index.html  ${(html.length / 1024).toFixed(1)} kB`)
```

`npm run build` runs it, and `dist/index.html` plays from disk. A module script inside the page runs from `file://` too, because it loads nothing. Pictures and sound aren't inside it, so copy `public/` beside it, where `ifloom build` would leave them too. To check the folder as `ifloom build` does, call [`checkBuild`](/docs/api/cli#checkbuild) from the same script.

## Check and playtest it

`ifloom check` and `ifloom playtest` load `src/game.ts` with the CLI's own Vite, not with esbuild, so they work unchanged. Add `@ifloom/cli` as a dev dependency and keep the game in `src/game.ts`, its [game module](/docs/reference/cli#the-game-module) the default export, made with `defineGame`. The page imports the same module and calls its `build`. Pictures and sound go in `public/`, where `ifloom check` looks for them.

`import.meta.env.DEV`, which the docs use to leave the [debug plugin](/docs/how-to/debug-a-game) out of a release, is Vite's. Under esbuild, set your own with `--define:DEV=true` in `dev` and `false` in `build.js` (`define: { DEV: 'false' }`), and declare it in TypeScript with `declare const DEV: boolean`.

Run `npm run check`, which prints `No problems.`, then `npm run build` and open `dist/index.html` from disk: the game starts with no server.

For more, see:

- [The game module](/docs/reference/cli#the-game-module) and [`checkBuild`](/docs/api/cli#checkbuild).
- [Ship your game](/docs/how-to/ship-your-game), for saves and what goes in the folder.
