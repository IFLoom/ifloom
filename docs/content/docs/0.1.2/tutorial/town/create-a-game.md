---
title: "1. Create a game"
description: "Create a game from a template, run it in your browser, and find the files that hold its story."
---
By the end of this step you'll have a new game running in your browser, and you'll know which files hold its story.

## Check your Node version

The `ifloom` command needs Node 20.19 or later, or 22.12 or later, and Node 24 is the one to choose if you're installing it now. Run this to see the version you have:

```sh
node --version
```

## Create the game

Pick the tab for the way you want to render the game. The React tab's template renders it with the ready-made React UI. The Plain JS and Vue templates render it with their own code, which you'll extend in step 5. Your choice follows you through the rest of the docs.

```sh tab="Plain JS" tab-group="framework"
npm create ifloom@latest my-town -- --template vanilla
cd my-town
npm install
npm run dev
```

```sh tab="React" tab-group="framework"
npm create ifloom@latest my-town
cd my-town
npm install
npm run dev
```

```sh tab="Vue" tab-group="framework"
npm create ifloom@latest my-town -- --template vue
cd my-town
npm install
npm run dev
```

`npm create ifloom` makes a folder `my-town` with a two-scene game in it. `npm run dev` starts a dev server and prints its address. Open that address in your browser, and leave the server running in its terminal while you work. [Create a game](/docs/0.1.2/how-to/create-a-game) has the same commands for pnpm, yarn and bun.

The game opens on a scene called "The door", with two choices under it. The React template opens on a title screen first, so press **New game** there.

## Find your way around

The game's own files are in `src/`, and you'll change three kinds of them:

- `src/game.ts` assembles the game from the other files, and names its plugins. Its default export is the game module, which the page and the CLI both build the game from.
- `src/world/` holds what the whole game shares, one file per kind, such as `stats.ts` for its stats.
- `src/story/` holds one file per area of the story, such as `opening.ts` for the first scenes.

The rest of `src/` renders the game, and you'll leave it alone until step 5. [Organise your game's files](/docs/0.1.2/how-to/organise-your-files) says more about the layout.

:::tip[Checkpoint]
The page shows "The door" and its two choices. Open `src/story/opening.ts`, change "A door you have never noticed before" to "A blue door you have never noticed before", and save the file. The page reloads by itself and shows the new words.
:::
