# The CLI

`@ifloom/cli` runs your game while you write it and builds it into a folder that opens from disk. It also checks the game for the problems the loader can find, plays it unattended, and records how every scene reads. It also starts new games. It has six commands and a Vite preset:

| Command | Does |
|---|---|
| `ifloom new <name> [--template t] [--theme t]` | Makes a new game in `games/<name>` of the IFLoom checkout, ready to run. |
| `ifloom dev` | Serves the game in a browser, reloading as you edit. |
| `ifloom build [--out dir] [--inline-assets]` | Builds the game into one `index.html` with its pictures and sound beside it (or the pictures inside it), then checks the folder opens from disk. |
| `ifloom check [module]` | Loads the game and lists every problem the [loader](/reference/loader#the-checks) and [`validatePack`](/reference/game#validatepack) find, and every sound file missing from `public/`. |
| `ifloom playtest [module] [--turns n] [--out file]` | Plays the game for some turns with no one at the keyboard, and writes down every screen and each turn's numbers. |
| `ifloom snapshot [module] [--out file] [--update]` | Renders every scene and every place in a few chosen states, and compares the result with the last run. |

Run `ifloom new` from the checkout (`npm run new -- my-game`) and the others from the game's folder. They use the `vite.config.ts` there, which is where the [preset](#the-vite-preset) goes. [Small Town](/guide/showcase) is built with them.

## Install

[Installation](/guide/installation) covers the two ways to depend on IFLoom while it's pre-release: as a workspace inside a clone of the repository, or from a separate folder with `file:` dependencies. Add `@ifloom/cli` as a dev dependency the same way.

`@ifloom/cli` brings its own build tools: Vite, the React and Tailwind Vite plugins, Tailwind CSS and `vite-plugin-singlefile` are its dependencies, so your game's `package.json` only needs `@ifloom/*` packages.

If you want a different version of one of those tools, there are three cases:

- **A version inside the CLI's range**, such as a newer Tailwind 4.x: add it to your own `package.json`. npm uses your version, because it satisfies the CLI's range.
- **A version outside the range:** force it with npm's [`overrides`](https://docs.npmjs.com/cli/configuring-npm/package-json#overrides) (`pnpm.overrides` in pnpm). It may not work.
- **Another major of Tailwind:** the React UI's stylesheet is written for Tailwind 4, so the React UI decides that one. If you need something else, set `tailwind: false` on the [preset](#the-vite-preset) and style the game yourself.

Then add scripts to your `package.json`. These are Small Town's:

```json
{
  "scripts": {
    "dev": "ifloom dev",
    "build": "ifloom build",
    "check": "ifloom check",
    "playtest": "ifloom playtest --turns 7 --out playtest/week.txt",
    "snapshot": "ifloom snapshot",
    "build:one-file": "ifloom build --inline-assets --out dist-one"
  }
}
```

The `ifloom` command is a TypeScript file that Node runs directly, so you need a Node that strips types. Use Node 22.18 or later (24 recommended), where that's on by default. On Node 22.6 to 22.17, set `NODE_OPTIONS=--experimental-strip-types` before running `ifloom`. This works through a workspace or a `file:` link, because Node sees the file's real path in the checkout rather than a path under `node_modules`.

## ifloom new

```sh
npm run new -- my-story                    # from the root of the checkout
npm run new -- my-cafe --template cafe
npm run new -- my-tale --theme storybook
```

Makes a new game in `games/<name>` from a template and tells you what to run next: `npm install` at the root, then `npm run dev -w <name>`. The `games/` folder is an npm workspace that git ignores, so your game installs alongside the engine and stays out of the engine's history.

| Template | What you get |
|---|---|
| `blank` | A two-scene game drawn with the [React UI](/react/) in its reading layout, opening on a [title screen](/guide/title-screen). The default. |
| `vanilla` | The same game drawn with plain DOM and no framework. Start here for Vue, Svelte or anything else (see [Using another framework](/guide/frameworks)). |
| `novel` | A copy of The Letter, `examples/novel`. |
| `cafe` | A copy of The Corner Café, `examples/cafe`. |
| `town` | A copy of Small Town, `examples/showcase`, with every plugin. |

`--theme` picks the [React UI's preset](/react/customising#_1-pick-a-theme-preset): `paper`, `terminal`, `studio` or `storybook`. It goes in `src/styles.css` as an `@import` under the UI's stylesheet, and you can change it there later. Without `--theme`, a `blank` game gets one of the four at random, so two new games don't start out looking the same. A copy of an example keeps the preset the example uses, unless you pass `--theme`. The `vanilla` template has no React UI and ignores it. The command says which theme it used.

Every new game has the scripts `dev`, `build`, `check` and `playtest`, a `package.json` that depends only on `@ifloom/*` packages, and an `AGENTS.md` that tells a coding agent where the docs are and how to check its work (see [Using IFLoom with an AI agent](/guide/agents)). The copies of the examples leave out their tests, builds and recorded runs.

The name has to work as an npm package name: lower-case letters, digits and dashes. `ifloom new` refuses a folder that already exists and isn't empty.

## ifloom dev

```sh
ifloom dev
```

Starts Vite's dev server with the game's `vite.config.ts` and prints its address. It runs until you stop it.

`ifloom dev` takes no flags, and ignores any you pass, such as `--port`. To change the port or anything else about the server, set it in `vite.config.ts` through the preset's `vite` option, for example `ifloom({ vite: { server: { port: 5180 } } })`. Without that, Vite picks its default port.

Under `ifloom dev`, `import.meta.env.DEV` is `true`, so it's where the [debug plugin](/plugins/debug#leave-it-out-of-release-builds) belongs.

## ifloom build

```sh
ifloom build                                  # into dist/
ifloom build --out public                     # anywhere else
ifloom build --inline-assets --out dist-one   # the pictures inside index.html too
```

Runs `vite build` with the game's config into `--out` (default `dist`), emptying the folder first. With `--inline-assets`, it then puts every file in the folder's `art/` into `index.html` with [`inlineAssets`](#inlineassets), and says how many went in.

Then it prints the five largest files in the folder with their sizes, and checks the folder with [`checkBuild`](#checkbuild). The check makes sure there's an `index.html` and that every script and stylesheet it loads sits beside it. When the game's `src/game.ts` loads, it also checks that every track in [`game.audio`](/reference/audio) has its file in the folder's `audio/`. Each problem is printed, and the command exits with `1` if there are any, so CI fails on a build that wouldn't open from disk.

```
index.html  424.5 kB
```

With the preset, that's the whole game: one HTML file with the script and stylesheet inside it, the pictures in `art/` beside it, and the sound in `audio/`. See [Shipping a game](/guide/shipping) for why it has to be one file.

### One file, pictures and all

`--inline-assets` turns the folder into a single `index.html` with nothing beside it. Each picture is written into the page as a `data:` URL, and the `art/` folder is removed. The base UI looks up every picture it draws in the page first, with [`assetUrl`](/react/components#asseturl), so the game needs no change. Small Town's `build:one-file` script is `ifloom build --inline-assets --out dist-one`.

```
Put 4 files from art/ into index.html.
index.html  440.6 kB
```

**Gotchas.**

- **Only pictures the base UI draws are looked up.** That covers a [`Picture`](/react/components#picture) (and so every portrait, stage picture and image in the prose) and a device's wallpaper. A component of your own that sets an `<img src>` or a CSS `url()` from a path must pass it through [`assetUrl`](/react/components#asseturl). Otherwise it points at a file that's no longer there.
- **Sound is never inlined.** The `audio/` folder stays beside `index.html`, and the command says so. Music and voices run to megabytes, and the page would have to read all of it before the game first draws. A game with sound ships as a folder, so `--inline-assets` gives a page with the pictures inside and `audio/` beside it.
- **Inline only a small game.** Every picture goes in the page, a third bigger than the file because of base64, and is read before the game first draws. A game with a few hundred kilobytes of art is fine as one file. One with megabytes of art is better as a folder.

**What it doesn't check.** The build isn't searched for `fetch` or a dynamic `import()`. A bundled library can name `fetch` without ever calling it, so finding the word in the output means nothing. The engine's and the UI's own contract tests check their source never loads anything at runtime. Your own code has to keep that rule too.

## ifloom check

```sh
ifloom check                     # reads src/game.ts
ifloom check src/release.ts      # another module
```

Loads the module through Vite, so it can import TypeScript, the engine and anything your config resolves. It takes the game the module exports and prints every problem, one per line, then a count:

```
No problems.
```

It exits with `1` if there are any problems. Run it in CI beside your tests.

It also looks for every track's sound file in the game's `public/` folder, where Vite copies it from into the build. A track's `src` goes through [`audioSrc`](/reference/audio#audiosrc) as the page would, so `{ src: 'music/calm' }` must be at `public/audio/music/calm.ogg`. A missing one is reported as:

```
track calm: no file public/audio/music/calm.ogg
```

### What the module exports

Export the game as `default` or as `game`, in any of these shapes:

- a [`Game`](/reference/game#game);
- what [`loadGame`](/reference/loader#loadgame) returns, `{ game, problems }`. Its `problems` are printed first. They can be the loader's [`Problem`](/reference/loader#problem-and-describeproblem) objects, which the CLI writes with `describeProblem`, or strings, which are printed as they are;
- a function, called with no arguments, that returns either of those.

The simplest module returns what `loadGame` gave it:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { story } from './story.ts'

/** What `ifloom check` loads. */
export default function release() {
  return loadGame([story], { id: 'my-game', title: 'My Game', introScene: 'start' })
}
```

A function export lets you check the release build when the module builds the game with options, because `check` calls it with none. Small Town does this. Its `smallTown({ withDebug, mods })` builds the game with the calendar, places, cast, phone, quests and wardrobe plugins, and its default export is `release()`, which calls `smallTown()` with no debug plugin and no mods. See [`examples/showcase/src/game.ts`](/guide/showcase#the-files).

## ifloom playtest

```sh
ifloom playtest                                  # seven turns, into playtest.txt
ifloom playtest --turns 30 --out playtest/month.txt
ifloom playtest src/release.ts                   # another module
```

Loads the module as `check` does, then plays the game from its start for `--turns` [turns](/reference/state) (default 7). At each step a [policy](#policy) looks at the screen and picks the next command. In Small Town a turn is a day, so seven turns is a week.

It writes two files:

- **The transcript**, to `--out` (default `playtest.txt`). This is every screen as the player would read it, with the command taken on it underneath.
- **The numbers**, to `<out>.metrics`. There's one row per turn, with each of the player's [declared stats](/reference/stats) as the turn ended, how many [entities](/reference/entities) there were of each kind, how many scenes were entered and how many commands were refused.

Then it prints the numbers, and each refused command with its turn and its reason, as `turn 3: refused {…}: <reason>`. Any folders in `--out` are created for you.

It exits with `1` if any command was refused, so CI fails on a button the game offered and then wouldn't do. Otherwise it exits with `0`. `--turns` takes a whole number, 1 or more. Anything else is refused with `--turns takes a whole number of turns, 1 or more.` and exits with `1` before playing.

```
turn	coins	energy	charm	character	scenes	refused
1	12	80	1	2	0	0
2	21	55	2	2	2	0
3	34	55	3	2	2	0
...
7	16	85	7	2	2	0
```

A screen in the transcript is what [`screenText`](#screentext) writes, followed by the JSON command the policy returned:

```
== Turn 2 · Day 2 · Tuesday morning · High Street
# High Street
A bakery, a launderette, a bus stop with a bench nobody sits on. The café on the corner has its door propped open.

Wind down the street, rattling the bakery sign.
  [>] Buy a scarf at the market (8 coins)
  [>] Wait a while (until afternoon)
  [>] Sam: Talk
  -> Your flat
  -> The Corner Café
  -> Riverside Park
  -> The Office

> {"type":"custom","name":"cast/talk","with":{"who":"sam"}}
```

`[>]` is a button the player can press, `[ ]` is one that's greyed out (with its reason after the dash), and `->` is a way out. A button's price is in brackets after it. A person's buttons carry their name, as in `Sam: Talk`, because otherwise every person's would read **Talk**.

`character` in the numbers is the [cast](/plugins/cast)'s kind. Small Town has two characters. The friendship declared on them is a stat of that kind, so it isn't a column.

**How to use it.** Run it before and after a change to pacing, such as a price, a reward, a door's opening hours or a gate, and read both transcripts. The numbers tell you when things happened, such as the turn the coins stopped climbing or the turn a scene first opened. Only the transcript tells you whether a week of play is worth reading. Look for a line that prints on every screen, a scene dealt the same variant five days running, or a gate meant for the second week that's open on day two. None of those is a wrong value, so no test will find them. Small Town has a weekly rent because its first playtest showed the coins only ever climbing.

### What playtest reads

The same exports as [`check`](#what-the-module-exports), plus two that `playtest` reads if they're there:

- **`start`**: the state to start from, or a function that takes the game and returns it. Without it, the start is [`startingState(game)`](/reference/commands#startingstate).
- **`policy`**: a [`Policy`](#policy). Without it, the policy is [`explorer()`](#explorer).

```ts
// src/game.ts
import { startingState, type Game } from '@ifloom/engine'

export const start = (game: Game) => startingState(game, { flags: { playerName: 'Robin' } })
```

**Gotchas.**

- **The explorer is curious, not clever.** It knows nothing about your game, so it shows what a player poking at every button meets, not a route through the story. To reach a scene that needs good choices, write a policy of your own.
- **There's one row per turn played.** A `--turns 7` run that plays them all has seven rows, each taken as that turn ended. A run that stops early ends with a row for the turn it stopped in, which may have only just begun. A run stops early when the policy gives up, at the step limit, or in a refusal loop.
- **A turn only ends when the game ends one.** The count moves on with a [`turn`](/reference/effects#turn) effect, which the [calendar](/plugins/calendar#what-a-turn-is) applies as time passes and when the player goes to bed. In a game that never ends a turn, the run never reaches its turns. It stops at the policy or the step limit instead.
- **A policy that keeps getting refused stops the run.** When the same command is refused on two steps in a row, with nothing in between, the play ends there rather than looping to the step limit. The same command refused twice with other steps in between isn't a loop, so the run goes on. Both refusals are still listed, and the exit code is still `1`.

## ifloom snapshot

```sh
ifloom snapshot                    # snapshots/scenes.txt: write it, or compare with it
ifloom snapshot --update           # write it again, after a change you meant
ifloom snapshot --out other.txt
```

Loads the module as `check` does and uses [`snapshot`](#snapshot) to render every scene, and every place's body, in every probe state. Then:

- **The first time**, when `--out` (default `snapshots/scenes.txt`) doesn't exist, it writes the file.
- **After that**, it compares with the file, render by render. Each render is matched by its `===` header, so a scene whose body runs to several paragraphs is reported once, by its name. If nothing differs, it prints `Every scene reads as it did.` If something does, it prints `changed: <scene> @ <probe>` for each render that's new or reads differently. It prints `changed: <scene> @ <probe> (gone)` for each render that's in the file but no longer produced, because a scene was removed or renamed or a probe was dropped. Then it exits with `1`.
- **With `--update`**, it writes the file again whatever is in it.

```
changed: ava.hi @ a-week-in
changed: place:flat @ first-morning
changed: sam.hi @ moving-day (gone)
3 scene renders changed. If you meant it, run again with --update.
```

Commit the file. A difference is either a bug or a change you meant. Read the diff before you run `--update`. It tells you which scene now reads differently, and in which state, which is exactly what a change to a condition or a prose key can do without anyone noticing. Small Town's tests compare its snapshot on every run, so a change to how any scene reads fails them until the file is updated.

### What snapshot reads

The same exports as [`check`](#what-the-module-exports), plus `probes` if it's there. `probes` is a function that takes the game and returns a list of [`Probe`](#probe)s, `{ name, state }`. Without it, the one probe is `start`, the same [`start`](#what-playtest-reads) state `playtest` uses.

Pick probes that differ in what the content looks at: the first screen, an ordinary day, and a state well along, with variables set, a friendship grown and scenes seen. Small Town's three are `moving-day`, `first-morning` and `a-week-in`:

```ts
// src/game.ts, after Small Town's `clock` and `start`
import type { Game } from '@ifloom/engine'

export function probes(game: Game) {
  // `clock` is the game's calendar(...). Its write() sets the calendar's clock in a state.
  const first = clock.write({ ...start(game), phase: 'open', sceneId: null, turn: 1 }, { day: 1, period: 'morning' })
  return [
    { name: 'moving-day', state: start(game) },
    { name: 'first-morning', state: first },
    {
      name: 'a-week-in',
      state: {
        ...clock.write(first, { day: 7, period: 'afternoon' }),
        turn: 7,
        seen: { ...first.seen, 'ava.hi': 4 },
        flags: { catName: 'Biscuit' },
        // Ava's friendship, a stat of the cast's `character` kind, kept on her entity.
        entities: { ...first.entities, character: { ...first.entities.character, ava: { ...first.entities.character.ava, stats: { friendship: 30 } } } },
        stats: { ...first.stats, charm: 5 },
        plugins: { ...first.plugins, wardrobe: { version: 1, state: { worn: { coat: null, neck: null } } } },
      },
    },
  ]
}
```

**Gotchas.**

- **Each scene is rendered as if it were open in the probe's state**, wherever the probe's player stands. A scene that only makes sense in one place is rendered in all of them. That's deliberate, because it shows what its conditions do, but keep it in mind when you read the file.
- **A probe is a state you wrote by hand.** Nothing checks that a game could reach it, so set the calendar's clock and `turn` so they agree. Build each probe from the start state, as above, so it stays a whole state when the game adds a field.

## The Vite preset

```ts
function ifloom(options?: IfloomViteOptions): UserConfig

type IfloomViteOptions = {
  singleFile?: boolean
  react?: boolean
  tailwind?: boolean
  vite?: UserConfig
}
```

The Vite config every IFLoom game builds with, from `@ifloom/cli/vite`:

```ts
// vite.config.ts
import { ifloom } from '@ifloom/cli/vite'

export default ifloom()
```

It sets up:

- **React** (`@vitejs/plugin-react`) and **Tailwind CSS** (`@tailwindcss/vite`), but only when the game uses them. The preset reads the game's `package.json`: a game that depends on `@ifloom/react` gets both, `react` alone turns on React, and `tailwindcss` alone turns on Tailwind. A game on the engine alone gets neither.
- **One file.** `vite-plugin-singlefile` puts the script and the stylesheet inside `index.html`.
- **`base: './'`**, so every path is relative and the folder opens from disk or from an itch.io subpath.
- **One copy of React.** When React is on, it dedupes `react` and `react-dom`, so a game linked to a checkout bundles one React even when the checkout has its own `node_modules`.

| Option | What it does | Default |
|---|---|---|
| `singleFile` | Puts the script and stylesheet inside `index.html`. `false` leaves them as files beside it. | `true` |
| `react` | Adds React's Vite plugin. | On if the game depends on `@ifloom/react` or `react` |
| `tailwind` | Adds Tailwind's Vite plugin. | On if the game depends on `@ifloom/react` or `tailwindcss` |
| `vite` | Any other Vite config, merged under the preset. Its `plugins` are added after the preset's, and its `resolve.dedupe` after `react` and `react-dom`. Another framework's plugin goes here, such as `ifloom({ vite: { plugins: [vue()] } })`. | `{}` |

```ts
import { ifloom } from '@ifloom/cli/vite'

export default ifloom({ vite: { server: { port: 5180 }, plugins: [myPlugin()] } })
```

**Gotchas.**

- **`ifloom` doesn't apply the preset itself.** `dev`, `build`, `check`, `playtest` and `snapshot` all read the game's `vite.config.ts`. A game with no config gets plain Vite, with no React and no inlining.
- **The preset's `base` always wins.** A `base` in `vite` is overwritten with `'./'`.
- **`--out` wins over `build.outDir`.** `ifloom build` always passes an output folder (`dist` if you give none), so an `outDir` in the config is ignored. Use `--out`.
- **`singleFile: false` won't open from disk.** The script and stylesheet are then loaded from files beside the page, which a browser refuses on a `file://` address (see [Shipping a game](/guide/shipping#why-a-folder-that-opens-from-disk-is-hard)). Such a folder works when served over the web, as itch.io does. But `ifloom build`'s check reports its module script, so the build exits with `1`.

## For scripts

These are the parts the commands are made from, exported from `@ifloom/cli` for a build script or a test that wants them without the command line.

```ts
import { TEMPLATES, THEMES, buildFiles, checkAudio, checkBuild, checkGame, explorer, gameFrom, inlineAssets, metricsText, newGame, playtest, screenText, snapshot } from '@ifloom/cli'
import type { NewGameOptions, Playtest, PlaytestOptions, Policy, Probe, TemplateName, ThemeName, TurnMetrics } from '@ifloom/cli'
```

### newGame

```ts
function newGame(options: NewGameOptions): { dir: string; files: string[]; theme: ThemeName | null }

type NewGameOptions = {
  name: string
  template?: TemplateName
  into?: string
  theme?: ThemeName
}

type TemplateName = 'blank' | 'vanilla' | 'novel' | 'cafe' | 'town'
const TEMPLATES: readonly TemplateName[]

type ThemeName = 'paper' | 'terminal' | 'studio' | 'storybook'
const THEMES: readonly ThemeName[]
```

What `ifloom new` runs. It copies a template into `into` (`games/<name>` in the checkout if left out), sets the package name, fills in the title, and returns the folder and the files it wrote. It installs nothing. It throws on a name npm wouldn't accept, a template or a theme that doesn't exist, or a folder that isn't empty.

`theme` is the React UI's preset, written into `src/styles.css`. Left out, a `blank` game gets one from `THEMES` at random and a copied example keeps its own. The returned `theme` is the preset the game ended up with, or `null` for the `vanilla` template (which ignores `theme`) and for a game whose stylesheet imports no preset.

```ts
import { newGame } from '@ifloom/cli'

const { dir } = newGame({ name: 'rainy-day', template: 'vanilla', into: '/tmp/rainy-day' })
const { theme } = newGame({ name: 'market-day', theme: 'paper', into: '/tmp/market-day' }) // 'paper'
```

### checkBuild

```ts
function checkBuild(dir: string, game?: Game): string[]
```

Returns what's wrong with a built folder as a game that opens from disk, or an empty list when nothing is. It reads `dir/index.html` and reports:

- each `<script src>` and each stylesheet `<link>` that's a full address (`https://…`, `//…`) or starts with `/`;
- each module script loaded from a file beside the page, which a browser refuses from disk (`index.html loads the module script …, which won't load from disk; build as one file`);
- given the `game`, each track whose sound file isn't in the folder, as [`checkAudio`](#checkaudio) reports it.

With no `index.html`, the one problem is `no index.html in <dir>`.

```ts
import { checkBuild } from '@ifloom/cli'

checkBuild('dist') // []
checkBuild('dist') // ['index.html loads /assets/index.js, which is not beside it']
```

Only stylesheets count among the `<link>`s. An icon at `/favicon.ico` isn't reported, though it won't show from disk either.

### buildFiles

```ts
function buildFiles(dir: string, at?: string): { file: string; bytes: number }[]
```

Every file under a folder, including subfolders, with its size in bytes, largest first. `file` is the path inside `dir`. `at` starts the walk from a subfolder of `dir` (the whole folder if you leave it out), and the paths are still relative to `dir`.

```ts
import { buildFiles } from '@ifloom/cli'

buildFiles('dist') // [{ file: 'index.html', bytes: 434640 }, { file: 'art/place/cafe.jpg', bytes: 81200 }]
```

### inlineAssets

```ts
function inlineAssets(dir: string, folder?: string): { files: number; bytes: number }
```

What `ifloom build --inline-assets` runs on the built folder `dir`. Every file under `dir/<folder>` (default `art`), including subfolders, goes into `dir/index.html` as a `data:` URL. They go in one `<script>` at the top of `<head>` that sets `window.__ifloomAssets` to a map such as `{ "art/place/cafe.jpg": "data:image/jpeg;base64,…" }`. Then the folder is removed. It returns how many files went in and the size of the page afterwards, in bytes.

The type in each URL comes from the file's extension: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif`, `.svg`, `.mp3`, `.ogg`, `.oga`, `.opus`, `.wav`, `.m4a`, `.aac`, `.flac`, `.webm` or `.mp4`. Anything else is `application/octet-stream`. The script goes before every other script, so the map is there when the game first draws, and the base UI's [`assetUrl`](/react/components#asseturl) reads it.

```ts
import { checkBuild, inlineAssets } from '@ifloom/cli'

inlineAssets('dist') // { files: 4, bytes: 451164 }
checkBuild('dist')   // []
```

**Gotchas.**

- **The map's keys are the paths the game uses**, `art/…`, as [`artSrc`](/reference/prose#artsrc) writes them. With another `folder`, they start with that folder's name instead.
- **With nothing to inline, the page is left alone.** When there's no `art/` folder, or it's empty, no script is added and nothing is removed. The result says `files: 0`.
- **A second run changes nothing.** On a folder already inlined there's no `art/` left, so the same rule applies.
- **`audio/` isn't touched.** The sound files the [audio player](/reference/audio-player) plays stay beside the page. You could pass `folder: 'audio'`, but the player looks for files beside the page and never reads the map, so they wouldn't play.

### checkGame

```ts
function checkGame(module: Record<string, unknown>, publicDir?: string): string[]
```

Everything wrong with the game a module exports: the problems it came with, then [`validatePack`](/reference/game#validatepack)'s. Given `publicDir`, it also adds every sound file missing from it, with [`checkAudio`](#checkaudio). This is what `ifloom check` prints, with `publicDir` set to `'public'`. The module is read as in [What the module exports](#what-the-module-exports).

```ts
import { expect, it } from 'vitest'
import { checkGame } from '@ifloom/cli'
import * as module from '../src/game.ts'

it('has no problems', () => {
  expect(checkGame(module)).toEqual([])
})
```

In a test, this is `ifloom check` without the command line. Small Town's own build test does this.

### checkAudio

```ts
function checkAudio(game: Game, dir: string): string[]
```

Every track in [`game.audio`](/reference/audio) whose file isn't in `dir`. Each track's `src` goes through [`audioSrc`](/reference/audio#audiosrc), so pass the folder the page sits in: `public` before a build, or the built folder after one. Playlists only name other tracks, so they aren't looked for.

```ts
import { checkAudio } from '@ifloom/cli'

checkAudio(game, 'public') // ['track knock: no file public/audio/knock.ogg']
checkAudio(game, 'dist')   // []
```

### gameFrom

```ts
function gameFrom(module: Record<string, unknown>): { game: Game; problems: string[] }
```

The game a module exports, and the problems it came with as text. Loader [`Problem`](/reference/loader#problem-and-describeproblem) objects are written with `describeProblem`, and anything else with `String()`. It throws when the module has neither a `default` nor a `game` export.

```ts
import { gameFrom } from '@ifloom/cli'

const { game, problems } = gameFrom(await import('./src/game.ts'))
```

### playtest

```ts
function playtest(game: Game, start: GameState, policy?: Policy, options?: PlaytestOptions): Playtest

type PlaytestOptions = {
  turns?: number  // 7
  steps?: number  // 2000
}
```

What `ifloom playtest` runs. It plays `game` from `start`, asking `policy` (default [`explorer()`](#explorer)) for each command and running it with [`apply`](/reference/commands#apply). It stops at the first of:

- `turns` turns passed since `start`'s turn;
- the policy returning `null`;
- `steps` commands, refused ones included, as a guard against a policy going round in circles;
- the same command refused on two steps in a row.

```ts
import { expect, it } from 'vitest'
import { explorer, playtest } from '@ifloom/cli'
import { smallTown, start } from '../src/game.ts'

it('charges rent on Sunday', () => {
  const { game } = smallTown()
  const result = playtest(game, start(game), explorer(), { turns: 7 })
  expect(result.refusals).toEqual([])
  expect(result.turns[6].stats.coins).toBeLessThan(result.turns[5].stats.coins)
})
```

**Gotcha.** A refused command still counts as a step and leaves the state as it was. So a policy that ignores refusals and asks for something else each time runs to the step limit on the same screen. The `refusals` list shows it.

### Playtest

```ts
type Playtest = {
  transcript: string
  turns: TurnMetrics[]
  refusals: { turn: number; command: Command; reason: string }[]
  state: GameState
}
```

What [`playtest`](#playtest) returns.

- `transcript` is every screen through [`screenText`](#screentext), each followed by `> ` and the command as JSON, then `  refused: <reason>` when it was refused. Entries are separated by blank lines.
- `refusals` lists each refused command with its turn (counted from 1) and the engine's reason. Each one is a bug in the policy or in the game.
- `state` is where it stopped.

### TurnMetrics

```ts
type TurnMetrics = { turn: number; stats: Record<string, number>; scenes: string[]; refused: number }
```

One turn's numbers, taken as the turn ended.

- `turn` counts from 1.
- `stats` has each of the player's [declared stats](/reference/stats), at its `start` if the state has no value yet. Then it has each declared [kind](/reference/entities), by id, with how many entities of it there were. A stat declared `of` a kind isn't included.
- `scenes` is the id of every scene entered that turn, in order. A scene entered twice is there twice.
- `refused` is the number of commands refused that turn.

There's one entry for each turn played through. A run that stopped before its `turns` were up has one more entry at the end, for the turn it stopped in, which may have only just begun.

### Policy

```ts
type Policy = (screen: View, state: GameState, game: Game) => Command | null
```

How a playtest picks the next command, from the [`View`](/reference/view#view) on screen, the state behind it and the game. Returning `null` stops the play. A policy can keep its own memory in a closure, as `explorer` does.

```ts
import { pluginQuery } from '@ifloom/engine'
import { explorer, type Policy } from '@ifloom/cli'

// Work every morning, and otherwise do what the explorer would.
function worker(): Policy {
  const curious = explorer()
  return (screen, state, game) => {
    const work = screen.actions.find((action) => action.id === 'work' && !action.disabled)
    // The calendar's clock, asked by name: undefined in a game without one.
    const now = pluginQuery(game, 'calendar/now')?.(state) as { period: string } | undefined
    if (work && now?.period === 'morning') return work.command
    return curious(screen, state, game)
  }
}
```

**Gotcha.** Pick from what the screen offers, and check `disabled`, rather than building commands from ids you know. A command the screen doesn't offer is refused, and the same command refused on two steps in a row ends the run.

### explorer

```ts
function explorer(): Policy
```

The default policy: a curious player who knows nothing about the game. Each call returns a new explorer with its own memory. On each screen, it takes the first of these that applies:

1. **In a scene**, a choice it hasn't made yet in this playtest, so a scene it comes back to takes another branch. Once every choice has been made, it takes the first open one. A choice that's greyed out or carries a `warning` is never open. With no open choice, it sends `leave`.
2. **At bedtime**, bed. That's an action here whose command is the [calendar](/plugins/calendar#commands)'s `sleep` (`{ type: 'custom', name: 'calendar/sleep' }`), or else the first step on the shortest walk to a place that has one. It's bedtime when the calendar's [`calendar/bedtime`](/plugins/calendar#queries) query says so, by default in the evening, night and late periods. The explorer asks by name with [`pluginQuery`](/reference/plugins#pluginquery), so in a game with no calendar it never goes to bed.
3. **Someone to talk to**, then **something to do**, each once a turn. Someone to talk to is a person's button in the [cast](/plugins/cast#the-view)'s view, `view.plugins.cast.present`, read by its shape. Something to do is an action sending any command except bed, or an activity whose effects do something besides pass time (`calendar/pass`). Something to do never ends the turn. Buttons that would end it wait for the last step.
4. **The first step toward the nearest place** it hasn't been to this turn.
5. **Ending the turn**, with an action that ends the turn. Failing that, it takes an action not done this turn, or else the first action there is. An activity that only passes time counts as waiting, and waits until this step.

To tell which buttons end the turn, it tries each one. It runs the button's command on the current state with [`apply`](/reference/commands#apply) and checks whether `turn` went up. `apply` is deterministic and the state carries its seed, so the try is exactly what pressing it would do, and the explorer doesn't have to know anything about the game. So even in a game with no calendar, it does everything else there is to do before pressing the button that moves the week on.

Where the player is, the map and the exits come from the [places](/plugins/places) plugin, asked by name. The explorer uses the `places/here` and `places/all` [queries](/plugins/places#queries), and the exits in the plugin's [view](/plugins/places#the-view), taking each exit by sending its own `command`. In a game without the places plugin, the explorer never walks. In a game without the cast, it has nobody to talk to.

It never presses a button with a [`warning`](/reference/view#renderedchoice), such as the calendar's `That would run past dawn.` When there's nothing left to press, it returns `null` and the play stops.

In Small Town, it unpacks, sleeps, talks to Sam and Ava, buys a coffee and a scarf, works and jogs, and walks home to bed every night. That's what a player trying every button meets, not a route through the story.

The Corner Café has no map, no people and no clock, so every turn offers the same few buttons. Each week the explorer buys the staff lunch, gets better ingredients for the soup while it can, puts a card in the window while there's room and hires the first applicant. Only then does it count the till and end the week:

```
== Turn 1
# The Corner Café

  [>] Count the till and end the week
  [>] Buy the staff lunch (£25)
  [>] Better ingredients for the soup (£40)
  [>] Put a card in the window

> {"type":"activity","id":"staffLunch"}
```

```
turn	coins	reputation	staff	dish	scenes	refused
1	55	30	2	2	1	0
2	66	30	3	2	1	0
3	170	30	3	2	1	0
4	274	30	4	2	1	0
...
8	718	30	4	2	0	0
```

It takes on Dev, then Fen, then turns the next applicant away, taking a different branch of the interview each time it comes back. From the fifth week the kitchen is full and the soup is as good as it gets, so it buys lunch and ends the week while the till keeps climbing. That's the kind of curve the numbers are there to show.

**Gotchas.**

- **"Once a turn" is per action id and per person, not per place.** A `wait` done on the high street counts as done in the café too. That memory resets each turn, while the choices made in scenes are remembered for the whole playtest.
- **Trying a button runs it.** Each action's command is applied once to see whether it ends the turn, so a game's [custom functions](/reference/custom) run for buttons that are never pressed. A custom function that only reads the state and returns, as [`apply`](/reference/commands#apply) expects, won't notice. One that logs or counts its calls outside the state will see the extra runs.
- **It only presses the screen's buttons.** That means choices, actions, people and exits. It never uses an item, opens a device or answers a message. In Small Town it buys a sandwich most days and never eats one. Write a policy for what it doesn't reach.

### screenText

```ts
function screenText(screen: View): string
```

A screen as plain text, as the transcript shows it. In order, it writes:

- a header line, `== Turn N · <when>`, with the turn (counted from 1) and [`view.when`](/reference/view#the-clock-and-the-player) in the plugins' words. In Small Town that's the calendar's `Day 2 · Tuesday morning`, then the [places](/plugins/places#the-label) plugin's place, `High Street`. The `<when>` part is left out when no plugin sets it;
- `#` and the scene's title;
- the scene's body;
- every button: the scene's choices, then the actions, then each present person's buttons from the [cast](/plugins/cast#the-view)'s `present`, labelled `<Name>: <label>`. Each is `[>]`, or `[ ]` when greyed out. Its price follows in brackets, separated by commas: the stats' text, then the plugins' [notes](/reference/view#price), such as the calendar's `until afternoon`. A greyed-out button ends with `— ` and the reason;
- each exit in the places plugin's [view](/plugins/places#the-view), as `->`, with its reason if it's closed.

```ts
import { view } from '@ifloom/engine'
import { screenText } from '@ifloom/cli'

screenText(view(state, game)).split('\n')[0] // '== Turn 2 · Day 2 · Tuesday morning · High Street'
```

### metricsText

```ts
function metricsText(turns: TurnMetrics[]): string
```

The turns as a tab-separated table. The header is `turn`, each key of the first turn's `stats` (the player's stat ids, then the kinds' ids), `scenes` and `refused`. Then there's a row per turn, where `scenes` is the number of scenes entered. This is what `ifloom playtest` writes to `<out>.metrics` and prints. It pastes straight into a spreadsheet.

### snapshot

```ts
function snapshot(game: Game, probes: Probe[]): string
```

What `ifloom snapshot` writes: every scene and every place rendered in every probe, as text. Scenes come first, sorted by id, then places, sorted by id. Within each, the probes are in the order given. Each render is a block:

```
=== ava.hi @ a-week-in
Ava looks up from the till and grins.

"You’re the one above the launderette. Welcome to the worst-kept secret in town: me."

Ava: "Rain later. The ducks know before the forecast does."

She has your cup out before you ask.
  [>] Chat for a minute
  [>] Tell her the café is the best thing in town
  [>] Leave her to it

=== place:cafe @ a-week-in
Six tables, one of them wobbly. The coffee machine sighs like it has been working since dawn, which it has.

Ava is behind the counter, flour to the elbows, and nods you in.
```

A scene's block is its body, then each visible choice as `[>]`, or as `[ ]` with `— ` and the reason it's greyed out. Data scenes and hand-written ones both render, through [`sceneById`](/reference/game#scenebyid), with the probe's state and `sceneId` set to the scene. If a scene throws, the block records `!! threw: <message>` instead of stopping the run.

The places are the ones the [places](/plugins/places) plugin's `places/all` [query](/plugins/places#queries) returns, asked by name with [`pluginQuery`](/reference/plugins#pluginquery). A game without the plugin has no places here. A place's block is headed `place:<id>` and holds its body, rendered with `sceneId` cleared and the player moved there by the plugin's own [`places/move`](/plugins/places#effects) effect.

Draws come from the save's seed, so the same game and the same probes give the same text every time. Compare it in a test, as Small Town does:

```ts
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { snapshot } from '@ifloom/cli'
import { probes, smallTown } from '../src/game.ts'

it('every scene and place reads as it did', () => {
  const { game } = smallTown()
  expect(snapshot(game, probes(game))).toBe(readFileSync(new URL('../snapshots/scenes.txt', import.meta.url), 'utf8'))
})
```

**Gotchas.**

- **Hidden choices are left out.** A choice whose `when` fails isn't in the block. One greyed out by `blocked` is, with its reason.
- **A place's variants are drawn from the turn alone.** A room has no choices to record a draw, so the probe's seed and `turn` pick the line, the same on every run. Set `turn` in a probe along with the calendar's clock. Otherwise a probe dated a week in draws as if it were the first turn.

### Probe

```ts
type Probe = { name: string; state: GameState }
```

A state to render every scene in. `name` goes in each block's header, `=== <scene> @ <name>`, so keep it short and without spaces.
