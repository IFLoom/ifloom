---
title: "Debug"
---
`@ifloom/plugin-debug` lets you change the game state by hand while you test. You can set a stat (the player's, or a character's or any entity's), set a variable, give the player an item, put a scene on screen, set the [calendar](/docs/plugins/calendar)'s clock or the turn, and put the player anywhere on the [places](/docs/plugins/places) map.

You'd want it while you build and test a game, so you can get straight to the state you want to look at without playing up to it. It's for you, not the player, so leave it out of release builds.

To add it, list `@ifloom/plugin-debug` in your game's `package.json` and add `debug()` to the game's `plugins` in development builds only. [Leave it out of release builds](#leave-it-out-of-release-builds) shows how.

```ts
import {
  debug, setStat, setVariable, setItem, jumpTo, setTime, setTurn, goTo,
  type DebugView,
} from '@ifloom/plugin-debug'
```

Every command it adds sets [`ignoresLocks`](/docs/reference/plugins#commands-outside-the-story), so it works in any stretch of the game, including an intro that only moves through its scenes. None of them pays a cost or needs an exit. The [React UI](/docs/react) draws a [debug panel](/docs/react/components#debugpanel) for it when the game has it.

## Install

Add the package beside the engine. See [Adding one](/docs/plugins#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-debug": "0.0.0"
  }
}
```

## Leave it out of release builds

The plugin is only in a game whose `plugins` list has it. If you add it in development builds and leave it out of release builds, its commands, strings and view aren't there in the release. A debug command sent to a release build is refused like any command no plugin has.

With Vite, `import.meta.env.DEV` is `true` under `vite` and `false` under `vite build`, and the bundler drops the branch that's never taken:

```ts
import { loadGame, type Pack, type Plugin } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'
import { debug } from '@ifloom/plugin-debug'

declare const town: Pack // your content

const base: Plugin[] = [calendar(), places({ start: 'flat' }), quests()]

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  plugins: [...base, ...(import.meta.env.DEV ? [debug()] : [])],
})
```

The [showcase](/docs/guide/showcase) does the same with a `withDebug` option on the function that builds its game.

A save made with the plugin loads in a build without it. The plugin keeps no state, so nothing in the save depends on it. Its version is still recorded in the save's [`meta.plugins`](/docs/reference/saves#savemeta), so a release build lists `debug` in [`missingPlugins`](/docs/reference/saves#loadedsave) for a save made in development. Anything you set by hand is still in the save, of course.

## debug

```ts
function debug(): DefinedPlugin<null>
```

The plugin, with the id `debug`. It has no state of its own. Call it once, when you build the game.

It lists `cooperates: ['calendar', 'places']` (see [`cooperates`](/docs/reference/plugins#cooperates)). `debug/time` sets the [calendar](/docs/plugins/calendar)'s clock when the game has one, and `debug/go` moves the player on the [places](/docs/plugins/places) map when the game has it. Each is refused when its partner is missing.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'debug/stat', with: { stat, to, of? } }` | `setStat(stat, to, of?)` | Puts a [stat](/docs/reference/stats) at a value, held to its range. It writes the state directly rather than running the [`setStat`](/docs/reference/effects#setstat) effect. With `of`, it sets an [entity](/docs/reference/entities)'s stat, so `of: 'character:ava'` sets Ava's friendship. |
| `{ type: 'custom', name: 'debug/variable', with: { key, value } }` | `setVariable(key, value)` | Sets a [variable](/docs/reference/state#flags) to `true`, `false`, a number or a word. |
| `{ type: 'custom', name: 'debug/item', with: { item, count } }` | `setItem(item, count)` | Sets how many of an item the player has. Below 0 counts as 0. |
| `{ type: 'custom', name: 'debug/scene', with: { scene } }` | `jumpTo(scene?)` | Puts a scene on screen. With no `scene`, it closes the one that's open. |
| `{ type: 'custom', name: 'debug/time', with: { day?, period? } }` | `setTime({ day?, period? })` | Sets the [calendar](/docs/plugins/calendar)'s clock, through its [`calendar/set`](/docs/plugins/calendar#effects) effect. `day` counts from 0. A half you leave out stays as it is. |
| `{ type: 'custom', name: 'debug/turn', with: { turn } }` | `setTurn(turn)` | Sets [`state.turn`](/docs/reference/state#turn), how many turns have passed. |
| `{ type: 'custom', name: 'debug/go', with: { location } }` | `goTo(location)` | Puts the player in a place, through the places plugin's [`places/move`](/docs/plugins/places#effects) effect, which closes any scene. |

A command is refused, with a line from [Strings](#strings), when:

- the game has no such stat, item, scene or place;
- `debug/stat`'s `of` names no entity in the game, or the stat isn't one the owner has (see [Gotchas](#gotchas));
- the number given to `debug/stat` or `debug/item` isn't a finite number;
- a variable's value isn't one a variable can hold;
- the turn isn't a whole number from 0;
- the day isn't a whole number from 0, or the period isn't one of the calendar's own periods (its [`calendar/periods`](/docs/plugins/calendar#queries) query).

In a game with no calendar, `debug/time` is refused with `This game has no calendar.` In a game without the places plugin, `debug/go` is refused with `This game has no places.` Whether a place exists is asked of the places plugin's [`places/known`](/docs/plugins/places#queries) query.

### What they skip

The commands set the state and nothing else, so you can get to the state you want to test without playing up to it. That also means:

- **No cost.** Nothing is paid, and no time passes except what `debug/time` and `debug/turn` set.
- **No locks.** A [lock](/docs/reference/locks) never stops them, even one that denies `'*'`.
- **No exit for `debug/go`.** It ignores a place's [`locked`](/docs/plugins/places#locationdef) entries, opening hours included, and runs nothing on arrival. It's a [`places/move`](/docs/plugins/places#effects), so the places plugin's [`arrive`](/docs/plugins/places#placesoptions) option doesn't run.
- **No turn ends.** `debug/time` moves the calendar's clock and leaves [`state.turn`](/docs/reference/state#turn) alone. `debug/turn` changes the counter and leaves the calendar's clock alone. Neither runs [`rules.turn`](/docs/reference/rules#turn), [`rules.onTurn`](/docs/reference/rules#onturn) or any plugin's `turn` [hook](/docs/reference/plugins#hooks), and neither puts the [`resets`](/docs/reference/rules#resets) variables back. To test a night, use the calendar's real [`sleep()`](/docs/plugins/calendar#commands) or a [`turn`](/docs/reference/effects#turn) effect.
- **`debug/scene` replaces any open scene.** The [`scene`](/docs/reference/commands#scene) command refuses while a scene is open, but this one doesn't.

They still go through [`apply`](/docs/reference/commands#apply) like any command. Once one has run, [triggers](/docs/reference/triggers) fire, the scene left on screen is counted as seen, and every plugin's `after` hook runs. Setting a variable that a trigger watches fires that trigger.

### Helpers

```ts
import type { Command, FlagValue } from '@ifloom/engine'

const setStat: (stat: string, to: number, of?: string) => Command
const setVariable: (key: string, value: FlagValue) => Command
const setItem: (item: string, count: number) => Command
const jumpTo: (scene?: string) => Command
const setTime: (time: { day?: number; period?: string }) => Command
const setTurn: (turn: number) => Command
const goTo: (location: string) => Command
```

Each one builds the command above, ready for [`apply`](/docs/reference/commands#apply) or a [runner](/docs/reference/runner).

## A worked example

Say you want to test a chat with Ava in the [showcase](/docs/guide/showcase)'s café, a few days in, with money in the player's pocket and Ava already a friend, without playing moving day to get there:

```ts
import { apply, startingState, type Command, type Game } from '@ifloom/engine'
import { where } from '@ifloom/plugin-places'
import { goTo, jumpTo, setItem, setStat, setTime, setTurn, setVariable } from '@ifloom/plugin-debug'

declare const game: Game // the showcase, built with debug()

let state = startingState(game) // moving day, behind a lock that denies '*'

const set = (command: Command) => (state = apply(state, game, command).state)
set(setStat('coins', 40))
set(setVariable('catName', 'Biscuit'))
set(setItem('sandwich', 2))
set(setStat('friendship', 25, 'character:ava'))   // a stat declared of: 'character'
set(setTurn(4))
set(setTime({ day: 4, period: 'afternoon' }))      // the game has the calendar
set(goTo('cafe'))                                  // and the places plugin
set(jumpTo('ava.hi'))

state.stats.coins    // 40
where(state)         // 'cafe'
state.sceneId        // 'ava.hi'
state.turn           // 4

apply(state, game, setStat('luck', 3)).refused     // 'There is no stat called luck.'
apply(state, game, setStat('friendship', 5, 'character:ghost')).refused
// 'There is nobody and nothing called character:ghost.'
apply(state, game, setStat('friendship', 5)).refused // 'That is not whose friendship it is.'
apply(state, game, goTo('moon')).refused           // 'There is no location called moon.'
apply(state, game, setItem('sandwich', NaN)).refused // 'That needs a number.'
apply(state, game, setTime({ period: 'noon' })).refused
// 'A day is a whole number from 0, and a period one of morning, afternoon, evening, night, late.'
apply(state, game, setTurn(-1)).refused            // 'A turn is a whole number from 0.'
```

The debug commands don't change the [phase](/docs/reference/state#phase), so the showcase's moving-day lock still stops ordinary commands here. A test that wants to play on from this point can start from `{ ...startingState(game), phase: 'open', sceneId: null }` instead, as the showcase's own `probes` do.

A test does the same to start a scene from the state it needs. In the [React UI](/docs/react), the debug panel sends these commands from a form.

## Strings

These are the plugin's lines in the [strings table](/docs/reference/strings#plugins-strings). A game rewords them by their full key. `{id}` is the name that was given, and `{periods}` lists the calendar's periods, separated by commas.

| Key | English |
|---|---|
| `debug/noSuchStat` | `There is no stat called {id}.` |
| `debug/noSuchEntity` | `There is nobody and nothing called {id}.` |
| `debug/notTheirs` | `That is not whose {id} it is.` |
| `debug/noSuchItem` | `There is no item called {id}.` |
| `debug/noSuchPlace` | `There is no location called {id}.` |
| `debug/noPlaces` | `This game has no places.` |
| `debug/noSuchScene` | `There is no scene called {id}.` |
| `debug/badValue` | `A variable holds true, false, a number or a word.` |
| `debug/notANumber` | `That needs a number.` |
| `debug/badTime` | `A day is a whole number from 0, and a period one of {periods}.` |
| `debug/noCalendar` | `This game has no calendar.` |
| `debug/notATurn` | `A turn is a whole number from 0.` |

## The view

`view(state, game).plugins.debug` is a `DebugView`, with what a debugger wants on screen.

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
- **A stat is held to its range** as the game declares it, so `setStat('coins', 5000)` gives 999 in the showcase, where coins have `max: 999`. To test past the ceiling, raise the ceiling.
- **No rule is asked.** `debug/stat` writes the value into the state itself, held to the stat's range. It doesn't go through the `setStat` effect, so the game's [`rules.onStat`](/docs/reference/rules#onstat) never sees the change.
- **The stat must be the owner's.** With no `of`, it has to be one of the player's stats. With `of`, it has to be one declared on that entity's kind. Otherwise the command is refused with `That is not whose friendship it is.` (`debug/notTheirs`).
- **A variable's key isn't checked.** Any key is set, including a misspelt one.
- **A `custom` entry in [`rules.commands`](/docs/reference/rules#commands) takes over the debug commands too,** as it does every plugin command.
- **Never give the player a way to send these.** A debug command in a scene's choices or a game action would work in any build that still lists the plugin. Keep the plugin out of release builds, and keep the commands out of content.

## See it in an example

Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) adds `debug()` only when `withDebug` is set, and [`examples/showcase/src/main.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/main.tsx) sets it from `import.meta.env.DEV`. The test `has the debugger only when built with it` in [`examples/showcase/tests/showcase.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/showcase.test.ts) checks both builds.
