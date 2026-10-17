---
title: "Next.js"
description: "Run an IFLoom game in a Next.js app: transpilePackages for the TypeScript packages, Tailwind for the React UI's stylesheet, a client component that starts the game, ifloom check and playtest beside it, and why Next can't make the single offline file."
---
Use Next when your game lives on a website: a page of a site you already run on Next, or a game you host on Vercel or Netlify. `ifloom new --template next` starts a Next app with the game in it, or you can add a game to an app you have.

Next builds a website for a server to host. It can't make the single `index.html` that opens from disk, which [`ifloom build`](/docs/cli#ifloom-build) makes for a game players download. Even a static export (`output: 'export'`) loads its scripts in chunks from absolute paths, so it needs a web server. If you want both, keep the game in its own package with the CLI, and import it into the site too.

Next is React, so this page uses React throughout: the [React UI](/docs/react), or your own UI in React.

## Start from the template

```sh
npm run new -- my-site --template next
npm install
npm run dev -w my-site
```

That gives you a Next app (the App Router) with the same two-scene game as the other templates, drawn with the React UI:

```
games/my-site/
├── app/
│   ├── layout.tsx     the page around everything, which imports src/styles.css
│   ├── page.tsx       the home page, which draws <Game />
│   └── Game.tsx       a client component that starts the game
├── src/
│   ├── game.ts        the game, as in every template
│   └── styles.css     the React UI's styles and a theme preset
├── next.config.ts     transpilePackages for the @ifloom packages
├── postcss.config.mjs Tailwind, for the React UI's stylesheet
├── README.md
└── AGENTS.md
```

Its scripts are `dev`, `build` and `start` from Next, `check` and `playtest` from the `ifloom` CLI, and `typecheck`. The rest of this page goes through each part, so you can do the same in an app of your own.

## Compile the packages

While IFLoom is pre-release, its packages ship TypeScript source rather than JavaScript. Next compiles packages from `node_modules` only when you list them in `transpilePackages`. List the engine, the UI packages, and each plugin your game uses:

```ts
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@ifloom/engine', '@ifloom/react', '@ifloom/audio', '@ifloom/browser', '@ifloom/plugin-places'],
}

export default config
```

Add the packages to the app: `@ifloom/engine` and `@ifloom/react`, any plugins, and `@ifloom/cli` as a dev dependency for `check` and `playtest`. [Installation](/docs/guide/installation#a-game-beside-the-checkout) shows how to link them from a checkout.

**Linked from a checkout.** Next's bundler, Turbopack, reads no file outside its root folder, and a `file:` link points outside your app. Set the root to the folder that holds both your app and the checkout:

```ts
import path from 'node:path'

const config: NextConfig = {
  transpilePackages: [/* as above */],
  turbopack: { root: path.resolve('..') },
}
```

Inside the checkout, as the template is when `npm run new` makes it, Next finds the right root by itself.

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

Without the React UI you need no Tailwind at all. Leave out the PostCSS config and style your own UI however the app already does.

## Start the game in a client component

The game runs in the browser only. Its runner reads saves and settings from `localStorage`, which the server doesn't have. So start it in a client component, after the page has loaded, and draw nothing until it's ready:

```tsx
// app/Game.tsx
'use client'
import { useEffect, useState } from 'react'
import { browserRunner, type Runner } from '@ifloom/engine'
import { GameShell, READING_LAYOUT, useAudio } from '@ifloom/react'
import loaded from '../src/game.ts'

export function Game() {
  const [runner, setRunner] = useState<Runner | null>(null)

  useEffect(() => {
    if (loaded.problems.length) console.warn(loaded.problems)
    let live = true
    void browserRunner(loaded.game).then((made) => {
      if (live) setRunner(made)
    })
    return () => {
      live = false
    }
  }, [])

  return runner ? <Playing runner={runner} /> : null
}

function Playing({ runner }: { runner: Runner }) {
  useAudio({ runner })
  return <GameShell runner={runner} layout={READING_LAYOUT} pages />
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

This draws [`GameShell`](/docs/react#gameshell) rather than calling [`mountGame`](/docs/react#mountgame). `mountGame` starts a React root of its own in an element, which a React app doesn't need. [`useAudio`](/docs/react#useaudio) plays the game's sound, as `mountGame` would. `GameShell` takes the same options as `mountGame`, such as `layout`, `pages` and `components`.

The page around the game is an ordinary Next page. Put the game on any route, beside the rest of the site.

## Your own UI instead

To draw the game yourself, read the view with React's `useSyncExternalStore`, which takes exactly what `runner.subscribe` and `runner.view` are:

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

The third argument is the server's snapshot, which `useSyncExternalStore` asks for in a server-rendered app. Then `@ifloom/react` and Tailwind can go. Keep `@ifloom/audio` and `@ifloom/browser` for sound, the minigame clock and the keys (see [A UI from scratch](/docs/guide/ui-from-scratch)). [Your own UI in any framework](/docs/guide/frameworks) has the rest of a UI in React by hand.

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

Keep the game in `src/game.ts`, exported as `default` or `game`, or pass its path: `ifloom check app/game/content.ts`. Pictures and sound go in `public/`, as for any Next app, and `ifloom check` looks for them there. `ifloom dev` and `ifloom build` aren't for a Next app. Use Next's own.

## Can it make the single offline file?

No. Use the CLI, [webpack](/docs/recipes/webpack) or [esbuild](/docs/recipes/esbuild) for that, from the same `src/game.ts`.
