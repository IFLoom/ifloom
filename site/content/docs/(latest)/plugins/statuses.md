---
title: "Statuses"
description: "Timed statuses that last some turns, change what the player's stats read while they last, and run effects as they start, each turn and as they end."
---
`@ifloom/plugin-statuses` adds timed statuses: something that affects the player for a few turns and then wears off, such as a coffee that perks them up or a cold that saps their energy. A status isn't one of the engine's [effects](/docs/reference/effects), though it can run them.

While a status lasts, it can change what the player's stats read, and it can run effects when it starts, at the end of each turn and when it ends. The stat changes use the engine's [stat modifiers](/docs/reference/plugins#stat-modifiers), so nothing is written into the stats. When the status wears off, they read as they did before.

```ts
import {
  statuses, applyStatus, removeStatus, statusActive,
  statusesOf, statusesView,
  type StatusDef, type StatusModifier, type Reapply,
  type StatusesState, type ActiveRecord, type StatusesView, type ActiveStatus,
} from '@ifloom/plugin-statuses'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-statuses": "^0.0.0"
  }
}
```

Then add `statuses()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details. The plugin works on its own and cooperates with no other.

## statuses

```ts
function statuses(): DefinedPlugin<StatusesState, StatusesView>
```

Builds the plugin, with the id `statuses`. Nothing is active in a new game.

## Writing statuses

Statuses are content. They go in your content's [`data`](/docs/reference/loader#content) under `statuses.statuses`, and are merged by id, so a mod can add one or replace one.

This is the showcase's coffee. It adds 10 to energy until the end of the next turn:

```ts
import type { Content } from '@ifloom/engine'
import { applyStatus, type StatusDef } from '@ifloom/plugin-statuses'

const caffeinated: StatusDef = {
  id: 'caffeinated',
  label: 'Caffeinated',
  summary: 'A coffee’s worth of get-up-and-go.',
  turns: 2,
  modifiers: [{ stat: 'energy', add: 10 }],
}

const town: Content = {
  stats: [{ id: 'energy', label: 'Energy', start: 80, spendable: true }],
  activities: [{ id: 'coffee', effects: [applyStatus('caffeinated')] }],
  data: { statuses: { statuses: [caffeinated] } },
}
```

### StatusDef

```ts
type StatusDef = {
  id: string
  label: string
  summary?: string
  turns: number
  modifiers?: StatusModifier[]
  onStart?: EffectRef[]
  eachTurn?: EffectRef[]
  onEnd?: EffectRef[]
  reapply?: Reapply
  max?: number
}
```

| Field | What it is |
|---|---|
| `id` | Unique among statuses. Content names the status by it. |
| `label` | What the player reads, such as "Caffeinated". |
| `summary` | A line about it for the UI. |
| `turns` | How many turns it lasts. The turn it's applied in counts, so `turns: 2` lasts the rest of this turn and all of the next. |
| `modifiers` | What it does to the player's stats while it lasts, once per stack. See [StatusModifier](#statusmodifier). |
| `onStart` | Effects applied when it starts, and each time a stack is added. |
| `eachTurn` | Effects applied at the end of each turn while it's active, once per stack, before its turns go down. |
| `onEnd` | Effects applied when it runs out, once for each stack that ran out. |
| `reapply` | What applying it again does while it's active. `'refresh'` if left out. See [Applying one again](#applying-one-again). |
| `max` | With `reapply: 'stack'`, the most stacks it can have. No limit if left out. |

### StatusModifier

```ts
type StatusModifier = StatModifier // { stat: string; add?: number; multiply?: number }
```

The engine's [`StatModifier`](/docs/reference/plugins#statmodifier). `add` is added to the stat and `multiply` multiplies it. Each stack adds its own modifiers, so two stacks of `{ multiply: 0.8 }` read as `× 0.64`. Across every active status, the adds are summed first, then the total is multiplied, then the value is held to the stat's range.

### Reapply

```ts
type Reapply = 'refresh' | 'stack'
```

## Applying one again

You choose, per status, what happens when it's applied while it's already active:

- **`'refresh'`**, the default. Its turns start over. `onStart` doesn't run again.
- **`'stack'`**. Another stack is added, with its own turns, and `onStart` runs for it. Each stack adds the modifiers again and runs `eachTurn` again. With `max`, once it's at its most stacks, applying it again takes off the oldest stack and puts on a fresh one, without running `onStart`.

A cold that gets worse with every sneeze, up to three times:

```ts
import { type StatusDef } from '@ifloom/plugin-statuses'

const cold: StatusDef = {
  id: 'cold',
  label: 'A cold',
  turns: 3,
  reapply: 'stack',
  max: 3,
  modifiers: [{ stat: 'energy', multiply: 0.8 }],
  eachTurn: [{ kind: 'stat', stat: 'coins', by: -1 }],
  onEnd: [{ kind: 'notify', title: 'You feel a bit better.' }],
}
```

## The end of a turn

The plugin counts statuses down in its `onTurn` [hook](/docs/reference/plugins#hooks-and-providers), which runs when a turn ends. For each active status, in the order they were first applied:

1. `eachTurn` runs once per stack.
2. Every stack loses a turn.
3. Stacks with no turns left are taken off, and `onEnd` runs once for each.

The effects it runs are applied while the turn is ending, so a `turn` effect among them does nothing.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'statuses/active': { status, stacks? } }` | `statusActive(id, stacks?)` | The status is active. With `stacks`, a [range](/docs/reference/conditions#range) such as `{ gte: 2 }`, only when it has that many stacks. |

```ts
import { type Block } from '@ifloom/engine'
import { statusActive } from '@ifloom/plugin-statuses'

const block: Block = { text: 'place.cafe.caffeinated', when: statusActive('caffeinated') }
```

An unknown status is never active.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'statuses/apply': { status } }` | `applyStatus(id)` | Starts the status, or refreshes or stacks it if it's active. |
| `{ 'statuses/remove': { status, runEnd? } }` | `removeStatus(id, runEnd?)` | Takes every stack off. `onEnd` runs once per stack only when `runEnd` is `true`. It's `false` if left out. |

`runEnd` lets you decide per call. A medicine that cures a cold might skip its `onEnd`, while a scene where the cold runs its course early might want it:

```ts
import { removeStatus } from '@ifloom/plugin-statuses'

const medicine = removeStatus('cold')        // gone, nothing else happens
const recovered = removeStatus('cold', true) // gone, and "You feel a bit better."
```

Applying or removing a status the game doesn't have does nothing. Both work in any effect list, a thing's use in the [inventory](/docs/plugins/inventory) included. In a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does), which lists plain effects, write the long form, `{ kind: 'custom', name: 'statuses/apply', with: { status: 'tired' } }`.

## Commands

| Command | Does |
|---|---|
| `{ 'statuses/apply': { id } }` | The same as the effect, naming the status `id` as every command does. Refused with `Nothing like that can happen.` for a status the game doesn't have. |
| `{ 'statuses/remove': { id, runEnd? } }` | The same as the effect. Refused with `That isn’t affecting you.` when it isn't active. |

Use them for a button the player presses, such as "Shake it off".

## Strings

| Key | English |
|---|---|
| `statuses/unknown` | `Nothing like that can happen.` |
| `statuses/notActive` | `That isn’t affecting you.` |

## The view

`view(state, game).plugins.statuses` is a `StatusesView`.

The [React UI](/docs/react) lists the active statuses under the stats with [`StatusList`](/docs/react/components#statuslist), and [`useStatuses`](/docs/react/components#usestatuses) gives this view with no markup.

### StatusesView

```ts
type StatusesView = { active: ActiveStatus[] }
```

The active statuses, in the order they were first applied.

### ActiveStatus

```ts
type ActiveStatus = {
  id: string
  label: string
  summary: string
  turnsLeft: number
  stacks: number
  modifiers: StatModifier[]
}
```

| Field | What it is |
|---|---|
| `summary` | `''` if the status has none. |
| `turnsLeft` | The turns left on its longest-lasting stack. |
| `stacks` | How many stacks it has. 1 for a status that refreshes. |
| `modifiers` | What it does to the stats right now, all its stacks together, one entry per stat. |

The stats in `view.stats` already include the modifiers, so a UI shows the stat as it is and can list the statuses beside it.

## The state

### StatusesState

```ts
type StatusesState = { active: ActiveRecord[] }
type ActiveRecord = { id: string; left: number[] }
```

What the plugin keeps in a save, at `state.plugins.statuses`: each active status, with the turns left on each of its stacks, oldest first. A save from before the plugin was added loads with nothing active. A save from when the plugin was called `@ifloom/plugin-effects` kept it at `state.plugins.effects`, and loads with it moved here.

## For code

### Helpers

```ts
const statusActive: (id: string, stacks?: Range) => Condition
const applyStatus: (id: string) => EffectRef
const removeStatus: (id: string, runEnd?: boolean) => EffectRef
```

### statusesOf

```ts
function statusesOf(game: Game): StatusDef[]
```

The game's statuses, merged from its content and packs: `game.data.statuses.statuses`.

### statusesView

```ts
function statusesView(record: StatusesState, game: Game): StatusesView
```

The `StatusesView` for a record. The plugin's view is `statusesView(slice, game)`.

## Checks

When the game loads, the plugin reports these problems against the content or pack each status came from, with `where` as `statuses <id>`:

- `turns` below 1 (`turns must be 1 or more`).
- `max` on a status that refreshes (`max only applies with reapply: "stack"`), or below 1.
- A modifier on a stat the game doesn't have (`unknown stat "…"`), or on an entity's stat.
- Anything `onStart`, `eachTurn` or `onEnd` names that the game doesn't have (`onEnd: unknown kind "…"`).

A call that names a status the game doesn't have gives `unknown status "…"` where it's written.

## Gotchas

- **Stats are read, never written.** `state.stats` keeps the value underneath. Read stats with [`statValue`](/docs/reference/stats#statvalue) or from the view, not from `state.stats`, to see the status.
- **A cost is checked against the changed value but paid from the kept one.** With 5 energy kept and a boost of 10, something that costs 12 is allowed, and the kept value goes to 0.
- **Values can have fractions.** `multiply` doesn't round, so `energy × 0.8` can read as 39.2. Give the stat a [`round`](/docs/reference/stats#rounding), as Small Town's energy has, or round in your UI.
- **Only the player's stats.** An entity's stats are never changed by a status.
- **Turns are the game's.** With the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, a turn is a day, so `turns: 2` lasts until the player has slept twice.

## See it in an example

Small Town: `caffeinated` in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts) adds 10 energy for two turns. The `coffee` activity starts it with `applyStatus('caffeinated')`, and the café's body reads it with `statusActive`. The React UI lists it under the stats with its turns left.
