---
title: "Working from the repository"
description: Try IFLoom's unreleased code from a clone of the repository, with a game inside the checkout or in a folder of its own beside it, using the packed packages with npm, pnpm, yarn or bun.
---
This page is for trying code that hasn't been released yet, such as a fix on the main branch. For a game on the published packages, follow [Installation](/docs/guide/installation) instead.

You need Node 22.18 or later (Node 24 is recommended), git and npm. Inside the checkout the tools run the packages' TypeScript source, and Node strips the types itself from 22.18.

## Get the code and play an example

```sh
git clone https://github.com/IFLoom/ifloom.git
cd ifloom
npm install
npm run dev -w @ifloom/example-novel
```

Vite prints a local address. Open it to play The Letter. The other two examples run the same way:

```sh
npm run dev -w @ifloom/example-cafe    # The Corner Café, a management game
npm run dev -w @ifloom/showcase        # Small Town, which uses every feature
```

## A game inside the checkout

From the root of the checkout:

```sh
npm run new -- my-game
npm install
npm run dev -w my-game
```

`npm run new` runs [`ifloom new`](/docs/cli#ifloom-new), with the same `--template` and `--theme` as `npm create ifloom`, and makes the game in `games/my-game`. The `games/` folder is an npm workspace, so `npm install` links the new game to the packages. Git ignores `games/`, so your game stays out of IFLoom's history and pulling a newer IFLoom leaves it alone.

Run the game's scripts from the root with `-w`, as in `npm run check -w my-game`. The checkout's workspaces are npm's, so use npm here.

A change to a package shows up in your game straight away, because the checkout's tools read each package's source. A `next` game is the exception. Next reads the built packages, so run `npm run build` at the root before its `dev` or `build`, and again after you change a package.

## A game beside the checkout

To keep your game in a folder and repository of its own, next to the checkout, it installs the packages as they'll be published:

```
work/
├── ifloom/      the IFLoom repository
└── my-game/     your game
```

1. Build each package and pack it into a file in `ifloom/packs/`:

   ```sh
   cd ifloom
   npm install
   npm run pack
   ```

   To keep the files out of the checkout, give another folder after `--`. The path is taken from the checkout, where npm runs the script: `npm run pack -- ../my-game/packs` writes them into `work/my-game/packs/`, and the `file:` paths below then read `file:./packs/ifloom-engine-0.0.0.tgz` and so on. The build still writes each package's `dist/` in the checkout, which git ignores.

2. Make the game beside the checkout with the command `npm create ifloom` runs, straight from the checkout:

   ```sh
   cd ..
   node ifloom/packages/create-ifloom/bin.js my-game
   ```

   It takes the same `--template` and `--theme`.

3. In `my-game/package.json`, point the @ifloom dependencies at the packed files:

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

   Leave the rest as it is. `@ifloom/audio` and `@ifloom/browser` are peer dependencies of `@ifloom/react`. A package manager would install them from the registry, so list their files too. A package's file is its name with the `@` dropped and the `/` turned into a `-`, then its version, so `@ifloom/plugin-jobs` is `packs/ifloom-plugin-jobs-0.0.0.tgz`. Add one for each plugin your game uses.

4. Install it and run it:

   ```sh tab="npm" tab-group="package-manager"
   cd my-game
   npm install
   npm run check      # No problems.
   npm run dev
   ```

   ```sh tab="pnpm" tab-group="package-manager"
   cd my-game
   pnpm install
   pnpm check         # No problems.
   pnpm dev
   ```

   ```sh tab="yarn" tab-group="package-manager"
   cd my-game
   yarn install
   yarn run check     # No problems.
   yarn run dev
   ```

   ```sh tab="bun" tab-group="package-manager"
   cd my-game
   bun install
   bun run check      # No problems.
   bun run dev
   ```

A few package managers need more:

- **bun** looks a package's peers up on the registry even when your game lists them. List the same files under `"overrides"` too.
- **yarn 2 and later** need a `.yarnrc.yml` holding `nodeLinker: node-modules`, because Vite doesn't support yarn's Plug'n'Play installs. `yarn create ifloom` writes it for you, but running the command with `node` doesn't.
- **npm 10**, the one that comes with Node 20, stops with `Cannot read properties of null (reading 'edgesOut')` on the packed files. Run `npm install --legacy-peer-deps`, or update npm.

When you pull a newer IFLoom, run `npm run pack` in the checkout again. In your game, `npm update` picks up the new files. With another package manager, delete `node_modules` and the lockfile and install again. yarn 1 also keeps the old files in its cache under the same version, so run `yarn cache clean` first.

A [plugin package](/docs/reference/plugins#a-plugin-package) beside the checkout works the same way. Make it with `--template plugin`, and point its `@ifloom/engine` dev dependency at the packed engine. Leave its peer dependency as it is, since that's the range a game will see once the plugin is on npm.
