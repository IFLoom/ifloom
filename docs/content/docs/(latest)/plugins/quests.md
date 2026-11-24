---
title: "Quests"
description: "Quests as stages that are done by conditions, with a hint for the current stage, a tracked quest, and the quest list in the view."
---
`@ifloom/plugin-quests` keeps track of what the player is doing, how far they've got, and a hint for what comes next.

You'd want it when the player has goals to work towards and might lose track of them, such as errands in a life sim or the week's jobs in a management game. A linear novel usually doesn't need it, because the story only goes one way.

A quest is a list of stages, and each stage is done by a [condition](/docs/reference/conditions) on the game state. These are the same conditions that gate the content, so a quest can't drift from the story it describes. Progress is kept once it's made, so a stage that was done stays done.

```ts
import { quests, advance, questsOf, type QuestDef, type QuestStage, type QuestsState, type QuestsView, type QuestEntry } from '@ifloom/plugin-quests'
```

The engine calls them quests, but what the player sees them called, such as a journal, a diary or a to-do list, is up to you. The showcase calls its list "To do". The plugin's own line, `You are not doing that.`, comes from the [strings table](/docs/reference/strings), so you can reword that too (see [Strings](#strings)).

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-quests": "^0.0.0"
  }
}
```

Then add `quests()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

declare const town: Content

const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [quests()] })
```

The plugin works on its own. Its stages often use other plugins' conditions, such as the places plugin's `places.at('high-street')`, and those need their plugin in the game too.

## quests

```ts shape
function quests(): DefinedPlugin<QuestsState, QuestsView>
```

Builds the plugin, with the id `quests`. Its state starts empty. Call it once, when you build the game.

## Writing quests

Quests are content. They go in your content's [`data`](/docs/reference/loader#content) under `quests.quests`, and are merged by id as scenes are, so a mod can add a quest or replace one.

```ts
import type { Content } from '@ifloom/engine'
import { type QuestDef } from '@ifloom/plugin-quests'

declare const settle: QuestDef

const town: Content = {
  data: { quests: { quests: [settle] } },
}
```

### QuestDef

```ts shape
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

