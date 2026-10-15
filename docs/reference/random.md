# Randomness

To get a value that looks random, such as today's cake at the café, you draw it from parts you name, usually the save's seed, the [turn](/reference/state#turn) and what the draw is for. The engine hashes those parts into a number. Nothing is random at runtime, so the same save in the same turn always gives the same draws.

```ts
import { hash, roll, pick, chance } from '@ifloom/engine'
```

## Why deterministic

- **Undo and snapshots.** A state is the whole game. Replaying a command from a saved state gives the same result, so undo just goes back to the previous state, and a test can pin a screen exactly.
- **No save-scumming.** Reloading and trying again deals the same draw. The player can't re-roll today's market prices by walking out and back in.
- **Rendering is pure.** A scene's `render` runs every time the view is built and again when a choice is picked. With `Math.random`, the screen the player read and the choice they picked could disagree.

Don't call `Math.random` in content.

## The seed

`state.seed` is a number fixed for the life of a save. A new game takes the `seed` passed to [`startingState`](/reference/commands#startingstate) or the [`start`](/reference/commands#start) command. If you leave it out, it's `hash(game.id)`. Put the seed in your draws when a draw should differ between saves.

```ts
import { startingState } from '@ifloom/engine'

// A UI: a fresh seed for every new game, so each playthrough deals its own variants.
const state = startingState(town, { seed: Math.floor(Math.random() * 2 ** 31) })

// A test: no seed, so every run deals the same.
const fixed = startingState(town)
```

That one `Math.random` is outside the game. It picks the seed once, and the save fixes every draw after it. [`mountGame`](/react/#mountgame) in the React UI does this for you.

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
