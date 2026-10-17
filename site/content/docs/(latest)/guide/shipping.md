---
title: "Shipping a game"
description: "Ship a game as a folder that opens from disk: why that's hard, the rules that make it work, ifloom build, and saves."
---
An IFLoom game ships as a static folder: one `index.html` and the game's pictures beside it. The player double-clicks `index.html` and it runs. The same folder, zipped, uploads to itch.io as an HTML game.

## Why a folder that opens from disk is hard

A page opened from disk has a `file://` address, and its origin is null. To the browser, every neighbouring file is cross-origin, so it refuses:

- `fetch()` of any file
- a `<script type="module" src="…">` loaded from the file next door
- a dynamic `import()`
- a stylesheet requested with `crossorigin`, which is how Vite links its CSS

A normal web build splits the game into an HTML page, a script file and a stylesheet. Opened from disk, it comes up blank.

Pictures are different. An `<img>` or `<video>` may load from a neighbouring folder, so they can stay as files.

## The rules

1. **Nothing loads at runtime.** Don't use `fetch()` or a dynamic `import()`. The engine keeps this rule itself, and a test enforces it. Your game has to keep it too. Import your content statically so the bundler includes it.
2. **Bundle everything into one script.** No code splitting, no lazy chunks.
3. **Inline the script and the stylesheet into `index.html`.** Then there is nothing to load.
4. **Use relative paths.** Build with `base: './'`, and refer to pictures as `art/…`, never `/art/…`. A leading slash points at the root of the drive, or the root of the host on itch.io, instead of beside `index.html`.

## Build it with `ifloom build`

