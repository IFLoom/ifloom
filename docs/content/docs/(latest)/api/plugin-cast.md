---
title: "@ifloom/plugin-cast"
description: "Every export of @ifloom/plugin-cast and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-cast` and `@ifloom/plugin-cast/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-cast

- Functions: [`cast`](#cast), [`peopleOf`](#peopleof), [`personOf`](#personof)
- Constants: [`AWAY`](#away)
- Types: [`CastOptions`](#castoptions), [`CastView`](#castview), [`Person`](#person), [`PersonDef`](#persondef), [`PersonView`](#personview), [`TalkOption`](#talkoption)

### AWAY

Const. Explained in [Cast](/docs/plugins/cast#away).

The location id a person is at when they are at no location, `'away'`. A person without `home` is here when no schedule entry holds.

```ts shape
import { AWAY } from '@ifloom/plugin-cast'
const AWAY: 'away'
```

### cast

Function. Explained in [Cast](/docs/plugins/cast#cast).

Returns the cast plugin, for the game's `plugins`. It cooperates with places, which says where the player is, and
with the calendar, which a schedule can ask.

Its helpers write people and calls, such as `cast.person({ ... })`, `cast.talk('ava')` and `cast.call('ava')`.

```ts shape
import { cast } from '@ifloom/plugin-cast'
function cast(options?: CastOptions): DefinedPlugin<null, CastView>
```

Uses: [`CastOptions`](#castoptions), [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`CastView`](#castview).

| Helper | Signature | Description |
|---|---|---|
| `cast.person` | `(def:` [`PersonDef`](#persondef)`):` [`EntityDef`](/docs/api/engine#entitydef) | Returns an entity of the kind `character` (or `of`) carrying the `cast/person` trait, for content's `entities`. It takes a `PersonDef`, the entity's fields and the trait's side by side. |
| `cast.character` | `(who: string, kind?: string):` [`EntityRef`](/docs/api/engine#entityref) | Returns the entity reference of a person, such as `'character:ava'` for `cast.character('ava')`. Pass `kind` for a cast of another kind. |
| `cast.talk` | `(who: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `cast/talk` command, which opens the person's talk scene while they are here. |
| `cast.call` | `(who: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `cast/call` command, which opens the person's call scene from anywhere. |
| `cast.here` | `(...who: string[]):` [`Condition`](/docs/api/engine#condition) | Returns the `cast/here` condition, which holds while any of the people named is at the player's location. |
| `cast.at` | `(who: string, ...places: string[]):` [`Condition`](/docs/api/engine#condition) | Returns the `cast/at` condition, which holds while the person is at any of the locations named. |
| `cast.met` | `(...who: string[]):` [`Condition`](/docs/api/engine#condition) | Returns the `cast/met` condition, which holds once the player has met any of the people named. |

### CastOptions

Type. Explained in [Cast](/docs/plugins/cast#castoptions).

Settings for `cast()`. Every field is optional and has the default its comment gives.

```ts shape
import type { CastOptions } from '@ifloom/plugin-cast'
type CastOptions = {
  kind?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `kind` | `string` | yes |  | The kind the plugin brings for its people, which a bare id names (`'ava'` is `'character:ava'`). `character` if left out. |

### CastView

Type. Explained in [Cast](/docs/plugins/cast#castview).

The cast as the player sees it, in `view.plugins.cast`.

```ts shape
import type { CastView } from '@ifloom/plugin-cast'
type CastView = {
  present: PersonView[]
  people: PersonView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `present` | [`PersonView[]`](#personview) |  |  | The people at the location the player is at. Empty while a scene is open or a lock that denies everything is on. |
| `people` | [`PersonView[]`](#personview) |  |  | The people the player has met, in the order of `peopleOf`. |

### peopleOf

Function. Explained in [Cast](/docs/plugins/cast#helpers).

Returns the entity references of every person in the game now, the entities carrying the `cast/person` trait.
Content's people come first in declared order, then those made in play.

```ts shape
import { peopleOf } from '@ifloom/plugin-cast'
function peopleOf(state: GameState, game: Game): EntityRef[]
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref).

### Person

Type. Explained in [Cast](/docs/plugins/cast#person-1).

The data the `cast/person` trait holds, which makes an entity a person the player can meet, find and talk to.
`cast.person({ ... })` writes it beside the entity's own fields.

```ts shape
import type { Person } from '@ifloom/plugin-cast'
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

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `fullName` | `string` | yes |  | The person's full name, with prose tokens filled in. The entity's name if left out. |
| `pronouns` | `Record<string, string>` | yes |  | The person's pronouns for prose, such as `{ they: 'she', them: 'her' }`. The engine gives them no meaning. |
| `home` | `string` | yes |  | The id of the location the person is at when no schedule entry holds. `AWAY`, which is no location, if left out. |
| `schedule` | `{ location: string; when?:` [`Condition`](/docs/api/engine#condition) `}[]` | yes |  | The person's schedule, each entry a location and its condition. The first entry whose `when` holds places them, with `'$'` as the person. |
| `talk` | `string \|` [`TalkOption[]`](#talkoption) | yes |  | The scene that talking to the person opens, or several options of which the first whose `when` holds opens. The person can't be talked to if left out. |
| `call` | `{ scene?: string; when?:` [`Condition`](/docs/api/engine#condition)`; busy?: string }` | yes |  | The settings for calling the person from anywhere. The person can't be called if left out. `scene` is the scene a call opens, the talk scene if left out. `when` is the condition for picking up, and `busy` is the reason shown while it doesn't hold. |
| `storyline` | `string` | yes |  | The person's storyline. While it is closed, the person won't talk or pick up. |
| `met` | [`Condition`](/docs/api/engine#condition) | yes |  | The condition for the player having met the person. Having seen one of their talk or call scenes if left out. |
| `portrait` | `string` | yes |  | The person's face for avatars, a path in the game's `art/` folder. The entity's `image` if left out. A UI shows it where it renders the person small, such as in a thread, a post or a contact. |

### PersonDef

Type. Explained in [Cast](/docs/plugins/cast#persondef).

A person the game declares in `entities` with `cast.person({ ... })`. It holds an entity's fields and the
`cast/person` trait's side by side.

The entity's `description` is the line under the person's name, such as "Runs the café", and its `image` is their
picture.

```ts shape
import type { PersonDef } from '@ifloom/plugin-cast'
type PersonDef = {
  fullName?: string
  pronouns?: Record<string, string>
  home?: string
  schedule?: { location: string; when?: Condition }[]
  talk?: string | TalkOption[]
  call?: { scene?: string; when?: Condition; busy?: string }
  storyline?: string
  met?: Condition
  portrait?: string
  of?: string
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `fullName` | `string` | yes |  | The person's full name, with prose tokens filled in. The entity's name if left out. |
| `pronouns` | `Record<string, string>` | yes |  | The person's pronouns for prose, such as `{ they: 'she', them: 'her' }`. The engine gives them no meaning. |
| `home` | `string` | yes |  | The id of the location the person is at when no schedule entry holds. `AWAY`, which is no location, if left out. |
| `schedule` | `{ location: string; when?:` [`Condition`](/docs/api/engine#condition) `}[]` | yes |  | The person's schedule, each entry a location and its condition. The first entry whose `when` holds places them, with `'$'` as the person. |
| `talk` | `string \|` [`TalkOption[]`](#talkoption) | yes |  | The scene that talking to the person opens, or several options of which the first whose `when` holds opens. The person can't be talked to if left out. |
| `call` | `{ scene?: string; when?:` [`Condition`](/docs/api/engine#condition)`; busy?: string }` | yes |  | The settings for calling the person from anywhere. The person can't be called if left out. `scene` is the scene a call opens, the talk scene if left out. `when` is the condition for picking up, and `busy` is the reason shown while it doesn't hold. |
| `storyline` | `string` | yes |  | The person's storyline. While it is closed, the person won't talk or pick up. |
| `met` | [`Condition`](/docs/api/engine#condition) | yes |  | The condition for the player having met the person. Having seen one of their talk or call scenes if left out. |
| `portrait` | `string` | yes |  | The person's face for avatars, a path in the game's `art/` folder. The entity's `image` if left out. A UI shows it where it renders the person small, such as in a thread, a post or a contact. |
| `of` | `string` | yes |  | The person's kind. The cast's own kind (`character`, or the `kind` option) if left out. |

### personOf

Function. Explained in [Cast](/docs/plugins/cast#helpers).

Returns the `cast/person` trait of the entity `ref`, or undefined when it isn't a person. It reads through an entity
made in play `like` another.

```ts shape
import { personOf } from '@ifloom/plugin-cast'
function personOf(state: GameState, game: Game, ref: EntityRef): Person | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref), [`Person`](#person).

### PersonView

Type. Explained in [Cast](/docs/plugins/cast#personview).

A person as the player sees them, in `view.plugins.cast`. Names and descriptions have their prose tokens filled in.

```ts shape
import type { PersonView } from '@ifloom/plugin-cast'
type PersonView = {
  id: string
  ref: EntityRef
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

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The person's id, as `cast.talk('ava')` names them. It's the whole reference for a person of a kind other than the cast's. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The person's entity reference, such as `'character:ava'`. |
| `name` | `string` |  |  | The person's name from their entity. |
| `fullName` | `string` |  |  | The person's full name, or their name when they have none. |
| `description` | `string \| null` |  |  | The person's entity `description`, such as "Runs the café", or null when there is none. |
| `ui` | [`Ui`](/docs/api/engine#ui)`<`[`EntityUi`](/docs/api/engine#entityui)`>` | yes |  | The person's entity presentation hints, such as the React UI's `hue`. Left out when there are none. |
| `image` | `string \| null` |  |  | The person's picture's path, through `artSrc`. It's the entity's `image`, else `<kind>/<id>`. The type allows null, as every plugin's picture does, though the cast always gives a path. |
| `portrait` | `string \| null` |  |  | The person's face for avatars, through `artSrc`. It's the trait's `portrait`, else their `image`. |
| `here` | `boolean` |  |  | True when the person's schedule puts them at the location the player is at (`places/here`). |
| `closed` | `boolean` |  |  | True while the person's storyline is closed. |
| `met` | `boolean` |  |  | True when the player has met the person, by their `met` condition, else by having seen one of their talk or call scenes. |
| `actions` | [`RenderedChoice[]`](/docs/api/engine#renderedchoice) |  |  | The person's talk action, refused with its reason when it can't run. Empty when the person has no `talk`. |

### TalkOption

Type. Explained in [Cast](/docs/plugins/cast#talkoption).

A way a conversation with a person can open, one entry of a person's `talk`. The first entry whose `when` holds opens.

```ts shape
import type { TalkOption } from '@ifloom/plugin-cast'
type TalkOption = {
  scene: string
  when?: Condition
  label?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `scene` | `string` |  |  | The id of the scene the conversation opens. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | The option's condition, with `'$'` as the person. The option always holds if left out. |
| `label` | `string` | yes |  | The talk button's label for this option. The `cast/talk` string ("Talk") if left out. |

## @ifloom/plugin-cast/react

- Components: [`PeopleSection`](#peoplesection)
- Functions: [`usePeople`](#usepeople)
- Constants: [`CAST_WORDS`](#cast_words), [`castUi`](#castui), [`PeopleHere`](#peoplehere), [`Relationships`](#relationships)

### CAST_WORDS

Const.

The cast plugin's words in English, keyed by name. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { CAST_WORDS } from '@ifloom/plugin-cast/react'
const CAST_WORDS: { readonly people: 'People'; }
```

### castUi

Const. Explained in [Cast](/docs/plugins/cast#castui).

The cast plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds `PeopleSection` to the sidebar,
`PeopleHere` to the story after the room's actions, the `people` panel and the plugin's words.

```ts shape
import { castUi } from '@ifloom/plugin-cast/react'
const castUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### PeopleHere

Const. Explained in [Cast](/docs/plugins/cast#peoplehere).

Renders the people at the player's location from `view.plugins.cast.present`, each with their actions. A preset
styles its `people`, `person`, `person-portrait`, `person-name`, `person-desc` and `person-actions` parts.

It renders nothing in a game without the plugin, or while nobody is here.

```ts shape
import { PeopleHere } from '@ifloom/plugin-cast/react'
const PeopleHere: ComponentType<{ className?: string; }>
```

### PeopleSection

Component. Explained in [Cast](/docs/plugins/cast#peoplesection).

Renders the default layout's People section, a button that opens `Relationships` in a dialog. Its title is the `people` word.

```ts shape
import { PeopleSection } from '@ifloom/plugin-cast/react'
function PeopleSection(): JSX.Element
```

### Relationships

Const. Explained in [Cast](/docs/plugins/cast#relationships).

Renders everyone the player has met from `view.plugins.cast.people`, each with the stats the view lists on their
entity, such as friendship. A preset styles its `relationships`, `relationship`, `relationship-header` and
`relationship-stats` parts.

It renders nothing in a game without the plugin, or before the player has met anyone.

```ts shape
import { Relationships } from '@ifloom/plugin-cast/react'
const Relationships: ComponentType<{ className?: string; }>
```

### usePeople

Function. Explained in [Cast](/docs/plugins/cast#usepeople).

Returns the cast plugin's view from the running game, or null in a game without the plugin. It re-renders when the
view changes.

The view lists the people here in `present`, each with their actions, and everyone met in `people`. `PeopleHere`
and `Relationships` render from it.

```ts shape
import { usePeople } from '@ifloom/plugin-cast/react'
function usePeople(): CastView | null
```

Uses: [`CastView`](#castview).
