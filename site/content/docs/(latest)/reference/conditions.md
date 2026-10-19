---
title: "Conditions"
description: "Every condition: kv, stats, levels, choices, scenes seen, things held, counts, turns, phases, custom and plugin calls."
---
A condition says when something applies, such as a line of prose, a choice, a lock or a character's schedule. It's plain nested data, so content stays serialisable and the [content checker](/docs/reference/checks) can check every id in it.

```ts
import type { Condition } from '@ifloom/engine'
import { at } from '@ifloom/plugin-places'

const regularAtTheCafe: Condition = {
  all: [
    at('cafe'),
    { stat: 'coins', gte: 4 },
    { seen: 'ava.hi' },
    { not: { kv: 'owesAva' } },
  ],
}
```

```ts
import { holds, inRange, explain, explainText, type Condition, type Range, type Explanation } from '@ifloom/engine'
```

When a choice is greyed out or a line is missing and you can't see why, [`explain`](#explain) walks the condition and tells you which part failed and what it read.

## Where conditions are used

- [Data scenes](/docs/reference/scenes#datascene): a block's `when`, a choice's `when`, `blocked` and `labels`, and a `variants` block's `gate`.
- The game's own [actions](/docs/reference/actions#actiondef): `when` and `blocked`.
- An [activity](/docs/reference/actions#blocked)'s `blocked`.
- [Stages](/docs/reference/progress#stages): `needs`.
- [Locks](/docs/reference/locks), [triggers](/docs/reference/triggers) and [inputs](/docs/reference/inputs): `when`.
- A plugin's content. The [places plugin](/docs/plugins/places#locationdef) uses them for a room's `blocked`, a body block's `when` and `gate`, and each room action's `when` and `blocked`. The [cast](/docs/plugins/cast#person-1) uses them for a character's `schedule`, `talk`, `call` and `met`, with `'$'` standing for that character.

## Range

```ts
type Range = { gte?: number; gt?: number; lte?: number; lt?: number }
```

Many conditions compare a number against a range: at least `gte`, above `gt`, at most `lte`, below `lt`. You can leave any bound out, and every bound you give must hold.

A range with no bounds at all means "any of it", so the value has to be above 0. That's why `{ entity: 'clothing:scarf', at: 'you' }` means "has a scarf", and `{ seen: 'ava.hi' }` means "has seen it at least once".

```ts
{ stat: 'charm', gte: 10 }          // 10 or more
{ stat: 'charm', gt: 10 }           // more than 10
{ stat: 'charm', lt: 10 }           // below 10
{ stat: 'coins', gte: 5, lte: 20 }  // 5 to 20
{ stat: 'energy' }                  // above 0
```

## Condition

```ts
type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | ({ kv: string; is?: KvValue; of?: string } & Range)
  | ({ setting: string; is?: KvValue } & Range)
  | ({ chose: string } & Range)
  | ({ seen: string } & Range)
  | ({ since: string; last?: boolean } & Range)
  | ({ storylineKv: { storyline: string; key: string }; is?: KvValue } & Range)
  | ({ stat: StatKey; of?: string } & Range)
  | ({ count: string | Select; where?: Condition; units?: true } & Range)
  | ({ entity: string; at?: string } & Range)
  | ({ level: StatKey; of?: string } & Range)
  | { storyline: string; open?: boolean }
  | { scene: string[] }
  | { turn: Range }
  | { phase: Phase[] }
  | ({ minigameVar: string } & Range)
  | { roll: string; passed?: boolean; critical?: boolean | 'max' | 'min' }
  | ({ timer: string } & Range)
  | { custom: string; with?: Record<string, unknown> }
  | PluginCall
```

A condition names what it reads by its noun, as effects do: `{ stat: 'coins', gte: 3 }`, `{ entity: 'clothing:scarf', at: 'you' }`, `{ storyline: 'ava' }`. The range or `is` sits beside it. A condition that names nothing, such as `turn`, takes its range as its value: `{ turn: { gte: 3 } }`.

**Gotcha.** Put one kind in each object. A condition with two kinds, such as `{ kv: 'x', stat: 'coins' }`, never holds, because the engine can't tell which one you meant. One with no kind at all, such as `{}`, never holds either. The [content checker](/docs/reference/checks#in-a-condition) reports both, so combine kinds with `all` instead. A [short call](#plugin-shorthand) has no kind key of its own and counts as `custom`.

### all, any, not

```ts
{ all: [{ kv: 'marketDay' }, { entity: 'clothing:scarf', at: 'you' }] }   // on market day, with a scarf
{ any: [{ entity: 'clothing:scarf', at: 'you' }, { entity: 'clothing:raincoat', at: 'you' }] }
{ not: { phase: ['arrival'] } }
```

`{ all: [] }` is true and `{ any: [] }` is false.

### kv

```ts
{ kv: 'marketOpen' }             // set to anything truthy
{ kv: 'errand', is: 'bread' }    // exactly this value
{ kv: 'coffeesBought', gte: 3 }  // a number, 3 or more
```

Tests a key in the [kv store](/docs/reference/state#kv), the game's keys with a true/false, number or text value. What it tests depends on what you give:

- **`is`** tests strict equality, so `1` and `'1'` differ. Any range bound beside it is ignored.
- **A [range](#range) bound** (`gte`, `gt`, `lte` or `lt`) tests whether the key's number is in the range. A value that isn't a number (unset, text or `true`) counts as 0.
- **Neither** tests whether the key is truthy. `0`, `''` and `false` aren't.

To count something, use the [`kv`](/docs/reference/effects#kv) effect's `by` form, and test the count with a range.

With `of`, it tests a key in an [entity](/docs/reference/entities)'s kv store, as in `{ kv: 'role', of: 'staff:ana', is: 'cook' }`, or `of: '$'` inside an [`each`](/docs/reference/effects#each) or a [`count`](#count)'s `where`. The same three tests apply.

**Gotcha.** With `of`, an entity that isn't there fails whatever you asked, `lt` and `is` included, just as [`stat`](#stat) does. So `{ kv: 'warned', of: 'staff:ghost', lt: 1 }` is false. To ask that something isn't set on an entity that may have gone, write `{ not: { kv: 'warned', of: 'staff:ghost' } }`, which is true when it's missing.

### setting

```ts
{ setting: 'hints' }                    // a toggle that is on
{ setting: 'difficulty', is: 'hard' }   // exactly this option
{ setting: 'patience', gte: 6 }         // a range, 6 or more
```

Tests a `play` [setting](/docs/reference/settings), the value in [`state.settings`](/docs/reference/state#settings). It reads the same way as [`kv`](#kv): `is` tests strict equality, a range bound tests the number, and neither tests whether it's truthy.

```ts
// A hint only for players who keep hints on.
{ id: 'ask-rosa', label: 'bakery#ask-rosa', when: { setting: 'hints' }, effects: [] }
```

**Gotcha.** Conditions can only read `play` settings. A `ui` setting isn't in the state, so the [loader](/docs/reference/checks#in-a-condition) reports a condition that names one, along with an unknown setting and an `is` the setting can't take.

### chose

```ts
{ chose: 'ava.hi#compliment' }          // picked at least once
{ chose: 'ava.hi#compliment', gte: 3 }  // three times or more
{ chose: 'ava.hi#compliment', lt: 1 }   // never
```

How many times the player has picked a choice. The key is the scene's id, a `#` and the choice's id, as in the choice's label key (see [`chosen`](/docs/reference/state#chosen)). A bare `{ chose }` means at least once. Every choice is counted, so a later scene can branch on an earlier decision without the choice setting a kv key.

**Gotcha.** The [content checker](/docs/reference/checks) checks the key against data scenes. It takes a hand-written scene at its word, because that scene's choices aren't known until it renders.

### seen

```ts
{ seen: 'ava.river' }          // entered at least once
{ seen: 'ava.hi', gte: 3 }     // three times or more
{ seen: 'ava.river', lt: 1 }   // never
```

How many times the player has entered a scene (see [`seen`](/docs/reference/state#seen)). Use it to gate on order: it says the step before has happened. A stat threshold alone tells you how good the player is, not how far they've got.

### since

```ts
{ since: 'ava.river', gte: 3 }               // three or more whole turns after first seeing it
{ since: 'ava.river', lt: 2 }                // within two turns of it
{ since: 'ava.river', last: true, gte: 3 }   // three or more turns after the latest visit
{ since: 'cafe.counter#chat', last: true, gte: 1 }   // picked before, but not this turn
```

Whole [turns](/docs/reference/state#turn) since a scene was first entered (see [`seenOn`](/docs/reference/state#seenon)), or since a choice was first picked when the id is `scene#choice` (see [`chosenOn`](/docs/reference/state#chosenon)). With the [calendar](/docs/plugins/calendar)'s default, a turn is a day. Use it to gate on pace.

With `last: true` it counts from the latest time instead (see [`lastSeenOn`](/docs/reference/state#lastseenon) and [`lastChosenOn`](/docs/reference/state#lastchosenon)). That's a cooldown: something that can happen again, but not too often.

**A cooldown.** The bench by the river can be visited again three days after the last time. Put it on whatever opens the scene, here an activity:

```ts
{
  id: 'sit-by-the-river',
  blocked: [{ when: { since: 'river.bench', last: true, lt: 3 }, reason: 'You sat there only recently.' }],
  effects: [{ kind: 'scene', scene: 'river.bench' }],
}
```

Before the first visit, `since` fails every range, so the `blocked` entry doesn't hold and the bench is open. For a choice the player can pick only every other turn, block it with `{ since: 'cafe.counter#chat', last: true, lt: 2 }` (the turn it was picked counts as 0).

**Gotchas.**
- A scene the player hasn't seen yet, or a choice they haven't picked, fails every range, `lt` included. So write a cooldown as a `blocked` entry that holds while it's too soon, not as a condition that holds once it's long enough.
- A bare `{ since: 'x' }` means at least one turn since, so it's false in the same turn.
- A save from before the latest times were kept has only the first. Until the scene is entered again, `last: true` counts from the first visit. For a choice, it has no record at all until the choice is picked again.
- Without `last`, a choice picked before the record was kept fails as "not picked yet". Use [`{ chose }`](#chose) to ask whether it was ever picked.

### storylineKv

```ts
{ storylineKv: { storyline: 'ava', key: 'lentBook' } }
{ storylineKv: { storyline: 'ava', key: 'favourite' }, is: 'poetry' }
```

```ts
{ storylineKv: { storyline: 'ava', key: 'visits' }, gte: 3 }
```

Works like [`kv`](#kv) on a [storyline](/docs/reference/storylines)'s own kv store, named by the storyline and the key. Bare, it asks whether the key is truthy. With `is`, it tests strict equality. With a range, it tests the key's number, and a key that's missing or isn't a number counts as 0.

### stat

```ts
{ stat: 'charm', gte: 6 }
{ stat: 'coins', gte: 4 }     // can afford a 4c sandwich
{ stat: 'energy', lt: 20 }    // flagging
```

Tests a [stat](/docs/reference/state#stats) against a range. Coins, energy and every other number the player has are [declared stats](/docs/reference/stats), so this is the condition for all of them.

It reads the stat with [`statValue`](/docs/reference/stats#statvalue), so a [derived stat](/docs/reference/stats#derived-stats) is worked out from its formula, and a stat the save doesn't have yet reads as its `start`. [`holds`](#holds) called without a game can't do either, and reads `state.stats` as it is, with a missing stat as 0.

With `of`, it tests an [entity](/docs/reference/entities)'s stat. `of` is an [entity reference](/docs/reference/entities#entityref), or `'$'` inside an [`each`](/docs/reference/effects#each) or a [`count`](#count)'s `where`. `of: 'you'` is the [protagonist](/docs/reference/entities#protagonists-you-and-player) being played, or the player when there's none, and `of: 'player'` is the player.

```ts
{ stat: 'quality', of: 'dish:soup', lt: 5 }    // the soup could still be better
{ stat: 'morale', of: '$', lt: 20 }             // in an each: this one is ready to quit
```

**Gotcha.** An entity that isn't there fails every range, `lt` included, because someone who has left isn't "below 20 morale". So does `'$'` anywhere it isn't bound.

[`explain`](#explain) says `staff:ana stat morale is 80; wants 90 or more`, or `staff:cleo is not in the game`.

### count

```ts
{ count: 'staff' }                                                        // anyone at all
{ count: 'staff', lt: 4 }                                                 // room for one more
{ count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 }   // two happy people
{ count: { at: 'you', tag: 'fruit' }, gte: 3 }                            // three sorts of fruit on you
{ count: { of: 'food', at: 'place:larder' }, units: true, lt: 4 }         // fewer than four bits of food in the larder
```

How many [entities](/docs/reference/entities) of a kind there are, against a [range](#range). A bare `{ count }` means at least one. With `where`, it counts the ones `where` holds for, testing it once for each with `'$'` as that one. A kind with none, or one the game doesn't declare, has 0.

In place of a kind, `count` takes a [`Select`](/docs/reference/entities#select): `of` a kind, `at` a holder (only what it [holds](/docs/reference/entities#holding-things)), with a `tag`, with a `trait`, and `where`. A `where` beside the `Select` is asked as well as its own. It counts distinct things. With `units: true` it adds up how many of each are held instead: by the `Select`'s holder if it names one, else by everyone.

A `count` binds its own `'$'`. Inside an [`each`](/docs/reference/effects#each)'s `where`, the `'$'` in a `count`'s `where` is the one being counted, not the one the `each` is on.

The [content checker](/docs/reference/checks) checks the kind, the holder, the trait and the `where`. [`explain`](#explain) says `3 staff; wants 2 or more`, `1 staff where it holds; wants more than 0` with a `where`, or `2 entities held by you tagged fruit; wants 3 or more`. It doesn't break down what `where` read for each one.

### entity

```ts
{ entity: 'staff:ana' }                          // Ana works here
{ entity: 'food:apple', at: 'you' }              // you have an apple
{ entity: 'food:apple', at: 'place:larder', lt: 3 }   // fewer than three in the larder
{ entity: 'gift:scarf', at: 'character:ava' }    // Ava has the scarf
```

Bare, the [entity](/docs/reference/entities) is in the game, which means it was declared or created and hasn't been removed. [`explain`](#explain) says `staff:ana is in the game` or `staff:ana is not in the game`.

With `at`, it's how many of it a [holder](/docs/reference/entities#holding-things) holds, against a [range](#range): `'you'`, `'player'` or a unique entity, and at least one if there's no range. With a range and no `at`, it's how many are held by everyone together. [`explain`](#explain) says `food:apple: 2 held by you; wants 3 or more`. The [`holding`](/docs/reference/entities#give-take-move-and-holding) helper writes `{ entity, at: 'you', gte }`.

The [content checker](/docs/reference/checks) reports a kind the game doesn't declare. It doesn't report an id it doesn't know, since the thing may be made in play.

**Gotcha.** Inside an [`each`](/docs/reference/effects#each) or a [`count`](#count)'s `where`, `'$'` is bound here (and in `at`) as it is in an `of`, so `{ entity: '$' }` is the one being looked at and is always true. Anywhere else, `'$'` names nothing and the condition is false.

### level

```ts
{ level: 'cooking' }                        // level 1 or more
{ level: 'cooking', gte: 2 }                // level 2 or more
{ level: 'cooking', lt: 3 }                 // not yet level 3
{ level: 'skill', of: 'staff:ana', gte: 2 } // an entity's level
```

Tests the level a stat with [`levels`](/docs/reference/stats#levels) is at, against a [range](#range). The level is how many of the stat's `levels.at` thresholds its value has reached, as [`statLevel`](/docs/reference/stats#statlevel) works it out. A bare `{ level }` means level 1 or more. Levels declared with `hidden: true` are read the same way, so you can gate on thresholds the player never sees.

With `of`, it reads an [entity](/docs/reference/entities)'s level, as [`{ stat }`](#stat) does. An entity that isn't there fails every range, `lt` included.

```ts
// declared with the stat:
{ id: 'cooking', label: 'Cooking', levels: { at: [10, 30, 60] } }
```

**Gotchas.**
- A stat with no `levels` is always at level 0, so `{ level: 'charm' }` on it never holds and `lt` always does. The loader checks that the stat is declared and named on the right owner, but not that it has levels.
- It needs the game to find the levels. [`holds`](#holds) without a game reads every level as 0.

[`explain`](#explain) says `stat cooking is at level 1; wants 2 or more`, or `staff:ana stat skill is at level 2; wants 2 or more` with an `of`.

### storyline

```ts
{ storyline: 'ava' }                // open
{ storyline: 'ava', open: false }   // closed for now
```

Whether a [storyline](/docs/reference/storylines) is open, meaning it isn't closed or was closed until a turn that has now come (as [`storylineOpen`](/docs/reference/storylines#storylineof-and-storylineopen) says). With `open: false`, it asks whether the storyline is closed for now. `open` is `true` if you leave it out. A storyline the save doesn't have reads as open, and the [content checker](/docs/reference/checks) reports one the game doesn't declare.

[`explain`](#explain) says `storyline ava is closed; wants it open`.

**Gotcha.** A storyline doesn't keep score of how well someone likes the player. Test that as a stat on the [cast](/docs/plugins/cast#each-one-is-an-entity)'s characters, as in `{ stat: 'friendship', of: character('ava'), gte: 20 }`.

### minigameVar

```ts
{ minigameVar: 'score', gte: 3 }
{ minigameVar: 'arrow', gte: 2, lte: 2 }   // exactly 2
```

Tests a variable of the [minigame](/docs/reference/minigames#its-variables) being played against a range. Bare, it asks whether it's above 0. It's false with no minigame running, or for a variable the running minigame doesn't have, whatever the range. Use it in a minigame's `on` and `always` entries to branch on a score or a round, or anywhere else a condition goes.

The [content checker](/docs/reference/checks) reports a variable that no minigame declares.

### roll

```ts
{ roll: 'skim' }                     // a roll has been made under this key
{ roll: 'skim', passed: true }       // it reached its target
{ roll: 'skim', passed: false }      // it missed
{ roll: 'climb', critical: 'max' }   // every die on its top face
{ roll: 'climb', critical: true }    // every die on its top face, or every die on 1
```

Reads the latest [roll](/docs/reference/effects#roll) made under a key. Bare, it asks whether one has been made at all. `passed` asks whether the total reached the effect's `against`, and is false either way for a roll with no target. `critical: true` asks whether every die showed its top face or every die showed 1, `'max'` and `'min'` ask for one of them, and `false` asks for neither. Give both and both must hold.

The total itself is a kv key, so test a number with [`kv`](#kv): `{ kv: 'skim', gte: 10 }`.

A roll is kept until another roll under the same key replaces it, across turns and saves. To show an outcome only on the turn of the roll, set a kv key in the same effects and reset it each turn with [`rules.resets`](/docs/reference/rules#resets), as the showcase does with `skimmed`.

[`explain`](#explain) says `roll skim is 9 on 2d6, passed; wants failed`.

### timer

```ts
{ timer: 'phone' }               // it's running
{ timer: 'phone', lte: 3000 }    // running, with 3 seconds or less left
{ not: { timer: 'phone' } }      // not running: never started, stopped, or run out
```

Asks about one of the game's [timers](/docs/reference/timers). Bare, it asks whether the timer is running. With a range, it asks whether it's running with that many milliseconds left. It's false for a timer that isn't running, whatever the range, so `{ timer: 'phone', lte: 0 }` never holds once the phone has stopped. A timer stops when it runs out, when the [`timer` effect](/docs/reference/effects#timer) stops it with `to: null`, or never, if nothing starts it.

Show a choice only while the phone rings with `when: { timer: 'phone' }`, or a line of prose in the last seconds with `when: { timer: 'phone', lte: 3000 }`. Time passes only on a [`tick`](/docs/reference/commands#tick), so a condition on the time left changes with each tick, and a [trigger](/docs/reference/triggers) on one fires after the tick that crosses it.

The [content checker](/docs/reference/checks) reports a timer the game doesn't declare.

[`explain`](#explain) says `timer phone is running with 4200 ms left; wants running with 3000 or less ms left`.

### scene

```ts
{ scene: ['ava.hi'] }
```

The scene on screen is one of these. It's false when no scene is open.

### turn

```ts
{ turn: { gte: 3 } }   // the fourth turn on
{ turn: { lt: 1 } }    // still the first turn
```

How many [turns](/docs/reference/state#turn) have passed, counting from 0, in a [range](#range). It names nothing, so the range is its value. An empty range, `{ turn: {} }`, is false in turn 0. Your game decides how long a turn is. It's a day with the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, or a chapter in a novel that ends its turns with the [`turn`](/docs/reference/effects#turn) effect.

The engine keeps no clock but the turn, so there's no core condition for the time of day. The period, the weekday and the day come from the [calendar plugin](/docs/plugins/calendar#conditions) as [plugin calls](#plugin-shorthand): `period('morning')`, `weekday(5, 6)` and `day({ gte: 2 })`.

### phase

```ts
{ phase: ['arrival', 'first-day'] }
```

The game's current [stage](/docs/reference/state#phase) is one of these.

### Where the player is

The engine keeps no places, so it has no condition for where the player is. With the [places plugin](/docs/plugins/places#conditions), write `at('cafe', 'park')` (short for `{ 'places/at': { location: ['cafe', 'park'] } }`) for "in one of these places", and `within('cafe')` for "in the café or a room inside it".

It doesn't keep characters either. With the [cast](/docs/plugins/cast#conditions), write `here('ava')` (short for `{ 'cast/here': { character: ['ava'] } }`) for "Ava is in the room with the player", and `isAt('ava', 'park')` for "Ava is in the park, wherever the player is".

**Gotcha.** An object whose key the engine doesn't know, such as `{ at: ['cafe'] }`, never holds, and the loader doesn't report it.

### custom

```ts
{ custom: 'marketDay' }
{ custom: 'priceBelow', with: { coins: 4 } }
{ custom: 'quests/done', with: { quest: 'bread' } }
```

Calls a [custom condition](/docs/reference/custom#conditions) the game declares in `game.custom.conditions`, or a [plugin](/docs/reference/plugins#naming)'s condition, named with the plugin's id in front. Use it for a test worked out from several values rather than read from one. The content stays data, and a mod can use it without shipping code.

`with` is passed to the function as its arguments, or `{}` when you leave it out. A name with a `/` is looked up among the game's plugins first.

```ts
import type { Game } from '@ifloom/engine'

const town: Game = {
  // ...
  custom: {
    conditions: {
      marketDay: (state) => state.turn % 7 === 5 && !state.kv.rainedOff,
    },
  },
}
```

**Gotchas.**
- A name that neither the game nor its plugins declare is false rather than an error, so a broken mod hides content instead of crashing. The [content checker](/docs/reference/checks) reports it.
- Without a `game`, every `{ custom }` is false.

### Plugin shorthand

```ts
{ 'quests/done': { quest: 'bread' } }    // { custom: 'quests/done', with: { quest: 'bread' } }
{ 'wardrobe/wearing': { entity: 'clothing:raincoat' } }
```

A plugin's condition with its full name as the only key, and its arguments as an object (or `true` for none). See [`PluginCall`](/docs/reference/custom#plugincall). It holds, fails and is checked exactly like the `{ custom }` it stands for.

## holds

```ts
function holds(state: GameState, condition: Condition | undefined, game?: Game): boolean
```

Evaluates a condition. `undefined` is true, so a `when` you leave out always applies.

```ts
import { holds } from '@ifloom/engine'
import { at } from '@ifloom/plugin-places'
import { here } from '@ifloom/plugin-cast'

holds(state, { kv: 'metAva' })                // true once you've met Ava
holds(state, at('cafe'), town)                // a plugin's condition needs the game
holds(state, here('ava'), town)               // so does the cast's
```

**Gotcha.** `custom` and a plugin's condition need `game`. Without it, they're false, and `level` reads every level as 0. A `count`'s `where` is tested with the same `game`, or without one.

## inRange

```ts
function inRange(value: number, range: Range): boolean
```

Whether a number is in a [`Range`](#range), tested the way every built-in condition tests one. Every bound given must hold, and a range with no bounds at all asks whether the number is above 0. Use it in a [plugin](/docs/reference/plugins)'s condition that takes a range in its `with`, so it reads the way the built-in ones do.

```ts
import { inRange, type Range } from '@ifloom/engine'

// A plugin condition: { 'dishes/dirty': { gte: 3 } }, or { 'dishes/dirty': true } for "any at all".
conditions: {
  dirty: (_state, args, { slice }) => inRange(slice.dirty, args as Range),
},
```

```ts
inRange(4, { gte: 3 })   // true
inRange(0, {})           // false: no bounds asks for above 0
```

**Gotcha.** `with` is unchecked content. Bounds that aren't numbers compare the way JavaScript compares them, so check them first if a mod might pass anything.

## Why does it hold?

`holds` tells you whether a condition holds. When you want to know why a choice is greyed out or a line is missing, `explain` goes through it part by part.

### explain

```ts
function explain(state: GameState, condition: Condition | undefined, game?: Game): Explanation
```

Walks the whole condition against the state. Every part of an `all`, `any` or `not` is marked as holding or not, and every leaf says what it read and what it wanted. The top-level `holds` always agrees with [`holds`](#holds).

```ts
import { explain } from '@ifloom/engine'
import { at } from '@ifloom/plugin-places'

const why = explain(state, {
  all: [
    { kv: 'metAva' },
    { any: [{ stat: 'coins', gte: 5 }, { level: 'charm', gte: 1 }] },
    { not: at('cafe') },
  ],
}, town)

why.holds                        // false
why.parts?.[2].holds             // false: the player is in the café
why.parts?.[1].parts?.[0].why    // 'stat coins is 3; wants 5 or more'
```

With no condition, it returns `{ holds: true, why: 'no condition' }`.

**Gotchas.**
- A `{ custom }` leaf can only say which function it called (`custom condition marketDay`), not what that function read.
- Pass `game`, as with `holds`. Without it, the custom and plugin leaves fail, and `level` reads level 0.

### Explanation

```ts
type Explanation = {
  holds: boolean
  why: string               // one line: what this part checked and what it found
  parts?: Explanation[]     // the parts of an all, any or not
}
```

### explainText

```ts
function explainText(explanation: Explanation, depth?: number): string
```

Turns an explanation into indented lines, with ✓ or ✗ on each and two spaces per level, for a log, a test failure message or a debug panel. `depth` (default 0) indents the whole tree.

```ts
import { explainText } from '@ifloom/engine'

console.log(explainText(why))
// ✗ all of 3: 1 fail
//   ✓ kv metAva is true; wants set
//   ✓ any of 2: 1 hold
//     ✗ stat coins is 3; wants 5 or more
//     ✓ stat charm is at level 1; wants 1 or more
//   ✗ not: the part below holds
//     ✓ custom condition places/at
```

## See it in an example

- The Letter: in [`examples/novel/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/novel/src/story), `{ chose: 'ch1.mat#open' }` lets chapter two remember a choice from chapter one, and the three lines of `ch3.door` read the `fibs` key with `lt`, `is` and `gte`.
- Small Town: the files in [`examples/showcase/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/showcase/src/story) use `{ seen: 'ava.hi', gte: 3 }` in Ava's scene, `{ since: 'ava.hi', gte: 3 }` in the `friend` quest, `{ setting: 'hints' }` on the high street, `{ count: 'visitor', gte: 1 }` in the park, `{ count: { of: 'photo', at: 'player' } }` on the `post` activity and `{ minigameVar }` in quick feet.
- The Corner Café: the `review` trigger in [`examples/cafe/src/world/triggers.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/triggers.ts) counts staff with a `where`, `{ count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 }`.
