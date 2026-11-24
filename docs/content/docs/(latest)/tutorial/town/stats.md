---
title: "3. Keep stats"
description: "Give the player energy and coins as stats, and a choice that spends some of that energy once."
---
By the end of this step the side column shows the player's energy and coins, and unpacking a box costs some of that energy.

## Declare energy and coins

A stat is a number the game keeps for the player. The engine declares none of its own, so the game declares each one it uses. Replace everything in `src/world/stats.ts` with this:

::include[../../../../../snippets/tutorial/town/world/stats.ts]

Each stat has an `id`, a `label` the player reads, and a `start`. Energy stays between 0 and its `max`, 100, whatever the game does to it. Coins carry three fields that step 7 puts to work:

- `format` writes the number for the player, so 10 coins read `10c`.
- `spendable` lets a price spend the stat.
- `lacking` is the line the player reads when a price needs more coins than they have.

[Stats](/docs/reference/stats#statdef) lists every field.

## Spend energy on a choice

A `stat` effect changes a stat `by` an amount. Replace `src/story/opening.ts` with this, which adds **Unpack a box** to the bedroom:

::include[../../../../../snippets/tutorial/town/steps/3/opening.ts]

`{ stat: 'energy', by: -10 }` takes 10 energy away. The choice's `once` lets the player unpack once a turn, and greys the button out with its `reason` after that. A turn is the engine's one clock, and nothing in this game ends one until step 6 adds a calendar, so for now the box stays unpacked. [Turns, scenes and the room](/docs/explanation/turns-and-time#the-turn-is-the-one-clock) explains turns.

The story tutorial asks for the player's name and shows it in a line. To add that here, follow [step 2 of the story tutorial](/docs/tutorial/story/a-stat-and-a-name), or [Ask the player for a name](/docs/how-to/ask-for-a-name).

:::tip[Checkpoint]
The side column shows Energy 60 and Coins 10c, and Courage has gone. Press **Unpack a box**. Energy drops to 50, and the button greys out with "Enough boxes for now."
:::
