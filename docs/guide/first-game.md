---
description: The second tutorial. Builds a small town game with a calendar, places to walk between and a character on a schedule, using the calendar, places and cast plugins, then drives it with apply, view and a runner.
---

# A game with a world

This is the second tutorial. [Your first story](/guide/first-story) built a novel with no plugins. This one is for games with a calendar, places and people, and it builds a small one from nothing: a house, a high street, and a café that keeps hours. Ruth, the baker, works the café counter on weekdays. You can talk to her, and you can buy a coffee.

The player carries a few coins and some energy, and the coffee spends one to buy the other. By the end you'll have a game, a starting state, a few commands played through `apply`, `dispatch` and `view`, and a runner driving it all with undo and autosave. The complete file is at the [bottom of the page](#the-whole-thing).

::: tip Before you start
Follow [Installation](/guide/installation) first. The game uses the engine, `@ifloom/engine`, and three plugins:

- [`@ifloom/plugin-calendar`](/plugins/calendar) keeps the days and the time of day.
- [`@ifloom/plugin-places`](/plugins/places) keeps the map and where the player is.
- [`@ifloom/plugin-cast`](/plugins/cast) keeps the people.

To build it as you read, start a blank game from the root of the checkout:

```sh
npm run new -- my-town
```

Then add the three plugins to `games/my-town/package.json`, next to `@ifloom/engine`, and run `npm install` at the root:

```json
"@ifloom/plugin-calendar": "0.0.0",
"@ifloom/plugin-places": "0.0.0",
"@ifloom/plugin-cast": "0.0.0"
```

