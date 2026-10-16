---
title: "Effects"
description: "Timed effects that last some turns, change what the player's stats read while they last, and run effects as they start, each turn and as they end."
---
`@ifloom/plugin-effects` adds timed effects: something that affects the player for a few turns and then wears off, such as a coffee that perks them up or a cold that saps their energy.

While an effect lasts, it can change what the player's stats read, and it can run effects when it starts, at the end of each turn and when it ends. The stat changes use the engine's [stat modifiers](/docs/reference/plugins#stat-modifiers), so nothing is written into the stats. When the effect wears off, they read as they did before.

```ts
import {
  effects, applyEffect, removeEffect, effectActive,
  effectDefs, effectsView,
  type EffectDef, type EffectModifier, type Reapply,
  type EffectsState, type ActiveRecord, type EffectsView, type ActiveEffect,
} from '@ifloom/plugin-effects'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-effects": "0.0.0"
  }
}
```

Then add `effects()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details. The plugin works on its own and cooperates with no other.

## effects

```ts
function effects(): DefinedPlugin<EffectsState>
```

Builds the plugin, with the id `effects`. Nothing is active in a new game.

## Writing effects

Effects are content. They go in a pack's [`data`](/docs/reference/loader#pack) under `effects.effects`, and are merged by id, so a mod can add one or replace one.

This is the showcase's coffee. It adds 10 to energy until the end of the next turn:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { applyEffect, type EffectDef } from '@ifloom/plugin-effects'

const caffeinated: EffectDef = {
  id: 'caffeinated',
  label: 'Caffeinated',
  summary: 'A coffee’s worth of get-up-and-go.',
  turns: 2,
  modifiers: [{ stat: 'energy', add: 10 }],
}

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'energy', label: 'Energy', start: 80, spendable: true }],
  activities: [{ id: 'coffee', effects: [applyEffect('caffeinated')] }],
  data: { effects: { effects: [caffeinated] } },
}
```

### EffectDef

```ts
type EffectDef = {
  id: string
  label: string
  summary?: string
  turns: number
  modifiers?: EffectModifier[]
  onStart?: EffectRef[]
  eachTurn?: EffectRef[]
  onEnd?: EffectRef[]
  reapply?: Reapply
  max?: number
}
```

| Field | What it is |
|---|---|
| `id` | Unique among effects. Content names the effect by it. |
| `label` | What the player reads, such as "Caffeinated". |
| `summary` | A line about it for the UI. |
| `turns` | How many turns it lasts. The turn it's applied in counts, so `turns: 2` lasts the rest of this turn and all of the next. |
| `modifiers` | What it does to the player's stats while it lasts, once per stack. See [EffectModifier](#effectmodifier). |
| `onStart` | Effects applied when it starts, and each time a stack is added. |
| `eachTurn` | Effects applied at the end of each turn while it's active, once per stack, before its turns go down. |
| `onEnd` | Effects applied when it runs out, once for each stack that ran out. |
| `reapply` | What applying it again does while it's active. `'refresh'` if left out. See [Applying one again](#applying-one-again). |
| `max` | With `reapply: 'stack'`, the most stacks it can have. No limit if left out. |

### EffectModifier

```ts
type EffectModifier = StatModifier // { stat: string; add?: number; multiply?: number }
```

The engine's [`StatModifier`](/docs/reference/plugins#statmodifier). `add` is added to the stat and `multiply` multiplies it. Each stack adds its own modifiers, so two stacks of `{ multiply: 0.8 }` read as `× 0.64`. Across every active effect, the adds are summed first, then the total is multiplied, then the value is held to the stat's range.

### Reapply

```ts
type Reapply = 'refresh' | 'stack'
```

## Applying one again

You choose, per effect, what happens when it's applied while it's already active:

- **`'refresh'`**, the default. Its turns start over. `onStart` doesn't run again.
- **`'stack'`**. Another stack is added, with its own turns, and `onStart` runs for it. Each stack adds the modifiers again and runs `eachTurn` again. With `max`, once it's at its most stacks, applying it again takes off the oldest stack and puts on a fresh one, without running `onStart`.

A cold that gets worse with every sneeze, up to three times:

```ts
import { type EffectDef } from '@ifloom/plugin-effects'

const cold: EffectDef = {
  id: 'cold',
  label: 'A cold',
  turns: 3,
  reapply: 'stack',
  max: 3,
  modifiers: [{ stat: 'energy', multiply: 0.8 }],
  eachTurn: [{ kind: 'stat', key: 'coins', by: -1 }],
  onEnd: [{ kind: 'notify', title: 'You feel a bit better.' }],
}
```

## The end of a turn

The plugin counts effects down in its `turn` [hook](/docs/reference/plugins#hooks), which runs when a turn ends. For each active effect, in the order they were first applied:

1. `eachTurn` runs once per stack.
2. Every stack loses a turn.
3. Stacks with no turns left are taken off, and `onEnd` runs once for each.

The effects it runs are applied while the turn is ending, so a `turn` effect among them does nothing.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'effects/active', with: { id, stacks? } }` | `effectActive(id, stacks?)` | The effect is active. With `stacks`, a [range](/docs/reference/conditions#range) such as `{ gte: 2 }`, only when it has that many stacks. |

```ts
import { type Block } from '@ifloom/engine'
import { effectActive } from '@ifloom/plugin-effects'

const block: Block = { text: 'place.cafe/caffeinated', when: effectActive('caffeinated') }
```

An unknown effect is never active.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ custom: 'effects/apply', with: { id } }` | `applyEffect(id)` | Starts the effect, or refreshes or stacks it if it's active. |
| `{ custom: 'effects/remove', with: { id, runEnd? } }` | `removeEffect(id, runEnd?)` | Takes every stack off. `onEnd` runs once per stack only when `runEnd` is `true`. It's `false` if left out. |

`runEnd` lets you decide per call. A medicine that cures a cold might skip its `onEnd`, while a scene where the cold runs its course early might want it:

```ts
import { removeEffect } from '@ifloom/plugin-effects'

const medicine = removeEffect('cold')        // gone, nothing else happens
const recovered = removeEffect('cold', true) // gone, and "You feel a bit better."
```

Applying or removing an effect the game doesn't have does nothing. In a plain-effect list (an item's use, or what `rules.turn` returns), write the long form, `{ kind: 'custom', name: 'effects/apply', with: { id } }`.

