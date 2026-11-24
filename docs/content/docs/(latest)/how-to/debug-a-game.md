---
title: "Debug a game"
description: "Jump to the state you need with the debug plugin, see why a button is greyed out, and replay a player's save in a test."
---
Use this when something in play goes wrong and you want to get to it fast, see why, and keep it fixed. The [debug plugin](/docs/reference/plugins/debug) sets the state directly, past every lock, so you can skip to day four without playing days one to three. A player's save or command log brings their bug into a test.

## Add the debug plugin to development builds

Add `@ifloom/plugin-debug` as [Add a plugin](/docs/how-to/add-a-plugin) shows, and list it only in development builds. With Vite, `import.meta.env.DEV` is true under `ifloom dev` and false under `ifloom build`, and the build drops the branch it never takes:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { debug } from '@ifloom/plugin-debug'

declare const town: Content // your content

export const { game, problems } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'flat' }), ...(import.meta.env.DEV ? [debug()] : [])],
})
```

A release build then has none of its commands, and refuses one sent to it as it refuses any command no plugin has. The showcase passes a `withDebug` option to the function that builds its game, and sets it from `import.meta.env.DEV` in `src/main.tsx`. A save made in development loads in a release, with `debug` in its [`missingPlugins`](/docs/reference/saves#loadedsave).

## Jump to the state you need

Send debug commands to set stats, kv keys, things held, the clock, the turn, where the player is and the open scene. Each helper writes its command. This puts the showcase's player in the café on day five, with money and a friend, in Ava's scene:

```ts
import { apply, startingState, type CommandRef } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { debug } from '@ifloom/plugin-debug'
import { smallTown } from './game.ts'

const { game } = smallTown({ withDebug: true })
let state = startingState(game)
const set = (command: CommandRef) => (state = apply(state, game, command).state)

set(debug.kv('phase', 'open')) // past moving day's lock
set(debug.stat('coins', 40))
set(debug.held('item:sandwich', 2))
set(debug.stat('friendship', 25, 'character:ava'))
set(debug.turn(4))
set(debug.time({ day: 4, period: 'afternoon' }))
set(debug.go('cafe'))
set(debug.scene('ava.hi'))

places.where(state, game) // 'cafe'
apply(state, game, debug.stat('luck', 3)).reason // 'There is no stat called luck.'
```

A debug command sets the state and nothing else. It pays no cost, meets no lock, runs no arrival at a location and ends no turn, so `debug.time` and `debug.turn` don't run the turn's rules or put back `resets`. To test a night, end a real turn with the calendar's `calendar.sleep()` after setting things up.

In the React UI, list `debugUi` from `@ifloom/plugin-debug/react` in `plugins`, and the [debug card](/docs/reference/plugins/debug#debugcard) at the end of the story has a form for each command.

## See why something is refused

The debug card's **Why not** tab lists the [locks](/docs/reference/locks) on now, with what each denies, and every greyed-out choice, action and person's button with its reason. Its **State** tab shows the whole state as JSON, and **Log** the commands so far. With a UI of your own, `view.plugins.debug` has the locks on, the triggers fired and the save's seed, as [Render a debug readout](/docs/how-to/render/player-tools#render-a-debug-readout) shows.

For a condition that doesn't hold when you expect, [`explain`](/docs/reference/conditions#explain) goes through it part by part. [Find out why a choice doesn't show](/docs/how-to/troubleshoot-a-missing-choice) walks through every cause.

## Replay a player's save

Ask a player who hits a bug for their save. The [save store](/docs/reference/saves#saves) exports a slot as text, and a test reads it back and plays on from where they were:

```ts
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createRunner, memoryDriver, saves } from '@ifloom/engine'
import module from '../src/game.ts'

const { game } = module.build()

it('lets the player leave the room they got stuck in', () => {
  const loaded = saves(game, memoryDriver()).importText(readFileSync(new URL('./saves/stuck.save', import.meta.url), 'utf8'))
  if (!loaded.ok) throw new Error(loaded.reason)
  const runner = createRunner(game, loaded.value.state)
  expect(runner.apply({ type: 'choose', id: 'again' }).ok).toBe(true)
})
```

`importText` carries an old save forward, as loading it in the game would. Keep the file in your tests once the bug is fixed, so it stays fixed.

## Replay a command log

A [command log](/docs/reference/runner#commandlog) shows how the player got there, which a save doesn't. `runner.log()` gives the state the game started from and every command since, and [`replay`](/docs/reference/runner#replay) plays it back the same every time, since every draw is seeded:

```ts
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { replay, type CommandLog } from '@ifloom/engine'
import module from '../src/game.ts'

const { game } = module.build()

it('reaches the room inside', () => {
  const log: CommandLog = JSON.parse(readFileSync(new URL('./saves/stuck.log.json', import.meta.url), 'utf8'))
  const played = replay(game, log)
  expect(played.ok && played.value.sceneId).toBe('inside')
})
```

To keep a log of your own play, write `JSON.stringify(runner.log())` to a file from the page, such as from a button in development builds.

For more, see:

- [Debug](/docs/reference/plugins/debug), with its [commands](/docs/reference/plugins/debug#commands) and [`DebugView`](/docs/reference/plugins/debug#debugview).
- [Saves](/docs/reference/saves) and [the runner](/docs/reference/runner), with [`replay`](/docs/reference/runner#replay).
- [Test a route through your game](/docs/how-to/test-a-route).
