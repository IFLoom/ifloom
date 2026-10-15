# The CLI

`@ifloom/cli` runs a game while you write it, builds it into a folder that opens from disk, checks it for the problems the loader can find, plays it unattended, and records how every scene reads. It is five commands and a Vite preset:

| Command | Does |
|---|---|
| `ifloom dev` | Serves the game in a browser, reloading as you edit. |
| `ifloom build [--out dir] [--inline-assets]` | Builds the game into one `index.html` with its pictures beside it, or inside it, then checks the folder opens from disk. |
| `ifloom check [module]` | Loads the game and lists every problem the [loader](/reference/loader#the-checks) and [`validatePack`](/reference/game#validatepack) find. |
| `ifloom playtest [module] [--turns n] [--out file]` | Plays the game for some turns with no one at the keyboard, and writes down every screen and each turn's numbers. |
| `ifloom snapshot [module] [--out file] [--update]` | Renders every scene and every place in a few chosen states, and compares the result with the last run. |

All five run from the game's folder and use the `vite.config.ts` there, which is where the [preset](#the-vite-preset) goes. [Small Town](/guide/showcase) is built with them.

## Install

Pre-release, like the engine: point at the package in a local checkout, as in [Installation](/guide/installation). The preset uses React, Tailwind CSS and `vite-plugin-singlefile`, so a game installs them beside it:

```json
{
  "scripts": {
    "dev": "ifloom dev",
    "build": "ifloom build",
    "check": "ifloom check",
    "playtest": "ifloom playtest --turns 7 --out playtest/week.txt",
    "snapshot": "ifloom snapshot"
  },
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/ui": "file:../ifloom/packages/ui",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@ifloom/cli": "file:../ifloom/packages/cli",
    "@tailwindcss/vite": "^4.0.0",
    "@vitejs/plugin-react": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "vite": "^8.0.0",
    "vite-plugin-singlefile": "^2.0.0"
  }
}
```

`@ifloom/cli` lists Vite and the three Vite plugins its preset uses as peer dependencies: the game installs them, as above, so their versions are the game's.

The `ifloom` command is a TypeScript file run by Node directly, so it needs a Node that strips types: 22.6 or later, and 24 to run it without a flag. Through the `file:` link that works, because Node sees the file's real path in the checkout and not under `node_modules`.

## ifloom dev

```sh
ifloom dev
```

Starts Vite's dev server with the game's `vite.config.ts` and prints its address. It runs until you stop it. This is the place for the [debug plugin](/plugins/debug#leave-it-out-of-release-builds): under `ifloom dev`, `import.meta.env.DEV` is `true`.

## ifloom build

```sh
ifloom build                                  # into dist/
ifloom build --out public                     # anywhere else
ifloom build --inline-assets --out dist-one   # the pictures inside index.html too
```

Runs `vite build` with the game's config into `--out` (default `dist`), emptying it first. With `--inline-assets`, it then puts every file in the folder's `art/` into `index.html` with [`inlineAssets`](#inlineassets), and says how many went in. Then it prints the five largest files in the folder with their sizes, and checks the folder with [`checkBuild`](#checkbuild): there is an `index.html`, and every script and stylesheet it loads sits beside it. Each problem is printed, and the command exits with `1` if there are any, so CI fails on a build that would not open from disk.

```
index.html  424.5 kB
```

With the preset, that is the whole game: one HTML file with the script and stylesheet inside it, and the pictures in `art/` beside it. See [Shipping a game](/guide/shipping) for why it has to be one file.

### One file, pictures and all

`--inline-assets` makes the folder a single `index.html`, with nothing beside it: each picture is written into the page as a `data:` URL, and the `art/` folder is removed. The base UI looks every picture it draws up there first, with [`assetUrl`](/ui/components#asseturl), so the game needs no change. Small Town's `build:one-file` script is `ifloom build --inline-assets --out dist-one`.

```
Put 4 files from art/ into index.html.
index.html  440.6 kB
```

**Gotchas.**

- **Only pictures the base UI draws are looked up.** A [`Picture`](/ui/components#picture), and so every portrait, stage picture and image in the prose, and a device's wallpaper. A component of your own that sets an `<img src>` or a CSS `url()` from a path must pass it through [`assetUrl`](/ui/components#asseturl), or it points at a file that is no longer there.
- **Inline only a small game.** Every picture is in the page, a third bigger than the file as base64, and is read before the game first draws. A game with a few hundred kilobytes of art is fine as one file; one with megabytes is better as a folder.

**What it does not check.** The build is not searched for `fetch` or a dynamic `import()`: a bundled library can name `fetch` without ever calling it, so the word in the output means nothing. That the engine and the UI never load anything at runtime is held by their own contract tests, on their source. Your own code has to keep the rule too.

## ifloom check

```sh
ifloom check                     # reads src/game.ts
ifloom check src/release.ts      # another module
```

Loads the module through Vite, so it can import TypeScript, the engine and anything your config resolves, takes the game it exports, and prints every problem, one a line, then a count:

```
No problems.
```

It exits with `1` if there are any. Run it in CI beside your tests.

### What the module exports

The game, as `default` or as `game`, in any of these shapes:

- a [`Game`](/reference/game#game);
- what [`loadGame`](/reference/loader#loadgame) returns, `{ game, problems }`, whose `problems` are printed first;
- a function, called with no arguments, that returns either.

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { town } from './content/town.ts'

export function smallTown() {
  const { game, problems } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), places({ start: 'flat' })] })
  return { game, problems: problems.map((problem) => `${problem.pack} · ${problem.where} · ${problem.what}`) }
}

/** What `ifloom check` loads: the release build of the game. */
export default function release() {
  return smallTown()
}
```

A function export is the way to check the release build when the module builds the game with options: `check` calls it with none.

## ifloom playtest

```sh
ifloom playtest                                  # seven turns, into playtest.txt
ifloom playtest --turns 30 --out playtest/month.txt
ifloom playtest src/release.ts                   # another module
```

Loads the module as `check` does, then plays the game from its start with a [policy](#policy), a function that looks at the screen and picks the next command, for `--turns` [turns](/reference/state) (default 7). In a game that sleeps, a turn is a day, so seven turns of Small Town is a week. It writes two files:

- **the transcript**, to `--out` (default `playtest.txt`): every screen as the player would read it, with the command taken on it under it;
- **the numbers**, to `<out>.metrics`: one row a turn with each of the player's [declared stats](/reference/stats) as the turn ended, then how many [entities](/reference/entities) there were of each kind, how many scenes were entered and how many commands were refused.

Then it prints the numbers, and each refused command with its turn and its reason, as `turn 3: refused {…}: <reason>`. Folders in `--out` are made for you. It exits with `1` if any command was refused, so CI fails on a button the game offered and then wouldn't do, and with `0` otherwise. `--turns` takes a whole number, 1 or more; anything else is refused with `--turns takes a whole number of turns, 1 or more.` and exits with `1` before playing.

```
turn	coins	energy	charm	character	scenes	refused
1	12	80	1	2	0	0
2	21	55	2	2	2	0
3	34	55	3	2	2	0
...
7	16	85	7	2	2	0
```

A screen in the transcript is what [`screenText`](#screentext) writes, and the command is the JSON the policy returned:

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

`[>]` is a button the player can press, `[ ]` one greyed out with its reason after the dash, and `->` a way out. The price of a button is in brackets after it. A person's buttons carry their name, `Sam: Talk`, because every person's would otherwise read **Talk**. `character` in the numbers is the [cast](/plugins/cast)'s kind: Small Town has two characters, and the friendship declared on them is a stat of that kind, so it is not a column.

**How to use it.** Run it before and after a change to pacing — a price, a reward, a door's hours, a gate — and read both transcripts. The metrics say *when* things happened: the turn the coins stopped climbing, the turn a scene first opened. Only the transcript says whether a week of it is worth reading: a line that prints on every screen, a scene dealt the same variant five days running, a gate meant for the second week that is open on day two. None of those is a wrong value, which is why no test finds them. Small Town's weekly rent is there because its first playtest showed the coins only ever climbing.

### What playtest reads

As for [`check`](#what-the-module-exports), plus two exports `playtest` reads if they are there:

- **`start`** — the state to start from, or a function that takes the game and returns it. Without it, [`startingState(game)`](/reference/commands#startingstate).
- **`policy`** — a [`Policy`](#policy). Without it, [`explorer()`](#explorer).

```ts
// src/game.ts
export const start = (game: Game) => startingState(game, { flags: { playerName: 'Robin' } })
```

**Gotchas.**

- **The explorer is curious, not clever.** It knows nothing about your game, so it shows what a player poking at every button meets, not a route through the story. A scene it can only reach by choosing well needs a policy of your own.
- **One row a turn played.** A run of `--turns 7` that plays them all through has seven rows, each taken as that turn ended. A run that stops early — the policy gives up, the step limit, a refusal loop — ends with a row for the turn it stopped in, which may have only just begun.
- **A turn ends only when the game ends one.** The count moves on with a [`turn`](/reference/effects#turn) effect, which the [calendar](/plugins/calendar#what-a-turn-is) applies as time passes and when the player goes to bed. In a game that ends none, the run never reaches its turns and stops at the policy or the step limit.
- **A policy that keeps getting refused stops the run.** When the same command is refused on two steps running, with nothing between them, the play ends there rather than loop to the step limit. The same command refused twice with other steps between is not a loop, and the run goes on; both refusals are still listed, and the exit code is still `1`.

## ifloom snapshot

```sh
ifloom snapshot                    # snapshots/scenes.txt: write it, or compare with it
ifloom snapshot --update           # write it again, after a change you meant
ifloom snapshot --out other.txt
```

Loads the module as `check` does, renders every scene and every place's body in every probe state with [`snapshot`](#snapshot), and:

- **the first time**, when `--out` (default `snapshots/scenes.txt`) does not exist, writes it;
- **after that**, compares with it, render by render. Each render is matched by its `===` header, so a scene whose body runs to several paragraphs is reported once, by its own name. If nothing differs it says `Every scene reads as it did.` If something does, it prints `changed: <scene> @ <probe>` for each render that is new or reads differently, and `changed: <scene> @ <probe> (gone)` for each that is in the file but no longer rendered — a scene removed, renamed or a probe dropped — and exits with `1`;
- **with `--update`**, writes the file again whatever is in it.

```
changed: ava.hi @ a-week-in
changed: place:flat @ first-morning
changed: sam.hi @ moving-day (gone)
3 scene renders changed. If you meant it, run again with --update.
```

Commit the file. A difference is one of two things: a bug, or a change you meant. Read the diff before you run `--update` — it says which scene, in which state, now reads differently, which is exactly what a change to a condition or a prose key does without anyone noticing. Small Town's tests compare its snapshot on every run, so a change to how any scene reads fails them until the file is updated.

### What snapshot reads

As for [`check`](#what-the-module-exports), plus `probes` if it is there: a function that takes the game and returns a list of [`Probe`](#probe)s, `{ name, state }`. Without it, the one probe is `start`, the [`start`](#what-playtest-reads) state `playtest` uses.

Pick probes that differ in what the content looks at: the first screen, an ordinary day, and a state well along, with variables set, a friendship grown and scenes seen. Small Town's three are `moving-day`, `first-morning` and `a-week-in`:

```ts
// src/game.ts
export function probes(game: Game) {
  // `clock` is the game's calendar(...): its write puts the calendar's clock somewhere.
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
        // Ava's friendship, a stat of the cast's `character` kind, kept on her entity.
        entities: { ...first.entities, character: { ...first.entities.character, ava: { ...first.entities.character.ava, stats: { friendship: 30 } } } },
      },
    },
  ]
}
```

**Gotchas.**

- **Each scene is rendered as if it were open in the probe's state**, wherever the probe's player stands. A scene that only makes sense in one place renders in all of them; that is the point — it shows what its conditions do — but read it knowing that.
- **A probe is a state you wrote by hand.** Nothing checks that a game could reach it: set the calendar's clock and `turn` so they agree. Build it from the start state, as above, so it stays a whole state when the game adds a field.

## The Vite preset

```ts
function ifloom(options?: IfloomViteOptions): UserConfig

