---
title: "Shapes of game"
description: The three shapes of game IFLoom makes, a linear novel, a management game and a life sim, each walked through with its example game.
---
IFLoom is one engine for several shapes of game. The repository has an example of each of these three:

- **A linear novel.** Chapters in order, choices the story remembers, and a few numbers kept quietly. It needs no map and no clock.
- **A management game.** Money, and several of a thing (staff, dishes, rooms), each with numbers of its own, run a week at a time.
- **A life sim.** People who keep their own hours, friendships that grow, and a town to wander.

They all use the same core: the turn, scenes and choices, conditions and effects, stats, entities, the kv store, collections, storylines, saves, the view and the plugin API. What sets them apart is how much world a game declares, and how the [React UI](/docs/react) lays it out:

| Shape | The game | Plugins | Layout | Example |
|---|---|---|---|---|
| A linear novel | the core alone | none | its own: a `Story` with no side column, one column to read | [The Letter](#a-linear-novel-the-letter), `examples/novel` |
| A management game | the core, with [entities](/docs/reference/entities) | none, or [`calendar({ turn: 'week' })`](/docs/plugins/calendar) for days and weeks | its own: the tables in the story | [The Corner Café](#a-management-game-the-corner-café), `examples/cafe` |
| A life sim | the core | [calendar](/docs/plugins/calendar), [places](/docs/plugins/places) and the [cast](/docs/plugins/cast) | [`DefaultLayout`](/docs/react/components#defaultlayout)'s, the side column and the story, with the wardrobe shown at home | [Small Town](#a-life-sim-small-town), `examples/showcase` |

Each example is a whole game you can play and ship. In its folder, `npm run dev` serves it in a browser, `npm run check` lists any problems in its content, and `npm run build` makes it one HTML file that opens from disk (see the [CLI](/docs/cli)). From the root of the checkout, run them with `-w`, as in `npm run dev -w @ifloom/example-novel`.

Each has a `src/game.ts` with the game, and tests that play it and check its build. The Letter and The Corner Café draw it from `src/main.ts` with one call to [`mountGame`](/docs/react#mountgame). Small Town's `src/main.tsx` builds its runner by hand and renders [`GameShell`](/docs/react#gameshell), because it loads the player's mods before it makes the game.

To start a game of your own from one of them, run `npm run new` from the root of the checkout with `--template novel`, `cafe` or `town`:

```sh
npm run new -- my-cafe --template cafe
```

That copies the example into `games/my-cafe`, without its tests. See [`ifloom new`](/docs/cli#ifloom-new).

This page walks through the smallest shape first, then a management game, then a life sim.

## One clock: the turn

Every game has a turn. It's `state.turn`, 0 in a new game, and `view.turn` for the screen. Everything the engine dates is dated in turns, such as when a scene was first seen (so `{ since }` counts turns), when a trigger last fired, when a collection entry or notice arrived, and how long a storyline stays closed.

Your game decides how long a turn is. A turn ends when the [`turn` effect](/docs/reference/effects#turn), `{ kind: 'turn' }`, runs, and any choice or activity can carry it (`by` ends several). A novel ends one per chapter.

A game that keeps a [calendar](/docs/plugins/calendar) lets the calendar end turns. The calendar says whether a turn is a period, a day or a week, and ends one each time its clock passes that boundary, through the same effect. With a turn of a day, going to bed with its `sleep` command moves the clock to the next morning and ends the turn. Small Town works that way.

Either way, the end of a turn runs the same steps. The counter goes up, the game's `resets` are put back, and its turn [rules](/docs/reference/rules) and the plugins' `onTurn` hooks run.

## A linear novel: The Letter

`examples/novel/src/game.ts` in the IFLoom repository is a whole game in one file. The Letter has three chapters and two endings. A letter for the last tenant lands on your mat, and what you do with it, and what you tell the neighbour downstairs, decides how the third chapter goes.

It declares no plugins, places, characters or clock. Its tests, `examples/novel/tests/novel.test.ts`, read it through. [Your first story](/docs/guide/first-story) builds a game of the same shape step by step.

### No world to declare

The base handed to [`loadGame`](/docs/reference/loader) needs only an `id` and a `title`. The Letter adds its first scene and nothing else:

```ts
loadGame([letter], { id: 'the-letter', title: 'The Letter', introScene: 'ch1.mat' })
```

With no [places plugin](/docs/plugins/places) there's no map, so there are no exits and nobody present. The only buttons are plugins' and the game's own `actions`, and The Letter has none of either. The [React UI](/docs/react)'s location panel draws nothing. If you leave out `introScene` too, a new game opens with no scene at all, and the screen is the game's title with an empty body.

### A name the player types

An [input](/docs/reference/inputs) asks for a name, and only until one is given:

```ts
inputs: [{ id: 'playerName', label: 'Your name', kind: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
```

The first chapter's choices wait on it with `when: { kv: 'playerName' }`, so the story doesn't move until the reader has typed something. The prose prints it as any kv key, with `{{playerName}}`: "You turn it over, `{{playerName}}`. The flap is barely stuck."

### One stat

```ts
stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }],
```

Opening the letter and telling the truth each pay `{ kind: 'stat', stat: 'courage', by: 1 }`. The braver ending is a choice that's only offered to a reader with enough courage:

```ts
{ id: 'hand', when: { stat: 'courage', gte: 3 }, effects: [{ kind: 'scene', scene: 'end.kept' }] },
```

### Choices the engine remembers

The engine counts every choice taken, by `scene#choice`, so a later chapter can ask about an earlier one with [`{ chose }`](/docs/reference/conditions#chose). Nobody has to set a kv key for it:

```ts
{ text: 'ch2.stairs.opened', when: { chose: 'ch1.mat#open' } },
{ text: 'ch2.stairs.shelved', when: { chose: 'ch1.mat#shelf' } },
```

The same condition can hide a choice. `blame` ("Only something that came open in the post.") is only there for a reader who opened the letter.

### A count

Each lie adds to a kv key with `{ kind: 'kv', key: 'fibs', by: 1 }` (`blame` adds 2), and the last chapter reads the count back as a range:

```ts
{ text: 'ch3.door.honest', when: { kv: 'fibs', lt: 1 } },
{ text: 'ch3.door.fib', when: { kv: 'fibs', is: 1 } },
{ text: 'ch3.door.tangle', when: { kv: 'fibs', gte: 2 } },
```

A kv key that was never set counts as 0, so the honest reader's line needs nothing written first.

### A chapter is a turn

Every choice that moves on to the next chapter ends a turn before it changes the scene:

```ts
{ id: 'truth', effects: [{ kind: 'stat', stat: 'courage', by: 1 }, { kind: 'turn' }, { kind: 'scene', scene: 'ch3.door' }] },
```

So `state.turn` is the chapter the reader has reached, counting from 0. Anything dated is dated in chapters, such as `{ since }`, a [trigger](/docs/reference/triggers) set to fire `once: 'turn'`, or a choice marked `once: { per: 'turn' }`. The Letter has no calendar, so there are no periods and no bed.

### Playing it

The file's default export is the game, with the loader's problems, and `start` gives [`ifloom playtest`](/docs/cli#ifloom-playtest) a reader who has already typed a name:

```ts
export const start = (game: Game) => startingState(game, { kv: { playerName: 'Sam' } })
```

The example's `playtest` script is `ifloom playtest --turns 3 --out playtest/read.txt`. With no plugin to say when or where, each screen in the transcript is headed by its turn alone.

### Drawing it: a page to read

The example draws the story with the React UI. Its `src/main.ts` starts the game with [`mountGame`](/docs/react#mountgame), which makes a [runner](/docs/reference/runner) with undo, saves and autosave, and draws it with a layout of its own, a single column to read. The other tabs draw the same page to read with plain DOM, Vue or Svelte, from the [templates](/docs/guide/frameworks) for each:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import { browserRunner, type View } from '@ifloom/engine'
import { theLetter } from './game.ts'
import './styles.css'

const runner = await browserRunner(theLetter().game)
const root = document.querySelector<HTMLElement>('#root')!

/** One column, like a book's: the chapter, its words, then the buttons. */
function draw(view: View): void {
  const page = document.createElement('article')
  page.append(Object.assign(document.createElement('h2'), { textContent: view.scene.title }))
  for (const beat of view.scene.beats) {
    if (beat.kind === 'text') page.append(Object.assign(document.createElement('p'), { textContent: beat.text }))
  }
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = Object.assign(document.createElement('button'), { textContent: choice.label, disabled: Boolean(choice.disabled) })
    button.onclick = () => runner.apply(choice.command)
    page.append(button)
  }
  root.replaceChildren(page)
}

runner.subscribe(() => draw(runner.view()))
draw(runner.view())
```

```tsx tab="React" tab-group="framework"
// src/layout.tsx
import { AchievementsButton, Game, GameMenu, InputFields, Notices, Overlay, PanelHost, RoomActions, SceneStage, StatList, Story, Title } from '@ifloom/react'

// No side column: the story is one centred column, like a book.
export function Layout() {
  return (
    <Game>
      <Story>
        <Title />
        <SceneStage />
        <InputFields />
        <RoomActions />
        <StatList />
        <GameMenu />
        <AchievementsButton />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import { theLetter } from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(theLetter(), { layout: Layout, pages: { subtitle: 'A novel in three chapters' } })
```

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue, with the vue template's src/runner.ts making its runner from theLetter().game -->
<script setup lang="ts">
import { runner, view } from './runner.ts'
</script>

<!-- One column, like a book's: the chapter, its words, then the buttons. -->
<template>
  <article>
    <h2>{{ view.scene.title }}</h2>
    <template v-for="(beat, at) in view.scene.beats" :key="at">
      <p v-if="beat.kind === 'text'">{{ beat.text }}</p>
    </template>
    <button
      v-for="(choice, at) in [...view.scene.choices, ...view.actions]"
      :key="at"
      :disabled="Boolean(choice.disabled)"
      @click="runner.apply(choice.command)"
    >
      {{ choice.label }}
    </button>
  </article>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte, with the svelte template's src/runner.ts making its runner from theLetter().game -->
<script lang="ts">
  import { runner, view } from './runner.ts'
</script>

<!-- One column, like a book's: the chapter, its words, then the buttons. -->
<article>
  <h2>{$view.scene.title}</h2>
  {#each $view.scene.beats as beat, at (at)}
    {#if beat.kind === 'text'}<p>{beat.text}</p>{/if}
  {/each}
  {#each [...$view.scene.choices, ...$view.actions] as choice, at (at)}
    <button disabled={Boolean(choice.disabled)} onclick={() => runner.apply(choice.command)}>{choice.label}</button>
  {/each}
</article>
```

The page to read needs no clock, room or people, because the game has none. The name the reader types is an [input](/docs/guide/frameworks#inputs), drawn as in the templates.

In the React UI, with `pages` on, the game opens on a title screen. Reaching either ending finishes the game (`finished: { scene: ['end.kept', 'end.posted'] }`), and both endings set a `readBefore` kv key that `carryOver` keeps. So once a reader has finished, the title screen offers New Game+, and chapter one has an extra line for a second read. [The title screen and settings](/docs/recipes/title-screen) covers how it works.

In React, the novel's [layout](/docs/react#layouts) has no `Sidebar`, so the page is one narrow column, like a book's. It has the title over the chapter, then the name to type, any buttons, the courage stat and the player's menu. You don't need to leave anything out by hand. With no calendar the title has no clock under it, and with no places there's no room, exits or people to draw. Its stylesheet imports the `paper` [preset](/docs/react/customising#1-pick-a-theme-preset), a serif page in one centred column. `npm run dev` in `examples/novel` plays it, and `npm run build` makes it one file.

## A management game: The Corner Café

`examples/cafe/src/game.ts` is the second whole game in one file. In The Corner Café the player runs a café a week at a time. Each week the till is counted, the staff are paid, and everyone gets a little more tired. Look after them and they stay, and a happy team gets a good review in the local paper. Its tests, `examples/cafe/tests/cafe.test.ts`, play it for a few weeks.

Like The Letter, it has no places, characters or clock. What it adds is [entities](/docs/reference/entities), the things the game keeps several of, each with numbers of its own.

### Kinds, and stats that belong to them

The café keeps two kinds of thing, staff and dishes. Each is declared once, with what the player calls one and what they call several:

```ts
kinds: [{ id: 'staff', label: 'Member of staff', plural: 'Staff' }, { id: 'dish', label: 'Dish', plural: 'Menu' }],
```

A stat with `of` belongs to a kind instead of to the player. The player has coins and a reputation. Every member of staff has a skill, a morale and a wage, and every dish has a price and a quality:

```ts
stats: [
  { id: 'coins', label: 'Coins', start: 120, min: -9999, max: 99999, format: '£{n}', spendable: true, lacking: 'Not enough in the till.' },
  { id: 'reputation', label: 'Reputation', start: 20 },
  { id: 'skill', label: 'Skill', of: 'staff', start: 1, min: 1, max: 10 },
  { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
  { id: 'wage', label: 'Wage', of: 'staff', start: 10, max: 50, format: '£{n}' },
  { id: 'price', label: 'Price', of: 'dish', start: 4, min: 1, max: 20, format: '£{n}' },
  { id: 'quality', label: 'Quality', of: 'dish', start: 2, min: 1, max: 5 },
],
```

The game opens with one cook and two dishes. Each entity starts with its kind's stats at their `start`, except where it says otherwise:

```ts
entities: [
  { id: 'ana', of: 'staff', name: 'Ana', stats: { skill: 5, wage: 12 } },
  { id: 'toast', of: 'dish', name: 'Cheese on toast', stats: { price: 4, quality: 2 } },
  { id: 'soup', of: 'dish', name: 'Soup of the day', stats: { price: 6, quality: 3 } },
],
```

So a new game has `state.stats` of `{ coins: 120, reputation: 20 }`, and Ana, at `state.entities.staff.ana`, has a skill of 5, a morale of 60 and a wage of 12. Content names her `'staff:ana'`. The [view](/docs/reference/view#entities) hands the UI each kind with its entries, and the [React UI](/docs/react/components#entitytable) draws a table of staff and one of the menu. The café puts them on the stage (see [Drawing it](#drawing-it-the-books-on-the-stage)).

### Reaching one of them

The same effects and conditions that change and test the player's stats take an `of` naming an entity. Better ingredients for the soup cost 40 coins, until it couldn't be any better:

```ts
{
  id: 'improveSoup',
  cost: { stats: { coins: 40 } },
  blocked: [{ when: { stat: 'quality', of: 'dish:soup', gte: 5 }, reason: 'It could not be better.' }],
  effects: [{ kind: 'stat', stat: 'quality', by: 1, of: 'dish:soup' }],
},
```

The quality is held to its range, 1 to 5, as a player's stat would be.

### Hiring in play

Putting a card in the window opens a scene of interviews, while there's room behind the counter. [`{ count }`](/docs/reference/conditions#count) asks how many of a kind there are:

```ts
{
  id: 'interview',
  blocked: [{ when: { count: 'staff', gte: 4 }, reason: 'There is no room behind the counter.' }],
  effects: [{ kind: 'scene', scene: 'hiring' }],
},
```

Each choice in the scene hires someone with a [`create`](/docs/reference/effects#create) effect, which gives a name and the stats that differ from their `start`:

```ts
choices: [
  { id: 'dev', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }, { kind: 'scene', scene: null }] },
  { id: 'fen', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Fen', stats: { skill: 7, wage: 18 } } }, { kind: 'scene', scene: null }] },
  { id: 'nobody', effects: [{ kind: 'scene', scene: null }] },
],
```

Someone created without an id gets the next number. Dev is `staff:#1`, and Fen, hired after him, is `staff:#2`. A number is never given twice, so if Dev leaves, the next person hired is `#3`. The scene's prose tells the player what they already pay, through a [custom value](/docs/reference/custom#values) printed with `{{v:payroll}}`: "Wages are 12 a week already."

### The end of the week

A single activity, sent by the game's Count the till and end the week button, runs the week:

```ts
{
  id: 'endWeek',
  effects: [
    { custom: 'takings' },
    { custom: 'wages' },
    // A week's work wears everyone down a little.
    { kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: -8, of: '$' }] },
    // Anyone at the end of their tether hands in their apron.
    { kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', entity: '$' }] },
    { kind: 'turn' },
  ],
},
```

It runs four steps, in order:

1. **Takings and wages.** Two [custom effects](/docs/reference/effects#computed-effects) the game declares work these out from the state. Takings multiply every dish's price by its quality, and work out how many covers the kitchen gets out from everyone's skill and the reputation. Wages add up every wage. Both go through [`entitiesOf`](/docs/reference/entities#entitiesof) and [`entityOf`](/docs/reference/entities#entityof):

   ```ts
   function total(state: GameState, kind: string, stat: string): number {
     return entitiesOf(state, kind).reduce((sum, ref) => sum + (entityOf(state, ref)?.stats[stat] ?? 0), 0)
   }

   wages: (state): EffectRef[] => [{ kind: 'stat', stat: 'coins', by: -total(state, 'staff', 'wage') }],
   ```

   Like any custom effect in a list, each runs in its turn, on the state the effects before it left. The wages come before anyone quits, so they include anyone who quits further down.
2. **Morale.** [`each`](/docs/reference/effects#each) runs the same effects for every one of a kind, with `'$'` standing for the one each time. Everyone loses 8 morale.
3. **Quitting.** `each` with `where` only runs for those the condition holds for. Anyone now below 20 is [removed](/docs/reference/effects#remove). Who an `each` visits is fixed when it starts, so removing someone partway through is safe.
4. **The turn.** [`{ kind: 'turn' }`](/docs/reference/effects#turn) ends the turn. A turn here is a week, and nobody ever sleeps.

In the first week there's only Ana. The kitchen gets out 24 covers, and the menu's prices times qualities add up to 26, so the takings are 24 × 26 ÷ 10, about £62. Less her £12 wage, the till goes from £120 to £170, and her morale drops from 60 to 52. Left alone, she quits at the end of the sixth week. The Buy the staff lunch button is the answer. It costs 25 coins and gives everyone 15 morale, with an `each` again.

### Watching the numbers

[Triggers](/docs/reference/triggers) watch a condition and act the first time it holds. With `{ count }`, a trigger can watch a kind:

```ts
{ id: 'empty', once: 'turn', when: { count: 'staff', lt: 1 }, effects: [{ kind: 'notify', title: 'Nobody to open up tomorrow.', tag: 'staff' }] },
{
  id: 'review',
  when: { count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 },
  effects: [{ kind: 'stat', stat: 'reputation', by: 10 }, { kind: 'notify', title: 'A glowing review in the local paper.', tag: 'press' }],
},
```

With `where`, `count` only counts those the condition holds for, with `'$'` again standing for each one. The review comes once, the first time two of the staff are happy to be there. The empty kitchen is noticed once a week, for as long as it lasts.

### Playing it

As with The Letter, `start` gives [`ifloom playtest`](/docs/cli#ifloom-playtest) a game with the doors already open, and the example's `playtest` script is `ifloom playtest --turns 8 --out playtest/season.txt`. Its numbers have a column for each of the player's stats, then one for each kind with how many there are, so the weeks the staff dwindled stand out. The [explorer](/docs/cli#explorer) runs each week's errands first and ends the week last. It finds the button that ends the turn by trying each one on the state.

### Drawing it: the books on the stage

In a management game the player mostly looks at the things being managed. So the café draws its tables under the scene and over the week's buttons. Each kind of entity is in `view.entities`, with a row for each one and its stats, so a table for each kind is a loop in any framework. The example uses the React UI, and keeps only the title, the coins and reputation, and the player's menu at the side:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import { browserRunner, type View } from '@ifloom/engine'
import { cornerCafe } from './game.ts'
import './styles.css'

const runner = await browserRunner(cornerCafe().game)
const root = document.querySelector<HTMLElement>('#root')!

/** A table for each kind, the staff and the menu: a row for each one, a cell for each stat. */
function drawTables(view: View): HTMLElement[] {
  return Object.values(view.entities).map((kind) => {
    const table = document.createElement('table')
    table.createCaption().textContent = kind.plural
    for (const entity of kind.entries) {
      const row = table.insertRow()
      row.insertCell().textContent = entity.name
      for (const stat of entity.stats) row.insertCell().textContent = `${stat.label}: ${stat.text}`
    }
    return table
  })
}

function draw(view: View): void {
  const scene = document.createElement('article')
  for (const beat of view.scene.beats) {
    if (beat.kind === 'text') scene.append(Object.assign(document.createElement('p'), { textContent: beat.text }))
  }
  const buttons = [...view.scene.choices, ...view.actions].map((choice) => {
    const button = Object.assign(document.createElement('button'), { textContent: choice.label, disabled: Boolean(choice.disabled) })
    button.onclick = () => runner.apply(choice.command)
    return button
  })
  root.replaceChildren(scene, ...drawTables(view), ...buttons)
}

runner.subscribe(() => draw(runner.view()))
draw(runner.view())
```

```tsx tab="React" tab-group="framework"
// src/layout.tsx
import { Clock, EntityTable, Game, GameMenu, InputFields, Notices, Overlay, PanelHost, RoomActions, SceneStage, Section, Sidebar, StatList, Story, Title, useWords } from '@ifloom/react'

// The books in the story, where the eye goes: the staff and the menu over the week's buttons.
export function Layout() {
  const words = useWords()
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <GameMenu />
        <Section id="stats" title={words('stats')} collapsible open>
          <StatList />
        </Section>
      </Sidebar>
      <Story>
        <SceneStage />
        <EntityTable />
        <RoomActions />
        <InputFields />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import { cornerCafe } from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(cornerCafe(), { layout: Layout })
```

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue, with the vue template's src/runner.ts making its runner from cornerCafe().game -->
<script setup lang="ts">
import { runner, view } from './runner.ts'
</script>

<template>
  <article>
    <template v-for="(beat, at) in view.scene.beats" :key="at">
      <p v-if="beat.kind === 'text'">{{ beat.text }}</p>
    </template>
  </article>
  <!-- A table for each kind, the staff and the menu: a row for each one, a cell for each stat. -->
  <table v-for="(kind, id) in view.entities" :key="id">
    <caption>{{ kind.plural }}</caption>
    <tbody>
      <tr v-for="entity in kind.entries" :key="entity.id">
        <td>{{ entity.name }}</td>
        <td v-for="stat in entity.stats" :key="stat.key">{{ stat.label }}: {{ stat.text }}</td>
      </tr>
    </tbody>
  </table>
  <button
    v-for="(choice, at) in [...view.scene.choices, ...view.actions]"
    :key="at"
    :disabled="Boolean(choice.disabled)"
    @click="runner.apply(choice.command)"
  >
    {{ choice.label }}
  </button>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte, with the svelte template's src/runner.ts making its runner from cornerCafe().game -->
<script lang="ts">
  import { runner, view } from './runner.ts'
</script>

<article>
  {#each $view.scene.beats as beat, at (at)}
    {#if beat.kind === 'text'}<p>{beat.text}</p>{/if}
  {/each}
</article>
<!-- A table for each kind, the staff and the menu: a row for each one, a cell for each stat. -->
{#each Object.entries($view.entities) as [id, kind] (id)}
  <table>
    <caption>{kind.plural}</caption>
    <tbody>
      {#each kind.entries as entity (entity.id)}
        <tr>
          <td>{entity.name}</td>
          {#each entity.stats as stat (stat.key)}<td>{stat.label}: {stat.text}</td>{/each}
        </tr>
      {/each}
    </tbody>
  </table>
{/each}
{#each [...$view.scene.choices, ...$view.actions] as choice, at (at)}
  <button disabled={Boolean(choice.disabled)} onclick={() => runner.apply(choice.command)}>{choice.label}</button>
{/each}
```

In the React layout, the [`EntityTable`](/docs/react/components#entitytable) draws a table for the staff and one for the menu, and [`RoomActions`](/docs/react/components#roomactions) the game's own buttons, from Count the till and end the week to Put a card in the window. Any part the game has nothing for draws nothing, so the same layout would do for a café with a calendar, whose clock would show under the title. Its stylesheet imports the `studio` [preset](/docs/react/customising#1-pick-a-theme-preset) in the café's green. `npm run dev` in `examples/cafe` plays it, and `npm run build` makes it one file.

### A calendar, if the game wants one

The café has no clock. A turn is a week because the `endWeek` activity ends one with `{ kind: 'turn' }`. A management game that wants days and a weekday too adds the [calendar](/docs/plugins/calendar) with a turn of a week. The calendar then ends a turn each time its clock passes into a new week, so the week's button moves the clock on rather than carrying a `{ kind: 'turn' }` of its own:

```ts
import { calendar } from '@ifloom/plugin-calendar'

// In the base passed to loadGame:
plugins: [calendar({ turn: 'week' })]
```

With it, `'title'` shows the day under the game's title, and the transcript of a playtest is headed by it.

## A life sim: Small Town

A life sim is the core with three plugins:

- [`@ifloom/plugin-calendar`](/docs/plugins/calendar) for the periods of a day, the weekday, a bed and a curfew, and how long a turn is.
- [`@ifloom/plugin-places`](/docs/plugins/places) for the map, walking, and where the player is.
- [`@ifloom/plugin-cast`](/docs/plugins/cast) for the people, their hours, who is in the room, talking and calling.

The game lists the calendar first, so the header reads the day before the place, as in `Day 1 · Monday morning · High Street`:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

// In the base passed to loadGame:
plugins: [calendar(), places({ start: 'flat' }), cast()]
```

A place keeps hours with its `blocked` list and the calendar's conditions. An activity that only happens in one place lists [`onlyAt(['cafe'])`](/docs/plugins/places#helpers) in its `blocked`. A character's [schedule](/docs/plugins/cast#where-people-are) says where they are while each condition holds, and they're in the room when the places plugin's `places/here` says the player is there too.

Each character is an [entity](/docs/reference/entities) of the kind `character`, so a relationship is a stat the game declares on that kind, `{ id: 'friendship', label: 'Friendship', of: 'character' }`. Content reads it with `{ stat: 'friendship', of: person('ava'), gte: 25 }`. [Small Town](/docs/guide/showcase) is a small life sim made that way, where a turn is a day. [A game with a world](/docs/guide/first-game) builds a smaller one step by step.

The React UI's default layout is made for a life sim, so Small Town's `src/layout.tsx` is [`DefaultLayout`](/docs/react#layouts) with two changes. It puts the [notice strip](/docs/react/components#noticestrip) at the top of the story, and it shows what you're wearing only at home, with `when`:

```tsx
<Section id="wardrobe" title={words('wardrobe')} collapsible when={at('flat')}>
  <WardrobeCard title={false} />
</Section>
```

Out and about, you get to it with the flat's Open the wardrobe action. Its activity's effect is `{ kind: 'panel', panel: 'wardrobe' }`, which opens the built-in wardrobe [panel](/docs/reference/panels). `src/main.tsx` passes the layout to `GameShell`:

```tsx
<GameShell runner={runner} layout={Layout} mods={{ store: modStore, problems, onChange: () => location.reload() }} />
```

At the side it draws the title, the calendar's day and period and the player's menu. Then come the stats and statuses in a section that folds, buttons that open the quests and the people met, the inventory, the achievements, cheats and devices. The story has the scene, the inputs, then where the player is, the exits, what to do and who is here, with the debug card at the foot.

### Pictures and clips in the story

Any shape of game can put pictures and short clips into its prose. They sit where you write them, between paragraphs:

```md
The kettle clicks off. Rain runs down the window.

[[img:flat/window|Rain on the window]]

You pour the tea and watch the steam curl up.

[[video:flat/steam]]
```

A clip plays like a GIF unless you add flags, such as `|controls` or `|sound`. The React UI draws both, and the player can click either one to see it large. Small Town's café also has a [stage](/docs/reference/media#the-stage): a picture of the counter while Ava is on shift, with a hotspot on her that talks to her. [Media](/docs/reference/media) covers pools of pictures, stages and the rules for video.

The core knows no person, place or time of day, so a novel carries none of these plugins, and a management game carries only the ones it uses. The plugins find each other by name. They ask for answers through `queries`, as the cast asks `places/here`. A plugin can also name the plugins it `cooperates` with, so content may use their conditions and effects in a game that leaves them out. The loader lets it pass, the condition is false and the effect does nothing. See [Writing a plugin](/docs/reference/plugins).
