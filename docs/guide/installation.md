# Installation

IFLoom is pre-release and **not on npm yet**. Today you depend on it from a local checkout of the repository. Once it is published, the install will be:

```sh
npm install @ifloom/engine   # planned — not published yet
```

## From a local checkout

Clone the IFLoom repository next to your game, so the two folders sit side by side:

```
work/
├── ifloom/      the engine repository
└── my-game/     your game
```

In your game's `package.json`, point the dependency at the engine package inside the checkout:

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine"
  }
}
```

Then run `npm install`. npm links the folder, so a change in the checkout is picked up without reinstalling.

## It ships TypeScript, unbuilt

The engine package has no build step. Its entry points are `.ts` files, and they import each other with explicit `.ts` extensions:

```ts
import { apply, view } from '@ifloom/engine' // → packages/engine/src/index.ts
```

Whatever loads your game has to understand that:

- **Vite** (and Vitest) handle it out of the box. This is the recommended setup.
- **Node ≥ 22.6** handles it with `--experimental-strip-types`, including through the `file:` link. Newer Node versions strip types by default.

Other bundlers need to be told to transpile `.ts` files from the linked package.

## Requirements

- **Node.** No minimum is pinned yet. The engine is developed on Node 24; you need at least 22.6 to run it under Node directly.
- **TypeScript.** Your `tsconfig.json` needs these settings to type-check imports from the engine:

```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true
  }
}
```

`allowImportingTsExtensions` requires `noEmit` (or `emitDeclarationOnly`): your bundler emits the JavaScript, not `tsc`. With `verbatimModuleSyntax`, import types with `import type` or an inline `type` modifier.

## Plugins

Everything past the core — a calendar, places, people, quests, a wardrobe, a phone — comes as a plugin, a package of its own beside the engine. Add each one the game uses from the same checkout. [Your first game](/guide/first-game) keeps a calendar, has places to walk between and a baker to talk to, so it needs [`@ifloom/plugin-calendar`](/plugins/calendar), [`@ifloom/plugin-places`](/plugins/places) and [`@ifloom/plugin-cast`](/plugins/cast):

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-calendar": "file:../ifloom/packages/plugin-calendar",
    "@ifloom/plugin-places": "file:../ifloom/packages/plugin-places",
    "@ifloom/plugin-cast": "file:../ifloom/packages/plugin-cast"
  }
}
```

The list is on [Plugins](/plugins/).

## The base UI

To draw the game in a browser without writing a UI of your own, add `@ifloom/ui` from the same checkout, with React and Tailwind CSS. Its setup is on [The base UI](/ui/#install).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/ui": "file:../ifloom/packages/ui"
  }
}
```

## The CLI

`@ifloom/cli` runs the game while you write it, builds it into a folder that opens from disk, and checks its content. Add it as a dev dependency from the same checkout, with its Vite preset's plugins; the list is on [The CLI](/cli/#install).

```json
{
  "scripts": {
    "dev": "ifloom dev",
    "build": "ifloom build",
    "check": "ifloom check"
  },
  "devDependencies": {
    "@ifloom/cli": "file:../ifloom/packages/cli"
  }
}
```

Then give the game a `vite.config.ts` that uses the preset:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { ifloom } from '@ifloom/cli/vite'

export default defineConfig(ifloom())
```

`npm run dev` serves the game, `npm run build` builds it into `dist/` (see [Shipping a game](/guide/shipping)), and `npm run check` lists what is wrong with its content. `check` reads the game from `src/game.ts`; see [What the module exports](/cli/#what-the-module-exports).

## Check it works

```ts
import { SAVE_VERSION } from '@ifloom/engine'

console.log(SAVE_VERSION) // 8
```

Next: [your first game](/guide/first-game).
