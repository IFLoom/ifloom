---
title: "Dice rolls"
description: "The roll effect: dice in notation or as a count and sides, a number or a stat added, a target, criticals, the roll condition, and view.rolls for a UI to show the dice."
---
A dice roll is an effect. It throws the dice, keeps the total in the [kv store](/docs/reference/state#kv) under a key, and records the roll, so a condition can branch on how it went and a UI can show the dice landing.

```ts
import type { Content } from '@ifloom/engine'

export const park: Content = {
  actions: [
    // Two dice against 8: the total is the kv key `skim`.
    { id: 'skim', label: 'Skim a stone', effects: [{ roll: 'skim', dice: '2d6', against: 8 }] },
  ],
}
```

Then `{ roll: 'skim', passed: true }` holds when the total was 8 or more, `{ kv: 'skim', gte: 11 }` when it was 11 or more, and `{{skim}}` prints the total in prose. The [Dice rolls and checks](/docs/recipes/dice) recipe builds a whole check: an inline action in the prose, the roll, a line for each outcome, and the dice drawn above it.

```ts
import { type Dice, type Roll, type RollsState } from '@ifloom/engine'
```

## Where a roll can happen

Anywhere effects run. A player makes one with a choice, an [action](/docs/reference/actions) or an inline `[[act:]]` link whose effects include it. The game makes one by itself in a [trigger](/docs/reference/triggers), a [storylet](/docs/reference/storylets)'s choice, a minigame's final state or a plugin's effects. Either way the roll lands in [`view.rolls`](/docs/reference/view#rolls) for the command that made it.

## The effect

```ts
{ roll: string, dice: Dice, plus?: Amount, against?: Amount }
```

| Field | Meaning |
|---|---|
| `roll` | The kv key the total goes in, and the key the [`roll` condition](/docs/reference/conditions#roll) reads. Letters, digits and `_`, not starting with a digit, so `{{skim}}` prints it. |
| `dice` | What to throw: notation or `{ count, sides }`. See [`Dice`](#dice). |
| `plus` | Added to the total: an [`Amount`](/docs/reference/amounts#amount), such as a number or `{ stat: 'strength' }` for the player's stat as [`statValue`](/docs/reference/stats#statvalue) reads it. |
| `against` | A target, also an `Amount`. The roll passes when the total is at least this. The [`Roll`](#roll) keeps the number it read. |

The [effects reference](/docs/reference/effects#roll) has the details, and [Checks](/docs/reference/checks#in-an-effect) lists what the content checker reports.

## Dice

```ts
type Dice = string | { count?: number; sides: number }
```

Notation is a count, `d`, the sides, and an optional number to add or take away: `'2d6'`, `'1d20'`, `'d100'` (one die), `'3d8-2'`. Upper case and spaces are fine. The object form is the same without the number: `{ count: 2, sides: 6 }`, where `count` is 1 if left out. A roll throws 1 to 100 dice of at least 2 sides.

## Roll

```ts
type Roll = {
  key: string
  dice: string                // '2d6': the dice thrown, without what's added
  faces: number[]             // what each die showed, in order
  plus: number                // the notation's own number and the effect's `plus`, together
  total: number               // the faces added up, plus `plus`
  against?: number            // the target, when the effect gave one
  passed?: boolean            // whether the total reached it; only with a target
  critical?: 'max' | 'min'    // every die on its top face, or every die on 1
}
```

One roll as it was made. [`view.rolls`](/docs/reference/view#rolls) lists the last command's, and `state.rolls.latest` keeps the latest under each key. It holds only what happened, so it's safe to show: the faces, what was added, the total, the target and the outcome.

A critical is every die on its top face (`'max'`) or every die on 1 (`'min'`). With one die it's a natural 20 or a natural 1 on a d20, and with two six-sided dice it's a double six or a double one. It doesn't change `passed`.

## RollsState

```ts
type RollsState = { made: number; last: Roll[]; latest: Record<string, Roll> }
```

What a save keeps of its rolls, as [`state.rolls`](/docs/reference/state#rolls). `made` is how many rolls the save has made. `last` is the rolls the last command made. The next command replaces it, with nothing when it rolls nothing. `latest` is the latest under each key.

## How a roll is drawn

Each die is a separate [seeded draw](/docs/reference/random): `draw(sides, 'roll', seed, turn, made, key, die)`, plus 1. `made` goes up with every roll, so:

- two rolls in one command never share a draw, even under the same key
- trying a check again in the same turn rolls afresh
- a [replay](/docs/reference/runner#replay) of the same commands makes the same rolls, and reloading a save and trying again rolls what it rolled before

## Drawing it

`view.rolls` has the rolls the last command made, in order, each a [`Roll`](#roll): the dice, each die's face, what was added, the total, and with a target, whether it passed. The next command clears them, so a UI shows each roll once.

The React UI's [`Scene`](/docs/react/components#scene) draws a [`DiceRoll`](/docs/react/components#diceroll) above a block whose [`dice`](/docs/react/hints#dice) hint names the roll, and the others over the scene for a moment. [`useFreshRolls`](/docs/react/components#usefreshrolls) gives the new ones to draw somewhere of your own. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, and the Vue tab reads `view` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/rolls.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/rolls.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Rolls.vue]{meta='tab="Vue" tab-group="framework"'}

## See it in an example

Small Town's park, in [`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts). Its stones line holds `[[act:skim|Try to skim a stone]]`, whose action rolls `2d6` against 8, and three blocks after it show how the stone went, each with the React UI's `ui: { dice: 'skim' }`. A trigger rolls `1d6+2` ducks as you arrive, and the line after the river prints `{{ducks}}`.
