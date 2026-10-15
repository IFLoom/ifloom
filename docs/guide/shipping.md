# Shipping a game

An IFLoom game ships as a static folder: one `index.html` and the game's pictures beside it. The player double-clicks `index.html` and it runs. The same folder, zipped, uploads to itch.io as an HTML game.

## Why a folder that opens from disk is hard

A page opened from disk has a `file://` address, and its origin is null. To the browser, every neighbouring file is cross-origin, so it refuses:

- `fetch()` of any file,
- a `<script type="module" src="…">` loaded from the file next door,
- a dynamic `import()`,
- and a stylesheet requested with `crossorigin`, which is how Vite links its CSS.

A normal web build splits the game into an HTML page, a script file and a stylesheet. Opened from disk, it comes up blank.

Pictures are different: an `<img>` or `<video>` may load from a neighbouring folder. They can stay as files.

## The rules

1. **Nothing loads at runtime.** No `fetch()`, no dynamic `import()`. The engine keeps this rule itself, and a test enforces it; your game has to keep it too. Import your content statically so the bundler includes it.
2. **Bundle everything into one script.** No code splitting, no lazy chunks.
3. **Inline the script and the stylesheet into `index.html`.** Then there is nothing to load.
4. **Use relative paths.** Build with `base: './'`, and refer to pictures as `art/…`, never `/art/…`. A leading slash points at the root of the drive, or the root of the host on itch.io, instead of beside `index.html`.

## Build it with `ifloom build`

The [CLI](/cli/) keeps these rules for you. Put the [Vite preset](/cli/#the-vite-preset) in your game's `vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { ifloom } from '@ifloom/cli/vite'

export default defineConfig(ifloom())
```

It brings React and Tailwind CSS for the [base UI](/ui/), builds with `base: './'`, and puts the script and the stylesheet inside `index.html`. Then build:

```sh
ifloom build
```

The game lands in `dist/` (or the folder `--out` names), and the command checks it: there is an `index.html`, and every script and stylesheet it loads is beside it. It prints what is wrong and exits with `1`, so a CI job fails on a build that would not open from disk. Run [`ifloom check`](/cli/#ifloom-check) beside it to catch content problems before you build.

Leave the [debug plugin](/plugins/debug#leave-it-out-of-release-builds) out of the build: `import.meta.env.DEV` is `false` under `ifloom build`.

Put pictures in `public/art/`. Vite copies `public/` into the build as it is, so they land in `dist/art/` beside the page.

For a small game that should be a single file, pictures and all — to attach to a message, or to upload where only one file goes — build with `ifloom build --inline-assets`: the pictures go inside `index.html` and `art/` is removed. See [One file, pictures and all](/cli/#one-file-pictures-and-all) for what it costs.

Then open `dist/index.html` straight from disk to check it. Testing only through `vite preview` hides the problem, because a local server is not `file://`.

**Gotcha.** `ifloom build` does not search the built file for `fetch()` or a dynamic `import()`. The engine and the UI hold that rule in their own tests, on their source; your own code has to keep rule 1 itself.

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

Build with `vite build`. Nothing then checks the folder for you; [`checkBuild`](/cli/#checkbuild) from `@ifloom/cli` is the same check, for a script of your own.

## Saves

A game decides where its saves live by picking a **driver**. The engine has no default, because the right answer depends on how the game ships:

| Shipped as | Driver |
|---|---|
| A short game in a browser or on itch.io | `localStorageDriver()` — simplest, about 5MB. |
| A long game, or one with big backlogs or mods | `indexedDbDriver()` — asynchronous and roomy. |
| A desktop wrapper (Tauri, Electron) | One of your own over the wrapper's file system. |

```ts
import { createRunner, indexedDbDriver, saves } from '@ifloom/engine'

const runner = createRunner(game, state, {
  saves: saves(game, indexedDbDriver()),
  autosave: { every: 'scene' },
})
```

Every driver is asynchronous, so switching from one to another later changes this line and nothing else.

### Why the keys carry the game id

Every page opened from disk shares one storage origin in Chromium, and itch.io serves many games from shared domains. Two games that both saved under `save.auto` would overwrite each other, and two games opened from disk in Chromium share one 5MB of `localStorage` between them.

So `saves` keys every save with your game's id, `game.id`: `corner-cafe.save.auto`, `corner-cafe.save.1`. Use an id that is unique to your game and never changes; changing it orphans every player's saves. The save format's version lives inside the save, not in the key, so a game update does not lose them either.

### Let players keep their saves

Browser storage is cleared with the browser's site data, and a game opened from a different folder may not see the old one's. Offer an export and an import: `exportSlot` gives the save as text to download, and `importText` reads a file back, refusing one that is not a save or belongs to another game. See [Saves](/reference/saves#saves).
