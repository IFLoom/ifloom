# Quests

`@ifloom/plugin-quests` keeps track of what the player is doing, how far they have got, and the hint for what comes next.

A quest is a list of **stages**, and each stage is done by a [condition](/reference/conditions) on the game state. These are the same conditions that gate the content, so a quest cannot drift from the story it describes. Progress is kept once it is made: a stage that was done stays done.

```ts
import {
  quests, questActive, questDone, questReached, startQuest, trackQuest, seeQuests,
  advance, questDefs, questsView,
  type QuestDef, type QuestStage, type QuestsState, type QuestsView, type QuestEntry,
} from '@ifloom/plugin-quests'
```

The engine calls them *quests*. What the player sees them called, such as a journal, a diary or a to-do list, is the game's choice. The plugin's own lines, such as `You are not doing that.`, come from the [strings table](/reference/strings), so a game can reword them too; see [Strings](#strings).

## Install

Add the package beside the engine, and add `quests()` to the game's `plugins`. See [Adding one](/plugins/#adding-one).

```ts
const { game } = loadGame(packs, { /* ... */ plugins: [quests()] })
```

## quests

```ts
function quests(): DefinedPlugin<QuestsState>
```

The plugin, with the id `quests`. Its state starts empty. Call it once, when the game is built.

## Writing quests

Quests are content. They go in a pack's [`data`](/reference/loader#pack) under `quests.quests`, and are merged by id as scenes are, so a mod can add a quest or replace one.

```ts
const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  // items, activities, prose ...
  data: { places: { locations: [/* ... */] }, quests: { quests: [bread, letter] } },
}
```

### QuestDef

```ts
type QuestDef = {
  id: string
  title: string
  summary?: string
  storyline?: string
  starts?: Condition
  secret?: boolean
  stages: QuestStage[]
}
```

| Field | What it is |
|---|---|
| `id` | Unique among quests. Content names the quest by it. |
| `title` | Its name in the quest list. |
| `summary` | A line or two about it. |
| `storyline` | The [storyline](/reference/game#storylinedef) it belongs to, for a UI that groups quests by person. Checked when the game loads. |
| `starts` | The quest starts the first time this holds. Leave it out to start the quest only with the [`quests/start`](#effects) effect. |
| `secret` | Not counted in `toFind` until it starts. |
| `stages` | In order. The quest is done when the last one is. |

### QuestStage

```ts
type QuestStage = { id: string; hint: string; done: Condition }
```

| Field | What it is |
|---|---|
| `id` | Unique within the quest. [`quests/reached`](#conditions) names it. |
| `hint` | What the player reads while this is the stage they are on. |
| `done` | The stage is done the first time this holds, once the stages before it are done. |

## A worked example

Two quests in a small town. One starts when the player finds the cupboard bare. The other starts only when a scene or an activity says so. The game lists `plugins: [places({ start: 'house' }), quests()]`, so the town's map is the [places](/plugins/places) plugin's.

```ts
import { at, go, onlyAt } from '@ifloom/plugin-places'
import { startQuest, type QuestDef } from '@ifloom/plugin-quests'

const bread: QuestDef = {
  id: 'bread',
  title: 'Bread for breakfast',
  summary: 'There is nothing in the house.',
  starts: { flag: 'hungry' },
  stages: [
    { id: 'out', hint: 'Go out to the high street.', done: at('high-street') },
    { id: 'buy', hint: 'Buy a loaf at the bakery.', done: { item: 'loaf', gte: 1 } },
  ],
}

const letter: QuestDef = {
  id: 'letter',
  title: 'A letter for Rosa',
  stages: [{ id: 'post', hint: 'Post it on the high street.', done: { flag: 'posted' } }],
}

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  items: [{ id: 'loaf', name: 'Loaf', desc: 'Still warm.', kind: 'stuff' }],
  activities: [
    { id: 'lookInCupboard', requires: [onlyAt(['house'])], effects: [{ kind: 'flag', key: 'hungry', value: true }] },
    { id: 'buyLoaf', requires: [onlyAt(['bakery'])], effects: [{ kind: 'item', id: 'loaf', by: 1 }] },
    { id: 'findLetter', requires: [onlyAt(['house'])], effects: [startQuest('letter')] },
    { id: 'post', requires: [onlyAt(['high-street'])], effects: [{ kind: 'flag', key: 'posted', value: true }] },
  ],
  prose: { /* ... */ 'ui.journal': 'Journal ({{v:quests/updates}})' },
  data: {
    places: { locations: [/* house, high-street, bakery */] },
    quests: { quests: [bread, letter] },
  },
}
```

How it plays:

```ts
const journal = (state: GameState) => view(state, game).plugins.quests as QuestsView

journal(state)          // { active: [], done: [], toFind: 2, updates: 0 }

state = apply(state, game, { type: 'activity', id: 'lookInCupboard' }).state
journal(state).active   // [{ id: 'bread', hint: 'Go out to the high street.', stage: 0, stages: 2, updated: true, ... }]
// 'ui.journal' reads "Journal (1)"

state = apply(state, game, seeQuests()).state          // the player opened the journal: updates is 0
state = apply(state, game, go('high-street')).state
journal(state).active   // [{ id: 'bread', hint: 'Buy a loaf at the bakery.', stage: 1, updated: true, ... }]

// ...to the bakery, and buy a loaf
holds(state, questDone('bread'), game)                // true
journal(state).done     // [{ id: 'bread', hint: '', doneOn: 0, ... }]
journal(state).toFind   // 1: the letter

whyNot(state, game, trackQuest('letter'))             // 'You are not doing that.'
// ...back home, and findLetter
state = apply(state, game, trackQuest('letter')).state
journal(state).active   // [{ id: 'letter', tracked: true, ... }]
```

See them in the showcase: [Small Town](/guide/showcase#quests) has a quest that starts off another and a stage done by the feed's condition.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'quests/active', with: { quest } }` | `questActive(quest)` | The quest has started and is not finished. |
| `{ custom: 'quests/done', with: { quest } }` | `questDone(quest)` | The quest is finished. |
| `{ custom: 'quests/reached', with: { quest, stage } }` | `questReached(quest, stage)` | That stage of the quest is done. |

Use them anywhere a condition goes: a block's `when`, a choice, a lock, another quest's `starts`. Each can also be written short, with the full name as the only key: `{ 'quests/done': { quest: 'bakery' } }` is `{ custom: 'quests/done', with: { quest: 'bakery' } }` (see [plugin calls](/reference/custom)).

```ts
{ text: 'bakery/rosa-thanks', when: questDone('bread') }
```

An unknown quest or stage is false.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ custom: 'quests/start', with: { quest } }` | `startQuest(quest)` | Starts the quest this turn, if it has not started, and moves it through any stages already done. |

It works in a data scene choice's effects and an activity's `effects`. The short form, `{ 'quests/start': { quest: 'bread' } }`, works in the same places. In a plain-effect list (an item's use, what `rules.turn` returns), write the long form, `{ kind: 'custom', name: 'quests/start', with: { quest } }`. Starting a quest that has already started, or that does not exist, does nothing.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'quests/track', with: { quest } }` | `trackQuest(quest)` | Pins the quest, so it comes first in `active`. One at a time. `trackQuest()`, with no quest, unpins. |
| `{ type: 'custom', name: 'quests/seen', with: { quest } }` | `seeQuests(quest)` | Marks the quest as looked at, which clears its `updated`. `seeQuests()`, with no quest, marks them all. |

`quests/track` is refused with `You are not doing that.` (the [`quests/notDoing`](#strings) string) for a quest that has not started or is finished. `quests/seen` is never refused apart from [locks](/reference/locks). A UI usually sends `seeQuests()` when the player opens the quest list.

## Value

| Prose writes | Prints |
|---|---|
| <code v-pre>{{v:quests/updates}}</code> | How many quests have news the player has not looked at, for a badge: <code v-pre>Journal ({{v:quests/updates}})</code>. |

## Strings

The one line the plugin says to the player, in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords it by its full key.

| Key | English |
|---|---|
| `quests/notDoing` | `You are not doing that.` |

```ts
strings: { 'quests/notDoing': 'That one is not on your list.' }
```

## The view

`view(state, game).plugins.quests` is a `QuestsView`.

### QuestsView

```ts
type QuestsView = {
  active: QuestEntry[]
  done: QuestEntry[]
  toFind: number
  updates: number
}
```

| Field | What it is |
|---|---|
| `active` | Started and not finished: the tracked one first, then newest first. |
| `done` | Finished, most recent first. |
| `toFind` | Quests not started yet, not counting secret ones. |
| `updates` | How many quests have news the player has not looked at. |

### QuestEntry

```ts
type QuestEntry = {
  id: string
  title: string
  summary: string
  storyline: string | null
  hint: string
  stage: number
  stages: number
  startedOn: number
  doneOn: number | null
  tracked: boolean
  updated: boolean
}
```

| Field | What it is |
|---|---|
| `summary` | `''` if the quest has none. |
| `storyline` | `null` if the quest has none. |
| `hint` | The hint for the stage the player is on, or `''` once the quest is done. |
| `stage`, `stages` | Stages done, and how many there are. |
| `startedOn`, `doneOn` | The [turn](/reference/state) it started, and the turn it finished or `null`. |
| `tracked` | Pinned with `quests/track`. |
| `updated` | Started or moved on since the player last looked. |

## The state

### QuestsState

```ts
type QuestsState = {
  started: Record<string, number>
  reached: Record<string, number>
  done: Record<string, number>
  tracked: string | null
  seen: Record<string, number>
}
```

What the plugin keeps in a save, at `state.plugins.quests`: the turn each quest started and finished, how many stages of each are done, the tracked quest, and how far each quest had got when the player last looked. A UI reads the view, not this.

## For code

The helpers above write the content objects for you, typed: `questActive`, `questDone`, `questReached` and `startQuest` return a `Condition` or an `EffectRef`, while `trackQuest` and `seeQuests` return a `Command`. These are for code that works with quests directly, such as tests, tools or a custom UI.

### Helpers

```ts
const questActive: (quest: string) => Condition
const questDone: (quest: string) => Condition
const questReached: (quest: string, stage: string) => Condition
const startQuest: (quest: string) => EffectRef
const trackQuest: (quest?: string) => Command
const seeQuests: (quest?: string) => Command
```

### questDefs

```ts
function questDefs(game: Game): QuestDef[]
```

The game's quests, merged from its packs: `game.data.quests.quests`.

### advance

```ts
function advance(record: QuestsState, state: GameState, game: Game): QuestsState
```

Brings a record up to date with the game state. It starts what should start, moves each quest through every stage that is done, in order, and marks the finished ones. Nothing is ever taken back. It returns the same object when nothing moved. The plugin runs it after every command, and before answering a condition or building the view.

### questsView

```ts
function questsView(record: QuestsState, game: Game): QuestsView
```

The `QuestsView` for a record. The plugin's view is `questsView(advance(record, state, game), game)`.

## Checks

When the game loads, the plugin reports, against the pack each quest came from, with `where` as `quests <id>`:

- a quest with no stages (`has no stages`);
- an unknown `storyline` (`unknown storyline "…"`);
- two stages with the same id (`two stages are called "…"`);
- anything a stage's `done` names that the game does not have (`stage <id>: unknown location "…"`);
- the same for `starts` (`starts: no custom condition named "…"`).

```text
mod:sunday-market · quests stall · stage haggle: unknown character "trader"
```

## Gotchas

- **Stages are done in order.** A later stage whose condition holds early does not count until every stage before it is done. It counts then only if it still holds. In the example, buying a loaf before going out leaves the quest on "Go out to the high street.". On reaching the high street with the loaf still in the bag, both stages are done at once. If the loaf was eaten first, the player has to buy another.
- **A quest with no `starts` starts only by effect.** Nothing in the state starts it: put [`startQuest`](#effects) on the choice or activity that begins it.
- **Progress latches.** Once a stage is done, it stays done even if its condition stops holding, and a finished quest stays finished. Write `done` for the moment something happens (`at('high-street')`), not for something that has to stay true.
- **Progress is recorded after each command.** The record in the save moves on in the plugin's `after` [hook](/reference/plugins#hooks), at the end of every command that took. The conditions and the view work it out fresh, so they are right on the first frame. A condition that held only partway through a command, and no longer holds at its end, is never seen.
- **Turn numbers are the state's.** `startedOn` and `doneOn` are `state.turn`, so the first turn is `0`. With the [calendar](/plugins/calendar#what-a-turn-is)'s default, a turn is a day, so they read as days.
- **Finishing the tracked quest unpins it.**
