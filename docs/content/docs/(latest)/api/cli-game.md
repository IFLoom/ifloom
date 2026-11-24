---
title: "@ifloom/cli/game"
description: "Every export of @ifloom/cli/game, the game module's entry: its signature and its fields."
---
Generated from the source of `@ifloom/cli/game` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`defineGame`](#definegame), [`explorer`](#explorer), [`probe`](#probe-1)
- Types: [`BuildOptions`](#buildoptions), [`GameModule`](#gamemodule), [`GameModuleDef`](#gamemoduledef), [`Policy`](#policy), [`Probe`](#probe), [`ProbeStep`](#probestep)

## BuildOptions

Type. Explained in [The CLI](/docs/reference/cli#gamemoduledef-buildoptions-and-gamemodule).

The options a game module's `build` receives. They name the packs to load over the content, such as the locked
content a player's codes opened.

```ts shape
import type { BuildOptions } from '@ifloom/cli/game'
type BuildOptions = {
  unlocked: Pack[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocked` | [`Pack[]`](/docs/api/engine#pack) |  |  | The packs to pass to `loadGame` as `{ packs }`. `ifloom check` passes the game's `src/unlocks/` packs, and it's empty otherwise. |

## defineGame

Function. Explained in [The CLI](/docs/reference/cli#definegame).

Returns the game module for a definition, the default export of `src/game.ts`. It throws when `build` is missing.

`ifloom check`, `playtest`, `snapshot`, `words` and `build` read the game module, and the page builds the game from
it with `game.build()`.

    export default defineGame({
      build: ({ unlocked }) => loadGame(content, { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
    })

```ts shape
import { defineGame } from '@ifloom/cli/game'
function defineGame(def: GameModuleDef): GameModule
```

Uses: [`GameModuleDef`](/docs/api/cli#gamemoduledef), [`GameModule`](/docs/api/cli#gamemodule).

## explorer

Function. Explained in [The CLI](/docs/reference/cli#explorer).

Returns a policy that explores the game as a curious player would, rather than following a route through the story.
It never chooses a choice or action that carries a warning.

In a scene it chooses a choice it hasn't chosen yet. Otherwise, at the calendar's bedtime it goes to bed, walking
home if it must. Failing that it talks to someone and does something, each once a turn, leaving an action that ends
the turn till last. Then it walks to the nearest location it hasn't visited this turn, waits for a running timer with
a `tick`, and at last ends the turn.

```ts shape
import { explorer } from '@ifloom/cli/game'
function explorer(): Policy
```

Uses: [`Policy`](/docs/api/cli#policy).

## GameModule

Type. Explained in [The CLI](/docs/reference/cli#gamemoduledef-buildoptions-and-gamemodule).

The game module `defineGame` returns, the default export of `src/game.ts`. Its `build` takes its options as optional, so a page calls `game.build()`.

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
| `start` | `(game:` [`Game`](/docs/api/engine#game)`) =>` [`GameState`](/docs/api/engine#gamestate) | yes |  | The function that returns the state `ifloom playtest` starts from, and `ifloom snapshot` when there are no probes. `startingState(game)` if left out. |
| `probes` | `(game:` [`Game`](/docs/api/engine#game)`) =>` [`Probe[]`](/docs/api/engine#probe) | yes |  | The function that returns the states `ifloom snapshot` renders every scene and location in, each made with `probe`. The start only if left out. |
| `policy` | [`Policy`](/docs/api/cli#policy) | yes |  | The policy that chooses each command `ifloom playtest` sends. The CLI's `explorer()` if left out. |
| `build` | `(options?: Partial<`[`BuildOptions`](/docs/api/cli#buildoptions)`>) => { game:` [`Game`](/docs/api/engine#game)`; problems:` [`Problem[]`](/docs/api/engine#problem) `}` |  |  | Builds the game with the definition's `build`, and returns the game and the loader's problems. `unlocked` is empty unless given. |

## GameModuleDef

Type. Explained in [The CLI](/docs/reference/cli#gamemoduledef-buildoptions-and-gamemodule).

The definition a game passes to `defineGame`. Only `build` is required.

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
| `build` | `(options:` [`BuildOptions`](/docs/api/cli#buildoptions)`) => { game:` [`Game`](/docs/api/engine#game)`; problems:` [`Problem[]`](/docs/api/engine#problem) `}` |  |  | The function that builds the game. It returns what `loadGame` returns, the `game` and its `problems`. |
| `start` | `(game:` [`Game`](/docs/api/engine#game)`) =>` [`GameState`](/docs/api/engine#gamestate) | yes |  | The function that returns the state `ifloom playtest` starts from, and `ifloom snapshot` when there are no probes. `startingState(game)` if left out. |
| `probes` | `(game:` [`Game`](/docs/api/engine#game)`) =>` [`Probe[]`](/docs/api/engine#probe) | yes |  | The function that returns the states `ifloom snapshot` renders every scene and location in, each made with `probe`. The start only if left out. |
| `policy` | [`Policy`](/docs/api/cli#policy) | yes |  | The policy that chooses each command `ifloom playtest` sends. The CLI's `explorer()` if left out. |

## Policy

Type. Explained in [The CLI](/docs/reference/cli#policy).

A function that chooses the next command for `playtest` from the view, the state and the game. It returns null to stop the run.

```ts shape
import type { Policy } from '@ifloom/cli/game'
type Policy = (screen: View, state: GameState, game: Game) => CommandRef | null
```

Uses: [`View`](/docs/api/engine#view), [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`CommandRef`](/docs/api/engine#commandref).

## Probe

Type. Explained in [The CLI](/docs/reference/cli#probe-1).

A state the content checker renders every scene against, named for the problems it finds. Make one with `probe`, by playing.

```ts shape
import type { Probe } from '@ifloom/cli/game'
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

Function. Explained in [The CLI](/docs/reference/cli#probe).

Returns a probe made by playing each step in order, from the game's starting state or from `from`. It throws when
the game refuses a command, with the reason.

`from` is another probe or a state. An effect step is any effect content can write, a plugin's included, so a probe
never writes the state directly. A `{ play }` step sends the command with everything that follows a command.

    const morning = probe('first-morning', game, [{ play: { type: 'choose', id: 'unpack' } }, { play: calendar.sleep() }])
    probe('a-week-in', game, [{ turn: { by: 6 } }, { 'calendar/set': { period: 'afternoon' } }], morning)

```ts shape
import { probe } from '@ifloom/cli/game'
function probe(name: string, game: Game, steps: readonly ProbeStep[], from?: Probe | GameState): Probe
```

Uses: [`Game`](/docs/api/engine#game), [`ProbeStep`](/docs/api/cli#probestep), [`Probe`](/docs/api/engine#probe), [`GameState`](/docs/api/engine#gamestate).

## ProbeStep

Type. Explained in [The CLI](/docs/reference/cli#probestep).

One step of a probe, either an effect or `{ play: command }`. The probe applies an effect as content's effects
apply, and sends a command as the player would.

```ts shape
import type { ProbeStep } from '@ifloom/cli/game'
type ProbeStep = Effect | { play: CommandRef }
```

Uses: [`Effect`](/docs/api/engine#effect), [`CommandRef`](/docs/api/engine#commandref).
