---
title: "Quests"
description: "Reference for @ifloom/plugin-quests: quests and their stages, the active, done and reached conditions, the start effect, the track and seen commands, the updates value, state, view, React UI, helpers, checks and strings."
---
`@ifloom/plugin-quests` keeps a list of the player's quests, how far each has got and a hint for the next step. A quest is a list of stages, and each stage is done by a [condition](/docs/reference/conditions) on the game state, the same conditions that gate the story, so a quest can't drift from the story it describes. The plugin never takes progress back. Quests needs no other plugin, and its stages can use any plugin's conditions, such as the [places](/docs/reference/plugins/places) plugin's `places.at('high-street')`. [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Add a quest](/docs/how-to/add-a-quest) builds one.

In the showcase: `examples/showcase/src/story/moving-day.ts`, whose `settle` quest has three stages, and `examples/showcase/src/story/ava.ts`, whose `friend` quest starts with `quests.active('settle')` and belongs to Ava's storyline.

```ts
import { quests, advance, questsOf, questOf, type QuestDef, type QuestStage, type QuestsState, type QuestsView, type QuestEntry } from '@ifloom/plugin-quests'
```

## quests

The plugin's factory, which returns the plugin with the id `quests`. It takes no options. Every field of its result is in [`quests`](/docs/api/plugin-quests#quests), and its helpers are listed under [Functions](#functions).

A new game has no quest started. After every command that goes through, the plugin's [`onCommand`](/docs/reference/plugin-api#oncommand) hook runs [`advance`](#advance), which starts each quest whose `starts` holds, moves each started quest through the stages now done and records the finished ones. The conditions and the view run `advance` too, so they're right before the record in the save catches up.

The game calls them quests, and the player can see them called anything, such as a journal or a to-do list. The showcase rewords the React UI's `ui.quests` to `To do`.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [quests()] })
```

## Content

### QuestDef

A quest the game declares in `data.quests.quests`. Every field is in [`QuestDef`](/docs/api/plugin-quests#questdef).

The loader merges quests by id, so a mod adds a quest or replaces one whole. A quest with `starts` starts the first time that condition holds after a command. A quest without one starts only through the [`quests/start`](#questsstart) effect. A `secret` quest isn't counted in the view's `toFind` until it starts. The quest is done when its last stage is.

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import type { QuestDef } from '@ifloom/plugin-quests'

const settle: QuestDef = {
  id: 'settle',
  name: 'Settle in',
  description: 'New town, new flat. Find your feet.',
  starts: { kv: 'phase', is: ['open'] },
  stages: [
    { id: 'out', hint: 'Step out onto the high street.', done: places.at('high-street') },
    { id: 'coffee', hint: 'Buy a coffee at the café.', done: { kv: 'hadCoffee' } },
  ],
}

export const town: Content = { data: { quests: { quests: [settle] } } }
```

[Add a quest](/docs/how-to/add-a-quest) builds a quest from start to finish.

### QuestStage

