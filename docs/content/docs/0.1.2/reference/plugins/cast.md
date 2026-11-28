---
title: "Cast"
description: "The cast plugin gives a game characters with their own hours, whom the player can find, talk to and call."
---
`@ifloom/plugin-cast` gives a game its [characters](/docs/0.1.2/reference/glossary#character): people with their own hours, who the player can find, talk to and call. A character is an [entity](/docs/0.1.2/reference/glossary#entity) carrying the `cast/person` trait, so a stat the game declares `of: 'character'`, such as a friendship, is kept on each one. The cast keeps no state of its own and works out where everyone is from their schedules each time. It [cooperates](/docs/0.1.2/reference/plugin-queries#cooperates) with [places](/docs/0.1.2/reference/plugins/places), which it asks where the player is, and with the [calendar](/docs/0.1.2/reference/plugins/calendar), whose conditions schedules read. [Entities, things and traits](/docs/0.1.2/explanation/entities-and-traits#locations-characters-and-vendors-are-entities) explains why a character is an entity, [Add a plugin](/docs/0.1.2/how-to/add-a-plugin) installs it, and [Add a character with a schedule](/docs/0.1.2/how-to/add-a-character) builds one.

In the showcase: `examples/showcase/src/world/cast.ts`, which declares Ava and Sam with schedules, talk options and, for Ava, a call.

```ts
import { cast, peopleOf, personOf, AWAY, type CastOptions, type CastView, type Person, type PersonDef, type PersonView, type TalkOption } from '@ifloom/plugin-cast'
```

## cast

The plugin's factory, which returns the plugin with the id `cast`. Every field of its result is in [`cast`](/docs/0.1.2/api/plugin-cast#cast), and its helpers are listed under [Functions](#functions).

The cast keeps nothing in a save, so its state is `null`. It asks places where the player is by name, so its place in `plugins` changes nothing. Without places nobody is ever in the room, though calls, `cast/at`, `cast/met` and speakers still work. Without the calendar, a schedule's `calendar/…` conditions load and never hold.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'
import { places } from '@ifloom/plugin-places'

export const plugins = [calendar(), places({ start: 'flat' }), cast()]
```

### CastOptions

The plugin's settings. Every field is in [`CastOptions`](/docs/0.1.2/api/plugin-cast#castoptions).

`kind` is the id of the [kind](/docs/0.1.2/reference/entities#kinddef) the plugin declares for its characters, `character` if left out, and the kind a bare id names. With `kind: 'neighbour'`, `cast.talk('ava')` means `'neighbour:ava'`. The plugin's kind is unique, labelled `Person` and `People`, and listed once the player has met someone. A game that declares a kind with the same id has its fields laid over the plugin's (see [`content`](/docs/0.1.2/reference/plugin-views#content)), so a mod or a translation can reword it.

## Content

### PersonDef

A character the game declares in `entities`, written with `cast.person()`: the entity's fields and the [`Person`](#person) trait's fields side by side. Every field is in [`PersonDef`](/docs/0.1.2/api/plugin-cast#persondef).

`cast.person()` returns an [`EntityDef`](/docs/0.1.2/reference/entities#entitydef) of the cast's kind, or of `of`, with the trait's fields in `traits['cast/person']`. The entity keeps the `id`, `name`, `description`, `image`, `tags`, starting `stats` and `kv`, and `ui`. The `name` is shown over the character's lines, on their card and in refusals such as `Ava is not here.`, with its [tokens](/docs/0.1.2/reference/prose#tokens) filled. A `name` of `'{{friendName|Your oldest friend}}'` is whatever the player typed into an [input](/docs/0.1.2/reference/inputs) with that key, and the words after the `|` until then.

```ts
import { cast } from '@ifloom/plugin-cast'

export const sam = cast.person({ id: 'sam', name: 'Sam', description: 'Neighbour', home: 'park', talk: 'sam.hi' })
// { id: 'sam', name: 'Sam', description: 'Neighbour', of: 'character',
//   traits: { 'cast/person': { home: 'park', talk: 'sam.hi' } } }
```

A pack's `character:sam` replaces the game's whole, and a pack can give the trait to any entity in its [`traits`](/docs/0.1.2/reference/content#traits) table. Anyone with the trait is a character, whatever their kind, so a café game names one of its `staff` in full, as `cast.talk('staff:ana')`.

Each character is [`unique`](/docs/0.1.2/reference/entities#unique), so they can hold things. The kind is [`listed`](/docs/0.1.2/reference/entities#listed) with `{ 'cast/met': { character: '$' } }`, so `view.entities` lists only the characters the player has met. A game redeclares the kind to list everyone:

```ts
import type { Content } from '@ifloom/engine'

export const people: Content = {
  kinds: [{ id: 'character', label: 'Person', plural: 'People', listed: true, flags: { met: { 'cast/met': { character: '$' } } } }],
}
```

### TalkOption

One way a conversation can open, an entry of the trait's `talk`. Every field is in [`TalkOption`](/docs/0.1.2/api/plugin-cast#talkoption).

[`cast/talk`](#casttalk) opens the `scene` of the first option whose `when` holds, so the particular options go first and a plain one last. `label` goes on the Talk button, the `cast/talk` string if left out. `talk: 'ava.hi'` is short for `talk: [{ scene: 'ava.hi' }]`.

```ts
import type { TalkOption } from '@ifloom/plugin-cast'
import { places } from '@ifloom/plugin-places'

export const talk: TalkOption[] = [
  { scene: 'ava.river', when: { all: [places.at('park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Sit with Ava' },
  { scene: 'ava.hi' },
]
```

## Traits

### Person

The `cast/person` trait, which makes any entity carrying it a character the player can find, meet and talk to. Every field is in [`Person`](/docs/0.1.2/api/plugin-cast#person). The plugin types it in `TraitRegistry`, so [`traitOf`](/docs/0.1.2/reference/entities#traitof) reads a `Person`.

Inside a character's own conditions, `'$'` stands for them. Every `when` in `schedule`, `talk` and `call`, and `met` itself, runs with `'$'` bound to the character's entity by [`bindCurrent`](/docs/0.1.2/reference/entities#bindcurrent). Anywhere else, content names them in full, as `of: cast.character('ava')`.

| Field | Meaning |
|---|---|
| `home` | The location they are at when no `schedule` entry holds, and [`AWAY`](#away) if left out. |
| `schedule` | Entries of a `location` and a `when`. The character is at the location of the first entry whose `when` holds, and an entry with no `when` always holds, so exceptions go above the rule they break. |
| `talk` | The scene that talking opens, or a list of [`TalkOption`](#talkoption)s. A character with no `talk` has no Talk button. |
| `call` | A `scene`, a `when` and a `busy` line that make the character reachable from anywhere by [`cast/call`](#castcall). `call: {}` is a call at any time into their talk scene. |
| `storyline` | The [storyline](/docs/0.1.2/reference/storylines) whose closing stops them talking and picking up. They are still here while it's closed. |
| `met` | A [condition](/docs/0.1.2/reference/conditions) for having met them. With none, they are met once the player has [seen](/docs/0.1.2/reference/state#seen) one of their `talk` scenes or their `call.scene`. |
| `portrait` | A face for avatars, a path in `art/` as an `image` is, and their `image` if left out. Other plugins ask for it with `cast/portrait`. |
| `pronouns` | Words for prose such as `{ they: 'she', them: 'her' }`, which the plugin doesn't read or pass to the view. |

A character made in play [`like`](/docs/0.1.2/reference/entities#entitystate) another has their trait, schedule included, unless it was made with trait data of its own.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'

export const ava = cast.person({
  id: 'ava',
  name: 'Ava',
  fullName: 'Ava Marsh',
  description: 'Runs the café',
  image: 'art/character/ava.svg',
  ui: { hue: 20 },
  home: 'park',
  schedule: [{ location: 'cafe', when: { all: [calendar.weekday(0, 1, 2, 3, 4, 5), calendar.period('morning', 'afternoon')] } }],
  talk: 'ava.hi',
  storyline: 'ava',
  call: { scene: 'ava.call', when: calendar.period('evening', 'night'), busy: 'She’s busy at the counter. Try her this evening.' },
})
```

### AWAY

The location a character is at when no schedule entry holds and they have no `home`, `'away'`. Its value is in [`AWAY`](/docs/0.1.2/api/plugin-cast#away).

It matches no location on the map, so a character there is never here. A schedule entry can name it for time out of town, and `cast.at('ava', AWAY)` holds while she is. The checks accept it as a location.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { AWAY, type Person } from '@ifloom/plugin-cast'

export const schedule: Person['schedule'] = [{ location: AWAY, when: calendar.weekday(6) }]
```

## Conditions

Each condition is a [plugin call](/docs/0.1.2/reference/custom#plugincall), written by the helper beside it. A character is an id, a list of ids, or a whole reference such as `'character:ava'`, which is what `'$'` becomes. A character the game doesn't have never holds.

### cast/here

Holds while any of the named characters is at the location the [`places/here`](/docs/0.1.2/reference/plugins/places#queries) query names. It never holds while the player is nowhere or the game has no places.

```ts fragment
{ 'cast/here': { character: ['ava', 'sam'] } } // cast.here('ava', 'sam')
```

### cast/at

Holds while the character is at one of the named locations, wherever the player is. It reads the schedule alone, so it works without places. A location is an id or a reference, such as `location:park`, which a [phrase's argument](/docs/0.1.2/reference/phrases#args) passes for `place=park`.

```ts fragment
{ 'cast/at': { character: 'ava', at: ['park'] } } // cast.at('ava', 'park')
```

### cast/met

Holds once the player has met any of the named characters, by their [`met`](#person) condition or their scenes.

```ts fragment
{ 'cast/met': { character: ['ava'] } } // cast.met('ava')
```

## Commands

Neither command lists effects, so a lock with `effect` doesn't see them and no plugin prices them. A lock names them `cast/talk` and `cast/call`, or `cast/*`.

### cast/talk

Opens the scene of the character's first [`TalkOption`](#talkoption) whose `when` holds.

```ts fragment
{ 'cast/talk': { id: 'ava' } } // cast.talk('ava')
```

The plugin refuses it, in this order:

1. With `Finish this first.` ([`finishFirst`](/docs/0.1.2/reference/strings#refusals)) while a scene is open.
2. With `There is no such person.` (`cast/noSuchPerson`) when no entity with the trait has that id.
3. With `Ava is not here.` (`cast/notHere`) when the character isn't here.
4. With `Ava is not taking this right now.` (`cast/notTaking`) while their storyline is closed.
5. With `Ava has nothing to say just now.` (`cast/nothingToSay`) when no talk option's `when` holds, or they have no `talk`.

### cast/call

Opens the character's `call.scene` from anywhere, without moving the player, or else their talk scene. The view offers no call button of its own. A UI lists the characters it can call from the `cast/contacts` query, or a game puts the command on an [action](/docs/0.1.2/reference/actions#actiondef).

```ts fragment
{ 'cast/call': { id: 'ava' } } // cast.call('ava')
```

The plugin refuses it, in this order:

1. With `Finish this first.` while a scene is open.
2. With `There is no such person.` (`cast/noSuchPerson`).
3. With `You cannot reach Ava from here.` (`cast/cannotCall`) when the character has no `call`.
4. With `Ava is not taking this right now.` (`cast/notTaking`) while their storyline is closed.
5. With their `call.busy`, or `Ava does not pick up.` (`cast/notPickingUp`), while `call.when` doesn't hold.

## Queries

Other plugins ask these through their context's [`query`](/docs/0.1.2/reference/plugin-queries#query), and content can't. A character is given as `{ character }`, an id or a reference, and lists follow [`peopleOf`](#peopleof). The cast declares them all in its `QueryRegistry`, with the answers [`CastContact` and `SenderView`](#castcontact-and-senderview), so they're typed in a game that imports it. A plugin that doesn't import it gives the answer's type, naming only the fields it reads.

| Key | Meaning |
|---|---|
| `cast/present` | The ids of everyone here, empty with no places or with the player nowhere. |
| `cast/where` | The location a character is at, or `AWAY`, and `undefined` for one the game doesn't have. |
| `cast/portrait` | A character's face for avatars, their `portrait` or else their picture, through [`artSrc`](/docs/0.1.2/reference/prose#artsrc). The messages and feed plugins ask it. |
| `cast/contacts` | Everyone met who has a `call`, each a `CastContact` whose `command` is `cast.call(id)` and whose `disabled` is the refusal the call would get now. |
| `cast/sender` | The name, image and portrait of the entity a message or post is from, given as `{ from }`. An id that names no entity answers `{ name: from, image: null, portrait: null }`. |

A contacts plugin lists them in its view without importing the cast, giving the fields it reads:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

type Contact = { id: string; name: string; disabled: string | undefined }

export const contacts = definePlugin<null>({
  id: 'contacts',
  version: 1,
  view: (_state, { query }) => ({ people: (query<Contact[]>('cast/contacts') ?? []).map(({ id, name, disabled }) => ({ id, name, disabled })) }),
})
```

### CastContact and SenderView

`CastContact` is one person the player can call, as `cast/contacts` answers, and `SenderView` is who a message or a post is from, as `cast/sender` answers. Their fields are in [`CastContact`](/docs/0.1.2/api/plugin-cast#castcontact) and [`SenderView`](/docs/0.1.2/api/plugin-cast#senderview).

A contact's `command` is [`cast.call(id)`](#castcall) in the short form, ready for an action's `command`, and its `disabled` says why the call can't go through now, or is `undefined` when it can. A phone's contacts app lists them. The [messages](/docs/0.1.2/reference/plugins/messages) and [feed](/docs/0.1.2/reference/plugins/feed) plugins ask `cast/sender` for a sender's name and face, and fall back to [`speakerOf`](/docs/0.1.2/reference/plugin-views#speakerof) in a game without the cast.

```ts given
import { pluginQuery } from '@ifloom/engine'
import '@ifloom/plugin-cast'

const contacts = pluginQuery(game, 'cast/contacts')?.(state) ?? []
const names = contacts.filter((contact) => !contact.disabled).map((contact) => contact.name)
```

## Values

Prose prints this as a token.

| Key | Meaning |
|---|---|
| `{{cast/name character=ava}}` | The character's name as the player reads it, tokens filled, and nothing for an entity that isn't a character. In a phrase that takes `who`, `{{cast/name character=$who}}` prints whoever the phrase was given. |

## View

A scene whose [`speaker`](/docs/0.1.2/reference/scenes#speaker) is a character's id shows them as its speaker without the cast's help, because the engine reads the entity's `name`, `image` and `ui` itself into `view.scene.speaker`. A spoken line written under their id, `@ava: "Morning."`, gets the same speaker. A character with no `image` has no picture as a speaker, even though the cast's own view guesses one for their card.

### CastView

The characters as the player sees them, in `view.plugins.cast`. Every field is in [`CastView`](/docs/0.1.2/api/plugin-cast#castview).

`present` lists everyone here in the game's order, and is empty while a scene is open or a lock stops everything ([`lockedOut`](/docs/0.1.2/reference/locks#lockedout)). `people` lists everyone the player has met, wherever they are, and stays filled during a scene. The stats the player can see on a character are on their entry in [`view.entities`](/docs/0.1.2/reference/entities#view) while the game lists the kind.

### PersonView

One character as the player sees them, in `present` and `people`. Every field is in [`PersonView`](/docs/0.1.2/api/plugin-cast#personview).

`id` is the bare id for a character of the cast's kind and the whole reference for any other. `image` is the entity's `image`, or `art/<kind>/<id>.jpg`, through `artSrc`, and `portrait` is the trait's `portrait`, or else `image`. `ui` is the entity's [UI hints](/docs/0.1.2/reference/ui-hints) over its kind's, as [`entityUi`](/docs/0.1.2/reference/ui-hints#entityui) reads them. `actions` holds the Talk button, a [`RenderedChoice`](/docs/0.1.2/reference/view#renderedchoice) that sends `cast.talk(id)`, labelled by the talk option that would open and refused with its reason. A met character elsewhere is in `people` with the button refused as `Ava is not here.`

```ts fragment
{
  id: 'ava', ref: 'character:ava', name: 'Ava', fullName: 'Ava Marsh', description: 'Runs the café', ui: { hue: 20 },
  image: 'art/character/ava.svg', portrait: 'art/character/ava.svg', here: true, closed: false, met: false,
  actions: [{ id: 'talk-ava', label: 'Talk', command: cast.talk('ava') }],
}
```

[Render the people](/docs/0.1.2/how-to/render/world-plugins#render-the-people) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-cast/react` subpath renders the cast for a game that uses [`@ifloom/react`](/docs/0.1.2/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) adds it to a game.

### castUi

The plugin's [`PluginUi`](/docs/0.1.2/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It puts [`PeopleHere`](#peoplehere) after the room's actions and [`PeopleSection`](#peoplesection) in the side column, and renders [`Relationships`](#relationships) as the `people` panel. Its type is in [`castUi`](/docs/0.1.2/api/plugin-cast#castui).

### CAST_WORDS

The words `castUi` uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`CAST_WORDS`](/docs/0.1.2/api/plugin-cast#cast_words). It holds one key, `ui.people`, `People`.

### PeopleSection

Renders the side column's People [`Section`](/docs/0.1.2/reference/react/components#section), with the id `people` and the title `ui.people`, as a button that opens `Relationships` in a dialog. Its type is in [`PeopleSection`](/docs/0.1.2/api/plugin-cast#peoplesection).

### PeopleHere

Renders everyone in `view.plugins.cast.present`, each with their portrait, name and description and a [`ChoiceButton`](/docs/0.1.2/reference/react/components#choicebutton) for each of their actions. Its props are in [`PeopleHere`](/docs/0.1.2/api/plugin-cast#peoplehere).

It renders nothing when nobody is here or the game has no cast. A game replaces it as `PeopleHere` in [`components`](/docs/0.1.2/reference/react/components#components). Its parts are `people`, `person` (with `data-person`), `person-portrait`, `person-name`, `person-desc` and `person-actions`.

### Relationships

Renders everyone in `view.plugins.cast.people` with their portrait, name and description, and the stats the player can see on them from `view.entities`, as the [`StatList`](/docs/0.1.2/reference/react/components#statlist) renders stats. Its props are in [`Relationships`](/docs/0.1.2/api/plugin-cast#relationships).

It renders nothing before anyone is met or without the cast. A game replaces it as `Relationships` in `components`. Its parts are `relationships`, `relationship` (with `data-person`), `relationship-header`, `relationship-stats`, and the `person-` and `stat-` parts inside.

### usePeople

Returns the cast's [`CastView`](#castview) from the running game, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`usePeople`](/docs/0.1.2/api/plugin-cast#usepeople).

## Functions

The helpers are properties of `cast` and write its calls, typed:

- **`cast.person(def)`** returns a character's [`EntityDef`](#persondef).
- **`cast.character(id, kind?)`** returns a character's entity reference, `'character:ava'` for `'ava'`, for `of`, `at` and `entity`. A game with another [`kind`](#castoptions) passes it.
- **`cast.talk(id)`** and **`cast.call(id)`** return the [commands](#commands).
- **`cast.here(...ids)`**, **`cast.at(id, ...locations)`** and **`cast.met(...ids)`** return the [conditions](#conditions).

A friendship is a stat on the character's kind, read and changed with `cast.character()`:

```ts
import type { Condition, Effect, StatDef } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const stats: StatDef[] = [{ id: 'friendship', label: 'Friendship', of: 'character' }]
export const closeToAva: Condition = { stat: 'friendship', of: cast.character('ava'), gte: 25 }
export const chat: Effect = { stat: 'friendship', by: 5, of: cast.character('ava') }
```

### peopleOf

Returns everyone in the game now with the `cast/person` trait, as references, those content declares in its order and then those made in play. Its signature is in [`peopleOf`](/docs/0.1.2/api/plugin-cast#peopleof).

### personOf

Returns a character's `cast/person` trait as play reads it, through what they were made `like`, or `undefined` for an entity not in the game or without the trait. Its signature is in [`personOf`](/docs/0.1.2/api/plugin-cast#personof).

```ts given
import { peopleOf, personOf } from '@ifloom/plugin-cast'

peopleOf(state, game) // ['character:ava', 'character:sam']
personOf(state, game, 'character:ava')?.home // 'park'
```

## Checks

When the game loads, the cast checks every character its calls name, wherever content writes them, and the trait on each entity that has it, with `where` as `trait cast/person on <ref>`.

| Problem | Cause |
|---|---|
| `action wave · unknown entity "character:ghost"` | A `cast/here`, `cast/at`, `cast/met`, `cast/talk` or `cast/call` names a character the game doesn't have. |
| `talk: opens unknown scene "mole.hi"` | A talk option names a scene the game doesn't have. |
| `call: opens unknown scene "mole.call"` | `call.scene` names a scene the game doesn't have. |
| `can be called, but a call opens no scene: give call a scene, or them a talk` | The character has a `call` with no `scene` and no `talk`. |
| `unknown storyline "tunnels"` | `storyline` names a storyline the game doesn't have. |
| `unknown location "burrow"` | With places, `home` or a schedule entry names a location places doesn't know, asked through `places/known`. `AWAY` is accepted. |

The checker also checks what a schedule's, talk option's or call's `when`, or `met`, names, with `'$'` read as any character of the kind. The locations in `cast/at` aren't checked. An `image` the game gives is listed in the checker's [`files`](/docs/0.1.2/reference/checks#fileref), and the default `art/character/<id>.jpg` isn't.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/0.1.2/reference/strings#stringkey-and-strings). `{name}` is the character's name. Both commands also use the engine's `finishFirst`, and a call's `busy` and a talk option's `label` are words in place in the content.

| Key | Meaning |
|---|---|
| `cast/talk` | `Talk`, the Talk button's label when the talk option gives none. |
| `cast/noSuchPerson` | `There is no such person.` |
| `cast/notHere` | `{name} is not here.` |
| `cast/notTaking` | `{name} is not taking this right now.`, the refusal while their storyline is closed. |
| `cast/nothingToSay` | `{name} has nothing to say just now.` |
| `cast/cannotCall` | `You cannot reach {name} from here.` |
| `cast/notPickingUp` | `{name} does not pick up.` |

## Caveats

- Without places, `present` is empty, `cast/here` never holds and every `cast/talk` is refused with `Ava is not here.`
- A character who only speaks as another scene's speaker isn't met, because `met` defaults to their own `talk` and `call` scenes, so give them a `met` condition.
- The checker reads tokens in prose and blocks, not in names, so it doesn't report a name whose token has no fallback, which prints nothing until its key is set.
- `ifloom check` reports an `image` whose file is missing, so leave `image` out until the art exists. The React UI leaves out a default picture whose file is missing.
