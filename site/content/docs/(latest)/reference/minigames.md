---
title: "Minigames"
description: "Minigames as data: states, inputs, timers and variables, for quick-time events and small games inside a story."
---
A minigame is a small game inside the story, such as a quick-time event, a lock to pick or a round of snap. You declare it as data: a few states, the inputs each one listens for, timers that move it on, and number variables it keeps while it runs. The engine runs it, and the UI draws it from [`view.minigame`](/docs/reference/view#minigame) and sends what the player presses.

```ts
import { type MinigameDef, type MinigameStateDef, type MinigameTransition, type MinigameTarget, type MinigameState, type MinigameView, type MinigameSceneFields } from '@ifloom/engine'
```

## A worked example

The showcase's park has a game of quick feet with the kids. There are five rounds, and each one picks an arrow at random and gives you 1.5 seconds to press it. Three or more right wins five coins and a short scene. Fewer gets a different scene.

```ts
import type { MinigameDef, MinigameStateDef, Content } from '@ifloom/engine'

const ARROWS = ['up', 'down', 'left', 'right'] as const

// One arrow on screen. The right input scores. A wrong one, or the time running out, doesn't.
const showArrow = (arrow: (typeof ARROWS)[number]): MinigameStateDef => ({
  label: `arrows.${arrow}`,
  after: { ms: 1500, go: 'round' },
  on: ARROWS.map((input) => ({
    input,
    go: 'round',
    ...(input === arrow ? { effects: [{ kv: 'score', of: 'minigame', by: 1 }] } : {}),
  })),
})

const quickFeet: MinigameDef = {
  id: 'arrows',
  label: 'Quick feet',
  start: 'round',
  kv: { round: 0, arrow: 0, score: 0 },
  keys: { up: ['ArrowUp', 'w'], down: ['ArrowDown', 's'], left: ['ArrowLeft', 'a'], right: ['ArrowRight', 'd'] },
  states: {
    // A new round draws an arrow. After the fifth, the score is counted.
    round: {
      always: [
        { when: { kv: 'round', of: 'minigame', gte: 5 }, go: 'tally' },
        {
          go: 'pick',
          effects: [
            { kv: 'round', of: 'minigame', by: 1 },
            { kv: 'arrow', of: 'minigame', random: [1, 4] },
          ],
        },
      ],
    },
    pick: { always: ARROWS.map((arrow, i) => ({ when: { kv: 'arrow', of: 'minigame', is: i + 1 }, go: arrow })) },
    ...Object.fromEntries(ARROWS.map((arrow) => [arrow, showArrow(arrow)])),
    tally: { always: [{ when: { kv: 'score', of: 'minigame', gte: 3 }, go: 'won' }, { go: 'lost' }] },
    won: { final: { effects: [{ stat: 'coins', by: 5 }, { scene: 'park.arrows-won' }] } },
    lost: { final: { effects: [{ scene: 'park.arrows-lost' }] } },
  },
}

export const park: Content = {
  minigames: [quickFeet],
  // ...and the park's location, in entities, lists an action that starts it:
  // { id: 'arrows', label: 'Play quick feet with the kids', effects: [{ minigame: 'arrows' }] }
}
```

The park offers it as a room action whose effects apply [`{ minigame: 'arrows' }`](/docs/reference/effects#minigame). From then on the UI reads `view.minigame` and sends two commands:

```ts
import { apply, view } from '@ifloom/engine'

state = apply(state, game, { type: 'action', id: 'places/arrows' }).state
view(state, game).minigame
// { id: 'arrows', title: 'Quick feet', state: 'left', label: 'She points at the river. Left!',
//   timeLeft: 1500, timeTotal: 1500, inputs: ['up', 'down', 'left', 'right'],
//   kv: { round: 1, arrow: 3, score: 0 }, keys: { up: ['ArrowUp', 'w'], ... } }

state = apply(state, game, { type: 'tick', ms: 400 }).state           // time passing
state = apply(state, game, { type: 'minigame', input: 'left' }).state // the player pressed left
```

The full example is in the showcase's `src/story/park.ts`, and its test plays it through with ticks and inputs.

The React UI draws a minigame with [`MinigameCard`](/docs/react/components#minigamecard), which sends the ticks and maps the keys, and you can replace it with your own panel by minigame id. The [Minigames recipe](/docs/recipes/minigames) walks through both. Any other UI draws `view.minigame` itself.

## How a minigame runs

- **Starting.** The [`minigame` effect](/docs/reference/effects#minigame) starts one, from a choice, an action, a trigger or anything else that applies effects. A scene with a `minigame` field starts it when the scene is entered (see [`MinigameSceneFields`](#minigamescenefields)). It starts in its `start` state with its `kv` at their starting values. Starting one while another runs drops the old one.
- **While it runs.** The view draws it over the open scene or the room. `view.scene` keeps the scene's id, but its title is the minigame's `label` and its body is the running state's words. The scene's choices and the room's buttons are left out. Every command but [`tick`](/docs/reference/commands#tick), [`minigame`](/docs/reference/commands#minigame), [`dismiss`](/docs/reference/commands#dismiss) and [`setting`](/docs/reference/commands#setting) is refused with `Finish this first.`, apart from a plugin command that ignores locks, such as the [debugger](/docs/plugins/debug)'s.
- **Inputs.** `{ type: 'minigame', input }` takes the running state's first `on` entry for that input whose `when` holds. An input with no such entry isn't live, and is refused with `That does nothing now.` `view.minigame.inputs` lists the live ones.
- **Timers.** `{ type: 'tick', ms }` adds `ms` to how long the minigame has been in its state. When that reaches the state's `after.ms`, its transition is taken. Whatever is left of `ms` carries on into the next state, so one long tick can run out several timers in a row. It stops when the minigame ends. See [Minigames and the game's timers](#minigames-and-the-games-timers).
- **Transitions.** A transition runs its `effects`, then goes to `go`, or to a state drawn from `to`. Entering a state resets its clock to 0. A transition with neither stays where it is: an `on` entry keeps the clock running, and an `after` starts it again.
- **Moving on by itself.** On entering a state, its first `always` entry whose `when` holds is taken straight away. Use it for a state that only decides where to go, such as counting rounds or checking a score.
- **Ending.** Entering a state with `final` ends the minigame. Its `copy` is written to the game's [kv store](/docs/reference/state#kv), the minigame closes, and then its `effects` apply. They can be anything, such as a stat, a scene or a [`turn`](/docs/reference/effects#turn). If no final effect opens another scene, the scene that was open shows again with its choices.

No more than 1,000 transitions are taken in one command. That keeps a timer with a tiny `ms`, or `always` entries that go round in a circle, from hanging the game.

### Its kv store

A minigame keeps its own numbers in its `kv`, such as a score, a round or a streak. They're a kv store of the running minigame's, named `of: 'minigame'`. Transitions change them with the [`kv` effect](/docs/reference/effects#whose-key-it-is), `{ kv: 'score', of: 'minigame', by: 1 }`, which sets a value, adds to it or draws a whole number at random. Conditions read them with the [`kv` condition](/docs/reference/conditions#kv), `{ kv: 'score', of: 'minigame', gte: 3 }`, and prose prints one with `{{kv:score of=minigame}}`. They're gone when the minigame ends, unless the final state's `copy` writes them to the [kv store](/docs/reference/state#kv).

Every key a minigame uses has to be declared in its `kv`, and the checker reports one that isn't. Before schema 22 these were `vars`, and a pack or a save from then is read with them moved to `kv`.

### Randomness

A transition's `to` draws its next state by weight, and a `kv` effect with `of: 'minigame'` and `random` draws a number. Both are drawn from the save's [seed](/docs/reference/state#seed), the minigame, how many times it has started and how many transitions it has taken. So the same save and the same commands always draw the same, and a [command log](/docs/reference/runner#commandlog) with its ticks plays back exactly. Playing the minigame again draws afresh, because each start is counted in the kv key `minigame:<id>`. You can read that with `{ kv: 'minigame:arrows', gte: 1 }` to ask whether the player has played it.

### Minigames and the game's timers

A state's `after` is a timer of its own, kept in the minigame (as `elapsed`) rather than among the game's named [timers](/docs/reference/timers). It's tied to the state: entering another state starts it from 0, and staying put with `after` starts it again. One `tick` runs both kinds down together. Whatever would run out first goes first, and on the same millisecond the minigame's `after` goes before a named timer. The game's timers keep running while a minigame plays, so a phone can ring out in the middle of a round, and a minigame's effects can start, stop or extend a named timer with the [`timer` effect](/docs/reference/effects#timer).

A tick runs the clock of the minigame that was playing when it began. If a transition ends that minigame and starts another, the new one's clock starts on the next tick, as it always has.

### In the runner

Ticks are commands like any other, so they're in the runner's [log](/docs/reference/runner#commandlog) and [`replay`](/docs/reference/runner#replay) plays them back. The runner treats them differently in three ways, because a UI sends about ten a second:

- **Undo steps over them.** One undo goes back to before the last command that wasn't a tick.
- **They add nothing to the backlog.** Neither does the minigame drawn over a scene.
- **Autosave.** With `every: 'command'`, a tick never autosaves. With `'scene'` or `'turn'`, it saves only when it changed the scene or the turn, such as a final state that ends one.

## MinigameDef

```ts
type MinigameDef = {
  id: string
  label?: string
  start: string
  kv?: Record<string, number>
  keys?: Record<string, string[]>
  states: Record<string, MinigameStateDef>
}
```

| Field | What it does |
|---|---|
| `id` | What the `minigame` effect and a scene's `minigame` field name. |
| `label` | What the UI calls it. It's `view.minigame.title`, and the title of `view.scene` while it runs. |
| `start` | The state it starts in. |
| `kv` | Its kv store: each key it uses, with the number it starts at. None if left out. |
| `keys` | The keys a UI maps to each input, by input name, as `KeyboardEvent.key` names them. A UI uses its own if left out. |
| `states` | Its states, by id. |

Declare minigames in your [content](/docs/reference/loader#content)'s `minigames`. They merge by id, so a pack's minigame replaces one with the same id.

## MinigameStateDef

```ts
type MinigameStateDef = {
  label?: string
  after?: { ms: number } & MinigameTransition
  on?: ({ input: string; when?: Condition } & MinigameTransition)[]
  always?: ({ when?: Condition } & MinigameTransition)[]
  final?: { effects?: EffectRef[]; copy?: Record<string, string> }
}
```

| Field | What it does |
|---|---|
| `label` | A [prose](/docs/reference/prose) key: what the player reads while the minigame is in this state. |
| `after` | A timer. Once `ms` milliseconds of ticks have passed in this state, its transition is taken. |
| `on` | What each input does here. The first entry for the input whose `when` holds is taken. Several entries can share an input, each with its own `when`. |
| `always` | Taken as soon as the state is entered: the first entry whose `when` holds. |
| `final` | Entering this state ends the minigame. `copy` maps minigame variables to kv keys, as `{ score: 'arrows.best' }`. Then `effects` apply, with the minigame already closed. |

## MinigameTransition

```ts
type MinigameTransition = {
  go?: string
  to?: MinigameTarget[]
  effects?: EffectRef[]
}

type MinigameTarget = string | { state: string; weight?: number }
```

| Field | What it does |
|---|---|
| `go` | The state it goes to. |
| `to` | A state drawn at random when there's no `go`. A weight left out is 1, so `['heads', { state: 'tails', weight: 3 }]` lands on tails three times in four. |
| `effects` | What it does before it moves. Any [effect](/docs/reference/effects), or a call to a plugin's or the game's own, can go here, including a `turn`. |

The state from `to` is drawn before the effects run, so they can't change the draw. If the effects end the minigame or start one, the transition goes no further.

## MinigameSceneFields

```ts
type MinigameSceneFields = {
  minigame?: string
}
```

A field on a [scene](/docs/reference/scenes). The minigame starts when the scene is entered, in the same command, after the scene is counted as [seen](/docs/reference/state#seen). Redrawing the scene that's already open doesn't start it again. If a new game opens on a scene with one, it's running from the first frame.

```ts
{
  id: 'fair.coconut',
  title: 'The coconut shy',
  minigame: 'coconut',
  body: [{ text: 'fair.coconut' }],
  choices: [{ id: 'leave', effects: [{ scene: null }] }],
}
```

When the minigame ends, the scene shows again with its choices, unless a final effect opened another.

## MinigameState

```ts
type MinigameState = {
  id: string
  state: string
  elapsed: number
  kv: Record<string, number>
  steps: number
}
```

The minigame being played, as the save keeps it in [`state.minigame`](/docs/reference/state#minigame), or `null`. `elapsed` is the milliseconds of ticks since it entered `state`. `steps` counts the transitions it has taken, which seeds its draws.

## MinigameView

```ts
type MinigameView = {
  id: string
  title: string | null
  state: string
  label: string | null
  timeLeft: number | null
  timeTotal: number | null
  inputs: string[]
  kv: Record<string, number>
  keys: Record<string, string[]>
}
```

What [`view.minigame`](/docs/reference/view#minigame) holds while one runs.

| Field | What it holds |
|---|---|
| `id`, `state` | The minigame and the state it's in. |
| `title` | Its `label`, or `null`. |
| `label` | The running state's words, with tokens filled in, or `null` if it has no `label`. `view.scene.body` has the same words rendered with their markup. |
| `timeLeft`, `timeTotal` | Milliseconds left on the state's timer and its whole length, or `null` for a state with no timer. |
| `inputs` | The inputs that do something now, without repeats. |
| `kv` | Its kv store now. |
| `keys` | The keys the game maps to each input, or `{}`. |

A UI sends ticks while `timeLeft` isn't `null`, and also while [`view.timers`](/docs/reference/view#timers) isn't empty. A tick with nothing counting down is refused with `Nothing is counting down.`

## The checks

The [content checker](/docs/reference/checks) reports:

- a `start`, `go` or `to` naming a state the minigame doesn't have
- a minigame with no final state reachable from its start
- a timer with `ms` of 0 or less
- a final state that also has `after`, `on` or `always`, which never run
- an input in `keys` that no state's `on` uses
- a `to` with no states, or a weight of 0 or less
- an unknown minigame in a `minigame` effect or a scene's `minigame` field
- a key of a minigame's kv used in a condition or an effect that no minigame declares, one a minigame uses but another declares, and a `copy` of one that isn't declared
- a `label` with no prose, and anything a transition's `when` or `effects` names that the game doesn't have

## Gotchas

- **Ticks come from the UI.** The engine has no clock. Nothing happens to a timer until something sends `{ type: 'tick', ms }`, so a minigame with timers waits for ever in a UI that doesn't tick.
- **Locks don't stop it.** `tick` and `minigame` ignore [locks](/docs/reference/locks) and plugin guards, because the minigame is already running. To keep the player out of one, gate what starts it.
- **`{ kv, of: 'minigame' }` is false with no minigame running**, whatever the range, `lt` included, and a `kv` effect on it does nothing. A minigame's variables are numbers: a `kv` effect that sets one `to` anything else sets it to 0.
- **A variable is a number.** Use `copy` to keep one in the kv store, and `{ kv }` to read it afterwards.

## See it in an example

Small Town: quick feet, `quickFeet` in [`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts), is five rounds of arrows to press in time, started by the park's `arrows` action. [`examples/showcase/tests/quick-feet.test.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/quick-feet.test.tsx) plays it in the React UI.
