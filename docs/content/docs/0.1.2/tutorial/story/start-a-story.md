---
title: "1. Start a story"
description: "Create a game from a template and write the first three chapters of a short story, with choices that lead from one to the next."
---
By the end of this step you'll have a new game running in your browser, with three chapters of a story called The Last Bus and choices that lead from one to the next.

The story is short. You wait for the last bus in the rain beside a stranger, find your bus pass has run out, and walk home. Over four steps, what you do at the stop changes what happens on the bus, and how kind you've been decides how the evening ends. The story uses no plugins, so there's no map or clock to set up.

## Check your Node version

The `ifloom` command needs Node 20.19 or later, or 22.12 or later, and Node 24 is the one to choose if you're installing it now. Run this to see the version you have:

```sh
node --version
```

## Create the game

Choose the tab for the way you want to render the game. The React tab's template renders it with the ready-made React UI. The Plain JS and Vue templates render it with their own code, and this tutorial never needs you to change it. Your choice follows you through the rest of the docs.

```sh tab="Plain JS" tab-group="framework"
npm create ifloom@latest last-bus -- --template vanilla
cd last-bus
npm install
npm run dev
```

```sh tab="React" tab-group="framework"
npm create ifloom@latest last-bus
cd last-bus
npm install
npm run dev
```

```sh tab="Vue" tab-group="framework"
npm create ifloom@latest last-bus -- --template vue
cd last-bus
npm install
npm run dev
```

`npm create ifloom` makes a folder `last-bus` with a two-scene game in it. `npm run dev` starts a dev server and prints its address. Open that address in your browser, and leave the server running in its terminal while you work. The page reloads by itself each time you save a file. [Create a game](/docs/0.1.2/how-to/create-a-game) has the same commands for pnpm, yarn and bun.

The game opens on a scene called "The door". The React template opens on a title screen first, so press **New game** there.

## Find your way around

The game's own files are in `src/`, and this tutorial changes three of them:

- `src/game.ts` assembles the game from the other files. Its default export is the game module, which the page and the CLI both build the game from.
- `src/world/stats.ts` declares the numbers the whole game keeps.
- `src/story/opening.ts` holds the first scenes of the story and their words.

The rest of `src/` renders the game, and you can leave it alone. [Organise your game's files](/docs/0.1.2/how-to/organise-your-files) says how a longer story splits into more files.

## Name the game

The template named the game after its folder. Replace everything in `src/game.ts` with this, which gives it the title The Last Bus:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: ({ unlocked }) => loadGame([stats, opening], { id: 'last-bus', title: 'The Last Bus' }, { packs: unlocked }),
})
```

`loadGame` merges the files in its list, `stats` and `opening`, into one game. Its second argument holds the game's `id` and its `title`, and the browser keeps the game's saves under the `id`. The template's `game.ts` also had `probes`, which named a choice from its own story, so this file leaves them out. [Playtest and snapshot from the command line](/docs/0.1.2/how-to/playtest-and-snapshot) says what probes are for.

## Write three chapters

A scene is one screen of story: a title, the words the player reads, and the choices under them. This story gives each chapter one scene. Replace everything in `src/story/opening.ts` with this:

```ts
// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'ch1.stop',
  scenes: [
    {
      id: 'ch1.stop',
      title: 'Chapter one: the stop',
      body: [text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.')],
      choices: [
        { id: 'share', label: 'Hold the umbrella over both of you', effects: [{ scene: 'ch2.bus' }] },
        { id: 'keep', label: 'Keep the umbrella to yourself', effects: [{ scene: 'ch2.bus' }] },
      ],
    },
    {
      id: 'ch2.bus',
      title: 'Chapter two: the bus',
      body: [text('The bus comes at last. At the front, the driver looks at your card and shakes her head. "That card has run out, love."')],
      choices: [
        { id: 'pay', label: 'Count out the fare in coins', effects: [{ scene: 'ch3.home' }] },
        { id: 'excuse', label: '"It worked this morning."', effects: [{ scene: 'ch3.home' }] },
      ],
    },
    {
      id: 'ch3.home',
      title: 'Chapter three: home',
      body: [text('Your stop. The man gets off too, and turns up your street.')],
      choices: [],
    },
  ],
}
```

`introScene` names the scene a new game opens on. Each scene has an `id`, which the rest of the game uses to name it, a `title` and a `body`. The body is a list of blocks read top to bottom, and `text('…')` is a block of words written in the place the player reads them. The words can use `**bold**` and `*italic*` as in Markdown, and a blank line starts a new paragraph ([Prose](/docs/0.1.2/reference/prose#markup)).

The scene ids `ch1.stop`, `ch2.bus` and `ch3.home` use a `.` to group the scenes by chapter. The engine reads an id as one name, so the grouping is only for you.

## Move on with choices

Each choice has an `id`, a `label` for its button, and a list of `effects` that run when the player chooses it. `{ scene: 'ch2.bus' }` is an effect that opens the scene with that id. Both choices at the stop open the bus for now, and both choices on the bus open the walk home. Step 3 makes them lead to different places.

The third chapter has `choices: []`, so the story stops there with nothing to press. Step 3 gives it a way to an ending.

An effect is plain data, which is why the engine can check a choice before anyone plays it. [State, commands and the view](/docs/0.1.2/explanation/state-and-commands#effects-and-conditions-are-data) says why, and [Scenes](/docs/0.1.2/reference/scenes#datascene) lists every field a scene has.

The template's stat, Courage, stays in the side column until step 2 replaces it.

:::tip[Checkpoint]
The page shows "Chapter one: the stop" with two choices. Press **Keep the umbrella to yourself**, and the page shows "Chapter two: the bus". Press **Count out the fare in coins**, and the page shows "Chapter three: home" with no choices under it.
:::
