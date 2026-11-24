---
title: "@ifloom/plugin-cheats"
description: "Every export of @ifloom/plugin-cheats and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-cheats` and `@ifloom/plugin-cheats/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-cheats

- Functions: [`cheatOf`](#cheatof), [`cheats`](#cheats), [`cheatsOf`](#cheatsof)
- Types: [`CheatDef`](#cheatdef), [`CheatsState`](#cheatsstate), [`CheatsView`](#cheatsview), [`CheatUse`](#cheatuse), [`CheatView`](#cheatview)

### CheatDef

Type. Explained in [Cheats](/docs/plugins/cheats#cheatdef).

A cheat, as content declares it in a pack's `data.cheats.cheats`.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  | What the player reads, on its button: "+20 coins". |
| `description` | `string` | yes |  | A line about it, for the panel. |
| `effects` | `EffectRef[]` |  |  | What it does, in order, as any effect list runs. |
| `blocked` | `Blocked[]` | yes |  | Why it is refused: the first entry whose `when` holds greys the button out with its reason, or leaves it off the panel with `hide`. A supporter-only cheat is `{ when: { not: { 'unlocks/has': { unlock: 'supporter' } } }, reason: 'For supporters' }`. |
| `group` | `string` | yes |  | The heading it is listed under in the panel. Cheats with none come first. |
| `once` | `Once` | yes |  | Usable once in a save (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), as a button's `once` is. `reason` is what the button reads once it's used: the plugin's `cheats/usedOnce` string, "Already used.", if left out. |

### cheatOf

Function. Explained in [Cheats](/docs/plugins/cheats#cheatsof-and-cheatof).

One of the game's cheats, by id.

```ts shape
import { cheatOf } from '@ifloom/plugin-cheats'
function cheatOf(game: Game, id: string): CheatDef | undefined
```

### cheats

Function. Explained in [Cheats](/docs/plugins/cheats#cheats).

The plugin, with its helpers on it: `cheats()` makes the plugin for the
game's `plugins`, and content is written with `cheats.use('rich')`.

```ts shape
import { cheats } from '@ifloom/plugin-cheats'
function cheats(): DefinedPlugin<CheatsState, CheatsView>
```

| Helper | Signature | Description |
|---|---|---|
| `cheats.use` | `(cheat: string): CommandRef` |  |
| `cheats.used` | `(cheat?: string): Condition` |  |

### cheatsOf

Function. Explained in [Cheats](/docs/plugins/cheats#cheatsof-and-cheatof).

The game's cheats: `data.cheats.cheats`, from its packs.

```ts shape
import { cheatsOf } from '@ifloom/plugin-cheats'
function cheatsOf(game: Game): CheatDef[]
```

### CheatsState

Type. Explained in [Cheats](/docs/plugins/cheats#cheatsstate).

What the plugin keeps in a save.

```ts shape
import type { CheatsState } from '@ifloom/plugin-cheats'
type CheatsState = {
  used: CheatUse[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `used` | `CheatUse[]` |  |  | Every use of a cheat in this save, oldest first. |

### CheatsView

Type. Explained in [Cheats](/docs/plugins/cheats#cheatsview).

What the UI reads at `view.plugins.cheats`.

```ts shape
import type { CheatsView } from '@ifloom/plugin-cheats'
type CheatsView = {
  cheats: CheatView[]
  used: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cheats` | `CheatView[]` |  |  | The cheats the player can see, in the order the game declares them. A blocked one with `hide` is left out. |
| `used` | `number` |  |  | How many cheats this save has used in all. |

### CheatUse

Type. Explained in [Cheats](/docs/plugins/cheats#cheatuse).

One use of a cheat: which, and on which turn.

```ts shape
import type { CheatUse } from '@ifloom/plugin-cheats'
type CheatUse = {
  cheat: string
  turn: number
}
```

### CheatView

Type. Explained in [Cheats](/docs/plugins/cheats#cheatview).

A cheat as the UI shows it.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `description` | `string` |  |  | What it does, as the player reads it; `''` with none. |
| `group` | `string \| null` |  |  | The heading it goes under, or null. |
| `once` | `'game' \| 'turn' \| null` |  |  | How often it can be used, as its `once` says: `'game'`, `'turn'`, or null for any number of times. |
| `used` | `number` |  |  | How many times this save has used it. |
| `button` | `RenderedChoice` |  |  | The button that uses it: greyed out with its reason while blocked or, for a `once` cheat, after its use. |

## @ifloom/plugin-cheats/react

- Functions: [`useCheats`](#usecheats)
- Constants: [`CheatPanel`](#cheatpanel), [`CHEATS_WORDS`](#cheats_words), [`CheatsButton`](#cheatsbutton), [`cheatsUi`](#cheatsui)
- Types: [`CheatGroup`](#cheatgroup), [`CheatsControls`](#cheatscontrols)

### CheatGroup

Type.

A heading of the cheat panel and the cheats under it. `name` is null for the cheats with no group, which come first.

```ts shape
import type { CheatGroup } from '@ifloom/plugin-cheats/react'
type CheatGroup = {
  name: string | null
  cheats: CheatView[]
}
```

### CheatPanel

Const. Explained in [Cheats](/docs/plugins/cheats#cheatpanel).

The cheats the player can see, under their groups' headings: each a button
greyed out with its reason while it's refused (a supporter cheat before the
unlock, a once cheat after its use), its description, and how many times
this save has used it. A thin default on `useCheats`.

```ts shape
import { CheatPanel } from '@ifloom/plugin-cheats/react'
const CheatPanel: ComponentType<{ className?: string; }>
```

### CHEATS_WORDS

Const.

The cheats plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { CHEATS_WORDS } from '@ifloom/plugin-cheats/react'
const CHEATS_WORDS: {
  cheatUsedOnce: 'Used once'
  cheatUsedTimes: 'Used {n} times'
  cheats: 'Cheats'
}
```

### CheatsButton

Const. Explained in [Cheats](/docs/plugins/cheats#cheatsbutton).

The button that opens the `CheatPanel` in a dialog: the `'cheats'` part.
Nothing in a game without the plugin, or while it has no cheat the player
can see.

```ts shape
import { CheatsButton } from '@ifloom/plugin-cheats/react'
const CheatsButton: ComponentType<{ className?: string; }>
```

### CheatsControls

Type.

What `useCheats` returns: the cheats plugin's view, the cheats by group, and the command.

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
| `cheats` | `CheatView[]` |  |  | The cheats the player can see, in the order the game declares them. A blocked one with `hide` is left out. |
| `used` | `number` |  |  | How many cheats this save has used in all. |
| `groups` | `CheatGroup[]` |  |  | The cheats by their `group`, in the order each group first appears; the ungrouped ones first. |
| `use` | `(cheat: string) => Result<GameState>` |  |  | Use a cheat: sends `cheats/use`, refused with the reason its button gives. |

### cheatsUi

Const. Explained in [Cheats](/docs/plugins/cheats#cheatsui).

The cheats plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: the `CheatsButton` in the side column, which opens the
`CheatPanel`, and the cheats' words.

```ts shape
import { cheatsUi } from '@ifloom/plugin-cheats/react'
const cheatsUi: PluginUi
```

### useCheats

Function. Explained in [Cheats](/docs/plugins/cheats#usecheats).

The cheats plugin's view with its command, or null in a game without the plugin. `CheatPanel` is drawn from it.

```ts shape
import { useCheats } from '@ifloom/plugin-cheats/react'
function useCheats(): CheatsControls | null
```
