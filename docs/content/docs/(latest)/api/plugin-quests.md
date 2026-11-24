---
title: "@ifloom/plugin-quests"
description: "Every export of @ifloom/plugin-quests and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-quests` and `@ifloom/plugin-quests/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-quests

- Functions: [`advance`](#advance), [`questOf`](#questof), [`quests`](#quests), [`questsOf`](#questsof)
- Types: [`QuestDef`](#questdef), [`QuestEntry`](#questentry), [`QuestsState`](#questsstate), [`QuestStage`](#queststage), [`QuestsView`](#questsview)

### advance

Function. Explained in [Quests](/docs/plugins/quests#advance).

Bring the record up to date with the game state: start what should start,
move each quest on through every stage that is done, in order, and mark the
ones that are finished. Nothing is ever taken back.

```ts shape
import { advance } from '@ifloom/plugin-quests'
function advance(record: QuestsState, state: GameState, game: Game): QuestsState
```

Uses: [`QuestsState`](#questsstate), [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game).

### QuestDef

Type. Explained in [Quests](/docs/plugins/quests#questdef).

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  | What the player reads: "Find your feet". |
| `description` | `string` | yes |  | A line or two about it, for the quest list. |
| `storyline` | `string` | yes |  | The storyline it belongs to, for a UI that groups quests by person. |
| `starts` | [`Condition`](/docs/api/engine#condition) | yes |  | It starts the first time this holds. Leave it out to start the quest only with the `quests/start` effect. |
| `secret` | `boolean` | yes |  | Left out of the count of quests still to find until it starts. |
| `stages` | [`QuestStage[]`](#queststage) |  |  | In order. The quest is done when the last one is. |

### QuestEntry

Type. Explained in [Quests](/docs/plugins/quests#questentry).

A quest as the UI shows it.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `description` | `string` |  |  | A line about it; `''` with none. |
| `storyline` | `string \| null` |  |  | The storyline it belongs to, for a UI that groups quests by person, or null. |
| `hint` | `string` |  |  | The hint for the stage the player is on; empty once the quest is done. |
| `stage` | `number` |  |  | Stages done, and how many there are. |
| `stages` | `number` |  |  | How many stages it has. |
| `startedOn` | `number` |  |  | The turn it started. |
| `doneOn` | `number \| null` |  |  | The turn it was done, or null while it isn't. |
| `tracked` | `boolean` |  |  | Whether it's the quest the player tracks. |
| `updated` | `boolean` |  |  | Started or moved on since the player last looked. |
| `track` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that tracks it, or stops tracking it once it's tracked (labelled with the `quests/track` or `quests/untrack` string), or null once the quest is done. |

### questOf

Function. Explained in [Quests](/docs/plugins/quests#questsof-and-questof).

One of the game's quests, by id.

```ts shape
import { questOf } from '@ifloom/plugin-quests'
function questOf(game: Game, id: string): QuestDef | undefined
```

Uses: [`Game`](/docs/api/engine#game), [`QuestDef`](#questdef).

### quests

Function. Explained in [Quests](/docs/plugins/quests#quests).

The plugin, with its helpers on it: `quests()` makes the plugin for the
game's `plugins`, and content is written with `quests.done('bread')`.

```ts shape
import { quests } from '@ifloom/plugin-quests'
function quests(): DefinedPlugin<QuestsState, QuestsView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`QuestsState`](#questsstate), [`QuestsView`](#questsview).

| Helper | Signature | Description |
|---|---|---|
| `quests.active` | `(quest: string):` [`Condition`](/docs/api/engine#condition) |  |
| `quests.done` | `(quest: string):` [`Condition`](/docs/api/engine#condition) |  |
| `quests.reached` | `(quest: string, stage: string):` [`Condition`](/docs/api/engine#condition) |  |
| `quests.start` | `(quest: string):` [`EffectRef`](/docs/api/engine#effectref) |  |
| `quests.track` | `(quest?: string):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `quests.seen` | `(quest?: string):` [`CommandRef`](/docs/api/engine#commandref) |  |

### questsOf

Function. Explained in [Quests](/docs/plugins/quests#questsof-and-questof).

The game's quests: `data.quests.quests`, from its content and packs.

```ts shape
import { questsOf } from '@ifloom/plugin-quests'
function questsOf(game: Game): QuestDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`QuestDef`](#questdef).

### QuestsState

Type. Explained in [Quests](/docs/plugins/quests#questsstate).

What the plugin keeps in a save.

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
| `started` | `Record<string, number>` |  |  | Quests started, with the turn each one started. |
| `reached` | `Record<string, number>` |  |  | How many of each started quest's stages are done. |
| `done` | `Record<string, number>` |  |  | Quests finished, with the turn. |
| `tracked` | `string \| null` |  |  | The quest the player has pinned, if any. |
| `seen` | `Record<string, number>` |  |  | How far each quest had got when the player last looked at it: stages done, plus one once finished. |

### QuestStage

Type. Explained in [Quests](/docs/plugins/quests#queststage).

One step of a quest.

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
| `id` | `string` |  |  |  |
| `hint` | `string` |  |  | What the player reads while this is the stage they are on. |
| `done` | [`Condition`](/docs/api/engine#condition) |  |  | The stage is done the first time this holds, once the stages before it are. |

### QuestsView

Type. Explained in [Quests](/docs/plugins/quests#questsview).

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
| `active` | [`QuestEntry[]`](#questentry) |  |  | Started and not finished; the tracked one first, then newest first. |
| `done` | [`QuestEntry[]`](#questentry) |  |  | Finished, most recent first. |
| `toFind` | `number` |  |  | Quests not started yet, secret ones left out. |
| `updates` | `number` |  |  | How many quests have news the player has not looked at: a badge. |
| `seen` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that marks every quest's news seen (the `quests/allSeen` string, `Mark all seen`), or null while there is none. |

## @ifloom/plugin-quests/react

- Components: [`QuestsSection`](#questssection)
- Functions: [`useQuests`](#usequests)
- Constants: [`QuestLog`](#questlog), [`QUESTS_WORDS`](#quests_words), [`questsUi`](#questsui)
- Types: [`QuestsControls`](#questscontrols)

### QuestLog

Const. Explained in [Quests](/docs/plugins/quests#questlog).

The quest list: active quests with the hint for what to do next, then the
finished ones. `title` is what the game calls it — a journal, a to-do list.
A thin default on `useQuests`.

```ts shape
import { QuestLog } from '@ifloom/plugin-quests/react'
const QuestLog: ComponentType<{ className?: string; title?: string | false; }>
```

### QUESTS_WORDS

Const.

The quests plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { QUESTS_WORDS } from '@ifloom/plugin-quests/react'
const QUESTS_WORDS: {
  questNew: 'New'
  questStage: '{stage} of {stages}'
  quests: 'Quests'
}
```

### QuestsControls

Type.

What `useQuests` returns: the quests plugin's view, with its buttons, and a command to track a quest of your choosing.

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
| `active` | [`QuestEntry[]`](#questentry) |  |  | Started and not finished; the tracked one first, then newest first. |
| `done` | [`QuestEntry[]`](#questentry) |  |  | Finished, most recent first. |
| `toFind` | `number` |  |  | Quests not started yet, secret ones left out. |
| `updates` | `number` |  |  | How many quests have news the player has not looked at: a badge. |
| `seen` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that marks every quest's news seen (the `quests/allSeen` string, `Mark all seen`), or null while there is none. |
| `track` | `(id: string \| null) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Track a quest by id, or track none with `null`: sends `quests/track`. Each quest's `track` button does it for that quest. |

### QuestsSection

Component. Explained in [Quests](/docs/plugins/quests#questssection).

The default layout's Quests section: a button with the count of news that opens the `QuestLog` in a dialog.

```ts shape
import { QuestsSection } from '@ifloom/plugin-quests/react'
function QuestsSection(): JSX.Element
```

### questsUi

Const. Explained in [Quests](/docs/plugins/quests#questsui).

The quests plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: a Quests section in the side column that opens the
`QuestLog` in a dialog, with the count of news on its button; the `quests`
panel; and the quests' words.

```ts shape
import { questsUi } from '@ifloom/plugin-quests/react'
const questsUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useQuests

Function. Explained in [Quests](/docs/plugins/quests#usequests).

The quests plugin's view with its buttons and commands, or null in a game without the plugin. `QuestLog` is drawn from it.

```ts shape
import { useQuests } from '@ifloom/plugin-quests/react'
function useQuests(): QuestsControls | null
```

Uses: [`QuestsControls`](#questscontrols).
