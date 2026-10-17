---
title: "Minigames"
description: Build a quick-time minigame from data, the way Small Town's park does, then draw it with a panel of your own in plain DOM, React, Vue or Svelte.
---
This page builds a small quick-time game: an arrow appears, and the player has a second and a half to press it. It's the game of quick feet in [Small Town](/docs/guide/showcase)'s park, so you can play it there and read its source in `examples/showcase/src/content/town.ts`. Then it draws the same minigame with a panel of your own instead of the built-in one, in plain DOM, React, Vue or Svelte.

A minigame is data, like a scene. You declare its states, what each input does in each state, the timers that move it on, and a few numbers it keeps while it runs. The engine runs it, and the page draws it and keeps its clock. Every field is in the [minigames reference](/docs/reference/minigames).

## The rules

Quick feet has five rounds. Each round picks one of four arrows at random and shows it for 1.5 seconds:

- pressing the right arrow scores a point and starts the next round;
- pressing a wrong one, or running out of time, starts the next round with no point.

After the fifth round, three or more points wins five coins and a short scene. Fewer gets a different scene.

## The arrows

Start with the four arrows. Each one is a state that shows its words, starts a 1.5 second timer, and listens for all four inputs:

```ts
import type { MinigameDef, MinigameStateDef } from '@ifloom/engine'

/** The four arrows of quick feet, in the order the minigame's `arrow` variable numbers them from 1. */
const ARROWS = ['up', 'down', 'left', 'right'] as const

/** One arrow on screen: 1.5 seconds to press it. The right one scores; a wrong one or the time running out doesn't. */
const showArrow = (arrow: (typeof ARROWS)[number]): MinigameStateDef => ({
  label: `arrows.${arrow}`,
  after: { ms: 1500, go: 'round' },
  on: ARROWS.map((input) => ({ input, go: 'round', ...(input === arrow ? { effects: [{ kind: 'minigameVar' as const, key: 'score', add: 1 }] } : {}) })),
})
```

`label` is a prose key, so the words live with the rest of your prose:

```ts
'arrows.up': 'The girl with the whistle points at the sky. Up!',
'arrows.down': 'She points at her shoes. Down!',
'arrows.left': 'She points at the river. Left!',
'arrows.right': 'She points at the swings. Right!',
```

