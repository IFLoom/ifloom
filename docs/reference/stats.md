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

**Gotchas.**
- You have to declare a stat before you use it. [`validatePack`](/reference/game#validatepack) and the [loader](/reference/loader#the-checks) report content that names an undeclared stat, or names a stat on the wrong owner.
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

Every one of the player's stats (those declared without `of`) at its `start` value. [`startingState`](/reference/commands#startingstate) uses it for a new game.

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
