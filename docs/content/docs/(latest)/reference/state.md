---
title: "Game state"
description: "GameState field by field: the turn, scene, stats, kv store, entities and what is held, plugins' state, and what was seen and chosen when."
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
  turn: number
  sceneId: string | null
  seen: Record<string, Times>
  chosen: Record<string, Times>
  stats: Stats
  entities: Record<string, Record<string, EntityState>>
  created: Record<string, number>
  removed: string[]
  held: Record<Holder, Record<EntityRef, number>>
  you: EntityRef | null
  storylines: Record<string, StorylineState>
  kv: Record<string, KvValue>
  notices: Notice[]
  fired: Record<string, number>
  plugins: Record<string, PluginSlice>
  settings: Record<string, KvValue>
  audio: AudioState
  media: MediaState
  minigame: MinigameState | null
  flow: FlowState | null
  panel: OpenPanel | null
  rolls: RollsState
  timers: Record<string, RunningTimer>
  changes: Change[]
  gameVersion?: number
}
```

`KvValue`, `StorylineState`, `Stats`, `EntityState` and `Notice` come from the package root too:

```ts
import type { KvValue, StorylineState } from '@ifloom/engine'
```

### version

Always `SAVE_VERSION`. Older saves are carried forward when they load. See [Saves](/docs/reference/saves).

### gameVersion

The game's own [version](/docs/reference/saves#the-games-own-migrations) the state is at. It's only there in a game that declares `version`. A state without it is version 1. The game's migration steps carry it forward when an older save loads.

### seed

Fixed for the life of a save. A new game takes the `seed` given to [`startingState`](/docs/reference/commands#startingstate) or the [`start`](/docs/reference/commands#start) command. If none is given, it's a hash of the game's id, so every new game started without one deals the same. Every random draw mixes the seed in. Two playthroughs with different seeds deal different variants, while one save always deals the same. A UI should pass a fresh seed for each new game. See [Randomness](/docs/reference/random#the-seed).

There is no player name in the state. A game that asks for one keeps it in the [kv store](#kv), under a key such as `playerName`, and names its saves after it with [`rules.saveName`](/docs/reference/rules#savename).

### turn

```ts
turn: number
```

How many turns have passed. This is the engine's only clock, and a new game starts at 0. Your game decides how long a turn is, whether that's a day, a chapter or a week. The engine moves the counter on when a turn ends, which is when a [`turn`](/docs/reference/effects#turn) effect runs, from a choice, an action or a plugin. The [calendar plugin](/docs/plugins/calendar#what-a-turn-is) ends turns this way when time passes and when the player sleeps, so with it a turn is a day, a period or a week.

Everything the engine dates is dated in turns: [`seen`](#seen) and [`chosen`](#chosen), [`fired`](#fired), [notices](#notices) and a storyline's [`closedUntil`](#storylines). Read it with [`{ turn: {} }`](/docs/reference/conditions#turn). See [Rules: the end of a turn](/docs/reference/rules#the-end-of-a-turn).

**There's no time of day in the state.** A game with days and periods keeps them in the [calendar plugin](/docs/plugins/calendar#calendarstate)'s state, at `state.plugins.calendar`.

**There's no place in the state either.** The [places plugin](/docs/plugins/places#placesstate) keeps where the player is, at `state.plugins.places` (`{ at: 'cafe' }`). Read it with the plugin's [`places.where(state)`](/docs/plugins/places#helpers). In a game without that plugin, the player isn't anywhere.

### sceneId

The scene on screen, or `null` for the idle screen. A new game starts on the content's `introScene`, or `null` if it leaves it out. While a scene is open, actions and opening another scene are refused with "Finish this first." (the [`finishFirst`](/docs/reference/strings#refusals) string, which a game can reword). So are plugin commands that check for an open scene, such as the places plugin's [`places/go`](/docs/plugins/places#commands) and the cast's talking and calling.

### seen

Each scene the player has entered, by id, as a [`Times`](#times): how many times, and the turn of the first time and the last. `{ 'ava.hi': { n: 3, first: 1, last: 6 } }` is a scene entered three times, first on turn 1 and last on turn 6. It's counted once per command, for the scene the command leaves on screen. A scene redrawing itself after a choice isn't a new viewing. The intro scene, if the game has one, starts at `{ n: 1, first: 0, last: 0 }`. Without one, a new game has seen nothing. Read the count with [`{ seen }`](/docs/reference/conditions#seen) and the turns with [`{ since }`](/docs/reference/conditions#since).

### chosen

Each choice the player has picked, keyed `scene#choice`, as a [`Times`](#times): `{ 'cafe.counter#buy-bread': { n: 2, first: 3, last: 5 } }`. The [`choose`](/docs/reference/commands#choose) command counts every choice, on the turn it was picked and before the choice's effects run, so a choice that ends the turn is dated the turn it was picked in. That lets content branch on an earlier decision without the choice setting a kv key of its own. A new game starts with `{}`. Read the count with [`{ chose }`](/docs/reference/conditions#chose) and the turns with [`{ since: 'scene#choice' }`](/docs/reference/conditions#since). A choice's [`once`](/docs/reference/scenes#choice) reads `last` too: it's spent while `last` is this turn.