In a game beside the checkout, add them as `file:` links instead, as [Installation](/guide/installation#plugins) shows. If you'd rather see a finished game of this shape first, `npm run new -- my-town --template town` copies [Small Town](/guide/showcase). See [`ifloom new`](/cli/#ifloom-new).
:::

## 1. Places

The core has no map, so places come from the places plugin. A location has an id, the exits you can walk to from it, and a `body`, which is the text shown while no scene is playing. The body is a list of blocks, each naming a piece of prose by key. You write the words themselves in step 4.

`kind` says what sort of place it is. `locked` is a list of conditions, each with a reason. While one holds, the plugin won't let the player in, and says why. That's how the café keeps hours, with a condition from the calendar: `period('morning', 'afternoon')` holds in the morning and the afternoon.

```ts
import { period } from '@ifloom/plugin-calendar'
import type { LocationDef } from '@ifloom/plugin-places'
import { here } from '@ifloom/plugin-cast'

const locations: LocationDef[] = [
  {
    id: 'house',
    name: 'Your house',
    tag: 'Home',
    kind: 'room',
    exits: ['high-street'],
    art: 'place/house',
    body: [{ text: 'house' }],
  },
  {
    id: 'high-street',
    name: 'The high street',
    tag: 'Town',
    kind: 'street',
    exits: ['house', 'cafe'],
    art: 'place/high-street',
    body: [{ text: 'high-street' }],
  },
  {
    id: 'cafe',
    name: 'The corner café',
    tag: 'Café',
    kind: 'venue',
    exits: ['high-street'],
    art: 'place/cafe',
    locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    body: [
      { text: 'cafe' },
      { text: 'cafe/ruth', when: here('ruth') },
      { text: 'cafe/empty', when: { not: here('ruth') } },
    ],
    actions: [
      { id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } },
    ],
  },
]
```

`exits` are one-way, so the street lists the café and the café lists the street.

A block with a `when` only shows while its [condition](/reference/conditions) holds. The cast's [`here('ruth')`](/plugins/cast#conditions) holds while Ruth's schedule puts her in the room the player is in, so the café reads differently with her behind the counter.

`actions` is the list of buttons the room offers. Here it offers the `coffee` activity you'll declare in step 3. `{ not: … }` turns the calendar's condition round, so the door is locked for the rest of the day.

The locations are content. In step 5 they go into the game's pack, under `data.places.locations`. There's more in [Places](/plugins/places#locationdef) and the calendar's [conditions](/plugins/calendar#conditions).

## 2. A character with a schedule

The core has no people either, so characters come from the cast plugin. A character has a schedule, somewhere to be when the schedule says nothing, and a scene that talking to them opens. The schedule is checked from the top, and the first entry whose `when` holds gives a place id from step 1. When none holds, the character is at their `home`. With no `home`, they're offstage, which means nowhere on the map.

```ts
import { period, weekday } from '@ifloom/plugin-calendar'
import type { CharacterDef } from '@ifloom/plugin-cast'

const ruth: CharacterDef = {
  id: 'ruth',
  name: 'Ruth',
  fullName: 'Ruth Okafor',
  role: 'Baker',
  pronouns: { they: 'she', them: 'her', their: 'her', theirs: 'hers' },
  hue: 30,
  schedule: [
    // Monday to Friday (0 is Monday), mornings and afternoons, at the café.
    { location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4), period('morning', 'afternoon')] } },
  ],
  talk: 'ruth.talk',
}
```

A `when` is any [condition](/reference/conditions), so a schedule can follow the story as well as the clock. `talk` names the scene the Talk button opens. It can also be a list of scenes, each with its own `when`, for a conversation that changes as the story does.

Like the locations, Ruth is content. In step 5 she goes into the game's pack, under `data.cast.characters`. Every field is in [`CharacterDef`](/plugins/cast#characterdef), and [Where people are](/plugins/cast#where-people-are) explains how a place and a time put someone in the room.

Each character is also an [entity](/reference/entities) of the kind `character`, so anything the game keeps about her can be a stat of her own. The next step gives her a friendship stat.

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

`of: 'character'` makes `friendship` a stat that every character keeps for themselves, starting at 0, rather than one the player has. Content says whose it is with `of: person('ruth')`. There's more in [Stats](/reference/stats) and the cast's [entities](/plugins/cast#each-one-is-an-entity).

An activity is something the player can do. It has a cost the engine charges before the effects apply, and requirements. Each requirement is a condition with the reason the player reads while it doesn't hold. The engine refuses the activity, with that reason, when a requirement fails or the player can't pay.

```ts
import type { ActivityDef } from '@ifloom/engine'
import { pass } from '@ifloom/plugin-calendar'
import { onlyAt } from '@ifloom/plugin-places'

const activities: ActivityDef[] = [
  { id: 'wait', effects: [pass(1)] },
  {
    id: 'coffee',
    requires: [onlyAt(['cafe'], 'There is no coffee here.')],
    cost: { stats: { coins: 3 } },
    effects: [pass(1), { kind: 'stat', key: 'energy', by: 20 }],
  },
]
```

`onlyAt` is the places plugin's requirement. The coffee can only be bought in the café, and anywhere else it's refused with `There is no coffee here.` `cost.stats` is what it spends, by stat id. `pass(1)` is the calendar's effect for one period of time going by. `wait` does nothing but pass a period, and in step 5 the game offers it as a button in every room. See [Activities and buttons](/reference/actions), the places plugin's [helpers](/plugins/places#helpers) and the calendar's [effects](/plugins/calendar#effects).

## 4. Scenes

A scene is one screen of story, with some text and the choices under it. Write it as data, a `DataScene`, and the engine renders it for you. Its body is a list of blocks, each naming a prose key and each with an optional [condition](/reference/conditions). Its choices carry their [effects](/reference/effects) as plain data.

The game opens on its intro scene, so start with that:

```ts
import type { DataScene } from '@ifloom/engine'

const intro: DataScene = {
  id: 'intro',
  title: 'Moving day',
  body: [{ text: 'intro' }],
  choices: [{ id: 'bed', effects: [{ kind: 'scene', id: null }] }],
}
```

`{ kind: 'scene', id: null }` closes the scene and leaves the player standing in the room.

Ruth's talk scene has a line that only appears once you're a regular, and a choice that pays once a turn. In this game a turn is a day, so that's once a day:

```ts
import { person } from '@ifloom/plugin-cast'

const ruthTalk: DataScene = {
  id: 'ruth.talk',
  speaker: 'ruth',
  body: [
    { text: 'ruth.talk/hello' },
    { text: 'ruth.talk/regular', when: { stat: 'friendship', of: person('ruth'), gte: 5 } },
  ],
  choices: [
    {
      id: 'chat',
      once: { per: 'turn', reason: 'She has a queue.' },
      effects: [
        { kind: 'stat', key: 'friendship', by: 5, of: person('ruth') },
        { kind: 'scene', id: null },
      ],
    },
    { id: 'bye', effects: [{ kind: 'scene', id: null }] },
  ],
}
```

`person('ruth')` is how content names Ruth's entity, `'character:ruth'`. The second line only appears once her friendship has reached 5. The `chat` choice adds 5 to it, once a turn. After that it stays on screen, greyed out with its reason, until the player has slept. `speaker: 'ruth'` draws the scene as Ruth, and the cast supplies her name, colour and portrait.

### The words

The words are kept apart from the structure, by key. A choice's label is looked up under `scene#choice` unless you name another key.

```ts
const prose: Record<string, string> = {
  'house': 'The kettle, the window, the post on the mat.',
  'high-street': 'Shopfronts, a bus stop, a bakery smell from the corner.',
  'cafe': 'Steam on the windows.',
  'cafe/ruth': 'Ruth is behind the counter, flour to the elbows.',
  'cafe/empty': 'The counter is empty.',
  'intro': 'The last box is in. {{playerName}}, you could sleep for a week.',
  'intro#bed': 'Go to bed',
  'ruth.talk/hello': '"Morning. What can I get you?"',
  'ruth.talk/regular': 'She is already reaching for your usual cup.',
  'ruth.talk#chat': 'Ask how the bread is going',
  'ruth.talk#bye': 'Just the coffee, thanks',
}
```

The first five keys are the locations' blocks from step 1, and the rest are the scenes'. <code v-pre>{{playerName}}</code> is a token. It's filled with the game's `playerName` variable when the line is shown. The name is a variable like any other, and step 6 sets it. The only special thing about `playerName` is that a save's [`SaveMeta`](/reference/saves#savemeta) reads it into its `player` field, for a load screen. [Prose and markup](/reference/prose#tokens) lists the other tokens, such as a counter or a value the game works out.

That's all a scene needs. You don't write a `render` function or wire the words to the scenes. The loader in the next step hands the prose to the game, and the engine renders every data scene from it. The places plugin renders every location's body the same way. There's more in [Scenes](/reference/scenes).

::: tip Scenes by hand
For the odd screen that doesn't fit blocks and choices, a scene can also be a plain object with a `render(state, ctx)` function, listed in the same `scenes` array. See [`Scene`](/reference/scenes#scene).
:::

## 5. The game

The game gathers everything. Content arrives as packs, which [`loadGame`](/reference/loader) merges into one game. Your game is the first pack, and a mod would be another. The locations and Ruth are plugins' content, so they go in the pack's `data`, under the plugin's id and the list's name: `data.places.locations` and `data.cast.characters`.

The second argument holds everything that isn't content, and only `id` and `title` are required. `introScene` is on screen from the first frame. `actions` are buttons offered in every room after the room's own, here the `wait` activity from step 3 and a bed to go to. A story that opens on its room leaves out `introScene`.

`plugins` is where the calendar, the places and the cast go in:

- `calendar()` builds the calendar. Its `start` says the game opens at night, on moving day. By default a turn is a day. `sleep()` is the calendar's command for going to bed.
- `places()` builds the places. Its `start` is where the player wakes up.
- `cast()` builds the cast.

A story with no places leaves out the places plugin, and one with nobody to talk to leaves out the cast.

```ts
import { SCHEMA, describeProblem, loadGame } from '@ifloom/engine'
import { calendar, sleep } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

export const { game, problems } = loadGame(
  [
    {
      id: 'core',
      schema: SCHEMA,
      stats,
      activities,
      scenes: [intro, ruthTalk],
      prose,
      data: { places: { locations }, cast: { characters: [ruth] } },
    },
  ],
  {
    id: 'new-in-town',
    title: 'New in Town',
    introScene: 'intro',
    plugins: [calendar({ start: { period: 'night' } }), places({ start: 'house' }), cast()],
    actions: [
      { id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } },
      { id: 'bed', label: 'Go to bed', command: sleep() },
    ],
  },
)

for (const problem of problems) console.warn(describeProblem(problem))
```

The loader checks every data scene as it goes, and each plugin checks its own content. A misspelt prose key, scene id or stat is reported, and so is an exit to a place that doesn't exist or `here('ruht')` naming a character the game doesn't have. Each problem comes with the pack it came from, and `problems` is empty here. The full list is under [the checks](/reference/loader#the-checks).

`validatePack` checks the rest of the game, such as two things with the same id, and returns an empty list when there's nothing wrong:

```ts
import { validatePack } from '@ifloom/engine'

console.log(validatePack(game)) // []
```

Put both in a test, so a broken id fails before anybody plays. `ifloom check` runs both too. See [The game](/reference/game).

List the calendar first in `plugins`. It moves the clock on when a turn ends, and plugins listed after it see the new day. The places come after it, so the header reads the day first and then the place. The cast can go anywhere in the list, because it asks the places plugin where the player is by name. See [Calendar](/plugins/calendar#install), [Places](/plugins/places#install) and [Cast](/plugins/cast#install).

## 6. Start a game

`startingState` builds a fresh save from the game. It is a plain object you can serialise as it is.

```ts
import { startingState } from '@ifloom/engine'

let state = startingState(game, { flags: { playerName: 'Sam' } })
```

`flags` are [variables](/reference/state#flags) written before the first scene, so the intro already reads "The last box is in. Sam, you could sleep for a week." A real game would ask the player for a name instead, with an [input](/reference/inputs) that writes `playerName`, as [Your first story](/guide/first-story#_6-a-name-the-player-types) does.

The new game starts on turn 0, in the house (the places plugin's `start`). The calendar starts on day 0, a Monday, at night. The intro scene is open, and each stat is at its `start`, so `state.stats` is `{ coins: 5, energy: 50 }`. Random draws come from a [seed](/reference/state#seed) made from the game's id, so a test plays the same way every time. A UI starting a new game passes a fresh `seed` of its own. See [Game state](/reference/state).

## 7. Play commands

Everything the player does is a [command](/reference/commands). `apply` runs one and tells you whether it took:

```ts
import { apply } from '@ifloom/engine'

const tried = apply(state, game, { type: 'activity', id: 'coffee' })
tried.ok      // false: the intro scene is still open
tried.refused // 'Finish this first.'
```

A refused command leaves the state untouched, so `apply` is how you tell a refusal from a command that did nothing. `refused` is diagnostic text, because the button for that command in the view already carries the player-facing reason. `Finish this first.` is the engine's own line. A game can reword it, and every other line the engine says, in the [strings table](/reference/strings).

When you don't need to know, `dispatch` returns just the next state:

```ts
import { dispatch } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'
import { talk } from '@ifloom/plugin-cast'

state = dispatch(state, game, { type: 'choose', id: 'bed' })
state = dispatch(state, game, sleep())                       // Tuesday morning: turn 1
state = dispatch(state, game, go('high-street'))
state = dispatch(state, game, go('cafe'))
state = dispatch(state, game, talk('ruth'))
state = dispatch(state, game, { type: 'choose', id: 'chat' })

state.entities.character.ruth.stats.friendship // 5
```

`go(id)` is the places plugin's command for walking through an exit, one step at a time. From the house, going to the café is refused with `You cannot get there from here.` `talk(id)` is the cast's [command](/plugins/cast#commands) for talking to someone in the room. Anywhere Ruth isn't, it's refused with `Ruth is not here.`

Try the same choice twice in one day and it is refused:

```ts
state = dispatch(state, game, talk('ruth'))
apply(state, game, { type: 'choose', id: 'chat' }).refused // 'She has a queue.'
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
screen.scene.beats            // [{ kind: 'say', who: 'character', text: 'Morning. What can I get you?' }, …]
screen.scene.choices          // [{ id: 'chat', label: 'Ask how the bread is going',
                              //    disabled: 'She has a queue.', command: { type: 'choose', id: 'chat' } }, …]
// Each plugin's part of the view is typed `unknown`, so cast it to the plugin's view type.
;(screen.plugins.places as PlacesView).exits // where you can walk, each with its `command`, and `disabled` if you can't (none while a scene is open)
;(screen.plugins.cast as CastView).present   // who is here, each with a Talk button (none while a scene is open)
screen.actions                // the room's buttons, then the game's, each with its `price` and `disabled` (none while a scene is open)
screen.statsById.coins.text   // '5c'
```

Every button in the view carries the `command` it sends. Your UI's whole loop is to render the view, and when a button is pressed, `dispatch` its command and render again.

```ts
import type { Command } from '@ifloom/engine'

// `render` is your UI: React, Svelte, plain DOM, a terminal.
function press(choice: { command: Command }) {
  state = dispatch(state, game, choice.command)
  render(view(state, game))
}
```

The body arrives already split into `beats` (narration, spoken lines and pictures), so the UI doesn't parse text. A paragraph wrapped in quotes is a spoken line. `when` is the header, joined from the plugins' labels in the order the game lists them: the calendar's day and time, then the places plugin's room. What a plugin hands the UI is under `plugins`, by its id. The room and its exits are at `plugins.places`, and who is in it at `plugins.cast`. See [The view](/reference/view), the places plugin's [view](/plugins/places#the-view) and the cast's [view](/plugins/cast#the-view).

## 9. Time moves

Leave the counter and the room comes back. The places plugin puts its body on screen while no scene is open, with its buttons: the café's coffee, then the game's Wait a while and Go to bed. The coffee button carries its price, written for the player, before anything is spent:

```ts
state = dispatch(state, game, { type: 'choose', id: 'bye' })
const room = view(state, game)
room.scene.body                // 'Steam on the windows.\n\nRuth is behind the counter, flour to the elbows.'
room.actions.map((a) => a.label) // ['Buy a coffee', 'Wait a while', 'Go to bed']
room.actions[0].price
// { stats: [{ id: 'coins', amount: 3, text: '3c' }], notes: ['until afternoon'] }
room.actions[2].disabled         // 'Too early.'
```

The stats in the price are the engine's, and the note is the calendar's, which prices every button that passes time. Bed is greyed out with the calendar's reason until the evening. Buying a coffee costs three coins and a period, and five coins don't stretch to a second one.

```ts
state = dispatch(state, game, { type: 'activity', id: 'coffee' }) // afternoon
state.stats                                                      // { coins: 2, energy: 70 }
apply(state, game, { type: 'activity', id: 'coffee' }).refused   // 'Not enough on you.'
```

Wait another period and it's evening. Ruth has gone for the day and the café has shut.

```ts
state = dispatch(state, game, { type: 'activity', id: 'wait' })   // evening
view(state, game).when       // 'Day 2 · Tuesday evening · The corner café'
;(view(state, game).plugins.cast as CastView).present // []
view(state, game).scene.body // 'Steam on the windows.\n\nThe counter is empty.'

state = dispatch(state, game, go('high-street'))
apply(state, game, go('cafe')).refused
// 'Closed. Opens tomorrow morning.'
```

Nobody wrote "Ruth goes home in the evening" as an event, or moved her. Her schedule, read against the calendar's clock, puts her somewhere else, and the café's lock shuts the door the same way. See the [calendar](/plugins/calendar), the [places](/plugins/places) and the [cast](/plugins/cast#where-people-are).

## 10. Drive it with a runner

Calling `apply` and `view` by hand is how the engine works, and it's enough for a test. A UI wants more around them, such as an undo button, saves and autosave. The [runner](/reference/runner) wraps all of that in one object. Undo and autosave are off until you turn them on.

Saves need somewhere to live. A driver says where, and the engine has no default, so the game picks one. In a browser, `localStorageDriver()` is the simplest and `indexedDbDriver()` has more room. In a test, use `memoryDriver()`.

```ts
import { createRunner, localStorageDriver, saves } from '@ifloom/engine'

const runner = createRunner(game, startingState(game, { flags: { playerName: 'Sam' } }), {
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
  if (!result.ok) console.warn(result.refused)
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

To see it in a browser, use the [React UI](/react/), `@ifloom/react`. Its `mountGame` makes a runner like that one and draws the game into the page's `#root` element: the scene, the sidebar and every button, greyed out with its reason. In a game made with `npm run new`, put steps 1 to 5 in `src/game.ts` and change `src/main.ts` to this:

```ts
import { mountGame } from '@ifloom/react'
import { game, problems } from './game.ts'
import './styles.css'

mountGame({ game, problems })
```

Then run `npm run dev -w my-town`. `mountGame` logs any of the loader's `problems` as warnings, and returns the runner. Its runner keeps 50 steps of undo, saves to `localStorage`, autosaves each turn and starts from a random seed. See [`mountGame`](/react/#mountgame) for the options.

::: details The long way: a runner of your own and GameShell
`mountGame` is a shortcut. When you want the runner exactly as you built it above, make it yourself and hand it to [`GameShell`](/react/#gameshell), the component `mountGame` draws:

```tsx
import { createRoot } from 'react-dom/client'
import { GameShell } from '@ifloom/react'

createRoot(document.getElementById('root')!).render(<GameShell runner={runner} />)
```

JSX needs a `.tsx` file, so rename `src/main.ts` to `src/main.tsx` and change the `<script>` in `index.html` to match. Small Town's `src/main.tsx` works this way.
:::

Save to a slot of your own, and load it back. Slots are names you pick:

```ts
await runner.save('1', 'Before the café')

runner.apply(go('cafe'))
runner.apply(talk('ruth'))  // a new scene: autosaved to 'auto'

const loaded = await runner.load('1')   // back on the high street, with a fresh undo history
if (typeof loaded === 'string') console.warn(loaded) // why it could not be read
```

The saves are kept under keys that start with the game's id, `new-in-town`, so another game opened in the same browser never reads them. See [Saves](/reference/saves) and [Shipping a game](/guide/shipping#saves).

## The whole thing

```ts
import {
  SCHEMA,
  apply,
  createRunner,
  describeProblem,
  dispatch,
  loadGame,
  memoryDriver,
  saves,
  startingState,
  validatePack,
  view,
  type ActivityDef,
  type DataScene,
  type StatDef,
} from '@ifloom/engine'
import { calendar, pass, period, sleep, weekday } from '@ifloom/plugin-calendar'
import { go, onlyAt, places, where, type LocationDef } from '@ifloom/plugin-places'
import { cast, here, person, talk, type CharacterDef } from '@ifloom/plugin-cast'

const locations: LocationDef[] = [
  {
    id: 'house',
    name: 'Your house',
    tag: 'Home',
    kind: 'room',
    exits: ['high-street'],
    art: 'place/house',
    body: [{ text: 'house' }],
  },
  {
    id: 'high-street',
    name: 'The high street',
    tag: 'Town',
    kind: 'street',
    exits: ['house', 'cafe'],
    art: 'place/high-street',
    body: [{ text: 'high-street' }],
  },
  {
    id: 'cafe',
    name: 'The corner café',
    tag: 'Café',
    kind: 'venue',
    exits: ['high-street'],
    art: 'place/cafe',
    locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    body: [
      { text: 'cafe' },
      { text: 'cafe/ruth', when: here('ruth') },
      { text: 'cafe/empty', when: { not: here('ruth') } },
    ],
    actions: [
      { id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } },
    ],
  },
]

const ruth: CharacterDef = {
  id: 'ruth',
  name: 'Ruth',
  fullName: 'Ruth Okafor',
  role: 'Baker',
  pronouns: { they: 'she', them: 'her', their: 'her', theirs: 'hers' },
  hue: 30,
  schedule: [
    { location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4), period('morning', 'afternoon')] } },
  ],
  talk: 'ruth.talk',
}

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

const activities: ActivityDef[] = [
  { id: 'wait', effects: [pass(1)] },
  {
    id: 'coffee',
    requires: [onlyAt(['cafe'], 'There is no coffee here.')],
    cost: { stats: { coins: 3 } },
    effects: [pass(1), { kind: 'stat', key: 'energy', by: 20 }],
  },
]

const intro: DataScene = {
  id: 'intro',
  title: 'Moving day',
  body: [{ text: 'intro' }],
  choices: [{ id: 'bed', effects: [{ kind: 'scene', id: null }] }],
}

const ruthTalk: DataScene = {
  id: 'ruth.talk',
  speaker: 'ruth',
  body: [
    { text: 'ruth.talk/hello' },
    { text: 'ruth.talk/regular', when: { stat: 'friendship', of: person('ruth'), gte: 5 } },
  ],
  choices: [
    {
      id: 'chat',
      once: { per: 'turn', reason: 'She has a queue.' },
      effects: [
        { kind: 'stat', key: 'friendship', by: 5, of: person('ruth') },
        { kind: 'scene', id: null },
      ],
    },
    { id: 'bye', effects: [{ kind: 'scene', id: null }] },
  ],
}

const prose: Record<string, string> = {
  'house': 'The kettle, the window, the post on the mat.',
  'high-street': 'Shopfronts, a bus stop, a bakery smell from the corner.',
  'cafe': 'Steam on the windows.',
  'cafe/ruth': 'Ruth is behind the counter, flour to the elbows.',
  'cafe/empty': 'The counter is empty.',
  'intro': 'The last box is in. {{playerName}}, you could sleep for a week.',
  'intro#bed': 'Go to bed',
  'ruth.talk/hello': '"Morning. What can I get you?"',
  'ruth.talk/regular': 'She is already reaching for your usual cup.',
  'ruth.talk#chat': 'Ask how the bread is going',
  'ruth.talk#bye': 'Just the coffee, thanks',
}

export const { game, problems } = loadGame(
  [
    {
      id: 'core',
      schema: SCHEMA,
      stats,
      activities,
      scenes: [intro, ruthTalk],
      prose,
      data: { places: { locations }, cast: { characters: [ruth] } },
    },
  ],
  {
    id: 'new-in-town',
    title: 'New in Town',
    introScene: 'intro',
    plugins: [calendar({ start: { period: 'night' } }), places({ start: 'house' }), cast()],
    actions: [
      { id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } },
      { id: 'bed', label: 'Go to bed', command: sleep() },
    ],
  },
)

// Check it, then play a little.
for (const problem of problems) console.warn(describeProblem(problem))
console.assert(validatePack(game).length === 0)

let state = startingState(game, { flags: { playerName: 'Sam' } })
state = dispatch(state, game, { type: 'choose', id: 'bed' })
state = dispatch(state, game, sleep())
state = dispatch(state, game, go('high-street'))
state = dispatch(state, game, go('cafe'))
state = dispatch(state, game, talk('ruth'))

const screen = view(state, game)
console.log(screen.scene.choices.map((choice) => choice.label))
// [ 'Ask how the bread is going', 'Just the coffee, thanks' ]

const chat = apply(state, game, { type: 'choose', id: 'chat' })
console.log(chat.ok, chat.state.entities.character.ruth.stats.friendship) // true 5

state = dispatch(chat.state, game, talk('ruth'))
state = dispatch(state, game, { type: 'choose', id: 'bye' })
state = dispatch(state, game, { type: 'activity', id: 'coffee' })
console.log(state.stats) // { coins: 2, energy: 70 }
console.log(apply(state, game, { type: 'activity', id: 'coffee' }).refused) // 'Not enough on you.'

// Now through a runner, as a UI would. In a browser, use localStorageDriver() or indexedDbDriver().
const runner = createRunner(game, startingState(game, { flags: { playerName: 'Sam' } }), {
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

Next, read the [core concepts](/guide/concepts) behind what you just used, or [Small Town](/guide/showcase), a bigger game in the same shape.
