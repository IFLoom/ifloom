---
title: "Minigames"
description: "A minigame is a small game inside the story, declared as data with states, inputs and timers, and run by ticks."
---
A minigame is a small game inside the story, such as a timed button press, a lock to pick or a round of snap. Your content declares each one in `minigames` as data, a few states with the inputs each listens for, timers that move it on and numbers it keeps while it runs. The [`minigame` effect](/docs/reference/effects#minigame) starts one, and the player plays it with the [`minigame`](/docs/reference/commands#minigame) and [`tick`](/docs/reference/commands#tick) commands. [Build a minigame](/docs/how-to/build-a-minigame) writes one from start to finish.

In the showcase: `examples/showcase/src/story/park.ts`, whose `arrows` minigame is five rounds of arrows to press in time, started by the park's `arrows` action.

```ts
import type { MinigameDef, MinigameInput, MinigameSceneFields, MinigameState, MinigameStateDef, MinigameTarget, MinigameTransition, MinigameView } from '@ifloom/engine'
```

## MinigameDef

A small game the game declares in `minigames`, made of named states. Every field is in [`MinigameDef`](/docs/api/engine#minigamedef).

A minigame starts in its `start` state, with each key of its `kv` at the number it's declared with. Starting one while another runs drops the old one. While it runs, the view renders it over the open scene or the room. `view.scene` keeps the scene's id, takes the minigame's `title`, and holds the running state's words as its body, with no choices or actions. The engine refuses every command but `tick`, `minigame`, `dismiss` and `setting` with `Finish this first.`, apart from a plugin command that ignores locks, such as the [debug plugin](/docs/reference/plugins/debug)'s.

`kv` is the minigame's own kv store, named `of: 'minigame'`, for a score, a round or a streak. The [`kv` effect](/docs/reference/effects#kv) changes a key, as in `{ kv: 'score', of: 'minigame', by: 1 }`, the [`kv` condition](/docs/reference/conditions#kv) reads it, and prose prints it with `{{kv:score of=minigame}}`. Every key is a number, and every key the minigame uses has to be declared in `kv`. The store goes when the minigame ends, unless the final state's `copy` writes keys to the game's kv store.

`keys` maps each input to the keyboard keys a UI binds to it, as `KeyboardEvent.key` names them. Minigames merge by id, so a pack's minigame replaces one with the same id.

```ts
import type { MinigameDef } from '@ifloom/engine'

export const coinToss: MinigameDef = {
  id: 'toss',
  title: 'Heads or tails',
  start: 'call',
  kv: { wins: 0 },
  keys: { heads: ['h'], tails: ['t'] },
  states: {
    call: { label: 'Call it in the air.', after: { ms: 3000, go: 'lost' }, on: [{ input: 'heads', go: 'flip' }, { input: 'tails', go: 'flip' }] },
    flip: { always: [{ to: ['won', 'lost'] }] },
    won: { final: { effects: [{ stat: 'coins', by: 2 }] } },
    lost: { final: {} },
  },
}
```

## MinigameStateDef

One state of a minigame, with its words, its timer, the inputs it listens for and where it goes by itself. Every field is in [`MinigameStateDef`](/docs/api/engine#minigamestatedef).

`label` is the words the player reads while the minigame is in the state, written in place with their tokens filled. The fields that move the minigame on work in this way:

- **`on`** lists what each input does. The engine takes the first entry for the input whose `when` holds, so several entries can share an input. An input with no such entry isn't live, and the engine refuses it with `That does nothing now.` An entry's `label` is the input's words on its button in this state.
- **`after`** is a timer of the state's own. Once its `ms` of ticks have passed in the state, its transition is taken. The rest of a longer tick carries on into the next state, so one tick can run out several states in a row.
- **`always`** is taken as the state is entered, the first entry whose `when` holds, for a state that only decides where to go, such as counting rounds.
- **`final`** ends the minigame on entering the state. The engine writes its `copy` to the game's kv store, as `{ score: 'arrows.best' }`, closes the minigame, then applies its `effects`. When no final effect opens another scene, the scene that was open shows again with its choices.

The minigame keeps its `after` timer as `elapsed`, not among the game's named [timers](/docs/reference/timers), and entering a state starts it from 0. One `tick` runs both kinds down. Whatever would run out first goes first, and on the same millisecond the minigame's `after` goes before a named timer. The game's timers keep running while a minigame plays, and a transition's effects can start or stop one. A tick runs the clock of the minigame that was playing when it began, so one that a transition starts counts from the next tick.

## MinigameTransition

Where a minigame goes next and what it does on the way, shared by `on`, `after` and `always`. Every field is in [`MinigameTransition`](/docs/api/engine#minigametransition).

A transition runs its `effects`, then goes to `go`, or to a state drawn from `to`. The engine draws from `to` before the effects run, so they can't change the draw. A transition with neither stays where it is. An `on` entry keeps the state's clock running, and an `after` starts it again. If the effects end the minigame or start another, the transition goes no further. The engine takes at most 1,000 transitions in one command, so a tiny `ms` or `always` entries that go round in a circle can't hang the game.

The draw from `to` and a `kv` effect's `random` on `of: 'minigame'` are seeded from the save's [seed](/docs/reference/state#seed), the minigame, how many times it has started and how many steps it has taken. The same save and commands draw the same, and a replay with its ticks plays back exactly. The kv key `minigame:<id>` counts each start, so playing again draws afresh, and `{ kv: 'minigame:arrows', gte: 1 }` asks whether the player has played it.

### MinigameTarget

A state in a transition's `to`, by name or with a `weight`. Every form is in [`MinigameTarget`](/docs/api/engine#minigametarget). A weight left out is 1, so `['heads', { state: 'tails', weight: 3 }]` lands on tails three times in four.

## MinigameSceneFields

The `minigame` field of a [scene](/docs/reference/scenes#datascene), which starts that minigame when the scene opens. Every field is in [`MinigameSceneFields`](/docs/api/engine#minigamescenefields).

The minigame starts in the same command, after the engine counts the scene as [seen](/docs/reference/state#seen). Rendering the scene that's already open doesn't start it again. A new game that opens on a scene with one has it running from the first screen. When the minigame ends, the scene shows again with its choices, unless a final effect opened another.

```ts fragment
{ id: 'park.toss', title: 'A coin in the air', minigame: 'toss', body: [{ text: 'Sam flicks a coin.' }], choices: [{ id: 'leave', label: 'Walk on', effects: [{ scene: null }] }] }
```

## Commands

### minigame

`{ type: 'minigame', input }` presses one of the running state's live inputs. The [`minigame` command](/docs/reference/commands#minigame) lists its refusals.

### tick

`{ type: 'tick', ms }` adds `ms` to the time the minigame has been in its state, and runs down the game's timers too. The engine refuses a tick with `Nothing is counting down.` when no state timer and no named timer is running. A UI sends about ten ticks a second, so the runner treats them in three ways of their own:

- **Undo** steps over them, back to before the last command that wasn't a tick.
- **The backlog** gets nothing from a tick, nor from a minigame rendered over a scene.
- **Autosave** never saves on a tick with `every: 'command'`. With `'scene'` or `'turn'`, it saves only when the tick changed the scene or the turn.

## State

### MinigameState

The minigame being played, as the save keeps it in [`state.minigame`](/docs/reference/state#minigame), or `null`. Every field is in [`MinigameState`](/docs/api/engine#minigamestate).

`elapsed` is the milliseconds of ticks since it entered `state`. `steps` counts the transitions it has taken, which seeds its draws.

## View

### MinigameView

The running minigame as [`view.minigame`](/docs/reference/minigames#view) holds it, or `null`. Every field is in [`MinigameView`](/docs/api/engine#minigameview).

`label` is the running state's words with tokens filled, and `view.scene.body` holds the same words as markup. `timeLeft` and `timeTotal` are the state's timer in milliseconds, or `null` for a state with no timer. A UI sends ticks while `timeLeft` isn't `null`, and while [`view.timers`](/docs/reference/timers#view) isn't empty. To render it, see [Render a minigame](/docs/how-to/render/timers-minigames-panels#render-a-minigame).

### MinigameInput

One live input in `view.minigame.inputs`, ready to render as a button. Every field is in [`MinigameInput`](/docs/api/engine#minigameinput).

The list holds each input that does something now, once. Its `command` is the `minigame` command a press sends, so a UI renders it as it renders any [`RenderedChoice`](/docs/api/engine#renderedchoice). Its `label` comes from the first live `on` entry for it with a `label`, else from the game's `minigame.<input>` [string](/docs/reference/strings#buttons-and-labels). The engine has `Up`, `Down`, `Left`, `Right` and `Space` for `up`, `down`, `left`, `right` and `space`. Any other input with no string reads as its own name with a capital.

## Checks

The [content checker](/docs/reference/checks) reports these problems with minigames:

- a `start`, `go` or `to` that names a state the minigame doesn't have
- a minigame with no final state reachable from its start
- an `after` with `ms` of 0 or less
- a final state that also has `after`, `on` or `always`, which never run
- an input in `keys` that no state's `on` uses
- a `to` with no states, or a weight of 0 or less
- an unknown minigame in a `minigame` effect or a scene's `minigame` field
- a key of `of: 'minigame'` that no minigame declares, one a minigame uses but only another declares, and a `copy` of an undeclared key
- a state's or an `on` entry's `label` written as a prose key, and anything a transition's `when` or `effects` names that the game lacks

## Caveats

- The engine has no clock. A minigame with timers waits for ever in a UI that sends no ticks.
- `tick` and `minigame` ignore [locks](/docs/reference/locks) and plugins' guards, because the minigame is already running. To keep the player out of one, gate what starts it.
- `{ kv, of: 'minigame' }` is false while no minigame runs, whatever its range, `lt` included, and a `kv` effect on it does nothing.
- A `kv` effect that sets a minigame key `to` anything but a number sets it to 0.
