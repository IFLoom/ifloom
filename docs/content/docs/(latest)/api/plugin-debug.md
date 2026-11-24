---
title: "@ifloom/plugin-debug"
description: "Every export of @ifloom/plugin-debug and its /react subpath, if it has one: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-debug` and `@ifloom/plugin-debug/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-debug

- Functions: [`debug`](#debug)
- Types: [`DebugView`](#debugview)

### debug

Function. Explained in [Debug](/docs/plugins/debug#debug).

The plugin, with its helpers on it: `debug()` makes the plugin for the
game's `plugins`, and content is written with `debug.stat('coins', 10)`.

```ts shape
import { debug } from '@ifloom/plugin-debug'
function debug(): DefinedPlugin<null, DebugView>
```

| Helper | Signature | Description |
|---|---|---|
| `debug.stat` | `(stat: string, to: number, of?: string): CommandRef` |  |
| `debug.kv` | `(key: string, to: KvValue): CommandRef` |  |
| `debug.held` | `(entity: string, to: number, at?: string): CommandRef` |  |
| `debug.scene` | `(scene?: string): CommandRef` |  |
| `debug.time` | `(time: { day?: number; period?: string }): CommandRef` |  |
| `debug.turn` | `(turn: number): CommandRef` |  |
| `debug.go` | `(location: string): CommandRef` |  |

### DebugView

Type. Explained in [Debug](/docs/plugins/debug#debugview).

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
| `locks` | `{ reason: string; deny: string[] }[]` |  |  | Every lock whose `when` holds now, with what it stops and why. |
| `fired` | `Record<string, number>` |  |  | Triggers that have fired, with the turn each last did. |
| `seed` | `number` |  |  |  |

## @ifloom/plugin-debug/react

- Functions: [`useDebug`](#usedebug)
- Constants: [`DEBUG_WORDS`](#debug_words), [`DebugCard`](#debugcard), [`debugUi`](#debugui)
- Types: [`DebugControls`](#debugcontrols)

### DEBUG_WORDS

Const.

The debug plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

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
| `closeScene` | `'Close the scene'` |  |  |  |
| `debug` | `'Debug'` |  |  |  |
| `debugGo` | `'Go'` |  |  |  |
| `debugHeld` | `'Held'` |  |  |  |
| `debugKv` | `'kv key'` |  |  |  |
| `debugLog` | `'Log'` |  |  |  |
| `debugScene` | `'Scene'` |  |  |  |
| `debugSet` | `'Set'` |  |  |  |
| `debugStat` | `'Stat'` |  |  |  |
| `debugStatOf` | `'Stat of'` |  |  |  |
| `debugState` | `'State'` |  |  |  |
| `debugTime` | `'Time'` |  |  |  |
| `debugTurn` | `'Turn'` |  |  |  |
| `debugWhy` | `'Why not'` |  |  |  |
| `greyedOut` | `'Greyed out'` |  |  |  |
| `locksOn` | `'Locks on'` |  |  |  |
| `noneOn` | `'None.'` |  |  |  |
| `nothingGreyed` | `'Nothing.'` |  |  |  |
| `seed` | `'seed {seed}'` |  |  |  |
| `set` | `'Set'` |  |  |  |

### DebugCard

Const. Explained in [Debug](/docs/plugins/debug#debugcard).

The debug card, for a game built with `@ifloom/plugin-debug`: set things by
hand, see the locks that are on and every greyed-out button's reason, read
the state and the command log, step back and forward. Draws nothing in a
game built without the plugin. A thin default on `useDebug`.

```ts shape
import { DebugCard } from '@ifloom/plugin-debug/react'
const DebugCard: ComponentType<{ className?: string; }>
```

### DebugControls

Type.

What `useDebug` returns: the debug plugin's view, what's greyed out, the
state and the log, and undo and redo. Its commands are the plugin's
helpers, sent with `useGame().send`: `send(debug.stat('coins', 50))`.

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
| `locks` | `{ reason: string; deny: string[] }[]` |  |  | Every lock whose `when` holds now, with what it stops and why. |
| `fired` | `Record<string, number>` |  |  | Triggers that have fired, with the turn each last did. |
| `seed` | `number` |  |  |  |
| `greyed` | `RenderedChoice[]` |  |  | Every greyed-out button on screen: the actions, the scene's choices and each person's buttons. |
| `state` | `GameState` |  |  | The whole game state. |
| `log` | `Command[]` |  |  | The commands run since the start, in order. |
| `canUndo` | `boolean` |  |  |  |
| `canRedo` | `boolean` |  |  |  |
| `undo` | `() => void` |  |  |  |
| `redo` | `() => void` |  |  |  |

### debugUi

Const. Explained in [Debug](/docs/plugins/debug#debugui).

The debug plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: the `DebugCard` at the end of the story, and the debug
card's words. It does nothing in a build without the plugin, so it can be
listed in every build.

```ts shape
import { debugUi } from '@ifloom/plugin-debug/react'
const debugUi: PluginUi
```

### useDebug

Function. Explained in [Debug](/docs/plugins/debug#usedebug).

The debug plugin's view with its commands, or null in a game without the plugin. `DebugCard` is drawn from it.

```ts shape
import { useDebug } from '@ifloom/plugin-debug/react'
function useDebug(): DebugControls | null
```
