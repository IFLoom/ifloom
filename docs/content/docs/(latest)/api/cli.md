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

Every file in a built folder, with its size, largest first.

```ts shape
import { buildFiles } from '@ifloom/cli'
function buildFiles(dir: string, at?: string): { file: string; bytes: number }[]
```

## BuildOptions

Type. Explained in [The CLI](/docs/cli#gamemoduledef-buildoptions-and-gamemodule).

What `build` is given: the packs to load over the content, such as the locked content a player's codes opened.

```ts shape
import type { BuildOptions } from '@ifloom/cli'
type BuildOptions = {
  unlocked: Pack[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocked` | `Pack[]` |  |  | Packs to pass to `loadGame` as `{ packs }`. `ifloom check` passes the game's `src/unlocks/` content here; empty otherwise. |

## checkBuild

Function. Explained in [The CLI](/docs/cli#checkbuild).

Check a built folder is a game that opens from disk: an `index.html`, and
nothing it loads from anywhere but beside it. Given the files the game names
(`checkGame(game).files`), also each one that isn't in the folder (or, for a
picture, in the page, after `--inline-assets`). Returns what is wrong.

That code never fetches at runtime is held by the engine's and UI's own
contract tests, on their source: a bundled library mentions `fetch` without
ever calling it here, so the built file can't be searched for it.

```ts shape
import { checkBuild } from '@ifloom/cli'
function checkBuild(dir: string, files?: readonly FileRef[]): string[]
```

## checkFiles

Function. Explained in [The CLI](/docs/cli#checkfiles).

Every file in `files` that isn't in `dir`, as `<where>: no file <dir>/<path>`.
The files are the content checker's (`checkGame(game).files`), with their
paths as the page asks for them, so `public/` before a build and `dist/`
after one. `inlined` lists files that are in the page itself, after
`--inline-assets`, which count as there.

```ts shape
import { checkFiles } from '@ifloom/cli'
function checkFiles(files: readonly FileRef[], dir: string, inlined?: ReadonlySet<string>): string[]
```

## checkGame

Function. Explained in [The CLI](/docs/cli#checkgame).

Everything wrong with a game: the engine's content checker's problems,
once, then, given the game's public folder, every sound, picture and video
file that isn't in it.

```ts shape
import { checkGame } from '@ifloom/cli'
function checkGame(module: Record<string, unknown>, publicDir?: string): string[]
```

## defineGame

Function. Explained in [The CLI](/docs/cli#definegame).

The game module `src/game.ts` exports as its default, for `ifloom check`,
`playtest`, `snapshot`, `words` and `build`:

    export default defineGame({
      build: ({ unlocked }) => loadGame(content, { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
    })

The page builds the game the same way, with `game.build()`.

```ts shape
import { defineGame } from '@ifloom/cli'
function defineGame(def: GameModuleDef): GameModule
```

## explorer

Function. Explained in [The CLI](/docs/cli#explorer).

A policy that explores: in a scene, a choice it has not made yet; at
bedtime (the calendar's), bed, walking home if it must; else someone to talk
to and something to do, each once a turn, leaving what ends the turn till
last; else the nearest place it hasn't been this turn; else, while a timer
runs, wait for it (a `tick`); else end the turn. It
never presses a button the game warns against. It knows nothing about any
game, so it shows what a curious player meets — not a route through the story.

```ts shape
import { explorer } from '@ifloom/cli'
function explorer(): Policy
```

## gameFrom

Function. Explained in [The CLI](/docs/cli#gamefrom).

The game a game module builds, with its loader's problems in
`describeProblem`'s words and the files it names. `unlocked` packs go to
its `build` as `{ unlocked }`.

```ts shape
import { gameFrom } from '@ifloom/cli'
function gameFrom(module: Record<string, unknown>, unlocked?: Pack[]): { game: Game; problems: string[]; warnings: string[]; files: FileRef[] }
```

## GameModule

Type. Explained in [The CLI](/docs/cli#gamemoduledef-buildoptions-and-gamemodule).

A game module, as `defineGame` returns it: `build` may be called with no options, as a page does.

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
| `start` | `(game: Game) => GameState` | yes |  | Where `ifloom playtest` starts, and `ifloom snapshot` when there are no probes. `startingState(game)` if left out. |
| `probes` | `(game: Game) => Probe[]` | yes |  | The states `ifloom snapshot` renders every scene and place in, each made with `probe`. Just the start if left out. |
| `policy` | `Policy` | yes |  | Picks each command `ifloom playtest` plays. The CLI's `explorer()` if left out. |
| `build` | `(options?: Partial<BuildOptions>) => { game: Game; problems: Problem[] }` |  |  | Builds the game, as the module's `build` does, with `unlocked` empty unless given: the game, and the loader's problems. |

## GameModuleDef

Type. Explained in [The CLI](/docs/cli#gamemoduledef-buildoptions-and-gamemodule).

What a game module says about the game, as written to `defineGame`.

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
| `build` | `(options: BuildOptions) => { game: Game; problems: Problem[] }` |  |  | Build the game: what `loadGame` returns, its `game` and its `problems`. |
| `start` | `(game: Game) => GameState` | yes |  | Where `ifloom playtest` starts, and `ifloom snapshot` when there are no probes. `startingState(game)` if left out. |
| `probes` | `(game: Game) => Probe[]` | yes |  | The states `ifloom snapshot` renders every scene and place in, each made with `probe`. Just the start if left out. |
| `policy` | `Policy` | yes |  | Picks each command `ifloom playtest` plays. The CLI's `explorer()` if left out. |

## inlineAssets

Function. Explained in [The CLI](/docs/cli#inlineassets).

Put every picture in a built folder's `art/` into its `index.html` as a data
URL, under its path, and remove it from the folder: one file with the art in
it. The React UI's pictures look a path up there first (`assetUrl`). Worth it
for a small game; a large one is better left as a folder. Sound in `audio/`
and videos (`.mp4`, `.webm`) are never put in: they are too big, and are
played from beside the page, so `art/` stays with only the videos in it.
Which files are videos is the engine's `mediaType`.
Returns how many files went in, how big the page is now, and how many videos
were left beside it.

```ts shape
import { inlineAssets } from '@ifloom/cli'
function inlineAssets(dir: string, folder?: string): { files: number; bytes: number; videos: number }
```

## metricsText

Function. Explained in [The CLI](/docs/cli#metricstext).

The turn-by-turn numbers as a table, one row a turn.

```ts shape
import { metricsText } from '@ifloom/cli'
function metricsText(turns: TurnMetrics[]): string
```

## newGame

Function. Explained in [The CLI](/docs/cli#newgame).

Make a new game. Returns its folder and the files written there. Installs nothing.

```ts shape
import { newGame } from '@ifloom/cli'
function newGame(options: NewGameOptions): { dir: string; files: string[]; theme: ThemeName | null }
```

## NewGameOptions

Type. Explained in [The CLI](/docs/cli#newgameoptions).

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
| `name` | `string` |  |  | The game's package name, which is also its folder's: `my-story`. For the `plugin` template it's the plugin's package name, such as `ifloom-plugin-weather`, and the plugin's id is the name without `ifloom-plugin-` or `plugin-` in front: `weather`. |
| `template` | `TemplateName` | yes |  | What to start from. `react` if left out. |
| `into` | `string` | yes |  | Where to put it. Left out, `games/<name>` in the IFLoom checkout, or a folder named `<name>` in the current folder anywhere else. |
| `theme` | `ThemeName \| 'none'` | yes |  | The React UI preset to start from. Left out, a `react` or `next` game gets one at random, so two new games don't start out looking alike, and a copied example keeps its own. `'none'` leaves the preset out, for the React UI's plain default look. The vanilla, vue and svelte templates have no React UI and ignore it. |

## Playtest

Type. Explained in [The CLI](/docs/cli#playtest-1).

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
| `transcript` | `string` |  |  | Every screen, and the command taken on it, as plain text. |
| `turns` | `TurnMetrics[]` |  |  | Each turn's numbers, in order. |
| `refusals` | `{ turn: number; command: Command; reason: string }[]` |  |  | Commands the policy chose that were refused, with why: each one a policy or game bug. |
| `state` | `GameState` |  |  | The state it ended on. |

## playtest

Function. Explained in [The CLI](/docs/cli#playtest).

Play from `start` with `policy` until the turns are up, the policy stops, the game starts over, it goes
round in circles, or the step limit is hit. Each notice raised along the way is written once, under the
screen it first shows on.

```ts shape
import { playtest } from '@ifloom/cli'
function playtest(game: Game, start: GameState, policy?: Policy, options?: PlaytestOptions): Playtest
```

## PlaytestOptions

Type. Explained in [The CLI](/docs/cli#playtestoptions).

```ts shape
import type { PlaytestOptions } from '@ifloom/cli'
type PlaytestOptions = {
  turns?: number
  steps?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `turns` | `number` | yes |  | Stop after this many turns have passed. 7 if left out. |
| `steps` | `number` | yes |  | Stop after this many commands, whatever the turn: a guard against a policy going round in circles. 2000 if left out. |

## Policy

Type. Explained in [The CLI](/docs/cli#policy).

Picks the next command from what is on screen, or null to stop.

```ts shape
import type { Policy } from '@ifloom/cli'
type Policy = (screen: View, state: GameState, game: Game) => CommandRef | null
```

## Probe

Type. Explained in [The CLI](/docs/cli#probe-1).

A state to render every scene against, named for the problems it finds.

```ts shape
import type { Probe } from '@ifloom/cli'
type Probe = {
  name: string
  state: GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | What the problems it finds are named by: `'evening, after the café'`. |
| `state` | `GameState` |  |  | The state to render every scene against. |

## probe

Function. Explained in [The CLI](/docs/cli#probe).

A probe state made by playing: each step in order, from the game's starting
state, or from `from` (another probe, or a state). An effect is any content
write, a plugin's included, so a probe never writes the state's own shape.
A command (`{ play }`) is played as the player would press it, with all
that follows a command, and must be allowed: a refused one throws, with why.

    const morning = probe('first-morning', game, [{ play: { type: 'choose', id: 'unpack' } }, { play: calendar.sleep() }])
    probe('a-week-in', game, [{ turn: { by: 6 } }, { 'calendar/set': { period: 'afternoon' } }], morning)

```ts shape
import { probe } from '@ifloom/cli'
function probe(name: string, game: Game, steps: readonly ProbeStep[], from?: Probe | GameState): Probe
```

## ProbeStep

Type. Explained in [The CLI](/docs/cli#probestep).

One step of a probe: an effect, applied as content applies it, or
`{ play: command }`, a command played as the player would press it.

```ts shape
import type { ProbeStep } from '@ifloom/cli'
type ProbeStep = Effect | { play: CommandRef }
```

## screenText

Function. Explained in [The CLI](/docs/cli#screentext).

A screen as plain text: where, when, the prose, every button with its price or reason, and a scene's inputs with what each holds.

```ts shape
import { screenText } from '@ifloom/cli'
function screenText(screen: View): string
```

## snapshot

Function. Explained in [The CLI](/docs/cli#snapshot).

Every scene and every location rendered in every probe state, as text: what
the player would read, and a scene's choices with what greys them out. Both
come from the engine's `view`, so a snapshot reads as the screen does: a
choice a lock or a plugin's guard refuses is greyed out with its reason.
Compared with the file from the last run, a difference is either a bug or a
change you meant, and the diff says which scene, in which state, read
differently.

```ts shape
import { snapshot } from '@ifloom/cli'
function snapshot(game: Game, probes: Probe[]): string
```

## TemplateName

Type. Explained in [The CLI](/docs/cli#templatename-and-themename).

```ts shape
import type { TemplateName } from '@ifloom/cli'
type TemplateName = (typeof TEMPLATES)[number]
```

## TEMPLATES

Const.

```ts shape
import { TEMPLATES } from '@ifloom/cli'
const TEMPLATES: readonly ['react', 'vanilla', 'vue', 'svelte', 'next', 'novel', 'cafe', 'town', 'plugin']
```

## ThemeName

Type. Explained in [The CLI](/docs/cli#templatename-and-themename).

```ts shape
import type { ThemeName } from '@ifloom/cli'
type ThemeName = (typeof THEMES)[number]
```

## THEMES

Const.

The React UI's theme presets, which `@ifloom/react/themes/<name>.css` provides.

```ts shape
import { THEMES } from '@ifloom/cli'
const THEMES: readonly ['paper', 'terminal', 'studio', 'storybook']
```

## TurnMetrics

Type. Explained in [The CLI](/docs/cli#turnmetrics).

One turn's numbers, as the turn ended: the player's stats and a count of each kind of entity. `turn` counts from 1.

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
| `turn` | `number` |  |  | The turn, from 1. |
| `stats` | `Record<string, number>` |  |  | The player's stats as it ended, by id. |
| `scenes` | `string[]` |  |  | The scenes shown during it, by id, in order. |
| `refused` | `number` |  |  | How many commands the policy chose that were refused during it. |
