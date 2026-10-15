---
description: Set up IFLoom from a checkout of the repository, play an example, start your own game with ifloom new, or keep a game in a folder of its own.
---

# Installation

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

See [Shapes of game](/guide/shapes) for what each one shows.

## Start your own game

From the root of the checkout:

```sh
npm run new -- my-game
npm install
npm run dev -w my-game
```

`npm run new` makes a new game in `games/my-game`. The `games/` folder is an npm workspace, which is why you run `npm install` again: it links the new game to the engine and its tools. Git ignores `games/`, so your game stays out of the engine's history and pulling a newer IFLoom leaves it alone.

The default template is a small game drawn with the [React UI](/react/). Pick another with `--template`:

| Template | What you get |
|---|---|
| `blank` | Two scenes and a stat, drawn with the React UI. The default. |
| `vanilla` | The same game drawn with plain DOM and no framework. Start here for Vue, Svelte or anything else. |
| `novel` | A copy of The Letter. |
| `cafe` | A copy of The Corner Café. |
| `town` | A copy of Small Town, with every plugin. |

```sh
npm run new -- my-cafe --template cafe
```

[`ifloom new`](/cli/#ifloom-new) has the details.

### What's in the new game

A game made from the `blank` template looks like this:

```
games/my-game/
├── AGENTS.md         notes for a coding agent: where the docs are, how to check its work
├── index.html        the page, with the #root element the game draws into
├── package.json      the scripts, and the @ifloom packages it depends on
├── tsconfig.json     TypeScript settings, extending the checkout's tsconfig.base.json
├── vite.config.ts    the Vite preset from @ifloom/cli/vite
├── .gitignore        leaves out node_modules, dist and playtest
└── src/
    ├── game.ts       the game: scenes, choices, a stat and the words
    ├── main.ts       starts the game in the page with mountGame
    └── styles.css    imports the React UI's styles, and sets the theme colours
```

You'll spend most of your time in `src/game.ts`. [Your first story](/guide/first-story) starts from this file and grows it into a short novel. `src/main.ts` is three lines that hand the game to [`mountGame`](/react/#mountgame), which starts it with undo, saves and an autosave each chapter.

The `package.json` lists only IFLoom's own packages: `@ifloom/engine`, `@ifloom/react` and, as a dev dependency, `@ifloom/cli`. The CLI brings Vite and its plugins, and the React UI brings React. Its scripts run the [CLI](/cli/):

```sh
npm run dev -w my-game        # play it in a browser, reloading as you edit
npm run check -w my-game      # check its content; prints "No problems." when there are none
npm run playtest -w my-game   # play 5 turns with no one at the keyboard; writes playtest/run.txt
npm run build -w my-game      # build it into games/my-game/dist/
```

## Check it works

```sh
npm run check -w my-game
```

It prints `No problems.` when the game loads cleanly. If it lists problems, each one names the scene or key it's about.

Next, write [your first story](/guide/first-story).

## A game beside the checkout

This route takes more setup. Use it if you want your game in a folder of its own, with its own git repository, next to the checkout:

```
work/
├── ifloom/      the IFLoom repository
└── my-game/     your game
```

Your game depends on the packages in the checkout through `file:` links. npm links each one rather than copying it, so a change in the checkout reaches your game without reinstalling.

1. Run `npm install` inside `ifloom/` first, so the packages have their own dependencies.

2. Make the game from the blank template and move it out of the checkout:

   ```sh
   cd ifloom
   npm run new -- my-game
   mv games/my-game ../my-game
   ```

   That gives you every file from [What's in the new game](#what-s-in-the-new-game) with your game's name filled in. Two of them need changing, because they assume the game lives in the checkout.

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

   Leave the `name` and `scripts` as they are. You don't list React, Vite or Tailwind yourself. React is a peer dependency of `@ifloom/react`, which npm 7 and later installs for you.

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

The `ifloom` command works through a `file:` link, because Node sees the CLI's real path in the checkout. React, Vite and the rest resolve from the checkout too, so your game folder needs nothing but the three links. The [Vite preset](/cli/#the-vite-preset) dedupes React, so the page bundles one copy.

`"types": ["@ifloom/cli/client"]` gives TypeScript Vite's browser types (for `import './styles.css'` and `import.meta.env`) from the CLI's own Vite. To type-check with `tsc`, add `typescript` to your dev dependencies and run `npx tsc --noEmit`.

### Plugins

A calendar, places, characters, quests, a wardrobe and a phone each come as a plugin, a package of its own. Inside the checkout they're already there. Beside it, add a `file:` link for each one your game uses. [A game with a world](/guide/first-game) uses the calendar, places and cast:

```json
{
  "dependencies": {
    "@ifloom/plugin-calendar": "file:../ifloom/packages/plugin-calendar",
    "@ifloom/plugin-places": "file:../ifloom/packages/plugin-places",
    "@ifloom/plugin-cast": "file:../ifloom/packages/plugin-cast"
  }
}
```

[Plugins](/plugins/) lists them all.
