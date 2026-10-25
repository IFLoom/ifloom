---
title: "A game with a world"
description: The second tutorial. Builds a small town game with a calendar, places to walk between and a character on a schedule, using the calendar, places and cast plugins, then drives it with apply, view and a runner.
---
This is the second tutorial. [Your first story](/docs/guide/first-story) built a novel with no plugins. This one is for games with a calendar, places and people, and it builds a small one from nothing: a house, a high street, and a café that keeps hours. Ruth, the baker, works the café counter on weekdays. You can talk to her, and you can buy a coffee.

The player carries a few coins and some energy, and the coffee spends one to buy the other. By the end you'll have a game, a starting state, a few commands played through `apply` and `view`, and a runner driving it all with undo and autosave. The complete file is at the [bottom of the page](#the-whole-thing).

:::tip[Before you start]
Follow [Installation](/docs/guide/installation) first. The game uses the engine, `@ifloom/engine`, and three plugins:

- [`@ifloom/plugin-calendar`](/docs/plugins/calendar) keeps the days and the time of day.
- [`@ifloom/plugin-places`](/docs/plugins/places) keeps the map and where the player is.
- [`@ifloom/plugin-cast`](/docs/plugins/cast) keeps the people.

To build it as you read, start a new game with the template for the way you draw it, then add the three plugins:

```sh tab="Plain JS" tab-group="framework"
npm create ifloom@latest my-town -- --template vanilla
cd my-town
npm install @ifloom/plugin-calendar @ifloom/plugin-places @ifloom/plugin-cast
```

```sh tab="React" tab-group="framework"
npm create ifloom@latest my-town
cd my-town
npm install @ifloom/plugin-calendar @ifloom/plugin-places @ifloom/plugin-cast
```

```sh tab="Vue" tab-group="framework"
npm create ifloom@latest my-town -- --template vue
cd my-town
npm install @ifloom/plugin-calendar @ifloom/plugin-places @ifloom/plugin-cast
```

```sh tab="Svelte" tab-group="framework"
npm create ifloom@latest my-town -- --template svelte
cd my-town
npm install @ifloom/plugin-calendar @ifloom/plugin-places @ifloom/plugin-cast
```

The React tab's template draws the game with the [React UI](/docs/react). The others draw it themselves, with no React. Most of this page is the engine on its own, which is the same in all four. [Installation](/docs/guide/installation) has the same commands for pnpm, yarn and bun.

If you'd rather see a finished game of this shape first, `--template town` copies [Small Town](/docs/guide/showcase). See [`ifloom new`](/docs/cli#ifloom-new).
:::

## 1. Places

The core has no map, so places come from the places plugin. A location is an entity you write with the plugin's `location()`. It has an id, a name, the exits you can walk to from it, and a `body`, which is the text shown while no scene is playing. The body is a list of blocks, each a piece of the words written in place, `text('…')`.

`desc` is the short line the UI shows under the place's name, for what sort of place it is. `blocked` is a list of conditions, each with a reason. While one holds, the plugin won't let the player in, and says why. That's how the café keeps hours, with a condition from the calendar: `period('morning', 'afternoon')` holds in the morning and the afternoon.

```ts
import { text } from '@ifloom/engine'
import { pass, period } from '@ifloom/plugin-calendar'
import { location } from '@ifloom/plugin-places'
import { here } from '@ifloom/plugin-cast'

const locations = [
  location({
    id: 'house',
    name: 'Your house',
    desc: 'Home',
    exits: ['high-street'],
    body: [text('The kettle, the window, the post on the mat.')],
  }),
  location({
    id: 'high-street',
    name: 'The high street',
    desc: 'Town',
    exits: ['house', 'cafe'],
    body: [text('Shopfronts, a bus stop, a bakery smell from the corner.')],
  }),
  location({
    id: 'cafe',
    name: 'The corner café',
    desc: 'Café',
    exits: ['high-street'],
    blocked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    body: [
      text('Steam on the windows.'),
      text('Ruth is behind the counter, flour to the elbows.', { when: here('ruth') }),
      text('The counter is empty.', { when: { not: here('ruth') } }),
    ],
    actions: [
      { id: 'coffee', label: 'Buy a coffee', cost: { stats: { coins: 3 } }, effects: [pass(1), { stat: 'energy', by: 20 }] },
    ],
  }),
]
```

