---
title: "Stats"
description: "Declaring stats: ranges, moving ceilings, derived stats with formulas, levels shown or hidden, and stats kept on entities."
---
A stat is a number the game keeps for the player, such as coins, energy or charm. The engine doesn't define any stats itself, so you declare every one your game uses on the [game](/docs/reference/game#game). If your game declares none, its view has no stat list and its buttons show no prices.

```ts
import type { StatDef } from '@ifloom/engine'

const stats: StatDef[] = [
  { id: 'charm', label: 'Charm', start: 4, levels: { at: [10, 20, 30], hidden: true } },
  { id: 'coins', label: 'Coins', start: 20, max: 9999, format: '{n}c', spendable: true },
  { id: 'baking', label: 'Baking', visible: { kv: 'joinedTheBakery' } },
]

const game = { /* … */, stats }
```

A player's stat lives in `state.stats[id]`. You change it with a [`stat` effect](/docs/reference/effects#stat), which changes it `by` an amount or sets it `to` a value. A [`{ stat }` condition](/docs/reference/conditions#stat) tests it, and an action's [cost](/docs/reference/actions#actioncost) spends it.

A stat can also be [derived](#derived-stats), worked out from other stats by a formula instead of kept, and any stat can have [levels](#levels) that it passes as it grows.

A stat declared with `of` is kept on each [entity](/docs/reference/entities) of a kind instead, so every member of staff has a `morale` and every dish a `price`. It reads from the save once play has changed it, at `state.entities[kind][id].stats[id]`, and from the entity's declaration or the stat's `start` until then. The same effects and conditions reach it when you add an `of` naming the entity. See [Entity stats](#entity-stats).

## StatDef

```ts
type StatDef = {
  id: string
  of?: string
  label: string
  start?: number
  min?: Amount
  max?: Amount
  visible?: Condition
  listed?: boolean
  spendable?: boolean
  lacking?: StatWords
  format?: StatWords
  derive?: Formula
  levels?: StatLevels
  round?: StatRound
  ui?: Ui<StatUi>
}

type StatRound = 'none' | 'floor' | 'round' | 'ceil'
```

| Field | Default | What it does |
|---|---|---|
| `id` | | The key: `state.stats[id]`, `{ stat: id }`, `{ stat: id }`. |
| `of` | the player's | The [kind](/docs/reference/entities#kinddef) of entity that keeps it. `'staff'` gives every member of staff one. See [Entity stats](#entity-stats). |
| `label` | | What the player reads, in the view's stat list and in the default `lacking` line. |
| `start` | `0` | The value a new game starts with. |
| `min` | `0` | The lowest any effect or cost can take it. A number, or an [`Amount`](/docs/reference/amounts#amount) for a floor that moves. |
| `max` | `100` | The highest any effect or payment can take it. A number, or an [`Amount`](/docs/reference/amounts#amount) for a ceiling that moves, worked out against the state each time: another stat (`{ stat: 'fitness' }`), a kv key, or a [value](/docs/reference/custom#values) by name, the game's own as `game/<name>` or a plugin's, asked with `with`. A `max` that names a value nobody declares, or one that comes back to the stat itself while it's worked out, gives `100`. Raise it for coins and other open-ended counts. |
| `visible` | always | A [condition](/docs/reference/conditions). The stat appears in [`view().stats`](/docs/reference/view) only while it holds. Use it for a stat the player hasn't discovered yet. |
| `listed` | `true` | `false` keeps it out of `view().stats`, for a stat your UI shows its own way, such as a purse in the corner or an energy gauge. It's still in [`view().statsById`](/docs/reference/view#statview). |
| `spendable` | `false` | The stat is spent on things. A scene choice's [price](/docs/reference/view#price) only counts its negative `stat` effects on spendable stats. |
| `lacking` | `Not enough <label>.` | The refusal when an action costs more than the player has, with `{n}` for the amount the cost asks for. Like `format`, it can be a line for 1 and one for any other amount. See [`lackingLine`](#lackingline). |
| `format` | the number | How the value is written, with `{n}` for the number, as in `'{n}c'`, `'£{n}'` or `'{n} energy'`. For words that change with the number, give one for 1 and one for the rest: `{ one: '{n} coin', other: '{n} coins' }`. The view's `text` and prices use it. See [`StatWords`](#statwords). |
| `derive` | none | Work the stat out from other stats with a [`Formula`](#formula) instead of keeping it. See [Derived stats](#derived-stats). |
| `levels` | none | Thresholds the stat passes as it grows, shown to the player or hidden. See [`StatLevels`](#statlevels). |
| `round` | `'none'` | Round the value as it's read: `'floor'`, `'round'` or `'ceil'` to a whole number, or `'none'` to read it as it is. The kept value is never rounded. See [Rounding](#rounding). |
| `ui` | none | [Presentation hints](/docs/reference/ui-hints) for the UI, passed to the stat's [`StatView`](/docs/reference/view#statview) as written. The React UI reads [`display`](/docs/react/hints#display): `{ ui: { display: 'bar' } }` draws a bar from `min` to `max`, and `'pips'` a pip per point. The engine gives them no meaning. |

**Gotchas.**
- You have to declare a stat before you use it. The [content checker](/docs/reference/checks) reports content that names an undeclared stat, or names a stat on the wrong owner.
- Keep money in whole minor units, such as pence or cents, and let your UI place the decimal point. Sums and saves stay exact that way.
- Declaration order is display order. `view().stats` lists listed, visible stats in the order you declared them, and a scene choice's price lists its stats in that order too.
- `spendable` changes what's shown, not what's allowed. Any stat can be in an action's `cost`, and the action's price lists it either way.
- An id is unique across the whole game, counting the player's stats and every kind's together. One `skill` can't be both the player's and the staff's.

### Rounding

A stat with `round` reads as a whole number everywhere it's read: conditions, costs, formulas, the view and its `text`. Use it when a [plugin's modifier](/docs/reference/plugins#stat-modifiers) or a formula can leave a fraction, such as energy at 65 with a 1.15 boost:

```ts
{ id: 'energy', label: 'Energy', start: 80, spendable: true, format: '{n}%', round: 'round' }
```

[`statValue`](#statvalue) works a stat out in this order:

1. The kept value, or the [formula](#derived-stats) for a derived stat, held to its range.
2. Any plugins' [stat modifiers](/docs/reference/plugins#stat-modifiers), held to the range again.
3. `round`.
4. The range once more, so a stat with a fractional `min` or `max` never reads past it.

So with energy at 65 and a `multiply: 1.15` modifier, energy reads 75, not 74.75. `round: 'round'` is JavaScript's `Math.round`, which rounds a half up, so 2.5 reads 3 and -2.5 reads -2.

**Gotchas.**
- Only what's read is rounded. A `stat` effect adds to the kept value, so energy kept at 80.4 that's raised by 1 is kept at 81.4 and reads 81.
- A formula reads its inputs as they read, rounded. A derived stat that reads a rounded stat sees the whole number, and rounds its own result only if it has a `round` of its own.

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

A stat with `of` is kept on every [entity](/docs/reference/entities) of that kind. It starts at `start` unless the entity's declaration or its [`create`](/docs/reference/effects#create) effect gives another value. It isn't one of the player's stats, so a new game's `state.stats`, [`view().stats`](/docs/reference/view#the-players-numbers-and-things) and `view().statsById` all leave it out. Each entity's stats are in [`view().entities`](/docs/reference/view#entities) instead.

The other fields work much as they do for the player's stats:

| Field | On an entity stat |
|---|---|
| `start`, `min`, `max` | The same range, kept by every effect. `{ stat: 'morale', by: -8, of: 'staff:ana' }` stops at 0. |
| `format` | How the value is written in the entity's [`StatView`](/docs/reference/view#statview). |
| `visible` | Tested with `'$'` bound to the entity, so a stat can show on one entity and not another. `visible: { kv: 'tasted', of: '$' }` shows a dish's quality only once it's been tasted. |
| `listed` | `false` keeps it out of every entity's `stats` in the view. |
| `spendable` | Does nothing. A `stat` effect with `of` is never part of a button's [price](/docs/reference/view#price), and an action's `cost` only spends the player's stats. |

### A purse and an energy gauge

A town game usually wants these two stats. Coins are spent, and the UI shows them in a purse of its own. Energy has a ceiling that grows with fitness, and fills back up overnight.

```ts
import type { GameRules, StatDef } from '@ifloom/engine'

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
    max: { value: 'game/energyCeiling' },
    spendable: true,
    listed: false,
    lacking: 'Need {n} energy.',
  },
  { id: 'fitness', label: 'Fitness', max: 40 },
]

const rules: GameRules = {
  values: { energyCeiling: (state) => 80 + (state.stats.fitness ?? 0) },
  // A full night's sleep puts energy back at its ceiling.
  onTurn: (_state, { apply }) => apply([{ stat: 'energy', to: 9999 }]),
}
```

The `stat` effect's `to` asks for more than any ceiling, so it's held to `energyCeiling` as it stands that morning. A button that costs `{ stats: { coins: 3, energy: 10 } }` shows `3c` and `10`, and a player with 2 coins reads *Not enough on you.*

## statOf

```ts
function statOf(game: Game, id: string): StatDef | undefined
```

The declaration for a stat, or `undefined` if the game declares none by that id.

## clampStat

```ts
function clampStat(state: GameState, game: Game, id: string, value: number): number
```

Returns `value` held between the stat's declared `min` and its `max`, each worked out against `state`. Those are 0 and 100 if the stat declares neither, or isn't declared. Effects and costs both go through it.

**Gotcha.** A moving ceiling doesn't pull a stat down when it drops. The value is only held to the new ceiling the next time something changes it.

## lackingLine

```ts
function lackingLine(game: Game, id: string, amount: number): string
```

The refusal for a cost of `amount` of the stat `id` that the player can't cover. It's the stat's `lacking` with `{n}` replaced by `amount`. Without a `lacking`, it's the [`notEnough`](/docs/reference/strings#refusals) line, `Not enough {stat}.`, with the label in lower case (or the id, if the stat isn't declared).

The `notEnough` line is the game's wording, if it rewords it. A stat's `lacking` always wins over `notEnough`. [An action's refusal](/docs/reference/actions#why-an-action-is-refused) uses this unless the action's `cost.reasons` has a line for that stat.

```ts
import { lackingLine } from '@ifloom/engine'

lackingLine(game, 'energy', 10) // 'Need 10 energy.'
lackingLine(game, 'charm', 5)   // 'Not enough charm.'
```

`{n}` is the amount the cost asks for, not how far short the player is.

## formatStat

```ts
function formatStat(def: StatDef | undefined, value: number): string
```

A value as the player reads it, through the declaration's `format`. With no format, or no declaration, it's the plain number.

```ts
import { formatStat, statOf } from '@ifloom/engine'

formatStat(statOf(game, 'coins'), 12) // '12c'
```

## StatWords

```ts
type StatWords = string | { one: string; other: string }
```

A stat's `format` or `lacking`. A string is used for every number. With `one` and `other`, `one` is used when the number is exactly 1 and `other` for any other, 0 included, so a price reads "1 coin" and "4 coins":

```ts
import type { StatDef } from '@ifloom/engine'

const coins: StatDef = {
  id: 'coins',
  label: 'Coins',
  spendable: true,
  format: { one: '{n} coin', other: '{n} coins' },
  lacking: { one: 'You need {n} coin.', other: 'You need {n} coins.' },
}
```

**Gotcha.** It's English's rule for one and many. A language with more forms than that needs a format that reads the same for every number, such as `'£{n}'`, or a [value](/docs/reference/custom#values) of its own.

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

- a [`{ stat }`](/docs/reference/conditions#stat) condition and a [`{ level }`](/docs/reference/conditions#level) condition
- an action's [cost](/docs/reference/actions#actioncost) check, so a derived stat can make a button unaffordable (it can't be spent, though)
- the [view](/docs/reference/view#statview), in `stats`, `statsById` and each entity's stats

A derived stat isn't in `state.stats`, so one of the game's functions that reads `state.stats.service` gets `undefined`. Read it with `statValue(state, game, 'service')`.

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

A derived stat with `of` is worked out for each [entity](/docs/reference/entities) of that kind, from the same entity's stats:

```ts
const stats: StatDef[] = [
  { id: 'skill', label: 'Skill', of: 'staff', start: 30 },
  { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
  { id: 'output', label: 'Output', of: 'staff', derive: { min: ['skill', 'morale'] } },
]
```

`{ stat: 'output', of: 'staff:ana', gte: 40 }` reads Ana's skill and Ana's morale. Each entity's [`StatView`](/docs/reference/view#statview) shows its own `output`. A new entity keeps no value for a derived stat, because there's nothing to keep.

A formula can only read stats with the same owner. A stat of the player's reads the player's stats, and a staff stat reads staff stats. The loader reports a formula that reads another owner's stat.

### Its range

A derived stat is held to its own range like any other stat, after the formula is worked out. That's `min` 0 and `max` 100 unless the stat says otherwise. So a formula that comes out at 140 reads 100, and one that comes out negative reads 0. Give the stat a `max` (or a `min`) when it can go past those:

```ts
{ id: 'worth', label: 'Worth', max: 99999, format: '£{n}', derive: { sum: ['coins', { product: ['stock', 3] }] } }
```

A derived stat that another formula reads is held to its range before the other formula sees it.

### What it can't do

A derived stat is never written. A `stat` effect on one does nothing, a [cost](/docs/reference/actions#actioncost) doesn't spend it, and a [`create`](/docs/reference/effects#create) effect or an entity's declaration can't give it a value. It has no `start`, and it can't be `spendable`.

The [content checker](/docs/reference/checks) reports each of these:

- a `stat` effect on a derived stat, and a derived stat in a `create` effect's `stats` or an entity's `stats` (`stat "…" is derived: it is worked out, never written`)
- an action whose `cost` spends one (`spends stat "…", which is derived and never written`)
- a derived stat with `spendable` or a `start`
- a formula that names a stat the game doesn't declare, or one with another owner
- a cycle, such as `service` reading `mood` while `mood` reads `service`. It's reported as `derive goes round in a cycle: service → mood → service`. If you run the game anyway, a formula that goes round reads 0 once it's 64 steps deep.

These come from the [content checker](/docs/reference/checks), wherever the effect or the stat is.

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
  hidden?: boolean
}
```

| Field | Default | What it does |
|---|---|---|
| `at` | | The value each level starts at, lowest first. Below the first is level 0. A value equal to a threshold is at that level. |
| `notice` | none | A line to tell the player when a command takes the stat up a level, with `{label}` for the stat's label and `{level}` for the new level. No notice if left out. |
| `hidden` | `false` | Keep the levels from the player. The view gives the stat no `level`, so a UI never shows the thresholds, but [`{ level }`](/docs/reference/conditions#level) conditions and [`statLevel`](#statlevel) read them as usual. Use it for a hidden rating, such as how far Ava trusts you: `levels: { at: [10, 20, 30], hidden: true }`. |

### What reads the level

- **Conditions.** [`{ level: 'cooking', gte: 2 }`](/docs/reference/conditions#level) holds from level 2 up. With `of`, it reads an entity's level.
- **The view.** The stat's [`StatView`](/docs/reference/view#statview) gets a `level` field, `{ level, next, progress }`: the level, the value the next level starts at (`null` at the top), and how far the value is from this level's start to the next, 0 to 1. See [`statLevel`](#statlevel).
- **Code.** [`statLevel`](#statlevel) gives the same thing from a state.

### The notice

When a command takes one of the player's stats up one or more levels, and the stat's `levels` has a `notice`, the engine raises a [notice](/docs/reference/notices) after the command. With the cooking stat above, a command that takes cooking from 28 to 31 raises:

```ts
{ id: 'level.cooking', title: 'Cooking is now level 2.', tag: 'level' }
```

- The notice's id is `level.<stat>`, so a second level-up of the same stat replaces the first while it's unseen.
- Its `tag` is `level`, so a UI can show it its own way.
- `{level}` is the level the stat ends the command at. A command that jumps two levels raises one notice, for the higher.
- Only the player's stats raise notices. An entity stat's levels show in the view and in conditions, but a staff member going up a level says nothing. Write a [trigger](/docs/reference/triggers) on a `{ level, of }` condition if you want one.
- Going down a level raises nothing.
- It's raised when a command runs through [`apply`](/docs/reference/commands#apply). [`applyEffects`](/docs/reference/effects#applyeffects) on its own doesn't raise it.

### In the React UI

The React UI's [`StatList`](/docs/react/components#statlist) shows a levelled stat's level after its label, as "Level 2" (the word `ui.statLevel`), and a bar under the row towards the next level, labelled for screen readers with `ui.statProgress`. At the top level there's no bar. The parts are `stat-level` and `stat-progress`. See [the data-part reference](/docs/react/customising#stats).

### The checks

The [content checker](/docs/reference/checks) reports, against `stat <id>`:

- `levels.at needs at least one threshold`, for an empty or missing `at`
- `levels.at must go up, each threshold above the last`, for thresholds out of order or repeated
- `levels.at … outside the stat's range (… to …)`, for a threshold below the stat's `min` or above its `max`. A stat whose `max` is a `{ value }` has no upper bound for this check.

## statValue

```ts
function statValue(state: GameState, game: Game, id: string, of?: string): number
```

A stat's value as conditions and the view read it: the player's, or with `of`, an entity's (`'staff:ana'`). A [derived stat](#derived-stats) is worked out from its formula and held to its range. A kept stat the save doesn't have yet reads as its `start`. An entity that isn't there reads 0. A player's stat reads with any plugin's [stat modifiers](/docs/reference/plugins#stat-modifiers) applied, so it can differ from `state.stats`. Then the stat's [`round`](#rounding) is applied, and the value is held to its range once more.

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

## Drawing it

`view.stats` lists the player's stats that are `listed` and visible now, in the order you declared them. Each is a [`StatView`](/docs/reference/view#statview): its `label`, its value written through its [`format`](#formatstat) as `text`, its `min` and `max` for a bar, and `level` for a stat with [levels](#levels). `view.statsById` has every stat by id, listed or not, for one your UI draws its own way, such as a purse in the corner.

The React UI's [`StatList`](/docs/react/components#statlist) draws them in the side column of the default layout, as bars or pips when a stat's [`display`](/docs/react/hints#display) hint asks. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/stats.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/stats.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Stats.vue]{meta='tab="Vue" tab-group="framework"'}

## See it in an example

- Small Town: in [`examples/showcase/src/world/stats.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/stats.ts), `coins` and `energy` are spendable with a `format` and a `lacking` line, energy has `round`, and `friendship` is a stat `of: 'character'`, one for each person.
- The Corner Café: [`examples/cafe/src/world/staff.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/staff.ts) gives staff `skill`, `morale` and `wage`, and [`examples/cafe/src/world/menu.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/menu.ts) gives dishes `price` and `quality`. Its `reputation`, in [`examples/cafe/src/world/stats.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/stats.ts), has `levels`, with a notice when it goes up.
- No example has a derived stat yet.