`after` is the timer. When 1.5 seconds of ticks have passed in the state, it goes to `round`. Each `on` entry is what an input does. All four go to `round`, and only the right one also adds a point with the [`minigameVar`](/docs/reference/effects#minigamevar) effect.

The input names are yours to choose. `up`, `down`, `left` and `right` are worth using where they fit, because the React UI gives them the arrow keys and labelled buttons without being told. In the other templates, `startKeys` gives them the arrow keys.

## The rounds

The rest of the minigame is a few states that decide where to go next and draw nothing:

```ts
/**
 * Quick feet, at the park: five rounds, each a random arrow to press in time.
 * Three or more right wins a few coins from the kids' pot.
 */
const quickFeet: MinigameDef = {
  id: 'arrows',
  label: 'Quick feet',
  start: 'round',
  vars: { round: 0, arrow: 0, score: 0 },
  keys: { up: ['ArrowUp', 'w'], down: ['ArrowDown', 's'], left: ['ArrowLeft', 'a'], right: ['ArrowRight', 'd'] },
  states: {
    // A new round draws an arrow, or after the fifth, the score is counted.
    round: {
      always: [
        { when: { minigameVar: 'round', gte: 5 }, go: 'tally' },
        {
          go: 'pick',
          effects: [
            { kind: 'minigameVar', key: 'round', add: 1 },
            { kind: 'minigameVar', key: 'arrow', random: [1, 4] },
          ],
        },
      ],
    },
    pick: { always: ARROWS.map((arrow, index) => ({ when: { minigameVar: 'arrow', gte: index + 1, lte: index + 1 }, go: arrow })) },
    ...Object.fromEntries(ARROWS.map((arrow) => [arrow, showArrow(arrow)])),
    tally: { always: [{ when: { minigameVar: 'score', gte: 3 }, go: 'won' }, { go: 'lost' }] },
    won: { final: { effects: [{ kind: 'stat', key: 'coins', by: 5 }, { kind: 'scene', id: 'park.arrows-won' }] } },
    lost: { final: { effects: [{ kind: 'scene', id: 'park.arrows-lost' }] } },
  },
}
```

Reading it from the top:

- **`vars`** are the minigame's own numbers: the round, the arrow drawn for it, and the score. They start at 0 and are gone when it ends.
- **`keys`** adds W, A, S and D beside the arrow keys. Leave it out and the React UI uses the arrow keys alone.
- **`round`** has `always` entries, which are taken as soon as the state is entered. After five rounds it goes to `tally`. Otherwise it counts the round, draws an arrow from 1 to 4 and goes to `pick`.
- **`pick`** turns the number into one of the arrow states.
- **`tally`** checks the score and goes to `won` or `lost`.
- **`won`** and **`lost`** are final. Entering one ends the minigame and runs its effects. Here that's five coins and a scene, or just a scene.

Drawn out, with `up`, `down`, `left` and `right` in one box, the states and the ways between them look like this:

```mermaid
stateDiagram-v2
  state "up, down, left or right" as arrow
  [*] --> round
  round --> pick: under 5 rounds,<br/>round + 1 and draw an arrow
  pick --> arrow: the arrow drawn
  arrow --> round: an input, or 1.5 s
  round --> tally: 5 rounds played
  tally --> won: score 3 or more
  tally --> lost: otherwise
  won --> [*]: 5 coins, park.arrows-won
  lost --> [*]: park.arrows-lost
```

Only the input that matches the arrow on screen adds 1 to `score`.

The random draw comes from the save's seed, so the same save always gets the same arrows, and undo can't re-roll them.

## Starting it

Add the minigame to your pack, with the two closing scenes and something that starts it. In the park, that's an activity with the [`minigame`](/docs/reference/effects#minigame) effect, offered as one of the park's buttons:

```ts
export const town: Pack = {
  // ...
  minigames: [quickFeet],
  activities: [
    { id: 'arrows', requires: [onlyAt(['park'])], effects: [{ kind: 'minigame', id: 'arrows' }] },
  ],
  scenes: [
    { id: 'park.arrows-won', title: 'Quick feet', body: [{ text: 'park.arrows-won' }], choices: [{ id: 'leave', effects: [{ kind: 'scene', id: null }] }] },
    { id: 'park.arrows-lost', title: 'Quick feet', body: [{ text: 'park.arrows-lost' }], choices: [{ id: 'leave', effects: [{ kind: 'scene', id: null }] }] },
  ],
}
```

A scene can also start one as it opens, with a `minigame` field. See [`MinigameSceneFields`](/docs/reference/minigames#minigamescenefields).

## Playing it

That's all the page needs. Every template draws a running minigame for you:

- In the React UI, [`SceneStage`](/docs/react/components#scenestage) draws [`MinigamePanel`](/docs/react/components#minigamepanel) in place of the scene: the title, the shout, a bar counting down the 1.5 seconds, and a button for each arrow. The arrow keys (and W, A, S and D) press them too.
- In the `vanilla`, `vue` and `svelte` templates, the scene shows the minigame's words, and a [minigame panel](/docs/guide/frameworks#minigames) draws the timer and a button for each input. `src/minigame.ts` maps the arrow keys and space to the inputs.

The engine has no clock of its own. The React UI's panel, or `startClock` in the other templates, sends a [`tick`](/docs/reference/commands#tick) command about ten times a second while a timer runs, with the real time that passed. If the player switches to another tab, the clock pauses, so the round is still there when they come back.

While it runs, the player can't do anything else. Every other command is refused with `Finish this first.` until it ends.

## Your own panel

The built-in panels are plain on purpose. To draw quick feet your own way, read the running minigame from `view.minigame` and send its inputs as `{ type: 'minigame', input }`. In the React UI, [`useMinigame`](/docs/react/components#useminigame) reads it and sends for you:

```ts tab="Plain JS" tab-group="framework"
// src/quickFeet.ts
import type { MinigameView, Runner } from '@ifloom/engine'

const GLYPHS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' }

export function quickFeet(minigame: MinigameView, runner: Runner): HTMLElement {
  const section = document.createElement('section')
  section.className = 'quick-feet'
  section.appendChild(document.createElement('p')).textContent = `Round ${minigame.vars.round} of 5 · ${minigame.vars.score} right`
  // The arrow states are named after their arrow, so the state says which to draw.
  const arrow = section.appendChild(document.createElement('p'))
  arrow.className = 'arrow'
  arrow.setAttribute('aria-live', 'polite')
  if (minigame.label) arrow.setAttribute('aria-label', minigame.label)
  arrow.textContent = GLYPHS[minigame.state] ?? ''
  if (minigame.timeLeft !== null && minigame.timeTotal) {
    const timer = section.appendChild(document.createElement('div'))
    timer.className = 'timer'
    timer.appendChild(document.createElement('span')).style.transform = `scaleX(${minigame.timeLeft / minigame.timeTotal})`
  }
  for (const input of minigame.inputs) {
    const button = section.appendChild(document.createElement('button'))
    button.textContent = GLYPHS[input] ?? input
    button.onclick = () => runner.apply({ type: 'minigame', input })
  }
  return section
}
```

```tsx tab="React" tab-group="framework"
// src/QuickFeet.tsx
import { buttonVariants, useMinigame, type PanelComponent } from '@ifloom/react'

const GLYPHS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' }

export const QuickFeet: PanelComponent = () => {
  const { minigame, send } = useMinigame({ keys: true })
  if (!minigame) return null
  // The arrow states are named after their arrow, so the state says which to draw.
  const arrow = GLYPHS[minigame.state]
  const left = minigame.timeLeft !== null && minigame.timeTotal ? minigame.timeLeft / minigame.timeTotal : 0
  return (
    <section className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">
        Round {minigame.vars.round} of 5 · {minigame.vars.score} right
      </p>
      <p className="text-8xl" aria-live="polite" aria-label={minigame.label ?? undefined}>
        {arrow}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full origin-left bg-primary transition-transform duration-100 ease-linear" style={{ transform: `scaleX(${left})` }} />
      </div>
      <div className="flex gap-2">
        {minigame.inputs.map((input) => (
          <button key={input} type="button" className={buttonVariants({ variant: 'outline', size: 'lg' })} onClick={() => send(input)}>
            {GLYPHS[input] ?? input}
          </button>
        ))}
      </div>
    </section>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/QuickFeet.vue -->
<script setup lang="ts">
import { runner, view } from './runner.ts'

const GLYPHS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' }
</script>

<template>
  <section v-if="view.minigame" class="quick-feet">
    <p>Round {{ view.minigame.vars.round }} of 5 · {{ view.minigame.vars.score }} right</p>
    <!-- The arrow states are named after their arrow, so the state says which to draw. -->
    <p class="arrow" aria-live="polite" :aria-label="view.minigame.label ?? undefined">{{ GLYPHS[view.minigame.state] }}</p>
    <div v-if="view.minigame.timeLeft !== null && view.minigame.timeTotal" class="timer">
      <span :style="{ transform: `scaleX(${view.minigame.timeLeft / view.minigame.timeTotal})` }" />
    </div>
    <button v-for="input in view.minigame.inputs" :key="input" @click="runner.apply({ type: 'minigame', input })">
      {{ GLYPHS[input] ?? input }}
    </button>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/QuickFeet.svelte -->
<script lang="ts">
  import { runner, view } from './runner.ts'

  const GLYPHS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' }
</script>

{#if $view.minigame}
  {@const minigame = $view.minigame}
  <section class="quick-feet">
    <p>Round {minigame.vars.round} of 5 · {minigame.vars.score} right</p>
    <!-- The arrow states are named after their arrow, so the state says which to draw. -->
    <p class="arrow" aria-live="polite" aria-label={minigame.label ?? undefined}>{GLYPHS[minigame.state]}</p>
    {#if minigame.timeLeft !== null && minigame.timeTotal}
      <div class="timer"><span style:transform={`scaleX(${minigame.timeLeft / minigame.timeTotal})`}></span></div>
    {/if}
    {#each minigame.inputs as input (input)}
      <button onclick={() => runner.apply({ type: 'minigame', input })}>{GLYPHS[input] ?? input}</button>
    {/each}
  </section>
{/if}
```

Then draw it in place of the usual panel while quick feet is running. The React UI takes it in `panels`, under the minigame's id:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template's draw()
if (view.minigame?.id === 'arrows') root.append(quickFeet(view.minigame, runner))
else if (view.minigame) drawMinigame(view.minigame)
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import { QuickFeet } from './QuickFeet.tsx'
import game from './game.ts'

mountGame(game, { panels: { arrows: QuickFeet } })
```

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue, in the vue template -->
<QuickFeet v-if="view.minigame?.id === 'arrows'" />
<Minigame v-else-if="view.minigame" :minigame="view.minigame" />
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte, in the svelte template -->
{#if $view.minigame?.id === 'arrows'}<QuickFeet />{:else if $view.minigame}<Minigame minigame={$view.minigame} />{/if}
```

What the panels use:

- **`view.minigame`** is a [`MinigameView`](/docs/reference/minigames#minigameview): the running state, its words, `timeLeft` and `timeTotal` in milliseconds, the live `inputs` and the minigame's `vars`.
- **`{ type: 'minigame', input }`** presses an input. `useMinigame`'s `send(input)` sends it for you.
- **`keys: true`** in `useMinigame` maps the keyboard to the inputs as the built-in panel does, from the minigame's `keys` or the arrow keys. In the other templates, `startKeys` in `src/minigame.ts` does that whatever panel is drawn.

You don't have to run the clock in your panel. In the React UI, `SceneStage` runs it while a minigame is on screen, and `useMinigame` would run it too. There's only ever one clock per game, however many components ask. In the other templates, `startClock` runs beside the runner.

To change every minigame's panel at once in the React UI, rather than one by id, replace `MinigamePanel` in [`components`](/docs/react/customising#6-replace-a-component). A panel by id wins over it.

## Testing it

Ticks are ordinary commands, so a test can play a minigame with no browser and no waiting. Send the ticks yourself:

```ts
import { apply, view } from '@ifloom/engine'

let state = apply(atThePark, game, { type: 'activity', id: 'arrows' }).state
const arrow = state.minigame!.state                                        // 'left', say
state = apply(state, game, { type: 'tick', ms: 400 }).state                 // a moment's thought
state = apply(state, game, { type: 'minigame', input: arrow }).state       // the right arrow
view(state, game).minigame?.vars.score                                      // 1
```

One long tick runs out every timer in its way, so `{ type: 'tick', ms: 10_000 }` plays out all five rounds with no presses. Small Town's `tests/showcase.test.ts` plays quick feet this way, and `tests/quick-feet.test.tsx` plays it in the React UI with fake timers and the arrow keys.
