---
title: "3. Keep stats"
description: "Give the player energy and coins as stats, and a choice that spends some of that energy once."
---
By the end of this step the side column shows the player's energy and coins, and unpacking a box costs some of that energy.

## Declare energy and coins

A stat is a number the game keeps for the player. The engine declares none of its own, so the game declares each one it uses. Replace everything in `src/world/stats.ts` with this:

```ts
// src/world/stats.ts
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [
    { id: 'energy', label: 'Energy', start: 60, max: 100 },
    { id: 'coins', label: 'Coins', start: 10, format: '{n}c', spendable: true, lacking: 'Not enough on you.' },
  ],
}
```

Each stat has an `id`, a `label` the player reads, and a `start`. Energy stays between 0 and its `max`, 100, whatever the game does to it. Coins carry three fields that step 7 puts to work:

- `format` writes the number for the player, so 10 coins read `10c`.
- `spendable` lets a price spend the stat.
- `lacking` is the line the player reads when a price needs more coins than they have.

[Stats](/docs/0.1.0/reference/stats#statdef) lists every field.

## Spend energy on a choice

A `stat` effect changes a stat `by` an amount. Replace `src/story/opening.ts` with this, which adds **Unpack a box** to the bedroom:

```ts
// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'bedroom',
  scenes: [
    {
      id: 'bedroom',
      title: 'Moving day',
      body: [text('The last box is in. The bed is a mattress on the floor, and the window looks down on the high street.')],
      choices: [
        { id: 'unpack', label: 'Unpack a box', once: { per: 'turn', reason: 'Enough boxes for now.' }, effects: [{ stat: 'energy', by: -10 }] },
        { id: 'down', label: 'Go down to the kitchen', effects: [{ scene: 'kitchen' }] },
      ],
    },
    {
      id: 'kitchen',
      title: 'The kitchen',
      body: [text('A kettle, two mugs and a fridge that hums to itself.')],
      choices: [{ id: 'up', label: 'Go back upstairs', effects: [{ scene: 'bedroom' }] }],
    },
  ],
}
```

`{ stat: 'energy', by: -10 }` takes 10 energy away. The choice's `once` lets the player unpack once a turn, and greys the button out with its `reason` after that. A turn is the engine's one clock, and nothing in this game ends one until step 6 adds a calendar, so for now the box stays unpacked. [Turns, scenes and the room](/docs/0.1.0/explanation/turns-and-time#the-turn-is-the-one-clock) explains turns.

The story tutorial asks for the player's name and shows it in a line. To add that here, follow [step 2 of the story tutorial](/docs/0.1.0/tutorial/story/a-stat-and-a-name), or [Ask the player for a name](/docs/0.1.0/how-to/ask-for-a-name).

:::tip[Checkpoint]
The side column shows Energy 60 and Coins 10c, and Courage has gone. Press **Unpack a box**. Energy drops to 50, and the button greys out with "Enough boxes for now."
:::
