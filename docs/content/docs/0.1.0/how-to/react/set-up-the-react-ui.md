---
title: "Set up the React UI"
description: "Add the React UI to a game with React, Tailwind, the TypeScript and Vite settings, its stylesheet and the entry that mounts the game."
---
This how-to is for `@ifloom/react`, the optional React UI. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/0.1.0/how-to/render/start).

Use this to render a game with the React UI in a project that doesn't have it yet. A game made from the `react` template has every file below already, as [Create a game](/docs/0.1.0/how-to/create-a-game) shows. You need a [game module](/docs/0.1.0/reference/cli#the-game-module) in `src/game.ts` first, which [Add IFLoom to an existing project](/docs/0.1.0/how-to/add-to-a-project) writes.

## Install the packages

Install the UI beside the engine, with React and the tools that build its stylesheet:

```sh tab="npm" tab-group="package-manager"
npm install @ifloom/react react react-dom
npm install --save-dev @vitejs/plugin-react @tailwindcss/vite tailwindcss @types/react @types/react-dom
```

```sh tab="pnpm" tab-group="package-manager"
pnpm add @ifloom/react react react-dom
pnpm add -D @vitejs/plugin-react @tailwindcss/vite tailwindcss @types/react @types/react-dom
```

```sh tab="yarn" tab-group="package-manager"
yarn add @ifloom/react react react-dom
yarn add -D @vitejs/plugin-react @tailwindcss/vite tailwindcss @types/react @types/react-dom
```

```sh tab="bun" tab-group="package-manager"
bun add @ifloom/react react react-dom
bun add -d @vitejs/plugin-react @tailwindcss/vite tailwindcss @types/react @types/react-dom
```

The UI needs React 19, react-dom and Tailwind CSS v4, which are its peer dependencies. React's types are peers too, and your own `.tsx` files use them. A game that uses the [prebuilt stylesheet](/docs/0.1.0/how-to/react/theme-the-react-ui#use-the-prebuilt-stylesheet) needs neither Tailwind package. Install each plugin your game uses beside it, as [Add a plugin](/docs/0.1.0/how-to/add-a-plugin) shows.

## Set up TypeScript

Turn on JSX, the DOM and Vite's client types in `tsconfig.json`, beside the settings you have:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["@ifloom/cli/client"]
  }
}
```

`@ifloom/cli/client` holds Vite's browser types, so TypeScript accepts `import './styles.css'` and `import.meta.env`.

## Add the Vite plugins

List React's and Tailwind's Vite plugins in the [CLI's preset](/docs/0.1.0/reference/cli#the-vite-preset), which builds one HTML file that opens from disk:

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { ifloom } from '@ifloom/cli/vite'

export default ifloom({ vite: { plugins: [react(), tailwindcss()], resolve: { dedupe: ['react', 'react-dom'] } } })
```

`dedupe` keeps one copy of React when `@ifloom/react` is linked from a checkout. To build without the CLI, see [Ship your game](/docs/0.1.0/how-to/ship-your-game).

## Write the stylesheet

Import the UI's stylesheet, then a theme preset if you want one:

```css
/* src/styles.css */
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/paper.css";
```

The UI's stylesheet imports Tailwind and tells it to scan the UI's components, so don't `@import "tailwindcss"` a second time. Tailwind also finds the classes in your own files, so your components can use its utilities. [Theme the React UI](/docs/0.1.0/how-to/react/theme-the-react-ui) lists the presets and everything else you can change.

## Mount the game

Call [`mountGame`](/docs/0.1.0/reference/react#mountgame) with what the game module's `build()` returns, in `src/main.ts`:

```ts
// src/main.ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(module.build(), { layout: Layout })
```

`src/layout.tsx` is the page, a copy of [`DefaultLayout`](/docs/0.1.0/reference/react/components#defaultlayout) for you to change. Copy it from the `react` template, or leave `layout` out to use the default as it is. `mountGame` logs the content checker's problems as warnings, then renders into `#root`.

## Add index.html

Give the page a `#root` element and load the entry:

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Small Town</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
```

## Check it worked

Run `npx ifloom dev` and open the address it prints. The game's title is in the side column and the first scene is in the story. Run `npx ifloom build` and open `dist/index.html` from disk: the same page plays with no server.

For more, see:

- [The React UI](/docs/0.1.0/reference/react) and [`MountOptions`](/docs/0.1.0/reference/react#mountoptions).
- [Show plugins in the React UI](/docs/0.1.0/how-to/react/show-plugin-uis), to render your plugins.
- [Add a title screen](/docs/0.1.0/how-to/add-a-title-screen), to open on one with the `pages` option.
- [Choosing a UI](/docs/0.1.0/explanation/choosing-a-ui), for when to use the React UI.
