---
title: "Quests"
---
`@ifloom/plugin-quests` keeps track of what the player is doing, how far they've got, and a hint for what comes next.

You'd want it when the player has goals to work towards and might lose track of them, such as errands in a life sim or the week's jobs in a management game. A linear novel usually doesn't need it, because the story only goes one way.

A quest is a list of stages, and each stage is done by a [condition](/docs/reference/conditions) on the game state. These are the same conditions that gate the content, so a quest can't drift from the story it describes. Progress is kept once it's made, so a stage that was done stays done.

```ts
import {
  quests, questActive, questDone, questReached, startQuest, trackQuest, seeQuests,
  advance, questDefs, questsView,
  type QuestDef, type QuestStage, type QuestsState, type QuestsView, type QuestEntry,
} from '@ifloom/plugin-quests'
```

The engine calls them quests, but what the player sees them called, such as a journal, a diary or a to-do list, is up to you. The showcase calls its list "To do". The plugin's own line, `You are not doing that.`, comes from the [strings table](/docs/reference/strings), so you can reword that too (see [Strings](#strings)).

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-quests": "0.0.0"
  }
}
```

Then add `quests()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

```ts
import { loadGame, type Pack } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

declare const town: Pack

const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [quests()] })
```

The plugin works on its own. Its stages often use other plugins' conditions, such as the places plugin's `at('high-street')`, and those need their plugin in the game too.

## quests

```ts
function quests(): DefinedPlugin<QuestsState>
```

Builds the plugin, with the id `quests`. Its state starts empty. Call it once, when you build the game.

## Writing quests

Quests are content. They go in a pack's [`data`](/docs/reference/loader#pack) under `quests.quests`, and are merged by id as scenes are, so a mod can add a quest or replace one.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { type QuestDef } from '@ifloom/plugin-quests'

declare const settle: QuestDef

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  data: { quests: { quests: [settle] } },
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
| `storyline` | The [storyline](/docs/reference/storylines) it belongs to, for a UI that groups quests by person. Checked when the game loads. |
| `starts` | The quest starts the first time this holds. Leave it out to start the quest only with the [`quests/start`](#effects) effect. |
| `secret` | Not counted in `toFind` until it starts. |
| `stages` | The stages, in order. The quest is done when the last one is. |

### QuestStage

```ts
type QuestStage = { id: string; hint: string; done: Condition }
```

| Field | What it is |
|---|---|
| `id` | Unique within the quest. [`quests/reached`](#conditions) names it. |
| `hint` | What the player reads while this is the stage they're on. |
| `done` | The stage is done the first time this holds, once the stages before it are done. |

## A worked example

Two quests from a cut-down Small Town, the [showcase](/docs/guide/showcase)'s world. "Settle in" starts when the player has unpacked (the game's phase moves from `arrival` to `open`). "Something warm" starts only when an activity says so. The town's map comes from the [places](/docs/plugins/places) plugin.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { at, onlyAt, type LocationDef } from '@ifloom/plugin-places'
import { startQuest, type QuestDef } from '@ifloom/plugin-quests'

const settle: QuestDef = {
  id: 'settle',
  title: 'Settle in',
  summary: 'New town, new flat. Find your feet.',
  starts: { phase: ['open'] },
  stages: [
    { id: 'out', hint: 'Step out onto the high street.', done: at('high-street') },
    { id: 'coffee', hint: 'Buy a coffee at the café.', done: { kv: 'hadCoffee' } },
  ],
}

const scarf: QuestDef = {
  id: 'scarf',
  title: 'Something warm',
  stages: [{ id: 'buy', hint: 'Buy a scarf at the market.', done: { item: 'scarf' } }],
}

const act = (id: string, label: string) => ({ id, label, command: { type: 'activity' as const, id } })
const place = (id: string, name: string, exits: string[]): LocationDef =>
  ({ id, name, tag: 'Small Town', kind: 'street', art: '', exits, body: [{ text: `place.${id}` }] })

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  items: [{ id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.', kind: 'stuff' }],
  activities: [
    { id: 'unpack', blocked: [onlyAt(['flat'])], effects: [{ kind: 'phase', to: 'open' }] },
    { id: 'collar', blocked: [onlyAt(['high-street'])], effects: [startQuest('scarf')] },
    { id: 'buyScarf', blocked: [onlyAt(['high-street'])], effects: [{ kind: 'item', item: 'scarf', by: 1 }] },
    { id: 'coffee', blocked: [onlyAt(['cafe'])], effects: [{ kind: 'kv', key: 'hadCoffee', to: true }] },
  ],
  prose: {
    'place.flat': 'Boxes, mostly.',
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    todo: 'To do ({{v:quests/updates}})',
  },
  data: {
    places: {
      locations: [
        { ...place('flat', 'Your flat', ['high-street']), actions: [act('unpack', 'Unpack')] },
        { ...place('high-street', 'High Street', ['flat', 'cafe']), actions: [act('collar', 'Turn up your collar'), act('buyScarf', 'Buy a scarf at the market')] },
        { ...place('cafe', 'The Corner Café', ['high-street']), actions: [act('coffee', 'Buy a coffee')] },
      ],
    },
    quests: { quests: [settle, scarf] },
  },
}
```

The game starts in the `arrival` phase. `run` presses an activity's button:

```ts
import { apply, holds, loadGame, startingState, view, whyNot, type GameState } from '@ifloom/engine'
import { go, places } from '@ifloom/plugin-places'
import { questDone, quests, seeQuests, trackQuest, type QuestsView } from '@ifloom/plugin-quests'

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  startPhase: 'arrival',
  plugins: [places({ start: 'flat' }), quests()],
})
const journal = (state: GameState) => view(state, game).plugins.quests as QuestsView
const run = (state: GameState, id: string) => apply(state, game, { type: 'activity', id }).state
```

Here's how it plays:

```ts
let state = startingState(game)
journal(state)                   // { active: [], done: [], toFind: 2, updates: 0 }

