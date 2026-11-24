---
title: "Create a game"
description: "Start a new IFLoom game with npm create ifloom, choosing a package manager, a template and a theme."
---
Use this to start a new game in a folder of its own, with npm, pnpm, yarn or bun. You need Node 20.19 or later, or 22.12 or later. To put a game in a project you already have, see [Add IFLoom to an existing project](/docs/how-to/add-to-a-project) instead.

## Make the game

1. Run the create command with the folder name you want:

   ```sh tab="npm" tab-group="package-manager"
   npm create ifloom@latest my-game
   cd my-game
   npm install
   npm run dev
   ```

   ```sh tab="pnpm" tab-group="package-manager"
   pnpm create ifloom my-game
   cd my-game
   pnpm install
   pnpm dev
   ```

   ```sh tab="yarn" tab-group="package-manager"
   yarn create ifloom my-game
   cd my-game
   yarn install
   yarn run dev
   ```

   ```sh tab="bun" tab-group="package-manager"
   bun create ifloom my-game
   cd my-game
   bun install
   bun run dev
   ```

2. Open the address the dev server prints. The page reloads each time you save a file.

The command makes a two-scene game in `my-game`, installs nothing itself, and prints the next commands for the package manager you ran it with. The name must be a valid npm package name, and the folder must be new or empty.

## Pick a template

Add `--template` to start from something other than the React UI. With npm, put the flags after `--`, as in `npm create ifloom@latest my-game -- --template vue`. pnpm, yarn and bun take them as they are.

- **`react`**, the default, renders the game with the [React UI](/docs/reference/react) and opens on a title screen.
- **`vanilla`** and **`vue`** render the same game with your own code, in plain DOM or Vue 3 components. **`svelte`** does the same with Svelte 5.
- **`next`** puts the game in a Next.js app. See [Build with Next.js](/docs/how-to/build-with-next).
- **`novel`**, **`cafe`** and **`town`** copy the examples The Letter, The Corner Café and the showcase, Small Town, without their tests and recorded runs.
- **`plugin`** makes a plugin package to publish on npm. See [Write a plugin](/docs/how-to/write-a-plugin).

[Choosing a UI](/docs/explanation/choosing-a-ui) compares the React UI with a UI of your own, and [Three shapes of game](/docs/explanation/shapes-of-game) describes the three examples.

## Start from every plugin at once

The `town` template is the showcase, with every first-party plugin in its `plugins` list and its React UIs wired up. Copy it to see how a game with places, people, a calendar and a shop fits together:

```sh
npm create ifloom@latest my-town -- --template town
```

## Pick a theme

A `react` or `next` game gets one of the React UI's four presets at random, and the command prints the one it picked. Choose one with `--theme paper`, `terminal`, `studio` or `storybook`, or `--theme none` for the plain look. The command writes it into `src/styles.css`, where you can change it later. A copied example keeps its own theme unless you pass one, and the other templates ignore the flag.

## Check it worked

Stop the dev server, or open a second terminal, and run the game's checks:

```sh tab="npm" tab-group="package-manager"
npm run check
npm run typecheck
```

```sh tab="pnpm" tab-group="package-manager"
pnpm check
pnpm typecheck
```

```sh tab="yarn" tab-group="package-manager"
yarn run check
yarn run typecheck
```

```sh tab="bun" tab-group="package-manager"
bun run check
bun run typecheck
```

`check` prints `No problems.` for a game that loads cleanly, and `typecheck` prints nothing. With yarn 2 or later, the command also writes a `.yarnrc.yml` with `nodeLinker: node-modules`, because Vite doesn't support Plug'n'Play installs.

The new game's files follow [Organise your game's files](/docs/how-to/organise-your-files), and its `AGENTS.md` briefs a coding agent (see [Work with a coding agent](/docs/how-to/use-a-coding-agent)). For more, see:

- [`ifloom new`](/docs/reference/cli#ifloom-new), every flag of the command `npm create ifloom` runs.
- [The town tutorial](/docs/tutorial/town/create-a-game), which builds a game from here step by step.
- [Run the examples from the repository](/docs/how-to/work-in-the-repository), to try unreleased code.