`exits` are one-way, so the street lists the café and the café lists the street.

A block with a `when` only shows while its [condition](/docs/reference/conditions) holds. The cast's [`here('ruth')`](/docs/plugins/cast#conditions) holds while Ruth's schedule puts her in the room the player is in, so the café reads differently with her behind the counter.

`actions` is the list of buttons the room offers. Each is an [action](/docs/reference/actions): an id, the label on its button, what it costs and its effects. The coffee costs 3 coins, passes a period of time with the calendar's `pass(1)`, and gives 20 energy. Step 3 declares the coins and the energy. The engine charges the cost before the effects apply, and refuses the action, with the stat's `lacking` line, when the player can't pay. `{ not: … }` turns the calendar's condition round, so the door is locked for the rest of the day.

The locations are content, entities like any other. In step 5 they go into the game's content, in `entities`. There's more in [Places](/docs/plugins/places#the-location-trait) and the calendar's [conditions](/docs/plugins/calendar#conditions).

## 2. A character with a schedule

The core has no people either, so characters come from the cast plugin. A character is an [entity](/docs/reference/entities) written with the cast's `person()`: a name and a line about them, and the cast's own fields beside them. A character has a schedule, somewhere to be when the schedule says nothing, and a scene that talking to them opens. The schedule is checked from the top, and the first entry whose `when` holds gives a place id from step 1. When none holds, the character is at their `home`. With no `home`, they're offstage, which means nowhere on the map.

```ts
import { period, weekday } from '@ifloom/plugin-calendar'
import { person } from '@ifloom/plugin-cast'

const ruth = person({
  id: 'ruth',
  name: 'Ruth',
  fullName: 'Ruth Okafor',
  desc: 'Baker',
  pronouns: { they: 'she', them: 'her', their: 'her', theirs: 'hers' },
  ui: { hue: 30 },
  schedule: [
    // Monday to Friday (0 is Monday), mornings and afternoons, at the café.
    { location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4), period('morning', 'afternoon')] } },
  ],
  talk: 'ruth.talk',
})
```

A `when` is any [condition](/docs/reference/conditions), so a schedule can follow the story as well as the clock. `talk` names the scene the Talk button opens. It can also be a list of scenes, each with its own `when`, for a conversation that changes as the story does.

Like the locations, Ruth is content. In step 5 she goes into the game's content, under `entities`. Every field is in [`person`](/docs/plugins/cast#person), and [Where people are](/docs/plugins/cast#where-people-are) explains how a place and a time put someone in the room.

She's an entity of the kind `character`, which the cast declares, so anything the game keeps about her can be a stat of her own. The next step gives her a friendship stat.

## 3. Stats, and something to spend them on

The engine doesn't define any stats, not even money or energy. You declare every stat the game uses, with a label, where it starts and what range it keeps to:

```ts
import type { StatDef } from '@ifloom/engine'

const stats: StatDef[] = [
  {
    id: 'coins',
    label: 'Coins',
    start: 5,
    max: 999,
    format: '{n}c',
    spendable: true,
    lacking: 'Not enough on you.',
  },
  { id: 'energy', label: 'Energy', start: 50, spendable: true },
  { id: 'friendship', label: 'Friendship', of: 'character' },
]
```

`format` is how the number is written for the player. `spendable` says the stat is spent on things, so it shows in prices. `lacking` is the line the player reads when a cost needs more than they have.

`of: 'character'` makes `friendship` a stat that every character keeps for themselves, starting at 0, rather than one the player has. Content says whose it is with `of: character('ruth')`. There's more in [Stats](/docs/reference/stats) and the cast's [entities](/docs/plugins/cast#each-one-is-an-entity).

An [action](/docs/reference/actions) can also belong to the game rather than a room. One in the content's `actions` is offered in every room, after the room's own:

```ts
import type { ActionDef } from '@ifloom/engine'
import { pass, sleep } from '@ifloom/plugin-calendar'

const actions: ActionDef[] = [
  { id: 'wait', label: 'Wait a while', effects: [pass(1)] },
  { id: 'bed', label: 'Go to bed', command: sleep() },
]
```

`wait` does nothing but pass a period. `bed` sends a command rather than running effects: `sleep()` is the calendar's command for going to bed. An action can also have a `blocked` list, each entry a condition with the reason the player reads while it holds, and the engine refuses the action with that reason. See [Actions](/docs/reference/actions), and the calendar's [effects](/docs/plugins/calendar#effects).

## 4. Scenes

A scene is one screen of story, with some text and the choices under it. Write it as data, a `DataScene`, and the engine renders it for you. Its body is a list of blocks of words, each with an optional [condition](/docs/reference/conditions). Its choices carry their labels and their [effects](/docs/reference/effects) as plain data.

The game opens on its intro scene, so start with that:

```ts
import { text, type DataScene } from '@ifloom/engine'

const intro: DataScene = {
  id: 'intro',
  title: 'Moving day',
  body: [text('The last box is in. {{playerName}}, you could sleep for a week.')],
  choices: [{ id: 'bed', label: 'Go to bed', effects: [{ scene: null }] }],
}
```

`{ scene: null }` closes the scene and leaves the player standing in the room. `{{playerName}}` is a token. It's filled with the `playerName` key in the game's kv store when the line is shown. The name is a key like any other, and step 6 sets it. A save's [`SaveMeta`](/docs/reference/saves#savemeta) can show it on a load screen, as `playerName`, if the game's [`rules`](/docs/reference/rules) give a `saveName` that reads it. [Prose and markup](/docs/reference/prose#tokens) lists the other tokens, such as a counter or a value the game works out.

Ruth's talk scene has a line that only appears once you're a regular, and a choice that pays once a turn. In this game a turn is a day, so that's once a day:

```ts
import { character } from '@ifloom/plugin-cast'

const ruthTalk: DataScene = {
  id: 'ruth.talk',
  speaker: 'ruth',
  body: [
    text('"Morning. What can I get you?"'),
    text('She is already reaching for your usual cup.', { when: { stat: 'friendship', of: character('ruth'), gte: 5 } }),
  ],
  choices: [
    {
      id: 'chat',
      label: 'Ask how the bread is going',
      once: { per: 'turn', reason: 'She has a queue.' },
      effects: [
        { stat: 'friendship', by: 5, of: character('ruth') },
        { scene: null },
      ],
    },
    { id: 'bye', label: 'Just the coffee, thanks', effects: [{ scene: null }] },
  ],
}
```

`character('ruth')` is how content names Ruth's entity, `'character:ruth'`. The second line only appears once her friendship has reached 5. The `chat` choice adds 5 to it, once a turn. After that it stays on screen, greyed out with its reason, until the player has slept. `speaker: 'ruth'` draws the scene as Ruth, and the cast supplies her name, colour and portrait.

That's all a scene needs. You don't write a `render` function or wire the words to the scenes: the engine renders every data scene from its blocks, and the places plugin renders every location's body the same way. The words sit in the scenes they belong to, and a translation can give them other words without touching them (see [Translating a game](/docs/recipes/translating)). There's more in [Scenes](/docs/reference/scenes).

## 5. The game

The game gathers everything. [`loadGame`](/docs/reference/loader) merges your content into one game, here one object, and a mod would be a pack laid over it. The locations and Ruth are entities, so they all go in the content's `entities`.

The content's `introScene` is on screen from the first frame. A story that opens on its room leaves it out. The second argument, the base, holds what isn't content: the game's `id` and `title`, its plugins, and its own code in [`rules`](/docs/reference/rules) when it has any. Only `id` and `title` are required.

`plugins` is where the calendar, the places and the cast go in:

- `calendar()` builds the calendar. Its `start` says the game opens at night, on moving day. By default a turn is a day.
- `places()` builds the places. Its `start` is where the player wakes up.
- `cast()` builds the cast.

A story with no places leaves out the places plugin, and one with nobody to talk to leaves out the cast.

```ts
import { describeProblem, loadGame } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

export const { game, problems } = loadGame(
  [
    {
      stats,
      actions,
      scenes: [intro, ruthTalk],
      introScene: 'intro',
      entities: [...locations, ruth],
    },
  ],
  {
    id: 'new-in-town',
    title: 'New in Town',
    plugins: [calendar({ start: { period: 'night' } }), places({ start: 'house' }), cast()],
  },
)

for (const problem of problems) console.warn(describeProblem(problem))
```

The loader checks the whole game once it has merged it, plugins' content included. A misspelt scene id or stat is reported, and so is an exit to a place that doesn't exist or `here('ruht')` naming a character the game doesn't have. Each problem says where it is, and `problems` is empty here. The full list is on [Checking content](/docs/reference/checks).

Put `problems` in a test, so a broken id fails before anybody plays. `ifloom check` prints them too. A game you build by hand, without `loadGame`, is checked with [`checkGame`](/docs/reference/checks#checkgame) in the same way.

List the calendar first in `plugins`. It moves the clock on when a turn ends, and plugins listed after it see the new day. The places come after it, so the header reads the day first and then the place. The cast can go anywhere in the list, because it asks the places plugin where the player is by name. See [Calendar](/docs/plugins/calendar#install), [Places](/docs/plugins/places#install) and [Cast](/docs/plugins/cast#install).

## 6. Start a game

`startingState` builds a fresh save from the game. It is a plain object you can serialise as it is.

```ts
import { startingState } from '@ifloom/engine'

let state = startingState(game, { kv: { playerName: 'Sam' } })
```

`kv` holds keys written to the [kv store](/docs/reference/state#kv) before the first scene, so the intro already reads "The last box is in. Sam, you could sleep for a week." A real game would ask the player for a name instead, with an [input](/docs/reference/inputs) that writes `playerName`, as [Your first story](/docs/guide/first-story#6-a-name-the-player-types) does.

The new game starts on turn 0, in the house (the places plugin's `start`). The calendar starts on day 0, a Monday, at night. The intro scene is open, and each stat is at its `start`, so `state.stats` is `{ coins: 5, energy: 50 }`. Random draws come from a [seed](/docs/reference/state#seed) made from the game's id, so a test plays the same way every time. A UI starting a new game passes a fresh `seed` of its own. See [Game state](/docs/reference/state).

## 7. Play commands

Everything the player does is a [command](/docs/reference/commands). `apply` runs one and tells you whether it took:

```ts
import { apply } from '@ifloom/engine'

const tried = apply(state, game, { type: 'action', id: 'wait' })
tried.ok      // false: the intro scene is still open
tried.reason // 'Finish this first.'
```

A refused command leaves the state untouched, so `apply` is how you tell a refusal from a command that did nothing. `refused` is diagnostic text, because the button for that command in the view already carries the player-facing reason. `Finish this first.` is the engine's own line. A game can reword it, and every other line the engine says, in the [strings table](/docs/reference/strings).

When you don't need to know, take the next state from what `apply` returns:

```ts
import { apply, statValue } from '@ifloom/engine'
import { sleep } from '@ifloom/plugin-calendar'
import { go } from '@ifloom/plugin-places'
import { character, talk } from '@ifloom/plugin-cast'

state = apply(state, game, { type: 'choose', id: 'bed' }).state
state = apply(state, game, sleep()).state                       // Tuesday morning: turn 1
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('cafe')).state
state = apply(state, game, talk('ruth')).state
state = apply(state, game, { type: 'choose', id: 'chat' }).state

statValue(state, game, 'friendship', character('ruth')) // 5
```

`go(id)` is the places plugin's command for walking through an exit, one step at a time. From the house, going to the café is refused with `You cannot get there from here.` `talk(id)` is the cast's [command](/docs/plugins/cast#commands) for talking to someone in the room. Anywhere Ruth isn't, it's refused with `Ruth is not here.`

Try the same choice twice in one day and it is refused:

```ts
state = apply(state, game, talk('ruth')).state
apply(state, game, { type: 'choose', id: 'chat' }).reason // 'She has a queue.'
```

## 8. Draw the view

`view` turns the state into everything a UI needs to draw. You never read the state to decide what's on screen. You read the view.

```ts
import { view } from '@ifloom/engine'
import type { CastView } from '@ifloom/plugin-cast'
import type { PlacesView } from '@ifloom/plugin-places'

const screen = view(state, game)

screen.when                   // 'Day 2 · Tuesday morning · The corner café'
screen.scene.title            // the scene's title, or the room's name
screen.scene.speaker?.name    // 'Ruth'
screen.scene.beats            // [{ type: 'say', who: 'character', text: 'Morning. What can I get you?' }, …]
screen.scene.choices          // [{ id: 'chat', label: 'Ask how the bread is going',
                              //    disabled: 'She has a queue.', command: { type: 'choose', id: 'chat' } }, …]
// Each plugin's part of the view is typed `unknown`, so cast it to the plugin's view type.
;(screen.plugins.places as PlacesView).exits // where you can walk, each with its `command`, and `disabled` if you can't (none while a scene is open)
;(screen.plugins.cast as CastView).present   // who is here, each with a Talk button (none while a scene is open)
screen.actions                // the room's buttons, then the game's, each with its `price` and `disabled` (none while a scene is open)
screen.statsById.coins.text   // '5c'
```

Every button in the view carries the `command` it sends. Your UI's whole loop is to render the view, and when a button is pressed, `apply` its command and render again.

```ts
import type { Command } from '@ifloom/engine'

// `render` is your UI: React, Svelte, plain DOM, a terminal.
function press(choice: { command: Command }) {
  state = apply(state, game, choice.command).state
  render(view(state, game))
}
```

The body arrives already split into `beats` (narration, spoken lines and pictures), so the UI doesn't parse text. A paragraph wrapped in quotes is a spoken line. `when` is the header, joined from the plugins' labels in the order the game lists them: the calendar's day and time, then the places plugin's room. What a plugin hands the UI is under `plugins`, by its id. The room and its exits are at `plugins.places`, and who is in it at `plugins.cast`. See [The view](/docs/reference/view), the places plugin's [view](/docs/plugins/places#the-view) and the cast's [view](/docs/plugins/cast#the-view).

## 9. Time moves

Leave the counter and the room comes back. The places plugin puts its body on screen while no scene is open, with its buttons: the café's coffee, then the game's Wait a while and Go to bed. The coffee button carries its price, written for the player, before anything is spent:

```ts
state = apply(state, game, { type: 'choose', id: 'bye' }).state
const room = view(state, game)
room.scene.body                // 'Steam on the windows.\n\nRuth is behind the counter, flour to the elbows.'
room.actions.map((a) => a.label) // ['Buy a coffee', 'Wait a while', 'Go to bed']
room.actions[0].price
// { stats: [{ id: 'coins', amount: 3, text: '3c' }], notes: ['until afternoon'] }
room.actions[2].disabled         // 'Too early.'
```

The stats in the price are the engine's, and the note is the calendar's, which prices every button that passes time. Bed is greyed out with the calendar's reason until the evening. Buying a coffee costs three coins and a period, and five coins don't stretch to a second one. A button sends its action by id, and a room's action has the places plugin's id in front, `places/coffee`:

```ts
state = apply(state, game, { type: 'action', id: 'places/coffee' }).state // afternoon
state.stats                                                           // { coins: 2, energy: 70 }
apply(state, game, { type: 'action', id: 'places/coffee' }).reason   // 'Not enough on you.'
```

Wait another period and it's evening. Ruth has gone for the day and the café has shut.

```ts
state = apply(state, game, { type: 'action', id: 'wait' }).state   // evening
view(state, game).when       // 'Day 2 · Tuesday evening · The corner café'
;(view(state, game).plugins.cast as CastView).present // []
view(state, game).scene.body // 'Steam on the windows.\n\nThe counter is empty.'

state = apply(state, game, go('high-street')).state
apply(state, game, go('cafe')).reason
// 'Closed. Opens tomorrow morning.'
```

Nobody wrote "Ruth goes home in the evening" as an event, or moved her. Her schedule, read against the calendar's clock, puts her somewhere else, and the café's lock shuts the door the same way. See the [calendar](/docs/plugins/calendar), the [places](/docs/plugins/places) and the [cast](/docs/plugins/cast#where-people-are).

## 10. Drive it with a runner

Calling `apply` and `view` by hand is how the engine works, and it's enough for a test. A UI wants more around them, such as an undo button, saves and autosave. The [runner](/docs/reference/runner) wraps all of that in one object. Undo and autosave are off until you turn them on.

Saves need somewhere to live. A driver says where, and the engine has no default, so the game picks one. In a browser, `localStorageDriver()` is the simplest and `indexedDbDriver()` has more room. In a test, use `memoryDriver()`.

```ts
import { localStorageDriver } from '@ifloom/browser'
import { createRunner, saves } from '@ifloom/engine'

const runner = createRunner(game, startingState(game, { kv: { playerName: 'Sam' } }), {
  saves: saves(game, localStorageDriver()),
  history: { stopAtNewTurn: true }, // undo, but never back into the last turn
  autosave: { every: 'scene' },     // to the 'auto' slot, whenever the scene changes
})
```

The UI's loop becomes sending each button's command to the runner, and drawing again whenever it says the state has changed.

```ts
runner.subscribe(() => render(runner.view()))

function press(button: { command: Command }) {
  const result = runner.apply(button.command)
  if (!result.ok) console.warn(result.reason)
}
```

Play the first morning again. Going to bed moves the calendar to the next morning and ends the turn, and with `stopAtNewTurn` that's as far back as undo reaches:

```ts
runner.apply({ type: 'choose', id: 'bed' })
runner.apply(sleep())                              // Tuesday morning: turn 1
runner.canUndo                                     // false: a new turn is a barrier
runner.apply(go('high-street'))
runner.undo()                                      // back in the house
runner.redo()                                      // on the high street again
```

Undo can't be used to re-roll anything. Every draw is seeded, so the same command from the same state gives the same result.

To see it in a browser, put steps 1 to 5 in `src/game.ts`, and make its default export a [game module](/docs/cli#the-game-module), `defineGame({ build: () => loadGame(content, base) })`, so the CLI can check it too. Build the game from it with `module.build()`. That's fine for a game this size. When it grows, split the content into files in `src/world/` and `src/story/` as [Organising a game](/docs/guide/organising) shows. Put the runner in `src/runner.ts`, exported as `runner`. Then draw its view. Each tab below matches one of the templates:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import type { View } from '@ifloom/engine'
import type { PlacesView } from '@ifloom/plugin-places'
import { runner } from './runner.ts'
import './styles.css'

const root = document.querySelector<HTMLElement>('#root')!

function add<K extends keyof HTMLElementTagNameMap>(tag: K, text: string): HTMLElementTagNameMap[K] {
  const element = root.appendChild(document.createElement(tag))
  element.textContent = text
  return element
}

function draw(view: View): void {
  root.replaceChildren()
  if (view.when) add('p', view.when)
  add('h2', view.scene.title)
  for (const beat of view.scene.beats) if (beat.type === 'text') add('p', beat.text)

  // The scene's choices, or the room's buttons and its exits when no scene is open.
  const exits = (view.plugins.places as PlacesView | undefined)?.exits ?? []
  for (const button of [...view.scene.choices, ...view.actions, ...exits]) {
    const element = add('button', 'label' in button ? button.label : `Go to ${button.name}`)
    element.disabled = Boolean(button.disabled)
    element.title = button.disabled ?? ''
    element.onclick = () => runner.apply(button.command)
  }
  add('p', view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · '))
}

runner.subscribe(() => draw(runner.view()))
draw(runner.view())
```

```tsx tab="React" tab-group="framework"
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { GameShell } from '@ifloom/react'
import { runner } from './runner.ts'
import './styles.css'

// The whole React UI: the scene, the sidebar with the clock, the place and
// who is here, and every button, greyed out with its reason.
createRoot(document.getElementById('root')!).render(<GameShell runner={runner} />)
```

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue -->
<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue'
import type { PlacesView } from '@ifloom/plugin-places'
import { runner } from './runner.ts'

// The view, replaced whole after every change of state.
const view = shallowRef(runner.view())
onUnmounted(runner.subscribe(() => (view.value = runner.view())))

// The room's exits, while no scene is open.
const exits = computed(() => (view.value.plugins.places as PlacesView | undefined)?.exits ?? [])
</script>

<template>
  <p v-if="view.when">{{ view.when }}</p>
  <h2>{{ view.scene.title }}</h2>
  <template v-for="(beat, at) in view.scene.beats" :key="at">
    <p v-if="beat.type === 'text'">{{ beat.text }}</p>
  </template>
  <button
    v-for="(choice, at) in [...view.scene.choices, ...view.actions]"
    :key="at"
    :disabled="Boolean(choice.disabled)"
    :title="choice.disabled"
    @click="runner.apply(choice.command)"
  >
    {{ choice.label }}
  </button>
  <button v-for="exit in exits" :key="exit.id" :disabled="Boolean(exit.disabled)" @click="runner.apply(exit.command)">
    Go to {{ exit.label }}
  </button>
  <p>{{ view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ') }}</p>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte -->
<script lang="ts">
  import type { PlacesView } from '@ifloom/plugin-places'
  import { runner } from './runner.ts'

  // The view, replaced whole after every change of state.
  let view = $state.raw(runner.view())
  $effect(() => runner.subscribe(() => (view = runner.view())))

  // The room's exits, while no scene is open.
  const exits = $derived((view.plugins.places as PlacesView | undefined)?.exits ?? [])
</script>

{#if view.when}<p>{view.when}</p>{/if}
<h2>{view.scene.title}</h2>
{#each view.scene.beats as beat, at (at)}
  {#if beat.type === 'text'}<p>{beat.text}</p>{/if}
{/each}
{#each [...view.scene.choices, ...view.actions] as choice, at (at)}
  <button disabled={Boolean(choice.disabled)} title={choice.disabled} onclick={() => runner.apply(choice.command)}>
    {choice.label}
  </button>
{/each}
{#each exits as exit (exit.id)}
  <button disabled={Boolean(exit.disabled)} onclick={() => runner.apply(exit.command)}>Go to {exit.label}</button>
{/each}
<p>{view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ')}</p>
```

Then run `npm run dev`. In the Vue and Svelte templates, `src/main.ts` already mounts `App` on `#root`. The React tab needs JSX, so rename `src/main.ts` to `src/main.tsx` and change the `<script>` in `index.html` to match. Small Town's `src/main.tsx` works this way.

The people in the room, and the button to talk to each, are in `view.plugins.cast`. [Building UI for plugins](/docs/recipes/plugin-ui) draws them, and [Your own UI in any framework](/docs/guide/frameworks) draws the rest of the view.

With React, [`mountGame`](/docs/react#mountgame) is a shortcut for all of this. `mountGame({ game, problems })` logs the loader's `problems` as warnings, makes a runner with [`browserRunner`](/docs/browser#browserrunner) (50 steps of undo, saves in `localStorage`, an autosave each turn and a random seed), draws `GameShell` into `#root` and resolves to the runner. The other templates call `browserRunner` themselves.

Save to a slot of your own, and load it back. Slots are names you pick:

```ts
await runner.save('1', 'Before the café')

runner.apply(go('cafe'))
runner.apply(talk('ruth'))  // a new scene: autosaved to 'auto'

const loaded = await runner.load('1')   // back on the high street, with a fresh undo history
if (!loaded.ok) console.warn(loaded.reason) // why it could not be read
```

The saves are kept under keys that start with the game's id, `new-in-town`, so another game opened in the same browser never reads them. See [Saves](/docs/reference/saves) and [Shipping a game](/docs/guide/shipping#saves).

## The whole thing

```ts
import {
  apply,
  createRunner,
  describeProblem,
  loadGame,
  memoryDriver,
  saves,
  startingState,
  statValue,
  text,
  view,
  type ActionDef,
  type DataScene,
  type StatDef,
} from '@ifloom/engine'
import { calendar, pass, period, sleep, weekday } from '@ifloom/plugin-calendar'
import { go, location, places, where } from '@ifloom/plugin-places'
import { cast, character, here, person, talk } from '@ifloom/plugin-cast'

const locations = [
  location({
    id: 'house',
    name: 'Your house',
    desc: 'Home',
    exits: ['high-street'],
    body: [text('The kettle, the window, the post on the mat.')],
  }),
  location({
    id: 'high-street',
    name: 'The high street',
    desc: 'Town',
    exits: ['house', 'cafe'],
    body: [text('Shopfronts, a bus stop, a bakery smell from the corner.')],
  }),
  location({
    id: 'cafe',
    name: 'The corner café',
    desc: 'Café',
    exits: ['high-street'],
    blocked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    body: [
      text('Steam on the windows.'),
      text('Ruth is behind the counter, flour to the elbows.', { when: here('ruth') }),
      text('The counter is empty.', { when: { not: here('ruth') } }),
    ],
    actions: [
      { id: 'coffee', label: 'Buy a coffee', cost: { stats: { coins: 3 } }, effects: [pass(1), { stat: 'energy', by: 20 }] },
    ],
  }),
]

const ruth = person({
  id: 'ruth',
  name: 'Ruth',
  fullName: 'Ruth Okafor',
  desc: 'Baker',
  pronouns: { they: 'she', them: 'her', their: 'her', theirs: 'hers' },
  ui: { hue: 30 },
  schedule: [
    { location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4), period('morning', 'afternoon')] } },
  ],
  talk: 'ruth.talk',
})

const stats: StatDef[] = [
  {
    id: 'coins',
    label: 'Coins',
    start: 5,
    max: 999,
    format: '{n}c',
    spendable: true,
    lacking: 'Not enough on you.',
  },
  { id: 'energy', label: 'Energy', start: 50, spendable: true },
  { id: 'friendship', label: 'Friendship', of: 'character' },
]

const actions: ActionDef[] = [
  { id: 'wait', label: 'Wait a while', effects: [pass(1)] },
  { id: 'bed', label: 'Go to bed', command: sleep() },
]

const intro: DataScene = {
  id: 'intro',
  title: 'Moving day',
  body: [text('The last box is in. {{playerName}}, you could sleep for a week.')],
  choices: [{ id: 'bed', label: 'Go to bed', effects: [{ scene: null }] }],
}

const ruthTalk: DataScene = {
  id: 'ruth.talk',
  speaker: 'ruth',
  body: [
    text('"Morning. What can I get you?"'),
    text('She is already reaching for your usual cup.', { when: { stat: 'friendship', of: character('ruth'), gte: 5 } }),
  ],
  choices: [
    {
      id: 'chat',
      label: 'Ask how the bread is going',
      once: { per: 'turn', reason: 'She has a queue.' },
      effects: [
        { stat: 'friendship', by: 5, of: character('ruth') },
        { scene: null },
      ],
    },
    { id: 'bye', label: 'Just the coffee, thanks', effects: [{ scene: null }] },
  ],
}

export const { game, problems } = loadGame(
  [
    {
      stats,
      actions,
      scenes: [intro, ruthTalk],
      introScene: 'intro',
      entities: [...locations, ruth],
    },
  ],
  {
    id: 'new-in-town',
    title: 'New in Town',
    plugins: [calendar({ start: { period: 'night' } }), places({ start: 'house' }), cast()],
  },
)

// Check it, then play a little.
for (const problem of problems) console.warn(describeProblem(problem))
console.assert(problems.length === 0)

let state = startingState(game, { kv: { playerName: 'Sam' } })
state = apply(state, game, { type: 'choose', id: 'bed' }).state
state = apply(state, game, sleep()).state
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('cafe')).state
state = apply(state, game, talk('ruth')).state

const screen = view(state, game)
console.log(screen.scene.choices.map((choice) => choice.label))
// [ 'Ask how the bread is going', 'Just the coffee, thanks' ]

const chat = apply(state, game, { type: 'choose', id: 'chat' })
console.log(chat.ok, statValue(chat.state, game, 'friendship', character('ruth'))) // true 5

state = apply(chat.state, game, talk('ruth')).state
state = apply(state, game, { type: 'choose', id: 'bye' }).state
state = apply(state, game, { type: 'action', id: 'places/coffee' }).state
console.log(state.stats) // { coins: 2, energy: 70 }
console.log(apply(state, game, { type: 'action', id: 'places/coffee' }).reason) // 'Not enough on you.'

// Now through a runner, as a UI would. In a browser, use localStorageDriver() or indexedDbDriver() from @ifloom/browser.
const runner = createRunner(game, startingState(game, { kv: { playerName: 'Sam' } }), {
  saves: saves(game, memoryDriver()),
  history: { stopAtNewTurn: true },
  autosave: { every: 'scene' },
})
runner.subscribe(() => console.log(runner.view().scene.title))

runner.apply({ type: 'choose', id: 'bed' })
runner.apply(sleep())
console.log(runner.canUndo) // false
runner.apply(go('high-street'))
runner.undo()
console.log(where(runner.state)) // 'house'
runner.redo()

await runner.save('1', 'Before the café')
runner.apply(go('cafe'))
runner.apply(talk('ruth'))
await runner.load('1')
console.log(where(runner.state)) // 'high-street'
```

Next, read the [core concepts](/docs/guide/concepts) behind what you just used, or [Small Town](/docs/guide/showcase), a bigger game in the same shape.
