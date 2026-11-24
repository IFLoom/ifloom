---
title: "Places"
description: "Reference for @ifloom/plugin-places: locations and their trait, arrival, things lying in a location, the go and pickUp commands, the move effect, conditions, queries, values, the room, state, view, React UI, helpers, checks and strings."
---
`@ifloom/plugin-places` gives a game a map of [locations](/docs/reference/glossary#location) with exits between them, and keeps track of where the player is. A location is an [entity](/docs/reference/glossary#entity) carrying the `places/location` trait, so a mod adds or changes one as it would any entity. While no scene is open, the plugin fills the [room](/docs/reference/glossary#room) with the location the player is at, its actions and its exits. Places needs no other plugin, and its conditions read the [calendar](/docs/reference/plugins/calendar)'s for opening hours. The [cast](/docs/reference/plugins/cast), the [inventory](/docs/reference/plugins/inventory), the [shop](/docs/reference/plugins/shop), [jobs](/docs/reference/plugins/jobs) and [debug](/docs/reference/plugins/debug) ask it where the player is. [Entities, things and traits](/docs/explanation/entities-and-traits#locations-characters-and-vendors-are-entities) explains why a location is an entity, [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Add a location](/docs/how-to/add-a-location) builds one.

In the showcase: `examples/showcase/src/story/`, where each area's file declares its location, with opening hours on the café and the office and a layered picture in the café.

```ts
import {
  places,
  locationsOf,
  locationOf,
  LOCATION,
  type Arrival,
  type ExitView,
  type LyingView,
  type Place,
  type PlaceDef,
  type PlacesOptions,
  type PlacesState,
  type PlacesView,
  type PlaceView,
} from '@ifloom/plugin-places'
```

## places

The plugin's factory, which returns the plugin with the id `places`. Every field of its result is in [`places`](/docs/api/plugin-places#places), and its helpers are listed under [Functions](#functions).

List places after the calendar. The view joins plugins' [labels](/docs/reference/plugin-api#label) in the order `plugins` lists them, so the header then reads `Day 1 · Monday morning · High Street`. `read` and `write` on the plugin come from [`DefinedPlugin`](/docs/reference/plugin-api#definedplugin), and `write` puts the player somewhere without a command.

```ts
import { loadGame, startingState, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

declare const town: Content

const map = places({ start: 'flat' })
const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), map] })

map.read(startingState(game), game) // { at: 'flat' }
```

### PlacesOptions

The plugin's settings. Every field is in [`PlacesOptions`](/docs/api/plugin-places#placesoptions).

`start` is the id of the location a new game starts at. With none, the player starts nowhere, the room shows only the game's title and its actions, and [`places/go`](#placesgo) is refused until a [`places/move`](#placesmove) puts the player on the map. The options are code, so a mod can't change them, and everything a mod could change is in each location's trait.

## Content

### PlaceDef

A location the game declares in `entities`, written with `places.location()`: the entity's fields and the [`Place`](#place) trait's fields side by side. Every field is in [`PlaceDef`](/docs/api/plugin-places#placedef).

`places.location()` returns an [`EntityDef`](/docs/reference/entities#entitydef) of the kind `location` with the trait's fields in `traits['places/location']`. `of` makes the location an entity of another kind, such as a boat the player can step aboard. The entity's `name` is shown on the exit, as the room's title and in the label, and its `description`, `image` and `tags` reach the view as written. `ui` is left out, because a location's `ui` is the room's, in the trait.

```ts
import { places } from '@ifloom/plugin-places'

export const cafe = places.location({ id: 'cafe', name: 'The Corner Café', description: 'Café', exits: ['high-street'], body: [{ prose: 'place.cafe' }] })
// { id: 'cafe', of: 'location', name: 'The Corner Café', description: 'Café',
//   traits: { 'places/location': { exits: ['high-street'], body: [{ prose: 'place.cafe' }] } } }
```

The loader merges entities by reference, so a pack's `location:cafe` replaces the game's café whole. A pack that changes only the exits or the body gives a [`traits`](/docs/reference/content#traits) row instead, which replaces the whole trait and keeps the entity's name and picture.

### LOCATION

The kind `places.location()` gives each location, `'location'`. Its value is in [`LOCATION`](/docs/api/plugin-places#location).

The plugin declares the kind in its own content. It is [`unique`](/docs/reference/entities#unique), so each location is a [holder](/docs/reference/glossary#holder) and things can lie in it. It isn't [`listed`](/docs/reference/entities#listed), so locations stay out of `view.entities` and reach the view through the plugin's own. A game can redeclare the kind, to list the locations say, and keeps what it leaves out.

A location of this kind is named by its bare id in the plugin's calls, `places.go('hall')`, and its entity is `location:hall`, which `places.locationRef('hall')` writes. A location of another kind is named by its whole reference everywhere, as in `places.go('vessel:ferry')`.

## Traits

### Place

The `places/location` trait, which makes any entity carrying it a location the player can be at. Every field is in [`Place`](/docs/api/plugin-places#place). The plugin types it in `TraitRegistry`, so [`traitOf`](/docs/reference/entities#traitof) reads a `Place`.

| Field | Meaning |
|---|---|
| `exits` | The locations one step away, by id. Exits are one-way, so the location at the other end lists the way back. |
| `blocked` | Entries that refuse walking in while their `when` holds. The first that holds gives the [reason](/docs/reference/actions#reason), which is both the refusal and the exit's `disabled` line, so put the most particular entry first. With `hide: true` the exit is left off the screen while the entry holds. |
| `body` | The [blocks](/docs/reference/scenes#block) the room shows while no scene is open. The plugin renders them under the location's own id, so a `variants` block keeps a rotation for each location. |
| `actions` | The location's [actions](/docs/reference/actions#actiondef), offered before the game's own while no scene is open, priced and refused like them. A room's action is sent as `{ type: 'action', id: 'places/<id>' }`. |
| `parent` | The location it is inside, such as a back room's café, which [`places/within`](#placeswithin) follows. |
| `picture` | A [layered picture](/docs/reference/media#picturedef) with hotspots. A hotspot sends a `command`, because a room has no choices. |
| `audio` | The tracks that play on background [channels](/docs/reference/audio#channeldef) while the player is here, by channel, with `null` to silence one. |
| `ui` | [UI hints](/docs/reference/ui-hints) for the room, carried to `view.scene.ui`. The room's `view.scene.key` is `room:<id>`, so walking to another location counts as a new screen. |

`blocked` only stops the player walking in. A player already inside when an entry starts to hold stays there, so a [trigger](/docs/reference/triggers) with a `places.move` effect sends them out. A location's opening hours are `blocked` entries written with the calendar's conditions, as on the showcase's office:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

export const office = places.location({
  id: 'office',
  name: 'The Office',
  description: 'Work',
  exits: ['high-street'],
  blocked: [
    { when: calendar.weekday(5, 6), reason: 'Shut at weekends.' },
    { when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
  ],
  body: [{ prose: 'place.office' }],
})
```

A location's picture renders into its view as `location.picture`, through the engine's [`pictureView`](/docs/reference/view#pictureview). The plugin keeps a pool's pick under the location's id, so the picture looks the same each visit. A hotspot is refused with the same reason as a button for its command, and the hotspots are left out while a scene is open or a lock stops everything. `view.scene.picture` stays `null` in the room, because a location's picture is only in `view.plugins.places`.

A location's `audio` is the third of four levels, after an [`audio`](/docs/reference/effects#audio) effect and an open scene's `audio`, and before the game's default. A location inside another doesn't take its parent's audio, and nothing plays from places while the player is nowhere.

### Arrival

The effects that run as the player walks into a location by an exit, in the trait's `arrive`. Every field is in [`Arrival`](/docs/api/plugin-places#arrival).

After [`places/go`](#placesgo) puts the player there, the effects apply in order while `when` holds, or always with no `when`. They run on `places/go` only, never after a `places/move`. The content checker checks them as `trait places/location on location:park · arrive: …`.

```ts
import { places } from '@ifloom/plugin-places'

export const park = places.location({
  id: 'park',
  name: 'Riverside Park',
  exits: ['high-street'],
  body: [{ prose: 'place.park' }],
  arrive: { when: { not: { kv: 'sawPark' } }, effects: [{ kv: 'sawPark', to: true }, { scene: 'park.ducks' }] },
})
```

## Effects

### places/move

Puts the player at a location at once and closes any open scene. No exit is needed and nothing refuses it, so it moves the player from nowhere or into a `blocked` location. The location's `arrive` doesn't run. A location the game doesn't have does nothing, and the scene stays open.

```ts fragment
{ 'places/move': { location: 'cafe' } } // places.move('cafe')
```

## Conditions

Each condition is a [plugin call](/docs/reference/custom#plugincall), written by the helper beside it. A single location works in place of the list. None holds while the player is nowhere, and in a game without places every one is false.

### places/at

Holds while the player is at one of the named locations.

```ts fragment
{ 'places/at': { location: ['cafe', 'park'] } } // places.at('cafe', 'park')
```

### places/within

Holds while the player is at one of the named locations or anywhere inside one, following each location's `parent`. In a back room whose parent is the café, `places.within('cafe')` holds and `places.at('cafe')` doesn't.

```ts fragment
{ 'places/within': { location: ['cafe'] } } // places.within('cafe')
```

### places/away

Holds while the player is at none of the named locations, or nowhere. It differs from `{ not: places.at(...) }` in a game without places, where it never holds. So a `blocked` entry written with it, as `places.onlyAt()` writes, refuses nothing in a game without places, which is what a plugin that cooperates with places wants.

```ts fragment
{ 'places/away': { location: ['cafe'] } } // places.away('cafe')
```

## Commands

### places/go

Walks through an exit to the named location, then applies its [`arrive`](#arrival). It lists no effects, so a lock with `effect` doesn't see it and no plugin prices it. A lock names it `places/go`, or `places/*`.

```ts fragment
{ 'places/go': { id: 'cafe' } } // places.go('cafe')
```

The plugin refuses it, in this order:

1. With `Finish this first.` ([`finishFirst`](/docs/reference/strings#refusals)) while a scene is open.
2. With `There is no such place.` (`places/noSuchPlace`) when the game has no location with that id.
3. With `You are already here.` (`places/alreadyHere`) when the player is there.
4. With the reason of the destination's first `blocked` entry that holds.
5. With `You cannot get there from here.` (`places/cannotGetThere`) when the destination isn't one of the current location's `exits`, or the player is nowhere.

Since `blocked` comes before the exits, a closed café says it's closed even from across town.

### places/pickUp

Moves one of a thing from where the player is to [`'you'`](/docs/reference/entities#player-and-you). It lists a [`move`](/docs/reference/effects#move) effect, so a lock with `effect` sees it.

```ts fragment
{ 'places/pickUp': { id: 'item:paper' } } // places.pickUp('item:paper')
```

The plugin refuses it with `Finish this first.` while a scene is open, `There is no such thing.` (the engine's `noSuchThing`) for a thing the game doesn't have, and `There is no paper here.` (`places/notLyingHere`) when none lies here.

## Queries

Other plugins ask these through their context's [`query`](/docs/reference/plugin-queries#query), and content can't. The engine declares `places/here`, `places/holder` and `places/known` in [`PartnerQueries`](/docs/reference/plugin-queries#partnerqueries), so those three are typed in any plugin's code without importing places.

| Key | Meaning |
|---|---|
| `places/here` | The id of the location the player is at, or `null`. The cast asks it to find who is in the room. |
| `places/holder` | The entity of the location the player is at, such as `'location:park'`, or `null`. The inventory's `drop` asks it for somewhere to put a dropped thing. |
| `places/known` | Whether the game has a location with the id or reference given as `{ location }`. The cast asks it to check its characters' locations. |
| `places/all` | Every location the game has now, each its [`Place`](#place) trait with its `id` and `ref`. |
| `places/exits` | The current location's `exits` as listed, leaving out any the game doesn't have, and empty when nowhere. |

A delivery plugin hands over parcels only at the flat when the game has places:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

export const parcels = definePlugin<{ waiting: number }>({
  id: 'parcels',
  version: 1,
  start: () => ({ waiting: 0 }),
  conditions: {
    canCollect: (_state, _args, { slice, query }) => {
      const here = query('places/here')
      return slice.waiting > 0 && (here === undefined || here === 'flat')
    },
  },
})
```

## Values

Prose prints these as tokens. Each is empty while the player is nowhere.

| Key | Meaning |
|---|---|
| `{{places/name}}` | The current location's `name`, such as `High Street`. |
| `{{places/description}}` | The current location's `description`, such as `Small Town`, and empty with none. |

## State

### PlacesState

The location a save keeps at `state.plugins.places`, its id, or `null` while the player is nowhere. Every field is in [`PlacesState`](/docs/api/plugin-places#placesstate).

Code reads it with `places.where(state, game)`, which reads a save with no places state yet as the plugin's `start`. A UI reads [`PlacesView`](#placesview) instead.

## View

While no scene is open, the plugin's room [`scene`](/docs/reference/plugin-views#scene) fills `view.scene` with the location's `name` as the title and its `body` as the words, keyed `room:<id>`. Its [`actions`](/docs/reference/plugin-views#actions) put the location's actions in `view.actions` ahead of the game's, and its [`label`](/docs/reference/plugin-api#label) adds the location's `name` to `view.when`. While the player is nowhere the plugin has no room scene, no actions and no label.

### PlacesView

The location, its exits and the things lying there as the player sees them, in `view.plugins.places`. Every field is in [`PlacesView`](/docs/api/plugin-places#placesview).

`location` is `null` while the player is nowhere. `exits` and `things` are empty while a scene is open or a lock stops everything ([`lockedOut`](/docs/reference/locks#lockedout)). An exit is left out when its location doesn't exist, when the first lock that stops `places/go` to it has `hide`, or when one of its location's `blocked` entries with `hide: true` holds. Any other exit is shown, refused with its reason if the player can't take it.

```ts fragment
{
  location: { id: 'flat', ref: 'location:flat', name: 'Your flat', description: 'Home', tags: [], image: null, picture: null },
  exits: [{ id: 'high-street', label: 'High Street', ref: 'location:high-street', description: 'Small Town', tags: ['outdoors'], image: null, command: places.go('high-street') }],
  things: [],
}
```

### PlaceView

The location the player is at, in `view.plugins.places.location`. Every field is in [`PlaceView`](/docs/api/plugin-places#placeview).

`id` is the bare id for a location of the `location` kind and the whole reference for any other. `name` and `description` have their tokens filled, `image` goes through [`artSrc`](/docs/reference/prose#artsrc), and `picture` is the location's [`PictureView`](/docs/reference/media#pictureview), or `null`.

### ExitView

One exit as a [`RenderedChoice`](/docs/reference/view#renderedchoice) that sends `places.go(id)`, so a UI renders it as any other button. Every field is in [`ExitView`](/docs/api/plugin-places#exitview).

The exit's `id` and `label` are the destination's id and `name`, and `ref`, `description`, `tags` and `image` are the destination's. `disabled` is the refusal the command would get now, such as `Closed. Opens tomorrow morning.`, and `warning` is a plugin guard's soft refusal.

### LyingView

One thing lying where the player is, in `view.plugins.places.things`. Every field is in [`LyingView`](/docs/api/plugin-places#lyingview).

The things are what the location's entity holds, in that order, with `count` for how many. A thing whose [`visible`](/docs/reference/entities#entitydef) condition doesn't hold isn't listed. `pickUp` is a button labelled with the `places/pickUp` string that sends `places.pickUp(ref)`. A thing gets into a room from its `at` in content, or from the inventory's `drop` through `places/holder`.

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const hall: Content = {
  kinds: [{ id: 'item', label: 'Thing' }],
  entities: [{ id: 'parcel', of: 'item', name: 'parcel', at: places.locationRef('hall') }],
}
```

[Render the location and its exits](/docs/how-to/render/world-plugins#render-the-location-and-its-exits) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-places/react` subpath renders places for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### placesUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It puts [`LocationCard`](#locationcard) and [`Exits`](#exits) in the story, before the room's actions. Its type is in [`placesUi`](/docs/api/plugin-places#placesui).

### LocationCard

Renders the location from `view.plugins.places`: its picture as a [`LayeredPicture`](/docs/reference/react/components#layeredpicture), its name and description, and the things lying there with a **Pick up** button each. Its props are in [`LocationCard`](/docs/api/plugin-places#locationcard).

It renders nothing in a game without places or while the player is nowhere. A game replaces it as `LocationCard` in [`components`](/docs/reference/react/components#components). Its parts are `location`, `location-name`, `location-text`, `location-things`, `location-thing` (with `data-thing`), `location-thing-name` and `location-thing-pick`.

### Exits

Renders an outline button for each exit in `view.plugins.places.exits`, each sending its own command and carrying `data-exit`. Its props are in [`Exits`](/docs/api/plugin-places#exits).

An exit's refusal or warning is in the button's `title`, shown on hover, rather than printed under it as a choice's is. It renders nothing without places or with no exits. A game replaces it as `Exits` in `components`, and its parts are `exits` and `exit`.

### usePlaces

Returns the places view from the running game with a `go` and a `pickUp` that send the exit's and the thing's own commands, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`usePlaces`](/docs/api/plugin-places#useplaces).

### PlacesControls

The value `usePlaces` returns, a [`PlacesView`](#placesview) with `go(id)` and `pickUp(ref)`. Every field is in [`PlacesControls`](/docs/api/plugin-places#placescontrols). Each returns the runner's [`Result`](/docs/reference/common#result), so a refusal comes back with its reason.

::include[../../../../../snippets/react/use-places.tsx]

## Functions

The helpers are properties of `places` and write its calls, typed:

- **`places.location(def)`** returns a location's [`EntityDef`](#placedef).
- **`places.locationRef(id)`** returns a location's entity reference, `'location:park'` for `'park'`, and a reference as written.
- **`places.go(id)`** and **`places.pickUp(ref)`** return the [commands](#commands).
- **`places.move(location)`** returns the [`places/move`](#placesmove) effect.
- **`places.at(...ids)`**, **`places.within(...ids)`** and **`places.away(...ids)`** return the [conditions](#conditions).
- **`places.onlyAt(ids, reason?, { hide? })`** returns a [`blocked`](/docs/reference/actions#blocked) entry, `{ when: places.away(...ids), reason }`, that refuses an action, a vendor or a shift anywhere else. Its reason is the `places/notHere` string if left out.
- **`places.where(state, game)`** returns the id of the location the player is at, or `null`.

A game action belongs at home with `onlyAt`:

```ts
import type { ActionDef } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const phoneHome: ActionDef = {
  id: 'phoneHome',
  label: 'Phone home',
  blocked: [places.onlyAt(['flat'], 'The phone is at home.')],
  effects: [{ kv: 'calledHome', to: true }],
}
```

### locationsOf

Returns every entity in the game now that carries the `places/location` trait, as references, those content declares in its order and then those made in play. Its signature is in [`locationsOf`](/docs/api/plugin-places#locationsof).

### locationOf

Returns the [`Place`](#place) trait of the location with this id or reference, one content declares or one made in play, or `undefined` for none and for `null`. Its signature is in [`locationOf`](/docs/api/plugin-places#locationof).

```ts given
import { locationOf, locationsOf } from '@ifloom/plugin-places'

locationsOf(state, game) // ['location:flat', 'location:high-street', 'location:cafe', …]
locationOf(state, game, 'cafe')?.exits // ['high-street']
```

## Checks

When the game loads, places checks every location named by its calls wherever content writes them, and the trait on each location. A location's problems are pinned on the content or pack it came from, with `where` as `trait places/location on <ref>`.

| Problem | Cause |
|---|---|
| `action swim · unknown entity "location:lido"` | A `places/at`, `places/within`, `places/away`, `places/move` or `places/go` names a location the game doesn't have. |
| `"item:paper" has no places/location trait` | A call names an entity that isn't a location. |
| `options start · unknown entity "location:nowhere"` | The `start` option names a location the game doesn't have, reported on `base`. |
| `a place needs its exits: exits: [] for none` | The trait has no `exits` or no `body` list. |
| `exit to unknown location "lane"` | An exit names a location the game doesn't have. |
| `inside unknown location "yard"`, `is inside itself` | A `parent` names a location the game doesn't have, or leads back round to the location. |
| `no prose for "place.yard"` | The body, a `blocked` entry or an action names something the game doesn't have. An action's problem starts with the action, as `action dig: …`. |
| `audio: unknown track "rain"` | The `audio` names a track or channel the game doesn't have, or a cue channel. |
| `hotspot menu: names choice "order", but only a scene has choices` | The picture has a hotspot with a `choice`, or another problem a [picture check](/docs/reference/media#checks) finds. |
| `ui must be an object of hints` | The `ui` isn't data. |

A location's `image` and its picture's files are listed in the checker's [`files`](/docs/reference/checks#fileref).

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings). `places/go` and `places/pickUp` also use the engine's `finishFirst`.

| Key | Meaning |
|---|---|
| `places/noSuchPlace` | `There is no such place.`, the refusal of a location the game doesn't have. |
| `places/alreadyHere` | `You are already here.` |
| `places/cannotGetThere` | `You cannot get there from here.`, the refusal of a location that isn't an exit. |
| `places/pickUp` | `Pick up`, the label of each thing's `pickUp` button. |
| `places/notLyingHere` | `There is no {thing} here.` |
| `places/notHere` | `Not here.`, the reason `places.onlyAt()` writes when given none, as `{ string: 'places/notHere' }`. |

## Caveats

- A game that starts nowhere refuses every `places/go` with `You cannot get there from here.`, so its first scene puts the player on the map with `places.move`.
- A location's `arrive` runs on `places/go` only. A [trigger](/docs/reference/triggers) on `places.at(...)` runs however the player got there.
- A pack's `traits` row replaces the whole `places/location` trait, so it gives every field the location needs.
