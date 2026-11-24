---
title: "Cast"
description: "Characters with schedules, who is in the room, talking and calling, and stats kept on each person such as a friendship."
---
`@ifloom/plugin-cast` gives a game its people. Characters keep their own hours, so the plugin knows who's in the room with the player. The player can talk to them and call them, and the game can keep stats about each one, such as a friendship.

You'd want it for any game with people the player meets and gets to know, such as the neighbours in a life sim. A novel where people only appear inside scenes usually doesn't need it.

The engine's core has no people of its own: no character list, no talk or call command and no "is she here" condition. This plugin adds them. Who a scene's speaker is doesn't need it: the engine reads any [entity](/docs/reference/scenes#speakers) a scene names (see [Speakers](#speakers)).

## What a character is

A character is an [entity](/docs/reference/entities) that carries the plugin's `cast/person` [trait](/docs/reference/entities#traits): their schedule, how to talk to them and whether they can be called. You write one with [`cast.person()`](#person) in your content's `entities`, so a mod can add someone or change them as it would any entity. Their name, `description` (a line under the name, such as `Runs the café`) and `image` (their portrait) are the entity's own, so anything that draws entities draws them too.

```ts
import type { Content } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

const town: Content = {
  entities: [cast.person({ id: 'sam', name: 'Sam', description: 'Neighbour', home: 'park', talk: 'sam.hi' })],
}
```

`cast.person()` makes them an entity of the kind `character`, which the plugin declares for you. That means anything your game keeps about a person, such as a friendship, trust or a debt, is a stat you declare with `of: 'character'`, and every character keeps their own:

```ts
import { type StatDef } from '@ifloom/engine'

const stats: StatDef[] = [{ id: 'friendship', label: 'Friendship', of: 'character' }]
```

