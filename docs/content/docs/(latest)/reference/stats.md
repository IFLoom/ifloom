---
title: "Stats"
description: "A stat is a number the game keeps for the player or for each entity of a kind, with ranges, levels and derived values."
---
A stat is a number the game keeps for the player, such as coins, energy or charm, or for each entity of a kind. The engine declares no stats of its own, so your content declares every one in `stats`. [Entities, things and traits](/docs/explanation/entities-and-traits#stats-the-kv-store-and-storylines) explains when a value is a stat rather than a kv key. The [`stat` effect](/docs/reference/effects#stat) changes a stat, the [`stat`](/docs/reference/conditions#stat) and [`level`](/docs/reference/conditions#level) conditions test it, and an action's [cost](/docs/reference/actions#actioncost) spends it.

In the showcase: `examples/showcase/src/world/stats.ts`, which declares coins and energy with words and a refusal line, charm, and a friendship kept on each character.

```ts
import { clampStat, lackingLine, statLevel, statOf, statValue, type Formula, type StatDef, type StatLevels, type StatRound, type StatWords } from '@ifloom/engine'
```

## StatDef

A number the game declares in `stats`, kept for the player or, with `of`, for each entity of a kind. Every field is in [`StatDef`](/docs/api/engine#statdef).

A stat's `id` is unique across the whole game, counting the player's stats and every kind's together. A new game starts each of the player's stats at its `start`, 0 if left out. The view lists the stats in the order the game declares them, and a choice's price lists its stats in that order too. A game that declares no stats has no stat list in its view and no prices on its buttons.

| Field | Meaning |
|---|---|
| `min`, `max` | The range every effect and cost holds the stat to, 0 and 100 if left out. Either can be an [`Amount`](/docs/reference/amounts#amount), worked out against the state each time, for a floor or a ceiling that moves. A `max` that names a value nobody declares, or one that reads the stat itself, gives 100. |
| `visible` | A [condition](/docs/reference/conditions). The view lists the stat only while it holds, for a number the player hasn't found yet. |
| `listed` | `false` keeps the stat out of `view.stats`, for one a UI renders its own way, such as a purse in the corner. It stays in `view.statsById`. |
| `spendable` | `true` for a stat the player spends. A choice's price counts only its negative `stat` effects on spendable stats. Any stat can still be in an action's `cost`. |
| `ui` | [Presentation hints](/docs/reference/ui-hints), carried to the stat's view as written, such as the React UI's [`display`](/docs/reference/react/hints#display). |

The showcase's coins and energy are both spent, and energy reads as a whole number:

```ts
import type { StatDef } from '@ifloom/engine'

export const stats: StatDef[] = [
  {
    id: 'coins',
    label: 'Coins',
    start: 12,
    max: 999,
    spendable: true,
    format: { one: '{n} coin', other: '{n} coins' },
    lacking: { one: 'You need {n} coin.', other: 'You need {n} coins.' },
  },
  { id: 'energy', label: 'Energy', start: 80, spendable: true, format: '{n}%', lacking: 'Too tired.', round: 'round' },
  { id: 'charm', label: 'Charm', start: 1, max: 20 },
]
```

### of

The [kind](/docs/reference/entities#kinddef) of entity that keeps the stat, such as `'staff'` or the cast's `'character'`. Every entity of that kind has the stat, and the player doesn't. A new game's `state.stats`, `view.stats` and `view.statsById` leave it out, and each entity's stats are in `view.entities` instead.

An entity's stat starts at the entity's own `stats` in its [declaration](/docs/reference/entities#entitydef) or its `create` effect, else at the stat's `start`. The save keeps it once play changes it. An effect or condition reaches it with `of` naming the entity, as `{ stat: 'morale', by: -8, of: 'staff:ana' }`.

The other fields work on an entity's stat as follows:

- **`min` and `max`** hold the stat's range for every entity. A moving `max` is worked out against the whole state, so it is the same for every entity.
- **`visible`** is asked with `'$'` as the entity, so a stat can show on one entity and not another.
- **`listed: false`** keeps the stat out of every entity's `stats` in the view.
- **`spendable`** does nothing, because an action's `cost` spends only the player's stats.

```ts
import type { StatDef } from '@ifloom/engine'

export const staff: StatDef[] = [
  { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
  { id: 'wage', label: 'Wage', of: 'staff', start: 10, max: 50, format: '£{n}' },
  { id: 'price', label: 'Price', of: 'dish', start: 4, min: 1, max: 20, format: '£{n}' },
]
```

### StatWords

A stat's `format` or `lacking`, with `{n}` for the number. Every form is in [`StatWords`](/docs/api/engine#statwords).

A string is used for every number. With `one` and `other`, `one` is used when the number is exactly 1 and `other` for any other, 0 included, so a price reads "1 coin" and "4 coins". `format` writes the value in the view's `text` and in prices, and the bare number shows when it's left out. `lacking` is the refusal when a cost asks for more than the player has, and [`lackingLine`](#lackingline) fills it in.

```ts
import type { StatDef } from '@ifloom/engine'

export const coins: StatDef = {
  id: 'coins',
  label: 'Coins',
  format: { one: '{n} coin', other: '{n} coins' },
  lacking: { one: 'You need {n} coin.', other: 'You need {n} coins.' },
}
```

### StatRound

How a stat's value is rounded as it's read, the `round` field: `'none'` (the default), `'floor'`, `'round'` or `'ceil'`. Every form is in [`StatRound`](/docs/api/engine#statround).

A stat with `round` reads as a whole number in conditions, costs, formulas, the view and its `text`. The kept value is never rounded, so energy kept at 80.4 and raised by 1 is kept at 81.4 and reads 81. `'round'` is JavaScript's `Math.round`, which rounds a half up, so 2.5 reads 3 and -2.5 reads -2.

[`statValue`](#statvalue) works a stat out in this order:

1. The kept value, or the [formula](#formula) of a derived stat, held to the range.
2. Each plugin's [stat modifiers](/docs/reference/plugin-api#statmodifier), held to the range again.
3. `round`.
4. The range once more, so a stat with a fractional `min` or `max` never reads past it.

With energy at 65 and a `multiply: 1.15` modifier, energy with `round: 'round'` reads 75, not 74.75.

### Formula

The `derive` field, which works a stat out from other stats each time it's read instead of keeping it. Every form is in [`Formula`](/docs/api/engine#formula).

| Kind | Meaning |
|---|---|
| a number | That number. |
| a string | That stat's value, as `statValue` reads it, another derived stat included. |
| `sum`, `product` | The parts added or multiplied together. An empty `sum` gives 0 and an empty `product` 1. |
| `min`, `max` | The smallest or largest part. An empty list gives 0. |
| `scale` | The formula times `by`, with a fraction to divide. |
| `clamp` | The formula held between `min` and `max`, either of which can be left out. |

Formulas nest, and they don't round. A derived stat is held to its own range after the formula, 0 to 100 unless it declares another, so a formula that comes out at 140 reads 100. Every reader goes through [`statValue`](#statvalue), including conditions, cost checks and the view. A derived stat is never in `state.stats`, so code that reads `state.stats.service` gets `undefined`.

A derived stat with `of` is worked out for each entity, from that entity's stats. A formula reads only stats with the same owner as its own stat. A derived stat is never written, so a `stat` effect on it does nothing, a cost can't spend it, and it takes no `start`.

```ts
import type { StatDef } from '@ifloom/engine'

export const skills: StatDef[] = [
  { id: 'baking', label: 'Baking', start: 4 },
  { id: 'patience', label: 'Patience', start: 6 },
  { id: 'service', label: 'Service', derive: { sum: [{ scale: { sum: ['baking', 'patience'] }, by: 0.5 }, { clamp: { sum: ['patience', -5] }, min: 0 }] } },
]
```

### StatLevels

The `levels` field, the thresholds a stat passes as it grows. Every field is in [`StatLevels`](/docs/api/engine#statlevels).

The stat itself doesn't change, and effects and conditions still work on its value. The levels read that value. With `at: [10, 30, 60]`, a value below 10 is level 0, from 10 level 1, from 30 level 2 and from 60 level 3. A value equal to a threshold is at that level. A derived stat can have levels, and so can an entity's stat, read per entity.

The [`level`](/docs/reference/conditions#level) condition reads the level, and the stat's view gets a `level` of `{ level, next, progress }`, as [`statLevel`](#statlevel) returns. `hidden: true` leaves `level` out of the view, so a UI never shows the thresholds, while conditions still read them.

When a command run through [`apply`](/docs/reference/commands#apply) takes one of the player's stats up one or more levels, and its `levels` has a `notice`, the engine raises a [notice](/docs/reference/notices) after the command. `{label}` in the line is the stat's label and `{level}` the level it ends the command at. The notice's id is `level.<stat>` and its tag `level`, so a second level-up replaces the first while it's unseen. One command that jumps two levels raises one notice.

```ts
import type { StatDef } from '@ifloom/engine'

export const cooking: StatDef = { id: 'cooking', label: 'Cooking', levels: { at: [10, 30, 60], notice: '{label} is now level {level}.' } }
```

## State

[`state.stats`](/docs/reference/state#stats) holds the player's kept stats by id. An entity's stats are in its record in [`state.entities`](/docs/reference/state#entities), and only once play has changed them. Derived stats are kept nowhere. Read every stat through [`statValue`](#statvalue), which falls back to content and applies modifiers and rounding.

## View

`view.stats` lists the player's stats that are listed and visible, in declaration order, each a [`StatView`](/docs/api/engine#statview) with its `label`, its value written through `format` as `text`, its range and its `level`. `view.statsById` holds every one of the player's stats by id, listed or not. To render them, see [Render the stats](/docs/how-to/render/stats-and-things#render-the-stats).

## Functions

### statOf

Returns the declaration of a stat, or `undefined` when the game declares none by that id. Every parameter is in [`statOf`](/docs/api/engine#statof).

```ts given
import { statOf } from '@ifloom/engine'

statOf(game, 'coins')?.label // 'Coins'
```

### clampStat

Returns a value held between a stat's `min` and `max`, each worked out against the state. Every parameter is in [`clampStat`](/docs/api/engine#clampstat).

The range is 0 to 100 for a stat that declares neither bound, or isn't declared. Effects and costs both go through it. A moving ceiling that drops doesn't pull the stat down until something next changes it.

```ts given
import { clampStat } from '@ifloom/engine'

clampStat(state, game, 'coins', 1200) // 999
```

### lackingLine

Returns the refusal for a cost of `amount` of a stat that the player can't cover. Every parameter is in [`lackingLine`](/docs/api/engine#lackingline).

The line is the stat's `lacking` with `{n}` set to the amount the cost asks for, not to how far short the player is. With no `lacking`, it's the [`notEnough`](/docs/reference/strings#refusals) string with the stat's label in lower case. An action's refusal uses it unless the action's `cost.reasons` has a line for that stat.

```ts given
import { lackingLine } from '@ifloom/engine'

lackingLine(game, 'coins', 4) // 'You need 4 coins.'
lackingLine(game, 'charm', 5) // 'Not enough charm.'
```

### statValue

Returns a stat's value as conditions and the view read it, the player's or, with `of`, an entity's. Every parameter is in [`statValue`](/docs/api/engine#statvalue).

A kept stat the save doesn't have yet reads as the entity's declared value or the stat's `start`. A derived stat is worked out from its formula. The player's stats read with each plugin's modifiers applied, so the value can differ from `state.stats`. [`StatRound`](#statround) gives the full order. An entity that isn't in the game reads 0.

```ts given
import { statValue } from '@ifloom/engine'

statValue(state, game, 'energy')
statValue(state, game, 'friendship', 'character:ava')
```

### statLevel

Returns where a stat with `levels` stands, as `{ level, next, progress }`, or `undefined` for a stat with no levels. Every parameter is in [`statLevel`](/docs/api/engine#statlevel).

`next` is the value the next level starts at, `null` at the top. `progress` runs from 0 at this level's start to 1 at the next, and is 1 at the top. Level 0 counts from the stat's `min`.

```ts given
import { statLevel } from '@ifloom/engine'

// levels: { at: [10, 30, 60] }, cooking at 20
statLevel(state, game, 'cooking') // { level: 1, next: 30, progress: 0.5 }
```

## Checks

The [content checker](/docs/reference/checks) reports these problems with stats:

| Problem | Cause |
|---|---|
| A stat that isn't declared | Content names a stat no `stats` entry declares, or names it on the wrong owner, such as the player's `coins` with `of: 'staff:ana'`. |
| `stat "…" is derived: it is worked out, never written` | A `stat` effect, a `create` effect's `stats` or an entity's `stats` writes a derived stat. |
| `spends stat "…", which is derived and never written` | An action's `cost` spends a derived stat. |
| `derive goes round in a cycle: service → mood → service` | Two formulas read each other. A formula that goes round reads 0 once it's 64 steps deep. |
| `levels.at needs at least one threshold` | A stat's `levels.at` is empty or missing. |
| `levels.at must go up, each threshold above the last` | The thresholds are out of order or repeated. |
| `levels.at … outside the stat's range (… to …)` | A threshold is below the stat's `min` or above its `max`. A `max` given as a `{ value }` has no upper bound here. |

The checker also reports a derived stat with `spendable` or a `start`, and a formula that names an undeclared stat or one with another owner.

## Caveats

- An entity's declared `stats` and a `create` effect's `stats` aren't held to the range. `stats: { skill: 20 }` on a stat with `max: 10` starts at 20, and the next effect that moves it brings it back to 10.
- A stat effect with `of` naming the wrong owner still runs. `{ stat: 'coins', by: 5, of: 'staff:ana' }` gives Ana a `coins` of her own that no view shows.
- `StatWords` follows English's rule for one and many. A language with more plural forms needs a format that reads the same for every number, such as `'£{n}'`.
- Only the player's stats raise a level notice. A staff member going up a level raises none, and going down a level never does.
- A plugin's modifier is read, never written, so a stat a modifier moves past its `max` reads at the `max` and keeps its own value underneath.
