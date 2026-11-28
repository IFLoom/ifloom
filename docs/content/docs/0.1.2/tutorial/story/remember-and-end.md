---
title: "3. Remember a choice and end the story"
description: "Make later chapters change with an earlier choice, and end the story in one of two ways with a button to start again."
---
By the end of this step the bus and the walk home change with what the player chose earlier, and the story ends in one of two ways, each with a button to start again.

## Write the finished story

The engine counts every choice the player makes, so a later scene can ask about an earlier one without a key of your own. Replace everything in `src/story/opening.ts` with this, the whole story:

```ts
// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'ch1.stop',
  inputs: [{ id: 'playerName', label: 'Your name', type: 'text', maxLength: 20, when: { scene: ['ch1.stop'] } }],
  scenes: [
    {
      id: 'ch1.stop',
      title: 'Chapter one: the stop',
      body: [
        text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.'),
        text('He nods at you, {{playerName}}, as if he knows you from somewhere.', { when: { kv: 'playerName' } }),
      ],
      choices: [
        { id: 'share', label: 'Hold the umbrella over both of you', effects: [{ stat: 'warmth', by: 1 }, { scene: 'ch2.bus' }] },
        { id: 'keep', label: 'Keep the umbrella to yourself', effects: [{ scene: 'ch2.bus' }] },
      ],
    },
    {
      id: 'ch2.bus',
      title: 'Chapter two: the bus',
      body: [
        text('The bus comes at last. At the front, the driver looks at your card and shakes her head. "That card has run out, love."'),
        text('Behind you, the man from the stop is drying his glasses on his scarf.', { when: { chose: 'ch1.stop#share' } }),
        text('Behind you, the man from the stop is wringing out his sleeves.', { when: { chose: 'ch1.stop#keep' } }),
      ],
      choices: [
        { id: 'pay', label: 'Count out the fare in coins', effects: [{ stat: 'warmth', by: 1 }, { scene: 'ch3.home' }] },
        { id: 'excuse', label: '"It worked this morning."', effects: [{ scene: 'ch3.home' }] },
        { id: 'blame', label: '"He is paying for me."', when: { chose: 'ch1.stop#share' }, effects: [{ scene: 'ch3.home' }] },
      ],
    },
    {
      id: 'ch3.home',
      title: 'Chapter three: home',
      body: [
        text('Your stop. The man gets off too, and turns up your street.'),
        text('The driver calls goodnight after you both.', { when: { chose: 'ch2.bus#pay' } }),
        text('The driver watches you go and says nothing.', { when: { chose: 'ch2.bus#excuse' } }),
        text('The man gives you a long look and walks a little faster.', { when: { chose: 'ch2.bus#blame' } }),
      ],
      choices: [
        { id: 'wave', label: 'Wave him in for a cup of tea', when: { stat: 'warmth', gte: 2 }, effects: [{ scene: 'end.wave' }] },
        { id: 'door', label: 'Let yourself in', effects: [{ scene: 'end.door' }] },
      ],
    },
    {
      id: 'end.wave',
      title: 'The end',
      body: [text('He turns out to live two doors down. He brings biscuits next time.')],
      choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' } }],
    },
    {
      id: 'end.door',
      title: 'The end',
      body: [text('The kettle, the radiator, the rain on the window. You sleep well enough.')],
      choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' } }],
    },
  ],
}
```

The first chapter is the same as in step 2. The rest of this step goes through what changed in the others.

## Make a line remember a choice

The bus has two new lines, and each has a `when` that asks about the stop. `{ chose: 'ch1.stop#share' }` holds once the player has chosen `share` in the scene `ch1.stop`. The `#` joins the scene's id to the choice's id. A player who shared the umbrella reads that the man is drying his glasses, and one who kept it reads that he's wringing out his sleeves.

The walk home does the same with the bus. Its three new lines ask which of `pay`, `excuse` and `blame` the player chose, so the driver says goodnight, says nothing, or the man walks off. [Conditions](/docs/0.1.2/reference/conditions#chose) has the other forms of `chose`, such as how many times a choice was made.

## Offer a choice only to some players

A choice can have a `when` too, and the engine offers it only while its condition holds. The bus's new choice, **"He is paying for me."**, has `when: { chose: 'ch1.stop#share' }`, so only a player who shared the umbrella can blame the man for the fare.

The walk home's **Wave him in for a cup of tea** asks about the stat instead. `{ stat: 'warmth', gte: 2 }` holds while warmth is 2 or more, so it's offered only to a player who shared the umbrella and paid the fare. Everyone gets **Let yourself in**. `gte` means "greater than or equal to", and `lt`, `is` and the other ranges are in [Conditions](/docs/0.1.2/reference/conditions#stat).

## End the story

The two scenes whose ids start with `end.` are the endings. Each has a few words and one choice, **Start again**. That choice has no effects. Its `command`, `{ type: 'newGame' }`, starts the story over from the first chapter, as a new game with no name and no warmth. The player's settings carry over.

An ending with `choices: []` works too, but then the page shows no button, and the player has to know to start again from a menu. [End the game](/docs/0.1.2/how-to/end-the-game) shows other ways to end a game. [Commands](/docs/0.1.2/reference/commands#newgame) says more about `newGame`.

:::tip[Checkpoint]
Press **Keep the umbrella to yourself**. The bus shows the man wringing out his sleeves, and offers two choices. Press **Count out the fare in coins**, and the walk home offers only **Let yourself in**. Press it, then **Start again**, and you're back at the stop.

This time, share the umbrella. The bus offers **"He is paying for me."** as well. Press **Count out the fare in coins**, and the walk home offers **Wave him in for a cup of tea**. Press it, and the page shows "The end" with its biscuits.
:::