| Field | What it is |
|---|---|
| `id` | Unique among quests. Content names the quest by it. |
| `name` | Its name in the quest list. |
| `description` | A line or two about it. |
| `storyline` | The [storyline](/docs/reference/storylines) it belongs to, for a UI that groups quests by person. Checked when the game loads. |
| `starts` | The quest starts the first time this holds. Leave it out to start the quest only with the [`quests/start`](#effects) effect. |
| `secret` | Not counted in `toFind` until it starts. |
| `stages` | The stages, in order. The quest is done when the last one is. |

### QuestStage

```ts shape
type QuestStage = { id: string; hint: string; done: Condition }
```

| Field | What it is |
|---|---|
| `id` | Unique within the quest. [`quests/reached`](#conditions) names it. |
| `hint` | What the player reads while this is the stage they're on. |
| `done` | The stage is done the first time this holds, once the stages before it are done. |

## A worked example

Two quests from a cut-down Small Town, the [showcase](/docs/guide/showcase)'s world. "Settle in" starts when the player has unpacked (the kv key `phase` moves from `arrival` to `open`). "Something warm" starts only when an action says so. The town's map comes from the [places](/docs/plugins/places) plugin.

```ts
import type { Content } from '@ifloom/engine'
import { places, type PlaceDef } from '@ifloom/plugin-places'
import { quests, type QuestDef } from '@ifloom/plugin-quests'

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

const scarf: QuestDef = {
  id: 'scarf',
  name: 'Something warm',
  stages: [{ id: 'buy', hint: 'Buy a scarf at the market.', done: { entity: 'clothing:scarf', at: 'you' } }],
}

const place = (id: string, name: string, exits: string[]): PlaceDef =>
  ({ id, name, description: 'Small Town', exits, body: [{ prose: `place.${id}` }] })

const map = [
  { ...place('flat', 'Your flat', ['high-street']), actions: [{ id: 'unpack', label: 'Unpack', effects: [{ kv: 'phase', to: 'open' }] }] },
  {
    ...place('high-street', 'High Street', ['flat', 'cafe']),
    actions: [
      { id: 'collar', label: 'Turn up your collar', effects: [quests.start('scarf')] },
      { id: 'buyScarf', label: 'Buy a scarf at the market', effects: [{ entity: 'clothing:scarf', by: 1 }] },
    ],
  },
  { ...place('cafe', 'The Corner Café', ['high-street']), actions: [{ id: 'coffee', label: 'Buy a coffee', effects: [{ kv: 'hadCoffee', to: true }] }] },
].map(places.location)

const town: Content = {
  kinds: [{ id: 'clothing', label: 'Clothing', unique: true, listed: false }],
  entities: [{ id: 'scarf', of: 'clothing', name: 'scarf', description: 'Knitted by someone who loved you.' }, ...map],
  // The game starts in the arrival phase.
  kv: { phase: 'arrival' },
  prose: {
    'place.flat': 'Boxes, mostly.',
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    todo: 'To do ({{quests/updates}})',
  },
  data: {
    quests: { quests: [settle, scarf] },
  },
}
```

`run` presses one of the room's buttons, which sends its action, `places/<id>`:

```ts
import { apply, holds, loadGame, startingState, view, whyNot, type GameState } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'
import { town } from './town.ts'   // the content above

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [places({ start: 'flat' }), quests()],
})
const journal = (state: GameState) => view(state, game).plugins.quests!
const run = (state: GameState, id: string) => apply(state, game, { type: 'action', id: `places/${id}` }).state
```

Playing it through:

```ts continues
let state = startingState(game)
journal(state)                   // { active: [], done: [], toFind: 2, updates: 0 }

state = run(state, 'unpack')
journal(state).active            // [{ id: 'settle', hint: 'Step out onto the high street.', stage: 0, stages: 2, updated: true, ... }]
game.prose!.line('todo', state)  // 'To do (1)'

state = apply(state, game, quests.seen()).state   // the player opened the list
journal(state).updates           // 0
state = apply(state, game, places.go('high-street')).state
journal(state).active[0].hint    // 'Buy a coffee at the café.'

whyNot(state, game, quests.track('scarf'))         // 'You are not doing that.'
state = run(state, 'collar')
state = apply(state, game, quests.track('scarf')).state
journal(state).active.map((q) => q.id)           // ['scarf', 'settle']: the tracked one first

state = run(state, 'buyScarf')
journal(state).done.map((q) => [q.id, q.doneOn]) // [['scarf', 0]]
journal(state).toFind                            // 0

state = apply(state, game, places.go('cafe')).state
state = run(state, 'coffee')
holds(state, game, quests.done('settle'))          // true
```

The showcase's own quests are in `examples/showcase/src/story/moving-day.ts` and `story/ava.ts`. [Small Town](/docs/guide/showcase#quests) has a quest that starts another, and a stage done by the feed's condition.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'quests/active': { quest } }` | `quests.active(quest)` | The quest has started and isn't finished. |
| `{ 'quests/done': { quest } }` | `quests.done(quest)` | The quest is finished. |
| `{ 'quests/reached': { quest, stage } }` | `quests.reached(quest, stage)` | That stage of the quest is done. |

You can use them anywhere a condition goes: a block's `when`, a choice, a lock or another quest's `starts`. Each is a call with the full name as the only key, so `quests.done('settle')` writes `{ 'quests/done': { quest: 'settle' } }` (see [plugin calls](/docs/reference/custom#plugincall)).

```ts
import { type Block } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

const block: Block = { prose: 'place.cafe.regular', when: quests.done('settle') }
```

An unknown quest or stage is false.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'quests/start': { quest } }` | `quests.start(quest)` | Starts the quest this turn, if it hasn't started, and moves it through any stages already done. |

It works in any effect list: a data scene choice's, an action's, a thing's use in the [inventory](/docs/plugins/inventory), or a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does). Starting a quest that has already started, or that doesn't exist, does nothing.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'quests/track': { id } }` | `quests.track(quest)` | Pins the quest `id`, so it comes first in `active`. Only one is pinned at a time. `quests.track()`, with no quest, unpins. |
| `{ 'quests/seen': { id } }` | `quests.seen(quest)` | Marks the quest `id` as looked at, which clears its `updated`. `quests.seen()`, with no quest, marks them all. |

`quests/track` is refused with `You are not doing that.` (the [`quests/notDoing`](#strings) string) for a quest that hasn't started or is finished. `quests/seen` is never refused, except by [locks](/docs/reference/locks). A UI usually sends `quests.seen()` when the player opens the quest list.

## Value

| Prose writes | Prints |
|---|---|
| `{{quests/updates}}` | How many quests have news the player hasn't looked at, for a badge such as `To do ({{quests/updates}})`. |

## Strings

The one line the plugin says to the player goes in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords it by its full key.

| Key | English |
|---|---|
| `quests/notDoing` | `You are not doing that.` |
| `quests/track` | `Track`, an active quest's [`track`](#questentry) button. |
| `quests/untrack` | `Untrack`, the same button once the quest is tracked. |
| `quests/allSeen` | `Mark all seen`, the view's [`seen`](#questsview) button. |

```ts
const strings = { 'quests/notDoing': 'That one is not on your list.' }
```

## The view

`view(state, game).plugins.quests` is a `QuestsView`.

Its [React UI](#drawing-it) draws it with [`QuestLog`](#questlog), and [`useQuests`](#usequests) gives the same data and the track command with no markup.

### QuestsView

```ts shape
type QuestsView = {
  active: QuestEntry[]
  done: QuestEntry[]
  toFind: number
  updates: number
  seen: RenderedChoice | null
}
```

| Field | What it is |
|---|---|
| `active` | Started and not finished. The tracked one comes first, then the newest first. |
| `done` | Finished, most recent first. |
| `toFind` | Quests not started yet, not counting secret ones. |
| `updates` | How many quests have news the player hasn't looked at. |
| `seen` | The button that marks every quest's news seen, a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled with the `quests/allSeen` string, or `null` while there is none. |

### QuestEntry

```ts shape
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

