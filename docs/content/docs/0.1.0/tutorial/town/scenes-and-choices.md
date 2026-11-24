---
title: "2. Write scenes and choices"
description: "Replace the template's story with a bedroom and a kitchen, and choices that move between them."
---
By the end of this step the game opens in the bedroom on moving day, and two choices take the player down to the kitchen and back.

## Write the bedroom and the kitchen

A scene is one screen of story: a title, the words the player reads, and the choices under them. Replace everything in `src/story/opening.ts` with this:

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
      choices: [{ id: 'down', label: 'Go down to the kitchen', effects: [{ scene: 'kitchen' }] }],
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

`introScene` names the scene a new game opens on. Each scene has an `id`, which the rest of the game uses to name it, a `title`, and a `body`, which is a list of blocks read top to bottom. `text('…')` is a block of words, written in the place the player reads them.

The file still exports `opening`, so `src/game.ts` picks it up. Delete one thing from `src/game.ts`, though: the `probes` line, and `probe` from its import. The template's probes press the old story's `knock` choice, which is gone now, so `ifloom snapshot` would stop with an error. [Playtest and snapshot from the command line](/docs/0.1.0/how-to/playtest-and-snapshot) says what probes are for.

The template's stat, Courage, stays in the side column until step 3 replaces it.

## Move between scenes with choices

Each choice has an `id`, a `label` for its button, and a list of `effects` that run when the player chooses it. `{ scene: 'kitchen' }` is an effect that opens the scene with that id. The kitchen's choice opens the bedroom again with `{ scene: 'bedroom' }`, so the player can go back and forth as often as they like.

An effect is plain data, which is why the engine can check a choice before anyone plays it. [State, commands and the view](/docs/0.1.0/explanation/state-and-commands#effects-and-conditions-are-data) says why, and [Scenes](/docs/0.1.0/reference/scenes#datascene) lists every field a scene has.

:::tip[Checkpoint]
The page shows "Moving day" with one choice, **Go down to the kitchen**. Press it and the page shows "The kitchen". Press **Go back upstairs** and you're in the bedroom again.
:::
