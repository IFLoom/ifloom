---
title: "@ifloom/cli"
description: "Every export of @ifloom/cli, the command line's parts for scripts: its signature and its fields."
---
Generated from the source of `@ifloom/cli` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`buildFiles`](#buildfiles), [`checkBuild`](#checkbuild), [`checkFiles`](#checkfiles), [`checkGame`](#checkgame), [`defineGame`](#definegame), [`explorer`](#explorer), [`gameFrom`](#gamefrom), [`inlineAssets`](#inlineassets), [`metricsText`](#metricstext), [`newGame`](#newgame), [`playtest`](#playtest-1), [`probe`](#probe-1), [`screenText`](#screentext), [`snapshot`](#snapshot)
- Constants: [`TEMPLATES`](#templates), [`THEMES`](#themes)
- Types: [`BuildOptions`](#buildoptions), [`GameModule`](#gamemodule), [`GameModuleDef`](#gamemoduledef), [`NewGameOptions`](#newgameoptions), [`Playtest`](#playtest), [`PlaytestOptions`](#playtestoptions), [`Policy`](#policy), [`Probe`](#probe), [`ProbeStep`](#probestep), [`TemplateName`](#templatename), [`ThemeName`](#themename), [`TurnMetrics`](#turnmetrics)

## buildFiles

Function. Explained in [The CLI](/docs/cli#buildfiles).

Returns every file in a built folder with its size in bytes, largest first. `at` names a subfolder to list instead.

```ts shape
import { buildFiles } from '@ifloom/cli'
function buildFiles(dir: string, at?: string): { file: string; bytes: number }[]
```

## BuildOptions

Type. Explained in [The CLI](/docs/cli#gamemoduledef-buildoptions-and-gamemodule).

The options a game module's `build` receives. They name the packs to load over the content, such as the locked
content a player's codes opened.

```ts shape
import type { BuildOptions } from '@ifloom/cli'
type BuildOptions = {
  unlocked: Pack[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocked` | [`Pack[]`](/docs/api/engine#pack) |  |  | The packs to pass to `loadGame` as `{ packs }`. `ifloom check` passes the game's `src/unlocks/` packs, and it's empty otherwise. |

## checkBuild

Function. Explained in [The CLI](/docs/cli#checkbuild).

Returns a line for each reason a built folder won't open from disk, or an empty list when it will. Its `index.html`
must load files only from beside it, with no module script.

Given the files the game names (`checkGame(game).files`), it also reports each one that isn't in the folder, or in
the page after `--inline-assets`.

It doesn't look for `fetch` in the built file, since a bundled library can name it without calling it. The engine's
and the UI's contract tests check their source never fetches at runtime instead.

```ts shape
import { checkBuild } from '@ifloom/cli'
function checkBuild(dir: string, files?: readonly FileRef[]): string[]
```

Uses: [`FileRef`](/docs/api/engine#fileref).

## checkFiles

Function. Explained in [The CLI](/docs/cli#checkfiles).

Returns a line for each file in `files` that isn't in `dir`, as `<where>: no file <dir>/<path>`. An empty list means
every file is there.

The files are the content checker's (`checkGame(game).files`), with their paths as the page requests them, so `dir`
is `public/` before a build and `dist/` after one. Paths in `inlined` are inside the page after `--inline-assets`,
and count as there.

```ts shape
import { checkFiles } from '@ifloom/cli'
function checkFiles(files: readonly FileRef[], dir: string, inlined?: ReadonlySet<string>): string[]
```

Uses: [`FileRef`](/docs/api/engine#fileref).

## checkGame

Function. Explained in [The CLI](/docs/cli#checkgame).

Returns a line for each problem with a game module's game, the loader's problems first. Given the game's public
folder, it adds each sound, picture and video file that isn't in it.

```ts shape
import { checkGame } from '@ifloom/cli'
function checkGame(module: Record<string, unknown>, publicDir?: string): string[]
```

## defineGame

Function. Explained in [The CLI](/docs/cli#definegame).

Returns the game module for a definition, the default export of `src/game.ts`. It throws when `build` is missing.

`ifloom check`, `playtest`, `snapshot`, `words` and `build` read the game module, and the page builds the game from
it with `game.build()`.

    export default defineGame({
      build: ({ unlocked }) => loadGame(content, { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
    })

```ts shape
import { defineGame } from '@ifloom/cli'
function defineGame(def: GameModuleDef): GameModule
```

Uses: [`GameModuleDef`](#gamemoduledef), [`GameModule`](#gamemodule).

## explorer

Function. Explained in [The CLI](/docs/cli#explorer).

Returns a policy that explores the game as a curious player would, rather than following a route through the story.
It never chooses a choice or action that carries a warning.

In a scene it chooses a choice it hasn't chosen yet. Otherwise, at the calendar's bedtime it goes to bed, walking
home if it must. Failing that it talks to someone and does something, each once a turn, leaving an action that ends
the turn till last. Then it walks to the nearest location it hasn't visited this turn, waits for a running timer with
a `tick`, and at last ends the turn.

```ts shape
import { explorer } from '@ifloom/cli'
function explorer(): Policy
```

Uses: [`Policy`](#policy).

## gameFrom

Function. Explained in [The CLI](/docs/cli#gamefrom).

Returns the game a game module builds, with its problems and warnings as sentences and the files its content names.
It throws when the module's default export isn't made with `defineGame`.

The problems are the loader's and the warnings the content checker's, each worded by `describeProblem`. `unlocked`
packs go to the module's `build` as `{ unlocked }`.

```ts shape
import { gameFrom } from '@ifloom/cli'
function gameFrom(module: Record<string, unknown>, unlocked?: Pack[]): { game: Game; problems: string[]; warnings: string[]; files: FileRef[] }
```

Uses: [`Pack`](/docs/api/engine#pack), [`Game`](/docs/api/engine#game), [`FileRef`](/docs/api/engine#fileref).

## GameModule

Type. Explained in [The CLI](/docs/cli#gamemoduledef-buildoptions-and-gamemodule).

The game module `defineGame` returns, the default export of `src/game.ts`. Its `build` takes its options as optional, so a page calls `game.build()`.

```ts shape
import type { GameModule } from '@ifloom/cli'
type GameModule = {
  start?: (game: Game) => GameState
  probes?: (game: Game) => Probe[]
  policy?: Policy
  build: (options?: Partial<BuildOptions>) => { game: Game; problems: Problem[] }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `start` | `(game:` [`Game`](/docs/api/engine#game)`) =>` [`GameState`](/docs/api/engine#gamestate) | yes |  | The function that returns the state `ifloom playtest` starts from, and `ifloom snapshot` when there are no probes. `startingState(game)` if left out. |
| `probes` | `(game:` [`Game`](/docs/api/engine#game)`) =>` [`Probe[]`](/docs/api/engine#probe) | yes |  | The function that returns the states `ifloom snapshot` renders every scene and location in, each made with `probe`. The start only if left out. |
| `policy` | [`Policy`](#policy) | yes |  | The policy that chooses each command `ifloom playtest` sends. The CLI's `explorer()` if left out. |
| `build` | `(options?: Partial<`[`BuildOptions`](#buildoptions)`>) => { game:` [`Game`](/docs/api/engine#game)`; problems:` [`Problem[]`](/docs/api/engine#problem) `}` |  |  | Builds the game with the definition's `build`, and returns the game and the loader's problems. `unlocked` is empty unless given. |

## GameModuleDef

Type. Explained in [The CLI](/docs/cli#gamemoduledef-buildoptions-and-gamemodule).

The definition a game passes to `defineGame`. Only `build` is required.

```ts shape
import type { GameModuleDef } from '@ifloom/cli'
type GameModuleDef = {
  build: (options: BuildOptions) => { game: Game; problems: Problem[] }
  start?: (game: Game) => GameState
  probes?: (game: Game) => Probe[]
  policy?: Policy
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `build` | `(options:` [`BuildOptions`](#buildoptions)`) => { game:` [`Game`](/docs/api/engine#game)`; problems:` [`Problem[]`](/docs/api/engine#problem) `}` |  |  | The function that builds the game. It returns what `loadGame` returns, the `game` and its `problems`. |
| `start` | `(game:` [`Game`](/docs/api/engine#game)`) =>` [`GameState`](/docs/api/engine#gamestate) | yes |  | The function that returns the state `ifloom playtest` starts from, and `ifloom snapshot` when there are no probes. `startingState(game)` if left out. |
| `probes` | `(game:` [`Game`](/docs/api/engine#game)`) =>` [`Probe[]`](/docs/api/engine#probe) | yes |  | The function that returns the states `ifloom snapshot` renders every scene and location in, each made with `probe`. The start only if left out. |
| `policy` | [`Policy`](#policy) | yes |  | The policy that chooses each command `ifloom playtest` sends. The CLI's `explorer()` if left out. |

## inlineAssets

Function. Explained in [The CLI](/docs/cli#inlineassets).

Moves every file in a built folder's `art/` into its `index.html` as data URLs, except videos, and returns the
counts. It suits a small game, and a large one is better left as a folder.

Each file goes in under its path, and the React UI's `assetUrl` looks a path up there first. The engine's
`mediaType` says which files are videos, and those stay in `art/`, as sound in `audio/` does. The result gives the
number of files moved in, the page's size in bytes and the number of videos left beside it. `folder` names another
folder than `art`.

```ts shape
import { inlineAssets } from '@ifloom/cli'
function inlineAssets(dir: string, folder?: string): { files: number; bytes: number; videos: number }
```

## metricsText

Function. Explained in [The CLI](/docs/cli#metricstext).

Returns a playtest's turn numbers as a tab-separated table, with a header row and one row a turn.

```ts shape
import { metricsText } from '@ifloom/cli'
function metricsText(turns: TurnMetrics[]): string
```

Uses: [`TurnMetrics`](#turnmetrics).

## newGame

Function. Explained in [The CLI](/docs/cli#newgame).

Makes a new game from a template, and returns its folder, the files written there and the theme it chose. It installs
nothing.

It throws when the name can't be a package name, the template or theme doesn't exist, or the folder isn't empty.

```ts shape
import { newGame } from '@ifloom/cli'
function newGame(options: NewGameOptions): { dir: string; files: string[]; theme: ThemeName | null }
```

Uses: [`NewGameOptions`](#newgameoptions), [`ThemeName`](#themename).

## NewGameOptions

Type. Explained in [The CLI](/docs/cli#newgameoptions).

Settings for `newGame`. Only `name` is required.

```ts shape
import type { NewGameOptions } from '@ifloom/cli'
type NewGameOptions = {
  name: string
  template?: TemplateName
  into?: string
  theme?: ThemeName | 'none'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | The game's package name, such as `my-story`, which is also its folder's name. For the `plugin` template it's the plugin's package name, such as `ifloom-plugin-weather`. The plugin's id is the name without `ifloom-plugin-` or `plugin-` in front, so `weather`. |
| `template` | [`TemplateName`](#templatename) | yes |  | The template the game starts from. `react` if left out. |
| `into` | `string` | yes |  | The folder to make the game in. `games/<name>` in the IFLoom checkout if left out, else `<name>` in the current folder. |
| `theme` | [`ThemeName`](#themename) `\| 'none'` | yes |  | The React UI theme preset the game starts with. A `react` or `next` game gets one at random if left out, and a copied example keeps its own. `'none'` leaves the preset out, for the React UI's plain look. The `vanilla`, `vue` and `svelte` templates have no React UI and ignore it. |

## Playtest

Type. Explained in [The CLI](/docs/cli#playtest-1).

The result of a `playtest` run, with its transcript, each turn's numbers and the refusals.

```ts shape
import type { Playtest } from '@ifloom/cli'
type Playtest = {
  transcript: string
  turns: TurnMetrics[]
  refusals: { turn: number; command: Command; reason: string }[]
  state: GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `transcript` | `string` |  |  | The run's transcript as plain text, with each screen and the command sent from it. |
| `turns` | [`TurnMetrics[]`](#turnmetrics) |  |  | Each turn's numbers, in order. |
| `refusals` | `{ turn: number; command:` [`Command`](/docs/api/engine#command)`; reason: string }[]` |  |  | The policy's commands that the game refused, each with its turn and reason. Each one is a bug in the policy or the game. |
| `state` | [`GameState`](/docs/api/engine#gamestate) |  |  | The state the run ended on. |

## playtest

Function. Explained in [The CLI](/docs/cli#playtest).

Returns the result of playing from `start` with `policy`, the explorer by default. It stops when `turns` or `steps`
run out, the policy returns null, the game restarts or a screen keeps repeating.

The transcript writes each notice once, under the screen it first shows on.

```ts shape
import { playtest } from '@ifloom/cli'
function playtest(game: Game, start: GameState, policy?: Policy, options?: PlaytestOptions): Playtest
```

Uses: [`Game`](/docs/api/engine#game), [`GameState`](/docs/api/engine#gamestate), [`Policy`](#policy), [`PlaytestOptions`](#playtestoptions), [`Playtest`](#playtest).

## PlaytestOptions

Type. Explained in [The CLI](/docs/cli#playtestoptions).

Settings for `playtest`. Each is optional.

```ts shape
import type { PlaytestOptions } from '@ifloom/cli'
type PlaytestOptions = {
  turns?: number
  steps?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `turns` | `number` | yes |  | The number of turns the run plays before it stops. 7 if left out. |
| `steps` | `number` | yes |  | The most commands the run sends, whatever the turn, so a policy that goes round in circles still stops. 2000 if left out. |

## Policy

Type. Explained in [The CLI](/docs/cli#policy).

A function that chooses the next command for `playtest` from the view, the state and the game. It returns null to stop the run.

```ts shape
import type { Policy } from '@ifloom/cli'
type Policy = (screen: View, state: GameState, game: Game) => CommandRef | null
```

Uses: [`View`](/docs/api/engine#view), [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`CommandRef`](/docs/api/engine#commandref).

## Probe

Type. Explained in [The CLI](/docs/cli#probe-1).

A state the content checker renders every scene against, named for the problems it finds. Make one with `probe`, by playing.

```ts shape
import type { Probe } from '@ifloom/cli'
type Probe = {
  name: string
  state: GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | The probe's name, which the problems it finds carry, such as `'evening, after the café'`. |
| `state` | [`GameState`](/docs/api/engine#gamestate) |  |  | The state to render every scene against. |

## probe

Function. Explained in [The CLI](/docs/cli#probe).

Returns a probe made by playing each step in order, from the game's starting state or from `from`. It throws when
the game refuses a command, with the reason.

`from` is another probe or a state. An effect step is any effect content can write, a plugin's included, so a probe
never writes the state directly. A `{ play }` step sends the command with everything that follows a command.

    const morning = probe('first-morning', game, [{ play: { type: 'choose', id: 'unpack' } }, { play: calendar.sleep() }])
    probe('a-week-in', game, [{ turn: { by: 6 } }, { 'calendar/set': { period: 'afternoon' } }], morning)

```ts shape
import { probe } from '@ifloom/cli'
function probe(name: string, game: Game, steps: readonly ProbeStep[], from?: Probe | GameState): Probe
```

Uses: [`Game`](/docs/api/engine#game), [`ProbeStep`](#probestep), [`Probe`](/docs/api/engine#probe), [`GameState`](/docs/api/engine#gamestate).

## ProbeStep

Type. Explained in [The CLI](/docs/cli#probestep).

One step of a probe, either an effect or `{ play: command }`. The probe applies an effect as content's effects
apply, and sends a command as the player would.

```ts shape
import type { ProbeStep } from '@ifloom/cli'
type ProbeStep = Effect | { play: CommandRef }
```

Uses: [`Effect`](/docs/api/engine#effect), [`CommandRef`](/docs/api/engine#commandref).

## screenText

Function. Explained in [The CLI](/docs/cli#screentext).

Returns a view as plain text, as `ifloom playtest` writes it. The text has the turn, the time, the body, each choice
and action with its price or reason, and the inputs.

```ts shape
import { screenText } from '@ifloom/cli'
function screenText(screen: View): string
```

Uses: [`View`](/docs/api/engine#view).

## snapshot

Function. Explained in [The CLI](/docs/cli#snapshot).

Returns every scene and every location rendered as text in every probe state. It's what `ifloom snapshot` writes.

The text comes from the engine's `view`, so it reads as the screen does. Each scene shows its body and its choices,
and a choice that a lock or a plugin's guard refuses shows as disabled, with its reason. Locations come from the
places plugin's `places/all` query, and a game without it has none. Compared with the last run's file, the diff
names the scene and the probe that read differently.

```ts shape
import { snapshot } from '@ifloom/cli'
function snapshot(game: Game, probes: Probe[]): string
```

Uses: [`Game`](/docs/api/engine#game), [`Probe`](/docs/api/engine#probe).

## TemplateName

Type. Explained in [The CLI](/docs/cli#templatename-and-themename).

The name of a template in `TEMPLATES`.

```ts shape
import type { TemplateName } from '@ifloom/cli'
type TemplateName = (typeof TEMPLATES)[number]
```

## TEMPLATES

Const.

The templates `ifloom new` can start a game from. `novel`, `cafe` and `town` copy the examples, and `plugin` makes a plugin package.

```ts shape
import { TEMPLATES } from '@ifloom/cli'
const TEMPLATES: readonly ['react', 'vanilla', 'vue', 'svelte', 'next', 'novel', 'cafe', 'town', 'plugin']
```

## ThemeName

Type. Explained in [The CLI](/docs/cli#templatename-and-themename).

The name of a theme preset in `THEMES`.

```ts shape
import type { ThemeName } from '@ifloom/cli'
type ThemeName = (typeof THEMES)[number]
```

## THEMES

Const.

The names of the React UI's theme presets, each a stylesheet at `@ifloom/react/themes/<name>.css`.

```ts shape
import { THEMES } from '@ifloom/cli'
const THEMES: readonly ['paper', 'terminal', 'studio', 'storybook']
```

## TurnMetrics

Type. Explained in [The CLI](/docs/cli#turnmetrics).

One turn's numbers in a playtest, taken as the turn ended. They hold the player's stats and the number of entities of
each listed kind.

```ts shape
import type { TurnMetrics } from '@ifloom/cli'
type TurnMetrics = {
  turn: number
  stats: Record<string, number>
  scenes: string[]
  refused: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `turn` | `number` |  |  | The turn's number, counting from 1. |
| `stats` | `Record<string, number>` |  |  | The player's stats and, by kind id, the number of entities of each listed kind, as the turn ended. |
| `scenes` | `string[]` |  |  | The ids of the scenes the turn opened, in order. |
| `refused` | `number` |  |  | The number of the policy's commands the game refused during the turn. |
