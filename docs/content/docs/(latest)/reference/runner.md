---
title: "The runner"
description: "The runner is the one object a UI drives, with undo, a backlog, saves, autosave and a snapshot for its listeners."
---
The runner is the one object a UI drives. It wraps [`apply`](/docs/reference/commands#apply) with undo and redo, a backlog of what was shown, a command log, saving, loading and autosave, and it hands its listeners one value, the [snapshot](#runnersnapshot), whenever any part of it changes. [State, commands and the view](/docs/explanation/state-and-commands#the-runner-adds-what-every-ui-wants) explains why the runner sits beside `apply`, and [Run a game in code](/docs/how-to/run-a-game-in-code) drives one in Node.

In the showcase: `examples/showcase/src/main.tsx`, which makes its runner with `createRunner` and turns on history, the backlog, saves, a profile and an autosave each turn.

```ts
import {
  createRunner, replay,
  type AutosaveOptions, type BacklogEntry, type BacklogOptions, type CommandLog, type HelperRegistry, type HelpersIn,
  type HistoryOptions, type Runner, type RunnerOptions, type RunnerSnapshot,
} from '@ifloom/engine'
```

A runner made with no options keeps only the command log, so it's `apply` plus a subscription. [`browserRunner`](/docs/reference/browser#browserrunner) from `@ifloom/browser` makes one with undo 50 steps deep, saves and a [profile](/docs/reference/profile) in `localStorage`, an autosave each turn and a random seed. The React UI's [`mountGame`](/docs/reference/react#mountgame) and the templates use it.

## Runner

The object [`createRunner`](#createrunner) and `browserRunner` return, which plays one game and keeps what a UI renders from it. Every member is in [`Runner`](/docs/api/engine#runner).

`runner.state` is the state in play, read-only, so every change goes through the runner's members. `log()` returns the [command log](#commandlog), `played()` the time played in milliseconds, counting from the time a loaded save recorded, and `offers` says whether the game turned on `history` and `backlog`, so a menu offers only those.

```ts given
declare const undoButton: HTMLButtonElement

undoButton.disabled = !runner.snapshot().canUndo
undoButton.onclick = () => runner.undo()
const saved = await runner.save('1')
if (!saved.ok) console.warn(saved.reason)
```

To render the backlog and undo, see [Render the backlog and undo](/docs/how-to/render/saves-and-settings#render-the-backlog-and-undo).

### apply

Runs a [`Command`](/docs/reference/commands#command), or a plugin's call in its short form, and returns a [`Result`](/docs/reference/common#result) whose `value` is the next state. A refused command changes nothing, adds no history or log entry and calls no listener.

A [`newGame`](/docs/reference/commands#newgame) command, sent on its own or by a choice such as an ending's Play again, starts a new game in place as [`newGame()`](#newgame) does with no options. The choice's effects, the triggers and the plugins' hooks don't run, because they belong to the run that ended, and the choice isn't counted in [`chosen`](/docs/reference/state#chosen). The settings are the profile's as the runner last read them, since `apply` doesn't wait for a read.

After each command that took, the runner tests the content's [`finished`](/docs/reference/content#content) condition and gives each plugin with a [`profile`](/docs/reference/plugin-api#plugin) provider its turn to update its namespace (see [`profile`](#profile)).

### undo and redo

`undo()` steps back one command and `redo()` forward one, and each returns `false` when it has no step to take. A new command after an undo clears redo. Both do nothing in a runner without `history`, and [`HistoryOptions`](#historyoptions) sets how far back undo reaches.

Undo can't re-roll anything. Every draw is seeded from the save, the turn and a name (see [Randomness](/docs/reference/random)), so the same command from the same state deals the same card.

### view

Returns [`view(state, game)`](/docs/reference/view#view-1) for the state in play, built once per state and with each plugin's view shown its namespace of the profile. Asked again while the state is the same object, it returns the same view, and `snapshot().view` is that object.

The backlog, the React UI and the [audio player](/docs/reference/browser/audio-player) all read `runner.view()` after a command, so the view is built once between them. `apply` writes the backlog from the view a UI last read rather than building it again.

With a `profile`, the runner reads the plugins' namespaces when it's made and follows every write to the profile after that, from itself or anything else. When a namespace a plugin's view reads changes, the runner replaces the cached view with a new object, builds only that plugin's view again, and calls its listeners. The state stays the same object, so a UI that renders only when `runner.state` changes misses the change.

```ts given
await runner.profile?.set('achievements', { earned: ['regular'] })
runner.view() === runner.view() // true: the runner keeps the new view
```

### save, load and restore

`save(slot, name?)` waits for any autosave in progress, then writes the state in play to a slot of the runner's [save store](/docs/reference/saves#saves) with the time played. It resolves to a `Result` holding the save's [`SaveMeta`](/docs/reference/saves#savemeta), and `name` defaults to one made from when and where. It refuses while the game's [`saveable`](/docs/reference/game#saveable) refuses saving, with that entry's reason, so a UI greys its Save button out from [`view.saving`](/docs/reference/view#savingview) first.

`load(slot)` reads a slot through the store, which carries its state forward with [`loadState`](/docs/reference/saves#loadstate). On success the runner plays on from it with a fresh history, backlog and log and the time played the save recorded, and resolves to the [`LoadedSave`](/docs/reference/saves#loadedsave). On a failure the runner is unchanged. `restore(loaded)` plays on from a `LoadedSave` that came from somewhere other than a slot, such as a file read with [`importText`](/docs/reference/saves#saves), as `load` would.

A `load` starts the command log again from the loaded state, so a bug report carries `log()`, whose `start` is that state.

```ts given
const loaded = await runner.load('1')
if (!loaded.ok) console.warn(loaded.reason)
else if (loaded.value.missingPacks.length) console.warn(`Made with mods you don't have: ${loaded.value.missingPacks.join(', ')}`)
```

The refusals are the [saves strings](/docs/reference/strings#saves): `noSaves` without a save store, `emptySlot` for an empty slot, and `notSaved` or `notLoaded` when the driver throws, which `onSaveError` hears about too.

### saves

The save store the runner was made with, or `undefined`. A save menu deletes, exports and imports through it. The runner watches the store, so each write and removal through `runner.saves` updates the snapshot's [`saves`](#saves-1). Like the store, each member answers a `Result` and never rejects. When the driver fails, the member answers the store's [reason](/docs/reference/saves#saves), tells `onSaveError` and leaves the snapshot's `saves` as it was.

### profile

The [profile](/docs/reference/profile) the runner was made with, or `undefined`, for a UI's own namespaces. Unlike the profile itself, it never rejects. A read the driver fails answers `undefined`, a write it fails is dropped, and `onSaveError` hears about each.

The runner writes the player's settings to `core:settings`, and records the time the content's `finished` condition first holds in `core:finished` as `{ at }`, from its `now` clock. It writes `core:finished` once, the first time, and never again in this game or a later one. A runner without a profile records neither.

### setSetting

Changes a [setting](/docs/reference/settings) of either sort after checking the value against its declaration, and returns a `Result` with the value or the same refusal the [`setting`](/docs/reference/commands#setting) command gives.

- **A `play` setting** goes through the `setting` command, so it changes the game in play and the log records it. When it takes, the runner also writes it to the profile's `core:settings`, so the next new game starts with it.
- **A `ui` setting** goes to the profile's `core:settings` and never touches the state. The snapshot's `settings` shows it at once, the runner calls its listeners, and the write finishes in the background. Without a profile, the runner refuses it with the [`noProfile`](/docs/reference/strings#settings) string.

```ts given
const result = runner.setSetting('textSize', 'large')
if (!result.ok) console.warn(result.reason)
```

### newGame

Starts a new game in place, with a fresh history, backlog and log and no time played, and calls the listeners. It takes the [`StartOptions`](/docs/reference/commands#startoptions) that [`startingState`](/docs/reference/commands#startingstate) takes. Without `settings`, it uses the player's, from the profile or else from the game in play, and without `seed` it picks a random one.

The profile carries on, so settings, `core:finished`, unlocks and achievements stay. Undo can't go back past a new game. To carry things over into New Game+, pass the state in play as `carry`, as [Offer New Game+](/docs/how-to/offer-new-game-plus) does.

```ts given
declare const again: HTMLButtonElement

again.onclick = () => void runner.newGame()
```

### settled

Resolves once every autosave and profile write so far has been written or has failed and been reported, the runner has read the profile for the settings and the plugins' views, and it has listed the saves. `browserRunner` waits for it before it returns. A test that reads an autosave back awaits it first.

### subscribe

Calls a listener with each new [snapshot](#runnersnapshot) and returns the function that stops it. The runner calls it after every change of state (a command, an undo, a redo, a load or a new game), and with the same state when a `ui` setting changes, when a plugin's view reads a changed profile namespace, when the saves list changes and when a helper reports.

### setHelper

Puts what a [helper](/docs/reference/glossary#helper) reports into the snapshot's `helpers` under its id, and calls the listeners. `undefined` takes it out, and the same value again does nothing. The unlocks plugin's [`startUnlocks`](/docs/reference/plugins/unlocks#startunlocks) reports whether a code is being checked as `helpers.unlocks`, so every UI reads it from the snapshot. A helper types its report in [`HelperRegistry`](#helperregistry).

## RunnerSnapshot

One value with everything a UI renders from the runner: the state, its view, the settings, the backlog, undo and redo, the saves and the helpers' reports. Every field is in [`RunnerSnapshot`](/docs/api/engine#runnersnapshot).

`runner.snapshot()` returns the snapshot for now, a new object whenever any part changes and the same object until then. React's `useSyncExternalStore`, Vue's `shallowRef` and a Svelte store all compare it by identity, so a UI that keeps it whole renders again exactly when something changed. The snapshot and its parts are frozen.

```ts given
const shown = runner.snapshot()
runner.snapshot() === shown // true: nothing changed
runner.apply({ type: 'choose', id: 'chat' })
runner.snapshot() === shown // false: a new state, so a new view, backlog and canUndo
```

`backlog` lists what was shown, oldest first, as [`BacklogEntry`](#backlogentry) values, and an undo takes it back with the state. `canUndo` and `canRedo` say whether `undo()` and `redo()` have a step to take, and both are `false` without history.

### settings

Every setting the game declares, by id, with its value now. A `play` setting reads from `state.settings`. A `ui` setting reads from the profile's `core:settings`, and reads as its default before the runner has read the profile, in a runner without one, and when the stored value is one the setting no longer takes. A runner from `createRunner` reads the profile in the background and calls its listeners when a `ui` setting turns out to differ from its default.

```ts given
const { textSize } = runner.snapshot().settings
document.body.dataset.textSize = String(textSize)
```

### saves

Every save in the runner's save store, newest first, then the ones that can't be read, as [`list()`](/docs/reference/saves#saves) gives them. It's empty without `saves`. The runner lists the saves once when it's made, then keeps the list up to date from every `save`, autosave and write or removal through `runner.saves`, so a save menu reads it and never lists the saves itself. A save that another tab writes to the same store shows up when the runner is next made.

### pressed

The [`RenderedChoice`](/docs/reference/view#renderedchoice) that led to the screen on show, with its `id`, `command` and `ui` hints, such as a choice whose hint asks for a transition. When a command changes [`view.scene.key`](/docs/api/engine#view), the runner finds the choice, inline action or button in the last view a UI read that sends the same command, and keeps it until the screen changes again.

It's `null` when nothing the player pressed led to the screen: a command no button on screen sends, a `tick` that ran a timer out, an undo, a redo, a load or a new game. A runner whose view nothing has read yet has none.

```ts given
runner.apply({ type: 'choose', id: 'leave' })
runner.snapshot().pressed?.id // 'leave'
runner.apply({ type: 'action', id: 'wait' })
runner.snapshot().pressed?.id // still 'leave': waiting kept the screen
```

### fresh

`true` while the state on show came from a command the runner just ran, and `false` after an undo, a redo, a load or a new game. A UI animates only what the player just did by it, such as the dice in [`view.rolls`](/docs/reference/rolls#view), and shows them settled after an undo.

## RunnerOptions

Settings for `createRunner`. Every option is off if left out. Every field is in [`RunnerOptions`](/docs/api/engine#runneroptions).

| Field | Meaning |
|---|---|
| `saves` | The [save store](/docs/reference/saves#saves) that `save`, `load` and autosave use. None of them works without it. |
| `history` | Undo and redo, as [`HistoryOptions`](#historyoptions), or `true` for their defaults. |
| `backlog` | The backlog, as [`BacklogOptions`](#backlogoptions), or `true` for its defaults. |
| `autosave` | When the runner saves by itself, as [`AutosaveOptions`](#autosaveoptions). It does nothing without `saves`. |
| `now` | The clock for time played and for `core:finished`, in milliseconds. `Date.now` if left out, and a test passes its own. |
| `onSaveError` | Hears every error the driver throws, from an autosave, `save`, `load`, a call through `runner.saves` or `runner.profile`, the first listing of the saves or a profile write. Later writes still run. |
| `profile` | The [profile](/docs/reference/profile) the runner keeps settings, `core:finished` and the plugins' namespaces in. A `ui` setting can't change without it. |

## HistoryOptions

Settings for undo and redo: how far back undo reaches and the barriers it stops at. Every field is in [`HistoryOptions`](/docs/api/engine#historyoptions).

`depth` is 50 commands if left out. A barrier is a command undo can't go back past, and the runner clears the history at one:

- **`stopAtIrreversible`**, on unless set to `false`, makes a choice marked [`irreversible`](/docs/reference/scenes#choice) a barrier.
- **`stopAtNewTurn`**, off unless set, makes the command that started a new [turn](/docs/reference/state#turn) a barrier, such as an action with a [`turn`](/docs/reference/effects#turn) effect or the calendar's bed.
- **`stopWhen`** is a [condition](/docs/reference/conditions), tested after each command, that makes any command after which it holds a barrier.

A [`tick`](/docs/reference/commands#tick) is no step of its own, so one undo goes back to before the last command that wasn't a tick and a minigame's clock doesn't fill the history. A tick that crosses a barrier, such as a timer whose end starts a turn, still clears it.

```ts given
import { createRunner, startingState } from '@ifloom/engine'

// No taking anything back once the rent is paid.
const strict = createRunner(game, startingState(game), { history: { depth: 20, stopWhen: { kv: 'rentPaid' } } })
```

## BacklogOptions

Settings for the backlog, the list of scenes the player has seen. Every field is in [`BacklogOptions`](/docs/api/engine#backlogoptions). `limit` is the most entries it keeps, 200 if left out, and the oldest drop off first.

## BacklogEntry

One scene as the player saw it, in the snapshot's `backlog`. Every field is in [`BacklogEntry`](/docs/api/engine#backlogentry).

`beats` are the [view's beats](/docs/reference/prose#scenebeat), and `when` is [`view.when`](/docs/api/engine#view) on that screen. `chose` is the label of the choice the player made in this scene, so in the order the player read them, an entry's beats come before its `chose`. It's missing while the scene still waits for a choice, and when the player left it some other way. The backlog grows command by command:

1. If the scene on screen before the command isn't the last entry, the runner adds it with that screen's turn and `when`. That records the opening scene, and one a trigger opened.
2. A `choose` command writes `chose` on that entry.
3. A scene the command opened goes in as a new entry. A choice that leaves the same scene on screen adds it again with its new beats, so each screen keeps its own choice.

Ticks add nothing, and nor does a [minigame](/docs/reference/minigames) played over a scene. A choice that closes the scene adds nothing, and nor does walking between locations with no scene open.

```ts given
import { createRunner, startingState } from '@ifloom/engine'

// Ava's scene is open. Chat, then say goodbye.
const listening = createRunner(game, startingState(game), { backlog: true })
listening.apply({ type: 'choose', id: 'chat' })
listening.apply({ type: 'choose', id: 'bye' })
listening.snapshot().backlog.map((entry) => [entry.sceneId, entry.chose])
// [['ava.hi', 'Chat for a minute'], ['ava.hi', 'Leave her to it']]
```

## AutosaveOptions

Settings for the runner's autosave: which slot it writes and how often. Every field is in [`AutosaveOptions`](/docs/api/engine#autosaveoptions).

`slot` is `'auto'` if left out. The runner writes autosaves in the background, in order, so a test awaits [`settled()`](#settled) before reading the slot back. A write that fails goes to `onSaveError` and doesn't stop the writes after it.

| Key | Meaning |
|---|---|
| `'command'` | The runner saves after every command that took, except a [`tick`](/docs/reference/commands#tick). |
| `'scene'` | The runner saves after a command that opened, changed or closed the scene. |
| `'turn'` | The runner saves after a command that started a new [turn](/docs/reference/state#turn), such as going to bed with the calendar. |

A tick saves under `'scene'` or `'turn'` only when it changed the scene or the turn. `undo`, `redo`, `load` and `restore` follow the same policy, so under `'command'` the autosave holds the state an undo stepped back to. While the game's [`saveable`](/docs/reference/game#saveable) refuses saving, the runner skips an autosave that's due, and writes the next one due once saving is allowed again.

## HelperRegistry

The interface a helper adds its id to, with the type of what it reports. It's empty in the engine. Its definition is in [`HelperRegistry`](/docs/api/engine#helperregistry).

```ts
import type { UnlockStatus } from '@ifloom/plugin-unlocks'

declare module '@ifloom/engine' {
  interface HelperRegistry {
    unlocks: UnlockStatus
  }
}
```

## HelpersIn

The snapshot's `helpers`, typed for each id in [`HelperRegistry`](#helperregistry) and `unknown` for any other. Its definition is in [`HelpersIn`](/docs/api/engine#helpersin).

## CommandLog

The game's id, the state it started from and every command that took since, which is all [`replay`](#replay) needs to play a game back. Every field is in [`CommandLog`](/docs/api/engine#commandlog).

The runner always keeps one. Undo takes commands off its end, so the log always leads to the state in play, and a load or a new game starts a new one. `schema` records the engine's [`SCHEMA`](/docs/reference/content#schema) and `plugins` each plugin's `commandVersion` by plugin id, the versions its commands were written for.

## Functions

### createRunner

Returns a runner that plays a game from a start state with the options given. Every parameter is in [`createRunner`](/docs/api/engine#createrunner).

The start is a state from [`startingState`](/docs/reference/commands#startingstate) or a save. The runner doesn't check its shape, so a state from anywhere else goes through [`loadState`](/docs/reference/saves#loadstate) first.

```ts given
import { localStorageDriver } from '@ifloom/browser'
import { createRunner, saves, startingState } from '@ifloom/engine'

const playing = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  backlog: { limit: 200 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})
playing.subscribe((snapshot) => (document.title = snapshot.view.scene.title))
```

### replay

Returns the state a command log leads to, as a [`Result`](/docs/reference/common#result). Every parameter is in [`replay`](/docs/api/engine#replay).

The engine is deterministic, so the same log against the same game gives the same state every time. The log's `start` goes through [`loadState`](/docs/reference/saves#loadstate), and its commands go through the engine's command steps from its `schema` and each plugin's [command migrations](/docs/reference/plugin-migrations) from its version. A log written for a newer engine or plugin than the game has fails with the reason, such as `written for version 7 of the cast plugin's commands, this game's reads 6`.

A command the game refuses is skipped, as it was at the time, so against a changed game a log can go its own way after the first command that no longer takes. A [`newGame`](/docs/reference/commands#newgame) in a log replays as `apply` runs it, with a seed drawn from the state before.

```ts given
import { readFileSync } from 'node:fs'
import { replay, type CommandLog } from '@ifloom/engine'

// A player's bug report: the log, as JSON.
const report: CommandLog = JSON.parse(readFileSync('report.json', 'utf8'))
const played = replay(game, report)
if (played.ok) console.log(played.value.turn)
```

## View

The runner adds nothing to the [view](/docs/reference/view). The snapshot holds the runner's own parts beside it: the backlog, undo and redo, the setting values, the saves and the helpers. To render them, see [Render saves, settings and the backlog](/docs/how-to/render/saves-and-settings).

## Caveats

- `runner.view()` keeps only the latest state's view. Calling [`view`](/docs/reference/view#view-1) yourself builds a new one, and one built without the runner shows no plugin the profile.
- A UI that renders only when `runner.state` changes misses a changed `ui` setting, a profile write a plugin's view reads, the saves list and the helpers. Render from the snapshot.
- A `newGame` command from a choice isn't New Game+. Nothing carries over unless a button calls `runner.newGame({ carry: runner.state })`.
- A load and a new game each start the command log again, so a log replays only the run since then.
