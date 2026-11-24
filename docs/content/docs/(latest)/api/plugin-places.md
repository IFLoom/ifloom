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

Type. Explained in [Places](/docs/plugins/places#arrival).

What happens as the player walks into a place: effects, while `when` holds.

```ts shape
import type { Arrival } from '@ifloom/plugin-places'
type Arrival = {
  when?: Condition
  effects: EffectRef[]
}
```

### ExitView

Type. Explained in [Places](/docs/plugins/places#exitview).

One way out of the current place, as the UI draws it: a button like any
other (`RenderedChoice`), whose `label` is the place's name, `disabled` why
it can't be taken now, `warning` a plugin's soft refusal, and `price` what
going costs. Send `command` to take it. The rest describes where it leads.

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
| `tags` | `string[]` |  |  | The choice's or button's tags, for a UI to style or filter it by. The place's tags, its entity's. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The place's entity: `'location:park'`. |
| `description` | `string \| null` |  |  | The place's line under its name, its entity's `description`; null with none. |
| `image` | `string \| null` |  |  | The place's picture's path, its entity's `image` through `artSrc`; null with none. |

### LOCATION

Const. Explained in [Places](/docs/plugins/places#helpers).

The kind the plugin brings for its places, so each can hold things: `'location:park'`.

```ts shape
import { LOCATION } from '@ifloom/plugin-places'
const LOCATION: 'location'
```

### locationOf

Function. Explained in [Places](/docs/plugins/places#helpers).

The `places/location` trait of a place, named by its id (`'park'`) or its
reference: one content declares, or one made in play, read through what
it was made `like`. Undefined for anything else.

```ts shape
import { locationOf } from '@ifloom/plugin-places'
function locationOf(state: GameState, game: Game, ref: string | null | undefined): Place | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`Place`](#place).

### locationsOf

Function. Explained in [Places](/docs/plugins/places#helpers).

Every place in the game now, as references: every entity with the
`places/location` trait, the ones content declares in its order, then
those made in play.

```ts shape
import { locationsOf } from '@ifloom/plugin-places'
function locationsOf(state: GameState, game: Game): EntityRef[]
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref).

### LyingView

Type. Explained in [Places](/docs/plugins/places#lyingview).

A thing lying where the player is, as the UI draws it.

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
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | How content names it: `'item:paper'`. |
| `name` | `string` |  |  |  |
| `image` | `string \| null` |  |  | Its picture's path, through `artSrc`; null with none. |
| `count` | `number` |  |  | How many lie here. |
| `pickUp` | [`RenderedChoice`](/docs/api/engine#renderedchoice) |  |  | The button that picks one up. Send its `command`. |

### Place

Type.

What the `places/location` trait holds: what makes an entity a place the
player can be in. The place's name, its `description` (a word or two under the
name: "Home", "Café"), its `image` and its `tags` are the entity's.

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
| `parent` | `string` | yes |  | The place it is inside: a room's building. `places/within` follows it. |
| `exits` | `readonly string[]` |  |  | The places one step away. |
| `picture` | [`PictureDef`](/docs/api/engine#picturedef) | yes |  | A layered picture with hotspots, drawn where the UI draws the room. A hotspot here sends a `command`; a place has no choices. |
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | Travel here is refused while one of these holds, with its reason: a door shut for the night, a gate shut until a quest is done. With `hide`, the exit is left off the screen instead of greyed out. |
| `body` | [`Block[]`](/docs/api/engine#block) |  |  | What the player reads here while no scene is open: prose blocks, as a data scene's body. |
| `actions` | [`ActionDef[]`](/docs/api/engine#actiondef) | yes |  | What there is to do here, offered as buttons. |
| `audio` | `Record<string, string \| null>` | yes |  | What plays here while the player is here, by channel: `{ ambience: 'cafe.murmur' }`. Null silences a channel. An open scene's audio and an `audio` effect's win over it. |
| `ui` | [`Ui`](/docs/api/engine#ui)`<`[`SceneUi`](/docs/api/engine#sceneui)`>` | yes |  | Presentation hints for the room while no scene is open, carried to `view.scene.ui` as a scene's are: the React UI's `{ transition: 'slide-left' }`. The engine gives them no meaning. |
| `arrive` | [`Arrival`](#arrival) | yes |  | What happens on the doorstep, after the player walks in by an exit (not after a `places/move`): someone catching you on the way in. Its effects apply while `when` holds, or always with no `when`. |

### PlaceDef

Type. Explained in [Places](/docs/plugins/places#placedef).

What `places.location()` takes: an entity's fields (its `of` is `'location'` if
left out; its `description` is the line under the place's name, its `image` its
picture) and the `places/location` trait's, side by side. `ui` is the
trait's: the room's hints, as a scene's.

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
| `parent` | `string` | yes |  | The place it is inside: a room's building. `places/within` follows it. |
| `exits` | `readonly string[]` |  |  | The places one step away. |
| `picture` | [`PictureDef`](/docs/api/engine#picturedef) | yes |  | A layered picture with hotspots, drawn where the UI draws the room. A hotspot here sends a `command`; a place has no choices. |
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | Travel here is refused while one of these holds, with its reason: a door shut for the night, a gate shut until a quest is done. With `hide`, the exit is left off the screen instead of greyed out. |
| `body` | [`Block[]`](/docs/api/engine#block) |  |  | What the player reads here while no scene is open: prose blocks, as a data scene's body. |
| `actions` | [`ActionDef[]`](/docs/api/engine#actiondef) | yes |  | What there is to do here, offered as buttons. |
| `audio` | `Record<string, string \| null>` | yes |  | What plays here while the player is here, by channel: `{ ambience: 'cafe.murmur' }`. Null silences a channel. An open scene's audio and an `audio` effect's win over it. |
| `ui` | [`Ui`](/docs/api/engine#ui)`<`[`SceneUi`](/docs/api/engine#sceneui)`>` | yes |  | Presentation hints for the room while no scene is open, carried to `view.scene.ui` as a scene's are: the React UI's `{ transition: 'slide-left' }`. The engine gives them no meaning. |
| `arrive` | [`Arrival`](#arrival) | yes |  | What happens on the doorstep, after the player walks in by an exit (not after a `places/move`): someone catching you on the way in. Its effects apply while `when` holds, or always with no `when`. |
| `of` | `string` | yes |  | Its kind: the plugin's own, `location`, if left out. |

### places

Function. Explained in [Places](/docs/plugins/places#places).

The plugin, with its helpers on it: `places()` makes the plugin for the
game's `plugins`, and content is written with `places.location({ ... })`, `places.go('park')` and `places.at('cafe')`.

```ts shape
import { places } from '@ifloom/plugin-places'
function places(options?: PlacesOptions): DefinedPlugin<PlacesState, PlacesView>
```

Uses: [`PlacesOptions`](#placesoptions), [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`PlacesState`](#placesstate), [`PlacesView`](#placesview).

| Helper | Signature | Description |
|---|---|---|
| `places.location` | `(def:` [`PlaceDef`](#placedef)`):` [`EntityDef`](/docs/api/engine#entitydef) |  |
| `places.locationRef` | `(id: string):` [`EntityRef`](/docs/api/engine#entityref) |  |
| `places.pickUp` | `(ref:` [`EntityRef`](/docs/api/engine#entityref)`):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `places.go` | `(id: string):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `places.at` | `(...places: string[]):` [`Condition`](/docs/api/engine#condition) |  |
| `places.within` | `(...places: string[]):` [`Condition`](/docs/api/engine#condition) |  |
| `places.away` | `(...places: string[]):` [`Condition`](/docs/api/engine#condition) |  |
| `places.move` | `(place: string):` [`EffectRef`](/docs/api/engine#effectref) |  |
| `places.onlyAt` | `(places: string[], reason?:` [`Reason`](/docs/api/engine#reason)`, options?: { hide?: boolean }):` [`Blocked`](/docs/api/engine#blocked) |  |
| `places.where` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, game:` [`Game`](/docs/api/engine#game)`): string \| null` |  |

### PlacesOptions

Type. Explained in [Places](/docs/plugins/places#placesoptions).

```ts shape
import type { PlacesOptions } from '@ifloom/plugin-places'
type PlacesOptions = {
  start?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `start` | `string` | yes |  | Where a new game starts. Nowhere — no place at all — if left out. |

### PlacesState

Type. Explained in [Places](/docs/plugins/places#placesstate).

The plugin's state: where the player is, by the place's id (its whole reference for a place of another kind), or null.

```ts shape
import type { PlacesState } from '@ifloom/plugin-places'
type PlacesState = {
  at: string | null
}
```

### PlacesView

Type. Explained in [Places](/docs/plugins/places#placesview).

What the UI reads at `view.plugins.places`.

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
| `location` | [`PlaceView`](#placeview) `\| null` |  |  | Where the player is; null when nowhere. |
| `exits` | [`ExitView[]`](#exitview) |  |  | The exits, in the order the place lists them; none while a scene is open or a lock holds everything. |
| `things` | [`LyingView[]`](#lyingview) |  |  | What lies here, held by the place's entity: a thing the player dropped, say. None while a scene is open or a lock holds everything. |

### PlaceView

Type. Explained in [Places](/docs/plugins/places#placeview).

Where the player is, as the UI draws it.

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
| `id` | `string` |  |  | The place's id, as `go` names it. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | Its entity: `'location:park'`. |
| `name` | `string` |  |  |  |
| `description` | `string \| null` |  |  | The line under its name, its entity's `description`; null with none. |
| `tags` | `string[]` |  |  | Its entity's tags, for the UI to style it by. |
| `image` | `string \| null` |  |  | Its picture's path, its entity's `image` through `artSrc`; null with none. |
| `picture` | [`PictureView`](/docs/api/engine#pictureview) `\| null` |  |  | The place's picture as the engine's `pictureView` draws it, or null when it has none. Its hotspots are left out while a scene is open or a lock holds everything, as the exits are. |

## @ifloom/plugin-places/react

- Functions: [`usePlaces`](#useplaces)
- Constants: [`Exits`](#exits), [`LocationCard`](#locationcard), [`placesUi`](#placesui)
- Types: [`PlacesControls`](#placescontrols)

### Exits

Const. Explained in [Places](/docs/plugins/places#exits).

The exits from where the player is, each a button, greyed out with its reason. Nothing without the places plugin. A thin default on `usePlaces`.

```ts shape
import { Exits } from '@ifloom/plugin-places/react'
const Exits: ComponentType<{ className?: string; }>
```

### LocationCard

Const. Explained in [Places](/docs/plugins/places#locationcard).

Where the player is: the place's name and the line under it (its `description`), with its layered picture above them,
hotspots and all, and what lies there with a button to pick each up. The
exits are `Exits`. A thin default on `usePlaces`.

```ts shape
import { LocationCard } from '@ifloom/plugin-places/react'
const LocationCard: ComponentType<object>
```

### PlacesControls

Type.

What `usePlaces` returns: the places plugin's view, how to take an exit, and how to pick up what lies here.

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
| `location` | [`PlaceView`](#placeview) `\| null` |  |  | Where the player is; null when nowhere. |
| `exits` | [`ExitView[]`](#exitview) |  |  | The exits, in the order the place lists them; none while a scene is open or a lock holds everything. |
| `things` | [`LyingView[]`](#lyingview) |  |  | What lies here, held by the place's entity: a thing the player dropped, say. None while a scene is open or a lock holds everything. |
| `go` | `(exit: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Take an exit by the id of the place it leads to: sends that exit's command. Refused, as any command is, when it's greyed out or not there. |
| `pickUp` | `(thing:` [`EntityRef`](/docs/api/engine#entityref)`) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Pick up one of a thing lying here, by its reference (`'item:paper'`): sends its `pickUp` command. |

### placesUi

Const. Explained in [Places](/docs/plugins/places#placesui).

The places plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: the `LocationCard` and the `Exits` in the story, before
the room's actions.

```ts shape
import { placesUi } from '@ifloom/plugin-places/react'
const placesUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### usePlaces

Function. Explained in [Places](/docs/plugins/places#useplaces).

The places plugin's view with a way to travel, or null in a game without the plugin. `LocationCard` is drawn from it.

```ts shape
import { usePlaces } from '@ifloom/plugin-places/react'
function usePlaces(): PlacesControls | null
```

Uses: [`PlacesControls`](#placescontrols).
