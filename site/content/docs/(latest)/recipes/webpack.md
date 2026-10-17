---
title: "webpack"
description: "Build an IFLoom game with webpack: a loader for the TypeScript packages, Tailwind through PostCSS for the React UI or no Tailwind at all, mounting the game, ifloom check and playtest beside it, and the single offline index.html with two plugins."
---
Use webpack if your project already builds with it. The game is the same `src/game.ts` as in any template, and webpack replaces only the `ifloom dev` and `ifloom build` steps. `ifloom check` and `ifloom playtest` still work beside it.

## Install

Besides the `@ifloom` packages your game uses, add webpack and the loaders as dev dependencies:

```sh
npm install --save-dev webpack webpack-cli webpack-dev-server html-webpack-plugin esbuild-loader css-loader mini-css-extract-plugin
```

For the React UI, also add `react` and `react-dom`, and Tailwind's PostCSS plugin: `postcss`, `postcss-loader`, `tailwindcss` and `@tailwindcss/postcss`.

## Configure it

```js
// webpack.config.js
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

export default {
  entry: './src/main.ts',
  output: { clean: true },
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
  module: {
    rules: [
      // The @ifloom packages ship TypeScript, so this rule must not skip node_modules.
      { test: /\.tsx?$/, loader: 'esbuild-loader', options: { target: 'es2023', jsx: 'automatic' } },
      // Tailwind builds the React UI's stylesheet.
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'] },
    ],
  },
  plugins: [new HtmlWebpackPlugin({ template: './index.html' }), new MiniCssExtractPlugin()],
}
```

```js
// postcss.config.js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

The config is an ES module, so the `package.json` has `"type": "module"`, as every template's does.

**Compiling the packages.** While IFLoom is pre-release, its packages ship TypeScript source, and they import each other with `.ts` extensions. `esbuild-loader` compiles TypeScript and JSX quickly, and has no `exclude`, so it compiles the packages in `node_modules` along with your own code. `ts-loader` or `babel-loader` work too, as long as they don't skip `node_modules/@ifloom`. The engine's code needs ES2023, so don't set an older `target`.

**Styles.** The React UI's stylesheet is written for Tailwind CSS v4, which `postcss-loader` runs here. Without the React UI you don't need Tailwind: take `postcss-loader` out of the CSS rule and drop the PostCSS config.

`index.html` is the template's, with the `<script>` tag removed, since `HtmlWebpackPlugin` adds one:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Game</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

Add the scripts:

```json
{
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production",
    "check": "ifloom check",
    "playtest": "ifloom playtest --turns 5 --out playtest/run.txt",
    "typecheck": "tsc --noEmit"
  }
}
```

## Mount the game

The entry is the template's `src/main.ts`, unchanged. With the React UI, it's [`mountGame`](/docs/react#mountgame). With your own UI, it's the runner and your drawing code, which webpack bundles like anything else. The `vanilla` template's `main.ts` awaits the runner at the top level, which webpack 5 supports.

```ts tab="Plain JS" tab-group="framework"
// src/main.ts: the vanilla template's, cut down
import { browserRunner } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { startClock, startKeys } from '@ifloom/browser'
import loaded from './game.ts'
import './styles.css'

const runner = await browserRunner(loaded.game)
startAudio(runner)
startClock(runner)
startKeys(runner)

const root = document.querySelector<HTMLElement>('#root')!
// ...draw runner.view() into root, as in "A UI from scratch"
```

```ts tab="React" tab-group="framework"
// src/main.ts: the react template's
import { mountGame } from '@ifloom/react'
import game from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(game, { layout: Layout, pages: true })
```

```ts tab="Vue" tab-group="framework"
// src/main.ts: the vue template's. Add vue-loader for the .vue files.
import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#root')
```

```ts tab="Svelte" tab-group="framework"
// src/main.ts: the svelte template's. Add svelte-loader for the .svelte files.
import { mount } from 'svelte'
import App from './App.svelte'
import './styles.css'

mount(App, { target: document.querySelector('#root')! })
```

The Plain JS and React entries need nothing beyond the config above. Vue's and Svelte's components need their own loader, [vue-loader](https://vue-loader.vuejs.org) or [svelte-loader](https://github.com/sveltejs/svelte-loader), set up as their docs describe.

TypeScript doesn't know what importing a `.css` file gives. Declare it once, in `src/css.d.ts`:

```ts
declare module '*.css'
```

## Check and playtest it

`ifloom check` and `ifloom playtest` load `src/game.ts` with the CLI's own Vite, not with webpack, so they work unchanged. Add `@ifloom/cli` as a dev dependency and keep the game in `src/game.ts`, exported as `default` or `game`. Pictures and sound go in `public/`, where `ifloom check` looks for them. Copy that folder into the build yourself, with [copy-webpack-plugin](https://github.com/webpack-contrib/copy-webpack-plugin), say.

`import.meta.env.DEV`, which the docs use to leave the [debug plugin](/docs/plugins/debug#leave-it-out-of-release-builds) out of a release, is Vite's. Under webpack, use `process.env.NODE_ENV !== 'production'`, which webpack sets from `--mode` (TypeScript needs `@types/node` to know `process`).

## The single offline file

webpack can make the one `index.html` that opens from disk, with two changes:

- **The CSS goes in the script.** `style-loader` in place of `MiniCssExtractPlugin.loader` adds the styles from the script, so there's no stylesheet file.
- **The script goes in the page.** [`html-inline-script-webpack-plugin`](https://github.com/icelam/html-inline-script-webpack-plugin) puts the bundle inside `index.html`. An inline script runs where it stands, so it goes at the end of the `<body>`, after `#root`.

```js
// webpack.single.config.js
import HtmlWebpackPlugin from 'html-webpack-plugin'
import HtmlInlineScriptPlugin from 'html-inline-script-webpack-plugin'

export default {
  entry: './src/main.ts',
  output: { clean: true, path: new URL('./dist-one', import.meta.url).pathname },
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'esbuild-loader', options: { target: 'es2023', jsx: 'automatic' } },
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] },
    ],
  },
  performance: { hints: false },
  plugins: [new HtmlWebpackPlugin({ template: './index.html', inject: 'body' }), new HtmlInlineScriptPlugin()],
}
```

Add `style-loader` and `html-inline-script-webpack-plugin` as dev dependencies, and build with `webpack --mode production -c webpack.single.config.js`. `dist-one/index.html` then plays from disk. Pictures and sound aren't inside it, so copy `public/` beside it, where `ifloom build` would leave them too. To check the folder as `ifloom build` does, call [`checkBuild`](/docs/cli#checkbuild) from a script.
