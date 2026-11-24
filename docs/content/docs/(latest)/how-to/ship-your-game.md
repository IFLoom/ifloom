---
title: "Ship your game"
description: "Build your game into a folder that opens from disk or a static host, with pictures, sound and saves that work there."
---
Use this when the game is ready for players, as a folder to zip, upload to itch.io or open by double-clicking `index.html`. A game made with [Create a game](/docs/how-to/create-a-game) has everything it needs. [Why IFLoom works this way](/docs/explanation/design#nothing-loads-at-runtime) explains why a page opened from disk loads nothing at runtime.

## Prepare the game

1. **Keep the Vite preset.** A new game's `vite.config.ts` has it already. Otherwise add it, with your UI framework's Vite plugin in `vite.plugins`:

   ```ts
   // vite.config.ts
   import { ifloom } from '@ifloom/cli/vite'

   export default ifloom()
   ```

   The preset builds with `base: './'` and puts the script and the stylesheet inside `index.html`, so the page loads no other file of its own.

2. **Put pictures in `public/art/` and sound in `public/audio/`.** Vite copies `public/` into the build, so they land beside the page. Name them by relative path, `art/cafe.jpg`, never `/art/cafe.jpg`: a leading slash points at the root of the drive, or of the host on itch.io.

3. **Load nothing at runtime.** Import your content statically, and don't call `fetch()` or a dynamic `import()` in your own code. `ifloom build` doesn't search for them, and they fail on a page opened from disk.

4. **Leave the debug plugin out.** Add it only when `import.meta.env.DEV` is `true`, which it isn't under `ifloom build` (see [Debug a game](/docs/how-to/debug-a-game)).

5. **Give the game an id of its own.** `saves` keys every save with the game's `id`, as in `corner-cafe.save.auto`, so two games on one origin don't overwrite each other. Changing the id later loses every player's saves.

## Pick where saves go

[`browserRunner`](/docs/reference/browser#browserrunner), which every template uses, keeps saves in `localStorage`. Pick a driver for how the game ships:

- **A short game in a browser or on itch.io** keeps `localStorageDriver()`, with about 5MB.
- **A long game, or one with big backlogs or mods,** passes `indexedDbDriver()`, which has much more room.
- **A desktop wrapper** such as Tauri or Electron passes a driver of its own over the wrapper's files (see [Write a save driver](/docs/how-to/write-a-save-driver)).

Pass the driver in the runner's options. With the React UI's `mountGame`, pass them as `runner`:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import { browserRunner, indexedDbDriver } from '@ifloom/browser'
import { saves } from '@ifloom/engine'
import module from './game.ts'

const { game } = module.build()

const runner = await browserRunner(game, { saves: saves(game, indexedDbDriver()) })
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { indexedDbDriver } from '@ifloom/browser'
import { saves } from '@ifloom/engine'
import { mountGame } from '@ifloom/react'
import module from './game.ts'

const loaded = module.build()

mountGame(loaded, { runner: { saves: saves(loaded.game, indexedDbDriver()) } })
```

```ts tab="Vue" tab-group="framework"
// src/runner.ts
import { shallowRef } from 'vue'
import { browserRunner, indexedDbDriver } from '@ifloom/browser'
import { saves } from '@ifloom/engine'
import module from './game.ts'

const { game } = module.build()

export const runner = await browserRunner(game, { saves: saves(game, indexedDbDriver()) })
export const view = shallowRef(runner.view())
runner.subscribe((snapshot) => (view.value = snapshot.view))
```

```ts fragment tab="Svelte" tab-group="framework"
// src/runner.ts
import { readable } from 'svelte/store'
import { browserRunner, indexedDbDriver } from '@ifloom/browser'
import { saves } from '@ifloom/engine'
import module from './game.ts'

const { game } = module.build()

export const runner = await browserRunner(game, { saves: saves(game, indexedDbDriver()) })
export const view = readable(runner.view(), (set) => runner.subscribe((snapshot) => set(snapshot.view)))
```

Browser storage goes when the player clears site data. Offer an export and an import with `exportSlot` and `importText` (see [`Saves`](/docs/reference/saves#saves)), so players can keep their saves.

## Build it

Check the content, then build:

```sh
npm run check
npm run build
```

[`ifloom build`](/docs/reference/cli#ifloom-build) builds the game into `dist/`, or the folder `--out` names. It then checks the folder: an `index.html`, every script and stylesheet it loads beside it, and every picture, video and sound the game names. It prints each problem and exits with `1`, so a CI job fails on a build that wouldn't open from disk.

## Check it worked

Open `dist/index.html` straight from disk, by double-clicking it. Don't test only through `vite preview`, because a local server isn't `file://` and hides what fails there. Play past the first scene, save, reload the page and load the save.

To upload to itch.io, zip the contents of `dist/` and upload the zip as an HTML game.

## Variations

**One file, pictures and all.** `ifloom build --inline-assets` puts every picture inside `index.html` and removes `art/`, for a game to attach to a message or upload where only one file goes. Sound and video stay beside it, so a game with sound is always a folder.

**Without the CLI.** Write the preset out in your own Vite config, with `base: './'` and [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile), and build with `vite build`. [`checkBuild`](/docs/api/cli#checkbuild) from `@ifloom/cli` runs the same check from a script of your own.

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

**Another bundler.** [Build with esbuild](/docs/how-to/build-with-esbuild#build-the-single-offline-file) and [Build with webpack](/docs/how-to/build-with-webpack#build-the-single-offline-file) make the same single file. [Build with Next.js](/docs/how-to/build-with-next) can't, so a game built with Next is played on its website.

For more, see:

- [`ifloom build`](/docs/reference/cli#ifloom-build) and [the Vite preset](/docs/reference/cli#the-vite-preset).
- [Saves](/docs/reference/saves) and the [save drivers](/docs/reference/browser#save-drivers).
- [Nothing loads at runtime](/docs/explanation/design#nothing-loads-at-runtime).
