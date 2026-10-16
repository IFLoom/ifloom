# Conditions

A condition says when something applies, such as a line of prose, a choice, a lock or a character's schedule. It's plain nested data, so content stays serialisable and the [content checker](/reference/checks) can check every id in it.

```ts
import type { Condition } from '@ifloom/engine'
import { at } from '@ifloom/plugin-places'

const regularAtTheCafe: Condition = {
  all: [
    at('cafe'),
    { stat: 'coins', gte: 4 },
    { seen: 'ava.hi' },
    { not: { flag: 'owesAva' } },
  ],
}
```

```ts
import { holds, inRange, explain, explainText, tier, type Condition, type Range, type Explanation } from '@ifloom/engine'
```

When a choice is greyed out or a line is missing and you can't see why, [`explain`](#explain) walks the condition and tells you which part failed and what it read.

## Where conditions are used

- [Data scenes](/reference/scenes#datascene): a block's `when`, a choice's `when`, `blocked` and `labels`, and a `variants` block's `gate`.
- The game's own [actions](/reference/actions#actiondef): `when` and `blocked`.
- An [activity](/reference/actions#requirement)'s `requires`.
- [Stages](/reference/progress#stages): `needs`.
- [Locks](/reference/locks), [triggers](/reference/triggers) and [inputs](/reference/inputs): `when`.
- A plugin's content. The [places plugin](/plugins/places#locationdef) uses them for a room's `locked`, a body block's `when` and `gate`, and each room action's `when` and `blocked`. The [cast](/plugins/cast#characterdef) uses them for a character's `schedule`, `talk`, `call` and `met`, with `'$'` standing for that character.

## Range

```ts
type Range = { gte?: number; gt?: number; lte?: number; lt?: number }
```

Many conditions compare a number against a range: at least `gte`, above `gt`, at most `lte`, below `lt`. You can leave any bound out, and every bound you give must hold.

A range with no bounds at all means "any of it", so the value has to be above 0. That's why `{ item: 'scarf' }` means "has a scarf", and `{ seen: 'ava.hi' }` means "has seen it at least once".

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
  | ({ flag: string; is?: FlagValue; of?: string } & Range)
  | ({ setting: string; is?: FlagValue } & Range)
  | ({ chose: string } & Range)
  | ({ seen: string } & Range)
  | ({ since: string } & Range)
  | { storylineFlag: { storyline: string; key: string; is?: FlagValue } }
  | ({ stat: StatKey; of?: string } & Range)
  | ({ count: string; where?: Condition } & Range)
  | { entity: string }
  | ({ level: StatKey; of?: string } & Range)
  | { tier: StatKey; gte: number }
  | { storyline: string; open?: boolean }
  | ({ counter: { storyline: string; key: string } } & Range)
  | ({ item: string } & Range)
  | ({ collection: string; id?: string } & Range)
  | { has: string }
  | { scene: string[] }
  | ({ turn: true } & Range)
  | { phase: Phase[] }
  | { custom: string; with?: Record<string, unknown> }
  | PluginCall
```

**Gotcha.** Put one kind in each object. A condition with two kinds, such as `{ flag: 'x', has: 'scarf' }`, never holds, because the engine can't tell which one you meant. One with no kind at all, such as `{}`, never holds either. The [content checker](/reference/checks#in-a-condition) reports both, so combine kinds with `all` instead. A [short call](#plugin-shorthand) has no kind key of its own and counts as `custom`.

### all, any, not

```ts
{ all: [{ flag: 'marketDay' }, { has: 'scarf' }] }   // on market day, with a scarf
{ any: [{ has: 'scarf' }, { has: 'raincoat' }] }
{ not: { phase: ['arrival'] } }
```

`{ all: [] }` is true and `{ any: [] }` is false.

### flag

```ts
{ flag: 'marketOpen' }             // set to anything truthy
{ flag: 'errand', is: 'bread' }    // exactly this value
{ flag: 'coffeesBought', gte: 3 }  // a number, 3 or more
```

Tests a game [variable](/reference/state#flags). What it tests depends on what you give:

- **`is`** tests strict equality, so `1` and `'1'` differ. Any range bound beside it is ignored.
- **A [range](#range) bound** (`gte`, `gt`, `lte` or `lt`) tests whether the variable's number is in the range. A variable that isn't a number (unset, text or `true`) counts as 0.
- **Neither** tests whether the variable is truthy. `0`, `''` and `false` aren't.

To count something, use the [`flag`](/reference/effects#flag) effect's `add` form, and test the count with a range.

With `of`, it tests an [entity](/reference/entities)'s variable, as in `{ flag: 'role', of: 'staff:ana', is: 'cook' }`, or `of: '$'` inside an [`each`](/reference/effects#each) or a [`count`](#count)'s `where`. The same three tests apply.

**Gotcha.** With `of`, an entity that isn't there fails whatever you asked, `lt` and `is` included, just as [`stat`](#stat) does. So `{ flag: 'warned', of: 'staff:ghost', lt: 1 }` is false. To ask that something is *not* set on an entity that may have gone, write `{ not: { flag: 'warned', of: 'staff:ghost' } }`, which is true when it's missing.

### setting

```ts
{ setting: 'hints' }                    // a toggle that is on
{ setting: 'difficulty', is: 'hard' }   // exactly this option
{ setting: 'patience', gte: 6 }         // a range, 6 or more
```

Tests a `play` [setting](/reference/settings), the value in [`state.settings`](/reference/state#settings). It reads the same way as [`flag`](#flag): `is` tests strict equality, a range bound tests the number, and neither tests whether it's truthy.

```ts
// A hint only for players who keep hints on.
{ id: 'ask-rosa', label: 'bakery#ask-rosa', when: { setting: 'hints' }, effects: [] }
```

**Gotcha.** Conditions can only read `play` settings. A `ui` setting isn't in the state, so the [loader](/reference/checks#in-a-condition) reports a condition that names one, along with an unknown setting and an `is` the setting can't take.

### chose

```ts
{ chose: 'ava.hi/compliment' }          // picked at least once
{ chose: 'ava.hi/compliment', gte: 3 }  // three times or more
{ chose: 'ava.hi/compliment', lt: 1 }   // never
```

How many times the player has picked a choice. The key is the scene's id, a slash and the choice's id (see [`chosen`](/reference/state#chosen)). A bare `{ chose }` means at least once. Every choice is counted, so a later scene can branch on an earlier decision without the choice setting a variable.

**Gotcha.** The [content checker](/reference/checks) checks the key against data scenes. It takes a hand-written scene at its word, because that scene's choices aren't known until it renders.

### seen

```ts
{ seen: 'ava.river' }          // entered at least once
{ seen: 'ava.hi', gte: 3 }     // three times or more
{ seen: 'ava.river', lt: 1 }   // never
```

How many times the player has entered a scene (see [`seen`](/reference/state#seen)). Use it to gate on order: it says the step before has happened. A stat threshold alone tells you how good the player is, not how far they've got.

### since

```ts
{ since: 'ava.river', gte: 3 }   // three or more whole turns after first seeing it
{ since: 'ava.river', lt: 2 }    // within two turns of it
```

Whole [turns](/reference/state#turn) since a scene was first entered (see [`seenOn`](/reference/state#seenon)). With the [calendar](/plugins/calendar)'s default, a turn is a day. Use it to gate on pace.

**Gotchas.**
- A scene the player hasn't seen yet fails every range, `lt` included.
- A bare `{ since: 'x' }` means at least one turn since, so it's false in the same turn.

### storylineFlag

```ts
{ storylineFlag: { storyline: 'ava', key: 'lentBook' } }
{ storylineFlag: { storyline: 'ava', key: 'favourite', is: 'poetry' } }
```

Works like [`flag`](#flag) without a range, on a [storyline](/reference/storylines)'s variables. Bare, it asks whether the variable is truthy. With `is`, it tests strict equality.

### stat

```ts
{ stat: 'charm', gte: 6 }
{ stat: 'coins', gte: 4 }     // can afford a 4c sandwich
{ stat: 'energy', lt: 20 }    // flagging
```

Tests a [stat](/reference/state#stats) against a range. Coins, energy and every other number the player has are [declared stats](/reference/stats), so this is the condition for all of them.

It reads the stat with [`statValue`](/reference/stats#statvalue), so a [derived stat](/reference/stats#derived-stats) is worked out from its formula, and a stat the save doesn't have yet reads as its `start`. [`holds`](#holds) called without a game can't do either, and reads `state.stats` as it is, with a missing stat as 0.

With `of`, it tests an [entity](/reference/entities)'s stat. `of` is an [entity reference](/reference/entities#entityref), or `'$'` inside an [`each`](/reference/effects#each) or a [`count`](#count)'s `where`.

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
```

How many [entities](/reference/entities) of a kind there are, against a [range](#range). A bare `{ count }` means at least one. With `where`, it counts the ones `where` holds for, testing it once for each with `'$'` as that one. A kind with none, or one the game doesn't declare, has 0.

A `count` binds its own `'$'`. Inside an [`each`](/reference/effects#each)'s `where`, the `'$'` in a `count`'s `where` is the one being counted, not the one the `each` is on.

The [content checker](/reference/checks) checks the kind and the `where`. [`explain`](#explain) says `3 staff; wants 2 or more`, or `1 staff where it holds; wants more than 0` with a `where`. It doesn't break down what `where` read for each one.

### entity

```ts
{ entity: 'staff:ana' }
```

The [entity](/reference/entities) is in the game, which means it was declared or created and hasn't been removed. [`explain`](#explain) says `staff:ana is in the game` or `staff:ana is not in the game`.

**Gotcha.** Inside an [`each`](/reference/effects#each) or a [`count`](#count)'s `where`, `'$'` is bound here as it is in an `of`, so `{ entity: '$' }` is the one being looked at and is always true. Anywhere else, `'$'` names nothing and the condition is false.

### level

```ts
{ level: 'cooking' }                        // level 1 or more
{ level: 'cooking', gte: 2 }                // level 2 or more
{ level: 'cooking', lt: 3 }                 // not yet level 3
{ level: 'skill', of: 'staff:ana', gte: 2 } // an entity's level
```

Tests the level a stat with [`levels`](/reference/stats#levels) is at, against a [range](#range). The level is how many of the stat's `levels.at` thresholds its value has reached, as [`statLevel`](/reference/stats#statlevel) works it out. A bare `{ level }` means level 1 or more.

With `of`, it reads an [entity](/reference/entities)'s level, as [`{ stat }`](#stat) does. An entity that isn't there fails every range, `lt` included.

```ts
// declared with the stat:
{ id: 'cooking', label: 'Cooking', levels: { at: [10, 30, 60] } }
```

**Gotchas.**
- A stat with no `levels` is always at level 0, so `{ level: 'charm' }` on it never holds and `lt` always does. The loader checks that the stat is declared and named on the right owner, but not that it has levels.
- It needs the game to find the levels. [`holds`](#holds) without a game reads every level as 0.

[`explain`](#explain) says `stat cooking is at level 1; wants 2 or more`, or `staff:ana stat skill is at level 2; wants 2 or more` with an `of`.

### tier

```ts
{ tier: 'charm', gte: 2 }
```

True when the stat has reached at least `gte` of its declared [`bands`](/reference/stats#statdef), the hidden thresholds you declare with the stat. Bands keep thresholds in one place and off the screen. A stat with no bands is always in band 0, so only `gte: 0` passes. There's no `lt`, so use `not`.

**Gotcha.** `tier` needs the game to find the bands. [`holds`](#holds) without a game returns false for it, whatever `gte` is.

The band comes from [`statBand`](/reference/stats#statband), which uses the `tier()` helper. It's exported for your own use:

```ts
function tier(value: number, thresholds: readonly number[]): number
```

It returns how many thresholds `value` has reached, counting from the first and stopping at the first it hasn't reached. Give the thresholds in ascending order.

```ts
import { tier } from '@ifloom/engine'

tier(4, [5, 10, 20])   // 0
tier(12, [5, 10, 20])  // 2

// declared with the stat:
{ id: 'charm', label: 'Charm', bands: [10, 20, 30] }
```

### storyline

```ts
{ storyline: 'ava' }                // open
{ storyline: 'ava', open: false }   // closed for now
```

Whether a [storyline](/reference/storylines) is open, meaning it isn't closed or was closed until a turn that has now come (as [`storylineOpen`](/reference/storylines#storylineof-and-storylineopen) says). With `open: false`, it asks whether the storyline is closed for now. `open` is `true` if you leave it out. A storyline the save doesn't have reads as open, and the [content checker](/reference/checks) reports one the game doesn't declare.

[`explain`](#explain) says `storyline ava is closed; wants it open`.

**Gotcha.** A storyline doesn't keep score of how well someone likes the player. Test that as a stat on the [cast](/plugins/cast#each-one-is-an-entity)'s characters, as in `{ stat: 'friendship', of: person('ava'), gte: 20 }`.

### counter

```ts
{ counter: { storyline: 'ava', key: 'visits' }, gte: 3 }
```

Tests a storyline variable's number against a range. A variable that's missing or isn't a number counts as 0.

### item

```ts
{ item: 'sandwich' }            // has at least one
{ item: 'sandwich', gte: 3 }
```

How many of an item the player has. Something the [wardrobe plugin](/plugins/wardrobe) has them wearing still counts.

### collection

```ts
{ collection: 'notes', id: 'welcome' }   // that entry is there
{ collection: 'notes' }                  // at least one entry
{ collection: 'notes', gte: 10 }         // ten or more
{ collection: 'notes', lt: 1 }           // none at all
```

What's in a [collection](/reference/collections). With `id`, it's true when an entry with that id is there, and any range is ignored. Without `id`, it tests the number of entries against the range, and a bare one means at least 1. A collection nothing has been collected into has 0.

The [content checker](/reference/checks) reports a collection the game doesn't declare. [`explain`](#explain) says what it found, as in `notes has 1; wants 3 or more` or `notes lacks welcome; wants it there`.

### has

```ts
{ has: 'raincoat' }
```

The player has at least one. It's the same as a bare `{ item: 'raincoat' }`. With the [wardrobe plugin](/plugins/wardrobe), a worn raincoat counts. To ask whether it's on, use the plugin's `wardrobe/wearing` condition.

### scene

```ts
{ scene: ['ava.hi'] }
```

The scene on screen is one of these. It's false when no scene is open.

### turn

```ts
{ turn: true, gte: 3 }   // the fourth turn on
{ turn: true, lt: 1 }    // still the first turn
```

How many [turns](/reference/state#turn) have passed, counting from 0. A bare `{ turn: true }` is false in turn 0. Your game decides how long a turn is. It's a day with the [calendar](/plugins/calendar#what-a-turn-is)'s default, or a chapter in a novel that ends its turns with the [`turn`](/reference/effects#turn) effect.

The engine keeps no clock but the turn, so there's no core condition for the time of day. The period, the weekday and the day come from the [calendar plugin](/plugins/calendar#conditions) as [plugin calls](#plugin-shorthand): `period('morning')`, `weekday(5, 6)` and `day({ gte: 2 })`.

### phase

```ts
{ phase: ['arrival', 'first-day'] }
```

The game's current [stage](/reference/state#phase) is one of these.

### Where the player is

The engine keeps no places, so it has no condition for where the player is. With the [places plugin](/plugins/places#conditions), write `at('cafe', 'park')` (short for `{ 'places/at': ['cafe', 'park'] }`) for "in one of these places", and `within('cafe')` for "in the café or a room inside it".

It doesn't keep characters either. With the [cast](/plugins/cast#conditions), write `here('ava')` (short for `{ 'cast/here': ['ava'] }`) for "Ava is in the room with the player", and `isAt('ava', 'park')` for "Ava is in the park, wherever the player is".

**Gotcha.** An object whose key the engine doesn't know, such as `{ at: ['cafe'] }`, never holds, and the loader doesn't report it.

### custom

```ts
{ custom: 'marketDay' }
{ custom: 'priceBelow', with: { coins: 4 } }
{ custom: 'quests/done', with: { quest: 'bread' } }
```

Calls a [custom condition](/reference/custom#conditions) the game declares in `game.custom.conditions`, or a [plugin](/reference/plugins#naming)'s condition, named with the plugin's id in front. Use it for a test worked out from several values rather than read from one. The content stays data, and a mod can use it without shipping code.

`with` is passed to the function as its arguments, or `{}` when you leave it out. A name with a `/` is looked up among the game's plugins first.

```ts
import type { Game } from '@ifloom/engine'

const town: Game = {
  // ...
  custom: {
    conditions: {
      marketDay: (state) => state.turn % 7 === 5 && !state.flags.rainedOff,
    },
  },
}
```

**Gotchas.**
- A name that neither the game nor its plugins declare is false rather than an error, so a broken mod hides content instead of crashing. The [content checker](/reference/checks) reports it.
- Without a `game`, every `{ custom }` is false.

### Plugin shorthand

```ts
{ 'quests/done': { quest: 'bread' } }    // { custom: 'quests/done', with: { quest: 'bread' } }
{ 'wardrobe/wearing': { item: 'raincoat' } }
```

A plugin's condition with its full name as the only key. See [`PluginCall`](/reference/custom#plugincall) for how the value becomes `with`. It holds, fails and is checked exactly like the `{ custom }` it stands for.

## holds

```ts
function holds(state: GameState, condition: Condition | undefined, game?: Game): boolean
```

Evaluates a condition. `undefined` is true, so a `when` you leave out always applies.

```ts
import { holds } from '@ifloom/engine'
import { at } from '@ifloom/plugin-places'
import { here } from '@ifloom/plugin-cast'

holds(state, { has: 'scarf' })                // true with a scarf
holds(state, at('cafe'), town)                // a plugin's condition needs the game
holds(state, here('ava'), town)               // so does the cast's
```

**Gotcha.** `tier`, `custom` and a plugin's condition need `game`. Without it, they're all false. A `count`'s `where` is tested with the same `game`, or without one.

## inRange

```ts
function inRange(value: number, range: Range): boolean
```

Whether a number is in a [`Range`](#range), tested the way every built-in condition tests one. Every bound given must hold, and a range with no bounds at all asks whether the number is above 0. Use it in a [plugin](/reference/plugins)'s condition that takes a range in its `with`, so it reads the way the built-in ones do.

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
    { flag: 'metAva' },
    { any: [{ stat: 'coins', gte: 5 }, { tier: 'charm', gte: 1 }] },
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
- Pass `game`, as with `holds`. Without it, the custom and plugin leaves fail, and so does `tier`, though its text says `band 0`.

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
//   ✓ flag metAva is true; wants set
//   ✓ any of 2: 1 hold
//     ✗ stat coins is 3; wants 5 or more
//     ✓ stat charm is in band 1; wants band 1 or more
//   ✗ not: the part below holds
//     ✓ custom condition places/at
```