Content then names whose stat it is with `of`, using [`cast.character()`](#helpers) to build the reference:

```ts
import { type Condition, type Effect } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

const closeToAva: Condition = { stat: 'friendship', of: cast.character('ava'), gte: 25 }          // 'character:ava'
const chat: Effect = { stat: 'friendship', by: 5, of: cast.character('ava') }
```

The plugin keeps no state of its own. Where people are is worked out from their schedules each time, and what the game keeps about them lives in their entities.

These are the parts of a game that deal with people, and where each one comes from:

- **The people** are entities written with [`cast.person()`](#person), each carrying the [`Person`](#person-1) trait.
- **Their hours** are each one's `schedule`, written with the [calendar](/docs/plugins/calendar)'s conditions, such as `schedule: [{ location: 'high-street', when: calendar.period('morning') }]`.
- **Who's in the room** is worked out from those schedules and where the [places](/docs/plugins/places) plugin says the player is. It's shown at [`view.plugins.cast`](#the-view).
- **Talking** is the [`cast.talk()`](#commands) command, which the view hands the UI as each person's Talk button.
- **A phone call** is the [`cast.call()`](#commands) command, which works from anywhere.
- **A relationship** is a stat declared `of: 'character'`, as above.
- **"Only when Ava is here"** is the [`cast.here()`](#conditions) condition.

```ts
import { cast, peopleOf, personOf, AWAY, type CastOptions, type Person, type PersonDef, type TalkOption, type CastView, type PersonView } from '@ifloom/plugin-cast'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-cast": "^0.0.0"
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

Where the player is comes from a [query](/docs/reference/plugins#queries) asked by name, so the order of `plugins` doesn't change who's here. The order of `plugins` doesn't matter to the cast.

## cast

```ts
function cast(options?: CastOptions): DefinedPlugin<null, CastView>
```

Builds the plugin, with the id `cast`. Call it once, when you build the game. It keeps nothing in the save, so its state is `null`.

### CastOptions

```ts
type CastOptions = {
  kind?: string
}
```

| Field | What it is | If left out |
|---|---|---|
| `kind` | The id of the [kind](/docs/reference/entities#kinddef) the plugin declares for its people, and the kind a bare id names: with `kind: 'neighbour'`, `cast.talk('ava')` means `'neighbour:ava'`. Write your people `of` it with `cast.person({ of: 'neighbour', ... })`. | `character` |

The kind is unique, labelled `Person` and `People`, and listed once the player has met someone. To call them something else, declare the kind yourself with the same id. Yours is laid over the plugin's (see [Kinds and entities](/docs/reference/plugins#kinds-and-entities)), so what you leave out stays the plugin's, and a mod or a translation can reword it:

```ts
import { cast } from '@ifloom/plugin-cast'

cast({ kind: 'neighbour' })

// In your content:
kinds: [{ id: 'neighbour', label: 'Neighbour', plural: 'Neighbours' }]
```

Anyone with the `cast/person` trait is a person, whatever their kind. A café game whose staff are entities of its own `staff` kind can give one the trait, and the cast finds them; content names them in full, as in `cast.talk('staff:ana')`.

## Characters

### person

```ts
const cast: {
  person(def: PersonDef): EntityDef
}

type PersonDef = Omit<EntityDef, 'of'> & Person & { of?: string }
```

Writes a character for your content's `entities`: an [`EntityDef`](/docs/reference/entities#entitydef) of the kind `character` (or `of`) with the `cast/person` trait. You give the entity's fields and the trait's side by side, and `cast.person()` sorts them: `fullName`, `pronouns`, `home`, `schedule`, `talk`, `call`, `storyline`, `met` and `portrait` go in the trait, and the rest stay on the entity.

```ts
import { cast } from '@ifloom/plugin-cast'

cast.person({ id: 'sam', name: 'Sam', description: 'Neighbour', home: 'park', talk: 'sam.hi' })
// { id: 'sam', name: 'Sam', description: 'Neighbour', of: 'character',
//   traits: { 'cast/person': { home: 'park', talk: 'sam.hi' } } }
```

The entity's fields that matter most to a character:

| Field | What it is | If left out |
|---|---|---|
| `id` | What content names them by, as in `cast.talk('ava')`, `cast.here('ava')` or `cast.character('ava')`. It's also how a scene names them as its [speaker](#speakers). | Required. |
| `name` | Shown over their lines, on their card, and in refusals such as `Ava is not here.` [Prose tokens](/docs/reference/prose) in it are filled for the save wherever it's shown, so `'{{friendName|Your friend}}'` is the name the player typed, and `Your friend` until then (see [A name the player chooses](#a-name-the-player-chooses)). | Required. |
| `description` | A word or two about them, such as `Runs the café`, shown under the name. | `null` in the view. |
| `image` | Their picture, through [`artSrc`](/docs/reference/prose#artsrc). A bare name under `art/` is taken as a `.jpg`. | `art/character/<id>.jpg` in the cast's own view; none in [`view.entities`](/docs/reference/view#entities) or as a scene's speaker. |
| `tags` | Labels for your own code. The plugin doesn't read them. | None. |
| `stats` | Their stats at the start, where they differ from each stat's own `start`. | Each stat's `start`. |
| `kv` | Their kv store at the start. | `{}` |
| `ui` | [Presentation hints](/docs/reference/ui-hints) for the UI, such as the React UI's [`hue`](/docs/react/hints#hue), the colour of their lines: `ui: { hue: 20 }`. The plugin passes them to its view as written, and the engine to a scene's speaker. | None. |

### Person

```ts
type Person = {
  fullName?: string
  pronouns?: Record<string, string>
  home?: string
  schedule?: { location: string; when?: Condition }[]
  talk?: string | TalkOption[]
  call?: { scene?: string; when?: Condition; busy?: string }
  storyline?: string
  met?: Condition
  portrait?: string
}
```

The `cast/person` trait: what makes an entity someone the player can meet, find and talk to. The plugin types it by augmenting [`TraitRegistry`](/docs/reference/entities#traits), so `traitOf(state, game, ref, 'cast/person')` is a `Person`.

| Field | What it is | If left out |
|---|---|---|
| `fullName` | Their whole name, for the UI. Tokens are filled as in `name`. | `name` |
| `pronouns` | For prose that needs them, such as `{ they: 'she', them: 'her' }`. The plugin gives them no meaning and doesn't pass them to the view. | None. |
| `home` | Where they are when no `schedule` entry holds: a place id from the [places plugin](/docs/plugins/places#locations). | [`AWAY`](#away), meaning nowhere. |
| `schedule` | Where they are while each `when` holds. See [Where people are](#where-people-are). | Always at `home`. |
| `talk` | The scene that talking to them opens, or a list of [`TalkOption`](#talkoption)s, of which the first whose `when` holds is used. | They can't be talked to, and have no Talk button. |
| `call` | Whether they can be reached from anywhere. See [Calls](#calls). | They can't be called. |
| `storyline` | The id of their [storyline](/docs/reference/storylines). While it's closed, they won't talk or pick up. | Never closed. |
| `met` | Whether the player has met them, as a [condition](/docs/reference/conditions). | Having seen one of their `talk` or `call` scenes. |
| `portrait` | A face for avatars, a path in `art/` as an `image` is. A UI draws it where it shows someone small: the React UI's cards, message threads, posts and contacts. Other plugins ask for it with the [`cast/portrait`](#queries) query. | Their `image`. |

Inside a character's own conditions, `'$'` stands for them. Every `when` in `schedule`, `talk` and `call`, and `met` itself, is run with `'$'` bound to the character's entity (by [`bindCurrent`](/docs/reference/entities#bindcurrent)). So `{ stat: 'friendship', of: '$', gte: 25 }` in Ava's `talk` is Ava's friendship. Anywhere else, name them in full with `of: cast.character('ava')`.

Because it's a trait, a pack can also give someone the trait in its [`traits`](/docs/reference/entities#traits) table, and an entity made in play [`like`](/docs/reference/entities#things-made-like-another) a character is a person too, with the character's schedule unless it was made with trait data of its own.

### A name the player chooses

To let the player name someone, ask for the name with an [input](/docs/reference/inputs) and give the character a `name` that reads the input's kv key:

```ts
import type { Content } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

const town: Content = {
  inputs: [{ id: 'friendName', label: 'Your oldest friend is called', type: 'text', maxLength: 16 }],
  entities: [cast.person({ id: 'sam', name: '{{friendName|Your oldest friend}}', home: 'park', talk: 'sam.hi' })],
  // ...
}
```

Once the player has typed `Robin`, the plugin shows `Robin` on Sam's card, over their lines, in `cast/contacts`, and in refusals such as `Robin is not here.`. Until then the words after the `|` show: `Your oldest friend`. A [token](/docs/reference/prose#tokens) with no fallback prints nothing while its key is unset, so without one Sam would have no name at all.

**Gotchas.**
- The fallback is plain words. A token inside it isn't read.
- A translation's [words table](/docs/reference/words) gives the whole `name` other words, the token and its fallback together: `'{{friendName|Ton vieil ami}}'`.
- The content checker reads the tokens in prose and blocks of words, not in names, so it won't warn about a name with no fallback.

The name is the entity's, as written, and it's filled in wherever it's read: in [`view.entities`](/docs/reference/view#entitiesview-and-entityview) and through [`entityName`](/docs/reference/entities#entityname) too.

### TalkOption

```ts
type TalkOption = { scene: string; when?: Condition; label?: string }
```

One way a conversation can open. It opens `scene` while `when` holds (always, if you leave `when` out), and `label` goes on the Talk button (the [`cast/talk`](#strings) string, `Talk`, if left out). [`cast/talk`](#commands) opens the first option in the list whose `when` holds, so put the particular ones first and a plain one last. This is the showcase's Ava, with a label added:

```ts
import { places } from '@ifloom/plugin-places'
import { type TalkOption } from '@ifloom/plugin-cast'

const talk: TalkOption[] = [
  { scene: 'ava.river', when: { all: [places.at('park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Sit with Ava' },
  { scene: 'ava.hi' },
]
```

`talk: 'ava.hi'` is short for `talk: [{ scene: 'ava.hi' }]`.

### In your content

Characters go in your [content](/docs/reference/loader#content)'s `entities`, written with `cast.person()`. These are Ava and Sam from the [showcase](/docs/guide/showcase) (`examples/showcase/src/world/cast.ts`), in a cut-down town with only the places and scenes needed for the [worked example](#a-worked-example):

```ts
import type { DataScene, Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places, type PlaceDef } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

const ava = cast.person({
  id: 'ava',
  name: 'Ava',
  fullName: 'Ava Marsh',
  description: 'Runs the café',
  image: 'art/character/ava.svg',
  pronouns: { they: 'she', them: 'her', their: 'her', theirs: 'hers' },
  ui: { hue: 20 },
  home: 'park',
  // At the counter through the working day, by the river in the evening.
  schedule: [{ location: 'cafe', when: { all: [calendar.weekday(0, 1, 2, 3, 4, 5), calendar.period('morning', 'afternoon')] } }],
  // By the river, once she's a friend, a different conversation from Ava at the till.
  talk: [{ scene: 'ava.river', when: { all: [places.at('park'), { stat: 'friendship', of: '$', gte: 25 }] } }, { scene: 'ava.hi' }],
  storyline: 'ava',
  call: { scene: 'ava.call', when: calendar.period('evening', 'night'), busy: 'She’s busy at the counter. Try her this evening.' },
})

const sam = cast.person({
  id: 'sam',
  name: 'Sam',
  description: 'Neighbour',
  image: 'art/character/sam.svg',
  pronouns: { they: 'they', them: 'them', their: 'their', theirs: 'theirs' },
  ui: { hue: 200 },
  home: 'park',
  schedule: [{ location: 'high-street', when: calendar.period('morning') }],
  talk: 'sam.hi',
  storyline: 'sam',
})

const place = (id: string, name: string, exits: string[]): PlaceDef =>
  ({ id, name, description: 'Small Town', exits, body: [{ prose: `place.${id}` }] })
const chat = (id: string, who: string, by: number, label: string): DataScene => ({
  id, speaker: who, body: [{ prose: id }],
  choices: [{ id: 'bye', label, effects: [{ stat: 'friendship', by, of: cast.character(who) }, { scene: null }] }],
})

const map = [
  place('high-street', 'High Street', ['cafe', 'park']),
  place('cafe', 'The Corner Café', ['high-street']),
  place('park', 'Riverside Park', ['high-street']),
].map(places.location)

const town: Content = {
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  storylines: [{ id: 'ava', name: 'Ava' }, { id: 'sam', name: 'Sam' }],
  entities: [ava, sam, ...map],
  scenes: [
    chat('ava.hi', 'ava', 10, 'Leave her to it'),
    chat('ava.river', 'ava', 5, 'Sit with her'),
    chat('ava.call', 'ava', 3, 'Say goodnight'),
    chat('sam.hi', 'sam', 5, 'Pat the dog'),
  ],
  prose: {
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.park': 'The river is slow and brown.',
    'ava.hi': 'Ava looks up from the till and grins.',
    'ava.river': 'Ava is on the bench, feeding the ducks.',
    'ava.call': '"Oh, hello! I’m by the river."',
    'sam.hi': 'Sam is walking a dog that is clearly not theirs.',
  },
}
```

The [loader](/docs/reference/loader#content) merges characters as it merges every entity, by kind and id. A pack's `character:sam` replaces the game's own whole, so a mod can add someone or rewrite them, or give the trait to someone through its `traits` table. Everyone with the trait is [`peopleOf(game)`](#helpers).

### Each one is an entity

The plugin brings the kind in its own [`content`](/docs/reference/plugins#kinds-and-entities), and each character is an entity of it that your content writes. A stat the game declares `of: 'character'` is then kept on every character, and you read and write it as any [entity's stat](/docs/reference/stats#entity-stats):

```ts
import { entitiesOf, startingState, statValue, type Condition, type Effect, type Game } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

declare const game: Game   // built from the content above

const state = startingState(game)
entitiesOf(state, game, 'character')                    // ['character:ava', 'character:sam']
statValue(state, game, 'friendship', cast.character('ava'))     // 0

const isFriend: Condition = { stat: 'friendship', of: cast.character('ava'), gte: 25 }
const warmer: Effect = { stat: 'friendship', by: 10, of: cast.character('ava') }
// Everyone drifts apart a little.
const drift: Effect = { each: 'character', effects: [{ stat: 'friendship', by: -1, of: '$' }] }
```

A save keeps only what play changed about a character, such as their friendship, and reads the rest from content. So a save made before a character was added has them as soon as it loads, and a fixed name or schedule reaches old saves too (see [Entities in old saves](/docs/reference/entities#entities-in-old-saves)).

Each character is [`unique`](/docs/reference/entities#kinddef), so they can hold things: `{ entity: 'keepsake:shell', at: cast.character('ava') }` is true once the player gives her the shell.

The kind is [listed](/docs/reference/entities#listing) with `{ 'cast/met': { character: '$' } }`. So the `character` kind in [`view.entities`](/docs/reference/view#entities) only has the people the player has met, and a UI that draws every entity gives nobody away early. To list everyone, or to split the list instead, redeclare the kind in your content. What you leave out keeps the plugin's:

```ts
import type { Content } from '@ifloom/engine'

const people: Content = {
  // Everyone on the list, with `met` to tell them apart.
  kinds: [{ id: 'character', label: 'Person', plural: 'People', listed: true, flags: { met: { 'cast/met': { character: '$' } } } }],
}
```

## Where people are

A character is somewhere at every moment, worked out fresh from the state:

1. The `location` of the first `schedule` entry whose `when` holds. An entry with no `when` always holds.
2. Otherwise, their `home`.
3. Otherwise, [`AWAY`](#away).

A character is here when that place is the one the places plugin's [`places/here`](/docs/plugins/places#queries) query says the player is in. With the player nowhere, or with no places plugin, nobody is ever here.

With the [content above](#in-your-content), on a Monday morning Sam is on the high street and Ava is in the café. In the evening, both are in the park.

Put exceptions above the rule they break, such as a Sunday entry above the every-day one. A person whose storyline is closed is still here. It's talking to them that's refused, and their Talk button says why.

### AWAY

```ts
const AWAY = 'away'
```

Where a character is when no schedule entry holds and they have no `home`. It's a place id that matches nothing on the map. You can use it as a schedule entry's `location` for when they're out of town:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { AWAY, type Person } from '@ifloom/plugin-cast'

const schedule: Person['schedule'] = [{ location: AWAY, when: calendar.weekday(6) }]   // away on Sundays
```

The [checks](#checks) accept it as a place. A pack written before schema 26 wrote it `'offstage'`, which loading rewrites.

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
import { cast } from '@ifloom/plugin-cast'

declare const game: Game                    // the worked example's game, below
const clock = calendar()                    // the same calendar() the game was built with
const morning = startingState(game)         // day 0, morning
const evening = clock.write(morning, { day: 0, period: 'evening' })

whyNot(morning, game, cast.call('ava'))                 // 'She’s busy at the counter. Try her this evening.'
whyNot(morning, game, cast.call('sam'))                 // 'You cannot reach Sam from here.'
apply(evening, game, cast.call('ava')).state.sceneId    // 'ava.call'
```

The view adds no call button of its own. A UI lists the people it can call from the [`cast/contacts`](#queries) query, or a game puts a call on a button as a [game action](/docs/reference/actions#actiondef) with `command: cast.call('ava')`, greyed out with the refusals below.

## Meeting people

A character is met while their `met` condition holds, with `'$'` as them. With no `met`, they're met once the player has [seen](/docs/reference/state#seen) any of their `talk` scenes or their `call.scene`. A scene counts as seen as soon as it's on screen.

```ts
import { type Person } from '@ifloom/plugin-cast'

const met: Person['met'] = { kv: 'introduced', of: '$' }   // met once a scene sets their kv key
```

Met people are listed in the view's [`people`](#castview), and only met people who can be called are [contacts](#queries).

## A worked example

The [content above](#in-your-content), with the calendar and places. The game starts on the high street on a Monday morning.

```ts
import { apply, applyEffects, holds, loadGame, startingState, statValue, view, whyNot, type GameState } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast, type CastView } from '@ifloom/plugin-cast'

const clock = calendar()
const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [clock, places({ start: 'high-street' }), cast()],
})
const people = (state: GameState) => view(state, game).plugins.cast as CastView
```

In play:

```ts
let state = startingState(game)
people(state).present.map((p) => p.id)   // ['sam']: Sam is out on the street in the morning
whyNot(state, game, cast.talk('ava'))         // 'Ava is not here.'
whyNot(state, game, cast.call('ava'))         // 'She’s busy at the counter. Try her this evening.'

state = apply(state, game, places.go('cafe')).state
holds(state, game, cast.here('ava'))          // true
state = apply(state, game, cast.talk('ava')).state
state.sceneId                            // 'ava.hi'
state = apply(state, game, { type: 'choose', id: 'bye' }).state
statValue(state, game, 'friendship', cast.character('ava'))   // 10

// That evening, Ava has gone to the park.
state = clock.write(state, { day: 0, period: 'evening' })
holds(state, game, cast.at('ava', 'park'))  // true
state = apply(state, game, places.go('high-street')).state
state = apply(state, game, places.go('park')).state
apply(state, game, cast.talk('ava')).state.sceneId   // 'ava.hi': not friends yet
apply(state, game, cast.call('ava')).state.sceneId   // 'ava.call'

// A few more chats later, as a test would fake them.
const friends = applyEffects(state, game, [{ stat: 'friendship', by: 20, of: 'character:ava' }])
holds(friends, game, { stat: 'friendship', of: 'character:ava', gte: 25 })   // true
apply(friends, game, cast.talk('ava')).state.sceneId                           // 'ava.river'
```

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'cast/talk': { id: 'ava' } }` | `cast.talk('ava')` | Opens the first of their [`talk`](#talkoption) options whose `when` holds. |
| `{ 'cast/call': { id: 'ava' } }` | `cast.call('ava')` | Opens their `call.scene`, or else their talk scene, from anywhere. |

`cast/talk` is refused, in this order, with:

1. `Finish this first.` (the engine's [`finishFirst`](/docs/reference/strings#refusals)) while a scene is open.
2. `There is no such person.` ([`cast/noSuchPerson`](#strings)) when the game has nobody with the `cast/person` trait by that id.
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
| `{ 'cast/here': { character: ['ava', 'sam'] } }` | `cast.here('ava', 'sam')` | Any of them is in the room with the player. |
| `{ 'cast/at': { character: 'ava', at: ['park'] } }` | `cast.at('ava', 'park')` | They're in one of these places, wherever the player is. |
| `{ 'cast/met': { character: ['ava'] } }` | `cast.met('ava')` | The player has [met](#meeting-people) any of them. |

Each is a call with the full name as the only key (see [plugin calls](/docs/reference/custom#plugincall)), which the helpers write for you. A single id works too, as in `{ 'cast/here': { character: 'ava' } }`, and so does a whole reference, `'character:ava'` or `'staff:ana'`, which is what `'$'` becomes. A character the game doesn't have never holds.

`cast/at` reads the schedule alone, so it works without places, and you can ask it about someone the player can't see. `cast.at('ava', AWAY)` holds while she's out of town. A place in `at` can be its id or its reference, `location:park`, which is what a [phrase's argument](/docs/reference/phrases#arguments) passes for `place=park`.

## Values

| Token | Prints |
|---|---|
| `{{cast/name character=ava}}` | That character's name as the player reads it, with any tokens in it filled. `character` is an id or a reference. Nothing for anyone who isn't a person. |

In a phrase that takes `who`, `{{cast/name character=$who}}` prints the name of whoever the token passed.

## Queries

These answer other plugins' code, through the context's [`query`](/docs/reference/plugins#queries). Content can't ask them. The character is given as `{ character }`, an id or a reference. Everyone is listed in the order [`peopleOf`](#helpers) gives them, those made in play included. Other plugins ask `cast/portrait` and `cast/contacts`, so the engine declares their answers in [`PartnerQueries`](/docs/reference/plugins#partner-queries), and they're typed in any plugin's code without importing the cast.

| Query | Answers |
|---|---|
| `cast/present` | The ids of everyone in the room, in the game's order. Empty with no places plugin or with the player nowhere. |
| `cast/where` | Where that character is: a place id or `AWAY`. `undefined` for one the game doesn't have. |
| `cast/portrait` | That character's face for avatars: their [`portrait`](#person), else their picture as the [view](#personview) gives it, through `artSrc`. `undefined` for anyone who isn't a person. The [messages](/docs/plugins/messages) and [feed](/docs/plugins/feed) plugins ask it for a sender's face. |
| `cast/contacts` | Everyone [met](#meeting-people) who has a `call`, each a [`CastContact`](/docs/reference/plugins#partner-queries), `{ id, name, description, image, portrait, command, disabled }`. `description` is `null` when they have none, `command` is `cast.call(id)`, and `disabled` is the [refusal](#commands) the call would get now, or `undefined`. |

For example, a contacts plugin of your own might list them in its view:

```ts
import { definePlugin } from '@ifloom/engine'

const contacts = definePlugin<null>({
  id: 'contacts',
  version: 1,
  // Each a CastContact, typed without importing the cast.
  view: (_state, { query }) => ({ people: (query('cast/contacts') ?? []).map(({ id, name, disabled }) => ({ id, name, disabled })) }),
})
```

`cast/contacts`'s `disabled` is [`whyNot`](/docs/reference/actions#whynot) of the call, so it covers a lock, a guard or the plugin's own refusal.

## Speakers

A scene whose [`speaker`](/docs/reference/scenes#speakers) is a character's id is drawn as them. A character is an entity, so the engine reads their `name`, their `image` and their entity's `ui` hints itself, and puts them at `view.scene.speaker`. In the worked example, once Ava's talk scene is open:

```ts
view(state, game).scene.speaker   // { id: 'ava', ref: 'character:ava', name: 'Ava', image: 'art/character/ava.svg', ui: { hue: 20 } }
```

Talking to someone doesn't set the speaker, because a scene names its own. A spoken line written under their id, `@ava: "Morning."`, gets her reference as its beat's `speaker` too, and her name as its `name`.

A character with no `image` has no picture as a speaker. The cast's own view still guesses `art/<kind>/<id>.jpg` for their card, but the scene doesn't, so give everyone who speaks an `image`.

## The view

`view(state, game).plugins.cast` is a `CastView`.

Its [React UI](#drawing-it) draws who's here with [`PeopleHere`](#peoplehere), and everyone met, with the stats you declare on the cast's kind, with [`Relationships`](#relationships). [`usePeople`](#usepeople) gives this view with no markup.

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
  description: string | null
  ui?: Ui<EntityUi>
  image: string | null
  portrait: string | null
  here: boolean
  closed: boolean
  met: boolean
  actions: RenderedChoice[]
}
```

| Field | What it is |
|---|---|
| `id` | Their id, as `cast.talk(id)` names them. For someone of another kind than the cast's, their whole reference, such as `'staff:ana'`. |
| `ref` | How content names their entity, such as `'character:ava'`. |
| `name` | Their entity's name, tokens filled. |
| `ui` | Their entity's [presentation hints](/docs/reference/ui-hints), over their kind's, as [`entityUi`](/docs/reference/ui-hints#entityui) reads them. Left out when they have none. |
| `fullName` | Their `fullName`, or `name`. |
| `description` | Their entity's `description`, tokens filled, or `null`. |
| `image` | Their entity's `image`, or `art/<kind>/<id>.jpg`, through `artSrc`. Typed `string | null` like every plugin's picture, though the cast always gives one. |
| `portrait` | Their face for avatars: the trait's [`portrait`](#person), through `artSrc`, else `image`. |
| `here` | They're in the room with the player. |
| `closed` | Their storyline is closed for now. |
| `met` | The player has [met](#meeting-people) them. |
| `actions` | The Talk button, as a [`RenderedChoice`](/docs/reference/view#renderedchoice) that sends `cast.talk(id)`. Its label comes from the talk option that would open (its `label`, or else the [`cast/talk`](#strings) string), and it's greyed out with its [refusal](#commands). Empty for someone with no `talk`. |

In the café on Monday morning, Ava's card is:

```ts
{
  id: 'ava', ref: 'character:ava', name: 'Ava', fullName: 'Ava Marsh', description: 'Runs the café', ui: { hue: 20 },
  image: 'art/character/ava.svg', portrait: 'art/character/ava.svg', here: true, closed: false, met: false,
  actions: [{ id: 'talk-ava', label: 'Talk', command: cast.talk('ava') }],
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

## Drawing it

`view.plugins.cast` is a [`CastView`](#castview): who's here in `present`, and everyone in `people`. Each is a [`PersonView`](#personview) with their names and pictures, whether you've met them, and a Talk button in `actions`.

`@ifloom/plugin-cast/react` draws who is here and everyone met, for a game drawn with [`@ifloom/react`](/docs/react). List `castUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and a People section (`ui.people`) in the side column opens [`Relationships`](#relationships) in a dialog, [`PeopleHere`](#peoplehere) goes after the room's actions, and the `people` panel draws `Relationships` too. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/cast.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-cast.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/People.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.cast`, or from [`usePeople`](#usepeople) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

### castUi

```ts
const castUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): a People section (`ui.people`) in the side column opens [`Relationships`](#relationships) in a dialog, [`PeopleHere`](#peoplehere) goes after the room's actions, and the `people` panel draws `Relationships` too.

Its words are in `CAST_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.people': '…' }`.

| Key | English |
|---|---|
| `ui.people` | `People` |

### PeopleSection

```tsx
function PeopleSection(): JSX.Element
```

What `castUi` puts in the side column: a [`Section`](/docs/react/components#section) with the id `people`, titled `ui.people`, as a button that opens `Relationships` in a dialog.

### PeopleHere

```tsx
function PeopleHere(props: { className?: string }): JSX.Element | null
```

Who is here, read from the [cast plugin](/docs/plugins/cast)'s view at `view.plugins.cast.present`. For each person it shows their portrait and `description`, the line under their name (when they have them), and their name, with a [`ChoiceButton`](/docs/react/components#choicebutton) for each thing the player can do with them, such as **Talk**. Each person carries `data-person`. It draws nothing when nobody is here, and nothing in a game without the cast, since the engine has no people of its own.

Replaceable as `PeopleHere` in [`components`](/docs/react/components#components). Parts: `people`, `person` (with `data-person`), `person-portrait`, `person-name`, `person-desc` and `person-actions`.

### Relationships

```tsx
function Relationships(props: { className?: string }): JSX.Element | null
```

Everyone the player has met, from `view.plugins.cast.people`, each with their portrait, name and `description`, and the stats the player can see on them. Each character is an [entity](/docs/reference/entities) of the cast's kind, so those are the stats the game declares on that kind, such as friendship, read from [`view.entities`](/docs/reference/view#entities) and drawn like the [`StatList`](/docs/react/components#statlist)'s, with a bar or pips for a stat with a `display`. It draws nothing before anyone is met, and nothing without the cast. The default layout opens it from the People section, and it's the built-in `people` [panel](/docs/react/components#built_in_panels).

Replaceable as `Relationships` in [`components`](/docs/react/components#components). Parts: `relationships`, `relationship` (with `data-person`), `relationship-header`, `relationship-stats`, and the `person-` and `stat-` parts inside.

### usePeople

```ts
function usePeople(): CastView | null
```

The [cast](/docs/plugins/cast) plugin's view: `present`, who is here with their buttons as [`RenderedChoice`](/docs/reference/view#renderedchoice)s, and `people`, everyone the player has met. `null` in a game without the plugin. Send a button's `command` with [`useGame`](/docs/react/components#usegame)'s `send`, or draw it with [`ChoiceButton`](/docs/react/components#choicebutton). [`PeopleHere`](#peoplehere) and [`Relationships`](#relationships) are drawn from it.

## For code

### Helpers

```ts
const cast: {
  (options?: CastOptions): DefinedPlugin<null, CastView>
  talk(who: string): CommandRef
  call(who: string): CommandRef
  here(...who: string[]): Condition
  at(who: string, ...places: string[]): Condition
  met(...who: string[]): Condition
  character(who: string, kind?: string): EntityRef
}

function peopleOf(state: GameState, game: Game): EntityRef[]
function personOf(state: GameState, game: Game, ref: EntityRef): Person | undefined
```

| Helper | Returns |
|---|---|
| `peopleOf` | Everyone in the game now with the `cast/person` trait, as references: the ones content declares, in its order, then those made in play. |
| `personOf` | Someone's `cast/person` trait as play reads it (through what they were made `like`), or `undefined` for anyone not in the game or without it. |
| `cast.talk`, `cast.call` | The [commands](#commands). |
| `cast.here`, `cast.at`, `cast.met` | The [conditions](#conditions). |
| `cast.character` | How content names a character's entity, for `of`, `at` and `entity`. `cast.character('ava')` is `'character:ava'`. With a different [`kind`](#castoptions), pass it, as in `cast.character('ava', 'neighbour')`. |

[`cast.person()`](#person) writes a character.

## Checks

When the game loads, the plugin reports two kinds of problem.

**Characters that content names.** Every character named in `cast/here`, `cast/at` (its `character`) or `cast/met` is looked up as an entity wherever the [content checker](/docs/reference/checks) finds the condition, and so is every character in a `cast/talk` or `cast/call` command. One the game doesn't have is reported where it's named:

```text
town · action wave · unknown entity "character:ghost"
```

**The characters themselves.** The trait is checked on each entity that has it, with `where` as `trait cast/person on <ref>`. The plugin reports:

- A `talk` scene the game doesn't have (`talk: opens unknown scene "…"`).
- A `call.scene` the game doesn't have (`call: opens unknown scene "…"`).
- A `call` with no `call.scene` and no `talk`, so a call would open nothing (`can be called, but a call opens no scene: give call a scene, or them a talk`).
- A `storyline` the game doesn't have (`unknown storyline "…"`).
- Anything a `schedule`, `talk` or `call` `when`, or `met`, names that the game doesn't have. `'$'` stands for any character here, so `{ stat: 'trust', of: '$' }` is checked against the stats declared `of: 'character'`.
- With the places plugin, a `home` or schedule `location` it doesn't know (asked through [`places/known`](/docs/plugins/places#queries)). `AWAY` is accepted. Without places, these aren't checked.

```text
town · trait cast/person on character:mole · unknown location "burrow"
town · trait cast/person on character:mole · talk: opens unknown scene "mole.hi"
town · trait cast/person on character:mole · unknown storyline "tunnels"
town · trait cast/person on character:vole · can be called, but a call opens no scene: give call a scene, or them a talk
```

**Characters written the old way.** A `data.cast.characters` list in content is reported once per entry, `characters <id> · characters are entities now: write them in entities with cast.person({ id, name, ... })`. A pack written for an older schema has its characters moved for it (see [`upgradePack`](/docs/reference/loader#upgradepack)): `role` becomes `desc`, `portrait` becomes `image`, and the rest the trait.

The places in `cast/at` aren't checked. An `image` the game gives is listed in the checker's [`files`](/docs/reference/checks#fileref), so `ifloom check` looks for it. The default one, `art/character/<id>.jpg`, isn't.

## Gotchas

- **No places, nobody here.** Without the places plugin, `present` is empty, `cast/here` never holds and `cast/talk` says `Ava is not here.` Calls, `cast/at`, `cast/met` and a scene's speaker still work.
- **`'$'` is only bound in a character's own conditions.** In a scene, an action or a trigger, write `of: cast.character('ava')`.
- **The first entry wins.** A schedule entry or talk option with no `when` always holds, so nothing below it is reached.
- **A portrait you name must exist.** `ifloom check` reports `no file public/art/character/ava.jpg` for an `image` whose file isn't there. Leave `image` out while the art is still to come. The default path isn't checked, and the React UI leaves out a picture whose file is missing.
- **Met is by scene unless you say otherwise.** Without `met`, someone whose talk scene the player has never opened isn't met, even if they've spoken in another scene as its `speaker`. Give them a `met` condition if they should be.
- **A call needs somewhere to go.** A character with a `call` but no `call.scene` and no `talk` is reported when the game loads.

## See it in an example

Small Town: Ava and Sam are the `cast.person()` entities in [`examples/showcase/src/world/cast.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/cast.ts), with schedules, `talk` options and, for Ava, a `call`. The café's body and layered picture use `cast.here('ava')`.
