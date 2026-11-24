---
title: "The CLI"
description: "The ifloom command's subcommands with their flags and exit codes, the game module they read and the Vite preset."
---
`@ifloom/cli` is the `ifloom` command, which makes a game, runs it while you write, builds it into a folder that opens from disk, and checks and plays it with nobody at the keyboard. It reads the game from its [game module](#the-game-module) and builds it with the [Vite preset](#the-vite-preset). [Create a game](/docs/0.1.0/how-to/create-a-game) starts one, [Ship your game](/docs/0.1.0/how-to/ship-your-game) builds it, and [Playtest and snapshot](/docs/0.1.0/how-to/playtest-and-snapshot) puts the checks in CI.

In the showcase: `examples/showcase/package.json`, whose scripts run each command, and `examples/showcase/src/game.ts`, its game module.

`npm create ifloom` runs `ifloom new`. Every other command runs from the game's folder, where the game lists `@ifloom/cli` as a dev dependency. Outside a game, `npx ifloom` runs the latest CLI from the `ifloom` package, which depends on `@ifloom/cli` and runs its command. `ifloom` or `ifloom help` prints every command with its flags and exits with `0`, and an unknown command prints the same and exits with `1`.

## Requirements

The `ifloom` command is compiled JavaScript and needs Node 20.19 or later, or 22.12 or later, as Vite does. Node 24 is recommended. Inside a clone of the IFLoom repository it runs the CLI's TypeScript source, which needs Node 22.18 or later (see [Work in the repository](/docs/0.1.0/how-to/work-in-the-repository)).

`@ifloom/cli` depends on Vite and `vite-plugin-singlefile`, and names no UI framework. A game lists its framework's Vite plugin as a dependency of its own and adds it in `vite.config.ts`. [Add IFLoom to an existing project](/docs/0.1.0/how-to/add-to-a-project) installs the CLI and its scripts.

`@ifloom/cli/game` imports only the engine, so a game's browser code type-checks with it. `@ifloom/cli` itself imports Node's modules, so a file that imports it needs `@types/node` and `"node"` in its `tsconfig.json`'s `types`, or a place outside the browser code's `include`.

## ifloom new

`ifloom new` makes a new game, or a plugin package, from a template in a folder named after it.

```sh
ifloom new <name> [--template <template>] [--theme paper|terminal|studio|storybook|none]
```

The name must be a valid npm package name, in lower-case letters, digits and dashes. The command refuses a folder that already exists and isn't empty, a template or theme that doesn't exist, and a missing name, and exits with `1`. It installs nothing, and prints the commands to run next. Inside a clone of the IFLoom repository it makes the game in `games/<name>`, as a workspace.

`--template` picks what to copy, `react` if left out:

- **`react`**: a two-scene game rendered with the [React UI](/docs/0.1.0/reference/react), opening on a title screen.
- **`vanilla`**: the same game rendered with plain DOM.
- **`vue`**: the same game rendered with Vue 3 components, with a `typecheck` script that runs `vue-tsc`.
- **`svelte`**: the same game rendered with Svelte 5 components, with a `typecheck` script that runs `svelte-check`.
- **`next`**: the same game in a Next.js app with the React UI. It builds with Next, so `dev` and `build` run Next and it can't make the single offline file (see [Build with Next](/docs/0.1.0/how-to/build-with-next)).
- **`novel`**, **`cafe`** and **`town`**: copies of the examples The Letter, The Corner Café and the showcase, without their tests, builds and recorded runs.
- **`plugin`**: a plugin package with its tests, to publish on npm (see [Write a plugin](/docs/0.1.0/how-to/write-a-plugin)). The plugin's id is the name without `ifloom-plugin-` or `plugin-` in front.

`--theme` picks the React UI's theme preset and writes it into `src/styles.css`. Left out, a `react` or `next` game gets one of the four at random and a copied example keeps its own. `none` leaves the preset out. The `vanilla`, `vue`, `svelte` and `plugin` templates ignore it. The command prints the theme it used.

Every game has the scripts `dev`, `build`, `check`, `playtest` and `typecheck`, and an `AGENTS.md` for a coding agent (see [Use a coding agent](/docs/0.1.0/how-to/use-a-coding-agent)). Its files follow [Organise your files](/docs/0.1.0/how-to/organise-your-files).

## ifloom dev

`ifloom dev` starts Vite's dev server with the game's `vite.config.ts`, prints its address, and runs until you stop it.

```sh
ifloom dev
```

It takes no flags and ignores any you pass. The server's port and settings go in the preset's `vite` option, such as `ifloom({ vite: { server: { port: 5180 } } })`. `import.meta.env.DEV` is `true` here, so a game adds the [debug plugin](/docs/0.1.0/reference/plugins/debug) when it's set. [Locked content](#locked-content) is encrypted into the page here too, and an unlock whose code isn't set is left out with a warning.

## ifloom build

`ifloom build` builds the game into a folder and checks that the folder opens from disk.

```sh
ifloom build [--out <dir>] [--inline-assets]
```

| Field | Meaning |
|---|---|
| `--out` | The folder to build into, `dist` if left out. The command empties it first, and it wins over any `build.outDir` in the config. |
| `--inline-assets` | Puts every picture in the folder's `art/` into `index.html` as a `data:` URL, and deletes the files. Videos stay in `art/` and sound stays in `audio/`, and the command says how many it left. |

The command runs `vite build` with the game's config, then prints the five largest files in the folder. It then checks the folder with [`checkBuild`](/docs/0.1.0/api/cli#checkbuild). The folder must have an `index.html`, and every script and stylesheet the page loads must sit beside it. When `src/game.ts` loads, every sound, picture and video file the game names must be in the folder, from the [content checker](/docs/0.1.0/reference/checks#fileref)'s list, and a picture already in the page counts as there. The command prints each problem and exits with `1` if there are any.

With `--inline-assets`, the React UI finds each picture in the page through [`assetUrl`](/docs/0.1.0/reference/react/components#asseturl). A component of your own that sets an `<img src>` or a CSS `url()` from a path must pass it through `assetUrl` too.

### Locked content

A game's locked content is the packs in `src/unlocks/`, one file per unlock of the [unlocks plugin](/docs/0.1.0/reference/plugins/unlocks), named after it (`src/unlocks/supporter.ts` for `supporter`). Each file's default export is a [pack](/docs/0.1.0/reference/content#pack) or a list of packs, and the packs must be data. `ifloom build` does three things with them:

1. It refuses any import of a file in `src/unlocks/` from the page, with `… is locked content (src/unlocks/), which the page must never import`.
2. It reads each unlock's code from `IFLOOM_UNLOCK_<UNLOCK>` in the environment or a `.env` file, checks it against the unlock's `hash`, and encrypts the packs under a key made from the code into a script in the page's head. A missing code, or one that doesn't match, stops the build.
3. It searches every built file for each code, and for each line of the locked packs' prose and titles that the rest of the game lacks. Each one it finds is a problem, and the command exits with `1`.

Vite gives the page only variables that start with `VITE_`, so an `IFLOOM_UNLOCK_` variable never reaches it. [Sell supporter content](/docs/0.1.0/how-to/sell-supporter-content) sets up the codes.

## The game module

The game module is the default export of `src/game.ts`, made with [`defineGame`](#definegame) from `@ifloom/cli/game`. `check`, `playtest`, `snapshot`, `words` and `unlock-hash` read the game from it, or from the module named on the command line. They load it with the CLI's own Vite and need no `vite.config.ts`, so they work the same in a game built with Next, webpack or esbuild. The page builds the game from the same module, so the CLI checks the game the player gets.

```ts
import { loadGame, startingState } from '@ifloom/engine'
import { defineGame, probe } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: ({ unlocked }) => loadGame([stats, opening], { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
  start: (game) => startingState(game, { kv: { playerName: 'Robin' } }),
  probes: (game) => [probe('start', game, []), probe('knocked', game, [{ play: { type: 'choose', id: 'knock' } }])],
})
```

A module whose default export isn't made with `defineGame` stops the command with this message, and the command exits with `1`:

```
The game module's default export isn't made with defineGame. Export the game with defineGame:

  import { loadGame } from '@ifloom/engine'
  import { defineGame } from '@ifloom/cli/game'

  export default defineGame({
    build: ({ unlocked }) => loadGame(content, { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
  })

See https://ifloom.dev/docs/reference/cli#the-game-module
```

### defineGame

`defineGame` returns the game module for a definition, with a `build` the page can call with no options. Its signature is in [`defineGame`](/docs/0.1.0/api/cli-game#definegame).

| Field | Meaning |
|---|---|
| `build` | The function that makes the game and returns what [`loadGame`](/docs/0.1.0/reference/content#loadgame) returns. Its `unlocked` holds the packs for `loadGame`'s `{ packs: unlocked }`, which `ifloom check` fills with the locked content and which is empty otherwise. |
| `start` | The state `ifloom playtest` starts from, and `ifloom snapshot`'s one probe when there are no `probes`. [`startingState(game)`](/docs/0.1.0/reference/commands#startingstate) if left out. |
| `probes` | The states `ifloom snapshot` renders every scene in, each made with [`probe`](#probe). |
| `policy` | The [`Policy`](#policy) that picks each command `ifloom playtest` plays. [`explorer()`](#explorer) if left out. |

`build` returns a game `loadGame` made, so the CLI prints the problems `loadGame` found and checks the game no second time. A game built more than one way, such as with the debug plugin in development, calls its own function from `build`. Every field is in [`GameModuleDef`](/docs/0.1.0/api/cli-game#gamemoduledef).

### GameModuleDef, BuildOptions and GameModule

`GameModuleDef` is what `defineGame` takes, `BuildOptions` is what its `build` is given, and `GameModule` is what it returns. Their fields are in [`GameModuleDef`](/docs/0.1.0/api/cli-game#gamemoduledef), [`BuildOptions`](/docs/0.1.0/api/cli-game#buildoptions) and [`GameModule`](/docs/0.1.0/api/cli-game#gamemodule).

### probe

`probe` returns a [`Probe`](#probe-1) made by playing from the game's starting state, or from `from`, another probe or a state. Its signature is in [`probe`](/docs/0.1.0/api/cli-game#probe-1).

Each step is a [`ProbeStep`](#probestep). An [effect](/docs/0.1.0/reference/effects) is applied whatever the locks say, and a plugin's effect works too. `{ play: command }` plays a [command](/docs/0.1.0/reference/commands) as the player would, with everything that follows a command, so a refused one is refused. A probe never writes the state's own shape, so it stays a whole state when the game or a plugin adds a field.

```ts
import { probe, type Probe } from '@ifloom/cli/game'
import type { Game } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export function probes(game: Game): Probe[] {
  const morning = probe('first-morning', game, [{ play: { type: 'choose', id: 'unpack' } }, { play: calendar.sleep() }])
  const later = probe('a-week-in', game, [{ turn: { by: 6 } }, { 'calendar/set': { period: 'afternoon' } }, { kv: 'catName', to: 'Biscuit' }], morning)
  return [probe('moving-day', game, []), morning, later]
}
```

A refused command throws with the probe's name and the reason, such as `probe first-morning: {"type":"choose","id":"unpack"} was refused: …`. Only a command adds the scene it leaves open to `seen`, so the `scene` effect opens a scene without counting it as seen. A `turn` effect runs the whole turn with every hook, as in play, and `calendar/set` alone ends no turn.

### ProbeStep

`ProbeStep` is one step of a probe, an effect to apply or `{ play }` with a command to play. It's in [`ProbeStep`](/docs/0.1.0/api/cli-game#probestep).

### Probe

`Probe` is a named state to render every scene in, the engine's [`Probe`](/docs/0.1.0/reference/checks#probe) re-exported. Its `name` goes in each block's header in the snapshot, `=== <scene> @ <name>`, so a short name without spaces reads best. It's in [`Probe`](/docs/0.1.0/api/cli-game#probe).

## ifloom check

`ifloom check` loads the game module and prints every problem with the game, one per line, then a count.

```sh
ifloom check [module]
```

It prints the problems the [content checker](/docs/0.1.0/reference/checks) found while `loadGame` ran, then the checker's warnings, each as `warning: …`. It also looks for every file the game names in `public/`. A track's `src` goes through [`audioSrc`](/docs/0.1.0/reference/audio#audiosrc), and a picture or video through [`artSrc`](/docs/0.1.0/reference/prose#artsrc), so `[[video:cafe/steam]]` must be at `public/art/cafe/steam.mp4`. A missing file is reported with where the game names it, such as `prose flat.knock: no file public/art/flat/kettle.mp4`.

It exits with `1` if there are any problems, and a warning doesn't change the exit code. With none, it prints `No problems.`

A game with [locked content](#locked-content) is checked with it, read from source so no code is needed, and passed to `build` as `unlocked`. The check reports a file in `src/unlocks/` that names no unlock, a code that's set but doesn't match its hash, and a `build` that leaves the packs out. An unlock whose code isn't set gets a note, not a problem. After the problems, the command lists what the game without its unlocks lacks, such as a scene only the locked packs have, since the game must reach each of those only behind `unlocks/has`.

## ifloom playtest

`ifloom playtest` plays the game from the module's `start` for some turns, with a [`Policy`](#policy) choosing each command, and writes what happened.

```sh
ifloom playtest [module] [--turns <n>] [--out <file>]
```

| Field | Meaning |
|---|---|
| `--turns` | The number of turns to play, a whole number of 1 or more. `7` if left out. Any other value exits with `1` before playing. |
| `--out` | The transcript's file, `playtest.txt` if left out. The command creates any folders in the path. |

The command writes two files. The transcript, in `--out`, holds every screen as [`screenText`](/docs/0.1.0/api/cli#screentext) writes it, with the command played on it underneath. The numbers, in `<out>.metrics`, hold one row per turn from [`metricsText`](/docs/0.1.0/api/cli#metricstext). It prints the numbers, then each refused command as `turn 3: refused {…}: <reason>`. It exits with `1` if any command was refused, and `0` otherwise.

In the transcript, `[>]` is a button the player can press, `[ ]` one that's greyed out with its reason after `— `, and `->` an exit. A button's price follows it in brackets. A character's buttons carry the character's name, as in `Sam: Talk`. A notice is written once, as `! <title>: <text>`, under the first screen it shows on.

The numbers have a column for each of the player's [stats](/docs/0.1.0/reference/stats), one for each [listed](/docs/0.1.0/reference/entities) kind with its count of entities, then `scenes` and `refused`. A run that stops before its turns are up ends with a row for the turn it stopped in.

The play stops at the first of these:

- The turns have passed since `start`'s turn.
- The policy returns `null`.
- The run has sent 2000 commands, refused ones included.
- The same command is refused on two steps in a row.
- The same screen and state come round with the same command three times in one turn, written as `going round in circles`.
- A [`newGame`](/docs/0.1.0/reference/commands#newgame) command starts the game over.

A turn ends only when the game ends one, with a [`turn`](/docs/0.1.0/reference/effects#turn) effect such as the calendar's. In a game that never ends a turn, the run stops at the policy or a limit instead.

### Policy

`Policy` is the function that picks each command a playtest plays, from the [view](/docs/0.1.0/reference/view) on screen, the state and the game. Returning `null` stops the play. It's in [`Policy`](/docs/0.1.0/api/cli-game#policy).

A policy keeps any memory of its own in a closure. A command the screen doesn't offer is refused, so a policy picks from the screen's choices and actions and checks `disabled`.

```ts
import { pluginQuery } from '@ifloom/engine'
import { explorer, type Policy } from '@ifloom/cli/game'

export function worker(): Policy {
  const curious = explorer()
  return (screen, state, game) => {
    const work = screen.actions.find((action) => action.id === 'work' && !action.disabled)
    const now = pluginQuery(game, 'calendar/now')?.(state)
    if (work && now?.period === 'morning') return work.command
    return curious(screen, state, game)
  }
}
```

### explorer

`explorer` returns the default policy, a curious player who knows nothing about the game. Each call returns a new explorer with its own memory. Its signature is in [`explorer`](/docs/0.1.0/api/cli-game#explorer).

On each screen it takes the first of these that applies:

1. **In a scene**, a choice it hasn't made in this playtest, then the first open choice once it has made them all, then `leave`. A greyed-out choice, or one with a `warning`, is never open.
2. **At bedtime**, the action whose command is the [calendar](/docs/0.1.0/reference/plugins/calendar)'s `calendar/sleep`, or the first step toward a location that has one. The `calendar/bedtime` query decides when it's bedtime.
3. **Someone to talk to**, from the [cast](/docs/0.1.0/reference/plugins/cast)'s `view.plugins.cast.present`, then **something to do**, each once a turn. Something to do never ends the turn.
4. **The first step toward the nearest location** it hasn't been to this turn.
5. **Ending the turn**, with an action that ends it, else an action not done this turn, else the first action there is.

The explorer tells which actions end the turn by running each one's command with [`apply`](/docs/0.1.0/reference/commands#apply) and checking whether `turn` went up. So the game's own [functions](/docs/0.1.0/reference/custom) run for actions it never takes. It asks the calendar, places and cast plugins by name with [`pluginQuery`](/docs/0.1.0/reference/plugin-queries#pluginquery), so in a game without places it never walks, and without the cast it has nobody to talk to. It never presses a button with a [`warning`](/docs/0.1.0/reference/view#renderedchoice), and it never uses a thing, opens a device, answers a message or types into an [input](/docs/0.1.0/reference/inputs). An input with no fallback therefore stops the run.

Its memory of what it has done this turn is per action id and per character, not per location, and it resets each turn. The choices it has made in scenes last for the whole playtest.

## ifloom snapshot

`ifloom snapshot` renders every scene and every location's room in every probe state, and compares the text with the last run.

```sh
ifloom snapshot [module] [--out <file>] [--update]
```

| Field | Meaning |
|---|---|
| `--out` | The snapshot file, `snapshots/scenes.txt` if left out. |
| `--update` | Writes the file again, whatever it holds. |

The probes are the module's `probes`, or one probe named `start` at the module's `start` state. The text is what [`snapshot`](/docs/0.1.0/api/cli#snapshot) returns, every render from the engine's [`view`](/docs/0.1.0/reference/view), headed `=== <scene> @ <probe>`. Scenes come first, sorted by id, then each location as `place:<id>`, from the places plugin's `places/all` query. A scene is rendered as if it were open in the probe's state, wherever the player stands, and a hidden choice is left out.

When the file doesn't exist, the command writes it and exits with `0`. When the file matches, it prints `Every scene reads as it did.` and exits with `0`. Otherwise it prints `changed: <scene> @ <probe>` for each render that's new or reads differently, and `changed: <scene> @ <probe> (gone)` for each that's no longer produced, then exits with `1`.

```
changed: ava.hi @ a-week-in
changed: place:flat @ first-morning
2 scene renders changed. If you meant it, run again with --update.
```

Every pick comes from the save's seed, so the same game and probes give the same text each run. A room has no choices to record a pick, so the engine draws a location's variants from the probe's seed and `turn`.

## ifloom words

`ifloom words` lists every field of the game a player reads, by its key in a translation's [words table](/docs/0.1.0/reference/words#words).

```sh
ifloom words [module] [--out <file>]
```

It builds the game with no unlocked packs and lists the fields [`translatableFields`](/docs/0.1.0/reference/words#translatablefields) returns. Each line is a key, its words as JSON and where the field is, then a count. With `--out`, it writes the fields to that file instead as a JSON object from each key to its words, creating any folders in the path. It exits with `0`.

```
scene.intro.title: "Moving day"  (scene intro)
action.wait.label: "Wait a while"  (action wait)
229 fields to translate.
```

A block with no `id` is keyed by a hash of its words, so the list must come from the game's own words. When `build` loads packs of its own, the command names them on stderr, since a translation among them puts its words in the list. [Translate your game](/docs/0.1.0/how-to/translate-your-game) turns the file into a translation.

## ifloom unlock-hash

`ifloom unlock-hash` prints the hash of an unlock's code for the unlock's `hash`, and never prints the code.

```sh
ifloom unlock-hash <unlock> [module]
```

It reads the code from `IFLOOM_UNLOCK_<UNLOCK>` in the environment or a `.env` file, or from standard input when that isn't set. The hash is salted with the game's id and the unlock's, so the command loads the game module. For an unlock the game already declares, it uses the unlock's `salt` and `iterations` and says whether the declared hash matches. It exits with `1` when the unlock isn't named or no code is given. The game needs `@ifloom/plugin-unlocks` among its dependencies. [`UnlockDef`](/docs/0.1.0/reference/plugins/unlocks#unlockdef) holds the hash.

## The Vite preset

`ifloom` from `@ifloom/cli/vite` returns the Vite config every IFLoom game builds with. Its signature is in [`ifloom`](/docs/0.1.0/api/cli-vite#ifloom).

```ts
import { ifloom } from '@ifloom/cli/vite'

export default ifloom()
```

The preset names no UI framework and sets three things:

- `vite-plugin-singlefile` puts the script and the stylesheet inside `index.html`.
- `base: './'` makes every path relative, so the folder opens from disk or from a subpath on a host.
- In a game with `src/unlocks/`, it refuses an import of those files from the page and encrypts them into the page's head (see [Locked content](#locked-content)).

Inside the IFLoom checkout, for a game whose folder is in it, the preset also reads the `@ifloom` packages' TypeScript source rather than their built files. `dev` and `build` read the game's `vite.config.ts`, and a game with none gets plain Vite with no inlining.

A game adds its framework's Vite plugin in `vite.plugins`. The `react` template adds React's and Tailwind's:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { ifloom } from '@ifloom/cli/vite'

export default ifloom({ vite: { plugins: [react(), tailwindcss()], resolve: { dedupe: ['react', 'react-dom'] } } })
```

### IfloomViteOptions

`IfloomViteOptions` is the settings for `ifloom()`. Every field is in [`IfloomViteOptions`](/docs/0.1.0/api/cli-vite#ifloomviteoptions).

| Field | Meaning |
|---|---|
| `singleFile` | Puts the script and stylesheet inside `index.html`. `true` if left out. With `false`, a browser refuses the module script from disk, so `ifloom build`'s check fails, though the folder works when served over the web. |
| `vite` | Any other Vite config, merged under the preset. `{}` if left out. Its `plugins` come before the single-file step, and its `base` is overwritten with `'./'`. |

## Functions

`@ifloom/cli` exports the parts the commands are made of, for a build script or a test that wants them without the command line. It also re-exports `defineGame`, `probe`, `explorer` and their types. Every signature and field is on the API pages for [`@ifloom/cli`](/docs/0.1.0/api/cli), [`@ifloom/cli/game`](/docs/0.1.0/api/cli-game) and [`@ifloom/cli/vite`](/docs/0.1.0/api/cli-vite), and [Test a route](/docs/0.1.0/how-to/test-a-route) calls them from a test.

### newGame

`newGame` makes the game `ifloom new` makes and returns its folder, its files and its theme, and throws where the command refuses. It takes [`NewGameOptions`](/docs/0.1.0/api/cli#newgameoptions), and [`TEMPLATES`](/docs/0.1.0/api/cli#templates) and [`THEMES`](/docs/0.1.0/api/cli#themes) list every [`TemplateName`](/docs/0.1.0/api/cli#templatename) and [`ThemeName`](/docs/0.1.0/api/cli#themename). Its signature is in [`newGame`](/docs/0.1.0/api/cli#newgame).

### checkBuild

`checkBuild` returns the problems `ifloom build` reports for a built folder, or an empty list. Its signature is in [`checkBuild`](/docs/0.1.0/api/cli#checkbuild).

### buildFiles

`buildFiles` returns every file under a folder with its size in bytes, largest first. Its signature is in [`buildFiles`](/docs/0.1.0/api/cli#buildfiles).

### inlineAssets

`inlineAssets` puts the pictures of a built folder into its `index.html`, as `--inline-assets` does, and returns how many went in. Its signature is in [`inlineAssets`](/docs/0.1.0/api/cli#inlineassets).

### checkGame

`checkGame` returns the problems `ifloom check` prints for a game module, as sentences. It isn't the engine's [`checkGame`](/docs/0.1.0/reference/checks#checkgame), which checks a game's content. Its signature is in [`checkGame`](/docs/0.1.0/api/cli#checkgame).

### checkFiles

`checkFiles` returns a problem for each file the game names that a folder lacks. Its signature is in [`checkFiles`](/docs/0.1.0/api/cli#checkfiles).

### gameFrom

`gameFrom` returns the game a game module builds, with its problems as sentences and the files it names. Its signature is in [`gameFrom`](/docs/0.1.0/api/cli#gamefrom).

### playtest and Playtest

`playtest` plays a game as `ifloom playtest` does and returns a [`Playtest`](/docs/0.1.0/api/cli#playtest), the transcript, a [`TurnMetrics`](/docs/0.1.0/api/cli#turnmetrics) per turn, the refusals and the final state. It takes [`PlaytestOptions`](/docs/0.1.0/api/cli#playtestoptions). Its signature is in [`playtest`](/docs/0.1.0/api/cli#playtest-1).

### screenText

`screenText` returns a screen as plain text, as the playtest's transcript shows it. Its signature is in [`screenText`](/docs/0.1.0/api/cli#screentext).

### metricsText

`metricsText` returns the turns' numbers as a tab-separated table, as `ifloom playtest` writes them. Its signature is in [`metricsText`](/docs/0.1.0/api/cli#metricstext).

### snapshot

`snapshot` returns the text `ifloom snapshot` writes, for a game and its probes. Its signature is in [`snapshot`](/docs/0.1.0/api/cli#snapshot).

## Caveats

- The explorer shows what a player who presses every button meets, and it finds no route through the story. A policy of your own reaches a scene that needs the right choices.
- A probe is only as real as its steps, since nothing checks that a player could reach it and effects skip the locks. End a probe's turns with the `turn` effect, so the calendar's day and the turn count agree and a location's variants are drawn for the right turn.
- `--inline-assets` writes each picture into the page a third larger than its file, and the page reads all of them before the game first renders. A game with megabytes of art ships better as a folder.
