---
title: "2. Keep a stat and the player's name"
description: "Step 2 of the story tutorial. Declares a stat that kind choices raise, and asks the player's name, which a line of the story then prints."
---
By the end of this step the side column shows how warm the player has been to the stranger, and the first chapter asks the player's name and greets them by it.

## Declare a stat

A stat is a number the game keeps for the player. The engine declares none of its own, so the game declares each one it uses. This story keeps one, `warmth`, for how kind the player has been. Replace everything in `src/world/stats.ts` with this:

::include[../../../../../snippets/tutorial/story/world/stats.ts]

The stat has an `id`, a `label` the player reads, and a `start`. Warmth stays between 0 and its `max`, 3, whatever the game does to it. A stat is in `src/world/` because a scene in any chapter can read or change it. [Stats](/docs/reference/stats#statdef) lists every field.

## Ask the player's name

An input asks the player for a value, such as a name, and keeps it under a key in the kv store. The kv store is the game's own set of named values, each a true/false, a number or some text. Replace everything in `src/story/opening.ts` with this:

::include[../../../../../snippets/tutorial/story/steps/2/opening.ts]

The file changes in three places:

- `inputs`, beside `scenes`, declares the name box. It keeps what the player types under the key `playerName`, its `id`, and takes 20 characters at most.
- The first chapter has a second line, `He nods at you, {{playerName}}, …`. The token `{{playerName}}` prints the value of that key.
- `share` and `pay` each start with `{ stat: 'warmth', by: 1 }`, which adds 1 to warmth before the next scene opens.

## Show the box and the line at the right time

The input's `when` is `{ scene: ['ch1.stop'] }`, so the page shows the name box only while the first chapter is on screen. The player can type a name, or leave it and choose straight away. The template renders the box between the scene's words and its choices, so no rendering code changes.

The new line has a `when` too, `{ kv: 'playerName' }`, which holds once the key has a value. Until the player types a name, the line isn't on the page at all, so nobody reads "He nods at you, , as if…". Both `when`s are conditions, questions the engine asks of the game as it is now. Step 3 uses more of them.

Effects run in the order the choice lists them, so warmth goes up before the bus opens. A player who shares the umbrella and pays the fare ends the story with a warmth of 2. [Ask the player for a name](/docs/how-to/ask-for-a-name) shows other ways to ask, such as a choice that opens the box. [Inputs](/docs/reference/inputs#inputdef) lists every field.

:::tip[Checkpoint]
The side column shows Warmth 0, and Courage has gone. Type a name in the **Your name** box and press Enter. A new line greets you by that name. Press **Hold the umbrella over both of you**, and warmth goes up to 1. Press **Count out the fare in coins**, and it goes up to 2.
:::
