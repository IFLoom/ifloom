---
title: "Debug"
description: "Reference for @ifloom/plugin-debug: commands that ignore locks and set a stat, a kv key, what a holder holds, the scene, the clock, the turn or the location, the readout view, React UI, helpers and strings."
---
`@ifloom/plugin-debug` adds commands that set the state by hand while you test, so you reach the state you want to look at without playing up to it. Each command ignores [locks](/docs/reference/locks), pays no cost and needs no exit, and the view adds a readout of the locks that are on, the triggers that have fired and the seed. The plugin is for you, so a release build leaves it out, where the [cheats](/docs/reference/plugins/cheats) plugin gives the player cheats in the release. It needs no other plugin, and it [cooperates](/docs/reference/plugins#cooperates) with the [calendar](/docs/reference/plugins/calendar) for the clock and with [places](/docs/reference/plugins/places) for the map. [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Debug a game](/docs/how-to/debug-a-game) adds it to development builds only.

In the showcase: `examples/showcase/src/game.ts`, which adds `debug()` only when `withDebug` is set, and `examples/showcase/src/main.tsx`, which sets it from `import.meta.env.DEV`.

```ts
import { debug, type DebugView } from '@ifloom/plugin-debug'
```

## debug

The plugin's factory, which returns the plugin with the id `debug`. It takes no options and keeps no state. Every field of its result is in [`debug`](/docs/api/plugin-debug#debug), and its helpers are listed under [Functions](#functions).

A game has the plugin only while its `plugins` list has it, so a build without it has none of its commands, strings or view, and refuses a debug command as it does any command no plugin has. A save made with the plugin loads in a build without it, since nothing in the save depends on it. The save's [`meta.plugins`](/docs/reference/saves#savemeta) still records it, so [`LoadedSave`](/docs/reference/saves#loadedsave)'s `missingPlugins` lists `debug` in a release build. Anything a debug command set stays in the save.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { debug } from '@ifloom/plugin-debug'
import { places } from '@ifloom/plugin-places'

declare const town: Content

export const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'flat' }), ...(import.meta.env.DEV ? [debug()] : [])],
})
```

## Commands

Every command sets [`ignoresLocks`](/docs/reference/plugin-api#ignoreslocks), so no lock stops it, even one that denies `'*'`, and none pays a cost. They still go through [`apply`](/docs/reference/commands#apply), so after one runs, [triggers](/docs/reference/triggers) fire, the scene left open counts as seen, and every plugin's [`onCommand`](/docs/reference/plugin-api#oncommand) hook runs. No command ends a turn, so neither [`rules.onTurn`](/docs/reference/rules#onturn) nor a plugin's `onTurn` runs, and the [`resets`](/docs/reference/rules#resets) kv keys stay as they are. A refusal comes from [Strings](#strings), where `{id}` is the name given.

### debug/stat

Puts a [stat](/docs/reference/stats) at `to`, held to its range, and with `of` puts an [entity](/docs/reference/glossary#entity)'s stat there.

```ts fragment
{ 'debug/stat': { stat: 'coins', to: 40 } } // debug.stat('coins', 40)
{ 'debug/stat': { stat: 'friendship', to: 25, of: 'character:ava' } } // debug.stat('friendship', 25, 'character:ava')
```

The command writes the value into the state and runs no `stat` effect, so neither the game's [`rules.onStat`](/docs/reference/rules#onstat) nor a plugin's `onStat` sees the change. The plugin refuses it, in this order:

1. With `There is no stat called luck.` (`debug/noSuchStat`) for a stat the game doesn't declare.
2. With `There is nobody and nothing called character:ghost.` (`debug/noSuchEntity`) for an `of` the game doesn't have.
3. With `That is not whose friendship it is.` (`debug/notTheirs`) when the stat isn't the owner's, a stat of the player's with no `of`, or one declared on the entity's kind with one.
4. With `That needs a number.` (`debug/notANumber`) when `to` isn't a finite number, such as `'5'`, `null` or `NaN`.

### debug/kv

Sets a key in the [kv store](/docs/reference/glossary#kv) to `true`, `false`, a number or a word. The plugin refuses any other value, and sets any key, a misspelt one included.

```ts fragment
{ 'debug/kv': { key: 'catName', to: 'Biscuit' } } // debug.kv('catName', 'Biscuit')
```

### debug/held

Sets how many of a [thing](/docs/reference/glossary#thing) a [holder](/docs/reference/glossary#holder) holds, `'you'` if `at` is left out, through the [`entity`](/docs/reference/effects#entity) effect with `to`. A count below 0 counts as 0, and a unique thing is taken from whoever held it.

```ts fragment
{ 'debug/held': { entity: 'item:sandwich', to: 2 } } // debug.held('item:sandwich', 2)
```

The plugin refuses it with `There is nobody and nothing called item:pie.` for a thing the game doesn't have, with `vendor:kiosk can’t hold things.` (`debug/cantHold`) for an `at` that can't hold, and with `That needs a number.` for a `to` that isn't a finite number.

### debug/scene

Opens the scene `id` over any open scene, which the engine's [`scene`](/docs/reference/commands#scene) command refuses to do. With no `id`, it closes the open scene.

```ts fragment
{ 'debug/scene': { id: 'ava.hi' } } // debug.scene('ava.hi')
{ 'debug/scene': {} } // debug.scene()
```

The plugin refuses it with `There is no scene called ava.bye.` (`debug/noSuchScene`) for a scene the game doesn't have.

### debug/time

Sets the calendar's clock through its [`calendar/set`](/docs/reference/plugins/calendar#calendarset) effect. `day` counts from 0, and a half left out stays as it is. The command leaves [`state.turn`](/docs/reference/state#turn) alone.

```ts fragment
{ 'debug/time': { day: 4, period: 'afternoon' } } // debug.time({ day: 4, period: 'afternoon' })
```

The plugin refuses it with `This game has no calendar.` (`debug/noCalendar`) in a game without the calendar. It refuses a day that isn't a whole number from 0, or a period that isn't one of the calendar's, with `A day is a whole number from 0, and a period one of morning, afternoon, evening, night, late.` (`debug/badTime`), where `{periods}` lists the calendar's periods from its `calendar/periods` [query](/docs/reference/plugins/calendar#queries).

### debug/turn

Sets [`state.turn`](/docs/reference/state#turn), the number of turns that have passed, and leaves the calendar's clock alone.

```ts fragment
{ 'debug/turn': { to: 4 } } // debug.turn(4)
```

The plugin refuses it with `A turn is a whole number from 0.` (`debug/notATurn`) for anything else.

### debug/go

Puts the player at the location `id` through the places plugin's [`places/move`](/docs/reference/plugins/places#placesmove) effect, which closes any open scene. It ignores the location's `blocked` entries, opening hours included, and runs nothing on arrival.

```ts fragment
{ 'debug/go': { id: 'cafe' } } // debug.go('cafe')
```

The plugin refuses it with `This game has no places.` (`debug/noPlaces`) in a game without places, and with `There is no location called moon.` (`debug/noSuchPlace`) for a location the places plugin's `places/known` [query](/docs/reference/plugins/places#queries) doesn't know.

## View

### DebugView

The debug readout, in `view.plugins.debug`. Every field is in [`DebugView`](/docs/api/plugin-debug#debugview).

`locks` lists every lock whose `when` holds now, in the order the game declares them, with its reason and what it denies. A lock with `effect` is listed while its `when` holds, even when it stops no command. `fired` is a copy of [`state.fired`](/docs/reference/state#fired), each trigger mapped to the turn it last fired on. `seed` is the save's [seed](/docs/reference/random), which every draw is hashed from.

[Render a debug readout](/docs/how-to/render/player-tools#render-a-debug-readout) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-debug/react` subpath renders a debug card for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### debugUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It adds the [`DebugCard`](#debugcard) to the end of the story. It renders nothing in a build without the plugin, so a game lists it in every build. Its type is in [`debugUi`](/docs/api/plugin-debug#debugui).