type IfloomViteOptions = {
  singleFile?: boolean
  vite?: UserConfig
}
```

The Vite config every IFLoom game builds with, from `@ifloom/cli/vite`:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { ifloom } from '@ifloom/cli/vite'

export default defineConfig(ifloom())
```

It sets:

- **React** (`@vitejs/plugin-react`) and **Tailwind CSS** (`@tailwindcss/vite`), which the [base UI](/ui/) needs;
- **one file**: `vite-plugin-singlefile` puts the script and the stylesheet inside `index.html`;
- **`base: './'`**, so every path is relative and the folder opens from disk or from an itch.io subpath.

| Option | What it does | Default |
|---|---|---|
| `singleFile` | Put the script and stylesheet inside `index.html`. `false` leaves them as files beside it. | `true` |
| `vite` | Any other Vite config, merged under the preset. Its `plugins` are added after the preset's. | `{}` |

```ts
export default defineConfig(
  ifloom({ vite: { server: { port: 5180 }, plugins: [myPlugin()] } }),
)
```

**Gotchas.**

- **`ifloom` does not apply the preset itself.** `dev`, `build` and `check` read the game's `vite.config.ts`. A game with no config gets plain Vite, with no React and no inlining.
- **The preset's `base` always wins.** A `base` in `vite` is overwritten with `'./'`.
- **`--out` wins over `build.outDir`.** `ifloom build` always passes an output folder, `dist` if you give none, so an `outDir` in the config is ignored. Use `--out`.
- **`singleFile: false` will not open from disk.** The script and stylesheet are then loaded from files beside the page, which a browser refuses on a `file://` address (see [Shipping a game](/guide/shipping#why-a-folder-that-opens-from-disk-is-hard)). Such a folder works served over the web, as itch.io does, but `ifloom build`'s check reports its module script, so the build exits non-zero.

## For scripts

The parts the commands are made from, from `@ifloom/cli`, for a build script or a test that wants them without the command line.

```ts
import { checkBuild, buildFiles, inlineAssets, checkGame, gameFrom, playtest, explorer, snapshot } from '@ifloom/cli'
```

### checkBuild

```ts
function checkBuild(dir: string): string[]
```

What is wrong with a built folder as a game that opens from disk; an empty list when nothing is. It reads `dir/index.html` and reports each `<script src>` and each stylesheet `<link>` that is a full address (`https://…`, `//…`) or starts with `/`, and each module script loaded from a file beside the page, which a browser refuses from disk (`index.html loads the module script …, which won't load from disk; build as one file`). With no `index.html`, the one problem is `no index.html in <dir>`.

```ts
checkBuild('dist') // []
checkBuild('dist') // ['index.html loads /assets/index.js, which is not beside it']
```

Only stylesheets among the `<link>`s count: an icon at `/favicon.ico` is not reported, though it won't show from disk either.

### buildFiles

```ts
function buildFiles(dir: string, at?: string): { file: string; bytes: number }[]
```

Every file under a folder, in its subfolders too, with its size in bytes, largest first. `file` is the path inside `dir`. `at` starts the walk from a subfolder of `dir` (the whole folder if left out); the paths are still inside `dir`.

```ts
buildFiles('dist') // [{ file: 'index.html', bytes: 434640 }, { file: 'art/place/cafe.jpg', bytes: 81200 }]
```

### inlineAssets

```ts
function inlineAssets(dir: string, folder?: string): { files: number; bytes: number }
```

What `ifloom build --inline-assets` runs on the built folder `dir`. Every file under `dir/<folder>` (default `art`), in its subfolders too, goes into `dir/index.html` as a `data:` URL, in one `<script>` put at the top of `<head>` that sets `window.__ifloomAssets` to `{ "art/place/cafe.jpg": "data:image/jpeg;base64,…" }`. Then the folder is removed. It returns how many files went in and the size of the page now, in bytes.

The type in each URL comes from the extension: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif`, `.svg`, `.mp3`, `.ogg`, `.webm` and `.mp4`; anything else is `application/octet-stream`. The script goes before every other script, so the map is there when the game first draws, and the base UI's [`assetUrl`](/ui/components#asseturl) reads it.

```ts
import { checkBuild, inlineAssets } from '@ifloom/cli'

inlineAssets('dist') // { files: 4, bytes: 451164 }
checkBuild('dist')   // []
```

**Gotchas.**

- **The map's keys are the paths the game uses**, `art/…`, as [`artSrc`](/reference/prose#artsrc) writes them. With another `folder` they start with that folder's name instead.
- **No folder, no change but the script.** With no `art/`, the page still gets an empty map and nothing is removed.
- **A second run changes nothing.** On a folder already inlined there is no `art/` left, so the page is left as it is and the result says `files: 0`.

### checkGame

```ts
function checkGame(module: Record<string, unknown>): string[]
```

Everything wrong with the game a module exports: the problems it came with, then [`validatePack`](/reference/game#validatepack)'s. What `ifloom check` prints. The module is read as in [What the module exports](#what-the-module-exports).

```ts
import * as module from '../src/game.ts'

expect(checkGame(module)).toEqual([])
```

In a test, this is `ifloom check` without the command line: Small Town's own test does exactly this.

### gameFrom

```ts
function gameFrom(module: Record<string, unknown>): { game: Game; problems: string[] }
```

The game a module exports, and the problems it came with turned into text. Throws when the module has neither a `default` nor a `game` export.

```ts
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

What `ifloom playtest` runs: plays `game` from `start`, asking `policy` (default [`explorer()`](#explorer)) for each command and running it with [`apply`](/reference/commands#apply). It stops at the first of:

- `turns` turns passed since `start`'s turn;
- the policy returning `null`;
- `steps` commands, refused ones included — a guard against a policy going round in circles;
- the same command refused on two steps running.

```ts
import { explorer, metricsText, playtest } from '@ifloom/cli'
import { smallTown, start } from '../src/game.ts'

const { game } = smallTown()
const result = playtest(game, start(game), explorer(), { turns: 7 })
expect(result.refusals).toEqual([])
expect(result.turns[6].stats.coins).toBeLessThan(result.turns[5].stats.coins) // Sunday's rent
```

**Gotcha.** A refused command still counts as a step and leaves the state as it was, so a policy that ignores refusals and asks for something else each time runs to the step limit on the same screen. The `refusals` list says so.

### Playtest

```ts
type Playtest = {
  transcript: string
  turns: TurnMetrics[]
  refusals: { turn: number; command: Command; reason: string }[]
  state: GameState
}
```

What [`playtest`](#playtest) returns. `transcript` is every screen through [`screenText`](#screentext), each followed by `> ` and the command as JSON, and `  refused: <reason>` when it was refused, separated by blank lines. `refusals` lists each refused command with its turn (counted from 1) and the engine's reason; each one is a bug in the policy or in the game. `state` is where it stopped.

### TurnMetrics

```ts
type TurnMetrics = { turn: number; stats: Record<string, number>; scenes: string[]; refused: number }
```

One turn's numbers, taken as the turn ended. `turn` counts from 1. `stats` has each of the player's [declared stats](/reference/stats), at its `start` if the state has none, then each declared [kind](/reference/entities), by its id, with how many entities of it there were. A stat declared `of` a kind is not in it. `scenes` is the id of every scene entered that turn, in order — a scene entered twice is there twice. `refused` is the number of commands refused that turn.

There is one entry for each turn played through. A run that stopped before its `turns` were up — the policy returned `null`, the step limit, a refusal loop — has one more, last, for the turn it stopped in, which may have only just begun.

### Policy

```ts
type Policy = (screen: View, state: GameState, game: Game) => Command | null
```

How a playtest picks the next command: from the [`View`](/reference/view#view) on screen, the state behind it and the game. `null` stops the play. A policy may keep its own memory in a closure, as `explorer` does.

```ts
// Work every weekday morning, and otherwise do what the explorer would.
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

**Gotcha.** Pick from what the screen offers, and check `disabled`, rather than building commands from ids you know. A command the screen does not offer is refused, and the same command refused on two steps running ends the run.

### explorer

```ts
function explorer(): Policy
```

The default policy: a curious player who knows nothing about the game. Each call returns a new one with its own memory. On each screen, it takes the first of:

1. **In a scene**, a choice it has not made yet in this playtest, so a scene it comes back to takes another branch; with every choice made, the first one open. A choice greyed out or carrying a `warning` is never open. With none open, `leave`.
2. **At bedtime**, bed: an action here whose command is the [calendar](/plugins/calendar#commands)'s `sleep` (`{ type: 'custom', name: 'calendar/sleep' }`), or the first step on the shortest walk to a place that has one. Bedtime is when the calendar's [`calendar/bedtime`](/plugins/calendar#queries) query says so — by default the evening, night and late periods — asked by name with [`pluginQuery`](/reference/plugins), so a game with no calendar never goes to bed.
3. **Someone to talk to** — a person's button in the [cast](/plugins/cast#the-view)'s view, `view.plugins.cast.present`, read by its shape — then **something to do** — an action sending any command but bed, or an activity whose own effects do something besides pass time (`calendar/pass`) — each once a turn. Something to do never ends the turn: those buttons wait for the last step.
4. **The first step toward the nearest place** it hasn't been this turn.
5. **Ending the turn**: an action that ends the turn; else one not done this turn, or else the first one there is. An activity that only passes time is waiting, and waits here.

It tells which buttons end the turn by trying each: it runs the button's command on the state as it is with [`apply`](/reference/commands#apply) and sees whether `turn` went up. `apply` is deterministic and the state carries its seed, so the try is exactly what pressing it would do, and nothing about the game has to be known. So in a game with no calendar, it does everything else there is to do before the button that moves the week on.

Where the player is, the map and the exits come from the [places](/plugins/places) plugin, asked by name: its `places/here` and `places/all` [queries](/plugins/places#queries), and the exits in its [view](/plugins/places#the-view), each taken by sending the exit's own `command`. In a game without the plugin, the explorer never walks; in a game without the cast, it has nobody to talk to.

It never presses a button with a [`warning`](/reference/view) — such as the calendar's `That would run past dawn.` With nothing to press at all it returns `null`, and the play stops.

So in Small Town it unpacks, sleeps, talks to Sam and Ava, buys a coffee and a scarf, works and jogs, and walks home to bed every night — what a player trying every button meets, not a route through the story.

In The Corner Café, with no map, no people and no clock, every turn is the same few buttons. Each week it buys the staff lunch, gets better ingredients for the soup while it can, puts a card in the window while there is room and hires the first applicant, and only then counts the till and ends the week:

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

It takes on Dev, then Fen, then turns the next applicant away (one branch of the interview each time it comes back), and from the fifth week, with the kitchen full and the soup as good as it gets, it buys lunch and ends the week while the till only climbs: the kind of curve the numbers are there to show.

**Gotchas.**

- **"Once a turn" is per action id and per person, not per place:** a `wait` done on the high street counts as done in the café too. That memory starts again each turn; the choices made in scenes are remembered for the whole playtest.
- **Trying a button runs it.** Each action's command is applied once to see whether it ends the turn, so a game's [custom functions](/reference/custom) run for buttons that are never pressed. A custom function that only reads the state and returns, as [`apply`](/reference/commands#apply) expects, never notices; one that logs or counts its calls outside the state sees the extra runs.
- **It presses only what is on the screen's buttons:** choices, actions, people and exits. It never uses an item, opens a device or answers a message; in Small Town it buys a sandwich most days and never eats one. Write a policy for what it does not reach.

### screenText

```ts
function screenText(screen: View): string
```

A screen as plain text, as the transcript shows it: a line, `== Turn N · <when>`, with the turn (counted from 1) and [`view.when`](/reference/view#the-clock-and-the-player), in the plugins' words (the calendar's `Day 2 · Tuesday morning`, then the [places](/plugins/places#the-label) plugin's place, `High Street`; left out when no plugin says); `#` and the scene's title; its body; then every button — the scene's choices, the place's actions and each present person's (the [cast](/plugins/cast#the-view)'s `present`), labelled `<Name>: <label>` — as `[>]` or `[ ]`, with its price in brackets — the stats' text, then the plugins' [notes](/reference/view#price), such as the calendar's `until afternoon` — and, when greyed out, `— ` and the reason; then each exit in the places plugin's [view](/plugins/places#the-view) as `->`, with its reason if it is closed.

```ts
screenText(view(state, game)).split('\n')[0] // '== Turn 2 · Day 2 · Tuesday morning · High Street'
```

### metricsText

```ts
function metricsText(turns: TurnMetrics[]): string
```

The turns as a tab-separated table: a header of `turn`, each key of the first turn's `stats` (the player's stat ids, then the kinds' ids), `scenes` and `refused`, then a row a turn with the number of scenes entered. What `ifloom playtest` writes to `<out>.metrics` and prints. It pastes straight into a spreadsheet.

### snapshot

```ts
function snapshot(game: Game, probes: Probe[]): string
```

What `ifloom snapshot` writes: every scene and every place rendered in every probe, as text. Scenes come first, sorted by id, then places, sorted by id; within each, the probes in the order given. Each is a block:

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

A scene's block is its body, then each visible choice as `[>]`, or `[ ]` with `— ` and the reason it is greyed out. Data scenes and hand-written ones both render, through [`sceneById`](/reference/game#scenebyid), with the probe's state and `sceneId` set to the scene. A scene that throws is recorded as `!! threw: <message>` instead of stopping the run. The places are the ones the [places](/plugins/places) plugin's `places/all` [query](/plugins/places#queries) answers, asked by name with [`pluginQuery`](/reference/plugins#pluginquery); a game without the plugin has none. A place's block is `place:<id>` and its body, rendered with `sceneId` cleared and the player moved there by the plugin's own [`places/move`](/plugins/places#effects) effect.

Draws are from the save's seed, so the same game and the same probes give the same text every time. Compare it in a test, as Small Town does:

```ts
import { readFileSync } from 'node:fs'
import { snapshot } from '@ifloom/cli'
import { probes, smallTown } from '../src/game.ts'

it('every scene and place reads as it did', () => {
  const { game } = smallTown()
  expect(snapshot(game, probes(game))).toBe(readFileSync(new URL('../snapshots/scenes.txt', import.meta.url), 'utf8'))
})
```

**Gotchas.**

- **Hidden choices are left out.** A choice whose `when` fails is not in the block; one greyed out by `blocked` is, with its reason.
- **A place's variants are drawn from the turn alone.** A room has no choices to record a draw, so the probe's seed and `turn` pick the line, the same each run. Set `turn` in a probe along with the calendar's clock, or a probe dated a week in draws as if it were the first turn.

### Probe

```ts
type Probe = { name: string; state: GameState }
```

A state to render every scene in. `name` goes in each block's head, `=== <scene> @ <name>`, so keep it short and without spaces.
