---
title: "Conditions"
description: "Every kind of condition, a test of the state written as data, and the functions that check one and explain why it fails."
---
A condition is a test of the state, written as plain data, that says when something applies: a line of prose, a choice, a lock or a character's schedule. Content writes one in a `when`, a `blocked` entry or a `gate`, and the [content checker](/docs/0.1.0/reference/checks) checks every id in it. [State, commands and the view](/docs/0.1.0/explanation/state-and-commands) explains why conditions are data, and [Find out why a choice doesn't show](/docs/0.1.0/how-to/troubleshoot-a-missing-choice) puts [`explain`](#explain) to work.

In the showcase: `examples/showcase/src/story/`, whose scenes gate their blocks and choices on conditions.

```ts
import { holds, inRange, explain, explainText, type Condition, type Explanation } from '@ifloom/engine'
```

## Condition

A test of the state that holds or doesn't, told apart by its one key, such as `{ stat: 'coins', gte: 3 }`. Every form is in [`Condition`](/docs/0.1.0/api/engine#condition).

A condition names what it reads by its noun (`stat`, `entity`, `storyline`), with a [`Range`](/docs/0.1.0/reference/common#range) or an `is` beside it. A condition that names nothing, such as `turn`, takes its range as its value, as in `{ turn: { gte: 3 } }`. A plugin's condition or the game's own is a [call](#conditioncall), whose one key is its name.

Effects use the same keys, so `{ kv: 'met' }` asks about the key that `{ kv: 'met', to: true }` sets. The field decides which one an object is, a condition in `when` and an effect in `effects`.

An object with two of the engine's keys, such as `{ kv: 'x', stat: 'coins' }`, never holds, since the engine can't tell which was meant. One with no key it knows, such as `{}` or `{ at: ['cafe'] }`, never holds either. The content checker reports both, so content joins two tests with [`all`](#all-any-not).

This condition holds for a regular at the café: at the café, with four coins, after meeting Ava, and owing her nothing.

```ts
import type { Condition } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const regularAtTheCafe: Condition = {
  all: [places.at('cafe'), { stat: 'coins', gte: 4 }, { seen: 'ava.hi' }, { not: { kv: 'owesAva' } }],
}
```

These fields take a condition:

- A scene's blocks (`when`), its choices (`when`, `blocked` and `labels`) and a `variants` block's `gate`. See [`DataScene`](/docs/0.1.0/reference/scenes#datascene).
- An [action](/docs/0.1.0/reference/actions#actiondef)'s `when` and `blocked`.
- A [lock](/docs/0.1.0/reference/locks)'s, a [trigger](/docs/0.1.0/reference/triggers)'s and an [input](/docs/0.1.0/reference/inputs)'s `when`.
- The game's `finished` and `saveable`. See [`Game`](/docs/0.1.0/reference/game#game).
- A plugin's content, such as a location's `blocked` in the [places plugin](/docs/0.1.0/reference/plugins/places) and a character's `schedule` in the [cast](/docs/0.1.0/reference/plugins/cast), with `'$'` for that character.

## Explanation

A condition walked part by part, as [`explain`](#explain) answers it, with whether each part holds and why. Every field is in [`Explanation`](/docs/0.1.0/api/engine#explanation).

`holds` says whether this part holds, and `why` is one line saying what it read and what it wanted. `parts` holds the parts of an `all`, `any` or `not`, each an `Explanation` of its own. [`explainText`](#explaintext) prints the tree.

## Conditions

Each kind of condition the engine keeps, by the key that tells it apart.

### all, any, not

`all` holds when every condition in its list holds, `any` when at least one does, and `not` when its one condition doesn't. `{ all: [] }` is true and `{ any: [] }` is false.

```ts fragment
{ all: [{ kv: 'marketDay' }, { entity: 'clothing:scarf', at: 'you' }] }
{ any: [{ entity: 'clothing:scarf', at: 'you' }, { entity: 'clothing:raincoat', at: 'you' }] }
{ not: { kv: 'phase', is: 'arrival' } }
```

### kv

Tests a key in the [kv store](/docs/0.1.0/reference/state#kv). The test depends on the fields beside it:

- **`is`** tests strict equality, so `1` and `'1'` differ, and a list holds when the key equals any of its values. A key nobody has set counts as 0, so `is: 0` holds for it and `is: false` doesn't. A range beside `is` is ignored.
- **A range** tests the key's number. A value that isn't a number (unset, text or `true`) counts as 0.
- **Neither** tests whether the key is truthy. `0`, `''` and `false` aren't.

```ts fragment
{ kv: 'marketOpen' }                       // set to anything truthy
{ kv: 'errand', is: 'bread' }              // exactly this value
{ kv: 'phase', is: ['arrival', 'open'] }   // one of these values
{ kv: 'coffeesBought', gte: 3 }            // a number, 3 or more
```

With `of`, it tests another kv store with the same three tests. `of` names an entity (`'staff:ana'`, or `'$'` inside an [`each`](/docs/0.1.0/reference/effects#each) or a [`count`](#count)'s `where`), a storyline (`'storyline:ava'`), or the minigame being played (`'minigame'`). A `'minigame'` test is false with no minigame running, and the checker reports a key no minigame declares.

```ts fragment
{ kv: 'role', of: 'staff:ana', is: 'cook' }       // an entity's
{ kv: 'visits', of: 'storyline:ava', gte: 3 }     // a storyline's
{ kv: 'score', of: 'minigame', gte: 3 }           // the running minigame's
```

An entity that isn't there fails every test, `lt` and `is` included, so `{ kv: 'warned', of: 'staff:ghost', lt: 1 }` is false. `{ not: { kv: 'warned', of: 'staff:ghost' } }` is true for a missing entity.

#### phase

The stretch of the game the player is in is the kv key [`phase`](/docs/0.1.0/reference/state#phase), read as any key is:

```ts fragment
{ kv: 'phase', is: ['arrival', 'first-day'] }
```

### setting

Tests a `play` [setting](/docs/0.1.0/reference/settings), the value in [`state.settings`](/docs/0.1.0/reference/state#settings), with the same three tests as [`kv`](#kv). A `ui` setting isn't in the state, so the checker reports a condition that names one, an unknown setting, and an `is` the setting can't take.

```ts fragment
{ setting: 'hints' }                    // a toggle that is on
{ setting: 'difficulty', is: 'hard' }   // exactly this option
{ setting: 'patience', gte: 6 }         // 6 or more
```

### chose

The number of times the player has chosen a choice, keyed by the scene's id, a `#` and the choice's id, against a range. A bare `{ chose }` means at least once. The engine counts every choice in [`chosen`](/docs/0.1.0/reference/state#chosen), so a later scene can branch on an earlier decision without a kv key. The checker checks the key against the scene's choices.

```ts fragment
{ chose: 'ava.hi#compliment' }          // chosen at least once
{ chose: 'ava.hi#compliment', gte: 3 }  // three times or more
{ chose: 'ava.hi#compliment', lt: 1 }   // never
```

### seen

The number of times the player has entered a scene, from [`seen`](/docs/0.1.0/reference/state#seen), against a range. A bare `{ seen }` means at least once. It gates on order, since it says the step before has happened.

```ts fragment
{ seen: 'ava.river' }          // entered at least once
{ seen: 'ava.hi', gte: 3 }     // three times or more
{ seen: 'ava.river', lt: 1 }   // never
```

### since

Whole [turns](/docs/0.1.0/reference/state#turn) since a scene was first entered, or since a choice was first chosen when the id is `scene#choice`, against a range. With `last: true`, it counts from the latest time instead, which makes a cooldown. A bare `{ since }` means at least one turn, so it's false in the same turn.

A scene not yet seen, or a choice not yet chosen, fails every range, `lt` included. So a cooldown is a `blocked` entry that holds while it's too soon. This bench can be visited again three turns after the last visit:

```ts fragment
{
  id: 'sit-by-the-river',
  blocked: [{ when: { since: 'river.bench', last: true, lt: 3 }, reason: 'You sat there only recently.' }],
  effects: [{ scene: 'river.bench' }],
}
```

### stat

Tests a [stat](/docs/0.1.0/reference/stats) against a range. It reads the stat with [`statValue`](/docs/0.1.0/reference/stats#statvalue), so a derived stat is worked out and a stat the save lacks reads as its `start`.

With `of`, it tests an [entity](/docs/0.1.0/reference/entities)'s stat: an [`EntityRef`](/docs/0.1.0/reference/common#entityref), `'$'` inside an `each` or a `count`'s `where`, `'you'` for the [protagonist](/docs/0.1.0/reference/glossary#you) or `'player'`. An entity that isn't there fails every range, `lt` included, and so does `'$'` where nothing binds it.

```ts fragment
{ stat: 'charm', gte: 6 }
{ stat: 'energy', lt: 20 }                      // flagging
{ stat: 'friendship', of: 'character:ava', gte: 20 }
{ stat: 'morale', of: '$', lt: 20 }             // in an each
```

### count

The number of [entities](/docs/0.1.0/reference/entities) of a kind, against a range. A bare `{ count }` means at least one, and a kind with none, or one the game doesn't declare, has 0. With `where`, it counts the entities `where` holds for, asking it once for each with `'$'` as that entity.

In place of a kind, `count` takes a [`Select`](/docs/0.1.0/reference/entities#select) of a kind, a holder, a tag, a trait and a `where`, and counts distinct entities. With `units: true` it adds up how many of each are held instead, by the `Select`'s holder or else by everyone. A `count` binds its own `'$'`, so inside an `each`'s `where`, a `count`'s `'$'` is the entity being counted.

```ts fragment
{ count: 'staff', lt: 4 }                                                 // room for one more
{ count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 }   // two happy people
{ count: { at: 'you', tag: 'fruit' }, gte: 3 }                            // three sorts of fruit on you
{ count: { of: 'food', at: 'place:larder' }, units: true, lt: 4 }         // fewer than four bits of food there
```

### entity

Tests an [entity](/docs/0.1.0/reference/entities). Bare, it holds while the entity is in the game, declared or created and not removed. With `at`, it tests how many of it a [holder](/docs/0.1.0/reference/glossary#holder) holds against a range, at least one without a range. With a range and no `at`, it tests how many everyone holds together. The [`holding`](/docs/0.1.0/reference/entities#give-take-move-and-holding) helper writes `{ entity, at: 'you', gte }`.

The checker reports a kind the game doesn't declare, and not an unknown id, since the entity may be made in play. Inside an `each` or a `count`'s `where`, `'$'` is bound here and in `at`, so `{ entity: '$' }` is always true there and false anywhere else.

```ts fragment
{ entity: 'staff:ana' }                          // Ana works here
{ entity: 'item:sandwich', at: 'you' }           // you have a sandwich
{ entity: 'gift:scarf', at: 'character:ava' }    // Ava has the scarf
```

### level

The level a stat with [`levels`](/docs/0.1.0/reference/stats#statlevels) has reached, against a range, as [`statLevel`](/docs/0.1.0/reference/stats#statlevel) works it out. A bare `{ level }` means level 1 or more. Hidden levels read the same way. With `of`, it reads an entity's level, as [`stat`](#stat) does.

A stat with no `levels` is always at level 0, so `{ level: 'charm' }` never holds on it. The checker checks that the stat is declared on the right owner, and not that it has levels.

```ts fragment
{ level: 'cooking', gte: 2 }                // level 2 or more
{ level: 'skill', of: 'staff:ana', lt: 3 }  // an entity's, not yet 3
```

### storyline

Holds while a [storyline](/docs/0.1.0/reference/storylines) is open, meaning not closed or closed until a turn that has come, as [`storylineOpen`](/docs/0.1.0/reference/storylines#storylineopen) says. `open: false` asks whether it's closed for now. A storyline the save lacks reads as open, and the checker reports one the game doesn't declare.

```ts fragment
{ storyline: 'ava' }                // open
{ storyline: 'ava', open: false }   // closed for now
```

### roll

The latest [roll](/docs/0.1.0/reference/rolls) made under a key. Bare, it asks whether one has been made. `passed` asks whether the total reached the roll's `against`, and is false either way for a roll with no target. `critical: true` asks whether every die showed its top face or every die showed 1, and `'max'` or `'min'` asks for one of them.

The total is a kv key, so `{ kv: 'skim', gte: 10 }` tests the number. A roll is kept until another roll under the same key replaces it, across turns and saves.

```ts fragment
{ roll: 'skim', passed: true }       // it reached its target
{ roll: 'climb', critical: 'max' }   // every die on its top face
```

### timer

Holds while one of the game's [timers](/docs/0.1.0/reference/timers) is running, or with a range, running with that many milliseconds left. It's false for a timer that isn't running, whatever the range. Time passes only on a [`tick`](/docs/0.1.0/reference/commands#tick), so a trigger on the time left fires after the tick that crosses it. The checker reports a timer the game doesn't declare.

```ts fragment
{ timer: 'phone' }               // running
{ timer: 'phone', lte: 3000 }    // running, with 3 seconds or less left
```

### scene

Holds while the scene on screen is one of a list. It's false when no scene is open.

```ts fragment
{ scene: ['ava.hi'] }
```

### turn

Tests the number of [turns](/docs/0.1.0/reference/state#turn) passed, from 0, against a range given as its value. `{ turn: {} }` is false in turn 0. The time of day, the weekday and the day are the [calendar plugin](/docs/0.1.0/reference/plugins/calendar)'s conditions, such as `calendar.period('morning')`.

```ts fragment
{ turn: { gte: 3 } }   // the fourth turn on
```

### ConditionCall

A condition of a plugin's or of the game's own, written as its full name with its arguments as the value, or `true` for none. Every form is in [`ConditionCall`](/docs/0.1.0/api/engine#conditioncall), and [`PluginCall`](/docs/0.1.0/reference/custom#plugincall) describes the short form.

The game's own conditions are in its [`rules`](/docs/0.1.0/reference/rules), called with `game/` in front, and a plugin's with the plugin's id in front. A plugin's helpers write its calls, such as `places.at('cafe')` for `{ 'places/at': { location: ['cafe'] } }` and `cast.here('ava')` for Ava being here. A name nobody declares is false rather than an error, so a broken mod hides content instead of crashing, and the checker reports it.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  conditions: {
    marketDay: (state) => state.turn % 7 === 5,
  },
}
```

Content then writes `{ 'game/marketDay': true }`. [Write your own condition, effect or macro](/docs/0.1.0/how-to/write-your-own-condition-or-effect) covers the rest.

## Functions

### holds

Returns whether a condition holds in a state. Its signature is in [`holds`](/docs/0.1.0/api/engine#holds).

`undefined` holds, so a `when` left out always applies. The state comes first and the game second, as in every function that reads the game in play.

```ts given
import { holds } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

holds(state, game, { kv: 'metAva' })   // true once you've met Ava
holds(state, game, places.at('cafe'))  // a plugin's condition
```

### inRange

Returns whether a number is in a [`Range`](/docs/0.1.0/reference/common#range), tested as every built-in condition tests one. Its signature is in [`inRange`](/docs/0.1.0/api/engine#inrange).

A plugin's condition that takes a range in its arguments calls it, so it reads as the built-in ones do. The engine works out the bounds at the top of a call's arguments before it asks the plugin. `inRange` works out a range deeper in, reading each [`Amount`](/docs/0.1.0/reference/amounts#amount) bound in the state and game given. A bound that isn't an amount reads as 0.

```ts
import { inRange, type Range } from '@ifloom/engine'
import { definePlugin } from '@ifloom/engine/plugin'

// { 'dishes/dirty': { gte: 3 } }, or { 'dishes/dirty': true } for any at all.
export const dishes = definePlugin<{ dirty: number }>({
  id: 'dishes',
  version: 1,
  start: () => ({ dirty: 0 }),
  conditions: {
    dirty: (state, args, { slice, game }) => inRange(state, game, slice.dirty, args as Range),
  },
})
```

### explain

Returns a condition walked part by part against a state, as an [`Explanation`](/docs/0.1.0/api/engine#explanation). Its signature is in [`explain`](/docs/0.1.0/api/engine#explain).

Each part of an `all`, `any` or `not` says whether it holds, and each leaf says what it read and what it wanted, such as `stat coins is 3; wants 5 or more`. The top `holds` always agrees with [`holds`](#holds). With no condition, it answers `{ holds: true, why: 'no condition' }`. A call says only which function it called, such as `custom condition game/marketDay`, and not what that function read.

```ts given
import { explain } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

const why = explain(state, game, {
  all: [{ kv: 'metAva' }, { any: [{ stat: 'coins', gte: 5 }, { level: 'charm', gte: 1 }] }, { not: places.at('cafe') }],
})

why.holds                        // false
why.parts?.[1].parts?.[0].why    // 'stat coins is 3; wants 5 or more'
```

### explainText

Returns an [`Explanation`](/docs/0.1.0/api/engine#explanation) as indented lines, with ✓ or ✗ on each, for a log, a test's failure message or a debug panel. Its signature is in [`explainText`](/docs/0.1.0/api/engine#explaintext). `depth` indents the whole tree, two spaces per level, from 0.

```ts continues
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

## Checks

The [content checker](/docs/0.1.0/reference/checks) checks every condition content writes:

| Problem | Cause |
|---|---|
| `a condition asks one thing, but this one has 2 keys that each say what it asks: kv, stat` | One object holds two of the engine's keys. |
| `a condition needs one key that says what it asks, such as kv or stat, or a call by name; this one has only "at"` | The object holds no key the engine knows. |
| `unknown stat "gold"`, `unknown storyline "nobody"` | The condition names a stat, storyline, scene, timer or setting the game doesn't declare. |
| `no game condition named "marketDay"; the game's own code is called with "game/" in front, as "game/marketDay"` | A call's name has no `game/` or plugin id in front. |

## Caveats

- A test on something missing fails every range, `lt` included: an entity that isn't there, a scene not seen in `since`, and a timer not running. `not` around a bare test asks the opposite.
- [`explain`](#explain) and `holds` need the game, or every call fails and `level` reads level 0.
