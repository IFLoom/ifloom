---
title: "4. Remember what the player did"
description: "Count the player's visits to the kitchen in the kv store, and offer a cup of tea from the second visit on."
---
By the end of this step the game counts the player's trips to the kitchen, and from the second trip on the kitchen offers a cup of tea.

## Count the visits

The game keeps the count in its kv store, a set of named values of its own, each a true/false, a number or some text. Replace `src/story/opening.ts` with this:

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
        { id: 'down', label: 'Go down to the kitchen', effects: [{ kv: 'kitchenVisits', by: 1 }, { scene: 'kitchen' }] },
      ],
    },
    {
      id: 'kitchen',
      title: 'The kitchen',
      body: [
        text('A kettle, two mugs and a fridge that hums to itself.'),
        text('You know where the tea bags are now.', { when: { kv: 'kitchenVisits', gte: 2 } }),
      ],
      choices: [
        {
          id: 'tea',
          label: 'Make a cup of tea',
          when: { kv: 'kitchenVisits', gte: 2 },
          once: { per: 'turn', reason: 'One cup is plenty.' },
          effects: [{ stat: 'energy', by: 10 }],
        },
        { id: 'up', label: 'Go back upstairs', effects: [{ scene: 'bedroom' }] },
      ],
    },
  ],
}
```

The bedroom's **Go down to the kitchen** now runs `{ kv: 'kitchenVisits', by: 1 }` before it opens the kitchen. That effect adds 1 to the key `kitchenVisits`. A key that was never set counts as 0, so the first trip makes it 1 and the second makes it 2. [Effects](/docs/0.1.0/reference/effects#kv) has the other forms, such as `to` for setting a value.

## Show a line and a choice from the second visit

The kitchen's new line and its **Make a cup of tea** choice each have a `when`: `{ kv: 'kitchenVisits', gte: 2 }`. That's a condition, which holds while the key is 2 or more. A block with a `when` shows only while its condition holds, and so does a choice. Before the second visit the line and the choice aren't on the page at all.

The tea gives back 10 energy, so a player who unpacked a box can win it back on the second trip. Like the box, it has a `once: { per: 'turn' }`, so one cup a turn is all the player gets. [Conditions](/docs/0.1.0/reference/conditions#kv) lists the ranges a condition can test, such as `lt`, `is` and `gte`.

The engine also remembers every choice the player made, without a key of your own. To make a line read differently after one choice, follow [step 3 of the story tutorial](/docs/0.1.0/tutorial/story/remember-and-end).

:::tip[Checkpoint]
Press **Go down to the kitchen**. The kitchen offers only **Go back upstairs**. Press it, then go down again. The kitchen now says "You know where the tea bags are now." and offers **Make a cup of tea**. Press it and your energy goes up by 10, and the button greys out with "One cup is plenty."
:::
