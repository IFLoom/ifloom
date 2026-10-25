---
title: "Timers"
description: "Named countdowns in real time: declaring a timer and what happens when it runs out, the timer effect and condition, ticks, view.timers, and how timers sit beside minigames."
---
A timer counts down in real time and runs its effects when it gets to 0. Use one for anything the player has to beat: a phone that stops ringing, a bus about to leave, a choice that's only open for a few seconds.

You declare each timer in your content, with how long it runs and what happens when it runs out. The [`timer` effect](/docs/reference/effects#timer) starts it, and the same effect stops it or adds time.

```ts
import type { Content } from '@ifloom/engine'

export const flat: Content = {
  timers: [
    {
      id: 'phone',
      label: 'Ringing',
      ms: 10_000,
      // What happens if nobody answers.
      effects: [
        { scene: null },
        { notify: 'Missed call: Ava' },
      ],
    },
  ],
  scenes: [
    {
      id: 'phone',
      title: 'The phone',
      body: [{ prose: 'phone' }],
      choices: [
        // Answering stops the timer, so the missed call never comes.
        { id: 'answer', effects: [{ timer: 'phone', to: null }, { scene: 'ava.call' }] },
      ],
    },
  ],
  triggers: [
    { id: 'phone', when: { kv: 'ringing' }, effects: [{ scene: 'phone' }, { timer: 'phone' }] },
  ],
}
```

`{ timer: 'phone' }` holds while it runs, and `{ timer: 'phone', lte: 3000 }` in its last three seconds. [`view.timers`](/docs/reference/view#timers) lists each running timer with the time left, for a UI to draw a countdown. The [Timed choices and countdowns](/docs/recipes/timers) recipe builds this in each framework.

```ts
import { type RunningTimer, type TimerDef, type TimerView } from '@ifloom/engine'
```

## How time passes

The engine has no clock. Time passes when something sends a [`tick`](/docs/reference/commands#tick), `{ type: 'tick', ms }`, which takes `ms` off every running timer. In the browser, [`startClock`](/docs/browser#startclock) from `@ifloom/browser` sends one about every 100 ms while anything counts down, with the real time that passed. The React UI starts it for you. Anywhere else (a test, a playtest, a server), a timer only moves when you tick it yourself.

Ticks are commands, so they go in the runner's [log](/docs/reference/runner#commandlog) and [`replay`](/docs/reference/runner#replay) plays them back exactly. Undo steps over them, so one undo goes back to before the last command the player chose. See [In the runner](/docs/reference/minigames#in-the-runner).

## When a timer runs out

When a tick takes a timer to 0, the timer stops and its `effects` run, inside that tick. It's gone from the state before they run, so they can start it again. If the tick was longer than the time left, the rest carries on: one long tick runs out everything it covers, in the order it would have, and a timer those effects start counts from that moment. Timers that run out at the same millisecond go in order of their ids. One tick runs out at most 1,000 timers and minigame transitions, so a timer that keeps starting itself can't hang the game.

The effects run like any other effects in a command, so the [triggers](/docs/reference/triggers), scenes and plugins' hooks that follow a command see what they did. A scene effect opens a scene, a `notify` adds a notice, and a `turn` ends the turn. They run the same way in every replay, because the tick that ran them is logged.

A timer whose time `by` has taken down to 0 runs out on the next tick, not straight away.

## Timers and minigames

A [minigame](/docs/reference/minigames)'s `after` is a timer too, but it belongs to the minigame's state rather than to the game's `timers`. One tick runs both: whatever runs out first goes first, and on the same millisecond the minigame's goes first. The game's timers keep running during a minigame, and its effects can start or stop one. See [Minigames and the game's timers](/docs/reference/minigames#minigames-and-the-games-timers).

## TimerDef

```ts
type TimerDef = {
  id: string
  label?: string         // what a UI calls it
  ms: number             // how long it runs when started
  effects?: EffectRef[]  // what happens when it runs out
}
```

A timer as your content's `timers` and a [pack](/docs/reference/loader)'s declare it. Packs merge timers by id, so a mod can change how long one runs or what it does. The `label` is shown as written, in [`TimerView`](#timerview). The effects are any effects, [calls](/docs/reference/custom) to the game's own and plugins' included.

## RunningTimer

```ts
type RunningTimer = { left: number; total: number }
```

A running timer as the save keeps it in [`state.timers`](/docs/reference/state#timers), by id: the milliseconds `left` and the `total` it was started with. Adding time with `by` raises `total` when `left` goes above it, so a countdown bar stays full rather than overflowing. The save keeps nothing else. The effects are read from the game's `timers` when it runs out, so an update that changes them reaches saves already running the timer.

## TimerView

```ts
type TimerView = { id: string; label: string | null; left: number; total: number }
```

A running timer as [`view.timers`](/docs/reference/view#timers) shows it, in the order they started. `left / total` is the share left. It never includes the effects, so drawing every running timer gives nothing away. A timer is in the view only while it runs.

## The checks

The [content checker](/docs/reference/checks) reports:

- a timer whose `ms` isn't a number above 0
- two timers with one id
- anything the timer's `effects` name that the game doesn't have
- an unknown timer in a `timer` condition or effect
- a `timer` effect whose `to` isn't a number above 0 or `null`, or whose `by` isn't a number

## Gotchas

- **Nothing ticks by itself.** A timer started in a test or a playtest waits until you send a tick. `ifloom playtest` sends none, so it never sees a timer run out.
- **Starting one that's running starts it again.** Use `{ timer, by }` to add time instead.
- **Leaving the scene doesn't stop it.** A timer runs until it runs out or something stops it. If its effects close a scene, stop the timer in every choice that leaves, or the scene effect will close whatever is open when it runs out.
- **The player can wait it out in another tab.** The clock drops the time a page is hidden, so a timer waits for the player. A tick only ever covers time the page was on screen.

## See it in an example

Small Town's flat, in [`examples/showcase/src/story/flat.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/flat.ts). An evening at home after you've answered Ava's text, a trigger opens the `flat.ring` scene and starts the `flat.ring` timer. Answer within ten seconds and her call opens. Let it ring out and the scene closes with a missed call. The block that says the phone is ringing carries the React UI's `ui: { timer: 'flat.ring' }`, so the countdown is drawn under it.
