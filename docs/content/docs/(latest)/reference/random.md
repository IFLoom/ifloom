---
title: "Randomness"
description: "Reference for the save's seed and the seeded draws hash, draw, drawOne, chance and weighted, which give the same values for the same save and turn."
---
The engine draws every value that looks random, such as today's cake at the café, by hashing parts the code names: usually the save's seed, the [turn](/docs/reference/state#turn) and what the draw is for. Nothing is random at runtime, so the same save in the same turn always gives the same draws. [Why IFLoom works this way](/docs/explanation/design#the-same-save-gives-the-same-draws) explains why, and [`CustomContext`](/docs/reference/custom#customcontext)'s `roll(max, name)` draws for the game's own code without naming the parts.

In the showcase: `examples/showcase/src/rules.ts`, whose `postLatest` macro draws a post's likes with `roll(10, 'likes')`.

```ts
import { chance, draw, drawOne, hash, weighted } from '@ifloom/engine'
```

## State

[`state.seed`](/docs/reference/state#seed) is a number fixed for the life of a save. A new game takes the `seed` given to [`startingState`](/docs/reference/commands#startingstate) or the [`start`](/docs/reference/commands#start) command, and `hash(game.id)` when none is given. A draw that should differ between saves puts the seed in its parts.

A UI picks a fresh seed for each new game outside the game, once, and the save fixes every draw after it. [`mountGame`](/docs/reference/react#mountgame) in the React UI does this. A test leaves the seed out, so every run draws the same.

```ts given
import { startingState } from '@ifloom/engine'

const fresh = startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) })
const fixed = startingState(game)
```

Each value takes its own named draw. Values sliced out of one number can move together, so turn 4 and turn 5 come out alike, while `hash` gives unrelated numbers for near-identical parts. A count added to an index and taken modulo a list's length lines up with a weekly calendar, so a list dealt on fixed weekdays repeats.

```ts given
import { chance, draw, drawOne } from '@ifloom/engine'

const special = drawOne(['lemon drizzle', 'carrot', 'chocolate'], state.seed, state.turn, 'cafe.special')
const price = 3 + draw(3, state.seed, state.turn, 'cafe.price')
const queue = chance(1, 4, state.seed, state.turn, 'cafe.queue')
```

## Functions

### hash

Returns a 32-bit unsigned whole number for a string, where strings that differ in one character give unrelated numbers. Its signature is in [`hash`](/docs/api/engine#hash).

It runs FNV-1a, then the murmur3 finaliser. `draw`, `drawOne`, `chance` and `weighted` are built on it.

```ts
import { hash } from '@ifloom/engine'

export const n = hash('market') // a number from 0 to 2^32 - 1
```

### draw

Returns a whole number from 0 up to but not including `max`, drawn from the parts joined with `:`. Its signature is in [`draw`](/docs/api/engine#draw).

It returns 0 when `max` is 0 or less. The engine joins the parts into one string, so `draw(6, 'a:b')` and `draw(6, 'a', 'b')` are the same draw. A dice roll in content is the [`roll` effect](/docs/reference/rolls), which draws each die this way and records the roll for the view.

```ts given
import { draw } from '@ifloom/engine'

draw(6, state.seed, state.turn, 'dice') // 0 to 5
```

### drawOne

Returns one entry of a list, drawn from the parts, with every entry equally likely. Its signature is in [`drawOne`](/docs/api/engine#drawone).

It returns `undefined` for an empty list, though its type doesn't say so.

```ts given
import { drawOne } from '@ifloom/engine'

drawOne(['rye', 'sourdough', 'brioche'], state.seed, state.turn, 'bakery.loaf')
```

### chance

Returns true `numerator` times in `outOf`, drawn from the parts. Its signature is in [`chance`](/docs/api/engine#chance).

The same parts give the same answer every time. A chance that comes up fresh on each visit puts a count of visits in its parts.

```ts given
import { chance } from '@ifloom/engine'

chance(1, 3, state.seed, state.turn, 'park.ducks') // one turn in three
```

### weighted

Returns one entry of a list, drawn from the parts by each entry's weight, or `undefined` when no entry can be drawn. Its signature is in [`weighted`](/docs/api/engine#weighted).

`weightOf` gives each entry's weight, and an entry of weight 3 comes up three times as often as one of weight 1. A weight left out counts as 1, and fractions count too, so 0.5 is half as likely as 1. An entry whose weight is 0 or less, or not a finite number, is never drawn, and a list with no entry above 0 draws nothing.

```ts given
import { weighted } from '@ifloom/engine'

const cakes = [{ id: 'lemon', weight: 3 }, { id: 'carrot' }, { id: 'walnut', weight: 0 }]

weighted(cakes, (cake) => cake.weight, state.seed, state.turn, 'cafe.cake') // lemon three times in four
```

With every weight a whole number, the draw is `hash(parts) % total`, walking the list in order. So a list where every weight is 1 draws the entry [`drawOne`](#drawone) would, and weights added later leave a list without them drawing as before. The engine draws with it for [storylets](/docs/reference/storylets), [variants](/docs/reference/prose) with a weight, [pool files](/docs/reference/media) and shuffled [playlists](/docs/reference/audio).

## Caveats

- A UI that leaves the seed out gives every new game the same draws, since they all share the game's id.
- `Math.random` in content or in the game's code breaks undo, replays and tests, since a state no longer gives one screen.
- The order of a list matters to `weighted` and `drawOne`, so the same parts and weights in another order can draw another entry.
- The same parts give the same entry, so code that draws twice in one turn puts a count in the parts, as the engine does for storylets and variants.
