---
title: "@ifloom/plugin-statuses"
description: "Every export of @ifloom/plugin-statuses and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-statuses` and `@ifloom/plugin-statuses/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-statuses

- Functions: [`statuses`](#statuses), [`statusesOf`](#statusesof), [`statusOf`](#statusof)
- Types: [`ActiveRecord`](#activerecord), [`ActiveStatus`](#activestatus), [`Reapply`](#reapply), [`StatusDef`](#statusdef), [`StatusesState`](#statusesstate), [`StatusesView`](#statusesview), [`StatusModifier`](#statusmodifier)

### ActiveRecord

Type. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#activerecord).

The record a save keeps for one active status, in `StatusesState`'s `active`. The plugin reads the status's definition from content.

```ts shape
import type { ActiveRecord } from '@ifloom/plugin-statuses'
type ActiveRecord = {
  id: string
  left: number[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The status's id. |
| `left` | `number[]` |  |  | The turns left on each stack, oldest stack first. |

### ActiveStatus

Type. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#activestatus).

An active status as the player sees it, in `view.plugins.statuses.active`.

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
| `id` | `string` |  |  | The status's id. |
| `name` | `string` |  |  | The status's name. |
| `description` | `string` |  |  | The status's description, or `''` when it has none. |
| `turnsLeft` | `number` |  |  | The turns left on the status's longest stack. |
| `stacks` | `number` |  |  | The number of the status's stacks still running, 1 unless it stacks. |
| `modifiers` | [`StatModifier[]`](/docs/0.1.0/api/engine-plugin#statmodifier) |  |  | The status's changes to the stats now, all its stacks together, one entry per stat. |

### Reapply

Type. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#reapply).

The rule for applying a status that is already active. `'refresh'` starts its turns again, and `'stack'` adds another stack.

```ts shape
import type { Reapply } from '@ifloom/plugin-statuses'
type Reapply = 'refresh' | 'stack'
```

### StatusDef

Type. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statusdef).

A timed status the game declares in `data.statuses.statuses`. It lasts `turns` turns from the turn it is applied in.

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
| `id` | `string` |  |  | The status's id. |
| `name` | `string` |  |  | The status's name, such as "Caffeinated". |
| `description` | `string` | yes |  | The status's description, a line for the UI to show. |
| `turns` | `number` |  |  | The number of turns the status lasts, counting the end of the turn it was applied in. |
| `modifiers` | [`StatusModifier[]`](#statusmodifier) | yes |  | The status's changes to the player's stats while it lasts, per stack. The plugin never writes them to the stats. |
| `effects` | `{ start?:` [`EffectRef[]`](/docs/0.1.0/api/engine#effectref)`; turn?:` [`EffectRef[]`](/docs/0.1.0/api/engine#effectref)`; end?:` [`EffectRef[]`](/docs/0.1.0/api/engine#effectref) `}` | yes |  | The status's effects as it runs. `start` runs as the status starts, `turn` once per stack at the end of each turn, and `end` once per stack that runs out. `start` also runs for each stack added, but not for a refresh or a stack that replaces the oldest at `max`. The `turn` effects run before the status's turns go down. |
| `reapply` | [`Reapply`](#reapply) | yes |  | The rule for applying the status again while it is active. `'refresh'` if left out. |
| `max` | `number` | yes |  | The most stacks the status can have, with `reapply: 'stack'`. A new stack past it replaces the oldest, and there is no limit if left out. |

### statuses

Function. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statuses).

The statuses plugin's factory, with its helpers as properties. `statuses()` returns the plugin for the game's
`plugins`, and content calls helpers such as `statuses.apply('caffeinated')`.

```ts shape
import { statuses } from '@ifloom/plugin-statuses'
function statuses(): DefinedPlugin<StatusesState, StatusesView>
```

Uses: [`DefinedPlugin`](/docs/0.1.0/api/engine-plugin#definedplugin), [`StatusesState`](#statusesstate), [`StatusesView`](#statusesview).

| Helper | Signature | Description |
|---|---|---|
| `statuses.active` | `(id: string, stacks?:` [`Range`](/docs/0.1.0/api/engine#range)`):` [`Condition`](/docs/0.1.0/api/engine#condition) | Returns the `statuses/active` condition, which holds while the status is active, with a number of stacks in the range if given. |
| `statuses.apply` | `(id: string):` [`EffectRef`](/docs/0.1.0/api/engine#effectref) | Returns the `statuses/apply` effect, which starts the status, or refreshes or stacks it if it's already active. |
| `statuses.remove` | `(id: string, runEnd?: boolean):` [`EffectRef`](/docs/0.1.0/api/engine#effectref) | Returns the `statuses/remove` effect, which takes every stack of the status off, running its `end` effects with `runEnd`. |

### statusesOf

Function. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statusesof).

Returns the game's timed statuses, from `data.statuses.statuses` in its content and packs.

```ts shape
import { statusesOf } from '@ifloom/plugin-statuses'
function statusesOf(game: Game): StatusDef[]
```

Uses: [`Game`](/docs/0.1.0/api/engine#game), [`StatusDef`](#statusdef).

### StatusesState

Type. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statusesstate).

The active statuses a save keeps for the player. The plugin reads each status's definition from content.

```ts shape
import type { StatusesState } from '@ifloom/plugin-statuses'
type StatusesState = {
  active: ActiveRecord[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `active` | [`ActiveRecord[]`](#activerecord) |  |  | The active statuses, in the order they were first applied. |

### StatusesView

Type. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statusesview).

The active statuses as the player sees them, in `view.plugins.statuses`.

```ts shape
import type { StatusesView } from '@ifloom/plugin-statuses'
type StatusesView = {
  active: ActiveStatus[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `active` | [`ActiveStatus[]`](#activestatus) |  |  | The active statuses, in the order they were first applied. |

### StatusModifier

Type. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statusmodifier).

A change a status makes to the value one of the player's stats reads, per stack.

```ts shape
import type { StatusModifier } from '@ifloom/plugin-statuses'
type StatusModifier = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

### statusOf

Function. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statusof).

Returns the status with this id, or undefined when the game has none.

```ts shape
import { statusOf } from '@ifloom/plugin-statuses'
function statusOf(game: Game, id: string): StatusDef | undefined
```

Uses: [`Game`](/docs/0.1.0/api/engine#game), [`StatusDef`](#statusdef).

## @ifloom/plugin-statuses/react

- Functions: [`useStatuses`](#usestatuses)
- Constants: [`STATUSES_WORDS`](#statuses_words), [`statusesUi`](#statusesui), [`StatusList`](#statuslist)

### STATUSES_WORDS

Const. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statuses_words).

The statuses plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

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

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `modifierAdd` | `'{n} {stat}'` |  |  | The line for a modifier that adds to a stat, with the signed `{n}` and the `{stat}`. |
| `modifierMultiply` | `'×{n} {stat}'` |  |  | The line for a modifier that multiplies a stat, with `{n}` and the `{stat}`. |
| `statusStacks` | `'×{n}'` |  |  | The badge on a status with more than one stack, with `{n}`. |
| `statuses` | `'Statuses'` |  |  | The title of the status list. |
| `turnLeft` | `'1 turn left'` |  |  | The line on a status with one turn left. |
| `turnsLeft` | `'{n} turns left'` |  |  | The line on a status with `{n}` turns left. |

### statusesUi

Const. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statusesui).

The statuses plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `StatusList` under
the stats in the sidebar and as the `statuses` panel, and adds the plugin's words.

```ts shape
import { statusesUi } from '@ifloom/plugin-statuses/react'
const statusesUi: PluginUi
```

Uses: [`PluginUi`](/docs/0.1.0/api/react-kit#pluginui).

### StatusList

Const. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#statuslist).

Renders the active statuses from `view.plugins.statuses.active`, each with its name, stacks, turns left,
description and changes to the stats. It renders nothing while no status is active or without the plugin.

A preset can style the parts `statuses`, `statuses-title`, `status`, `status-label`, `status-stacks`,
`status-turns`, `status-summary` and `status-modifiers`.

```ts shape
import { StatusList } from '@ifloom/plugin-statuses/react'
const StatusList: ComponentType<{ className?: string; title?: string | false; }>
```

### useStatuses

Function. Explained in [Statuses](/docs/0.1.0/reference/plugins/statuses#usestatuses).

Returns the statuses plugin's view from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useStatuses } from '@ifloom/plugin-statuses/react'
function useStatuses(): StatusesView | null
```

Uses: [`StatusesView`](#statusesview).
