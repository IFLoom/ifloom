---
title: "Run the examples from the repository"
description: "Try unreleased IFLoom code from a clone of the repository by playing the examples or making a game in or beside the checkout."
---
Use this to try code that hasn't been released yet, such as a fix on the main branch. You need Node 22.18 or later, git and npm, because the checkout's tools run the packages' TypeScript source and Node strips the types itself from 22.18. For a game on the published packages, see [Create a game](/docs/0.1.0/how-to/create-a-game) instead.

## Play the examples

1. Clone the repository and install it:

   ```sh
   git clone https://github.com/IFLoom/ifloom.git
   cd ifloom
   npm install
   ```

2. Run an example's dev server, and open the address Vite prints:

   ```sh
   npm run dev -w @ifloom/example-novel   # The Letter, a linear novel
   npm run dev -w @ifloom/example-cafe    # The Corner Café, a management game
   npm run dev -w @ifloom/showcase        # Small Town, which uses every feature
   ```

The showcase has more scripts, each run the same way with `-w @ifloom/showcase`:

```sh
npm run build            # build dist/index.html
npm run check            # list any problem in its content
npm run playtest         # play a week unattended, into playtest/week.txt
npm run snapshot         # compare every scene with snapshots/scenes.txt
npm run build:one-file   # build dist-one/index.html, with the pictures inside it
```

Open the built `dist/index.html` straight from disk, with no server. [The examples](/docs/0.1.0/reference/examples) lists each example's files.

## Make a game inside the checkout

From the root of the checkout:

```sh
npm run new -- my-game
npm install
npm run dev -w my-game
```

`npm run new` runs [`ifloom new`](/docs/0.1.0/reference/cli#ifloom-new), with the same `--template` and `--theme`, and makes the game in `games/my-game`. The `games/` folder is an npm workspace, so `npm install` links the game to the packages. Git ignores `games/`, so your game stays out of IFLoom's history and a pull leaves it alone.

Run the game's scripts from the root with `-w`, as in `npm run check -w my-game`. The checkout's workspaces are npm's, so use npm here. A change to a package shows up in the game straight away, because the checkout's tools read each package's source. A `next` game is the exception: run `npm run build` at the root before its `dev` or `build`, and again after you change a package.

## Make a game beside the checkout

Use this to keep the game in a folder and repository of its own, next to the checkout, on the packages as they'll be published:

```
work/
├── ifloom/      the IFLoom repository
└── my-game/     your game
```

1. Build and pack every package into `ifloom/packs/`:

   ```sh
   cd ifloom
   npm install
   npm run pack
   ```

   To write the files elsewhere, give a folder after `--`, relative to the checkout: `npm run pack -- ../my-game/packs`. The `file:` paths below then read `file:./packs/…`.

2. Make the game beside the checkout with `create-ifloom`'s command, straight from the checkout. It takes the same `--template` and `--theme`:

   ```sh
   cd ..
   node ifloom/packages/create-ifloom/bin.js my-game
   ```

3. In `my-game/package.json`, point the `@ifloom` dependencies at the packed files:

   ```json
   {
     "dependencies": {
       "@ifloom/engine": "file:../ifloom/packs/ifloom-engine-0.1.0.tgz",
       "@ifloom/react": "file:../ifloom/packs/ifloom-react-0.1.0.tgz",
       "@ifloom/audio": "file:../ifloom/packs/ifloom-audio-0.1.0.tgz",
       "@ifloom/browser": "file:../ifloom/packs/ifloom-browser-0.1.0.tgz"
     },
     "devDependencies": {
       "@ifloom/cli": "file:../ifloom/packs/ifloom-cli-0.1.0.tgz"
     }
   }
   ```

   List `@ifloom/audio` and `@ifloom/browser` even though they're peers of `@ifloom/react`, or the package manager fetches them from the registry. A package's file is its name without the `@`, with the `/` as a `-`, then its version, so `@ifloom/plugin-jobs` is `ifloom-plugin-jobs-0.1.0.tgz`. Add one for each plugin the game uses.

4. Install and run it:

   ```sh tab="npm" tab-group="package-manager"
   cd my-game
   npm install
   npm run check
   npm run dev
   ```

   ```sh tab="pnpm" tab-group="package-manager"
   cd my-game
   pnpm install
   pnpm check
   pnpm dev
   ```

   ```sh tab="yarn" tab-group="package-manager"
   cd my-game
   yarn install
   yarn run check
   yarn run dev
   ```

   ```sh tab="bun" tab-group="package-manager"
   cd my-game
   bun install
   bun run check
   bun run dev
   ```

Three package managers need one more step:

- **bun** looks a package's peers up on the registry even when the game lists them. List the same files under `"overrides"` too.
- **yarn 2 and later** need a `.yarnrc.yml` holding `nodeLinker: node-modules`, because Vite doesn't support Plug'n'Play installs. `yarn create ifloom` writes it, but running the command with `node` doesn't.
- **npm 10**, which comes with Node 20, stops with `Cannot read properties of null (reading 'edgesOut')` on the packed files. Run `npm install --legacy-peer-deps`, or update npm.

A plugin package beside the checkout works the same way. Make it with `--template plugin`, and point its `@ifloom/engine` dev dependency at the packed engine. Leave its peer dependency as it is, since that's the range a game sees once the plugin is on npm.

## Check it worked

`npm run check` prints `No problems.` in the new game, and `npm run dev` serves it. After you pull a newer IFLoom, run `npm run pack` in the checkout again, then `npm update` in the game. With another package manager, delete `node_modules` and the lockfile and install again. yarn 1 also keeps the old files in its cache under the same version, so run `yarn cache clean` first.

For more, see:

- [`ifloom new`](/docs/0.1.0/reference/cli#ifloom-new) and [the CLI's requirements](/docs/0.1.0/reference/cli#requirements).
- [Write a plugin](/docs/0.1.0/how-to/write-a-plugin), for a plugin package of your own.
