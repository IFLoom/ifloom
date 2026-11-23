---
title: "Dice rolls and checks"
description: "A check in the middle of the prose: an inline action that rolls dice against a target, lines that branch on how it went, and the dice drawn above them in the React UI or your own."
---
A check is a roll against a target: two dice for skimming a stone, a d20 plus strength for climbing a wall. This page builds one in the middle of a place's prose, the way Small Town's park does it. The player clicks a link in the line, the dice land, and the next line says how it went.

## The check, step by step

The pieces are an inline action, an effect that rolls, a block for each outcome, and a hint that tells the React UI where to draw the dice.

```ts
import type { Block, Condition, Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

/** A line about how the stone went: only on the day you skimmed, with the dice drawn above it. */
const skimmed = (when: Condition, text: string): Block => ({ text, when: { all: [{ kv: 'skimmed' }, when] }, ui: { dice: 'skim' } })

export const park: Content = {
  // `skimmed` goes back to false each day.
  resets: { skimmed: false },
  entities: [
    {
      id: 'park',
      name: 'Riverside Park',
      exits: ['high-street'],
      body: [
        { prose: 'place.park' },
        // 2. The link, in the line.
        { prose: 'place.park.stones' },
        // 3. A block for each outcome, read from the roll.
        skimmed({ roll: 'skim', critical: 'max' }, 'park.skim.best'),
        skimmed({ roll: 'skim', passed: true, critical: false }, 'park.skim.passed'),
        skimmed({ roll: 'skim', passed: false }, 'park.skim.failed'),
      ],
      actions: [
        // 1. The roll: two dice against 8. The total goes in the kv store as `skim`.
        { id: 'skim', label: 'Skim a stone', effects: [{ kv: 'skimmed', to: true }, { roll: 'skim', dice: '2d6', against: 8 }] },
      ],
    },
  ].map(places.location),
  prose: {
    'place.park': 'The river is slow and brown and full of ducks with opinions.',
    'place.park.stones': 'Flat stones lie along the water’s edge. [[act:skim|Try to skim a stone]].',
    'park.skim.best': 'Skip after skip, clean to the far bank. An old man on the bench gives you a slow round of applause.',
    'park.skim.passed': 'The stone skips once, twice, again, and sinks most of the way across.',
    'park.skim.failed': 'Plop. It goes straight in, and the ducks look delighted.',
  },
}
```

What each piece does:

