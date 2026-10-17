---
title: "Installation"
description: Set up IFLoom from a checkout of the repository, play an example, start your own game with ifloom new, or keep a game in a folder of its own with npm, pnpm, yarn or bun.
---
IFLoom is pre-release and its packages aren't on npm yet, so you work from a checkout of the repository. The quickest route is to make your game inside the checkout with `npm run new`. If you'd rather keep your game in a folder of its own, see [A game beside the checkout](#a-game-beside-the-checkout) further down.

## Requirements

- **Node 22.18 or later for the checkout.** Node 24 is recommended. Inside the checkout the tools run the packages' TypeScript source, and Node runs TypeScript by stripping the types, which it does by default from 22.18 (see [Working in the checkout](#working-in-the-checkout)). A game beside the checkout uses the built packages, which need Node 20.19 or later, or 22.12 or later.
- **Git and npm.** npm comes with Node. A game beside the checkout can use pnpm, yarn or bun instead.

## Get the code and play an example

Clone the repository, install its dependencies, and play The Letter, a short linear novel:

```sh
git clone https://github.com/IFLoom/ifloom.git
cd ifloom
npm install
npm run dev -w @ifloom/example-novel
```

Vite prints a local address. Open it in your browser to play. The other two examples run the same way:

```sh
npm run dev -w @ifloom/example-cafe    # The Corner Café, a management game
npm run dev -w @ifloom/showcase        # Small Town, which uses every feature
```

See [Shapes of game](/docs/guide/shapes) for what each one shows.

## Start your own game

From the root of the checkout:

```sh
npm run new -- my-game
npm install
npm run dev -w my-game
```

`npm run new` makes a new game in `games/my-game`. The `games/` folder is an npm workspace, so you run `npm install` again to link the new game to the engine and its tools. Git ignores `games/`, so your game stays out of the engine's history and pulling a newer IFLoom leaves it alone.

The default template is a small game drawn with the [React UI](/docs/react). Pick another with `--template`:

| Template | What you get |
|---|---|
| `react` | Two scenes and a stat, drawn with the React UI. The default. |
| `vanilla` | The same game drawn with plain DOM and no framework. |
| `vue` | The same game drawn with Vue 3. |
| `svelte` | The same game drawn with Svelte 5. |
| `next` | The same game in a Next.js app, drawn with the React UI, for a game hosted on the web. See [Next.js](/docs/recipes/next). |
| `novel` | A copy of The Letter. |
| `cafe` | A copy of The Corner Café. |
| `town` | A copy of Small Town, with every plugin. |
| `plugin` | Not a game: a plugin package of its own, with a test, to publish on npm. See [A plugin beside the checkout](#a-plugin-beside-the-checkout). |

```sh
npm run new -- my-cafe --template cafe
```

The `vanilla`, `vue` and `svelte` templates draw the scene, choices, inputs, stats and minigames themselves and play the game's sound, with no React. [Your own UI in any framework](/docs/guide/frameworks) walks through their code, and is the place to start for any other framework. [Choosing a UI](/docs/guide/choosing-a-ui) compares them with the React UI.

The `next` template builds with Next.js rather than the `ifloom` CLI, so it can't make the single offline `index.html` the others can. Its `check` and `playtest` scripts still use the CLI.

A game drawn with the React UI also gets a theme preset, which sets its fonts, colours and the shape of the page. A `react` game gets one at random, and a copied example keeps its own. Pick one with `--theme paper`, `terminal`, `studio` or `storybook`, leave it out with `--theme none` for the plain default look, or change it later in `src/styles.css` (see [Make it your own](/docs/react/customising)).

[`ifloom new`](/docs/cli#ifloom-new) has the details.

### What's in the new game

A game made from the `react` template looks like this:

```
games/my-game/
├── AGENTS.md         notes for a coding agent: where the docs are, how to check its work
├── index.html        the page, with the #root element the game draws into
├── package.json      the scripts, and the @ifloom packages it depends on
├── tsconfig.json     TypeScript settings, extending the checkout's tsconfig.base.json
├── vite.config.ts    the Vite preset from @ifloom/cli/vite, with React's and Tailwind's plugins
├── .gitignore        leaves out node_modules, dist and playtest
└── src/
    ├── game.ts       the game: scenes, choices, a stat and the words
    ├── main.ts       starts the game in the page with mountGame
    └── styles.css    imports the React UI's styles and a theme preset
```

You'll spend most of your time in `src/game.ts`. [Your first story](/docs/guide/first-story) starts from this file and grows it into a short novel. `src/main.ts` is three lines that hand the game to [`mountGame`](/docs/react#mountgame), which starts it with undo, saves and an autosave each chapter.

The `package.json` lists `@ifloom/engine` and `@ifloom/react`, and as dev dependencies `@ifloom/cli` and the Vite plugins the React UI needs: `@vitejs/plugin-react`, `@tailwindcss/vite` and `tailwindcss`. The CLI brings Vite, and the React UI brings React. Its scripts run the [CLI](/docs/cli):

```sh
npm run dev -w my-game        # play it in a browser, reloading as you edit
npm run check -w my-game      # check its content; prints "No problems." when there are none
npm run playtest -w my-game   # play 5 turns with no one at the keyboard; writes playtest/run.txt
npm run build -w my-game      # build it into games/my-game/dist/
```

### With pnpm, yarn or bun

The checkout's workspaces are npm's, so use npm for the commands above. A game in a folder of its own (see [below](#a-game-beside-the-checkout)) can use npm, pnpm, yarn or bun. Its scripts are the same with any of the four. Only the way you run them changes:

| npm | pnpm | yarn | bun |
|---|---|---|---|
| `npm install` | `pnpm install` | `yarn install` | `bun install` |
| `npm run dev` | `pnpm dev` | `yarn run dev` | `bun run dev` |
| `npm run check` | `pnpm check` | `yarn run check` | `bun run check` |

Use `yarn run check` rather than `yarn check`, which is a command of yarn 1's own, and `bun run build` rather than `bun build`, which is bun's bundler.

## Check it works

```sh
npm run check -w my-game
```

It prints `No problems.` when the game loads cleanly. If it lists problems, each one names the scene or key it's about.

Next, write [your first story](/docs/guide/first-story).

## Working in the checkout

Inside the checkout nothing needs building. Each package's `exports` in its `package.json` has an `ifloom-source` condition that points at its TypeScript source, and every tool in the checkout uses it:

- the [Vite preset](/docs/cli#the-vite-preset), for a game whose folder is inside the checkout, such as the examples and `games/*`
- Vitest, for the tests
- TypeScript, through `customConditions` in `tsconfig.base.json`
- the website
- Node itself, which the checkout's `.npmrc` runs with `--conditions=ifloom-source` for npm's scripts and `npx`, so the `ifloom` command runs from source too

A change to a package shows up straight away in the examples and in your games in `games/`. Each package also builds into its `dist/` folder as JavaScript, type declarations and source maps. A game beside the checkout uses those files, as will a game that installs IFLoom from npm:

```sh
npm run build    # every package's dist/
npm run pack     # build, then pack each package into packs/ as npm would publish it
```

A `next` game inside the checkout reads the built packages too, because Next has no setting for the condition. Run `npm run build` before its `dev` or `build`, and again after you change a package.

## A game beside the checkout

This route takes more setup. Use it if you want your game in a folder of its own, with its own git repository, next to the checkout:

```
work/
├── ifloom/      the IFLoom repository
└── my-game/     your game
```

Your game installs the packages as they'll be published. `npm run pack` in the checkout builds each one and packs it into a file in `ifloom/packs/`, and your game depends on those files. You can use npm, pnpm, yarn or bun.

1. Build and pack the packages:

   ```sh
   cd ifloom
   npm install
   npm run pack
   ```

2. Make the game from the `react` template and move it out of the checkout:

   ```sh
   npm run new -- my-game
   mv games/my-game ../my-game
   ```

   That gives you every file from [What's in the new game](#whats-in-the-new-game) with your game's name filled in. Two of them need changing, because they assume the game lives in the checkout.

3. In `my-game/package.json`, point the dependencies at the packed files:

   ```json
   {
     "dependencies": {
       "@ifloom/engine": "file:../ifloom/packs/ifloom-engine-0.0.0.tgz",
       "@ifloom/react": "file:../ifloom/packs/ifloom-react-0.0.0.tgz",
       "@ifloom/audio": "file:../ifloom/packs/ifloom-audio-0.0.0.tgz",
       "@ifloom/browser": "file:../ifloom/packs/ifloom-browser-0.0.0.tgz"
     },
     "devDependencies": {
       "@ifloom/cli": "file:../ifloom/packs/ifloom-cli-0.0.0.tgz"
     }
   }
   ```

   Leave the `name`, the `scripts` and the other dependencies (React, its types and the Vite plugins) as they are. `@ifloom/audio` and `@ifloom/browser` are peer dependencies of `@ifloom/react`. Once the packages are on npm, your package manager installs them for you. Until then, list them, or it looks for them on the npm registry.

   With bun, also list the same five under `"overrides"`. bun looks a package's peers up on the registry even when your game lists them.

4. Replace `my-game/tsconfig.json`. The template's extends `../../tsconfig.base.json`, which isn't there outside the checkout, so write the settings out in full:

   ```json
   {
     "compilerOptions": {
       "target": "es2023",
       "lib": ["ES2023", "DOM", "DOM.Iterable"],
       "module": "esnext",
       "moduleResolution": "bundler",
       "allowImportingTsExtensions": true,
       "verbatimModuleSyntax": true,
       "moduleDetection": "force",
       "erasableSyntaxOnly": true,
       "noEmit": true,
       "strict": true,
       "skipLibCheck": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true,
       "jsx": "react-jsx",
       "types": ["@ifloom/cli/client"]
     },
     "include": ["src", "vite.config.ts"]
   }
   ```

   The template's files import each other with their `.ts` extensions, which is why `allowImportingTsExtensions` is on. It needs `noEmit`, because Vite writes the JavaScript, not `tsc`. With `verbatimModuleSyntax` on, import types with `import type` or an inline `type`.

5. Install and run it:

   ```sh tab="npm" tab-group="package-manager"
   cd ../my-game
   npm install
   npm run check      # No problems.
   npm run dev
   ```

   ```sh tab="pnpm" tab-group="package-manager"
   cd ../my-game
   pnpm install
   pnpm check         # No problems.
   pnpm dev
   ```

   ```sh tab="yarn" tab-group="package-manager"
   cd ../my-game
   yarn install
   yarn run check     # No problems.
   yarn run dev
   ```

   ```sh tab="bun" tab-group="package-manager"
   cd ../my-game
   bun install
   bun run check      # No problems.
   bun run dev
   ```

   With yarn 2 or later, add a `.yarnrc.yml` holding `nodeLinker: node-modules` first. Vite doesn't support yarn's Plug'n'Play installs.

   npm 10, the one that comes with Node 20, stops with `Cannot read properties of null (reading 'edgesOut')` on the packed files. Run `npm install --legacy-peer-deps` there, or update npm.

A game from the `next` template has its own complete `tsconfig.json`, so leave that one as it is.

When you change the checkout or pull a newer IFLoom, run `npm run pack` there again. In your game, `npm update` picks up the new files. With another package manager, delete `node_modules` and the lockfile and install again.

`"types": ["@ifloom/cli/client"]` gives TypeScript Vite's browser types (for `import './styles.css'` and `import.meta.env`) from the CLI's own Vite. To type-check with `tsc`, add `typescript` to your dev dependencies and run `npx tsc --noEmit`.

### Plugins

A calendar, places, characters, quests, a wardrobe and a phone each come as a plugin, a package of its own. Inside the checkout they're already there. Beside it, add the packed file for each one your game uses. [A game with a world](/docs/guide/first-game) uses the calendar, places and cast:

```json
{
  "dependencies": {
    "@ifloom/plugin-calendar": "file:../ifloom/packs/ifloom-plugin-calendar-0.0.0.tgz",
    "@ifloom/plugin-places": "file:../ifloom/packs/ifloom-plugin-places-0.0.0.tgz",
    "@ifloom/plugin-cast": "file:../ifloom/packs/ifloom-plugin-cast-0.0.0.tgz"
  }
}
```

A package's file in `packs/` is its name with the `@` dropped and the `/` turned into a `-`, then its version. So `@ifloom/plugin-jobs` is `packs/ifloom-plugin-jobs-0.0.0.tgz`. The [phone](/docs/plugins/phone) is a bundle rather than a plugin, and it needs the three plugins it wires together beside it:

```json
{
  "dependencies": {
    "@ifloom/phone": "file:../ifloom/packs/ifloom-phone-0.0.0.tgz",
    "@ifloom/plugin-devices": "file:../ifloom/packs/ifloom-plugin-devices-0.0.0.tgz",
    "@ifloom/plugin-messages": "file:../ifloom/packs/ifloom-plugin-messages-0.0.0.tgz",
    "@ifloom/plugin-feed": "file:../ifloom/packs/ifloom-plugin-feed-0.0.0.tgz"
  }
}
```

[Plugins](/docs/plugins) lists them all.

### Type-checking scripts that use the CLI

The tsconfig above covers code that runs in the browser. A file that imports `@ifloom/cli`, such as a [playtest policy](/docs/cli#policy), pulls in the CLI's types, which use Node's modules, so `tsc` reports `Cannot find name 'node:fs'`. Either keep such files out of `include` (in a `tools/` folder, say), or add `@types/node` to your dev dependencies and `"node"` to `types`.

## A plugin beside the checkout

A plugin you mean to publish lives in its own folder and repository, like a game beside the checkout. Make it from the `plugin` template and move it out:

```sh
cd ifloom
npm run new -- ifloom-plugin-weather --template plugin
mv games/ifloom-plugin-weather ../ifloom-plugin-weather
```

Its `tsconfig.json` is already complete. In `package.json`, point the engine dev dependency at the packed engine (run `npm run pack` in the checkout first). Leave the peer dependency as it is. That's the range a game will see once the plugin is on npm.

```json
{
  "peerDependencies": {
    "@ifloom/engine": "^0.0.0"
  },
  "devDependencies": {
    "@ifloom/engine": "file:../ifloom/packs/ifloom-engine-0.0.0.tgz"
  }
}
```

Then install it, run its tests and build it:

```sh
cd ../ifloom-plugin-weather
npm install
npm test
npm run typecheck
npm run build      # dist/, which npm publish packs
```

A plugin is published as JavaScript with its type declarations, as IFLoom's own packages are. `npm run build` compiles `src/` into `dist/` with [tsdown](https://tsdown.dev), and `npm publish` runs it first.

[`ifloom new`](/docs/cli#a-plugin-package) lists what's in the package, [Writing a plugin](/docs/reference/plugins) covers every part of one, and [Community plugins](/docs/plugins/community) says how to get it listed.
