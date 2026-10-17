---
title: "The runner"
description: "The runner: undo, backlog, command log, saving, loading, autosave, settings, new games, the Result it answers with, and browserRunner for the browser."
---
The runner is the one object your UI drives. It wraps [`apply`](/docs/reference/commands#apply) with the things every game's UI would otherwise build for itself: undo and redo, a backlog of what was shown, a command log, saving, loading and autosave. It also tells listeners when the state changes.

```ts
import {
  createRunner, browserRunner, replay,
  type Runner, type RunnerOptions, type HistoryOptions, type BacklogOptions,
  type AutosaveOptions, type BacklogEntry, type CommandLog, type StartOptions, type Result,
} from '@ifloom/engine'
```

Everything but the command log is off unless you turn it on, so a runner with no options is `apply` plus a subscription. For a walk-through, see [A game with a world](/docs/guide/first-game#10-drive-it-with-a-runner).

If you use the React UI, you usually don't call `createRunner` yourself. [`mountGame`](/docs/react#mountgame) makes the runner with [`browserRunner`](#browserrunner), which sets up undo 50 deep, saves and a [profile](/docs/reference/profile) in `localStorage`, an autosave each turn and a random seed. It draws the game into the page and resolves to the runner. Its `runner` option is merged over those defaults. In a browser without React, call `browserRunner` yourself. Build the runner with `createRunner`, as below, when you want something different.

## createRunner

```ts
function createRunner(game: Game, start: GameState, options?: RunnerOptions): Runner
```

Starts a runner on `start`, which is usually [`startingState`](/docs/reference/commands#startingstate) or a state from a save. A state from anywhere else goes through [`loadState`](/docs/reference/saves#loadstate) first, since the runner doesn't check its shape. This is how the showcase makes its runner:

```ts
import { createRunner, localStorageDriver, saves, startingState } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'

const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  backlog: { limit: 200 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})

runner.subscribe(() => render(runner.view()))
runner.apply(go('high-street'))
```

## browserRunner

```ts
function browserRunner(game: Game, options?: RunnerOptions & { start?: GameState }): Promise<Runner>
```

A runner with what most games in a browser want. It's `createRunner` with these defaults:

| | Default |
|---|---|
| `start` | A new game, `startingState(game, { seed, settings })`, with a random seed so each playthrough draws its own variants, and the player's `play` [settings](/docs/reference/settings) from the profile. |
| `history` | `{ depth: 50 }`, so undo goes 50 steps back. |
| `saves` | `saves(game, localStorageDriver())`, saves in the browser's `localStorage` under keys that start with the game's id. |
| `profile` | `profile(game, localStorageDriver())`, the [profile](/docs/reference/profile) at `<game id>.profile` in the same `localStorage`. |
| `autosave` | `{ every: 'turn' }`, to the `auto` slot. |

Pass `start` to begin from another state, and any [`RunnerOptions`](#runneroptions) to change the rest. They're merged over the defaults, one option at a time. [`mountGame`](/docs/react#mountgame) uses it, and so do the `vanilla`, `vue` and `svelte` templates:

```ts
import { browserRunner } from '@ifloom/engine'

const runner = await browserRunner(game, { backlog: { limit: 200 } })

runner.subscribe(() => draw(runner.view()))
draw(runner.view())
```

It's async because it reads the profile before it starts. The new game gets the player's stored `play` settings, and [`runner.settings()`](#settings) has their `ui` settings from the first frame, so a text size or a volume is right before anything is drawn. A profile that can't be read starts the game with the defaults.

**Gotcha.** Its saves and profile go to `localStorage`, which a test or a script in Node doesn't have. The runner still starts there, but every save, autosave and profile write fails with `localStorage is not available here`. Pass your own stores, such as `{ saves: saves(game, memoryDriver()), profile: profile(game, memoryDriver()) }` with [`memoryDriver`](/docs/reference/saves#memorydriver), or use `createRunner`.

## RunnerOptions

```ts
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

```ts
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
| `stopAtIrreversible` | No undo past a choice marked [`irreversible`](/docs/reference/scenes#scenechoice). | `true` |
| `stopAtNewTurn` | No undo past the start of a new [turn](/docs/reference/state#turn), meaning past the command that ended the last one. That's a choice or an activity with a [`turn`](/docs/reference/effects#turn) effect, or the [calendar](/docs/plugins/calendar#commands)'s bed. | `false` |
| `stopWhen` | No undo past any state where this [condition](/docs/reference/conditions) holds, tested after each command. | none |

A barrier is a command that undo can't go back past: the irreversible choice itself, the command that started the turn, or the command that made `stopWhen` hold. Undo history is cleared at a barrier and builds up again from there.

```ts
// No taking anything back once the rent is paid.
history: { stopWhen: { kv: 'rentPaid' } }
```

A [`tick`](/docs/reference/commands#tick) is no step of its own. One undo goes back to before the last command that wasn't a tick, so a minigame's clock doesn't fill the history. A tick that crosses a barrier, such as a timer whose final state ends a turn, still clears it.

Undo can't re-roll anything. Every draw is seeded from the save, the turn and a name (see [Randomness](/docs/reference/random)), so playing the same command again from the same state deals the same card.

## BacklogOptions

```ts
type BacklogOptions = { limit?: number }
```

How many entries the backlog keeps. The oldest drop off first. The default is `200`.

## BacklogEntry

```ts
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
import { createRunner } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'

// Ava's scene is open. Chat, then say goodbye.
const runner = createRunner(game, start, { backlog: true })
runner.apply({ type: 'choose', id: 'chat' })
runner.apply({ type: 'choose', id: 'bye' })
runner.backlog().map((entry) => [entry.sceneId, entry.chose])
// [['ava.hi', 'Chat for a minute'], ['ava.hi', 'Leave her to it']]
runner.apply(go('high-street'))
runner.backlog().length // still 2
```

The choice came at the end of the scene, so in the order the player saw them, an entry's beats come first and its `chose` after.

## AutosaveOptions

```ts
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

A tick saves under `'scene'` or `'turn'` only when it changed the scene or the turn, such as a minigame's timer running out into a final state that ends the turn.

`slot` defaults to `'auto'`. Autosaves are written in the background, in order. Await [`settled()`](#the-runners-members) before reading the slot back.

`undo`, `redo`, `load` and `restore` follow the same policy as a command. Under `every: 'command'` they write the slot, so after an undo the autosave holds the state you stepped back to.

A write that fails is reported to `onSaveError`, and doesn't stop the writes after it.

## Result

```ts
type Result<T> = { ok: true; value: T } | { ok: false; reason: string }
```

What the runner, the [save store](/docs/reference/saves#saves), the [mod store](/docs/reference/mods#mods), [`loadState`](/docs/reference/saves#loadstate), [`replay`](#replay), [`readMod`](/docs/reference/mods#readmod) and [`upgradePack`](/docs/reference/loader#upgradepack) answer with when something can fail in a way you should expect: a refused command, an empty slot, a save from a newer game, a mod for another game. Check `ok`. On success `value` is the answer. On failure `reason` says why, in words a player can read, and nothing changed. None of them throws for these.

```ts
const result = runner.apply({ type: 'choose', id: 'chat' })
if (!result.ok) showMessage(result.reason) // 'She has a queue.'
```

The engine's own [`apply`](/docs/reference/commands#apply) answers in the same shape, with the state on both sides. [`checkGame`](/docs/reference/checks#checkgame) is different: its problems are a report on content that works, not a failure.

## The runner's members

`Runner` is an interface. Every member is listed here.

| Member | What it does |
|---|---|
| `game` | The game it plays. |
| `state` | The current [`GameState`](/docs/reference/state). It's read-only, so change it through `apply`. |
| `view()` | [`view(state, game)`](/docs/reference/view) for the current state, built once per state, with the plugins' views shown the profile. See [The view cache](#the-view-cache). |
| `apply(command)` | Runs a command. Returns a [`Result`](#result) with the next state as its `value`, or the `reason` it was refused. A refused command changes nothing. It adds no history or log entry and calls no listeners. |
| `undo()` / `redo()` | Steps back or forward one command. Returns `false` when there's nothing to do. A new command after an undo clears redo. |
| `canUndo` / `canRedo` | Whether there's anything to undo or redo, for greying out the buttons. Always `false` with history off. |
| `backlog()` | The backlog, oldest first. Empty with the backlog off. Undo takes it back to where it was. |
| `log()` | The [`CommandLog`](#commandlog): the start state and every command since. Always kept. |
| `saves` | The [`Saves`](/docs/reference/saves#saves) store the runner was made with, or `undefined`. A save menu lists, exports and imports through it. |
| `offers` | `{ undo: boolean, backlog: boolean }`: whether the game turned on `history` and `backlog`, so a menu shows only what's on offer. |
| `played()` | Time played in milliseconds, counting from the time recorded in any save loaded. |
| `save(slot, name?)` | Waits for any autosaves in progress, then writes the current state to a slot with the time played. Resolves to a [`Result`](#result) with its [`SaveMeta`](/docs/reference/saves#savemeta). `name` defaults to one made from when and where. It fails with `This game keeps no saves.` without `saves`, and with `The game could not be saved.` when the driver throws, which `onSaveError` hears about too. |
| `load(slot)` | Reads a slot through the save store, which loads its state with [`loadState`](/docs/reference/saves#loadstate), and, if it can, plays on from it with a fresh history, backlog and log, and the time played the save recorded. Resolves to a [`Result`](#result) with the [`LoadedSave`](/docs/reference/saves#loadedsave). It fails with `Nothing is saved there.` for an empty slot, `This game keeps no saves.` without `saves`, or the reason the save can't be read. On a failure the runner is unchanged. |
| `restore(loaded)` | Plays on from a save that didn't come from a slot, such as a file the player imported with [`saves.importText`](/docs/reference/saves), exactly as `load` would. The [`LoadedSave`](/docs/reference/saves#loadedsave) has already been through `loadState`. |
| `settled()` | Resolves when every autosave and profile write so far has been written, or has failed and been reported, and the profile has been read for the settings and the plugins' views. |
| `profile` | The [`Profile`](/docs/reference/profile) the runner was made with, or `undefined`. |
| `settings()` | Every setting's value now, `play` and `ui`. See [below](#settings). |
| `setSetting(id, to)` | Changes a setting of either kind. See [below](#setsetting). |
| `newGame(options?)` | Starts a new game in place. See [below](#newgame). |
| `subscribe(listener)` | Calls `listener(state)` after every change of state: a command, an undo, a redo, a load or a new game. It's also called, with the same state, when a `ui` setting changes and when what the plugins' views show of the profile changes. Returns a function that stops it. |

`save` and `load` are async, and answer with a [`Result`](#result) rather than throwing:

```ts
undoButton.disabled = !runner.canUndo
undoButton.onclick = () => runner.undo()

const saved = await runner.save('quick')
if (!saved.ok) showMessage(saved.reason)

const loaded = await runner.load('quick')
if (!loaded.ok) showMessage(loaded.reason)
else if (loaded.value.missingPacks.length) showMessage(`Made with mods you don't have: ${loaded.value.missingPacks.join(', ')}`)
```

**Gotcha:** a `load` starts the command log again from the loaded state. A bug report should carry the log together with the save it started from, or simply `log()`, whose `start` is that state.

### The view cache

`runner.view()` keeps the view it built and the state it built it for. Asked again while the state is the same object, it returns the same view without building it again. After a command, an undo or a load, the state is a new object, so the next call builds a new view.

This means everything that reads the view can call `runner.view()` freely. In a browser, the backlog, the [React UI](/docs/react) and the [audio player](/docs/reference/audio-player) all read it after each command, and the view is built once between them. `apply` also uses the view the UI last read to write the backlog, rather than building the one it was sent from again.

```ts
runner.apply({ type: 'choose', id: 'open' })
runner.view() === runner.view()  // true: one view for the new state
```

With a `profile`, the runner also shows each plugin's view what that plugin's namespace holds, as [`context.profile`](/docs/reference/plugins#the-profile). It reads those namespaces when it's made and follows every write to the profile after that, from itself or anything else. When a namespace a view can see changes, the cached view is replaced by a new object with only that plugin's view built again. The scene isn't drawn again, and the state is the same object. Then the runner's listeners are called, so a UI that reads `runner.view()` in its listener redraws.

```ts
await runner.profile?.set('achievements', { earned: ['regular'] })
runner.view() === runner.view()  // still true: the new view is kept
```

A UI that redraws only when `runner.state` changes misses these. Compare `runner.view()` instead, as the React UI does.

**Gotcha.** Only the latest state's view is kept. Calling [`view`](/docs/reference/view#view) yourself always builds a new one, and one built without the runner has no profile, so in a UI driven by a runner, read `runner.view()`.

### settings

```ts
runner.settings(): Readonly<Record<string, KvValue>>
```

Every [setting](/docs/reference/settings) the game declares, by id, with its value now. It's synchronous, so a UI can read it while it draws.

- **A `play` setting** comes from the game in play, `state.settings`.
- **A `ui` setting** comes from the profile's `core:settings`. A stored value the setting can't take any more reads as its default. So does every `ui` setting before the profile has been read, and in a runner without a profile.

```ts
const { textSize, hints } = runner.settings()
document.body.dataset.textSize = String(textSize)
```

It hands back the same object until a value changes, so you can compare it, or read it in React's `useSyncExternalStore`. A runner from `createRunner` reads the profile in the background, and calls its listeners when a `ui` setting turns out to differ from its default; await `settled()` to be sure it has. [`browserRunner`](#browserrunner) waits for that read before it returns.

### setSetting

```ts
runner.setSetting(id: string, to: KvValue): Result<KvValue>
```

Changes a setting of either kind, after checking the value against the setting's declaration. Returns a [`Result`](#result) with the value, or why it was refused, with the same lines as the [`setting`](/docs/reference/commands#setting) command.

- **A `play` setting** is sent as the `setting` command, so it changes the game in play and is logged like any command. When it takes, the runner writes it to the profile's `core:settings` too, so the next new game starts with it.
- **A `ui` setting** is written to the profile's `core:settings` and never touches the state. `settings()` shows it at once, listeners are called, and the write finishes in the background. Await `settled()` if you need it done. Without a profile it's refused with `This game keeps no settings between plays.`

```ts
const result = runner.setSetting('textSize', 'large')
if (!result.ok) showMessage(result.reason)
```

### newGame

```ts
runner.newGame(options?: StartOptions): Promise<GameState>
```

Starts a new game in place, with a fresh history, backlog and log and no time played, and tells listeners. It takes the same options as [`startingState`](/docs/reference/commands#startingstate). If you leave out `settings`, it uses the player's: the profile's, or without a profile the ones in the game in play. If you leave out `seed`, it picks a random one.

```ts
newGameButton.onclick = () => runner.newGame()
newGamePlusButton.onclick = () => runner.newGame({ carry: runner.state })
```

### finished

If the game declares [`finished`](/docs/reference/state#new-game), the runner tests it after every command that takes. The first time it holds, and only if the profile has no `core:finished` yet, the runner writes `{ at }` there, the time from its `now` clock. It never writes it again, in this game or a later one. A runner without a profile doesn't record it.

After a command, the runner also gives each plugin with a [`profile`](/docs/reference/plugins#the-profile) the chance to update its namespace.

## CommandLog

```ts
type CommandLog = { game: string; start: GameState; commands: Command[] }
```

Everything you need to play a game back exactly: the game's id, the state it started from and every command that took since. Undo takes commands off the end, so the log always leads to the current state.

## replay

```ts
function replay(game: Game, log: CommandLog): Result<GameState>
```

Plays a command log back and returns the state it leads to, as a [`Result`](#result). The engine is deterministic, so the same log against the same game gives the same state every time.

The log's `start` goes through [`loadState`](/docs/reference/saves#loadstate) first, so a log made with an older engine or an older version of the game still plays. Commands written with names an older engine used, such as `{ type: 'use', itemId }`, are read with today's names. If the start can't be loaded, `replay` fails with the reason.

```ts
import { replay, type CommandLog } from '@ifloom/engine'

// A player's bug report: the log, as JSON.
const report: CommandLog = JSON.parse(text)
const played = replay(game, report)
if (played.ok) console.log(played.value.turn)

// Two versions of a game, played the same way.
const before = replay(oldGame, report)
const after = replay(newGame, report)
```

A command the game refuses is skipped, as it would have been at the time. Against a changed game, that means a log can go its own way after the first command that no longer takes. Compare the states to find where.

## See it in an example

Small Town: [`examples/showcase/src/main.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/main.tsx) makes its runner with `createRunner`, turning on `history`, `backlog`, `saves`, a `profile` and `autosave: { every: 'turn' }`. The Letter and The Corner Café use `mountGame`, which makes one for them.
