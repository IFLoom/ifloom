# The runner

The runner is the one object a UI drives. It wraps [`apply`](/reference/commands) with what every game's UI would otherwise build for itself — undo and redo, a backlog of what was shown, a command log, saving, loading and autosave — and tells listeners when the state changes.

```ts
import {
  createRunner, replay,
  type Runner, type RunnerOptions, type HistoryOptions, type BacklogOptions,
  type AutosaveOptions, type BacklogEntry, type CommandLog,
} from '@ifloom/engine'
```

Everything but the command log is **off unless the game turns it on**. A runner with no options is `apply` plus a subscription. For a walk-through, see [Your first game](/guide/first-game#_10-drive-it-with-a-runner).

## createRunner

```ts
function createRunner(game: Game, start: GameState, options?: RunnerOptions): Runner
```

Starts a runner on `start` — usually [`startingState`](/reference/commands#startingstate), or a state from a save.

```ts
const runner = createRunner(game, startingState(game, { flags: { playerName: 'Sam' } }), {
  saves: saves(game, indexedDbDriver()),
  history: { stopAtNewTurn: true },
  backlog: true,
  autosave: { every: 'scene' },
})

runner.subscribe(() => render(runner.view()))
runner.apply(go('high-street'))   // go from @ifloom/plugin-places
```

## RunnerOptions

```ts
type RunnerOptions = {
  saves?: Saves
  history?: HistoryOptions | boolean
  backlog?: BacklogOptions | boolean
  autosave?: AutosaveOptions
  now?: () => number
  onSaveError?: (error: unknown) => void
}
```

| Option | What it does | Default |
|---|---|---|
| `saves` | The [save store](/reference/saves#saves) that `save`, `load` and autosave use. Needed for any of them. | none |
| `history` | Undo and redo. `true` turns it on with the defaults below. | off |
| `backlog` | Keep what was shown, turn by turn. `true` turns it on with the defaults below. | off |
| `autosave` | Save on its own after commands. Does nothing without `saves`. | off |
| `now` | The clock for time played, in milliseconds. Tests pass their own. | `Date.now` |
| `onSaveError` | Told when an autosave or `save` fails to write. Later writes still run. | failures dropped |

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
| `stopAtIrreversible` | No undo past a choice that carries [`irreversible`](/reference/scenes#scenechoice). | `true` |
| `stopAtNewTurn` | No undo past the start of a new [turn](/reference/state#turn): past the command that ended the last one: a choice or an activity with a [`turn`](/reference/effects#turn) effect, or the [calendar](/plugins/calendar#commands)'s bed. | `false` |
| `stopWhen` | No undo past any state where this [condition](/reference/conditions) holds, tested after each command. | none |

A **barrier** is a command after which undo cannot go back: the irreversible choice itself, the command that started the turn, the command that made `stopWhen` hold. Undo history is cleared at a barrier and builds up again from there.

```ts
// No taking back anything once the rent is paid.
history: { stopWhen: { flag: 'rentPaid' } }
```

Undo cannot re-roll anything. Every draw is seeded from the save, the turn and a name (see [Randomness](/reference/random)), so playing the same command again from the same state deals the same card.

## BacklogOptions

```ts
type BacklogOptions = { limit?: number }
```

How many entries the backlog keeps; the oldest drop off first. Default `200`.

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

One scene as the player saw it, for a "what did she just say?" screen. `beats` are the [view's beats](/reference/prose#scenebeat), already parsed. `chose` is the label of the choice the player made **in** this scene — not the one that led to it — and is missing while the scene is still waiting for one, or when the player left it some other way.

How the backlog grows, command by command:

- **The scene on screen goes in first.** If the scene showing before the command is not already the last entry, it is added with the turn and the [`when`](/reference/view#the-clock-and-the-player) of the screen it was shown on. That is how the opening scene, or one a trigger opened, gets recorded.
- **A choice's label is written on it.** A `choose` command sets `chose` on that entry.
- **A new scene goes in after.** A scene the command opened is added as a new entry.
- **A redraw is a new entry.** A choice that leaves the same scene on screen with new beats adds it again, so each screen keeps its own choice.
- **Leaving adds nothing.** A choice that closes the scene and returns to the idle screen adds no entry; neither does walking between rooms with no scene open (the [places plugin](/plugins/places)'s `go`).

```ts
// The game opens on the café counter. Chat about the weather, then leave.
const runner = createRunner(game, start, { backlog: true })
runner.apply({ type: 'choose', id: 'chat' })
runner.apply({ type: 'choose', id: 'leave' })
runner.backlog().map((entry) => [entry.sceneId, entry.chose])
// [['cafe.counter', 'Talk about the weather'], ['cafe.counter', 'Leave']]
runner.apply(go('high-street'))
runner.backlog().length // still 2
```

The choice came at the end of the scene: in the order the player saw them, an entry's beats come first and its `chose` after.

## AutosaveOptions

```ts
type AutosaveOptions = {
  slot?: string
  every: 'command' | 'scene' | 'turn'
}
```

| `every` | Saves after |
|---|---|
| `'command'` | every command that took. |
| `'scene'` | a command that opened, changed or closed the scene. |
| `'turn'` | a command that started a new [turn](/reference/state#turn) — going to bed, in a game with the [calendar](/plugins/calendar). |

`slot` defaults to `'auto'`. Autosaves are written in the background, in order; await [`settled()`](#the-runner-s-members) before reading the slot back.

`undo`, `redo`, `load` and `restore` follow the same policy as a command: under `every: 'command'` they write the slot, so after an undo the autosave holds the state you stepped back to.

A write that fails is reported to `onSaveError` and does not stop the writes after it.

## The runner's members

`Runner` is `ReturnType<typeof createRunner>`.

| Member | What it does |
|---|---|
| `game` | The game it plays. |
| `state` | The current [`GameState`](/reference/state). Read-only; change it through `apply`. |
| `view()` | [`view(state, game)`](/reference/view) for the current state. |
| `apply(command)` | Runs a command and returns [`Applied`](/reference/commands#apply): `ok`, the next `state`, and `refused` when it did not take. A refused command changes nothing — no history, no log entry, no listeners called. |
| `undo()` / `redo()` | Step back or forward one command. Return `false` when there is nothing to do. A new command after an undo clears redo. |
| `canUndo` / `canRedo` | Whether there is anything to undo or redo, for greying out the buttons. Always `false` with history off. |
| `backlog()` | The backlog, oldest first. Empty with the backlog off. Undo takes it back to where it was. |
| `log()` | The [`CommandLog`](#commandlog): the start state and every command since. Always kept. |
| `saves` | The [`Saves`](/reference/saves#saves) store the runner was made with, or `undefined`. A save menu lists, exports and imports through it. |
| `offers` | `{ undo: boolean, backlog: boolean }`: whether the game turned on `history` and `backlog`. A menu shows only what is on offer. |
| `played()` | Time played in milliseconds, counting from the time recorded in any save loaded. |
| `save(slot, name?)` | Writes the current state to a slot now, with the time played, and returns its [`SaveMeta`](/reference/saves#savemeta). `name` defaults to one made from when and where: see [`SaveMeta`](/reference/saves#savemeta). |
| `load(slot)` | Reads a slot and, if it can, plays on from it: a fresh history, backlog and log, and the time played the save recorded. Returns the [`LoadedSave`](/reference/saves#loadedsave), `null` for an empty slot, or a string saying why the save could not be read — and on either of those the runner is unchanged. |
| `restore(loaded)` | Plays on from a save that did not come from a slot — a file the player imported with [`saves.importText`](/reference/saves) — exactly as `load` would: fresh history, backlog and log, and the time played it recorded. |
| `settled()` | Resolves when every autosave so far has been written (or has failed and been reported). |
| `subscribe(listener)` | Calls `listener(state)` after every change of state — a command, an undo, a redo, a load. Returns a function that stops it. |

`save` and `load` throw if the runner was given no `saves`.

```ts
undoButton.disabled = !runner.canUndo
undoButton.onclick = () => runner.undo()

const loaded = await runner.load('quick')
if (typeof loaded === 'string') showMessage(loaded)
else if (loaded?.missingPacks.length) showMessage(`Made with mods you do not have: ${loaded.missingPacks.join(', ')}`)
```

**Gotcha:** a `load` starts the command log again from the loaded state. A bug report should carry the log together with the save it started from — or simply `log()`, whose `start` is that state.

## CommandLog

```ts
type CommandLog = { game: string; start: GameState; commands: Command[] }
```

Everything needed to play a game back exactly: the game's id, the state it started from and every command that took since. Undo takes commands off the end, so the log always leads to the current state.

## replay

```ts
function replay(game: Game, log: CommandLog): GameState
```

Plays a command log back and returns the state it leads to. The engine is deterministic, so the same log against the same game gives the same state every time.

```ts
// A player's bug report: the log, as JSON.
const report: CommandLog = JSON.parse(text)
const state = replay(game, report)

// Two versions of a game, played the same way.
const before = replay(oldGame, report)
const after = replay(newGame, report)
```

A command the game refuses is skipped, as it would have been then. Against a changed game, that means a log can go its own way after the first command that no longer takes — compare the states to find where.
