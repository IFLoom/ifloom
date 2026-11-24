---
title: "Testing your game"
description: "Test an IFLoom game with Vitest and the engine, no browser needed: play a route and check the stats and the view, find out whether a scene can be reached, replay a player's bug from their save, and run playtests and snapshots, with probes made by playing, in CI."
---
The engine runs the same in Node as in a browser, so you can test a game the way you'd test any other code. A test plays some commands and checks what came out, without opening a page.

This page uses [Vitest](https://vitest.dev) and the two-scene game `ifloom new` makes, but any test runner works. Only `describe`, `it` and `expect` come from Vitest, so with Node's own runner, `node:test` and `node:assert`, the rest of each test is the same.

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

Then add a `test` script to `package.json`: `"test": "vitest run"`. The @ifloom packages are compiled JavaScript, so Vitest needs no config for them.

The templates' `tsconfig.json` covers `src` only, so `npm run typecheck` doesn't check the tests. A test that reads a field that isn't there can then pass without testing anything. Add the folder to its `include` (`"include": ["src", "tests"]`) so the tests are type-checked too. With `node:test`, add `@types/node` as well.

## Play a route and check the result

A test starts a game, plays some commands, and checks the state and the view. Without a `seed`, [`startingState`](/docs/reference/commands#startingstate) uses one made from the game's id, so every run draws the same random variants.

```ts
// tests/game.test.ts
import { describe, expect, it } from 'vitest'
import { createRunner, startingState, type Command, type CommandRef } from '@ifloom/engine'
import module from '../src/game.ts'

const { game, problems } = module.build()

/** A runner on a new game, after the given commands. Fails the test if one is refused. */
function play(...commands: CommandRef[]) {
  const runner = createRunner(game, startingState(game))
  for (const command of commands) {
    const result = runner.apply(command)
    if (!result.ok) throw new Error(`${JSON.stringify(command)} was refused: ${result.reason}`)
  }
  return runner
}

const choose = (id: string): Command => ({ type: 'choose', id })

describe('the door', () => {
  it('loads with no problems', () => {
    expect(problems).toEqual([])
  })

  it('rewards knocking with courage, and remembers it', () => {
    const runner = play(choose('knock'))
    expect(runner.state.stats.courage).toBe(2)
    expect(runner.view().scene.title).toBe('Inside')
    expect(runner.view().scene.body).toContain('Someone calls out')
  })

  it('says nothing about knocking to a player who waited', () => {
    const runner = play(choose('wait'))
    expect(runner.state.stats.courage).toBe(1)
    expect(runner.view().scene.body).not.toContain('Someone calls out')
  })
})
```

`play` takes a [`CommandRef`](/docs/reference/custom#commandref), as [`runner.apply`](/docs/reference/runner#the-runners-members) and [`apply`](/docs/reference/commands#apply) do, so a plugin helper's command goes in as it is: `play(places.go('cafe'), jobs.work('cafe'))`. A refusal's words are its `reason`.

A test that works on states rather than a runner can take these ready-made from [`@ifloom/engine/testing`](/docs/reference/testing): `loadChecked` loads content and fails on any problem the checker finds, and `play(state, game, ...commands)` returns the state after the commands and fails on the first one refused, with its reason.

Check what the player sees through `runner.view()`, and what the game keeps through `runner.state`: [`stats`](/docs/reference/state#stats), the [kv store](/docs/reference/state#kv), [`seen`](/docs/reference/state#seen) scenes and [`chosen`](/docs/reference/state#chosen) choices. Test greyed-out buttons by their reason, because that's what the player reads. In [A game with a world](/docs/guide/first-game), a second coffee is too dear:

```ts given continues
const buy = runner.view().actions.find((action) => action.id === 'coffee')
expect(buy?.disabled).toBe('Not enough on you.')
```

## Check a scene can be reached

A scene nothing leads to is easy to miss. This helper tries every button on screen, then every button after each of those, and so on, until it reaches the scene or runs out of steps. It returns the commands that got there:

```ts given
import { expect, it } from 'vitest'
import { apply, startingState, view, type Command, type Game, type GameState } from '@ifloom/engine'

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
        const path = [...route, button.command]
        if (out.state.sceneId === scene) return path
        const key = JSON.stringify([out.state.sceneId, out.state.stats, out.state.kv, out.state.turn])
        if (visited.has(key)) continue
        visited.add(key)
        next.push({ state: out.state, route: path })
      }
    }
    frontier = next
  }
  return null
}

it('can reach the room inside', () => {
  expect(routeTo(game, startingState(game), 'inside')).toEqual([{ type: 'choose', id: 'knock' }])
})
```

The `key` decides when two states count as the same place, so the search doesn't go round in circles. Put in it whatever your game's choices depend on. A game with plugins might add `state.plugins`.

[`ifloom check`](/docs/reference/cli#ifloom-check) already catches a scene that names one that doesn't exist. A search like this catches the other mistake: a scene that exists but that no choice leads to under the conditions you set.

## Replay a bug from a save

When a player reports a bug, ask for their save. The [save store](/docs/reference/saves#saves) exports a slot as text, and a test can read it back and play on from exactly where they were:

```ts given
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createRunner, memoryDriver, saves } from '@ifloom/engine'

it('lets the player leave the room they got stuck in', () => {
  const text = readFileSync(new URL('./saves/stuck.save', import.meta.url), 'utf8')
  const loaded = saves(game, memoryDriver()).importText(text)
  if (!loaded.ok) throw new Error(loaded.reason)

  const runner = createRunner(game, loaded.value.state)
  expect(runner.view().scene.choices.map((choice) => choice.id)).toContain('again')
  expect(runner.apply({ type: 'choose', id: 'again' }).ok).toBe(true)
})
```

`importText` carries an old save forward, as loading it in the game would. Keep the file in your tests once the bug is fixed, so it stays fixed.

A [command log](/docs/reference/runner#commandlog) is even better than a save, since it shows how the player got there. `runner.log()` is the state the game started from and every command since. [`replay`](/docs/reference/runner#replay) plays it back, the same every time, because every random draw is seeded:

```ts given
import { readFileSync } from 'node:fs'
import { expect } from 'vitest'
import { replay, type CommandLog } from '@ifloom/engine'

const log: CommandLog = JSON.parse(readFileSync(new URL('./saves/stuck.log.json', import.meta.url), 'utf8'))
const played = replay(game, log)
expect(played.ok && played.value.sceneId).toBe('inside')
```

## Playtests and snapshots

Two of the CLI's commands are tests of a kind, and they run from the game's folder whatever builds it:

- [`ifloom playtest`](/docs/reference/cli#ifloom-playtest) plays the game for some turns with no one at the keyboard, writes every screen to a transcript, and exits with an error if the game offered a button and then refused it. The [explorer](/docs/reference/cli#explorer) picks a choice it hasn't tried yet each time, or you give it a policy of your own.
- [`ifloom snapshot`](/docs/reference/cli#ifloom-snapshot) writes how every scene reads to a file, and fails when one reads differently from last time. Commit the file, and a change you didn't mean shows up in review.

Both read what they need from the game module in `src/game.ts`: playtest its `start` and `policy`, snapshot its `probes`, the states every scene is read in. Make each probe with [`probe`](/docs/reference/cli#probe), by playing commands and effects from the start, so it's a state a player could be in:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame, probe } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: () => loadGame([stats, opening], { id: 'my-story', title: 'My Story' }),
  // The first screen, and after knocking, played as the player would.
  probes: (game) => [probe('start', game, []), probe('knocked', game, [{ play: { type: 'choose', id: 'knock' } }])],
})
```

Both are functions too, from `@ifloom/cli`, so a test can call them:

```ts given
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { explorer, playtest, snapshot } from '@ifloom/cli'
import { startingState } from '@ifloom/engine'
import module from '../src/game.ts'

it('plays five turns with nothing refused', () => {
  const result = playtest(game, startingState(game), explorer(), { turns: 5 })
  expect(result.refusals).toEqual([])
})

it('reads every scene as it did', () => {
  expect(snapshot(game, module.probes!(game))).toBe(readFileSync(new URL('../snapshots/scenes.txt', import.meta.url), 'utf8'))
})
```

In CI, run your tests, then `ifloom check`, `ifloom playtest` and `ifloom snapshot`.

## Next

- [`examples/novel/tests/novel.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/tests/novel.test.ts) tests The Letter this way, and [`examples/showcase/tests/showcase.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/showcase.test.ts) tests Small Town with every plugin.
- [The CLI](/docs/reference/cli#functions) lists `playtest`, `snapshot` and the rest for scripts.
