# Cast

`@ifloom/plugin-cast` gives a game its people: characters who keep their own hours, who is in the room with the player, talking to them and calling them, and what the game keeps about each of them, such as a friendship.

The plugin keeps no state of its own. Characters are content, in a pack's `data.cast.characters`, so a mod can add someone or change them. Each character is also an [entity](/reference/entities) of the kind `character`, which the plugin brings, so a stat the game declares `of: 'character'` is each character's own.

So everything people-shaped in a game is written with it:

- **the people** are a list of [`CharacterDef`](#characterdef)s;
- **their hours** are each one's `schedule`, written with the [calendar](/plugins/calendar)'s conditions: `schedule: [{ location: 'cafe', when: period('morning', 'afternoon') }]`;
- **who is in the room** is worked out from those schedules and the [places](/plugins/places) plugin's idea of where the player is, and shown at [`view.plugins.cast`](#the-view);
- **talking** is its [`talk()`](#commands) command, which the view hands the UI as each person's **Talk** button;
- **a phone call** is its [`call()`](#commands) command, from anywhere;
- **a friendship** is a stat declared `of: 'character'`, read with `{ stat: 'friendship', of: person('ava'), gte: 25 }`;
- **"only when Ava is here"** is its [`here()`](#conditions) condition.

```ts
import {
  cast, talk, call, here, isAt, hasMet, person, charactersOf, characterById, OFFSTAGE,
  type CastOptions, type CharacterDef, type TalkOption, type CastView, type PersonView,
} from '@ifloom/plugin-cast'
```

## The engine knows no characters

The engine core has no people of its own: no character list, no talk or call command, no "is she here" condition. This plugin is how a game has people. A game without it, such as a novel told from one point of view, simply has none, and a scene's `speaker` is drawn by name only if some plugin knows the id (see [Speakers](#speakers)).

## Install

Add the package beside the engine, and add `cast()` to the game's `plugins`. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-cast": "file:../ifloom/packages/plugin-cast"
  }
}
```

```ts
plugins: [calendar(), places({ start: 'house' }), cast()]
```

The plugin [cooperates](/reference/plugins#cooperates) with `places` and `calendar`: it asks the places plugin where the player is, and schedules are usually written with the calendar's conditions. Neither is required. Without places, nobody is ever in the room, but calls still work. Without the calendar, a schedule naming `calendar/...` conditions still loads, and those conditions never hold.

Where the player is comes from a [query](/reference/plugins#queries), asked by name, so the order of `plugins` does not change who is here. It decides only who answers a [speaker](#speakers) id that two plugins both know: the first listed.

## cast

```ts
function cast(options?: CastOptions): DefinedPlugin<null>
```

The plugin, with the id `cast`. Call it once, when the game is built. It keeps nothing in the save (its state is `null`): where people are is worked out from their schedules each time, and what the game keeps about them is in their entities.

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
| `kind` | The id of the [kind](/reference/entities#kinddef) each character is an entity of. Stats for characters are declared `of` it, and content names one as `<kind>:<id>`. | `character` |
| `label` | What one of them is called, the kind's `label`. | `Person` |
| `plural` | What more than one are called, the kind's `plural`. | `People` |

```ts
cast({ kind: 'neighbour', label: 'Neighbour', plural: 'Neighbours' })
```

A kind the game declares itself with the same id replaces the plugin's (see [Kinds and entities](/reference/plugins#kinds-and-entities)), so a game can also rename it that way. The options are code, not content: a mod cannot change them.

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
| `id` | What content names them by: `talk('ava')`, `here('ava')`, `person('ava')`. Also their entity's id and their [speaker](#speakers) id. Unique among the characters. | Required. |
| `name` | Shown over their lines, on their card, and in the refusals: `Ava is not here.` Also their entity's `name`. | Required. |
| `fullName` | Their whole name, for the UI. | `name` |
| `role` | A word or two about them: `Runs the café`. | `null` in the view. |
| `pronouns` | For prose that needs them: `{ they: 'she', them: 'her' }`. The plugin gives them no meaning and does not pass them to the view. | None. |
| `hue` | A colour for their lines, as a hue from 0 to 360. | `null`: left to the UI. |
| `portrait` | Their picture, through [`artSrc`](/reference/prose#artsrc): a bare name under `art/` is a `.jpg`. | `art/character/<id>.jpg` |
| `tags` | Labels for your own code. The plugin does not read them. | None. |
| `home` | Where they are when no `schedule` entry holds: a place id from the [places plugin](/plugins/places#locations). | [`OFFSTAGE`](#offstage): nowhere. |
| `schedule` | Where they are while each `when` holds. See [Where people are](#where-people-are). | Always at `home`. |
| `talk` | The scene talking to them opens, or a list of [`TalkOption`](#talkoption)s, the first whose `when` holds. | They cannot be talked to, and have no **Talk** button. |
| `call` | Whether they can be reached from anywhere. See [Calls](#calls). | They cannot be called. |
| `storyline` | The id of their [storyline](/reference/world#storylines). While it is closed, they will not talk or pick up. | Never closed. |
| `met` | Whether the player has met them, as a [condition](/reference/conditions). | Having seen one of their `talk` or `call` scenes. |
| `stats` | Their [entity](/reference/entities#entitydef)'s stats at the start, where they differ from each stat's own `start`. | Each stat's `start`. |
| `flags` | Their entity's variables at the start. | `{}` |

**Inside a character's own conditions, `'$'` is them.** Every `when` in `schedule`, `talk` and `call`, and `met`, is run with `'$'` bound to the character's entity (by [`bindCurrent`](/reference/entities#bindcurrent)), so `{ stat: 'friendship', of: '$', gte: 25 }` in Ava's `talk` is Ava's friendship. Anywhere else, name them in full: `of: person('ava')`.

### TalkOption

```ts
type TalkOption = { scene: string; when?: Condition; label?: string }
```

One way a conversation can open: the `scene`, while `when` holds (always, if left out), with `label` on the **Talk** button (the [`cast/talk`](#strings) string, `Talk`, if left out). [`cast/talk`](#commands) opens the first option in the list whose `when` holds, so put the particular ones first and a plain one last:

```ts
talk: [
  { scene: 'ava.river', when: { all: [isAt('ava', 'park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Walk with Ava' },
  { scene: 'ava.hi' },
]
```

`talk: 'ava.hi'` is short for `talk: [{ scene: 'ava.hi' }]`.

### In a pack

Characters go in a [pack](/reference/loader#pack)'s `data`, under `cast.characters`:

```ts
const ava: CharacterDef = {
  id: 'ava',
  name: 'Ava',
  fullName: 'Ava Marsh',
  role: 'Runs the café',
  hue: 20,
  home: 'park',
  // At the counter in the day; by the river otherwise.
  schedule: [{ location: 'cafe', when: period('morning', 'afternoon') }],
  // By the river, once she is a friend, a different conversation.
  talk: [
    { scene: 'ava.river', when: { all: [isAt('ava', 'park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Walk with Ava' },
    { scene: 'ava.hi' },
  ],
  call: { scene: 'ava.call', when: period('evening', 'night'), busy: 'She’s at the counter. Try this evening.' },
  storyline: 'ava',
}
const sam: CharacterDef = { id: 'sam', name: 'Sam', home: 'park', talk: 'sam.hi', stats: { friendship: 5 } }

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  storylines: [{ id: 'ava', name: 'Ava' }],
  // scenes ava.hi, ava.river, ava.call, sam.hi; places street, cafe, park
  data: {
    places: { locations: [/* ... */] },
    cast: { characters: [ava, sam] },
  },
}
```

The [loader](/reference/loader#pack) merges them by id, as it merges scenes: a later pack's character with the same id replaces the earlier one, whole. So a mod can add someone, or rewrite them. The game's characters, merged, are [`charactersOf(game)`](#helpers).

### Each one is an entity

The plugin brings the kind (through its [`kinds`](/reference/plugins#kinds-and-entities)) and one entity of it per character (through `entities`), named by the character's `name`, with their `stats` and `flags`. A stat the game declares `of: 'character'` is then kept on every character, and read and written as any [entity's stat](/reference/stats#entity-stats):

```ts
startingState(game).entities.character
// { ava: { name: 'Ava', stats: { friendship: 0 }, flags: {} },
//   sam: { name: 'Sam', stats: { friendship: 5 }, flags: {} } }

{ stat: 'friendship', of: person('ava'), gte: 25 }              // a condition: Ava is a friend
{ kind: 'stat', key: 'friendship', by: 10, of: person('ava') }   // an effect: a little more so
{ kind: 'each', of: 'character', effects: [{ kind: 'stat', key: 'friendship', by: -1, of: '$' }] }   // everyone drifts
```

The entities are made when the game loads, from the merged content, so a mod's character has their stats too. An entity the game declares itself with the same kind and id wins, whole. A save made before a character was added gains them when it loads (see [Entities in old saves](/reference/entities#entities-in-old-saves)).

## Where people are

A character is somewhere at every moment, worked out fresh from the state:

1. the `location` of the **first** `schedule` entry whose `when` holds (an entry with no `when` always holds);
2. else their `home`;
3. else [`OFFSTAGE`](#offstage).

**They are here** when that place is the one the places plugin's [`places/here`](/plugins/places#queries) query says the player is in. With the player nowhere, or with no places plugin, nobody is ever here.

```ts
// Monday morning, in the café: Ava is at the counter.
holds(cafe, here('ava'), game)                 // true
// The evening: she has gone to the park.
holds(evening, isAt('ava', 'park'), game)      // true
```

Put exceptions above the rule they break: a Sunday entry above the every-day one. A person whose storyline is closed is still here; talking to them is what is refused, and their **Talk** button says why.

### OFFSTAGE

```ts
const OFFSTAGE = 'offstage'
```

Where a character is when no schedule entry holds and they have no `home`: a place id that matches nothing on the map. Use it as a schedule entry's `location` for when they are out of town. The [checks](#checks) accept it as a place.

## Calls

A character with a `call` can be reached from anywhere with [`cast/call`](#commands): a phone call, a note through the door. It opens a scene without moving the player, and works with or without the places plugin.

| Field | What it is | If left out |
|---|---|---|
| `scene` | The scene a call opens. | Their talk scene: the first `talk` option whose `when` holds, else their first `talk` option. |
| `when` | They pick up while this [condition](/reference/conditions) holds. `'$'` is them. | Always. |
| `busy` | What the player reads while `when` does not hold. Plain text, not a string a game can override. | `<name> does not pick up.` ([`cast/notPickingUp`](#strings)) |

`call: {}` makes someone callable at any time, into their talk scene. Ava, above, picks up only in the evening and at night:

```ts
whyNot(morning, game, call('ava'))   // 'She’s at the counter. Try this evening.'
whyNot(morning, game, call('sam'))   // 'You cannot reach Sam from here.'
apply(evening, game, call('ava')).state.sceneId   // 'ava.call'
```

The view adds no call button of its own. A UI lists the people it can call from the [`cast/contacts`](#queries) query, or a game puts a call on a button as a [game action](/reference/game#actiondef) with `command: call('ava')`, greyed out with the refusals below.

## Meeting people

A character is **met** while their `met` condition holds, with `'$'` as them. With no `met`, they are met once any of their `talk` scenes or their `call.scene` has been [seen](/reference/state#seen): counted as soon as it is on screen.

```ts
met: { flag: 'introduced', of: '$' }   // met once a scene sets their flag
```

Met people are listed in the view's [`people`](#castview), and only met people who can be called are [contacts](#queries).

## A worked example

Ava and Sam above, in a town of a street, a café and a park, with the calendar.

```ts
import { SCHEMA, apply, holds, loadGame, startingState, view, whyNot } from '@ifloom/engine'
import { calendar, period } from '@ifloom/plugin-calendar'
import { go, places } from '@ifloom/plugin-places'
import { cast, call, here, isAt, person, talk, type CastView } from '@ifloom/plugin-cast'

const clock = calendar()
const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [clock, places({ start: 'street' }), cast()],
})
```

How it plays:

```ts
let state = startingState(game)
whyNot(state, game, talk('ava'))     // 'Ava is not here.'

state = apply(state, game, go('cafe')).state   // Monday morning
;(view(state, game).plugins.cast as CastView).present.map((p) => p.id)   // ['ava']
state = apply(state, game, talk('ava')).state
state.sceneId                         // 'ava.hi'

// That evening, in the park.
const park = clock.write(apply(startingState(game), game, go('park')).state, { day: 0, period: 'evening' })
holds(park, isAt('ava', 'park'), game)           // true
apply(park, game, talk('ava')).state.sceneId     // 'ava.hi': not friends yet

// Some evenings later, after scenes whose choices each had
// { kind: 'stat', key: 'friendship', by: 10, of: person('ava') }:
holds(friends, { stat: 'friendship', of: person('ava'), gte: 25 }, game)   // true
;(view(friends, game).plugins.cast as CastView).present[0].actions[0].label   // 'Walk with Ava'
apply(friends, game, talk('ava')).state.sceneId     // 'ava.river'
```

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'cast/talk', with: { who: 'ava' } }` | `talk('ava')` | Opens the first of their [`talk`](#talkoption) options whose `when` holds. |
| `{ type: 'custom', name: 'cast/call', with: { who: 'ava' } }` | `call('ava')` | Opens their `call.scene`, else their talk scene, from anywhere. |

`cast/talk` is refused, in this order, with:

1. `Finish this first.` (the engine's [`finishFirst`](/reference/strings#refusals)) while a scene is open;
2. `There is no such person.` ([`cast/noSuchPerson`](#strings)) when the game has no character with that id;
3. `Ava is not here.` ([`cast/notHere`](#strings)) when they are not [here](#where-people-are);
4. `Ava is not taking this right now.` ([`cast/notTaking`](#strings)) while their storyline is closed;
5. `Ava has nothing to say just now.` ([`cast/nothingToSay`](#strings)) when no `talk` option's `when` holds, or they have no `talk`.

`cast/call` is refused, in this order, with:

1. `Finish this first.` while a scene is open;
2. `There is no such person.` ([`cast/noSuchPerson`](#strings));
3. `You cannot reach Ava from here.` ([`cast/cannotCall`](#strings)) when they have no `call`;
4. `Ava is not taking this right now.` ([`cast/notTaking`](#strings)) while their storyline is closed;
5. their `call.busy`, or `Ava does not pick up.` ([`cast/notPickingUp`](#strings)), while `call.when` does not hold.

A [lock](/reference/locks#lock) names them `cast/talk` and `cast/call`, or `cast/*` for both. Neither lists any effects, so a lock with `effect` does not see them, and no plugin puts a price on them.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'cast/here': ['ava', 'sam'] }` | `here('ava', 'sam')` | Any of them is in the room with the player. |
| `{ 'cast/at': { who: 'ava', at: ['park'] } }` | `isAt('ava', 'park')` | They are in one of these places, wherever the player is. |
| `{ 'cast/met': ['ava'] }` | `hasMet('ava')` | The player has [met](#meeting-people) any of them. |

These are the short forms, with the full name as the only key (see [plugin calls](/reference/custom#plugincall)). The long form of the first row is `{ custom: 'cast/here', with: { value: ['ava', 'sam'] } }`. A single id works too: `{ 'cast/here': 'ava' }`. A character the game does not have never holds.

`cast/at` reads the schedule alone, so it works without places, and can be asked about someone the player cannot see: `isAt('ava', OFFSTAGE)` holds while she is out of town.

## Queries

Answers for other plugins' code, through the context's [`query`](/reference/plugins#queries). Content cannot ask them. The character is given as `{ value }`, `{ who }` or `{ id }`.

| Query | Answers |
|---|---|
| `cast/person` | `{ id, name, hue, portrait }` for that character, as the [speaker hook](#speakers) gives it, or `undefined`. |
| `cast/present` | The ids of everyone in the room, in the game's order. Empty with no places plugin or the player nowhere. |
| `cast/where` | Where that character is: a place id or `OFFSTAGE`; `undefined` for one the game does not have. |
| `cast/contacts` | Everyone [met](#meeting-people) who has a `call`, each as `{ id, name, role, portrait, command, disabled }` (`role` is `null` when they have none): `command` is `call(id)`, and `disabled` is the [refusal](#commands) it would get now, or `undefined`. |

```ts
// A phone plugin's contacts app.
const people = query<{ id: string; name: string; disabled?: string }[]>('cast/contacts') ?? []
```

`cast/contacts`'s `disabled` is [`whyNot`](/reference/actions#whynot) of the call: a lock, a guard or the plugin's own refusal.

## Speakers

A scene whose [`speaker`](/reference/scenes#sceneview) is a character's id is drawn as them: the plugin's [speaker hook](/reference/plugins#speakers) answers with their `name`, `hue` and portrait (`art/character/<id>.jpg` if they have none), at `view.scene.speaker`.

```ts
scenes: [{ id: 'ava.hi', speaker: 'ava', body: [{ text: 'ava.hi' }], choices: [/* ... */] }]

view(state, game).scene.speaker   // { id: 'ava', name: 'Ava', hue: 20, portrait: 'art/character/ava.jpg' }
```

Talking to someone does not set the speaker: a scene names its own. An id the cast does not have is left to the next plugin that has a speaker hook. When no plugin knows it, `view.scene.speaker` is `null`: the scene has no speaker shown.

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
| `present` | Who is in the room, in the game's order. Empty while a scene is open, or while a lock stops everything ([`lockedOut`](/reference/locks#lockedout)). |
| `people` | Everyone the player has [met](#meeting-people), wherever they are, in the game's order. Shown even during a scene. |

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
| `ref` | How content names their entity: `'character:ava'`, with the plugin's `kind`. |
| `fullName` | Their `fullName`, or `name`. |
| `role` | Their `role`, or `null`. |
| `portrait` | Their `portrait`, or `art/character/<id>.jpg`. |
| `here` | In the room with the player. |
| `closed` | Their storyline is closed for now. |
| `met` | The player has [met](#meeting-people) them. |
| `actions` | The **Talk** button, as a [`RenderedChoice`](/reference/view#renderedchoice) sending `talk(id)`, labelled by the talk option that would open (its `label`, else the [`cast/talk`](#strings) string) and greyed out with its [refusal](#commands). Empty for someone with no `talk`. |

In the café on Monday morning, Ava's card:

```ts
{
  id: 'ava', ref: 'character:ava', name: 'Ava', fullName: 'Ava Marsh', role: 'Runs the café', hue: 20,
  portrait: 'art/character/ava.jpg', here: true, closed: false, met: false,
  actions: [{ id: 'talk-ava', label: 'Talk', command: talk('ava'), /* price, disabled */ }],
}
```

A met person who is elsewhere is in `people` with their button greyed out: `Ava is not here.`

## Strings

The plugin's lines, in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key, `cast/...`. `{name}` is the character's `name`.

| Key | English |
|---|---|
| `cast/talk` | `Talk` |
| `cast/noSuchPerson` | `There is no such person.` |
| `cast/notHere` | `{name} is not here.` |
| `cast/notTaking` | `{name} is not taking this right now.` |
| `cast/nothingToSay` | `{name} has nothing to say just now.` |
| `cast/cannotCall` | `You cannot reach {name} from here.` |
| `cast/notPickingUp` | `{name} does not pick up.` |

Both commands also say the engine's own [`finishFirst`](/reference/strings#refusals) (`Finish this first.`), reworded with it. A character's `call.busy` and a talk option's `label` are plain text written into the content.

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
| `person` | How content names a character's entity, for `of`: `person('ava')` is `'character:ava'`. With a different [`kind`](#castoptions), pass it: `person('ava', 'neighbour')`. |

## Checks

When the game loads, two kinds of problem are reported.

**Character ids content names.** Every character named in `cast/here`, `cast/at` (its `who`) or `cast/met`, wherever the loader checks conditions, and in a `cast/talk` or `cast/call` on a game action or a plugin's button. One the game does not have is reported where it is named:

```text
town · activity wave · unknown character "ghost"
```

**The characters themselves**, pinned on the pack each came from, with `where` as `characters <id>`:

- a `talk` scene the game does not have (`talks in unknown scene "…"`);
- a `call.scene` the game does not have (`calls open unknown scene "…"`);
- a `storyline` the game does not have (`unknown storyline "…"`);
- what a `schedule`, `talk` or `call` `when`, or `met`, names that the game does not have, with `'$'` standing for any character, so `{ stat: 'trust', of: '$' }` is checked against the stats declared `of: 'character'`;
- with the places plugin, a `home` or schedule `location` it does not know (asked through [`places/known`](/plugins/places#queries)); `OFFSTAGE` is accepted. Without places, they are not checked.

```text
town · characters mole · talks in unknown scene "mole.hi"
town · characters mole · unknown storyline "tunnels"
town · characters mole · unknown location "burrow"
```

The places in `cast/at` are not checked.

## Gotchas

- **No places, nobody here.** Without the places plugin, `present` is empty, `cast/here` never holds and `cast/talk` says `Ava is not here.`. Calls, `cast/at`, `cast/met` and the speaker hook still work.
- **`'$'` is bound only in a character's own conditions.** In a scene, an activity or a trigger, write `of: person('ava')`.
- **The first entry wins.** A schedule entry or talk option with no `when` always holds: nothing below it is reached.
- **Met is by scene, unless you say otherwise.** Without `met`, someone whose talk scene the player has never opened is not met, even after speaking in another scene as its `speaker`; give them a `met` condition if they should be.
- **A call with nowhere to go** — `call` but no `call.scene` and no `talk` — is reported when the game loads.
