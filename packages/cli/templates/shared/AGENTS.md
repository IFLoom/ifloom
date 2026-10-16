# {{title}}

An interactive fiction game built on IFLoom, a TypeScript engine. This file is
for coding agents working on the game.

## Learn the engine

- The docs, in one file: https://ifloom.github.io/ifloom/llms-full.txt
  (until the docs are public, read `site/content/docs/` in the IFLoom checkout this game sits in).
- Working games to copy patterns from: `examples/novel`, `examples/cafe` and
  `examples/showcase` in the checkout.

## How the game is put together

- `src/game.ts` is the game. Content is plain data: scenes, choices,
  conditions, effects, stats and prose. Prefer data over code.
- The engine is deterministic and has no DOM. Randomness is seeded from the save.
- Plugins (a calendar, places, a cast of characters…) are added to `plugins: [...]`
  when the game is loaded, and their content goes under `data.<plugin>` in a pack.
- `src/main.ts` draws the game in the browser.

## After every change

- `npm run check` lists anything the game names that doesn't exist. It should print "No problems."
- `npm run playtest` plays the game with no one at the keyboard and writes what it saw.
- `npm run dev` serves the game in a browser; `npm run build` makes one HTML file.
