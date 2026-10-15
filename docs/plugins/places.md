# Places

`@ifloom/plugin-places` gives a game places: locations with exits between them and things to do in each, walking from one to the next, and where the player is.

The plugin keeps the player's location in its own state, `{ at }`. While no scene is open, it fills the screen with the room's description, offers the room's actions as buttons, and hands the UI the exits. Locations are content, in a pack's `data.places.locations`, so a mod can add a room or change one.

So everything place-shaped in a game is written with it:

- **the map** is a list of [`LocationDef`](#locationdef)s, each naming its `exits`;
- **walking** is its [`go()`](#commands) command, which the view hands the UI on each [exit](#exitview);
- **being somewhere at once** (a lift home, a scene that ends across town) is its [`moveTo()`](#effects) effect;
- **opening hours** are a location's `locked` entries with the [calendar](/plugins/calendar)'s conditions: `locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }]`;
- **"only in the café"** is its [`at()`](#conditions) condition, or [`onlyAt()`](#helpers) as an activity's requirement;
- **the header** is its [label](#the-label), at `view.when`.

```ts
import {
  places, go, at, within, moveTo, onlyAt, where, locationsOf, locationById,
  type PlacesOptions, type PlacesState, type PlacesView, type ExitView,
  type LocationDef, type LocationKind,
} from '@ifloom/plugin-places'
```

The engine core has no places of its own, and no people. The [cast](/plugins/cast) plugin finds out who is in the room by asking this plugin's [`places/here`](#queries): so a character's `home` and `schedule` locations name this plugin's place ids, and in a game without it nobody is ever here (see [Where people are](/plugins/cast#where-people-are)).

## Install

Add the package beside the engine, and add `places(...)` to the game's `plugins`. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-places": "file:../ifloom/packages/plugin-places"
  }
}
```

**List it after the calendar.** Plugins' [labels](/reference/plugins#labels) are joined in the order `game.plugins` lists them, so with the calendar first the header reads `Day 1 · Monday morning · High Street`.

```ts
plugins: [calendar(), places({ start: 'house' })]
```

## places

```ts
function places(options?: PlacesOptions): DefinedPlugin<PlacesState>
```

The plugin, with the id `places`. Call it once, when the game is built. With no options, a new game starts nowhere.

```ts
const town = places({ start: 'house' })

const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), town],
})

town.read(startingState(game), game)   // { at: 'house' }
```

`read` and `write` come from [`definePlugin`](/reference/plugins#defineplugin). They are for tests and tools: `town.write(state, { at: 'market' })` puts the player somewhere without a command.

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
| `arrive` | What happens on the doorstep: called with the state just after the player walked in, and returns the state to keep. Someone catching you on the way in. It runs after travel by exit ([`places/go`](#commands)) only, not after a `places/move`. | Nothing happens. |

```ts
places({
  start: 'house',
  // The first time into the market, note it.
  arrive: (state) => where(state) === 'market' && !state.flags.sawMarket
    ? { ...state, flags: { ...state.flags, sawMarket: true } }
    : state,
})
```

The options are code, not content: a mod cannot change them.

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
}
```

