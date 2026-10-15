# Debug

`@ifloom/plugin-debug` is a hand on the game state while you test: set a stat (the player's, or a character's or any entity's) or a variable, give the player an item, put a scene on screen, set the [calendar](/plugins/calendar)'s clock or the turn, or put the player anywhere on the [places](/plugins/places) plugin's map. It is for the person building the game, never for the player, and a release build leaves it out.

```ts
import {
  debug, setStat, setVariable, setItem, jumpTo, setTime, setTurn, goTo,
  type DebugView,
} from '@ifloom/plugin-debug'
```

Every command it adds sets [`ignoresLocks`](/reference/plugins#commands-outside-the-story), so it works in any stretch of the game, including an intro that only moves through its scenes. None of them pays a cost or needs an exit. The [base UI](/ui/) draws a [debug panel](/ui/components#debugpanel) for it when the game has it.

## Install

Add the package beside the engine. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-debug": "file:../ifloom/packages/plugin-debug"
  }
}
```

## Leave it out of release builds

The plugin is only in a game whose `plugins` list has it. Add it in development builds and leave it out of release builds, and the commands, the strings and the view are simply not there: a debug command sent to a release build is refused like any command no plugin has.

With Vite, `import.meta.env.DEV` is `true` under `vite` and `false` under `vite build`, and the bundler drops the branch that is never taken:

```ts
import { loadGame, type Plugin } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'
import { debug } from '@ifloom/plugin-debug'

const base: Plugin[] = [calendar(), places({ start: 'house' }), quests()]