The [CLI](/docs/cli) keeps these rules for you. A game made with [`npm run new`](/docs/cli#ifloom-new) already has the [Vite preset](/docs/cli#the-vite-preset) in its `vite.config.ts`. Otherwise, add it:

```ts
// vite.config.ts
import { ifloom } from '@ifloom/cli/vite'

export default ifloom()
```

It builds with `base: './'` and puts the script and the stylesheet inside `index.html`. Your UI framework's Vite plugin goes in the preset's `vite.plugins`: a game on the [React UI](/docs/react) adds React's and Tailwind's, as the `react` template does (see [The Vite preset](/docs/cli#the-vite-preset) and [Your own UI in any framework](/docs/guide/frameworks)). Then build:

```sh
ifloom build
```

The game lands in `dist/` (or the folder `--out` names), and the command checks it: there is an `index.html`, every script and stylesheet it loads is beside it, and every picture, video and sound the game names has its file there. It prints what is wrong and exits with `1`, so a CI job fails on a build that would not open from disk. Run [`ifloom check`](/docs/cli#ifloom-check) beside it to catch content problems before you build.

Leave the [debug plugin](/docs/plugins/debug#leave-it-out-of-release-builds) out of the build: `import.meta.env.DEV` is `false` under `ifloom build`.

Put pictures in `public/art/`. Vite copies `public/` into the build as it is, so they land in `dist/art/` beside the page.

Sound files go in `public/audio/` the same way, and land in `dist/audio/`. A browser plays them from beside a page opened from disk. `ifloom check` reports any track whose file is missing (see [The audio player](/docs/browser/audio-player)).

A small game can be a single file, pictures and all, to attach to a message or upload where only one file goes. Build it with `ifloom build --inline-assets`, which puts the pictures inside `index.html` and removes `art/`. Sound stays in `audio/` beside it, so a game with sound is always a folder. See [One file, pictures and all](/docs/cli#one-file-pictures-and-all) for what it costs.

Then open `dist/index.html` straight from disk to check it. Testing only through `vite preview` hides the problem, because a local server is not `file://`.

`ifloom build` doesn't search the built file for `fetch()` or a dynamic `import()`. The engine and the React UI keep that rule in their own tests, on their source, so your own code has to keep rule 1 itself.

### Without the CLI

The preset is a few lines of Vite config, so a game can write it out itself: `base: './'`, and [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile) to inline the script and stylesheet, beside your UI framework's own plugins.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
})
```

Build with `vite build`. Nothing then checks the folder for you, but [`checkBuild`](/docs/cli#checkbuild) from `@ifloom/cli` runs the same check from a script of your own.

Other bundlers can make the same single file. The [esbuild](/docs/recipes/esbuild#the-single-offline-file) and [webpack](/docs/recipes/webpack#the-single-offline-file) recipes show how. [Next.js](/docs/recipes/next) can't, so a game built with Next is played on its website.

## Saves

A game decides where its saves live by picking a driver. The engine has no default, because the right answer depends on how the game ships. [`browserRunner`](/docs/reference/runner#browserrunner), which every template uses (the React UI's [`mountGame`](/docs/react#mountgame) calls it), picks `localStorage` unless you pass another:

| Shipped as | Driver |
|---|---|
| A short game in a browser or on itch.io | `localStorageDriver()`. The simplest, with about 5MB. |
| A long game, or one with big backlogs or mods | `indexedDbDriver()`. It has much more room. |
| A desktop wrapper (Tauri, Electron) | One of your own over the wrapper's file system. |

```ts
import { createRunner, indexedDbDriver, saves } from '@ifloom/engine'

const runner = createRunner(game, state, {
  saves: saves(game, indexedDbDriver()),
  autosave: { every: 'scene' },
})
```

The templates make their runner with [`browserRunner`](/docs/reference/runner#browserrunner), which takes the same options over its defaults. With the React UI's `mountGame`, pass them as `runner`:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import { browserRunner, indexedDbDriver, saves } from '@ifloom/engine'
import loaded from './game.ts' // what loadGame returned: { game, problems }

const runner = await browserRunner(loaded.game, { saves: saves(loaded.game, indexedDbDriver()) })
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { indexedDbDriver, saves } from '@ifloom/engine'
import { mountGame } from '@ifloom/react'
import loaded from './game.ts' // what loadGame returned: { game, problems }

mountGame(loaded, { runner: { saves: saves(loaded.game, indexedDbDriver()) } })
```

```ts tab="Vue" tab-group="framework"
// src/runner.ts
import { shallowRef } from 'vue'
import { browserRunner, indexedDbDriver, saves } from '@ifloom/engine'
import loaded from './game.ts' // what loadGame returned: { game, problems }

export const runner = await browserRunner(loaded.game, { saves: saves(loaded.game, indexedDbDriver()) })
export const view = shallowRef(runner.view())
runner.subscribe(() => (view.value = runner.view()))
```

```ts tab="Svelte" tab-group="framework"
// src/runner.ts
import { readable } from 'svelte/store'
import { browserRunner, indexedDbDriver, saves } from '@ifloom/engine'
import loaded from './game.ts' // what loadGame returned: { game, problems }

export const runner = await browserRunner(loaded.game, { saves: saves(loaded.game, indexedDbDriver()) })
export const view = readable(runner.view(), (set) => runner.subscribe(() => set(runner.view())))
```

Every driver is asynchronous, so switching from one to another later changes this line and nothing else.

### Why the keys carry the game id

Every page opened from disk shares one storage origin in Chromium, and itch.io serves many games from shared domains. Two games that both saved under `save.auto` would overwrite each other, and two games opened from disk in Chromium share one 5MB of `localStorage` between them.

So `saves` keys every save with your game's id, `game.id`, as in `corner-cafe.save.auto` and `corner-cafe.save.1`. Use an id that's unique to your game and never changes, because changing it orphans every player's saves. The save format's version lives inside the save, not in the key, so a game update doesn't lose them either.

### Let players keep their saves

Browser storage is cleared with the browser's site data, and a game opened from a different folder may not see the old one's. Offer an export and an import: `exportSlot` gives the save as text to download, and `importText` reads a file back, refusing one that is not a save or belongs to another game. See [Saves](/docs/reference/saves#saves).
