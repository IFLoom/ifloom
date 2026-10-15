# Your first game

This page builds a small game from nothing: a house, a high street, and a café that keeps hours. Ruth, the baker, works the café counter on weekdays. You can talk to her, and you can buy a coffee.

The player carries a few coins and some energy, and the coffee spends one to buy the other. By the end you will have a game, a starting state, a few commands played through `apply`, `dispatch` and `view`, and a runner driving it all with undo and autosave. The complete file is at the [bottom of the page](#the-whole-thing).

::: tip Before you start
Follow [Installation](/guide/installation) first. Everything on this page comes from four imports: the engine, `@ifloom/engine`; its calendar, [`@ifloom/plugin-calendar`](/plugins/calendar), which keeps the days and the time of day; its places, [`@ifloom/plugin-places`](/plugins/places), which keeps the map and where the player is; and its cast, [`@ifloom/plugin-cast`](/plugins/cast), which keeps the people. Add the plugins beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-calendar": "file:../ifloom/packages/plugin-calendar",
    "@ifloom/plugin-places": "file:../ifloom/packages/plugin-places",
    "@ifloom/plugin-cast": "file:../ifloom/packages/plugin-cast"
  }
}
```
:::

## 1. Places

The engine core has no map of its own: places come from the places plugin. A location has an id, the exits you can walk to from it, and a `body` — the text shown while no scene is playing. The body is a list of **blocks**, each naming a piece of prose by key; you write the words themselves in step 4. `kind` says what sort of place it is. `locked` is a list of conditions, each with a reason: while one holds, the plugin refuses to let the player in and says why. That is how the café keeps hours, with a condition from the calendar: `period('morning', 'afternoon')` holds in the morning and the afternoon.

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

`exits` are one-way: the street lists the café and the café lists the street. A block with a `when` only shows while its [condition](/reference/conditions) holds: `here('ruth')`, the cast's [condition](/plugins/cast#conditions), holds while Ruth's schedule puts her in the room the places plugin says the player is in, so the café reads differently with her behind the counter. `actions` is the list of buttons the room offers; here it offers the `coffee` activity you will declare in step 3. `{ not: … }` turns the calendar's condition round, so the door is locked the rest of the day. The locations are content: in step 5 they go into the game's pack, under `data.places.locations`. More in [Places](/plugins/places#locationdef) and the calendar's [conditions](/plugins/calendar#conditions).

## 2. A character with a schedule

The engine core has no people of its own either: characters come from the cast plugin. A character has a schedule, somewhere to be when it says nothing, and a scene that talking to them opens. The schedule is checked top to bottom; the first entry whose `when` holds says where they are: a place id from step 1. When none holds, they are at their `home`, and with no `home`, offstage: nowhere on the map.

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

A `when` is any [condition](/reference/conditions), so a schedule can follow the story as well as the clock. `talk` names the scene the **Talk** button opens; it can also be a list of scenes, each with its own `when`, for a conversation that changes as the story does. Like the locations, Ruth is content: in step 5 she goes into the game's pack, under `data.cast.characters`. Every field is in [`CharacterDef`](/plugins/cast#characterdef), and how a place and a time put someone in the room in [Where people are](/plugins/cast#where-people-are).

Each character is also an [entity](/reference/entities) of the kind `character`, so whatever the game keeps about her is a stat of her own. The player's friendship with Ruth is the next step's.

## 3. Stats, and something to spend them on

The engine keeps no numbers of its own — not money, not energy. A game declares every stat it uses, with a label, where it starts and what range it keeps to:

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

`format` is how the number is written for the player. `spendable` says the stat is spent on things, so it shows in prices. `lacking` is the line the player reads when a cost needs more than they have. `of: 'character'` makes `friendship` a stat every character keeps for themselves, starting at 0, rather than one the player has: content names whose it is with `of: person('ruth')`. More in [Stats](/reference/stats) and the cast's [entities](/plugins/cast#each-one-is-an-entity).

An activity is something the player can do. It has a cost the engine charges before the effects apply, and requirements, each a condition with the reason the player reads while it does not hold. The engine refuses it, with that reason, when a requirement fails or the player cannot pay.

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

`onlyAt` is the places plugin's requirement: the coffee can only be bought in the café, and anywhere else it is refused with `There is no coffee here.` `cost.stats` is what it spends, by stat id. `pass(1)` is the calendar's effect for time going by: one period. `wait` does nothing but pass a period; in step 5 the game offers it as a button in every room. See [Actions](/reference/actions), the places plugin's [helpers](/plugins/places#helpers) and the calendar's [effects](/plugins/calendar#effects).

## 4. Scenes

A scene is one screen of story: some text and the choices under it. Write it as data — a `DataScene` — and the engine renders it for you. Its body is a list of **blocks**, each naming a prose key and each with an optional [condition](/reference/conditions); its choices carry their [effects](/reference/effects) as plain data.

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

Ruth's talk scene has a line that only appears once you are a regular, and a choice that pays once a turn — in this game, where a turn is a day, once a day:

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

`person('ruth')` is how content names Ruth's entity: `'character:ruth'`. The second line only appears once her friendship has reached 5. The `chat` choice adds 5 to it, once a turn; after that it stays on screen, greyed out with its reason, until the player has slept. `speaker: 'ruth'` draws the scene as Ruth: the cast answers with her name, colour and portrait.

### The words

The words live apart from the structure, by key. A choice's label is looked up under `scene#choice` unless you name another key.

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

