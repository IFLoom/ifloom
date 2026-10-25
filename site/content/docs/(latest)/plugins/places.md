---
title: "Places"
description: "Locations with exits, walking between them, where the player is, opening hours, room actions and the picture stage."
---
`@ifloom/plugin-places` gives a game a map. You declare locations with exits between them and things to do in each, and the plugin keeps track of where the player is and lets them walk from one place to the next.

You'd want it for any game where the player moves around a world: a town in a life sim, the rooms of a house in a mystery, the floors of a shop in a management game. A linear novel that moves from scene to scene doesn't need it.

The plugin keeps the player's location in its own state, `{ at }`. While no scene is open, it fills the screen with the room's description, offers the room's actions as buttons, and hands the UI the exits. A location is an [entity](/docs/reference/entities) that carries the `places/location` [trait](/docs/reference/entities#traits), written with [`places.location()`](#location) in your content's `entities`, so a mod adds a room or changes one as it would any entity.

These are the parts of a game that deal with places, and where each one comes from:

- **The map** is your content's places, each written with [`places.location()`](#location) and naming its `exits`.
- **Walking** is the [`places.go()`](#commands) command, which the view hands the UI on each [exit](#exitview).
- **Being somewhere at once** (a lift home, or a scene that ends across town) is the [`places.move()`](#effects) effect.
- **Opening hours** are a location's `blocked` entries, written with the [calendar](/docs/plugins/calendar)'s conditions. See [Opening hours](#opening-hours).
- **"Only in the café"** is an action in the café's own `actions`, the [`places.at()`](#conditions) condition, or [`places.onlyAt()`](#helpers) in a game action's `blocked` list.
- **The header** is the plugin's [label](#the-label), at `view.when`.
- **Things lying somewhere**, such as a dropped scarf or a parcel left in the hall, are held by the place's [entity](#each-place-is-an-entity), and the view lists them with a button to [pick each up](#things-lying-in-a-place).

```ts
import { places, locationsOf, locationOf, LOCATION, type PlacesOptions, type PlacesState, type PlacesView, type PlaceView, type ExitView, type LyingView, type Place, type PlaceDef, type Arrival } from '@ifloom/plugin-places'
```

The [cast](/docs/plugins/cast) plugin finds out who's in the room by asking this plugin's [`places/here`](#queries) query. So a character's `home` and `schedule` locations name this plugin's place ids, and in a game without places nobody is ever in the room (see [Where people are](/docs/plugins/cast#where-people-are)).

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-places": "^0.0.0"
  }
}
```

Then add `places(...)` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

List it after the calendar. Plugins' [labels](/docs/reference/plugins#labels) are joined in the order `game.plugins` lists them, so with the calendar first the header reads `Day 1 · Monday morning · High Street`.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

const plugins = [calendar(), places({ start: 'flat' })]
```

## places

```ts
function places(options?: PlacesOptions): DefinedPlugin<PlacesState, PlacesView>
```

Builds the plugin, with the id `places`. Call it once, when you build the game. With no options, a new game starts nowhere.

```ts
import { loadGame, startingState, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

declare const town: Content

const map = places({ start: 'flat' })
const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), map] })

map.read(startingState(game), game)   // { at: 'flat' }
```

`read` and `write` come from [`definePlugin`](/docs/reference/plugins#defineplugin) and are meant for tests and tools. `map.write(state, { at: 'park' })` puts the player somewhere without a command.

### PlacesOptions

```ts
type PlacesOptions = {
  start?: string
}
```

| Field | What it is | If left out |
|---|---|---|
| `start` | The id of the place a new game starts in. | Nowhere: `{ at: null }`. Nothing is drawn but the game's title and its buttons, and `places/go` is refused until a [`places/move`](#effects) puts the player somewhere. |

The options are code, not content, so a mod can't change them. Everything a mod could change, the places themselves and what happens as the player walks in (a place's [`arrive`](#arrival)), is content.

## Locations

### location

```ts
const places: {
  location(def: PlaceDef): EntityDef
}

type PlaceDef = Omit<EntityDef, 'of' | 'ui'> & Place & { of?: string }
```

Writes a place for your content's `entities`. You give it the entity's fields and the `places/location` trait's fields side by side, and it returns an [`EntityDef`](/docs/reference/entities#entitydef) of the kind `location` with the trait's fields in `traits['places/location']`. Give `of` to make the place an entity of another kind, such as a boat the player can step aboard.

```ts
import { places } from '@ifloom/plugin-places'

places.location({ id: 'cafe', name: 'The Corner Café', description: 'Café', exits: ['high-street'], body: [{ prose: 'place.cafe' }] })
// { id: 'cafe', of: 'location', name: 'The Corner Café', description: 'Café',
//   traits: { 'places/location': { exits: ['high-street'], body: [{ prose: 'place.cafe' }] } } }
```

The entity's own fields are the place's:

| Field | What it is |
|---|---|
| `id` | What content names the place by, as in `places.go('cafe')` or `places.at('cafe')`. Unique among the entities of its kind. |
| `name` | Shown on the exit, as the screen's title while the player is here, and in the [label](#the-label). Tokens are filled, as in any entity's name. |
| `description` | A word or two under the name, such as `Home` or `Café`. |
| `image` | The place's picture, through [`artSrc`](/docs/reference/prose#artsrc). The checker lists it in its [`files`](/docs/reference/checks#fileref), as any entity's picture. |
| `tags` | Words your UI can style or filter places by, such as `['outdoors']`. The view passes them through, and the plugin gives them no meaning. |

Every other entity field (`at`, `visible`, `stats`, `kv`, `traits`) works as on any entity. `ui` is left out because a place's `ui` is the room's, in the trait.

### The location trait

```ts
type Place = {
  parent?: string
  exits: readonly string[]
  stage?: MediaStage
  blocked?: Blocked[]
  body: Block[]
  actions?: ActionDef[]
  audio?: Record<string, string | null>
  ui?: Ui<SceneUi>
  arrive?: Arrival
}
```

What the `places/location` trait holds. Any entity that carries it is a place the player can be in.

| Field | What it is |
|---|---|
| `parent` | The place it's inside, such as a room's building. [`places/within`](#conditions) follows it. |
| `exits` | The places one step away, by id. Exits are one-way, so list the way back on the other place too. |
| `stage` | A layered picture with hotspots, as a [scene's stage](/docs/reference/scenes#the-stage). Its hotspots send a `command`, because a place has no choices. See [The picture stage](#the-picture-stage). |
| `blocked` | Walking in here is refused while one of these [conditions](/docs/reference/conditions) holds. The first that holds gives the `reason`, which is both the refusal and the exit's `disabled` text. With `hide: true`, the exit is left off the screen while it holds, instead of greyed out. |
| `body` | What the player reads here while no scene is open. These are [prose blocks](/docs/reference/scenes#block), exactly as in a data scene's body, so pictures and videos sit in it in order, from markup or `{ media }` blocks. |
| `actions` | What there is to do here, as [`ActionDef`](/docs/reference/actions#actiondef) buttons. They're drawn before the game's own `actions`. |
| `audio` | What plays on background [audio channels](/docs/reference/audio#channels) while the player is here, by channel, such as `{ ambience: 'cafe.murmur' }`. `null` silences a channel. See [Audio](#audio). |
| `ui` | [Presentation hints](/docs/reference/ui-hints) for the room while no scene is open, carried to `view.scene.ui` as a scene's are. The React UI reads [`transition`](/docs/react/hints#transition): `{ ui: { transition: 'slide-left' } }` slides the room in. The view's [`scene.key`](/docs/reference/view#the-scene) is `room:<id>`, so walking to another place counts as a new screen. |
| `arrive` | What happens on the doorstep as the player walks in by an exit. See [Arrival](#arrival). |

The plugin declares the trait and types it, so `traitOf(game, 'location:cafe', 'places/location')` reads a `Place`.

### Arrival

```ts
type Arrival = { when?: Condition; effects: EffectRef[] }
```

What happens as the player walks into a place, such as someone catching them on the way in. After [`places/go`](#commands) puts the player there, the place's `arrive` effects apply, in order, while its `when` holds, or always with no `when`. They're [effects](/docs/reference/effects) as content writes them, so a scene to open, a kv key or a plugin's effect all work. It doesn't run after a [`places/move`](#effects).

```ts
// The first time into the park, the ducks come over.
places.location({
  id: 'park',
  // …
  arrive: { when: { not: { kv: 'sawPark' } }, effects: [{ kv: 'sawPark', to: true }, { scene: 'park.ducks' }] },
})
```

The [content checker](/docs/reference/checks) checks its `when` and its effects as `trait places/location on location:park · arrive: …`.

### In your content

Places go in your [content](/docs/reference/loader#content)'s `entities`, written with [`places.location()`](#location). This is the [showcase](/docs/guide/showcase)'s map, cut down to what this page needs, in a file `town.ts`:

```ts
import type { Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

export const town: Content = {
  entities: [
    places.location({
      id: 'flat', name: 'Your flat', description: 'Home', exits: ['high-street'],
      body: [{ prose: 'place.flat' }],
      actions: [{ id: 'bed', label: 'Go to bed', command: calendar.sleep() }],
    }),
    places.location({
      id: 'high-street', name: 'High Street', description: 'Small Town', tags: ['outdoors'], exits: ['flat', 'cafe', 'park', 'office'],
      body: [{ prose: 'place.high-street' }],
    }),
    places.location({
      id: 'cafe', name: 'The Corner Café', description: 'Café', exits: ['high-street'],
      blocked: [{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
      body: [{ prose: 'place.cafe' }],
      actions: [{ id: 'coffee', label: 'Buy a coffee', effects: [{ kv: 'hadCoffee', to: true }] }],
    }),
    places.location({ id: 'park', name: 'Riverside Park', description: 'Small Town', exits: ['high-street'], body: [{ prose: 'place.park' }] }),
    places.location({ id: 'office', name: 'The Office', description: 'Work', exits: ['high-street'], body: [{ prose: 'place.office' }] }),
  ],
  prose: {
    'place.flat': 'Boxes, mostly. The radiator knocks when it feels like it.',
    'place.high-street': 'A bakery, a launderette, a bus stop with a bench nobody sits on.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.park': 'The river is slow and brown and full of ducks with opinions.',
    'place.office': 'Strip lights, a kettle, a stack of forms that never gets shorter.',
  },
}
```

The [loader](/docs/reference/loader#content) merges entities by reference, so a pack's `location:cafe` replaces the game's café whole, and a mod can add a room as it adds any entity. To change only what the trait says, such as the café's exits, a pack gives a [`traits`](/docs/reference/entities#traits) row instead, which replaces the trait and keeps the entity's name and picture:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const shortcut: Pack = {
  id: 'mod:shortcut',
  schema: SCHEMA,
  traits: { 'places/location': { 'location:flat': { exits: ['high-street', 'park'], body: [{ prose: 'place.flat' }] } } },
}
```

The game's places are [`locationsOf(state, game)`](#helpers).

### Rooms inside rooms

Give a place a `parent` when it's inside another, such as a back room inside the café. [`places.within('cafe')`](#conditions) then holds in either. A `blocked` entry with `hide: true` keeps the door off the screen until it's open to the player:

```ts
import { places } from '@ifloom/plugin-places'

const backRoom = places.location({
  id: 'cafe.back', name: 'The back room', description: 'Café', parent: 'cafe', exits: ['cafe'],
  blocked: [{ when: { not: { kv: 'staff' } }, reason: 'Staff only.', hide: true }],
  body: [{ prose: 'place.cafe.back' }],
})
```

Add `'cafe.back'` to the café's `exits` too. Until the `staff` kv key is set, the café's exits show only the high street.

### Opening hours

The engine has no opening hours of its own, so a place's `blocked` list does the job. Each entry is a [condition](/docs/reference/conditions) and the line the player reads while it holds. With the [calendar](/docs/plugins/calendar#conditions), the conditions can read the time of day and the day of the week. This is the showcase's office, open in the day on weekdays only (from `examples/showcase/src/story/office.ts`):

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

const office = places.location({
  id: 'office', name: 'The Office', description: 'Work', exits: ['high-street'],
  blocked: [
    { when: calendar.weekday(5, 6), reason: 'Shut at weekends.' },
    { when: { all: [calendar.weekday(4), { not: calendar.period('morning', 'afternoon') }] }, reason: 'Closed. Back on Monday.' },
    { when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
  ],
  body: [{ prose: 'place.office' }],
})
```

The first entry that holds gives the reason, so put the most particular first. On a Friday evening the player reads `Closed. Back on Monday.`, and on a Tuesday evening `Closed. Opens tomorrow morning.` The exit is greyed out with the same line.

`blocked` only stops the player walking in. A player who's already inside when it starts to hold stays there. If they should leave, send them out with a [`places.move`](#effects) effect from a [trigger](/docs/reference/triggers).

### Lines on every place

There's no header or footer that the plugin adds to every place. For a line that should show wherever the player is, such as a warning that rent is due tomorrow, write the blocks once and add them to each place's `body` with a small helper:

```ts
import type { Block } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places, type PlaceDef } from '@ifloom/plugin-places'

// Shown under every place's own words while they hold.
const warnings: Block[] = [
  { prose: 'warn.rent', when: calendar.weekday(5) },
  { prose: 'warn.tired', when: { stat: 'energy', lt: 10 } },
]

const place = (def: Omit<PlaceDef, 'body'>, text: string) => places.location({ ...def, body: [{ text }, ...warnings] })
```

Prose has no styling of its own, so a warning reads like any other line. Make it stand out in your UI if you need to, or show it as a [notice](/docs/reference/notices) instead.

### Who's where

An exit carries the place it leads to, not who is there. To tell the player that Ava is in the café before they walk in, add a block per place with the [cast](/docs/plugins/cast#conditions)'s `cast.at` condition:

```ts
import { cast } from '@ifloom/plugin-cast'

// On the high street: a line for each place Ava might be.
body: [
  { prose: 'place.high-street' },
  { prose: 'where.ava.cafe', when: cast.at('ava', 'cafe') },
  { prose: 'where.ava.park', when: cast.at('ava', 'park') },
]
```


### Each place is an entity

A place is any entity that carries the `places/location` trait. The plugin brings a kind for them, `location` ([`LOCATION`](#helpers)), which [`places.location()`](#location) uses. The kind is [`unique`](/docs/reference/entities#kinddef), so each place is a [holder](/docs/reference/entities#holding-things) that can hold things, and it's not [listed](/docs/reference/entities#listing): the places are the plugin's to show, through its view, not in [`view.entities`](/docs/reference/view#entities).

A place of the `location` kind is named by its bare id in the plugin's calls (`places.go('hall')`), and its entity is `location:<id>`, which [`places.locationRef()`](#helpers) writes. A place of another kind is named by its whole reference everywhere: `places.go('vessel:ferry')`. Content puts a thing in a room with its `at`, and asks about it as about any holder:

```ts
import type { Condition, Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

const hall: Content = {
  kinds: [{ id: 'item', label: 'Thing' }],
  // A parcel waiting in the hall at the start.
  entities: [{ id: 'parcel', of: 'item', name: 'parcel', at: places.locationRef('hall') }],
}

// For a line in the hall's body: true while nobody has picked it up.
const stillThere: Condition = { entity: 'item:parcel', at: places.locationRef('hall') }
```

The plugin answers the [`places/holder`](#queries) query with where the player is, as an entity, so the [inventory](/docs/plugins/inventory#dropping-and-giving)'s `drop` puts a dropped thing down in the room. Neither plugin needs the other: without places a dropped thing is gone, and without the inventory nothing is dropped, but things placed in rooms by content are still shown and can be picked up.

### Things lying in a place

While no scene is open, the view lists what the place's entity holds, in its [`things`](#placesview), each with a button that picks one up. [`places.pickUp()`](#commands) moves one from the place to [`'you'`](/docs/reference/entities#protagonists-you-and-player), whoever the player is playing. A thing with a [`visible`](/docs/reference/entities#entitydef) condition that doesn't hold isn't listed, so a coin under the rug shows only once the player has looked.

```ts
import { apply, startingState, view, type Game } from '@ifloom/engine'
import { places, type PlacesView } from '@ifloom/plugin-places'

declare const game: Game   // starts in the hall, with the parcel above
const state = startingState(game)

;(view(state, game).plugins.places as PlacesView).things
// [{ ref: 'item:parcel', name: 'parcel', image: null, count: 1, pickUp: { id: 'pickUp.item:parcel', label: 'Pick up', command: places.pickUp('item:parcel') } }]
apply(state, game, places.pickUp('item:parcel')).state.held.player   // { 'item:parcel': 1 }
```

## A worked example

The town above, with the calendar and a coffee to buy in the café. The coffee is the café's own action, offered only there. A room's action is done as `{ type: 'action', id: 'places/<id>' }`, which is what its button sends. A game action, in the content's `actions`, is offered everywhere, so one that belongs somewhere lists [`onlyAt`](#helpers) in its `blocked`, as the phone call does here.

```ts
import { apply, loadGame, startingState, view, whyNot, type ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places, type PlacesView } from '@ifloom/plugin-places'
import { town } from './town.ts'

// A game action, offered in every room, but refused anywhere but home.
const phoneHome: ActionDef = {
  id: 'phoneHome',
  label: 'Phone home',
  blocked: [places.onlyAt(['flat'], 'The phone is at home.')],
  effects: [{ kv: 'calledHome', to: true }],
}

const clock = calendar()
const { game } = loadGame([{ ...town, actions: [phoneHome] }], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [clock, places({ start: 'flat' })],
})
```

Walking it through:

```ts
let state = startingState(game)
places.where(state)                        // 'flat'
view(state, game).when              // 'Day 1 · Monday morning · Your flat'
view(state, game).scene.title       // 'Your flat'
view(state, game).scene.body        // 'Boxes, mostly. The radiator knocks when it feels like it.'

whyNot(state, game, places.go('cafe'))     // 'You cannot get there from here.'
state = apply(state, game, places.go('high-street')).state
whyNot(state, game, { type: 'action', id: 'phoneHome' })  // 'The phone is at home.'
state = apply(state, game, places.go('cafe')).state
view(state, game).actions.map((a) => a.id)                 // ['coffee', 'phoneHome']
const room = view(state, game).plugins.places as PlacesView
room.exits.map((e) => e.id)                                // ['high-street']

const evening = clock.write(apply(state, game, places.go('high-street')).state, { day: 0, period: 'evening' })
whyNot(evening, game, places.go('cafe'))   // 'Closed. Opens tomorrow morning.'
```

A UI reads the room at [`view.plugins.places`](#the-view), the description at `view.scene`, the room's buttons at `view.actions`, and the label at `view.when`.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'places/go': { id: 'cafe' } }` | `places.go('cafe')` | Walks through an exit to that place, then applies its [`arrive`](#arrival). |

`places/go` is refused, in this order, with:

1. `Finish this first.` (the engine's [`finishFirst`](/docs/reference/strings#refusals)) while a scene is open.
2. `There is no such place.` ([`places/noSuchPlace`](#strings)) when the game has no place with that id.
3. `You are already here.` ([`places/alreadyHere`](#strings)) when the player is there already.
4. The `reason` of the destination's first `blocked` entry whose `when` holds.
5. `You cannot get there from here.` ([`places/cannotGetThere`](#strings)) when the destination isn't one of this place's `exits`, or the player is nowhere.

Because `blocked` is asked before the exits, a closed café says it's closed even from across town.

A [lock](/docs/reference/locks#lock) names the command `places/go`, or `places/*`, and stops every journey. To stop some journeys and not others, use the destination's `blocked`.

| Command | Helper | Does |
|---|---|---|
| `{ 'places/pickUp': { id: 'item:paper' } }` | `places.pickUp('item:paper')` | Moves one of the thing from where the player is to `'you'`. See [Things lying in a place](#things-lying-in-a-place). |

`places/pickUp` is refused with `Finish this first.` while a scene is open, `There is no such thing.` (the engine's `noSuchThing`) for a thing not in the game, and `There is no paper here.` ([`places/notLyingHere`](#strings)) when none lies where the player is. It lists its effect, a [`move`](/docs/reference/effects#move), so a lock with `effect` sees it.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'places/move': { location: 'cafe' } }` | `places.move('cafe')` | Puts the player there at once, and closes any open scene. |

It works in any effect list: a data scene choice's, an action's, a thing's use in the [inventory](/docs/plugins/inventory), or a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does).

No exit is needed and nothing is refused, so the player can be moved from nowhere, or into a `blocked` place. The place's [`arrive`](#arrival) doesn't run. A place the game doesn't have does nothing: the player stays where they were, and the scene stays open.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'places/at': { location: ['cafe', 'park'] } }` | `places.at('cafe', 'park')` | The player is in one of these places. |
| `{ 'places/within': { location: ['cafe'] } }` | `places.within('cafe')` | The player is in one of these places, or anywhere inside one, following each place's `parent`. |

Each is a call with the full name as the only key (see [plugin calls](/docs/reference/custom#plugincall)), which the helpers write for you. A single place works too, as in `{ 'places/at': { location: 'cafe' } }`.

In the café's [back room](#rooms-inside-rooms), `places.at('cafe.back')` and `places.within('cafe')` hold, and `places.at('cafe')` doesn't. Neither holds while the player is nowhere. `places.within('cafe', 'office')` holds inside either building.

## Queries

These answer other plugins' code, through the context's [`query`](/docs/reference/plugins#queries). Content can't ask them.

| Query | Answers |
|---|---|
| `places/here` | Where the player is: the place's id, or `null`. |
| `places/all` | Every place the game has now, each its [`Place`](#the-location-trait) trait with its `id` and `ref`. |
| `places/known` | Whether the game has a place with this id or reference, given as `{ location }`: `true` or `false`. |
| `places/exits` | The current place's `exits`, as listed, leaving out any the game doesn't have. Empty when nowhere. |
| `places/holder` | The entity of where the player is, such as `'location:park'`, which holds what's put down there; `null` when nowhere. The [inventory](/docs/plugins/inventory)'s `drop` asks it. |

For example, a delivery plugin that only hands over parcels at the flat, when the game has places, asks where the player is:

```ts
import { definePlugin } from '@ifloom/engine'

const parcels = definePlugin<{ waiting: number }>({
  id: 'parcels',
  version: 1,
  start: () => ({ waiting: 0 }),
  conditions: {
    // { 'parcels/canCollect': true }: a parcel is waiting and the player is at home.
    // In a game without places, home is wherever the player is.
    canCollect: (_state, _args, { slice, query }) => {
      const here = query<string | null>('places/here')
      return slice.waiting > 0 && (here === undefined || here === 'flat')
    },
  },
})
```

The [cast](/docs/plugins/cast) asks `places/here` to know who's in the room, and `places/known` to check its characters' places when the game loads.

## Values

| Prose writes | Prints |
|---|---|
| `{{v:places/name}}` | The current place's `name`, such as `High Street`. Empty when nowhere. |
| `{{v:places/description}}` | The current place's `description`, such as `Small Town`. Empty when nowhere, or with none. |

```ts
const prose = { postcard: 'Greetings from the {{v:places/name}}.' }
// 'Greetings from the High Street.'
```

## The stage, the buttons and the label

### The stage

While no scene is open, the room fills the screen. Its plugin [`stage`](/docs/reference/plugins#stage) has the place's `name` as the title and its `body` as the text. `view.scene` is then `{ key: 'room:cafe', title: 'The Corner Café', body: 'Six tables, one of them wobbly.', ... }`.

The body is drawn under the place's own id, not the plugin's. A [`variants`](/docs/reference/scenes#block) block rotates per id, so each place keeps its own rotation, and the café's lines don't move on because the high street was drawn.

The first plugin that has a stage fills the screen. While the player is nowhere, places has no stage, and the screen shows the game's title with an empty body.

### The picture stage

A place can give a `stage` as well as its `image`: layers of pictures or videos with hotspots on them. This café has the room, the counter from a pool, and a lamp that comes on in the evening. Small Town's own café stage is simpler, with one layer, Ava's photo, and a hotspot on her.

```ts
places.location({
  id: 'cafe', name: 'The Corner Café', description: 'Café', exits: ['high-street', 'cafe.back'],
  stage: {
    aspect: '16/9',
    layers: [
      { id: 'room', src: 'place/cafe' },
      { id: 'counter', pool: 'counter', tags: ['day'] },
      { id: 'lamp', src: 'place/cafe-lamp.png', when: { kv: 'evening' } },
    ],
    hotspots: [
      { id: 'menu', rect: [10, 20, 30, 20], label: 'Read the menu', command: { type: 'action', id: 'places/coffee' } },
      { id: 'back', rect: [85, 30, 15, 70], label: 'The back door', command: places.go('cafe.back') },
    ],
  },
  body: [{ prose: 'place.cafe' }],
})
```

The plugin draws it into its view as `location.stage`, next to `image`, with the engine's [`stageView`](/docs/reference/view#stageview). A hotspot is greyed out with the same reason as the button for its command, so the back door reads `Staff only.` until the player works there. A pool's pick is kept under the place's id, so the counter looks the same every time the player comes in. The React UI's [`LocationCard`](#locationcard) draws the stage above the place's name with [`Stage`](/docs/react/components#stage).

**Gotchas.**
- The hotspots are left out while a scene is open, or while a lock stops everything, as the exits are. The layers stay.
- A hotspot with a `choice` is reported, because a place has no choices.
- The idle screen's [`view.scene.stage`](/docs/reference/view#the-scene) stays `null`. A place's stage is only in `view.plugins.places`.

### The buttons

The room's `actions` are offered as plugin [buttons](/docs/reference/plugins#buttons). They're drawn while no scene is open, before the game's own `actions`, and priced and greyed out exactly like them. In the café of the example, `view.actions` lists the café's `coffee` button first, then the game's buttons.

### The label

The place's `name`, which the view joins into [`view.when`](/docs/reference/view#the-clock-and-the-player) after any plugin listed before it. With the calendar first, that reads `Day 1 · Monday morning · High Street`. There's no label while the player is nowhere.

### Audio

The place the player is at supplies its `audio` through the plugin's [`audio` provider](/docs/reference/plugins#audio). Here a café has its own murmur, and the music carries on from the game's default:

```ts
places.location({ id: 'cafe', name: 'The Corner Café', description: 'Café', exits: ['high-street'], body: [{ prose: 'place.cafe' }], audio: { ambience: 'cafe.murmur' } })
```

Walk back out to the high street and the ambience stops, because the street names none. A place's audio is the third of [four levels](/docs/reference/audio#what-plays-on-a-background-channel). An open scene's `audio` and an [`audio` effect](/docs/reference/effects#audio) both win over it, and it wins over the game's default. A room inside another doesn't take its parent's audio, so give the back room its own if it should sound the same. Nothing plays while the player is nowhere.

## The view

`view(state, game).plugins.places` is a `PlacesView`.

Its [React UI](#the-react-ui) draws it with [`LocationCard`](#locationcard), and [`usePlaces`](#useplaces) gives the same data, a way to take an exit and a way to pick something up with no markup, for a map of your own.

### PlacesView

```ts
type PlacesView = {
  location: PlaceView | null
  exits: ExitView[]
  things: LyingView[]
}
```

| Field | What it is |
|---|---|
| `location` | Where the player is, as a [`PlaceView`](#placeview). `null` when nowhere, or when `at` names a place the game no longer has. |
| `exits` | The ways out, in the order the place lists them. Empty while a scene is open, or while a lock stops everything ([`lockedOut`](/docs/reference/locks#lockedout)). |
| `things` | What lies here, as [`LyingView`](#lyingview)s, in the order the place's entity holds them. Empty when nothing does, while a scene is open, or while a lock stops everything. |

An exit is left out when:

- its place doesn't exist
- the first [lock](/docs/reference/locks#lock) that stops `places/go` to it has `hide`
- one of its place's `blocked` entries with `hide: true` holds

Any other exit is shown, greyed out with its refusal if it can't be taken.

### PlaceView

```ts
type PlaceView = {
  id: string
  ref: EntityRef
  name: string
  description: string | null
  tags: string[]
  image: string | null
  stage: StageView | null
}
```

Where the player is.

| Field | What it is |
|---|---|
| `id` | The place's id as the plugin's calls name it: the bare id for one of the `location` kind, else its whole reference. |
| `ref` | Its entity, such as `'location:flat'`. |
| `name` | Its entity's [name](/docs/reference/entities#entityname), tokens filled. |
| `description` | Its entity's `description`, tokens filled, or `null` with none. |
| `tags` | Its entity's tags, `[]` with none. |
| `image` | Its entity's `image` through [`artSrc`](/docs/reference/prose#artsrc), or `null` with none. |
| `stage` | The place's [picture stage](#the-picture-stage) as a [`StageView`](/docs/reference/media#stageview), or `null` when it has none. |

### ExitView

```ts
type ExitView = RenderedChoice & {
  ref: EntityRef
  description: string | null
  tags: string[]
  image: string | null
}
```

An exit is a button like any other, a [`RenderedChoice`](/docs/reference/view#renderedchoice), as [`renderAction`](/docs/reference/view#renderaction) draws one, so the code that draws a scene's choices draws exits too.

| Field | What it is |
|---|---|
| `id` | The destination's id. |
| `label` | The destination's `name`. |
| `ref`, `description`, `tags`, `image` | The destination's, from its entity, as in a [`PlaceView`](#placeview). |
| `disabled` | Why it can't be taken now: what [`whyNot`](/docs/reference/actions#whynot) says for its command. A closed café's exit reads `Closed. Opens tomorrow morning.` |
| `warning` | Set when the exit can be pressed but a plugin [guard](/docs/reference/plugins#guards) warns against it. The reducer refuses it. |
| `price` | What going costs, when a plugin says, such as the time it takes. |
| `command` | What to send to take it: `go(id)`. |

On a new game in the flat:

```ts
{
  location: { id: 'flat', ref: 'location:flat', name: 'Your flat', description: 'Home', tags: [], image: null, stage: null },
  exits: [
    { id: 'high-street', label: 'High Street', ref: 'location:high-street', description: 'Small Town', tags: ['outdoors'], image: null, command: places.go('high-street') },
  ],
  things: [],
}
```

### LyingView

```ts
type LyingView = {
  ref: EntityRef
  name: string
  image: string | null
  count: number
  pickUp: RenderedChoice
}
```

One thing lying where the player is.

| Field | What it is |
|---|---|
| `ref` | How content names it, such as `'item:paper'`. |
| `name` | Its [name](/docs/reference/entities#entityname), tokens filled. |
| `image` | Its picture through [`artSrc`](/docs/reference/prose#artsrc), or `null`. |
| `count` | How many lie here. |
| `pickUp` | The button that picks one up: a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled with the [`places/pickUp`](#strings) string, `Pick up`, that sends `places.pickUp(ref)`. |

## The React UI

`@ifloom/plugin-places/react` draws where the player is and the way out, for a game drawn with [`@ifloom/react`](/docs/react). List `placesUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and the [`LocationCard`](#locationcard) and the [`Exits`](#exits) go in the story, before the room's actions.

It's yours to leave out. Draw the plugin yourself from `view.plugins.places`, or from [`usePlaces`](#useplaces) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

```tsx
import { mountGame } from '@ifloom/react'
import { placesUi } from '@ifloom/plugin-places/react'

mountGame(game, { plugins: [placesUi] })
```

### placesUi

```ts
const placesUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): the [`LocationCard`](#locationcard) and the [`Exits`](#exits) go in the story, before the room's actions.

### LocationCard

```tsx
function LocationCard(): JSX.Element | null
```

Where the player is: the place's name and the line under it (its `description`), and what lies there, each with a small **Pick up** button that sends the thing's [`pickUp`](/docs/plugins/places#things-lying-in-a-place) command. It reads the [places](/docs/plugins/places) plugin's view at [`view.plugins.places`](/docs/plugins/places#the-view), typed with the plugin's `PlacesView` but without importing the plugin's code.

A place with a [stage](/docs/plugins/places#the-picture-stage) shows it above the name as a [`Stage`](/docs/react/components#stage), with its hotspots. The places plugin leaves the hotspots out while a scene is open, so the room can't be used from behind a scene.

It draws nothing in a game without the places plugin, or while the plugin's `location` is `null` (the player is nowhere). The exits are [`Exits`](#exits).

Replaceable as `LocationCard` in [`components`](/docs/react/components#components). Parts: `location`, `location-name`, `location-text`, `location-things`, `location-thing` (with `data-thing`, the thing's reference), `location-thing-name` and `location-thing-pick`.

### Exits

```tsx
function Exits(props: { className?: string }): JSX.Element | null
```

An outline button for each exit from where the player is. Each shows the exit's `label`, sends its own [`command`](/docs/plugins/places#exitview) and carries `data-exit`. An exit the player can't take is greyed out. It draws nothing without the places plugin, or with no exits, as while a scene is open.

**Gotcha.** An exit's reason, or its warning, is in the button's `title` and shows on hover. It isn't printed on the button as a choice's is. An exit that a lock hides isn't in the view at all.

Replaceable as `Exits` in [`components`](/docs/react/components#components). Parts: `exits` and `exit` (with `data-exit`).

### usePlaces

```ts
function usePlaces(): PlacesControls | null

type PlacesControls = PlacesView & {
  go: (exit: string) => Result<GameState>
  pickUp: (thing: string) => Result<GameState>
}
```

The [places](/docs/plugins/places) plugin's view ([`PlacesView`](/docs/plugins/places#the-view): `location`, `exits` and the `things` lying there) with a way to travel and to pick things up, or `null` in a game without the plugin. `go(id)` sends the exit's own command, by the id of the place it leads to, and returns what [`runner.apply`](/docs/reference/runner#the-runners-members) did, so a refusal comes back with its reason. `places.pickUp(ref)` sends the thing's own pick-up command the same way. [`LocationCard`](#locationcard) and [`Exits`](#exits) are drawn from it.

```tsx
import { usePlaces } from '@ifloom/plugin-places/react'

function ExitList() {
  const places = usePlaces()
  if (!places) return null
  return (
    <ul>
      {places.exits.map((exit) => (
        <li key={exit.id}>
          <button disabled={Boolean(exit.disabled)} onClick={() => places.go(exit.id)}>{exit.label}</button>
        </li>
      ))}
    </ul>
  )
}
```

## The state

### PlacesState

```ts
type PlacesState = { at: string | null }
```

What the plugin keeps in a save, at `state.plugins.places`: the id of the place the player is in, or `null` for nowhere. A UI reads the view, not this. Code reads it with [`places.where(state)`](#helpers).

The engine once kept the player's location itself, at `state.locationId`. [`loadState`](/docs/reference/saves#loadstate) carries a save from then (save version 5 or older) forward, moving `locationId` to `plugins.places` as `{ version: 1, state: { at } }`. A save that already has a `places` entry keeps it.

## Strings

The plugin's lines go in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key, `places/...`.

| Key | English |
|---|---|
| `places/noSuchPlace` | `There is no such place.` |
| `places/alreadyHere` | `You are already here.` |
| `places/cannotGetThere` | `You cannot get there from here.` |
| `places/pickUp` | `Pick up` |
| `places/notLyingHere` | `There is no {thing} here.` |

`places/go` also uses the engine's own [`finishFirst`](/docs/reference/strings#refusals) (`Finish this first.`), so rewording that changes it here too.

[`onlyAt`](#helpers)'s reason is plain text written into the `blocked` entry (`Not here.` if left out), not a string a game can override.

## For code

### Helpers

```ts
const places: {
  (options?: PlacesOptions): DefinedPlugin<PlacesState, PlacesView>
  where(state: GameState): string | null
  go(to: string): CommandRef
  pickUp(ref: EntityRef): CommandRef
  locationRef(id: string): EntityRef
  at(...places: string[]): Condition
  within(...places: string[]): Condition
  move(place: string): EffectRef
  onlyAt(places: string[], reason?: string): Blocked
}

function locationsOf(state: GameState, game: Game): EntityRef[]
function locationOf(state: GameState, game: Game, ref: string | null | undefined): Place | undefined

const LOCATION = 'location'
```

| Helper | Returns |
|---|---|
| `locationsOf` | Every entity in the game now with the `places/location` trait, as references: the places content declares, in its order, then those made in play. |
| `locationOf` | The [`Place`](#the-location-trait) trait of the place with this id or reference, one content declares or one made in play, or `undefined`. `undefined` for `null`. |
| `places.where` | Where the player is, read straight from the state with no game needed: the place's id, or `null`. |
| `places.go` | The [`places/go`](#commands) command. |
| `places.pickUp` | The [`places/pickUp`](#commands) command. |
| `places.locationRef` | A place's [entity](#each-place-is-an-entity): `places.locationRef('park')` is `'location:park'`. A reference is returned as written. |
| `LOCATION` | The kind every place's entity is, `'location'`. |
| `places.at`, `places.within` | The [conditions](#conditions). |
| `places.move` | The [`places/move`](#effects) effect. |
| `places.onlyAt` | A [`blocked`](/docs/reference/actions#blocked) entry for an action: `{ when: { not: places.at(...places) }, reason }`, which refuses it anywhere else. The reason is `Not here.` if left out. |

`places.where` reads the state alone.

## Checks

When the game loads, the plugin reports two kinds of problem.

**Place ids that content names.** Every place named in `places/at`, `places/within`, `places/move` or `places/go` is looked up (and the thing `places/pickUp` names, as an entity), wherever content writes it: an action's `blocked` entries and effects, a scene, a lock, a room's actions, or the game's own `actions`. One the game doesn't have is reported where it's named:

```text
town · action swim · unknown entity "location:lido"
```

A place named by something that isn't one is reported as `"item:paper" has no places/location trait`.

**The places themselves.** These are checked through the trait on each place, pinned on the content or pack each one came from, with `where` as `trait places/location on <ref>`. The `start` option is pinned on `base` as `options start`. The plugin reports:

- A `start` the game doesn't have (`options start`, `unknown entity "location:…"`).
- A trait with no `exits` or no `body` list (`a place needs its exits: exits: [] for none`).
- An exit to a place the game doesn't have (`exit to unknown location "…"`).
- A `parent` the game doesn't have (`inside unknown location "…"`), or one that leads back round to the place (`is inside itself`, on every place in the loop).
- Anything the `body` names that the game doesn't have, such as a `{ prose }` block's key, variants or conditions (`no prose for "…"`).
- Anything a `blocked` entry's `when` names that the game doesn't have.
- Anything an action's `when`, `blocked` conditions or `command` names that the game doesn't have, prefixed with the action (`action dig: unknown entity "location:moon"`).
- A track or channel in `audio` that the game doesn't have, a cue channel such as `sfx`, or a sound effect's track, prefixed with `audio:` (`audio: unknown track "rain"`). See [Audio](/docs/reference/checks#audio).
- A `ui` that isn't data (`ui must be an object of hints`).
- Anything wrong with the `stage`: an unknown pool or tag, a video flag on a picture, a hotspot's rect, id, layer or command, a hotspot with a `choice`, and the conditions on layers and hotspots (`hotspot back: unknown layer "door"`). See [Media](/docs/reference/checks#media).

A place's `image`, as any entity's, and a stage layer's file are listed in the checker's [`files`](/docs/reference/checks#fileref).

Places still written as a list in `data.places.locations`, as content did before schema 24, are reported one by one (`locations yard · locations are entities now: …`). A pack written then is [carried forward](#older-content) for you.

```text
base · options start · unknown entity "location:nowhere"
town · trait places/location on location:yard · exit to unknown location "lane"
town · trait places/location on location:yard · is inside itself
town · trait places/location on location:yard · no prose for "place.yard"
town · trait places/location on location:yard · action dig: unknown entity "location:moon"
town · trait places/location on location:cafe · audio: unknown track "rain"
town · trait places/location on location:cafe · hotspot menu: names choice "order", but only a scene has choices
```

## Older content

A pack written for schema 23 or older kept its places in `data.places.locations`. [`upgradePack`](/docs/reference/loader#upgradepack) carries it forward: each place becomes an entity of the kind `location`, with its `name` and `tags`, its old `tag` as the `desc` and its old `art` as the `image` (an empty `art` is dropped), and the rest in the `places/location` trait. Prose and strings that print `{{v:places/tag}}` print `{{v:places/desc}}` instead. Saves need nothing, because a place's entity was `location:<id>` before too.

## Gotchas

- **`arrive` runs on `places/go` only.** A `places/move` puts the player somewhere with nothing on the doorstep. The engine has no arrival rule or hook of its own, so a place's `arrive` is the only doorstep there is. For something that should happen however the player got there, use a [trigger](/docs/reference/triggers) on `places.at(...)`.
- **Exits are one-way.** List the way back on the other place.
- **A game that starts nowhere can't walk anywhere.** `places/go` from nowhere is refused with `You cannot get there from here.` A `places/move`, from an intro scene's last choice say, puts the player on the map.
- **`blocked` comes before the exits.** A locked place's reason is the refusal even when it isn't one step away.
- **`places/go` lists no effects.** A lock with `effect` doesn't see it, and no plugin puts a price on it.
- **A pack's place replaces the game's whole.** An entity with the same reference takes the place of the game's, name, picture and trait together. To change only the exits or the body, give a `traits` row. A row replaces the whole trait, so give every field the place needs.
- **The kind is the plugin's.** The game can redeclare the `location` kind (to list the places, say), and keeps what it leaves out.

## See it in an example

Small Town: the places are the town, one in each place's file in [`examples/showcase/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/showcase/src/story), with `blocked` opening hours on the café and the office, a `stage` in the café, and each place's own `actions`. [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) adds `places({ start: 'flat' })`.
