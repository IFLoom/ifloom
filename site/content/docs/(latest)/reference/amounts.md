---
title: "Amounts"
description: "Amount, the one way content names a number worked out in play: in effects, range bounds, a stat's bounds, rolls and plugin fields, read with amountOf."
---
Most places that take a number in your content also take an `Amount`: a number worked out when it's read, such as another stat, a kv key or a count of entities. So "coins at least the rent" needs no code:

```ts
{ stat: 'coins', gte: { stat: 'rent' } }
```

```ts
import { amountOf, type Amount } from '@ifloom/engine'
```

## Amount

```ts
type Amount =
  | number
  | StatKey
  | { stat: StatKey; of?: string }
  | { kv: string; of?: string }
  | ValueRef
  | { count: string | Select; where?: Condition; units?: true }
  | { sum: Amount[] }
  | { product: Amount[] }
  | { min: Amount[] }
  | { max: Amount[] }
  | { scale: Amount; by: number }
  | { clamp: Amount; min?: number; max?: number }
```

| Written as | What it reads |
|---|---|
| `12` | The number as written. |
| `'rent'` | The player's stat with that id. |
| `{ sum }`, `{ product }`, `{ min }`, `{ max }`, `{ scale, by }`, `{ clamp }` | Amounts combined, as a [`Formula`](/docs/reference/stats#formula) combines stats: `{ sum: ['rent', 2] }` or `{ scale: 'rent', by: -1 }`. Each part can be any amount. |
| `{ stat, of? }` | A stat, the player's or with `of` an entity's, read the way [`statValue`](/docs/reference/stats#statvalue) reads it. |
| `{ kv, of? }` | A key in the [kv store](/docs/reference/state#kv), the player's or with `of` someone else's, as the [`kv` condition](/docs/reference/conditions#kv) names them. A value that isn't a number counts as 0. |
| `{ value, with? }` | A [value](/docs/reference/custom#values) by name, the game's own (`game/…`) or a plugin's, asked with `with`. Text that reads as a number counts as that number. |
| `{ count, where?, units? }` | How many entities there are, counted as the [`count` condition](/docs/reference/conditions#count) counts them: `{ count: 'staff' }`, or `{ count: { of: 'food', at: 'player' }, units: true }` for how many the player holds. |

`of` names whose it is, as it does in conditions: an [entity reference](/docs/reference/entities#entityref), `'$'` inside an [`each`](/docs/reference/effects#each) or a `where`, `'storyline:<id>'` or `'minigame'` for a kv key. Anything that doesn't read as a finite number is 0, and so is an owner that isn't there.

## Where you can use one

| Where | Fields |
|---|---|
| [Range bounds](/docs/reference/conditions#range) | `gte`, `gt`, `lte` and `lt`, in every condition that takes a range, a [call](/docs/reference/conditions#calls)'s own bounds included |
| [`stat` effect](/docs/reference/effects#stat) | `by` and `to` |
| [`kv` effect](/docs/reference/effects#kv) | `by`, and each end of `random` |
| [`entity`](/docs/reference/effects#entity) and [`move`](/docs/reference/effects#move) effects | `by`, and `entity`'s `to` |
| [`roll` effect](/docs/reference/rolls#the-effect) | `plus` and `against` |
| [A stat](/docs/reference/stats#statdef) | `min` and `max` |
| [Achievements](/docs/plugins/achievements#achievementdef) | a progress `value` |
| [Devices](/docs/plugins/devices#appdef) | an app's `badge` |

```ts
// Pay the rent, whatever it is this week.
{ stat: 'coins', by: { scale: 'rent', by: -1 } }

// Pay each of the staff their own wage.
{ each: 'staff', effects: [{ stat: 'coins', by: { scale: { stat: 'wage', of: '$' }, by: -1 } }] }

// Energy can't go above fitness.
{ id: 'energy', label: 'Energy', start: 30, max: { stat: 'fitness' } }

// A climb, with strength added, against the height of the wall.
{ roll: 'climb', dice: '1d20', plus: { stat: 'strength' }, against: { kv: 'wall' } }
```

An amount is worked out when it's read: as an effect applies, as a condition is asked, or as a stat is held to its range. A choice's [price](/docs/reference/view#price) reads its `stat` effect's amount in the state on screen.

**Gotchas.**
- In a `kv` effect, `to` stays a [kv value](/docs/reference/state#kv) as written, since a string there is text, not a stat's id. Change a key by an amount with `by`.
- A stat's `max` or `min` that comes back to the stat itself, such as a derived stat whose ceiling reads it, reads its default (100, or 0) while it's being worked out, rather than going round for ever.
- A `max` or `min` naming a value nobody declares, as from a plugin the game no longer has, reads its default too.

## amountOf

```ts
function amountOf(state: GameState, game: Game | undefined, amount: Amount): number
```

An amount worked out in this state, as the engine reads one. Without a game, a stat reads the save's number and a value or a count reads 0. Use it in a plugin's code for a field of its own that takes an amount, and hand the field to the [content checker](/docs/reference/checks) as `{ amount }` in its [references](/docs/reference/plugins#references).

```ts
import { amountOf } from '@ifloom/engine'

amountOf(state, game, { stat: 'rent' })               // 10
amountOf(state, game, { sum: ['rent', { kv: 'tips' }] }) // 15
amountOf(state, game, { count: 'staff' })              // 2
```

## Checking amounts

The [content checker](/docs/reference/checks) reads every amount content writes. It reports one that names a stat the game doesn't declare (or one on the wrong owner), a storyline or a kind it doesn't have, a value nobody declares, and one of the wrong shape:

```
action odd: unknown stat "gold"
action odd: unknown storyline "nobody"
action odd: no custom value named "game/nothing"
action odd: an amount is a number, a stat id, a formula, { stat }, { kv }, { value } or { count }; this one is [3]
```
