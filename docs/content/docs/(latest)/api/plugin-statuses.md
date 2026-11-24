---
title: "@ifloom/plugin-statuses"
description: "Every export of @ifloom/plugin-statuses and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-statuses` and `@ifloom/plugin-statuses/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-statuses

- Functions: [`statuses`](#statuses), [`statusesOf`](#statusesof), [`statusOf`](#statusof)
- Types: [`ActiveRecord`](#activerecord), [`ActiveStatus`](#activestatus), [`Reapply`](#reapply), [`StatusDef`](#statusdef), [`StatusesState`](#statusesstate), [`StatusesView`](#statusesview), [`StatusModifier`](#statusmodifier)

### ActiveRecord

Type. Explained in [Statuses](/docs/plugins/statuses#activerecord).

One active status as the save keeps it: its id, and the turns left on each stack, oldest first.

```ts shape
import type { ActiveRecord } from '@ifloom/plugin-statuses'
type ActiveRecord = {
  id: string
  left: number[]
}
```

### ActiveStatus

Type. Explained in [Statuses](/docs/plugins/statuses#activestatus).

An active status as the UI shows it.

```ts shape
import type { ActiveStatus } from '@ifloom/plugin-statuses'
type ActiveStatus = {
  id: string
  name: string
  description: string
  turnsLeft: number
  stacks: number
  modifiers: StatModifier[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `description` | `string` |  |  | What it does, as the player reads it; `''` with none. |
| `turnsLeft` | `number` |  |  | The turns left on its longest stack. |
| `stacks` | `number` |  |  | How many times it's applied and still running: 1 unless the status stacks. |
| `modifiers` | [`StatModifier[]`](/docs/api/engine-plugin#statmodifier) |  |  | What it does to the stats right now, all its stacks together, one entry per stat. |

### Reapply

Type. Explained in [Statuses](/docs/plugins/statuses#reapply).

What applying a status that is already active does: start its turns again, or add another stack.

```ts shape
import type { Reapply } from '@ifloom/plugin-statuses'
type Reapply = 'refresh' | 'stack'
```

### StatusDef

Type. Explained in [Statuses](/docs/plugins/statuses#statusdef).

A timed status in the game's content: one entry of `data.statuses.statuses`, the plugin's list of statuses.

```ts shape
import type { StatusDef } from '@ifloom/plugin-statuses'
type StatusDef = {
  id: string
  name: string
  description?: string
  turns: number
  modifiers?: StatusModifier[]
  effects?: { start?: EffectRef[]; turn?: EffectRef[]; end?: EffectRef[] }
  reapply?: Reapply
  max?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  | What the player reads: "Caffeinated". |
| `description` | `string` | yes |  | A line about it, for the UI. |
| `turns` | `number` |  |  | How many turns it lasts, counting the end of the turn it was applied in. |
| `modifiers` | [`StatusModifier[]`](#statusmodifier) | yes |  | What it does to the player's stats while it lasts, per stack. Never written. |
| `effects` | `{ start?:` [`EffectRef[]`](/docs/api/engine#effectref)`; turn?:` [`EffectRef[]`](/docs/api/engine#effectref)`; end?:` [`EffectRef[]`](/docs/api/engine#effectref) `}` | yes |  | What it does as it goes: `start` when it starts, and each time a stack is added; `turn` at the end of each turn it is active, once per stack, before its turns go down; `end` when it runs out, once per stack that ran out. |
| `reapply` | [`Reapply`](#reapply) | yes |  | What applying it again does while it is active. `'refresh'` if left out. |
| `max` | `number` | yes |  | With `reapply: 'stack'`, the most stacks it can have. No limit if left out. |

### statuses

Function. Explained in [Statuses](/docs/plugins/statuses#statuses).

The plugin, with its helpers on it: `statuses()` makes the plugin for the
game's `plugins`, and content is written with `statuses.apply('caffeinated')`.

```ts shape
import { statuses } from '@ifloom/plugin-statuses'
function statuses(): DefinedPlugin<StatusesState, StatusesView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`StatusesState`](#statusesstate), [`StatusesView`](#statusesview).

| Helper | Signature | Description |
|---|---|---|
| `statuses.active` | `(id: string, stacks?:` [`Range`](/docs/api/engine#range)`):` [`Condition`](/docs/api/engine#condition) |  |
| `statuses.apply` | `(id: string):` [`EffectRef`](/docs/api/engine#effectref) |  |
| `statuses.remove` | `(id: string, runEnd?: boolean):` [`EffectRef`](/docs/api/engine#effectref) |  |

### statusesOf

Function. Explained in [Statuses](/docs/plugins/statuses#statusesof-and-statusof).

The game's timed statuses: `data.statuses.statuses`, from its content and packs.

```ts shape
import { statusesOf } from '@ifloom/plugin-statuses'
function statusesOf(game: Game): StatusDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`StatusDef`](#statusdef).

### StatusesState

Type. Explained in [Statuses](/docs/plugins/statuses#statusesstate).

What the plugin keeps in a save.

```ts shape
import type { StatusesState } from '@ifloom/plugin-statuses'
type StatusesState = {
  active: ActiveRecord[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `active` | [`ActiveRecord[]`](#activerecord) |  |  | Active statuses, in the order they were first applied. |

### StatusesView

Type. Explained in [Statuses](/docs/plugins/statuses#statusesview).

```ts shape
import type { StatusesView } from '@ifloom/plugin-statuses'
type StatusesView = {
  active: ActiveStatus[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `active` | [`ActiveStatus[]`](#activestatus) |  |  | Active statuses, in the order they were first applied. |

### StatusModifier

Type. Explained in [Statuses](/docs/plugins/statuses#statusmodifier).

A change a status makes to what one of the player's stats reads, per stack.

```ts shape
import type { StatusModifier } from '@ifloom/plugin-statuses'
type StatusModifier = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

### statusOf

Function. Explained in [Statuses](/docs/plugins/statuses#statusesof-and-statusof).

One of the game's statuses, by id.

```ts shape
import { statusOf } from '@ifloom/plugin-statuses'
function statusOf(game: Game, id: string): StatusDef | undefined
```

Uses: [`Game`](/docs/api/engine#game), [`StatusDef`](#statusdef).

## @ifloom/plugin-statuses/react

- Functions: [`useStatuses`](#usestatuses)
- Constants: [`STATUSES_WORDS`](#statuses_words), [`statusesUi`](#statusesui), [`StatusList`](#statuslist)

### STATUSES_WORDS

Const.

The statuses plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { STATUSES_WORDS } from '@ifloom/plugin-statuses/react'
const STATUSES_WORDS: {
  modifierAdd: '{n} {stat}'
  modifierMultiply: '×{n} {stat}'
  statusStacks: '×{n}'
  statuses: 'Statuses'
  turnLeft: '1 turn left'
  turnsLeft: '{n} turns left'
}
```

### statusesUi

Const. Explained in [Statuses](/docs/plugins/statuses#statusesui).

The statuses plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: the `StatusList` under the stats in the side column, the
`statuses` panel, and the statuses' words.

```ts shape
import { statusesUi } from '@ifloom/plugin-statuses/react'
const statusesUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### StatusList

Const. Explained in [Statuses](/docs/plugins/statuses#statuslist).

The statuses active now: each with its name, its stacks, the turns left on
its longest stack, its description and what it does to the stats. Nothing while
none is active, or in a game without the plugin. A thin default on
`useStatuses`.

```ts shape
import { StatusList } from '@ifloom/plugin-statuses/react'
const StatusList: ComponentType<{ className?: string; title?: string | false; }>
```

### useStatuses

Function. Explained in [Statuses](/docs/plugins/statuses#usestatuses).

The statuses plugin's view: the active statuses, each with its turns left and what it does to the stats, or null in a game without the plugin. `StatusList` is drawn from it.

```ts shape
import { useStatuses } from '@ifloom/plugin-statuses/react'
function useStatuses(): StatusesView | null
```

Uses: [`StatusesView`](#statusesview).
