# Shapes of game

IFLoom is one engine for several shapes of game. Three are in view:

- **A linear novel.** Chapters in order, choices the story remembers, a few numbers kept quietly. No map, no clock, no cast to schedule.
- **A management game.** Money, and several of a thing — staff, dishes, rooms — each with numbers of its own, run a week at a time.
- **A social sim.** People who keep their own hours, friendships that grow, a town to wander.

What they share is the core: the turn, scenes and choices, conditions and effects, stats, entities, variables, collections, storylines, saves, the view and the plugin API. What tells them apart is how much world a game declares, and how the [base UI](/ui/) lays it out:

| Shape | The game | Plugins | Layout | Example |
|---|---|---|---|---|
| A linear novel | the core alone | none | [`READING_LAYOUT`](/ui/components#reading-layout): one column to read | [The Letter](#a-linear-novel-the-letter), `examples/novel` |
| A management game | the core, with [entities](/reference/entities) | none, or [`calendar({ turn: 'week' })`](/plugins/calendar) for days and weeks | its own: the tables on the stage | [The Corner Café](#a-management-game-the-corner-cafe), `examples/cafe` |
| A social sim | the core | [calendar](/plugins/calendar), [places](/plugins/places) and the [cast](/plugins/cast) | [`DEFAULT_LAYOUT`](/ui/components#default-layout), the side column and the stage | [Small Town](#social-games), `examples/showcase` |

Each example is a whole game you can play and ship: in its folder, `npm run dev` serves it in a browser and `npm run build` makes it one HTML file that opens from disk (see the [CLI](/cli/)). Each has a `src/game.ts` with the game, a `src/main.tsx` that draws it with [`GameShell`](/ui/#gameshell), and tests that play it and check its build.

This page walks through the smallest shape first, then a management game, then a social one.

## One clock: the turn

Every game has a **turn**: `state.turn`, 0 in a new game, and `view.turn` for the screen. Everything the engine dates is dated in turns — when a scene was first seen (so `{ since }` counts turns), when a trigger last fired, when a collection entry or notice arrived, how long a storyline stays closed.

What a turn is belongs to the game. One thing ends one: **`{ kind: 'turn' }`**, an [effect](/reference/effects#turn) any choice or activity can carry (`by` ends several). A novel ends one per chapter.

A game that keeps a [calendar](/plugins/calendar) lets the calendar end them. It says what a turn is — a period, a day or a week — and ends one each time time passes over that boundary, through the same effect: going to bed with its `sleep` command moves the clock to the next morning and, with a turn of a day, ends the turn. Small Town is that game.

Either way the end of a turn runs the same: the counter goes up, the game's `resets` are put back, and its turn [rules](/reference/rules) and plugins' `turn` hooks run.

## A linear novel: The Letter

`examples/novel/src/game.ts` in the IFLoom repository is a whole game in one file: **The Letter**, three chapters and two endings. A letter for the last tenant lands on your mat; what you do with it, and what you tell the neighbour downstairs, decides how the third chapter goes.

It declares no plugins, no places, no characters and no clock. Its tests, `examples/novel/tests/novel.test.ts`, read it through.

### No world to declare

The base handed to [`loadGame`](/reference/loader) needs only an `id` and a `title`. The Letter adds its first scene and nothing else:

```ts
loadGame([letter], { id: 'the-letter', title: 'The Letter', introScene: 'ch1.mat' })
```

With no [places plugin](/plugins/places) there is no map: no location, no exits, nobody present, and the only actions are plugins' buttons and the game's own `actions`, of which it has none. The [base UI](/ui/)'s location panel draws nothing. Leave out `introScene` too and a new game opens with no scene at all: the screen is the game's title with an empty body.

### A name the player types

An [input](/reference/inputs) asks for a name, and only until one is given:

```ts
inputs: [{ id: 'playerName', label: 'Your name', kind: 'text', maxLength: 20, when: { not: { flag: 'playerName' } } }],
```

The first chapter's choices wait on it with `when: { flag: 'playerName' }`, so the story does not move until the reader has typed something. The prose prints it as any variable, with <code v-pre>{{playerName}}</code>: "You turn it over, <code v-pre>{{playerName}}</code>. The flap is barely stuck."

### One stat

```ts
stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }],
```

Opening the letter and telling the truth each pay `{ kind: 'stat', key: 'courage', by: 1 }`. The braver ending is a choice only a reader with enough of it is offered:

```ts
{ id: 'hand', when: { stat: 'courage', gte: 3 }, effects: [{ kind: 'scene', id: 'end.kept' }] },
```

### Choices the engine remembers

The engine counts every choice taken, by `scene/choice`, so a later chapter can ask about an earlier one with [`{ chose }`](/reference/conditions) and nobody has to set a variable for it:

```ts
{ text: 'ch2.stairs/opened', when: { chose: 'ch1.mat/open' } },
{ text: 'ch2.stairs/shelved', when: { chose: 'ch1.mat/shelf' } },
```

The same condition hides a choice: `blame` — "Only something that came open in the post." — is there only for a reader who opened the letter.

### A count

Each lie adds to a variable with `{ kind: 'flag', key: 'lies', add: 1 }` (`blame` adds 2), and the last chapter reads the count back as a range:

```ts
{ text: 'ch3.door/honest', when: { flag: 'lies', lt: 1 } },
{ text: 'ch3.door/fib', when: { flag: 'lies', is: 1 } },
{ text: 'ch3.door/tangle', when: { flag: 'lies', gte: 2 } },
```

A variable that was never set counts as 0, so the honest reader's line needs nothing written first.

### A chapter is a turn

Every choice that moves on to the next chapter ends a turn before it changes the scene:

```ts
{ id: 'truth', effects: [{ kind: 'stat', key: 'courage', by: 1 }, { kind: 'turn' }, { kind: 'scene', id: 'ch3.door' }] },
```

So `state.turn` is the chapter the reader has reached, counting from 0, and anything dated — `{ since }`, a [trigger](/reference/triggers) set to fire `once: 'turn'`, a choice marked `once: { per: 'turn' }` — is dated in chapters. There is no clock to move: The Letter has no calendar, so no periods and no bed.

### Playing it

The file's default export is the game, and `start` gives [`ifloom playtest`](/cli/) a reader who has already typed a name:

```ts
export const start = (game: Game) => startingState(game, { flags: { playerName: 'Sam' } })
```

The example's `playtest` script is `ifloom playtest --turns 3 --out playtest/read.txt`. With no plugin to say when or where, each screen in the transcript is headed by its turn alone.

### Drawing it: a page to read

`src/main.tsx` builds a [runner](/reference/runner) with undo, saves and autosave, as Small Town's does, and draws it with the base UI's reading layout:

```tsx
import { GameShell, READING_LAYOUT } from '@ifloom/ui'

<GameShell runner={runner} layout={READING_LAYOUT} />
```

[`READING_LAYOUT`](/ui/#layouts) has no side column, so the page is one narrow column, as a book's is: the title over the chapter, then the name to type, any buttons, the courage stat and the player's menu. There is nothing to leave out by hand: with no calendar the title has no clock under it, and with no places there is no room, no exits and nobody present to draw. `npm run dev` in `examples/novel` plays it; `npm run build` makes it one file.

## A management game: The Corner Café

`examples/cafe/src/game.ts` is the second whole game in one file: **The Corner Café**. The player runs a café a week at a time. Each week the till is counted, the staff are paid, and everyone gets a little more tired; look after them and they stay, and a happy team gets a good review in the local paper. Its tests, `examples/cafe/tests/cafe.test.ts`, play it for a few weeks.

Like The Letter, it has no places, no characters and no clock. What it adds is [entities](/reference/entities): things the game keeps several of, each with numbers of its own.

### Kinds, and stats that belong to them

The café keeps two kinds of thing: staff and dishes. Each is declared once, with what the player calls one and what they call several:

```ts
kinds: [{ id: 'staff', label: 'Member of staff', plural: 'Staff' }, { id: 'dish', label: 'Dish', plural: 'Menu' }],
```

A stat with `of` belongs to a kind instead of to the player. The player has coins and a reputation; every member of staff has a skill, a morale and a wage; every dish has a price and a quality:

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

So a new game has `state.stats` of `{ coins: 120, reputation: 20 }`, and Ana, at `state.entities.staff.ana`, has a skill of 5, a morale of 60 and a wage of 12. Content names her `'staff:ana'`. The [view](/reference/view#entities) hands the UI each kind with its entries, and the [base UI](/ui/components#entitytable) draws a table of staff and one of the menu in the sidebar, under the player's own stats.

### Reaching one of them

The same effects and conditions that move and test the player's stats take an `of` naming an entity. Better ingredients for the soup cost 40 coins, until it could not be better:

```ts
{
  id: 'improveSoup',
  cost: { stats: { coins: 40 } },
  requires: [{ when: { stat: 'quality', of: 'dish:soup', lt: 5 }, reason: 'It could not be better.' }],
  effects: [{ kind: 'stat', key: 'quality', by: 1, of: 'dish:soup' }],
},
```

The quality is held to its range, 1 to 5, as a player's stat would be.

### Hiring in play

Putting a card in the window opens a scene of interviews, while there is room behind the counter. [`{ count }`](/reference/conditions#count) asks how many of a kind there are:

```ts
{
  id: 'interview',
  requires: [{ when: { count: 'staff', lt: 4 }, reason: 'There is no room behind the counter.' }],
  effects: [{ kind: 'scene', id: 'hiring' }],
},
```

Each choice in the scene hires someone with a [`create`](/reference/effects#create) effect. It gives a name and the stats that differ from their `start`:

```ts
choices: [
  { id: 'dev', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }, { kind: 'scene', id: null }] },
  { id: 'fen', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Fen', stats: { skill: 7, wage: 18 } } }, { kind: 'scene', id: null }] },
  { id: 'nobody', effects: [{ kind: 'scene', id: null }] },
],
```

Someone created without an id gets the next number: Dev is `staff:#1`, and Fen, hired after him, `staff:#2`. A number is never given twice, so if Dev leaves, the next person hired is `#3`. The scene's prose tells the player what they already pay, through a [custom value](/reference/custom#values) printed with <code v-pre>{{v:payroll}}</code>: "Wages are 12 a week already."

### The end of the week

A single activity, sent by the game's **Count the till and end the week** button, runs the week:

```ts
{
  id: 'endWeek',
  effects: [
    { custom: 'takings' },
    { custom: 'wages' },
    // A week's work wears everyone down a little.
    { kind: 'each', of: 'staff', effects: [{ kind: 'stat', key: 'morale', by: -8, of: '$' }] },
    // Anyone at the end of their tether hands in their apron.
    { kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', of: '$' }] },
    { kind: 'turn' },
  ],
},
```

Read it in order:

1. **Takings and wages are sums**, worked out from the state by two [custom effects](/reference/effects#computed-effects) the game declares. Takings add up every dish's price times its quality, and how many covers the kitchen gets out from everyone's skill and the reputation. Wages add up every wage. Both go through [`entitiesOf`](/reference/entities#entitiesof) and [`entityOf`](/reference/entities#entityof):

   ```ts
   function total(state: GameState, kind: string, stat: string): number {
     return entitiesOf(state, kind).reduce((sum, ref) => sum + (entityOf(state, ref)?.stats[stat] ?? 0), 0)
   }

   wages: (state): EffectRef[] => [{ kind: 'stat', key: 'coins', by: -total(state, 'staff', 'wage') }],
   ```

   Like any custom effect in a list, both are worked out from the state before the list runs, so the wages include anyone who quits further down.
2. **[`each`](/reference/effects#each) runs the same effects for every one of a kind**, with `'$'` as the one each time. Everyone loses 8 morale.
3. **`each` with `where`** runs only for those it holds for. Anyone now below 20 is [removed](/reference/effects#remove). Who an `each` visits is fixed when it starts, so removing someone partway through is safe.
4. **[`{ kind: 'turn' }`](/reference/effects#turn)** ends the turn. A turn here is a week, and nothing ever sleeps.

On the first week, with only Ana: 24 covers at £26 a cover makes £62, less her £12 wage, so the till goes from £120 to £170 and her morale from 60 to 52. Left alone, she quits at the end of the sixth week. A **Buy the staff lunch** button is the answer: it costs 25 coins and gives everyone 15 morale, with an `each` again.

### Watching the numbers

[Triggers](/reference/triggers) watch a condition and act the first time it holds. `{ count }` makes them watch a kind:

```ts
{ id: 'empty', once: 'turn', when: { count: 'staff', lt: 1 }, effects: [{ kind: 'notify', title: 'Nobody to open up tomorrow.', tag: 'staff' }] },
{
  id: 'review',
  when: { count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 },
  effects: [{ kind: 'stat', key: 'reputation', by: 10 }, { kind: 'notify', title: 'A glowing review in the local paper.', tag: 'press' }],
},
```

With `where`, `count` counts only those it holds for, `'$'` again being each one. The review comes once, the first time two of the staff are glad to be there. The empty kitchen is noticed once a week, for as long as it lasts.

### Playing it

As with The Letter, `start` gives [`ifloom playtest`](/cli/) a game with the doors already open, and the example's `playtest` script is `ifloom playtest --turns 8 --out playtest/season.txt`. Its numbers have a column for each of the player's stats, then one for each kind with how many there are, so the weeks the staff dwindled stand out. The [explorer](/cli/#explorer) runs each week's errands first and ends the week last: it tries each button on the state to find which one ends the turn.

### Drawing it: the books on the stage

In a management game the things being managed are what the player looks at, so the café puts its tables on the stage, under the scene and over the week's buttons, and keeps only the title, the coins and reputation and the player's menu at the side:

```tsx
<GameShell
  runner={runner}
  layout={{ sidebar: ['title', 'stats', 'menu'], stage: ['scene', 'entities', 'actions', 'inputs'] }}
/>
```

`'entities'` is the [`EntityTable`](/ui/components#entitytable), a table for the staff and one for the menu; `'actions'` is the game's own buttons, from **Count the till and end the week** to **Put a card in the window**. A layout lists only the parts the game uses, but any it lists that the game has nothing for draws nothing, so the same layout would do for a café with a calendar. `npm run dev` in `examples/cafe` plays it; `npm run build` makes it one file.

### A calendar, if the game wants one

The café has no clock: a turn is a week because the **endWeek** activity says so with `{ kind: 'turn' }`. A management game that wants days and a weekday too adds the [calendar](/plugins/calendar) with a turn of a week. The calendar then ends a turn each time its clock passes into a new week, so the week's own button moves the clock on rather than carrying a `{ kind: 'turn' }` of its own:

```ts
plugins: [calendar({ turn: 'week' })]
```

With it, `'title'` shows the day under the game's title, and the transcript of a playtest is headed by it.

## Social games

The social shape is the core with three plugins, and it is complete: [`@ifloom/plugin-calendar`](/plugins/calendar) for the periods of a day, the weekday, a bed and a curfew, and what a turn is; [`@ifloom/plugin-places`](/plugins/places) for the map, walking, and where the player is; and [`@ifloom/plugin-cast`](/plugins/cast) for the people, their hours, who is in the room, talking and calling. The game lists the calendar first, so the header reads `Day 1 · Monday morning · High Street`:

```ts
plugins: [calendar(), places({ start: 'house' }), cast()]
```

A place keeps hours with its `locked` list and the calendar's conditions; an activity that only happens in one place requires [`onlyAt(['cafe'])`](/plugins/places#helpers). A character's [schedule](/plugins/cast#where-people-are) says where they are while each condition holds, and they are in the room when that is where the places plugin's `places/here` says the player is. Each character is an [entity](/reference/entities) of the kind `character`, so a relationship is a stat the game declares on that kind: `{ id: 'friendship', label: 'Friendship', of: 'character' }`, read with `{ stat: 'friendship', of: person('ava'), gte: 25 }`. [Small Town](/guide/showcase) is a small social sim made that way, where a turn is a day. A management game that wants a calendar adds the plugin with `turn: 'week'`.

A social sim is the shape the base UI's own layout is for, so Small Town's `src/main.tsx` passes none:

```tsx
<GameShell runner={runner} />
```

That is [`DEFAULT_LAYOUT`](/ui/#layouts): at the side, the title with the calendar's day and period, the stats, the player's menu, the devices, then where the player is and the exits, who is here, what to do, the inventory and the wardrobe; on the stage, the scene, the inputs, the quests and the debug panel.

The core knows no person, no place and no time of day: it is the turn, scenes, stats, entities, variables, collections, storylines and the plugin API. So a novel carries none of the cast, and a management game carries only the plugins it uses. The plugins find one another by name: they ask for answers through `queries`, as the cast asks `places/here`, and a plugin names the ones it `cooperates` with, so content may name their conditions and effects in a game that leaves them out: the loader lets it pass, the condition is false and the effect does nothing. See the [plugin API](/reference/plugins) and [API status](/guide/status).
