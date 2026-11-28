---
title: "Statuses"
description: "The statuses plugin adds timed statuses that change the player's stats for a few turns and run effects as they start, tick and end."
---
`@ifloom/plugin-statuses` adds timed statuses: something that affects the player for a few [turns](/docs/0.1.2/reference/glossary#turn) and then wears off, such as a coffee that perks them up or a cold that saps their energy. While a status lasts, it changes the values the player's stats read through the engine's [stat modifiers](/docs/0.1.2/reference/plugin-api#statmodifiers), which write nothing into the stats. It can also run [effects](/docs/0.1.2/reference/effects) as it starts, at the end of each turn and as it ends. Statuses needs no other plugin and cooperates with none. [Add a plugin](/docs/0.1.2/how-to/add-a-plugin) installs it.

In the showcase: `examples/showcase/src/story/cafe.ts`, whose `caffeinated` status adds 10 energy for two turns. The café's `coffee` action starts it, and the café's body reads it with `statuses.active`.

```ts
import {
  statuses,
  statusesOf,
  statusOf,
  type ActiveRecord,
  type ActiveStatus,
  type Reapply,
  type StatusDef,
  type StatusesState,
  type StatusesView,
  type StatusModifier,
} from '@ifloom/plugin-statuses'
```

## statuses

The plugin's factory, which returns the plugin with the id `statuses`. It takes no options. Every field of its result is in [`statuses`](/docs/0.1.2/api/plugin-statuses#statuses), and its helpers are listed under [Functions](#functions).

Nothing is active in a new game. The plugin counts statuses down in its [`onTurn`](/docs/0.1.2/reference/plugin-api#onturn-and-onturndone) hook, which runs as each turn ends. It goes through the active statuses in the order they were first applied:

1. It applies each status's `turn` effects once per stack.
2. It takes a turn off every stack of every status active now, including any the `turn` effects applied.
3. It takes off each stack with no turns left, and applies its status's `end` effects once for each.

The effects it applies run while the turn is ending, so a [`turn`](/docs/0.1.2/reference/effects#turn) effect among them does nothing.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { statuses } from '@ifloom/plugin-statuses'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [statuses()] })
```

## Content

### StatusDef

A timed status the game declares in `data.statuses.statuses`. Every field is in [`StatusDef`](/docs/0.1.2/api/plugin-statuses#statusdef).

The loader merges statuses by id, so a mod adds a status or replaces one whole. `turns` counts the turn the status is applied in, so `turns: 2` lasts the rest of this turn and all of the next. `modifiers` apply once per stack while the status lasts. `effects.start` runs as the status starts and as each new stack is added, `effects.turn` runs once per stack at the end of each turn before its turns go down, and `effects.end` runs once for each stack that runs out.

```ts
import type { Content } from '@ifloom/engine'
import { statuses, type StatusDef } from '@ifloom/plugin-statuses'

const caffeinated: StatusDef = {
  id: 'caffeinated',
  name: 'Caffeinated',
  description: 'A coffee’s worth of get-up-and-go.',
  turns: 2,
  modifiers: [{ stat: 'energy', add: 10 }],
}

export const cafe: Content = {
  stats: [{ id: 'energy', label: 'Energy', start: 80, spendable: true }],
  actions: [{ id: 'coffee', label: 'Buy a coffee', effects: [statuses.apply('caffeinated')] }],
  data: { statuses: { statuses: [caffeinated] } },
}
```

### StatusModifier

A change a status makes to one of the player's stats, per stack: the engine's [`StatModifier`](/docs/0.1.2/reference/plugin-api#statmodifier). Every field is in [`StatusModifier`](/docs/0.1.2/api/plugin-statuses#statusmodifier).

`add` adds to the stat and `multiply` multiplies it. Each stack applies its modifiers again, so two stacks of `{ multiply: 0.8 }` read as `× 0.64`. Across every active status, the engine sums the adds, multiplies the total by the multipliers, then holds the value to the stat's range. A modifier changes only the player's stats, never an entity's.

### Reapply

The rule for applying a status that is already active, a status's `reapply`. Its values are in [`Reapply`](/docs/0.1.2/api/plugin-statuses#reapply).

- **`'refresh'`**, the default: every stack's turns start over, and the `start` effects don't run again.
- **`'stack'`**: the status gains a stack with its own turns, and the `start` effects run for it. With `max`, a status at its most stacks takes off its oldest stack and puts on a fresh one, without running `start`.

A cold that gets worse with every sneeze, up to three times, costs a coin a turn for each stack:

```ts
import type { StatusDef } from '@ifloom/plugin-statuses'

export const cold: StatusDef = {
  id: 'cold',
  name: 'A cold',
  turns: 3,
  reapply: 'stack',
  max: 3,
  modifiers: [{ stat: 'energy', multiply: 0.8 }],
  effects: { turn: [{ stat: 'coins', by: -1 }], end: [{ notify: 'You feel a bit better.' }] },
}
```

## Conditions

### statuses/active

Holds while the status is active. With `stacks`, a [range](/docs/0.1.2/reference/common#range) such as `{ gte: 2 }`, it holds only while the status has that many stacks. A status the game doesn't have is never active. It's a [plugin call](/docs/0.1.2/reference/custom#plugincall), and works anywhere a condition goes.

```ts fragment
{ 'statuses/active': { status: 'cold', stacks: { gte: 2 } } } // statuses.active('cold', { gte: 2 })
```

## Effects

Both effects work in any effect list, such as a choice's, an action's or a thing's use in the [inventory](/docs/0.1.2/reference/plugins/inventory). Applying or removing a status the game doesn't have does nothing.

### statuses/apply

Starts the status, or refreshes it or adds a stack while it's active, as its [`reapply`](#reapply) says.

```ts fragment
{ 'statuses/apply': { status: 'caffeinated' } } // statuses.apply('caffeinated')
```

### statuses/remove

Takes every stack of the status off. With `runEnd: true` its `end` effects run once per stack, and with `runEnd` left out they don't run. A medicine that cures a cold leaves `runEnd` out, and a scene where the cold runs its course early sets it.

```ts fragment
{ 'statuses/remove': { status: 'cold', runEnd: true } } // statuses.remove('cold', true)
```

## Commands

The commands do what the effects do, for a button the player presses, such as "Shake it off". Each names its status `id`, and its [`effectsOf`](/docs/0.1.2/reference/plugin-api#effectsof) is the matching effect.

### statuses/apply

Applies the status. The plugin refuses a status the game doesn't have with `Nothing like that can happen.` (`statuses/unknown`).

```ts fragment
{ 'statuses/apply': { id: 'caffeinated' } }
```

### statuses/remove

Removes the status, running its `end` effects with `runEnd: true`. The plugin refuses a status that isn't active with `That isn’t affecting you.` (`statuses/notActive`).

```ts fragment
{ 'statuses/remove': { id: 'cold', runEnd: false } }
```

## State

### StatusesState

The active statuses a save keeps at `state.plugins.statuses`, in the order they were first applied. Every field is in [`StatusesState`](/docs/0.1.2/api/plugin-statuses#statusesstate).

The save keeps no status's name, modifiers or effects, which the plugin reads from content. A save made before the game had the plugin loads with nothing active. A UI reads [`StatusesView`](#statusesview) instead.

### ActiveRecord

One active status in a save: its id and the turns left on each of its stacks, oldest first. Every field is in [`ActiveRecord`](/docs/0.1.2/api/plugin-statuses#activerecord).

## View

### StatusesView

The active statuses as the player sees them, in `view.plugins.statuses`, in the order they were first applied. Every field is in [`StatusesView`](/docs/0.1.2/api/plugin-statuses#statusesview).

The stats in `view.stats` already include every status's modifiers, so a UI shows each stat as it reads and lists the statuses beside it.

### ActiveStatus

One active status, an entry of `active`. Every field is in [`ActiveStatus`](/docs/0.1.2/api/plugin-statuses#activestatus).

`description` is `''` when the status has none. `turnsLeft` is the turns left on its longest-lasting stack, and `stacks` counts its stacks, 1 for a status that refreshes. `modifiers` lists what the status does to the stats now, all its stacks together, one entry per stat.

```ts fragment
{ active: [{ id: 'caffeinated', name: 'Caffeinated', description: 'A coffee’s worth of get-up-and-go.', turnsLeft: 2, stacks: 1, modifiers: [{ stat: 'energy', add: 10 }] }] }
```

[Render the statuses](/docs/0.1.2/how-to/render/progress-plugins#render-the-statuses) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-statuses/react` subpath renders the statuses for a game that uses [`@ifloom/react`](/docs/0.1.2/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) adds it to a game.

### statusesUi

The plugin's [`PluginUi`](/docs/0.1.2/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It puts [`StatusList`](#statuslist) under the stats in the side column and renders it as the `statuses` panel. Its type is in [`statusesUi`](/docs/0.1.2/api/plugin-statuses#statusesui).

### STATUSES_WORDS

The words the statuses UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`STATUSES_WORDS`](/docs/0.1.2/api/plugin-statuses#statuses_words).

| Key | Meaning |
|---|---|
| `ui.modifierAdd` | `{n} {stat}`, a modifier that adds, with the signed number and the stat's label, such as `+10 Energy`. |
| `ui.modifierMultiply` | `×{n} {stat}`, a modifier that multiplies. |
| `ui.statusStacks` | `×{n}`, the badge on a status with more than one stack. |
| `ui.statuses` | `Statuses`, the list's title. |
| `ui.turnLeft` | `1 turn left`, the line on a status's last turn. |
| `ui.turnsLeft` | `{n} turns left`, the line on a status with more turns left. |

### StatusList

Renders `view.plugins.statuses.active`: each status's name, its stacks when it has more than one, the turns left on its longest stack, its description and what it does to the stats. Its props are in [`StatusList`](/docs/0.1.2/api/plugin-statuses#statuslist).

The heading is `ui.statuses`, or `title`, and `false` leaves it out. It renders nothing while no status is active, so the side column has no empty box, and nothing in a game without the plugin. A game replaces it as `StatusList` in [`components`](/docs/0.1.2/reference/react/components#components). Its parts are `statuses`, `statuses-title`, `status` (with `data-status`), `status-label`, `status-stacks`, `status-turns`, `status-summary` and `status-modifiers`.

### useStatuses

Returns the statuses' [`StatusesView`](#statusesview) from the running game, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useStatuses`](/docs/0.1.2/api/plugin-statuses#usestatuses).

```tsx
import { useStatuses } from '@ifloom/plugin-statuses/react'

export function StatusIcons() {
  const active = useStatuses()?.active ?? []
  return <p>{active.map((status) => `${status.name} (${status.turnsLeft})`).join(', ')}</p>
}
```

## Functions

The helpers are properties of `statuses` and write its calls, typed:

- **`statuses.active(id, stacks?)`** returns the [`statuses/active`](#statusesactive) condition.
- **`statuses.apply(id)`** returns the [`statuses/apply`](#statusesapply) effect.
- **`statuses.remove(id, runEnd?)`** returns the [`statuses/remove`](#statusesremove) effect, with `runEnd` `false` if left out.

The café has a line for a player on their second cup:

```ts
import type { Block } from '@ifloom/engine'
import { statuses } from '@ifloom/plugin-statuses'

export const buzzing: Block = { text: 'Your knee bounces under the table.', when: statuses.active('caffeinated') }
```

### statusesOf

Returns the game's statuses from `data.statuses.statuses`, merged from its content and packs, in order. Its signature is in [`statusesOf`](/docs/0.1.2/api/plugin-statuses#statusesof).

### statusOf

Returns the status with this id, or `undefined` when the game has none. Its signature is in [`statusOf`](/docs/0.1.2/api/plugin-statuses#statusof).

## Checks

When the game loads, the plugin reports problems with each status against the content or pack it came from, with `where` as `statuses <id>`:

| Problem | Cause |
|---|---|
| `turns must be 1 or more` | `turns` is below 1. |
| `max only applies with reapply: "stack"` | The status has `max` and refreshes. |
| `max must be 1 or more` | `max` is below 1. |
| `unknown stat "focus"` | A modifier names a stat the game doesn't have. |
| `stat "friendship" belongs to character, not the player` | A modifier names a stat kept on entities. |
| `effects.end: unknown kind "pet"` | An entry of `effects` names something the game doesn't have. |

A call that names a status the game doesn't have gives `unknown status "…"` where it's written.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/0.1.2/reference/strings#stringkey-and-strings).

| Key | Meaning |
|---|---|
| `statuses/unknown` | `Nothing like that can happen.`, the refusal of [`statuses/apply`](#statusesapply-1) for a status the game doesn't have. |
| `statuses/notActive` | `That isn’t affecting you.`, the refusal of [`statuses/remove`](#statusesremove-1) for a status that isn't active. |

## Caveats

- `state.stats` keeps the value under the modifiers. Read a stat with [`statValue`](/docs/0.1.2/reference/stats#statvalue) or from the view to see the status.
- The engine checks a cost against the modified value and pays it from the kept one. With 5 energy kept and a boost of 10, an action that costs 12 goes through, and the kept value drops to 0.
- `multiply` doesn't round, so `energy × 0.8` can read as 39.2. Give the stat a [`round`](/docs/0.1.2/reference/stats#statround), as the showcase's energy has, or round in the UI.
- With the [calendar](/docs/0.1.2/reference/plugins/calendar)'s default `turn: 'day'`, `turns: 2` lasts until the player has slept twice.
