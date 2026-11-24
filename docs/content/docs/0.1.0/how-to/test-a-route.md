---
title: "Test a route through your game"
description: "Test a route through your game with Vitest and no browser, checking the stats, the view and the reasons for refusals."
---
Use this to check that a route through your game still plays as you meant, every time you change it. The engine runs the same in Node as in a browser, so a test plays commands and checks the state and the view without opening a page. The examples use [Vitest](https://vitest.dev) and the game `npm create ifloom` makes, with its door and its room inside.

## Set up

Add Vitest to the game:

```sh tab="npm" tab-group="package-manager"
npm install --save-dev vitest
```

```sh tab="pnpm" tab-group="package-manager"
pnpm add --save-dev vitest
```

```sh tab="yarn" tab-group="package-manager"
yarn add --dev vitest
```

```sh tab="bun" tab-group="package-manager"
bun add --dev vitest
```

Then add `"test": "vitest run"` to the scripts in `package.json`. The templates' `tsconfig.json` covers `src` only, so add the tests to its `include`, `"include": ["src", "tests"]`, and `npm run typecheck` checks them too. Any test runner works, since only `describe`, `it` and `expect` come from Vitest.

## Play a route and check the result

Build the game from its game module, play commands with [`play`](/docs/0.1.0/reference/testing#play) from `@ifloom/engine/testing`, and check what came out. `play` fails the test on the first refused command, with its reason:

```ts
// tests/game.test.ts
import { describe, expect, it } from 'vitest'
import { startingState, view } from '@ifloom/engine'
import { play } from '@ifloom/engine/testing'
import module from '../src/game.ts'

const { game, problems } = module.build()
const start = startingState(game)

describe('the door', () => {
  it('loads with no problems', () => {
    expect(problems).toEqual([])
  })

  it('rewards knocking with courage, and remembers it', () => {
    const state = play(start, game, { type: 'choose', id: 'knock' })
    expect(state.stats.courage).toBe(2)
    expect(view(state, game).scene.body).toContain('Someone calls out')
  })

  it('says nothing about knocking to a player who waited', () => {
    const state = play(start, game, { type: 'choose', id: 'wait' })
    expect(view(state, game).scene.body).not.toContain('Someone calls out')
  })
})
```

Without a `seed`, [`startingState`](/docs/0.1.0/reference/commands#startingstate) uses one made from the game's id, so every run draws the same variants. Check what the player sees through the view and what the game keeps through the state: its [`stats`](/docs/0.1.0/reference/state#stats), the [kv store](/docs/0.1.0/reference/state#kv), [`seen`](/docs/0.1.0/reference/state#seen) and [`chosen`](/docs/0.1.0/reference/state#chosen). `play` takes a plugin helper's command as it is, `play(start, game, places.go('cafe'), jobs.work('cafe'))`. A test that wants undo or saves plays through a runner instead, as [Run a game in code](/docs/0.1.0/how-to/run-a-game-in-code) shows.

## Test a refusal by its reason

Test a greyed-out choice by its reason, because that's what the player reads. [`apply`](/docs/0.1.0/reference/commands#apply) gives it as `reason`, and the view's button carries the same words in `disabled`:

```ts
import { expect, it } from 'vitest'
import { apply, startingState, view } from '@ifloom/engine'
import module from '../src/game.ts'

const { game } = module.build()

it('offers no way back before the door', () => {
  const start = startingState(game)
  expect(apply(start, game, { type: 'choose', id: 'again' }).reason).toBe('That is not on offer.')
  expect(view(start, game).scene.choices.map((choice) => choice.id)).toEqual(['knock', 'wait'])
})
```

When a choice is missing and you can't tell why, [Find out why a choice doesn't show](/docs/0.1.0/how-to/troubleshoot-a-missing-choice) lists the causes.

## Check a scene can be reached

A scene nothing leads to is easy to miss. This helper tries every button on screen, then every button after each, until it reaches the scene or runs out of steps, and returns the commands that got there:

```ts
import { expect, it } from 'vitest'
import { apply, startingState, view, type Command, type Game, type GameState } from '@ifloom/engine'
import module from '../src/game.ts'

/** The shortest route of presses from `start` to `scene`, or null within `depth` steps. */
function routeTo(game: Game, start: GameState, scene: string, depth = 12): Command[] | null {
  let frontier = [{ state: start, route: [] as Command[] }]
  const visited = new Set<string>()
  for (let step = 0; step < depth && frontier.length; step++) {
    const next: typeof frontier = []
    for (const { state, route } of frontier) {
      const shown = view(state, game)
      for (const button of [...shown.scene.choices, ...shown.actions]) {
        if (button.disabled) continue
        const out = apply(state, game, button.command)
        if (!out.ok) continue
        if (out.state.sceneId === scene) return [...route, button.command]
        const key = JSON.stringify([out.state.sceneId, out.state.stats, out.state.kv, out.state.turn])
        if (!visited.has(key)) next.push({ state: out.state, route: [...route, button.command] })
        visited.add(key)
      }
    }
    frontier = next
  }
  return null
}

const { game } = module.build()
it('can reach the room inside', () => expect(routeTo(game, startingState(game), 'inside')).toEqual([{ type: 'choose', id: 'knock' }]))
```

The `key` decides when two states count as the same, so the search doesn't go round in circles. Put in it whatever your game's choices depend on, such as `state.plugins` in a game with plugins. `ifloom check` already reports a scene that names a scene that doesn't exist. This search catches a scene that exists but that no choice reaches under the conditions you set.

## Keep a test file per area

One content file on its own can't load, since a scene in `story/cafe.ts` names stats from `world/stats.ts`. So test the whole game, with a test file per area that starts where that area does:

```ts
// tests/cafe.test.ts
import { describe, expect, it } from 'vitest'
import { freshState, play } from '@ifloom/engine/testing'
import module from '../src/game.ts'

const { game } = module.build()

describe('the café', () => {
  it('sells a coffee for 3 coins', () => {
    const state = play(freshState(game), game, { type: 'action', id: 'coffee' })
    expect(state.stats.coins).toBe(9)
  })
})
```

[`freshState`](/docs/0.1.0/reference/testing#freshstate) starts a new game with no scene open, so the room's buttons are there. When a test fails, its file names the area, and the area's file is where the fix goes.

## Run them

Run `npm test`. In CI, run the tests, then `ifloom check`, `ifloom playtest` and `ifloom snapshot`, as [Playtest and snapshot from the command line](/docs/0.1.0/how-to/playtest-and-snapshot) shows.

The showcase's tests in [`examples/showcase/tests/showcase.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/showcase.test.ts) play Small Town with every plugin. For more, see:

- [Testing helpers](/docs/0.1.0/reference/testing), with [`loadChecked`](/docs/0.1.0/reference/testing#loadchecked), [`freshState`](/docs/0.1.0/reference/testing#freshstate) and [`play`](/docs/0.1.0/reference/testing#play).
- [Commands](/docs/0.1.0/reference/commands) and [the view](/docs/0.1.0/reference/view).
- [Debug a game](/docs/0.1.0/how-to/debug-a-game), to set up a state with debug commands or replay a player's save.
