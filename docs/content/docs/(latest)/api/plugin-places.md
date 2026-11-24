---
title: "@ifloom/plugin-places"
description: "Every export of @ifloom/plugin-places and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-places` and `@ifloom/plugin-places/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-places

- Functions: [`locationOf`](#locationof), [`locationsOf`](#locationsof), [`places`](#places)
- Constants: [`LOCATION`](#location)
- Types: [`Arrival`](#arrival), [`ExitView`](#exitview), [`LyingView`](#lyingview), [`Place`](#place), [`PlaceDef`](#placedef), [`PlacesOptions`](#placesoptions), [`PlacesState`](#placesstate), [`PlacesView`](#placesview), [`PlaceView`](#placeview)

### Arrival

Type. Explained in [Places](/docs/reference/plugins/places#arrival).

The effects that run as the player walks into a location by an exit, in a `Place`'s `arrive`.

```ts shape
import type { Arrival } from '@ifloom/plugin-places'
type Arrival = {
  when?: Condition
  effects: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | The condition that must hold for the effects to run. They always run if left out. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) |  |  | The effects that run on arrival. |

### ExitView

Type. Explained in [Places](/docs/reference/plugins/places#exitview).

An exit from the location the player is at as the player sees it, in `view.plugins.places.exits`. It is a
`RenderedChoice` labelled with the destination's name, so its `command` takes the exit.

Its `disabled` gives the reason the exit is refused, `warning` a plugin's soft refusal and `price` the cost of
going. The other fields describe the destination.

```ts shape
import type { ExitView } from '@ifloom/plugin-places'
type ExitView = {
  tags: string[]
  ref: EntityRef
  description: string | null
  image: string | null
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `tags` | `string[]` |  |  | The choice's or action's tags, for a UI to style or filter it by. The destination's tags. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The destination's entity reference, such as `'location:park'`. |
| `description` | `string \| null` |  |  | The destination's `description`, the line under its name, or null when it has none. |
| `image` | `string \| null` |  |  | The path of the destination's picture, its `image` through `artSrc`, or null when it has none. |

### LOCATION

Const. Explained in [Places](/docs/reference/plugins/places#location).

The id of the kind the plugin brings for its locations, `location`, as in `'location:park'`. The kind is unique, so each location can hold things.

```ts shape
import { LOCATION } from '@ifloom/plugin-places'
const LOCATION: 'location'
```

### locationOf

Function. Explained in [Places](/docs/reference/plugins/places#locationof).

Returns the `places/location` trait of a location, named by its id (`'park'`) or reference, read through the
entity it was made `like`. Returns undefined for anything that isn't a location.

```ts shape
import { locationOf } from '@ifloom/plugin-places'
function locationOf(state: GameState, game: Game, ref: string | null | undefined): Place | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`Place`](#place).

### locationsOf

Function. Explained in [Places](/docs/reference/plugins/places#locationsof).

Returns the references of every location in the game now, each entity with the `places/location` trait. Those
content declares come first in its order, then those made in play.

```ts shape
import { locationsOf } from '@ifloom/plugin-places'
function locationsOf(state: GameState, game: Game): EntityRef[]
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref).

### LyingView

Type. Explained in [Places](/docs/reference/plugins/places#lyingview).

A thing lying at the location the player is at as the player sees it, in `view.plugins.places.things`.

```ts shape
import type { LyingView } from '@ifloom/plugin-places'
type LyingView = {
  ref: EntityRef
  name: string
  image: string | null
  count: number
  pickUp: RenderedChoice
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The thing's entity reference, such as `'note:paper'`. |
| `name` | `string` |  |  | The thing's name. |
| `image` | `string \| null` |  |  | The path of the thing's picture through `artSrc`, or null when it has none. |
| `count` | `number` |  |  | The number of this thing lying here. |
| `pickUp` | [`RenderedChoice`](/docs/api/engine#renderedchoice) |  |  | The button that picks one up. Its `command` is the one to send. |

### Place

Type. Explained in [Places](/docs/reference/plugins/places#place).

The data of the `places/location` trait, which makes an entity a location the player can be at. The location's
name, `description`, `image` and `tags` are the entity's.

```ts shape
import type { Place, Arrival } from '@ifloom/plugin-places'
type Place = {
  parent?: string
  exits: readonly string[]
  picture?: PictureDef
  blocked?: Blocked[]
  body: Block[]
  actions?: ActionDef[]
  audio?: Record<string, string | null>
  ui?: Ui<SceneUi>
  arrive?: Arrival
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `parent` | `string` | yes |  | The id of the location this one is inside, such as the building a shop is in. `places/within` follows it. |
| `exits` | `readonly string[]` |  |  | The ids of the locations one step away. |
| `picture` | [`PictureDef`](/docs/api/engine#picturedef) | yes |  | The location's layered picture with hotspots, rendered with the room. A hotspot here sends a `command`, since a location has no choices. |
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | The reasons travel here is refused, such as a door shut for the night. With `hide`, the exit is left out of the view instead of disabled. |
| `body` | [`Block[]`](/docs/api/engine#block) |  |  | The location's body, the blocks the player reads here while no scene is open. |
| `actions` | [`ActionDef[]`](/docs/api/engine#actiondef) | yes |  | The location's actions, offered as buttons in the room. |
| `audio` | `Record<string, string \| null>` | yes |  | The audio that plays while the player is here, by channel, such as `{ ambience: 'cafe.murmur' }`. Null silences a channel, and an open scene's audio and an `audio` effect's override it. |
| `ui` | [`Ui`](/docs/api/engine#ui)`<`[`SceneUi`](/docs/api/engine#sceneui)`>` | yes |  | The room's presentation hints while no scene is open, carried to `view.scene.ui` as a scene's are, such as the React UI's `{ transition: 'slide-left' }`. The engine gives them no meaning. |
| `arrive` | [`Arrival`](#arrival) | yes |  | The effects that run after the player walks in by an exit, such as someone catching them on the way in. A `places/move` doesn't run them. |

### PlaceDef

Type. Explained in [Places](/docs/reference/plugins/places#placedef).

A location the game declares in `entities` with `places.location()`. It has an entity's fields and the
`places/location` trait's side by side, and its `ui` is the trait's room hints.

```ts shape
import type { PlaceDef, Arrival } from '@ifloom/plugin-places'
type PlaceDef = {
  parent?: string
  exits: readonly string[]
  picture?: PictureDef
  blocked?: Blocked[]
  body: Block[]
  actions?: ActionDef[]
  audio?: Record<string, string | null>
  ui?: Ui<SceneUi>
  arrive?: Arrival
  of?: string
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `parent` | `string` | yes |  | The id of the location this one is inside, such as the building a shop is in. `places/within` follows it. |
| `exits` | `readonly string[]` |  |  | The ids of the locations one step away. |
| `picture` | [`PictureDef`](/docs/api/engine#picturedef) | yes |  | The location's layered picture with hotspots, rendered with the room. A hotspot here sends a `command`, since a location has no choices. |
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | The reasons travel here is refused, such as a door shut for the night. With `hide`, the exit is left out of the view instead of disabled. |
| `body` | [`Block[]`](/docs/api/engine#block) |  |  | The location's body, the blocks the player reads here while no scene is open. |
| `actions` | [`ActionDef[]`](/docs/api/engine#actiondef) | yes |  | The location's actions, offered as buttons in the room. |
| `audio` | `Record<string, string \| null>` | yes |  | The audio that plays while the player is here, by channel, such as `{ ambience: 'cafe.murmur' }`. Null silences a channel, and an open scene's audio and an `audio` effect's override it. |
| `ui` | [`Ui`](/docs/api/engine#ui)`<`[`SceneUi`](/docs/api/engine#sceneui)`>` | yes |  | The room's presentation hints while no scene is open, carried to `view.scene.ui` as a scene's are, such as the React UI's `{ transition: 'slide-left' }`. The engine gives them no meaning. |
| `arrive` | [`Arrival`](#arrival) | yes |  | The effects that run after the player walks in by an exit, such as someone catching them on the way in. A `places/move` doesn't run them. |
| `of` | `string` | yes |  | The location's kind. The plugin's own kind, `location`, if left out. |

### places

Function. Explained in [Places](/docs/reference/plugins/places#places).

The places plugin's factory, with its helpers as properties. `places(options)` returns the plugin for the game's
`plugins`, and content calls helpers such as `places.location({ ... })`, `places.go('park')` and `places.at('cafe')`.

```ts shape
import { places } from '@ifloom/plugin-places'
function places(options?: PlacesOptions): DefinedPlugin<PlacesState, PlacesView>
```

Uses: [`PlacesOptions`](#placesoptions), [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`PlacesState`](#placesstate), [`PlacesView`](#placesview).

| Helper | Signature | Description |
|---|---|---|
| `places.location` | `(def:` [`PlaceDef`](#placedef)`):` [`EntityDef`](/docs/api/engine#entitydef) | Returns a location for content's `entities`, an entity with the `places/location` trait, from the entity's fields and the trait's. |
| `places.locationRef` | `(id: string):` [`EntityRef`](/docs/api/engine#entityref) | Returns the entity reference of a location; a bare id is one of the `location` kind. |
| `places.pickUp` | `(ref:` [`EntityRef`](/docs/api/engine#entityref)`):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `places/pickUp` command, which picks up one of a thing lying where the player is. |
| `places.go` | `(id: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `places/go` command, which walks to a location by an exit. |
| `places.at` | `(...places: string[]):` [`Condition`](/docs/api/engine#condition) | Returns the `places/at` condition, which holds while the player is at any of these locations. |
| `places.within` | `(...places: string[]):` [`Condition`](/docs/api/engine#condition) | Returns the `places/within` condition, which holds while the player is at any of these locations or anywhere inside one. |
| `places.away` | `(...places: string[]):` [`Condition`](/docs/api/engine#condition) | Returns the `places/away` condition, which holds while the player is at none of these locations or at no location. |
| `places.move` | `(place: string):` [`EffectRef`](/docs/api/engine#effectref) | Returns the `places/move` effect, which puts the player at the location at once, closing any scene. |
| `places.onlyAt` | `(places: string[], reason?:` [`Reason`](/docs/api/engine#reason)`, options?: { hide?: boolean }):` [`Blocked`](/docs/api/engine#blocked) | Returns a `blocked` entry that refuses anywhere but these locations, with `reason` or the `places/notHere` string. |
| `places.where` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, game:` [`Game`](/docs/api/engine#game)`): string \| null` | Returns the id of the location the player is at, from the `places/here` query, or null. |

### PlacesOptions

Type. Explained in [Places](/docs/reference/plugins/places#placesoptions).

Settings for `places()`.

```ts shape
import type { PlacesOptions } from '@ifloom/plugin-places'
type PlacesOptions = {
  start?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `start` | `string` | yes |  | The id of the location a new game starts at. The player is at no location if left out. |

### PlacesState

Type. Explained in [Places](/docs/reference/plugins/places#placesstate).

The location a save keeps for the player. Locations themselves are read from content.

```ts shape
import type { PlacesState } from '@ifloom/plugin-places'
type PlacesState = {
  at: string | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `at` | `string \| null` |  |  | The id of the location the player is at, its full reference for a location of another kind, or null when at none. |

### PlacesView

Type. Explained in [Places](/docs/reference/plugins/places#placesview).

The player's location, its exits and the things lying there as the player sees them, in `view.plugins.places`.

```ts shape
import type { PlacesView } from '@ifloom/plugin-places'
type PlacesView = {
  location: PlaceView | null
  exits: ExitView[]
  things: LyingView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `location` | [`PlaceView`](#placeview) `\| null` |  |  | The location the player is at, or null when at none. |
| `exits` | [`ExitView[]`](#exitview) |  |  | The location's exits in the order it lists them. It is empty while a scene is open or a lock holds everything. |
| `things` | [`LyingView[]`](#lyingview) |  |  | The things the location holds, such as a thing the player dropped. It is empty while a scene is open or a lock holds everything. |

### PlaceView

Type. Explained in [Places](/docs/reference/plugins/places#placeview).

The location the player is at as the player sees it, in `view.plugins.places.location`.

```ts shape
import type { PlaceView } from '@ifloom/plugin-places'
type PlaceView = {
  id: string
  ref: EntityRef
  name: string
  description: string | null
  tags: string[]
  image: string | null
  picture: PictureView | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The location's id, as `places.go` names it. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The location's entity reference, such as `'location:park'`. |
| `name` | `string` |  |  | The location's name. |
| `description` | `string \| null` |  |  | The location's `description`, the line under its name, or null when it has none. |
| `tags` | `string[]` |  |  | The location's tags, which a UI can style it by. |
| `image` | `string \| null` |  |  | The path of the location's picture, its `image` through `artSrc`, or null when it has none. |
| `picture` | [`PictureView`](/docs/api/engine#pictureview) `\| null` |  |  | The location's layered picture, rendered by the engine's `pictureView`, or null when it has none. Its hotspots are left out while a scene is open or a lock holds everything, as the exits are. |

## @ifloom/plugin-places/react

- Functions: [`usePlaces`](#useplaces)
- Constants: [`Exits`](#exits), [`LocationCard`](#locationcard), [`placesUi`](#placesui)
- Types: [`PlacesControls`](#placescontrols)

### Exits

Const. Explained in [Places](/docs/reference/plugins/places#exits).

Renders the exits from `view.plugins.places.exits`, each a button that is disabled with its reason when refused. It
renders nothing without the places plugin, and a preset can style the parts `exits` and `exit`.

```ts shape
import { Exits } from '@ifloom/plugin-places/react'
const Exits: ComponentType<{ className?: string; }>
```

### LocationCard

Const. Explained in [Places](/docs/reference/plugins/places#locationcard).

Renders the player's location from `view.plugins.places.location`, its name and `description` under its layered
picture, with the things lying there and a button to pick each up. `Exits` renders the exits.

A preset can style the parts `location`, `location-name`, `location-text`, `location-things`, `location-thing`,
`location-thing-name` and `location-thing-pick`.

```ts shape
import { LocationCard } from '@ifloom/plugin-places/react'
const LocationCard: ComponentType<object>
```

### PlacesControls

Type. Explained in [Places](/docs/reference/plugins/places#placescontrols).

The places plugin's view with functions that take an exit and pick up a thing, as `usePlaces` returns it.

```ts shape
import type { PlacesControls } from '@ifloom/plugin-places/react'
type PlacesControls = {
  location: PlaceView | null
  exits: ExitView[]
  things: LyingView[]
  go: (exit: string) => Result<GameState>
  pickUp: (thing: EntityRef) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `location` | [`PlaceView`](#placeview) `\| null` |  |  | The location the player is at, or null when at none. |
| `exits` | [`ExitView[]`](#exitview) |  |  | The location's exits in the order it lists them. It is empty while a scene is open or a lock holds everything. |
| `things` | [`LyingView[]`](#lyingview) |  |  | The things the location holds, such as a thing the player dropped. It is empty while a scene is open or a lock holds everything. |
| `go` | `(exit: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends the command of the exit to the location with this id. The engine refuses it, as any command, when the exit is disabled or missing. |
| `pickUp` | `(thing:` [`EntityRef`](/docs/api/engine#entityref)`) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends the `pickUp` command for one of the thing lying here with this reference, such as `'note:paper'`. |

### placesUi

Const. Explained in [Places](/docs/reference/plugins/places#placesui).

The places plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `LocationCard` and
the `Exits` in the room, before the room's actions.

```ts shape
import { placesUi } from '@ifloom/plugin-places/react'
const placesUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### usePlaces

Function. Explained in [Places](/docs/reference/plugins/places#useplaces).

Returns the places plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { usePlaces } from '@ifloom/plugin-places/react'
function usePlaces(): PlacesControls | null
```

Uses: [`PlacesControls`](#placescontrols).