| Field | What it is |
|---|---|
| `id` | What content names the place by: `go('cafe')`, `at('cafe')`. Unique among the places. |
| `name` | Shown on the exit, as the screen's title while the player is here, and in the [label](#the-label). |
| `tag` | A word or two under the name: `Home`, `Café`. |
| `kind` | A [`LocationKind`](#locationkind). |
| `parent` | The place it is inside: a room's building. [`places/within`](#conditions) follows it. |
| `exits` | The places one step away. **One-way**: list the way back on the other place too. |
| `art` | The background image, passed through to the view. |
| `locked` | Walking in here is refused while one of these [conditions](/reference/conditions) holds. The first that holds gives the `reason`: the refusal, and the exit's `disabled` text. With `hide: true`, the exit is left off the screen while it holds, instead of greyed out. |
| `body` | What the player reads here while no scene is open: [prose blocks](/reference/scenes#block), exactly as a data scene's body. |
| `actions` | What there is to do here: [`ActionDef`](/reference/game#actiondef) buttons, drawn before the game's own `actions`. |

### LocationKind

```ts
type LocationKind = 'street' | 'venue' | 'room'
```

A label the view passes through; the plugin treats them all alike.

### In a pack

Locations go in a [pack](/reference/loader#pack)'s `data`, under `places.locations`:

```ts
const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  prose: {
    'place.house': 'Your house. The kettle is still warm.',
    'place.high-street': 'Shops on both sides, and a bus stop.',
    'place.cafe': 'The espresso machine hisses.',
    'place.cafe.kitchen': 'Crates of milk by the back door.',
  },
  data: {
    places: {
      locations: [
        { id: 'house', name: 'House', tag: 'Home', kind: 'room', exits: ['high-street'], art: 'place/house', body: [{ text: 'place.house' }] },
        { id: 'high-street', name: 'High Street', tag: 'Street', kind: 'street', exits: ['house', 'cafe'], art: 'place/high-street', body: [{ text: 'place.high-street' }] },
        {
          id: 'cafe', name: 'Café', tag: 'Café', kind: 'venue', exits: ['high-street', 'cafe.kitchen'], art: 'place/cafe',
          locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
          body: [{ text: 'place.cafe' }],
          actions: [{ id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } }],
        },
        {
          id: 'cafe.kitchen', name: 'Kitchen', tag: 'Café', kind: 'room', parent: 'cafe', exits: ['cafe'], art: 'place/kitchen',
          locked: [{ when: { not: { flag: 'staff' } }, reason: 'Staff only.', hide: true }],
          body: [{ text: 'place.cafe.kitchen' }],
        },
      ],
    },
  },
}
```

The [loader](/reference/loader#pack) merges them by id, as it merges scenes: a later pack's location with the same id replaces the earlier one, whole. So a mod can add a room, or rewrite one. The game's places, merged, are [`locationsOf(game)`](#helpers).

### Opening hours

The engine has no opening hours of its own; a place's `locked` list does the job. Each entry is a [condition](/reference/conditions) and the line the player reads while it holds, and with the [calendar](/plugins/calendar#conditions) the conditions can read the time of day and the day of the week. The showcase's office, open in the day on weekdays only (in `examples/showcase/src/content/town.ts`):

```ts
import { period, weekday } from '@ifloom/plugin-calendar'

{
  id: 'office', name: 'The Office', tag: 'Work', kind: 'venue', exits: ['high-street'], art: 'place/office',
  locked: [
    { when: weekday(5, 6), reason: 'Shut at weekends.' },
    { when: { all: [weekday(4), { not: period('morning', 'afternoon') }] }, reason: 'Closed. Back on Monday.' },
    { when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
  ],
  body: [{ text: 'place.office' }],
}
```

The first entry that holds gives the reason, so put the most particular first: on a Friday evening the player reads `Closed. Back on Monday.`, on a Tuesday evening `Closed. Opens tomorrow morning.`. The exit is greyed out with the same line.

**Gotcha:** `locked` only stops walking *in*. A player already inside when it starts to hold stays there; send them out with a [`moveTo`](#effects) effect from a [trigger](/reference/triggers) if they should leave.

## A worked example

The town above, with the calendar. The café opens in the morning and afternoon, and its kitchen is for staff.

```ts
import { SCHEMA, apply, loadGame, startingState, view, whyNot } from '@ifloom/engine'
import { calendar, period } from '@ifloom/plugin-calendar'
import { go, onlyAt, places, where } from '@ifloom/plugin-places'

const coffee = { id: 'coffee', requires: [onlyAt(['cafe'], 'There is no coffee here.')], effects: [{ kind: 'flag', key: 'coffee', value: true }] }

const clock = calendar()
const { game } = loadGame([{ ...town, activities: [coffee] }], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [clock, places({ start: 'house' })],
})
```

How it plays:

```ts
let state = startingState(game)
where(state)                        // 'house'
view(state, game).when              // 'Day 1 · Monday morning · House'
view(state, game).scene.title       // 'House'
view(state, game).scene.body        // 'Your house. The kettle is still warm.'

whyNot(state, game, go('cafe'))     // 'You cannot get there from here.'
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('cafe')).state
view(state, game).actions.map((a) => a.id)          // ['coffee']
view(state, game).plugins.places.exits.map((e) => e.id)   // ['high-street']: the kitchen is hidden

const evening = clock.write(apply(state, game, go('high-street')).state, { day: 0, period: 'evening' })
whyNot(evening, game, go('cafe'))   // 'Closed. Opens tomorrow morning.'
```

A UI reads the room at [`view.plugins.places`](#the-view), the description at `view.scene`, the room's buttons at `view.actions`, and the label at `view.when`.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'places/go', with: { to: 'cafe' } }` | `go('cafe')` | Walks through an exit to that place, then runs the [`arrive`](#placesoptions) option. |

`places/go` is refused, in this order, with:

1. `Finish this first.` (the engine's [`finishFirst`](/reference/strings#refusals)) while a scene is open;
2. `There is no such place.` ([`places/noSuchPlace`](#strings)) when the game has no place with that id;
3. `You are already here.` ([`places/alreadyHere`](#strings)) when the player is there already;
4. the `reason` of the destination's first `locked` entry whose `when` holds;
5. `You cannot get there from here.` ([`places/cannotGetThere`](#strings)) when the destination is not one of this place's `exits`, or the player is nowhere.

So a closed café says it is closed even from across town: `locked` is asked before the exits are.

A [lock](/reference/locks#lock) names it `places/go`, or `places/*`, and stops every journey. To stop some journeys and not others, use the destination's `locked`.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'places/move': 'cafe' }` | `moveTo('cafe')` | Puts the player there at once, and closes any open scene. |

It works in a data scene choice's effects and an activity's `effects`. In a plain-effect list (an item's use, what `rules.turn` returns, a plugin's [`effectsOf`](/reference/plugins#saying-what-a-command-does)), write the long form: `{ kind: 'custom', name: 'places/move', with: { value: 'cafe' } }`.

No exit is needed, and nothing is refused: the player can be moved from nowhere, or into a `locked` place. The [`arrive`](#placesoptions) option does not run. A place the game does not have does nothing: the player stays where they were, and the scene stays open.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'places/at': ['cafe', 'market'] }` | `at('cafe', 'market')` | The player is in one of these places. |
| `{ 'places/within': ['cafe'] }` | `within('cafe')` | The player is in one of these places, or anywhere inside one, following each place's `parent`. |

These are the short forms, with the full name as the only key (see [plugin calls](/reference/custom#plugincall)). The long form of the first row is `{ custom: 'places/at', with: { value: ['cafe', 'market'] } }`. A single place works too: `{ 'places/at': 'cafe' }`.

In the kitchen of the example, `at('cafe.kitchen')` and `within('cafe')` hold, and `at('cafe')` does not. Neither holds while the player is nowhere.

`within('cafe', 'market')` holds inside either building.

## Queries

Answers for other plugins' code, through the context's [`query`](/reference/plugins#queries). Content cannot ask them.

| Query | Answers |
|---|---|
| `places/here` | Where the player is: the place's id, or `null`. |
| `places/all` | Every place the game has: [`locationsOf(game)`](#helpers). |
| `places/known` | Whether the game has a place with this id, given as `{ value }` (or `{ id }`): `true` or `false`. |
| `places/exits` | The current place's `exits`, as listed, leaving out any the game does not have. Empty when nowhere. |

```ts
// A delivery plugin that only drops parcels at the house, if the game has places.
const here = query<string | null>('places/here')
const atHome = here === undefined || here === 'house'
```

The [cast](/plugins/cast) asks `places/here` to know who is in the room, and `places/known` to check its characters' places when the game loads.

## Values

| Prose writes | Prints |
|---|---|
| <code v-pre>{{v:places/name}}</code> | The current place's `name`: `High Street`. Empty when nowhere. |
| <code v-pre>{{v:places/tag}}</code> | The current place's `tag`: `Street`. Empty when nowhere. |

```ts
prose: { postcard: 'Greetings from the {{v:places/name}}.' }
// 'Greetings from the High Street.'
```

## The stage, the buttons and the label

### The stage

While no scene is open, the room fills the screen: its plugin [`stage`](/reference/plugins#stage) is the place's `name` as the title and its `body` as what is written there. `view.scene` is then `{ title: 'Café', body: 'The espresso machine hisses.', frame: 'stage', ... }`.

The body is drawn under the place's own id, not the plugin's. A [`variants`](/reference/scenes#block) block rotates per id, so each place keeps its own rotation: the café's lines do not move on because the high street was drawn.

The first plugin that has a stage fills the screen. With the player nowhere, places has none, and the screen is the game's title with an empty body.

### The buttons

The room's `actions` are offered as plugin [buttons](/reference/plugins#buttons): drawn while no scene is open, before the game's own `actions`, priced and greyed out exactly like them. In the café of the example, `view.actions` lists **Buy a coffee** first, then the game's buttons.

### The label

The place's `name`, which the view joins into [`view.when`](/reference/view#the-clock-and-the-player) after any plugin listed before it: `Day 1 · Monday morning · High Street` with the calendar first. Nothing while the player is nowhere.

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

- its place does not exist;
- the first [lock](/reference/locks#lock) that stops `places/go` to it has `hide`;
- one of its place's `locked` entries with `hide: true` holds.

Any other exit is shown, greyed out with its refusal if it cannot be taken.

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
| `disabled` | Why it cannot be taken now: what [`whyNot`](/reference/actions#whynot) says for its command. A closed café's exit reads `Closed. Opens tomorrow morning.` |
| `warning` | Pressable, but a plugin [guard](/reference/plugins#guards) warns against it; the reducer refuses it. |
| `command` | What to send to take it: `go(id)`. |

On a new game in the house:

```ts
{
  location: { id: 'house', name: 'House', tag: 'Home', kind: 'room', art: 'place/house' },
  exits: [{ id: 'high-street', name: 'High Street', tag: 'Street', kind: 'street', art: 'place/high-street', command: go('high-street') }],
}
```

## The state

### PlacesState

```ts
type PlacesState = { at: string | null }
```

What the plugin keeps in a save, at `state.plugins.places`: the id of the place the player is in, or `null` for nowhere. A UI reads the view, not this; code reads it with [`where(state)`](#helpers).

## Strings

The plugin's lines, in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key, `places/...`.

| Key | English |
|---|---|
| `places/noSuchPlace` | `There is no such place.` |
| `places/alreadyHere` | `You are already here.` |
| `places/cannotGetThere` | `You cannot get there from here.` |

`places/go` also says the engine's own [`finishFirst`](/reference/strings#refusals) (`Finish this first.`), reworded with it.

**Gotcha.** [`onlyAt`](#helpers)'s reason is plain text written into the requirement, `Not here.` if left out; it is not a string a game can override.

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
| `where` | Where the player is, read straight from the state, with no game needed: the place's id, or `null`. |
| `go` | The [`places/go`](#commands) command. |
| `at`, `within` | The [conditions](#conditions). |
| `moveTo` | The [`places/move`](#effects) effect. |
| `onlyAt` | A [requirement](/reference/actions#requirement) for an activity's `requires`: `{ when: at(...places), reason }`. The reason is `Not here.` if left out. |

```ts
const coffee = { id: 'coffee', requires: [onlyAt(['cafe'], 'There is no coffee here.')], effects: [/* ... */] }

whyNot(state, game, { type: 'activity', id: 'coffee' })   // 'There is no coffee here.' on the high street
```

`locationById` and `locationsOf` read the game's content, so they work on any state; `where` reads the state alone.

## Checks

When the game loads, two kinds of problem are reported.

**Place ids content names.** Every place named in `places/at`, `places/within`, `places/move` or `places/go` is looked up, wherever content writes it: an activity's requirements and effects, a scene, a lock, a room's actions, the game's own `actions`. One the game does not have is reported where it is named:

```text
town · activity swim · unknown location "lido"
```

**The places themselves**, pinned on the pack each place came from, with `where` as `locations <id>`, and the `start` option, pinned on `base` as `options start`:

- a `start` the game does not have (`options start`, `unknown location "…"`);
- an exit to a place the game does not have (`exit to unknown location "…"`);
- a `parent` the game does not have (`inside unknown location "…"`), or one that leads back round to the place (`is inside itself`, on every place in the loop);
- what the `body` names that the game does not have: prose keys, variants, conditions (`no prose for "…"`);
- what a `locked` entry's `when` names that the game does not have;
- what an action's `when`, `blocked` conditions or `command` names that the game does not have, prefixed with the action (`action dig: unknown location "moon"`).

```text
base · options start · unknown location "nowhere"
town · locations yard · exit to unknown location "lane"
town · locations yard · is inside itself
town · locations yard · no prose for "place.yard"
town · locations yard · action dig: unknown location "moon"
```

## Gotchas

- **`arrive` runs on `places/go` only.** A `places/move` puts the player somewhere with nothing on the doorstep. The option is the only doorstep there is: the engine has no arrival rule or hook of its own.
- **Exits are one-way.** List the way back on the other place.
- **A game that starts nowhere can't walk anywhere.** `places/go` from nowhere is refused with `You cannot get there from here.`; a `places/move` (from an intro scene's last choice, say) puts the player on the map.
- **`locked` comes before the exits.** A locked place's reason is the refusal even when it is not one step away.
- **`places/go` lists no effects.** A lock with `effect` does not see it, and no plugin puts a price on it.