state = run(state, 'unpack')
journal(state).active            // [{ id: 'settle', hint: 'Step out onto the high street.', stage: 0, stages: 2, updated: true, ... }]
game.prose!.line('todo', state)  // 'To do (1)'

state = apply(state, game, seeQuests()).state   // the player opened the list
journal(state).updates           // 0
state = apply(state, game, go('high-street')).state
journal(state).active[0].hint    // 'Buy a coffee at the café.'

whyNot(state, game, trackQuest('scarf'))         // 'You are not doing that.'
state = run(state, 'collar')
state = apply(state, game, trackQuest('scarf')).state
journal(state).active.map((q) => q.id)           // ['scarf', 'settle']: the tracked one first

state = run(state, 'buyScarf')
journal(state).done.map((q) => [q.id, q.doneOn]) // [['scarf', 0]]
journal(state).toFind                            // 0

state = apply(state, game, go('cafe')).state
state = run(state, 'coffee')
holds(state, questDone('settle'), game)          // true
```

The showcase's own quests are in `examples/showcase/src/content/town.ts`. [Small Town](/docs/guide/showcase#quests) has a quest that starts another, and a stage done by the feed's condition.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'quests/active', with: { quest } }` | `questActive(quest)` | The quest has started and isn't finished. |
| `{ custom: 'quests/done', with: { quest } }` | `questDone(quest)` | The quest is finished. |
| `{ custom: 'quests/reached', with: { quest, stage } }` | `questReached(quest, stage)` | That stage of the quest is done. |

