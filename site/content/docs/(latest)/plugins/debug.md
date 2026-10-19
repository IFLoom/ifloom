---
title: "Debug"
description: "Commands for testing that ignore locks: set a stat, a kv key, what someone holds, the scene, the turn, the clock or the place."
---
`@ifloom/plugin-debug` lets you change the game state by hand while you test. You can set a stat (the player's, or a character's or any entity's), set a key in the kv store, set how many of a thing the player (or anyone who can hold things) holds, put a scene on screen, set the [calendar](/docs/plugins/calendar)'s clock or the turn, and put the player anywhere on the [places](/docs/plugins/places) map.

You'd want it while you build and test a game, so you can get straight to the state you want to look at without playing up to it. It's for you, not the player, so leave it out of release builds.

To give the player cheats in the released game, such as +20 coins or a supporter-only shortcut, use the [cheats plugin](/docs/plugins/cheats) instead. Its cheats are content you write, with effects and reasons the player reads, and its log records each use.

To add it, list `@ifloom/plugin-debug` in your game's `package.json` and add `debug()` to the game's `plugins` in development builds only. [Leave it out of release builds](#leave-it-out-of-release-builds) shows how.

```ts
import {
  debug, debugStat, debugKv, debugHeld, debugScene, debugTime, debugTurn, debugGo,
  type DebugView,
} from '@ifloom/plugin-debug'
```

Every command it adds sets [`ignoresLocks`](/docs/reference/plugins#commands-outside-the-story), so it works in any stretch of the game, including an intro that only moves through its scenes. None of them pays a cost or needs an exit. The [React UI](/docs/react) draws a [debug card](/docs/react/components#debugcard) for it when the game has it.

## Install

Add the package beside the engine. See [Adding one](/docs/plugins#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-debug": "^0.0.0"
  }
}
```

## Leave it out of release builds

The plugin is only in a game whose `plugins` list has it. If you add it in development builds and leave it out of release builds, its commands, strings and view aren't there in the release. A debug command sent to a release build is refused like any command no plugin has.

With Vite, `import.meta.env.DEV` is `true` under `vite` and `false` under `vite build`, and the bundler drops the branch that's never taken:

```ts
import { loadGame, type Plugin, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'
import { debug } from '@ifloom/plugin-debug'

declare const town: Content // your content

const base: Plugin[] = [calendar(), places({ start: 'flat' }), quests()]

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  plugins: [...base, ...(import.meta.env.DEV ? [debug()] : [])],
})
```

The [showcase](/docs/guide/showcase) does the same with a `withDebug` option on the function that builds its game.

A save made with the plugin loads in a build without it. The plugin keeps no state, so nothing in the save depends on it. Its version is still recorded in the save's [`meta.plugins`](/docs/reference/saves#savemeta), so a release build lists `debug` in [`missingPlugins`](/docs/reference/saves#loadedsave) for a save made in development. Anything you set by hand is still in the save.

## debug

```ts
function debug(): DefinedPlugin<null, DebugView>
```

The plugin, with the id `debug`. It has no state of its own. Call it once, when you build the game.

It lists `cooperates: ['calendar', 'places']` (see [`cooperates`](/docs/reference/plugins#cooperates)). `debug/time` sets the [calendar](/docs/plugins/calendar)'s clock when the game has one, and `debug/go` moves the player on the [places](/docs/plugins/places) map when the game has it. Each is refused when its partner is missing.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'debug/stat': { stat, to, of? } }` | `debugStat(stat, to, of?)` | Puts a [stat](/docs/reference/stats) at a value, held to its range. It writes the state directly rather than running a [`stat`](/docs/reference/effects#setting-a-stat) effect with `to`. With `of`, it sets an [entity](/docs/reference/entities)'s stat, so `of: 'character:ava'` sets Ava's friendship. |
| `{ 'debug/kv': { key, to } }` | `debugKv(key, to)` | Sets a key in the [kv store](/docs/reference/state#kv) to `true`, `false`, a number or a word. |
| `{ 'debug/held': { entity, to, at? } }` | `debugHeld(entity, to, at?)` | Sets how many of a [thing](/docs/reference/entities#holding-things) a holder holds, `'you'` if `at` is left out, through the [`entity`](/docs/reference/effects#entity) effect with `to`. Below 0 counts as 0, and a unique thing is taken from whoever had it. |
| `{ 'debug/scene': { id } }` | `debugScene(scene?)` | Puts the scene `id` on screen. With no `id`, it closes the one that's open. |
| `{ 'debug/time': { day?, period? } }` | `debugTime({ day?, period? })` | Sets the [calendar](/docs/plugins/calendar)'s clock, through its [`calendar/set`](/docs/plugins/calendar#effects) effect. `day` counts from 0. A half you leave out stays as it is. |
| `{ 'debug/turn': { to } }` | `debugTurn(turn)` | Sets [`state.turn`](/docs/reference/state#turn), how many turns have passed. |
| `{ 'debug/go': { id } }` | `debugGo(location)` | Puts the player in the place `id`, through the places plugin's [`places/move`](/docs/plugins/places#effects) effect, which closes any scene. |

A command is refused, with a line from [Strings](#strings), when:

- the game has no such stat, thing, scene or place
- `debug/held`'s `at` can't hold things
- `debug/stat`'s `of` names no entity in the game, or the stat isn't one the owner has (see [Gotchas](#gotchas))
- the number given to `debug/stat` or `debug/held` isn't a finite number
- a kv key's value isn't one the kv store can hold
- the turn isn't a whole number from 0
- the day isn't a whole number from 0, or the period isn't one of the calendar's own periods (its [`calendar/periods`](/docs/plugins/calendar#queries) query)

In a game with no calendar, `debug/time` is refused with `This game has no calendar.` In a game without the places plugin, `debug/go` is refused with `This game has no places.` Whether a place exists is asked of the places plugin's [`places/known`](/docs/plugins/places#queries) query.

### What they skip

The commands set the state and nothing else, so you can get to the state you want to test without playing up to it. That also means:

- **No cost.** Nothing is paid, and no time passes except what `debug/time` and `debug/turn` set.
- **No locks.** A [lock](/docs/reference/locks) never stops them, even one that denies `'*'`.
- **No exit for `debug/go`.** It ignores a place's [`blocked`](/docs/plugins/places#locationdef) entries, opening hours included, and runs nothing on arrival. It's a [`places/move`](/docs/plugins/places#effects), so the place's [`arrive`](/docs/plugins/places#arrival) doesn't run.
- **No turn ends.** `debug/time` moves the calendar's clock and leaves [`state.turn`](/docs/reference/state#turn) alone. `debug/turn` changes the counter and leaves the calendar's clock alone. Neither runs [`rules.onTurn`](/docs/reference/rules#onturn) or any plugin's `onTurn` [hook](/docs/reference/plugins#hooks-and-providers), and neither puts the [`resets`](/docs/reference/rules#resets) kv keys back. To test a night, use the calendar's real [`sleep()`](/docs/plugins/calendar#commands) or a [`turn`](/docs/reference/effects#turn) effect.
- **`debug/scene` replaces any open scene.** The [`scene`](/docs/reference/commands#scene) command refuses while a scene is open, but this one doesn't.

They still go through [`apply`](/docs/reference/commands#apply) like any command. Once one has run, [triggers](/docs/reference/triggers) fire, the scene left on screen is counted as seen, and every plugin's `onCommand` hook runs. Setting a kv key that a trigger watches fires that trigger.

### Helpers

```ts
import type { CommandRef, KvValue } from '@ifloom/engine'

const debugStat: (stat: string, to: number, of?: string) => CommandRef
const debugKv: (key: string, to: KvValue) => CommandRef
const debugHeld: (entity: string, to: number, at?: string) => CommandRef
const debugScene: (scene?: string) => CommandRef
const debugTime: (time: { day?: number; period?: string }) => CommandRef
const debugTurn: (turn: number) => CommandRef
const debugGo: (location: string) => CommandRef
```

Each one builds the command above, ready for [`apply`](/docs/reference/commands#apply) or a [runner](/docs/reference/runner).

## A worked example

Say you want to test a chat with Ava in the [showcase](/docs/guide/showcase)'s café, a few days in, with money in the player's pocket and Ava already a friend, without playing moving day to get there:

```ts
import { apply, startingState, type CommandRef, type Game } from '@ifloom/engine'
import { where } from '@ifloom/plugin-places'
import { debugGo, debugScene, debugHeld, debugStat, debugTime, debugTurn, debugKv } from '@ifloom/plugin-debug'

declare const game: Game // the showcase, built with debug()

let state = startingState(game) // moving day, behind a lock that denies '*'

const set = (command: CommandRef) => (state = apply(state, game, command).state)
set(debugStat('coins', 40))
set(debugKv('catName', 'Biscuit'))
set(debugHeld('item:sandwich', 2))
set(debugStat('friendship', 25, 'character:ava'))   // a stat declared of: 'character'
set(debugTurn(4))
set(debugTime({ day: 4, period: 'afternoon' }))      // the game has the calendar
set(debugGo('cafe'))                                  // and the places plugin
set(debugScene('ava.hi'))

state.stats.coins    // 40
where(state)         // 'cafe'
state.sceneId        // 'ava.hi'
state.turn           // 4

apply(state, game, debugStat('luck', 3)).reason     // 'There is no stat called luck.'
apply(state, game, debugStat('friendship', 5, 'character:ghost')).reason
// 'There is nobody and nothing called character:ghost.'
apply(state, game, debugStat('friendship', 5)).reason // 'That is not whose friendship it is.'
apply(state, game, debugGo('moon')).reason           // 'There is no location called moon.'
apply(state, game, debugHeld('item:sandwich', NaN)).reason // 'That needs a number.'
apply(state, game, debugTime({ period: 'noon' })).reason
// 'A day is a whole number from 0, and a period one of morning, afternoon, evening, night, late.'
apply(state, game, debugTurn(-1)).reason            // 'A turn is a whole number from 0.'
```

The debug commands don't change the [phase](/docs/reference/state#phase), so the showcase's moving-day lock still stops ordinary commands here. A test that wants to play on from this point can start from `{ ...startingState(game), phase: 'open', sceneId: null }` instead, as the showcase's own `probes` do.

A test does the same to start a scene from the state it needs. In the [React UI](/docs/react), the debug card sends these commands from a form.

## Strings

These are the plugin's lines in the [strings table](/docs/reference/strings#plugins-strings). A game rewords them by their full key. `{id}` is the name that was given, and `{periods}` lists the calendar's periods, separated by commas.

| Key | English |
|---|---|
| `debug/noSuchStat` | `There is no stat called {id}.` |
| `debug/noSuchEntity` | `There is nobody and nothing called {id}.` |
| `debug/notTheirs` | `That is not whose {id} it is.` |
| `debug/cantHold` | `{id} can’t hold things.` |
| `debug/noSuchPlace` | `There is no location called {id}.` |
| `debug/noPlaces` | `This game has no places.` |
| `debug/noSuchScene` | `There is no scene called {id}.` |
| `debug/badValue` | `A kv key holds true, false, a number or a word.` |
| `debug/notANumber` | `That needs a number.` |
| `debug/badTime` | `A day is a whole number from 0, and a period one of {periods}.` |
| `debug/noCalendar` | `This game has no calendar.` |
| `debug/notATurn` | `A turn is a whole number from 0.` |

## The view

`view(state, game).plugins.debug` is a `DebugView`, with what a debugger wants on screen.

The [React UI](/docs/react) draws it with [`DebugCard`](/docs/react/components#debugcard), and [`useDebug`](/docs/react/components#usedebug) gives the same data and the debug commands with no markup.

### DebugView

```ts
type DebugView = {
  locks: { reason: string; deny: string[] }[]
  fired: Record<string, number>
  seed: number
}
```

| Field | What it is |
|---|---|
| `locks` | Every [lock](/docs/reference/locks) whose `when` holds now, in the order the game lists them, with its reason and what it denies. A lock with `effect` is listed whenever its `when` holds, even if it stops no command right now. |
| `fired` | The [triggers](/docs/reference/triggers) that have fired, with the turn each last fired on. It's a copy of [`state.fired`](/docs/reference/state). |
| `seed` | The save's seed, which every [draw](/docs/reference/random) is hashed from. |

## Gotchas

- **A number must be a number.** `to: '5'`, `to: ''` or `to: null` in a command written by hand is refused with `debug/notANumber`, and so are `NaN` and `Infinity`.
- **A stat is held to its range** as the game declares it, so `debugStat('coins', 5000)` gives 999 in the showcase, where coins have `max: 999`. To test past the ceiling, raise the ceiling.
- **No rule is asked.** `debug/stat` writes the value into the state itself, held to the stat's range. It doesn't go through a `stat` effect, so the game's [`rules.onStat`](/docs/reference/rules#onstat) never sees the change.
- **The stat must be the owner's.** With no `of`, it has to be one of the player's stats. With `of`, it has to be one declared on that entity's kind. Otherwise the command is refused with `That is not whose friendship it is.` (`debug/notTheirs`).
- **A kv key isn't checked.** Any key is set, including a misspelt one.
- **A `custom` entry in [`rules.commands`](/docs/reference/rules#commands) takes over the debug commands too,** as it does every plugin command.
- **Never give the player a way to send these.** A debug command in a scene's choices or a game action would work in any build that still lists the plugin. Keep the plugin out of release builds, and keep the commands out of content.

## See it in an example

Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) adds `debug()` only when `withDebug` is set, and [`examples/showcase/src/main.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/main.tsx) sets it from `import.meta.env.DEV`. The test `has the debugger only when built with it` in [`examples/showcase/tests/showcase.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/showcase.test.ts) checks both builds.
