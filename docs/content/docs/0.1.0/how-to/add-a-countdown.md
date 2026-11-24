---
title: "Add a countdown"
description: "Give the player a choice to make in time, with a timer that runs out into its own effects and a test that sends the ticks."
---
Use this when the story shouldn't wait: the phone rings and stops after ten seconds, or the bus pulls away. A [timer](/docs/0.1.0/reference/glossary#timer) counts down in real time and runs its own effects when it runs out. The steps build the showcase's ringing phone, which becomes a missed call if the player doesn't answer.

## Declare the timer

Add the timer to your content's `timers`, with how long it runs in `ms` and the effects to run when it runs out:

```ts
import type { TimerDef } from '@ifloom/engine'

export const ring: TimerDef = {
  id: 'flat.ring',
  label: 'Ringing',
  ms: 10_000,
  effects: [{ scene: null }, { kv: 'missedAva', to: true }, { notify: 'Missed call: Ava', id: 'missed-call', tag: 'phone' }],
}
```

Nobody answered, so the scene closes, a kv key remembers, and a [notice](/docs/0.1.0/how-to/show-a-notice) says so.

## Start it with the scene

Open the scene and start the timer in the same effects, so the countdown starts as the scene comes up. In the showcase a [trigger](/docs/0.1.0/reference/triggers) does both when the player is home in the evening:

```ts
import type { TriggerDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

export const ringing: TriggerDef = {
  id: 'flat.ring',
  when: { all: [places.at('flat'), calendar.period('evening')] },
  effects: [{ scene: 'flat.ring' }, { timer: 'flat.ring' }],
}
```

## Stop it in every way out

Give every choice that leaves the scene `{ timer: 'flat.ring', to: null }`, which stops the timer without running its effects. A timer keeps running after its scene closes, so a way out that forgets would close whatever is open ten seconds later:

```ts
import type { DataScene } from '@ifloom/engine'

export const phone: DataScene = {
  id: 'flat.ring',
  title: 'The phone',
  speaker: 'ava',
  body: [
    { text: 'Your phone is ringing on the sill. Ava. Answer before it stops.', ui: { timer: 'flat.ring' } },
    { text: 'It has rung a long time now.', when: { timer: 'flat.ring', lte: 3000 } },
  ],
  choices: [
    { id: 'answer', label: 'Answer it', effects: [{ timer: 'flat.ring', to: null }, { scene: 'ava.call' }] },
    { id: 'leave', label: 'Let it ring', effects: [{ timer: 'flat.ring', to: null }, { scene: null }] },
  ],
}
```

The second line holds while 3 seconds or fewer are left, so it comes in late. The engine checks it again after every tick.

To give the player more time, add some with `{ timer: 'flat.ring', by: 5000 }`. A negative `by` takes time away, and `{ timer: 'flat.ring', to: 3000 }` starts it again with three seconds.

## Show the countdown

With the React UI, the `ui: { timer: 'flat.ring' }` hint on the first line does it. `Scene` renders a [`Countdown`](/docs/0.1.0/reference/react/components#countdown) under that line while the timer runs, with its label, a bar that empties and the seconds left. In the last quarter it's marked `data-urgent`, which each preset colours: Paper draws a thin rule, Storybook a fat bar in a card, Studio a bordered strip, and Terminal a text-mode bar. A player who asks for reduced motion sees the seconds only.

To show a timer somewhere else, such as the sidebar, put `<Countdown timer="flat.ring" />` in your layout, or `<Timers />` for every running timer. A timer that nothing shows still runs, for a deadline the player doesn't see coming.

The React UI runs the clock itself. In a UI of your own, start [`startClock`](/docs/0.1.0/reference/browser#startclock) beside the runner, as the templates do, and render the countdown as [Render timers](/docs/0.1.0/how-to/render/timers-minigames-panels#render-timers) shows.

## Check it worked

Run `npm run check`, which reports a timer the game doesn't declare. Then play to the scene with `npm run dev`, and let it ring. After ten seconds the scene closes and the notice comes.

A test sends the ticks itself, so it gets the same result every time. One long tick covers a whole wait, so `{ type: 'tick', ms: 10_000 }` runs the phone out at once:

```ts given
import { apply } from '@ifloom/engine'

// `state` has the phone ringing: let six seconds pass, then answer.
let next = apply(state, game, { type: 'tick', ms: 6000 }).state
next = apply(next, game, { type: 'choose', id: 'answer' }).state
next.sceneId // 'ava.call'
```

`ifloom playtest` sends no ticks, so it never sees a timer run out.

In the showcase, Small Town, the phone rings in [`examples/showcase/src/story/flat.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/flat.ts), and its tests answer the call in time and miss it. For more, see:

- [Timers](/docs/0.1.0/reference/timers), the [`timer` effect](/docs/0.1.0/reference/effects#timer) and the [`timer` condition](/docs/0.1.0/reference/conditions#timer).
- The [`tick` command](/docs/0.1.0/reference/commands#tick).
- [Timers run in real time, not turns](/docs/0.1.0/explanation/turns-and-time#timers-run-in-real-time-not-turns).
