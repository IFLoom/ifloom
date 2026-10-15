# Game state

`GameState` is the whole save: a plain, JSON-serialisable object. Commands take one and return the next; nothing else in the engine holds state. Treat it as read-only and change it only through [commands](/reference/commands) and [effects](/reference/effects).

```ts
import type { GameState } from '@ifloom/engine'
```

## GameState

```ts
type GameState = {
  version: typeof SAVE_VERSION
  seed: number
  phase: Phase
  turn: number
  sceneId: string | null
  seen: Record<string, number>
  seenOn: Record<string, number>
  chosen: Record<string, number>
  stats: Stats
  entities: Record<string, Record<string, EntityState>>
  created: Record<string, number>
  removed: string[]
  storylines: Record<string, StorylineState>
  flags: Record<string, FlagValue>
  items: Record<string, number>
  collections: Record<string, CollectionEntry[]>
  notices: Notice[]
  fired: Record<string, number>
  plugins: Record<string, PluginSlice>
}
```

`FlagValue`, `StorylineState`, `Phase`, `Stats`, `EntityState`, `CollectionEntry` and `Notice` come from the package root too: `import type { FlagValue, StorylineState } from '@ifloom/engine'`.

### version

Always `SAVE_VERSION`. Older saves are carried forward on load; see [Saves](/reference/saves).

### seed

