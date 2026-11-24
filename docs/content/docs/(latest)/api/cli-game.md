---
title: "@ifloom/cli/game"
description: "Every export of @ifloom/cli/game, the game module's entry: its signature and its fields."
---
Generated from the source of `@ifloom/cli/game` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`defineGame`](#definegame), [`explorer`](#explorer), [`probe`](#probe-1)
- Types: [`BuildOptions`](#buildoptions), [`GameModule`](#gamemodule), [`GameModuleDef`](#gamemoduledef), [`Policy`](#policy), [`Probe`](#probe), [`ProbeStep`](#probestep)

## BuildOptions

Type. Explained in [The CLI](/docs/cli#gamemoduledef-buildoptions-and-gamemodule).

What `build` is given: the packs to load over the content, such as the locked content a player's codes opened.

```ts shape
import type { BuildOptions } from '@ifloom/cli/game'
type BuildOptions = {
  unlocked: Pack[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocked` | `Pack[]` |  |  | Packs to pass to `loadGame` as `{ packs }`. `ifloom check` passes the game's `src/unlocks/` content here; empty otherwise. |

## defineGame

Function. Explained in [The CLI](/docs/cli#definegame).

The game module `src/game.ts` exports as its default, for `ifloom check`,
`playtest`, `snapshot`, `words` and `build`:

    export default defineGame({
      build: ({ unlocked }) => loadGame(content, { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
    })

The page builds the game the same way, with `game.build()`.

```ts shape
import { defineGame } from '@ifloom/cli/game'
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
import { explorer } from '@ifloom/cli/game'
function explorer(): Policy
```

## GameModule

Type. Explained in [The CLI](/docs/cli#gamemoduledef-buildoptions-and-gamemodule).

A game module, as `defineGame` returns it: `build` may be called with no options, as a page does.

```ts shape
import type { GameModule } from '@ifloom/cli/game'
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
import type { GameModuleDef } from '@ifloom/cli/game'
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

## Policy

Type. Explained in [The CLI](/docs/cli#policy).

Picks the next command from what is on screen, or null to stop.

```ts shape
import type { Policy } from '@ifloom/cli/game'
type Policy = (screen: View, state: GameState, game: Game) => CommandRef | null
```

## Probe

Type. Explained in [The CLI](/docs/cli#probe-1).

A state to render every scene against, named for the problems it finds.

```ts shape
import type { Probe } from '@ifloom/cli/game'
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
import { probe } from '@ifloom/cli/game'
function probe(name: string, game: Game, steps: readonly ProbeStep[], from?: Probe | GameState): Probe
```

## ProbeStep

Type. Explained in [The CLI](/docs/cli#probestep).

One step of a probe: an effect, applied as content applies it, or
`{ play: command }`, a command played as the player would press it.

```ts shape
import type { ProbeStep } from '@ifloom/cli/game'
type ProbeStep = Effect | { play: CommandRef }
```
