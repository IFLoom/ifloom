---
title: "A friendship in stages"
description: "Pace a storyline over turns: a choice that pays once a turn, a counter on the storyline, greetings that change with visits, and stages that come in order with days between them, through quests or plain conditions."
---
A friendship or a rivalry usually grows in stages. The player meets someone, gets to know them, and some days later something happens that couldn't have happened on the first afternoon. This recipe builds that with content alone: a choice that pays once a turn, a counter, greetings that change as you visit, and stages in order with days between them.

The running example is Ava, who runs the café in Small Town. Her storyline is `ava`, and the friendship is a stat on her, `friendship`, declared on the kind `character`.

## Pay once a turn

Talking usually costs no time, so a choice that pays and can be picked again is an endless farm. Give it `once`, and it pays once a [turn](/docs/reference/state#turn), which is once a day with the [calendar](/docs/plugins/calendar)'s default:

```ts
import type { Choice } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

const chat: Choice = { id: 'chat', label: 'Chat', once: { per: 'turn', reason: 'She has a queue.' }, effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }] }
```

After the first pick, the choice stays on screen with its reason and pays nothing until the next turn. Its `scene` effects still run, so it still goes where it goes. An [action](/docs/reference/actions) takes the same `once`.

## Count visits

A counter is a number in the storyline's own [kv store](/docs/reference/storylines). Add to it with the [`kv` effect](/docs/reference/effects#whose-key-it-is) and read it with the [`kv` condition](/docs/reference/conditions#kv), both with the storyline in `of`:

```ts fragment
// in the choice that opens her scene
effects: [{ kv: 'visits', of: 'storyline:ava', by: 1 }, { scene: 'ava.hi' }]

// anywhere a condition goes
{ kv: 'visits', of: 'storyline:ava', gte: 10 }   // she knows your order
```

The effect reads the count when it runs, so two of them in one list add up. For a count of how often a scene was opened, you don't need a counter at all: `{ seen: 'ava.hi', gte: 3 }` holds from the third visit (see [`seen`](/docs/reference/conditions#seen)).

## A ladder of greetings

A ladder is a run of lines, one for each stretch of the count. Write each as a block with a `when`, so exactly one shows:

```ts
body: [
  { prose: 'ava.nod', when: { seen: 'ava.hi', lt: 2 } },
  { prose: 'ava.hello', when: { seen: 'ava.hi', gte: 2, lt: 5 } },
  { prose: 'ava.usual', when: { seen: 'ava.hi', gte: 5, lt: 10 } },
  { prose: 'ava.friend', when: { seen: 'ava.hi', gte: 10 } },
]
```

Every [range](/docs/reference/conditions#range) takes `gte`, `gt`, `lte` and `lt` together, so the rungs don't overlap. The top rung has no `lt`, so the ladder stops there.

## Stages in order, with days between

The [quests plugin](/docs/plugins/quests) already keeps stages in order: a stage is done the first time its `done` holds, once the stages before it are done, and it is never taken back. Pace a stage with [`since`](/docs/reference/conditions#since), the whole turns since a scene was first seen, so a high stat alone can't rush it:

```ts
import { cast } from '@ifloom/plugin-cast'
import { quests } from '@ifloom/plugin-quests'

const friend = {
  id: 'friend',
  title: 'A friend in town',
  storyline: 'ava',
  starts: quests.active('settle'),
  stages: [
    { id: 'close', hint: 'Spend time with Ava.', done: { stat: 'friendship', of: cast.character('ava'), gte: 25 } },
    // Three days since you met, however often you chat.
    { id: 'river', hint: 'Find Ava by the river some evening.', done: { all: [{ since: 'ava.hi', gte: 3 }, { seen: 'ava.river' }] } },
  ],
}
```

Then open the next scene only once the stage before it is done, with [`quests.reached`](/docs/plugins/quests#conditions):

```ts
import type { Choice } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

const river: Choice = { id: 'river', label: 'Walk to the river', when: quests.reached('friend', 'close'), effects: [{ scene: 'ava.river' }] }
```

## Without the quests plugin

The same order and pace come from plain conditions. Record each stage with a key on the storyline when its scene plays, and gate the next one on that key and on `since`:

```ts fragment
// the first stage's scene sets its key
{ id: 'ava.name', /* ... */ choices: [{ id: 'bye', effects: [{ kv: 'knowsName', of: 'storyline:ava', to: true }, { scene: null }] }] }

// the second waits for the first, three turns after it, and five visits
{
  id: 'recipe',
  when: {
    all: [
      { kv: 'knowsName', of: 'storyline:ava' },
      { since: 'ava.name', gte: 3 },
      { seen: 'ava.hi', gte: 5 },
    ],
  },
  effects: [{ scene: 'ava.recipe' }],
}
```

Write each stage's `when` to include the one before it, so the player can't reach a stage by skipping one, however good their numbers are. Hide a stage that's done by adding `{ not: { seen: 'ava.recipe' } }`.

## See it in an example

Small Town: in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts), Ava's `chat` choice pays once a turn, her greeting gains a line from the third visit with `{ seen: 'ava.hi', gte: 3 }`, and the `friend` quest's `river` stage waits with `{ since: 'ava.hi', gte: 3 }`.
