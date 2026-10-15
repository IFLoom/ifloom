# The view

The engine has no UI of its own. It hands a UI one object, a `View`, that says everything there is to draw, and takes back [commands](/reference/commands). A UI's loop is:

1. `const screen = view(state, game)`
2. Draw `screen`.
3. When the player presses something, send the `command` on it: `state = apply(state, game, command).state`.
4. Go to 1.

Every button in a `View` already carries its command, its price, and — if it can't be pressed — the reason, worded for the player. The reducer refuses with the same reasons, so the screen and the rules cannot disagree. A UI should show greyed-out buttons with their reason rather than hide them.

The [base UI](/ui/), `@ifloom/ui`, is a React UI that draws all of this; read on to write your own.

```ts
import { renderAction, view, type View } from '@ifloom/engine'
```

## view

```ts
function view(state: GameState, game: Game): View
```

Builds the whole `View` from the state in one pass. Pure and cheap enough to call after every command.

```ts
const screen = view(state, game)
header.textContent = screen.when ?? screen.title   // 'Day 1 · Monday morning · High Street' with the calendar and places
for (const action of screen.actions) addButton(action.label, action.disabled, action.command)
```

## View

`View` has a fixed set of fields, plus [`plugins`](#plugins), where each plugin adds its own slice. What the player wears is the [wardrobe plugin](/plugins/wardrobe)'s slice. The engine has no phone of its own, but it has the parts one is built from — [collections](#collections), [notices](#notices) and [inputs](#inputs) below — and [messages](/plugins/messages), [feeds](/plugins/feed) and [devices](/plugins/devices) are plugins, each with its own slice. The [phone bundle](/plugins/phone) wires them together.

### The clock and the player

| Field | Type | Meaning |
|---|---|---|
| `title` | `string` | The game's `title`. |
| `phase` | `string` | The stretch of the game the player is in. |
| `turn` | `number` | How many [turns](/reference/state#turn) have passed: `0` on the first, **not** one-based. |
| `when` | `string \| null` | When and where the game is, in plugins' words: every plugin's [`label`](/reference/plugins#labels), in the order `game.plugins` lists them, joined with ` · ` (`'Day 3 · Wednesday morning · The café'` from the [calendar](/plugins/calendar#the-label) and then the [places plugin](/plugins/places#the-label)). `null` when no plugin gives one. |

The engine keeps no time of day, so the view has no day or period of its own. In a game with the [calendar plugin](/plugins/calendar), its day, weekday, period and whether it is time for bed are at `view.plugins.calendar`, a [`CalendarView`](/plugins/calendar#calendarview), and its words are in `when`.

The view has no player name: the engine keeps none. A game that asks for one keeps it in a variable — read `state.flags.playerName`, or print it in prose with <code v-pre>{{playerName}}</code>.

### The idle screen

While no scene is open, the screen is the **idle screen**: the [stage](#the-scene) in `scene`, and the buttons here.

| Field | Type | Meaning |
|---|---|---|
| `actions` | [`RenderedChoice[]`](#renderedchoice) | What the player can do. |

`actions` is **empty while a scene is open, or while a [lock](/reference/locks) that stops everything is on** — the player can only move through the scene.

`actions` is every plugin's [`buttons`](/reference/plugins#buttons), in the order `game.plugins` lists them, then the game's own [`actions`](/reference/game#game), each left out while its `when` does not hold, and each left out while a [lock](/reference/locks) with `hide: true` stops its command. All of them are drawn alike, with [`renderAction`](#renderaction). The engine adds none of its own: a game that wants a **Wait a while** button in every room declares it in `game.actions`.

The engine keeps no places, so the view has no location or exits of its own. With the [places plugin](/plugins/places), the room is at `view.plugins.places`, a [`PlacesView`](/plugins/places#placesview): its `location`, and its `exits`, each an [`ExitView`](/plugins/places#exitview) carrying the command that takes it. The room's own actions are the plugin's buttons, so they come first in `actions`; its name is in `when`; its description is the stage.

```ts
const room = screen.plugins.places as PlacesView | undefined   // PlacesView from '@ifloom/plugin-places'
for (const exit of room?.exits ?? []) addButton(exit.name, exit.disabled, exit.command)
```

The engine keeps no characters either, so the view has no people of its own. With the [cast plugin](/plugins/cast), who is in the room is at `view.plugins.cast`, a [`CastView`](/plugins/cast#castview): its `present`, each a [`PersonView`](/plugins/cast#personview) with their **Talk** button in `actions`, empty while a scene is open or a lock stops everything, as `actions` is.

```ts
const people = (screen.plugins.cast as CastView | undefined)?.present ?? []   // CastView from '@ifloom/plugin-cast'
for (const person of people) for (const talk of person.actions) addButton(`${person.name}: ${talk.label}`, talk.disabled, talk.command)
```

### The scene

`scene` is what fills the main panel. With a scene open, it is that scene's render. Without one, it is the **stage**: `id: null`, frame `'stage'`, no choices, and a title and body from the first plugin whose [`stage`](/reference/plugins#stage) answers — its `body` blocks rendered as the prose through the same [renderer](/reference/scenes#renderscene) as a data scene, with the game's prose. The [places plugin](/plugins/places#the-stage)'s stage is the room the player is in: its name as the title and its `body` blocks as the prose. With no plugin answering, it is the game's `title` as the title and an empty body.

| Field | Type | Meaning |
|---|---|---|
| `id` | `string \| null` | The scene, or `null` for the stage. |
| `title` | `string` | The view's title, else the scene's, else the title of a plugin's [stage](/reference/plugins#stage) (the room's name, with the places plugin), else the game's `title`. |
| `body` | `string` | The raw prose. |
| `beats` | [`SceneBeat[]`](/reference/prose#scenebeat) | The prose parsed, with the scene's media merged in. Draw these, not `body`. |
| `frame` | `'stage' \| 'talk'` | Layout: the view's `frame`, else the scene's, else `talk` when there is a speaker and `stage` when there is not. The screen with no scene open is `stage`. |
| `tags` | `string[]` | The view's `tags`, else the scene's, else `[]`. The engine gives them no meaning; style the scene by them. The stage has none. |
| `panel` | `string \| null` | A bespoke panel to draw instead of the choice list. |
| `panelData` | `unknown` | What that panel needs. Opaque to the engine. |
| `speaker` | [`SpeakerView`](#speakerview) ` \| null` | Who is talking: the id the view's `speaker` names, else the scene's `speaker`, as the first plugin's [`speaker`](/reference/plugins#speakers) says (the [cast](/plugins/cast#speakers)'s, for its characters), else `null`. Never guessed from the scene's id. |
| `stageImage` | `string \| null` | The big picture: the view's `portrait`, else the speaker's portrait, else `null`. |
| `choices` | [`RenderedChoice[]`](#renderedchoice) | The visible choices. Hidden ones (`visible: false`) are left out; disabled ones stay. |

If `state.sceneId` names a scene the game does not have, the scene reads "The moment has passed." under the stage's title (else the game's) with one choice, **Look around**, which sends `leave`. Both are in the [strings table](/reference/strings#buttons-and-labels) (`momentPassed`, `lookAround`).

`inScene` (`boolean`) is `true` whenever a scene is open.

### The player's numbers and things

| Field | Type | Meaning |
|---|---|---|
| `stats` | [`StatView[]`](#statview) | The player's [declared stats](/reference/stats) that are `listed` and whose `visible` condition holds, in declaration order. A stat declared `of` a kind is an entity's, and is in [`entities`](#entities) instead. |
| `statsById` | `Record<string, `[`StatView`](#statview)`>` | Every one of the player's declared stats, by id, listed or not, visible or not. Read a purse or a gauge your UI draws its own way from here: `screen.statsById.coins.text`. |
| `pack` | `{ id, name, desc, count, useLabel? }[]` | Items the player has (count above 0), in the order the game declares them. `useLabel` means it can be used (`use` command). |

### collections

| Field | Type | Meaning |
|---|---|---|
| `collections` | `Record<string, `[`CollectionView`](#collectionview)`>` | Every declared [collection](/reference/collections), by id, with its entries oldest first and their words filled in. A collection with nothing in it is there, with no entries. |

### entities

| Field | Type | Meaning |
|---|---|---|
| `entities` | `Record<string, `[`EntitiesView`](#entitiesview-and-entityview)`>` | Every declared [kind](/reference/entities), by id, with its entities in the order they came and the stats the player can see on each. A kind with none is there, with no entries. |

```ts
const { staff } = view(state, game).entities
staff.plural                                   // 'Staff'
staff.entries.map((entry) => entry.name)       // ['Ana', 'Dev'], once Dev is hired
staff.entries[0].stats.map((stat) => stat.text) // ['5', '60', '£12']
```

### notices

| Field | Type | Meaning |
|---|---|---|
| `notices` | [`NoticesView`](#noticesview-and-noticeview) | The [notices](/reference/notices) not yet dismissed, newest first, and how many each tag has, for badges. |

```ts
const { unseen, byTag } = screen.notices
postBadge.textContent = String(byTag.post ?? 0)
if (unseen[0]) toast(unseen[0].title, unseen[0].text)
```

### inputs

| Field | Type | Meaning |
|---|---|---|
| `inputs` | `Record<string, `[`InputView`](#inputview)`>` | The [inputs](/reference/inputs) on offer now — those whose `when` holds — by id, each with the value its variable holds. |

### plugins

| Field | Type | Meaning |
|---|---|---|
| `plugins` | `Record<string, unknown>` | What each [plugin](/reference/plugins#the-view) gives the UI, by plugin id. A plugin without a `view` has no entry. |

The engine does not look inside a slice, so give it its type where you read it. A plugin package exports the type:

```ts
import type { QuestsView } from '@ifloom/plugin-quests'

const journal = screen.plugins.quests as QuestsView
badge.textContent = String(journal.updates)
```

Buttons for a plugin's commands are ordinary [actions](/reference/game#actiondef) carrying `{ type: 'custom', name }`. They are greyed out with the plugin's `whyNot` line, like any other. A plugin can offer them itself, while no scene is open, with [`buttons`](/reference/plugins#buttons).

## RenderedChoice

```ts
type RenderedChoice = {
  id: string
  label: string
  price?: Price
  disabled?: string
  tags?: string[]
  irreversible?: string
  warning?: string
  command: Command
}
```

Every pressable thing in a `View`: scene choices, game and plugin buttons, the talk button. Send `command` when it is pressed.

- `disabled` — the reason it can't be pressed. Show it.
- `warning` — the button can be pressed, but the reducer will refuse it with this line: a plugin [guard](/reference/plugins#guards)'s soft refusal, such as the [calendar](/plugins/calendar#the-guard)'s `That would run past dawn.` Show it and offer something else. Set on game and plugin buttons, scene choices and talk buttons, from [`warningOf`](/reference/actions#warningof) (the places plugin's exits carry one too, as [`ExitView.warning`](/plugins/places#exitview)). The engine sets no warnings of its own.
- `irreversible` — a warning to show before sending; the [base UI](/ui/components#choicebutton) prints it on the button.
- `tags` — a scene choice's [`tags`](/reference/scenes#scenechoice), passed through: words to style or filter it by. The engine gives them no meaning. Other buttons have none.

## renderAction

```ts
function renderAction(state: GameState, game: Game, action: ActionDef): RenderedChoice
```

Turns an [action](/reference/game#actiondef) into a button, exactly as the view does for the idle screen's buttons: its `label`; a `price` from the activity's `cost` if the action sends `{ type: 'activity' }`, with any notes [plugins' prices](/reference/plugins#prices) give for the command's effects; `disabled` from the first `blocked` entry that holds, or else [`whyNot`](/reference/actions#whynot) for its command; and `warning` from [`warningOf`](/reference/actions#warningof). For a [plugin](/reference/plugins) that shows actions somewhere other than a room — an app on a device, a notice board.

```ts
// A "go to the market" button in a map app, pressed from the house (go from '@ifloom/plugin-places'):
const button = renderAction(state, game, { id: 'market', label: 'Go to the market', command: go('market') })
button.disabled  // 'You cannot get there from here.'
```

**Gotcha.** It does not test the action's `when`. Leave out the actions whose `when` does not hold before rendering them, as the view does.

## StatView

```ts
type StatView = {
  key: StatKey
  label: string
  value: number
  max: number
  text: string
}
```

One stat as the UI shows it. `max` is [`statMax`](/reference/stats#statmax) right now — a ceiling that names a custom value is already worked out. `text` is the value through the stat's [`format`](/reference/stats#formatstat): `'12c'`.

```ts
const { energy } = view(state, game).statsById
drawGauge(energy.value / energy.max, energy.label)
```

**Gotcha:** `statsById` ignores `visible`. A UI that draws a stat from it decides for itself when to show it.

## Price

```ts
type Price = {
  stats?: { id: string; amount: number; text: string }[]
  notes?: string[] // what plugins say it costs: '2 dishes to wash', 'until evening'
}
```

What pressing a button will **cost**, to show on it beforehand. Each entry in `stats` is a stat spent, its amount, and the amount written through the stat's `format` (`'3c'`). For an activity, from its `cost`, in the order the cost lists them; for a scene choice, from its effects — negative `stat` effects on the player's [spendable](/reference/stats#statdef) stats, in declaration order. A `stat` effect with `of`, on an [entity](/reference/entities)'s stat, is never part of it. Only amounts above zero are set. `notes` are every plugin's [price](/reference/plugins#prices) for the button's effects, in the order `game.plugins` lists them — time passing is the [calendar](/plugins/calendar#price-notes)'s note, `until evening`; a button with notes and no cost has a price of only `{ notes }`. No cost and no notes, no `price`. See [`Price`](/reference/actions#price) on the actions page.

**Gotcha:** only costs. What a choice *pays* is deliberately left off, because a payout printed on a button tells the player which button is the right one.

## CollectionView

```ts
type CollectionView = {
  name: string
  entries: {
    id: string
    title: string
    text: string
    image: string | null
    data: Record<string, FlagValue>
    turn: number
  }[]
}
```

A [collection](/reference/collections) as the UI draws it. `name` is the declared name. Each entry's `text` is its prose filled in for this save, and `''` if it has none; `title` is `''` if left out, `data` `{}`. `turn` is the [turn](/reference/state#turn) the entry was collected in, counted from 0.

## EntitiesView and EntityView

```ts
type EntitiesView = {
  label: string
  plural: string
  entries: EntityView[]
}

type EntityView = {
  id: string
  ref: string
  name: string
  stats: StatView[]
  flags: Record<string, FlagValue>
}
```

A [kind](/reference/entities#kinddef) of entity as the UI draws it: its `label`, its `plural` (the `label` if the kind declares none), and an entry for each entity of it, in the order they came.

| `EntityView` field | What it holds |
|---|---|
| `id` | Its id within the kind: `'ana'`, `'#1'`. |
| `ref` | How content names it, `'staff:ana'`: what an effect's `of` or a [`{ entity }`](/reference/conditions#entity) condition takes. |
| `name` | Its name. |
| `stats` | Its kind's `listed` stats whose `visible` holds with `'$'` bound to it, in the order the game declared them, as [`StatView`](#statview)s with its own values. |
| `flags` | Its variables, as the state holds them. |

**Gotcha.** Each entity's `stats` is decided on its own, so two entries of one kind can show different stats. The [base UI](/ui/components#entitytable)'s table makes a column of every stat any row shows and leaves the others' cells blank.

## NoticesView and NoticeView

```ts
type NoticesView = {
  unseen: NoticeView[]
  byTag: Record<string, number>
}

type NoticeView = {
  id: string
  title: string
  text: string
  image: string | null
  tag: string | null
  turn: number
}
```

`unseen` is every notice not yet [dismissed](/reference/commands#dismiss), **newest first**, with `text` filled in from prose (`''` if it has none), and `turn` the [turn](/reference/state#turn) it was raised in, counted from 0. `byTag` counts them by `tag`; untagged notices count under `''`, and a tag with none unseen has no key. Seen notices are not in the view; they stay in [`state.notices`](/reference/state#notices) until they roll off.

## InputView

```ts
type InputView = {
  id: string
  label: string
  kind: 'text' | 'number' | 'choice'
  maxLength: number | null
  min: number | null
  max: number | null
  options: { value: FlagValue; label: string }[]
  value: FlagValue | null
}
```

An [input](/reference/inputs) as the UI draws a field for it. `maxLength` is set for text inputs only (40 if the input does not say); `min` and `max` are `null` when not declared; `options` is `[]` for anything but a choice. `value` is what the variable holds now, `null` if it holds nothing yet. Send what the player enters as `{ type: 'input', id, value }`.

## SpeakerView

```ts
type SpeakerView = {
  id: string
  name: string
  hue: number | null
  portrait: string | null
}
```

Who is speaking in a scene, at `view.scene.speaker`. The id is the scene view's `speaker`, else the scene's `speaker`; never guessed from the scene's id. The first [plugin](/reference/plugins#speakers) whose `speaker` knows the id says who it is: the [cast](/plugins/cast#speakers) answers for its characters. An id no plugin knows gives `null`, so a game with no such plugin has no speaker shown, whatever its scenes name.

| Field | What it is |
|---|---|
| `id` | The speaker id, as the scene named it. |
| `name` | What the player reads over their lines. |
| `hue` | A colour for their lines, as a hue from 0 to 360; `null` when the plugin gives none, and the UI picks its own. |
| `portrait` | Their picture; `null` for none, and the UI draws no face. The cast always gives one: the character's `portrait`, or `art/character/<id>.jpg`. |

Exported from `@ifloom/engine` alongside [`Plugin`](/reference/plugins#plugin), which returns it from `speaker`.
