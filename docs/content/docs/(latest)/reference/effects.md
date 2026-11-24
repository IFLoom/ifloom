---
title: "Effects"
description: "Every effect: stats, kv, scenes and storylet draws, entities and what holds them, each, turns, notices, audio, minigames, timers, and calls to a plugin or the game."
---
An effect is one change to the [state](/docs/reference/state), written as data. Choices, actions, triggers and the end of a turn all carry lists of them, and so can a plugin's content, such as a thing's use in the inventory.

```ts
import type { Effect } from '@ifloom/engine'

const effects: Effect[] = [
  { stat: 'coins', by: -4 },
  { entity: 'item:sandwich', by: 1 },
  { kv: 'boughtLunch', of: 'storyline:ava', to: true },
]
```

## How a list runs

Effects apply in order, each to the state the one before it left. An effect that can't apply does nothing and the rest still run, so an effect never refuses a command. The command around it can refuse first, though. For example, a plugin guard can refuse a choice before any of its effects run, as the [calendar](/docs/plugins/calendar#the-guard) does for one that would pass time past dawn. See [`choose`](/docs/reference/commands#choose).

Each effect is told apart by its key, as a [condition](/docs/reference/conditions) is. `{ stat: 'coins', by: -4 }` changes a stat and `{ scene: null }` closes the scene: the key says what changes and holds the target, and the other fields say how. An effect with no key the engine knows does nothing, and so does one with two, such as `{ stat: 'coins', kv: 'met', by: 1 }`. The [content checker](/docs/reference/checks#in-an-effect) reports both. A key with a `/` in it is a call to a plugin's effect or the game's own, as in `{ 'quests/start': { quest: 'letter' } }`.

## applyEffects

```ts shape
function applyEffects(state: GameState, game: Game, effects: readonly EffectRef[]): GameState
```

Runs a list of effects against a state and returns the new state, without a command around it. Nothing is refused, no turn ends unless an effect ends one, and no scene is counted as seen. It's useful in tests and tools, for example to put the player in a scene or give them coins, and in one of the game's own effects that wants to see where its own list leads.

```ts given
import { applyEffects } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

const next = applyEffects(state, game, [
  { stat: 'coins', by: 5 },
  { scene: 'ava.hi' },
  quests.start('bread'),
])
```

It takes effects as content writes them, so a plugin's helper such as `quests.start('bread')` goes straight in. A call to a plugin's effect or the game's own runs in its turn, as it does in content. A call to an effect the game doesn't have, such as one from a plugin it leaves out, is skipped, as a plugin's `context.apply` skips it.

## Effect

An effect's key names what it changes (`stat`, `kv`, `entity`, `scene`, `timer` and so on) and holds the target. `by` changes a number, `to` sets a value, and `of` says whose it is when it isn't the player's.

```ts shape
type Effect =
  | { stat: StatKey; by: Amount; of?: string }
  | { stat: StatKey; to: Amount; of?: string }
  | { kv: string; to: KvValue; of?: string }
  | { kv: string; by: Amount; of?: string }
  | { kv: string; random: [Amount, Amount]; of?: string }
  | { create: string; like?: string; with?: CreatedEntity; at?: Placement }
  | { remove: string }
  | { each: string | Select; where?: Condition; effects: Effect[] }
  | { entity: string; at?: string; by: Amount }
  | { entity: string; at?: string; to: Amount }
  | { move: string; from?: string; to: string; by?: Amount }
  | { you: string | null }
  | { scene: string | null | { from: string; otherwise?: string } }
  | { closeStoryline: string; turns: number }
  | { turn: true | { by: number } }
  | { notify: string; text?: string; image?: string; tag?: string; id?: string }
  | { audio: string; to?: string | null }
  | { sound: string }
  | { minigame: string }
  | { timer: string; to?: number | null }
  | { timer: string; by: number }
  | { roll: string; dice: Dice; plus?: Amount; against?: Amount }
  | { panel: string | null; with?: Record<string, unknown> }
  | { point: string }
  | EffectCall
```

An [`EffectCall`](/docs/reference/plugins#conditioncall-effectcall-and-commandcall) is a call by name, `{ 'calendar/pass': { by: 2 } }`, to a plugin's effect or the game's own, as a [`PluginCall`](/docs/reference/custom#plugincall), checked in code against what the plugin declares.

Where an effect takes an [`Amount`](/docs/reference/amounts#amount), it can be a number or a number worked out as the effect applies, such as another stat: `{ stat: 'coins', by: { scale: 'rent', by: -1 } }` pays the rent, whatever it is this week.

Conditions use the same keys, so `{ stat: 'coins', gte: 4 }` asks about what `{ stat: 'coins', by: -4 }` changes. Which one an object is depends on where it's written: in `when` it's a condition, in `effects` an effect.

Each effect is told apart by its key: `stat`, `kv`, `create`, `remove`, `each`, `entity`, `move`, `you`, `scene`, `closeStoryline`, `turn`, `notify`, `audio`, `sound`, `minigame`, `timer`, `roll`, `panel` or `point`. Narrow an `Effect` by one with `in`: inside `if ('stat' in effect)`, `effect.stat` is the stat's key.

### stat

```ts fragment
{ stat: 'fitness', by: 1 }
{ stat: 'energy', to: 100 }
```

Adds `by` to a stat, or puts it `to` a value, held to the stat's declared `min` and [`max`](/docs/reference/stats#statdef) (0 to 100 unless it says otherwise). Spending and earning both use this effect, because coins, energy and every other number are [declared stats](/docs/reference/stats). Afterwards [`rules.onStat`](/docs/reference/rules#onstat) sees the before and after, and can veto or add to the change. `stat` must be a [declared stat](/docs/reference/stats).

A [derived stat](/docs/reference/stats#derived-stats) is never written, so a `stat` effect on one does nothing, and the loader reports it. The effect adds to the value the save keeps, which is 0 for a stat the save doesn't have yet, such as one added in an update. See [Filling new content](/docs/reference/saves#filling-new-content).

**Gotcha.** A `stat` effect never refuses. Spending 4 coins the player doesn't have leaves them at the stat's `min` rather than stopping the choice. Check `{ stat: 'coins', gte: 4 }` first, or use an action's [cost](/docs/reference/actions#actioncost), which refuses.

#### An entity's stat

```ts fragment
{ stat: 'quality', by: 1, of: 'dish:soup' }
{ each: 'staff', effects: [{ stat: 'morale', by: -8, of: '$' }] }
```

With `of`, the stat belongs to an [entity](/docs/reference/entities). `of` is an [entity reference](/docs/reference/entities#entityref) such as `'staff:ana'`, or `'$'` inside an [`each`](#each). The value is held to the stat's range as the player's would be. If the entity isn't there, the effect does nothing. `rules.onStat` isn't called, because it only runs for the player's stats. A negative amount here is never part of a button's [price](/docs/reference/view#price), even on a spendable stat.

**Gotcha.** At run time, nothing stops a `stat` effect from naming the player's `coins` with `of: 'staff:ana'`. It gives Ana a `coins` of her own, which nothing shows. The [content checker](/docs/reference/checks) reports a stat named on the wrong owner, so run it.

#### Setting a stat

```ts
// In rules.onTurn, through apply: wake up with a full tank, whatever the ceiling is today.
effects: [{ stat: 'energy', to: 9999 }]
```

With `to` in place of `by`, the stat is set to `to`, held to its declared range. Use it for energy back to full overnight, or a mood reset at the start of a day. [`rules.onStat`](/docs/reference/rules#onstat) is called as for `by`, with `by` being the change it made (`to` held to range, minus the value before). With `of`, it sets an [entity](/docs/reference/entities)'s stat: `{ stat: 'morale', to: 80, of: 'staff:ana' }`.

### Calls

```ts fragment
{ 'loyalty/stamp': true }
{ 'quests/start': { quest: 'letter' } }
{ 'game/payRent': { by: 2 } }
```

Runs a [plugin](/docs/reference/plugins)'s effect by its full name, or one of the game's own [effects in `rules`](#computed-effects) with `game/` in front, on the state the effects before it left. The name is the only key, and its value is the arguments, or `true` for none. A name that neither the game nor its plugins has does nothing. See [`PluginCall`](/docs/reference/custom#plugincall).

**Gotcha.** The [content checker](/docs/reference/checks) checks the name wherever the effect is data, as `no game effect named "…"` or `no plugin effect named "…"`. [`rules.onTurn`](/docs/reference/rules#onturn) is a function, so nothing checks a name it applies, and a typo there silently does nothing.

### kv

```ts fragment
{ kv: 'hadCoffee', to: true }
{ kv: 'coffeesBought', by: 1 }
```

Sets a key in the [kv store](/docs/reference/state#kv) `to` a value, or changes its number `by` an amount. A key that isn't a number yet (unset, text or `true`) counts as 0, so the first `by: 1` makes it 1. Test a count with a [range](/docs/reference/conditions#kv), such as `{ kv: 'coffeesBought', gte: 3 }`.

`by` is an [`Amount`](/docs/reference/amounts#amount), so `{ kv: 'savings', by: { stat: 'wage' } }` adds the wage. `to` is set as written, since text there is a value, not a stat's id.

With `random`, it's set to a whole number drawn between the two ends, both included: `{ kv: 'arrow', random: [1, 4] }`. Each end can be an amount too. The draw comes from the save's seed, so the same commands draw the same number every time.

#### Whose key it is

```ts fragment
{ kv: 'role', to: 'cook', of: 'staff:ana' }
{ kv: 'visits', by: 1, of: 'storyline:ava' }
{ kv: 'score', by: 1, of: 'minigame' }
```

Without `of`, the key is the player's. `of` names another kv store, the same way the [`kv` condition](/docs/reference/conditions#kv) reads it:

- **An [entity](/docs/reference/entities)**, as in `of: 'staff:ana'`, or `of: '$'` inside an [`each`](#each). If the entity isn't there, the effect does nothing.
- **A [storyline](/docs/reference/storylines)**, as in `of: 'storyline:ava'`, its own kv store. A storyline doesn't keep score of how well someone likes the player. Keep that as a stat on the [cast](/docs/plugins/cast#each-one-is-an-entity)'s characters: `{ stat: 'friendship', by: 5, of: cast.character('ava') }`.
- **The [minigame](/docs/reference/minigames#its-kv-store) being played**, `of: 'minigame'`, a key of its kv. With no minigame running, it does nothing. The checker reports a key that no minigame declares in its `kv`, and one a minigame uses but doesn't declare itself.

#### The phase

```ts fragment
{ kv: 'phase', to: 'open' }
```

The stretch of the game the player is in, such as an intro and then the game proper, is the player's kv key `phase`. Set it on the last choice of an intro, read it with `{ kv: 'phase', is: 'open' }`, and give its first value in the content's starting [`kv`](/docs/reference/state#kv). [Locks](/docs/reference/locks) often ask for it.

**Gotcha.** `by` has no bounds here. Unlike a [stat](#stat), the number isn't held to any range, and a negative `by` can take it below 0.

### scene

```ts
{ scene: 'ava.hi' }
{ scene: null }
```

Puts a scene on screen, or closes it with `null`. The id isn't checked when the effect runs, but the [content checker](/docs/reference/checks) checks it. Only the scene left on screen at the end of the command counts as [seen](/docs/reference/state#seen).

#### Drawing a storylet

```ts fragment
{ scene: { from: 'cafe' } }
{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }
```

With `{ from }` in place of a scene's id, it draws a [storylet](/docs/reference/storylets): one of the scenes whose `drawnFrom` names `from` and whose `when` holds, picked by their `weight`, and puts it on screen. If none can be drawn, it puts `otherwise` on screen, and with no `otherwise` it leaves the screen as it was.

The draw is seeded by the save, the turn and a count of draws from that set, kept in the kv key `storylet:<from>`, so the same save always draws the same scene and [`replay`](/docs/reference/runner#replay) draws it again. See [Storylets](/docs/reference/storylets) for the details and the checks.

The engine has no effect that moves the player. The [places plugin](/docs/plugins/places) keeps track of places, and its [`places/move`](/docs/plugins/places#effects) effect, written `places.move('park')`, puts the player somewhere at once. Written out, that's `{ 'places/move': { location: 'park' } }`.

### closeStoryline

```ts fragment
{ closeStoryline: 'ava', turns: 2 }
```

Closes a storyline until `turns` [turns](/docs/reference/state#turn) from now, by setting its [`closedUntil`](/docs/reference/state#storylines) to the current turn plus `turns`. While it's closed, [`{ storyline: 'ava' }`](/docs/reference/conditions#storyline) stops holding. A [cast](/docs/plugins/cast) character who belongs to it is still in the room, but the player can't talk to them or call them. Nothing on the storyline is lost. In a game whose turn is a day (the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default), `turns: 2` is the day after tomorrow.

### turn

```ts
{ turn: true }
{ turn: { by: 3 } }
```

Ends the turn once with `true`, or `by` times. Each time, the [turn](/docs/reference/state#turn) counter goes up by one and the content's [`resets`](/docs/reference/rules#resets) are written. Then [`rules.onTurn`](/docs/reference/rules#onturn) runs, then each plugin's [`onTurn` hook](/docs/reference/plugins#hooks-and-providers), then `rules.onTurnDone` and each plugin's `onTurnDone`. See [The end of a turn](/docs/reference/rules#the-end-of-a-turn).

The engine keeps no time of day, so this effect is how a turn ends, whether a turn is a chapter of a novel or a week of running the café. Put it on the choice that closes a chapter. A plugin can end turns the same way. The [calendar](/docs/plugins/calendar#what-a-turn-is)'s `pass` and `sleep` end one at each day they cross, and its `onTurn` hook moves its clock on when this effect ends one.

```ts fragment
{ id: 'lock-up', effects: [{ turn: true }, { scene: 'cafe.monday' }] }
```

**Gotchas.**
- Here `rules.onTurn`'s `before` is the state as the effect found it, not the state before the command.
- A `turn` effect run while a turn is ending does nothing, so a turn's rules can never end another turn. That covers anything the game's [`rules.onTurn`](/docs/reference/rules#onturn) or a plugin's `onTurn` hook applies.
- A `by` of 0 or less does nothing.

### create

```ts fragment
{ create: 'staff', with: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }
{ create: 'staff', with: { id: 'cleo', name: 'Cleo' } }
{ create: 'food', like: 'food:cake', with: { stats: { fresh: 3 } }, at: 'you' }
```

Adds an [entity](/docs/reference/entities) of the kind `create` names, after the ones already there. The save keeps a record of it with what `with` gives, a `CreatedEntity`:

#### CreatedEntity

What a `create` effect's `with` holds, and what the save records for the thing made.

```ts shape
type CreatedEntity = {
  id?: string
  name?: string
  description?: string
  image?: string
  tags?: string[]
  traits?: Record<string, unknown>
  stats?: Record<string, number>
  kv?: Record<string, KvValue>
}
```

#### CreateFields

```ts shape
import type { CreateFields } from '@ifloom/engine'

type CreateFields = {
  like?: string
  with?: CreatedEntity
  at?: Placement
}
```

The fields a `create` effect takes besides its kind: the entity it copies what it isn't given from, what it's made with, and who holds it once made (nobody if left out).

Its `description` is read like a declared entity's, with tokens filled in, and its `image` goes through [`artSrc`](/docs/reference/prose#artsrc). Every other stat of its kind reads as that stat's `start`.

A thing made in play this way is how a game keeps notes, photos or letters. The phone's camera makes a photo the player keeps:

```ts fragment
{ create: 'photo', with: { id: 'ava', name: 'Ava at work', image: 'photo/ava.svg' }, at: 'player' }
```

The phone's gallery lists the `photo` things you hold, and `{ count: { of: 'photo', at: 'you' } }` asks whether you have any. See [Notes, photos and other things made in play](/docs/reference/entities#notes-photos-and-other-things-made-in-play).

With `like`, the new entity is [made like](/docs/reference/entities#things-made-like-another) another, and reads whatever it isn't given from that one: name, description, picture, tags, stats, kv and traits. `with` can be left out altogether. `like` names an entity your content declares, of the same kind.

With `at`, it's given to a [holder](/docs/reference/entities#holding-things) once made: one holder for one of it, or how many each holder has, such as `{ 'place:larder': 6 }`.

Without `id`, it gets the next free number of its kind (`#1`, `#2` and so on), recorded in [`state.created`](/docs/reference/state#created). A number is never given again, even once the entity that had it is [removed](#remove). With `id`, it gets that id, unless an entity of that kind already has it. In that case the effect does nothing, and the entity there keeps its name and numbers. An id the game declares counts as taken, unless that entity was removed: then it comes back, with the name the `create` gives.

This choice, from the café's interviews, hires someone:

```ts
choices: [
  { id: 'dev', effects: [{ create: 'staff', with: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }, { scene: null }] },
  { id: 'fen', effects: [{ create: 'staff', with: { name: 'Fen', stats: { skill: 7, wage: 18 } } }, { scene: null }] },
]
```

**Gotchas.**
- The id it was given isn't handed back. To refer to someone created without an id, go through them all with [`each`](#each) or [`entitiesOf`](/docs/reference/entities#entitiesof), or give an `id` of your own.
- An `id` that's a whole number, such as `'7'`, does nothing, as one that's already taken does. It would otherwise jump to the front of the kind's order. See [Ids](/docs/reference/entities#ids).
- `with.stats` is taken as written, not held to range, until an effect next moves it.
- The [content checker](/docs/reference/checks) reports a kind the game doesn't declare, a `like` it doesn't declare or of another kind, and a holder in `at` that can't hold things.

### remove

```ts fragment
{ remove: 'staff:ana' }
{ each: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ remove: '$' }] }
```

Takes an [entity](/docs/reference/entities) out of the game, with what the save kept about it. It does nothing if the entity isn't there. Its id isn't given to anyone created later.

An entity the game declares is also recorded in [`state.removed`](/docs/reference/state#removed). A declared entity is in the game unless it's recorded there, so that's what keeps it gone, in this save and when it [loads](/docs/reference/entities#entities-in-old-saves) again. An entity created in play isn't recorded: once its record goes, it's gone.

Nobody holds it any more, and what it [held](/docs/reference/entities#holding-things) goes to whoever held it. If nobody did, what it held goes with it. If it was the [protagonist](/docs/reference/entities#protagonists-you-and-player) being played, `'you'` is the player again.

### each

```ts fragment
{ each: 'staff', effects: [{ stat: 'morale', by: -8, of: '$' }] }
{ each: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ remove: '$' }] }
{ each: { of: 'food', at: 'you' }, effects: [{ stat: 'fresh', by: -1, of: '$' }] }
```

Runs `effects` once for every [entity](/docs/reference/entities) of the kind `each` names, in the order they arrived, with `'$'` standing for the current one each time. With `where`, it only runs for those the condition holds for, with `'$'` again standing for the current one. Use it for upkeep, wages, a bad week, or everyone who quits.

In place of a kind, `each` can be a [`Select`](/docs/reference/entities#select). Its `at` runs it over what a [holder](/docs/reference/entities#holding-things) holds (once for each thing, however many of it), and `tag` and `trait` narrow it further. With no `of` in the selection, it runs over every kind.

- **Who it runs for is fixed before it starts.** One created along the way isn't visited, and one removed along the way by an earlier entity's effects is skipped.
- **`where` is tested on the state as it is when each entity comes up**, after the effects for the ones before it.
- **`effects` are built for each entity in turn**, with `'$'` bound, against the state as it is then. They can be anything content can write, a call by name included. A call sees the state after the entities before it, not the state the list started from. To tell it which entity it's working on, pass `with: { of: '$' }`. Every `of: '$'` inside is replaced, a `with` included, so the function gets `args.of` as `'staff:ana'`.
- **A nested `each`**, or a [`{ count }`](/docs/reference/conditions#count) in `where`, binds its own `'$'`. See [EntityRef](/docs/reference/entities#entityref).

An effect inside that doesn't name `'$'` still runs once per entity. `{ stat: 'coins', by: -10 }` in an `each` over three members of staff takes 30 coins.

The [content checker](/docs/reference/checks) looks inside an `each`, with `'$'` standing for one of its kind, so a stat named on `'$'` has to belong to that kind.

### entity

```ts fragment
{ entity: 'food:apple', by: 2 }                       // two more apples for you
{ entity: 'food:apple', at: 'place:larder', to: 6 }   // the larder restocked
{ entity: 'gift:scarf', at: 'character:ava', to: 1 }  // Ava has the scarf now
```

Changes how many of a thing a [holder](/docs/reference/entities#holding-things) holds, `by` an amount or `to` a count. `at` is `'you'` if left out: the [protagonist](/docs/reference/entities#protagonists-you-and-player) being played, or the player. It never goes below 0. A unique thing's count is 0 or 1, and giving it to one holder takes it from whoever had it.

It does nothing if the thing isn't in the game, or the holder can't hold things: one that isn't there, or an entity whose kind isn't [unique](/docs/reference/entities#kinddef). Nor does it put a thing inside itself. [`give`](/docs/reference/entities#give-take-move-and-holding) and `take` write it with `by`.

### move

```ts fragment
{ move: 'food:apple', to: 'character:ava', by: 1 }    // hand Ava an apple
{ move: 'food:bread', from: 'place:larder', to: 'you' }
{ move: 'gift:scarf', to: 'gift:box' }               // wrap it
```

Moves a thing from one [holder](/docs/reference/entities#holding-things) `to` another. `from` is where it comes from: if it's left out, a unique thing moves from wherever it is, and anything else from `'you'`. `by` is how many: all there is, if left out. It moves at most what `from` holds, so asking for 10 apples from someone with 2 moves 2.

It does nothing when `to` can't hold things, when `from` and `to` are the same, or when the thing would end up holding itself, however far round: a box can't go into the scarf it holds. The [content checker](/docs/reference/checks) reports a `to` that names the thing itself.

**Gotcha.** Here `to` names a holder, not a value to set, as in every effect that names two places. [`move`](/docs/reference/entities#give-take-move-and-holding) writes it.

### you

```ts
{ you: 'character:sam' }   // play as Sam
{ you: null }              // back to the player
```

Switches who `'you'` is: the [protagonist](/docs/reference/entities#protagonists-you-and-player) being played, a unique entity, kept in [`state.you`](/docs/reference/state#you). `null`, or `'player'`, goes back to the player. It does nothing for an entity that isn't there or can't hold things. A game with one protagonist never needs it.

### notify

```ts fragment
{ notify: 'Rent is due on Friday', id: 'rent', text: 'notice.rent', tag: 'money' }
```

Raises a [notice](/docs/reference/notices), which is something the game tells the player outside a scene. Its title, in `notify`, and its `text`, for more words, are written out, with tokens filled as it's shown, and `tag` groups notices for badges. A notice with the `id` of an earlier one replaces it as the newest, unseen. With no `id`, one is made up. Only the newest 50 are kept.

### audio

```ts fragment
{ audio: 'music', to: 'radio' }
```

Puts the background [channel](/docs/reference/audio#channels) that `audio` names `to` a track or playlist and keeps it in the save, in `state.audio.channels`. It plays over the place's audio and the game's default, but an open scene that names the same channel still wins while it's open. See [what plays on a background channel](/docs/reference/audio#what-plays-on-a-background-channel).

- **`to: null`** silences the channel, place and default included.
- **Leave `to` out** to hand the channel back, so the place's audio or the game's default plays again.

```ts fragment
{ audio: 'music', to: null }  // the music stops
{ audio: 'music' }            // back to whatever the flat or the default plays
```

The loader reports an unknown track or channel, a cue channel such as `sfx`, and a sound effect's track put on a background channel.

### sound

```ts
{ sound: 'knock' }
```

Plays a [track](/docs/reference/audio#trackdef) once, on its own channel (`sfx` unless the track says otherwise). The state keeps the last 20 in `state.audio.cues`, each with a running count, and [`view.audio.cues`](/docs/reference/audio#sounds-and-voices) gives each a key so a player plays it once. The loader reports an unknown track, a playlist, and a track on a background channel.

### minigame

```ts
{ minigame: 'arrows' }
```

Starts a [minigame](/docs/reference/minigames) in its `start` state, with its variables at their starting values. A minigame already running is dropped. Until it ends, the view draws it over the scene or the room, and every command but its own (and `dismiss` and `setting`) is refused with `Finish this first.`

It also adds 1 to the kv key `minigame:<id>`, which counts how many times the minigame has started. The [content checker](/docs/reference/checks) reports an unknown minigame. Its variables are written with [`kv`](#whose-key-it-is) and `of: 'minigame'`.

### timer

```ts fragment
{ timer: 'phone' }             // start it, for its own ms
{ timer: 'phone', to: 5000 }   // start it for 5 seconds
{ timer: 'phone', to: null }   // stop it; its effects don't run
{ timer: 'phone', by: 5000 }   // 5 more seconds
{ timer: 'phone', by: -2000 }  // 2 seconds fewer
```

Starts, stops or changes one of the game's [timers](/docs/reference/timers), named by its id in `timers`. Starting one that's already running starts it again from the top. `to` sets how long it runs this time instead of its `ms`. `to: null` stops it without running its effects, so answering the phone stops the missed call. `by` adds milliseconds to a running timer (a negative `by` takes them away, down to 0) and does nothing to one that isn't running. A timer at 0 runs out on the next [`tick`](/docs/reference/commands#tick).

When a tick runs a timer out, the timer stops and its `effects` run. See [When a timer runs out](/docs/reference/timers#when-a-timer-runs-out). The checker reports an unknown timer, a `to` that isn't a number above 0 (or `null`), and a `by` that isn't a number.

### panel

```ts fragment
{ panel: 'shop', with: { vendor: 'counter' } }
{ panel: 'jobs' }
{ panel: null }
```

Opens a [panel](/docs/reference/panels) over the story by name, such as a shop's counter or a job board, with what it needs in `with`. A panel already open is replaced, and `panel: null` closes it. The UI decides what each name draws. The shop and jobs plugins write these for you with [`shop.open`](/docs/plugins/shop#opening-a-counter) and [`jobs.open`](/docs/plugins/jobs#opening-the-job-board).

The panel stays open while the player uses it, and closes when a later command ends a turn or changes the scene. See [How long a panel stays open](/docs/reference/panels#how-long-a-panel-stays-open).

The checker allows any name. A plugin that knows a panel checks its `with`, so the shop reports an unknown vendor. See [Checking a panel](/docs/reference/panels#checking-a-panel).


### point

```ts
{ point: 'questions' }   // jump('questions') writes this
```

In a choice of a [flowing scene](/docs/reference/flows): once the choice's `then` is done, the flow carries on from the point `{ point: 'questions' }` marks, instead of after the decision. The point can be anywhere in the scene, in a section or another choice's `then` too. It's only a choice's effect, in the scene that has the point, so a flow loops only through a pick. Anywhere else it does nothing, and the loader reports it.
### roll

```ts fragment
{ roll: 'skim', dice: '2d6', against: 8 }
{ roll: 'climb', dice: '1d20', plus: { stat: 'strength' }, against: 12 }
{ roll: 'ducks', dice: { count: 1, sides: 6 }, plus: 2 }
```

Throws dice and keeps the total in the [kv store](/docs/reference/state#kv) under the key that `roll` names, so `{ kv: 'skim', gte: 8 }` tests it and `{{skim}}` prints it in prose. The roll itself is recorded too: the [`roll` condition](/docs/reference/conditions#roll) reads whether it passed, and [`view.rolls`](/docs/reference/view#rolls) gives a UI the faces to show.

- **`dice`** is notation, `'2d6'`, `'1d20'`, `'d100'` or `'2d6+1'`, or an object, `{ count: 2, sides: 6 }`. A notation's `+1` or `-1` is added to the total.
- **`plus`** adds an [`Amount`](/docs/reference/amounts#amount): a number, or the player's stat as [`statValue`](/docs/reference/stats#statvalue) reads it (modifiers included), `plus: { stat: 'strength' }`.
- **`against`** is a target, also an `Amount`. The roll passes when the total reaches it, so `2d6` against 8 passes on 8 or more, and `against: { kv: 'wall' }` reads the wall's height as the dice are thrown.

A roll is a critical when every die shows its top face (`'max'`) or every die shows 1 (`'min'`). On one die, that's a natural 20 or a natural 1 on a d20. A critical doesn't change whether a roll passed. Test it with the condition's `critical` if your game says a natural 20 always succeeds.

Each die is drawn from the save's seed, the turn, the save's count of rolls so far, the key and the die's place. The count goes up with every roll, so two rolls in one command differ and trying again in the same turn rolls afresh. A replay of the same commands makes the same rolls, and reloading a save and trying again gives the same result. See [Dice rolls](/docs/reference/rolls).

The [content checker](/docs/reference/checks#in-an-effect) reports dice it can't read, a die with fewer than 2 sides, more than 100 dice, a key that `{{key}}` couldn't print, and a `plus` or `against` that isn't an amount or names a stat the game doesn't have. Dice it can't read roll nothing.

## Computed effects

Most effects are fixed data. When one has to be worked out from the state, such as "one more than the counter is now" or "the next rung of this ladder", declare a [macro](/docs/reference/custom#macros) in the game's [`rules`](/docs/reference/rules) and call it with `game/` in front. It returns the effects it stands for, as a [`Macro`](/docs/reference/custom#macro):

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  macros: {
    bumpVisits: (state, args) => {
      const now = Number(state.storylines.ava?.kv.visits ?? 0)
      return [{ kv: 'visits', of: 'storyline:ava', to: now + Number(args.by ?? 1) }]
    },
  },
}
```

```ts
effects: [{ 'game/bumpVisits': { by: 1 } }, { scene: null }]
```

The macro runs in its turn. Its function is called with the state the effects before it left, and what it returns applies there and then. It can return anything content can write: plain effects, a plugin's effect such as `{ 'quests/start': { quest: 'letter' } }`, or another macro, which runs in its turn too. An effect in the game's `rules.effects` returns the next state instead, as a plugin's does (see [Effects](/docs/reference/custom#effects)). The arguments are passed as `args`, or `{}` for `true`. See [Calls by name](/docs/reference/custom) for conditions and values worked out the same way.

A [plugin](/docs/reference/plugins)'s effect is called the same way, with the plugin's id in front: `{ 'quests/start': { quest: 'letter' } }`. See [Effects run in order](/docs/reference/plugins#effects-run-in-order).

**Gotchas.**
- A button's price, a guard and a lock see a computed effect worked out against the state on screen, before anything applies. In play it's worked out again in its turn.
- Macros that return calls to macros run up to 10 deep. One that names itself, or a loop of them, does nothing past that.
- A name that neither the game nor its plugins declare does nothing. The [content checker](/docs/reference/checks) reports it.

## See it in an example

- The Corner Café: the `end-week` action in [`examples/cafe/src/world/actions.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/actions.ts) runs two of the game's own macros, then `each` over the staff to lower their morale, `remove` on anyone below 20, and `{ turn: true }`. The `hiring` scene's choices `create` new staff.
- The Letter: in [`examples/novel/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/novel/src/story), `{ kv: 'fibs', by: 1 }` counts a lie, and the choices in the first two chapters end with `{ turn: true }` and a `scene` effect.
- Small Town: in [`examples/showcase/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/showcase/src/story), the café's `sit` action draws a storylet with `{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }`, the park's `arrows` action starts a minigame, its `skim` action rolls two dice against 8, and Ava's choices raise her friendship with `{ stat: 'friendship', by: 5, of: cast.character('ava') }`.
