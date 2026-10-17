---
title: "Game state"
---
`GameState` is the whole save, as a plain object you can serialise to JSON. Commands take one and return the next, and nothing else in the engine holds state. Treat it as read-only, and change it only through [commands](/docs/reference/commands) and [effects](/docs/reference/effects).

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
  kv: Record<string, KvValue>
  items: Record<string, number>
  collections: Record<string, CollectionEntry[]>
  notices: Notice[]
  fired: Record<string, number>
  plugins: Record<string, PluginSlice>
  settings: Record<string, KvValue>
  audio: AudioState
  media: MediaState
  minigame: MinigameState | null
  transition: { to: TransitionName; ms?: number } | null
  gameVersion?: number
}
```

`KvValue`, `StorylineState`, `Phase`, `Stats`, `EntityState`, `CollectionEntry` and `Notice` come from the package root too:

```ts
import type { KvValue, StorylineState } from '@ifloom/engine'
```

### version

Always `SAVE_VERSION`. Older saves are carried forward when they load. See [Saves](/docs/reference/saves).

### gameVersion

The game's own [version](/docs/reference/saves#the-games-own-migrations) the state is at. It's only there in a game that declares `version`. A state without it is version 1. The game's migration steps carry it forward when an older save loads.

### seed

Fixed for the life of a save. A new game takes the `seed` given to [`startingState`](/docs/reference/commands#startingstate) or the [`start`](/docs/reference/commands#start) command. If none is given, it's a hash of the game's id, so every new game started without one deals the same. Every random draw mixes the seed in. Two playthroughs with different seeds deal different variants, while one save always deals the same. A UI should pass a fresh seed for each new game. See [Randomness](/docs/reference/random#the-seed).

There is no player name in the state. A game that asks for one keeps it in the [kv store](#kv), under a key such as `playerName`, and names its saves after it with [`saveName`](/docs/reference/game#savename).

### phase

```ts
type Phase = string
```

Which stage of the game the player is in, such as `'arrival'`, `'first-day'` or `'open'`. Your game names the stages and the engine gives the names no meaning. [Locks](/docs/reference/locks) and `{ phase }` [conditions](/docs/reference/conditions#phase) read it, and the [`phase`](/docs/reference/effects#phase) effect sets it. A new game starts in `game.startPhase`, or `''` if the game doesn't set one.

### turn

```ts
turn: number
```

How many turns have passed. This is the engine's only clock, and a new game starts at 0. Your game decides how long a turn is, whether that's a day, a chapter or a week. The engine moves the counter on when a turn ends, which is when a [`turn`](/docs/reference/effects#turn) effect runs, from a choice, an activity or a plugin. The [calendar plugin](/docs/plugins/calendar#what-a-turn-is) ends turns this way when time passes and when the player sleeps, so with it a turn is a day, a period or a week.

Everything the engine dates is dated in turns: [`seenOn`](#seenon), [`fired`](#fired), [collection](#collections) entries, [notices](#notices) and a storyline's [`closedUntil`](#storylines). Read it with [`{ turn: {} }`](/docs/reference/conditions#turn). See [Rules: the end of a turn](/docs/reference/rules#the-end-of-a-turn).

**There's no time of day in the state.** A game with days and periods keeps them in the [calendar plugin](/docs/plugins/calendar#calendarstate)'s state, at `state.plugins.calendar`.

**There's no place in the state either.** The [places plugin](/docs/plugins/places#placesstate) keeps where the player is, at `state.plugins.places` (`{ at: 'cafe' }`). Read it with the plugin's [`where(state)`](/docs/plugins/places#helpers). In a game without that plugin, the player isn't anywhere.

### sceneId

The scene on screen, or `null` for the idle screen. A new game starts on `game.introScene`, or `null` if the game leaves it out. While a scene is open, activities and opening another scene are refused with "Finish this first." (the [`finishFirst`](/docs/reference/strings#refusals) string, which a game can reword). So are plugin commands that check for an open scene, such as the places plugin's [`places/go`](/docs/plugins/places#commands) and the cast's talking and calling.

### seen

How many times the player has entered each scene, by id. It's counted once per command, for the scene the command leaves on screen. A scene redrawing itself after a choice isn't a new viewing. The intro scene, if the game has one, starts at 1. Without one, a new game has seen nothing. Read it with [`{ seen }`](/docs/reference/conditions#seen).

### seenOn

The [turn](#turn) each scene was first entered. It's never overwritten. The intro scene is recorded at turn 0. Read it with [`{ since }`](/docs/reference/conditions#since).

### chosen

How many times each choice has been picked, keyed `scene/choice`, as in `{ 'cafe.counter/buy-bread': 2 }`. The [`choose`](/docs/reference/commands#choose) command adds one for every choice, before the choice's effects run. That lets content branch on an earlier decision without the choice setting a kv key of its own. A new game starts with `{}`. Read it with [`{ chose }`](/docs/reference/conditions#chose).

### stats

```ts
type StatKey = string
type Stats = Record<StatKey, number>
```

One number per stat the game [declares](/docs/reference/stats), by id. Every effect, cost and payment that changes a stat keeps it within the stat's declared range. Every number the player has lives here. The engine has no `money` or `energy` of its own, so a game that wants coins or energy declares them as stats. A new game starts each at its `start`, and a game that declares no stats has `{}`.

A stat declared `of` a [kind](/docs/reference/entities) isn't here. Each entity keeps its own, in [`entities`](#entities). A [derived stat](/docs/reference/stats#derived-stats) isn't here either, because it's worked out each time it's read. Read stats with [`statValue`](/docs/reference/stats#statvalue) rather than from here when a stat might be derived.

### entities

```ts
entities: Record<string, Record<string, EntityState>>
```

The things the game keeps several of, by [kind](/docs/reference/entities) and then by id, as in `state.entities.staff.ana`. Each is an [`EntityState`](/docs/reference/entities#entitystate) holding its name, its stats and its own kv store. Within a kind they're in the order they arrived, declared ones first and then those [created](/docs/reference/effects#create) in play.

A new game has an entry for every declared kind, empty if no entity of that kind is declared. Each declared entity starts with every stat declared `of` its kind at that stat's `start`, overridden by the declaration's `stats`.

The [`create`](/docs/reference/effects#create), [`remove`](/docs/reference/effects#remove) and [`each`](/docs/reference/effects#each) effects change it, as do `stat` and `kv` with `of`. Read it with [`{ count }`](/docs/reference/conditions#count), [`{ entity }`](/docs/reference/conditions#entity), `{ stat, of }` and `{ kv, of }`, or with [`entitiesOf`](/docs/reference/entities#entitiesof) and [`entityOf`](/docs/reference/entities#entityof). A save from before version 4 loads with `{}`.

### created

```ts
created: Record<string, number>
```

For each kind, the last number given to an entity created in play without an id of its own, as in `{ staff: 2 }` after `#1` and `#2`. The next one gets one more, so a number is never given twice. A new game starts with `{}`. See [Ids](/docs/reference/entities#ids).

