# {{title}}

An interactive fiction game built on IFLoom, a TypeScript engine, inside a
Next.js app. This file is for coding agents working on the game.

## Learn the engine

- The docs, in one file: https://ifloom.dev/llms-full.txt
- The docs' MCP server, to search them and fetch single pages: https://ifloom.dev/api/mcp
- Working games to copy patterns from: `examples/novel`, `examples/cafe` and
  `examples/showcase` in the IFLoom repository, https://github.com/IFLoom/ifloom.
- How a game runs in Next: https://ifloom.dev/docs/recipes/next

## Where things go

- `src/game.ts` only assembles the game: `loadGame([...content], { ... })`,
  with the plugins and rules. Content doesn't go here.
- `src/world/` holds what the whole game shares, one file per kind:
  `stats.ts`, `things.ts`, `cast.ts` for the people, `settings.ts` for what the
  player can change. Each file exports a `Content` object.
- `src/story/` holds the story, one file per area: a place, a chapter or a
  character's arc. Each exports a `Content` object with that area's scenes,
  choices, prose and its slice of plugin content (that place, its vendor, its
  jobs). Long prose moves to `<area>.prose.ts` beside it.
- `src/rules.ts` holds the game's rules (`onTurn`, `onStat`, ...) once it has any.
- A new file's content goes in the list in `src/game.ts`. Files can be renamed
  and split freely, but each scene, prose key, stat or other key is declared
  once: `npm run check` reports one declared twice.
- A pack is different: content from outside the code, with an `id` and a
  `schema`, such as a mod. Packs go in `loadGame`'s third argument and replace
  what the content declares.
- Content is plain data: scenes, choices, conditions, effects, stats and prose.
  Prefer data over code.
- How to organise a game: https://ifloom.dev/docs/guide/organising

## How the game is put together

- The engine is deterministic and has no DOM. Randomness is seeded from the save.
- Plugins (a calendar, places, a cast of characters…) are added to `plugins: [...]`
  when the game is loaded, and their content goes under `data.<plugin>`.
- `app/Game.tsx` draws the game with the React UI, in the browser only.
  `src/layout.tsx` is the game's page: the side column, the story and its sections.
  `app/page.tsx` is an ordinary Next page around it.
- Pictures and sound go in `public/`, as for any Next app.

## After every change

- `npm run check` lists anything the game names that doesn't exist. It should print "No problems."
- `npm run playtest` plays the game with no one at the keyboard and writes what it saw.
- `npm run dev` serves the app; `npm run build` builds it for a web host.
  It can't make the single offline `index.html` that `ifloom build` makes.
