---
title: "2. Write scenes and choices"
description: "Step 2 of the town tutorial. Replaces the template's story with two scenes, a bedroom and a kitchen, and choices that move between them."
---
By the end of this step the game opens in the bedroom on moving day, and two choices take the player down to the kitchen and back.

## Write the bedroom and the kitchen

A scene is one screen of story: a title, the words the player reads, and the choices under them. Replace everything in `src/story/opening.ts` with this:

::include[../../../../../snippets/tutorial/town/steps/2/opening.ts]

`introScene` names the scene a new game opens on. Each scene has an `id`, which the rest of the game uses to name it, a `title`, and a `body`, which is a list of blocks read top to bottom. `text('…')` is a block of words, written in the place the player reads them.

The file still exports `opening`, so `src/game.ts` picks it up without a change. The template's stat, Courage, stays in the side column until step 3 replaces it.

## Move between scenes with choices

Each choice has an `id`, a `label` for its button, and a list of `effects` that run when the player chooses it. `{ scene: 'kitchen' }` is an effect that opens the scene with that id. The kitchen's choice opens the bedroom again with `{ scene: 'bedroom' }`, so the player can go back and forth as often as they like.

An effect is plain data, which is why the engine can check a choice before anyone plays it. [State, commands and the view](/docs/explanation/state-and-commands#effects-and-conditions-are-data) says why, and [Scenes](/docs/reference/scenes#datascene) lists every field a scene has.

:::tip[Checkpoint]
The page shows "Moving day" with one choice, **Go down to the kitchen**. Press it and the page shows "The kitchen". Press **Go back upstairs** and you're in the bedroom again.
:::
