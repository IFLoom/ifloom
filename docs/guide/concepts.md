# Core concepts

This page is the mental model. Each section is short and links to the reference page that has the details.

## The state is one plain object

Everything about a game in progress lives in one `GameState`: the turn, the scene on screen, the game's stats, variables, items, each entity's numbers (a [cast](/plugins/cast) character's friendship among them), whether each storyline is open, and each plugin's own state — the calendar's day and period, the [places plugin](/plugins/places)'s idea of where the player is. It holds no functions and no class instances, so it serialises to JSON as it is. The state *is* the save.

The engine never changes a state in place. Every command returns a new one, so keeping the previous state is all an undo needs — and the [runner](#the-runner-drives-the-game) keeps them for you.

See [Game state](/reference/state).

## Commands go through `apply`

The player changes the world only through commands: `choose`, `activity`, `leave`, a plugin's own (the places plugin's `go('cafe')`, the calendar's `sleep()`, the cast's `talk('ruth')`), and a few more. `apply(state, game, command)` returns the next state, whether the command took (`ok`), and if not, why (`refused`). A refused command returns the state unchanged.

`dispatch` is the same call returning only the state. Use `apply` wherever the answer matters: a refusal and a command that changed nothing leave identical states behind.

See [Commands](/reference/commands).

## Effects and conditions are data

What a choice *does* is a list of effects; when something *applies* is a condition. Both are plain objects:

```ts
// effects
[{ kind: 'stat', key: 'friendship', by: 5, of: 'character:ruth' }, { kind: 'stat', key: 'coins', by: -3 }]

// a condition
{ all: [{ 'places/at': ['cafe'] }, { 'cast/here': ['ruth'] }, { stat: 'friendship', of: 'character:ruth', gte: 10 }] }
```

Because they are data rather than functions, the engine can check them — an effect that names a storyline nobody declared is caught before anyone plays — and a mod can add to them without shipping code. A plugin's conditions and effects are data too, named by the plugin's id (`places/at` and `cast/here` above). When a test genuinely needs code, a condition can name a [custom function](/reference/custom) the game declares.

See [Effects](/reference/effects) and [Conditions](/reference/conditions).

## The game and the rules

The **game** is your content: items, scenes, activities, stats and storylines, and the content its plugins read, such as the places plugin's locations and the cast plugin's characters. The engine knows none of them by name; it reads them from the game.

Some of a game is logic rather than content: what happens at the end of a turn, what the player cannot do yet, what a stat change does. Those are **rules** — optional hooks on `game.rules` that the engine calls at fixed moments. Leave a hook out and the engine does the plain thing.

See [The game](/reference/game) and [Rules and hooks](/reference/rules).

## The view is what a UI renders

`view(state, game)` turns the state into a view: the scene on screen with its body already split into beats, the choices, the buttons on offer, the clock, and each plugin's own slice (the places plugin's exits, the cast plugin's people in the room). Every button carries the command it sends, and a button that cannot be pressed carries the reason.

An activity's requirements, a place's `locked` reasons and a lock's reason are each written once, and both `apply` and `view` read them, so the greyed-out button and the refusal say the same thing. Your UI renders the view and dispatches commands; it never needs to read the state directly.

See [The view](/reference/view).

## Time

The engine has one clock for dating things: the **turn**, `state.turn`, 0 in a new game. What a turn is belongs to the game — a day, a chapter, a week. Everything the engine dates is dated in turns: when a scene was first seen, when a trigger last fired, when a collection entry or notice arrived, how long a storyline stays closed.

At the end of a turn the counter goes up by one, the variables the game marked as `resets` are put back, and the game's turn rules run — which is where a game that has energy fills it back up. One thing ends a turn: the `turn` effect, `{ kind: 'turn' }`. A novel in chapters ends one per chapter. See [Shapes of game](/guide/shapes).

The engine keeps no time of day. Days, the periods of a day and the weekday come from the [calendar plugin](/plugins/calendar), `@ifloom/plugin-calendar`, for a game that keeps one. With its defaults a day has five periods — `morning`, `afternoon`, `evening`, `night` and `late` — and a turn is a day. Activities and choices pass periods with its `calendar/pass` effect, the player goes to bed from the evening on with its `sleep` command, and passing a day's end ends a turn. By default it warns against anything that would run past dawn, and the game can say when that holds.

The calendar's conditions — `period(...)`, `weekday(...)`, `day(...)` — go anywhere a condition does: in a place's `locked` list, so a café shuts in the evening, and in a [cast](/plugins/cast) character's schedule, so a baker goes home, without anyone writing either as an event.

See [Calendar](/plugins/calendar), [Game state: turn](/reference/state#turn) and [Cast](/plugins/cast#where-people-are).

## Storylines and relationships

A storyline is a thread of the story: it has its own variables, and can be closed for a number of turns, with `{ storyline: 'ruth' }` true while it is open. Storylines run side by side; the player advances whichever one they spend time on.

How well the player knows someone is not the engine's: it is a [stat](/reference/stats#entity-stats) the game declares on the [cast](/plugins/cast)'s characters, such as `{ id: 'friendship', label: 'Friendship', of: 'character' }`, so each of them keeps their own. A character can belong to a storyline, and while it is closed they will not talk.

The engine also records which scenes the player has seen, and on what turn. That lets a storyline's stages come in order — "not until the scene before this one" — and at a pace — "not until three turns after it".

See [Storylines](/reference/world) and [Progress and limits](/reference/progress).

## Locks

A lock says what the player cannot do for now, and why: while a condition holds, these commands are refused with this line. An intro that keeps the player in one room, or a first morning that only lets them go to work, is a lock rather than special code. The reducer refuses on the first lock that matches, and the view greys the button out with the same line.

See [Locks](/reference/locks).

## Determinism and seeds

Nothing in the engine is random at runtime. Each save has a seed, and every draw — which variant of a line, whether something happens today — is hashed from the seed, a name for the draw and what it is keyed on, such as the turn and the period for a variant line. The same save on the same turn deals the same cards.

That is what makes undo honest (stepping back and trying again does not re-roll), and what lets a scripted playtest or a snapshot test give the same result every run. Draw your own values the same way, with `roll`, `pick` and `chance`, one named draw per value.

See [Randomness](/reference/random).

## The runner drives the game

`apply`, `view` and the state are all a game needs, but every UI ends up wanting the same things around them: undo, a backlog of what was said, saving and autosave, a log to replay a bug from. `createRunner(game, state, options)` is that one object. The UI sends commands to `runner.apply`, draws `runner.view()`, and subscribes to hear when to draw again.

Undo, the backlog and autosave are off until the game turns them on. Undo never goes back past a barrier the game sets — a new turn, a choice marked irreversible, a condition — and the command log is always kept, because the engine is deterministic: the start state and the commands replay to the same state every time.

See [The runner](/reference/runner).

## Saves and migrations

A save is a snapshot of the state, with what it says about itself for a load screen: when and where it was (the turn, or the plugins' label: the calendar's day and the places plugin's place), the time played, the packs it was made with. `saves(game, driver)` keeps one game's saves in named slots — `'auto'`, `'quick'`, `'1'` — under keys that carry the game's id.

Where they are kept is the **driver**: `localStorage`, IndexedDB, memory for tests, or one you write for a desktop wrapper. The game chooses; the engine has no default.

Each save carries a version. When the state's shape changes, the engine adds a migration step from the old version and old saves are carried forward on load; a save with no route to the current version is refused rather than misread. The format is pre-release and at version 6; older saves are carried forward step by step.

See [Saves](/reference/saves).

## Loading content and mods

Content can arrive as ordered **packs** that are merged into one game, with problems reported by the pack that caused them. Core content is simply the first pack; a mod is another one after it.

A player can add a mod to a built game as a file, which the game keeps and loads over its own content at start-up. See [Loading and mods](/reference/loader) and [Mods](/reference/mods).
