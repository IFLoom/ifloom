# Stats

A stat is a number the game keeps for the player: charisma, coins, energy, a
reputation — whatever your game is about. **The engine has no stats of its
own** — not even money or energy. You declare every stat on the
[game](/reference/game#game), and a game with no stats declares none: no stat
panel, no stat conditions, no prices, nothing breaks.

```ts
import type { StatDef } from '@ifloom/engine'

const stats: StatDef[] = [
  { id: 'charm', label: 'Charm', start: 4, bands: [10, 20, 30] },
  { id: 'coins', label: 'Coins', start: 20, max: 9999, format: '{n}c', spendable: true },
  { id: 'baking', label: 'Baking', visible: { flag: 'joinedTheBakery' } },
]

const game = { /* … */, stats }
```

A player's stat lives in `state.stats[id]`. A [`stat` effect](/reference/effects#stat) moves it, a [`setStat` effect](/reference/effects#setstat) puts it at a value, a [`{ stat }` condition](/reference/conditions#stat) tests it, and an activity [cost](/reference/actions#activitycost) spends it.

A stat declared with `of` belongs to a [kind of entity](/reference/entities) instead: every member of staff has a `morale`, every dish a `price`. Its value lives on each entity, at `state.entities[kind][id].stats[id]`, and the same effects and conditions reach it with an `of` naming the entity. See [Entity stats](#entity-stats).

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
| `id` | — | The key: `state.stats[id]`, `{ stat: id }`, `{ kind: 'stat', key: id }`. |
| `of` | the player's | The [kind](/reference/entities#kinddef) of entity it belongs to: `'staff'` gives every member of staff one. See [Entity stats](#entity-stats). |
| `label` | — | What the player reads, in the view's stat list and in the default `lacking` line. |
| `start` | `0` | The value a new game starts with. |
| `min` | `0` | The lowest any effect or cost can take it. |
| `max` | `100` | The highest any effect or payment can take it. A number, or `{ value: name }` — a [custom value](/reference/custom#values) from `game.custom.values`, worked out against the state each time, for a ceiling that moves. See [`statMax`](#statmax). Raise it for coins and other open-ended counts. |
| `visible` | always | A [condition](/reference/conditions): the stat appears in [`view().stats`](/reference/view) only while it holds. Use it for a stat the player has not discovered yet. |
| `listed` | `true` | `false` keeps it out of `view().stats`, for a stat your UI shows its own way — a purse in the corner, an energy gauge. It is still in [`view().statsById`](/reference/view#statview). |
| `spendable` | `false` | The stat is spent on things. A scene choice's [price](/reference/actions#price) counts its negative `stat` effects on spendable stats only. |
| `lacking` | `Not enough <label>.` | The refusal when an activity costs more than the player has, with `{n}` for the amount the cost asks for. See [`lackingLine`](#lackingline). |
| `bands` | none | Hidden thresholds, lowest first, for [`{ tier }` conditions](/reference/conditions#tier). The numbers are never shown. |
| `format` | the number | How the value is written, with `{n}` for the number: `'{n}c'`, `'£{n}'`, `'{n} energy'`. Used for the view's `text` and for prices. |

**Gotchas.**
- A stat must be declared to be used. [`validatePack`](/reference/game#validatepack) reports a `stat` or `setStat` effect or an activity cost naming an undeclared stat, and a `max: { value }` naming a custom value the game does not declare. The [loader](/reference/loader) reports a `{ stat }` or `{ tier }` condition that names one.
- Keep money in whole minor units — pence, cents — and let `format` place the decimal point in your UI. Draws and saves stay exact, and the same save always gives the same result.
- Declaration order is display order: `view().stats` lists listed, visible stats in the order you declared them, and a scene choice's price lists its stats in that order too.
- `spendable` is about what is shown, not what is allowed. Any stat can be in an activity's `cost`, and its price lists it either way.
- The id is unique across the whole game, the player's stats and every kind's together: one `skill` cannot be both the player's and the staff's.

### Entity stats

```ts
const stats: StatDef[] = [
  { id: 'coins', label: 'Coins', start: 120, max: 99999, format: '£{n}', spendable: true },
  { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
  { id: 'wage', label: 'Wage', of: 'staff', start: 10, max: 50, format: '£{n}' },
  { id: 'price', label: 'Price', of: 'dish', start: 4, min: 1, max: 20, format: '£{n}' },
]
```

A stat with `of` is kept on every [entity](/reference/entities) of that kind, starting at `start` unless the entity's declaration or its [`create`](/reference/effects#create) effect gives another. It is not one of the player's: [`startingStats`](#startingstats) leaves it out, and so do [`view().stats`](/reference/view#the-player-s-numbers-and-things) and `view().statsById`. Each entity's stats are in [`view().entities`](/reference/view#entities) instead.

Everything else works as for the player's:

| Field | On an entity stat |
|---|---|
| `start`, `min`, `max` | The same range, held by every effect: `{ kind: 'stat', key: 'morale', by: -8, of: 'staff:ana' }` stops at 0. |
| `format` | How the value is written in the entity's [`StatView`](/reference/view#statview). |
| `visible` | Tested with `'$'` bound to the entity, so a stat can show on one and not another: `visible: { flag: 'tasted', of: '$' }` shows a dish's quality only once it has been tasted. |
| `listed` | `false` keeps it out of every entity's `stats` in the view. |
| `spendable` | Has no use: a `stat` effect with `of` is never part of a button's [price](/reference/actions#price), and an activity's `cost` spends the player's stats only. |
| `bands` | Not read. [`{ tier }`](/reference/conditions#tier) and [`statBand`](#statband) read the player's value. |

### A purse and an energy gauge

Two stats a town game is likely to want. Coins are spent and shown in a purse of the UI's own; energy has a ceiling that grows with fitness and fills back up overnight.

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

The `setStat` asks for more than any ceiling and is held to `energyCeiling` as it stands that morning. A button that costs `{ stats: { coins: 3, energy: 10 } }` shows `3c` and `10`, and a player with 2 coins reads *Not enough on you.*

## statDef

```ts
function statDef(game: Game, id: string): StatDef | undefined
```

The declaration for a stat, or `undefined` if the game declares none by that id.

## startingStats

```ts
function startingStats(game: Game): Stats
```

Every one of the player's stats — those declared without `of` — at its `start` value. [`startingState`](/reference/commands#startingstate) uses it for a new game.

## statMax

```ts
function statMax(state: GameState, game: Game, id: string): number
```

The highest the stat can go right now. Its `max` if that is a number; if it is `{ value: name }`, the custom value of that name worked out against `state` (and turned into a number); `100` if it declares no `max` or is not declared.

```ts
// max: { value: 'energyCeiling' }, declared in game.custom.values as 80 + fitness
statMax(state, game, 'energy') // fitness 12 → 92
```

**Gotcha:** a `{ value }` name the game does not declare in [`custom.values`](/reference/custom#values) quietly gives `100`. A value that returns text which is not a number gives `NaN`, and every effect on the stat then gives `NaN` too.

## clampStat

```ts
function clampStat(state: GameState, game: Game, id: string, value: number): number
```

`value` held to the stat's declared `min` and its [`statMax`](#statmax) against `state` (0 and 100 if it declares neither, or is not declared). Effects and costs both go through it.

**Gotcha:** a ceiling that moves does not pull a stat down when it drops. The value is only held to the new ceiling the next time something changes it.

## lackingLine

```ts
function lackingLine(def: StatDef | undefined, id: string, amount: number, game?: Game): string
```

The refusal for a cost of `amount` the player cannot cover: the declaration's `lacking` with `{n}` replaced by `amount`, or the [`notEnough`](/reference/strings#refusals) line, `Not enough {stat}.`, with the label in lower case (the id if there is no declaration). Pass the game to get its own wording of `notEnough`; without it, the engine's English. A stat's `lacking` always wins over `notEnough`. [`activityBlocked`](/reference/actions#activityblocked) uses it unless the activity's `cost.reasons` has a line for that stat.

```ts
lackingLine(statDef(game, 'energy'), 'energy', 10) // 'Need 10 energy.'
lackingLine(statDef(game, 'charm'), 'charm', 5)    // 'Not enough charm.'
```

`{n}` is the amount the cost asks for, not how far short the player is.

## statBand

```ts
function statBand(state: GameState, game: Game, id: string): number
```

How many of the stat's `bands` its current value has reached — the number a [`{ tier: id, gte }`](/reference/conditions#tier) condition compares against. 0 if the stat declares no bands.

```ts
// bands: [10, 20, 30]
statBand(state, game, 'charm') // charm 4 → 0, 12 → 1, 31 → 3
```

## formatStat

```ts
function formatStat(def: StatDef | undefined, value: number): string
```

A value as the player reads it, through the declaration's `format`. With no format, or no declaration, just the number.

```ts
formatStat(statDef(game, 'coins'), 12) // '12c'
```
