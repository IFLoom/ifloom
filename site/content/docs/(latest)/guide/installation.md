---
title: "Installation"
description: Set up IFLoom from a checkout of the repository, play an example, start your own game with ifloom new, or keep a game in a folder of its own.
---
IFLoom is pre-release and its packages aren't on npm yet, so you work from a checkout of the repository. The quickest route is to make your game inside the checkout with `npm run new`. If you'd rather keep your game in a folder of its own, see [A game beside the checkout](#a-game-beside-the-checkout) further down.

## Requirements

- **Node 22.18 or later.** Node 24 is recommended. The engine and the CLI ship TypeScript source that Node runs by stripping the types, which Node does by default from 22.18 and from 23.6. On Node 22.6 to 22.17, set `NODE_OPTIONS=--experimental-strip-types` before you run the `ifloom` command.
- **Git and npm.** npm comes with Node.

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

`npm run new` makes a new game in `games/my-game`. The `games/` folder is an npm workspace, which is why you run `npm install` again: it links the new game to the engine and its tools. Git ignores `games/`, so your game stays out of the engine's history and pulling a newer IFLoom leaves it alone.

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

The checkout's workspaces are npm's, so use npm for the commands above. For a game in a folder of its own (see [below](#a-game-beside-the-checkout)), npm is the tested route while IFLoom is pre-release. pnpm works too if you write `link:` where this page writes `file:`, because pnpm copies a `file:` folder into `node_modules`, and Node won't run the CLI's TypeScript from there. yarn and bun don't work with a linked checkout yet.

Once the packages are on npm, a game's scripts are the same with any of the four. Only the way you run them changes:

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

## A game beside the checkout

This route takes more setup. Use it if you want your game in a folder of its own, with its own git repository, next to the checkout:

```
work/
├── ifloom/      the IFLoom repository
└── my-game/     your game
```

Your game depends on the packages in the checkout through `file:` links. npm links each one rather than copying it, so a change in the checkout reaches your game without reinstalling.

1. Run `npm install` inside `ifloom/` first, so the packages have their own dependencies.

2. Make the game from the `react` template and move it out of the checkout:

   ```sh
   cd ifloom
   npm run new -- my-game
   mv games/my-game ../my-game
   ```

   That gives you every file from [What's in the new game](#whats-in-the-new-game) with your game's name filled in. Two of them need changing, because they assume the game lives in the checkout.

3. In `my-game/package.json`, point the dependencies at the checkout:

   ```json
   {
     "dependencies": {
       "@ifloom/engine": "file:../ifloom/packages/engine",
       "@ifloom/react": "file:../ifloom/packages/react"
     },
     "devDependencies": {
       "@ifloom/cli": "file:../ifloom/packages/cli"
     }
   }
   ```

   Leave the `name`, the `scripts` and the other dev dependencies (the Vite plugins) as they are. You don't list React or Vite yourself. React, its types, `@ifloom/audio` and `@ifloom/browser` are peer dependencies of `@ifloom/react`, which npm 7 and later installs for you, and which a linked `@ifloom/react` finds in the checkout.

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
     "include": ["src"]
   }
   ```

   The packages ship `.ts` files that import each other with their `.ts` extensions, which is why `allowImportingTsExtensions` is on. It needs `noEmit`, because Vite writes the JavaScript, not `tsc`. With `verbatimModuleSyntax` on, import types with `import type` or an inline `type`.

5. Install and run it:

   ```sh
   cd ../my-game
   npm install
   npm run check      # No problems.
   npm run dev
   ```

A game from the `next` template has its own complete `tsconfig.json`, so leave that one as it is. Next's bundler, Turbopack, reads no file outside a root folder, and the linked packages are in the checkout. Set the root to the folder holding both, in `next.config.ts`:

```ts
turbopack: { root: path.resolve('..') },
```

with `import path from 'node:path'` at the top. A game that installs the packages from npm doesn't need it.

The `ifloom` command works through a `file:` link, because Node sees the CLI's real path in the checkout. React, Vite and the rest resolve from the checkout too, so your game folder needs nothing but the three links. The [Vite preset](/docs/cli#the-vite-preset) dedupes React, so the page bundles one copy.

`"types": ["@ifloom/cli/client"]` gives TypeScript Vite's browser types (for `import './styles.css'` and `import.meta.env`) from the CLI's own Vite. To type-check with `tsc`, add `typescript` to your dev dependencies and run `npx tsc --noEmit`.

### Plugins

A calendar, places, characters, quests, a wardrobe and a phone each come as a plugin, a package of its own. Inside the checkout they're already there. Beside it, add a `file:` link for each one your game uses. [A game with a world](/docs/guide/first-game) uses the calendar, places and cast:

```json
{
  "dependencies": {
    "@ifloom/plugin-calendar": "file:../ifloom/packages/plugin-calendar",
    "@ifloom/plugin-places": "file:../ifloom/packages/plugin-places",
    "@ifloom/plugin-cast": "file:../ifloom/packages/plugin-cast"
  }
}
```

Each plugin's folder is `packages/` and the part of its name after `@ifloom/`, so `@ifloom/plugin-jobs` is `packages/plugin-jobs`. The [phone](/docs/plugins/phone) is a bundle rather than a plugin, at `packages/phone`, and it needs the three plugins it wires together beside it:

```json
{
  "dependencies": {
    "@ifloom/phone": "file:../ifloom/packages/phone",
    "@ifloom/plugin-devices": "file:../ifloom/packages/plugin-devices",
    "@ifloom/plugin-messages": "file:../ifloom/packages/plugin-messages",
    "@ifloom/plugin-feed": "file:../ifloom/packages/plugin-feed"
  }
}
```

[Plugins](/docs/plugins) lists them all.

### Type-checking scripts that use the CLI

The tsconfig above covers code that runs in the browser. A file that imports `@ifloom/cli`, such as a [playtest policy](/docs/cli#policy), pulls in the CLI's own source, which uses Node's modules, so `tsc` reports `Cannot find name 'node:fs'`. Either keep such files out of `include` (in a `tools/` folder, say), or add `@types/node` to your dev dependencies and `"node"` to `types`.

## A plugin beside the checkout

A plugin you mean to publish lives in its own folder and repository, like a game beside the checkout. Make it from the `plugin` template and move it out:

```sh
cd ifloom
npm run new -- ifloom-plugin-weather --template plugin
mv games/ifloom-plugin-weather ../ifloom-plugin-weather
```

Its `tsconfig.json` is already complete. Point the engine dev dependency at the checkout in `package.json`, and leave the peer dependency as it is, since that's the range a game will see once the plugin is on npm:

```json
{
  "peerDependencies": {
    "@ifloom/engine": "^0.0.0"
  },
  "devDependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine"
  }
}
```

Then install and run its tests:

```sh
cd ../ifloom-plugin-weather
npm install
npm test
npm run typecheck
```

[`ifloom new`](/docs/cli#a-plugin-package) lists what's in the package, [Writing a plugin](/docs/reference/plugins) covers every part of one, and [Community plugins](/docs/plugins/community) says how to get it listed.
