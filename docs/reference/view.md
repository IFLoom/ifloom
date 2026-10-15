# The view

The engine has no UI of its own. It hands your UI one object, a `View`, that says everything there is to draw, and takes back [commands](/reference/commands). A UI's loop is:

1. `const screen = view(state, game)`
2. Draw `screen`.
3. When the player presses something, send the `command` on it: `state = apply(state, game, command).state`.
4. Go to 1.

Every button in a `View` already carries its command and its price. If it can't be pressed, it also carries the reason, worded for the player. The reducer refuses with the same reasons, so the screen and the rules can't disagree. Show greyed-out buttons with their reason rather than hiding them.

Any framework can draw from the view, or none at all. [The React UI](/react/), `@ifloom/react`, is a ready-made one that draws all of this. To use something else, such as Vue, Svelte or plain DOM, see [Using another framework](/guide/frameworks). Read on if you want to write your own UI.

```ts
import { renderAction, view, type View } from '@ifloom/engine'
```

## view

```ts
function view(state: GameState, game: Game): View
```

Builds the whole `View` from the state in one pass. It's pure, and cheap enough to call after every command.

```ts
import { view } from '@ifloom/engine'

const screen = view(state, game)
header.textContent = screen.when ?? screen.title   // 'Day 1 · Monday morning · High Street' with the calendar and places
for (const action of screen.actions) addButton(action.label, action.disabled, action.command)
```

## View

