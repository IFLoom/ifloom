---
title: "Next.js"
description: "Run an IFLoom game in a Next.js app: the packages as they are, Tailwind or the prebuilt stylesheet for the React UI, a client component that starts the game, ifloom check and playtest beside it, and why Next can't make the single offline file."
---
Use Next when your game lives on a website: a page of a site you already run on Next, or a game you host on Vercel or Netlify. `npm create ifloom@latest my-site -- --template next` starts a Next app with the game in it, or you can add a game to an app you have.

Next builds a website for a server to host. It can't make the single `index.html` that opens from disk, which [`ifloom build`](/docs/cli#ifloom-build) makes for a game players download. Even a static export (`output: 'export'`) loads its scripts in chunks from absolute paths, so it needs a web server. If you want both, keep the game in its own package with the CLI, and import it into the site too.

Next is React, so everything below uses React, either the [React UI](/docs/react) or your own UI written in React.

## Start from the template

```sh
npm create ifloom@latest my-site -- --template next
cd my-site
npm install
npm run dev
```

That gives you a Next app (the App Router) with the same two-scene game as the other templates, drawn with the React UI:

```
my-site/
├── app/
│   ├── layout.tsx     the page around everything, which imports src/styles.css
│   ├── page.tsx       the home page, which draws <Game />
│   └── Game.tsx       a client component that starts the game
├── src/
│   ├── game.ts        puts the game together, as in every template
│   ├── world/         what the whole game shares, such as stats.ts
│   ├── story/         the story, one file per area, starting with opening.ts
│   ├── layout.tsx     the game's page: the side column, the story and its sections
│   └── styles.css     the React UI's styles and a theme preset
├── next.config.ts     Next's settings, empty to start with
├── postcss.config.mjs Tailwind, for the React UI's stylesheet
├── README.md
└── AGENTS.md
```

Its scripts are `dev`, `build` and `start` from Next, `check` and `playtest` from the `ifloom` CLI, and `typecheck`. The sections below go through each part, so you can set up an app of your own the same way.

## Add the packages

The @ifloom packages are compiled JavaScript with their type declarations, so Next uses them like any other package, with no `transpilePackages` or other setting. Add `@ifloom/engine`, `@ifloom/browser` and `@ifloom/react` to the app, any plugins your game uses, and `@ifloom/cli` as a dev dependency for `check` and `playtest`, and for `@ifloom/cli/game`, which `src/game.ts` imports `defineGame` from:

```sh tab="npm" tab-group="package-manager"
npm install @ifloom/engine @ifloom/browser @ifloom/react
npm install --save-dev @ifloom/cli
```

```sh tab="pnpm" tab-group="package-manager"
pnpm add @ifloom/engine @ifloom/browser @ifloom/react
pnpm add --save-dev @ifloom/cli
```

```sh tab="yarn" tab-group="package-manager"
yarn add @ifloom/engine @ifloom/browser @ifloom/react
yarn add --dev @ifloom/cli
```

```sh tab="bun" tab-group="package-manager"
bun add @ifloom/engine @ifloom/browser @ifloom/react
bun add --dev @ifloom/cli
```

## Styles

The React UI's stylesheet is written for Tailwind CSS v4. Next runs Tailwind through PostCSS, so add `tailwindcss`, `@tailwindcss/postcss` and `postcss` as dev dependencies and a PostCSS config:

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

Import the UI's stylesheet from a global stylesheet, and that from the root layout:

```css
/* src/styles.css */
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/paper.css";
```

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../src/styles.css'