### removed

```ts
removed: string[]
```

The declared [entities](/docs/reference/entities) that were [removed](/docs/reference/effects#remove) in play, as references in the order they went, such as `['staff:ben']`. Loading a save with [`loadState`](/docs/reference/saves#loadstate) adds every declared entity it doesn't have, such as one a mod or a new version of the game declares. It skips these, so an entity that left stays gone. An entity created in play is never recorded here, because nothing would bring it back. A new game starts with `[]`, and a save from before version 7 loads with `[]`. See [Entities in old saves](/docs/reference/entities#entities-in-old-saves).

### storylines

```ts
type StorylineState = {
  closedUntil: number | null
  kv: Record<string, KvValue>
}
```

One entry per storyline declared in `game.storylines`.

| Field | What it holds |
|---|---|
| `closedUntil` | A [turn](#turn). While `turn` is below this, the storyline is closed, and the [cast](/docs/plugins/cast) won't let the player talk to or call a character who belongs to it. `null` means open. Set by [`closeStoryline`](/docs/reference/effects#closestoryline). |
| `kv` | The storyline's own kv store. [`storylineKv`](/docs/reference/effects#storylinekv) sets its keys and [`{ storylineKv }`](/docs/reference/conditions#storylinekv) reads them. With a range, `{ storylineKv }` reads the numbers here. |

Reading a storyline that isn't in the save gives an empty one (open, nothing set), so an undeclared id doesn't crash. A storyline doesn't keep a number for how well the player is liked. A game keeps that as a [stat](/docs/reference/stats#entity-stats) on the cast's characters (see [Storylines](/docs/reference/storylines)).

### kv

```ts
type KvValue = boolean | number | string
```

The kv store: keys with a true/false, number or text value, such as `metAva: true`, `visits: 3` or `playerName: 'Robin'`. It's where a game keeps anything that isn't a stat or an item. Keys need no declaring. A key nobody has set reads as unset, which a condition treats as false, or as 0 in a range.

A new game starts with the `kv` given to [`startingState`](/docs/reference/commands#startingstate), or `{}`. The [`kv`](/docs/reference/effects#kv) effect and [inputs](/docs/reference/inputs) set keys. [`{ kv }`](/docs/reference/conditions#kv) reads them, and so does a `{{name}}` [prose token](/docs/reference/prose#tokens), as text. [`rules.resets`](/docs/reference/rules#resets) puts some back at the start of each turn. Each [storyline](#storylines) and each [entity](#entities) has a kv store of its own too.

Save version 12 renamed it from `flags`, and an older save's flags load here.

The engine writes some keys here itself, so don't use these prefixes for your own:

- `turn:` keys, used by [`oncePerTurn()`](/docs/reference/progress#onceperturn) and a data-scene choice's `once`
- `variants:<name>` keys, which count how often a set of [variants](/docs/reference/prose) has been drawn
- `storylet:<name>` keys, which count how often a set of [storylets](/docs/reference/storylets) has been drawn from

### items

How many of each item the player is carrying, by id. It never goes below 0. A new game holds 1 of each `gear` item and 0 of each `stuff` item, unless the item's `start` says otherwise. The [wardrobe plugin](/docs/plugins/wardrobe) leaves worn clothes counted here, so wearing something doesn't change how many the player has.

### collections

```ts
collections: Record<string, CollectionEntry[]>
```

Each [collection](/docs/reference/collections)'s entries, by collection id, oldest first. Each entry records the [turn](#turn) it was collected. The [`collect`](/docs/reference/effects#collect) and [`discard`](/docs/reference/effects#discard) effects change it, and [`{ collection }`](/docs/reference/conditions#collection) reads it. A new game starts with `{}`, and a collection nothing has been collected into has no entry.

### notices

```ts
notices: Notice[]
```

What the game has told the player outside scenes, oldest first, whether seen or not. It holds at most [`NOTICES_KEPT`](/docs/reference/notices#notices_kept). The [`notify`](/docs/reference/effects#notify) effect raises one and the [`dismiss`](/docs/reference/commands#dismiss) command marks one seen. See [Notices](/docs/reference/notices).

### fired

```ts
fired: Record<string, number>
```

The [turn](#turn) each [trigger](/docs/reference/triggers) last fired, by trigger id. A trigger with an entry here doesn't fire again, unless it's `once: 'turn'` and the turn has moved on.

### plugins

```ts
type PluginSlice = { version: number; state: unknown }
```

Each [plugin](/docs/reference/plugins)'s own state, by plugin id, with the version of its shape, as in `{ quests: { version: 1, state: { ... } } }`. [`startingState`](/docs/reference/commands#startingstate) fills it from each plugin's `start`. A plugin with no state has no entry.

Read and write it through the plugin, not by hand. Inside the plugin, use its context's `slice` and `set`. Outside it, use [`definePlugin`](/docs/reference/plugins#defineplugin)'s `read` and `write`. An older save's entry is carried forward when the save [loads](/docs/reference/plugins#when-a-save-loads), and the entry of a plugin the game no longer has is kept untouched.

### settings

```ts
settings: Record<string, KvValue>
```

The value of each `play` [setting](/docs/reference/settings) the game declares, by id, such as `{ hints: true, difficulty: 'usual' }`. A `ui` setting is never here. A new game takes the values passed to [`startingState`](/docs/reference/commands#startingstate) as `settings`, and each setting given none starts at its default. The [`setting`](/docs/reference/commands#setting) command changes one, and [`{ setting }`](/docs/reference/conditions#setting) reads it. A save from before version 9 loads with each declared play setting at its default.

### audio

```ts
audio: AudioState
```

What [`audio`](/docs/reference/effects#audio) effects have put on channels, the last 20 [`sound`](/docs/reference/effects#sound) effects, how many times a scene has been entered, and what each background channel started playing and when. It's what keeps [`view.audio`](/docs/reference/view#audio)'s choices and cue keys the same after a reload. See [`AudioState`](/docs/reference/audio#audiostate).

### media

```ts
media: MediaState   // { picks: Record<string, string> }
```

The file each [pool](/docs/reference/media#pools) request was given, by pick key, such as `{ 'door|red,night|flat.morning|0.0': 'door/red-night.jpg' }`. The reducer adds a pick after each command the first time something on screen asks for it, so a revisit and a reload show the same file. See [`MediaState`](/docs/reference/media#mediastate). A save from before version 11 loads with none.

### minigame

```ts
minigame: MinigameState | null   // { id, state, elapsed, vars, steps }
```

The [minigame](/docs/reference/minigames) being played, or `null`. See [`MinigameState`](/docs/reference/minigames#minigamestate). A save from before minigames loads with `null`. The field was added with a load default and no new save version, because nothing a save already has changes shape.

### transition

```ts
transition: { to: TransitionName; ms?: number } | null
```

How the screen after the last command comes in, as a [`transition` effect](/docs/reference/effects#transition) set it, or `null`. It lasts one command: the next command that doesn't set it again clears it. [`view.transition`](/docs/reference/view#transition) reads it. A save from before transitions loads with `null`. The field was added with a load default and no new save version, because nothing a save already has changes shape.

## New Game+

When a player finishes your game, you can let them start again with some of what they had. List what carries over in `game.carryOver`, and say when the game counts as finished with `game.finished`:

```ts
const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  // Finished once the letter is read and the bakery's last scene has been seen.
  finished: { all: [{ kv: 'readTheLetter' }, { seen: 'bakery.ending' }] },
  carryOver: { stats: ['coins'], kv: ['readTheLetter'], items: ['umbrella'] },
})
```

The [runner](/docs/reference/runner#finished) watches `finished`. After each command that takes, if the condition holds and the [profile](/docs/reference/profile) has no `finished` yet, it records `{ at }`, the time in milliseconds. A title screen checks it to decide whether to offer New Game+:

```ts
const done = await runner.profile?.get<{ at: number }>('finished')
if (done) await runner.newGame({ carry: runner.state })
```

```ts
type CarryOver = {
  stats?: string[]
  kv?: string[]
  items?: string[] | 'all'
}
```

`startingState(game, { carry })` builds the new game as usual, then copies from `carry`:

- each player stat in `carryOver.stats`, held to its range
- each key of the [kv store](#kv) in `carryOver.kv` that is set
- each item in `carryOver.items`, or every declared item with `items: 'all'`

Nothing else comes across. The turn, scenes seen, storylines, entities and plugin states all start fresh. Keys passed in `kv` are written after the carried ones, so they win. A game with no `carryOver` carries nothing.

**Gotcha.** Carry from the state the player finished on. If you start the New Game+ from a title screen after a reload, load the save first, or keep that state yourself. The profile records only when the game was finished, not the state.

The [content checker](/docs/reference/checks) reports a stat or item in `carryOver` that the game doesn't declare, and a stat that belongs to a kind rather than the player.

## Constants

### SAVE_VERSION

```ts
const SAVE_VERSION = 12
```

The save format this engine writes. [`loadState`](/docs/reference/saves#loadstate) carries older ones forward. The version goes up only when a field older saves already have changes shape. A new field doesn't bump it: a save that lacks the field gets its load default when it loads, as [`minigame`](#minigame) does. See [SAVE_VERSION](/docs/reference/saves#save_version) for the rule.

The versions so far:

| Version | Change |
|---|---|
| 2 | Moved the player's name into `flags` and added `chosen`. |
| 3 | Added [`turn`](#turn) and dated everything in turns instead of days. |
| 4 | Added [`entities`](#entities) and [`created`](#created). |
| 5 | Moved the clock, `time`, into the [calendar plugin](/docs/plugins/calendar)'s state. |
| 6 | Moved `locationId` into the [places plugin](/docs/plugins/places#placesstate)'s state, as `{ at }`. |
| 7 | Added [`removed`](#removed). |
| 8 | Took `standing` and `rapport` off each [storyline](#storylines). |
| 9 | Added [`settings`](#settings). |
| 10 | Added [`audio`](#audio). |
| 11 | Added [`media`](#media). |
| 12 | Renamed `flags` to [`kv`](#kv), on the state, on each storyline and on each entity. |

The versions that only added a field (4, 7, 9, 10 and 11) are from before the rule above. A field added now gets a load default and no new version.

## See it in an example

- The Letter: [`examples/novel/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/game.ts) declares `finished` and `carryOver: { kv: ['readBefore'] }` for New Game+, and the first chapter has a line only a second read shows. The test `counts as finished at either ending, and a New Game+ remembers the first read` in [`examples/novel/tests/novel.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/tests/novel.test.ts) plays it.
- Small Town: `probes` in [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) builds states by hand, with `kv`, `entities`, `stats` and `plugins` filled in.
