---
title: "The runner"
description: "The runner: its snapshot, undo, backlog, command log, saving, loading, autosave, settings, new games, the Result it answers with, and where browserRunner fits."
---
The runner is the one object your UI drives. It wraps [`apply`](/docs/reference/commands#apply) with the things every game's UI would otherwise build for itself: undo and redo, a backlog of what was shown, a command log, saving, loading and autosave. Everything a UI draws from it comes in one value, the [snapshot](#runnersnapshot), and it hands listeners a new one whenever anything in it changes.

```ts
import {
  createRunner, replay,
  type Runner, type RunnerOptions, type RunnerSnapshot, type HistoryOptions, type BacklogOptions, type AutosaveOptions,
  type BacklogEntry, type CommandLog, type StartOptions, type Result, type HelperRegistry, type HelpersIn,
} from '@ifloom/engine'
```

Everything but the command log is off unless you turn it on, so a runner with no options is `apply` plus a subscription. For a walk-through, see [A game with a world](/docs/guide/first-game#10-drive-it-with-a-runner).

If you use the React UI, you usually don't call `createRunner` yourself. [`mountGame`](/docs/react#mountgame) makes the runner with [`browserRunner`](/docs/browser#browserrunner) from `@ifloom/browser`, which sets up undo 50 deep, saves and a [profile](/docs/reference/profile) in `localStorage`, an autosave each turn and a random seed. It draws the game into the page and resolves to the runner. Its `runner` option is merged over those defaults. In a browser without React, call `browserRunner` yourself. Build the runner with `createRunner`, as below, when you want something different.

## createRunner

```ts shape
function createRunner(game: Game, start: GameState, options?: RunnerOptions): Runner
```

Starts a runner on `start`, which is usually [`startingState`](/docs/reference/commands#startingstate) or a state from a save. A state from anywhere else goes through [`loadState`](/docs/reference/saves#loadstate) first, since the runner doesn't check its shape. This is how the showcase makes its runner:

```ts
import { localStorageDriver } from '@ifloom/browser'
import { createRunner, saves, startingState, type RunnerSnapshot } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

function render(snapshot: RunnerSnapshot) {
  document.title = snapshot.view.scene?.title ?? 'Small Town'
}

const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  backlog: { limit: 200 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})

runner.subscribe((snapshot) => render(snapshot))
render(runner.snapshot())
runner.apply(places.go('high-street'))
```

## In a browser

[`browserRunner`](/docs/browser#browserrunner) from `@ifloom/browser` is `createRunner` with what most games in a browser want: a random seed, undo 50 steps deep, saves and a profile in `localStorage`, and an autosave each turn. The React UI's `mountGame` and the templates use it.

## RunnerSnapshot

```ts shape
type RunnerSnapshot = {
  readonly state: GameState
  readonly view: View
  readonly settings: Readonly<Record<string, KvValue>>
  readonly backlog: readonly BacklogEntry[]
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly saves: readonly SaveListing[]
  readonly helpers: HelpersIn
  readonly pressed: RenderedChoice | null
  readonly fresh: boolean
}
```

Everything a UI draws from the runner, in one value. `runner.snapshot()` gives the one for now, and [`subscribe`](#the-runners-members) hands each new one to its listeners.

| Field | What it is |
|---|---|
| `state` | The state in play, as `runner.state`. |
| `view` | The [view](/docs/reference/view) of that state, as `runner.view()`. |
| `settings` | Every setting's value now, `play` and `ui`. See [settings](#settings). |
| `backlog` | What was shown, oldest first, as [`BacklogEntry`](#backlogentry) values. Empty with the backlog off. Undo takes it back to where it was. |
| `canUndo` / `canRedo` | Whether `undo()` or `redo()` would do anything, for greying out the buttons. Always `false` with history off. |
| `saves` | Every save in the runner's [`saves`](/docs/reference/saves#saves), as [`saves.list()`](/docs/reference/saves#saves) gives them: newest first, then any that can't be read. See [The saves list](#the-saves-list). Empty without `saves`. |
| `helpers` | What a helper started beside the runner reports, by its id, such as the unlocks plugin's [`startUnlocks`](/docs/plugins/unlocks#startunlocks) under `unlocks`. See [setHelper](#sethelper). |
| `pressed` | The choice, inline action or button that led to the screen on show, as the [`RenderedChoice`](/docs/reference/view#renderedchoice) it was offered as, with its `id`, `command` and `ui` hints as written. See [What led here](#what-led-here). |
| `fresh` | Whether the state on show came from a command the runner just ran. False after an undo, a redo, a load or a new game. |

The snapshot is a new object whenever any part of it changes, and the same object until then. A UI that keeps it whole draws again exactly when something changed: Vue's `shallowRef`, React's `useSyncExternalStore` and a Svelte store all compare it by identity.

```ts
const shown = runner.snapshot()
runner.snapshot() === shown  // true: nothing changed
runner.apply({ type: 'choose', id: 'chat' })
runner.snapshot() === shown  // false: a new state, so a new view, backlog and canUndo
```

The snapshot is frozen, and so are its parts as the runner hands them over. Change things through the runner's members.

### What led here

A UI often wants to know how the player got to the screen it's drawing, such as to play the transition a choice's `ui` hints ask for. `snapshot.pressed` says so. When a command the runner runs changes the screen (its [`view.scene.key`](/docs/reference/view#the-scene)), the runner finds the choice, inline action or button in the view the command was sent from that sends the same command, and keeps it until the screen changes again.

```ts
runner.apply({ type: 'choose', id: 'leave' })
runner.snapshot().pressed  // { id: 'leave', label: 'Leave', command: { type: 'choose', id: 'leave' }, ui: { transition: 'fade' } }
runner.apply({ type: 'action', id: 'wait' })
runner.snapshot().pressed  // the same: waiting kept the screen
```

It's `null` when nothing the player pressed led to the screen: a command no choice or button on screen sends, a `tick` that ran a timer out, an undo, a redo, a load or a new game. The runner works it out from the view a UI drew, so a runner nothing has drawn yet (with no listener and no `view()` asked for) has none.

`fresh` is the other half. It's true while the state on show came from a command just run, so a UI animates only what the player just did, such as tumbling the dice in [`view.rolls`](/docs/reference/rolls#drawing-it), and shows them settled after an undo or a load.

### The saves list

The runner lists its saves once when it's made, in the background. [`settled()`](#the-runners-members) waits for that, and [`browserRunner`](/docs/browser#browserrunner) waits for it before it returns. After that the runner keeps the list up to date itself, with no listing again: every `save`, autosave, and every write and removal through `runner.saves` changes it, and listeners are told. A save menu reads `snapshot.saves` and never lists the saves itself.

```ts
await runner.save('1')
runner.snapshot().saves[0].slot        // '1': newest first
await runner.saves?.remove('1')
runner.snapshot().saves.some((entry) => entry.slot === '1')  // false
```

A save written to the same store from somewhere else, such as another tab, shows up the next time the runner is made.

## RunnerOptions

```ts shape
type RunnerOptions = {
  saves?: Saves
  history?: HistoryOptions | boolean
  backlog?: BacklogOptions | boolean
  autosave?: AutosaveOptions
  now?: () => number
  onSaveError?: (error: unknown) => void
  profile?: Profile
}
```

| Option | What it does | Default |
|---|---|---|
| `saves` | The [save store](/docs/reference/saves#saves) that `save`, `load` and autosave use. You need it for any of them. | none |
| `history` | Undo and redo. `true` turns it on with the defaults below. | off |
| `backlog` | Keeps what was shown, turn by turn. `true` turns it on with the defaults below. | off |
| `autosave` | Saves by itself after commands. Does nothing without `saves`. | off |
| `now` | The clock for time played, and for when `finished` is recorded, in milliseconds. Tests pass their own. | `Date.now` |
| `onSaveError` | Told when a save or a [profile](/docs/reference/profile) write fails, with the error. Later writes still run. | failures dropped |
| `profile` | The [profile](/docs/reference/profile) the runner writes settings (`core:settings`), [`finished`](#finished) (`core:finished`) and plugins' namespaces to. You need it to change a `ui` setting. | none |

## HistoryOptions

```ts shape
type HistoryOptions = {
  depth?: number
  stopAtIrreversible?: boolean
  stopWhen?: Condition
  stopAtNewTurn?: boolean
}
```

| Field | What it does | Default |
|---|---|---|
| `depth` | How many commands back undo reaches. | `50` |
| `stopAtIrreversible` | No undo past a choice marked [`irreversible`](/docs/reference/scenes#choice). | `true` |
| `stopAtNewTurn` | No undo past the start of a new [turn](/docs/reference/state#turn), meaning past the command that ended the last one. That's a choice or an action with a [`turn`](/docs/reference/effects#turn) effect, or the [calendar](/docs/plugins/calendar#commands)'s bed. | `false` |
| `stopWhen` | No undo past any state where this [condition](/docs/reference/conditions) holds, tested after each command. | none |

A barrier is a command that undo can't go back past: the irreversible choice itself, the command that started the turn, or the command that made `stopWhen` hold. Undo history is cleared at a barrier and builds up again from there.

```ts
// No taking anything back once the rent is paid.
history: { stopWhen: { kv: 'rentPaid' } }
```

A [`tick`](/docs/reference/commands#tick) is no step of its own. One undo goes back to before the last command that wasn't a tick, so a minigame's clock doesn't fill the history. A tick that crosses a barrier, such as a timer whose final state ends a turn, still clears it.

Undo can't re-roll anything. Every draw is seeded from the save, the turn and a name (see [Randomness](/docs/reference/random)), so playing the same command again from the same state deals the same card.

## BacklogOptions

```ts shape
type BacklogOptions = { limit?: number }
```

How many entries the backlog keeps. The oldest drop off first. The default is `200`.

## BacklogEntry

```ts shape
type BacklogEntry = {
  turn: number          // the turn it was shown in, from 0
  when: string | null   // view.when on that screen
  sceneId: string
  title: string
  beats: SceneBeat[]
  chose?: string        // the label of the choice the player made in this scene
}
```

One scene as the player saw it, for a "what did she just say?" screen. `beats` are the [view's beats](/docs/reference/prose#scenebeat), already parsed. `chose` is the label of the choice the player made in this scene, not the one that led to it. It's missing while the scene is still waiting for a choice, or when the player left it some other way.

This is how the backlog grows, command by command:

- **The scene on screen goes in first.** If the scene showing before the command isn't already the last entry, it's added with the turn and the [`when`](/docs/reference/view#the-clock-and-the-player) of the screen it was shown on. That's how the opening scene, or one a trigger opened, gets recorded.
- **A choice's label is written on it.** A `choose` command sets `chose` on that entry.
- **A new scene goes in after.** A scene the command opened is added as a new entry.
- **A redraw is a new entry.** A choice that leaves the same scene on screen adds it again with its new beats, so each screen keeps its own choice.
- **Ticks add nothing**, and nor does a [minigame](/docs/reference/minigames) drawn over a scene. The scene a minigame's ending opens goes in with the next command that isn't a tick, as the scene on screen.
- **Leaving adds nothing.** A choice that closes the scene adds no entry, and neither does walking between places with no scene open (the [places plugin](/docs/plugins/places)'s `go`).

```ts
import { createRunner, startingState } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

// Ava's scene is open. Chat, then say goodbye.
const runner = createRunner(game, startingState(game), { backlog: true })
runner.apply({ type: 'choose', id: 'chat' })
runner.apply({ type: 'choose', id: 'bye' })
runner.snapshot().backlog.map((entry) => [entry.sceneId, entry.chose])
// [['ava.hi', 'Chat for a minute'], ['ava.hi', 'Leave her to it']]
runner.apply(places.go('high-street'))
runner.snapshot().backlog.length // still 2
```

The choice came at the end of the scene, so in the order the player saw them, an entry's beats come first and its `chose` after.

## AutosaveOptions

```ts shape
type AutosaveOptions = {
  slot?: string
  every: 'command' | 'scene' | 'turn'
}
```

| `every` | Saves after |
|---|---|
| `'command'` | every command that took, except a [`tick`](/docs/reference/commands#tick). |
| `'scene'` | a command that opened, changed or closed the scene. |
| `'turn'` | a command that started a new [turn](/docs/reference/state#turn), such as going to bed in a game with the [calendar](/docs/plugins/calendar). |

While the game's [`saveable`](/docs/reference/game#saveable) refuses saving, an autosave that's due is skipped. The next one due after saving is allowed again writes the slot, so with `every: 'turn'` a game that blocks saving through its opening scenes autosaves first at the end of the first turn after them.

A tick saves under `'scene'` or `'turn'` only when it changed the scene or the turn, such as a minigame's timer running out into a final state that ends the turn.

`slot` defaults to `'auto'`. Autosaves are written in the background, in order. Await [`settled()`](#the-runners-members) before reading the slot back.

`undo`, `redo`, `load` and `restore` follow the same policy as a command. Under `every: 'command'` they write the slot, so after an undo the autosave holds the state you stepped back to.

A write that fails is reported to `onSaveError`, and doesn't stop the writes after it.

## Result

```ts shape
type Result<T> = { ok: true; value: T } | { ok: false; reason: string }
```

What the runner, the [save store](/docs/reference/saves#saves), the [mod store](/docs/reference/mods#mods), [`loadState`](/docs/reference/saves#loadstate), [`replay`](#replay) and [`upgradePack`](/docs/reference/loader#upgradepack) answer with when something can fail in a way you should expect: a refused command, an empty slot, a save from a newer game, a mod for another game. Check `ok`. On success `value` is the answer. On failure `reason` says why, in words a player can read, and nothing changed. None of them throws for these.

```ts
const result = runner.apply({ type: 'choose', id: 'chat' })
if (!result.ok) alert(result.reason) // 'She has a queue.'
```

The engine's own [`apply`](/docs/reference/commands#apply) answers in the same shape, with the state on both sides. [`checkGame`](/docs/reference/checks#checkgame) is different: its problems are a report on content that works, not a failure.

## The runner's members

`Runner` is an interface. Every member is listed here.

| Member | What it does |
|---|---|
| `game` | The game it plays. |
| `state` | The current [`GameState`](/docs/reference/state). It's read-only, so change it through `apply`. |
| `view()` | [`view(state, game)`](/docs/reference/view) for the current state, built once per state, with the plugins' views shown the profile. See [The view cache](#the-view-cache). |
| `apply(command)` | Runs a command. Returns a [`Result`](#result) with the next state as its `value`, or the `reason` it was refused. A refused command changes nothing. It adds no history or log entry and calls no listeners. A [`newGame`](/docs/reference/commands#newgame) command, on its own or sent by a choice, starts a new game as [`newGame()`](#newgame) does (see [Starting over from content](#starting-over-from-content)). |
| `undo()` / `redo()` | Steps back or forward one command. Returns `false` when there's nothing to do. A new command after an undo clears redo. |
| `snapshot()` | The [`RunnerSnapshot`](#runnersnapshot): everything a UI draws, in one value. The same object until any part of it changes. |
| `log()` | The [`CommandLog`](#commandlog): the start state and every command since. Always kept. |
| `saves` | The [`Saves`](/docs/reference/saves#saves) store the runner was made with, or `undefined`, watched so that what it writes and removes shows in the snapshot's `saves`. A save menu deletes, exports and imports through it. |
| `offers` | `{ undo: boolean, backlog: boolean }`: whether the game turned on `history` and `backlog`, so a menu shows only what's on offer. |
| `played()` | Time played in milliseconds, counting from the time recorded in any save loaded. |
| `save(slot, name?)` | Waits for any autosaves in progress, then writes the current state to a slot with the time played. Resolves to a [`Result`](#result) with its [`SaveMeta`](/docs/reference/saves#savemeta). `name` defaults to one made from when and where. It fails with `This game keeps no saves.` without `saves`, with the reason from the game's [`saveable`](/docs/reference/game#saveable) while that refuses saving (check [`view().saving`](/docs/reference/view#saving) first to grey the button out), and with `The game could not be saved.` when the driver throws, which `onSaveError` hears about too. |
| `load(slot)` | Reads a slot through the save store, which loads its state with [`loadState`](/docs/reference/saves#loadstate), and, if it can, plays on from it with a fresh history, backlog and log, and the time played the save recorded. Resolves to a [`Result`](#result) with the [`LoadedSave`](/docs/reference/saves#loadedsave). It fails with `Nothing is saved there.` for an empty slot, `This game keeps no saves.` without `saves`, or the reason the save can't be read. On a failure the runner is unchanged. |
| `restore(loaded)` | Plays on from a save that didn't come from a slot, such as a file the player imported with [`saves.importText`](/docs/reference/saves), exactly as `load` would. The [`LoadedSave`](/docs/reference/saves#loadedsave) has already been through `loadState`. |
| `settled()` | Resolves when every autosave and profile write so far has been written, or has failed and been reported, the profile has been read for the settings and the plugins' views, and the saves have been listed. |
| `profile` | The [`Profile`](/docs/reference/profile) the runner was made with, or `undefined`. |
| `setSetting(id, to)` | Changes a setting of either kind. See [below](#setsetting). |
| `newGame(options?)` | Starts a new game in place. See [below](#newgame). |
| `subscribe(listener)` | Calls `listener(snapshot)` with each new [snapshot](#runnersnapshot): after every change of state (a command, an undo, a redo, a load or a new game), and with the same state when a `ui` setting changes, when what the plugins' views show of the profile changes, when the saves list changes and when a helper reports. Returns a function that stops it. |
| `setHelper(id, value)` | Puts what a helper reports in the snapshot's `helpers`. See [below](#sethelper). |

`save` and `load` are async, and answer with a [`Result`](#result) rather than throwing:

```ts
declare const undoButton: HTMLButtonElement // your page's undo button
undoButton.disabled = !runner.snapshot().canUndo
undoButton.onclick = () => runner.undo()

const saved = await runner.save('quick')
if (!saved.ok) alert(saved.reason)

const loaded = await runner.load('quick')
if (!loaded.ok) alert(loaded.reason)
else if (loaded.value.missingPacks.length) alert(`Made with mods you don't have: ${loaded.value.missingPacks.join(', ')}`)
```

**Gotcha:** a `load` starts the command log again from the loaded state. A bug report should carry the log together with the save it started from, or only `log()`, whose `start` is that state.

### The view cache

`runner.view()` keeps the view it built and the state it built it for. Asked again while the state is the same object, it returns the same view without building it again. After a command, an undo or a load, the state is a new object, so the next call builds a new view.

This means everything that reads the view can call `runner.view()` freely, and `snapshot().view` is that same object. In a browser, the backlog, the [React UI](/docs/react) and the [audio player](/docs/browser/audio-player) all read it after each command, and the view is built once between them. `apply` also uses the view the UI last read to write the backlog, rather than building the one it was sent from again.

```ts
runner.apply({ type: 'choose', id: 'open' })
runner.view() === runner.view()  // true: one view for the new state
```

With a `profile`, the runner also shows each plugin's view what that plugin's namespace holds, as [`context.profile`](/docs/reference/plugins#the-profile). It reads those namespaces when it's made and follows every write to the profile after that, from itself or anything else. When a namespace a view can see changes, the cached view is replaced by a new object with only that plugin's view built again. The scene isn't drawn again, and the state is the same object. Then the runner's listeners are called with a new snapshot, so a UI that draws from it redraws.

```ts
await runner.profile?.set('achievements', { earned: ['regular'] })
runner.view() === runner.view()  // still true: the new view is kept
```

A UI that redraws only when `runner.state` changes misses these. Draw from the snapshot instead, as the React UI does.

**Gotcha.** Only the latest state's view is kept. Calling [`view`](/docs/reference/view#view) yourself always builds a new one, and one built without the runner has no profile, so in a UI driven by a runner, read `runner.view()`.

### settings

```ts fragment
runner.snapshot().settings: Readonly<Record<string, KvValue>>
```

Every [setting](/docs/reference/settings) the game declares, by id, with its value now, in the snapshot. It's synchronous, so a UI can read it while it draws.

- **A `play` setting** comes from the game in play, `state.settings`.
- **A `ui` setting** comes from the profile's `core:settings`. A stored value the setting can't take any more reads as its default. So does every `ui` setting before the profile has been read, and in a runner without a profile.

```ts
const { textSize, hints } = runner.snapshot().settings
document.body.dataset.textSize = String(textSize)
```

It's the same object until a value changes, so you can compare it. A runner from `createRunner` reads the profile in the background, and calls its listeners when a `ui` setting turns out to differ from its default. Await `settled()` to be sure it has. [`browserRunner`](/docs/browser#browserrunner) waits for that read before it returns.

### setSetting

```ts fragment
runner.setSetting(id: string, to: KvValue): Result<KvValue>
```

Changes a setting of either kind, after checking the value against the setting's declaration. Returns a [`Result`](#result) with the value, or why it was refused, with the same lines as the [`setting`](/docs/reference/commands#setting) command.

- **A `play` setting** is sent as the `setting` command, so it changes the game in play and is logged like any command. When it takes, the runner writes it to the profile's `core:settings` too, so the next new game starts with it.
- **A `ui` setting** is written to the profile's `core:settings` and never touches the state. The snapshot's `settings` shows it at once, listeners are called, and the write finishes in the background. Await `settled()` if you need it done. Without a profile it's refused with `This game keeps no settings between plays.`

```ts
const result = runner.setSetting('textSize', 'large')
if (!result.ok) alert(result.reason)
```

### setHelper

```ts fragment
runner.setHelper(id: string, value: unknown): void

interface HelperRegistry {}
type HelpersIn = { readonly [K in keyof HelperRegistry]?: HelperRegistry[K] } & Readonly<Record<string, unknown>>
```

Puts what a helper started beside the runner reports in the snapshot's `helpers`, under its id, and tells listeners. `undefined` takes it out. Setting the same value again does nothing. A helper is code that works on the runner from outside it and has something for the player to see, such as the unlocks plugin's [`startUnlocks`](/docs/plugins/unlocks#startunlocks), which reports whether a code is being checked as `helpers.unlocks`. So every UI reads it the same way, from the snapshot.

A helper types what it reports by adding its id to `HelperRegistry`, as a plugin types its view in [`ViewRegistry`](/docs/reference/plugins#typed-calls-queries-and-views):

```ts
import type { UnlockStatus } from '@ifloom/plugin-unlocks'

declare module '@ifloom/engine' {
  interface HelperRegistry {
    unlocks: UnlockStatus
  }
}
```

`HelpersIn` is the snapshot's `helpers`: typed for each id in the registry, and `unknown` for any other.

### newGame

```ts fragment
runner.newGame(options?: StartOptions): Promise<GameState>
```

Starts a new game in place, with a fresh history, backlog and log and no time played, and tells listeners. It takes the same options as [`startingState`](/docs/reference/commands#startingstate). If you leave out `settings`, it uses the player's: the profile's, or without a profile the ones in the game in play. If you leave out `seed`, it picks a random one.

```ts
declare const newGameButton: HTMLButtonElement // your page's buttons
declare const newGamePlusButton: HTMLButtonElement
newGameButton.onclick = () => runner.newGame()
newGamePlusButton.onclick = () => runner.newGame({ carry: runner.state })
```

### Starting over from content

A choice can start a new game itself by sending the [`newGame`](/docs/reference/commands#newgame) command, such as an ending's "Play again":

```ts fragment
{ id: 'again', command: { type: 'newGame' }, effects: [] }
```

`runner.apply` sees that the command asked for a new game and starts one in place, as `newGame()` would with no options: the player's play settings, a random seed, and a fresh history, backlog and log. The profile isn't touched, so settings, `core:finished`, unlocks and achievements carry on. The settings are the profile's as the runner last read them, because `apply` doesn't wait. A runner made by [`browserRunner`](/docs/browser#browserrunner) has read them before the first frame.

- **The command log starts again.** The new log's `start` is the new game, and the `newGame` command isn't in either log. A bug report made after a restart replays the new run only.
- **Nothing after it runs.** The choice's effects, triggers and plugins' hooks are for the run that ended, so they don't run, and the choice isn't counted in [`chosen`](/docs/reference/state#chosen).
- **It's not New Game+.** Nothing is carried over. To carry over, give the player a button that calls `runner.newGame({ carry: runner.state })`.
- **Undo can't go back.** The history is fresh, as after `newGame()`.

### finished

If the game declares [`finished`](/docs/reference/state#new-game), the runner tests it after every command that takes. The first time it holds, and only if the profile has no `core:finished` yet, the runner writes `{ at }` there, the time from its `now` clock. It never writes it again, in this game or a later one. A runner without a profile doesn't record it.

After a command, the runner also gives each plugin with a [`profile`](/docs/reference/plugins#the-profile) the chance to update its namespace.

## CommandLog

```ts shape
type CommandLog = {
  game: string
  start: GameState
  commands: Command[]
  schema?: number
  plugins?: Record<string, number>
}
```

Everything you need to play a game back exactly: the game's id, the state it started from and every command that took since. Undo takes commands off the end, so the log always leads to the current state.

`schema` and `plugins` say what the commands were written for: the engine's [`SCHEMA`](/docs/reference/loader#schema), and each plugin's [`commandVersion`](/docs/reference/plugins#content-and-command-migrations) by plugin id. A runner writes both. A log from before logs kept them has neither, and [`replay`](#replay) reads it as the oldest.

## replay

```ts shape
function replay(game: Game, log: CommandLog): Result<GameState>
```

Plays a command log back and returns the state it leads to, as a [`Result`](#result). The engine is deterministic, so the same log against the same game gives the same state every time.

The log's `start` goes through [`loadState`](/docs/reference/saves#loadstate) first, so a log made with an older engine or an older version of the game still plays. Its commands are carried forward from the versions the log records: the engine's own steps from its `schema`, and each plugin's [`commandMigrations`](/docs/reference/plugins#content-and-command-migrations) from its version, so only the steps the log needs run. A log with no versions is read as the oldest, so every step runs, and commands written with names an older engine used are read with today's: `{ type: 'use', itemId: 'tea' }`, from when items were the engine's, is the [inventory plugin](/docs/plugins/inventory)'s `inventory/use` on `item:tea`. If the start can't be loaded, or the log was written for a newer engine or a newer version of a plugin than the game has, `replay` fails with the reason, such as `written for version 7 of the cast plugin's commands, this game's reads 6`.

```ts
import { readFileSync } from 'node:fs'
import { replay, type CommandLog } from '@ifloom/engine'
import lastWeek from './old/src/game.ts'
import thisWeek from './src/game.ts'

// A player's bug report: the log, as JSON.
const report: CommandLog = JSON.parse(readFileSync('report.json', 'utf8'))
const played = replay(game, report)
if (played.ok) console.log(played.value.turn)

// Two versions of a game, played the same way.
const before = replay(lastWeek.build().game, report)
const after = replay(thisWeek.build().game, report)
```

A [`newGame`](/docs/reference/commands#newgame) in a log replays as [`apply`](/docs/reference/commands#apply) runs it: a new game with a seed drawn from the state before, the same every time. A runner's own log never holds one, because a runner starts a new log at each new game.

A command the game refuses is skipped, as it would have been at the time. Against a changed game, that means a log can go its own way after the first command that no longer takes. Compare the states to find where.

## Drawing it

A UI draws from the [snapshot](#runnersnapshot). Two of its parts are the runner's own rather than the view's. `snapshot.backlog` is what was shown, oldest first, for a "what did she just say?" screen. It's empty unless the runner has the backlog on, `backlog: true`, which `browserRunner` takes too. `snapshot.canUndo` says whether `runner.undo()` would step back.

The React UI's [`GameMenu`](/docs/react/components#gamemenu) offers the backlog and undo when the runner has them. [`Backlog`](/docs/react/components#backlog) draws the backlog wherever you place it. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` is handed each snapshot, and the Vue tab reads `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/backlog.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/backlog.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Backlog.vue]{meta='tab="Vue" tab-group="framework"'}

## See it in an example

Small Town: [`examples/showcase/src/main.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/main.tsx) makes its runner with `createRunner`, turning on `history`, `backlog`, `saves`, a `profile` and `autosave: { every: 'turn' }`. The Letter and The Corner Café use `mountGame`, which makes one for them.
