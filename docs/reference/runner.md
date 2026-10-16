# The runner

The runner is the one object your UI drives. It wraps [`apply`](/reference/commands#apply) with the things every game's UI would otherwise build for itself: undo and redo, a backlog of what was shown, a command log, saving, loading and autosave. It also tells listeners when the state changes.

```ts
import {
  createRunner, browserRunner, replay,
  type Runner, type RunnerOptions, type HistoryOptions, type BacklogOptions,
  type AutosaveOptions, type BacklogEntry, type CommandLog, type StartOptions,
} from '@ifloom/engine'
```

Everything but the command log is off unless you turn it on, so a runner with no options is `apply` plus a subscription. For a walk-through, see [A game with a world](/guide/first-game#_10-drive-it-with-a-runner).

If you use the React UI, you usually don't call `createRunner` yourself. [`mountGame`](/react/#mountgame) makes the runner with [`browserRunner`](#browserrunner), which sets up undo 50 deep, saves and a [profile](/reference/profile) in `localStorage`, an autosave each turn and a random seed. It draws the game into the page and returns the runner. Its `runner` option is merged over those defaults. In a browser without React, call `browserRunner` yourself. Build the runner with `createRunner`, as below, when you want something different.

## createRunner

```ts
function createRunner(game: Game, start: GameState, options?: RunnerOptions): Runner
```

Starts a runner on `start`, which is usually [`startingState`](/reference/commands#startingstate) or a state from a save. A state from anywhere else goes through [`loadState`](/reference/saves#loadstate) first, since the runner doesn't check its shape. This is how the showcase makes its runner:

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
function browserRunner(
  game: Game,
  options?: RunnerOptions & { start?: GameState; settings?: Record<string, unknown> },
): Runner
```

A runner with what most games in a browser want. It's `createRunner` with these defaults:

| | Default |
|---|---|
| `start` | A new game, `startingState(game, { seed, settings })`, with a random seed so each playthrough draws its own variants. |
| `settings` | None, so every `play` [setting](/reference/settings) starts at its default. |
| `history` | `{ depth: 50 }`, so undo goes 50 steps back. |
| `saves` | `saves(game, localStorageDriver())`, saves in the browser's `localStorage` under keys that start with the game's id. |
| `profile` | `profile(game, localStorageDriver())`, the [profile](/reference/profile) at `<game id>.profile` in the same `localStorage`. |
| `autosave` | `{ every: 'turn' }`, to the `auto` slot. |

Pass `start` to begin from another state, and any [`RunnerOptions`](#runneroptions) to change the rest. They're merged over the defaults, one option at a time. [`mountGame`](/react/#mountgame) uses it, and so does the `vanilla` template:

```ts
import { browserRunner } from '@ifloom/engine'

const runner = browserRunner(game, { backlog: { limit: 200 } })

runner.subscribe(() => draw(runner.view()))
draw(runner.view())
```

**Starting with the player's settings.** `browserRunner` returns straight away, so it can't wait for the profile to be read. If your game has `play` settings, read them first and pass them in. The profile you read from is the one the runner should keep, so pass it too:

```ts
import { browserRunner, localStorageDriver, profile } from '@ifloom/engine'

const stored = profile(game, localStorageDriver())
const runner = browserRunner(game, { profile: stored, settings: await stored.get('settings') })
```

If you can't wait at that point, start the runner without `settings` and call [`await runner.newGame()`](#newgame) when the player presses New game. `newGame` reads the stored settings itself.

**Gotcha.** Its saves and profile go to `localStorage`, which a test or a script in Node doesn't have. The runner still starts there, but every save, autosave and profile write fails with `localStorage is not available here`. Pass your own stores, such as `{ saves: saves(game, memoryDriver()), profile: profile(game, memoryDriver()) }` with [`memoryDriver`](/reference/saves#memorydriver), or use `createRunner`.

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
| `saves` | The [save store](/reference/saves#saves) that `save`, `load` and autosave use. You need it for any of them. | none |
| `history` | Undo and redo. `true` turns it on with the defaults below. | off |
| `backlog` | Keeps what was shown, turn by turn. `true` turns it on with the defaults below. | off |
| `autosave` | Saves by itself after commands. Does nothing without `saves`. | off |
| `now` | The clock for time played, and for when `finished` is recorded, in milliseconds. Tests pass their own. | `Date.now` |
| `onSaveError` | Told when an autosave or a [profile](/reference/profile) write fails. Later writes still run. | failures dropped |
| `profile` | The [profile](/reference/profile) the runner writes settings, [`finished`](#finished) and plugins' namespaces to. You need it for `setUiSetting`. | none |

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
| `stopAtIrreversible` | No undo past a choice marked [`irreversible`](/reference/scenes#scenechoice). | `true` |
| `stopAtNewTurn` | No undo past the start of a new [turn](/reference/state#turn), meaning past the command that ended the last one. That's a choice or an activity with a [`turn`](/reference/effects#turn) effect, or the [calendar](/plugins/calendar#commands)'s bed. | `false` |
| `stopWhen` | No undo past any state where this [condition](/reference/conditions) holds, tested after each command. | none |

A barrier is a command that undo can't go back past: the irreversible choice itself, the command that started the turn, or the command that made `stopWhen` hold. Undo history is cleared at a barrier and builds up again from there.

```ts
// No taking anything back once the rent is paid.
history: { stopWhen: { flag: 'rentPaid' } }
```

A [`tick`](/reference/commands#tick) is no step of its own. One undo goes back to before the last command that wasn't a tick, so a minigame's clock doesn't fill the history. A tick that crosses a barrier, such as a timer whose final state ends a turn, still clears it.

Undo can't re-roll anything. Every draw is seeded from the save, the turn and a name (see [Randomness](/reference/random)), so playing the same command again from the same state deals the same card.

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

One scene as the player saw it, for a "what did she just say?" screen. `beats` are the [view's beats](/reference/prose#scenebeat), already parsed. `chose` is the label of the choice the player made in this scene, not the one that led to it. It's missing while the scene is still waiting for a choice, or when the player left it some other way.

This is how the backlog grows, command by command:

- **The scene on screen goes in first.** If the scene showing before the command isn't already the last entry, it's added with the turn and the [`when`](/reference/view#the-clock-and-the-player) of the screen it was shown on. That's how the opening scene, or one a trigger opened, gets recorded.
- **A choice's label is written on it.** A `choose` command sets `chose` on that entry.
- **A new scene goes in after.** A scene the command opened is added as a new entry.
- **A redraw is a new entry.** A choice that leaves the same scene on screen adds it again with its new beats, so each screen keeps its own choice.
- **Ticks add nothing**, and nor does a [minigame](/reference/minigames) drawn over a scene. The scene a minigame's ending opens goes in with the next command that isn't a tick, as the scene on screen.
- **Leaving adds nothing.** A choice that closes the scene adds no entry, and neither does walking between places with no scene open (the [places plugin](/plugins/places)'s `go`).

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
| `'command'` | every command that took, except a [`tick`](/reference/commands#tick). |
| `'scene'` | a command that opened, changed or closed the scene. |
| `'turn'` | a command that started a new [turn](/reference/state#turn), such as going to bed in a game with the [calendar](/plugins/calendar). |

A tick saves under `'scene'` or `'turn'` only when it changed the scene or the turn, such as a minigame's timer running out into a final state that ends the turn.

`slot` defaults to `'auto'`. Autosaves are written in the background, in order. Await [`settled()`](#the-runner-s-members) before reading the slot back.

`undo`, `redo`, `load` and `restore` follow the same policy as a command. Under `every: 'command'` they write the slot, so after an undo the autosave holds the state you stepped back to.

A write that fails is reported to `onSaveError`, and doesn't stop the writes after it.

## The runner's members

`Runner` is `ReturnType<typeof createRunner>`.

| Member | What it does |
|---|---|
| `game` | The game it plays. |
| `state` | The current [`GameState`](/reference/state). It's read-only, so change it through `apply`. |
| `view()` | [`view(state, game)`](/reference/view) for the current state, built once per state. See [The view cache](#the-view-cache). |
| `apply(command)` | Runs a command and returns [`Applied`](/reference/commands#apply): `ok`, the next `state`, and `refused` when it didn't take. A refused command changes nothing. It adds no history or log entry and calls no listeners. |
| `undo()` / `redo()` | Steps back or forward one command. Returns `false` when there's nothing to do. A new command after an undo clears redo. |
| `canUndo` / `canRedo` | Whether there's anything to undo or redo, for greying out the buttons. Always `false` with history off. |
| `backlog()` | The backlog, oldest first. Empty with the backlog off. Undo takes it back to where it was. |
| `log()` | The [`CommandLog`](#commandlog): the start state and every command since. Always kept. |
| `saves` | The [`Saves`](/reference/saves#saves) store the runner was made with, or `undefined`. A save menu lists, exports and imports through it. |
| `offers` | `{ undo: boolean, backlog: boolean }`: whether the game turned on `history` and `backlog`, so a menu shows only what's on offer. |
| `played()` | Time played in milliseconds, counting from the time recorded in any save loaded. |
| `save(slot, name?)` | Waits for any autosaves in progress, then writes the current state to a slot with the time played. Resolves to its [`SaveMeta`](/reference/saves#savemeta). `name` defaults to one made from when and where (see [`SaveMeta`](/reference/saves#savemeta)). |
| `load(slot)` | Reads a slot through the save store, which loads its state with [`loadState`](/reference/saves#loadstate), and, if it can, plays on from it with a fresh history, backlog and log, and the time played the save recorded. Resolves to the [`LoadedSave`](/reference/saves#loadedsave), to `null` for an empty slot, or to a string saying why the save couldn't be read. On `null` or a string, the runner is unchanged. |
| `restore(loaded)` | Plays on from a save that didn't come from a slot, such as a file the player imported with [`saves.importText`](/reference/saves), exactly as `load` would. The [`LoadedSave`](/reference/saves#loadedsave) has already been through `loadState`. |
| `settled()` | Resolves when every autosave and profile write so far has been written, or has failed and been reported. |
| `profile` | The [`Profile`](/reference/profile) the runner was made with, or `undefined`. |
| `setUiSetting(id, value)` | Changes a `ui` setting in the profile. See [below](#setuisetting). |
| `newGame(options?)` | Starts a new game in place. See [below](#newgame). |
| `subscribe(listener)` | Calls `listener(state)` after every change of state: a command, an undo, a redo, a load or a new game. Returns a function that stops it. |

`save` and `load` are async, and their promises can reject. Both reject if the runner was given no `saves`. They also reject if the save store's driver throws while writing or reading, because `onSaveError` only hears about autosaves. Catch the error where you call them:

```ts
undoButton.disabled = !runner.canUndo
undoButton.onclick = () => runner.undo()

try {
  await runner.save('quick')
} catch (error) {
  showMessage(`Couldn't save: ${String(error)}`)
}

const loaded = await runner.load('quick')
if (typeof loaded === 'string') showMessage(loaded)
else if (loaded?.missingPacks.length) showMessage(`Made with mods you don't have: ${loaded.missingPacks.join(', ')}`)
```

**Gotcha:** a `load` starts the command log again from the loaded state. A bug report should carry the log together with the save it started from, or simply `log()`, whose `start` is that state.

### The view cache

`runner.view()` keeps the view it built and the state it built it for. Asked again while the state is the same object, it returns the same view without building it again. After a command, an undo or a load, the state is a new object, so the next call builds a new view.

This means everything that reads the view can call `runner.view()` freely. In a browser, the backlog, the [React UI](/react/) and the [audio player](/reference/audio-player) all read it after each command, and the view is built once between them. `apply` also uses the view the UI last read to write the backlog, rather than building the one it was sent from again.

```ts
runner.apply({ type: 'choose', id: 'open' })
runner.view() === runner.view()  // true: one view for the new state
```

**Gotcha.** Only the latest state's view is kept. Calling [`view`](/reference/view#view) yourself always builds a new one, so in a UI driven by a runner, read `runner.view()`.

### setUiSetting

```ts
runner.setUiSetting(id: string, value: FlagValue): string | undefined
```

Changes a `ui` [setting](/reference/settings), such as a text size, and writes it to the profile's `settings`. It never touches the state, so it adds nothing to the log or history and calls no listeners. It returns why the value was refused, with the same lines as the [`setting`](/reference/commands#setting) command, or `undefined` when it took. A `play` setting is refused with `That setting changes the game, so it is set with a command.`

```ts
const refused = runner.setUiSetting('textSize', 'large')
if (!refused) document.body.dataset.textSize = 'large'
```

The write happens in the background. Await `settled()` if you need it done. It throws if the runner has no `profile`.

A `play` setting goes through `apply({ type: 'setting', id, value })` instead. When that takes, the runner writes the new value to the profile's `settings` too, so the next new game starts with it.

### newGame

```ts
runner.newGame(options?: StartOptions): Promise<GameState>
```

Starts a new game in place, with a fresh history, backlog and log and no time played, and tells listeners. It takes the same options as [`startingState`](/reference/commands#startingstate). If you leave out `settings`, it reads them from the profile. If you leave out `seed`, it picks a random one.

```ts
newGameButton.onclick = () => runner.newGame()
newGamePlusButton.onclick = () => runner.newGame({ carry: runner.state })
```

### finished

If the game declares [`finished`](/reference/state#new-game), the runner tests it after every command that takes. The first time it holds, and only if the profile has no `finished` yet, the runner writes `{ at }` there, the time from its `now` clock. It never writes it again, in this game or a later one. A runner without a profile doesn't record it.

After a command, the runner also gives each plugin with a [`profile.onCommand`](/reference/plugins#the-profile) the chance to update its namespace.

## CommandLog

```ts
type CommandLog = { game: string; start: GameState; commands: Command[] }
```

Everything you need to play a game back exactly: the game's id, the state it started from and every command that took since. Undo takes commands off the end, so the log always leads to the current state.

## replay

```ts
function replay(game: Game, log: CommandLog): GameState | string
```

Plays a command log back and returns the state it leads to. The engine is deterministic, so the same log against the same game gives the same state every time.

The log's `start` goes through [`loadState`](/reference/saves#loadstate) first, so a log made with an older engine or an older version of the game still plays. If it can't be loaded, `replay` returns the reason instead of a state.

```ts
import { replay, type CommandLog } from '@ifloom/engine'

// A player's bug report: the log, as JSON.
const report: CommandLog = JSON.parse(text)
const state = replay(game, report)

// Two versions of a game, played the same way.
const before = replay(oldGame, report)
const after = replay(newGame, report)
```

A command the game refuses is skipped, as it would have been at the time. Against a changed game, that means a log can go its own way after the first command that no longer takes. Compare the states to find where.
