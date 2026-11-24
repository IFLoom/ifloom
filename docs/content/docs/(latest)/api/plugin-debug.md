---
title: "@ifloom/plugin-debug"
description: "Every export of @ifloom/plugin-debug and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-debug` and `@ifloom/plugin-debug/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-debug

- Functions: [`debug`](#debug)
- Types: [`DebugView`](#debugview)

### debug

Function. Explained in [Debug](/docs/plugins/debug#debug).

Returns the debug plugin, for the game's `plugins` in development builds only. Its commands ignore locks, need no
exit and pay no cost, and a release build leaves the plugin out.

Its helpers write its commands, such as `debug.stat('coins', 10)`. It cooperates with the calendar and places, which
`debug/time` and `debug/go` need.

```ts shape
import { debug } from '@ifloom/plugin-debug'
function debug(): DefinedPlugin<null, DebugView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`DebugView`](#debugview).

| Helper | Signature | Description |
|---|---|---|
| `debug.stat` | `(stat: string, to: number, of?: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `debug/stat` command, which sets the stat to `to`, clamped to its range. With `of`, it sets the entity's stat. |
| `debug.kv` | `(key: string, to:` [`KvValue`](/docs/api/engine#kvvalue)`):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `debug/kv` command, which sets the kv key to `to`. |
| `debug.held` | `(entity: string, to: number, at?: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `debug/held` command, which sets how many of the thing the holder `at` holds. `'you'` if `at` is left out. |
| `debug.scene` | `(scene?: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `debug/scene` command, which opens the scene, or closes the open scene when none is named. |
| `debug.time` | `(time: { day?: number; period?: string }):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `debug/time` command, which sets the calendar's day and period without ending a turn. It's refused without the calendar. |
| `debug.turn` | `(turn: number):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `debug/turn` command, which sets the turn count without running any turn's rules. |
| `debug.go` | `(location: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `debug/go` command, which moves the player to the location with no exit needed. It's refused without places. |

### DebugView

Type. Explained in [Debug](/docs/plugins/debug#debugview).

The debug readout as the developer sees it, in `view.plugins.debug`. It lists the locks that are on, the triggers that have fired and the seed.

```ts shape
import type { DebugView } from '@ifloom/plugin-debug'
type DebugView = {
  locks: { reason: string; deny: string[] }[]
  fired: Record<string, number>
  seed: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `locks` | `{ reason: string; deny: string[] }[]` |  |  | The game's locks whose `when` holds now, each with its reason and the commands it denies. |
| `fired` | `Record<string, number>` |  |  | The triggers that have fired, each id mapped to the turn it last fired on. |
| `seed` | `number` |  |  | The save's seed, which every random draw is hashed from. |

## @ifloom/plugin-debug/react

- Functions: [`useDebug`](#usedebug)
- Constants: [`DEBUG_WORDS`](#debug_words), [`DebugCard`](#debugcard), [`debugUi`](#debugui)
- Types: [`DebugControls`](#debugcontrols)

### DEBUG_WORDS

Const.

The debug plugin's words in English, keyed by name. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { DEBUG_WORDS } from '@ifloom/plugin-debug/react'
const DEBUG_WORDS: {
  closeScene: 'Close the scene'
  debug: 'Debug'
  debugGo: 'Go'
  debugHeld: 'Held'
  debugKv: 'kv key'
  debugLog: 'Log'
  debugScene: 'Scene'
  debugSet: 'Set'
  debugStat: 'Stat'
  debugStatOf: 'Stat of'
  debugState: 'State'
  debugTime: 'Time'
  debugTurn: 'Turn'
  debugWhy: 'Why not'
  greyedOut: 'Greyed out'
  locksOn: 'Locks on'
  noneOn: 'None.'
  nothingGreyed: 'Nothing.'
  seed: 'seed {seed}'
  set: 'Set'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `closeScene` | `'Close the scene'` |  |  | The label of the button that closes the open scene. |
| `debug` | `'Debug'` |  |  | The title of the debug card. |
| `debugGo` | `'Go'` |  |  | The label of the form that moves the player to a location, shown only with the places plugin. |
| `debugHeld` | `'Held'` |  |  | The label of the form that sets how many of an entity the player holds. |
| `debugKv` | `'kv key'` |  |  | The label of the form that sets a kv key. |
| `debugLog` | `'Log'` |  |  | The label of the tab with the command log. |
| `debugScene` | `'Scene'` |  |  | The label of the form that opens a scene. |
| `debugSet` | `'Set'` |  |  | The label of the tab with the forms that set the state. |
| `debugStat` | `'Stat'` |  |  | The label of the form that sets a stat. |
| `debugStatOf` | `'Stat of'` |  |  | The label of the form that sets an entity's stat. |
| `debugState` | `'State'` |  |  | The label of the tab that shows the state. |
| `debugTime` | `'Time'` |  |  | The label of the form that sets the time. |
| `debugTurn` | `'Turn'` |  |  | The label of the form that sets the turn. |
| `debugWhy` | `'Why not'` |  |  | The label of the tab that lists the locks and each disabled button's reason. |
| `greyedOut` | `'Greyed out'` |  |  | The heading over the list of disabled buttons and their reasons. |
| `locksOn` | `'Locks on'` |  |  | The heading over the list of locks that are on. |
| `noneOn` | `'None.'` |  |  | The line the locks list shows while no lock is on. |
| `nothingGreyed` | `'Nothing.'` |  |  | The line the disabled list shows while every button can be used. |
| `seed` | `'seed {seed}'` |  |  | The note that shows the save's seed, with `{seed}`. |
| `set` | `'Set'` |  |  | The label of each form's submit button. |

### DebugCard

Const. Explained in [Debug](/docs/plugins/debug#debugcard).

Renders the debug card from `view.plugins.debug`, with forms for the debug commands, the locks, the disabled
buttons' reasons, the state, the log and undo and redo. A preset styles its `debug` and `debug-*` parts.

It renders nothing in a game built without the plugin.

```ts shape
import { DebugCard } from '@ifloom/plugin-debug/react'
const DebugCard: ComponentType<{ className?: string; }>
```

### DebugControls

Type.

The debug plugin's view with the refused buttons, the state, the command log and undo and redo, as `useDebug`
returns it. Send the plugin's helpers with `useGame().send`, such as `send(debug.stat('coins', 50))`.

```ts shape
import type { DebugControls } from '@ifloom/plugin-debug/react'
type DebugControls = {
  locks: { reason: string; deny: string[] }[]
  fired: Record<string, number>
  seed: number
  greyed: RenderedChoice[]
  state: GameState
  log: Command[]
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `locks` | `{ reason: string; deny: string[] }[]` |  |  | The game's locks whose `when` holds now, each with its reason and the commands it denies. |
| `fired` | `Record<string, number>` |  |  | The triggers that have fired, each id mapped to the turn it last fired on. |
| `seed` | `number` |  |  | The save's seed, which every random draw is hashed from. |
| `greyed` | [`RenderedChoice[]`](/docs/api/engine#renderedchoice) |  |  | The disabled buttons on screen, from the actions, the scene's choices and the cast's people here. |
| `state` | [`GameState`](/docs/api/engine#gamestate) |  |  | The runner's whole game state. |
| `log` | [`Command[]`](/docs/api/engine#command) |  |  | The commands the runner has run since the start, in order. |
| `canUndo` | `boolean` |  |  | True when the runner has a state to go back to. |
| `canRedo` | `boolean` |  |  | True when the runner has an undone state to go forward to. |
| `undo` | `() => void` |  |  | Goes back a state, as `runner.undo()` does. |
| `redo` | `() => void` |  |  | Goes forward a state, as `runner.redo()` does. |

### debugUi

Const. Explained in [Debug](/docs/plugins/debug#debugui).

The debug plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds the `DebugCard` to the end of
the story, and the plugin's words.

It renders nothing in a build without the plugin, so a game can list it in every build.

```ts shape
import { debugUi } from '@ifloom/plugin-debug/react'
const debugUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useDebug

Function. Explained in [Debug](/docs/plugins/debug#usedebug).

Returns the debug plugin's view with the runner's state, log and undo controls from the running game, or null in a
game without the plugin. It re-renders when the snapshot changes. `DebugCard` renders from it.

```ts shape
import { useDebug } from '@ifloom/plugin-debug/react'
function useDebug(): DebugControls | null
```

Uses: [`DebugControls`](#debugcontrols).
