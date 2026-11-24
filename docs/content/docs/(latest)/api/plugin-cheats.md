---
title: "@ifloom/plugin-cheats"
description: "Every export of @ifloom/plugin-cheats and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-cheats` and `@ifloom/plugin-cheats/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-cheats

- Functions: [`cheatOf`](#cheatof), [`cheats`](#cheats), [`cheatsOf`](#cheatsof)
- Types: [`CheatDef`](#cheatdef), [`CheatsState`](#cheatsstate), [`CheatsView`](#cheatsview), [`CheatUse`](#cheatuse), [`CheatView`](#cheatview)

### CheatDef

Type. Explained in [Cheats](/docs/reference/plugins/cheats#cheatdef).

A cheat the game declares in `data.cheats.cheats`. Using it runs its effects at once, in any scene and through any
lock, and ends no turn unless its effects do.

```ts shape
import type { CheatDef } from '@ifloom/plugin-cheats'
type CheatDef = {
  id: string
  name: string
  description?: string
  effects: EffectRef[]
  blocked?: Blocked[]
  group?: string
  once?: Once
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The cheat's id, unique among the game's cheats. |
| `name` | `string` |  |  | The cheat's name, which its button shows, such as "+20 coins". |
| `description` | `string` | yes |  | The cheat's line in the cheats panel. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) |  |  | The cheat's effects, run in order. It must have at least one. |
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | The cheat's refusals. The first entry whose `when` holds refuses the button with its reason, or leaves the cheat out of the view with `hide`. A supporter-only cheat is `{ when: { not: { 'unlocks/has': { unlock: 'supporter' } } }, reason: 'For supporters' }`. |
| `group` | `string` | yes |  | The heading the cheat is listed under in the panel. Cheats with none come first. |
| `once` | [`Once`](/docs/api/engine#once) | yes |  | The cheat's limit, once in a save (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), as a choice's `once` is. `reason` is the refusal once it's used. The `cheats/usedOnce` string, "Already used.", if left out. |

### cheatOf

Function. Explained in [Cheats](/docs/reference/plugins/cheats#cheatsof-and-cheatof).

Returns the game's cheat with the id `id`, or undefined when there is none.

```ts shape
import { cheatOf } from '@ifloom/plugin-cheats'
function cheatOf(game: Game, id: string): CheatDef | undefined
```

Uses: [`Game`](/docs/api/engine#game), [`CheatDef`](#cheatdef).

### cheats

Function. Explained in [Cheats](/docs/reference/plugins/cheats#cheats).

Returns the cheats plugin, for the game's `plugins`. It cooperates with unlocks, whose `unlocks/has` condition a
supporter-only cheat names in `blocked`.

Content declares the cheats in `data.cheats.cheats`, and the helpers write its calls, such as `cheats.use('rich')`.

```ts shape
import { cheats } from '@ifloom/plugin-cheats'
function cheats(): DefinedPlugin<CheatsState, CheatsView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`CheatsState`](#cheatsstate), [`CheatsView`](#cheatsview).

| Helper | Signature | Description |
|---|---|---|
| `cheats.use` | `(cheat: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `cheats/use` command, which runs the cheat's effects through any lock and logs the use. |
| `cheats.used` | `(cheat?: string):` [`Condition`](/docs/api/engine#condition) | Returns the `cheats/used` condition, which holds once this save has used the cheat, or any cheat when none is named. |

### cheatsOf

Function. Explained in [Cheats](/docs/reference/plugins/cheats#cheatsof-and-cheatof).

Returns the game's cheats, `data.cheats.cheats` from its content and packs, in declared order.

```ts shape
import { cheatsOf } from '@ifloom/plugin-cheats'
function cheatsOf(game: Game): CheatDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`CheatDef`](#cheatdef).

### CheatsState

Type. Explained in [Cheats](/docs/reference/plugins/cheats#cheatsstate).

The log of cheat uses a save keeps. Definitions are read from content, so only the uses are kept.

```ts shape
import type { CheatsState } from '@ifloom/plugin-cheats'
type CheatsState = {
  used: CheatUse[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `used` | [`CheatUse[]`](#cheatuse) |  |  | The save's uses of cheats, oldest first. |

### CheatsView

Type. Explained in [Cheats](/docs/reference/plugins/cheats#cheatsview).

The cheats as the player sees them, in `view.plugins.cheats`.

```ts shape
import type { CheatsView } from '@ifloom/plugin-cheats'
type CheatsView = {
  cheats: CheatView[]
  used: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cheats` | [`CheatView[]`](#cheatview) |  |  | The cheats the player can see, in the order the game declares them. A cheat refused by an entry with `hide` is left out. |
| `used` | `number` |  |  | The number of cheat uses in this save, counting every cheat. |

### CheatUse

Type. Explained in [Cheats](/docs/reference/plugins/cheats#cheatuse).

A use of a cheat, one entry of `CheatsState.used`.

```ts shape
import type { CheatUse } from '@ifloom/plugin-cheats'
type CheatUse = {
  cheat: string
  turn: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cheat` | `string` |  |  | The id of the cheat used. |
| `turn` | `number` |  |  | The turn the cheat was used on. |

### CheatView

Type. Explained in [Cheats](/docs/reference/plugins/cheats#cheatview).

A cheat as the player sees it, in `view.plugins.cheats.cheats`.

```ts shape
import type { CheatView } from '@ifloom/plugin-cheats'
type CheatView = {
  id: string
  name: string
  description: string
  group: string | null
  once: 'game' | 'turn' | null
  used: number
  button: RenderedChoice
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The cheat's id. |
| `name` | `string` |  |  | The cheat's name. |
| `description` | `string` |  |  | The cheat's description, or `''` when it has none. |
| `group` | `string \| null` |  |  | The heading the cheat goes under, or null when it has none. |
| `once` | `'game' \| 'turn' \| null` |  |  | The cheat's `once` limit, `'game'` or `'turn'`, or null when it can be used any number of times. |
| `used` | `number` |  |  | The number of times this save has used the cheat. |
| `button` | [`RenderedChoice`](/docs/api/engine#renderedchoice) |  |  | The cheat's button. It's refused with its reason while a `blocked` entry holds, or once a `once` cheat is used. |

## @ifloom/plugin-cheats/react

- Functions: [`useCheats`](#usecheats)
- Constants: [`CheatPanel`](#cheatpanel), [`CHEATS_WORDS`](#cheats_words), [`CheatsButton`](#cheatsbutton), [`cheatsUi`](#cheatsui)
- Types: [`CheatGroup`](#cheatgroup), [`CheatsControls`](#cheatscontrols)

### CheatGroup

Type.

A group of the cheats panel, a heading and the cheats under it. The cheats with no group form one with a null name.

```ts shape
import type { CheatGroup } from '@ifloom/plugin-cheats/react'
type CheatGroup = {
  name: string | null
  cheats: CheatView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string \| null` |  |  | The group's heading, or null for the cheats with no group. |
| `cheats` | [`CheatView[]`](#cheatview) |  |  | The group's cheats, in the order the game declares them. |

### CheatPanel

Const. Explained in [Cheats](/docs/reference/plugins/cheats#cheatpanel).

Renders the cheats from `view.plugins.cheats` under their groups' headings, each with its button, its description
and its use count. A preset styles its `cheats`, `cheats-group`, `cheats-group-title`, `cheat`, `cheat-text` and
`cheat-used` parts.

A refused cheat's button is disabled with its reason, such as a supporter cheat before the unlock or a `once`
cheat after its use. It renders nothing while the player can see no cheat.

```ts shape
import { CheatPanel } from '@ifloom/plugin-cheats/react'
const CheatPanel: ComponentType<{ className?: string; }>
```

### CHEATS_WORDS

Const.

The cheats plugin's words in English, keyed by name. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { CHEATS_WORDS } from '@ifloom/plugin-cheats/react'
const CHEATS_WORDS: {
  cheatUsedOnce: 'Used once'
  cheatUsedTimes: 'Used {n} times'
  cheats: 'Cheats'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cheatUsedOnce` | `'Used once'` |  |  | The note on a cheat the player has used once. |
| `cheatUsedTimes` | `'Used {n} times'` |  |  | The note on a cheat the player has used more than once, with `{n}` uses. |
| `cheats` | `'Cheats'` |  |  | The label of the cheats button and the title of its dialog. |

### CheatsButton

Const. Explained in [Cheats](/docs/reference/plugins/cheats#cheatsbutton).

Renders the button that opens the `CheatPanel` in a dialog. A preset styles its `cheats-button` part.

It renders nothing in a game without the plugin, or while the player can see no cheat.

```ts shape
import { CheatsButton } from '@ifloom/plugin-cheats/react'
const CheatsButton: ComponentType<{ className?: string; }>
```

### CheatsControls

Type.

The cheats plugin's view with its cheats grouped and a way to use one, as `useCheats` returns it.

```ts shape
import type { CheatsControls } from '@ifloom/plugin-cheats/react'
type CheatsControls = {
  cheats: CheatView[]
  used: number
  groups: CheatGroup[]
  use: (cheat: string) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cheats` | [`CheatView[]`](#cheatview) |  |  | The cheats the player can see, in the order the game declares them. A cheat refused by an entry with `hide` is left out. |
| `used` | `number` |  |  | The number of cheat uses in this save, counting every cheat. |
| `groups` | [`CheatGroup[]`](#cheatgroup) |  |  | The cheats grouped by their `group`, the ungrouped ones first, then each group in the order it first appears. |
| `use` | `(cheat: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends the `cheats/use` command for the cheat. A refused use returns the reason its button gives. |

### cheatsUi

Const. Explained in [Cheats](/docs/reference/plugins/cheats#cheatsui).

The cheats plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds the `CheatsButton` to the
sidebar, which opens the `CheatPanel`, and the plugin's words.

```ts shape
import { cheatsUi } from '@ifloom/plugin-cheats/react'
const cheatsUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useCheats

Function. Explained in [Cheats](/docs/reference/plugins/cheats#usecheats).

Returns the cheats plugin's view, its groups and its command from the running game, or null in a game without the
plugin. It re-renders when the view changes. `CheatPanel` renders from it.

```ts shape
import { useCheats } from '@ifloom/plugin-cheats/react'
function useCheats(): CheatsControls | null
```

Uses: [`CheatsControls`](#cheatscontrols).