The first five keys are the locations' blocks from step 1; the rest are the scenes'. <code v-pre>{{playerName}}</code> is a token: it is filled with the game's `playerName` variable when the line is shown. The engine has no idea of a player's name; it is a variable like any other, and step 6 sets it. There are a few more tokens — a counter, a value the game works out — listed in [Prose and markup](/reference/prose#tokens).

That is all a scene needs. You do not write a `render` function or wire the words to the scenes: the loader in the next step hands the prose to the game, and the engine renders every data scene — and the places plugin every location's body — from it. More in [Scenes](/reference/scenes).

::: tip Scenes by hand
For the odd screen that does not fit blocks and choices, a scene can also be a plain object with a `render(state, ctx)` function, listed in the same `scenes` array. See [`Scene`](/reference/scenes#scene).
:::

## 5. The game

The game gathers everything. Content arrives as **packs**, which [`loadGame`](/reference/loader) merges into one game — your game is the first pack, and a mod would be another. The locations and Ruth are plugins' content, so they go in the pack's `data`, under the plugin's id and the list's name: `data.places.locations` and `data.cast.characters`. The second argument holds what is not content. Only `id` and `title` are required. `introScene` is on screen from the first frame, and `actions` are buttons offered in every room after the room's own — here, the `wait` activity from step 3 and a bed to go to. A story that opens on its room leaves out `introScene`; see [Shapes of game](/guide/shapes).

`plugins` is where the calendar, the places and the cast go in. `calendar()` builds the calendar; `start` says the game opens at night, on moving day, and by default a turn is a day. `sleep()` is the calendar's command for going to bed. `places()` builds the places; `start` is where the player wakes up. `cast()` builds the cast. A story with no places leaves the places plugin out, and one with nobody to talk to the cast.

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
    id: 'corner-cafe',
    title: 'The Corner Café',
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

The loader checks every data scene as it goes — a block naming prose nobody wrote, a choice going to a scene that does not exist, a condition naming a stat or a storyline nobody declared — and has each plugin check its own content: the places plugin reports an exit to a place that does not exist, a location's body naming prose nobody wrote, and a place named in `onlyAt` that the game does not have; the cast reports a talk scene nobody declared, a schedule naming a place the places plugin does not know, and `here('ruht')` naming a character the game does not have. Each problem comes with the pack it came from. `problems` is empty here.

`validatePack` checks the rest of the game — two things with the same id, an intro scene that does not exist, a cost spending a stat nobody declared, a hand-built scene whose `render` throws — and returns an empty list when there are none:

```ts
import { validatePack } from '@ifloom/engine'

console.log(validatePack(game)) // []
```

Put both in a test, so a broken id fails before anybody plays. See [The game](/reference/game).

List the calendar first in `plugins`: it moves the clock on when a turn ends, and plugins listed after it see the new day. The places come after it, so the header reads the day first and the place after it. The cast can go anywhere in the list: it asks the places plugin where the player is by name. See [Calendar](/plugins/calendar#install), [Places](/plugins/places#install) and [Cast](/plugins/cast#install).

## 6. Start a game

`startingState` builds a fresh save from the game. It is a plain object you can serialise as it is.

```ts
import { startingState } from '@ifloom/engine'

let state = startingState(game, { flags: { playerName: 'Sam' } })
```

`flags` are [variables](/reference/state#flags) written before the first scene, so the intro already reads "The last box is in. Sam, you could sleep for a week." A real game would ask the player for a name instead, with an [input](/reference/inputs) that writes `playerName`.

The new game starts on turn 0, in the house (the places plugin's `start`), and the calendar starts on day 0, a Monday, at night, with the intro scene open and each stat at its `start`: `state.stats` is `{ coins: 5, energy: 50 }`. Its random draws come from a [seed](/reference/state#seed) made from the game's id, so a test plays the same way every time; a UI starting a new game passes a fresh `seed` of its own. See [Game state](/reference/state).

## 7. Play commands

Everything the player does is a [command](/reference/commands). `apply` runs one and tells you whether it took:

```ts
import { apply } from '@ifloom/engine'

const tried = apply(state, game, { type: 'activity', id: 'coffee' })
tried.ok      // false — the intro scene is still open
tried.refused // 'Finish this first.'
```

A refused command leaves the state untouched, so `apply` is how you tell a refusal from a command that did nothing. `refused` is diagnostic text; the button for that command in the view already carries the player-facing reason. `Finish this first.` is the engine's own line; a game can reword it, and every other line the engine says, in the [strings table](/reference/strings).

When you do not need to know, `dispatch` returns just the next state:

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

`go(id)` is the places plugin's command for walking through an exit, one step at a time: from the house, the café is refused with `You cannot get there from here.` `talk(id)` is the cast's [command](/plugins/cast#commands) for talking to someone in the room; anywhere Ruth is not, it is refused with `Ruth is not here.`

Try the same choice twice in one day and it is refused:

```ts
state = dispatch(state, game, talk('ruth'))
apply(state, game, { type: 'choose', id: 'chat' }).refused // 'She has a queue.'
```

## 8. Draw the view

`view` turns the state into everything a UI needs to draw. You never read the state to decide what is on screen; you read the view.

```ts
import { view } from '@ifloom/engine'
import type { CastView } from '@ifloom/plugin-cast'

const screen = view(state, game)

screen.when                   // 'Day 2 · Tuesday morning · The corner café'
screen.scene.title            // the scene's title, or the room's name
screen.scene.speaker?.name    // 'Ruth'
screen.scene.beats            // [{ kind: 'say', who: 'character', text: 'Morning. What can I get you?' }, …]
screen.scene.choices          // [{ id: 'chat', label: 'Ask how the bread is going',
                              //    disabled: 'She has a queue.', command: { type: 'choose', id: 'chat' } }, …]
screen.plugins.places.exits   // where you can walk, each with its `command`, and `disabled` if you cannot — none while a scene is open
;(screen.plugins.cast as CastView).present // who is here, each with a Talk button — none while a scene is open
screen.actions                // the room's buttons, then the game's, each with its `price` and `disabled` — none while a scene is open
screen.statsById.coins.text   // '5c'
```

Every button in the view carries the `command` it sends. Your UI's whole loop is: render the view, and when a button is pressed, `dispatch` its command and render again.

```ts
import type { Command } from '@ifloom/engine'

// `render` is your UI: React, Svelte, plain DOM, a terminal.
function press(choice: { command: Command }) {
  state = dispatch(state, game, choice.command)
  render(view(state, game))
}
```

The body arrives already split into `beats` — narration, spoken lines, pictures — so the UI does not parse text. A paragraph wrapped in quotes is a spoken line. `when` is the header, joined from the plugins' labels in the order the game lists them: the calendar's day and time, then the places plugin's room. What a plugin hands the UI is under `plugins`, by its id: the room and its exits are at `plugins.places`, and who is in it at `plugins.cast`. See [The view](/reference/view), the places plugin's [view](/plugins/places#the-view) and the cast's [view](/plugins/cast#the-view).

## 9. Time moves

Leave the counter and the room comes back: its body, which the places plugin puts on screen while no scene is open, and its buttons — the café's coffee, then the game's **Wait a while** and **Go to bed**. The coffee button carries its price, written for the player, before anything is spent:

```ts
state = dispatch(state, game, { type: 'choose', id: 'bye' })
const room = view(state, game)
room.scene.body                // 'Steam on the windows.\n\nRuth is behind the counter, flour to the elbows.'
room.actions.map((a) => a.label) // ['Buy a coffee', 'Wait a while', 'Go to bed']
room.actions[0].price
// { stats: [{ id: 'coins', amount: 3, text: '3c' }], notes: ['until afternoon'] }
room.actions[2].disabled         // 'Too early.'
```

The stats are the engine's; the note is the calendar's, which prices every button that passes time. Bed is greyed out with the calendar's reason until the evening. Buying a coffee costs three coins and a period. Five coins do not stretch to a second one.

```ts
state = dispatch(state, game, { type: 'activity', id: 'coffee' }) // afternoon
state.stats                                                      // { coins: 2, energy: 70 }
apply(state, game, { type: 'activity', id: 'coffee' }).refused   // 'Not enough on you.'
```

Wait another period, and it is evening: Ruth has gone for the day and the café has shut.

```ts
state = dispatch(state, game, { type: 'activity', id: 'wait' })   // evening
view(state, game).when       // 'Day 2 · Tuesday evening · The corner café'
;(view(state, game).plugins.cast as CastView).present // []
view(state, game).scene.body // 'Steam on the windows.\n\nThe counter is empty.'

state = dispatch(state, game, go('high-street'))
apply(state, game, go('cafe')).refused
// 'Closed. Opens tomorrow morning.'
```

Nobody wrote "Ruth goes home in the evening" as an event, or moved her. It falls out of her schedule, read against the calendar's clock, as the shut door falls out of the café's lock. See the [calendar](/plugins/calendar), the [places](/plugins/places) and the [cast](/plugins/cast#where-people-are).

## 10. Drive it with a runner

Calling `apply` and `view` by hand is how the engine works, and it is enough for a test. A UI wants more around them — an undo button, saves, autosave — and the [runner](/reference/runner) is that, in one object. Undo and autosave are off until you turn them on.

Saves need somewhere to live. A **driver** says where; the game picks one, and the engine has no default. In a browser, `localStorageDriver()` is the simplest; `indexedDbDriver()` has more room. In a test, `memoryDriver()`.

```ts
import { createRunner, localStorageDriver, saves } from '@ifloom/engine'

const runner = createRunner(game, startingState(game, { flags: { playerName: 'Sam' } }), {
  saves: saves(game, localStorageDriver()),
  history: { stopAtNewTurn: true }, // undo, but never back into the last turn
  autosave: { every: 'scene' },     // to the 'auto' slot, whenever the scene changes
})
```

The UI's loop becomes: send each button's command to the runner, and draw again whenever it says the state has changed.

```ts
runner.subscribe(() => render(runner.view()))

function press(button: { command: Command }) {
  const result = runner.apply(button.command)
  if (!result.ok) console.warn(result.refused)
}
```

Play the first morning again. Going to bed moves the calendar to the next morning and ends the turn, and with `stopAtNewTurn` that is as far back as undo reaches:

```ts
runner.apply({ type: 'choose', id: 'bed' })
runner.apply(sleep())                              // Tuesday morning: turn 1
runner.canUndo                                     // false: a new turn is a barrier
runner.apply(go('high-street'))
runner.undo()                                      // back in the house
runner.redo()                                      // on the high street again
```

Undo cannot be used to re-roll anything: every draw is seeded, so the same command from the same state gives the same result.

That loop is what the [base UI](/ui/) runs for you in a browser. Hand it the runner and it draws the scene, the sidebar and every button, greyed out with its reason:

```tsx
import { GameShell } from '@ifloom/ui'

createRoot(document.getElementById('app')!).render(<GameShell runner={runner} />)
```

Save to a slot of your own, and load it back. Slots are names you pick:

```ts
await runner.save('1', 'Before the café')

runner.apply(go('cafe'))
runner.apply(talk('ruth'))  // a new scene: autosaved to 'auto'

const loaded = await runner.load('1')   // back on the high street, with a fresh undo history
if (typeof loaded === 'string') console.warn(loaded) // why it could not be read
```

The saves are kept under keys that start with the game's id, `corner-cafe`, so another game opened in the same browser never reads them. See [Saves](/reference/saves) and [Shipping a game](/guide/shipping#saves).

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
    id: 'corner-cafe',
    title: 'The Corner Café',
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

Next: the [core concepts](/guide/concepts) behind what you just used.
