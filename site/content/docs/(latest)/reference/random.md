---
title: "Randomness"
description: "Seeded randomness: the save's seed, and roll, pick, chance and weighted for draws that replay the same."
---
To get a value that looks random, such as today's cake at the café, you draw it from parts you name, usually the save's seed, the [turn](/docs/reference/state#turn) and what the draw is for. The engine hashes those parts into a number. Nothing is random at runtime, so the same save in the same turn always gives the same draws.

```ts
import { hash, roll, pick, chance, weighted } from '@ifloom/engine'
```

## Why deterministic

- **Undo and snapshots.** A state is the whole game. Replaying a command from a saved state gives the same result, so undo goes back to the previous state, and a test can pin a screen exactly.
- **No save-scumming.** Reloading and trying again deals the same draw. The player can't re-roll today's market prices by walking out and back in.
- **Rendering is pure.** A scene's `render` runs every time the view is built and again when a choice is picked. With `Math.random`, the screen the player read and the choice they picked could disagree.

Don't call `Math.random` in content.

## The seed

`state.seed` is a number fixed for the life of a save. A new game takes the `seed` passed to [`startingState`](/docs/reference/commands#startingstate) or the [`start`](/docs/reference/commands#start) command. If you leave it out, it's `hash(game.id)`. Put the seed in your draws when a draw should differ between saves.

```ts
import { startingState } from '@ifloom/engine'

// A UI: a fresh seed for every new game, so each playthrough deals its own variants.
const state = startingState(town, { seed: Math.floor(Math.random() * 2 ** 31) })

// A test: no seed, so every run deals the same.
const fixed = startingState(town)
```

That one `Math.random` is outside the game. It picks the seed once, and the save fixes every draw after it. [`mountGame`](/docs/react#mountgame) in the React UI does this for you.

**Gotcha.** A UI that leaves the seed out deals every new game the same cards, because they all share the game's id.

## The rule: one named draw per value

Draw each value from its own named parts. Don't draw one number and slice several values out of it.

```ts
import { chance, hash, pick, roll } from '@ifloom/engine'

// Right: each value has its own draw.
const special = pick(CAKES, state.seed, state.turn, 'cafe.special')
const price   = 3 + roll(3, state.seed, state.turn, 'cafe.price')
const queue   = chance(1, 4, state.seed, state.turn, 'cafe.queue')

// Wrong: one number, carved up.
const n = hash(`${state.seed}:${state.turn}`)
const special = CAKES[n % CAKES.length]
const price   = 3 + ((n >> 8) % 3)
```

Near-identical inputs, such as turn 4 and turn 5, must give unrelated outputs. `hash` makes sure of that for whole numbers, but values carved from parts of one number can move together and come out the same turn after turn.

The same goes for rotating through a list. To deal a different member each time, hash the turn into a starting offset and walk the list from there, remembering which ones you've used. Don't add the turn number to an index and take a remainder. A count inside a remainder lines up with a weekly calendar. In a game whose turn is a day, a three-item list dealt on two fixed weekdays can give the same item every week.

## hash

```ts
import { hash } from '@ifloom/engine'

function hash(text: string): number
```

Turns a string into a 32-bit unsigned whole number, using FNV-1a followed by the murmur3 finaliser. Changing one character changes every bit. `roll`, `pick` and `chance` are built on it.

```ts
hash('market') // a number in [0, 2^32)
```

## roll

```ts
import { roll } from '@ifloom/engine'

function roll(max: number, ...parts: (string | number)[]): number
```

A whole number in `[0, max)`, from the parts joined with `:`. Returns `0` when `max` is `0` or less.

```ts
roll(6, state.seed, state.turn, 'dice') // 0 to 5
```

**Gotcha:** the parts are joined into one string, so `roll(6, 'a:b')` and `roll(6, 'a', 'b')` are the same draw. Keep `:` out of the names you draw with.

## pick

```ts
import { pick } from '@ifloom/engine'

function pick<T>(items: readonly T[], ...parts: (string | number)[]): T
```

One item from the list. It returns `undefined` for an empty list, though the type doesn't say so.

```ts
pick(['rye', 'sourdough', 'brioche'], state.seed, state.turn, 'bakery.loaf')
```

## chance

```ts
import { chance } from '@ifloom/engine'

function chance(numerator: number, outOf: number, ...parts: (string | number)[]): boolean
```

Returns `true` `numerator` times in `outOf`.

```ts
chance(1, 3, state.seed, state.turn, 'park.ducks') // one turn in three
```

**Gotcha:** the same parts give the same answer every time. If you want a chance to come up fresh on each visit, put something in its parts that changes per visit, such as a count of visits.

## weighted

```ts
import { weighted } from '@ifloom/engine'

function weighted<T>(
  items: readonly T[],
  weightOf: (item: T) => number | undefined,
  ...parts: (string | number)[]
): T | undefined
```

One item from the list, drawn by weight from the parts you name. `weightOf` says how much each item weighs, and an item of weight 3 comes up three times as often as one of weight 1.

```ts
import { weighted } from '@ifloom/engine'

const cakes = [
  { id: 'lemon', weight: 3 },
  { id: 'carrot' },              // no weight: 1
  { id: 'walnut', weight: 0 },   // never drawn
]

const cake = weighted(cakes, (cake) => cake.weight, state.seed, state.turn, 'cafe.cake')
// lemon three times in four, carrot once in four
```

The rules for a weight:

- A weight that's left out (`undefined`) counts as 1.
- A weight of 0 or less is never drawn. So is one that isn't a finite number, such as `NaN`.
- Weights don't have to be whole numbers. `0.5` is half as likely as 1.

It returns `undefined` when nothing can be drawn: an empty list, or one where every weight is 0 or less. Check for that before you use the result.

When every weight is a whole number, the draw is `hash(parts) % total`, walking the list in order. So a list where every weight is 1 draws exactly what [`pick`](#pick) would draw from the same parts, and you can add weights to a list later without changing the draws of a list that has none. With a weight that isn't whole, the hash is scaled to the total instead.

The engine draws with it wherever content has weights:

- [storylets](/docs/reference/storylets), the scenes a `{ kind: 'scene', from }` effect draws
- [variants](/docs/reference/prose#variantmember) with a weight on any member
- [pool files](/docs/reference/media#poolfile), when a pool request picks a file
- shuffled [playlists](/docs/reference/audio#playlistdef), drawn without replacement

**Gotchas.**
- The order of `items` matters. The same parts and the same weights in another order can draw a different item.
- Like every draw here, the same parts give the same item. Put a count in the parts if you draw more than once in a turn, as the engine does for storylets and variants.

## See it in an example

Small Town: `postLatest` in [`examples/showcase/src/rules.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/rules.ts) rolls a post's likes with `roll(10, state.seed, state.turn, 'likes')`.
