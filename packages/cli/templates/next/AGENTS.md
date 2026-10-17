# {{title}}

An interactive fiction game built on IFLoom, a TypeScript engine, inside a
Next.js app. This file is for coding agents working on the game.

## Learn the engine

- The docs, in one file: https://ifloom.dev/llms-full.txt
  (offline, read `site/content/docs/` in the IFLoom checkout this game sits in).
- The docs' MCP server, to search them and fetch single pages: https://ifloom.dev/api/mcp
- Working games to copy patterns from: `examples/novel`, `examples/cafe` and
  `examples/showcase` in the checkout.
- How a game runs in Next: https://ifloom.dev/docs/recipes/next

## How the game is put together

- `src/game.ts` is the game. Content is plain data: scenes, choices,
  conditions, effects, stats and prose. Prefer data over code.
- The engine is deterministic and has no DOM. Randomness is seeded from the save.
- Plugins (a calendar, places, a cast of characters…) are added to `plugins: [...]`
  when the game is loaded, and their content goes under `data.<plugin>` in a pack,
  and each plugin's package goes in `transpilePackages` in `next.config.ts`.
- `app/Game.tsx` draws the game with the React UI, in the browser only.
  `app/page.tsx` is an ordinary Next page around it.
- Pictures and sound go in `public/`, as for any Next app.

## After every change

- `npm run check` lists anything the game names that doesn't exist. It should print "No problems."
- `npm run playtest` plays the game with no one at the keyboard and writes what it saw.
- `npm run dev` serves the app; `npm run build` builds it for a web host.
  It can't make the single offline `index.html` that `ifloom build` makes.