## Commands

| Command | Does |
|---|---|
| `{ type: 'custom', name: 'effects/apply', with: { id } }` | The same as the effect. Refused with `Nothing like that can happen.` for an effect the game doesn't have. |
| `{ type: 'custom', name: 'effects/remove', with: { id, runEnd? } }` | The same as the effect. Refused with `That isn’t affecting you.` when it isn't active. |

Use them for a button the player presses, such as "Shake it off".

## Strings

| Key | English |
|---|---|
| `effects/unknown` | `Nothing like that can happen.` |
| `effects/notActive` | `That isn’t affecting you.` |

## The view

`view(state, game).plugins.effects` is an `EffectsView`.

### EffectsView

```ts
type EffectsView = { active: ActiveEffect[] }
```

The active effects, in the order they were first applied.

### ActiveEffect

```ts
type ActiveEffect = {
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
| `summary` | `''` if the effect has none. |
| `turnsLeft` | The turns left on its longest-lasting stack. |
| `stacks` | How many stacks it has. 1 for an effect that refreshes. |
| `modifiers` | What it does to the stats right now, all its stacks together, one entry per stat. |

The stats in `view.stats` already include the modifiers, so a UI shows the stat as it is and can list the effects beside it.

## The state

### EffectsState

```ts
type EffectsState = { active: ActiveRecord[] }
type ActiveRecord = { id: string; left: number[] }
```

What the plugin keeps in a save, at `state.plugins.effects`: each active effect, with the turns left on each of its stacks, oldest first. A save from before the plugin was added loads with nothing active.

## For code

### Helpers

```ts
const effectActive: (id: string, stacks?: Range) => Condition
const applyEffect: (id: string) => EffectRef
const removeEffect: (id: string, runEnd?: boolean) => EffectRef
```

### effectDefs

```ts
function effectDefs(game: Game): EffectDef[]
```

The game's effects, merged from its packs: `game.data.effects.effects`.

### effectsView

```ts
function effectsView(record: EffectsState, game: Game): EffectsView
```

The `EffectsView` for a record. The plugin's view is `effectsView(slice, game)`.

## Checks

When the game loads, the plugin reports these problems against the pack each effect came from, with `where` as `effects <id>`:

- `turns` below 1 (`turns must be 1 or more`).
- `max` on an effect that refreshes (`max only applies with reapply: "stack"`), or below 1.
- A modifier on a stat the game doesn't have (`unknown stat "…"`), or on an entity's stat.
- Anything `onStart`, `eachTurn` or `onEnd` names that the game doesn't have (`onEnd: unknown item "…"`).

A call that names an effect the game doesn't have gives `unknown effect "…"` where it's written.

## Gotchas

- **Stats are read, never written.** `state.stats` keeps the value underneath. Read stats with [`statValue`](/docs/reference/stats#statvalue) or from the view, not from `state.stats`, to see the effect.
- **A cost is checked against the changed value but paid from the kept one.** With 5 energy kept and a boost of 10, something that costs 12 is allowed, and the kept value goes to 0.
- **Values can have fractions.** `multiply` doesn't round, so `energy × 0.8` can read as 39.2. Give the stat a `format`, or round in your UI.
- **Only the player's stats.** An entity's stats are never changed by an effect.
- **Turns are the game's.** With the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, a turn is a day, so `turns: 2` lasts until the player has slept twice.

## See it in an example

Small Town: `caffeinated` in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) adds 10 energy for two turns. The `coffee` activity starts it with `applyEffect('caffeinated')`, and the café's body reads it with `effectActive`.
