# Progress and limits

Two small toolkits for the shape of a storyline over time:

- **Progress**: counters kept on a storyline, ladders a count climbs, and **stages** that must happen in order and can wait turns between them.
- **Limits** (`oncePerTurn`, `usedBlock`, `usedThisTurn`, `markUsed`): a payout that can be had once a [turn](/reference/state#turn) — once a day, in a game whose turn is a day.

The running example is a friendship with Rosa, the baker, that grows over a few weeks.

## Why limits

Talking usually costs no time. So a choice that pays something — a friendship, a stat, money — and can be picked again is an **infinite farm**: a player can click it twenty times in a row and skip the story. Any repeatable choice that pays must be limited. A once-a-turn limit keeps the line on screen and the prose readable; it caps only the payout, and it never takes anything back — come back next turn (tomorrow, in a game whose turn is a day) and it pays again.

In a [`DataScene`](/reference/scenes#choice), `once: { per: 'turn' }` does this for you. Outside one — a hand-written scene, an activity's effects — use the functions below.

## oncePerTurn

```ts
import { oncePerTurn } from '@ifloom/engine'

function oncePerTurn(state: GameState, id: string, effects: readonly Effect[]): Effect[]
```

`effects` plus a flag recording that they were paid this [turn](/reference/state#turn) — or an empty list if `id` has already paid this turn. With the [calendar](/plugins/calendar#what-a-turn-is)'s default, a turn is a day.

```ts
{
  id: 'chat',
  label: 'Ask how the ovens are',
  effects: [
    ...oncePerTurn(state, 'baker.chat', [{ kind: 'stat', key: 'friendship', by: 2, of: person('baker') }]),
    { kind: 'scene', id: 'baker.chat.ovens' },
  ],
}
```

**Gotcha:** keep non-paying effects (like moving to the next scene) outside `oncePerTurn`, or the choice stops working, not just stops paying.

## usedBlock

```ts
import { usedBlock } from '@ifloom/engine'

function usedBlock(state: GameState, id: string, reason: string): string | undefined
```

`reason` if `id` has already paid this turn, otherwise `undefined`. Pair it with `oncePerTurn` as the choice's `disabled`, so a spent line explains itself instead of quietly paying nothing.

```ts
disabled: usedBlock(state, 'baker.chat', 'She is busy with the second batch.'),
```

## usedThisTurn and markUsed

```ts
import { usedThisTurn, markUsed } from '@ifloom/engine'

function usedThisTurn(state: GameState, id: string): boolean
function markUsed(state: GameState, id: string): Effect
```

The two halves `oncePerTurn` is built from. `markUsed` is a `flag` effect setting `turn:<id>` to the current turn number; `usedThisTurn` checks it equals the current turn. Nothing needs resetting at the end of a turn — the next turn's number simply no longer matches.

**Gotcha:** that flag lives in `state.flags` under `turn:<id>`. Don't reuse that prefix for your own variables. A save from before version 3 had these under `day:<id>`; [`migrate`](/reference/saves#migrate) renames them.

## Counters

```ts
import { count, counted, bumped } from '@ifloom/engine'

function count(state: GameState, storylineId: string, key: string): number
function counted(storylineId: string, key: string, value: number): Effect
function bumped(state: GameState, storylineId: string, key: string, by?: number): Effect
```

A number kept as a storyline variable. `count` reads it (`0` if unset or not a number). `counted` is an effect that sets it. `bumped` is an effect that adds `by` (default `1`) to its current value.

```ts
effects: [bumped(state, 'baker', 'loavesBought')]
// later
if (count(state, 'baker', 'loavesBought') >= 10) { /* she knows your order */ }
```

In data, the same counter is the `{ counter: { storyline, key }, gte }` [condition](/reference/conditions).

**Gotcha:** `bumped` reads the count when the effect is built. Two `bumped` effects for the same key in one list both start from the same value, so the second overwrites the first instead of adding to it.

## Ladders

```ts
import { stageAt, stageNext } from '@ifloom/engine'

function stageAt<R>(stages: readonly R[], reached: number): R
function stageNext<R>(stages: readonly R[], reached: number): R
```

A ladder is an array; a count says how far up it the player is. `stageAt` is the stage for a one-based count (anything below 1 is the first stage); `stageNext` is the one after. Both stop at the top.

```ts
const GREETINGS = ['baker.nod', 'baker.hello', 'baker.usual', 'baker.friend']
const visits = count(state, 'baker', 'visits')
stageAt(GREETINGS, visits)   // visits 0 or 1 → 'baker.nod', 3 → 'baker.usual', 9 → 'baker.friend'
stageNext(GREETINGS, visits) // visits 1 → 'baker.hello', 3 or more → 'baker.friend'
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

An ordered run of stages on one storyline. Each stage names the variable that records it happened, and what it asks for **on top of the stage before it**. A stage can't be reached by skipping one, however good the player's numbers are.

`after` is the pace half: the stage waits that many whole [turns](/reference/state#turn) after the *previous* stage's scene was first entered — days, in a game whose turn is a day. A stat alone is a poor clock — it can come in faster than you measured — so a floor of turns keeps a friendship from collapsing into an afternoon.

```ts
const ROSA: Stages = {
  storylineId: 'baker',
  stages: [
    { id: 'name', flag: 'knowsName', scene: 'baker.name' },
    { id: 'recipe', flag: 'sharedRecipe', scene: 'baker.recipe', after: 3,
      needs: { counter: { storyline: 'baker', key: 'visits' }, gte: 5 } },
    { id: 'kitchen', flag: 'bakerTrusts', scene: 'baker.kitchen', after: 7 },
  ],
}
```

### stageOpen

```ts
function stageOpen(state: GameState, stages: Stages, id: string, game?: Game): boolean
```

Can this stage happen now? `needs` is a [condition](/reference/conditions); pass `game` when one of them uses `{ custom }` or a plugin's condition, such as the [cast](/plugins/cast#conditions)'s `here`, which find nothing without it. Walks the stages from the start: every stage up to and including this one must have its `needs` hold and its `after` satisfied, and every stage before it must be done. `false` for an unknown id.

**Gotchas:**
- Earlier stages' `needs` must *still* hold, not just have held once.
- A stage with `after` whose previous stage has no `scene` **throws** — there is nothing to measure from.
- `stageOpen` is still `true` once the stage is done. Test `stageDone` too if it should not repeat.

### stageDone and stagesDone

```ts
function stageDone(state: GameState, stages: Stages, id: string): boolean
function stagesDone(state: GameState, stages: Stages): number
```

`stageDone`: is this stage's flag set? `stagesDone`: how many stages are done, counting from the first and stopping at the first that is not.

### turnsSince

```ts
function turnsSince(state: GameState, sceneId: string): number | null
```

Whole [turns](/reference/state#turn) since a scene was first entered, or `null` if it never has been. The engine records the first turn for every scene in [`state.seenOn`](/reference/state#seenon).

```ts
turnsSince(state, 'baker.name') // 4: four turns (four days, in a game whose turn is a day) after you learned her name
```

In data, the same tests are the `{ seen }` and `{ since }` [conditions](/reference/conditions): name the stage below with `{ seen: 'baker.name' }`, and wait with `{ since: 'baker.name', gte: 3 }`.
