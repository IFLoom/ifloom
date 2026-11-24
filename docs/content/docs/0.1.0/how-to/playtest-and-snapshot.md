---
title: "Playtest and snapshot from the command line"
description: "Check a whole game from the command line, play a week of it with nobody at the keyboard, and snapshot how every scene reads."
---
Use this to check a whole game without playing it yourself: that its content holds together, that a week of play offers nothing it then refuses, and that no scene reads differently from last time without you meaning it. The three commands run from the game's folder, whatever builds it, and read the [game module](/docs/0.1.0/reference/glossary#game-module) in `src/game.ts`.

## Check the content

Run [`ifloom check`](/docs/0.1.0/reference/cli#ifloom-check):

```sh
npx ifloom check
```

It builds the game and prints every problem the [content checker](/docs/0.1.0/reference/checks) found, such as a misspelt scene id or a stat nobody declares, one per line with where it is. It also lists each picture and sound file the game names that isn't in `public/`. It exits with `1` on any problem, so CI fails on a broken id before anybody plays. Warnings, such as a token that may print nothing, follow the problems and don't change the exit code.

## Play a week with playtest

Run [`ifloom playtest`](/docs/0.1.0/reference/cli#ifloom-playtest). It plays the game for `--turns` turns, seven by default, with a policy choosing each command:

```sh
npx ifloom playtest
npx ifloom playtest --turns 30 --out playtest/month.txt
```

It writes every screen with the command taken on it to `playtest.txt`, and one row of numbers per turn to `playtest.txt.metrics`: each stat as the turn ended, a count of each listed kind of entity, the scenes entered and the commands refused. Then it prints the numbers and each refusal with its turn and reason. It exits with `1` if any command was refused, since that's a button the game offered and then wouldn't do.

## Read the transcript

Each screen in the transcript is the player's, with the command under it:

```text
== Turn 2 · Day 2 · Tuesday morning · High Street
# High Street
A bakery, a launderette, a bus stop with a bench nobody sits on.
  [>] Buy a scarf at the market (8 coins)
  [ ] Go to bed — Too early.
  [>] Sam: Talk
  -> The Corner Café

> {"type":"custom","name":"cast/talk","with":{"who":"sam"}}
```

`[>]` is a button the player can press, `[ ]` one that's greyed out with its reason after the dash, and `->` a way out. Run a playtest before and after a change to pacing, such as a price, a reward or a door's hours, and read both. The numbers say when things happened, such as the turn the coins stopped climbing. Only the transcript shows a line that prints on every screen, a variant dealt five days running, or a gate meant for week two that's open on day two.

## Set where it starts and what it chooses

Give the game module a `start` and a `policy`. Without them, it starts from `startingState(game)` with the [explorer](/docs/0.1.0/reference/cli#explorer), which presses a button it hasn't tried yet each time:

```ts
// src/game.ts
import { loadGame, startingState } from '@ifloom/engine'
import { defineGame, type Policy } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

/** Always knock, then the first button that can be pressed. */
const brave: Policy = (screen) => {
  const buttons = [...screen.scene.choices, ...screen.actions].filter((button) => !button.disabled)
  return (buttons.find((button) => button.id === 'knock') ?? buttons[0])?.command ?? null
}

export default defineGame({
  build: () => loadGame([stats, opening], { id: 'my-story', title: 'My Story' }),
  start: (game) => startingState(game, { kv: { playerName: 'Robin' } }),
  policy: brave,
})
```

The explorer won't find a route through a story, because it doesn't know your game. Write a [`Policy`](/docs/0.1.0/reference/cli#policy) of your own to reach a scene that needs good choices. A run stops early when the policy returns `null`, goes round in circles, or sends the same refused command twice in a row. It also stops at a running minigame, because neither the explorer nor a policy can play one, so a run through Small Town ends on day 2 at the park's quick feet.

## Snapshot every scene

Run [`ifloom snapshot`](/docs/0.1.0/reference/cli#ifloom-snapshot). It renders every scene and every location's body in each probe state, as the player would read it:

```sh
npx ifloom snapshot           # write snapshots/scenes.txt, or compare with it
npx ifloom snapshot --update  # write it again, after a change you meant
```

The first run writes the file, so commit it. After that, each run compares and prints `changed: <scene> @ <probe>` for each render that reads differently, then exits with `1`. A difference is a bug or a change you meant, so read the diff, then run `--update`. A change to a condition or a line can make a scene read differently without anyone noticing, and the snapshot shows which scene and in which state.

## Choose the probes

Give the game module `probes`, a function that returns the states `ifloom snapshot` reads every scene in. Make each with [`probe`](/docs/0.1.0/reference/cli#probe), by playing commands and effects from the start, so each is a state a player could be in:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame, probe } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: () => loadGame([stats, opening], { id: 'my-story', title: 'My Story' }),
  probes: (game) => {
    const knocked = probe('knocked', game, [{ play: { type: 'choose', id: 'knock' } }])
    const brave = probe('brave', game, [{ stat: 'courage', to: 5 }], knocked)
    return [probe('start', game, []), knocked, brave]
  },
})
```

A `{ play }` step sends a command as the player would, and `probe` throws if the game refuses it. Any other step is an effect, a plugin's included, such as `{ turn: true }` to end a turn. Pick probes that differ in what the content asks about: the first screen, an ordinary day, and a state well along with keys set and scenes seen. The showcase's three, `moving-day`, `first-morning` and `a-week-in`, are in [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts).

Each scene is rendered as if it were open in each probe, wherever the probe's player stands. Effect steps skip the locks a command would meet, so play commands where you can.

## Run them in tests and CI

The same work is in functions from `@ifloom/cli`, so a test can run it:

```ts
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { explorer, playtest, snapshot } from '@ifloom/cli'
import { startingState } from '@ifloom/engine'
import module from '../src/game.ts'

const { game } = module.build()

it('plays five turns with nothing refused', () => {
  expect(playtest(game, startingState(game), explorer(), { turns: 5 }).refusals).toEqual([])
})

it('reads every scene as it did', () => {
  expect(snapshot(game, module.probes?.(game) ?? [])).toBe(readFileSync(new URL('../snapshots/scenes.txt', import.meta.url), 'utf8'))
})
```

In CI, run your tests, then `ifloom check`, `ifloom playtest` and `ifloom snapshot`. Each exits with `1` on what it finds.

For more, see:

- [The CLI](/docs/0.1.0/reference/cli), with [`defineGame`](/docs/0.1.0/reference/cli#definegame), [`probe`](/docs/0.1.0/reference/cli#probe), [`Policy`](/docs/0.1.0/reference/cli#policy) and [`explorer`](/docs/0.1.0/reference/cli#explorer).
- [Checks](/docs/0.1.0/reference/checks), with every problem the content checker reports.
- [Test a route through your game](/docs/0.1.0/how-to/test-a-route).
