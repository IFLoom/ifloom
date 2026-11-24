---
title: "Amounts"
description: "An amount is a number content names, such as a stat or a formula, that the engine works out when it reads it."
---
An amount is a number that content names and the engine works out when it reads it: a plain number, a stat, a kv key, a value, a count of entities, or a formula of them. Range bounds, a `stat` effect's `by` and `to`, a stat's `min` and `max` and a roll's target all take one, so "coins at least the rent" needs no code. [Effects and conditions are data](/docs/0.1.0/explanation/state-and-commands) explains why content stays data.

In the showcase: `examples/showcase/src/story/park.ts`, whose skimming roll has a target in `against`.

```ts
import { amountOf, type Amount } from '@ifloom/engine'
```

## Amount

A number content names that the engine works out when it reads it. Every form is in [`Amount`](/docs/0.1.0/api/engine#amount).

| Key | Meaning |
|---|---|
| `12` | The number as written. |
| `'coins'` | The player's stat with that id. |
| `{ stat, of? }` | A stat, the player's or with `of` an entity's, read as [`statValue`](/docs/0.1.0/reference/stats#statvalue) reads it. |
| `{ kv, of? }` | A key's number in a [kv store](/docs/0.1.0/reference/glossary#kv), the player's or with `of` another's. A value that isn't a number counts as 0. |
| `{ value, with? }` | A [value](/docs/0.1.0/reference/custom#values) by name, the game's own (`game/…`) or a plugin's, asked with `with`. Text that reads as a number counts as that number. |
| `{ count, where?, units? }` | The number of entities, counted as the [`count`](/docs/0.1.0/reference/conditions#count) condition counts them. |
| `{ sum }`, `{ product }`, `{ min }`, `{ max }` | The sum, product, least or greatest of a list of amounts. |
| `{ scale, by }` | An amount multiplied by the number `by`, so `{ scale: 'coins', by: -1 }` is minus the player's coins. |
| `{ clamp, min?, max? }` | An amount held between two numbers. |

`of` names the owner as it does in conditions: an [`EntityRef`](/docs/0.1.0/reference/common#entityref), `'$'` inside an [`each`](/docs/0.1.0/reference/effects#each) or a `where`, and `'storyline:<id>'` or `'minigame'` for a kv key. An amount that doesn't read as a finite number is 0, and so is an owner that isn't there.

The engine works an amount out each time it reads it: as an effect applies, as a condition is asked, or as a stat is held to its range. A choice's [price](/docs/0.1.0/reference/view#price) reads its `stat` effect's amount in the state on screen.

These fields take an amount:

- The bounds of every [`Range`](/docs/0.1.0/reference/common#range), in every condition that takes one, a call's own bounds included.
- The [`stat`](/docs/0.1.0/reference/effects#stat) effect's `by` and `to`.
- The [`kv`](/docs/0.1.0/reference/effects#kv) effect's `by`, and each end of its `random`.
- The [`entity`](/docs/0.1.0/reference/effects#entity) and [`move`](/docs/0.1.0/reference/effects#move) effects' `by`, and `entity`'s `to`.
- A [roll](/docs/0.1.0/reference/rolls)'s `plus` and `against`.
- A [stat](/docs/0.1.0/reference/stats#statdef)'s `min` and `max`.
- A plugin field the plugin declares to the checker as `{ amount }`, such as an [achievement](/docs/0.1.0/reference/plugins/achievements)'s progress or a [device](/docs/0.1.0/reference/plugins/devices) app's badge.

This content caps energy at the player's fitness, and pays each member of staff their own wage:

```ts
import type { Content } from '@ifloom/engine'

export const week: Content = {
  stats: [
    { id: 'fitness', label: 'Fitness', start: 40 },
    { id: 'energy', label: 'Energy', start: 30, max: { stat: 'fitness' } },
  ],
  actions: [
    {
      id: 'payday',
      label: 'Pay the staff',
      effects: [{ each: 'staff', effects: [{ stat: 'coins', by: { scale: { stat: 'wage', of: '$' }, by: -1 } }] }],
    },
  ],
}
```

## Functions

### amountOf

Returns an amount worked out in a state, as the engine reads one. Its signature is in [`amountOf`](/docs/0.1.0/api/engine#amountof).

A plugin calls it for a field of its own that takes an amount, and declares the field to the [content checker](/docs/0.1.0/reference/checks) as `{ amount }` in its [references](/docs/0.1.0/reference/plugin-checks).

```ts given
import { amountOf } from '@ifloom/engine'

amountOf(state, game, { stat: 'coins' })                  // 12
amountOf(state, game, { sum: ['coins', { kv: 'tips' }] }) // 15
amountOf(state, game, { count: 'staff' })                 // 2
```

## Checks

The [content checker](/docs/0.1.0/reference/checks) reads every amount content writes, and reports these problems:

| Problem | Cause |
|---|---|
| `unknown stat "gold"` | The amount names a stat the game doesn't declare, or one declared on another owner. |
| `unknown storyline "nobody"` | A `{ kv, of: 'storyline:…' }` names a storyline the game doesn't declare. |
| `no game value named "game/nothing"` | A `{ value }` names a value nobody declares. |
| `an amount is a number, a stat id, a formula, { stat }, { kv }, { value } or { count }; this one is [3]` | The amount has none of the shapes above. |

## Caveats

- In a `kv` effect, `to` stays a [`KvValue`](/docs/0.1.0/reference/common#kvvalue) as written, since a string there is text and not a stat's id. A `kv` effect changes a key by an amount with `by`.
- A stat's `max` or `min` that comes back to the stat itself, such as a derived stat whose ceiling reads it, reads its default (100, or 0) while the engine works it out.
- A `max` or `min` naming a value nobody declares, such as one from a plugin the game no longer has, reads its default too.
