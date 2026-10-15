# Conditions

A condition says when something applies — a line of prose, a choice, a lock, where someone is. It is plain nested data, so content stays serialisable and the [loader](/reference/loader) can check every id in it.

```ts
import { at } from '@ifloom/plugin-places'

const cafeRegular = {
  all: [
    at('cafe'),
    { stat: 'coins', gte: 4 },
    { seen: 'cafe.first-visit' },
    { not: { flag: 'owesRosa' } },
  ],
}
```

```ts
import { holds, inRange, explain, explainText, type Condition } from '@ifloom/engine'
```

When a choice is greyed out or a line is missing and you cannot see why, [`explain`](#explain) walks the condition and says which part failed and what it read.

## Where conditions are used

- Declarative [scenes](/reference/scenes): a block's `when`, a choice's `when`, `blocked` and `labels`, a `variants` block's `gate`.
- The game's own [actions](/reference/actions#actiondef): `when` and `blocked`.
- A plugin's content: the [places plugin](/plugins/places#locationdef)'s rooms, for one — `locked`, a body block's `when` and `gate`, and each room action's `when` and `blocked`.
- A [cast](/plugins/cast#characterdef) character's `schedule`, `talk`, `call` and `met`, with `'$'` as that character.
- An [activity](/reference/actions#requirement)'s `requires`.
- [Stages](/reference/progress#stages): `needs`.
- [Locks](/reference/locks): `when`.
- [Triggers](/reference/triggers): `when`.
- [Inputs](/reference/inputs): `when`.

## Range

```ts
type Range = { gte?: number; gt?: number; lte?: number; lt?: number }
```

Many conditions compare a number against a range: at least `gte`, above `gt`, at most `lte`, below `lt`. Any bound may be left out, and every bound given must hold.

**A bare range — no bounds at all — means "any of it": the value is above 0.** So `{ item: 'bun' }` is "has a bun", and `{ seen: 'cafe.first-visit' }` is "has seen it at least once".

```ts
{ stat: 'fitness', gte: 10 }          // 10 or more
{ stat: 'fitness', gt: 10 }           // more than 10
{ stat: 'fitness', lt: 10 }           // below 10
{ stat: 'coins', gte: 5, lte: 20 }    // 5 to 20
{ stat: 'energy' }                    // above 0
```

## Condition

```ts
type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | ({ flag: string; is?: FlagValue; of?: string } & Range)
  | ({ chose: string } & Range)
  | ({ seen: string } & Range)
  | ({ since: string } & Range)
  | { storylineFlag: { storyline: string; key: string; is?: FlagValue } }
  | ({ stat: StatKey; of?: string } & Range)
  | ({ count: string; where?: Condition } & Range)
  | { entity: string }
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

**Gotcha.** One kind per object. The engine looks for the keys in the order listed above and uses the first it finds, so `{ flag: 'x', has: 'scarf' }` tests only the flag. Combine with `all`. The exception is a call: after `all`, `any` and `not`, a `{ custom }` or a [short call](#plugin-shorthand) is recognised before anything else.

### all, any, not

```ts
{ all: [{ flag: 'marketDay' }, { has: 'scarf' }] }   // on market day, with a scarf
{ any: [{ has: 'umbrella' }, { has: 'raincoat' }] }
{ not: { phase: ['arrival'] } }
```

`{ all: [] }` is true; `{ any: [] }` is false.

### flag

```ts
{ flag: 'marketOpen' }             // set to anything truthy
{ flag: 'errand', is: 'bread' }    // exactly this value
{ flag: 'loavesBought', gte: 3 }   // a number, 3 or more
```

A game [variable](/reference/state#flags). Three tests, by what is given:

- **`is`**: strict equality, so `1` and `'1'` differ. Any range bound beside it is ignored.
- **a [range](#range) bound** (`gte`, `gt`, `lte`, `lt`): the variable's number is in the range. A variable that is not a number — unset, text, `true` — counts as 0.
- **neither**: the variable is truthy (`0`, `''` and `false` are not).

Count with the [`flag`](/reference/effects#flag) effect's `add` form, and test the count with a range.

With `of`, an [entity](/reference/entities)'s variable: `{ flag: 'role', of: 'staff:ana', is: 'cook' }`, or `of: '$'` in an [`each`](/reference/effects#each) or a [`count`](#count)'s `where`. The same three tests apply.

**Gotcha.** With `of`, an entity that is not there fails, whatever was asked, `lt` and `is` included, as [`stat`](#stat) does: `{ flag: 'warned', of: 'staff:ghost', lt: 1 }` is false. To ask that something is *not* set on one that may have gone, write `{ not: { flag: 'warned', of: 'staff:ghost' } }`, which is true for a missing one.

### chose

```ts
{ chose: 'cafe.counter/buy-bread' }          // picked at least once
{ chose: 'cafe.counter/buy-bread', gte: 3 }  // three times or more
{ chose: 'cafe.counter/buy-bread', lt: 1 }   // never
```

How many times the player has picked a choice, keyed `scene/choice` — the scene's id, a slash, the choice's id; see [`chosen`](/reference/state#chosen). A bare `{ chose }` means at least once. Every choice is counted, so a later scene can branch on an earlier decision without the choice setting a variable.

**Gotcha.** The [loader](/reference/loader#the-checks) checks the key: `gated on a choice in unknown scene "…"` when no scene has the part before the last slash, and `gated on unknown choice "…"` when a data scene has no choice with that id. A scene written by hand is taken at its word, since its choices are not known until it renders.

### seen

```ts
{ seen: 'cafe.first-visit' }        // entered at least once
{ seen: 'cafe.first-visit', gte: 3 } // three times or more
{ seen: 'cafe.first-visit', lt: 1 }  // never
```

How many times the player has entered a scene; see [`seen`](/reference/state#seen). This is the **order** half of a gate: it says the step before has happened. A stat threshold alone says how good the player is, not how far they have got.

### since

```ts
{ since: 'ada.lend-book', gte: 3 }   // three or more whole turns after first seeing it
{ since: 'ada.lend-book', lt: 2 }    // within two turns of it
```

Whole [turns](/reference/state#turn) since a scene was first entered; see [`seenOn`](/reference/state#seenon). With the [calendar](/plugins/calendar)'s default, a turn is a day. This is the **pace** half of a gate.

**Gotchas.** A scene not yet seen fails every range, `lt` included. A bare `{ since: 'x' }` means "at least one turn since", so it is false in the same turn.

### storylineFlag

```ts
{ storylineFlag: { storyline: 'ada', key: 'lentBook' } }
{ storylineFlag: { storyline: 'ada', key: 'favourite', is: 'poetry' } }
```

As [`flag`](#flag), on a storyline's variables.

### stat

```ts
{ stat: 'charisma', gte: 6 }
```

A [stat](/reference/state#stats) against a range. Coins, energy and every other number the player has are [declared stats](/reference/stats), so this is the condition for all of them:

```ts
{ stat: 'coins', gte: 4 }     // can afford a 4c loaf
{ stat: 'energy', lt: 20 }    // flagging
```

With `of`, an [entity](/reference/entities)'s stat: `of` is an [entity reference](/reference/entities#entityref), or `'$'` in an [`each`](/reference/effects#each) or a [`count`](#count)'s `where`.

```ts
{ stat: 'quality', of: 'dish:soup', lt: 5 }    // the soup could still be better
{ stat: 'morale', of: '$', lt: 20 }             // in an each: this one is ready to quit
```

**Gotcha.** An entity that is not there fails every range, `lt` included: someone who has left is not "below 20 morale". So is `'$'` anywhere it is not bound.

[`explain`](#explain) says `staff:ana stat morale is 80; wants 90 or more`, or `staff:cleo is not in the game`.

### count

```ts
{ count: 'staff' }                                                    // anyone at all
{ count: 'staff', lt: 4 }                                             // room for one more
{ count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 }   // two happy people
```

How many [entities](/reference/entities) of a kind there are, against a [range](#range). A bare `{ count }` means at least one. With `where`, how many it holds for: `where` is tested once for each, with `'$'` as that one. A kind with none, or one the game does not declare, has 0.

A `count` binds its own `'$'`: inside an [`each`](/reference/effects#each)'s `where`, the `'$'` in a `count`'s `where` is the one being counted, not the one the `each` is on.

The loader reports a kind the game does not declare (`unknown kind "…"`), and checks `where` as any other condition. [`explain`](#explain) says `3 staff; wants 2 or more`, or `1 staff where it holds; wants more than 0` with a `where`; it does not break down what `where` read for each.

### entity

```ts
{ entity: 'staff:ana' }
```

The [entity](/reference/entities) is in the game: declared and not removed, or created and not removed. [`explain`](#explain) says `staff:ana is in the game` or `staff:ana is not in the game`. The loader reports a kind the game does not declare.

**Gotcha.** Inside an [`each`](/reference/effects#each) or a [`count`](#count)'s `where`, `'$'` is bound here as it is in an `of`, so `{ entity: '$' }` is the one being looked at and always true. Anywhere else `'$'` names nothing and it is false.

### tier

```ts
{ tier: 'fitness', gte: 2 }
```

True when the stat has reached at least `gte` of its declared [`bands`](/reference/stats#statdef) — the hidden thresholds the game declares with the stat. Bands keep thresholds in one place and off the screen. A stat with no bands is always in band 0, so only `gte: 0` passes. There is no `lt`; use `not`.

The band count comes from the `tier()` helper, which is also exported for a game's own use:

```ts
function tier(value: number, thresholds: readonly number[]): number
```

How many thresholds `value` has reached, counting from the first and stopping at the first it has not reached. Thresholds go in ascending order.

```ts
import { tier } from '@ifloom/engine'

tier(4, [5, 10, 20])   // 0
tier(12, [5, 10, 20])  // 2

// declared with the stat:
{ id: 'fitness', label: 'Fitness', bands: [5, 12, 25] }
```

### storyline

```ts
{ storyline: 'ada' }                // open
{ storyline: 'ada', open: false }   // closed for now
```

Whether a [storyline](/reference/world) is open: not closed, or closed until a turn that has come (as [`storylineOpen`](/reference/world#storylineof-and-storylineopen) says). With `open: false`, whether it is closed for now. `open` is `true` if left out. A storyline the save does not have reads as open; the [loader](/reference/loader#the-checks) reports one the game does not declare.

[`explain`](#explain) says `storyline ada is closed; wants it open`.

**Gotcha.** How well someone likes the player is not a storyline's any more. Test it as a stat on the [cast](/plugins/cast#each-one-is-an-entity)'s characters: `{ stat: 'friendship', of: person('ada'), gte: 20 }`.

### counter

```ts
{ counter: { storyline: 'rosa', key: 'visits' }, gte: 3 }
```

A numeric storyline variable against a range. A variable that is missing or not a number counts as 0.

### item

```ts
{ item: 'bun' }            // has at least one
{ item: 'bun', gte: 3 }
```

How many the player has. Something the [wardrobe plugin](/plugins/wardrobe) has them wearing still counts: they still have it.

### collection

```ts
{ collection: 'letters', id: 'rosa.thanks' }   // that entry is there
{ collection: 'letters' }                       // at least one entry
{ collection: 'photos', gte: 10 }               // ten or more
{ collection: 'photos', lt: 1 }                 // none at all
```

What is in a [collection](/reference/collections). With `id`, true when an entry with that id is there; any range is then ignored. Without `id`, the number of entries against the range, with a bare one meaning at least 1. A collection nothing has been collected into has 0.

The loader reports a collection the game does not declare (`unknown collection "…"`).

[`explain`](#explain) says what it found: `letters has 1; wants 3 or more`, `letters lacks rosa.welcome; wants it there`.

### has

```ts
{ has: 'raincoat' }
```

Has at least one: the same as a bare `{ item: 'raincoat' }`. With the [wardrobe plugin](/plugins/wardrobe), a worn raincoat counts. To ask whether it is on, use the plugin's `wardrobe/wearing` condition.

### scene

```ts
{ scene: ['cafe.counter'] }
```

The scene on screen is one of these. False when no scene is open.

### turn

```ts
{ turn: true, gte: 3 }   // the fourth turn on
{ turn: true, lt: 1 }    // still the first turn
```

How many [turns](/reference/state#turn) have passed, counting from 0. A bare `{ turn: true }` is false in turn 0. What a turn is belongs to the game: a day, with the [calendar](/plugins/calendar#what-a-turn-is)'s default; a chapter, in a novel that ends its turns with the [`turn`](/reference/effects#turn) effect.

**The time of day is not a core condition.** The engine keeps no clock but the turn. The period, the weekday and the day come from the [calendar plugin](/plugins/calendar#conditions): `period('morning')`, `weekday(5, 6)`, `day({ gte: 2 })`, each a [plugin call](#plugin-shorthand).

### phase

```ts
{ phase: ['arrival', 'first-day'] }
```

The game's current [stage](/reference/state#phase).

### Where the player is

The engine keeps no places, so it has no condition for where the player is. With the [places plugin](/plugins/places#conditions), write `at('cafe', 'market')` (`{ 'places/at': ['cafe', 'market'] }`) for "in one of these places", and `within('cafe')` for "in the café or a room inside it".

Nor does it keep characters. With the [cast](/plugins/cast#conditions), write `here('ada')` (`{ 'cast/here': ['ada'] }`) for "Ada is in the room with the player", and `isAt('ada', 'library')` for "Ada is in the library, wherever the player is".

**Gotcha.** An old `{ at: ['cafe'] }`, `{ characterHere: 'ada' }` or `{ characterAt: … }` is not a condition any more: it never holds, and the loader does not report it.

### custom

```ts
{ custom: 'marketDay' }
{ custom: 'priceBelow', with: { coins: 4 } }
{ custom: 'quests/done', with: { quest: 'bread' } }
```

A [custom condition](/reference/custom#conditions) the game declares under `game.custom.conditions`, or a [plugin](/reference/plugins#naming)'s condition, named with the plugin's id in front. Use it for a test worked out from several values rather than read from one. Content stays data, and a mod can use it without shipping code.

`with` is passed to the function as its arguments, `{}` when left out. A name with a `/` is looked up among the game's plugins first.

```ts
const town: Game = {
  // ...
  custom: {
    conditions: {
      marketDay: (state) => state.turn % 7 === 5 && !state.flags.rainedOff,
    },
  },
}
```

**Gotcha.** A name that neither the game nor its plugins declare is false, not an error, so a broken mod hides content instead of crashing. The [loader](/reference/loader#the-checks) reports it as `no custom condition named "…"` — unless it belongs to a plugin the game does not have that one of its plugins [cooperates with](/reference/plugins#cooperates), which is quietly false. Without `game`, every `{ custom }` is false.

### Plugin shorthand

```ts
{ 'quests/done': { quest: 'bread' } }    // { custom: 'quests/done', with: { quest: 'bread' } }
{ 'wardrobe/wearing': { item: 'raincoat' } }
```

A plugin's condition with its full name as the only key; see [`PluginCall`](/reference/custom#plugincall) for how the value becomes `with`. It holds, fails and is checked exactly as the `{ custom }` it stands for.

## holds

```ts
function holds(state: GameState, condition: Condition | undefined, game?: Game): boolean
```

Evaluates a condition. `undefined` is true, so an optional `when` that is left out always applies.

```ts
holds(state, { has: 'scarf' })                // true with a scarf
holds(state, at('cafe'), town)                // a plugin's condition: needs the game
holds(state, here('ada'), town)               // the cast's: needs the game
```

**Gotcha.** `tier`, `custom` and a plugin's condition need `game`. Without it, `tier` reads band 0 and the others are false. A `count`'s `where` is tested with the same `game`, or without one.

## inRange

```ts
function inRange(value: number, range: Range): boolean
```

Whether a number is in a [`Range`](#range), as every built-in condition that takes one tests it: every bound given must hold, and a range with no bounds at all asks whether the number is above 0. For a [plugin](/reference/plugins)'s condition that takes a range in its `with`, so it reads the way the built-in ones do.

```ts
// A plugin condition: { 'dishes/dirty': { gte: 3 } }, or { 'dishes/dirty': true } for "any at all".
conditions: {
  dirty: (_state, args, { slice }) => inRange(slice.dirty, args as Range),
},
```

```ts
inRange(4, { gte: 3 })   // true
inRange(0, {})           // false: no bounds asks for above 0
```

**Gotcha.** `with` is unchecked content. Bounds that are not numbers compare as JavaScript does, so check them first if a mod might pass anything.

## Why does it hold?

The question every author asks sooner or later: *why is this choice greyed out?* or *why is this line missing?* `holds` says yes or no. `explain` says why, part by part.

### explain

```ts
function explain(state: GameState, condition: Condition | undefined, game?: Game): Explanation
```

Walks the whole condition against the state. Every part of an `all`, `any` or `not` is marked as holding or not, and every leaf says what it read and what it wanted. The top-level `holds` always agrees with [`holds`](#holds).

```ts
const why = explain(state, {
  all: [
    { flag: 'metRosa' },
    { any: [{ stat: 'coins', gte: 5 }, { tier: 'intelligence', gte: 1 }] },
    { not: at('cafe') },
  ],
}, town)

why.holds                  // false
why.parts?.[2].holds       // false: the player is in the café
why.parts?.[1].parts?.[0].why  // 'stat coins is 3; wants 5 or more'
```

No condition gives `{ holds: true, why: 'no condition' }`.

**Gotcha.** A `{ custom }` leaf can only say which function it called (`custom condition marketDay`), not what that function read. Pass `game`, as with `holds`; without it, `tier` reads band 0 and the custom and plugin leaves fail.

### Explanation

```ts
type Explanation = {
  holds: boolean
  why: string               // one line: what this part checked, what it found
  parts?: Explanation[]     // the parts of an all, any or not
}
```

### explainText

```ts
function explainText(explanation: Explanation, depth?: number): string
```

The explanation as indented lines, ✓ or ✗ on each, two spaces per level: for a log, a test failure message or a debug panel. `depth` (default 0) indents the whole tree.

```ts
console.log(explainText(why))
// ✗ all of 3: 1 fail
//   ✓ flag metRosa is true; wants set
//   ✓ any of 2: 1 hold
//     ✗ stat coins is 3; wants 5 or more
//     ✓ stat intelligence is in band 1; wants band 1 or more
//   ✗ not: the part below holds
//     ✓ custom condition places/at
```

## referenced

```ts
function referenced(condition: Condition | undefined): {
  storylines: string[]; items: string[]
  custom: string[]; scenes: string[]; stats: string[]
  collections: string[]; choices: string[]; kinds: string[]
  owned: { stat: string; of?: string }[]
  calls: { custom: string; with?: Record<string, unknown> }[]
}
```

Every id a condition names, by kind, for checking against a game. `kinds` holds the [kinds](/reference/entities) from `{ count }`, from `{ entity }` and from every `of` (the part before the colon; `'$'` names none), and `referenced` looks inside a `count`'s `where` too. The loader uses it on data scenes, activity requirements, triggers, inputs and the game's own actions, and hands plugins its `conditionProblems` to check their own content with. Place and character ids are plugins', so they are not listed here: they come back under `custom` and `calls` (`places/at` with `{ value: ['cafe'] }`, `cast/here` with `{ value: ['baker'] }`), for the plugin's `argProblems` to check. A [short call](#plugin-shorthand) is listed under `custom` by its name. `owned` is every stat a `{ stat }` names, with whose (`of`), for checking it belongs there. `calls` is every call to a custom or plugin condition, by name with what it passes in `with` (a short call's value that is not an object as `{ value }`), for asking a plugin's [`argProblems`](/reference/plugins#checking-calls).

```ts
referenced({ all: [{ 'stall/sells': 'bread' }, { storyline: 'baker' }] })
// { storylines: ['baker'], custom: ['stall/sells'], calls: [{ custom: 'stall/sells', with: { value: 'bread' } }], ... }
```

**Gotcha.** It does not collect the item in `{ has }`, so that is not checked by the loader.
