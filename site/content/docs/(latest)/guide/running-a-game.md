---
title: "Running a game"
description: "The engine as a library: make a runner with browserRunner or createRunner, read runner.view(), send the player's commands, redraw when it changes, and what the view holds. Works in a browser, in Node and in a test."
---
Here you drive the engine directly, with no UI package in between. The code works the same in a browser, in Node and in a test, and it's what every UI, including the [React UI](/docs/react), does underneath.

You'll need a game to run. The one `ifloom new` makes is enough, or the one from [Your first story](/docs/guide/first-story).

## Make a runner

A [runner](/docs/reference/runner) holds the game in play and is the one object your code talks to. There are two ways to make one.

In a browser, use [`browserRunner`](/docs/browser#browserrunner). It starts a new game with a random seed, keeps 50 steps of undo, saves to `localStorage` and autosaves each turn:

```ts
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game } = module.build()

const runner = await browserRunner(game)
```

Anywhere else, or when you want to choose every option yourself, use [`createRunner`](/docs/reference/runner#createrunner). It takes the state to start from, and turns on nothing you don't ask for:

```ts
import { createRunner, startingState } from '@ifloom/engine'
import module from './game.ts'

const { game, problems } = module.build()
if (problems.length) console.warn(problems)

const runner = createRunner(game, startingState(game), { history: true })
```

[`startingState`](/docs/reference/commands#startingstate) builds a new game. Without a `seed` it uses one made from the game's id, so every run draws the same random variants, which is what you want in a test. A game in front of a player passes its own, `startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) })`, as `browserRunner` does.

## The loop

A UI needs three things from the runner:

```ts
runner.view()              // View: what to draw right now
runner.apply(command)      // run a command, such as a choice the player pressed
runner.subscribe(listener) // call listener after every change of state; returns a function that stops it
```

The loop is the same whatever draws the screen:

1. Draw `runner.view()`.
2. When the player presses something, send its `command` with `runner.apply`.
3. When the runner calls your listener, draw `runner.view()` again.

```mermaid
sequenceDiagram
  participant UI as Your UI
  participant R as runner
  UI->>R: subscribe(listener)
  UI->>R: view()
  R-->>UI: View
  Note over UI: draw it
  UI->>R: apply(command)
  alt the command took
    R->>UI: listener(state)
    UI->>R: view()
    R-->>UI: the next View
    Note over UI: draw it again
  else it was refused
    R-->>UI: ok false, and the reason
  end
```

`subscribe` hears about every change, not only your own commands. Undo, redo, loading a save and a new game all call it too, so you don't need to redraw after each of those yourself.

`runner.view()` returns the same object until the state changes (see [the view cache](/docs/reference/runner#the-view-cache)). You can call it as often as you like, and a framework that compares values to decide what to redraw sees a new view exactly when there's something new to draw.

## Send commands

Every button in the view carries the command it sends, so most of the time you pass it straight back:

```ts
for (const choice of runner.view().scene.choices) {
  // choice.label: 'Knock'
  // choice.command: { type: 'choose', id: 'knock' }
  // choice.disabled: why it can't be pressed, or undefined
}

const result = runner.apply(choice.command)
if (!result.ok) console.warn(result.reason)
```

`apply` answers with a [`Result`](/docs/reference/runner#result). On success, `result.value` is the next state. On a refusal, `result.reason` says why in words a player can read, and nothing changed. A greyed-out button already carries the same reason as `disabled`, so show it next to the button rather than hiding it.

A few commands come from things that aren't buttons. You build those yourself:

| Command | When to send it |
|---|---|
| `{ type: 'input', id, to }` | The player entered a value the game asked for, such as a name. See [Inputs](/docs/reference/inputs). |
| `{ type: 'minigame', input }` | The player pressed one of a running minigame's inputs. |
| `{ type: 'tick', ms }` | Time passed during a minigame. [`startClock`](/docs/browser#startclock) sends it for you in a browser. |
| `{ type: 'dismiss' }` | The player cleared the notices. |

[Commands](/docs/reference/commands) lists them all. A plugin's own commands are made by its helpers, such as `places.go('cafe')` from the [places plugin](/docs/plugins/places#commands), and its buttons in the view carry them like any other.

## What's in the view

The [view](/docs/reference/view) is one plain object. These are the parts most screens draw:

| Field | What it holds |
|---|---|
| `title` | The game's title. |
| `when` | Where the game is in time and place, in the plugins' words, such as `'Day 2 · Tuesday morning · The corner café'`. `null` without a plugin that says. |
| `scene.title`, `scene.beats` | The open scene's title and its paragraphs, already parsed into [beats](/docs/reference/prose#scenebeat): narration, a spoken line, a picture, a letter. With no scene open, it's the stage, such as the room the player is in. |
| `scene.choices` | The scene's choices, each with its `label`, `command`, and `disabled` reason when it can't be picked. |
| `actions` | The buttons on the idle screen, with no scene open: the plugins' and the game's own, each with its `price`. |
| `stats`, `statsById` | The player's stats, as text ready to show, such as `'5c'`. `stats` lists the visible ones in order, and `statsById` has every one by id. |
| `inputs` | The values the game is asking for now, such as the player's name. |
| `minigame` | The minigame being played, or `null`. |
| `notices` | News the player hasn't dismissed, with counts by tag for badges. |
| `settings` | Every setting the game declares, to draw a settings screen. See [Saves and settings](/docs/guide/saves-and-settings). |
| `audio` | What should be playing. [`@ifloom/audio`](/docs/browser/audio-player) plays it for you. |
| `plugins` | Each plugin's own part, by plugin id. |

A plugin's part is typed `unknown` in the view, because the engine doesn't know which plugins a game has. Read it with the plugin's own type, or with `viewIn` on a plugin made with [`definePlugin`](/docs/reference/plugins#defineplugin):

```ts
import type { PlacesView } from '@ifloom/plugin-places'

const room = runner.view().plugins.places as PlacesView | undefined
for (const exit of room?.exits ?? []) console.log(exit.label, exit.disabled ?? '')
```

You never read the state to decide what to draw. The view already says what can be pressed and why not, and the engine refuses commands with the same reasons, so the screen and the rules can't disagree.

## Undo, redo and a new game

With `history` on, the runner keeps the steps behind the player:

```ts
runner.canUndo   // whether there's anything to undo, for greying out the button
runner.undo()
runner.redo()
await runner.newGame() // start again in place, with a fresh history
```

Each of these calls your listener, so the screen redraws by itself. [The runner](/docs/reference/runner#historyoptions) has the options, such as no undo past the start of a turn.

## Play it without a browser

Nothing above needs a page. This script plays the `ifloom new` template's game in Node and prints each screen. Run it with `node play.ts`, as Node 22.18 and later run TypeScript directly:

```ts
// play.ts
import { createRunner, startingState, type View } from '@ifloom/engine'
import loaded from './src/game.ts'

const { game } = loaded
const runner = createRunner(game, startingState(game))

function print(view: View): void {
  console.log(`\n# ${view.scene.title}`)
  for (const beat of view.scene.beats) if ('text' in beat) console.log(beat.text)
  view.scene.choices.forEach((choice, at) => console.log(`${at + 1}. ${choice.label}${choice.disabled ? ` (${choice.disabled})` : ''}`))
}

runner.subscribe(() => print(runner.view()))
print(runner.view())

runner.apply({ type: 'choose', id: 'knock' })
console.log(runner.state.stats) // { courage: 2 }
```

A test does the same, with assertions in place of `console.log`. See [Testing your game](/docs/guide/testing).

## Next

- [Saves and settings](/docs/guide/saves-and-settings) adds a save menu and settings to the loop.
- [A UI from scratch](/docs/guide/ui-from-scratch) draws the whole view in the browser in plain JS.
- [The runner](/docs/reference/runner) and [The view](/docs/reference/view) list every member and field.