const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  plugins: [...base, ...(import.meta.env.DEV ? [debug()] : [])],
})
```

**A save made with the plugin loads in a build without it.** The plugin keeps no state, so nothing in the save depends on it. Its version is still recorded in the save's [`meta.plugins`](/reference/saves#savemeta), so a release build lists `debug` in [`missingPlugins`](/reference/saves#loadedsave) for a save made in development. A state you set by hand is still in the save, of course.

## debug

```ts
function debug(): DefinedPlugin<null>
```

The plugin, with the id `debug`. It has no state of its own. Call it once, when the game is built.

It lists `cooperates: ['calendar', 'places']` (see [`cooperates`](/reference/plugins#cooperates)): `debug/time` sets the [calendar](/plugins/calendar)'s clock when the game has one, and `debug/go` moves the player on the [places](/plugins/places) plugin's map when the game has it. Each is refused when its partner is missing.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'debug/stat', with: { stat, to, of? } }` | `setStat(stat, to, of?)` | Puts a [stat](/reference/stats) at a value, held to its range, through the engine's [`setStat`](/reference/effects#setstat) effect. With `of`, an [entity](/reference/entities)'s stat: `of: 'character:ava'` sets Ava's friendship. |
| `{ type: 'custom', name: 'debug/variable', with: { key, value } }` | `setVariable(key, value)` | Sets a [variable](/reference/state#flags) to `true`, `false`, a number or a word. |
| `{ type: 'custom', name: 'debug/item', with: { item, count } }` | `setItem(item, count)` | Sets how many of an item the player has. Below 0 counts as 0. |
| `{ type: 'custom', name: 'debug/scene', with: { scene } }` | `jumpTo(scene?)` | Puts a scene on screen. With no `scene`, closes the one that is open. |
| `{ type: 'custom', name: 'debug/time', with: { day?, period? } }` | `setTime({ day?, period? })` | Sets the [calendar](/plugins/calendar)'s clock, through its [`calendar/set`](/plugins/calendar#effects) effect. `day` counts from 0. Either half left out stays as it is. |
| `{ type: 'custom', name: 'debug/turn', with: { turn } }` | `setTurn(turn)` | Sets [`state.turn`](/reference/state#turn), how many turns have passed. |
| `{ type: 'custom', name: 'debug/go', with: { location } }` | `goTo(location)` | Puts the player in a place, through the [places](/plugins/places) plugin's [`places/move`](/plugins/places#effects) effect, which closes any scene. |

Each is refused, with a line from [Strings](#strings), when the game has no such stat, item, scene or place, when `debug/stat`'s `of` names no entity in the game, when the number `debug/stat` or `debug/item` is given is not a finite number (`NaN` or `Infinity`), when a variable's value is not one a variable holds, when the turn is not a whole number from 0, or when the day is not a whole number from 0 or the period is not one of the calendar's own periods (its [`calendar/periods`](/plugins/calendar#queries) query). In a game with no calendar, `debug/time` is refused with `This game has no calendar.`; in a game without the places plugin, `debug/go` is refused with `This game has no places.` Whether a place exists is asked of the places plugin's [`places/known`](/plugins/places#queries) query.

### What they skip

The commands set the state and nothing else. That is the point: you get to the state you want to test without playing up to it. It also means:

- **No cost.** Nothing is paid, and no time passes, except what `debug/time` and `debug/turn` set.
- **No locks.** A [lock](/reference/locks) never stops them, even one that denies `'*'`.
- **`debug/go` needs no exit,** ignores a place's [`locked`](/plugins/places#locationdef) entries (opening hours included), and runs no arrival: it is a [`places/move`](/plugins/places#effects), so the places plugin's [`arrive`](/plugins/places#placesoptions) option does not run.
- **`debug/time` and `debug/turn` end no turn.** `debug/time` moves the calendar's clock only, and [`state.turn`](/reference/state#turn) stays as it is; `debug/turn` changes the counter only, and the calendar's clock stays as it is. Neither runs [`rules.turn`](/reference/rules#turn), [`rules.onTurn`](/reference/rules#onturn) or any plugin's `turn` [hook](/reference/plugins#hooks), nor puts the [`resets`](/reference/rules#resets) variables back. Use the calendar's real [`sleep()`](/plugins/calendar#commands) to test a night, or a [`turn`](/reference/effects#turn) effect to end a turn.
- **`debug/scene` replaces whatever scene is open.** The [`scene`](/reference/commands#scene) command refuses while one is open; this does not.

They still go through [`apply`](/reference/commands#apply) like any command, so once one has run, [triggers](/reference/triggers) fire, the scene left on screen is counted as seen, and every plugin's `after` hook runs. Setting a variable that a trigger watches fires that trigger.

### Helpers

```ts
const setStat: (stat: string, to: number, of?: string) => Command
const setVariable: (key: string, value: FlagValue) => Command
const setItem: (item: string, count: number) => Command
const jumpTo: (scene?: string) => Command
const setTime: (time: { day?: number; period?: string }) => Command
const setTurn: (turn: number) => Command
const goTo: (location: string) => Command
```

Each writes the command above for you, ready for [`apply`](/reference/commands#apply) or a [runner](/reference/runner).

## A worked example

Testing the market stall on market day, a few days in, with money in the player's pocket, without playing the intro to get there:

```ts
import { apply, startingState, type Command } from '@ifloom/engine'
import { where } from '@ifloom/plugin-places'
import { goTo, jumpTo, setItem, setStat, setTime, setTurn, setVariable } from '@ifloom/plugin-debug'

let state = startingState(game) // still in the intro, behind a lock that denies '*'

const set = (command: Command) => (state = apply(state, game, command).state)
set(setStat('coins', 40))
set(setVariable('marketDay', true))
set(setItem('coffee', 3))
set(setStat('friendship', 25, 'character:ruth'))   // a stat the game declares of: 'character'
set(setTurn(4))
set(setTime({ day: 4, period: 'morning' }))   // the game has the calendar
set(goTo('market'))                           // and the places plugin
set(jumpTo('market.stall'))

state.stats.coins    // 40
where(state)         // 'market'
state.sceneId        // 'market.stall'
state.turn           // 4

apply(state, game, setStat('charm', 3)).refused    // 'There is no stat called charm.'
apply(state, game, setStat('friendship', 5, 'character:ghost')).refused
// 'There is nobody and nothing called character:ghost.'
apply(state, game, goTo('moon')).refused           // 'There is no location called moon.'
apply(state, game, setItem('coffee', NaN)).refused // 'That needs a number.'
apply(state, game, setTime({ period: 'noon' })).refused
// 'A day is a whole number from 0, and a period one of morning, afternoon, evening, night, late.'
apply(state, game, setTurn(-1)).refused            // 'A turn is a whole number from 0.'
```

A test does the same to start a scene from the state it needs. In the [base UI](/ui/), the debug panel sends these commands from a form.

## Strings

The plugin's lines in the [strings table](/reference/strings#plugins-strings). A game rewords them by their full key. `{id}` is the name that was given; `{periods}` lists the calendar's periods, comma-separated.

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

`view(state, game).plugins.debug` is a `DebugView`: what a debugger wants on screen.

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
| `locks` | Every [lock](/reference/locks) whose `when` holds now, in the order the game lists them, with its reason and what it denies. A lock with `effect` is listed whenever its `when` holds, even if it stops no command right now. |
| `fired` | The [triggers](/reference/triggers) that have fired, with the turn each last did: a copy of [`state.fired`](/reference/state). |
| `seed` | The save's seed, which every [draw](/reference/random) is hashed from. |

## Gotchas

- **A number must be a number.** `to: '5'`, `to: ''` or `to: null` in a command written by hand is refused with `debug/notANumber`, as are `NaN` and `Infinity`.
- **A stat is held to its range**, as the game declares it, so `setStat('coins', 500)` on a stat with `max: 99` gives 99. To test past the ceiling, raise the ceiling.
- **No rule is asked.** The value is held to the stat's range, but the game's [`rules.onStat`](/reference/rules#onstat) does not see it: a hand on the state, not a move in play.
- **The stat must be the owner's.** With no `of`, one of the player's stats; with `of`, one declared on that entity's kind. Otherwise it is refused: `That is not whose coins it is.` (`debug/notTheirs`).
- **A variable's key is not checked.** Any key is set, including a misspelt one.
- **A `custom` entry in [`rules.commands`](/reference/rules#commands) takes over the debug commands too,** as it does every plugin command.
- **Never give the player a way to send these.** A debug command in a scene's choices or a game action would work in a release build that still lists the plugin. Keep the plugin out of release builds, and the commands out of content.
