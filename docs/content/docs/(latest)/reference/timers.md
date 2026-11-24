---
title: "Timers"
description: "Reference for TimerDef, RunningTimer and TimerView: named countdowns in real time, run down by ticks, with the effects that run when one runs out."
---
A timer is a named countdown in real time that runs its effects when it reaches 0, for a phone that stops ringing or a bus about to leave. Your content declares each timer in `timers`, the [`timer` effect](/docs/reference/effects#timer) starts, stops and extends it, and the [`timer` condition](/docs/reference/conditions#timer) reads it. [Turns, scenes and the room](/docs/explanation/turns-and-time#timers-run-in-real-time-not-turns) explains how real time sits beside turns, and [Add a countdown](/docs/how-to/add-a-countdown) builds one.

In the showcase: `examples/showcase/src/story/flat.ts`, whose `flat.ring` timer gives the player ten seconds to answer Ava's call.

```ts
import type { RunningTimer, TimerDef, TimerView } from '@ifloom/engine'
```

## TimerDef

A countdown the game declares in `timers`, with how long it runs and the effects that run when it runs out. Every field is in [`TimerDef`](/docs/api/engine#timerdef).

The engine keeps no clock. A timer runs down only when something sends the [`tick`](/docs/reference/commands#tick) command, `{ type: 'tick', ms }`, which takes `ms` off every running timer. In a browser, [`startClock`](/docs/reference/browser#startclock) sends one about every 100 ms while anything counts down. Ticks are commands, so the [command log](/docs/reference/runner#commandlog) keeps them and a replay runs every timer out at the same moment.

When a tick takes a timer to 0, the engine takes the timer out of the state and then runs its `effects` inside that tick, so they can start it again. The rest of a longer tick carries on, so one long tick runs out everything it covers in order, and a timer its effects start counts from that moment. Timers that run out at the same millisecond go in order of their ids. One tick runs out at most 1,000 timers and minigame steps, so a timer that keeps restarting itself can't hang the game.

The effects run like any other command's, so triggers, scenes and plugins' hooks see what they did. A timer that a `by` takes to 0 runs out on the next tick, not straight away. A running [minigame](/docs/reference/minigames#minigamestatedef)'s `after` runs down on the same ticks, and on the same millisecond the minigame's goes first. Timers merge by id, so a mod can change how long one runs or what it does.

```ts
import type { Content } from '@ifloom/engine'

export const flat: Content = {
  timers: [{ id: 'flat.ring', label: 'Ringing', ms: 10_000, effects: [{ scene: null }, { notify: 'Missed call: Ava' }] }],
  scenes: [
    {
      id: 'flat.ring',
      title: 'The phone',
      body: [{ text: 'Your phone is ringing on the sill. Ava. Answer before it stops.', ui: { timer: 'flat.ring' } }],
      choices: [{ id: 'answer', label: 'Answer it', effects: [{ timer: 'flat.ring', to: null }, { scene: 'ava.call' }] }],
    },
  ],
}
```

## State

### RunningTimer

A running timer as the save keeps it in [`state.timers`](/docs/reference/state#timers), by id. Every field is in [`RunningTimer`](/docs/api/engine#runningtimer).

The save keeps only the milliseconds `left` and the `total` the timer started with. Adding time with `by` raises `total` when `left` goes above it, so a countdown bar stays full rather than overflowing. The engine reads the effects from the game's `timers` when the timer runs out, so an update that changes them reaches saves already running it.

## View

### TimerView

A running timer as [`view.timers`](/docs/reference/view#timers) lists it, in the order the timers started. Every field is in [`TimerView`](/docs/api/engine#timerview).

`left / total` is the share left. The view never includes a timer's effects, so rendering every running timer gives nothing away, and a timer is in the view only while it runs. To render them, see [Render timers](/docs/how-to/render/timers-minigames-panels#render-timers).

## Checks

The [content checker](/docs/reference/checks) reports these problems with timers:

| Problem | Cause |
|---|---|
| `a timer needs ms above 0` | A timer's `ms` isn't a number above 0. |
| `unknown timer "flat.rnig"` | A `timer` effect or condition names a timer the game doesn't declare. |

The checker also reports a `timer` effect whose `to` isn't a number above 0 or `null`, or whose `by` isn't a number, and anything a timer's `effects` name that the game lacks. [`loadGame`](/docs/reference/content#checks) reports a timer id that the game's content declares twice.

## Caveats

- Nothing ticks by itself. A timer started in a test or a playtest waits until a tick comes, and `ifloom playtest` sends none, so it never sees a timer run out.
- Starting a timer that's running starts it again from its `ms`. Use `{ timer, by }` to add time instead.
- Leaving a scene doesn't stop its timer. If a timer's effects close a scene, stop the timer in every choice that leaves, or the `scene` effect closes whatever is open when it runs out.
- [`startClock`](/docs/reference/browser#startclock) leaves out the time a page is hidden, so a timer waits while the player is in another tab.