### Times

```ts
type Times = { n: number; first: number; last: number }
```

How many times something happened (`n`), and the [turn](#turn) of the first time and the last. What [`seen`](#seen) keeps for each scene and [`chosen`](#chosen) for each choice. Save version 18 made each one a record, from the counts and the four records of turns beside them that older saves kept (`seenOn`, `lastSeenOn`, `chosenOn` and `lastChosenOn`).

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

What play has changed about the game's [entities](/docs/reference/entities), by kind and then by id, as in `state.entities.staff.ana`. Each is an [`EntityState`](/docs/reference/entities#entitystate) with only what changed: stats, kv keys, and for one [created](/docs/reference/effects#create) in play, what it was given (its name, the entity it was made `like`, tags and trait data). A declared entity has no record until something changes it, so a new game starts with `{}`. Everything else about an entity is read from content.

A record can also hold `traits`: the state of a [trait](/docs/reference/entities#traits) that keeps one, such as the uses left in a torch, once [`setTraitState`](/docs/reference/entities#settraitstate) writes it. Saves made before traits existed have none, and need nothing to load. A trait's data itself is never here, since it's content.

The [`create`](/docs/reference/effects#create), [`remove`](/docs/reference/effects#remove) and [`each`](/docs/reference/effects#each) effects change it, as do `stat` and `kv` with `of`. Read it with [`{ count }`](/docs/reference/conditions#count), [`{ entity }`](/docs/reference/conditions#entity), `{ stat, of }` and `{ kv, of }`, or with [`entitiesOf`](/docs/reference/entities#entitiesof), [`statValue`](/docs/reference/stats#statvalue) and [`entityKv`](/docs/reference/entities#entitykv), which fall back to content. Don't read it directly for a value, since most values aren't here. A save from before version 4 loads with `{}`, and one from before version 15 loses what it copied from content (see [Entities in old saves](/docs/reference/entities#entities-in-old-saves)).

### held

```ts
held: Record<Holder, Record<EntityRef, number>>
```

What play has changed about who [holds](/docs/reference/entities#holding-things) what, by holder and then thing, as in `state.held.player['food:apple']`. A holder is `'player'` or a unique entity's reference, never `'you'`, which is resolved before anything is written. A new game starts with `{}`: where things start is read from each entity's [`at`](/docs/reference/entities#entitydef) in content until play changes it. Once a count is written it's kept, 0 included, so a thing placed and then used up stays used up.

Read it with [`heldCount`](/docs/reference/entities#heldcount), [`heldBy`](/docs/reference/entities#heldby) and [`holderOf`](/docs/reference/entities#holderof), or the [`{ entity, at }`](/docs/reference/conditions#entity) and [`{ count }`](/docs/reference/conditions#count) conditions, which fall back to content. The [`entity`](/docs/reference/effects#entity) and [`move`](/docs/reference/effects#move) effects change it, as do `create` with `at` and `remove`. Who holds each thing is worked out from it when asked and kept for that state, never saved. A save from before holdings loads with `{}`. The field came with a load default and no new save version. A save from before version 16 has the player's items written here, by the entity each became.

### you

```ts
you: EntityRef | null
```

The [protagonist](/docs/reference/entities#protagonists-you-and-player) being played, a unique entity's reference, or `null` for the player. `'you'` as a holder and `of: 'you'` read it. The [`you`](/docs/reference/effects#you) effect sets it. A new game starts with `null`, and a game with one protagonist never changes it. A save from before holdings loads with `null`. The field came with a load default and no new save version.

### created

```ts
created: Record<string, number>
```

For each kind, the last number given to an entity created in play without an id of its own, as in `{ staff: 2 }` after `#1` and `#2`. The next one gets one more, so a number is never given twice. A new game starts with `{}`. See [Ids](/docs/reference/entities#ids).

### removed

```ts
removed: string[]
```

The declared [entities](/docs/reference/entities) that were [removed](/docs/reference/effects#remove) in play, as references in the order they went, such as `['staff:ben']`. A declared entity is in the game unless it's here, so one a mod or a new version of the game declares is there in an old save, and one that left stays gone. An entity created in play is never recorded here, because nothing would bring it back. A new game starts with `[]`, and a save from before version 7 loads with `[]`. See [Entities in old saves](/docs/reference/entities#entities-in-old-saves).

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
| `kv` | The storyline's own kv store. The [`kv` effect](/docs/reference/effects#whose-key-it-is) with `of: 'storyline:<id>'` sets its keys, and the [`kv` condition](/docs/reference/conditions#kv) with the same `of` reads them. |

Reading a storyline that isn't in the save gives an empty one (open, nothing set), so an undeclared id doesn't crash. A storyline doesn't keep a number for how well the player is liked. A game keeps that as a [stat](/docs/reference/stats#entity-stats) on the cast's characters (see [Storylines](/docs/reference/storylines)).

### kv

```ts
type KvValue = boolean | number | string
```

The kv store: keys with a true/false, number or text value, such as `metAva: true`, `visits: 3` or `playerName: 'Robin'`. It's where a game keeps anything that isn't a stat or a thing. Keys need no declaring. A key nobody has set counts as 0: `{ kv: 'visits', is: 0 }` and `{ kv: 'visits', lt: 1 }` hold for it, and a bare `{ kv: 'visits' }` doesn't.

A new game starts with the content's starting `kv`, with the `kv` given to [`startingState`](/docs/reference/commands#startingstate) over it, or `{}`. The [`kv`](/docs/reference/effects#kv) effect and [inputs](/docs/reference/inputs) set keys. [`{ kv }`](/docs/reference/conditions#kv) reads them, and so does a `{{name}}` [prose token](/docs/reference/prose#tokens), as text. The content's [`resets`](/docs/reference/rules#resets) put some back at the start of each turn. Each [storyline](#storylines) and each [entity](#entities) has a kv store of its own too, and so does a running [minigame](#minigame).

#### phase

The stretch of the game the player is in, such as `'arrival'`, `'first-day'` or `'open'`, is the kv key `phase`. Your game names the stretches and the engine gives the names no meaning. Give a new game its first one in the content's starting `kv` (`kv: { phase: 'arrival' }`), set it with `{ kv: 'phase', to: 'open' }` and read it with `{ kv: 'phase', is: ['arrival'] }`, as [locks](/docs/reference/locks) often do. Save version 19 moved a save's old `phase` field here.

Save version 12 renamed it from `flags`, and an older save's flags load here.

The engine writes some keys here itself, so don't use these prefixes for your own:

- `turn:` keys, which a save from before version 18 used for a choice's `once` (it reads [`chosen`](#chosen) now, and loading such a save clears them)
- `variants:<name>` keys, which count how often a set of [variants](/docs/reference/prose) has been drawn
- `storylet:<name>` keys, which count how often a set of [storylets](/docs/reference/storylets) has been drawn from

### notices

```ts
notices: Notice[]
```

What the game has told the player outside scenes, oldest first, whether seen or not. It holds at most the last 50. The [`notify`](/docs/reference/effects#notify) effect raises one and the [`dismiss`](/docs/reference/commands#dismiss) command marks one seen. See [Notices](/docs/reference/notices). A notice's `text` is its words. A save from before version 21 kept a prose key there, and gets that key's words when it loads.

### fired

```ts
fired: Record<string, number>
```

The [turn](#turn) each [trigger](/docs/reference/triggers) last fired, by trigger id. A trigger with an entry here doesn't fire again, unless it's `once: { per: 'turn' }` and the turn has moved on.

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
minigame: MinigameState | null   // { id, state, elapsed, kv, steps }
```

The [minigame](/docs/reference/minigames) being played, or `null`. See [`MinigameState`](/docs/reference/minigames#minigamestate). A save from before minigames loads with `null`. The field was added with a load default and no new save version, because nothing a save already has changes shape.


### flow

```ts
flow: FlowState | null   // { scene, path, waiting }
```

The open scene's visit of its [flow](/docs/reference/flows): each pick, jump and minigame or panel passed, in order, and what the flow is waiting on. It's `null` with no scene open, and for a visit with nothing to keep, such as one of a scene with no decisions. Entering a scene sets it back to `null`. See [`FlowState`](/docs/reference/flows#stateflow). A save from before flowing scenes loads with `null`. Like `minigame`, the field came with a load default and nothing a save had changed shape for it.
### panel

```ts
panel: OpenPanel | null   // { panel: 'shop', with: { vendor: 'counter' } }
```

The [panel](/docs/reference/panels) open over the story, with what it was opened with, or `null`. A [`panel` effect](/docs/reference/effects#panel) sets it and the [`closePanel`](/docs/reference/commands#closepanel) command clears it. [`view.panel`](/docs/reference/view#panel) reads it. A save from before panels loads with `null`. Like `minigame`, the field came with a load default and no new save version.

### rolls

```ts
rolls: RollsState   // { made: 3, last: [/* this command's */], latest: { skim: { /* ... */ } } }
```

The [dice rolls](/docs/reference/rolls) the save has made. `made` counts every roll, and is part of each new roll's seed. `last` holds the rolls the last command made, which [`view.rolls`](/docs/reference/view#rolls) shows. `latest` keeps the latest roll under each key for the [`roll` condition](/docs/reference/conditions#roll). See [`RollsState`](/docs/reference/rolls#rollsstate). A save from before dice loads with `{ made: 0, last: [], latest: {} }`. Like `minigame`, the field came with a load default and no new save version.

### timers

```ts
timers: Record<string, RunningTimer>   // { phone: { left: 4200, total: 10000 } }
```

The [timers](/docs/reference/timers) running now, by id, in the order they started. Each keeps only the milliseconds `left` and the `total` it was started with (which adding time can raise). What a timer does when it runs out stays in the game's `timers`, read when it runs out, so a save stays small and an update to a timer's effects reaches saves already running it. See [`RunningTimer`](/docs/reference/timers#runningtimer). A save from before timers loads with `{}`. Like `minigame`, the field came with a load default and no new save version.

### changes

```ts
changes: Change[]   // [{ stat: 'coins', from: 10, to: 40, by: 30, label: 'Coins', text: '+30 coins' }]
```

The stats the last command moved, the player's and those kept on entities, for [`view.changes`](/docs/reference/view#changes). A `tick` that moved nothing leaves it as it was, and any other command replaces it. See [Changes](/docs/reference/changes). A save from before version 24 loads with `[]`.

## New Game+

When a player finishes your game, you can let them start again with some of what they had. List what carries over in your content's `carryOver`, and say when the game counts as finished with its `finished`:

```ts
import type { Content } from '@ifloom/engine'

export const ending: Content = {
  // Finished once the letter is read and the bakery's last scene has been seen.
  finished: { all: [{ kv: 'readTheLetter' }, { seen: 'bakery.ending' }] },
  carryOver: { stats: ['coins'], kv: ['readTheLetter'], held: ['clothing:umbrella'] },
}
```

The [runner](/docs/reference/runner#finished) watches `finished`. After each command that takes, if the condition holds and the [profile](/docs/reference/profile) has no `core:finished` yet, it records `{ at }`, the time in milliseconds. A title screen checks it to decide whether to offer New Game+:

```ts
const done = await runner.profile?.get<{ at: number }>('core:finished')
if (done) await runner.newGame({ carry: runner.state })
```

```ts
type CarryOver = {
  stats?: string[]
  kv?: string[]
  held?: string[] | 'all'
}
```

`startingState(game, { carry })` builds the new game as usual, then copies from `carry`:

- each player stat in `carryOver.stats`, held to its range
- each key of the [kv store](#kv) in `carryOver.kv` that is set
- how many the player held of each thing in `carryOver.held`, by reference, or of everything the player held with `held: 'all'`

A thing the player made in play, such as a photo, comes with its record, so it's still there. With `'all'`, something the new game would start the player with that they no longer had is 0. Nothing else comes across. The turn, scenes seen, storylines, other entities, what other holders hold and plugin states all start fresh. Keys passed in `kv` are written after the carried ones, so they win. A game with no `carryOver` carries nothing.

**Gotcha.** Carry from the state the player finished on. If you start the New Game+ from a title screen after a reload, load the save first, or keep that state yourself. The profile records only when the game was finished, not the state.

The [content checker](/docs/reference/checks) reports a stat in `carryOver` that the game doesn't declare, a stat that belongs to a kind rather than the player, and a thing in `held` that isn't written `kind:id` or whose kind the game doesn't declare.

## Constants

### SAVE_VERSION

```ts
const SAVE_VERSION = 24
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
| 13 | Moved the timed-effects plugin's state from `plugins.effects` to `plugins.statuses`, its new name. |
| 14 | Keyed [`chosen`](#chosen) by `scene#choice`. |
| 15 | Made each record in [`entities`](#entities) keep only what play changed. |
| 16 | Took out `items` and `collections`: the player's items are counts in [`held`](#held), and collection entries are entities made in play that the player holds. |
| 17 | Took out `transition`, which a `transition` effect set. How a screen comes in is the UI's now, from [presentation hints](/docs/reference/ui-hints). |
| 18 | Made [`seen`](#seen) and [`chosen`](#chosen) one [`Times`](#times) record per id, in place of `seenOn`, `lastSeenOn`, `chosenOn` and `lastChosenOn`, and dropped the `turn:` kv keys that capped a choice's `once`. |
| 19 | Moved `phase` into the [kv store](#kv), as the key `phase`. |
| 20 | Renamed a running [minigame](#minigame)'s `vars` to `kv`. |
| 21 | Made a [notice](#notices)'s `text` its words, not a prose key. |
| 22 | Renamed what an entity made in play was given as `desc` to `description`. |
| 23 | Kept a [pool pick](/docs/reference/media#remembered-picks) for a layered picture's layer under the slot `picture:<index>`, not `stage:<index>`. |
| 24 | Added [`changes`](#changes), the stats the last command moved. Its step gives an older save an empty list. |

The versions that only added a field (4, 7, 9, 10 and 11) are from before the rule above. Version 24 also only added one, with a step as well as a load default. A field added now usually gets a load default and no new version.

## See it in an example

- The Letter: [`examples/novel/src/story/ch3.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/story/ch3.ts) declares `finished` and `carryOver: { kv: ['readBefore'] }` for New Game+, and the first chapter, [`examples/novel/src/story/ch1.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/story/ch1.ts), has a line only a second read shows. The test `counts as finished at either ending, and a New Game+ remembers the first read` in [`examples/novel/tests/novel.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/tests/novel.test.ts) plays it.
- Small Town: `probes` in [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) makes its states by playing, with [`probe`](/docs/cli#probe): commands and effects from the start state, never the state's fields by hand.