Fixed for the life of a save. A new game takes the `seed` given to [`startingState`](/reference/commands#startingstate) or the [`start`](/reference/commands#start) command; left out, it is a hash of the game's id, so every new game started without one deals the same. Every random draw mixes it in, so two playthroughs with different seeds deal different variants while one save always deals the same. A UI passes a fresh seed for each new game. See [Randomness](/reference/random#the-seed).

There is no player name in the state. A game that asks for one keeps it in a [variable](#flags), such as `playerName`.

### phase

```ts
type Phase = string
```

Which stage of the game the player is in, named by the game: `'arrival'`, `'first-day'`, `'open'`. The engine gives the names no meaning. [Locks](/reference/locks) and `{ phase }` [conditions](/reference/conditions#phase) read it; the [`phase`](/reference/effects#phase) effect sets it. A new game starts in `pack.startPhase`, or `''`.

### turn

```ts
turn: number
```

How many turns have passed: the engine's one clock. A new game starts at 0. What a turn is belongs to the game — a day, a chapter, a week. The engine never asks: it moves the counter on when a turn ends, which is when a [`turn`](/reference/effects#turn) effect runs — on a choice or an activity, or applied by a plugin. The [calendar plugin](/plugins/calendar#what-a-turn-is) ends turns this way when time passes and when the player goes to bed, so with it a turn is a day, a period or a week. Everything the engine dates is dated in turns: [`seenOn`](#seenon), [`fired`](#fired), [collection](#collections) entries, [notices](#notices), and a storyline's [`closedUntil`](#storylines). Read it with [`{ turn: true }`](/reference/conditions#turn). See [Rules: the end of a turn](/reference/rules#the-end-of-a-turn).

**There is no time of day in the state.** The turn is the engine's only clock. A game with a day and a period keeps them in the [calendar plugin](/plugins/calendar#calendarstate)'s state, at `state.plugins.calendar`.

**There is no place in the state either.** Where the player is belongs to the [places plugin](/plugins/places#placesstate), at `state.plugins.places` (`{ at: 'cafe' }`); read it with its [`where(state)`](/plugins/places#helpers). A game without it has the player nowhere.

### sceneId

The scene on screen, or `null` for the idle screen. A new game starts on `game.introScene`, or `null` when the game leaves it out. While it is set, activities, opening another scene and plugin commands that ask for it (the places plugin's [`places/go`](/plugins/places#commands)) are refused with "Finish this first." (the [`finishFirst`](/reference/strings#refusals) string, which a game can reword), and so are talking to someone and calling them.

### seen

How many times the player has entered each scene, by id. Counted once per command, for the scene the command leaves on screen; a scene redrawing itself after a choice is not a new viewing. The intro scene, if the game has one, starts at 1; with none, a new game has seen nothing. Read it with [`{ seen }`](/reference/conditions#seen).

### seenOn

The [turn](#turn) each scene was first entered. Never overwritten. The intro scene is recorded at turn 0. Read it with [`{ since }`](/reference/conditions#since).

### chosen

How many times each choice has been picked, keyed `scene/choice`: `{ 'cafe.counter/buy-bread': 2 }`. The [`choose`](/reference/commands#choose) command adds one before the choice's effects run, for every choice, so content can branch on an earlier decision without the choice setting a variable of its own. A new game starts with `{}`. Read it with [`{ chose }`](/reference/conditions#chose).

### stats

```ts
type StatKey = string
type Stats = Record<StatKey, number>
```

One number per stat the game [declares](/reference/stats), by id, each held to that stat's declared range by every effect, cost and payment that changes it. **Every number the player has lives here** — the engine has no `money` or `energy` of its own; a game that wants coins or energy declares them as stats. A new game starts each at its `start`. A game that declares no stats has `{}`. A stat declared `of` a [kind](/reference/entities) is not here: each entity keeps its own, in [`entities`](#entities).

### entities

```ts
entities: Record<string, Record<string, EntityState>>
```

The things the game keeps several of, by [kind](/reference/entities) and then by id: `state.entities.staff.ana`. Each is an [`EntityState`](/reference/entities#entitystate) — its name, its stats and its variables. Within a kind they are in the order they came: declared ones first, then those [created](/reference/effects#create) in play.

A new game has every declared kind, with none in it if no entity of it is declared, and every declared entity, each with every stat declared `of` its kind at that stat's `start`, overridden by the declaration's `stats`. Changed by the [`create`](/reference/effects#create), [`remove`](/reference/effects#remove) and [`each`](/reference/effects#each) effects and by `stat`, `setStat` and `flag` with `of`; read with [`{ count }`](/reference/conditions#count), [`{ entity }`](/reference/conditions#entity), `{ stat, of }`, `{ flag, of }`, and [`entitiesOf`](/reference/entities#entitiesof) and [`entityOf`](/reference/entities#entityof). A save from before version 4 loads with `{}`.

### created

```ts
created: Record<string, number>
```

For each kind, the last number given to an entity created in play without an id of its own: `{ staff: 2 }` after `#1` and `#2`. The next is one more, so a number is never given twice. A new game starts with `{}`. See [Ids](/reference/entities#ids).

### removed

```ts
removed: string[]
```

The [entities](/reference/entities) the game declares that were [removed](/reference/effects#remove) in play, as references, in the order they went: `['staff:ben']`. [`hydrate`](/reference/commands#hydrate) adds every declared entity a save does not have — one a mod or a new version of the game declares — except these, so one that left stays gone. An entity created in play is never recorded here: nothing would bring it back. A new game starts with `[]`; a save from before version 7 loads with `[]`. See [Entities in old saves](/reference/entities#entities-in-old-saves).

### storylines

```ts
type StorylineState = {
  closedUntil: number | null
  flags: Record<string, FlagValue>
}
```

One entry per storyline declared in `game.storylines`.

| Field | What it holds |
|---|---|
| `closedUntil` | A [turn](#turn): while `turn` is below this, the storyline is closed, and the [cast](/plugins/cast) refuses to talk to or call a character who belongs to it. `null` means open. Set by [`closeStoryline`](/reference/effects#closestoryline). |
| `flags` | Variables that belong to this storyline. Numbers here are what [`{ counter }`](/reference/conditions#counter) reads. |

Reading a storyline that is not in the save gives an empty one (open, nothing set), so reading an undeclared id gives no crash. A storyline keeps no number of how well the player is liked: a game keeps that as a [stat](/reference/stats#entity-stats) on the cast's characters (see [Storylines](/reference/world)).

### flags

```ts
type FlagValue = boolean | number | string
```

The game's own variables. A new game starts with the `flags` given to [`startingState`](/reference/commands#startingstate), or `{}`. Set by the [`flag`](/reference/effects#flag) effect and by [inputs](/reference/inputs); read by [`{ flag }`](/reference/conditions#flag) and, as text, by a <code v-pre>{{name}}</code> [prose token](/reference/prose#tokens). [`rules.resets`](/reference/rules#resets) puts some back at the start of each turn. Keys starting `turn:` are used by [`oncePerTurn()`](/reference/progress#onceperturn) and a data-scene choice's `once`.

### items

How many of each item the player is carrying, by id. Never below 0. A new game holds 1 of each `gear` item and 0 of each `stuff` item, unless the item's `start` says otherwise. The [wardrobe plugin](/plugins/wardrobe) leaves worn clothes counted here: wearing something does not change how many the player has.

### collections

```ts
collections: Record<string, CollectionEntry[]>
```

Each [collection](/reference/collections)'s entries, by collection id, oldest first, each with the [turn](#turn) it was collected. Changed by the [`collect`](/reference/effects#collect) and [`discard`](/reference/effects#discard) effects; read with [`{ collection }`](/reference/conditions#collection). A new game starts with `{}`; a collection nothing has been collected into has no entry.

### notices

```ts
notices: Notice[]
```

What the game has told the player outside scenes, oldest first, seen or not. At most [`NOTICES_KEPT`](/reference/notices#notices-kept). Raised by the [`notify`](/reference/effects#notify) effect, marked seen by the [`dismiss`](/reference/commands#dismiss) command. See [Notices](/reference/notices).

### fired

```ts
fired: Record<string, number>
```

The [turn](#turn) each [trigger](/reference/triggers) last fired, by trigger id. A trigger with an entry here does not fire again, unless it is `once: 'turn'` and the turn has moved on.

### plugins

```ts
type PluginSlice = { version: number; state: unknown }
```

Each [plugin](/reference/plugins)'s own state, by plugin id, with the version of its shape: `{ quests: { version: 1, state: { ... } } }`. [`startingState`](/reference/commands#startingstate) fills it from each plugin's `start`. A plugin with no state has no entry.

Read and write it through the plugin, not by hand. Inside the plugin, use its context's `slice` and `set`. Outside it, use [`definePlugin`](/reference/plugins#defineplugin)'s `read` and `write`. An older save's entry is carried forward by [`migratePlugins`](/reference/plugins#migrateplugins), and the entry of a plugin the game no longer has is kept untouched.

## Constants

### SAVE_VERSION

```ts
const SAVE_VERSION = 8
```

The shape of `GameState` this engine writes. Version 2 moved the player's name into variables and added `chosen`; version 3 added [`turn`](#turn) and dated everything in turns instead of days; version 4 added [`entities`](#entities) and [`created`](#created); version 5 took the clock, `time`, out of the engine and into the [calendar plugin](/plugins/calendar)'s state; version 6 took `locationId` out of the engine and into the [places plugin](/plugins/places#placesstate)'s, as `{ at }`; version 7 added [`removed`](#removed); version 8 took `standing` and `rapport` off each [storyline](#storylines). See [Saves](/reference/saves) for `migrate`.