| Field | What it is |
|---|---|
| `description` | `''` if the quest has none. |
| `storyline` | `null` if the quest has none. |
| `hint` | The hint for the stage the player is on, or `''` once the quest is done. |
| `stage`, `stages` | How many stages are done, and how many there are. |
| `startedOn`, `doneOn` | The [turn](/docs/reference/state#turn) it started, and the turn it finished, or `null`. |
| `tracked` | Pinned with `quests/track`. |
| `updated` | Started or moved on since the player last looked. |
| `track` | The button that tracks it, or stops tracking it once it's tracked, labelled with the `quests/track` or `quests/untrack` string, or `null` once it's done. |

## Drawing it

`view.plugins.quests` is a [`QuestsView`](#questsview): the active quests, the tracked one first, and the finished ones, each a [`QuestEntry`](#questentry) with its hint and how far along it is. `updates` counts the quests with news, for a badge. Each active quest's `track` and the view's `seen` are ready buttons: draw them as any other, and send their `command`.

`@ifloom/plugin-quests/react` draws the quest log, for a game drawn with [`@ifloom/react`](/docs/react). List `questsUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and a Quests section (`ui.quests`) in the side column opens the [`QuestLog`](#questlog) in a dialog, with the count of news on its button, and the `quests` panel draws it too. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/quests.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-quests.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Quests.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.quests`, or from [`useQuests`](#usequests) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

### questsUi

```ts shape
const questsUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): a Quests section (`ui.quests`) in the side column opens the [`QuestLog`](#questlog) in a dialog, with the count of news on its button, and the `quests` panel draws it too.

Its words are in `QUESTS_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.questNew': '…' }`.

| Key | English |
|---|---|
| `ui.questNew` | `New` |
| `ui.questStage` | `{stage} of {stages}` |
| `ui.quests` | `Quests` |

The track and seen buttons say what the view's buttons say, the plugin's [strings](#strings).

### QuestsSection

```tsx shape
function QuestsSection(): JSX.Element
```

What `questsUi` puts in the side column: a [`Section`](/docs/react/components#section) with the id `quests`, titled `ui.quests`, as a button with the count of news on it that opens the `QuestLog` in a dialog. Draw it in a layout of your own to keep that, or draw `QuestLog` in your own section.

### QuestLog

```tsx shape
function QuestLog(props: { className?: string; title?: string | false }): JSX.Element | null
```

The [quests plugin](/docs/plugins/quests)'s view. Each active quest (`data-quest`) shows its description, the hint for what to do next, and how far it has got (`ui.questStage`). It has a **New** badge when it has changed, and its **Track** or **Untrack** button from the view. The finished quests follow, struck through. While anything is new, the heading shows a count and the view's **Mark all seen** button follows the list.

`title` replaces the heading, `ui.quests`, for this one list, and `false` leaves it out with its count. It draws nothing in a game without the plugin.

Replaceable as `QuestLog` in [`components`](/docs/react/components#components). Parts: `quests`, `quests-title`, `quest` (with `data-quest`), `quest-title`, `quest-summary`, `quest-hint`, `quest-stage`, `quests-done`, `quest-done`, `badge` and `button`.

### useQuests

```ts shape
function useQuests(): QuestsControls | null

type QuestsControls = QuestsView & {
  track: (id: string | null) => Result<GameState>
}
```

The [quests](/docs/plugins/quests) plugin's view ([`QuestsView`](/docs/plugins/quests#the-view): `active`, `done`, `toFind`, `updates` and its buttons) with a command, or `null` in a game without the plugin. `track(id)` sends `quests/track`, and `track(null)` tracks none. Send the view's `seen` button to mark the news seen. [`QuestLog`](#questlog) is drawn from it.

::include[../../../../snippets/react/use-quests.tsx]

## The state

### QuestsState

```ts shape
type QuestsState = {
  started: Record<string, number>
  reached: Record<string, number>
  done: Record<string, number>
  tracked: string | null
  seen: Record<string, number>
}
```

What the plugin keeps in a save, at `state.plugins.quests`. A UI reads the view, not this.

| Field | What it is |
|---|---|
| `started` | The turn each quest started, by quest id. |
| `reached` | How many of each started quest's stages are done. |
| `done` | The turn each quest finished. |
| `tracked` | The quest the player has pinned, or `null`. |
| `seen` | How far each quest had got when the player last looked at it: stages done, plus one once finished. |

## For code

The helpers above write the content objects for you, typed. `quests.active`, `quests.done` and `quests.reached` return a `Condition`, `quests.start` returns an `Effect`, and `quests.track` and `quests.seen` return a [`CommandRef`](/docs/reference/custom#commandref). The functions below are for code that works with quests directly, such as tests, tools or a custom UI.

### Helpers

```ts shape
const quests: {
  (): DefinedPlugin<QuestsState, QuestsView>
  active(quest: string): Condition
  done(quest: string): Condition
  reached(quest: string, stage: string): Condition
  start(quest: string): EffectRef
  track(quest?: string): CommandRef
  seen(quest?: string): CommandRef
}
```

### questsOf and questOf

```ts shape
function questsOf(game: Game): QuestDef[]
function questOf(game: Game, id: string): QuestDef | undefined
```

The game's quests, merged from its content and packs: `game.data.quests.quests`. `questOf` is the one with this id, or `undefined`.

### advance

```ts shape
function advance(record: QuestsState, state: GameState, game: Game): QuestsState
```

Brings a record up to date with the game state. It starts what should start, moves each quest through every stage that's done, in order, and marks the finished ones. Nothing is ever taken back. It returns the same object when nothing moved. The plugin runs it after every command, and before answering a condition or building the view.

## Checks

When the game loads, the plugin reports these problems against the content or pack each quest came from, with `where` as `quests <id>`:

- A quest with no stages (`has no stages`).
- An unknown `storyline` (`unknown storyline "…"`).
- Two stages with the same id (`two stages are called "…"`).
- Anything a stage's `done` names that the game doesn't have (`stage <id>: unknown location "…"`).
- The same for `starts` (`starts: no plugin condition named "…"`).

```text
mod:sunday-market · quests stall · stage haggle: unknown character "trader"
```

A quest condition, effect or command that names a quest the game doesn't have gives `unknown quest "…"` where it's written, such as `town · action ask · unknown quest "stal"`.

## Gotchas

- **Stages are done in order.** A later stage whose condition holds early doesn't count until every stage before it is done, and it only counts then if it still holds. In the example, if `hadCoffee` were somehow set before the player stepped out, the quest would still say "Step out onto the high street." Reaching the high street would then finish both stages at once.
- **A quest with no `starts` only starts by effect.** Nothing in the state starts it, so put [`quests.start`](#effects) on the choice or action that begins it.
- **Progress latches.** Once a stage is done, it stays done even if its condition stops holding, and a finished quest stays finished. Write `done` for the moment something happens, such as `places.at('high-street')`, not for something that has to stay true.
- **Progress is recorded after each command.** The record in the save moves on in the plugin's `onCommand` [hook](/docs/reference/plugins#hooks-and-providers), at the end of every command that went through. The conditions and the view work it out fresh, so they're right on the first frame. A condition that held only partway through a command, and no longer holds at its end, is never seen.
- **Turn numbers are the state's.** `startedOn` and `doneOn` are `state.turn`, so the first turn is `0`. With the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, a turn is a day, so they read as days.
- **Finishing the tracked quest unpins it.**

## See it in an example

Small Town: `settle` in [`examples/showcase/src/story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts) has three stages to find your feet, and `friend` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) which starts with `quests.active('settle')` and is tied to Ava's storyline.
