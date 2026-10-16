---
title: "Progress and limits"
---
These are two small toolkits for shaping a storyline over time:

- **Progress** covers counters kept on a storyline, ladders a count climbs, and stages that must happen in order and can wait a number of turns between them.
- **Limits** (`oncePerTurn`, `usedBlock`, `usedThisTurn` and `markUsed`) let a choice pay out once a [turn](/reference/state#turn), which is once a day in a game whose turn is a day.

The running example is a friendship with Ava, who runs the café, growing over a few weeks.

## Why limits

Talking usually costs no time. So a choice that pays something, such as friendship, a stat or money, and can be picked again is an endless farm. A player can click it twenty times in a row and skip the story, so any repeatable choice that pays needs a limit. A once-a-turn limit keeps the line on screen and the prose readable. It only caps the payout and never takes anything back, so the choice pays again next turn.

In a [`DataScene`](/reference/scenes#choice), `once: { per: 'turn' }` does this for you. Outside one, such as in a hand-written scene or an activity's effects, use the functions below.

## oncePerTurn

```ts
import { oncePerTurn } from '@ifloom/engine'

function oncePerTurn(state: GameState, id: string, effects: readonly Effect[]): Effect[]
```

Returns `effects` plus a flag recording that they were paid this [turn](/reference/state#turn), or an empty list if `id` has already paid this turn. With the [calendar](/plugins/calendar#what-a-turn-is)'s default, a turn is a day.

```ts
import { oncePerTurn } from '@ifloom/engine'
import { person } from '@ifloom/plugin-cast'

{
  id: 'chat',
  label: 'Ask how the coffee machine is behaving',
  effects: [
    ...oncePerTurn(state, 'ava.chat', [{ kind: 'stat', key: 'friendship', by: 2, of: person('ava') }]),
    { kind: 'scene', id: 'ava.chat.machine' },
  ],
}
```

**Gotcha:** keep effects that don't pay (like moving to the next scene) outside `oncePerTurn`. Otherwise the choice stops working, rather than just stopping paying.

## usedBlock

```ts
import { usedBlock } from '@ifloom/engine'

function usedBlock(state: GameState, id: string, reason: string): string | undefined
```

Returns `reason` if `id` has already paid this turn, and `undefined` otherwise. Pair it with `oncePerTurn` as the choice's `disabled`, so a spent line explains itself instead of quietly paying nothing.

```ts
disabled: usedBlock(state, 'ava.chat', 'She has a queue.'),
```

## usedThisTurn and markUsed

```ts
import { usedThisTurn, markUsed } from '@ifloom/engine'

function usedThisTurn(state: GameState, id: string): boolean
function markUsed(state: GameState, id: string): Effect
```

The two halves `oncePerTurn` is built from. `markUsed` is a `flag` effect that sets `turn:<id>` to the current turn number, and `usedThisTurn` checks that it equals the current turn. Nothing needs resetting at the end of a turn, because the next turn's number no longer matches.

**Gotcha:** the flag lives in `state.flags` under `turn:<id>`, so don't use that prefix for your own variables.

## Counters

```ts
import { count, counted, bumped } from '@ifloom/engine'

function count(state: GameState, storylineId: string, key: string): number
function counted(storylineId: string, key: string, value: number): Effect
function bumped(state: GameState, storylineId: string, key: string, by?: number): Effect
```

A counter is a number kept as a storyline variable. `count` reads it, giving `0` if it's unset or not a number. `counted` is an effect that sets it. `bumped` is an effect that adds `by` (default `1`) to its current value.

```ts
effects: [bumped(state, 'ava', 'coffeesBought')]
// later
if (count(state, 'ava', 'coffeesBought') >= 10) { /* she knows your order */ }
```

In data, the same counter is the `{ counter: { storyline, key }, gte }` [condition](/reference/conditions).

**Gotcha:** `bumped` reads the count when the effect is built. Two `bumped` effects for the same key in one list both start from the same value, so the second overwrites the first instead of adding to it.

## Ladders

```ts
import { stageAt, stageNext } from '@ifloom/engine'

function stageAt<R>(stages: readonly R[], reached: number): R
function stageNext<R>(stages: readonly R[], reached: number): R
```

A ladder is an array, and a count says how far up it the player is. `stageAt` is the stage for a one-based count, where anything below 1 is the first stage. `stageNext` is the one after. Both stop at the top.

```ts
const GREETINGS = ['ava.nod', 'ava.hello', 'ava.usual', 'ava.friend']
const visits = count(state, 'ava', 'visits')
stageAt(GREETINGS, visits)   // visits 0 or 1 → 'ava.nod', 3 → 'ava.usual', 9 → 'ava.friend'
stageNext(GREETINGS, visits) // visits 1 → 'ava.hello', 3 or more → 'ava.friend'
```

## Stages

```ts
import { stageOpen, stageDone, stagesDone, turnsSince, type Stages, type Stage } from '@ifloom/engine'

type Stages = {
  storylineId: string
  scope?: 'storyline' | 'game'  // where the done-flags live; default 'storyline'
  stages: readonly Stage[]
}

type Stage = {
  id: string
  flag: string                  // set when the stage happens
  scene?: string                // the scene it plays in
  after?: number                // whole turns since the previous stage's scene was first seen
  needs?: Condition             // what it wants beyond the previous stage being done
}
```

An ordered run of stages on one storyline. Each stage names the variable that records it happened, and what it asks for on top of the stage before it. The player can't reach a stage by skipping one, however good their numbers are.

`after` sets the pace. The stage waits that many whole [turns](/reference/state#turn) after the previous stage's scene was first entered, which is days in a game whose turn is a day. A stat alone is a poor clock, because it can rise faster than you planned, so a minimum number of turns keeps a friendship from happening in an afternoon.

```ts
import type { Stages } from '@ifloom/engine'

const AVA: Stages = {
  storylineId: 'ava',
  stages: [
    { id: 'name', flag: 'knowsName', scene: 'ava.name' },
    { id: 'recipe', flag: 'sharedRecipe', scene: 'ava.recipe', after: 3,
      needs: { counter: { storyline: 'ava', key: 'visits' }, gte: 5 } },
    { id: 'river', flag: 'avaTrusts', scene: 'ava.river', after: 7 },
  ],
}
```

### stageOpen

```ts
function stageOpen(state: GameState, stages: Stages, id: string, game?: Game): boolean
```

Whether this stage can happen now. It walks the stages from the start. Every stage up to and including this one must have its `needs` hold and its `after` satisfied, and every stage before it must be done. It's `false` for an unknown id.

`needs` is a [condition](/reference/conditions). Pass `game` when one of them uses `{ custom }` or a plugin's condition, such as the [cast](/plugins/cast#conditions)'s `here`, because those find nothing without it.

**Gotchas:**
- Earlier stages' `needs` must still hold, not just have held once.
- A stage with `after` whose previous stage has no `scene` throws, because there's nothing to measure from.
- `stageOpen` is still `true` once the stage is done. Test `stageDone` too if it shouldn't repeat.

### stageDone and stagesDone

```ts
function stageDone(state: GameState, stages: Stages, id: string): boolean
function stagesDone(state: GameState, stages: Stages): number
```

`stageDone` says whether this stage's flag is set. `stagesDone` counts how many stages are done, starting from the first and stopping at the first that isn't.

### turnsSince

```ts
function turnsSince(state: GameState, sceneId: string): number | null
```

Whole [turns](/reference/state#turn) since a scene was first entered, or `null` if it never has been. The engine records the first turn for every scene in [`state.seenOn`](/reference/state#seenon).

```ts
turnsSince(state, 'ava.name') // 4: four turns since you learned her name
```

In data, the same tests are the `{ seen }` and `{ since }` [conditions](/reference/conditions). Gate the next stage on `{ seen: 'ava.name' }`, and wait with `{ since: 'ava.name', gte: 3 }`.