### DEBUG_WORDS

The words the debug card uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`DEBUG_WORDS`](/docs/api/plugin-debug#debug_words).

| Key | Meaning |
|---|---|
| `ui.debug` | `Debug`, the card's title. |
| `ui.seed` | `seed {seed}`, the note beside the title. |
| `ui.debugSet`, `ui.debugWhy`, `ui.debugState`, `ui.debugLog` | `Set`, `Why not`, `State` and `Log`, the tabs' labels. |
| `ui.debugStat`, `ui.debugKv`, `ui.debugHeld`, `ui.debugStatOf` | `Stat`, `kv key`, `Held` and `Stat of`, the labels of the forms that set a stat, a kv key, a count held and an entity's stat. |
| `ui.debugGo`, `ui.debugScene`, `ui.debugTime`, `ui.debugTurn` | `Go`, `Scene`, `Time` and `Turn`, the labels of the forms that set the location, the scene, the clock and the turn. |
| `ui.set` | `Set`, each form's button. |
| `ui.closeScene` | `Close the scene`, the button that closes the open scene. |
| `ui.locksOn`, `ui.noneOn` | `Locks on` and `None.`, the heading over the locks and the line while none is on. |
| `ui.greyedOut`, `ui.nothingGreyed` | `Greyed out` and `Nothing.`, the heading over the disabled buttons and the line while there are none. |

### DebugCard

Renders the debug card from [`DebugView`](#debugview) and the runner, for the person testing the game. Its props are in [`DebugCard`](/docs/api/plugin-debug#debugcard).

The heading shows the seed, with undo and redo buttons for the runner's history, disabled while there's nothing to undo or redo. Its four tabs hold:

- **Set**: a form for each command, each showing its refusal beside it. The **Go** form shows only with places, and the **Time** form only with the calendar. The kv key form sends `true`, `false` and numbers as themselves, and a number box left empty is refused with `debug/notANumber`.
- **Why not**: the locks that are on, and every disabled action, choice and person's button on screen with its reason.
- **State**: the whole game state, as JSON.
- **Log**: the [command log](/docs/reference/runner#commandlog), one command a line.

It renders nothing in a game without the plugin. The forms' placeholders are in English and aren't words a game rewords. A game replaces it as `DebugCard` in [`components`](/docs/reference/react/components#components). Its parts are `debug`, `debug-header`, `debug-title`, `debug-seed`, `debug-section`, `debug-form`, `debug-label`, `debug-field`, `debug-error`, `debug-heading`, `debug-list`, `debug-state`, `debug-log` and `button`.

### useDebug

Returns the debug view from the running game with the state, the log and the undo controls, or `null` in a game without the plugin. It re-renders when the snapshot changes. Its signature is in [`useDebug`](/docs/api/plugin-debug#usedebug).

### DebugControls

The value `useDebug` returns, a [`DebugView`](#debugview) with what the debug card shows. Every field is in [`DebugControls`](/docs/api/plugin-debug#debugcontrols).

`greyed` lists the disabled buttons on screen, from the actions, the scene's choices and the people here. `state` is the runner's state, `log` its commands, and `canUndo`, `canRedo`, `undo` and `redo` its history. A component sends a debug command with [`useGame`](/docs/reference/react/components#usegame)'s `send`, such as `send(debug.stat('coins', 50))`.

## Functions

The helpers are properties of `debug` and return its [commands](#commands) as a [`CommandRef`](/docs/reference/custom#commandref), typed:

- **`debug.stat(stat, to, of?)`** returns [`debug/stat`](#debugstat).
- **`debug.kv(key, to)`** returns [`debug/kv`](#debugkv).
- **`debug.held(entity, to, at?)`** returns [`debug/held`](#debugheld).
- **`debug.scene(scene?)`** returns [`debug/scene`](#debugscene).
- **`debug.time({ day?, period? })`** returns [`debug/time`](#debugtime).
- **`debug.turn(turn)`** returns [`debug/turn`](#debugturn).
- **`debug.go(location)`** returns [`debug/go`](#debuggo).

A test sets up a chat with Ava in the café a few days in:

```ts
import { startingState, type Game } from '@ifloom/engine'
import { play } from '@ifloom/engine/testing'
import { debug } from '@ifloom/plugin-debug'

export function atTheCafe(game: Game) {
  return play(
    startingState(game),
    game,
    debug.stat('coins', 40),
    debug.stat('friendship', 25, 'character:ava'),
    debug.time({ day: 4, period: 'afternoon' }),
    debug.go('cafe'),
    debug.scene('ava.hi'),
  )
}
```

## Strings

A game rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings). `{id}` is the name given, and `{periods}` lists the calendar's periods, separated by commas.

| Key | Meaning |
|---|---|
| `debug/noSuchStat` | `There is no stat called {id}.` |
| `debug/noSuchEntity` | `There is nobody and nothing called {id}.` |
| `debug/notTheirs` | `That is not whose {id} it is.` |
| `debug/cantHold` | `{id} can’t hold things.` |
| `debug/noSuchPlace` | `There is no location called {id}.` |
| `debug/noPlaces` | `This game has no places.` |
| `debug/noSuchScene` | `There is no scene called {id}.` |
| `debug/notANumber` | `That needs a number.` |
| `debug/badTime` | `A day is a whole number from 0, and a period one of {periods}.` |
| `debug/noCalendar` | `This game has no calendar.` |
| `debug/notATurn` | `A turn is a whole number from 0.` |

## Caveats

- A stat stays in its declared range, so `debug.stat('coins', 5000)` gives 999 in the showcase, where coins have `max: 999`.
- The commands don't change the `phase` kv key, so a lock on moving day still stops ordinary commands after them.
- A debug command written into a choice or an action works in any build that lists the plugin, so content never sends one.
