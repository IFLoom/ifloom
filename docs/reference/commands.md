# Commands

A command is one thing the player does: press a choice, use an item, go to bed. The UI sends commands; the engine returns the next [state](/reference/state). It is a pure function — same state, same pack, same command, same result.

```ts
import { apply, dispatch, startingState, type Command } from '@ifloom/engine'
```

## apply

```ts
function apply(state: GameState | null, game: Game, command: Command): Applied

type Applied = {
  state: GameState
  ok: boolean
  refused?: string
}
```

Runs a command and says whether it took. On a refusal, `ok` is `false`, `state` is the state you passed in (filled in for an older save, see below), and `refused` says why.

```ts
import { go } from '@ifloom/plugin-places'

const out = apply(state, town, go('cafe'))
if (!out.ok) console.log(out.refused) // "Closed. Opens tomorrow morning." in the evening: the café's `locked`
state = out.state
```

Use `apply` wherever the answer matters. A refused command and one that changed nothing leave the same state behind.

`refused` is always a sentence a player can be shown — the same line [`whyNot`](/reference/actions#whynot) gives and the view greys the button out with. The lines quoted on this page are the engine's English: each comes from the [strings table](/reference/strings#refusals), and a game, a pack or a translation can reword them (`finishFirst`, `noSuchScene` and so on). Lines the game wrote — a lock's `reason`, a requirement's `reason` — are printed as written.

### What happens, in order

1. `{ type: 'start' }` returns a brand-new game and stops here. With `state` `null`, any other command also returns a new game, as `startingState(game)` with no options, and is not run.
2. **Can the state be read?** If a [plugin](/reference/plugins)'s state in it is newer than the plugin, or has no [migration](/reference/plugins#migrateplugins) route forward, the command is refused with that reason and nothing runs.
3. The state is filled in for the current game: a storyline the save lacks gets an empty one, missing fields from an older shape get defaults, and each [plugin](/reference/plugins)'s state is brought up to date (see [`hydrate`](#hydrate)).
4. **Can it be done?** [`whyNot`](/reference/actions#whynot) answers, and a reason refuses the command with it: a [lock](/reference/locks) first, then a plugin's [guard](/reference/plugins#guards), then the game's own handler if it refuses, then what the command itself needs (below). The view greys buttons out with the same function, so a button and its refusal always read the same.
5. **A warning?** If [`warningOf`](/reference/actions#warningof) has one, the command is refused with it: a plugin guard's soft refusal, such as the [calendar](/plugins/calendar#the-guard)'s `That would run past dawn.` The view puts the same line on the button as its `warning`.
6. **The game's handler** — if [`rules.commands`](/reference/rules#commands) has a function for this type, it runs *instead of* the built-in one — **or the built-in handler**, described below.
7. **Triggers.** Each [trigger](/reference/triggers) that is due and whose condition now holds fires, in the order the game lists them, each on the state the one before it left. See [When triggers fire](/reference/triggers#when-triggers-fire).
8. If the player is now looking at a different scene than before, that scene's [`seen`](/reference/state#seen) count goes up by one, and [`seenOn`](/reference/state#seenon) records the current [turn](/reference/state#turn) if it is the first time. A scene a trigger opened counts.
9. Each plugin's [`after` hook](/reference/plugins#hooks) runs, in the order `game.plugins` lists them, with the state from before the command and the state after it.

Locks run before the game's own handler, so a lock can stop a command the game handles itself.

## dispatch

```ts
function dispatch(state: GameState | null, game: Game, command: Command): GameState
```

`apply(...).state`. For places where a refusal needs no handling, such as replaying a known-good list of commands in a test.

## startingState

```ts
function startingState(game: Game, options?: StartOptions): GameState

type StartOptions = {
  seed?: number
  flags?: Record<string, FlagValue>
}
```

A new game: turn 0, with `introScene` open and counted as seen. A game without `introScene` starts with no scene open and nothing seen, on its [idle screen](/reference/view#the-idle-screen). Each [plugin](/reference/plugins)'s state is its `start`: where the player stands is the [places plugin](/plugins/places#placesoptions)'s `start` option. Phase is `startPhase` or `''`. Every declared storyline is empty; each `gear` item is held once, each `stuff` item not at all, unless the item's `start` says otherwise. Each declared [stat](/reference/stats) is at its `start` — the engine adds no stats of its own. See [Game state](/reference/state) for the other fixed starting values.

| Option | What it does | Default |
|---|---|---|
| `seed` | The save's [seed](/reference/state#seed), which fixes every random draw it makes. | A hash of `game.id`, so every new game deals the same way. |
| `flags` | [Variables](/reference/state#flags) written before the first scene: a name asked for on a title screen, a difficulty. | None. |

```ts
// A UI starting a new game: a fresh seed, and the name from the title screen.
let state = startingState(town, { seed: Math.floor(Math.random() * 2 ** 31), flags: { playerName: 'Sam' } })

// A test: the same seed every run.
let fixed = startingState(town)
```

`apply(null, game, { type: 'start', seed, flags })` does the same.

**Gotcha.** Left out, the seed is the same for every new game of the same game, so every playthrough draws the same [variants](/reference/random) and [rolls](/reference/random#roll). That is what a test wants; a UI should pass a fresh seed for each new game.

The engine keeps no player name. A name is a variable like any other: pass it in `flags`, or ask for it with an [input](/reference/inputs). Prose reads it back with <code v-pre>{{playerName}}</code>, and [`SaveMeta.player`](/reference/saves#savemeta) shows a `playerName` variable that is a string.

## hydrate

```ts
function hydrate(state: GameState, game: Game): GameState
```

Fills in what an older state lacks for this game: an empty storyline for each declared storyline the save has never heard of, and empty defaults for fields added since the save was written (`seen`, `seenOn`, `chosen`, `collections`, `notices`, `fired`, `entities`, `created`, [`removed`](/reference/state#removed)), and `turn` 0 if the state has none. Every [entity](/reference/entities) the game declares that the save does not have — one a mod or a new version of the game declares, or a plugin's [`entities`](/reference/plugins#kinds-and-entities) make — is added at its start, unless [`state.removed`](/reference/state#removed) names it as removed in play. It then runs [`migratePlugins`](/reference/plugins#migrateplugins): a plugin added since the save starts fresh, and an older plugin state is carried forward. Returns the same object when nothing was missing. [`apply`](#apply) runs it on every command, so a game rarely needs it; call it when you read a loaded save directly before any command has run on it — to draw the first [`view`](/reference/view), say.

```ts
const state = hydrate(loadedSave, town) // a storyline, or a member of staff, added in an update is now there
```

**Gotcha.** `hydrate` never refuses. A plugin state it cannot carry forward, because it is newer than the plugin or has no migration route, is kept as it is. Drawing a [`view`](/reference/view) from it lets the plugin read a shape it may not expect. [`apply`](#apply) refuses to run a command on such a state, and [`saves().read`](/reference/saves#saves) refuses the save, both with the reason. For a state read some other way, call [`migratePlugins`](/reference/plugins#migrateplugins) yourself first.

## Command

```ts
type Command =
  | { type: 'start'; seed?: number; flags?: Record<string, FlagValue> }
  | { type: 'activity'; id: string }
  | { type: 'scene'; id: string }
  | { type: 'choose'; id: string }
  | { type: 'leave' }
  | { type: 'use'; itemId: string }
  | { type: 'dismiss'; id?: string }
  | { type: 'input'; id: string; value?: FlagValue }
  | { type: 'custom'; name: string; with?: Record<string, unknown> }
```

The union is closed: a game cannot add a command type. Something new to do in a room is an [activity](/reference/actions), not a command. A [plugin](/reference/plugins) adds its commands under the one type `custom`, by name. Going to bed is one: the [calendar](/plugins/calendar#commands)'s `{ type: 'custom', name: 'calendar/sleep' }`, written `sleep()`. Walking to another place is another: the [places plugin](/plugins/places#commands)'s `places/go`, written `go('cafe')`. So is talking to someone: the [cast](/plugins/cast#commands)'s `cast/talk` and `cast/call`, written `talk('ava')` and `call('ava')`.

Each built-in handler below runs only if no lock or plugin [guard](/reference/plugins#guards) stopped the command and the game has no handler for its type. The refusals listed for each come after a lock's and a guard's, and before a [warning](/reference/actions#warningof).

### start

Starts a new game, with this seed and these variables if given. Never refused, and not checked against locks. See [`startingState`](#startingstate).

### activity

Runs the [activity](/reference/actions) with this id: pays its cost, then applies its effects.

Refused with: `There is no such thing to do.`; the first reason from [`activityBlocked`](/reference/actions#activityblocked) (a scene is open, a lock, a requirement — such as the places plugin's [`onlyAt`](/plugins/places#helpers) — too little of a stat the cost spends); then a plugin guard's [warning](/reference/actions#warningof).

### scene

Opens a scene by id. Refused with `Finish this first.` or `There is no such scene.`

### choose

Takes a choice in the scene on screen. The scene is rendered against the current state, the choice is found by id, its count in [`chosen`](/reference/state#chosen) under `scene/choice` goes up by one, and its effects run in order.

Refused with: `There is nothing to choose.`; `That is not on offer.` (no such choice, or a hidden one); the choice's own `disabled` text; then a plugin guard's [warning](/reference/actions#warningof), such as the calendar's `That would run past dawn.` for a choice that passes time over the end of the day.

If the open scene id no longer exists in the game, `choose` closes it instead of refusing.

### leave

Closes the scene on screen. Never refused, even with no scene open.

### use

Uses one of an item: spends one, then runs the item's `use.effects`.

Refused with: `There is no such thing.`; `The <name> does not do anything.` (no `use`); `You have no <name>.`.

### dismiss

```ts
{ type: 'dismiss', id: 'rent' }   // that notice
{ type: 'dismiss' }               // all of them
```

Marks one [notice](/reference/notices), or every notice, seen. Has no refusal of its own — it works with a scene open, and with nothing to dismiss — so only a lock stops it. Ends no turn.

### input

```ts
{ type: 'input', id: 'catName', value: 'Biscuit' }
```

Writes what the player typed or picked to the [input](/reference/inputs)'s variable (`variable`, or the input's id), text trimmed. A button can carry the command without `value` for the UI to ask for one; sent without it, the command is refused. Takes no time, and works with a scene open.

Refused with a lock, then the line from [`inputRefusal`](/reference/inputs#inputrefusal): `There is no such thing to fill in.`, `Not now.`, `Enter something first.`, `Keep it to <n> characters.`, `Enter a number.`, `Between <min> and <max>.`, `At least <min>.`, `At most <max>.`, `That is not one of the options.`

### custom

```ts
{ type: 'custom', name: 'quests/track', with: { quest: 'bread' } }
```

Runs a [plugin's command](/reference/plugins#plugincommand) by its full name, the plugin's id in front. `with` is passed as its arguments, `{}` when left out.

Refused with: `There is no such thing to do.` (no plugin of the game has a command by that name); then the plugin's own `whyNot` line.

[`validatePack`](/reference/game#validatepack) reports a button whose command names no plugin command.
