# Commands

A command is one thing the player does, such as picking a choice, using an item or starting an activity. Your UI sends commands, and the engine returns the next [state](/reference/state). Running a command is a pure function, so the same state, game and command always give the same result.

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

Runs a command and says whether it took. On a refusal, `ok` is `false`, `state` is the state you passed in, and `refused` says why.

```ts
import { apply } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'

const out = apply(state, game, go('cafe'))
if (!out.ok) console.log(out.refused) // the reason, such as a place's `locked` line
state = out.state
```

Use `apply` wherever the answer matters, because a refused command and one that changed nothing leave the same state behind.

`refused` is always a sentence you can show the player. It's the same line [`whyNot`](/reference/actions#whynot) gives, and the view greys the button out with it. The lines quoted on this page are the engine's English from the [strings table](/reference/strings#refusals), and a game, a pack or a translation can reword them (`finishFirst`, `noSuchScene` and so on). Lines your game wrote, such as a lock's or a requirement's `reason`, are printed as written.

### What happens, in order

1. **A new game?** `{ type: 'start' }` returns a brand-new game and stops there. If `state` is `null`, any other command also returns a new game, as `startingState(game)` with no options, and the command isn't run.
2. **Can it be done?** [`whyNot`](/reference/actions#whynot) answers, and if it gives a reason the command is refused with it. It checks a [lock](/reference/locks) first, then a plugin's [guard](/reference/plugins#guards), then the game's own handler if it has one, then what the command itself needs (described below). A plugin command marked `ignoresLocks` skips the lock and guard checks, and so does [`setting`](#setting). The view greys buttons out with the same function, so a button and its refusal always read the same.
3. **A warning?** If [`warningOf`](/reference/actions#warningof) has one, the command is refused with it. This is a plugin guard's soft refusal, such as the [calendar](/plugins/calendar#the-guard)'s `That would run past dawn.` The view puts the same line on the button as its `warning`.
4. **Run it.** If [`rules.commands`](/reference/rules#commands) has a function for this type, it runs instead of the built-in handler. Otherwise the built-in handler described below runs.
5. **Triggers.** Each [trigger](/reference/triggers) that's due and whose condition now holds fires, in the order the game lists them, each on the state the one before it left. See [When triggers fire](/reference/triggers#when-triggers-fire).
6. **Seen.** If the player is now looking at a different scene than before, that scene's [`seen`](/reference/state#seen) count goes up by one, and [`seenOn`](/reference/state#seenon) records the current [turn](/reference/state#turn) if it's the first time. A scene a trigger opened counts.
7. **After hooks.** Each plugin's [`after` hook](/reference/plugins#hooks) runs, in the order `game.plugins` lists them, with the state from before the command and the state after it.

Locks are checked before the game's own handler, so a lock can stop a command the game handles itself.

## dispatch

```ts
function dispatch(state: GameState | null, game: Game, command: Command): GameState
```

Returns `apply(...).state`. Use it where a refusal needs no handling, such as replaying a known-good list of commands in a test.

## startingState

```ts
function startingState(game: Game, options?: StartOptions): GameState

type StartOptions = {
  seed?: number
  flags?: Record<string, FlagValue>
  settings?: Record<string, unknown>
  carry?: GameState
}
```

Returns a new game at turn 0, with `introScene` open and counted as seen. Every other state, such as a save, comes in through [`loadState`](/reference/saves#loadstate). `apply` expects a state from one of the two and doesn't check its shape itself. A game without `introScene` starts with no scene open and nothing seen, on its [idle screen](/reference/view#the-idle-screen).

- Each [plugin](/reference/plugins)'s state is its `start`. For example, where the player stands is the [places plugin](/plugins/places#placesoptions)'s `start` option.
- The phase is `game.startPhase`, or `''`.
- Every declared storyline is empty.
- Each `gear` item is held once and each `stuff` item not at all, unless the item's `start` says otherwise. `itemStart(item)` gives that number for one item.
- Each declared [stat](/reference/stats) is at its `start`. The engine adds no stats of its own.
- Each `play` [setting](/reference/settings) is at the value given in `settings`, or its default.

See [Game state](/reference/state) for the other starting values. The options object is optional, and so is each field in it:

| Option | What it does | Default |
|---|---|---|
| `seed` | The save's [seed](/reference/state#seed), which fixes every random draw it makes. | A hash of `game.id`, so every new game deals the same way. |
| `flags` | [Variables](/reference/state#flags) written before the first scene, such as a name asked for on a title screen. | None. |
| `settings` | The player's stored values for the game's `play` [settings](/reference/settings), usually the [profile](/reference/profile)'s `settings`. Unknown ids, `ui` settings and values a setting can't take are ignored. | Each setting's default. |
| `carry` | The state a finished game ended on, for a [New Game+](/reference/state#new-game). What `game.carryOver` lists is copied from it. | Nothing carried. |

```ts
import { startingState } from '@ifloom/engine'

// A UI starting a new game: a fresh seed, and the name from the title screen.
let state = startingState(game, { seed: Math.floor(Math.random() * 2 ** 31), flags: { playerName: 'Sam' } })

// A test: the same seed every run.
let fixed = startingState(game)
```

`apply(null, game, { type: 'start', seed, flags })` does the same.

**Gotcha.** If you leave the seed out, it's the same for every new game of the same game, so every playthrough draws the same [variants](/reference/random) and [rolls](/reference/random#roll). That's what a test wants, but a UI should pass a fresh seed for each new game.

The engine keeps no player name. A name is a variable like any other, so pass it in `flags` or ask for it with an [input](/reference/inputs). Prose reads it back with <code v-pre>{{playerName}}</code>, and [`SaveMeta.player`](/reference/saves#savemeta) shows a `playerName` variable that is a string.

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
  | { type: 'setting'; id: string; value: FlagValue }
  | { type: 'custom'; name: string; with?: Record<string, unknown> }
```

The union is closed, so a game can't add a command type. Something new for the player to do is an [activity](/reference/actions), not a command. A [plugin](/reference/plugins) adds its commands under the one type `custom`, by name. For example, walking somewhere is the [places plugin](/plugins/places#commands)'s `places/go`, which you write as `go('cafe')`, and talking to someone is the [cast](/plugins/cast#commands)'s `cast/talk`, written `talk('ava')`.

Each built-in handler below runs only if no lock or plugin [guard](/reference/plugins#guards) stopped the command and the game has no handler for its type. The refusals listed for each come after a lock's and a guard's, and before a [warning](/reference/actions#warningof).

### start

Starts a new game, with this seed and these variables if given. It's never refused and isn't checked against locks. See [`startingState`](#startingstate).

### activity

Runs the [activity](/reference/actions) with this id. It pays the activity's cost, then applies its effects.

It's refused with `There is no such thing to do.` if there's no such activity. After that comes the first reason from [`activityBlocked`](/reference/actions#activityblocked): a scene is open, a lock, a requirement (such as the places plugin's [`onlyAt`](/plugins/places#helpers)), or too little of a stat the cost spends. Last comes a plugin guard's [warning](/reference/actions#warningof).

### scene

Opens a scene by id. It's refused with `Finish this first.` if a scene is already open, or `There is no such scene.`

### choose

Takes a choice in the scene on screen. The scene is rendered against the current state and the choice is found by id. Its count in [`chosen`](/reference/state#chosen), under `scene/choice`, goes up by one, and then its effects run in order.

It's refused with, in order:

- `There is nothing to choose.` when no scene is open
- `That is not on offer.` when there's no such choice, or it's hidden
- the choice's own `disabled` text
- a plugin guard's [warning](/reference/actions#warningof), such as the calendar's `That would run past dawn.` for a choice that passes time over the end of the day

If the open scene's id no longer exists in the game, `choose` closes it instead of refusing. See [How choose checks a choice](/reference/scenes#how-choose-checks-a-choice).

### leave

Closes the scene on screen. It's never refused by the engine, even with no scene open, though a lock can stop it.

### use

Uses one of an item. It spends one, then runs the item's `use.effects`.

It's refused with `There is no such thing.` for an unknown item, `The <name> does not do anything.` for an item with no `use`, and `You have no <name>.` when the player has none.

### dismiss

```ts
{ type: 'dismiss', id: 'rent' }   // that notice
{ type: 'dismiss' }               // all of them
```

Marks one [notice](/reference/notices), or every notice, as seen. It has no refusal of its own, so it works with a scene open and with nothing to dismiss. Only a lock stops it. It doesn't end a turn.

### input

```ts
{ type: 'input', id: 'catName', value: 'Biscuit' }
```

Writes what the player typed or picked to the [input](/reference/inputs)'s variable (its `variable`, or the input's id), with text trimmed. A button can carry the command without `value` so the UI asks for one, but if it's sent without a value, it's refused. It takes no time and works with a scene open.

After a lock, it's refused with the line from [`inputRefusal`](/reference/inputs#inputrefusal): `There is no such thing to fill in.`, `Not now.`, `Enter something first.`, `Keep it to <n> characters.`, `Enter a number.`, `Between <min> and <max>.`, `At least <min>.`, `At most <max>.`, `That is not one of the options.`

### setting

```ts
{ type: 'setting', id: 'difficulty', value: 'hard' }
```

Changes a `play` [setting](/reference/settings) in the state. A settings screen sends it when the player changes one mid-game. It's a command like any other, so it goes in the runner's [log](/reference/runner#commandlog) and [`replay`](/reference/runner#replay) gives the same game. A runner with a [profile](/reference/profile) also stores the new value there, so the next new game starts with it.

No lock or plugin guard stops it, because changing a setting is the menu's business, not the story's. It's refused with:

- `There is no such setting.` for an id the game doesn't declare
- `That setting does not change the game.` for a `ui` setting, which never enters the state (use [`runner.setUiSetting`](/reference/runner#setuisetting))
- `Choose on or off.` for a toggle given anything but `true` or `false`
- `That is not one of the options.` for a choice given a value it doesn't list
- `Enter a number.`, `Between <min> and <max>.` or `In steps of <step>.` for a range

### custom

```ts
{ type: 'custom', name: 'quests/track', with: { quest: 'bread' } }
```

Runs a [plugin's command](/reference/plugins#plugincommand) by its full name, with the plugin's id in front. `with` is passed as its arguments, or `{}` when left out.

It's refused with `There is no such thing to do.` if none of the game's plugins has a command by that name, and then with the plugin's own `whyNot` line. A command its plugin marks `ignoresLocks` skips the lock and guard checks.

The [content checker](/reference/checks#in-a-command) reports a button whose command names no plugin command, unless the plugin is an [absent partner](/reference/checks#absent-partners).
