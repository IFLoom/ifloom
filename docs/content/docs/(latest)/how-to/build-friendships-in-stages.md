---
title: "Build a friendship in stages"
description: "Grow a friendship over days, with a choice that pays once a turn, greetings that change with visits and stages that come in order."
---
Use this when a friendship or a rivalry should grow over days, not in one afternoon. The player meets someone, gets to know them, and some days later something happens that couldn't have happened on the first visit. The steps use Ava, who runs the café in the showcase. Her storyline is `ava`, and the friendship is a stat on her, `friendship`, declared on the kind `character` (see [Add a character with a schedule](/docs/how-to/add-a-character)).

## Pay once a turn

Talking costs no time, so a choice that pays and can be chosen again is an endless farm. Give it [`once`](/docs/reference/actions#once), and it pays once a [turn](/docs/reference/glossary#turn), which is once a day with the [calendar](/docs/reference/plugins/calendar)'s default:

```ts
import type { Choice } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const chat: Choice = { id: 'chat', label: 'Chat', once: { per: 'turn', reason: 'She has a queue.' }, effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }] }
```

After the player chooses it, the choice stays on screen with its reason and pays nothing until the next turn. An [action](/docs/reference/actions#actiondef) takes the same `once`.

## Count visits

Keep a counter in the storyline's own [kv store](/docs/reference/glossary#kv). Add to it with the [`kv` effect](/docs/reference/effects#kv) and read it with the [`kv` condition](/docs/reference/conditions#kv), both with the storyline in `of`:

```ts
import type { Condition, Effect } from '@ifloom/engine'

// In the choice that opens her scene.
export const visit: Effect[] = [{ kv: 'visits', of: 'storyline:ava', by: 1 }, { scene: 'ava.hi' }]

// Anywhere a condition goes: she knows your order.
export const regular: Condition = { kv: 'visits', of: 'storyline:ava', gte: 10 }
```

The effect reads the count when it runs, so two of them in one list add up. To count how often a scene was opened, you need no counter: `{ seen: 'ava.hi', gte: 3 }` holds from the third visit (see [`seen`](/docs/reference/conditions#seen)).

## Write a ladder of greetings

Write a line for each stretch of the count, each a block with a `when`, so exactly one shows:

```ts
import type { Block } from '@ifloom/engine'

export const greeting: Block[] = [
  { text: 'Ava nods at you from the till.', when: { seen: 'ava.hi', lt: 2 } },
  { text: '"Hello again," says Ava.', when: { seen: 'ava.hi', gte: 2, lt: 5 } },
  { text: '"The usual?" Ava is already reaching for a cup.', when: { seen: 'ava.hi', gte: 5, lt: 10 } },
  { text: 'Ava waves you round the counter to sit with her.', when: { seen: 'ava.hi', gte: 10 } },
]
```

Every [range](/docs/reference/common#range) takes `gte`, `gt`, `lte` and `lt` together, so the rungs don't overlap. The top rung has no `lt`, so the ladder stops there. Put the blocks in her scene's `body`.

## Put stages in order, with days between

The [quests plugin](/docs/reference/plugins/quests) keeps stages in order. A stage is done the first time its `done` holds once the stages before it are done, and it's never taken back. Pace a stage with [`since`](/docs/reference/conditions#since), the whole turns since a scene was first seen, so a high stat alone can't rush it:

```ts
import { cast } from '@ifloom/plugin-cast'
import { quests, type QuestDef } from '@ifloom/plugin-quests'

export const friend: QuestDef = {
  id: 'friend',
  name: 'A friend in town',
  storyline: 'ava',
  starts: quests.active('settle'),
  stages: [
    { id: 'close', hint: 'Spend time with Ava.', done: { stat: 'friendship', of: cast.character('ava'), gte: 25 } },
    // Three days since you met, however often you chat.
    { id: 'river', hint: 'Find Ava by the river some evening.', done: { all: [{ since: 'ava.hi', gte: 3 }, { seen: 'ava.river' }] } },
  ],
}
```

Then open the next scene only once the stage before it is done, with [`quests.reached`](/docs/reference/plugins/quests#questsreached):

```ts
import type { Choice } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

export const river: Choice = { id: 'river', label: 'Walk to the river', when: quests.reached('friend', 'close'), effects: [{ scene: 'ava.river' }] }
```

[Add a quest](/docs/how-to/add-a-quest) declares and starts the quest.

## Pace stages without the quests plugin

Plain conditions give the same order and pace. Record each stage with a key on the storyline when its scene plays, and gate the next one on that key and on `since`:

```ts
import type { ActionDef, Choice } from '@ifloom/engine'

// The first stage's scene sets its key as it closes.
export const bye: Choice = { id: 'bye', label: 'Say goodbye', effects: [{ kv: 'knowsName', of: 'storyline:ava', to: true }, { scene: null }] }

// The second waits for the first, three turns after it, and five visits.
export const recipe: ActionDef = {
  id: 'recipe',
  label: 'Ask Ava for her flapjack recipe',
  when: { all: [{ kv: 'knowsName', of: 'storyline:ava' }, { since: 'ava.name', gte: 3 }, { seen: 'ava.hi', gte: 5 }, { not: { seen: 'ava.recipe' } }] },
  effects: [{ scene: 'ava.recipe' }],
}
```

Write each stage's `when` to include the one before it, so the player can't reach a stage by skipping one, however good their numbers are. The `not` hides a stage once its scene has played.

## Check it worked

Run `npm run check`, which reports a storyline, scene or stat that a condition names and the game doesn't have. Then play in `npm run dev`. Choose Chat twice in one day, and the second time the choice is greyed out with `She has a queue.` Visit on later days, and the greeting climbs its ladder. A [test](/docs/how-to/test-a-route) can play the days through faster than you can.

In the showcase, Small Town, Ava's `chat` choice, her greetings and the `friend` quest are in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts). For more, see:

- The [`since`](/docs/reference/conditions#since), [`seen`](/docs/reference/conditions#seen) and [`kv`](/docs/reference/conditions#kv) conditions, and [`Once`](/docs/reference/actions#once).
- [Storylines](/docs/reference/storylines) and [Quests](/docs/reference/plugins/quests).
- [Stats, the kv store and storylines](/docs/explanation/entities-and-traits#stats-the-kv-store-and-storylines).
