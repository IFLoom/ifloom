---
title: "Dice rolls"
description: "Reference for the roll effect, Dice, Roll and RollsState: dice in notation or as a count and sides, a number added, a target, criticals, state.rolls and view.rolls."
---
A dice roll is the `roll` effect, which throws dice, keeps the total in the [kv store](/docs/reference/glossary#kv) under a key, and records the roll. A condition then branches on how it went, prose prints the total, and a UI shows the dice landing. Any list of effects can hold one, a choice's, an action's, a trigger's or a plugin's. [Roll dice for a check](/docs/how-to/roll-dice) builds a whole check, and [Why IFLoom works this way](/docs/explanation/design#the-same-save-gives-the-same-draws) explains why a roll can't be thrown again by reloading.

In the showcase: `examples/showcase/src/story/park.ts`, whose `skim` action rolls `2d6` against 8 and whose trigger rolls `1d6+2` ducks.

```ts
import type { Dice, Roll, RollsState } from '@ifloom/engine'
```

## Dice

The dice a `roll` effect throws, in notation or as a count and sides. Every form is in [`Dice`](/docs/api/engine#dice).

Notation is a count, `d`, the sides, and an optional number to add or take away, such as `'2d6'`, `'1d20'`, `'d100'` or `'3d8-2'`. Upper case and spaces are allowed, and a missing count means one die. The object form, `{ count: 2, sides: 6 }`, adds no number, and its `count` is 1 when left out. A roll throws 1 to 100 dice of at least 2 sides.

```ts fragment
dice: '2d6+1'
dice: { count: 2, sides: 6 }
```

## Roll

One roll as it was made: the dice, each die's face, what was added, the total, and the outcome against a target. Every field is in [`Roll`](/docs/api/engine#roll).

A roll holds only what happened, so a UI can show all of it. `critical` is `'max'` when every die showed its top face and `'min'` when every die showed 1, such as a natural 20 or a natural 1 on a d20, or a double six or a double one on `2d6`. A critical doesn't change `passed`. `passed` and `against` are left out when the effect gave no target.

```ts fragment
{ key: 'skim', dice: '2d6', faces: [5, 4], plus: 0, total: 9, against: 8, passed: true }
```

## RollsState

The rolls a save keeps, as [`state.rolls`](/docs/reference/state#rolls). Every field is in [`RollsState`](/docs/api/engine#rollsstate).

`made` counts the rolls the save has made, and goes into each new roll's draw. `last` holds the rolls the last command made, and the next command replaces it, with an empty list when it rolls nothing. `latest` holds the latest roll under each key, which the [`roll` condition](/docs/reference/conditions#roll) reads, kept until another roll under the same key replaces it.

## Conditions

### roll

The latest roll made under a key: whether one was made, whether it `passed`, and whether it was a `critical`. The [conditions page](/docs/reference/conditions#roll) describes it, and `{ kv: 'skim', gte: 11 }` tests the total.

## Effects

### roll

Throws `dice`, adds `plus`, and keeps the total in the kv store under the key `roll` names. Every field is in the `roll` form of [`Effect`](/docs/api/engine#effect).

```ts
import type { Content } from '@ifloom/engine'

export const park: Content = {
  actions: [{ id: 'skim', label: 'Skim a stone', effects: [{ roll: 'skim', dice: '2d6', against: 8 }] }],
}
```

| Field | Meaning |
|---|---|
| `roll` | The kv key the total goes in, of letters, digits and `_` and not starting with a digit, so `{{skim}}` prints it. |
| `plus` | An [`Amount`](/docs/reference/amounts#amount) added to the total, such as `{ stat: 'strength' }` for the player's stat as [`statValue`](/docs/reference/stats#statvalue) reads it, modifiers included. |
| `against` | The target, also an `Amount`, read as the dice are thrown. The roll passes when the total reaches it, so `2d6` against 8 passes on 8 or more. |

Each die is a [seeded draw](/docs/reference/random#draw), `draw(sides, 'roll', seed, turn, made, key, die)` plus 1. `made` goes up with every roll, so two rolls in one command never share a draw, even under one key, and trying a check again in the same turn rolls afresh. A [replay](/docs/reference/runner#replay) of the same commands makes the same rolls, and reloading a save and trying again rolls what it rolled before.

## View

`view.rolls` lists the rolls the last command made, in order, each a [`Roll`](#roll). The next command clears it, so a UI shows each roll once. To render it, see [Render dice rolls](/docs/how-to/render/stats-and-things#render-dice-rolls).

## Checks

The [content checker](/docs/reference/checks) checks every `roll` effect:

| Problem | Cause |
|---|---|
| `dice "2x6" is not dice notation such as "2d6+1", "1d20" or "d100"` | `dice` is text the engine can't read, and the effect rolls nothing. |
| `dice have 1 sides; a die needs at least 2` | A die has fewer than 2 sides. |
| `unknown stat "strenght"` | `plus` or `against` names a stat the game doesn't declare. |

The checker also reports more than 100 dice, a key that `{{key}}` couldn't print, and a `plus` or `against` that isn't an amount.
