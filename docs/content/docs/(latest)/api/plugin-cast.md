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

Where someone is when nowhere on the map: away.

```ts shape
import { AWAY } from '@ifloom/plugin-cast'
const AWAY: 'away'
```

### cast

Function. Explained in [Cast](/docs/plugins/cast#cast).

The plugin, with its helpers on it: `cast()` makes the plugin for the
game's `plugins`, and content is written with `cast.person({ ... })`, `cast.talk('ava')` and `cast.call('ava')`.

```ts shape
import { cast } from '@ifloom/plugin-cast'
function cast(options?: CastOptions): DefinedPlugin<null, CastView>
```

Uses: [`CastOptions`](#castoptions), [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`CastView`](#castview).

| Helper | Signature | Description |
|---|---|---|
| `cast.person` | `(def:` [`PersonDef`](#persondef)`):` [`EntityDef`](/docs/api/engine#entitydef) |  |
| `cast.character` | `(who: string, kind?: string):` [`EntityRef`](/docs/api/engine#entityref) |  |
| `cast.talk` | `(who: string):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `cast.call` | `(who: string):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `cast.here` | `(...who: string[]):` [`Condition`](/docs/api/engine#condition) |  |
| `cast.at` | `(who: string, ...places: string[]):` [`Condition`](/docs/api/engine#condition) |  |
| `cast.met` | `(...who: string[]):` [`Condition`](/docs/api/engine#condition) |  |

### CastOptions

Type. Explained in [Cast](/docs/plugins/cast#castoptions).

```ts shape
import type { CastOptions } from '@ifloom/plugin-cast'
type CastOptions = {
  kind?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `kind` | `string` | yes |  | The kind the plugin brings for its people, and the kind a bare id names (`'ava'` is `'character:ava'`). `character` if left out. |

### CastView

Type. Explained in [Cast](/docs/plugins/cast#castview).

What the UI reads at `view.plugins.cast`.

```ts shape
import type { CastView } from '@ifloom/plugin-cast'
type CastView = {
  present: PersonView[]
  people: PersonView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `present` | [`PersonView[]`](#personview) |  |  | Who is in the room, while no scene is open. |
| `people` | [`PersonView[]`](#personview) |  |  | Everyone the player has met. |

### peopleOf

Function. Explained in [Cast](/docs/plugins/cast#helpers).

Everyone in the game now with the `cast/person` trait, as references: the
people content declares, in its order, then those made in play.

```ts shape
import { peopleOf } from '@ifloom/plugin-cast'
function peopleOf(state: GameState, game: Game): EntityRef[]
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref).

### Person

Type. Explained in [Cast](/docs/plugins/cast#person-1).

What the `cast/person` trait holds: what makes an entity someone the player can meet, find and talk to.

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
| `fullName` | `string` | yes |  | Prose tokens are filled in, as in the entity's name. The name if left out. |
| `pronouns` | `Record<string, string>` | yes |  | For prose that needs them: `{ they: 'she', them: 'her', … }`. The engine gives them no meaning. |
| `home` | `string` | yes |  | Where they are when no schedule entry holds. Away (`AWAY`), which is nowhere on the map, if left out. |
| `schedule` | `{ location: string; when?:` [`Condition`](/docs/api/engine#condition) `}[]` | yes |  | Where they are while each `when` holds; the first that holds wins. `'$'` is them. |
| `talk` | `string \|` [`TalkOption[]`](#talkoption) | yes |  | The scene talking to them opens, or the first of several whose `when` holds. Can't be talked to if left out. |
| `call` | `{ scene?: string; when?:` [`Condition`](/docs/api/engine#condition)`; busy?: string }` | yes |  | Whether they can be reached from anywhere, and the scene a call opens (their talk scene if left out). |
| `storyline` | `string` | yes |  | Their storyline: while it is closed, they will not talk or pick up. |
| `met` | [`Condition`](/docs/api/engine#condition) | yes |  | Whether the player has met them. Having seen one of their talk or call scenes, if left out. |
| `portrait` | `string` | yes |  | A face for avatars, beside the entity's `image`: a path in the game's `art/` folder, as an image's is. Where a UI draws someone small (a thread, a post, a contact), it uses this. Their `image` if left out. |

### PersonDef

Type. Explained in [Cast](/docs/plugins/cast#persondef).

What `cast.person()` takes: an entity's fields (its `of` is `'character'` if
left out; its `description` is the line under their name, "Runs the café", and
its `image` their picture) and the `cast/person` trait's (its `portrait`
their face, for avatars), side by side.

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
| `fullName` | `string` | yes |  | Prose tokens are filled in, as in the entity's name. The name if left out. |
| `pronouns` | `Record<string, string>` | yes |  | For prose that needs them: `{ they: 'she', them: 'her', … }`. The engine gives them no meaning. |
| `home` | `string` | yes |  | Where they are when no schedule entry holds. Away (`AWAY`), which is nowhere on the map, if left out. |
| `schedule` | `{ location: string; when?:` [`Condition`](/docs/api/engine#condition) `}[]` | yes |  | Where they are while each `when` holds; the first that holds wins. `'$'` is them. |
| `talk` | `string \|` [`TalkOption[]`](#talkoption) | yes |  | The scene talking to them opens, or the first of several whose `when` holds. Can't be talked to if left out. |
| `call` | `{ scene?: string; when?:` [`Condition`](/docs/api/engine#condition)`; busy?: string }` | yes |  | Whether they can be reached from anywhere, and the scene a call opens (their talk scene if left out). |
| `storyline` | `string` | yes |  | Their storyline: while it is closed, they will not talk or pick up. |
| `met` | [`Condition`](/docs/api/engine#condition) | yes |  | Whether the player has met them. Having seen one of their talk or call scenes, if left out. |
| `portrait` | `string` | yes |  | A face for avatars, beside the entity's `image`: a path in the game's `art/` folder, as an image's is. Where a UI draws someone small (a thread, a post, a contact), it uses this. Their `image` if left out. |
| `of` | `string` | yes |  | Their kind: the cast's own (`character`, or the `kind` option) if left out. |

### personOf

Function. Explained in [Cast](/docs/plugins/cast#helpers).

The `cast/person` trait of someone in the game, read through what they were made `like`; undefined for anyone else.

```ts shape
import { personOf } from '@ifloom/plugin-cast'
function personOf(state: GameState, game: Game, ref: EntityRef): Person | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`EntityRef`](/docs/api/engine#entityref), [`Person`](#person).

### PersonView

Type. Explained in [Cast](/docs/plugins/cast#personview).

One person as the UI draws them.

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
| `id` | `string` |  |  | Their id, as `cast.talk('ava')` names them; the whole reference for a person of another kind than the cast's. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | As content names them: `'character:ava'`. |
| `name` | `string` |  |  |  |
| `fullName` | `string` |  |  | Their full name, or their name when they have none. |
| `description` | `string \| null` |  |  | Their entity's `description`, tokens filled: "Runs the café". |
| `ui` | [`Ui`](/docs/api/engine#ui)`<`[`EntityUi`](/docs/api/engine#entityui)`>` | yes |  | Their entity's presentation hints, as written (the React UI's `hue`, say); left out with none. |
| `image` | `string \| null` |  |  | Their picture's path: the entity's `image`, else `<kind>/<id>`, through `artSrc`. Typed as every plugin's picture is, though the cast always gives one. |
| `portrait` | `string \| null` |  |  | Their face, for avatars: the trait's `portrait`, else their `image`, through `artSrc`. |
| `here` | `boolean` |  |  | In the room with the player. |
| `closed` | `boolean` |  |  | Their storyline is closed for now. |
| `met` | `boolean` |  |  | Whether the player has met them, as their `met` condition says, else whether they've seen one of their talk or call scenes. |
| `actions` | [`RenderedChoice[]`](/docs/api/engine#renderedchoice) |  |  | The talk button, greyed out with its reason when it is. |

### TalkOption

Type. Explained in [Cast](/docs/plugins/cast#talkoption).

One way a conversation can open: the scene, while `when` holds, with its button's label.

```ts shape
import type { TalkOption } from '@ifloom/plugin-cast'
type TalkOption = {
  scene: string
  when?: Condition
  label?: string
}
```

## @ifloom/plugin-cast/react

- Components: [`PeopleSection`](#peoplesection)
- Functions: [`usePeople`](#usepeople)
- Constants: [`CAST_WORDS`](#cast_words), [`castUi`](#castui), [`PeopleHere`](#peoplehere), [`Relationships`](#relationships)

### CAST_WORDS

Const.

The cast plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { CAST_WORDS } from '@ifloom/plugin-cast/react'
const CAST_WORDS: { readonly people: 'People'; }
```

### castUi

Const. Explained in [Cast](/docs/plugins/cast#castui).

The cast plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: a People section in the side column that opens
`Relationships` in a dialog, `PeopleHere` after the room's actions, the
`people` panel, and the cast's words.

```ts shape
import { castUi } from '@ifloom/plugin-cast/react'
const castUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### PeopleHere

Const. Explained in [Cast](/docs/plugins/cast#peoplehere).

Who is here, with what the player can do with each of them: the cast plugin's. Nothing without it. A thin default on `usePeople`.

```ts shape
import { PeopleHere } from '@ifloom/plugin-cast/react'
const PeopleHere: ComponentType<{ className?: string; }>
```

### PeopleSection

Component. Explained in [Cast](/docs/plugins/cast#peoplesection).

The default layout's People section: a button that opens `Relationships` in a dialog.

```ts shape
import { PeopleSection } from '@ifloom/plugin-cast/react'
function PeopleSection(): JSX.Element
```

### Relationships

Const. Explained in [Cast](/docs/plugins/cast#relationships).

Everyone the player has met, from the cast plugin, with the stats the
player can see on each of them (friendship, say), as the game declares them
on the cast's kind of entity. Nothing without the plugin, or before anyone
is met. A thin default on `usePeople`.

```ts shape
import { Relationships } from '@ifloom/plugin-cast/react'
const Relationships: ComponentType<{ className?: string; }>
```

### usePeople

Function. Explained in [Cast](/docs/plugins/cast#usepeople).

The cast plugin's view: who is here (`present`, each with their buttons) and everyone met (`people`), or null in a game without the plugin. `PeopleHere` and `Relationships` are drawn from it.

```ts shape
import { usePeople } from '@ifloom/plugin-cast/react'
function usePeople(): CastView | null
```

Uses: [`CastView`](#castview).
