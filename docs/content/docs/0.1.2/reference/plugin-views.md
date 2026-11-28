---
title: "A plugin's view, scene and actions"
description: "A plugin's view, room scene, actions and audio show the player what it keeps, and its content brings kinds, entities and traits."
---
A plugin shows the player what it keeps through its providers: its [`view`](#view) in `view.plugins`, a [room scene](#scene) while no scene is open, [actions](#actions) as buttons, and [audio](#audio) on background channels. It brings the kinds and entities it keeps in its [`content`](#content), and reads what content writes on entities through [traits](#traits). [Entities and traits](/docs/0.1.2/explanation/entities-and-traits) explains traits, and [Write a plugin](/docs/0.1.2/how-to/write-a-plugin) gives a plugin a view.

None of the examples writes a plugin of its own. The places plugin, `packages/plugin-places/src/index.ts`, uses every provider on this page.

```ts
import type { ViewsIn } from '@ifloom/engine'
import { defineTraitKind, speakerOf, type RoomScene, type TraitDef, type TraitEntityDef, type TraitKind, type TraitKindSpec, type TraitTools } from '@ifloom/engine/plugin'
```

## view

A provider that returns what a UI renders from the plugin, whether the game's own code or the React UI the plugin ships in its `/react` subpath (see [Plugin UIs and the kit](/docs/0.1.2/reference/react/kit)). Its type is the `view` field of [`Plugin`](/docs/0.1.2/api/engine-plugin#plugin).

The engine's [`view()`](/docs/0.1.2/reference/view#view-1) collects each plugin's answer at `view.plugins[id]` and never looks inside it, and a plugin without `view` has no entry. The plugin declares its answer's type in [`ViewRegistry`](/docs/0.1.2/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry), so code that imports the package reads it typed. Every player action the view offers is a ready [`RenderedChoice`](/docs/0.1.2/reference/view#renderedchoice) built with [`renderAction`](/docs/0.1.2/reference/view#renderaction), so a UI never builds a plugin's command or words.

A view that shows pictures from a [pool](/docs/0.1.2/reference/media#pools) passes the context's `picks` to [`pictureView`](/docs/0.1.2/reference/view#pictureview). The engine writes each new pick there and the reducer records them after the command, so the same picture shows on every visit. The places plugin does this for a location's layered picture:

```ts fragment
view: (state, { game, slice, picks }) => {
  const place = locationOf(state, game, slice.at)
  return { picture: place && slice.at ? pictureView(state, game, place.picture, slice.at, null, picks) : null }
},
```

To render a plugin's view in a UI, see [Render the world plugins](/docs/0.1.2/how-to/render/world-plugins) and the other plugin pages under `how-to/render/`.

### beats

The context's function that renders a plugin's [blocks](/docs/0.1.2/reference/scenes#block) as [beats](/docs/0.1.2/reference/prose#scenebeat), as a scene's body is rendered, for plugin content that holds words as blocks, such as a message's body. Its type is the `beats` field of [`PluginContext`](/docs/0.1.2/api/engine-plugin#plugincontext).

`beats(blocks, id)` keeps the blocks whose `when` holds, fills their words in for this save, draws variants and picks pools under `id` so a block shows the same line or picture on every visit, sets each spoken line's [speaker](/docs/0.1.2/reference/prose#speech), and turns bold, italics and [UI pieces](/docs/0.1.2/reference/prose#ui-pieces) into spans through [`styledBeats`](/docs/0.1.2/reference/prose#styledbeats). Inline actions and tooltips stay in the words as written, because only a scene offers choices. In `view`, the engine records the pool picks it makes with the rest.

```ts fragment
view: (state, { beats, game }) => ({
  notes: notesOf(game).map((note) => ({ id: note.id, beats: beats(note.body, note.id) })),
}),
```

## ViewsIn

The type of [`view.plugins`](/docs/0.1.2/reference/view#view): each plugin's entry typed as it declares it in `ViewRegistry`, and `unknown` for a plugin that declares nothing. Its type is in [`ViewsIn`](/docs/0.1.2/api/engine#viewsin).

```ts given
import { view } from '@ifloom/engine'

const card = view(state, game).plugins.loyalty // LoyaltyView | undefined, once the plugin declares it
```

## scene

A provider that returns a [`RoomScene`](#roomscene), the screen shown while no scene is open, such as a location's description, a shop front or a heading over a dashboard. Its type is the `scene` field of [`Plugin`](/docs/0.1.2/api/engine-plugin#plugin).

The view asks the game's own `rules.scene`, then each plugin in the order `game.plugins` lists them, and the first answer fills [`view.scene`](/docs/0.1.2/reference/view#scene). `title` becomes the title, and `body` is rendered as a scene's body is, with its words, lines by key, variants and conditions, with `id: null` and no choices. A plugin returns `undefined` to let the next one answer, and with no answer the screen is the game's `title` and an empty body. The [places plugin](/docs/0.1.2/reference/plugins/places)'s room scene is the location the player is at.

A market stall on the high street fills the screen while it's open:

```ts
import type { Content } from '@ifloom/engine'
import { definePlugin } from '@ifloom/engine/plugin'

export const stall = definePlugin<{ open: boolean }>({
  id: 'stall',
  version: 1,
  start: () => ({ open: true }),
  commands: { haggle: { run: (state) => state } },
  scene: (_state, { slice }) =>
    slice.open ? { id: 'market', title: 'The market stall', body: [{ prose: 'stall.open' }, { variants: 'stall.cries' }] } : undefined,
  actions: () => [{ id: 'haggle', label: 'Haggle', command: { 'stall/haggle': true } }],
})

export const market: Content = {
  prose: { 'stall.open': 'Crates of eggs and a heap of loaves.', 'stall.cries/1': '"Fresh bread!"', 'stall.cries/2': '"Eggs, a dozen!"' },
  variants: { 'stall.cries': ['stall.cries/1', 'stall.cries/2'] },
}
```

```ts given continues
import { view } from '@ifloom/engine'

view(state, game).scene.title // 'The market stall'
view(stall.write(state, { open: false }), game).scene.title // the next plugin's room scene title, or the game's title
```

A scene with no title of its own takes the room scene's title, then the game's. Only `view.scene` changes, so with the places plugin listed after the stall, `view.plugins.places` still says where the player is and lists the exits.

## RoomScene

The screen a [`scene`](#scene) provider shows while no scene is open, and what the game's own [`rules.scene`](/docs/0.1.2/reference/rules#gamerules) returns too. Every field is in [`RoomScene`](/docs/0.1.2/api/engine-plugin#roomscene).

| Field | Meaning |
|---|---|
| `id` | The id the body's blocks are rendered under, the plugin's id if left out. A [`variants`](/docs/0.1.2/reference/scenes#block) block rotates per id, so a plugin that shows several locations gives each its own. It's also in [`view.scene.key`](/docs/0.1.2/reference/view#scene), as `room:<id>`. |
| `image` | The room's picture, a path in the game's `art/` folder or a URL, such as a location's `image`. It's [`view.scene.image`](/docs/0.1.2/reference/view#scene), which the React UI shows above the words. |
| `ui` | The room's [UI hints](/docs/0.1.2/reference/ui-hints), carried to `view.scene.ui` as a scene's are. |

```ts fragment
{ id: 'market', title: 'The market stall', body: [{ prose: 'stall.open' }] }
```

## actions

A provider that returns the [`ActionDef`](/docs/0.1.2/reference/actions#actiondef)s the plugin offers as buttons while no scene is open, such as the stall's Haggle. Its type is the `actions` field of [`Plugin`](/docs/0.1.2/api/engine-plugin#plugin).

An action has the same shape as content's, so it can carry a cost and effects of its own. The view puts the game's own `rules.actions` first, then every plugin's in the order `game.plugins` lists them, then content's [`actions`](/docs/0.1.2/reference/actions#actiondef), and renders each with [`renderAction`](/docs/0.1.2/reference/view#renderaction), which gives it a price, `blocked`, a [guard](/docs/0.1.2/reference/plugin-api#guard)'s warning and [`whyNot`](/docs/0.1.2/reference/actions#whynot)'s reason. The [places plugin](/docs/0.1.2/reference/plugins/places)'s are the current location's `actions`.

```ts given
import { view } from '@ifloom/engine'

// The stall above, with an action of the content's to buy bread:
view(state, game).actions.map((action) => action.id) // ['haggle', 'buy']
```

An action whose `when` doesn't hold is left out, and so is one whose command a [lock](/docs/0.1.2/reference/locks) with `hide: true` stops. Any other lock greys it out with its line. Like content's actions, they aren't offered while a scene is open or while a lock stops everything ([`lockedOut`](/docs/0.1.2/reference/locks#lockedout)).

An action that only sends a command is that command. One with a cost, effects or `once` sends `{ type: 'action', id: '<plugin>/<id>' }`, and the engine finds it again among the plugin's `actions` in that state, or by asking its [`action`](#action).

## action

A provider that returns one of the plugin's actions by id, for `{ type: 'action', id: '<plugin>/<id>' }`, when it isn't among the plugin's `actions` in this state. Its type is the `action` field of [`Plugin`](/docs/0.1.2/api/engine-plugin#plugin).

The [devices plugin](/docs/0.1.2/reference/plugins/devices) answers this way for an app's buttons, which it renders in the app rather than in the room. A plugin returns `undefined` for an id that isn't its own, and without `action` only the plugin's current `actions` can be done.

```ts fragment
// An app's button, found by its id whether or not the app is open.
action: (_state, id, { game }) => appActions(game).find((entry) => entry.id === id),
```

## audio

A provider that returns what plays on background [audio channels](/docs/0.1.2/reference/audio#channeldef), by channel, such as `{ ambience: 'cafe.murmur' }`. Its type is the `audio` field of [`Plugin`](/docs/0.1.2/api/engine-plugin#plugin).

It comes third of [four levels](/docs/0.1.2/reference/audio#audiochannelview): an open scene's `audio` and an [`audio` effect](/docs/0.1.2/reference/effects#audio) both win over it, and it wins over the game's default. When several plugins name one channel, the first in `game.plugins` wins. `null` silences a channel, and a channel the plugin leaves out goes to the next plugin, then the default. `undefined` or `{}` leaves every channel alone. The [places plugin](/docs/0.1.2/reference/plugins/places) plays the location's `audio` this way.

```ts fragment
// The stall rings its bell while the market is on.
audio: (state) => (state.kv.marketOpen ? { ambience: 'market.bell' } : undefined),
```

The engine asks it on every [`view`](/docs/0.1.2/reference/view) and after every command.

## content

The [`Content`](/docs/0.1.2/reference/content#content) the plugin brings, such as the [kinds](/docs/0.1.2/reference/entities#kinddef) of entity it keeps and the [entities](/docs/0.1.2/reference/entities#entitydef) there at the start. Its type is the `content` field of [`Plugin`](/docs/0.1.2/api/engine-plugin#plugin).

The [loader](/docs/0.1.2/reference/content#loadgame) merges it first, plugin by plugin in the order `game.plugins` lists them, under the game's content and packs. It can hold anything content can, and each entity in it has stats and a kv store that content works on with `of`, `each` and `count`. The cast brings each character as an entity of the kind `character`, which is how a `friendship` stat belongs to each person. A plugin with options builds its content in its factory from them.

A plugin's kind isn't [listed](/docs/0.1.2/reference/entities#listed) in the view unless it sets `listed`. A kind the game's content declares with the same id replaces the plugin's and keeps the plugin's fields it leaves out, which is how a game renames one, and a pack can replace anything in it by id. The game's content can redeclare the plugin's kinds and entities without a [`declared twice`](/docs/0.1.2/reference/content#checks) problem.

```ts
import { definePlugin } from '@ifloom/engine/plugin'

export const regulars = definePlugin<null>({
  id: 'regulars',
  version: 1,
  content: {
    kinds: [{ id: 'regular', label: 'Regular', plural: 'Regulars', listed: true }],
    entities: [
      { id: 'mo', of: 'regular', name: 'Mo' },
      { id: 'sal', of: 'regular', name: 'Sal' },
    ],
  },
})
```

The plugin gives an entity the game writes something per entity, such as a location or a vendor, through a [trait](#traits): content writes the entity with the trait, often through a definer on the plugin's factory such as `places.location()`, and the plugin finds it with [`withTrait`](/docs/0.1.2/reference/entities#withtrait) or a [trait kind](#traitkind). A mod then adds one as it adds any entity. Content that puts several plugins together, such as a phone with an app for each messages channel, is the game's own (see [Build a phone](/docs/0.1.2/how-to/build-a-phone)).

## traits

The [`TraitDef`](#traitdef)s of the traits the plugin gives meaning to, the named data entities carry. Its type is the `traits` field of [`Plugin`](/docs/0.1.2/api/engine-plugin#plugin).

Content writes a trait on a kind, an entity or the `traits` table, and the plugin reads it with [`traitOf`](/docs/0.1.2/reference/entities#traitof) and [`withTrait`](/docs/0.1.2/reference/entities#withtrait), or with [`declaredTrait`](/docs/0.1.2/reference/entities#declaredtrait) where there's no state. A trait is data only, and its behaviour is the plugin's own conditions, effects and commands. Declaring one takes three things: the data's type in the engine's [`TraitRegistry`](/docs/0.1.2/reference/entities#traitregistry-and-traitdata), the `TraitDef` in `traits`, and the code that reads it.

```ts
import { traitOf } from '@ifloom/engine'
import { definePlugin, type TraitDef } from '@ifloom/engine/plugin'

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'laundry/washable': { temp: number; gentle?: boolean }
  }
}

const washable: TraitDef<'laundry/washable'> = {
  id: 'laundry/washable',
  check: (data) => (data.temp > 90 ? [`${data.temp} degrees would shrink it`] : []),
}

export const laundry = definePlugin<null>({
  id: 'laundry',
  version: 1,
  traits: [washable],
  conditions: {
    delicate: (state, args, { game }) => traitOf(state, game, String(args.entity), 'laundry/washable')?.gentle === true,
  },
})
```

With the `declare module` block in the plugin's source, every game that imports the plugin gets the type, so `traitOf(state, game, ref, 'laundry/washable')` returns `{ temp: number; gentle?: boolean } | undefined` and content that writes `{ temp: 'hot' }` is a type error.

A trait's data on an entity is the kind's default with the entity's own laid over it, field by field, so a field a kind supplies is optional in `TraitRegistry`. A thing [created](/docs/0.1.2/reference/effects#create) in play has the traits it was given over those of the entity it was made `like`, or its kind's default. `declaredTrait` and `declaredWithTrait` read content only, so they know only the entities content declares.

## TraitDef

A trait a plugin declares in its `traits`, data that entities carry and the plugin gives meaning to. Every field is in [`TraitDef`](/docs/0.1.2/api/engine-plugin#traitdef).

| Field | Meaning |
|---|---|
| `id` | The trait's id, the plugin's id, a `/` and a name, like its calls. |
| `check` | The function that returns what's wrong with the data on one entity by a rule of the plugin's own, each string reported at `trait <id> on <entity>`. |
| `references` | The function that returns what the data names, for the checker to resolve like any [reference](/docs/0.1.2/reference/checks#reference). `tools.ref` is the entity it's on, so a condition in the data that names it as `'$'` can be bound to it first with [`bindCurrent`](/docs/0.1.2/reference/entities#bindcurrent). |
| `words` | A [`WordShape`](/docs/0.1.2/reference/words#wordshape) of the fields that are words a player reads, keyed in the words table as `entity.<ref>.traits.<id>.<field>`, or `kind.<kind>.traits.<id>.<field>` for a kind's default. |
| `state` | A `start` function, for the rare trait that keeps state on each entity, such as the uses left in a torch, read and written with [`traitState`](/docs/0.1.2/reference/entities#traitstate) and [`setTraitState`](/docs/0.1.2/reference/entities#settraitstate). |

The checker asks the plugin's trait about the data on every declared entity that carries it, after the kind's default and the entity's own are combined. A plugin names the trait in `TraitDef<'laundry/washable'>`, so its `check` and `references` get the data typed.

```ts fragment
{ id: 'loyalty/till', words: { greeting: true } }
```

## TraitTools

The game and the entity the data is on, which a trait's `check` and `references` get beside the data. Every field is in [`TraitTools`](/docs/0.1.2/api/engine-plugin#traittools).

```ts fragment
references: (data, { ref }) => [{ when: bindCurrent(data.when, ref) }],
```

## TraitKindSpec

What [`defineTraitKind`](#definetraitkind) takes: the kind a bare id names, the trait that makes an entity one, and every field of the trait. Every field is in [`TraitKindSpec`](/docs/0.1.2/api/engine-plugin#traitkindspec).

`fields` lists every field of the trait, so the definer knows which of the fields it's given go in the trait and which stay on the entity. It's typed complete, so adding a field to the trait without listing it is a type error.

```ts fragment
{ kind: 'machine', trait: 'laundry/machine', fields: { capacity: true, noisy: true } }
```

## TraitEntityDef

What a trait kind's definer takes: an entity's fields and the trait's side by side, with `of` the kind's if left out. Its type is in [`TraitEntityDef`](/docs/0.1.2/api/engine-plugin#traitentitydef).

A field both have, such as a location's `ui`, is the trait's. A plugin types its definer's parameter with it.

```ts
import type { EntityDef } from '@ifloom/engine'
import type { TraitEntityDef } from '@ifloom/engine/plugin'
import { MACHINES } from './machines.ts'

// The definer, on the factory: laundry.machine({ id: 'big', name: 'The big one', capacity: 8 }).
export const machine = (def: TraitEntityDef<'laundry/machine'>): EntityDef => MACHINES.define(def)
```

## TraitKind

What [`defineTraitKind`](#definetraitkind) returns, kept in a constant beside the plugin's calls. Every member is in [`TraitKind`](/docs/0.1.2/api/engine-plugin#traitkind).

| Field | Meaning |
|---|---|
| `ref(id)` | The method that returns the entity an id names: a bare id is one of the kind (`'big'` is `'machine:big'`), and a reference comes back as written. |
| `id(ref)` | The method that returns how the plugin names an entity back: its bare id for one of the kind, else its whole reference. |
| `all`, `get` | The methods that return every entity in the game now with the trait and one entity's trait data, as [`withTrait`](/docs/0.1.2/reference/entities#withtrait) and [`traitOf`](/docs/0.1.2/reference/entities#traitof) read them. |
| `declaredAll`, `declaredGet` | The same from content alone, for a check, worked out once per game. |
| `define(def)` | The method that returns an [`EntityDef`](/docs/0.1.2/reference/entities#entitydef) of the kind (or `def.of`), with the trait's fields in `traits[trait]`. |
| `entry(id)` | The method that returns the reference `{ entity, carrying: trait }`, so the checker reports `unknown entity "machine:tiny"` or `"…" has no laundry/machine trait`. |
| `arg()`, `args()` | The methods that return a call's [argument](/docs/0.1.2/reference/plugin-calls#arg-1) naming one entity, or one or several, checked as `entry`. |

The plugin still declares the kind itself in its [`content`](#content)'s `kinds`, with its label and whether it's listed.

```ts given
import { MACHINES } from './machines.ts'

const big = MACHINES.get(state, game, 'big')?.capacity
```

## Functions

### speakerOf

Returns who an id is, as the view renders a scene's speaker: a [`SpeakerView`](/docs/0.1.2/reference/view#speakerview) with the entity's name (tokens filled), picture and UI hints, or `null` when the id names no entity. Its signature is in [`speakerOf`](/docs/0.1.2/api/engine-plugin#speakerof).

A bare id is `character:<id>`, else the one entity the game declares with that id. A reference is read as written, and `'you'` is whoever the player is playing. People are [entities](/docs/0.1.2/reference/entities), so a plugin that brings people gives them as entities in its [`content`](#content), and a scene names one as its [`speaker`](/docs/0.1.2/reference/scenes#speaker). The messages and feed plugins ask the cast's `cast/sender` first and fall back to `speakerOf` without the cast.

```ts given
import { speakerOf } from '@ifloom/engine/plugin'

speakerOf(state, game, 'ava') // { id: 'ava', ref: 'character:ava', name: 'Ava', image: 'art/character/ava.svg', ui: { hue: 20 } }
speakerOf(state, game, 'Council') // null: show the name as written
```

### defineTraitKind

Returns a [`TraitKind`](#traitkind) from a [`TraitKindSpec`](#traitkindspec), for a plugin whose things are each an entity of its own kind carrying its trait, as the places plugin's locations, the shop's vendors and the cast's people are. Its signature is in [`defineTraitKind`](/docs/0.1.2/api/engine-plugin#definetraitkind).

```ts
import { defineCalls, defineTraitKind } from '@ifloom/engine/plugin'

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'laundry/machine': { capacity: number; noisy?: boolean }
  }
}

export const MACHINES = defineTraitKind({ kind: 'machine', trait: 'laundry/machine', fields: { capacity: true, noisy: true } })

export const CALLS = defineCalls('laundry', { commands: { load: { id: MACHINES.arg() } } })
```

## Checks

| Problem | Cause |
|---|---|
| `trait "washable" must be named "laundry/" and a name` | A plugin declares a trait whose id isn't the plugin's id, a `/` and a name. |
| `two traits share the id "laundry/washable"` | A plugin declares two traits with one id. |
| `plugin "laundry" has no trait "laundry/washabel"` | Content writes a trait the plugin it names doesn't declare. A game without the plugin carries its traits unchecked. |
| `95 degrees would shrink it` | The trait's own `check` returns a problem about one entity's data, at `trait <id> on <entity>`. |

The [content checker](/docs/0.1.2/reference/checks#traits) doesn't see a room scene's blocks, a plugin's actions or the tracks its `audio` names, which the plugin works out in play, so the plugin names them in its [`references`](/docs/0.1.2/reference/plugin-checks#pluginreferences-calltable-and-contentreferences): `{ blocks }`, [`actionReferences`](/docs/0.1.2/reference/actions#actionreferences), `{ channel, track }`, and `{ ui }` for a room scene's hints.

## Caveats

- The first room scene answer wins, so a plugin listed earlier in `game.plugins` hides a later one's. A plugin answers only when the room is its own.
- A plugin's content reaches the game only through [`loadGame`](/docs/0.1.2/reference/content#loadgame). A game built by hand lists the plugin's kinds in `game.kinds` and its entities in `game.entities` itself.
- A declared entity a save doesn't have, such as one a new entry in the plugin's content makes, joins the save when it loads, unless play removed it.
- A trait is data, never functions, because packs and mods write it as JSON.