One step of a quest, an entry of its `stages`. Every field is in [`QuestStage`](/docs/api/plugin-quests#queststage).

The player reads the stage's `hint` while it is the stage they're on. A stage is done the first time its `done` holds once every stage before it is done, so a later stage whose condition held early counts only when the earlier ones are done and it still holds. One command can finish several stages in a row. A stage stays done when its condition stops holding, so `done` describes the moment something happens, such as `places.at('high-street')`, rather than something that has to stay true. Stage ids are unique within the quest, and [`quests/reached`](#questsreached) names them.

## Conditions

Each condition is a [plugin call](/docs/reference/custom#plugincall), written by the helper beside it. A quest condition works anywhere a condition goes, such as a block's `when`, a choice, a lock or another quest's `starts`. A quest or stage the game doesn't have is false.

### quests/active

Holds while the quest has started and isn't finished.

```ts fragment
{ 'quests/active': { quest: 'settle' } } // quests.active('settle')
```

### quests/done

Holds once the quest is finished.

```ts fragment
{ 'quests/done': { quest: 'settle' } } // quests.done('settle')
```

### quests/reached

Holds once that stage of the quest is done.

```ts fragment
{ 'quests/reached': { quest: 'settle', stage: 'out' } } // quests.reached('settle', 'out')
```

## Effects

### quests/start

Starts the quest this turn and moves it through any stages already done. Starting a quest that has started, or that the game doesn't have, does nothing. It works in any effect list, such as a choice's, an action's or a thing's use in the [inventory](/docs/reference/plugins/inventory).

```ts fragment
{ 'quests/start': { quest: 'scarf' } } // quests.start('scarf')
```

## Commands

### quests/track

Tracks the quest `id`, so it comes first in the view's `active`. One quest is tracked at a time, and `quests.track()` with no quest tracks none. The plugin refuses a quest that hasn't started or is finished with `You are not doing that.` (`quests/notDoing`). Finishing the tracked quest stops tracking it.

```ts fragment
{ 'quests/track': { id: 'scarf' } } // quests.track('scarf')
```

### quests/seen

Marks the quest `id` as looked at, which clears its `updated`, and `quests.seen()` with no quest marks every started quest. The plugin never refuses it, though a [lock](/docs/reference/locks) can. The view's `seen` button sends it with no quest.

```ts fragment
{ 'quests/seen': true } // quests.seen()
```

## Values

Prose prints this as a token.

| Key | Meaning |
|---|---|
| `{{quests/updates}}` | The number of started quests with news the player hasn't looked at, for a badge such as `To do ({{quests/updates}})`. |

## State

### QuestsState

The quests a save keeps at `state.plugins.quests`: the turn each started and finished, the stages each has done, the tracked quest and what the player has seen. Every field is in [`QuestsState`](/docs/api/plugin-quests#questsstate).

The save keeps no quest's name, hint or stages, which the plugin reads from content. Each quest's `seen` mark counts its stages done, plus one once it's finished, so a quest has news while its mark is behind. `started` and `done` record [`state.turn`](/docs/reference/state#turn), which counts from 0. A UI reads [`QuestsView`](#questsview) instead.

## View

### QuestsView

The quests as the player sees them, in `view.plugins.quests`. Every field is in [`QuestsView`](/docs/api/plugin-quests#questsview).

`active` lists the started quests that aren't finished, the tracked one first and then the newest first. `done` lists the finished ones, the most recent first. `toFind` counts the quests not started, leaving out secret ones, and `updates` counts the quests with news. `seen` is a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled with the `quests/allSeen` string that sends `quests.seen()`, or `null` while nothing has news.

```ts fragment
{ active: [{ id: 'settle', hint: 'Step out onto the high street.', stage: 0, stages: 2, updated: true, … }], done: [], toFind: 1, updates: 1, seen: { … } }
```

### QuestEntry

One started quest, an entry of `active` or `done`. Every field is in [`QuestEntry`](/docs/api/plugin-quests#questentry).

`hint` is the hint for the stage the player is on, or `''` once the quest is done. `stage` counts the stages done, and `stages` counts them all. `startedOn` and `doneOn` are turns, and `doneOn` is `null` while the quest is active. `updated` is `true` while the quest has started or moved on since the player last looked. `track` is a button that tracks the quest, labelled `quests/track`, or untracks it once it's tracked, labelled `quests/untrack`, and it's `null` once the quest is done.

[Render the quest log](/docs/how-to/render/progress-plugins#render-the-quest-log) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-quests/react` subpath renders the quests for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### questsUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It puts [`QuestsSection`](#questssection) in the side column and renders [`QuestLog`](#questlog) as the `quests` panel. Its type is in [`questsUi`](/docs/api/plugin-quests#questsui).

### QUESTS_WORDS

The words the quests UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`QUESTS_WORDS`](/docs/api/plugin-quests#quests_words). The track and seen buttons use the plugin's own [strings](#strings).

| Key | Meaning |
|---|---|
| `ui.questNew` | `New`, the badge on a quest with news. |
| `ui.questStage` | `{stage} of {stages}`, a quest's progress. |
| `ui.quests` | `Quests`, the title of the log and its section. |

### QuestsSection

Renders the side column's Quests [`Section`](/docs/reference/react/components#section), with the id `quests` and the title `ui.quests`, as a button with the count of news that opens `QuestLog` in a dialog. Its type is in [`QuestsSection`](/docs/api/plugin-quests#questssection).

### QuestLog

Renders `view.plugins.quests`: each active quest with its description, its hint, its progress (`ui.questStage`), a **New** badge while it has news and its track button, then the finished quests, struck through. Its props are in [`QuestLog`](/docs/api/plugin-quests#questlog).

While a quest has news, the heading shows a count and the view's **Mark all seen** button follows the list. `title` replaces the heading for this one list, and `false` leaves it out with its count. It renders nothing in a game without the plugin. A game replaces it as `QuestLog` in [`components`](/docs/reference/react/components#components). Its parts are `quests`, `quests-title`, `quest` (with `data-quest`), `quest-title`, `quest-summary`, `quest-hint`, `quest-stage`, `quests-done`, `quest-done`, `badge` and `button`.

### useQuests

Returns the quests view from the running game with a `track` that sends `quests/track`, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useQuests`](/docs/api/plugin-quests#usequests).

### QuestsControls

The value `useQuests` returns, a [`QuestsView`](#questsview) with `track(id)`, where `track(null)` tracks none. Every field is in [`QuestsControls`](/docs/api/plugin-quests#questscontrols). `track` returns the runner's [`Result`](/docs/reference/common#result), and a component marks the news seen by sending the view's `seen` button.

::include[../../../../../snippets/react/use-quests.tsx]

## Functions

The helpers are properties of `quests` and write its calls, typed:

- **`quests.active(quest)`**, **`quests.done(quest)`** and **`quests.reached(quest, stage)`** return the [conditions](#conditions).
- **`quests.start(quest)`** returns the [`quests/start`](#questsstart) effect.
- **`quests.track(quest?)`** and **`quests.seen(quest?)`** return the [commands](#commands) as a [`CommandRef`](/docs/reference/custom#commandref).

A café line shows once the player has settled in:

```ts
import type { Block } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

export const regular: Block = { text: 'The owner waves. You are a regular now.', when: quests.done('settle') }
```

### questsOf

Returns the game's quests from `data.quests.quests`, merged from its content and packs, in order. Its signature is in [`questsOf`](/docs/api/plugin-quests#questsof).

### questOf

Returns the quest with this id, or `undefined` when the game has none. Its signature is in [`questOf`](/docs/api/plugin-quests#questof).

### advance

Returns a [`QuestsState`](#questsstate) brought up to date with the game state. Its signature is in [`advance`](/docs/api/plugin-quests#advance).

It starts each quest whose `starts` holds, moves each started quest through every stage done, in order, and marks the finished ones done, untracking a finished tracked quest. It never takes progress back, and it returns the same object when nothing moved. A quest condition asked while it runs reads the record as it stands so far, so one quest can start another in the same pass.

```ts given
import { advance, quests } from '@ifloom/plugin-quests'

const record = advance(quests().read(state, game), state, game)
record.started // { settle: 0 }
```

## Checks

When the game loads, the plugin reports problems with each quest against the content or pack it came from, with `where` as `quests <id>`:

| Problem | Cause |
|---|---|
| `has no stages` | The quest's `stages` is empty. |
| `unknown storyline "ava"` | `storyline` names a storyline the game doesn't have. |
| `two stages are called "out"` | Two stages of the quest share an id. |
| `stage out: unknown location "lido"` | A stage's `done` names something the game doesn't have. |
| `starts: no plugin condition named "places/nearby"` | `starts` names something the game doesn't have. |

A quest condition, effect or command that names a quest the game doesn't have gives `unknown quest "stal"` where it's written, such as `town · action ask · unknown quest "stal"`.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings).

| Key | Meaning |
|---|---|
| `quests/notDoing` | `You are not doing that.`, the refusal of [`quests/track`](#queststrack) for a quest that isn't active. |
| `quests/track` | `Track`, the label of an active quest's `track` button. |
| `quests/untrack` | `Untrack`, the label of the same button once the quest is tracked. |
| `quests/allSeen` | `Mark all seen`, the label of the view's `seen` button. |

## Caveats

- A condition that holds partway through a command and no longer holds at its end never completes a stage, because the plugin records progress after the command.
- `startedOn` and `doneOn` count turns from 0. With the [calendar](/docs/reference/plugins/calendar)'s default `turn: 'day'`, they read as days.
