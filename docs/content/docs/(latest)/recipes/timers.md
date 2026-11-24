---
title: "Timed choices and countdowns"
description: "A choice the player has to make in time: a timer that runs out into its own effects, a countdown drawn under the line that asks, and the clock that ticks it."
---
Sometimes the story shouldn't wait. The phone rings and stops after ten seconds, the bus pulls away, a stranger asks a question and walks off if you say nothing. This recipe builds the phone: a scene that asks you to answer before it stops, a countdown under the line that says so, and a missed call if you don't.

It takes three pieces: a [timer](/docs/reference/timers) that runs out into its own effects, a choice that stops it, and a clock that sends [`tick`](/docs/reference/commands#tick) commands while it runs.

## The timer and the scene

Declare the timer with how long it runs and what happens when it runs out. Then open the scene and start the timer together, here from a [trigger](/docs/reference/triggers) when you get home in the evening:

```ts
// src/story/flat.ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { calendar } from '@ifloom/plugin-calendar'

export const flat: Content = {
  timers: [
    {
      id: 'phone',
      label: 'Ringing',
      ms: 10_000,
      // Nobody answered: the scene closes and a missed call waits.
      effects: [
        { scene: null },
        { kv: 'missedAva', to: true },
        { notify: 'Missed call: Ava' },
      ],
    },
  ],
  scenes: [
    {
      id: 'phone',
      title: 'The phone',
      body: [
        // The React UI draws the countdown under this block.
        { prose: 'phone', ui: { timer: 'phone' } },
        { prose: 'phone.hurry', when: { timer: 'phone', lte: 3000 } },
      ],
      choices: [
        { id: 'answer', label: 'Answer it', effects: [{ timer: 'phone', to: null }, { scene: 'ava.call' }] },
        { id: 'leave', label: 'Let it ring', effects: [{ timer: 'phone', to: null }, { scene: null }] },
      ],
    },
  ],
  triggers: [
    {
      id: 'phone',
      when: { all: [places.at('flat'), calendar.period('evening')] },
      effects: [
        { scene: 'phone' },
        { timer: 'phone' },
      ],
    },
  ],
  prose: {
    phone: 'Your phone is ringing on the sill. Ava. Answer before it stops.',
    'phone.hurry': 'It has rung a long time now.',
  },
}
```

What each piece does:

1. **The timer.** `timers` declares it once, with its length and its effects. The save keeps only how long is left, and the effects are read from here when it runs out.
2. **Starting it.** `{ timer: 'phone' }` starts it for its `ms`. The trigger opens the scene in the same effects, so the countdown starts as the scene comes up.
3. **Stopping it.** Both choices stop it with `to: null`, so its effects never run. Stop it in every way out of the scene, because a timer keeps running after its scene has closed.
4. **Running out.** If neither choice is made in ten seconds, the tick that reaches 0 runs the effects: the scene closes, a kv key remembers, and a notice says so.
5. **The last seconds.** `{ timer: 'phone', lte: 3000 }` holds while three seconds or fewer are left, so the second block comes in late. It's checked again after every tick.

To give the player more time, add some with `{ timer: 'phone', by: 5000 }`. A negative `by` takes time away. `{ timer: 'phone', to: 3000 }` starts it again with three seconds.

## The countdown, in the React UI

With the React UI there's nothing more to write. `ui: { timer: 'phone' }` on a block is a [hint](/docs/react/hints#timer): `Scene` draws a [`Countdown`](/docs/react/components#countdown) under that block while the timer runs, with its label, a bar that empties and the seconds left. In the last quarter it's marked `data-urgent`, which the presets colour. A player who asks for reduced motion gets the seconds only. The UI runs the clock itself, so the timer ticks whether or not anything draws it.

To show a timer somewhere else, such as the sidebar, put `Countdown` in your [layout](/docs/recipes/layouts), or `Timers` for every running timer:

```ts given tab="Plain JS" tab-group="framework"
// src/main.ts: a box in the side column that lists every running timer.
const side = document.querySelector<HTMLElement>('#side')!
runner.subscribe(() => {
  side.replaceChildren(
    ...runner.view().timers.map((timer) => Object.assign(document.createElement('p'), { textContent: `${timer.label ?? timer.id}: ${Math.ceil(timer.left / 1000)}s` })),
  )
})
```

```tsx tab="React" tab-group="framework"
// src/layout.tsx: your copy of DefaultLayout, with the phone's countdown in the side column.
import { Countdown, Game, RoomActions, Scene, Sidebar, StatList, Story, Title } from '@ifloom/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <Countdown timer="phone" />
        {/* or every timer that's running: <Timers />, also from @ifloom/react */}
        <StatList />
      </Sidebar>
      <Story>
        <Scene />
        <RoomActions />
      </Story>
    </Game>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Side.vue -->
<script setup lang="ts">
import { view } from './runner.ts'
</script>

<template>
  <aside>
    <p v-for="timer in view.timers" :key="timer.id">{{ timer.label ?? timer.id }}: {{ Math.ceil(timer.left / 1000) }}s</p>
  </aside>
</template>
```

A timer that no block or layout draws still runs, unseen. That's how to make one the player doesn't see coming, such as the shop closing while they browse.

## Draw it yourself

[`view.timers`](/docs/reference/view#timers) lists each running timer with its `id`, `label`, the milliseconds `left` and the `total`. Draw a bar from `left / total` and the seconds from `left`, and find the block to draw it under by its hint, `beat.ui?.timer`. The engine carries every hint to the view, so your UI can read the React UI's word too.

The clock is [`startClock`](/docs/browser#startclock) from `@ifloom/browser`, which sends a tick about every 100 ms while any timer runs. The `vanilla`, `vue` and `svelte` templates already start it. Start it once, beside the runner, not inside a component that comes and goes.

```ts tab="Plain JS" tab-group="framework"
// src/timers.ts: call drawTimer(box, view, beat) after drawing a beat whose block names a timer.
import type { SceneBeat, View } from '@ifloom/engine'

export function drawTimer(box: HTMLElement, view: View, beat: SceneBeat): void {
  const id = beat.ui?.timer
  const timer = view.timers.find((entry) => entry.id === id)
  if (!timer) return
  const wrap = box.appendChild(document.createElement('div'))
  wrap.className = 'timer'
  wrap.toggleAttribute('data-urgent', timer.left <= timer.total / 4)
  const bar = wrap.appendChild(document.createElement('progress'))
  bar.max = timer.total
  bar.value = timer.left
  bar.setAttribute('aria-label', timer.label ?? 'Time left')
  const seconds = wrap.appendChild(document.createElement('span'))
  seconds.setAttribute('role', 'timer')
  seconds.textContent = `${Math.ceil(timer.left / 1000)}s`
}

// In src/main.ts, beside the runner:
// startClock(runner)
```

```tsx tab="React" tab-group="framework"
// src/Countdown.tsx: React with the runner, without @ifloom/react.
import { useSyncExternalStore } from 'react'
import type { Runner } from '@ifloom/engine'

export function Countdown({ runner, id }: { runner: Runner; id: string }) {
  const view = useSyncExternalStore(runner.subscribe, runner.view)
  const timer = view.timers.find((entry) => entry.id === id)
  if (!timer) return null
  return (
    <div className="timer" data-urgent={timer.left <= timer.total / 4 ? '' : undefined}>
      <progress max={timer.total} value={timer.left} aria-label={timer.label ?? 'Time left'} />
      <span role="timer">{Math.ceil(timer.left / 1000)}s</span>
    </div>
  )
}

// In src/main.tsx, beside the runner:
// startClock(runner)
```

```vue tab="Vue" tab-group="framework"
<!-- src/Countdown.vue: the vue template's runner.ts already starts the clock. -->
<script setup lang="ts">
import { computed } from 'vue'
import { view } from './runner.ts'

const props = defineProps<{ id: string }>()
const timer = computed(() => view.value.timers.find((entry) => entry.id === props.id))
</script>

<template>
  <div v-if="timer" class="timer" :data-urgent="timer.left <= timer.total / 4 ? '' : undefined">
    <progress :max="timer.total" :value="timer.left" :aria-label="timer.label ?? 'Time left'" />
    <span role="timer">{{ Math.ceil(timer.left / 1000) }}s</span>
  </div>
</template>
```

A `<progress>` element moves in steps with each tick. For a smooth bar, draw a `div` and scale it with `transform: scaleX(left / total)` and a 100 ms linear transition, and drop the transition under `prefers-reduced-motion: reduce`.

## Test it

The engine only moves a timer on a tick, so a test sends the ticks itself and gets the same result every time:

```ts given
import { apply, startingState } from '@ifloom/engine'

let state = startingState(game)
state = apply(state, game, { type: 'action', id: 'go-home' }).state
// The phone is ringing: let six seconds pass, then answer.
state = apply(state, game, { type: 'tick', ms: 6000 }).state
state = apply(state, game, { type: 'choose', id: 'answer' }).state
```

One long tick covers a whole wait: `{ type: 'tick', ms: 10_000 }` runs the phone out at once, with the same effects as ten seconds of small ticks.

## See it in the showcase

Small Town's flat in [`examples/showcase/src/story/flat.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/flat.ts) rings an evening after you've answered Ava's text, and its tests answer the call in time and miss it.
