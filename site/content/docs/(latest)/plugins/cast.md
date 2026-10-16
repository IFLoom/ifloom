---
title: "Cast"
---
`@ifloom/plugin-cast` gives a game its people. Characters keep their own hours, so the plugin knows who's in the room with the player. The player can talk to them and call them, and the game can keep stats about each one, such as a friendship.

You'd want it for any game with people the player meets and gets to know, such as the neighbours in a life sim. A novel where people only appear inside scenes usually doesn't need it.

The engine's core has no people of its own: no character list, no talk or call command and no "is she here" condition. This plugin adds them. In a game without it, a scene's `speaker` is only drawn by name if some other plugin knows the id (see [Speakers](#speakers)).

## What a character is

A character is a [`CharacterDef`](#characterdef): content in a pack's `data.cast.characters`, so a mod can add someone or change them. Each character is also an [entity](/docs/reference/entities) of the kind `character`, which the plugin declares for you. That means anything your game keeps about a person, such as a friendship, trust or a debt, is a stat you declare with `of: 'character'`, and every character keeps their own:

```ts
import { type StatDef } from '@ifloom/engine'

const stats: StatDef[] = [{ id: 'friendship', label: 'Friendship', of: 'character' }]
```

Content then names whose stat it is with `of`, using [`person()`](#helpers) to build the reference:

```ts
import { type Condition, type Effect } from '@ifloom/engine'
import { person } from '@ifloom/plugin-cast'

const closeToAva: Condition = { stat: 'friendship', of: person('ava'), gte: 25 }          // 'character:ava'
const chat: Effect = { kind: 'stat', key: 'friendship', by: 5, of: person('ava') }
```

The plugin keeps no state of its own. Where people are is worked out from their schedules each time, and what the game keeps about them lives in their entities.

Here's where each people-related part of a game comes from:

- **The people** are a list of [`CharacterDef`](#characterdef)s.
- **Their hours** are each one's `schedule`, written with the [calendar](/docs/plugins/calendar)'s conditions, such as `schedule: [{ location: 'high-street', when: period('morning') }]`.
- **Who's in the room** is worked out from those schedules and where the [places](/docs/plugins/places) plugin says the player is. It's shown at [`view.plugins.cast`](#the-view).
- **Talking** is the [`talk()`](#commands) command, which the view hands the UI as each person's **Talk** button.
- **A phone call** is the [`call()`](#commands) command, which works from anywhere.
- **A relationship** is a stat declared `of: 'character'`, as above.
- **"Only when Ava is here"** is the [`here()`](#conditions) condition.

```ts
import {
  cast, talk, call, here, isAt, hasMet, person, charactersOf, characterById, OFFSTAGE,
  type CastOptions, type CharacterDef, type TalkOption, type CastView, type PersonView,
} from '@ifloom/plugin-cast'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-cast": "0.0.0"
  }
}
```

Then add `cast()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

const plugins = [calendar(), places({ start: 'flat' }), cast()]
```

The plugin [cooperates](/docs/reference/plugins#cooperates) with `places` and `calendar`. It asks the places plugin where the player is, and schedules are usually written with the calendar's conditions. Neither is required. Without places, nobody is ever in the room, but calls still work. Without the calendar, a schedule that names `calendar/...` conditions still loads, and those conditions never hold.

Where the player is comes from a [query](/docs/reference/plugins#queries) asked by name, so the order of `plugins` doesn't change who's here. The order only matters when two plugins both know a [speaker](#speakers) id, and then the one listed first answers.

## cast

```ts
function cast(options?: CastOptions): DefinedPlugin<null>
```

Builds the plugin, with the id `cast`. Call it once, when you build the game. It keeps nothing in the save, so its state is `null`.

### CastOptions

```ts
type CastOptions = {
  kind?: string
  label?: string
  plural?: string
}
```

| Field | What it is | If left out |
|---|---|---|
| `kind` | The id of the [kind](/docs/reference/entities#kinddef) each character is an entity of. Stats for characters are declared `of` it, and content names one as `<kind>:<id>`. | `character` |
| `label` | What one of them is called, used as the kind's `label`. | `Person` |
| `plural` | What more than one are called, used as the kind's `plural`. | `People` |

```ts
import { cast } from '@ifloom/plugin-cast'

cast({ kind: 'neighbour', label: 'Neighbour', plural: 'Neighbours' })
```

A kind that the game declares itself with the same id replaces the plugin's (see [Kinds and entities](/docs/reference/plugins#kinds-and-entities)), so that's another way to rename it. The options are code, not content, so a mod can't change them.

## Characters

### CharacterDef

```ts
type CharacterDef = {
  id: string
  name: string
  fullName?: string
  role?: string
  pronouns?: Record<string, string>
  hue?: number
  portrait?: string
  tags?: string[]
  home?: string
  schedule?: { location: string; when?: Condition }[]
  talk?: string | TalkOption[]
  call?: { scene?: string; when?: Condition; busy?: string }
  storyline?: string
  met?: Condition
  stats?: Record<string, number>
  flags?: Record<string, FlagValue>
}
```

| Field | What it is | If left out |
|---|---|---|
| `id` | What content names them by, as in `talk('ava')`, `here('ava')` or `person('ava')`. It's also their entity's id and their [speaker](#speakers) id. Unique among the characters. | Required. |
| `name` | Shown over their lines, on their card, and in refusals such as `Ava is not here.` It's also their entity's `name`. | Required. |
| `fullName` | Their whole name, for the UI. | `name` |
| `role` | A word or two about them, such as `Runs the café`. | `null` in the view. |
| `pronouns` | For prose that needs them, such as `{ they: 'she', them: 'her' }`. The plugin gives them no meaning and doesn't pass them to the view. | None. |
| `hue` | A colour for their lines, as a hue from 0 to 360. | `null`, which leaves it to the UI. |
| `portrait` | Their picture, through [`artSrc`](/docs/reference/prose#artsrc). A bare name under `art/` is taken as a `.jpg`. | `art/character/<id>.jpg` |
| `tags` | Labels for your own code. The plugin doesn't read them. | None. |
| `home` | Where they are when no `schedule` entry holds: a place id from the [places plugin](/docs/plugins/places#locations). | [`OFFSTAGE`](#offstage), meaning nowhere. |
| `schedule` | Where they are while each `when` holds. See [Where people are](#where-people-are). | Always at `home`. |
| `talk` | The scene that talking to them opens, or a list of [`TalkOption`](#talkoption)s, of which the first whose `when` holds is used. | They can't be talked to, and have no **Talk** button. |
| `call` | Whether they can be reached from anywhere. See [Calls](#calls). | They can't be called. |
| `storyline` | The id of their [storyline](/docs/reference/storylines). While it's closed, they won't talk or pick up. | Never closed. |
| `met` | Whether the player has met them, as a [condition](/docs/reference/conditions). | Having seen one of their `talk` or `call` scenes. |
| `stats` | Their [entity](/docs/reference/entities#entitydef)'s stats at the start, where they differ from each stat's own `start`. | Each stat's `start`. |
| `flags` | Their entity's variables at the start. | `{}` |

Inside a character's own conditions, `'$'` stands for them. Every `when` in `schedule`, `talk` and `call`, and `met` itself, is run with `'$'` bound to the character's entity (by [`bindCurrent`](/docs/reference/entities#bindcurrent)). So `{ stat: 'friendship', of: '$', gte: 25 }` in Ava's `talk` is Ava's friendship. Anywhere else, name them in full with `of: person('ava')`.

### TalkOption

```ts
type TalkOption = { scene: string; when?: Condition; label?: string }
```

One way a conversation can open. It opens `scene` while `when` holds (always, if you leave `when` out), and `label` goes on the **Talk** button (the [`cast/talk`](#strings) string, `Talk`, if left out). [`cast/talk`](#commands) opens the first option in the list whose `when` holds, so put the particular ones first and a plain one last. This is the showcase's Ava, with a label added:

```ts
import { at } from '@ifloom/plugin-places'
import { type TalkOption } from '@ifloom/plugin-cast'

const talk: TalkOption[] = [
  { scene: 'ava.river', when: { all: [at('park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Sit with Ava' },
  { scene: 'ava.hi' },
]
```

`talk: 'ava.hi'` is short for `talk: [{ scene: 'ava.hi' }]`.

### In a pack

Characters go in a [pack](/docs/reference/loader#pack)'s `data`, under `cast.characters`. These are Ava and Sam from the [showcase](/docs/guide/showcase) (`examples/showcase/src/content/town.ts`), in a cut-down town with just enough places and scenes for the [worked example](#a-worked-example):

```ts
import { SCHEMA, type DataScene, type Pack } from '@ifloom/engine'
import { period, weekday } from '@ifloom/plugin-calendar'
import { at, type LocationDef } from '@ifloom/plugin-places'
import { person, type CharacterDef } from '@ifloom/plugin-cast'

const ava: CharacterDef = {
  id: 'ava',
  name: 'Ava',
  fullName: 'Ava Marsh',
  role: 'Runs the café',
  pronouns: { they: 'she', them: 'her', their: 'her', theirs: 'hers' },
  hue: 20,
  portrait: 'art/character/ava.svg',
  home: 'park',
  // At the counter through the working day, by the river in the evening.
  schedule: [{ location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4, 5), period('morning', 'afternoon')] } }],
  // By the river, once she's a friend, a different conversation from Ava at the till.
  talk: [{ scene: 'ava.river', when: { all: [at('park'), { stat: 'friendship', of: '$', gte: 25 }] } }, { scene: 'ava.hi' }],
  storyline: 'ava',
  call: { scene: 'ava.call', when: period('evening', 'night'), busy: 'She’s busy at the counter. Try her this evening.' },
}

const sam: CharacterDef = {
  id: 'sam',
  name: 'Sam',
  role: 'Neighbour',
  pronouns: { they: 'they', them: 'them', their: 'their', theirs: 'theirs' },
  hue: 200,
  portrait: 'art/character/sam.svg',
  home: 'park',
  schedule: [{ location: 'high-street', when: period('morning') }],
  talk: 'sam.hi',
  storyline: 'sam',
}

const place = (id: string, name: string, exits: string[]): LocationDef =>
  ({ id, name, tag: 'Small Town', kind: 'street', art: '', exits, body: [{ text: `place.${id}` }] })
const chat = (id: string, who: string, by: number): DataScene => ({
  id, speaker: who, body: [{ text: id }],
  choices: [{ id: 'bye', effects: [{ kind: 'stat', key: 'friendship', by, of: person(who) }, { kind: 'scene', id: null }] }],
})

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  storylines: [{ id: 'ava', name: 'Ava' }, { id: 'sam', name: 'Sam' }],
  scenes: [chat('ava.hi', 'ava', 10), chat('ava.river', 'ava', 5), chat('ava.call', 'ava', 3), chat('sam.hi', 'sam', 5)],
  prose: {
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.park': 'The river is slow and brown.',
    'ava.hi': 'Ava looks up from the till and grins.',
    'ava.river': 'Ava is on the bench, feeding the ducks.',
    'ava.call': '"Oh, hello! I’m by the river."',
    'sam.hi': 'Sam is walking a dog that is clearly not theirs.',
    'ava.hi#bye': 'Leave her to it', 'ava.river#bye': 'Sit with her', 'ava.call#bye': 'Say goodnight', 'sam.hi#bye': 'Pat the dog',
  },
  data: {
    places: {
      locations: [
        place('high-street', 'High Street', ['cafe', 'park']),
        place('cafe', 'The Corner Café', ['high-street']),
        place('park', 'Riverside Park', ['high-street']),
      ],
    },
    cast: { characters: [ava, sam] },
  },
}
```

The [loader](/docs/reference/loader#pack) merges characters by id, as it merges scenes. A later pack's character with the same id replaces the earlier one whole, so a mod can add someone or rewrite them. The game's characters, merged, are [`charactersOf(game)`](#helpers).

### Each one is an entity

The plugin declares the kind (through its [`kinds`](/docs/reference/plugins#kinds-and-entities)) and one entity of it per character (through `entities`). Each entity is named by the character's `name` and starts with their `stats` and `flags`. A stat the game declares `of: 'character'` is then kept on every character, and you read and write it as any [entity's stat](/docs/reference/stats#entity-stats):

```ts
import { startingState, type Condition, type Effect, type Game } from '@ifloom/engine'
import { person } from '@ifloom/plugin-cast'

declare const game: Game   // built from the pack above

startingState(game).entities.character
// { ava: { name: 'Ava', stats: { friendship: 0 }, flags: {} },
//   sam: { name: 'Sam', stats: { friendship: 0 }, flags: {} } }

const isFriend: Condition = { stat: 'friendship', of: person('ava'), gte: 25 }
const warmer: Effect = { kind: 'stat', key: 'friendship', by: 10, of: person('ava') }
// Everyone drifts apart a little.
const drift: Effect = { kind: 'each', of: 'character', effects: [{ kind: 'stat', key: 'friendship', by: -1, of: '$' }] }
```

The entities are made when the game loads, from the merged content, so a mod's character gets their stats too. If the game declares an entity itself with the same kind and id, the game's wins whole. A save made before a character was added gains them when it loads (see [Entities in old saves](/docs/reference/entities#entities-in-old-saves)).

## Where people are

A character is somewhere at every moment, worked out fresh from the state:

1. The `location` of the first `schedule` entry whose `when` holds. An entry with no `when` always holds.
2. Otherwise, their `home`.
3. Otherwise, [`OFFSTAGE`](#offstage).

A character is here when that place is the one the places plugin's [`places/here`](/docs/plugins/places#queries) query says the player is in. With the player nowhere, or with no places plugin, nobody is ever here.

With the [pack above](#in-a-pack), on a Monday morning Sam is on the high street and Ava is in the café. In the evening, both are in the park.

Put exceptions above the rule they break, such as a Sunday entry above the every-day one. A person whose storyline is closed is still here. It's talking to them that's refused, and their **Talk** button says why.

### OFFSTAGE

```ts
const OFFSTAGE = 'offstage'
```

Where a character is when no schedule entry holds and they have no `home`. It's a place id that matches nothing on the map. You can use it as a schedule entry's `location` for when they're out of town:

```ts
import { weekday } from '@ifloom/plugin-calendar'
import { OFFSTAGE, type CharacterDef } from '@ifloom/plugin-cast'

const schedule: CharacterDef['schedule'] = [{ location: OFFSTAGE, when: weekday(6) }]   // away on Sundays
```
 The [checks](#checks) accept it as a place.

## Calls

A character with a `call` can be reached from anywhere with [`cast/call`](#commands), as a phone call or a note through the door, say. It opens a scene without moving the player, and works with or without the places plugin.

| Field | What it is | If left out |
|---|---|---|
| `scene` | The scene a call opens. | Their talk scene: the first `talk` option whose `when` holds, or else their first `talk` option. |
| `when` | They pick up while this [condition](/docs/reference/conditions) holds. `'$'` is them. | Always. |
| `busy` | What the player reads while `when` doesn't hold. It's plain text, not a string a game can override. | `<name> does not pick up.` ([`cast/notPickingUp`](#strings)) |

`call: {}` makes someone callable at any time, into their talk scene. Ava, above, only picks up in the evening and at night:

```ts
import { apply, startingState, whyNot, type Game } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { call } from '@ifloom/plugin-cast'

declare const game: Game                    // the worked example's game, below
const clock = calendar()                    // the same calendar() the game was built with
const morning = startingState(game)         // day 0, morning
const evening = clock.write(morning, { day: 0, period: 'evening' })

whyNot(morning, game, call('ava'))                 // 'She’s busy at the counter. Try her this evening.'
whyNot(morning, game, call('sam'))                 // 'You cannot reach Sam from here.'
apply(evening, game, call('ava')).state.sceneId    // 'ava.call'
```

The view adds no call button of its own. A UI lists the people it can call from the [`cast/contacts`](#queries) query, or a game puts a call on a button as a [game action](/docs/reference/actions#actiondef) with `command: call('ava')`, greyed out with the refusals below.

## Meeting people

A character is met while their `met` condition holds, with `'$'` as them. With no `met`, they're met once the player has [seen](/docs/reference/state#seen) any of their `talk` scenes or their `call.scene`. A scene counts as seen as soon as it's on screen.

```ts
import { type CharacterDef } from '@ifloom/plugin-cast'

const met: CharacterDef['met'] = { flag: 'introduced', of: '$' }   // met once a scene sets their flag
```

Met people are listed in the view's [`people`](#castview), and only met people who can be called are [contacts](#queries).

## A worked example

The [pack above](#in-a-pack), with the calendar and places. The game starts on the high street on a Monday morning.

```ts
import { apply, applyEffects, holds, loadGame, startingState, view, whyNot, type GameState } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { go, places } from '@ifloom/plugin-places'
import { cast, call, here, isAt, talk, type CastView } from '@ifloom/plugin-cast'

const clock = calendar()
const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [clock, places({ start: 'high-street' }), cast()],
})
const people = (state: GameState) => view(state, game).plugins.cast as CastView
```

Here's how it plays:

```ts
let state = startingState(game)
people(state).present.map((p) => p.id)   // ['sam']: Sam is out on the street in the morning
whyNot(state, game, talk('ava'))         // 'Ava is not here.'
whyNot(state, game, call('ava'))         // 'She’s busy at the counter. Try her this evening.'

state = apply(state, game, go('cafe')).state
holds(state, here('ava'), game)          // true
state = apply(state, game, talk('ava')).state
state.sceneId                            // 'ava.hi'
state = apply(state, game, { type: 'choose', id: 'bye' }).state
state.entities.character.ava.stats       // { friendship: 10 }

// That evening, Ava has gone to the park.
state = clock.write(state, { day: 0, period: 'evening' })
holds(state, isAt('ava', 'park'), game)  // true
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('park')).state
apply(state, game, talk('ava')).state.sceneId   // 'ava.hi': not friends yet
apply(state, game, call('ava')).state.sceneId   // 'ava.call'

// A few more chats later, as a test would fake them.
const friends = applyEffects(state, game, [{ kind: 'stat', key: 'friendship', by: 20, of: 'character:ava' }])
holds(friends, { stat: 'friendship', of: 'character:ava', gte: 25 }, game)   // true
apply(friends, game, talk('ava')).state.sceneId                           // 'ava.river'
```

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'cast/talk', with: { who: 'ava' } }` | `talk('ava')` | Opens the first of their [`talk`](#talkoption) options whose `when` holds. |
| `{ type: 'custom', name: 'cast/call', with: { who: 'ava' } }` | `call('ava')` | Opens their `call.scene`, or else their talk scene, from anywhere. |

`cast/talk` is refused, in this order, with:

1. `Finish this first.` (the engine's [`finishFirst`](/docs/reference/strings#refusals)) while a scene is open.
2. `There is no such person.` ([`cast/noSuchPerson`](#strings)) when the game has no character with that id.
3. `Ava is not here.` ([`cast/notHere`](#strings)) when they aren't [here](#where-people-are).
4. `Ava is not taking this right now.` ([`cast/notTaking`](#strings)) while their storyline is closed.
5. `Ava has nothing to say just now.` ([`cast/nothingToSay`](#strings)) when no `talk` option's `when` holds, or they have no `talk`.

`cast/call` is refused, in this order, with:

1. `Finish this first.` while a scene is open.
2. `There is no such person.` ([`cast/noSuchPerson`](#strings)).
3. `You cannot reach Ava from here.` ([`cast/cannotCall`](#strings)) when they have no `call`.
4. `Ava is not taking this right now.` ([`cast/notTaking`](#strings)) while their storyline is closed.
5. Their `call.busy`, or `Ava does not pick up.` ([`cast/notPickingUp`](#strings)), while `call.when` doesn't hold.

A [lock](/docs/reference/locks#lock) names them `cast/talk` and `cast/call`, or `cast/*` for both. Neither lists any effects, so a lock with `effect` doesn't see them, and no plugin puts a price on them.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'cast/here': ['ava', 'sam'] }` | `here('ava', 'sam')` | Any of them is in the room with the player. |
| `{ 'cast/at': { who: 'ava', at: ['park'] } }` | `isAt('ava', 'park')` | They're in one of these places, wherever the player is. |
| `{ 'cast/met': ['ava'] }` | `hasMet('ava')` | The player has [met](#meeting-people) any of them. |

These are the short forms, with the full name as the only key (see [plugin calls](/docs/reference/custom#plugincall)). The long form of the first row is `{ custom: 'cast/here', with: { value: ['ava', 'sam'] } }`. A single id works too, as in `{ 'cast/here': 'ava' }`. A character the game doesn't have never holds.

`cast/at` reads the schedule alone, so it works without places, and you can ask it about someone the player can't see. `isAt('ava', OFFSTAGE)` holds while she's out of town.

## Queries

These answer other plugins' code, through the context's [`query`](/docs/reference/plugins#queries). Content can't ask them. The character is given as `{ value }`, `{ who }` or `{ id }`.

| Query | Answers |
|---|---|
| `cast/person` | `{ id, name, hue, portrait }` for that character, as the [speaker hook](#speakers) gives it, or `undefined`. |
| `cast/present` | The ids of everyone in the room, in the game's order. Empty with no places plugin or with the player nowhere. |
| `cast/where` | Where that character is: a place id or `OFFSTAGE`. `undefined` for one the game doesn't have. |
| `cast/contacts` | Everyone [met](#meeting-people) who has a `call`, each as `{ id, name, role, portrait, command, disabled }`. `role` is `null` when they have none, `command` is `call(id)`, and `disabled` is the [refusal](#commands) the call would get now, or `undefined`. |

For example, a contacts plugin of your own might list them in its view:

```ts
import { definePlugin } from '@ifloom/engine'

type Contact = { id: string; name: string; disabled?: string }

const contacts = definePlugin<null>({
  id: 'contacts',
  version: 1,
  view: (_state, { query }) => ({ people: query<Contact[]>('cast/contacts') ?? [] }),
})
```

`cast/contacts`'s `disabled` is [`whyNot`](/docs/reference/actions#whynot) of the call, so it covers a lock, a guard or the plugin's own refusal.

## Speakers

A scene whose [`speaker`](/docs/reference/scenes#sceneview) is a character's id is drawn as them. The plugin's [speaker hook](/docs/reference/plugins#speakers) answers with their `name`, `hue` and portrait (`art/character/<id>.jpg` if they have none), which the view puts at `view.scene.speaker`. In the worked example, once Ava's talk scene is open:

```ts
import { view } from '@ifloom/engine'

view(state, game).scene.speaker   // { id: 'ava', name: 'Ava', hue: 20, portrait: 'art/character/ava.svg' }
```

Talking to someone doesn't set the speaker, because a scene names its own. An id the cast doesn't have is left to the next plugin that has a speaker hook. When no plugin knows it, `view.scene.speaker` is `null` and the scene shows no speaker.

## The view

`view(state, game).plugins.cast` is a `CastView`.

### CastView

```ts
type CastView = {
  present: PersonView[]
  people: PersonView[]
}
```

| Field | What it is |
|---|---|
| `present` | Who's in the room, in the game's order. Empty while a scene is open, or while a lock stops everything ([`lockedOut`](/docs/reference/locks#lockedout)). |
| `people` | Everyone the player has [met](#meeting-people), wherever they are, in the game's order. It's filled even during a scene. |

### PersonView

```ts
type PersonView = {
  id: string
  ref: string
  name: string
  fullName: string
  role: string | null
  hue: number | null
  portrait: string
  here: boolean
  closed: boolean
  met: boolean
  actions: RenderedChoice[]
}
```

| Field | What it is |
|---|---|
| `id`, `name`, `hue` | From their [`CharacterDef`](#characterdef). |
| `ref` | How content names their entity, such as `'character:ava'`, with the plugin's `kind`. |
| `fullName` | Their `fullName`, or `name`. |
| `role` | Their `role`, or `null`. |
| `portrait` | Their `portrait`, or `art/character/<id>.jpg`. |
| `here` | They're in the room with the player. |
| `closed` | Their storyline is closed for now. |
| `met` | The player has [met](#meeting-people) them. |
| `actions` | The **Talk** button, as a [`RenderedChoice`](/docs/reference/view#renderedchoice) that sends `talk(id)`. Its label comes from the talk option that would open (its `label`, or else the [`cast/talk`](#strings) string), and it's greyed out with its [refusal](#commands). Empty for someone with no `talk`. |

In the café on Monday morning, Ava's card is:

```ts
{
  id: 'ava', ref: 'character:ava', name: 'Ava', fullName: 'Ava Marsh', role: 'Runs the café', hue: 20,
  portrait: 'art/character/ava.svg', here: true, closed: false, met: false,
  actions: [{ id: 'talk-ava', label: 'Talk', command: talk('ava') }],
}
```

A met person who's elsewhere is in `people` with their button greyed out: `Ava is not here.`

## Strings

The plugin's lines go in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key, `cast/...`. `{name}` is the character's `name`.

| Key | English |
|---|---|
| `cast/talk` | `Talk` |
| `cast/noSuchPerson` | `There is no such person.` |
| `cast/notHere` | `{name} is not here.` |
| `cast/notTaking` | `{name} is not taking this right now.` |
| `cast/nothingToSay` | `{name} has nothing to say just now.` |
| `cast/cannotCall` | `You cannot reach {name} from here.` |
| `cast/notPickingUp` | `{name} does not pick up.` |

Both commands also use the engine's own [`finishFirst`](/docs/reference/strings#refusals) (`Finish this first.`), so rewording that changes it here too. A character's `call.busy` and a talk option's `label` are plain text written into the content.

## For code

### Helpers

```ts
function charactersOf(game: Game): CharacterDef[]
function characterById(game: Game, id: string | undefined): CharacterDef | undefined

const talk: (who: string) => Command
const call: (who: string) => Command
const here: (...who: string[]) => Condition
const isAt: (who: string, ...places: string[]) => Condition
const hasMet: (...who: string[]) => Condition
const person: (who: string, kind?: string) => string
```

| Helper | Returns |
|---|---|
| `charactersOf` | The game's characters: its packs' `data.cast.characters`, merged. Empty with none. |
| `characterById` | The character with this id, or `undefined`. |
| `talk`, `call` | The [commands](#commands). |
| `here`, `isAt`, `hasMet` | The [conditions](#conditions). |
| `person` | How content names a character's entity, for `of`. `person('ava')` is `'character:ava'`. With a different [`kind`](#castoptions), pass it, as in `person('ava', 'neighbour')`. |

## Checks

When the game loads, the plugin reports two kinds of problem.

**Character ids that content names.** Every character named in `cast/here`, `cast/at` (its `who`) or `cast/met` is looked up wherever the [content checker](/docs/reference/checks) finds the condition, and so is every character in a `cast/talk` or `cast/call` command. One the game doesn't have is reported where it's named:

```text
town · activity wave · unknown character "ghost"
```

**The characters themselves.** These are pinned on the pack each came from, with `where` as `characters <id>`. The plugin reports:

- A `talk` scene the game doesn't have (`talk: opens unknown scene "…"`).
- A `call.scene` the game doesn't have (`call: opens unknown scene "…"`).
- A `call` with no `call.scene` and no `talk`, so a call would open nothing (`can be called, but a call opens no scene: give call a scene, or them a talk`).
- A `storyline` the game doesn't have (`unknown storyline "…"`).
- Anything a `schedule`, `talk` or `call` `when`, or `met`, names that the game doesn't have. `'$'` stands for any character here, so `{ stat: 'trust', of: '$' }` is checked against the stats declared `of: 'character'`.
- With the places plugin, a `home` or schedule `location` it doesn't know (asked through [`places/known`](/docs/plugins/places#queries)). `OFFSTAGE` is accepted. Without places, these aren't checked.

```text
town · characters mole · talk: opens unknown scene "mole.hi"
town · characters mole · unknown storyline "tunnels"
town · characters mole · unknown location "burrow"
town · characters vole · can be called, but a call opens no scene: give call a scene, or them a talk
```

The places in `cast/at` aren't checked. A `portrait` the game gives is listed in the checker's [`files`](/docs/reference/checks#fileref), so `ifloom check` looks for it. The default one, `art/character/<id>.jpg`, isn't.

## Gotchas

- **No places, nobody here.** Without the places plugin, `present` is empty, `cast/here` never holds and `cast/talk` says `Ava is not here.` Calls, `cast/at`, `cast/met` and the speaker hook still work.
- **`'$'` is only bound in a character's own conditions.** In a scene, an activity or a trigger, write `of: person('ava')`.
- **The first entry wins.** A schedule entry or talk option with no `when` always holds, so nothing below it is reached.
- **Met is by scene unless you say otherwise.** Without `met`, someone whose talk scene the player has never opened isn't met, even if they've spoken in another scene as its `speaker`. Give them a `met` condition if they should be.
- **A call needs somewhere to go.** A character with a `call` but no `call.scene` and no `talk` is reported when the game loads.

## See it in an example

Small Town: Ava and Sam are the `characters` in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts), with schedules, `talk` options and, for Ava, a `call`. The café's body and stage use `here('ava')`.