export const metadata: Metadata = { title: 'My Game' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

`styles.css` brings Tailwind itself, so don't import `tailwindcss` again. If the app already has Tailwind v4 of its own, import `@ifloom/react/theme.css` after your `@import "tailwindcss"` instead (see [Bringing your own Tailwind](/docs/react/customising#bringing-your-own-tailwind)). The second line picks a [theme preset](/docs/react/customising#1-pick-a-theme-preset), and is optional.

To go without Tailwind, import the prebuilt `@ifloom/react/styles.min.css` from the root layout instead, and a preset as `@ifloom/react/themes/paper.min.css`, then leave out the PostCSS config. If you don't use the React UI, you don't need Tailwind at all, and you can style your own UI however the app already does.

## Start the game in a client component

The game runs in the browser only. Its runner reads saves and settings from `localStorage`, which the server doesn't have. So start it in a client component, after the page has loaded, and draw nothing until it's ready:

```tsx
// app/Game.tsx
'use client'
import { useEffect, useState } from 'react'
import { browserRunner } from '@ifloom/browser'
import type { Runner } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import module from '../src/game.ts'
import { Layout } from '../src/layout.tsx'

export function Game() {
  const [runner, setRunner] = useState<Runner | null>(null)

  useEffect(() => {
    // The game module builds the game, and says what the loader found wrong with it.
    const { game, problems } = module.build()
    if (problems.length) console.warn(problems)
    let live = true
    void browserRunner(game).then((made) => {
      if (live) setRunner(made)
    })
    return () => {
      live = false
    }
  }, [])

  return runner ? <Playing runner={runner} /> : null
}

function Playing({ runner }: { runner: Runner }) {
  return <GameShell runner={runner} layout={Layout} pages />
}
```

```tsx
// app/page.tsx
import { Game } from './Game'

export default function Page() {
  return <Game />
}
```

`browserRunner` is async, because it reads the player's settings before the first frame, so the effect waits for it. The `live` flag drops a runner that arrives after the component has gone, which happens in development, where React mounts each component twice.

This draws [`GameShell`](/docs/react#gameshell) rather than calling [`mountGame`](/docs/react#mountgame). `mountGame` starts a React root of its own in an element, which a React app doesn't need. `GameShell` plays the game's sound and takes the same options as `mountGame`, such as `layout`, `pages`, `audio` and `components`.

The page around the game is an ordinary Next page. Put the game on any route, beside the rest of the site.

## Your own UI instead

To draw the game yourself, read the view with React's `useSyncExternalStore`. Its first two arguments are a subscribe function and a snapshot function, and `runner.subscribe` and `runner.view` are both:

```tsx
'use client'
import { useSyncExternalStore } from 'react'
import type { Runner } from '@ifloom/engine'

function Playing({ runner }: { runner: Runner }) {
  const view = useSyncExternalStore(runner.subscribe, runner.view, runner.view)
  return (
    <main>
      <h1>{view.scene.title}</h1>
      {view.scene.beats.map((beat, at) => ('text' in beat ? <p key={at}>{beat.text}</p> : null))}
      {view.scene.choices.map((choice) => (
        <button key={choice.id} disabled={Boolean(choice.disabled)} title={choice.disabled} onClick={() => runner.apply(choice.command)}>
          {choice.label}
        </button>
      ))}
    </main>
  )
}
```

The third argument is the server's snapshot, which `useSyncExternalStore` asks for in a server-rendered app. With your own UI you can drop `@ifloom/react` and Tailwind. Keep `@ifloom/audio` and `@ifloom/browser` for sound, the clock for timers and minigames, and the keys (see [A UI from scratch](/docs/guide/ui-from-scratch)). [Your own UI in any framework](/docs/guide/frameworks) has the rest of a UI in React by hand.

## Check and playtest it

The CLI's `check` and `playtest` don't use Next. They load `src/game.ts` with the CLI's own Vite, which `@ifloom/cli` brings, so they work in a Next app as they do anywhere:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "check": "ifloom check",
    "playtest": "ifloom playtest --turns 5 --out playtest/run.txt",
    "typecheck": "next typegen && tsc --noEmit"
  }
}
```

Keep the game in `src/game.ts`, its [game module](/docs/cli#the-game-module) the default export, made with `defineGame`, or pass its path: `ifloom check app/game/module.ts`. Pictures and sound go in `public/`, as for any Next app, and `ifloom check` looks for them there. In a Next app, use Next's own `dev` and `build` in place of `ifloom dev` and `ifloom build`.

## Can it make the single offline file?

No. Use the CLI, [webpack](/docs/recipes/webpack) or [esbuild](/docs/recipes/esbuild) for that, from the same `src/game.ts`.
