# Stats

A stat is a number the game keeps for the player, such as coins, energy or charm. The engine doesn't define any stats itself, so you declare every one your game uses on the [game](/reference/game#game). If your game declares none, its view has no stat list and its buttons show no prices.

```ts
import type { StatDef } from '@ifloom/engine'

const stats: StatDef[] = [
  { id: 'charm', label: 'Charm', start: 4, bands: [10, 20, 30] },
  { id: 'coins', label: 'Coins', start: 20, max: 9999, format: '{n}c', spendable: true },
  { id: 'baking', label: 'Baking', visible: { flag: 'joinedTheBakery' } },
]

const game = { /* … */, stats }
```

A player's stat lives in `state.stats[id]`. You change it with a [`stat` effect](/reference/effects#stat), which adds to it, or a [`setStat` effect](/reference/effects#setstat), which sets it. A [`{ stat }` condition](/reference/conditions#stat) tests it, and an activity's [cost](/reference/actions#activitycost) spends it.

A stat can also be [derived](#derived-stats), worked out from other stats by a formula instead of kept, and any stat can have [levels](#levels) that it passes as it grows.

A stat declared with `of` is kept on each [entity](/reference/entities) of a kind instead, so every member of staff has a `morale` and every dish a `price`. The value lives at `state.entities[kind][id].stats[id]`, and the same effects and conditions reach it when you add an `of` naming the entity. See [Entity stats](#entity-stats).

## StatDef

```ts
type StatDef = {
  id: string
  of?: string
  label: string
  start?: number
  min?: number
  max?: number | { value: string }
  visible?: Condition
  listed?: boolean
  spendable?: boolean
  lacking?: string
  bands?: readonly number[]
  format?: string
  derive?: Formula
  levels?: StatLevels
}
```

| Field | Default | What it does |
|---|---|---|
| `id` | | The key: `state.stats[id]`, `{ stat: id }`, `{ kind: 'stat', key: id }`. |
| `of` | the player's | The [kind](/reference/entities#kinddef) of entity that keeps it. `'staff'` gives every member of staff one. See [Entity stats](#entity-stats). |
| `label` | | What the player reads, in the view's stat list and in the default `lacking` line. |
| `start` | `0` | The value a new game starts with. |
| `min` | `0` | The lowest any effect or cost can take it. |
| `max` | `100` | The highest any effect or payment can take it. Either a number, or `{ value: name }` for a ceiling that moves. The name is a [custom value](/reference/custom#values) from `game.custom.values`, worked out against the state each time. See [`statMax`](#statmax). Raise it for coins and other open-ended counts. |
| `visible` | always | A [condition](/reference/conditions). The stat appears in [`view().stats`](/reference/view) only while it holds. Use it for a stat the player hasn't discovered yet. |
| `listed` | `true` | `false` keeps it out of `view().stats`, for a stat your UI shows its own way, such as a purse in the corner or an energy gauge. It's still in [`view().statsById`](/reference/view#statview). |
| `spendable` | `false` | The stat is spent on things. A scene choice's [price](/reference/view#price) only counts its negative `stat` effects on spendable stats. |
| `lacking` | `Not enough <label>.` | The refusal when an activity costs more than the player has, with `{n}` for the amount the cost asks for. See [`lackingLine`](#lackingline). |
| `bands` | none | Hidden thresholds, lowest first, for [`{ tier }` conditions](/reference/conditions#tier). The player never sees the numbers. |
| `format` | the number | How the value is written, with `{n}` for the number, as in `'{n}c'`, `'£{n}'` or `'{n} energy'`. The view's `text` and prices use it. |
| `derive` | none | Work the stat out from other stats with a [`Formula`](#formula) instead of keeping it. See [Derived stats](#derived-stats). |
| `levels` | none | Thresholds the stat passes as it grows. See [`StatLevels`](#statlevels). |

**Gotchas.**
- You have to declare a stat before you use it. The [content checker](/reference/checks) reports content that names an undeclared stat, or names a stat on the wrong owner.
- Keep money in whole minor units, such as pence or cents, and let your UI place the decimal point. Sums and saves stay exact that way.
- Declaration order is display order. `view().stats` lists listed, visible stats in the order you declared them, and a scene choice's price lists its stats in that order too.
- `spendable` changes what's shown, not what's allowed. Any stat can be in an activity's `cost`, and the activity's price lists it either way.
- An id is unique across the whole game, counting the player's stats and every kind's together. One `skill` can't be both the player's and the staff's.

### Entity stats

```ts
import type { StatDef } from '@ifloom/engine'

const stats: StatDef[] = [
  { id: 'coins', label: 'Coins', start: 120, max: 99999, format: '£{n}', spendable: true },
  { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
  { id: 'wage', label: 'Wage', of: 'staff', start: 10, max: 50, format: '£{n}' },
  { id: 'price', label: 'Price', of: 'dish', start: 4, min: 1, max: 20, format: '£{n}' },
]
```

A stat with `of` is kept on every [entity](/reference/entities) of that kind. It starts at `start` unless the entity's declaration or its [`create`](/reference/effects#create) effect gives another value. It isn't one of the player's stats, so [`startingStats`](#startingstats), [`view().stats`](/reference/view#the-player-s-numbers-and-things) and `view().statsById` all leave it out. Each entity's stats are in [`view().entities`](/reference/view#entities) instead.

The other fields work much as they do for the player's stats:

| Field | On an entity stat |
|---|---|
| `start`, `min`, `max` | The same range, kept by every effect. `{ kind: 'stat', key: 'morale', by: -8, of: 'staff:ana' }` stops at 0. |
| `format` | How the value is written in the entity's [`StatView`](/reference/view#statview). |
| `visible` | Tested with `'$'` bound to the entity, so a stat can show on one entity and not another. `visible: { flag: 'tasted', of: '$' }` shows a dish's quality only once it's been tasted. |
| `listed` | `false` keeps it out of every entity's `stats` in the view. |
| `spendable` | Does nothing. A `stat` effect with `of` is never part of a button's [price](/reference/view#price), and an activity's `cost` only spends the player's stats. |
| `bands` | Ignored. [`{ tier }`](/reference/conditions#tier) and [`statBand`](#statband) only read the player's value. |

### A purse and an energy gauge

Here are two stats a town game is likely to want. Coins are spent, and the UI shows them in a purse of its own. Energy has a ceiling that grows with fitness, and fills back up overnight.

```ts
import type { Custom, GameRules, StatDef } from '@ifloom/engine'

// goes on the game as `custom`
const custom: Custom = {
  values: { energyCeiling: (state) => 80 + (state.stats.fitness ?? 0) },
}

const stats: StatDef[] = [
  {
    id: 'coins',
    label: 'Coins',
    start: 20,
    max: 9999,
    format: '{n}c',
    spendable: true,
    listed: false, // the UI draws its own purse from view().statsById.coins
    lacking: 'Not enough on you.',
  },
  {
    id: 'energy',
    label: 'Energy',
    start: 80,
    max: { value: 'energyCeiling' },
    spendable: true,
    listed: false,
    lacking: 'Need {n} energy.',
  },
  { id: 'fitness', label: 'Fitness', max: 40 },
]

const rules: GameRules = {
  // A full night's sleep puts energy back at its ceiling.
  turn: () => ({ effects: [{ kind: 'setStat', key: 'energy', to: 9999 }] }),
}
```

The `setStat` asks for more than any ceiling, so it's held to `energyCeiling` as it stands that morning. A button that costs `{ stats: { coins: 3, energy: 10 } }` shows `3c` and `10`, and a player with 2 coins reads *Not enough on you.*

## statDef

```ts
function statDef(game: Game, id: string): StatDef | undefined
```

The declaration for a stat, or `undefined` if the game declares none by that id.

## startingStats

```ts
function startingStats(game: Game): Stats
```

Every one of the player's stats (those declared without `of`) at its `start` value. A [derived stat](#derived-stats) isn't in it, because it's never kept. [`startingState`](/reference/commands#startingstate) uses it for a new game.

## statMax

```ts
function statMax(state: GameState, game: Game, id: string): number
```

The highest the stat can go right now. If its `max` is a number, that's the answer. If it's `{ value: name }`, it's the custom value of that name worked out against `state` and turned into a number. If the stat declares no `max`, or isn't declared at all, it's `100`.

```ts
import { statMax } from '@ifloom/engine'

// max: { value: 'energyCeiling' }, declared in game.custom.values as 80 + fitness
statMax(state, game, 'energy') // fitness 12 → 92
```

**Gotcha.** A `{ value }` name the game doesn't declare in [`custom.values`](/reference/custom#values) quietly gives `100`. A value that returns text that isn't a number gives `NaN`, and every effect on the stat then gives `NaN` too.

## clampStat

```ts
function clampStat(state: GameState, game: Game, id: string, value: number): number
```

Returns `value` held between the stat's declared `min` and its [`statMax`](#statmax) against `state`. Those are 0 and 100 if the stat declares neither, or isn't declared. Effects and costs both go through it.

**Gotcha.** A moving ceiling doesn't pull a stat down when it drops. The value is only held to the new ceiling the next time something changes it.

## lackingLine

```ts
function lackingLine(def: StatDef | undefined, id: string, amount: number, game?: Game): string
```

The refusal for a cost of `amount` that the player can't cover. It's the declaration's `lacking` with `{n}` replaced by `amount`. Without a `lacking`, it's the [`notEnough`](/reference/strings#refusals) line, `Not enough {stat}.`, with the label in lower case (or the id, if the stat isn't declared).

Pass the game to get its own wording of `notEnough`. Without it you get the engine's English. A stat's `lacking` always wins over `notEnough`. [`activityBlocked`](/reference/actions#activityblocked) uses this unless the activity's `cost.reasons` has a line for that stat.

```ts
import { lackingLine, statDef } from '@ifloom/engine'

lackingLine(statDef(game, 'energy'), 'energy', 10) // 'Need 10 energy.'
lackingLine(statDef(game, 'charm'), 'charm', 5)    // 'Not enough charm.'
```

`{n}` is the amount the cost asks for, not how far short the player is.

## statBand

```ts
function statBand(state: GameState, game: Game, id: string): number
```

How many of the stat's `bands` its current value has reached. A [`{ tier: id, gte }`](/reference/conditions#tier) condition compares against this number. It's 0 if the stat declares no bands.

```ts
import { statBand } from '@ifloom/engine'

// bands: [10, 20, 30]
statBand(state, game, 'charm') // charm 4 → 0, 12 → 1, 31 → 3
```

## formatStat

```ts
function formatStat(def: StatDef | undefined, value: number): string
```

A value as the player reads it, through the declaration's `format`. With no format, or no declaration, it's just the number.

```ts
import { formatStat, statDef } from '@ifloom/engine'

formatStat(statDef(game, 'coins'), 12) // '12c'
```

## Derived stats

To show a number that's worked out from other stats, such as a service score made from baking and patience, declare a stat with `derive` instead of keeping it:

```ts
import type { StatDef } from '@ifloom/engine'

const stats: StatDef[] = [
  { id: 'baking', label: 'Baking', start: 4 },
  { id: 'patience', label: 'Patience', start: 6 },
  { id: 'service', label: 'Service', derive: { sum: ['baking', 'patience'] } },
]
```

The engine works a derived stat out from its [`Formula`](#formula) every time something reads it, and never keeps it in the save. With baking at 4 and patience at 6, `service` reads 10. Raise either one and `service` follows on the next read.

Everything that reads stats reads a derived one the same way, through [`statValue`](#statvalue):

- a [`{ stat }`](/reference/conditions#stat) condition, a [`{ tier }`](/reference/conditions#tier) condition and a [`{ level }`](/reference/conditions#level) condition;
- an activity's [cost](/reference/actions#activitycost) check, so a derived stat can make a button unaffordable (it can't be spent, though);
- the [view](/reference/view#statview), in `stats`, `statsById` and each entity's stats.

A derived stat isn't in `state.stats`, so a hand-written scene or a custom function that reads `state.stats.service` gets `undefined`. Read it with `statValue(state, game, 'service')`.

### Formula

```ts
import type { Formula } from '@ifloom/engine'

type Formula =
  | number
  | string                                  // another stat's id
  | { sum: Formula[] }
  | { product: Formula[] }
  | { min: Formula[] }
  | { max: Formula[] }
  | { scale: Formula; by: number }          // the formula times `by`
  | { clamp: Formula; min?: number; max?: number }
```

A formula is data, so the loader can check it and a mod can change it. Formulas nest, and each part can be any formula.

| Formula | Gives | Example |
|---|---|---|
| a number | That number. | `5` |
| a string | That stat's value, as `statValue` reads it. It can be another derived stat. | `'baking'` |
| `{ sum }` | The parts added together. An empty list gives 0. | `{ sum: ['baking', 'patience'] }` |
| `{ product }` | The parts multiplied together. An empty list gives 1. | `{ product: ['wage', 'hours'] }` |
| `{ min }` | The smallest part. An empty list gives 0. | `{ min: ['baking', 'patience'] }`, as good as your weaker skill |
| `{ max }` | The largest part. An empty list gives 0. | `{ max: ['charm', 'friendship'] }` |
| `{ scale, by }` | The formula times `by`. Use a fraction to divide. | `{ scale: 'patience', by: 0.5 }` |
| `{ clamp, min?, max? }` | The formula held between `min` and `max`. Leave either out for no bound on that side. | `{ clamp: { sum: ['baking', -2] }, min: 0, max: 10 }` |

A bigger one, an average of two skills plus a bonus for patience above 5:

```ts
{
  id: 'service',
  label: 'Service',
  derive: {
    sum: [
      { scale: { sum: ['baking', 'manners'] }, by: 0.5 },
      { clamp: { sum: ['patience', -5] }, min: 0 },
    ],
  },
}
```

Formulas don't round. `{ scale: 'patience', by: 0.5 }` with patience at 5 gives 2.5, and the view shows `2.5`. Use `format` if you want it written another way, or keep the numbers whole.

### On an entity

A derived stat with `of` is worked out for each [entity](/reference/entities) of that kind, from the same entity's stats:

```ts
const stats: StatDef[] = [
  { id: 'skill', label: 'Skill', of: 'staff', start: 30 },
  { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
  { id: 'output', label: 'Output', of: 'staff', derive: { min: ['skill', 'morale'] } },
]
```

`{ stat: 'output', of: 'staff:ana', gte: 40 }` reads Ana's skill and Ana's morale. Each entity's [`StatView`](/reference/view#statview) shows its own `output`. A new entity keeps no value for a derived stat, because there's nothing to keep.

A formula can only read stats with the same owner. A stat of the player's reads the player's stats, and a staff stat reads staff stats. The loader reports a formula that reads another owner's stat.

### Its range

A derived stat is held to its own range like any other stat, after the formula is worked out. That's `min` 0 and `max` 100 unless the stat says otherwise. So a formula that comes out at 140 reads 100, and one that comes out negative reads 0. Give the stat a `max` (or a `min`) when it can go past those:

```ts
{ id: 'worth', label: 'Worth', max: 99999, format: '£{n}', derive: { sum: ['coins', { product: ['stock', 3] }] } }
```

A derived stat that another formula reads is held to its range before the other formula sees it.

### What it can't do

A derived stat is never written. A `stat` or `setStat` effect on one does nothing, a [cost](/reference/actions#activitycost) doesn't spend it, and a [`create`](/reference/effects#create) effect or an entity's declaration can't give it a value. It has no `start`, and it can't be `spendable`.

The [content checker](/reference/checks) reports each of these:

- a `stat` or `setStat` effect on a derived stat, and a derived stat in a `create` effect's `stats` or an entity's `stats` (`stat "…" is derived: it is worked out, never written`);
- an activity whose `cost` spends one (`spends stat "…", which is derived and never written`);
- a derived stat with `spendable` or a `start`;
- a formula that names a stat the game doesn't declare, or one with another owner;
- a cycle, such as `service` reading `mood` while `mood` reads `service`. It's reported as `derive goes round in a cycle: service → mood → service`. If you run the game anyway, a formula that goes round reads 0 once it's 64 steps deep.

These come from the [content checker](/reference/checks), wherever the effect or the stat is.

## Levels

To give a stat levels, such as cooking that goes up a level at 10, 30 and 60, declare `levels` on it:

```ts
import type { StatDef } from '@ifloom/engine'

const stats: StatDef[] = [
  { id: 'cooking', label: 'Cooking', levels: { at: [10, 30, 60], notice: '{label} is now level {level}.' } },
]
```

The stat itself doesn't change. You still raise it with `stat` effects and test it with `{ stat }`. The levels are a reading of its value: below 10 it's level 0, from 10 it's level 1, from 30 level 2, and from 60 level 3, the top.

Levels are optional, stat by stat. A stat without `levels` has none, and the view shows it as a plain number. A derived stat can have levels too, and an [entity stat](#entity-stats) can, read per entity.

### StatLevels

```ts
import type { StatLevels } from '@ifloom/engine'

type StatLevels = {
  at: number[]
  notice?: string
}
```

| Field | Default | What it does |
|---|---|---|
| `at` | | The value each level starts at, lowest first. Below the first is level 0. A value equal to a threshold is at that level. |
| `notice` | none | A line to tell the player when a command takes the stat up a level, with `{label}` for the stat's label and `{level}` for the new level. No notice if left out. |

### What reads the level

- **Conditions.** [`{ level: 'cooking', gte: 2 }`](/reference/conditions#level) holds from level 2 up. With `of`, it reads an entity's level.
- **The view.** The stat's [`StatView`](/reference/view#statview) gets a `level` field, `{ level, next, progress }`: the level, the value the next level starts at (`null` at the top), and how far the value is from this level's start to the next, 0 to 1. See [`statLevel`](#statlevel).
- **Code.** [`statLevel`](#statlevel) gives the same thing from a state.

### The notice

When a command takes one of the player's stats up one or more levels, and the stat's `levels` has a `notice`, the engine raises a [notice](/reference/notices) after the command. With the cooking stat above, a command that takes cooking from 28 to 31 raises:

```ts
{ id: 'level.cooking', title: 'Cooking is now level 2.', tag: 'level' }
```

- The notice's id is `level.<stat>`, so a second level-up of the same stat replaces the first while it's unseen.
- Its `tag` is `level`, so a UI can show it its own way.
- `{level}` is the level the stat ends the command at. A command that jumps two levels raises one notice, for the higher.
- Only the player's stats raise notices. An entity stat's levels show in the view and in conditions, but a staff member going up a level says nothing. Write a [trigger](/reference/triggers) on a `{ level, of }` condition if you want one.
- Going down a level raises nothing.
- It's raised when a command runs through [`apply`](/reference/commands#apply) or `dispatch`. [`applyEffects`](/reference/effects#applyeffects) on its own doesn't raise it.

### In the React UI

The React UI's [`StatList`](/react/components#statlist) shows a levelled stat's level after its label, as "Level 2" (the word `ui.statLevel`), and a bar under the row towards the next level, labelled for screen readers with `ui.statProgress`. At the top level there's no bar. The parts are `stat-level` and `stat-progress`. See [the data-part reference](/react/customising#stats).

### The checks

The [content checker](/reference/checks) reports, against `stat <id>`:

- `levels.at needs at least one threshold`, for an empty or missing `at`;
- `levels.at must go up, each threshold above the last`, for thresholds out of order or repeated;
- `levels.at … outside the stat's range (… to …)`, for a threshold below the stat's `min` or above its `max`. A stat whose `max` is a `{ value }` has no upper bound for this check.

## statValue

```ts
function statValue(state: GameState, game: Game, id: string, of?: string): number
```

A stat's value as conditions and the view read it: the player's, or with `of`, an entity's (`'staff:ana'`). A [derived stat](#derived-stats) is worked out from its formula and held to its range. A kept stat the save doesn't have yet reads as its `start`. An entity that isn't there reads 0.

```ts
import { statValue } from '@ifloom/engine'

statValue(state, game, 'service', 'staff:ana')
```

## statLevel

```ts
function statLevel(
  state: GameState,
  game: Game,
  id: string,
  of?: string,
): { level: number; next: number | null; progress: number } | undefined
```

Where a stat with [`levels`](#statlevels) stands: its level, the value the next level starts at (`null` at the top) and how far it is from this level's start to the next, from 0 to 1 (1 at the top). Level 0 counts from the stat's `min`. It's `undefined` for a stat with no levels.

```ts
import { statLevel } from '@ifloom/engine'

// levels: { at: [10, 30, 60] }, cooking at 20
statLevel(state, game, 'cooking') // { level: 1, next: 30, progress: 0.5 }
```

