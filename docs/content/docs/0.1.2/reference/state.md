---
title: "Game state"
description: "GameState, field by field, the one plain object that holds a game in progress and is its save."
---
`GameState` is one game in progress, a plain object that serialises to JSON and is the save. [Commands](/docs/0.1.2/reference/commands) take one state and return the next, and nothing else in the engine holds state. [State, commands and the view](/docs/0.1.2/explanation/state-and-commands) explains why, and [Run a game in code](/docs/0.1.2/how-to/run-a-game-in-code) shows a state changing command by command.

In the showcase: `examples/showcase/src/game.ts`, whose `probes` make states by playing.

```ts
import type { CarryOver, GameState, Stats, Times } from '@ifloom/engine'
```

## GameState

The whole save, as plain data with no functions and no class instances. Every field is in [`GameState`](/docs/0.1.2/api/engine#gamestate).

The state keeps only what play changed. The engine reads every definition (a scene's words, an entity's name, a stat's range) from the [game](/docs/0.1.2/reference/game#game), so a state stays small and an update to the content reaches saves already in play. Treat a state as read-only, and change it only through [commands](/docs/0.1.2/reference/commands) and [effects](/docs/0.1.2/reference/effects). [`startingState`](/docs/0.1.2/reference/commands#startingstate) makes a new one, and [`loadState`](/docs/0.1.2/reference/saves#loadstate) brings one in from a save.

A UI reads the [view](/docs/0.1.2/reference/view#view) rather than the state. A test or the game's own [`rules`](/docs/0.1.2/reference/rules) read the state through the engine's lookups, which fall back to content:

```ts given
import { ownedCount, statValue } from '@ifloom/engine'

state.turn                                  // 3
state.kv.phase                              // 'open'
statValue(state, game, 'coins')             // 12
ownedCount(state, game, 'item:sandwich')    // 1, with a plugin that keeps things
```

### version

The save format, always [`SAVE_VERSION`](/docs/0.1.2/reference/saves#save_version). `loadState` carries an older save forward when it loads.

### gameVersion

The game's own [version](/docs/0.1.2/reference/game#game) the state is at, present only in a game that declares `version`. A state without it is at version 1. The game's [`migrations`](/docs/0.1.2/reference/rules#migrations) carry it forward.

### seed

The save's seed, fixed for its life, which every random [draw](/docs/0.1.2/reference/random) mixes in. A new game takes the `seed` given to [`startingState`](/docs/0.1.2/reference/commands#startingstate) or the [`start`](/docs/0.1.2/reference/commands#start) command. Without one, the seed is a hash of the game's id, so every new game started without one draws the same. A UI passes a fresh seed for each new game.

### turn

The number of turns that have passed, from 0 in a new game. The turn is the engine's only clock, and the game decides how long one is. A [`turn`](/docs/0.1.2/reference/effects#turn) effect ends a turn, from a choice, an action or a plugin. The [calendar plugin](/docs/0.1.2/reference/plugins/calendar) ends turns as time passes and as the player sleeps, so with it a turn is a period, a day or a week.

The engine dates everything in turns: [`seen`](#seen), [`chosen`](#chosen), [`fired`](#fired), [notices](#notices) and a storyline's [`closedUntil`](#storylines). [`{ turn }`](/docs/0.1.2/reference/conditions#turn) reads it. [Turns, scenes and the room](/docs/0.1.2/explanation/turns-and-time) explains the turn.

### sceneId

The id of the scene on screen, or `null` for the room. A new game starts on the content's `introScene`, or `null` without one. While a scene is open, actions and opening another scene are refused with the [`finishFirst`](/docs/0.1.2/reference/strings#refusals) string, "Finish this first.", and so are plugin commands that check for an open scene, such as the places plugin's `places/go`.

### seen

Each scene the player has entered, by id, as a [`Times`](#times). `{ 'ava.hi': { n: 3, first: 1, last: 6 } }` is a scene entered three times, first on turn 1 and last on turn 6.

The engine counts a scene once per command, for the scene the command leaves on screen, so a scene that renders again after a choice isn't a new visit. The intro scene starts at `{ n: 1, first: 0, last: 0 }`, and a game without one starts with nothing seen. [`{ seen }`](/docs/0.1.2/reference/conditions#seen) reads the count and [`{ since }`](/docs/0.1.2/reference/conditions#since) the turns.

### chosen

Each choice the player has chosen, keyed `scene#choice`, as a [`Times`](#times), such as `{ 'cafe.counter#buy-bread': { n: 2, first: 3, last: 5 } }`. An action with `once` is kept here under its id.

The [`choose`](/docs/0.1.2/reference/commands#choose) command counts a choice on the turn it was chosen, before the choice's effects run, so a choice that ends the turn is dated the turn it was chosen in. Content can branch on an earlier decision without the choice setting a kv key. [`{ chose }`](/docs/0.1.2/reference/conditions#chose) reads the count, and a choice's [`once`](/docs/0.1.2/reference/actions#once) reads `last`.

### stats

The player's value of each [stat](/docs/0.1.2/reference/stats) the game declares, as a [`Stats`](/docs/0.1.2/api/engine#stats) record keyed by [`StatKey`](/docs/0.1.2/reference/common#statkey). A new game starts each stat at its `start`, and a game that declares no stats has `{}`.

Every effect, cost and payment that changes a stat keeps it within the stat's range. The engine has no stat of its own, so a game declares coins or energy as stats. A stat declared `of` a kind lives on each entity in [`entities`](#entities), and a [derived stat](/docs/0.1.2/reference/stats#formula) isn't kept at all. Read a stat with [`statValue`](/docs/0.1.2/reference/stats#statvalue), which works out a derived one and falls back to `start`.

### entities

The changes play has made to the game's [entities](/docs/0.1.2/reference/entities), by kind and then id, as in `state.entities.staff.ana`. Each is an [`EntityState`](/docs/0.1.2/reference/entities#entitystate) holding only the changes, such as stats, kv keys and a trait's state.

A declared entity has no record until something changes it, so a new game starts with `{}`. An entity [created](/docs/0.1.2/reference/effects#create) in play keeps what it was given (its name, the entity it was made `like`, tags and trait data). A trait's data is content and never kept here. Read entities with [`entitiesOf`](/docs/0.1.2/reference/entities#entitiesof), [`statValue`](/docs/0.1.2/reference/stats#statvalue) and [`entityKv`](/docs/0.1.2/reference/entities#entitykv), which fall back to content.

### you

The [protagonist](/docs/0.1.2/reference/glossary#you) the player is playing, a unique entity's reference, or `null` for the player. The [`you`](/docs/0.1.2/reference/effects#you) effect sets it, and `'you'` in an `of`, a `to` or a `from` reads it. A new game starts with `null`, and a game with one protagonist never changes it.

### created

For each kind, the last number given to an entity created in play without an id of its own, as in `{ staff: 2 }` after `#1` and `#2`. The next one gets one more, so a number is never given twice. A new game starts with `{}`.

### removed

The declared entities [removed](/docs/0.1.2/reference/effects#remove) in play, as references in the order they went, such as `['staff:ben']`. A declared entity is in the game unless it's here, so an entity a mod or an update adds appears in a save already in play, and one that left stays gone. An entity created in play is never recorded here. A new game starts with `[]`.

### storylines

One [`StorylineState`](/docs/0.1.2/reference/storylines#storylinestate) per storyline the game declares, with whether it's closed, until which turn, and its own kv store. Reading a storyline the save lacks gives an open one with nothing set. A storyline keeps no score of how well someone likes the player, which a game keeps as a stat on its characters.

### kv

The player's [kv store](/docs/0.1.2/reference/glossary#kv), keys with a [`KvValue`](/docs/0.1.2/reference/common#kvvalue) such as `metAva: true`, `visits: 3` or `playerName: 'Robin'`. Keys need no declaring, and a key nobody has set reads as 0.

A new game starts with the content's `kv`, with the `kv` given to [`startingState`](/docs/0.1.2/reference/commands#startingstate) over it. The [`kv`](/docs/0.1.2/reference/effects#kv) effect and [inputs](/docs/0.1.2/reference/inputs) set keys, and the content's [`resets`](/docs/0.1.2/reference/rules#resets) put some back each turn. [`{ kv }`](/docs/0.1.2/reference/conditions#kv) reads a key, and so does a `{{name}}` [token](/docs/0.1.2/reference/prose#tokens) in prose. Each storyline, each entity and a running minigame keep a kv store of their own.

The engine keeps no player name. A game that asks for one keeps it under a key such as `playerName`, and names its saves after it with [`saveName`](/docs/0.1.2/reference/rules#savename).

The engine writes keys with two prefixes itself, so a game's own keys avoid them:

- `variants:<name>` counts how often a set of [variants](/docs/0.1.2/reference/prose#variantmember) has been drawn.
- `storylet:<name>` counts how often a set of [storylets](/docs/0.1.2/reference/storylets) has been drawn from.

#### phase

The stretch of the game the player is in, such as `'arrival'` or `'open'`, is the kv key `phase`. The game names the stretches and the engine gives them no meaning. Content gives a new game its first one in `kv: { phase: 'arrival' }`, sets it with `{ kv: 'phase', to: 'open' }` and reads it with `{ kv: 'phase', is: ['arrival'] }`, as [locks](/docs/0.1.2/reference/locks) do.

### notices

The [notices](/docs/0.1.2/reference/notices) the game has raised outside scenes, oldest first, the last 50 kept. The [`notify`](/docs/0.1.2/reference/effects#notify) effect raises one and the [`dismiss`](/docs/0.1.2/reference/commands#dismiss) command marks one seen.

### fired

The [turn](#turn) each [trigger](/docs/0.1.2/reference/triggers) last fired, by trigger id. A trigger with an entry here doesn't fire again, unless it's `once: { per: 'turn' }` and the turn has moved on.

### plugins

Each [plugin](/docs/0.1.2/reference/plugins)'s own state, by plugin id, as a [`PluginSlice`](/docs/0.1.2/reference/plugin-migrations) of the state and the version of its shape. `startingState` fills it from each plugin's `start`, and a plugin with no state has no entry. The calendar's day, the places plugin's location (`{ at: 'flat' }`) and who has what in the inventory or the wardrobe are here, not in the core's fields.

A plugin reads and writes its own entry through its context's `slice` and `set`, and other code through [`definePlugin`](/docs/0.1.2/reference/plugin-api#defineplugin)'s `read` and `write`. A save keeps the entry of a plugin the game no longer has, untouched.

### settings

The value of each `play` [setting](/docs/0.1.2/reference/settings) the game declares, by id, such as `{ hints: true, difficulty: 'usual' }`. A `ui` setting is never here. A new game takes the `settings` given to `startingState`, and each setting given none starts at its default. The [`setting`](/docs/0.1.2/reference/commands#setting) command changes one, and [`{ setting }`](/docs/0.1.2/reference/conditions#setting) reads it.

### audio

The music and sounds the save has started, as an [`AudioState`](/docs/0.1.2/reference/audio#audiostate): what [`audio`](/docs/0.1.2/reference/effects#audio) effects put on channels, the last 20 [`sound`](/docs/0.1.2/reference/effects#sound) effects, and what each background channel started playing. It keeps [`view.audio`](/docs/0.1.2/reference/audio#audioview) the same after a reload.

### media

The file each picture [pool](/docs/0.1.2/reference/media#pools) request was given, by pick key, as a [`MediaState`](/docs/0.1.2/reference/media#mediastate). The reducer adds a pick the first time the screen asks for one, so a revisit and a reload show the same file.

### minigame

The [minigame](/docs/0.1.2/reference/minigames) being played, as a [`MinigameState`](/docs/0.1.2/reference/minigames#minigamestate), or `null`.

### flow

The open scene's visit of its [flow](/docs/0.1.2/reference/flows), as a [`FlowState`](/docs/0.1.2/reference/flows#flowstate): each choice, jump, minigame and panel passed, in order, and what the flow waits on. It's `null` with no scene open and for a visit with nothing to keep. Entering a scene sets it back to `null`.

### panel

The [panel](/docs/0.1.2/reference/panels) open over the story, as an [`OpenPanel`](/docs/0.1.2/reference/panels#openpanel) such as `{ panel: 'shop', with: { vendor: 'counter' } }`, or `null`. A [`panel`](/docs/0.1.2/reference/effects#panel) effect sets it and the [`closePanel`](/docs/0.1.2/reference/commands#closepanel) command clears it.

### rolls

The [dice rolls](/docs/0.1.2/reference/rolls) the save has made, as a [`RollsState`](/docs/0.1.2/reference/rolls#rollsstate). `made` counts every roll and seeds the next, `last` holds the last command's rolls for [`view.rolls`](/docs/0.1.2/reference/rolls), and `latest` keeps the latest roll under each key for the [`roll`](/docs/0.1.2/reference/conditions#roll) condition.

### timers

The [timers](/docs/0.1.2/reference/timers) running now, by id, in the order they started, each a [`RunningTimer`](/docs/0.1.2/reference/timers#runningtimer) of the milliseconds `left` and its `total`. A timer's effects stay in the game's `timers`, read when it runs out, so an update to them reaches saves already running the timer.

### changes

The stats the last command moved, the player's and the entities', as [`Change`](/docs/0.1.2/reference/changes#change) entries for [`view.changes`](/docs/0.1.2/reference/changes). A `tick` that moved nothing leaves it as it was, and any other command replaces it.

## Times

The number of times something happened, as `n`, and the [turn](#turn) of the first time and the last. Every field is in [`Times`](/docs/0.1.2/api/engine#times). [`seen`](#seen) keeps one for each scene, and [`chosen`](#chosen) one for each choice.

## CarryOver

The list of what the content's `carryOver` copies from a finished game into a New Game+: player stats and kv keys. Every field is in [`CarryOver`](/docs/0.1.2/api/engine#carryover).

`startingState(game, { carry })` builds a new game, then copies from `carry` each player stat in `stats`, held to its range, and each kv key in `kv` that is set. Then each plugin with a [`carry`](/docs/0.1.2/reference/plugin-api#carry) carries what it keeps, such as the things the inventory's `carryOver` option lists. Keys passed to `startingState` in `kv` are written after the carried ones, so they win.

The turn, the scenes seen, the storylines, the entities and the state of every plugin without a `carry` all start fresh. A game with no `carryOver` carries no stats or kv keys.

```ts
import type { Content } from '@ifloom/engine'

export const ending: Content = {
  finished: { all: [{ kv: 'readTheLetter' }, { seen: 'ava.river' }] },
  carryOver: { stats: ['coins'], kv: ['readTheLetter'] },
}
```

The [content checker](/docs/0.1.2/reference/checks) reports a stat the game doesn't declare or that belongs to a kind. [Offer New Game+](/docs/0.1.2/how-to/offer-new-game-plus) shows the title screen's side.

## Caveats

- A New Game+ carries from the state the player finished on. The [profile](/docs/0.1.2/reference/profile) records only when the game was finished, so a title screen that starts one after a reload loads the save first.
- Most entity values aren't in the state until play changes them. Reading `state.entities` directly misses what content declares, and so does reading a receiver's state for what content starts someone with.
- Time of day, the player's location and characters' whereabouts aren't core fields. The plugins that add them keep them in [`plugins`](#plugins).
