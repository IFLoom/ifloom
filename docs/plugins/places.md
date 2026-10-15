# Places

`@ifloom/plugin-places` gives a game a map. You declare locations with exits between them and things to do in each, and the plugin keeps track of where the player is and lets them walk from one place to the next.

You'd want it for any game where the player moves around a world: a town in a life sim, the rooms of a house in a mystery, the floors of a shop in a management game. A linear novel that moves from scene to scene doesn't need it.

The plugin keeps the player's location in its own state, `{ at }`. While no scene is open, it fills the screen with the room's description, offers the room's actions as buttons, and hands the UI the exits. Locations are content, in a pack's `data.places.locations`, so a mod can add a room or change one.

Here's where each place-related part of a game comes from:

- **The map** is a list of [`LocationDef`](#locationdef)s, each naming its `exits`.
- **Walking** is the [`go()`](#commands) command, which the view hands the UI on each [exit](#exitview).
- **Being somewhere at once** (a lift home, or a scene that ends across town) is the [`moveTo()`](#effects) effect.
- **Opening hours** are a location's `locked` entries, written with the [calendar](/plugins/calendar)'s conditions. See [Opening hours](#opening-hours).
- **"Only in the café"** is the [`at()`](#conditions) condition, or [`onlyAt()`](#helpers) as an activity's requirement.
- **The header** is the plugin's [label](#the-label), at `view.when`.

```ts
import {
  places, go, at, within, moveTo, onlyAt, where, locationsOf, locationById,
  type PlacesOptions, type PlacesState, type PlacesView, type ExitView,
  type LocationDef, type LocationKind,
} from '@ifloom/plugin-places'
```

The [cast](/plugins/cast) plugin finds out who's in the room by asking this plugin's [`places/here`](#queries) query. So a character's `home` and `schedule` locations name this plugin's place ids, and in a game without places nobody is ever in the room (see [Where people are](/plugins/cast#where-people-are)).

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-places": "0.0.0"
  }
}
```

Then add `places(...)` to the game's `plugins`. [Adding one](/plugins/#adding-one) has the details.

List it after the calendar. Plugins' [labels](/reference/plugins#labels) are joined in the order `game.plugins` lists them, so with the calendar first the header reads `Day 1 · Monday morning · High Street`.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

const plugins = [calendar(), places({ start: 'flat' })]
```

## places

```ts
function places(options?: PlacesOptions): DefinedPlugin<PlacesState>
```

Builds the plugin, with the id `places`. Call it once, when you build the game. With no options, a new game starts nowhere.

```ts
import { loadGame, startingState, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

declare const town: Pack

const map = places({ start: 'flat' })
const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), map] })

map.read(startingState(game), game)   // { at: 'flat' }
```

`read` and `write` come from [`definePlugin`](/reference/plugins#defineplugin) and are meant for tests and tools. `map.write(state, { at: 'park' })` puts the player somewhere without a command.

### PlacesOptions

```ts
type PlacesOptions = {
  start?: string
  arrive?: (state: GameState, game: Game) => GameState
}
```

| Field | What it is | If left out |
|---|---|---|
| `start` | The id of the place a new game starts in. | Nowhere: `{ at: null }`. Nothing is drawn but the game's title and its buttons, and `places/go` is refused until a [`places/move`](#effects) puts the player somewhere. |
| `arrive` | What happens on the doorstep, such as someone catching you on the way in. It's called with the state just after the player walks in, and returns the state to keep. It runs after travel by exit ([`places/go`](#commands)) only, not after a `places/move`. | Nothing happens. |

```ts
import { places, where } from '@ifloom/plugin-places'

places({
  start: 'flat',
  // The first time into the park, note it.
  arrive: (state) => where(state) === 'park' && !state.flags.sawPark
    ? { ...state, flags: { ...state.flags, sawPark: true } }
    : state,
})
```

The options are code, not content, so a mod can't change them.

## Locations

### LocationDef

```ts
type LocationDef = {
  id: string
  name: string
  tag: string
  kind: LocationKind
  parent?: string
  exits: readonly string[]
  art: string
  locked?: { when: Condition; reason: string; hide?: boolean }[]
  body: Block[]
  actions?: ActionDef[]
  audio?: Record<string, string | null>
}
```

| Field | What it is |
|---|---|
| `id` | What content names the place by, as in `go('cafe')` or `at('cafe')`. Unique among the places. |
| `name` | Shown on the exit, as the screen's title while the player is here, and in the [label](#the-label). |
| `tag` | A word or two under the name, such as `Home` or `Café`. |
| `kind` | A [`LocationKind`](#locationkind). |
| `parent` | The place it's inside, such as a room's building. [`places/within`](#conditions) follows it. |
| `exits` | The places one step away. Exits are one-way, so list the way back on the other place too. |
| `art` | The background image, passed through to the view. |
| `locked` | Walking in here is refused while one of these [conditions](/reference/conditions) holds. The first that holds gives the `reason`, which is both the refusal and the exit's `disabled` text. With `hide: true`, the exit is left off the screen while it holds, instead of greyed out. |
| `body` | What the player reads here while no scene is open. These are [prose blocks](/reference/scenes#block), exactly as in a data scene's body. |
| `actions` | What there is to do here, as [`ActionDef`](/reference/actions#actiondef) buttons. They're drawn before the game's own `actions`. |
| `audio` | What plays on background [audio channels](/reference/audio#channels) while the player is here, by channel, such as `{ ambience: 'cafe.murmur' }`. `null` silences a channel. See [Audio](#audio). |

### LocationKind

```ts
type LocationKind = 'street' | 'venue' | 'room'
```

A label the view passes through to the UI. The plugin treats all three alike.

### In a pack

Locations go in a [pack](/reference/loader#pack)'s `data`, under `places.locations`. This is the [showcase](/guide/showcase)'s map, cut down to what this page needs, in a file `town.ts`:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { period, sleep } from '@ifloom/plugin-calendar'
import { type LocationDef } from '@ifloom/plugin-places'

const locations: LocationDef[] = [
  {
    id: 'flat', name: 'Your flat', tag: 'Home', kind: 'room', exits: ['high-street'], art: 'place/flat',
    body: [{ text: 'place.flat' }],
    actions: [{ id: 'bed', label: 'Go to bed', command: sleep() }],
  },
  {
    id: 'high-street', name: 'High Street', tag: 'Small Town', kind: 'street', exits: ['flat', 'cafe', 'park', 'office'], art: 'place/high-street',
    body: [{ text: 'place.high-street' }],
  },
  {
    id: 'cafe', name: 'The Corner Café', tag: 'Café', kind: 'venue', exits: ['high-street'], art: 'place/cafe',
    locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    body: [{ text: 'place.cafe' }],
    actions: [{ id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } }],
  },
  { id: 'park', name: 'Riverside Park', tag: 'Small Town', kind: 'street', exits: ['high-street'], art: 'place/park', body: [{ text: 'place.park' }] },
  {
    id: 'office', name: 'The Office', tag: 'Work', kind: 'venue', exits: ['high-street'], art: 'place/office',
    body: [{ text: 'place.office' }],
  },
]

export const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  prose: {
    'place.flat': 'Boxes, mostly. The radiator knocks when it feels like it.',
    'place.high-street': 'A bakery, a launderette, a bus stop with a bench nobody sits on.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.park': 'The river is slow and brown and full of ducks with opinions.',
    'place.office': 'Strip lights, a kettle, a stack of forms that never gets shorter.',
  },
  data: { places: { locations } },
}
```

The [loader](/reference/loader#pack) merges locations by id, as it merges scenes. A later pack's location with the same id replaces the earlier one whole, so a mod can add a room or rewrite one. The game's places, merged, are [`locationsOf(game)`](#helpers).

### Rooms inside rooms

Give a place a `parent` when it's inside another, such as a back room inside the café. [`within('cafe')`](#conditions) then holds in either. A `locked` entry with `hide: true` keeps the door off the screen until it's open to the player:

```ts
import { type LocationDef } from '@ifloom/plugin-places'

const backRoom: LocationDef = {
  id: 'cafe.back', name: 'The back room', tag: 'Café', kind: 'room', parent: 'cafe', exits: ['cafe'], art: 'place/cafe-back',
  locked: [{ when: { not: { flag: 'staff' } }, reason: 'Staff only.', hide: true }],
  body: [{ text: 'place.cafe.back' }],
}
```

Add `'cafe.back'` to the café's `exits` too. Until the `staff` variable is set, the café's exits show only the high street.

### Opening hours

The engine has no opening hours of its own, so a place's `locked` list does the job. Each entry is a [condition](/reference/conditions) and the line the player reads while it holds. With the [calendar](/plugins/calendar#conditions), the conditions can read the time of day and the day of the week. This is the showcase's office, open in the day on weekdays only (from `examples/showcase/src/content/town.ts`):

```ts
import { period, weekday } from '@ifloom/plugin-calendar'
import { type LocationDef } from '@ifloom/plugin-places'

const office: LocationDef = {
  id: 'office', name: 'The Office', tag: 'Work', kind: 'venue', exits: ['high-street'], art: 'place/office',
  locked: [
    { when: weekday(5, 6), reason: 'Shut at weekends.' },
    { when: { all: [weekday(4), { not: period('morning', 'afternoon') }] }, reason: 'Closed. Back on Monday.' },
    { when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
  ],
  body: [{ text: 'place.office' }],
}
```

The first entry that holds gives the reason, so put the most particular first. On a Friday evening the player reads `Closed. Back on Monday.`, and on a Tuesday evening `Closed. Opens tomorrow morning.` The exit is greyed out with the same line.

`locked` only stops the player walking in. A player who's already inside when it starts to hold stays there. If they should leave, send them out with a [`moveTo`](#effects) effect from a [trigger](/reference/triggers).

## A worked example

The town above, with the calendar and a coffee to buy in the café. The coffee is only sold in the café, so it uses [`onlyAt`](#helpers) as its requirement.

```ts
import { apply, loadGame, startingState, view, whyNot, type ActivityDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { go, onlyAt, places, where, type PlacesView } from '@ifloom/plugin-places'
import { town } from './town.ts'

const coffee: ActivityDef = {
  id: 'coffee',
  requires: [onlyAt(['cafe'], 'There is no coffee here.')],
  effects: [{ kind: 'flag', key: 'hadCoffee', value: true }],
}

const clock = calendar()
const { game } = loadGame([{ ...town, activities: [coffee] }], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [clock, places({ start: 'flat' })],
})
```

Here's how it plays:

```ts
let state = startingState(game)
where(state)                        // 'flat'
view(state, game).when              // 'Day 1 · Monday morning · Your flat'
view(state, game).scene.title       // 'Your flat'
view(state, game).scene.body        // 'Boxes, mostly. The radiator knocks when it feels like it.'

whyNot(state, game, go('cafe'))     // 'You cannot get there from here.'
state = apply(state, game, go('high-street')).state
whyNot(state, game, { type: 'activity', id: 'coffee' })   // 'There is no coffee here.'
state = apply(state, game, go('cafe')).state
view(state, game).actions.map((a) => a.id)                 // ['coffee']
const room = view(state, game).plugins.places as PlacesView
room.exits.map((e) => e.id)                                // ['high-street']

const evening = clock.write(apply(state, game, go('high-street')).state, { day: 0, period: 'evening' })
whyNot(evening, game, go('cafe'))   // 'Closed. Opens tomorrow morning.'
```

A UI reads the room at [`view.plugins.places`](#the-view), the description at `view.scene`, the room's buttons at `view.actions`, and the label at `view.when`.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'places/go', with: { to: 'cafe' } }` | `go('cafe')` | Walks through an exit to that place, then runs the [`arrive`](#placesoptions) option. |

`places/go` is refused, in this order, with:

1. `Finish this first.` (the engine's [`finishFirst`](/reference/strings#refusals)) while a scene is open.
2. `There is no such place.` ([`places/noSuchPlace`](#strings)) when the game has no place with that id.
3. `You are already here.` ([`places/alreadyHere`](#strings)) when the player is there already.
4. The `reason` of the destination's first `locked` entry whose `when` holds.
5. `You cannot get there from here.` ([`places/cannotGetThere`](#strings)) when the destination isn't one of this place's `exits`, or the player is nowhere.

Because `locked` is asked before the exits, a closed café says it's closed even from across town.

A [lock](/reference/locks#lock) names the command `places/go`, or `places/*`, and stops every journey. To stop some journeys and not others, use the destination's `locked`.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'places/move': 'cafe' }` | `moveTo('cafe')` | Puts the player there at once, and closes any open scene. |

It works in a data scene choice's effects and an activity's `effects`. In a plain-effect list (an item's use, what `rules.turn` returns, or a plugin's [`effectsOf`](/reference/plugins#saying-what-a-command-does)), write the long form: `{ kind: 'custom', name: 'places/move', with: { value: 'cafe' } }`.

No exit is needed and nothing is refused, so the player can be moved from nowhere, or into a `locked` place. The [`arrive`](#placesoptions) option doesn't run. A place the game doesn't have does nothing: the player stays where they were, and the scene stays open.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'places/at': ['cafe', 'park'] }` | `at('cafe', 'park')` | The player is in one of these places. |
| `{ 'places/within': ['cafe'] }` | `within('cafe')` | The player is in one of these places, or anywhere inside one, following each place's `parent`. |

These are the short forms, with the full name as the only key (see [plugin calls](/reference/custom#plugincall)). The long form of the first row is `{ custom: 'places/at', with: { value: ['cafe', 'park'] } }`. A single place works too, as in `{ 'places/at': 'cafe' }`.

In the café's [back room](#rooms-inside-rooms), `at('cafe.back')` and `within('cafe')` hold, and `at('cafe')` doesn't. Neither holds while the player is nowhere. `within('cafe', 'office')` holds inside either building.

## Queries

These answer other plugins' code, through the context's [`query`](/reference/plugins#queries). Content can't ask them.

| Query | Answers |
|---|---|
| `places/here` | Where the player is: the place's id, or `null`. |
| `places/all` | Every place the game has: [`locationsOf(game)`](#helpers). |
| `places/known` | Whether the game has a place with this id, given as `{ value }` (or `{ id }`): `true` or `false`. |
| `places/exits` | The current place's `exits`, as listed, leaving out any the game doesn't have. Empty when nowhere. |

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

The [cast](/plugins/cast) asks `places/here` to know who's in the room, and `places/known` to check its characters' places when the game loads.

## Values

| Prose writes | Prints |
|---|---|
| <code v-pre>{{v:places/name}}</code> | The current place's `name`, such as `High Street`. Empty when nowhere. |
| <code v-pre>{{v:places/tag}}</code> | The current place's `tag`, such as `Small Town`. Empty when nowhere. |

```ts
const prose = { postcard: 'Greetings from the {{v:places/name}}.' }
// 'Greetings from the High Street.'
```

## The stage, the buttons and the label

### The stage

While no scene is open, the room fills the screen. Its plugin [`stage`](/reference/plugins#stage) has the place's `name` as the title and its `body` as the text. `view.scene` is then `{ title: 'The Corner Café', body: 'Six tables, one of them wobbly.', frame: 'stage', ... }`.

The body is drawn under the place's own id, not the plugin's. A [`variants`](/reference/scenes#block) block rotates per id, so each place keeps its own rotation, and the café's lines don't move on because the high street was drawn.

The first plugin that has a stage fills the screen. While the player is nowhere, places has no stage, and the screen shows the game's title with an empty body.

### The buttons

The room's `actions` are offered as plugin [buttons](/reference/plugins#buttons). They're drawn while no scene is open, before the game's own `actions`, and priced and greyed out exactly like them. In the café of the example, `view.actions` lists the café's `coffee` button first, then the game's buttons.

### The label

The place's `name`, which the view joins into [`view.when`](/reference/view#the-clock-and-the-player) after any plugin listed before it. With the calendar first, that reads `Day 1 · Monday morning · High Street`. There's no label while the player is nowhere.

### Audio

The place the player is at supplies its `audio` through the plugin's [`audio` hook](/reference/plugins#audio). In the showcase, the café has its murmur and the music carries on from the game's default:

```ts
place({ id: 'cafe', name: 'The Corner Café', tag: 'Café', kind: 'venue', exits: ['high-street'], audio: { ambience: 'cafe.murmur' } })
```

Walk back out to the high street and the ambience stops, because the street names none. A place's audio is the third of [four levels](/reference/audio#what-plays-on-a-background-channel). An open scene's `audio` and an [`audio` effect](/reference/effects#audio) both win over it, and it wins over the game's default. A room inside another doesn't take its parent's audio, so give the back room its own if it should sound the same. Nothing plays while the player is nowhere.

## The view

`view(state, game).plugins.places` is a `PlacesView`.

### PlacesView

```ts
type PlacesView = {
  location: { id: string; name: string; tag: string; kind: LocationKind; art: string } | null
  exits: ExitView[]
}
```

| Field | What it is |
|---|---|
| `location` | Where the player is. `null` when nowhere, or when `at` names a place the game no longer has. |
| `exits` | The ways out, in the order the place lists them. Empty while a scene is open, or while a lock stops everything ([`lockedOut`](/reference/locks#lockedout)). |

An exit is left out when:

- its place doesn't exist
- the first [lock](/reference/locks#lock) that stops `places/go` to it has `hide`
- one of its place's `locked` entries with `hide: true` holds

Any other exit is shown, greyed out with its refusal if it can't be taken.

### ExitView

```ts
type ExitView = {
  id: string
  name: string
  tag: string
  kind: LocationKind
  art: string
  disabled?: string
  warning?: string
  command: Command
}
```

| Field | What it is |
|---|---|
| `id`, `name`, `tag`, `kind`, `art` | The destination's, from its [`LocationDef`](#locationdef). |
| `disabled` | Why it can't be taken now: what [`whyNot`](/reference/actions#whynot) says for its command. A closed café's exit reads `Closed. Opens tomorrow morning.` |
| `warning` | Set when the exit can be pressed but a plugin [guard](/reference/plugins#guards) warns against it. The reducer refuses it. |
| `command` | What to send to take it: `go(id)`. |

On a new game in the flat:

```ts
{
  location: { id: 'flat', name: 'Your flat', tag: 'Home', kind: 'room', art: 'place/flat' },
  exits: [{ id: 'high-street', name: 'High Street', tag: 'Small Town', kind: 'street', art: 'place/high-street', command: go('high-street') }],
}
```

## The state

### PlacesState

```ts
type PlacesState = { at: string | null }
```

What the plugin keeps in a save, at `state.plugins.places`: the id of the place the player is in, or `null` for nowhere. A UI reads the view, not this. Code reads it with [`where(state)`](#helpers).

The engine once kept the player's location itself, at `state.locationId`. [`migrate`](/reference/saves#migrate) carries a save from then (save version 5 or older) forward, moving `locationId` to `plugins.places` as `{ version: 1, state: { at } }`. A save that already has a `places` entry keeps it.

## Strings

The plugin's lines go in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key, `places/...`.

| Key | English |
|---|---|
| `places/noSuchPlace` | `There is no such place.` |
| `places/alreadyHere` | `You are already here.` |
| `places/cannotGetThere` | `You cannot get there from here.` |

`places/go` also uses the engine's own [`finishFirst`](/reference/strings#refusals) (`Finish this first.`), so rewording that changes it here too.

[`onlyAt`](#helpers)'s reason is plain text written into the requirement (`Not here.` if left out), not a string a game can override.

## For code

### Helpers

```ts
function locationsOf(game: Game): LocationDef[]
function locationById(game: Game, id: string | null | undefined): LocationDef | undefined
function where(state: GameState): string | null

const go: (to: string) => Command
const at: (...places: string[]) => Condition
const within: (...places: string[]) => Condition
const moveTo: (place: string) => EffectRef
const onlyAt: (places: string[], reason?: string) => Requirement
```

| Helper | Returns |
|---|---|
| `locationsOf` | The game's places: its packs' `data.places.locations`, merged. Empty with none. |
| `locationById` | The place with this id, or `undefined`. `undefined` for `null`. |
| `where` | Where the player is, read straight from the state with no game needed: the place's id, or `null`. |
| `go` | The [`places/go`](#commands) command. |
| `at`, `within` | The [conditions](#conditions). |
| `moveTo` | The [`places/move`](#effects) effect. |
| `onlyAt` | A [requirement](/reference/actions#requirement) for an activity's `requires`: `{ when: at(...places), reason }`. The reason is `Not here.` if left out. |

`locationById` and `locationsOf` read the game's content, so they work on any state. `where` reads the state alone.

## Checks

When the game loads, the plugin reports two kinds of problem.

**Place ids that content names.** Every place named in `places/at`, `places/within`, `places/move` or `places/go` is looked up, wherever content writes it: an activity's requirements and effects, a scene, a lock, a room's actions, or the game's own `actions`. One the game doesn't have is reported where it's named:

```text
town · activity swim · unknown location "lido"
```

**The places themselves.** These are pinned on the pack each place came from, with `where` as `locations <id>`. The `start` option is pinned on `base` as `options start`. The plugin reports:

- A `start` the game doesn't have (`options start`, `unknown location "…"`).
- An exit to a place the game doesn't have (`exit to unknown location "…"`).
- A `parent` the game doesn't have (`inside unknown location "…"`), or one that leads back round to the place (`is inside itself`, on every place in the loop).
- Anything the `body` names that the game doesn't have, such as prose keys, variants or conditions (`no prose for "…"`).
- Anything a `locked` entry's `when` names that the game doesn't have.
- Anything an action's `when`, `blocked` conditions or `command` names that the game doesn't have, prefixed with the action (`action dig: unknown location "moon"`).
- A track or channel in `audio` that the game doesn't have, a cue channel such as `sfx`, or a sound effect's track, prefixed with `audio:` (`audio: unknown track "rain"`). See [Audio](/reference/loader#audio).

```text
base · options start · unknown location "nowhere"
town · locations yard · exit to unknown location "lane"
town · locations yard · is inside itself
town · locations yard · no prose for "place.yard"
town · locations yard · action dig: unknown location "moon"
town · locations cafe · audio: unknown track "rain"
```

## Gotchas

- **`arrive` runs on `places/go` only.** A `places/move` puts the player somewhere with nothing on the doorstep. The engine has no arrival rule or hook of its own, so the `arrive` option is the only doorstep there is.
- **Exits are one-way.** List the way back on the other place.
- **A game that starts nowhere can't walk anywhere.** `places/go` from nowhere is refused with `You cannot get there from here.` A `places/move`, from an intro scene's last choice say, puts the player on the map.
- **`locked` comes before the exits.** A locked place's reason is the refusal even when it isn't one step away.
- **`places/go` lists no effects.** A lock with `effect` doesn't see it, and no plugin puts a price on it.