1. **The roll.** The [`roll` effect](/docs/reference/effects#roll) throws `2d6`, keeps the total under `skim` and records the roll. `against: 8` makes it a check that passes on 8 or more. Each try rolls afresh, and a replay rolls the same.
2. **The link.** `[[act:skim|Try to skim a stone]]` draws the park's `skim` action in the line instead of as a button. See [Actions and tooltips in the text](/docs/recipes/inline-actions).
3. **The outcome.** Each block's `when` reads the roll with the [`roll` condition](/docs/reference/conditions#roll): `passed`, and `critical: 'max'` for a double six. The `skimmed` key keeps them to the day of the throw, because a roll is kept until the next one under its key. Print the total in a line with `{{skim}}`.
4. **The dice.** `ui: { dice: 'skim' }` is a [hint](/docs/react/hints#dice) for the React UI. It draws the dice just above that block, tumbling, then settled on the faces rolled, with the total and Passed or Failed. The block waits until they settle.

Without a target, a roll is just a number. Leave out `against` and branch on the total with `{ kv: 'skim', gte: 10 }`.

## Add a stat

`plus` adds the player's stat to the total, modifiers and all:

```ts
{ roll: 'climb', dice: '1d20', plus: { stat: 'strength' }, against: 12 }
```

Notation can carry its own number too, `'2d6+1'`, and `plus` adds on top. The roll's `plus` in the view is the two together.

## Rolls nobody clicks

Any effect list can roll, so the game can roll by itself. Small Town counts the ducks as you arrive at the park, with a [trigger](/docs/reference/triggers):

```ts
triggers: [{ id: 'ducks', once: { per: 'turn' }, when: places.at('park'), effects: [{ roll: 'ducks', dice: '1d6+2' }] }],
// 'place.park.ducks': '{{ducks}} of them paddle over at once, in case you brought bread.'
```

No block hints `ducks`, so the React UI shows those dice for a moment over the scene instead, in its `DiceOverlay`.

## Draw the dice yourself

[`view.rolls`](/docs/reference/view#rolls) lists the rolls the last command made, and the next command clears it. Each is a [`Roll`](/docs/reference/rolls#roll): the dice, the faces, what was added, the total, and the target and outcome when there was one. Draw them when the view changes, and read the result out to screen readers with a live region.

```ts tab="Plain JS" tab-group="framework"
// src/rolls.ts: call drawRolls(box, view) from draw(), with an aria-live box that stays in the page.
import type { Roll, View } from '@ifloom/engine'

function describe(roll: Roll): string {
  const outcome = roll.against === undefined ? '' : roll.passed ? ' Passed.' : ' Failed.'
  return `${roll.dice}: ${roll.faces.join(', ')}, total ${roll.total}.${outcome}`
}

export function drawRolls(box: HTMLElement, view: View): void {
  box.replaceChildren(
    ...view.rolls.map((roll) => {
      const line = document.createElement('p')
      line.className = 'roll'
      for (const face of roll.faces) line.append(Object.assign(document.createElement('span'), { className: 'face', textContent: String(face) }))
      line.append(` = ${roll.total}`)
      line.setAttribute('aria-label', describe(roll))
      return line
    }),
  )
}
// In index.html: <div id="rolls" aria-live="polite"></div>
```

```tsx tab="React" tab-group="framework"
// src/Rolls.tsx: React with the runner, without @ifloom/react.
import { useSyncExternalStore } from 'react'
import type { Roll, Runner } from '@ifloom/engine'

function describe(roll: Roll): string {
  const outcome = roll.against === undefined ? '' : roll.passed ? ' Passed.' : ' Failed.'
  return `${roll.dice}: ${roll.faces.join(', ')}, total ${roll.total}.${outcome}`
}

export function Rolls({ runner }: { runner: Runner }) {
  const view = useSyncExternalStore(runner.subscribe, runner.view)
  return (
    <div aria-live="polite">
      {view.rolls.map((roll, at) => (
        <p key={at} className="roll" aria-label={describe(roll)}>
          {roll.faces.map((face, die) => (
            <span key={die} className="face">{face}</span>
          ))}
          {` = ${roll.total}`}
        </p>
      ))}
    </div>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Rolls.vue -->
<script setup lang="ts">
import type { Roll } from '@ifloom/engine'
import { view } from './runner.ts'

function describe(roll: Roll): string {
  const outcome = roll.against === undefined ? '' : roll.passed ? ' Passed.' : ' Failed.'
  return `${roll.dice}: ${roll.faces.join(', ')}, total ${roll.total}.${outcome}`
}
</script>

<template>
  <div aria-live="polite">
    <p v-for="(roll, at) in view.rolls" :key="at" class="roll" :aria-label="describe(roll)">
      <span v-for="(face, die) in roll.faces" :key="die" class="face">{{ face }}</span>
      = {{ roll.total }}
    </p>
  </div>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Rolls.svelte -->
<script lang="ts">
  import type { Roll } from '@ifloom/engine'
  import { view } from './runner.ts'

  function describe(roll: Roll): string {
    const outcome = roll.against === undefined ? '' : roll.passed ? ' Passed.' : ' Failed.'
    return `${roll.dice}: ${roll.faces.join(', ')}, total ${roll.total}.${outcome}`
  }
</script>

<div aria-live="polite">
  {#each $view.rolls as roll, at (at)}
    <p class="roll" aria-label={describe(roll)}>
      {#each roll.faces as face, die (die)}<span class="face">{face}</span>{/each}
      = {roll.total}
    </p>
  {/each}
</div>
```

A little CSS gives the faces a tumble as they appear, and leaves it out for a player who asks for reduced motion:

```css
.roll .face {
  display: inline-block;
  min-width: 2rem;
  margin-right: 0.25rem;
  border: 2px solid currentColor;
  border-radius: 0.4rem;
  text-align: center;
  animation: tumble 0.6s ease-out;
}
@keyframes tumble {
  from { transform: rotate(-200deg) scale(0.6); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .roll .face { animation: none; }
}
```

To put the dice beside the line that tells the outcome, as the React UI does, read the block's hint from each beat: `beat.ui?.dice` names the roll's key. The hint is the React UI's word, but the engine carries any hint to the view, so your UI can read it too. See [Presentation hints](/docs/reference/ui-hints).

## See it in the showcase

Small Town's park in [`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts) has the stone and the ducks, and its tests play the check.
