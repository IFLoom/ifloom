---
title: "@ifloom/plugin-quests"
description: "Every export of @ifloom/plugin-quests and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-quests` and `@ifloom/plugin-quests/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-quests

- Functions: [`advance`](#advance), [`questOf`](#questof), [`quests`](#quests), [`questsOf`](#questsof)
- Types: [`QuestDef`](#questdef), [`QuestEntry`](#questentry), [`QuestsState`](#questsstate), [`QuestStage`](#queststage), [`QuestsView`](#questsview)

### advance

Function. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#advance).

Returns the quests record brought up to date with the game state. It never takes progress back.

```ts shape
import { advance } from '@ifloom/plugin-quests'
function advance(record: QuestsState, state: GameState, game: Game): QuestsState
```

Uses: [`QuestsState`](#questsstate), [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game).

### QuestDef

Type. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questdef).

A quest the game declares in `data.quests.quests`. It needs at least one stage.

```ts shape
import type { QuestDef } from '@ifloom/plugin-quests'
type QuestDef = {
  id: string
  name: string
  description?: string
  storyline?: string
  starts?: Condition
  secret?: boolean
  stages: QuestStage[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The quest's id. |
| `name` | `string` |  |  | The quest's name, such as "Find your feet". |
| `description` | `string` | yes |  | The quest's line or two for the quest list. |
| `storyline` | `string` | yes |  | The id of the storyline the quest belongs to, for a UI that groups quests by storyline. |
| `starts` | [`Condition`](/docs/0.1.2/api/engine#condition) | yes |  | The condition that starts the quest the first time it holds. Without it, only the `quests/start` effect starts the quest. |
| `secret` | `boolean` | yes |  | True to leave the quest out of the count of quests to find until it starts. |
| `stages` | [`QuestStage[]`](#queststage) |  |  | The quest's stages, in order. The quest is done when the last stage is. |

### QuestEntry

Type. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questentry).

A started quest as the player sees it, in `view.plugins.quests.active` and `done`.

```ts shape
import type { QuestEntry } from '@ifloom/plugin-quests'
type QuestEntry = {
  id: string
  name: string
  description: string
  storyline: string | null
  hint: string
  stage: number
  stages: number
  startedOn: number
  doneOn: number | null
  tracked: boolean
  updated: boolean
  track: RenderedChoice | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The quest's id. |
| `name` | `string` |  |  | The quest's name. |
| `description` | `string` |  |  | The quest's description, or `''` when it has none. |
| `storyline` | `string \| null` |  |  | The id of the quest's storyline, for a UI that groups quests by storyline, or null. |
| `hint` | `string` |  |  | The hint for the stage the player is on, or `''` once the quest is done. |
| `stage` | `number` |  |  | The number of the quest's stages done. |
| `stages` | `number` |  |  | The number of the quest's stages. |
| `startedOn` | `number` |  |  | The turn the quest started on. |
| `doneOn` | `number \| null` |  |  | The turn the quest was done on, or null while it isn't. |
| `tracked` | `boolean` |  |  | True when the player tracks this quest. |
| `updated` | `boolean` |  |  | True when the quest has started or moved on since the player last looked. |
| `track` | [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) `\| null` |  |  | The button that tracks the quest, or stops tracking it once tracked, or null once the quest is done. Its label is the `quests/track` or `quests/untrack` string. |

### questOf

Function. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questof).

Returns the quest with this id, or undefined when the game has none.

```ts shape
import { questOf } from '@ifloom/plugin-quests'
function questOf(game: Game, id: string): QuestDef | undefined
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`QuestDef`](#questdef).

### quests

Function. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#quests).

The quests plugin's factory, with its helpers as properties. `quests()` returns the plugin for the game's
`plugins`, and content calls helpers such as `quests.done('bread')`.

```ts shape
import { quests } from '@ifloom/plugin-quests'
function quests(): DefinedPlugin<QuestsState, QuestsView>
```

Uses: [`DefinedPlugin`](/docs/0.1.2/api/engine-plugin#definedplugin), [`QuestsState`](#questsstate), [`QuestsView`](#questsview).

| Helper | Signature | Description |
|---|---|---|
| `quests.active` | `(quest: string):` [`Condition`](/docs/0.1.2/api/engine#condition) | Returns the `quests/active` condition, which holds while the quest is started and not finished. |
| `quests.done` | `(quest: string):` [`Condition`](/docs/0.1.2/api/engine#condition) | Returns the `quests/done` condition, which holds once the quest is finished. |
| `quests.reached` | `(quest: string, stage: string):` [`Condition`](/docs/0.1.2/api/engine#condition) | Returns the `quests/reached` condition, which holds once this stage of the quest is done. |
| `quests.start` | `(quest: string):` [`EffectRef`](/docs/0.1.2/api/engine#effectref) | Returns the `quests/start` effect, which starts the quest now if it hasn't started. |
| `quests.track` | `(quest?: string):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `quests/track` command, which tracks the quest, or stops tracking with no argument. |
| `quests.seen` | `(quest?: string):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `quests/seen` command, which marks the quest's news seen, or every quest's with no argument. |

### questsOf

Function. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questsof).

Returns the game's quests, from `data.quests.quests` in its content and packs.

```ts shape
import { questsOf } from '@ifloom/plugin-quests'
function questsOf(game: Game): QuestDef[]
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`QuestDef`](#questdef).

### QuestsState

Type. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questsstate).

The quests a save keeps for the player, their progress, tracking and news. The plugin reads the quests from content.

```ts shape
import type { QuestsState } from '@ifloom/plugin-quests'
type QuestsState = {
  started: Record<string, number>
  reached: Record<string, number>
  done: Record<string, number>
  tracked: string | null
  seen: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `started` | `Record<string, number>` |  |  | The turn each started quest started on, by quest id. |
| `reached` | `Record<string, number>` |  |  | The number of stages done in each started quest, by quest id. |
| `done` | `Record<string, number>` |  |  | The turn each finished quest finished on, by quest id. |
| `tracked` | `string \| null` |  |  | The id of the quest the player tracks, or null. |
| `seen` | `Record<string, number>` |  |  | Each quest's progress when the player last looked at it, by quest id. It counts the stages done, plus one once the quest is finished. |

### QuestStage

Type. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#queststage).

A stage the game declares in a `QuestDef`'s `stages`. The stage is done the first time its `done` holds after the stages before it.

```ts shape
import type { QuestStage } from '@ifloom/plugin-quests'
type QuestStage = {
  id: string
  hint: string
  done: Condition
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The stage's id, unique within its quest. |
| `hint` | `string` |  |  | The stage's hint, which the player reads while on this stage. |
| `done` | [`Condition`](/docs/0.1.2/api/engine#condition) |  |  | The condition that marks the stage done, the first time it holds once the stages before it are done. |

### QuestsView

Type. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questsview).

The quests as the player sees them, in `view.plugins.quests`.

```ts shape
import type { QuestsView } from '@ifloom/plugin-quests'
type QuestsView = {
  active: QuestEntry[]
  done: QuestEntry[]
  toFind: number
  updates: number
  seen: RenderedChoice | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `active` | [`QuestEntry[]`](#questentry) |  |  | The quests started and not finished, the tracked one first and then the newest first. |
| `done` | [`QuestEntry[]`](#questentry) |  |  | The finished quests, the most recent first. |
| `toFind` | `number` |  |  | The number of quests not started yet, secret ones left out. |
| `updates` | `number` |  |  | The number of quests with news the player hasn't looked at, for a badge. |
| `seen` | [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) `\| null` |  |  | The button that marks every quest's news seen, labelled with the `quests/allSeen` string (`Mark all seen`), or null while there is none. |

## @ifloom/plugin-quests/react

- Components: [`QuestsSection`](#questssection)
- Functions: [`useQuests`](#usequests)
- Constants: [`QuestLog`](#questlog), [`QUESTS_WORDS`](#quests_words), [`questsUi`](#questsui)
- Types: [`QuestsControls`](#questscontrols)

### QuestLog

Const. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questlog).

Renders the quest log from `view.plugins.quests`, the active quests with their hints and track buttons, then the
finished ones. `title` sets the heading, such as "Journal", and `title={false}` leaves it off.

A preset can style the parts `quests`, `quests-title`, `quest`, `quest-title`, `quest-summary`, `quest-hint`,
`quest-stage`, `quests-done` and `quest-done`.

```ts shape
import { QuestLog } from '@ifloom/plugin-quests/react'
const QuestLog: ComponentType<{ className?: string; title?: string | false; }>
```

### QUESTS_WORDS

Const. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#quests_words).

The quests plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { QUESTS_WORDS } from '@ifloom/plugin-quests/react'
const QUESTS_WORDS: {
  questNew: 'New'
  questStage: '{stage} of {stages}'
  quests: 'Quests'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `questNew` | `'New'` |  |  | The badge on a quest that has changed since the player last looked. |
| `questStage` | `'{stage} of {stages}'` |  |  | The count of a quest's stages done, with `{stage}` and `{stages}`. |
| `quests` | `'Quests'` |  |  | The title of the quest log and its section. |

### QuestsControls

Type. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questscontrols).

The quests plugin's view with a function that tracks any quest, as `useQuests` returns it.

```ts shape
import type { QuestsControls } from '@ifloom/plugin-quests/react'
type QuestsControls = {
  active: QuestEntry[]
  done: QuestEntry[]
  toFind: number
  updates: number
  seen: RenderedChoice | null
  track: (id: string | null) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `active` | [`QuestEntry[]`](#questentry) |  |  | The quests started and not finished, the tracked one first and then the newest first. |
| `done` | [`QuestEntry[]`](#questentry) |  |  | The finished quests, the most recent first. |
| `toFind` | `number` |  |  | The number of quests not started yet, secret ones left out. |
| `updates` | `number` |  |  | The number of quests with news the player hasn't looked at, for a badge. |
| `seen` | [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) `\| null` |  |  | The button that marks every quest's news seen, labelled with the `quests/allSeen` string (`Mark all seen`), or null while there is none. |
| `track` | `(id: string \| null) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends `quests/track` for the quest with this id, or stops tracking with `null`. Each quest's `track` button does the same for that quest. |

### QuestsSection

Component. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questssection).

Renders the default layout's Quests section, a button with the count of news from `view.plugins.quests.updates` that opens the `QuestLog` in a dialog.

```ts shape
import { QuestsSection } from '@ifloom/plugin-quests/react'
function QuestsSection(): JSX.Element
```

### questsUi

Const. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#questsui).

The quests plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds the `QuestsSection` to the
sidebar, renders the `quests` panel as a `QuestLog`, and adds the plugin's words.

```ts shape
import { questsUi } from '@ifloom/plugin-quests/react'
const questsUi: PluginUi
```

Uses: [`PluginUi`](/docs/0.1.2/api/react-kit#pluginui).

### useQuests

Function. Explained in [Quests](/docs/0.1.2/reference/plugins/quests#usequests).

Returns the quests plugin's view and track command from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useQuests } from '@ifloom/plugin-quests/react'
function useQuests(): QuestsControls | null
```

Uses: [`QuestsControls`](#questscontrols).