You can use them anywhere a condition goes: a block's `when`, a choice, a lock or another quest's `starts`. Each can also be written short, with the full name as the only key, so `{ 'quests/done': { quest: 'settle' } }` is `{ custom: 'quests/done', with: { quest: 'settle' } }` (see [plugin calls](/docs/reference/custom#plugincall)).

```ts
import { type Block } from '@ifloom/engine'
import { questDone } from '@ifloom/plugin-quests'

const block: Block = { text: 'place.cafe/regular', when: questDone('settle') }
```

An unknown quest or stage is false.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ custom: 'quests/start', with: { quest } }` | `startQuest(quest)` | Starts the quest this turn, if it hasn't started, and moves it through any stages already done. |

It works in a data scene choice's effects and an activity's `effects`. The short form, `{ 'quests/start': { quest: 'scarf' } }`, works in the same places. In a plain-effect list (an item's use, or what `rules.turn` returns), write the long form, `{ kind: 'custom', name: 'quests/start', with: { quest } }`. Starting a quest that has already started, or that doesn't exist, does nothing.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'quests/track', with: { id } }` | `trackQuest(quest)` | Pins the quest `id`, so it comes first in `active`. Only one is pinned at a time. `trackQuest()`, with no quest, unpins. |
| `{ type: 'custom', name: 'quests/seen', with: { id } }` | `seeQuests(quest)` | Marks the quest `id` as looked at, which clears its `updated`. `seeQuests()`, with no quest, marks them all. |

`quests/track` is refused with `You are not doing that.` (the [`quests/notDoing`](#strings) string) for a quest that hasn't started or is finished. `quests/seen` is never refused, except by [locks](/docs/reference/locks). A UI usually sends `seeQuests()` when the player opens the quest list.

## Value

| Prose writes | Prints |
|---|---|
| `{{v:quests/updates}}` | How many quests have news the player hasn't looked at, for a badge such as `To do ({{v:quests/updates}})`. |

## Strings

The one line the plugin says to the player goes in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords it by its full key.

| Key | English |
|---|---|
| `quests/notDoing` | `You are not doing that.` |

```ts
const strings = { 'quests/notDoing': 'That one is not on your list.' }
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
| `active` | Started and not finished. The tracked one comes first, then the newest first. |
| `done` | Finished, most recent first. |
| `toFind` | Quests not started yet, not counting secret ones. |
| `updates` | How many quests have news the player hasn't looked at. |

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
| `stage`, `stages` | How many stages are done, and how many there are. |
| `startedOn`, `doneOn` | The [turn](/docs/reference/state#turn) it started, and the turn it finished, or `null`. |
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

What the plugin keeps in a save, at `state.plugins.quests`. It holds the turn each quest started and finished, how many stages of each are done, the tracked quest, and how far each quest had got when the player last looked. A UI reads the view, not this.

## For code

The helpers above write the content objects for you, typed. `questActive`, `questDone` and `questReached` return a `Condition`, `startQuest` returns an `EffectRef`, and `trackQuest` and `seeQuests` return a `Command`. The functions below are for code that works with quests directly, such as tests, tools or a custom UI.

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

Brings a record up to date with the game state. It starts what should start, moves each quest through every stage that's done, in order, and marks the finished ones. Nothing is ever taken back. It returns the same object when nothing moved. The plugin runs it after every command, and before answering a condition or building the view.

### questsView

```ts
function questsView(record: QuestsState, game: Game): QuestsView
```

The `QuestsView` for a record. The plugin's view is `questsView(advance(record, state, game), game)`.

## Checks

When the game loads, the plugin reports these problems against the pack each quest came from, with `where` as `quests <id>`:

- A quest with no stages (`has no stages`).
- An unknown `storyline` (`unknown storyline "…"`).
- Two stages with the same id (`two stages are called "…"`).
- Anything a stage's `done` names that the game doesn't have (`stage <id>: unknown location "…"`).
- The same for `starts` (`starts: no custom condition named "…"`).

```text
mod:sunday-market · quests stall · stage haggle: unknown character "trader"
```

A quest condition, effect or command that names a quest the game doesn't have gives `unknown quest "…"` where it's written, such as `town · activity ask · unknown quest "stal"`.

## Gotchas

- **Stages are done in order.** A later stage whose condition holds early doesn't count until every stage before it is done, and it only counts then if it still holds. In the example, if `hadCoffee` were somehow set before the player stepped out, the quest would still say "Step out onto the high street." Reaching the high street would then finish both stages at once.
- **A quest with no `starts` only starts by effect.** Nothing in the state starts it, so put [`startQuest`](#effects) on the choice or activity that begins it.
- **Progress latches.** Once a stage is done, it stays done even if its condition stops holding, and a finished quest stays finished. Write `done` for the moment something happens, such as `at('high-street')`, not for something that has to stay true.
- **Progress is recorded after each command.** The record in the save moves on in the plugin's `after` [hook](/docs/reference/plugins#hooks), at the end of every command that went through. The conditions and the view work it out fresh, so they're right on the first frame. A condition that held only partway through a command, and no longer holds at its end, is never seen.
- **Turn numbers are the state's.** `startedOn` and `doneOn` are `state.turn`, so the first turn is `0`. With the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, a turn is a day, so they read as days.
- **Finishing the tracked quest unpins it.**

## See it in an example

Small Town: `data.quests` in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) has `settle`, three stages to find your feet, and `friend`, which starts with `questActive('settle')` and is tied to Ava's storyline.