`View` has a fixed set of fields, plus [`plugins`](#plugins), where each plugin adds its own slice. What the player wears, for example, is the [wardrobe plugin](/plugins/wardrobe)'s slice. The engine has no phone of its own, but it has the parts one is built from: [collections](#collections), [notices](#notices) and [inputs](#inputs). [Messages](/plugins/messages), [feeds](/plugins/feed) and [devices](/plugins/devices) are plugins, each with its own slice, and the [phone bundle](/plugins/phone) wires them together.

### The clock and the player

| Field | Type | Meaning |
|---|---|---|
| `title` | `string` | The game's `title`. |
| `phase` | `string` | The stretch of the game the player is in. |
| `turn` | `number` | How many [turns](/reference/state#turn) have passed. It's `0` on the first turn, not one-based. |
| `when` | `string \| null` | When and where the game is, in plugins' words. It's every plugin's [`label`](/reference/plugins#labels), in the order `game.plugins` lists them, joined with ` · `, such as `'Day 3 · Wednesday morning · The Corner Café'` from the [calendar](/plugins/calendar#the-label) and then the [places plugin](/plugins/places#the-label). `null` when no plugin gives one. |

The engine keeps no time of day, so the view has no day or period of its own. In a game with the [calendar plugin](/plugins/calendar), the day, weekday, period and whether it's time for bed are at `view.plugins.calendar`, a [`CalendarView`](/plugins/calendar#calendarview), and its words are in `when`.

The view has no player name, because the engine doesn't keep one. A game that asks for a name keeps it in a variable. Read it from `state.flags.playerName`, or print it in prose with <code v-pre>{{playerName}}</code>.

### The idle screen

While no scene is open, the screen is the idle screen. It shows the [stage](#the-scene) in `scene`, and the buttons here.

| Field | Type | Meaning |
|---|---|---|
| `actions` | [`RenderedChoice[]`](#renderedchoice) | What the player can do. |

`actions` is empty while a scene is open, or while a [lock](/reference/locks) that stops everything is on. Then the player can only move through the scene.

Otherwise `actions` is every plugin's [`buttons`](/reference/plugins#buttons), in the order `game.plugins` lists them, then the game's own [`actions`](/reference/game#game). A button is left out while its `when` doesn't hold, or while a [lock](/reference/locks) with `hide: true` stops its command. All of them are drawn alike, with [`renderAction`](#renderaction). The engine adds none of its own, so the showcase declares its Wait a while button in `game.actions`.

The engine keeps no places, so the view has no location or exits of its own. With the [places plugin](/plugins/places), the room is at `view.plugins.places`, a [`PlacesView`](/plugins/places#placesview), with its `location` and its `exits`. Each exit is an [`ExitView`](/plugins/places#exitview) carrying the command that takes it. The room's own actions are the plugin's buttons, so they come first in `actions`. Its name is in `when`, and its description is the stage.

```ts
import type { PlacesView } from '@ifloom/plugin-places'

const room = screen.plugins.places as PlacesView | undefined
for (const exit of room?.exits ?? []) addButton(exit.name, exit.disabled, exit.command)
```

The engine keeps no characters either, so the view has no people of its own. With the [cast plugin](/plugins/cast), who's in the room is at `view.plugins.cast`, a [`CastView`](/plugins/cast#castview). Each of its `present` is a [`PersonView`](/plugins/cast#personview) with a Talk button in its `actions`. Like the view's `actions`, these are empty while a scene is open or a lock stops everything.

```ts
import type { CastView } from '@ifloom/plugin-cast'

const people = (screen.plugins.cast as CastView | undefined)?.present ?? []
for (const person of people) for (const talk of person.actions) addButton(`${person.name}: ${talk.label}`, talk.disabled, talk.command)
```

### The scene

`scene` is what fills the main panel. With a scene open, it's that scene's render. Without one, it's the stage: `id: null`, frame `'stage'`, no choices, and a title and body from the first plugin whose [`stage`](/reference/plugins#stage) answers. The stage's `body` blocks go through the same [renderer](/reference/scenes#renderscene) as a data scene, with the game's prose. The [places plugin](/plugins/places#the-stage)'s stage is the room the player is in, with its name as the title. With no plugin answering, the title is the game's `title` and the body is empty.

| Field | Type | Meaning |
|---|---|---|
| `id` | `string \| null` | The scene, or `null` for the stage. |
| `title` | `string` | The title in the scene's rendered [`SceneView`](/reference/scenes#sceneview), else the scene's own, else the title of a plugin's [stage](/reference/plugins#stage) (the room's name, with the places plugin), else the game's `title`. |
| `body` | `string` | The raw prose, with its markup. In-place `{ media }` blocks are in it as markup, and `@pool` markup is already resolved to files. |
| `beats` | [`SceneBeat[]`](/reference/prose#scenebeat) | The prose parsed, with the scene's pictures and videos in place and pool markup resolved to files. Draw these, not `body`. |
| `frame` | `'stage' \| 'talk'` | The layout. It's the render's `frame`, else the scene's, else `talk` when there's a speaker and `stage` when there isn't. The screen with no scene open is `stage`. |
| `tags` | `string[]` | The render's `tags`, else the scene's, else `[]`. The engine gives them no meaning, so style the scene by them. The stage has none. |
| `panel` | `string \| null` | A bespoke panel to draw instead of the choice list. |
| `panelData` | `unknown` | What that panel needs. Opaque to the engine. |
| `speaker` | [`SpeakerView`](#speakerview) ` \| null` | Who's talking. The id is the render's `speaker`, else the scene's, and the first plugin whose [`speaker`](/reference/plugins#speakers) knows it says who it is (the [cast](/plugins/cast#speakers) does for its characters). `null` otherwise. Never guessed from the scene's id. |
| `stageImage` | `string \| null` | The big picture: the render's `portrait`, else the speaker's portrait, else `null`. |
| `stage` | [`StageView`](/reference/media#stageview) ` \| null` | The scene's [layered picture and hotspots](/reference/scenes#the-stage), resolved by [`stageView`](#stageview). `null` when the scene has none, and on the idle screen (a place's stage is in its [plugin view](/plugins/places#placesview)). |
| `choices` | [`RenderedChoice[]`](#renderedchoice) | The visible choices. Hidden ones (`visible: false`) are left out, and disabled ones stay. |

If `state.sceneId` names a scene the game doesn't have, the scene reads "The moment has passed." under the stage's title (else the game's), with one choice, Look around, which sends `leave`. Both lines are in the [strings table](/reference/strings#buttons-and-labels), as `momentPassed` and `lookAround`.

`inScene` (`boolean`) is `true` whenever a scene is open.

### The player's numbers and things

| Field | Type | Meaning |
|---|---|---|
| `stats` | [`StatView[]`](#statview) | The player's [declared stats](/reference/stats) that are `listed` and whose `visible` condition holds, in declaration order. A stat declared `of` a kind belongs to an entity, and is in [`entities`](#entities) instead. |
| `statsById` | `Record<string, `[`StatView`](#statview)`>` | Every one of the player's declared stats, by id, listed or not and visible or not. Read a purse or a gauge your UI draws its own way from here, such as `screen.statsById.coins.text`. |
| `pack` | `{ id, name, desc, count, useLabel? }[]` | Items the player is carrying (count above 0), in the order the game declares them. A `useLabel` means the item can be used with the `use` command. |

`View.pack` is the player's inventory. It shares a name with the loader's [`Pack`](/reference/loader#pack) type, a bundle of content, but the two are unrelated.

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
| `inputs` | `Record<string, `[`InputView`](#inputview)`>` | The [inputs](/reference/inputs) on offer now (those whose `when` holds), by id, each with the value its variable holds. |

### settings

| Field | Type | Meaning |
|---|---|---|
| `settings` | [`SettingView`](#settingview)`[]` | Every [setting](/reference/settings) the game declares, in order, `play` and `ui` alike. Empty when it declares none. |

That's enough to draw a whole settings screen from the view. See [`SettingView`](#settingview) for where each value comes from.

### audio

| Field | Type | Meaning |
|---|---|---|
| `audio` | [`AudioView`](/reference/audio#audioview) | What should be playing on each [channel](/reference/audio#channels), and the one-shot sounds that are due. Empty (`{ channels: {}, cues: [], muteSetting: null }`) when the game has no `audio`. |

Each background channel has already been chosen by priority: the open scene, then an effect, then a plugin such as the place, then the game's default. Each cue has a key that stays the same across view calls and reloads, so a player plays it once:

```ts
const { channels, cues, muteSetting } = screen.audio
channels.ambience.src      // 'audio/cafe-murmur.ogg' at the café
channels.music.volumeSetting  // 'musicVolume': read its value from the profile
cues.map((cue) => cue.key) // ['scene:1234:3:1:knock']
```

The engine never reads the [profile](/reference/profile), so the view gives the setting ids (`volumeSetting` on each channel, and `muteSetting`) and the player reads their values. [`@ifloom/audio`](/reference/audio-player) does all of this. See [Audio](/reference/audio).

### plugins

| Field | Type | Meaning |
|---|---|---|
| `plugins` | `Record<string, unknown>` | What each [plugin](/reference/plugins#the-view) gives the UI, by plugin id. A plugin without a `view` has no entry. |

The engine doesn't look inside a slice, so give it its type where you read it. A plugin package exports the type:

```ts
import type { QuestsView } from '@ifloom/plugin-quests'

const journal = screen.plugins.quests as QuestsView
badge.textContent = String(journal.updates)
```

Buttons for a plugin's commands are ordinary [actions](/reference/actions#actiondef) carrying `{ type: 'custom', name }`. They're greyed out with the plugin's `whyNot` line, like any other. A plugin can offer them itself while no scene is open, with [`buttons`](/reference/plugins#buttons).

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

Every pressable thing in a `View`: scene choices, the game's and plugins' buttons, and the cast's Talk buttons. Send `command` when it's pressed.

- **`disabled`** is the reason it can't be pressed. Show it.
- **`warning`** means the button can be pressed, but the reducer will refuse it with this line. It's a plugin [guard](/reference/plugins#guards)'s soft refusal, such as the [calendar](/plugins/calendar#the-guard)'s `That would run past dawn.` Show it and offer something else. It comes from [`warningOf`](/reference/actions#warningof), on buttons and scene choices alike. The places plugin's exits carry one too, as [`ExitView.warning`](/plugins/places#exitview). The engine sets no warnings of its own.
- **`irreversible`** is a warning to show before sending. The [React UI](/react/components#choicebutton) prints it on the button.
- **`tags`** are a scene choice's [`tags`](/reference/scenes#scenechoice), passed through as words to style or filter it by. The engine gives them no meaning, and other buttons have none.
- **`price`** is what pressing it will cost. See [Price](#price).

## renderAction

```ts
function renderAction(state: GameState, game: Game, action: ActionDef): RenderedChoice
```

Turns an [action](/reference/actions#actiondef) into a button, exactly as the view does for the idle screen's buttons. Use it in a [plugin](/reference/plugins) that shows actions somewhere other than a room, such as an app on a device or a notice board. The button gets:

- its `label`;
- a `price` from the activity's `cost`, if the action sends `{ type: 'activity' }`, plus any notes [plugins' prices](/reference/plugins#prices) give for the command's effects;
- `disabled` from the first `blocked` entry that holds, or else [`whyNot`](/reference/actions#whynot) for its command;
- `warning` from [`warningOf`](/reference/actions#warningof).

```ts
import { renderAction } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'

// A "go to the café" button in a map app, pressed from the flat:
const button = renderAction(state, game, { id: 'cafe', label: 'Go to the café', command: go('cafe') })
button.disabled  // 'You cannot get there from here.'
```

**Gotcha.** It doesn't test the action's `when`. Leave out the actions whose `when` doesn't hold before rendering them, as the view does.

## stageView

```ts
import { stageView } from '@ifloom/engine'

function stageView(
  state: GameState,
  game: Game,
  stage: MediaStage | undefined,
  owner: string,
  choices?: readonly RenderedChoice[] | null,
): StageView | null
```

Resolves a [stage](/reference/scenes#the-stage) into what a UI draws, as the view does for `view.scene.stage`. Use it in a plugin that has a stage of its own, as the [places plugin](/plugins/places#placesview) does for a room.

- **Layers** whose `when` fails are left out. A pool layer gets its file from the [pool pick](/reference/media#pools) for `owner` and the slot `stage:<index>`, and one whose pool has nothing is left out too.
- **A `choice` hotspot** takes the command, `disabled` and `warning` of the choice with that id in `choices`, and is left out when there's no such choice. Pass the scene's rendered choices. With none (`null`, the default), every choice hotspot is left out.
- **A `command` hotspot** is a button made by [`renderAction`](#renderaction). It's left out while a lock with `hide: true` stops its command.
- **Any hotspot** is left out while its `when` fails or its `layer` isn't shown.

It returns `null` when `stage` is undefined.

```ts
import { stageView } from '@ifloom/engine'

// The café's stage, as the places plugin draws it:
const stage = stageView(state, game, cafe.stage, 'cafe')
stage?.hotspots.find((hotspot) => hotspot.id === 'door')?.disabled  // 'Staff only.'
```

**Gotcha.** It only reads picks. The reducer records them after each command (see [Media](/reference/media#pools)), so calling it is pure.

## StatView

```ts
type StatView = {
  key: StatKey
  label: string
  value: number
  max: number
  text: string
  level?: { level: number; next: number | null; progress: number }
}
```

One stat as the UI shows it. `value` is [`statValue`](/reference/stats#statvalue), so a [derived stat](/reference/stats#derived-stats) is already worked out, and a stat the save doesn't have yet shows its `start`. `max` is [`statMax`](/reference/stats#statmax) right now, so a ceiling that names a custom value is already worked out. `text` is the value through the stat's [`format`](/reference/stats#formatstat), such as `'12 coins'`.

`level` is only there for a stat that declares [`levels`](/reference/stats#levels). It's what [`statLevel`](/reference/stats#statlevel) gives:

| Field | What it is |
|---|---|
| `level` | The level the stat is at, from 0. |
| `next` | The value the next level starts at, or `null` at the top level. |
| `progress` | How far the value is from this level's start to `next`, from 0 to 1. It's 1 at the top level. Level 0 starts at the stat's `min`. |

```ts
// levels: { at: [10, 30, 60] }, cooking at 20
view(state, game).statsById.cooking.level // { level: 1, next: 30, progress: 0.5 }
```

An entity's stats in [`entities`](#entities) get `level` the same way, worked out for that entity.

```ts
const { energy } = view(state, game).statsById
drawGauge(energy.value / energy.max, energy.label)
```

**Gotcha:** `statsById` ignores `visible`, so a UI that draws a stat from it decides for itself when to show it.

## Price

```ts
type Price = {
  stats?: { id: string; amount: number; text: string }[]
  notes?: string[] // what plugins say it costs: '2 dishes to wash', 'until evening'
}
```

What pressing a button will cost, to show on it beforehand. A `price` sits on any [`RenderedChoice`](#renderedchoice).

Each entry in `stats` is a stat spent, its amount, and the amount written through the stat's `format`, such as `'3 coins'`. Only amounts above zero are listed.

- For an activity, the stats come from its `cost`, in the order the cost lists them.
- For a scene choice, they come from its effects. Each negative `stat` effect on one of the player's [spendable](/reference/stats#statdef) stats counts, in declaration order. A `stat` effect with `of`, on an [entity](/reference/entities)'s stat, never does.

`notes` are every plugin's [price](/reference/plugins#prices) for the button's effects, in the order `game.plugins` lists them. Time passing, for example, is the [calendar](/plugins/calendar#price-notes)'s note `until evening`. A button with notes and no cost has a price of only `{ notes }`, and a button with neither has no `price`.

**Gotcha:** it only shows costs. What a choice pays is deliberately left off, because a payout printed on a button tells the player which button is the right one.

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

A [collection](/reference/collections) as the UI draws it. `name` is the declared name. Each entry's `text` is its prose filled in for this save, or `''` if it has none. `title` is `''` and `data` is `{}` if left out. `turn` is the [turn](/reference/state#turn) the entry was collected in, counted from 0.

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

A [kind](/reference/entities#kinddef) of entity as the UI draws it. It has the kind's `label`, its `plural` (the `label` if the kind declares none), and an entry for each entity of that kind, in the order they came.

| `EntityView` field | What it holds |
|---|---|
| `id` | Its id within the kind: `'ana'`, `'#1'`. |
| `ref` | How content names it, such as `'staff:ana'`. It's what an effect's `of` or an [`{ entity }`](/reference/conditions#entity) condition takes. |
| `name` | Its name. |
| `stats` | Its kind's `listed` stats whose `visible` holds with `'$'` bound to it, in the order the game declared them, as [`StatView`](#statview)s with its own values. |
| `flags` | Its variables, as the state holds them. |

**Gotcha.** Each entity's `stats` is decided on its own, so two entries of one kind can show different stats. The [React UI](/react/components#entitytable)'s table makes a column for every stat any row shows, and leaves the other rows' cells blank.

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

`unseen` is every notice not yet [dismissed](/reference/commands#dismiss), newest first. Each has its `text` filled in from prose (`''` if it has none), and `turn` is the [turn](/reference/state#turn) it was raised in, counted from 0. `byTag` counts them by `tag`. Untagged notices count under `''`, and a tag with none unseen has no key. Seen notices aren't in the view, but they stay in [`state.notices`](/reference/state#notices) until they roll off.

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

An [input](/reference/inputs) as the UI draws a field for it. `maxLength` is only set for text inputs, and is 40 if the input doesn't say. `min` and `max` are `null` when not declared. `options` is `[]` for anything but a choice. `value` is what the variable holds now, or `null` if it holds nothing yet. Send what the player enters as `{ type: 'input', id, value }`.

## SettingView

```ts
type SettingView = {
  id: string
  label: string
  kind: 'toggle' | 'choice' | 'range'
  affects: 'play' | 'ui'
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  default: FlagValue
  value: FlagValue | null
}
```

A [setting](/reference/settings) as a settings screen draws it. `options` is only there for a choice, and `min`, `max` and `step` only for a range (`step` only if declared). `affects` is `'play'` when the declaration leaves it out.

`value` is the setting's value in this game for a `play` setting, from [`state.settings`](/reference/state#settings). For a `ui` setting it's `null`, because a `ui` setting isn't in the state. Read it from the [profile](/reference/profile) instead, falling back to `default`:

```ts
const stored = (await runner.profile?.get<Record<string, FlagValue>>('settings')) ?? {}
for (const setting of runner.view().settings) {
  const value = setting.value ?? stored[setting.id] ?? setting.default
  drawSetting(setting, value)
}
```

Send a change to a `play` setting as the [`setting`](/reference/commands#setting) command, and a change to a `ui` setting through [`runner.setUiSetting`](/reference/runner#setuisetting).

## SpeakerView

```ts
type SpeakerView = {
  id: string
  name: string
  hue: number | null
  portrait: string | null
}
```

Who's speaking in a scene, at `view.scene.speaker`. The id is the render's `speaker`, else the scene's `speaker`. It's never guessed from the scene's id. The first [plugin](/reference/plugins#speakers) whose `speaker` knows the id says who it is, and the [cast](/plugins/cast#speakers) answers for its characters. An id no plugin knows gives `null`, so a game with no such plugin shows no speaker, whatever its scenes name.

| Field | What it is |
|---|---|
| `id` | The speaker id, as the scene named it. |
| `name` | What the player reads over their lines. |
| `hue` | A colour for their lines, as a hue from 0 to 360. `null` when the plugin gives none, and the UI picks its own. |
| `portrait` | Their picture. `null` for none, and the UI draws no face. The cast always gives one: the character's `portrait`, or `art/character/<id>.jpg`. |

Exported from `@ifloom/engine` alongside [`Plugin`](/reference/plugins#plugin), which returns it from `speaker`.
