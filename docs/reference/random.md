# Randomness

IFLoom has no runtime randomness. Every "random" value is **drawn**: hashed from a list of parts you name, usually the save's seed, the [turn](/reference/state#turn), and what the draw is for. The same save in the same turn deals the same cards.

```ts
import { hash, roll, pick, chance } from '@ifloom/engine'
```

## Why deterministic

- **Undo and snapshots.** A state is the whole game. Replaying a command from a saved state gives the same result, so undo is "go back to the previous state", and a test can pin a screen exactly.
- **No save-scumming.** Reloading and trying again deals the same draw. The player can't re-roll today's market prices by walking out and back in.
- **Rendering is pure.** A scene's `render` runs every time the view is built and again when a choice is picked. With `Math.random` the screen the player read and the choice they picked could disagree.

Never call `Math.random` in content.

## The seed

`state.seed` is a number fixed for the life of a save. A new game takes the `seed` passed to [`startingState`](/reference/commands#startingstate) (or the [`start`](/reference/commands#start) command); left out, it is `hash(game.id)`. Put it in your draws when a draw should differ between saves.

```ts
// A UI: a fresh seed for every new game, so each playthrough deals its own variants.
const state = startingState(town, { seed: Math.floor(Math.random() * 2 ** 31) })

// A test: no seed, so every run deals the same.
const fixed = startingState(town)
```

That one `Math.random` is outside the game: it picks the seed once, and every draw after it is fixed by the save.

**Gotcha.** A UI that leaves the seed out deals every new game the same cards, since they all share the game's id.

## The rule: one named draw per value

Draw each value from its own named parts. **Never** draw one number and slice several values out of it.

```ts
// Right: each value has its own draw.
const special = pick(CAKES, state.seed, state.turn, 'cafe.special')
const price   = 3 + roll(3, state.seed, state.turn, 'cafe.price')
const queue   = chance(1, 4, state.seed, state.turn, 'cafe.queue')

// Wrong: one number, carved up.
const n = hash(`${state.seed}:${state.turn}`)
const special = CAKES[n % CAKES.length]
const price   = 3 + ((n >> 8) % 3)
```

Near-identical inputs — turn 4 and turn 5 — must give unrelated outputs. `hash` makes sure of that for whole numbers, but values carved from parts of one number can move together and come out the same turn after turn.

The same goes for rotating through a list. To deal a different member each time, hash the turn into a starting offset and walk the list from there, remembering which you have used — don't add the turn number to an index and take a remainder. A count inside a remainder lines up with a weekly calendar: in a game whose turn is a day, a three-item list dealt on two fixed weekdays can give the same item every week.

## hash

```ts
function hash(text: string): number
```

A 32-bit unsigned whole number from a string: FNV-1a followed by the murmur3 finaliser. Changing one character changes every bit. The others are built on it.

```ts
hash('market') // a number in [0, 2^32)
```

## roll

```ts
function roll(max: number, ...parts: (string | number)[]): number
```

A whole number in `[0, max)`, from the parts joined with `:`. Returns `0` when `max` is `0` or less.

```ts
roll(6, state.seed, state.turn, 'dice') // 0–5
```

**Gotcha:** the parts are joined into one string, so `roll(6, 'a:b')` and `roll(6, 'a', 'b')` are the same draw. Keep names free of `:` or accept that.

## pick

```ts
function pick<T>(items: readonly T[], ...parts: (string | number)[]): T
```

One item from the list. Returns `undefined` for an empty list (the type does not say so).

```ts
pick(['rye', 'sourdough', 'brioche'], state.seed, state.turn, 'bread')
```

## chance

```ts
function chance(numerator: number, outOf: number, ...parts: (string | number)[]): boolean
```

`true` `numerator` times in `outOf`.

```ts
chance(1, 3, state.seed, state.turn, 'librarian.in-a-mood') // one turn in three
```

**Gotcha:** the same parts give the same answer every time they are asked. A chance you want to come up fresh on each visit needs something that changes per visit in its parts — a counter of visits, say.
