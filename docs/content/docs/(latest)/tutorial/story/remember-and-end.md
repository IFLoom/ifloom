---
title: "3. Remember a choice and end the story"
description: "Step 3 of the story tutorial. Makes later chapters read differently after an earlier choice, offers a choice only to a kind player, and writes two endings with a way to start again."
---
By the end of this step the bus and the walk home change with what the player chose earlier, and the story ends in one of two ways, each with a button to start again.

## Write the finished story

The engine counts every choice the player makes, so a later scene can ask about an earlier one without a key of your own. Replace everything in `src/story/opening.ts` with this, the whole story:

::include[../../../../../snippets/tutorial/story/story/opening.ts]

The first chapter is the same as in step 2. The rest of this step goes through what changed in the others.

## Make a line remember a choice

The bus has two new lines, and each has a `when` that asks about the stop. `{ chose: 'ch1.stop#share' }` holds once the player has chosen `share` in the scene `ch1.stop`. The `#` joins the scene's id to the choice's id. A player who shared the umbrella reads that the man is drying his glasses, and one who kept it reads that he's wringing out his sleeves.

The walk home does the same with the bus. Its three new lines ask which of `pay`, `excuse` and `blame` the player chose, so the driver says goodnight, says nothing, or the man walks off. [Conditions](/docs/reference/conditions#chose) has the other forms of `chose`, such as how many times a choice was made.

## Offer a choice only to some players

A choice can have a `when` too, and the engine offers it only while its condition holds. The bus's new choice, **"He is paying for me."**, has `when: { chose: 'ch1.stop#share' }`, so only a player who shared the umbrella can blame the man for the fare.

The walk home's **Wave him in for a cup of tea** asks about the stat instead. `{ stat: 'warmth', gte: 2 }` holds while warmth is 2 or more, so it's offered only to a player who shared the umbrella and paid the fare. Everyone gets **Let yourself in**. `gte` means "greater than or equal to", and `lt`, `is` and the other ranges are in [Conditions](/docs/reference/conditions#stat).

## End the story

The two scenes whose ids start with `end.` are the endings. Each has a few words and one choice, **Start again**. That choice has no effects. Its `command`, `{ type: 'newGame' }`, starts the story over from the first chapter, as a new game with no name and no warmth. The player's settings carry over.

An ending with `choices: []` works too, but then the page shows no button, and the player has to know to start again from a menu. [End the game](/docs/how-to/end-the-game) shows other ways to end a game. [Commands](/docs/reference/commands#newgame) says more about `newGame`.

:::tip[Checkpoint]
Press **Keep the umbrella to yourself**. The bus shows the man wringing out his sleeves, and offers two choices. Press **Count out the fare in coins**, and the walk home offers only **Let yourself in**. Press it, then **Start again**, and you're back at the stop.

This time, share the umbrella. The bus offers **"He is paying for me."** as well. Press **Count out the fare in coins**, and the walk home offers **Wave him in for a cup of tea**. Press it, and the page shows "The end" with its biscuits.
:::
